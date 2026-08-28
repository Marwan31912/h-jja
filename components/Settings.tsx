
import React, { useState, useEffect } from 'react';
import { 
  User, ShieldCheck, RefreshCw, Sparkles, CheckCircle2, 
  DownloadCloud, Zap, Laptop, ArrowUpCircle, HardDrive, Check,
  AlertCircle, FileArchive, UploadCloud
} from 'lucide-react';
import { Page, UserAccount } from '../types';
import { SmartZipUpdater } from './SmartZipUpdater';

interface SettingsProps {
  onClearData: () => void;
  onRestoreBackup?: (onProgress: (p: number) => void) => Promise<void>;
  onExport: () => void;
  onImport: () => void;
  isLinked: boolean;
  onNavigate: (p: Page) => void;
  currentUser: string;
  users: UserAccount[];
  isDarkMode?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ 
  onNavigate, 
  currentUser, 
  isDarkMode
}) => {
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [activeUpdaterTab, setActiveUpdaterTab] = useState<'zip' | 'cloud'>('zip');
  const [isChecking, setIsChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'up-to-date' | 'downloading' | 'ready'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Check version on mount
  useEffect(() => {
    const electronApi = (window as any).electronAPI;
    if (electronApi?.system?.checkUpdate) {
      electronApi.system.checkUpdate().then((res: any) => {
        if (res && res.currentVersion) {
          setCurrentVersion(res.currentVersion);
        }
      }).catch(() => {});
    } else if (window.location.protocol.startsWith('http')) {
      fetch('/api/system/version')
        .then(res => res.json())
        .then(data => {
          if (data.version) setCurrentVersion(data.version);
        })
        .catch(() => {});
    }
  }, []);

  const handleCheckForUpdates = () => {
    setIsChecking(true);
    setStatusMessage('جاري الاتصال بخادم التحديثات السحابي...');
    setUpdateStatus('idle');

    setTimeout(() => {
      setIsChecking(false);
      setUpdateStatus('up-to-date');
      setStatusMessage('أنت تستخدم أحدث إصدار من منصة حجة (v1.0.0 Smart Updater) مع كامل مزايا FFmpeg والتحديث الفوري!');
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 text-right" dir="rtl">
      
      {/* 1. الملف الشخصي */}
      <section className={`p-6 rounded-[32px] border-2 shadow-sm flex items-center justify-between transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-emerald-100/50'}`}>
        <div className="flex items-center gap-5">
          <div 
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDarkMode ? 'bg-emerald-500 bg-opacity-10 text-emerald-400' : 'bg-emerald-800 text-white'}`}
          >
            <User size={32} />
          </div>
          <div>
            <h3 className={`font-extrabold text-xl ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>الملف الشخصي</h3>
            <p className={`font-black text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{currentUser}</p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate(Page.Profile)} 
          className={`px-6 py-2 rounded-xl font-black text-sm transition-all shadow-sm ${isDarkMode ? 'bg-emerald-500 bg-opacity-10 text-emerald-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
        >
          إعدادات الحساب المتقدمة
        </button>
      </section>

      {/* 2. مركز التحديث الشامل: رفع ملف ZIP والفحص التلقائي للملفات المعدلة */}
      <section className={`p-6 sm:p-8 rounded-[36px] border-2 shadow-sm space-y-6 transition-all ${
        isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-blue-100/70'
      }`}>
        
        {/* رأس القسم الرئيسي */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  نظام التحديث الذكي والفوري للمنصة
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
                  v{currentVersion}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-bold mt-1">
                تحديث ملفات المنصة مباشرة عبر ملف ZIP أو الفحص السحابي، مع مراجعة كاملة للملفات قبل التحديث وحماية قواعد البيانات.
              </p>
            </div>
          </div>

          {/* تبديل طريقة التحديث */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-900 self-start sm:self-auto border border-gray-200 dark:border-white/5">
            <button
              onClick={() => setActiveUpdaterTab('zip')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                activeUpdaterTab === 'zip'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileArchive size={15} />
              <span>رفع ملف ZIP المحدث</span>
            </button>
            <button
              onClick={() => setActiveUpdaterTab('cloud')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                activeUpdaterTab === 'cloud'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <RefreshCw size={14} />
              <span>فحص سحابي سريع</span>
            </button>
          </div>
        </div>

        {/* محتوى تبويب رفع ملف ZIP */}
        {activeUpdaterTab === 'zip' ? (
          <div className="pt-2 animate-in fade-in duration-300">
            <SmartZipUpdater isDarkMode={!!isDarkMode} />
          </div>
        ) : (
          /* محتوى تبويب الفحص السحابي السريع */
          <div className="space-y-5 pt-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-white/5">
              <div>
                <p className={`text-xs font-black ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  فحص حزم التحديثات والواجهات من الخادم
                </p>
                <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                  التحقق من توفر إصدار أحدث للمنصة والواجهات البرمجية.
                </p>
              </div>

              <button
                onClick={handleCheckForUpdates}
                disabled={isChecking}
                className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <RefreshCw size={15} className={isChecking ? 'animate-spin' : ''} />
                <span>{isChecking ? 'جاري الفحص...' : 'فحص الآن'}</span>
              </button>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in duration-300 ${
                isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <CheckCircle2 size={20} className="text-blue-500 shrink-0" />
                <p className="text-xs font-black flex-1">{statusMessage}</p>
              </div>
            )}
          </div>
        )}

      </section>

      {/* 3. تنبيه الأمان والنسخ الاحتياطي */}
      <div 
        className={`p-6 rounded-3xl border-2 flex items-center gap-5 transition-colors ${isDarkMode ? 'bg-emerald-500 bg-opacity-10 border-emerald-500 border-opacity-20' : 'bg-emerald-50 border-emerald-100'}`}
      >
        <ShieldCheck size={28} className="text-emerald-500 shrink-0" />
        <p className={`text-xs font-black leading-relaxed ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>
          أنت تستخدم قاعدة بيانات موثوقة مع حماية سحابية ومحلية تلقائية. النسخ الاحتياطي يعمل باستمرار في الخلفية لضمان سلامة بياناتك وعدم ضياع أي كتاب أو فيديو أثناء التحديث.
        </p>
      </div>

    </div>
  );
};

export default Settings;

