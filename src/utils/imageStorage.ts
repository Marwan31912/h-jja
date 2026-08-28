/**
 * Aladdin Images Storage Service
 * Provides centralized, persistent storage and synchronization for Book covers
 * using IndexedDB ("AladdinImages" / "covers") and Firebase Storage / Cloud Cache.
 */

export const compressAndGetBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Saves a book cover to IndexedDB ("AladdinImages" -> "covers")
 * Accepts Base64 string, Blob, or Object URL / remote URL
 */
export const saveCoverToIDB = async (bookId: string, imageSource: string | Blob): Promise<string | null> => {
  if (typeof indexedDB === 'undefined' || !bookId || !imageSource) return null;
  try {
    let blob: Blob;
    if (imageSource instanceof Blob) {
      blob = imageSource;
    } else if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
      const parts = imageSource.split(',');
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([ab], { type: mimeString });
    } else if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://') || imageSource.startsWith('blob:'))) {
      const res = await fetch(imageSource);
      blob = await res.blob();
    } else {
      return null;
    }

    return new Promise((resolve) => {
      const dbRequest = indexedDB.open("AladdinImages", 3);
      dbRequest.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("covers")) {
          db.createObjectStore("covers");
        }
      };
      dbRequest.onsuccess = (e: any) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains("covers")) {
          resolve(null);
          return;
        }
        const tx = idb.transaction("covers", "readwrite");
        const store = tx.objectStore("covers");
        store.put(blob, bookId);
        tx.oncomplete = () => {
          const blobUrl = URL.createObjectURL(blob);
          resolve(blobUrl);
        };
        tx.onerror = () => resolve(null);
      };
      dbRequest.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error("Failed to save cover to IDB:", err);
    return null;
  }
};

/**
 * Loads a cover blob from IndexedDB for a given book ID
 */
export const loadCoverFromIDB = (bookId: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined' || !bookId) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open("AladdinImages", 3);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("covers")) {
          db.createObjectStore("covers");
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("covers")) {
          resolve(null);
          return;
        }
        const tx = db.transaction("covers", "readonly");
        const store = tx.objectStore("covers");
        const getReq = store.get(bookId);
        getReq.onsuccess = () => {
          if (getReq.result instanceof Blob) {
            resolve(URL.createObjectURL(getReq.result));
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

/**
 * Deletes a cover from IndexedDB for a given book ID
 */
export const deleteCoverFromIDB = (bookId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined' || !bookId) {
      resolve(true);
      return;
    }
    try {
      const request = indexedDB.open("AladdinImages", 3);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains("covers")) {
          const tx = db.transaction("covers", "readwrite");
          const store = tx.objectStore("covers");
          store.delete(bookId);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } else {
          resolve(true);
        }
      };
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};
