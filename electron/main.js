const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { handleMobileRequest, loadCatalog, saveCatalogSafe } = require('../services/mobileBackend.cjs');

// منع ظهور رسائل التحذير الخاصة بالأمان في بيئة التطوير
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// خادم الموبايل المدمج لتطبيق سطح المكتب
let mobileHttpServer = null;

function startMobileBackendServer() {
  try {
    const storageRoot = app.isPackaged
      ? path.join(app.getPath('userData'), 'server_storage')
      : process.cwd();

    const options = {
      storageRoot,
      videosDir: path.resolve(storageRoot, 'server_videos'),
      coversDir: path.resolve(storageRoot, 'server_covers'),
      pdfsDir: path.resolve(storageRoot, 'server_pdfs'),
      dataFile: path.resolve(storageRoot, 'server_data.json'),
      tokenSecret: process.env.HOJJA_STREAM_SECRET || 'hojja-educational-secure-stream-key-2026'
    };

    mobileHttpServer = http.createServer(async (req, res) => {
      try {
        const handled = await handleMobileRequest(req, res, options);
        if (!handled) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Endpoint Not Found on Hojja Desktop Server' }));
        }
      } catch (err) {
        console.error('[Electron Mobile Server Error]:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });

    mobileHttpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('[Electron Mobile Server] Port 3000 is already in use (EADDRINUSE). Failed to bind.');
      } else {
        console.error('[Electron Mobile Server] Server socket error:', err);
      }
    });

    mobileHttpServer.listen(3000, '0.0.0.0', () => {
      console.log('[Electron Mobile Server] Hojja Mobile Backend listening on http://0.0.0.0:3000/');
    });
  } catch (e) {
    console.error('[Electron Mobile Server] Failed to initialize backend server:', e);
  }
}

function stopMobileBackendServer() {
  if (mobileHttpServer) {
    try {
      mobileHttpServer.close(() => {
        console.log('[Electron Mobile Server] Server stopped successfully.');
      });
    } catch (e) {
      console.error('[Electron Mobile Server] Error closing server:', e);
    }
  }
}

