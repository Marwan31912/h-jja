import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Server, ShieldCheck, Key, Play, Copy, Check, 
  RefreshCw, Folder, HardDrive, Cpu, Radio, Sparkles, ExternalLink,
  Layers, Video, CheckCircle2, AlertCircle, FileText, Globe
} from 'lucide-react';
import { Department, Course } from '../../types';
import { resolveApiUrl } from '../../services/eduStorage';

interface MobileBackendManagerProps {
  departments: Department[];
  courses: Course[];
  isDarkMode?: boolean;
  onShowToast: (msg: string) => void;
}

export const MobileBackendManager: React.FC<MobileBackendManagerProps> = ({
  departments,
  courses,
  isDarkMode,
  onShowToast
}) => {
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Test Temporary URL Generator State
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [tokenValidityMins, setTokenValidityMins] = useState(30);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch Server Health & Sync status
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [resHealth, resSync] = await Promise.all([
        fetch(resolveApiUrl('/api/mobile/health')),
        fetch(resolveApiUrl('/api/mobile/sync/status'))
      ]);

      if (resHealth.ok) {
        const dataH = await resHealth.json();
        setServerStatus(dataH);
      }
      if (resSync.ok) {
        const dataS = await resSync.json();
        setSyncStatus(dataS);
      }
    } catch (e) {
      console.error('Error fetching backend status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Sync Current Platform State (Departments, Courses) to Backend Local Store
  const handleSyncToBackend = async () => {
    setSyncing(true);
    try {
      // Gather videos and folders from current courses
      const allVideos: any[] = [];
      const allFolders: any[] = [];

      courses.forEach(c => {
        if (c.folders) {
          c.folders.forEach(f => {
            allFolders.push({
              id: f.id,
              name: f.name,
              courseId: c.id,
              parentId: f.parentId
            });
            if (f.videos) {
              f.videos.forEach(v => {
                allVideos.push({
                  id: v.id,
                  title: v.title,
                  description: v.description,
                  fileName: v.fileName || `video_${v.id}.mp4`,
                  fileSize: v.fileSize || 50000000,
                  duration: v.duration || '20:00',
                  author: v.author || c.instructor,
                  courseId: c.id,
                  folderId: f.id,
                  addedAt: v.addedAt || Date.now()
                });
              });
            }
          });
        }
      });

      const payload = {
        departments: departments.map(d => ({
          id: d.id,
          name: d.name,
          icon: d.icon,
          code: d.name.substring(0, 3).toUpperCase()
        })),
        courses: courses.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          departmentId: c.departmentId,
          category: c.category,
          instructor: c.instructor,
          coverImage: c.coverImage,
          lessonsCount: c.lessonsCount || (c.folders ? c.folders.reduce((acc, f) => acc + (f.videos?.length || 0), 0) : 0)
        })),
        folders: allFolders,
        videos: allVideos,
        pdfs: []
      };

      const res = await fetch(resolveApiUrl('/api/mobile/sync/save-catalog'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onShowToast('تمت مزامنة بيانات المنصة بالكامل مع خادم تطبيق الهاتف بنجاح!');
        fetchStatus();
      } else {
        onShowToast('تعذر حفظ المزامنة على الخادم');
      }
    } catch (e: any) {
      onShowToast(`خطأ أثناء المزامنة: ${e?.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Generate Temporary Token Simulator
  const handleGenerateSignedUrl = async () => {
    if (!selectedVideoId) {
      onShowToast('يرجى اختيار فيديو أو إدخال معرف الفيديو');
      return;
    }

    setGeneratingToken(true);
    try {
      const res = await fetch(resolveApiUrl('/api/mobile/media/request-playback-url'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideoId,
          validityMinutes: Number(tokenValidityMins) || 30,
          deviceId: 'android_test_device_01'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedResult(data);
        onShowToast('تم إنشاء الرابط المؤقت الموقع وتشفير الرمز بنجاح!');
      } else {
        onShowToast(data.error || 'فشل توليد الرابط المؤقت');
      }
    } catch (e: any) {
      onShowToast(`خطأ في طلب الرابط: ${e?.message}`);
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    onShowToast('تم نسخ الرابط المؤقت إلى الحافظة');
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  // Extract all available videos for dropdown
  const allAppVideos: Array<{ id: string; title: string; courseTitle: string; fileName?: string }> = [];
  courses.forEach(c => {
    c.folders?.forEach(f => {
      f.videos?.forEach(v => {
        allAppVideos.push({
          id: v.id,
          title: v.title,
          courseTitle: c.title,
          fileName: v.fileName
        });
      });
    });
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-white/5">
        <div>
          <h3 className="text-xl font-black flex items-center gap-2">
            <Smartphone className="text-emerald-500" size={26} />
            <span>بنية وخادم تطبيق الأندرويد (Mobile Backend & Streaming Bridge)</span>
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1">
            الربط المتكامل بين تطبيق الهاتف والمنصة: فلترة الكورسات حسب القسم، توليد الروابط المؤقتة المشفرة، والبث بنظام 206 Partial Content.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className={`p-2.5 rounded-2xl border transition-all ${
              isDarkMode ? 'border-zinc-700 bg-zinc-800 text-gray-300 hover:text-white' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900'
            }`}
            title="تحديث حالة الخادم"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-emerald-500' : ''} />
          </button>

          <button
            onClick={handleSyncToBackend}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all hover:scale-105"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            <span>مزامنة الكورسات مع خادم الهاتف</span>
          </button>
        </div>
      </div>

      {/* Backend Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Server Status */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-900/90 border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400">حالة الخادم المحلي</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 font-black text-sm text-emerald-600 dark:text-emerald-400">
            <Server size={18} />
            <span>متصل ويعمل (Port 3000)</span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-2">
            يدعم HTTP Range Streaming لـ ExoPlayer
          </p>
        </div>

        {/* Card 2: Security & Tokens */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-900/90 border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400">نظام تشفير الروابط</span>
            <ShieldCheck size={16} className="text-blue-500" />
          </div>
          <div className="font-black text-sm text-blue-600 dark:text-blue-400">
            <span>HMAC-SHA256 Signed</span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-2">
            روابط مؤقتة تنتهي ذاتياً لمنع التسريب
          </p>
        </div>

        {/* Card 3: Storage Folder on PC */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-900/90 border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400">مجلد الفيديوهات على جهازك</span>
            <HardDrive size={16} className="text-amber-500" />
          </div>
          <div className="font-black text-xs text-amber-600 dark:text-amber-400 font-mono truncate">
            server_videos/
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-2">
            {syncStatus?.totalVideosOnDisk || 0} ملف فيديو مكتشف محلياً
          </p>
        </div>

        {/* Card 4: Scoped Catalog */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-900/90 border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400">فهرس المحتوى المتاح</span>
            <Layers size={16} className="text-purple-500" />
          </div>
          <div className="font-black text-sm text-purple-600 dark:text-purple-400">
            <span>{departments.length} أقسام • {courses.length} كورسات</span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-2">
            مفهرسة ومفلترة بحسب كل قسم بدقة
          </p>
        </div>

      </div>

      {/* Main Grid: Architecture & Test Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Simulator: Generate & Test Signed Playback URL */}
        <div className={`lg:col-span-6 p-6 rounded-3xl border space-y-4 ${
          isDarkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Key size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black">أداة محاكاة واختبار الروابط المؤقتة (Signed URL Tester)</h4>
              <p className="text-[11px] text-gray-400 font-bold">اختبر ما يطلبه تطبيق الأندرويد واستعرض الرابط ورمز التشفير</p>
            </div>
          </div>

          {/* Select Video */}
          <div>
            <label className="block text-xs font-black mb-1.5">اختر الدرس / الفيديو المطلوب:</label>
            <select
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-2xl text-xs font-bold border outline-none ${
                isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
              }`}
            >
              <option value="">-- اختر درساً من الكورسات الحالية أو عينات الخادم --</option>
              <option value="vid_sample_1">درس تجريبي: مدخل الخوارزميات (vid_sample_1)</option>
              <option value="vid_sample_2">درس تجريبي: القوائم المترابطة (vid_sample_2)</option>
              {allAppVideos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.title} ({v.courseTitle})
                </option>
              ))}
            </select>
          </div>

          {/* Expiration Duration */}
          <div>
            <label className="block text-xs font-black mb-1.5">مدة صلاحية الرابط بالدقائق (Token Validity):</label>
            <div className="flex items-center gap-2">
              {[15, 30, 60, 120].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setTokenValidityMins(mins)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                    tokenValidityMins === mins
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : isDarkMode ? 'bg-zinc-800/80 border-zinc-700 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'
                  }`}
                >
                  {mins} دقيقة
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerateSignedUrl}
            disabled={generatingToken}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            {generatingToken ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>جاري توقيع وتشفير الرابط...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>طلب وتوليد الرابط المؤقت المشفر (Request Temporary URL)</span>
              </>
            )}
          </button>

          {/* Generated Result Output */}
          {generatedResult && (
            <div className={`p-4 rounded-2xl border space-y-3 mt-4 ${
              isDarkMode ? 'bg-zinc-800/60 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>تم إصدار الرابط المؤقت بنجاح</span>
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  صالح لمدة: {generatedResult.expiresInSeconds} ثانية
                </span>
              </div>

              {/* Playback URL */}
              <div className="space-y-1">
                <div className="text-[11px] font-black text-gray-500">رابط البث المباشر (Playback URL):</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedResult.playbackUrl}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none select-all ${
                      isDarkMode ? 'bg-zinc-900 border-zinc-700 text-emerald-400' : 'bg-white border-gray-200 text-emerald-700'
                    }`}
                  />
                  <button
                    onClick={() => copyToClipboard(generatedResult.playbackUrl)}
                    className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"
                    title="نسخ الرابط"
                  >
                    {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Signed Token */}
              <div className="space-y-1">
                <div className="text-[11px] font-black text-gray-500">الرمز المشفر (Signed HMAC Token):</div>
                <div className="p-2 rounded-xl bg-black/10 dark:bg-black/40 text-[10px] font-mono break-all text-gray-400">
                  {generatedResult.signedToken}
                </div>
              </div>

              <div className="text-[10px] font-bold text-gray-400">
                ⏰ تاريخ الانتهاء: {new Date(generatedResult.expiresAt).toLocaleTimeString('ar-EG')}
              </div>
            </div>
          )}

        </div>

        {/* Right: Architecture & API Specs for Android App */}
        <div className={`lg:col-span-6 p-6 rounded-3xl border space-y-4 ${
          isDarkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Globe size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black">واجهات الـ REST API المتاحة لتطبيق الهاتف</h4>
              <p className="text-[11px] text-gray-400 font-bold">نقاط النهاية (Endpoints) الجاهزة للاتصال بالأندرويد</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs font-bold">
            
            {/* Endpoint 1 */}
            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-200/70'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-mono text-[10px]">GET</span>
                <span className="font-mono text-gray-400 text-[11px]">/api/mobile/departments</span>
              </div>
              <p className="text-[11px] text-gray-400">جلب قائمة الأقسام والكليات المتاحة في المنصة.</p>
            </div>

            {/* Endpoint 2 */}
            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-200/70'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-mono text-[10px]">GET</span>
                <span className="font-mono text-gray-400 text-[11px]">/api/mobile/courses?departmentId=...</span>
              </div>
              <p className="text-[11px] text-gray-400">جلب الكورسات التابعة للقسم المحدد حصراً دون خلط مع باقي الأقسام.</p>
            </div>

            {/* Endpoint 3 */}
            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-200/70'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-mono text-[10px]">GET</span>
                <span className="font-mono text-gray-400 text-[11px]">/api/mobile/course-content?courseId=...</span>
              </div>
              <p className="text-[11px] text-gray-400">جلب هيكل الكورس الكامل (المجلدات، الفيديوهات، وملفات PDF).</p>
            </div>

            {/* Endpoint 4 */}
            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-200/70'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-mono text-[10px]">POST</span>
                <span className="font-mono text-gray-400 text-[11px]">/api/mobile/media/request-playback-url</span>
              </div>
              <p className="text-[11px] text-gray-400">إصدار رابط تشغيل مؤقت مشفر (Signed URL) صالح لمدة زمنية محددة.</p>
            </div>

            {/* Endpoint 5 */}
            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-200/70'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-mono text-[10px]">STREAM</span>
                <span className="font-mono text-gray-400 text-[11px]">/api/mobile/stream?token=...</span>
              </div>
              <p className="text-[11px] text-gray-400">بث الفيديو مع دعم HTTP 206 Range للتقديم والترجيع اللحظي في ExoPlayer.</p>
            </div>

          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-2">
            <Sparkles size={16} className="shrink-0" />
            <span>خادم الـ Backend يعمل بشكل مباشر ومدمج مع المنصة وجاهز للربط الآن.</span>
          </div>

        </div>

      </div>

    </div>
  );
};
