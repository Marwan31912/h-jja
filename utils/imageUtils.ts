// Utility functions for calculating, caching and formatting book image sizes

const imageSizeCache = new Map<string, number>();

/**
 * Synchronously calculates byte size for base64 data URLs, or returns cached size.
 */
export function getSyncImageSizeBytes(imageStr?: string): number {
  if (!imageStr) return 0;
  if (imageSizeCache.has(imageStr)) return imageSizeCache.get(imageStr)!;

  if (imageStr.startsWith('data:')) {
    const commaIdx = imageStr.indexOf(',');
    if (commaIdx !== -1) {
      const base64Str = imageStr.slice(commaIdx + 1);
      const padding = (base64Str.endsWith('==') ? 2 : (base64Str.endsWith('=') ? 1 : 0));
      const bytes = Math.max(0, Math.round((base64Str.length * 3) / 4) - padding);
      imageSizeCache.set(imageStr, bytes);
      return bytes;
    }
  }

  return 0;
}

/**
 * Helper function to get image bytes for a book or image string synchronously.
 */
export function getBookImageBytes(bookOrImage?: { image?: string } | string): number {
  if (!bookOrImage) return 0;
  const imageStr = typeof bookOrImage === 'string' ? bookOrImage : bookOrImage.image;
  return getSyncImageSizeBytes(imageStr);
}

/**
 * Asynchronously calculates byte size for blob: or http(s): URLs and caches the result.
 */
export async function calculateImageSizeBytes(imageStr?: string): Promise<number> {
  if (!imageStr) return 0;

  const syncSize = getSyncImageSizeBytes(imageStr);
  if (syncSize > 0) return syncSize;

  if (imageSizeCache.has(imageStr)) return imageSizeCache.get(imageStr)!;

  try {
    const response = await fetch(imageStr);
    const blob = await response.blob();
    const bytes = blob.size;
    imageSizeCache.set(imageStr, bytes);
    return bytes;
  } catch {
    return 0;
  }
}

/**
 * Formats byte size into readable MB or KB string.
 */
export function formatImageSize(bytes: number): string {
  if (!bytes || bytes <= 0) return 'بدون صورة';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}

export const ONE_MEGABYTE_BYTES = 1024 * 1024; // 1 MB = 1,048,576 bytes
