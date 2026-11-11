/**
 * Ultra-fast persistent image cache combining:
 * 1. Synchronous in-memory Map for 0ms frame rendering
 * 2. Dedicated LocalStorage fallback for instant page-boot retrieval
 * 3. Browser IndexedDB storage that has virtually unlimited quota and never prunes
 */

const memoryCache = new Map<string, string>();

const DB_NAME = "sst_media_cache_db";
const STORE_NAME = "media_store";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "key" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn("[ImageStore] Failed to open IndexedDB:", req.error);
          resolve(null);
        };
      } catch (e) {
        console.warn("[ImageStore] IndexedDB open error:", e);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

// Pre-fill memory cache immediately on script evaluation
try {
  const fastLogo = localStorage.getItem("sst_fast_assessor_logo");
  if (fastLogo && !fastLogo.includes("[OMITTED")) {
    memoryCache.set("assessor_logo", fastLogo);
    const img = new Image();
    img.src = fastLogo;
  }
  const fastCover = localStorage.getItem("sst_fast_cover_image");
  if (fastCover && !fastCover.includes("[OMITTED")) {
    memoryCache.set("cover_image", fastCover);
  }
} catch (e) {}

/**
 * Synchronous image retrieval for instant 0ms render without flicker.
 */
export function getImageSync(key: string): string {
  // 1. Check memory cache
  const inMem = memoryCache.get(key);
  if (inMem && !inMem.includes("[OMITTED")) {
    return inMem;
  }

  // 2. Check dedicated localStorage keys
  try {
    const lsKey = `sst_img_${key}`;
    const stored = localStorage.getItem(lsKey) || (key === "assessor_logo" ? localStorage.getItem("sst_fast_assessor_logo") : null);
    if (stored && !stored.includes("[OMITTED")) {
      memoryCache.set(key, stored);
      return stored;
    }
  } catch (e) {}

  return "";
}

/**
 * Asynchronous image retrieval checking IndexedDB if not found in synchronous cache.
 */
export async function getImageAsync(key: string): Promise<string> {
  const syncVal = getImageSync(key);
  if (syncVal) return syncVal;

  try {
    const db = await getIDB();
    if (!db) return "";

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const res = req.result;
          if (res && res.data && typeof res.data === "string" && !res.data.includes("[OMITTED")) {
            memoryCache.set(key, res.data);
            try {
              localStorage.setItem(`sst_img_${key}`, res.data);
            } catch (err) {}
            resolve(res.data);
          } else {
            resolve("");
          }
        };
        req.onerror = () => resolve("");
      } catch (err) {
        resolve("");
      }
    });
  } catch (e) {
    return "";
  }
}

/**
 * Save an image to memory cache, localStorage, and IndexedDB with zero risk of truncation.
 */
export async function saveImageToCache(key: string, dataUrl: string): Promise<void> {
  if (!key || !dataUrl || dataUrl.includes("[OMITTED")) return;

  // 1. Memory cache
  memoryCache.set(key, dataUrl);

  // 2. Warm up browser image decoding pipeline
  try {
    const img = new Image();
    img.src = dataUrl;
  } catch (e) {}

  // 3. LocalStorage dedicated slot
  try {
    localStorage.setItem(`sst_img_${key}`, dataUrl);
    if (key === "assessor_logo") {
      localStorage.setItem("sst_fast_assessor_logo", dataUrl);
    }
    if (key === "cover_image") {
      localStorage.setItem("sst_fast_cover_image", dataUrl);
    }
  } catch (e) {
    // LocalStorage quota might be tight, but IndexedDB below will safely store it
  }

  // 4. IndexedDB (virtually unlimited quota)
  try {
    const db = await getIDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, data: dataUrl, updatedAt: Date.now() });
  } catch (e) {
    console.warn(`[ImageStore] Failed to write key "${key}" to IndexedDB:`, e);
  }
}

/**
 * Remove an image from all cache layers.
 */
export async function removeImageFromCache(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(`sst_img_${key}`);
    if (key === "assessor_logo") localStorage.removeItem("sst_fast_assessor_logo");
    if (key === "cover_image") localStorage.removeItem("sst_fast_cover_image");
  } catch (e) {}

  try {
    const db = await getIDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
    }
  } catch (e) {}
}
