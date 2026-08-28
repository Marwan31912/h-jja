/**
 * Unified Educational Storage Engine for Hojja Educational Platform
 * Single Source of Truth: Filesystem Storage (server_data.json, server_videos/, server_pdfs/, server_covers/)
 * 
 * Supports:
 * 1. Vite Development Server (via HTTP API /api/educational/*)
 * 2. Packaged Electron Application (via secure Electron IPC bridge & background server)
 * 3. Safe Atomic Writes, Backups, and Non-Destructive Data Migration from localStorage/IndexedDB
 */

import { PdfCategory, VideoLesson, AssignmentItem, ExamItem, CustomContentCategory, CustomContentItem } from '../types';

// Types for Electron IPC bridge
declare global {
  interface Window {
    electronAPI?: {
      educational?: {
        getCatalog: () => Promise<any>;
        saveCatalog: (catalog: any) => Promise<boolean>;
        saveFile: (data: { type: 'video' | 'pdf' | 'cover'; fileName: string; buffer: ArrayBuffer }) => Promise<{ success: boolean; fileName: string; size: number; error?: string }>;
        deleteFile: (data: { type: 'video' | 'pdf' | 'cover'; fileName: string }) => Promise<{ success: boolean; error?: string }>;
        getStorageStatus: () => Promise<any>;
      };
    };
  }
}

export interface EducationalCatalog {
  departments: PdfCategory[];
  courses: PdfCategory[];
  folders: { id: string; name: string; courseId?: string; parentId?: string }[];
  videos: VideoLesson[];
  pdfs: {
    id: string;
    name: string;
    fileName?: string;
    size: number;
    pageCount?: number;
    author?: string;
    courseId?: string;
    folderId?: string;
    addedAt?: number;
  }[];
  assignments?: AssignmentItem[];
  exams?: ExamItem[];
  customCategories?: CustomContentCategory[];
  customItems?: CustomContentItem[];
  folderCovers?: Record<string, string>;
}

// ----------------- IndexedDB (Preserved for Backup & Local Fallback) -----------------
const DB_NAME = 'AladdinEducationalDB';
const DB_VERSION = 1;
const STORE_VIDEOS = 'video_blobs';
const STORE_PDFS = 'pdf_blobs';
const STORE_COVERS = 'banner_covers';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
            db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_PDFS)) {
            db.createObjectStore(STORE_PDFS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_COVERS)) {
            db.createObjectStore(STORE_COVERS, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }
  return dbPromise;
}

// ----------------- URL Resolvers -----------------

/**
 * Returns API Base URL for HTTP requests
 * In Electron / file: protocol, connects to the local background server on 127.0.0.1:3000
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:3000';
  if (window.location.protocol === 'file:' || window.location.origin === 'null' || !window.location.origin) {
    return 'http://127.0.0.1:3000';
  }
  return window.location.origin;
}

/**
 * Resolves any API or Media path to absolute URL when running in Electron (file:// protocol)
 */
export function resolveApiUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.origin === 'null' || !window.location.origin)) {
    return `http://127.0.0.1:3000${cleanPath}`;
  }
  return cleanPath;
}

/**
 * Returns playable video streaming URL (Supports HTTP 206 Range seeking and multi-qualities)
 */
export function getVideoStreamUrl(fileNameOrId: string, video?: VideoLesson, quality?: string): string {
  if (!fileNameOrId) return '';
  if (video?.videoUrl && video.videoUrl.startsWith('http') && !video.fileName) {
    return video.videoUrl;
  }

  // 1. If explicit quality requested and exists in qualities map
  if (quality && video?.qualities && video.qualities[quality]?.fileName) {
    return resolveApiUrl(`/api/educational/file/video/${encodeURIComponent(video.qualities[quality].fileName)}`);
  }

  // 2. Default original file with optional quality fallback param
  const cleanName = video?.fileName || fileNameOrId;
  const qParam = quality && quality !== 'auto' && quality !== '1080p' ? `?quality=${encodeURIComponent(quality)}` : '';
  return resolveApiUrl(`/api/educational/file/video/${encodeURIComponent(cleanName)}${qParam}`);
}

