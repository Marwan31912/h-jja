/**
 * Hojja Educational Platform - Mobile Bridge & Video Streaming Backend
 * 
 * Provides APIs for Android Mobile Application:
 * 1. Health & Server Info
 * 2. Mobile Auth & Session Token Handshake
 * 3. Courses & Departments Catalog (Scoped filtering)
 * 4. Local Filesystem Video Management (Upload/Sync from PC)
 * 5. Secure Signed Temporary Playback Tokens (expiring in 15-60 mins)
 * 6. High-Performance HTTP Range Stream Handler (206 Partial Content) for ExoPlayer/Media3
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Secret key for generating signed HMAC playback tokens
const TOKEN_SECRET = process.env.HOJJA_STREAM_SECRET || 'hojja-educational-secure-stream-key-2026';

// Storage directories on host PC
const VIDEOS_STORAGE_DIR = path.resolve(process.cwd(), 'server_videos');
const COVERS_STORAGE_DIR = path.resolve(process.cwd(), 'server_covers');
const PDFS_STORAGE_DIR = path.resolve(process.cwd(), 'server_pdfs');
const DATA_STORE_FILE = path.resolve(process.cwd(), 'server_data.json');

// Ensure storage directories exist
[VIDEOS_STORAGE_DIR, COVERS_STORAGE_DIR, PDFS_STORAGE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// In-Memory Database / Sync File
interface ServerCatalog {
  departments: Array<{ id: string; name: string; icon?: string; code?: string }>;
  courses: Array<{
    id: string;
    title: string;
    description?: string;
    departmentId: string;
    category?: string;
    instructor?: string;
    coverImage?: string;
    lessonsCount?: number;
  }>;
  folders: Array<{
    id: string;
    name: string;
    courseId: string;
    parentId?: string;
  }>;
  videos: Array<{
    id: string;
    title: string;
    description?: string;
    fileName: string;
    fileSize: number;
    duration?: string;
    author?: string;
    courseId: string;
    folderId: string;
    coverImage?: string;
    addedAt: number;
  }>;
  pdfs: Array<{
    id: string;
    name: string;
    fileName: string;
    size: number;
    pageCount?: number;
    author?: string;
    courseId: string;
    folderId: string;
    addedAt: number;
  }>;
}

function loadCatalog(): ServerCatalog {
  try {
    if (fs.existsSync(DATA_STORE_FILE)) {
      const content = fs.readFileSync(DATA_STORE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[Hojja Backend] Error reading catalog:', e);
  }
  
  // Default Initial Sample Dataset
  return {
    departments: [
      { id: 'dept_cs', name: 'قسم علوم الحاسوب وهندسة البرمجيات', icon: 'Cpu', code: 'CS' },
      { id: 'dept_it', name: 'قسم تقنية المعلومات والشبكات', icon: 'Network', code: 'IT' },
      { id: 'dept_is', name: 'قسم نظم المعلومات الإدارية', icon: 'Database', code: 'IS' }
    ],
    courses: [
      {
        id: 'course_ds_algo',
        title: 'الخوارزميات وهياكل البيانات (Data Structures & Algorithms)',
        description: 'شرح عملي تطبيقي لمفاهيم الخوارزميات وهياكل البيانات الأساسية والمتقدمة',
        departmentId: 'dept_cs',
        category: 'البرمجة والتطوير',
        instructor: 'د. محمد علي',
        coverImage: '/covers/algo_cover.jpg',
        lessonsCount: 12
      },
      {
        id: 'course_db_design',
        title: 'تصميم وإدارة قواعد البيانات SQL & NoSQL',
        description: 'مبادئ تصميم الجداول والعلاقات وتطوير واجهات الاستعلام وتحسين الأداء',
        departmentId: 'dept_cs',
        category: 'قواعد البيانات',
        instructor: 'م. سارة محمود',
        coverImage: '/covers/db_cover.jpg',
        lessonsCount: 8
      },
      {
        id: 'course_networks',
        title: 'أساسيات وبروتوكولات شبكات الحاسوب CCNA',
        description: 'مفاهيم TCP/IP والتوجيه والتبديل وأمن الشبكات السلكية واللاسلكية',
        departmentId: 'dept_it',
        category: 'الشبكات والأنظمة',
        instructor: 'م. أحمد خالد',
        coverImage: '/covers/net_cover.jpg',
        lessonsCount: 10
      }
    ],
    folders: [
      { id: 'fld_ch1', name: 'الوحدة الأولى: المفاهيم الأساسية', courseId: 'course_ds_algo' },
      { id: 'fld_ch2', name: 'الوحدة الثانية: المصفوفات والقوائم المترابطة', courseId: 'course_ds_algo' }
    ],
    videos: [
      {
        id: 'vid_sample_1',
        title: 'الدرس الأول: مدخل ومقدمة إلى تعقيد الخوارزميات (Big-O Notation)',
        description: 'شرح تحليلي لتقييم سرعة وتنفيذ الأكواد وحساب الوقت والمساحة',
        fileName: 'lesson_1_intro.mp4',
        fileSize: 45000000,
        duration: '24:15',
        author: 'د. محمد علي',
        courseId: 'course_ds_algo',
        folderId: 'fld_ch1',
        addedAt: Date.now()
      },
      {
        id: 'vid_sample_2',
        title: 'الدرس الثاني: بنية القوائم المترابطة (Singly & Doubly Linked Lists)',
        description: 'تطبيق عملي لإنشاء العقد وتتبع المؤشرات وإدراج وحذف العناصر',
        fileName: 'lesson_2_linked_list.mp4',
        fileSize: 68000000,
        duration: '35:40',
        author: 'د. محمد علي',
        courseId: 'course_ds_algo',
        folderId: 'fld_ch2',
        addedAt: Date.now()
      }
    ],
    pdfs: [
      {
        id: 'pdf_sample_1',
        name: 'ملخص محاضرات الخوارزميات الشامل.pdf',
        fileName: 'algorithms_handout.pdf',
        size: 3200000,
        pageCount: 48,
        author: 'د. محمد علي',
        courseId: 'course_ds_algo',
        folderId: 'fld_ch1',
        addedAt: Date.now()
      }
    ]
  };
}

function saveCatalog(data: ServerCatalog) {
  try {
    fs.writeFileSync(DATA_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Hojja Backend] Error writing catalog:', e);
  }
}

// ----------------- Security: Token Generation & Verification -----------------
export interface StreamTokenPayload {
  videoId: string;
  userId?: string;
  deviceId?: string;
  clientIp?: string;
  exp: number; // Unix Epoch timestamp (ms)
}

/**
 * Generate a cryptographically signed HMAC token for temporary video playback
 */