// منع فتح أكثر من نسخة واحدة
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // إذا تم محاولة فتح نسخة ثانية، يتم التركيز على النافذة الحالية
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      autoHideMenuBar: true,
      title: "مكتبة علاء الدين",
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true, // مهم لعمل الـ preload
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false,
        partition: 'persist:main'
      }
    });

    // إذا كان التطبيق يعمل في وضع التطوير (Vite)
    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  app.whenReady().then(() => {
    // معالجة حالة التهيئة المستمرة (init.json) في مجلد userData
    const initFilePath = path.join(app.getPath('userData'), 'init.json');

    ipcMain.handle('get-init-status', () => {
      try {
        if (fs.existsSync(initFilePath)) {
          const data = fs.readFileSync(initFilePath, 'utf8');
          return JSON.parse(data);
        }
      } catch (e) {
        console.error("Error reading init.json:", e);
      }
      return { initialized: false };
    });

    ipcMain.handle('set-init-status', (event, status) => {
      try {
        fs.writeFileSync(initFilePath, JSON.stringify(status), 'utf8');
        return true;
      } catch (e) {
        console.error("Error writing init.json:", e);
        return false;
      }
    });

    ipcMain.handle('open-file', async (event, filePath) => {
      try {
        if (filePath.startsWith('blob:')) {
            return { success: false, error: 'Cannot open blob URLs directly in system app.' };
        }
        // If it's a relative path or network path let shell handle it
        await shell.openPath(filePath);
        return { success: true };
      } catch (e) {
        console.error("Error opening file:", e);
        return { success: false, error: e.message };
      }
    });

    ipcMain.handle('save-and-open-pdf', async (event, { name, buffer }) => {
      try {
        // Use a consistent path based on filename to avoid duplicates in temp folder
        const safeName = name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const tempPath = path.join(os.tmpdir(), `aladdin_${safeName}`);
        
        // Only write if it doesn't exist or we want to overwrite (overwriting a single stable path is better than multiple ones)
        fs.writeFileSync(tempPath, Buffer.from(buffer));
        
        await shell.openPath(tempPath);
        return { success: true, path: tempPath };
      } catch (e) {
        console.error("Error saving/opening PDF:", e);
        return { success: false, error: e.message };
      }
    });

    ipcMain.handle('show-item-in-folder', async (event, filePath) => {
      try {
        if (!filePath) return { success: false, error: 'Path is required' };
        if (filePath.startsWith('blob:')) {
          return { success: false, error: 'Cannot show blob URLs in folder' };
        }

        if (fs.existsSync(filePath)) {
          shell.showItemInFolder(filePath);
          return { success: true };
        } else {
          return { success: false, error: 'File does not exist at path: ' + filePath };
        }
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    const pdfLibraryDir = path.join(app.getPath('userData'), 'pdf_library');
    if (!fs.existsSync(pdfLibraryDir)) {
      try {
        fs.mkdirSync(pdfLibraryDir, { recursive: true });
      } catch (e) {
        console.error("Failed to create pdfLibraryDir:", e);
      }
    }

    ipcMain.handle('save-pdf-to-library', async (event, { name, buffer }) => {
      try {
        if (!fs.existsSync(pdfLibraryDir)) {
          fs.mkdirSync(pdfLibraryDir, { recursive: true });
        }
        const safeName = name.replace(/[\/\?<>\\:\*\|"]/g, '_');
        const filePath = path.join(pdfLibraryDir, safeName);
        fs.writeFileSync(filePath, Buffer.from(buffer));
        return { success: true, path: filePath };
      } catch (e) {
        console.error("Error saving PDF to library:", e);
        return { success: false, error: e.message };
      }
    });

    ipcMain.handle('get-pdf-path', async (event, fileName) => {
      try {
        const safeName = fileName.replace(/[\/\?<>\\:\*\|"]/g, '_');
        const filePath = path.join(pdfLibraryDir, safeName);
        if (fs.existsSync(filePath)) {
          return filePath;
        }
        return null;
      } catch (e) {
        return null;
      }
    });

    ipcMain.handle('open-pdf-folder', async () => {
      try {
        if (!fs.existsSync(pdfLibraryDir)) {
          fs.mkdirSync(pdfLibraryDir, { recursive: true });
        }
        await shell.openPath(pdfLibraryDir);
        return { success: true, path: pdfLibraryDir };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    // ==========================================
    // Unified Educational Storage IPC Handlers
    // ==========================================
    const storageRoot = app.isPackaged
      ? path.join(app.getPath('userData'), 'server_storage')
      : process.cwd();

    const eduStorageOptions = {
      storageRoot,
      videosDir: path.resolve(storageRoot, 'server_videos'),
      coversDir: path.resolve(storageRoot, 'server_covers'),
      pdfsDir: path.resolve(storageRoot, 'server_pdfs'),
      dataFile: path.resolve(storageRoot, 'server_data.json')
    };

    ipcMain.handle('educational:get-catalog', async () => {
      return loadCatalog(eduStorageOptions.dataFile);
    });

    ipcMain.handle('educational:save-catalog', async (event, catalog) => {
      return saveCatalogSafe(eduStorageOptions.dataFile, catalog);
    });

    ipcMain.handle('educational:save-file', async (event, { type, fileName, buffer, filePath }) => {
      try {
        let targetDir = eduStorageOptions.videosDir;
        if (type === 'pdf') targetDir = eduStorageOptions.pdfsDir;
        else if (type === 'cover') targetDir = eduStorageOptions.coversDir;

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const safeFileName = (fileName || 'file_' + Date.now()).replace(/[/\\?%*:|"<>]/g, '_');
        const targetPath = path.join(targetDir, safeFileName);

        if (filePath && fs.existsSync(filePath)) {
          fs.copyFileSync(filePath, targetPath);
          const stat = fs.statSync(targetPath);
          return { success: true, fileName: safeFileName, size: stat.size };
        }

        if (buffer) {
          fs.writeFileSync(targetPath, Buffer.from(buffer));
          return { success: true, fileName: safeFileName, size: buffer.byteLength || buffer.length || 0 };
        }

        return { success: false, error: 'No buffer or filePath provided' };
      } catch (e) {
        console.error('[Electron Main] Error in educational:save-file:', e);
        return { success: false, error: e.message };
      }
    });

    ipcMain.handle('educational:delete-file', async (event, { type, fileName }) => {
      try {
        let targetDir = eduStorageOptions.videosDir;
        if (type === 'pdf') targetDir = eduStorageOptions.pdfsDir;
        else if (type === 'cover') targetDir = eduStorageOptions.coversDir;

        const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
        const targetPath = path.join(targetDir, safeFileName);
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
        return { success: true };
      } catch (e) {
        console.error('[Electron Main] Error in educational:delete-file:', e);
        return { success: false, error: e.message };
      }
    });

    ipcMain.handle('educational:get-storage-status', async () => {
      try {
        const catalog = loadCatalog(eduStorageOptions.dataFile);
        let videos = [];
        let pdfs = [];
        let covers = [];
        if (fs.existsSync(eduStorageOptions.videosDir)) videos = fs.readdirSync(eduStorageOptions.videosDir);
        if (fs.existsSync(eduStorageOptions.pdfsDir)) pdfs = fs.readdirSync(eduStorageOptions.pdfsDir);
        if (fs.existsSync(eduStorageOptions.coversDir)) covers = fs.readdirSync(eduStorageOptions.coversDir);
        return {
          success: true,
          storageRoot,
          videosCount: videos.length,
          pdfsCount: pdfs.length,
          coversCount: covers.length,
          catalog
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    // ==========================================
    // Hot-Patch Fast Auto-Updater IPC Handlers
    // ==========================================
    ipcMain.handle('system:check-update', async () => {
      try {
        let currentVersion = '1.0.0';
        const pkgPath = path.join(__dirname, '../package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          currentVersion = pkg.version || '1.0.0';
        }
        return {
          success: true,
          currentVersion,
          latestVersion: currentVersion,
          isPackaged: app.isPackaged,
          platform: process.platform
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    ipcMain.handle('system:apply-files-update', async (event, filesList) => {
      try {
        if (!Array.isArray(filesList) || filesList.length === 0) {
          return { success: false, error: 'لم يتم تقديم أي ملفات للتحديث' };
        }

        // إذا كان التطبيق محزوماً بصيغة asar داخل Program Files
        const isPackaged = app.isPackaged;
        const projectRoot = isPackaged
          ? path.join(app.getPath('userData'), 'hot_patch_root')
          : path.resolve(__dirname, '..');

        if (!fs.existsSync(projectRoot)) {
          fs.mkdirSync(projectRoot, { recursive: true });
        }

        let updatedCount = 0;
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

        for (const file of filesList) {
          const relPath = (file.path || '').replace(/^[\\\/]+/, '').trim();
          if (!relPath || relPath.includes('..')) continue;

          // حماية الملفات وقواعد البيانات الخاصة بالمستخدم
          const isProtected = protectedPatterns.some(p => relPath.startsWith(p) || relPath.includes('/' + p) || relPath === p);
          if (isProtected) {
            console.log(`[AutoUpdater] Skipping protected path: ${relPath}`);
            continue;
          }

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

          try {
            fs.writeFileSync(targetFullPath, fileBuffer);
            updatedCount++;
          } catch (writeErr) {
            console.warn(`[AutoUpdater] Could not write ${targetFullPath}:`, writeErr.message);
          }
        }

        return {
          success: true,
          updatedCount,
          message: `تم تطبيق التحديث بنجاح على ${updatedCount} ملف.`
        };
      } catch (e) {
        console.error('[AutoUpdater] Error applying files update:', e);
        return { success: false, error: e.message };
      }
    });

    ipcMain.handle('system:restart-app', async () => {
      try {
        if (mainWindow) {
          mainWindow.webContents.reloadIgnoringCache();
        } else {
          app.relaunch();
          app.exit(0);
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    // بدء تشغيل خادم الموبايل المدمج لمنصة حجة
    startMobileBackendServer();

    createWindow();
  });

  // إعادة فتح التطبيق على macOS عند الضغط على Dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('will-quit', () => {
    stopMobileBackendServer();
  });
}