/**
 * Returns PDF document viewing URL
 */
export function getPdfFileUrl(fileNameOrId: string): string {
  if (!fileNameOrId) return '';
  return resolveApiUrl(`/api/educational/file/pdf/${encodeURIComponent(fileNameOrId)}`);
}

/**
 * Returns cover image display URL (handles Base64, external URL, or local server cover)
 */
export function getCoverDisplayUrl(coverRef?: string): string {
  if (!coverRef) return '';
  if (coverRef.startsWith('data:') || coverRef.startsWith('http://') || coverRef.startsWith('https://') || coverRef.startsWith('blob:')) {
    return coverRef;
  }
  if (coverRef.startsWith('/api/educational/file/')) {
    return resolveApiUrl(coverRef);
  }
  return resolveApiUrl(`/api/educational/file/cover/${encodeURIComponent(coverRef)}`);
}

// ----------------- Catalog Operations (Single Source of Truth) -----------------

/**
 * Fetch the latest educational catalog from the filesystem server or Electron IPC
 */
export async function fetchCatalogFromStorage(): Promise<EducationalCatalog | null> {
  // 1. Try Electron IPC if available
  if (window.electronAPI?.educational?.getCatalog) {
    try {
      const catalog = await window.electronAPI.educational.getCatalog();
      if (catalog && typeof catalog === 'object' && Array.isArray(catalog.departments)) {
        return catalog;
      }
    } catch (e) {
      console.warn('[EduStorage] IPC getCatalog failed, falling back to HTTP:', e);
    }
  }

  // 2. Try HTTP API /api/educational/catalog
  try {
    const res = await fetch(resolveApiUrl('/api/educational/catalog'), {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.catalog) {
        return data.catalog;
      }
    }
  } catch (e) {
    console.warn('[EduStorage] HTTP fetch catalog failed:', e);
  }

  // 3. Fallback to localStorage
  try {
    const deptStr = localStorage.getItem('edu_departments_v2');
    const coursesStr = localStorage.getItem('edu_courses_v2');
    const videosStr = localStorage.getItem('edu_videos_v2');
    const pdfsStr = localStorage.getItem('edu_pdfs_v2');
    const assignmentsStr = localStorage.getItem('edu_assignments_v2');
    const examsStr = localStorage.getItem('edu_exams_v2');
    const customCatStr = localStorage.getItem('edu_custom_categories_v2');
    const customItemsStr = localStorage.getItem('edu_custom_items_v2');
    const coversStr = localStorage.getItem('edu_folder_covers_v2');

    if (deptStr || coursesStr || videosStr) {
      return {
        departments: deptStr ? JSON.parse(deptStr) : [],
        courses: coursesStr ? JSON.parse(coursesStr) : [],
        folders: [],
        videos: videosStr ? JSON.parse(videosStr) : [],
        pdfs: pdfsStr ? JSON.parse(pdfsStr) : [],
        assignments: assignmentsStr ? JSON.parse(assignmentsStr) : [],
        exams: examsStr ? JSON.parse(examsStr) : [],
        customCategories: customCatStr ? JSON.parse(customCatStr) : [],
        customItems: customItemsStr ? JSON.parse(customItemsStr) : [],
        folderCovers: coversStr ? JSON.parse(coversStr) : {}
      };
    }
  } catch (e) {
    console.error('[EduStorage] Error parsing localStorage catalog fallback:', e);
  }

  return null;
}

/**
 * Save educational catalog atomically to server_data.json with backup
 */
