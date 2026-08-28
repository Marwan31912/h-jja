const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =========================================================================
// FFMPEG & MULTI-QUALITY VIDEO PROCESSING ENGINE
// =========================================================================
let ffmpegInstance = null;
let ffmpegAvailable = false;
let ffmpegPathResolved = null;

function findBinaryInDir(baseDir, binaryName, maxDepth = 3) {
  if (!baseDir || !fs.existsSync(baseDir)) return null;
  try {
    const directPath = path.join(baseDir, binaryName);
    if (fs.existsSync(directPath)) return directPath;

    if (maxDepth <= 0) return null;

    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip heavy irrelevant folders
        if (['node_modules', '.git', 'dist', 'dist-electron', 'server_videos', 'server_pdfs', 'server_covers', 'src'].includes(entry.name)) {
          continue;
        }
        const subDir = path.join(baseDir, entry.name);
        const found = findBinaryInDir(subDir, binaryName, maxDepth - 1);
        if (found) return found;
      }
    }
  } catch (e) {}
  return null;
}

function resolveFFmpegBinary() {
  try {
    const fluentFfmpeg = require('fluent-ffmpeg');
    const isWin = process.platform === 'win32';
    const binaryName = isWin ? 'ffmpeg.exe' : 'ffmpeg';
    const probeName = isWin ? 'ffprobe.exe' : 'ffprobe';

    // 1. Try @ffmpeg-installer/ffmpeg package
    let installerPath = null;
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
      if (ffmpegInstaller && ffmpegInstaller.path) {
        installerPath = ffmpegInstaller.path;
      }
    } catch (e) {}

    // Fix for Electron asar packaging path
    if (installerPath && typeof installerPath === 'string') {
      const fixedAsarPath = installerPath.replace('app.asar', 'app.asar.unpacked');
      if (fs.existsSync(fixedAsarPath)) {
        installerPath = fixedAsarPath;
      }
    }

    // 2. Candidate root search folders
    const rootSearchDirs = [
      path.join(process.cwd(), 'bin'),
      process.cwd(),
      path.join(__dirname, 'bin'),
      path.join(__dirname, '..', 'bin'),
      path.join(__dirname, '..'),
      process.resourcesPath ? path.join(process.resourcesPath, 'bin') : null,
      process.resourcesPath || null,
      isWin ? 'C:\\ffmpeg' : null,
      isWin ? 'C:\\Program Files\\ffmpeg' : null,
      isWin ? 'D:\\ffmpeg' : null,
      isWin ? 'E:\\ffmpeg' : null,
      isWin && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'ffmpeg') : null,
      isWin && process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Downloads') : null
    ].filter(Boolean);

    let chosenPath = null;

    // Check if installer path works
    if (installerPath && fs.existsSync(installerPath)) {
      chosenPath = installerPath;
    }

    // Check env variable
    if (!chosenPath && process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
      chosenPath = process.env.FFMPEG_PATH;
    }

    // Search inside candidate root directories (handles nested extracted zips like bin/ffmpeg-xxx/bin/ffmpeg.exe)
    if (!chosenPath) {
      for (const searchDir of rootSearchDirs) {
        const found = findBinaryInDir(searchDir, binaryName, 3);
        if (found) {
          chosenPath = found;
          break;
        }
      }
    }

    // Check fixed system paths on Linux / macOS
    if (!chosenPath && !isWin) {
      const unixPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'];
      for (const p of unixPaths) {
        if (fs.existsSync(p)) {
          chosenPath = p;
          break;
        }
      }
    }

    // Check system PATH via where/which
    if (!chosenPath) {
      try {
        const { execSync } = require('child_process');
        const cmd = isWin ? 'where ffmpeg' : 'which ffmpeg';
        const stdout = execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
        if (stdout && stdout.trim()) {
          const firstLine = stdout.trim().split('\n')[0].trim();
          if (fs.existsSync(firstLine)) {
            chosenPath = firstLine;
          } else {
            chosenPath = 'ffmpeg';
          }
        }
      } catch (e) {}
    }

    if (chosenPath) {
      fluentFfmpeg.setFfmpegPath(chosenPath);

      // Also auto-locate ffprobe in the same folder or search tree
      const binaryDir = path.dirname(chosenPath);
      const probeCandidate = path.join(binaryDir, probeName);
      if (fs.existsSync(probeCandidate)) {
        try {
          fluentFfmpeg.setFfprobePath(probeCandidate);
        } catch (e) {}
      }

      // Add bin directory to PATH so any sub-spawned commands find it
      if (binaryDir && !process.env.PATH?.includes(binaryDir)) {
        process.env.PATH = `${binaryDir}${path.delimiter}${process.env.PATH || ''}`;
      }

      ffmpegInstance = fluentFfmpeg;
      ffmpegAvailable = true;
      ffmpegPathResolved = chosenPath;
      console.log('[Shared Backend] FFmpeg detected & configured successfully at:', chosenPath);
    } else {
      fluentFfmpeg.setFfmpegPath('ffmpeg');
      ffmpegInstance = fluentFfmpeg;
      ffmpegAvailable = false;
      ffmpegPathResolved = null;
      console.warn('[Shared Backend] FFmpeg binary not detected in bin/, project root, or system PATH.');
    }
  } catch (err) {
    console.warn('[Shared Backend] Notice: FFmpeg initialization error:', err.message);
  }
}

resolveFFmpegBinary();

/**
 * Active background transcoding jobs tracker
 */
const activeTranscodeJobs = new Map();

/**
 * Extract high-resolution video thumbnail poster frame
 */