export function generateSignedStreamToken(payload: StreamTokenPayload): string {
  const json = JSON.stringify(payload);
  const base64Data = Buffer.from(json).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Verify and decode HMAC signed playback token
 */
export function verifySignedStreamToken(token: string): { valid: boolean; payload?: StreamTokenPayload; error?: string } {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'تنسيق رمز الدخول غير صحيح (Invalid Token Format)' };
  }

  const [base64Data, signature] = token.split('.');
  if (!base64Data || !signature) {
    return { valid: false, error: 'رمز الدخول غير مكتمل' };
  }

  const expectedSignature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(base64Data)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'التوقيع الرقمي للرابط غير صالح أو تم التلاعب به (Invalid Signature)' };
  }

  try {
    const rawJson = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const payload: StreamTokenPayload = JSON.parse(rawJson);

    // Check expiration timestamp
    if (Date.now() > payload.exp) {
      return { valid: false, error: 'انتهت صلاحية رابط البث المؤقت (Stream Token Expired). يرجى التجديد.' };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: 'فشل فك تشفير بيانات الرمز' };
  }
}

// ----------------- Helper: HTTP Range Streamer (206 Partial Content) -----------------
export function streamVideoWithRange(
  filePath: string,
  rangeHeader: string | undefined,
  req: any,
  res: any
) {
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'ملف الفيديو المطلوب غير موجود على الخادم' }));
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  if (rangeHeader) {
    // Range format: "bytes=start-end"
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      res.statusCode = 416; // Requested Range Not Satisfiable
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    const chunksize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.statusCode = 206; // Partial Content
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', chunksize);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    stream.pipe(res);
  } else {
    // Full File Stream
    res.statusCode = 200;
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    fs.createReadStream(filePath).pipe(res);
  }
}