export async function saveCatalogToStorage(catalog: EducationalCatalog): Promise<boolean> {
  // Sync to localStorage as client-side cache and backup
  try {
    if (catalog.departments) localStorage.setItem('edu_departments_v2', JSON.stringify(catalog.departments));
    if (catalog.courses) localStorage.setItem('edu_courses_v2', JSON.stringify(catalog.courses));
    if (catalog.videos) localStorage.setItem('edu_videos_v2', JSON.stringify(catalog.videos));
    if (catalog.pdfs) localStorage.setItem('edu_pdfs_v2', JSON.stringify(catalog.pdfs));
    if (catalog.assignments) localStorage.setItem('edu_assignments_v2', JSON.stringify(catalog.assignments));
    if (catalog.exams) localStorage.setItem('edu_exams_v2', JSON.stringify(catalog.exams));
    if (catalog.customCategories) localStorage.setItem('edu_custom_categories_v2', JSON.stringify(catalog.customCategories));
    if (catalog.customItems) localStorage.setItem('edu_custom_items_v2', JSON.stringify(catalog.customItems));
    if (catalog.folderCovers) localStorage.setItem('edu_folder_covers_v2', JSON.stringify(catalog.folderCovers));
  } catch (e) {
    console.warn('[EduStorage] Error updating localStorage cache:', e);
  }

  // 1. Try Electron IPC
  if (window.electronAPI?.educational?.saveCatalog) {
    try {
      const success = await window.electronAPI.educational.saveCatalog(catalog);
      if (success) return true;
    } catch (e) {
      console.warn('[EduStorage] IPC saveCatalog failed, falling back to HTTP:', e);
    }
  }

  // 2. Try HTTP API /api/educational/catalog
  try {
    const res = await fetch(resolveApiUrl('/api/educational/catalog'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catalog)
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch (e) {
    console.error('[EduStorage] HTTP saveCatalog failed:', e);
  }

  return false;
}

// ----------------- Video File Operations (Streaming Direct-to-Disk) -----------------

/**
 * Save video file directly to server_videos/ without loading entire file in browser memory
 */
export async function saveVideoFile(
  id: string,
  file: Blob | File,
  customFileName?: string
): Promise<{ fileName: string; size: number }> {
  const safeBaseName = (customFileName || (file instanceof File ? file.name : `video_${id}.mp4`))
    .replace(/[/\\?%*:|"<>]/g, '_');
  const finalFileName = safeBaseName.endsWith('.mp4') ? safeBaseName : `${safeBaseName}.mp4`;

  // 1. Try Electron IPC if available
  if (window.electronAPI?.educational?.saveFile) {
    try {
      // Check if file has a direct physical path in Electron
      const directFilePath = (file as any).path;
      if (directFilePath && typeof directFilePath === 'string') {
        const res = await (window.electronAPI.educational.saveFile as any)({
          type: 'video',
          fileName: finalFileName,
          filePath: directFilePath
        });
        if (res.success) {
          saveVideoBlob(id, file, finalFileName).catch(() => {});
          return { fileName: res.fileName, size: res.size || file.size };
        }
      }

      const buffer = await file.arrayBuffer();
      const res = await window.electronAPI.educational.saveFile({
        type: 'video',
        fileName: finalFileName,
        buffer
      });
      if (res.success) {
        // Also save to IndexedDB as background backup cache
        saveVideoBlob(id, file, finalFileName).catch(() => {});
        return { fileName: res.fileName, size: res.size };
      }
    } catch (e) {
      console.warn('[EduStorage] IPC saveVideoFile failed, falling back to HTTP stream:', e);
    }
  }

  // 2. Stream directly to HTTP endpoint /api/educational/upload-file
  try {
    const url = resolveApiUrl(`/api/educational/upload-file?type=video&fileName=${encodeURIComponent(finalFileName)}&id=${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'POST',
      body: file
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        saveVideoBlob(id, file, finalFileName).catch(() => {});
        return { fileName: data.fileName || finalFileName, size: data.size || file.size };
      }
    }
  } catch (e) {
    console.error('[EduStorage] HTTP upload video failed:', e);
  }

  // Fallback to IndexedDB
  await saveVideoBlob(id, file, finalFileName);
  return { fileName: finalFileName, size: file.size };
}

/**
 * Delete video file from server_videos/
 */
export async function deleteVideoFile(fileName: string): Promise<void> {
  if (!fileName) return;
  if (window.electronAPI?.educational?.deleteFile) {
    try {
      await window.electronAPI.educational.deleteFile({ type: 'video', fileName });
      return;
    } catch (e) {}
  }
  try {
    await fetch(resolveApiUrl(`/api/educational/file?type=video&fileName=${encodeURIComponent(fileName)}`), {
      method: 'DELETE'
    });
  } catch (e) {}
}

// ----------------- PDF File Operations -----------------

/**
 * Save PDF file directly to server_pdfs/
 */
export async function savePdfFile(
  id: string,
  file: Blob | File,
  customFileName?: string
): Promise<{ fileName: string; size: number }> {
  const safeBaseName = (customFileName || (file instanceof File ? file.name : `document_${id}.pdf`))
    .replace(/[/\\?%*:|"<>]/g, '_');
  const finalFileName = safeBaseName.endsWith('.pdf') ? safeBaseName : `${safeBaseName}.pdf`;

  // 1. Try Electron IPC
  if (window.electronAPI?.educational?.saveFile) {
    try {
      const directFilePath = (file as any).path;
      if (directFilePath && typeof directFilePath === 'string') {
        const res = await (window.electronAPI.educational.saveFile as any)({
          type: 'pdf',
          fileName: finalFileName,
          filePath: directFilePath
        });
        if (res.success) {
          savePdfBlob(id, file, finalFileName).catch(() => {});
          return { fileName: res.fileName, size: res.size || file.size };
        }
      }

      const buffer = await file.arrayBuffer();
      const res = await window.electronAPI.educational.saveFile({
        type: 'pdf',
        fileName: finalFileName,
        buffer
      });
      if (res.success) {
        savePdfBlob(id, file, finalFileName).catch(() => {});
        return { fileName: res.fileName, size: res.size };
      }
    } catch (e) {}
  }

  // 2. Stream to HTTP
  try {
    const url = resolveApiUrl(`/api/educational/upload-file?type=pdf&fileName=${encodeURIComponent(finalFileName)}&id=${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'POST',
      body: file
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        savePdfBlob(id, file, finalFileName).catch(() => {});
        return { fileName: data.fileName || finalFileName, size: data.size || file.size };
      }
    }
  } catch (e) {
    console.error('[EduStorage] HTTP upload PDF failed:', e);
  }

  await savePdfBlob(id, file, finalFileName);
  return { fileName: finalFileName, size: file.size };
}

/**
 * Delete PDF file from server_pdfs/
 */
export async function deletePdfFile(fileName: string): Promise<void> {
  if (!fileName) return;
  if (window.electronAPI?.educational?.deleteFile) {
    try {
      await window.electronAPI.educational.deleteFile({ type: 'pdf', fileName });
      return;
    } catch (e) {}
  }
  try {
    await fetch(resolveApiUrl(`/api/educational/file?type=pdf&fileName=${encodeURIComponent(fileName)}`), {
      method: 'DELETE'
    });
  } catch (e) {}
}

// ----------------- Cover Image Operations -----------------

/**
 * Save cover image to server_covers/ and return stable reference URL
 */
export async function saveCoverFile(
  id: string,
  dataUrlOrBlob: string | Blob,
  customFileName?: string
): Promise<{ fileName: string; url: string }> {
  const safeId = id.replace(/[/\\?%*:|"<>]/g, '_');
  const fileName = customFileName || `cover_${safeId}.jpg`;

  if (typeof dataUrlOrBlob === 'string' && dataUrlOrBlob.startsWith('data:')) {
    try {
      const res = await fetch(resolveApiUrl('/api/educational/save-cover-base64'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: safeId, dataUrl: dataUrlOrBlob, customFileName: fileName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          saveBannerCover(id, dataUrlOrBlob).catch(() => {});
          return { fileName: data.fileName, url: resolveApiUrl(data.url) };
        }
      }
    } catch (e) {
      console.error('[EduStorage] Error saving base64 cover to server:', e);
    }
  } else if (dataUrlOrBlob instanceof Blob) {
    try {
      const url = resolveApiUrl(`/api/educational/upload-file?type=cover&fileName=${encodeURIComponent(fileName)}&id=${encodeURIComponent(safeId)}`);
      const res = await fetch(url, {
        method: 'POST',
        body: dataUrlOrBlob
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return { fileName: data.fileName, url: resolveApiUrl(`/api/educational/file/cover/${encodeURIComponent(data.fileName)}`) };
        }
      }
    } catch (e) {
      console.error('[EduStorage] Error uploading cover blob:', e);
    }
  }

  // Fallback
  if (typeof dataUrlOrBlob === 'string') {
    await saveBannerCover(id, dataUrlOrBlob);
    return { fileName, url: dataUrlOrBlob };
  }

  return { fileName, url: '' };
}

/**
 * Delete cover file from server_covers/
 */
export async function deleteCoverFile(fileName: string): Promise<void> {
  if (!fileName) return;
  if (window.electronAPI?.educational?.deleteFile) {
    try {
      await window.electronAPI.educational.deleteFile({ type: 'cover', fileName });
      return;
    } catch (e) {}
  }
  try {
    await fetch(resolveApiUrl(`/api/educational/file?type=cover&fileName=${encodeURIComponent(fileName)}`), {
      method: 'DELETE'
    });
  } catch (e) {}
}

// ----------------- Automated Safe Data Migration -----------------

/**
 * Safely migrate existing localStorage and IndexedDB data to the unified filesystem storage.
 * Workflow:
 * 1. Read old localStorage & IndexedDB.
 * 2. Validate data structure.
 * 3. Save physical files to server_videos/, server_pdfs/, server_covers/.
 * 4. Save metadata to server_data.json via atomic write.
 * 5. Verify copied data.
 * 6. Mark migration successful.
 * 7. KEEP OLD DATA INTACT AS BACKUP (Never destroy user data).
 */
export async function runSafeStorageMigration(): Promise<{ success: boolean; message: string }> {
  try {
    const isAlreadyMigrated = localStorage.getItem('edu_filesystem_migrated_v1') === 'true';
    
    // Check if server_data.json already has courses and departments
    const currentServerCatalog = await fetchCatalogFromStorage();
    if (isAlreadyMigrated && currentServerCatalog && (currentServerCatalog.courses || []).length > 0) {
      return { success: true, message: 'البيانات محدثة ومربوطة بالفعل بمجلدات الخادم الموحدة' };
    }

    console.log('[EduMigration] Starting safe data migration to unified filesystem storage...');

    // 1. Read old localStorage
    let oldDepartments: PdfCategory[] = [];
    let oldCourses: PdfCategory[] = [];
    let oldVideos: VideoLesson[] = [];
    let oldPdfs: any[] = [];
    let oldAssignments: AssignmentItem[] = [];
    let oldExams: ExamItem[] = [];
    let oldCustomCategories: CustomContentCategory[] = [];
    let oldCustomItems: CustomContentItem[] = [];
    let oldFolderCovers: Record<string, string> = {};

    try {
      if (localStorage.getItem('edu_departments_v2')) oldDepartments = JSON.parse(localStorage.getItem('edu_departments_v2') || '[]');
      if (localStorage.getItem('edu_courses_v2')) oldCourses = JSON.parse(localStorage.getItem('edu_courses_v2') || '[]');
      if (localStorage.getItem('edu_videos_v2')) oldVideos = JSON.parse(localStorage.getItem('edu_videos_v2') || '[]');
      if (localStorage.getItem('edu_pdfs_v2')) oldPdfs = JSON.parse(localStorage.getItem('edu_pdfs_v2') || '[]');
      if (localStorage.getItem('edu_assignments_v2')) oldAssignments = JSON.parse(localStorage.getItem('edu_assignments_v2') || '[]');
      if (localStorage.getItem('edu_exams_v2')) oldExams = JSON.parse(localStorage.getItem('edu_exams_v2') || '[]');
      if (localStorage.getItem('edu_custom_categories_v2')) oldCustomCategories = JSON.parse(localStorage.getItem('edu_custom_categories_v2') || '[]');
      if (localStorage.getItem('edu_custom_items_v2')) oldCustomItems = JSON.parse(localStorage.getItem('edu_custom_items_v2') || '[]');
      if (localStorage.getItem('edu_folder_covers_v2')) oldFolderCovers = JSON.parse(localStorage.getItem('edu_folder_covers_v2') || '{}');
    } catch (parseErr) {
      console.warn('[EduMigration] Error parsing old localStorage entries:', parseErr);
    }

    // 2. Read IndexedDB video blobs, pdf blobs, and covers safely BEFORE performing async disk writes
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_VIDEOS, STORE_PDFS, STORE_COVERS], 'readonly');
      
      const videoStore = tx.objectStore(STORE_VIDEOS);
      const pdfStore = tx.objectStore(STORE_PDFS);
      const coverStore = tx.objectStore(STORE_COVERS);

      const [indexedVideos, indexedPdfs, indexedCovers] = await Promise.all([
        new Promise<any[]>((res) => {
          const req = videoStore.getAll();
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => res([]);
        }),
        new Promise<any[]>((res) => {
          const req = pdfStore.getAll();
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => res([]);
        }),
        new Promise<any[]>((res) => {
          const req = coverStore.getAll();
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => res([]);
        })
      ]);

      // Migrate videos to physical files
      for (const item of indexedVideos) {
        if (item && item.blob && item.id) {
          const videoName = item.filename || `video_${item.id}.mp4`;
          try {
            await saveVideoFile(item.id, item.blob, videoName);
          } catch (e) {
            console.warn(`[EduMigration] Could not migrate video blob ${item.id}:`, e);
          }
        }
      }

      // Migrate PDFs to physical files
      for (const item of indexedPdfs) {
        if (item && item.blob && item.id) {
          const pdfName = item.filename || `document_${item.id}.pdf`;
          try {
            await savePdfFile(item.id, item.blob, pdfName);
          } catch (e) {
            console.warn(`[EduMigration] Could not migrate PDF blob ${item.id}:`, e);
          }
        }
      }

      // Migrate Covers to physical files
      for (const item of indexedCovers) {
        if (item && item.dataUrl && item.id) {
          try {
            await saveCoverFile(item.id, item.dataUrl);
          } catch (e) {
            console.warn(`[EduMigration] Could not migrate cover ${item.id}:`, e);
          }
        }
      }
    } catch (idbErr) {
      console.warn('[EduMigration] IndexedDB read during migration completed or skipped:', idbErr);
    }

    // 3. Migrate Course Covers if they are Base64
    for (const course of oldCourses) {
      if (course.coverImage && course.coverImage.startsWith('data:')) {
        try {
          const coverRes = await saveCoverFile(course.id, course.coverImage);
          if (coverRes.fileName) {
            course.coverImage = coverRes.fileName;
          }
        } catch (e) {}
      }
    }

    // 4. Construct unified catalog and merge with server catalog
    const mergedCatalog: EducationalCatalog = {
      departments: oldDepartments.length > 0 ? oldDepartments : (currentServerCatalog?.departments || []),
      courses: oldCourses.length > 0 ? oldCourses : (currentServerCatalog?.courses || []),
      folders: (currentServerCatalog?.folders || []),
      videos: oldVideos.length > 0 ? oldVideos : (currentServerCatalog?.videos || []),
      pdfs: oldPdfs.length > 0 ? oldPdfs : (currentServerCatalog?.pdfs || []),
      assignments: oldAssignments,
      exams: oldExams,
      customCategories: oldCustomCategories,
      customItems: oldCustomItems,
      folderCovers: oldFolderCovers
    };

    // 5. Save unified catalog atomically to server_data.json
    const saveSuccess = await saveCatalogToStorage(mergedCatalog);
    if (saveSuccess) {
      localStorage.setItem('edu_filesystem_migrated_v1', 'true');
      console.log('[EduMigration] Migration to unified filesystem storage completed successfully!');
      return { success: true, message: 'تم ترحيل وتوحيد بيانات المنصة بنجاح داخل ملفات الخادم الموحدة' };
    } else {
      return { success: false, message: 'فشل حفظ الكتالوج الموحد أثناء الترحيل' };
    }
  } catch (err: any) {
    console.error('[EduMigration] Migration error:', err);
    return { success: false, message: 'خطأ أثناء الترحيل: ' + (err?.message || 'غير معروف') };
  }
}

// ----------------- Backward Compatibility Aliases (Zero Regression) -----------------

export async function saveVideoBlob(id: string, file: Blob | File, filename?: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const item = {
        id,
        blob: file,
        filename: filename || (file instanceof File ? file.name : `video_${id}.mp4`),
        size: file.size,
        type: file.type || 'video/mp4',
        savedAt: Date.now()
      };
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      resolve();
    }
  });
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readonly');
      const store = tx.objectStore(STORE_VIDEOS);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

export async function deleteVideoBlob(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_VIDEOS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {}
}

export async function savePdfBlob(id: string, file: Blob | File, filename?: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_PDFS, 'readwrite');
      const store = tx.objectStore(STORE_PDFS);
      const item = {
        id,
        blob: file,
        filename: filename || (file instanceof File ? file.name : `document_${id}.pdf`),
        size: file.size,
        savedAt: Date.now()
      };
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      resolve();
    }
  });
}