function extractVideoThumbnail(videoPath, outputPath) {
  return new Promise((resolve) => {
    if (!ffmpegAvailable || !ffmpegInstance) {
      resolveFFmpegBinary();
    }
    if (!ffmpegAvailable || !ffmpegInstance) {
      return resolve({ success: false, error: 'FFmpeg غير متاح على الخادم' });
    }
    if (!fs.existsSync(videoPath)) {
      return resolve({ success: false, error: 'ملف الفيديو غير موجود' });
    }

    try {
      const outDir = path.dirname(outputPath);
      const outName = path.basename(outputPath);
      ensureDirSync(outDir);

      ffmpegInstance(videoPath)
        .on('end', () => {
          console.log('[FFmpeg] Thumbnail poster generated successfully:', outName);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          console.warn('[FFmpeg] Thumbnail extraction warning:', err.message);
          resolve({ success: false, error: err.message });
        })
        .screenshots({
          count: 1,
          folder: outDir,
          filename: outName,
          timestamps: ['1.5', '10%'],
          size: '1280x720'
        });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

/**
 * Transcode single quality video profile
 */
function transcodeSingleQuality(inputPath, outputPath, config) {
  return new Promise((resolve) => {
    if (!ffmpegAvailable || !ffmpegInstance) {
      resolveFFmpegBinary();
    }
    if (!ffmpegAvailable || !ffmpegInstance) {
      return resolve({ success: false, error: 'FFmpeg غير مثبت' });
    }

    try {
      const outDir = path.dirname(outputPath);
      ensureDirSync(outDir);

      // Safe temporary output path to avoid partially corrupt file locks
      const tempOutputPath = `${outputPath}.tmp.mp4`;
      if (fs.existsSync(tempOutputPath)) {
        try { fs.unlinkSync(tempOutputPath); } catch (e) {}
      }

      // Safe and robust scaling filter ensuring dimensions are divisible by 2 for H.264
      const scaleFilter = `scale=-2:${config.height}:flags=lanczos,scale=trunc(iw/2)*2:trunc(ih/2)*2`;

      let hasEnded = false;
      let timer = null;

      const command = ffmpegInstance(inputPath)
        .output(tempOutputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate(config.audioBitrate || '128k')
        .outputOptions([
          '-y',
          '-nostdin',
          '-vf', scaleFilter,
          '-preset veryfast',
          `-crf ${config.crf || 24}`,
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          '-threads 0'
        ])
        .on('progress', (progress) => {
          if (config.onProgress && !hasEnded) {
            config.onProgress(progress.percent || 0);
          }
        })
        .on('end', () => {
          if (hasEnded) return;
          hasEnded = true;
          if (timer) clearTimeout(timer);

          try {
            if (fs.existsSync(outputPath)) {
              try { fs.unlinkSync(outputPath); } catch (e) {}
            }
            if (fs.existsSync(tempOutputPath)) {
              fs.renameSync(tempOutputPath, outputPath);
            }
          } catch (renErr) {
            console.warn('[FFmpeg] Rename temp file warning:', renErr.message);
          }

          const stats = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;
          console.log(`[FFmpeg] Transcode finished for ${config.quality}: ${path.basename(outputPath)} (${stats ? Math.round(stats.size / 1024 / 1024) + 'MB' : 'ok'})`);
          resolve({
            success: true,
            quality: config.quality,
            outputPath,
            fileName: path.basename(outputPath),
            fileSize: stats ? stats.size : 0
          });
        })
        .on('error', (err) => {
          if (hasEnded) return;
          hasEnded = true;
          if (timer) clearTimeout(timer);

          if (fs.existsSync(tempOutputPath)) {
            try { fs.unlinkSync(tempOutputPath); } catch (e) {}
          }
          console.error(`[FFmpeg] Transcoding error for ${config.quality}:`, err.message);
          resolve({ success: false, quality: config.quality, error: err.message });
        });

      // 10 minutes timeout safeguard per quality profile
      timer = setTimeout(() => {
        if (!hasEnded) {
          hasEnded = true;
          try {
            command.kill('SIGKILL');
          } catch (kErr) {}
          if (fs.existsSync(tempOutputPath)) {
            try { fs.unlinkSync(tempOutputPath); } catch (e) {}
          }
          console.warn(`[FFmpeg] Transcode timed out for ${config.quality}`);
          resolve({ success: false, quality: config.quality, error: 'انتهت مهلة المعالجة' });
        }
      }, 10 * 60 * 1000);

      command.run();
    } catch (e) {
      resolve({ success: false, quality: config.quality, error: e.message });
    }
  });
}

/**
 * Background multi-quality video transcoder pipeline (720p, 480p, 360p)
 */
async function processVideoMultiQuality(videoId, dataFile, videosDir, coversDir) {
  if (!ffmpegAvailable || !ffmpegInstance) {
    resolveFFmpegBinary();
  }
  if (!ffmpegAvailable || !ffmpegInstance) {
    console.warn('[FFmpeg Pipeline] Cannot transcode: FFmpeg is not available');
    return { success: false, error: 'FFmpeg غير متاح على النظام. تأكد من تثبيت FFmpeg أو إضافته إلى مجلد bin' };
  }

  const catalog = loadCatalog(dataFile);
  const video = (catalog.videos || []).find(v => v.id === videoId);
  if (!video || !video.fileName) {
    return { success: false, error: 'الفيديو غير موجود في قاعدة البيانات' };
  }

  const inputVideoPath = path.join(videosDir, video.fileName);
  if (!fs.existsSync(inputVideoPath)) {
    return { success: false, error: `ملف الفيديو الأصلي غير موجود: ${video.fileName}` };
  }

  if (activeTranscodeJobs.has(videoId)) {
    return { success: true, message: 'المعالجة جارية بالفعل في الخلفية', status: 'processing' };
  }

  const job = {
    videoId,
    startedAt: Date.now(),
    progress: 5,
    status: 'processing',
    qualitiesDone: [],
    qualities: video.qualities || {}
  };
  activeTranscodeJobs.set(videoId, job);

  // Update status in catalog
  video.transcodingStatus = 'processing';
  video.transcodeProgress = 5;
  saveCatalogSafe(dataFile, catalog);

  // Run async in background without blocking callers
  (async () => {
    try {
      const baseName = path.parse(video.fileName).name;
      const originalSize = fs.existsSync(inputVideoPath) ? fs.statSync(inputVideoPath).size : (video.fileSize || 0);

      // 1. Auto-generate thumbnail poster if missing
      const thumbFileName = `cover_${videoId}.jpg`;
      const thumbPath = path.join(coversDir, thumbFileName);
      if (!video.coverImage || !fs.existsSync(path.join(coversDir, video.coverImage))) {
        const thumbRes = await extractVideoThumbnail(inputVideoPath, thumbPath);
        if (thumbRes.success) {
          video.coverImage = thumbFileName;
        }
      }

      // Initialize qualities map
      if (!video.qualities) {
        video.qualities = {};
      }
      video.qualities['1080p'] = {
        quality: '1080p',
        label: 'الأصلية / فائقة الوضوح (1080p)',
        fileName: video.fileName,
        fileSize: originalSize,
        height: 1080
      };

      // Quality Profiles
      const profiles = [
        { quality: '720p', height: 720, crf: 23, audioBitrate: '128k', label: 'عالية (720p HD)' },
        { quality: '480p', height: 480, crf: 26, audioBitrate: '96k', label: 'متوسطة سريعة (480p SD)' },
        { quality: '360p', height: 360, crf: 28, audioBitrate: '64k', label: 'اقتصادية للإنترنت الضعيف (360p)' }
      ];

      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i];
        const outFileName = `${baseName}_${profile.quality}.mp4`;
        const outPath = path.join(videosDir, outFileName);

        console.log(`[FFmpeg Pipeline] Starting ${profile.quality} for video: ${video.title || video.fileName}`);
        const result = await transcodeSingleQuality(inputVideoPath, outPath, {
          ...profile,
          onProgress: (p) => {
            // Cap intermediate progress at 95% so it only hits 100% when truly done
            const rawProgress = ((i + (Math.min(99, p) / 100)) / profiles.length) * 100;
            job.progress = Math.min(95, Math.max(5, Math.round(rawProgress)));
          }
        });

        if (result.success) {
          video.qualities[profile.quality] = {
            quality: profile.quality,
            label: profile.label,
            fileName: outFileName,
            fileSize: result.fileSize,
            height: profile.height
          };
          job.qualitiesDone.push(profile.quality);
          job.qualities = video.qualities;
        }
      }

      video.transcodingStatus = 'completed';
      video.transcodeProgress = 100;
      job.status = 'completed';
      job.progress = 100;
      job.qualities = video.qualities;

      // Save final updated catalog
      const updatedCatalog = loadCatalog(dataFile);
      const targetIndex = (updatedCatalog.videos || []).findIndex(v => v.id === videoId);
      if (targetIndex !== -1) {
        updatedCatalog.videos[targetIndex] = {
          ...updatedCatalog.videos[targetIndex],
          coverImage: video.coverImage,
          qualities: video.qualities,
          transcodingStatus: 'completed',
          transcodeProgress: 100
        };
        saveCatalogSafe(dataFile, updatedCatalog);
      }
      console.log(`[FFmpeg Pipeline] Multi-quality transcoding COMPLETED for ${videoId}`);
    } catch (err) {
      console.error(`[FFmpeg Pipeline] Critical transcoding error for ${videoId}:`, err);
      job.status = 'failed';
      job.error = err.message || 'خطأ أثناء المعالجة';
      video.transcodingStatus = 'failed';
      saveCatalogSafe(dataFile, catalog);
    } finally {
      // Clear job after brief delay so client immediately gets completed status
      setTimeout(() => {
        activeTranscodeJobs.delete(videoId);
      }, 2000);
    }
  })();

  return { success: true, message: 'بدأت عملية معالجة الجودات المتعددة في الخلفية', videoId };
}

/**
 * Default catalog data fallback if server_data.json is empty or not found.
 */
const DEFAULT_CATALOG = {
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
      coverImage: '',
      lessonsCount: 12
    },
    {
      id: 'course_db_design',
      title: 'تصميم وإدارة قواعد البيانات SQL & NoSQL',
      description: 'مبادئ تصميم الجداول والعلاقات وتطوير واجهات الاستعلام وتحسين الأداء',
      departmentId: 'dept_cs',
      category: 'قواعد البيانات',
      instructor: 'م. سارة محمود',
      coverImage: '',
      lessonsCount: 8
    },
    {
      id: 'course_networks',
      title: 'أساسيات وبروتوكولات شبكات الحاسوب CCNA',
      description: 'مفاهيم TCP/IP والتوجيه والتبديل وأمن الشبكات السلكية واللاسلكية',
      departmentId: 'dept_it',
      category: 'الشبكات والأنظمة',
      instructor: 'م. أحمد خالد',
      coverImage: '',
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
      addedAt: 1700000000000
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
      addedAt: 1700000000000
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
      addedAt: 1700000000000
    }
  ]
};

/**
 * Helper to ensure directory exists safely
 */
function ensureDirSync(dirPath) {
  if (dirPath && !fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (e) {
      console.error(`[Shared Backend] Failed to create directory: ${dirPath}`, e);
    }
  }
}

/**
 * Load catalog data from designated file path
 */
function loadCatalog(dataFile) {
  try {
    if (fs.existsSync(dataFile)) {
      const content = fs.readFileSync(dataFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return {
          departments: Array.isArray(parsed.departments) ? parsed.departments : [],
          courses: Array.isArray(parsed.courses) ? parsed.courses : [],
          folders: Array.isArray(parsed.folders) ? parsed.folders : [],
          videos: Array.isArray(parsed.videos) ? parsed.videos : [],
          pdfs: Array.isArray(parsed.pdfs) ? parsed.pdfs : [],
          assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
          exams: Array.isArray(parsed.exams) ? parsed.exams : [],
          customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
          customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
          folderCovers: (parsed.folderCovers && typeof parsed.folderCovers === 'object') ? parsed.folderCovers : {}
        };
      }
    }
  } catch (e) {
    console.error('[Shared Backend] Error reading catalog file:', e);
  }
  return DEFAULT_CATALOG;
}

/**
 * Save catalog data atomically with verification and backup
 */
function saveCatalogSafe(dataFile, data) {
  try {
    const dir = path.dirname(dataFile);
    ensureDirSync(dir);

    const tmpFile = path.join(dir, `.server_data_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.tmp`);
    const bakFile = dataFile + '.bak';
    const jsonString = JSON.stringify(data, null, 2);

    // 1. Write to temporary file
    fs.writeFileSync(tmpFile, jsonString, 'utf-8');

    // 2. Verify written file can be read and parsed correctly
    const verifiedContent = fs.readFileSync(tmpFile, 'utf-8');
    JSON.parse(verifiedContent);

    // 3. Backup existing valid catalog if present
    if (fs.existsSync(dataFile)) {
      try {
        fs.copyFileSync(dataFile, bakFile);
      } catch (backupErr) {
        console.warn('[Shared Backend] Notice: Could not create backup copy of catalog:', backupErr);
      }
    }

    // 4. Atomic rename to target file path
    fs.renameSync(tmpFile, dataFile);
    return true;
  } catch (e) {
    console.error('[Shared Backend] Critical Error in saveCatalogSafe:', e);
    return false;
  }
}

/**
 * Backward compatible alias
 */
function saveCatalog(dataFile, data) {
  return saveCatalogSafe(dataFile, data);
}

/**
 * Generate HMAC SHA256 signed token
 */
function generateSignedStreamToken(payload, secret) {
  const json = JSON.stringify(payload);
  const base64Data = Buffer.from(json).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Verify HMAC SHA256 signed token
 */
function verifySignedStreamToken(token, secret) {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'تنسيق رمز الدخول غير صحيح' };
  }
  const [base64Data, signature] = token.split('.');
  if (!base64Data || !signature) {
    return { valid: false, error: 'رمز الدخول غير مكتمل' };
  }
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(base64Data)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'التوقيع الرقمي للرابط غير صالح' };
  }

  try {
    const rawJson = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const payload = JSON.parse(rawJson);
    if (Date.now() > payload.exp) {
      return { valid: false, error: 'انتهت صلاحية رابط البث المؤقت' };
    }
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: 'فشل فك تشفير بيانات الرمز' };
  }
}

