/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compresses and downscales an image (from a File) to fit within reasonable dimensions and quality,
 * returning a promise that resolves to a compressed JPEG base64 data URL.
 * This keeps Firestore document sizes well under the 1MB limit.
 */
export function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Draw image onto canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as JPEG with chosen quality
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      
      img.onerror = () => {
        // If image loading fails, fallback to original uncompressed string
        resolve(e.target?.result as string);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      // If reading file fails, fallback to empty string
      resolve("");
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to compress image data already in base64 format
 */
export function compressBase64Image(
  base64Str: string,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(base64Str);
      }
    };

    img.onerror = () => {
      resolve(base64Str);
    };

    img.src = base64Str;
  });
}