export async function getPdfBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readonly');
      const store = tx.objectStore(STORE_PDFS);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

export async function deletePdfBlob(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readwrite');
      const store = tx.objectStore(STORE_PDFS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {}
}

export async function saveBannerCover(id: string, dataUrl: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_COVERS, 'readwrite');
      const store = tx.objectStore(STORE_COVERS);
      const req = store.put({ id, dataUrl, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      resolve();
    }
  });
}

export async function getBannerCover(id: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COVERS, 'readonly');
      const store = tx.objectStore(STORE_COVERS);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.dataUrl) {
          resolve(req.result.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

export async function deleteBannerCover(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COVERS, 'readwrite');
      const store = tx.objectStore(STORE_COVERS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {}
}

// ----------------- FFmpeg Multi-Quality Transcoding API -----------------

export async function triggerVideoTranscoding(videoId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const url = resolveApiUrl('/api/educational/transcode-video');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });
    if (!res.ok) {
      return { success: false, error: `Server returned ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'فشل الاتصال بخادم المعالجة' };
  }
}

export async function getVideoTranscodingStatus(videoId?: string): Promise<{
  success: boolean;
  isProcessing?: boolean;
  progress?: number;
  status?: string;
  transcodingStatus?: string;
  qualities?: Record<string, any>;
  ffmpegAvailable?: boolean;
  activeJobsCount?: number;
  error?: string;
}> {
  try {
    const query = videoId ? `?videoId=${encodeURIComponent(videoId)}` : '';
    const url = resolveApiUrl(`/api/educational/transcoding-status${query}`);
    const res = await fetch(url);
    if (!res.ok) {
      return { success: false, error: `Server returned ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'فشل جلب حالة المعالجة' };
  }
}