/**
 * Handle HTTP 206 Partial Content video streaming
 */
function streamVideoWithRange(filePath, rangeHeader, req, res) {
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'ملف الفيديو غير موجود على الخادم' }));
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    const chunksize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', chunksize);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    stream.pipe(res);
  } else {
    res.statusCode = 200;
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    fs.createReadStream(filePath).pipe(res);
  }
}

/**
 * Standard JSON Response Sender with CORS
 */
function sendJson(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, X-Device-Id');
  res.end(JSON.stringify(data));
}

/**
 * Normalizes cover images:
 * - If base64, saves as a physical file in coversDir and returns a clean, lightweight server URL
 * - If relative path / filename, returns absolute server URL
 * - If already absolute HTTP(S) URL, returns as-is
 */
function normalizeCoverUrl(coverValue, itemId, coversDir, serverBaseUrl) {
  if (!coverValue || typeof coverValue !== 'string' || !coverValue.trim()) {
    return '';
  }
  const trimmed = coverValue.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('data:image/')) {
    try {
      const coverFileName = `${itemId || 'cover_' + Date.now()}_cover.jpg`;
      ensureDirSync(coversDir);
      const targetFilePath = path.join(coversDir, coverFileName);
      const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const b64Data = matches && matches[2] ? matches[2] : trimmed.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(targetFilePath, Buffer.from(b64Data, 'base64'));
      return `${serverBaseUrl}/api/educational/file/cover/${encodeURIComponent(coverFileName)}`;
    } catch (err) {
      console.warn('[Shared Backend] Error converting base64 cover to file:', err.message);
      return '';
    }
  }
  const cleanCoverName = trimmed
    .replace(/^\/+/, '')
    .replace(/^api\/educational\/file\/cover\//, '')
    .replace(/^api\/mobile\/file\/cover\//, '');
  return `${serverBaseUrl}/api/educational/file/cover/${encodeURIComponent(cleanCoverName)}`;
}

/**
 * Async helper to parse JSON body
 */
function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

/**
 * Framework-independent Mobile Request Handler
 * 
 * @param {import('http').IncomingMessage} req 
 * @param {import('http').ServerResponse} res 
 * @param {object} options
 * @param {string} options.storageRoot - Base storage directory path
 * @param {string} [options.videosDir] - Path to videos storage
 * @param {string} [options.coversDir] - Path to covers storage
 * @param {string} [options.pdfsDir] - Path to pdfs storage
 * @param {string} [options.dataFile] - Path to JSON catalog store
 * @param {string} [options.tokenSecret] - Secret key for token signing
 * @returns {Promise<boolean>} True if route was handled, false otherwise
 */
async function handleMobileRequest(req, res, options = {}) {
  const urlString = req.url || '/';
  
  // Process routes under /api/mobile and /api/educational
  if (!urlString.startsWith('/api/mobile') && !urlString.startsWith('/api/educational')) {
    return false;
  }

  const storageRoot = options.storageRoot || process.cwd();
  const videosDir = options.videosDir || path.resolve(storageRoot, 'server_videos');
  const coversDir = options.coversDir || path.resolve(storageRoot, 'server_covers');
  const pdfsDir = options.pdfsDir || path.resolve(storageRoot, 'server_pdfs');
  const dataFile = options.dataFile || path.resolve(storageRoot, 'server_data.json');
  const tokenSecret = options.tokenSecret || process.env.HOJJA_STREAM_SECRET || 'hojja-educational-secure-stream-key-2026';

  // Ensure directories exist
  [videosDir, coversDir, pdfsDir].forEach(ensureDirSync);

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, X-Device-Id, X-File-Name, X-File-Type, X-Item-Id');
    res.end();
    return true;
  }

  // Parse path and query
  const parsedUrl = new URL(urlString, 'http://localhost:3000');
  const pathname = parsedUrl.pathname;

  // =========================================================================
  // UNIFIED EDUCATIONAL STORAGE ENDPOINTS (Desktop & Admin Single Source of Truth)
  // =========================================================================

  // E1. Get Full Educational Catalog
  if (pathname === '/api/educational/catalog') {
    const catalog = loadCatalog(dataFile);
    sendJson(res, { success: true, catalog });
    return true;
  }

  // E2. Save Full Educational Catalog (Atomic Write & Safe Backup)
  if (pathname === '/api/educational/catalog' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    if (body && typeof body === 'object') {
      const saved = saveCatalogSafe(dataFile, body);
      if (saved) {
        sendJson(res, { success: true, message: 'تم حفظ وتحديث كتالوج المنصة التعليمية بأمان على القرص' });
      } else {
        sendJson(res, { success: false, error: 'فشل حفظ الكتالوج على القرص' }, 500);
      }
    } else {
      sendJson(res, { success: false, error: 'بيانات غير صالحة' }, 400);
    }
    return true;
  }

  // E3. Upload Physical File (Video, PDF, Cover) via Stream Direct-To-Disk
  if (pathname === '/api/educational/upload-file' && req.method === 'POST') {
    const fileType = parsedUrl.searchParams.get('type') || req.headers['x-file-type'] || 'video';
    let fileName = parsedUrl.searchParams.get('fileName') || req.headers['x-file-name'] || '';
    const itemId = parsedUrl.searchParams.get('id') || req.headers['x-item-id'] || ('item_' + Date.now());

    if (!fileName) {
      if (fileType === 'pdf') fileName = `${itemId}.pdf`;
      else if (fileType === 'cover') fileName = `${itemId}.jpg`;
      else fileName = `${itemId}.mp4`;
    }

    // Sanitize filename
    const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');

    let targetDir = videosDir;
    if (fileType === 'pdf') targetDir = pdfsDir;
    else if (fileType === 'cover') targetDir = coversDir;

    ensureDirSync(targetDir);
    const targetFilePath = path.join(targetDir, safeFileName);
    const writeStream = fs.createWriteStream(targetFilePath);

    let bytesReceived = 0;
    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
    });

    req.pipe(writeStream);

    return new Promise((resolve) => {
      writeStream.on('finish', () => {
        // If uploaded file is a video, automatically trigger multi-quality transcoding in the background
        if (fileType === 'video' && ffmpegAvailable) {
          processVideoMultiQuality(itemId, dataFile, videosDir, coversDir);
        }

        sendJson(res, {
          success: true,
          fileName: safeFileName,
          size: bytesReceived,
          fileType,
          path: targetFilePath,
          transcodingStarted: fileType === 'video' && ffmpegAvailable
        });
        resolve(true);
      });

      writeStream.on('error', (err) => {
        console.error('[Shared Backend] File write stream error:', err);
        sendJson(res, { success: false, error: 'فشل في حفظ الملف على القرص: ' + err.message }, 500);
        resolve(true);
      });
    });
  }

  // E3.1 Manual Trigger Video Transcoding
  if (pathname === '/api/educational/transcode-video' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const { videoId } = body;
    if (!videoId) {
      sendJson(res, { success: false, error: 'معرف الفيديو videoId مطلوب' }, 400);
      return true;
    }

    const result = await processVideoMultiQuality(videoId, dataFile, videosDir, coversDir);
    sendJson(res, result);
    return true;
  }

  // E3.2 Video Transcoding Status Check
  if (pathname === '/api/educational/transcoding-status') {
    const videoId = parsedUrl.searchParams.get('videoId');
    if (videoId && activeTranscodeJobs.has(videoId)) {
      const job = activeTranscodeJobs.get(videoId);
      if (job.status === 'completed') {
        sendJson(res, {
          success: true,
          isProcessing: false,
          videoId,
          status: 'completed',
          transcodingStatus: 'completed',
          progress: 100,
          qualities: job.qualities || {},
          qualitiesDone: job.qualitiesDone || []
        });
        return true;
      }
      if (job.status === 'failed') {
        sendJson(res, {
          success: true,
          isProcessing: false,
          videoId,
          status: 'failed',
          transcodingStatus: 'failed',
          error: job.error || 'فشلت المعالجة',
          qualities: job.qualities || {}
        });
        return true;
      }
      sendJson(res, { success: true, isProcessing: true, ...job });
      return true;
    }

    const catalog = loadCatalog(dataFile);
    if (videoId) {
      const video = (catalog.videos || []).find(v => v.id === videoId);
      sendJson(res, {
        success: true,
        isProcessing: false,
        videoId,
        transcodingStatus: video ? (video.transcodingStatus || 'completed') : 'unknown',
        qualities: video ? (video.qualities || {}) : {}
      });
      return true;
    }

    sendJson(res, {
      success: true,
      ffmpegAvailable,
      ffmpegPath: ffmpegPathResolved,
      activeJobsCount: activeTranscodeJobs.size,
      activeJobs: Array.from(activeTranscodeJobs.values())
    });
    return true;
  }

  // E4. Save Base64 Cover Image to Physical File
  if (pathname === '/api/educational/save-cover-base64' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const { id, dataUrl, customFileName } = body;

    if (!dataUrl) {
      sendJson(res, { success: false, error: 'بيانات الصورة مفقودة' }, 400);
      return true;
    }

    try {
      const coverId = id || ('cover_' + Date.now());
      const safeFileName = customFileName || `${coverId}.jpg`;
      ensureDirSync(coversDir);
      const targetFilePath = path.join(coversDir, safeFileName);

      // Extract base64 payload
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const buffer = matches && matches[2] 
        ? Buffer.from(matches[2], 'base64') 
        : Buffer.from(dataUrl.replace(/^data:[^;]+;base64,/, ''), 'base64');

      fs.writeFileSync(targetFilePath, buffer);

      sendJson(res, {
        success: true,
        fileName: safeFileName,
        url: `/api/educational/file/cover/${encodeURIComponent(safeFileName)}`,
        size: buffer.length
      });
    } catch (e) {
      console.error('[Shared Backend] Error saving cover image:', e);
      sendJson(res, { success: false, error: 'فشل حفظ صورة الغلاف' }, 500);
    }
    return true;
  }

  // E5. Delete Physical File
  if (pathname === '/api/educational/file' && req.method === 'DELETE') {
    const fileType = parsedUrl.searchParams.get('type') || '';
    const fileName = parsedUrl.searchParams.get('fileName') || '';

    if (!fileName) {
      sendJson(res, { success: false, error: 'اسم الملف مطلوب' }, 400);
      return true;
    }

    let targetDir = videosDir;
    if (fileType === 'pdf') targetDir = pdfsDir;
    else if (fileType === 'cover') targetDir = coversDir;

    const targetFilePath = path.join(targetDir, fileName.replace(/[/\\?%*:|"<>]/g, '_'));

    try {
      if (fs.existsSync(targetFilePath)) {
        fs.unlinkSync(targetFilePath);
      }
      sendJson(res, { success: true, message: 'تم حذف الملف بنجاح' });
    } catch (e) {
      console.error('[Shared Backend] Error deleting file:', e);
      sendJson(res, { success: false, error: 'فشل حذف الملف: ' + e.message }, 500);
    }
    return true;
  }

  // E6. Serve Physical Files (Videos with Range 206, PDFs, Covers)
  if (pathname.startsWith('/api/educational/file/') || pathname.startsWith('/api/mobile/file/') || pathname.startsWith('/api/mobile/pdf/')) {
    let fileType = 'video';
    let fileName = '';

    if (pathname.startsWith('/api/mobile/pdf/')) {
      fileType = 'pdf';
      fileName = decodeURIComponent(pathname.replace('/api/mobile/pdf/', '') || '');
    } else {
      const prefix = pathname.startsWith('/api/mobile/file/') ? '/api/mobile/file/' : '/api/educational/file/';
      const parts = pathname.replace(prefix, '').split('/');
      fileType = decodeURIComponent(parts[0] || 'video');
      fileName = decodeURIComponent(parts.slice(1).join('/') || '');
    }

    if (!fileName) {
      sendJson(res, { error: 'اسم الملف مفقود' }, 400);
      return true;
    }

    let targetDir = videosDir;
    let defaultMime = 'video/mp4';
    if (fileType === 'pdf') {
      targetDir = pdfsDir;
      defaultMime = 'application/pdf';
    } else if (fileType === 'cover') {
      targetDir = coversDir;
      defaultMime = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    }

    const filePath = path.join(targetDir, fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'الملف غير موجود على القرص', fileName, fileType }));
      return true;
    }

    // Video uses Range 206 stream
    if (fileType === 'video') {
      streamVideoWithRange(filePath, req.headers.range, req, res);
      return true;
    }

    // Other files (PDF, Cover image)
    const stat = fs.statSync(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', defaultMime);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  // E7. Storage Status & Diagnosis
  if (pathname === '/api/educational/status') {
    const catalog = loadCatalog(dataFile);
    let videoFiles = [];
    let pdfFiles = [];
    let coverFiles = [];

    try {
      if (fs.existsSync(videosDir)) videoFiles = fs.readdirSync(videosDir);
      if (fs.existsSync(pdfsDir)) pdfFiles = fs.readdirSync(pdfsDir);
      if (fs.existsSync(coversDir)) coverFiles = fs.readdirSync(coversDir);
    } catch (e) {}

    sendJson(res, {
      success: true,
      storageRoot,
      paths: {
        catalogFile: dataFile,
        videosDir,
        pdfsDir,
        coversDir
      },
      fileCounts: {
        videosOnDisk: videoFiles.length,
        pdfsOnDisk: pdfFiles.length,
        coversOnDisk: coverFiles.length
      },
      catalogCounts: {
        departments: (catalog.departments || []).length,
        courses: (catalog.courses || []).length,
        folders: (catalog.folders || []).length,
        videos: (catalog.videos || []).length,
        pdfs: (catalog.pdfs || []).length
      }
    });
    return true;
  }

  // =========================================================================
  // MOBILE API ENDPOINTS (ExoPlayer & Android Client)
  // =========================================================================

  // 1. Health & Server Info
  if (pathname === '/api/mobile/health') {
    sendJson(res, {
      status: 'ok',
      platform: 'منصة حجة التعليمية والأكاديمية - Backend Bridge',
      version: '1.0.0',
      timestamp: Date.now(),
      serverStorageDir: videosDir,
      features: [
        'department_scoped_courses',
        'signed_temporary_urls',
        'http_range_video_streaming',
        'exoplayer_resumable_playback',
        'offline_sync'
      ]
    });
    return true;
  }

  // 2. Auth Handshake
  if (pathname === '/api/mobile/auth/handshake') {
    const body = await parseJsonBody(req);
    const deviceId = body.deviceId || req.headers['x-device-id'] || 'device_' + Math.random().toString(36).substring(2, 8);
    const username = body.username || 'طالب منصة حجة';

    const sessionToken = crypto
      .createHmac('sha256', tokenSecret)
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
    return true;
  }

  // 3. Departments
  if (pathname === '/api/mobile/departments') {
    const catalog = loadCatalog(dataFile);
    const departments = (catalog.departments || []).map(dept => ({
      id: dept.id,
      name: dept.name || '',
      icon: dept.icon || dept.iconName || 'Cpu',
      code: dept.code || (dept.name ? dept.name.substring(0, 4) : 'DEPT'),
      description: dept.description || ''
    }));
    sendJson(res, { success: true, count: departments.length, departments });
    return true;
  }

  // 3.1 Sub-Departments / Tracks / Specializations
  if (pathname === '/api/mobile/sub-departments') {
    const departmentId = parsedUrl.searchParams.get('departmentId');
    const catalog = loadCatalog(dataFile);
    let courses = catalog.courses || [];
    if (departmentId) {
      courses = courses.filter(c => c.departmentId === departmentId || c.parentId === departmentId);
    }

    // Extract unique tracks/categories or sub-departments
    const subDeptMap = new Map();
    courses.forEach(c => {
      const catName = c.category || 'عام';
      const deptId = c.departmentId || c.parentId || departmentId || 'general';
      const subDeptId = `${deptId}_${encodeURIComponent(catName)}`;
      if (!subDeptMap.has(subDeptId)) {
        subDeptMap.set(subDeptId, {
          id: subDeptId,
          name: catName,
          departmentId: deptId,
          icon: catName.includes('برمج') ? 'Code' : catName.includes('هندس') ? 'Layers' : catName.includes('ذكاء') ? 'Cpu' : 'BookOpen',
          coursesCount: 0
        });
      }
      subDeptMap.get(subDeptId).coursesCount++;
    });

    const subDepartments = Array.from(subDeptMap.values());
    sendJson(res, {
      success: true,
      count: subDepartments.length,
      departmentId: departmentId || 'all',
      subDepartments
    });
    return true;
  }

  // 4. Scoped Courses (with sub-department & category filtering)
  if (pathname === '/api/mobile/courses') {
    const departmentId = parsedUrl.searchParams.get('departmentId');
    const subDepartmentId = parsedUrl.searchParams.get('subDepartmentId');
    const category = parsedUrl.searchParams.get('category');
    const catalog = loadCatalog(dataFile);
    let rawCourses = catalog.courses || [];

    if (departmentId) {
      rawCourses = rawCourses.filter(c => c.departmentId === departmentId || c.parentId === departmentId);
    }
    if (category) {
      rawCourses = rawCourses.filter(c => (c.category || '').toLowerCase() === category.toLowerCase());
    }
    if (subDepartmentId) {
      rawCourses = rawCourses.filter(c => {
        const catName = c.category || 'عام';
        const deptId = c.departmentId || c.parentId || 'general';
        return `${deptId}_${encodeURIComponent(catName)}` === subDepartmentId;
      });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:3000';
    const serverBaseUrl = `${protocol}://${host}`;

    const courses = rawCourses.map(c => {
      const deptId = c.departmentId || c.parentId || '';
      const catName = c.category || 'عام';
      const cleanCover = normalizeCoverUrl(c.coverImage, c.id, coversDir, serverBaseUrl);
      return {
        id: c.id,
        title: c.title || c.name || '',
        name: c.name || c.title || '',
        description: c.description || '',
        departmentId: deptId,
        subDepartmentId: `${deptId}_${encodeURIComponent(catName)}`,
        subDepartmentName: catName,
        category: catName,
        instructor: c.instructor || c.author || '',
        coverImage: cleanCover,
        coverUrl: cleanCover,
        lessonsCount: Number(c.lessonsCount) || 0,
        iconName: c.iconName || 'BookOpen',
        addedAt: Number(c.addedAt) || Date.now()
      };
    });

    sendJson(res, {
      success: true,
      count: courses.length,
      departmentId: departmentId || 'all',
      subDepartmentId: subDepartmentId || 'all',
      courses
    });
    return true;
  }

  // 5. Course Content (Folders, Videos, PDFs, Assignments, Exams)
  if (pathname === '/api/mobile/course-content') {
    const courseId = parsedUrl.searchParams.get('courseId');
    if (!courseId) {
      sendJson(res, { success: false, error: 'المعرف courseId مطلوب' }, 400);
      return true;
    }

    const catalog = loadCatalog(dataFile);
    const rawCourse = (catalog.courses || []).find(c => c.id === courseId);
    if (!rawCourse) {
      sendJson(res, { success: false, error: 'الكورس غير موجود' }, 404);
      return true;
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:3000';
    const serverBaseUrl = `${protocol}://${host}`;

    const deptId = rawCourse.departmentId || rawCourse.parentId || '';
    const catName = rawCourse.category || 'عام';
    const cleanCourseCover = normalizeCoverUrl(rawCourse.coverImage, rawCourse.id, coversDir, serverBaseUrl);

    const course = {
      id: rawCourse.id,
      title: rawCourse.title || rawCourse.name || '',
      name: rawCourse.name || rawCourse.title || '',
      description: rawCourse.description || '',
      departmentId: deptId,
      subDepartmentId: `${deptId}_${encodeURIComponent(catName)}`,
      subDepartmentName: catName,
      instructor: rawCourse.instructor || rawCourse.author || '',
      category: catName,
      coverImage: cleanCourseCover,
      coverUrl: cleanCourseCover,
      lessonsCount: Number(rawCourse.lessonsCount) || 0,
      iconName: rawCourse.iconName || 'BookOpen',
      addedAt: Number(rawCourse.addedAt) || Date.now()
    };

    const folders = (catalog.folders || [])
      .filter(f => f.courseId === courseId)
      .map(f => ({
        id: f.id,
        name: f.name || '',
        courseId: f.courseId || courseId,
        parentId: f.parentId || null
      }));

    const videos = (catalog.videos || [])
      .filter(v => v.courseId === courseId || v.folderId === courseId || (v.folderId && v.folderId.startsWith(courseId)))
      .map(v => {
        const qualitiesMap = v.qualities || {};
        const coverUrl = normalizeCoverUrl(v.coverImage, v.id, coversDir, serverBaseUrl);

        return {
          id: v.id,
          title: v.title || v.name || '',
          name: v.name || v.title || '',
          description: v.description || '',
          duration: v.duration || '00:00',
          author: v.author || course.instructor || '',
          fileName: v.fileName || '',
          fileSize: Number(v.fileSize) || 0,
          isLocalFile: true,
          folderId: v.folderId || '',
          courseId: v.courseId || courseId,
          coverImage: coverUrl,
          coverUrl: coverUrl,
          thumbnailUrl: coverUrl,
          qualities: qualitiesMap,
          availableQualitiesList: Object.keys(qualitiesMap),
          transcodingStatus: v.transcodingStatus || 'completed',
          addedAt: Number(v.addedAt) || Date.now()
        };
      });

    const pdfs = (catalog.pdfs || [])
      .filter(p => p.courseId === courseId || p.listId === courseId || p.folderId === courseId || (p.folderId && p.folderId.startsWith(courseId)))
      .map(p => {
        const fileName = p.fileName || p.name || `${p.id}.pdf`;
        return {
          id: p.id,
          name: p.name || p.title || fileName,
          title: p.title || p.name || fileName,
          fileName: fileName,
          size: Number(p.size) || 0,
          pageCount: Number(p.pageCount) || 0,
          author: p.author || course.instructor || '',
          courseId: p.courseId || courseId,
          folderId: p.folderId || '',
          downloadUrl: `/api/educational/file/pdf/${encodeURIComponent(fileName)}`,
          addedAt: Number(p.addedAt) || Date.now()
        };
      });

    const assignments = (catalog.assignments || [])
      .filter(a => a.folderId === courseId || (a.folderId && a.folderId.startsWith(courseId)))
      .map(a => ({
        id: a.id,
        title: a.title || '',
        description: a.description || '',
        dueDate: a.dueDate || '',
        maxScore: Number(a.maxScore) || 100,
        folderId: a.folderId || courseId,
        courseId: courseId,
        status: a.status || 'pending',
        addedAt: Number(a.addedAt) || Date.now()
      }));

    const exams = (catalog.exams || [])
      .filter(e => e.folderId === courseId || (e.folderId && e.folderId.startsWith(courseId)))
      .map(e => ({
        id: e.id,
        title: e.title || '',
        description: e.description || '',
        durationMinutes: Number(e.durationMinutes) || 60,
        totalScore: Number(e.totalScore) || 100,
        questionsCount: (e.questions || []).length,
        questions: (e.questions || []).map(q => ({
          id: q.id,
          question: q.question || '',
          options: q.options || [],
          correctAnswerIndex: Number(q.correctAnswerIndex) || 0
        })),
        folderId: e.folderId || courseId,
        courseId: courseId,
        addedAt: Number(e.addedAt) || Date.now()
      }));

    sendJson(res, {
      success: true,
      course,
      folders,
      videos,
      pdfs,
      assignments,
      exams
    });
    return true;
  }

  // 5.1 Full Hierarchy (Departments -> SubDepartments -> Courses)
  if (pathname === '/api/mobile/hierarchy') {
    const catalog = loadCatalog(dataFile);
    const departments = (catalog.departments || []).map(dept => {
      const deptCourses = (catalog.courses || []).filter(c => c.departmentId === dept.id || c.parentId === dept.id);
      
      const subDeptMap = new Map();
      deptCourses.forEach(c => {
        const catName = c.category || 'عام';
        const subDeptId = `${dept.id}_${encodeURIComponent(catName)}`;
        if (!subDeptMap.has(subDeptId)) {
          subDeptMap.set(subDeptId, {
            id: subDeptId,
            name: catName,
            departmentId: dept.id,
            courses: []
          });
        }
        subDeptMap.get(subDeptId).courses.push({
          id: c.id,
          title: c.title || c.name || '',
          description: c.description || '',
          instructor: c.instructor || c.author || '',
          lessonsCount: Number(c.lessonsCount) || 0,
          coverImage: c.coverImage || ''
        });
      });

      return {
        id: dept.id,
        name: dept.name || '',
        icon: dept.icon || dept.iconName || 'Cpu',
        code: dept.code || (dept.name ? dept.name.substring(0, 4) : 'DEPT'),
        subDepartments: Array.from(subDeptMap.values())
      };
    });

    sendJson(res, { success: true, count: departments.length, hierarchy: departments });
    return true;
  }

  // 6. Request Temporary Signed Playback URL (with Multi-Quality Support)
  if (pathname === '/api/mobile/media/request-playback-url') {
    if (req.method !== 'POST') {
      sendJson(res, { error: 'Method Not Allowed' }, 405);
      return true;
    }

    const body = await parseJsonBody(req);
    const { videoId, validityMinutes = 30, deviceId, quality = 'auto' } = body;

    if (!videoId) {
      sendJson(res, { success: false, error: 'معرف الفيديو videoId مطلوب' }, 400);
      return true;
    }

    const catalog = loadCatalog(dataFile);
    const video = (catalog.videos || []).find(v => v.id === videoId);
    if (!video) {
      sendJson(res, { success: false, error: 'الفيديو غير موجود في قاعدة بيانات المنصة' }, 404);
      return true;
    }

    const expirationTime = Date.now() + Math.max(5, Math.min(validityMinutes, 180)) * 60 * 1000;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:3000';

    // Base signed token
    const payload = {
      videoId: video.id,
      deviceId: deviceId || 'unknown',
      exp: expirationTime
    };

    const signedToken = generateSignedStreamToken(payload, tokenSecret);

    // Build Available Qualities list
    const qualitiesMap = video.qualities || {};
    const availableQualities = [];

    // Check existing qualities
    const definedQualities = [
      { key: '1080p', label: '1080p (عالية FHD)', defaultFile: video.fileName },
      { key: '720p', label: '720p (عالية HD)', defaultFile: null },
      { key: '480p', label: '480p (متوسطة SD)', defaultFile: null },
      { key: '360p', label: '360p (اقتصادية)', defaultFile: null }
    ];

    definedQualities.forEach(qDef => {
      const qData = qualitiesMap[qDef.key];
      const targetFile = qData ? qData.fileName : qDef.defaultFile;
      if (targetFile && fs.existsSync(path.join(videosDir, targetFile))) {
        const stats = fs.statSync(path.join(videosDir, targetFile));
        const qualityStreamUrl = `${protocol}://${host}/api/mobile/stream?token=${encodeURIComponent(signedToken)}&quality=${qDef.key}`;
        availableQualities.push({
          quality: qDef.key,
          label: qData?.label || qDef.label,
          fileSize: stats.size,
          fileName: targetFile,
          playbackUrl: qualityStreamUrl
        });
      }
    });

    // If no transcoded versions yet, supply original video as primary
    if (availableQualities.length === 0) {
      availableQualities.push({
        quality: 'original',
        label: 'الجودة الأصلية',
        fileSize: video.fileSize || 0,
        fileName: video.fileName,
        playbackUrl: `${protocol}://${host}/api/mobile/stream?token=${encodeURIComponent(signedToken)}`
      });
    }

    // Determine target stream URL based on requested quality
    let selectedPlaybackUrl = `${protocol}://${host}/api/mobile/stream?token=${encodeURIComponent(signedToken)}`;
    if (quality && quality !== 'auto') {
      const matched = availableQualities.find(q => q.quality === quality);
      if (matched) {
        selectedPlaybackUrl = matched.playbackUrl;
      }
    } else if (availableQualities.length > 0) {
      selectedPlaybackUrl = availableQualities[0].playbackUrl;
    }

    sendJson(res, {
      success: true,
      videoId: video.id,
      title: video.title,
      duration: video.duration,
      coverImage: video.coverImage || '',
      selectedQuality: quality,
      playbackUrl: selectedPlaybackUrl,
      availableQualities,
      expiresAt: new Date(expirationTime).toISOString(),
      expiresInSeconds: Math.round((expirationTime - Date.now()) / 1000),
      signedToken: signedToken,
      fileSize: video.fileSize,
      transcodingStatus: video.transcodingStatus || 'completed',
      requiresRangeSupport: true
    });
    return true;
  }

  // 7. Video Stream Endpoint (HTTP Range, Quality Selection & Token Verification)
  if (pathname === '/api/mobile/stream') {
    const token = parsedUrl.searchParams.get('token') || 
      (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : '');

    if (!token) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'رمز الدخول المؤقت مفقود (Missing Temporary Stream Token)' }));
      return true;
    }

    const verification = verifySignedStreamToken(token, tokenSecret);
    if (!verification.valid || !verification.payload) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: verification.error || 'رمز الوصول المؤقت غير صالح أو منتهي' }));
      return true;
    }

    const videoId = verification.payload.videoId;
    const requestedQuality = parsedUrl.searchParams.get('quality') || verification.payload.quality;
    const catalog = loadCatalog(dataFile);
    const video = (catalog.videos || []).find(v => v.id === videoId);

    if (!video) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'الفيديو المطلوب غير متوفر' }));
      return true;
    }

    // Check if requested quality file exists
    let targetFileName = video.fileName;
    if (requestedQuality && video.qualities && video.qualities[requestedQuality]) {
      const qFile = video.qualities[requestedQuality].fileName;
      if (qFile && fs.existsSync(path.join(videosDir, qFile))) {
        targetFileName = qFile;
      }
    }

    const localVideoPath = path.join(videosDir, targetFileName);
    if (fs.existsSync(localVideoPath)) {
      streamVideoWithRange(localVideoPath, req.headers.range, req, res);
      return true;
    }

    // Fallback to original
    const fallbackPath = path.join(videosDir, video.fileName);
    if (fs.existsSync(fallbackPath)) {
      streamVideoWithRange(fallbackPath, req.headers.range, req, res);
      return true;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'ملف الفيديو غير موجود في مجلد server_videos على جهازك',
      hint: `يرجى وضع ملف الفيديو باسم [${video.fileName}] داخل المجلد: ${videosDir}`
    }));
    return true;
  }

  // 8. Catalog Sync
  if (pathname === '/api/mobile/sync/save-catalog') {
    if (req.method !== 'POST') {
      sendJson(res, { error: 'Method Not Allowed' }, 405);
      return true;
    }
    const body = await parseJsonBody(req);
    if (body && typeof body === 'object') {
      saveCatalog(dataFile, body);
      sendJson(res, { success: true, message: 'تمت مزامنة بيانات الكورسات والفيديوهات بنجاح مع الخادم' });
    } else {
      sendJson(res, { success: false, error: 'بيانات غير صالحة' }, 400);
    }
    return true;
  }

  // 9. Sync Status
  if (pathname === '/api/mobile/sync/status') {
    let filesInDir = [];
    try {
      if (fs.existsSync(videosDir)) {
        filesInDir = fs.readdirSync(videosDir);
      }
    } catch (e) {
      filesInDir = [];
    }

    const catalog = loadCatalog(dataFile);
    sendJson(res, {
      success: true,
      videosDirectory: videosDir,
      totalVideosOnDisk: filesInDir.length,
      files: filesInDir.map(f => {
        try {
          const stat = fs.statSync(path.join(videosDir, f));
          return { name: f, size: stat.size };
        } catch (e) {
          return { name: f, size: 0 };
        }
      }),
      catalogSummary: {
        departmentsCount: (catalog.departments || []).length,
        coursesCount: (catalog.courses || []).length,
        videosCount: (catalog.videos || []).length,
        pdfsCount: (catalog.pdfs || []).length
      }
    });
    return true;
  }

  // 10. System Version & Hot-Patch Update Checker
  if (pathname === '/api/system/version' || pathname === '/api/educational/system/version' || pathname === '/api/mobile/system/version') {
    let pkg = { version: '1.0.0', name: 'hojja-app' };
    try {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      }
    } catch (e) {}

    sendJson(res, {
      success: true,
      appName: 'منصة حجة التعليمية',
      version: pkg.version || '1.0.0',
      latestVersion: pkg.version || '1.0.0',
      buildDate: new Date().toISOString(),
      platform: process.platform,
      isElectron: !!process.versions.electron,
      hotUpdateSupported: true,
      features: [
        'FFmpeg Multi-Quality Video Streamer (1080p, 720p, 480p, 360p)',
        'Direct Video Posters & Stream Token Verification',
        'Hot-Patch Fast UI Updater (No re-install needed)',
        'Smart ZIP Inspector & Diff Auto-Updater',
        'Local SQLite / JSON Persistent Catalog'
      ]
    });
    return true;
  }

  // 11. System Apply Files Update Endpoint
  if (pathname === '/api/system/apply-files-update' || pathname === '/api/educational/system/apply-files-update') {
    if (req.method !== 'POST') {
      sendJson(res, { error: 'Method not allowed' }, 405);
      return true;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const filesList = payload.files || [];
        if (!Array.isArray(filesList) || filesList.length === 0) {
          sendJson(res, { error: 'لم يتم استلام أي ملفات للتحديث' }, 400);
          return;
        }

        const projectRoot = process.cwd();
        let updatedCount = 0;
        const protectedPatterns = [
          'server_videos',
          'server_pdfs',
          'server_covers',
          'hojja_catalog.json',
          'hojja.sqlite',
          'node_modules',
          '.git'
        ];

        for (const file of filesList) {
          const relPath = (file.path || '').replace(/^[\\\/]+/, '').trim();
          if (!relPath || relPath.includes('..')) continue;

          const isProtected = protectedPatterns.some(p => relPath.startsWith(p) || relPath.includes('/' + p));
          if (isProtected) continue;

          const targetFullPath = path.join(projectRoot, relPath);
          const dir = path.dirname(targetFullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          let fileBuffer;
          if (file.base64) {
            fileBuffer = Buffer.from(file.base64, 'base64');
          } else if (typeof file.content === 'string') {
            fileBuffer = Buffer.from(file.content, 'utf8');
          } else {
            continue;
          }

          fs.writeFileSync(targetFullPath, fileBuffer);
          updatedCount++;
        }

        sendJson(res, {
          success: true,
          updatedCount,
          message: `تم تثبيت وتطبيق التحديث بنجاح على ${updatedCount} ملف.`
        });
      } catch (err) {
        sendJson(res, { error: 'فشل تطبيق التحديث: ' + err.message }, 500);
      }
    });
    return true;
  }

  // 12. GitHub Repository Information & Latest Commits
  if (pathname === '/api/system/git-info' || pathname === '/api/educational/system/git-info') {
    const defaultRepo = 'https://github.com/Marwan31912/h-jja';
    const repoParam = parsedUrl.searchParams.get('repo') || defaultRepo;
    const branchParam = parsedUrl.searchParams.get('branch') || 'main';

    let repoOwner = 'Marwan31912';
    let repoName = 'h-jja';
    const match = repoParam.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (match) {
      repoOwner = match[1];
      repoName = match[2];
    }

    const https = require('https');
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${branchParam}`;

    const reqOptions = {
      headers: {
        'User-Agent': 'Hojja-Platform-Updater',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const fetchGitPromise = new Promise((resolve) => {
      https.get(apiUrl, reqOptions, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => { data += chunk; });
        apiRes.on('end', () => {
          try {
            if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
              const json = JSON.parse(data);
              resolve({
                success: true,
                repoUrl: `https://github.com/${repoOwner}/${repoName}`,
                branch: branchParam,
                commitSha: json.sha,
                shortSha: json.sha ? json.sha.substring(0, 7) : '',
                message: json.commit?.message || '',
                author: json.commit?.author?.name || json.author?.login || '',
                date: json.commit?.author?.date || '',
                htmlUrl: json.html_url || ''
              });
            } else {
              // Try fallback to master branch
              resolve({
                success: false,
                repoUrl: `https://github.com/${repoOwner}/${repoName}`,
                branch: branchParam,
                error: `HTTP ${apiRes.statusCode}: ${data}`
              });
            }
          } catch (e) {
            resolve({ success: false, error: e.message });
          }
        });
      }).on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });

    fetchGitPromise.then(result => {
      sendJson(res, result);
    });
    return true;
  }

  // 13. GitHub Direct Pull / Stream Update Endpoint
  if (pathname === '/api/system/git-pull' || pathname === '/api/educational/system/git-pull') {
    if (req.method !== 'POST') {
      sendJson(res, { error: 'Method not allowed' }, 405);
      return true;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const repoUrl = (payload.repoUrl || 'https://github.com/Marwan31912/h-jja').trim();
        const branch = (payload.branch || 'main').trim();

        let repoOwner = 'Marwan31912';
        let repoName = 'h-jja';
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
        if (match) {
          repoOwner = match[1];
          repoName = match[2];
        }

        const projectRoot = process.cwd();
        const { execSync } = require('child_process');

        // Check if local .git directory exists for standard git pull
        let gitSuccess = false;
        let gitMessage = '';

        if (fs.existsSync(path.join(projectRoot, '.git'))) {
          try {
            console.log('[Git Updater] Attempting native git pull...');
            try {
              execSync(`git remote set-url origin https://github.com/${repoOwner}/${repoName}.git`, { cwd: projectRoot, timeout: 15000 });
            } catch (e) {}
            
            const gitOutput = execSync(`git pull origin ${branch} --no-rebase`, { cwd: projectRoot, timeout: 60000, encoding: 'utf8' });
            console.log('[Git Updater] Native git output:', gitOutput);
            gitSuccess = true;
            gitMessage = gitOutput;
          } catch (gitErr) {
            console.warn('[Git Updater] Native git command failed or not configured, switching to direct ZIP stream:', gitErr.message);
          }
        }

        if (gitSuccess) {
          sendJson(res, {
            success: true,
            method: 'git-cli',
            message: 'تم سحب وتطبيق التحديث بنجاح عبر Git Pull!',
            output: gitMessage
          });
          return;
        }

        // Method 2: Direct GitHub Archive Stream & Extraction using JSZip
        console.log(`[Git Updater] Downloading repository archive from GitHub (${repoOwner}/${repoName} branch: ${branch})...`);
        const JSZip = require('jszip');
        const https = require('https');

        const zipUrl = `https://codeload.github.com/${repoOwner}/${repoName}/zip/refs/heads/${branch}`;
        
        function fetchZipBuffer(url) {
          return new Promise((resolve, reject) => {
            https.get(url, { headers: { 'User-Agent': 'Hojja-Platform-Updater' } }, (resZip) => {
              if (resZip.statusCode === 301 || resZip.statusCode === 302) {
                return resolve(fetchZipBuffer(resZip.headers.location));
              }
              if (resZip.statusCode !== 200) {
                return reject(new Error(`فشل تحميل الأرشيف من GitHub (رمز الخطأ: ${resZip.statusCode})`));
              }
              const chunks = [];
              resZip.on('data', c => chunks.push(c));
              resZip.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
          });
        }

        let zipBuffer;
        try {
          zipBuffer = await fetchZipBuffer(zipUrl);
        } catch (downloadErr) {
          // If 'main' failed, try 'master' as fallback
          if (branch === 'main') {
            console.log('[Git Updater] Fallback: trying branch master...');
            const fallbackUrl = `https://codeload.github.com/${repoOwner}/${repoName}/zip/refs/heads/master`;
            zipBuffer = await fetchZipBuffer(fallbackUrl);
          } else {
            throw downloadErr;
          }
        }

        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(zipBuffer);

        const protectedPatterns = [
          'server_videos',
          'server_pdfs',
          'server_covers',
          'hojja_catalog.json',
          'hojja.sqlite',
          'node_modules',
          '.git',
          'metadata.json'
        ];

        let updatedCount = 0;
        const updatedFiles = [];

        // GitHub archive root folder name is usually `${repoName}-${branch}/`
        for (const [rawPath, zipEntry] of Object.entries(loadedZip.files)) {
          if (zipEntry.dir) continue;

          // Strip top-level directory (e.g. "h-jja-main/")
          const parts = rawPath.replace(/^[\\\/]+/, '').split('/');
          if (parts.length > 1) {
            parts.shift(); // Remove top-level archive directory
          }
          const relPath = parts.join('/');
          if (!relPath) continue;

          const isProtected = protectedPatterns.some(p => relPath.startsWith(p) || relPath.includes('/' + p) || relPath === p);
          if (isProtected) {
            continue;
          }

          const targetFullPath = path.join(projectRoot, relPath);
          const dir = path.dirname(targetFullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          const fileContent = await zipEntry.async('nodebuffer');
          fs.writeFileSync(targetFullPath, fileContent);
          updatedCount++;
          if (updatedFiles.length < 50) {
            updatedFiles.push(relPath);
          }
        }

        console.log(`[Git Updater] Successfully applied ${updatedCount} files from GitHub!`);
        sendJson(res, {
          success: true,
          method: 'direct-archive',
          updatedCount,
          updatedFilesSample: updatedFiles,
          message: `تم جلب وتطبيق أحدث كود من GitHub بنجاح على ${updatedCount} ملف.`
        });

      } catch (pullErr) {
        console.error('[Git Updater] Error during GitHub sync:', pullErr);
        sendJson(res, { success: false, error: pullErr.message || 'فشل التحديث من GitHub' }, 500);
      }
    });
    return true;
  }

  // Path under /api/mobile but no handler matched
  sendJson(res, { error: 'Mobile endpoint not found' }, 404);
  return true;
}

module.exports = {
  handleMobileRequest,
  handleEducationalRequest: handleMobileRequest,
  loadCatalog,
  saveCatalog,
  saveCatalogSafe,
  generateSignedStreamToken,
  verifySignedStreamToken,
  streamVideoWithRange
};
