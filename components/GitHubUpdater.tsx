import React, { useState, useEffect } from 'react';
import { 
  GitBranch, GitPullRequest, GitCommit, RefreshCw, CheckCircle2, 
  AlertTriangle, ShieldCheck, ArrowRight, ExternalLink, Sparkles, 
  Terminal, Layers, HardDrive, Check, Zap, Power, AlertCircle,
  Clock, User, FileCode
} from 'lucide-react';

interface GitHubUpdaterProps {
  isDarkMode: boolean;
  onUpdateComplete?: () => void;
}

interface GitCommitInfo {
  repoUrl: string;
  branch: string;
  commitSha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
}

export const GitHubUpdater: React.FC<GitHubUpdaterProps> = ({ isDarkMode, onUpdateComplete }) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/Marwan31912/h-jja');
  const [branch, setBranch] = useState('main');
  const [isChecking, setIsChecking] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullStepMessage, setPullStepMessage] = useState('');
  const [commitInfo, setCommitInfo] = useState<GitCommitInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    method: string;
    updatedCount: number;
    message: string;
    sampleFiles?: string[];
  } | null>(null);
  const [showRestartModal, setShowRestartModal] = useState(false);

  // Check commit on mount or when requested
  const handleCheckCommit = async (silent = false) => {
    if (!silent) setIsChecking(true);
    setErrorMessage(null);

    try {
      const electronApi = (window as any).electronAPI;
      if (electronApi?.system?.gitInfo) {
        const res = await electronApi.system.gitInfo(repoUrl);
        if (res && res.success) {
          setCommitInfo(res);
        } else {
          throw new Error(res?.error || 'فشل جلب بيانات المستودع');
        }
      } else {
        const query = new URLSearchParams({ repo: repoUrl, branch }).toString();
        const res = await fetch(`/api/system/git-info?${query}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setCommitInfo(data);
        } else {
          // If main branch fails, attempt master fallback
          if (branch === 'main') {
            const fbQuery = new URLSearchParams({ repo: repoUrl, branch: 'master' }).toString();
            const fbRes = await fetch(`/api/system/git-info?${fbQuery}`);
            const fbData = await fbRes.json();
            if (fbRes.ok && fbData.success) {
              setBranch('master');
              setCommitInfo(fbData);
              return;
            }
          }
          throw new Error(data.error || 'تعذر الاتصال بمستودع GitHub');
        }
      }
    } catch (err: any) {
      if (!silent) {
        setErrorMessage(err.message || 'فشل الاتصال بـ GitHub. يرجى التحقق من اتصال الإنترنت.');
      }
    } finally {
      if (!silent) setIsChecking(false);
    }
  };

  useEffect(() => {
    handleCheckCommit(true);
  }, []);

  // Perform Git Pull & Direct Update
  const handleGitPull = async () => {
    setIsPulling(true);
    setPullProgress(15);
    setPullStepMessage('الاتصال بمستودع GitHub (Marwan31912/h-jja)...');
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      setPullProgress(35);
      setPullStepMessage('جلب أحدث التعديلات والملفات البرمجية من الفرع: ' + branch + '...');

      const electronApi = (window as any).electronAPI;
      let data: any = null;

      if (electronApi?.system?.gitUpdate) {
        setPullProgress(60);
        setPullStepMessage('تطبيق التحديثات عبر Electron...');
        data = await electronApi.system.gitUpdate({ repoUrl, branch });
      } else {
        setPullProgress(55);
        setPullStepMessage('تحميل الحزمة البرمجية وفحص الفروقات والتعديلات...');
        const response = await fetch('/api/system/git-pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl, branch })
        });
        data = await response.json();
      }

      if (data && data.success) {
        setPullProgress(85);
        setPullStepMessage('حماية قواعد البيانات والميديا، وتثبيت الكود الجديد...');
        await new Promise(r => setTimeout(r, 600));
        setPullProgress(100);
        setPullStepMessage('اكتمل التحديث بنجاح!');

        setSuccessResult({
          method: data.method || 'direct-sync',
          updatedCount: data.updatedCount || 1,
          message: data.message || 'تم تحديث المنصة بنجاح من GitHub!',
          sampleFiles: data.updatedFilesSample || []
        });

        setShowRestartModal(true);
        if (onUpdateComplete) onUpdateComplete();
      } else {
        throw new Error(data?.error || 'فشلت عملية التحديث من GitHub');
      }
    } catch (err: any) {
      console.error('[GitHub Update Error]:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء سحب التحديث من GitHub.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleRestart = () => {
    const electronApi = (window as any).electronAPI;
    if (electronApi?.system?.restartApp) {
      electronApi.system.restartApp();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* بطاقة معلومات المستودع والتحكم السريع */}
      <div className={`p-6 rounded-3xl border-2 transition-all shadow-sm ${
        isDarkMode ? 'bg-zinc-900/90 border-white/10' : 'bg-gradient-to-br from-slate-50 to-indigo-50/40 border-slate-200'
      }`}>
        
        {/* شريط رأس المستودع */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-lg border border-white/10 shrink-0">
              <GitBranch size={26} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-gray-900 dark:text-white">Marwan31912/h-jja</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Check size={12} />
                  <span>المستودع الرسمي المعتمد</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 font-bold mt-1">
                تحديث المنصة مباشرة وسحب أحدث التحسينات والأكواد من GitHub بنقرة زر واحدة.
              </p>
            </div>
          </div>

          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors self-start sm:self-auto border border-blue-200 dark:border-blue-800/40"
          >
            <span>فتح في GitHub</span>
            <ExternalLink size={13} />
          </a>
        </div>

        {/* إعدادات الرابط والفرع */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-black text-gray-500">رابط مستودع المشروع (Repository URL):</label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/Marwan31912/h-jja"
              className={`w-full px-4 py-2.5 rounded-2xl text-xs font-mono font-bold border outline-none transition-all ${
                isDarkMode 
                  ? 'bg-zinc-800 border-white/10 text-gray-100 focus:border-emerald-500' 
                  : 'bg-white border-gray-300 text-gray-800 focus:border-emerald-600'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-500">الفرع البرمجي (Branch):</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className={`w-full px-4 py-2.5 rounded-2xl text-xs font-mono font-bold border outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-zinc-800 border-white/10 text-gray-100 focus:border-emerald-500' 
                    : 'bg-white border-gray-300 text-gray-800 focus:border-emerald-600'
                }`}
              />
              <button
                onClick={() => handleCheckCommit(false)}
                disabled={isChecking || isPulling}
                title="فحص أحدث الكوميتات"
                className="p-2.5 rounded-2xl bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={isChecking ? 'animate-spin text-blue-500' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* عرض تفاصيل آخر Commit مسجل على GitHub */}
        {commitInfo && (
          <div className={`mt-5 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDarkMode ? 'bg-zinc-800/80 border-white/5' : 'bg-white border-slate-200'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GitCommit size={16} className="text-emerald-500 shrink-0" />
                <span className="font-mono text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {commitInfo.shortSha || 'Latest Commit'}
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-md">
                  {commitInfo.message || 'أحدث إصدار على GitHub'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-gray-500 font-bold pr-6">
                {commitInfo.author && (
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {commitInfo.author}
                  </span>
                )}
                {commitInfo.date && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(commitInfo.date).toLocaleString('ar-EG')}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleCheckCommit(false)}
              disabled={isChecking || isPulling}
              className="text-xs font-black text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center gap-1 self-end sm:self-auto"
            >
              <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
              <span>إعادة الفحص</span>
            </button>
          </div>
        )}

      </div>

      {/* زر التحديث الرئيسي وسير العمل */}
      <div className="flex flex-col gap-4">
        
        {/* شريط الإجراءات والزر الكبير */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={handleGitPull}
            disabled={isPulling}
            className={`flex-1 py-4 px-6 rounded-3xl font-black text-sm text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-98 ${
              isPulling
                ? 'bg-blue-600 opacity-90 cursor-wait'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-600/25 hover:shadow-emerald-600/40'
            }`}
          >
            {isPulling ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                <span>جاري سحب وتطبيق التحديث من GitHub... ({pullProgress}%)</span>
              </>
            ) : (
              <>
                <GitPullRequest size={22} className="text-emerald-200" />
                <span>سحب وتطبيق التحديث الفوري الآن (Git Pull & Update)</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleCheckCommit(false)}
            disabled={isChecking || isPulling}
            className={`py-4 px-6 rounded-3xl font-black text-xs border-2 transition-all flex items-center justify-center gap-2 ${
              isDarkMode 
                ? 'bg-zinc-800 border-white/10 text-gray-200 hover:bg-zinc-700' 
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
            <span>فحص التحديثات فقط</span>
          </button>
        </div>

        {/* شريط التقدم أثناء التحديث */}
        {isPulling && (
          <div className={`p-5 rounded-3xl border-2 space-y-3 animate-in fade-in duration-300 ${
            isDarkMode ? 'bg-zinc-900 border-blue-500/20' : 'bg-blue-50/70 border-blue-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Zap size={15} className="animate-pulse" />
                {pullStepMessage}
              </span>
              <span className="font-mono text-blue-700 dark:text-blue-300">{pullProgress}%</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${pullProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* رسالة الخطأ في حال حدوثه */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-3 animate-in fade-in duration-300">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* رسالة النجاح والملفات المحدثة */}
        {successResult && (
          <div className={`p-5 rounded-3xl border-2 space-y-4 animate-in fade-in duration-300 ${
            isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                    تم التحديث بنجاح من GitHub!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                    {successResult.message}
                  </p>
                </div>
              </div>

              <button
                onClick={handleRestart}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <Power size={15} />
                <span>إعادة تحميل المنصة الآن</span>
              </button>
            </div>

            {successResult.sampleFiles && successResult.sampleFiles.length > 0 && (
              <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800/40">
                <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <FileCode size={14} />
                  <span>عينة من الملفات التي تم تحديثها تلقائياً:</span>
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-emerald-100/50 dark:bg-zinc-900/60 font-mono text-[10px]">
                  {successResult.sampleFiles.map((file, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* تنبيه الأمان والعزل الكامل لقواعد البيانات */}
      <div className={`p-5 rounded-3xl border-2 flex items-center gap-4 ${
        isDarkMode ? 'bg-zinc-800/60 border-white/5' : 'bg-slate-50 border-slate-200/80'
      }`}>
        <ShieldCheck size={26} className="text-emerald-500 shrink-0" />
        <div className="space-y-0.5">
          <h5 className="text-xs font-black text-gray-900 dark:text-white">
            حماية كاملة للبيانات والفيديوهات (Isolated Storage Protection)
          </h5>
          <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
            عملية التحديث من GitHub تستبدل فقط الأكواد البرمجية والواجهات، بينما تبقى جميع الفيديوهات، والكتب، وقواعد البيانات (SQLite / JSON) محفوظة ومعزولة تماماً دون أي مساس بها.
          </p>
        </div>
      </div>

      {/* نافذة التأكيد بعد التحديث لإعادة التشغيل */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-[32px] border-2 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-right ${
            isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-emerald-100 text-gray-900'
          }`} dir="rtl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
              <Sparkles size={32} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-black text-lg">اكتمل التحديث من GitHub بنجاح! 🚀</h3>
              <p className="text-xs text-gray-500 font-bold leading-relaxed">
                تم سحب وتطبيق أحدث كود ومزايا المنصة من مستودع GitHub. يرجى إعادة تحميل المنصة لتفعيل التغييرات فوراً.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRestart}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Power size={16} />
                <span>إعادة تحميل المنصة الآن</span>
              </button>
              <button
                onClick={() => setShowRestartModal(false)}
                className="px-5 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-black text-xs transition-all"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
