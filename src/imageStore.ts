/**
 * Ultra-fast persistent image & offline JSON cache combining:
 * 1. Synchronous in-memory Map for 0ms frame rendering
 * 2. Single deduplicated LocalStorage slot (<= 450KB) for instant page-boot retrieval
 * 3. Browser IndexedDB storage with virtually unlimited quota for high-res logos & full report snapshots
 */

const memoryCache = new Map<string, string>();
const persistedSessionImage = new Map<string, string>();

const DB_NAME = "sst_media_cache_db";
const MEDIA_STORE_NAME = "media_store";
const JSON_STORE_NAME = "json_store";
const DB_VERSION = 2;
const MAX_LOCALSTORAGE_IMAGE_CHARS = 450_000;

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
          if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
            db.createObjectStore(MEDIA_STORE_NAME, { keyPath: "key" });
          }
          if (!db.objectStoreNames.contains(JSON_STORE_NAME)) {
            db.createObjectStore(JSON_STORE_NAME, { keyPath: "key" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

// Migrate legacy duplicated `sst_fast_*` keys and pre-warm memory cache on boot
try {
  const legacyPairs: Array<{ fastKey: string; imgKey: string; cacheName: string }> = [
    { fastKey: "sst_fast_assessor_logo", imgKey: "sst_img_assessor_logo", cacheName: "assessor_logo" },
    { fastKey: "sst_fast_cover_image", imgKey: "sst_img_cover_image", cacheName: "cover_image" },
  ];

  for (const { fastKey, imgKey, cacheName } of legacyPairs) {
    const legacyVal = localStorage.getItem(fastKey);
    const canonicalVal = localStorage.getItem(imgKey);

    if (canonicalVal && !canonicalVal.includes("[OMITTED")) {
      memoryCache.set(cacheName, canonicalVal);
      if (legacyVal) localStorage.removeItem(fastKey);
    } else if (legacyVal && !legacyVal.includes("[OMITTED")) {
      memoryCache.set(cacheName, legacyVal);
      if (legacyVal.length <= MAX_LOCALSTORAGE_IMAGE_CHARS) {
        try {
          localStorage.setItem(imgKey, legacyVal);
        } catch {
          // Ignore quota error; memory + IndexedDB will retain it
        }
      }
      localStorage.removeItem(fastKey);
    } else if (legacyVal) {
      localStorage.removeItem(fastKey);
    }

    const cached = memoryCache.get(cacheName);
    if (cached && cacheName === "assessor_logo") {
      const img = new Image();
      img.src = cached;
    }
  }
} catch {
  // Ignore boot cache warm-up errors
}

/**
 * Synchronous image retrieval for instant 0ms render without flicker.
 */
export function getImageSync(key: string): string {
  const inMem = memoryCache.get(key);
  if (inMem && !inMem.includes("[OMITTED")) {
    return inMem;
  }

  try {
    const lsKey = `sst_img_${key}`;
    const stored = localStorage.getItem(lsKey);
    if (stored && !stored.includes("[OMITTED")) {
      memoryCache.set(key, stored);
      return stored;
    }
  } catch {
    // Ignore storage read errors
  }

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
        const tx = db.transaction(MEDIA_STORE_NAME, "readonly");
        const store = tx.objectStore(MEDIA_STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const res = req.result;
          if (res && res.data && typeof res.data === "string" && !res.data.includes("[OMITTED")) {
            memoryCache.set(key, res.data);
            if (res.data.length <= MAX_LOCALSTORAGE_IMAGE_CHARS) {
              try {
                localStorage.setItem(`sst_img_${key}`, res.data);
              } catch {
                // Ignore if localStorage is full; IndexedDB already has it
              }
            }
            resolve(res.data);
          } else {
            resolve("");
          }
        };
        req.onerror = () => resolve("");
      } catch {
        resolve("");
      }
    });
  } catch {
    return "";
  }
}

/**
 * Save an image to memory cache, single LocalStorage slot (when compact), and IndexedDB.
 */
export async function saveImageToCache(key: string, dataUrl: string): Promise<void> {
  if (!key || !dataUrl || dataUrl.includes("[OMITTED")) return;

  // Deduplicate identical writes within the same session
  if (persistedSessionImage.get(key) === dataUrl) {
    return;
  }
  persistedSessionImage.set(key, dataUrl);

  // 1. Memory cache
  memoryCache.set(key, dataUrl);

  // 2. Warm up browser image decoding pipeline
  try {
    const img = new Image();
    img.src = dataUrl;
  } catch {
    // ignore
  }

  // 3. Single LocalStorage slot only when compact enough to protect the 5MB quota
  try {
    const lsKey = `sst_img_${key}`;
    if (dataUrl.length <= MAX_LOCALSTORAGE_IMAGE_CHARS) {
      if (localStorage.getItem(lsKey) !== dataUrl) {
        localStorage.setItem(lsKey, dataUrl);
      }
    } else {
      // Remove oversized item from localStorage and rely on IndexedDB below
      localStorage.removeItem(lsKey);
    }
  } catch {
    // LocalStorage quota tight — IndexedDB below stores it reliably
  }

  // 4. IndexedDB (virtually unlimited quota)
  try {
    const db = await getIDB();
    if (!db) return;

    const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
    const store = tx.objectStore(MEDIA_STORE_NAME);
    store.put({ key, data: dataUrl, updatedAt: Date.now() });
  } catch {
    // Ignore IDB errors silently
  }
}

/**
 * Remove an image from all cache layers.
 */
export async function removeImageFromCache(key: string): Promise<void> {
  memoryCache.delete(key);
  persistedSessionImage.delete(key);
  try {
    localStorage.removeItem(`sst_img_${key}`);
    if (key === "assessor_logo") localStorage.removeItem("sst_fast_assessor_logo");
    if (key === "cover_image") localStorage.removeItem("sst_fast_cover_image");
  } catch {
    // ignore
  }

  try {
    const db = await getIDB();
    if (db) {
      const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
      tx.objectStore(MEDIA_STORE_NAME).delete(key);
    }
  } catch {
    // ignore
  }
}

/**
 * Save full-fidelity JSON objects (e.g. reports with logos) in IndexedDB with virtually unlimited quota.
 */
export async function saveJsonToCache<T>(key: string, data: T): Promise<void> {
  if (!key) return;
  try {
    const db = await getIDB();
    if (!db) return;
    const tx = db.transaction(JSON_STORE_NAME, "readwrite");
    tx.objectStore(JSON_STORE_NAME).put({ key, data, updatedAt: Date.now() });
  } catch {
    // ignore IDB write error
  }
}

/**
 * Load full-fidelity JSON objects from IndexedDB.
 */
export async function getJsonFromCache<T>(key: string): Promise<T | null> {
  if (!key) return null;
  try {
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(JSON_STORE_NAME, "readonly");
        const req = tx.objectStore(JSON_STORE_NAME).get(key);
        req.onsuccess = () => {
          resolve(req.result && req.result.data !== undefined ? (req.result.data as T) : null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}