// ----------------- Vite / Express Plugin Middleware -----------------
export function hojjaMobileBackendPlugin() {
  return {
    name: 'hojja-mobile-backend-middleware',
    configureServer(server: any) {
      
      // Helper for CORS & JSON Responses
      const sendJson = (res: any, data: any, status = 200) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, X-Device-Id');
        res.end(JSON.stringify(data));
      };

      const parseJsonBody = (req: any): Promise<any> => {
        return new Promise((resolve) => {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (e) {
              resolve({});
            }
          });
        });
      };

      // 1. Health check & Server discovery for Android App
      server.middlewares.use('/api/mobile/health', (req: any, res: any) => {
        sendJson(res, {
          status: 'ok',
          platform: 'منصة حجة التعليمية والأكاديمية - Backend Bridge',
          version: '1.0.0',
          timestamp: Date.now(),
          serverStorageDir: VIDEOS_STORAGE_DIR,
          features: [
            'department_scoped_courses',
            'signed_temporary_urls',
            'http_range_video_streaming',
            'exoplayer_resumable_playback',
            'offline_sync'
          ]
        });
      });

      // 2. Authentication & Handshake (Mobile login/guest token)
      server.middlewares.use('/api/mobile/auth/handshake', async (req: any, res: any) => {
        if (req.method === 'OPTIONS') return sendJson(res, {});
        const body = await parseJsonBody(req);
        const deviceId = body.deviceId || req.headers['x-device-id'] || 'device_' + Math.random().toString(36).substring(2, 8);
        const username = body.username || 'طالب منصة حجة';

        const sessionToken = crypto
          .createHmac('sha256', TOKEN_SECRET)
          .update(`${deviceId}_${Date.now()}`)
          .digest('hex');

        sendJson(res, {
          success: true,
          token: sessionToken,
          user: {
            id: 'usr_' + deviceId.substring(0, 8),
            name: username,
            deviceId: deviceId,
            role: 'student'
          }
        });
      });

      // 3. Departments List
      server.middlewares.use('/api/mobile/departments', (req: any, res: any) => {
        if (req.method === 'OPTIONS') return sendJson(res, {});
        const catalog = loadCatalog();
        sendJson(res, { success: true, departments: catalog.departments });
      });

      // 4. Scoped Courses by Department
      server.middlewares.use('/api/mobile/courses', (req: any, res: any) => {
        if (req.method === 'OPTIONS') return sendJson(res, {});
        const urlObj = new URL(req.url, 'http://localhost:3000');
        const departmentId = urlObj.searchParams.get('departmentId');
        
        const catalog = loadCatalog();
        let filtered = catalog.courses;
        if (departmentId) {
          filtered = catalog.courses.filter(c => c.departmentId === departmentId);
        }

        sendJson(res, {
          success: true,
          count: filtered.length,
          departmentId: departmentId || 'all',
          courses: filtered
        });
      });

      // 5. Course Details & Tree (Folders, Videos, PDFs)
      server.middlewares.use('/api/mobile/course-content', (req: any, res: any) => {
        if (req.method === 'OPTIONS') return sendJson(res, {});
        const urlObj = new URL(req.url, 'http://localhost:3000');
        const courseId = urlObj.searchParams.get('courseId');

        if (!courseId) {
          return sendJson(res, { success: false, error: 'المعرف courseId مطلوب' }, 400);
        }

        const catalog = loadCatalog();
        const course = catalog.courses.find(c => c.id === courseId);
        if (!course) {
          return sendJson(res, { success: false, error: 'الكورس غير موجود' }, 404);
        }

        const folders = catalog.folders.filter(f => f.courseId === courseId);
        const videos = catalog.videos.filter(v => v.courseId === courseId);
        const pdfs = catalog.pdfs.filter(p => p.courseId === courseId);

        sendJson(res, {
          success: true,
          course,
          folders,
          videos,
          pdfs
        });
      });

      // 6. Request Temporary Signed Playback URL for a Video
      server.middlewares.use('/api/mobile/media/request-playback-url', async (req: any, res: any) => {
        if (req.method === 'OPTIONS') return sendJson(res, {});
        if (req.method !== 'POST') {
          return sendJson(res, { error: 'Method Not Allowed' }, 405);
        }

        const body = await parseJsonBody(req);
        const { videoId, validityMinutes = 30, deviceId } = body;

        if (!videoId) {
          return sendJson(res, { success: false, error: 'معرف الفيديو videoId مطلوب' }, 400);
        }

        const catalog = loadCatalog();
        const video = catalog.videos.find(v => v.id === videoId);
        if (!video) {
          return sendJson(res, { success: false, error: 'الفيديو غير موجود في قاعدة بيانات المنصة' }, 404);
        }

        // Validity timestamp (default 30 mins)
        const expirationTime = Date.now() + Math.max(5, Math.min(validityMinutes, 180)) * 60 * 1000;

        const payload: StreamTokenPayload = {
          videoId: video.id,
          deviceId: deviceId || 'unknown',
          exp: expirationTime
        };

        const signedToken = generateSignedStreamToken(payload);
        
        // Host dynamic URL
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host || 'localhost:3000';
        const streamUrl = `${protocol}://${host}/api/mobile/stream?token=${encodeURIComponent(signedToken)}`;

        sendJson(res, {
          success: true,
          videoId: video.id,
          title: video.title,
          duration: video.duration,
          expiresAt: new Date(expirationTime).toISOString(),
          expiresInSeconds: Math.round((expirationTime - Date.now()) / 1000),
          playbackUrl: streamUrl,
          signedToken: signedToken,
          fileSize: video.fileSize,
          requiresRangeSupport: true
        });
      });

      // 7. Video Stream Handler (Token Verified + HTTP Range Support for ExoPlayer)
      server.middlewares.use('/api/mobile/stream', (req: any, res: any) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, X-Device-Id');
          res.statusCode = 200;
          res.end();
          return;
        }

        const urlObj = new URL(req.url, 'http://localhost:3000');
        const token = urlObj.searchParams.get('token') || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : '');

        if (!token) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'رمز الدخول المؤقت مفقود (Missing Temporary Stream Token)' }));
          return;
        }

        const verification = verifySignedStreamToken(token);
        if (!verification.valid || !verification.payload) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: verification.error || 'رمز الوصول المؤقت غير صالح أو منتهي' }));
          return;
        }

        const videoId = verification.payload.videoId;
        const catalog = loadCatalog();
        const video = catalog.videos.find(v => v.id === videoId);

        if (!video) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'الفيديو المطلوب غير متوفر' }));
          return;
        }

        // Check if file exists on disk in server_videos
        const localVideoPath = path.join(VIDEOS_STORAGE_DIR, video.fileName);
        if (fs.existsSync(localVideoPath)) {
          return streamVideoWithRange(localVideoPath, req.headers.range, req, res);
        }

        // Fallback: If not on disk yet, serve a standard valid MP4 demo buffer or mock response
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'ملف الفيديو غير موجود في مجلد server_videos على جهازك',
          hint: `يرجى وضع ملف الفيديو باسم [${video.fileName}] داخل المجلد: ${VIDEOS_STORAGE_DIR}`
        }));
      });

      // 8. Sync Catalog API (Allows Web Platform UI to sync its local state to Backend)
      server.middlewares.use('/api/mobile/sync/save-catalog', async (req: any, res: any) => {
        if (req.method === 'OPTIONS') return sendJson(res, {});
        if (req.method !== 'POST') return sendJson(res, { error: 'Method Not Allowed' }, 405);

        const body = await parseJsonBody(req);
        if (body && typeof body === 'object') {
          saveCatalog(body);
          sendJson(res, { success: true, message: 'تمت مزامنة بيانات الكورسات والفيديوهات بنجاح مع الخادم' });
        } else {
          sendJson(res, { success: false, error: 'بيانات غير صالحة' }, 400);
        }
      });

      // 9. Get Local Storage Info & Discovered Files on PC
      server.middlewares.use('/api/mobile/sync/status', (req: any, res: any) => {
        if (req.method === 'OPTIONS') return sendJson(res, {});
        const filesInDir = fs.readdirSync(VIDEOS_STORAGE_DIR);
        const catalog = loadCatalog();

        sendJson(res, {
          success: true,
          videosDirectory: VIDEOS_STORAGE_DIR,
          totalVideosOnDisk: filesInDir.length,
          files: filesInDir.map(f => {
            const stat = fs.statSync(path.join(VIDEOS_STORAGE_DIR, f));
            return { name: f, size: stat.size };
          }),
          catalogSummary: {
            departmentsCount: catalog.departments.length,
            coursesCount: catalog.courses.length,
            videosCount: catalog.videos.length,
            pdfsCount: catalog.pdfs.length
          }
        });
      });

    }
  };
}
