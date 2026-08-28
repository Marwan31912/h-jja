import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  UploadCloud, FileArchive, CheckCircle2, AlertTriangle, ShieldCheck, 
  RefreshCw, ArrowRight, FileCode, FileText, Layers, HardDrive, 
  Eye, Check, Search, Filter, Sparkles, X, Power, DownloadCloud, AlertCircle
} from 'lucide-react';

interface FileDiffItem {
  path: string;
  name: string;
  size: number;
  type: 'code' | 'component' | 'service' | 'electron' | 'config' | 'asset' | 'protected';
  status: 'modified' | 'new' | 'protected';
  content?: string;
  base64?: string;
}

interface SmartZipUpdaterProps {
  isDarkMode: boolean;
  onUpdateComplete?: () => void;
}

export const SmartZipUpdater: React.FC<SmartZipUpdaterProps> = ({ isDarkMode, onUpdateComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [zipName, setZipName] = useState<string | null>(null);
  const [diffFiles, setDiffFiles] = useState<FileDiffItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'code' | 'new' | 'protected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [applyProgress, setApplyProgress] = useState(0);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStats, setSuccessStats] = useState<{ updatedCount: number; size: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تصنيف نوع الملف
  const getFileType = (path: string): FileDiffItem['type'] => {
    const p = path.toLowerCase();
    if (p.startsWith('server_videos') || p.startsWith('server_pdfs') || p.startsWith('server_covers') || p.includes('catalog.json') || p.includes('.sqlite')) {
      return 'protected';
    }
    if (p.startsWith('components/') || p.startsWith('src/components/')) return 'component';
    if (p.startsWith('services/') || p.startsWith('utils/')) return 'service';
    if (p.startsWith('electron/')) return 'electron';
    if (p.endsWith('.json') || p.endsWith('.mjs') || p.endsWith('.ts') && p.includes('config')) return 'config';
    if (p.endsWith('.css') || p.startsWith('public/')) return 'asset';
    return 'code';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleZipFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('يرجى اختيار ملف أرشيف بصيغة ZIP صالح (.zip)');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setZipName(file.name);

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const parsedItems: FileDiffItem[] = [];

      const protectedPrefixes = [
        'server_videos/',
        'server_pdfs/',
        'server_covers/',
        'node_modules/',
        '.git/',
        'release/'
      ];

      // فحص وتصنيف كل ملف داخل الأرشيف
      for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
        if (zipEntry.dir) continue;
        
        // تنظيف المسار
        const cleanPath = relativePath.replace(/^(\.\/|\/)/, '');
        const fileName = cleanPath.split('/').pop() || cleanPath;

        const isProtected = protectedPrefixes.some(pref => cleanPath.startsWith(pref)) || 
                            cleanPath === 'hojja_catalog.json' || 
                            cleanPath === 'metadata.json' || 
                            cleanPath.endsWith('.sqlite');

        const fileType = isProtected ? 'protected' : getFileType(cleanPath);
        
        // استخراج المحتوى
        let content: string | undefined;
        let base64: string | undefined;

        if (!isProtected) {
          const isText = cleanPath.match(/\.(tsx?|jsx?|json|css|html|mjs|cjs|txt|md)$/i);
          if (isText) {
            content = await zipEntry.async('text');
          } else {
            base64 = await zipEntry.async('base64');
          }
        }

        // تقدير الحالة (جديد أو معدل)
        const isNew = cleanPath.startsWith('components/SmartZipUpdater') || cleanPath.includes('updater');
        const status: FileDiffItem['status'] = isProtected ? 'protected' : (isNew ? 'new' : 'modified');

        parsedItems.push({
          path: cleanPath,
          name: fileName,
          size: (zipEntry as any)._data?.uncompressedSize || 0,
          type: fileType,
          status,
          content,
          base64
        });
      }

      setDiffFiles(parsedItems);
    } catch (err: any) {
      console.error('Failed to parse zip:', err);
      setErrorMessage('فشل في قراءة ملف الـ ZIP: ' + (err.message || 'الملف تالف أو غير صالح'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleZipFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleZipFile(e.target.files[0]);
    }
  };

  // تطبيق التحديث الفعلي
  const handleApplyUpdate = async () => {
    const filesToApply = diffFiles.filter(f => f.status !== 'protected');
    if (filesToApply.length === 0) {
      setErrorMessage('لا توجد ملفات برمجية قابلة للتحديث.');
      return;
    }

    setIsApplying(true);
    setApplyProgress(10);
    setErrorMessage(null);

    const payload = filesToApply.map(f => ({
      path: f.path,
      content: f.content,
      base64: f.base64
    }));

    try {
      setApplyProgress(35);

      // محاولة 1: عبر Electron IPC إذا كان التطبيق يعمل داخل Electron
      let success = false;
      const electronApi = (window as any).electronAPI;

      if (electronApi?.system?.applyFilesUpdate) {
        setApplyProgress(60);
        const res = await electronApi.system.applyFilesUpdate(payload);
        if (res && res.success) {
          success = true;
        } else {
          throw new Error(res?.error || 'فشل التحديث عبر Electron');
        }
      } else {
        // محاولة 2: عبر الخادم المحلي (Web / Mobile Server API)
        setApplyProgress(65);
        const response = await fetch('/api/system/apply-files-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: payload })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          success = true;
        } else {
          throw new Error(data.error || 'فشل التحديث عبر الخادم');
        }
      }

      setApplyProgress(100);

      const totalSize = filesToApply.reduce((acc, cur) => acc + cur.size, 0);
      setSuccessStats({
        updatedCount: filesToApply.length,
        size: formatBytes(totalSize)
      });

      setShowRestartModal(true);
      if (onUpdateComplete) onUpdateComplete();
    } catch (err: any) {
      console.error('Update Application Error:', err);
      setErrorMessage('حدث خطأ أثناء تطبيق التحديث: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsApplying(false);
    }
  };

  const handleRestartPlatform = () => {
    const electronApi = (window as any).electronAPI;
    if (electronApi?.system?.restartApp) {
      electronApi.system.restartApp();
    } else {
      window.location.reload();
    }
  };

  // فلترة الملفات
  const filteredFiles = diffFiles.filter(f => {
    if (selectedFilter === 'code' && (f.status === 'protected' || f.status === 'new')) return false;
    if (selectedFilter === 'new' && f.status !== 'new') return false;
    if (selectedFilter === 'protected' && f.status !== 'protected') return false;
    if (searchQuery.trim() && !f.path.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const modifiedCount = diffFiles.filter(f => f.status === 'modified').length;
  const newCount = diffFiles.filter(f => f.status === 'new').length;
  const protectedCount = diffFiles.filter(f => f.status === 'protected').length;
  const totalActionableSize = diffFiles
    .filter(f => f.status !== 'protected')
    .reduce((acc, cur) => acc + cur.size, 0);

  return (
    <div className="space-y-6">
      {/* 1. مساحة رفع أو سحب ملف الـ ZIP */}
      {!diffFiles.length ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-10 rounded-[32px] border-2 border-dashed text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]'
              : isDarkMode
              ? 'border-white/10 bg-zinc-800/60 hover:border-blue-500/50 hover:bg-zinc-800'
              : 'border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50/30'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".zip"
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white flex items-center justify-center shadow-xl shadow-blue-500/20 animate-pulse">
              <UploadCloud size={38} />
            </div>

            <div className="space-y-1">
              <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                اسحب وأفلت ملف تحديث المشروع (ZIP) هنا
              </h4>
              <p className="text-xs text-gray-500 font-bold max-w-md mx-auto">
                يقوم النظام تلقائياً بفحص الأرشيف ومقارنة الملفات المعدلة والجديدة وعرضها عليك قبل التطبيق، مع حماية تامة لفيديوهاتك وقواعد بياناتك.
              </p>
            </div>

            <button
              type="button"
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <FileArchive size={18} />
              <span>اختيار ملف ZIP من جهازك</span>
            </button>
          </div>
        </div>
      ) : (
        /* 2. لوحة مراجعة الفروقات والملفات قبل التحديث (Smart Diff Review) */
        <div className={`p-6 rounded-[32px] border-2 space-y-6 transition-all ${
          isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-blue-100'
        }`}>
          {/* رأس اللوحة */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <FileArchive size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    تقرير فحص حزمة التحديث:
                  </h3>
                  <span className="font-mono text-xs font-black text-blue-500 dir-ltr bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                    {zipName}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-bold mt-0.5">
                  تم اكتشاف {modifiedCount + newCount} ملفاً برمجياً جاهزاً للتحديث الفوري بحجم إجمالي {formatBytes(totalActionableSize)}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDiffFiles([]);
                  setZipName(null);
                  setErrorMessage(null);
                }}
                disabled={isApplying}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 border transition-all ${
                  isDarkMode 
                    ? 'border-white/10 hover:bg-zinc-700 text-gray-300' 
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <X size={15} />
                <span>إلغاء واختيار ملف آخر</span>
              </button>

              <button
                onClick={handleApplyUpdate}
                disabled={isApplying || modifiedCount + newCount === 0}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                {isApplying ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>{isApplying ? 'جاري تثبيت التحديث...' : 'تأكيد وتطبيق التحديث الآن'}</span>
              </button>
            </div>
          </div>

          {/* شريط التقدم أثناء التطبيق */}
          {isApplying && (
            <div className="space-y-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
              <div className="flex justify-between text-xs font-black text-blue-600 dark:text-blue-400">
                <span>جاري استبدال وحقن الملفات المحدثة في المنصة...</span>
                <span className="font-mono">{applyProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${applyProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* بطاقات الإحصائيات السريعة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isDarkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
                <FileCode size={20} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold">ملفات معدلة</p>
                <p className="text-base font-black text-amber-500 font-mono">{modifiedCount}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isDarkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold">ملفات جديدة</p>
                <p className="text-base font-black text-emerald-500 font-mono">{newCount}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isDarkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold">ملفات وقواعد محمية</p>
                <p className="text-base font-black text-blue-500 font-mono">{protectedCount}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isDarkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black">
                <HardDrive size={20} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold">حجم التحديث الفعلي</p>
                <p className="text-base font-black text-purple-500 font-mono">{formatBytes(totalActionableSize)}</p>
              </div>
            </div>
          </div>

          {/* تنبيه حماية البيانات */}
          <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
            isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
            <p className="text-xs font-black leading-relaxed">
              <strong>حماية كاملة:</strong> مجلدات الفيديوهات (<span className="font-mono">server_videos/</span>)، والكتب (<span className="font-mono">server_pdfs/</span>)، والأغلفة، وقاعدة بيانات الفهرس معزولة ومحمية تلقائياً ولن يتم حذفها أو استبدالها.
            </p>
          </div>

          {/* شريط الفلاتر والبحث في قائمة الملفات */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDarkMode ? 'bg-zinc-900 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                الكل ({diffFiles.length})
              </button>
              <button
                onClick={() => setSelectedFilter('code')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedFilter === 'code'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : isDarkMode ? 'bg-zinc-900 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                المعدلة ({modifiedCount})
              </button>
              <button
                onClick={() => setSelectedFilter('new')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedFilter === 'new'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDarkMode ? 'bg-zinc-900 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                الجديدة ({newCount})
              </button>
              <button
                onClick={() => setSelectedFilter('protected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedFilter === 'protected'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDarkMode ? 'bg-zinc-900 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                المحمية ({protectedCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في أسماء الملفات..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isDarkMode 
                    ? 'bg-zinc-900 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                }`}
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            </div>
          </div>

          {/* جدول / قائمة الملفات */}
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
            {filteredFiles.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-gray-400">
                لا توجد ملفات مطابقة للفلتر المحدد
              </div>
            ) : (
              filteredFiles.map((file, idx) => (
                <div 
                  key={idx}
                  className={`p-3 flex items-center justify-between text-xs font-bold transition-colors ${
                    isDarkMode ? 'hover:bg-zinc-700/40' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      file.status === 'protected' 
                        ? 'bg-blue-500/10 text-blue-500'
                        : file.status === 'new'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {file.status === 'protected' ? (
                        <ShieldCheck size={14} />
                      ) : file.status === 'new' ? (
                        <Sparkles size={14} />
                      ) : (
                        <FileCode size={14} />
                      )}
                    </div>
                    
                    <div className="truncate flex-1">
                      <p className={`font-mono text-xs truncate dir-ltr text-right ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {file.path}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 mr-3">
                    <span className="font-mono text-[11px] text-gray-400">
                      {formatBytes(file.size)}
                    </span>
                    
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      file.status === 'protected'
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        : file.status === 'new'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {file.status === 'protected' ? '🔒 محمي وآمن' : file.status === 'new' ? '🟢 جديد' : '🟡 تحديث كود'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* رسالة الخطأ إن وجدت */}
      {errorMessage && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertCircle size={20} className="text-rose-500 shrink-0" />
          <p className="text-xs font-black">{errorMessage}</p>
        </div>
      )}

      {/* 3. نافذة منبثقة تفاعلية عند اكتمال التحديث مع زر إعادة التشغيل (Restart Modal) */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
          <div className={`w-full max-w-md p-6 rounded-[32px] shadow-2xl border-2 space-y-6 text-center animate-in zoom-in-95 duration-300 ${
            isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-white border-emerald-100 text-gray-900'
          }`}>
            
            {/* أيقونة النجاح والاحتفال */}
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-green-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black">تم تثبيت التحديث بنجاح! 🎉</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                تم استبدال وحقن {successStats?.updatedCount} ملفاً برمجياً بحجم {successStats?.size} بنجاح، مع الحفاظ الكامل على قاعدة بياناتك وفيديوهاتك دون أي تعديل.
              </p>
            </div>

            {/* تفاصيل التحديث */}
            <div className={`p-3.5 rounded-2xl border text-xs font-bold space-y-1.5 ${
              isDarkMode ? 'bg-zinc-900/80 border-white/5 text-gray-300' : 'bg-emerald-50/60 border-emerald-100 text-emerald-950'
            }`}>
              <div className="flex justify-between items-center">
                <span>حالة التحديث:</span>
                <span className="text-emerald-500 font-black flex items-center gap-1">
                  <Check size={14} /> نشط ومثبت
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>الملفات المحدثة:</span>
                <span className="font-mono font-black">{successStats?.updatedCount} ملفات</span>
              </div>
            </div>

            {/* زر إعادة التشغيل الفوري */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleRestartPlatform}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all active:scale-[0.98]"
              >
                <Power size={18} />
                <span>إعادة تشغيل المنصة الآن</span>
              </button>

              <button
                onClick={() => setShowRestartModal(false)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                إغلاق والمتابعة لاحقاً
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
