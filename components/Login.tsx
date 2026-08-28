
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, ArrowLeft, ChevronDown, ShieldCheck, Check, Sun, Moon } from 'lucide-react';
import { UserAccount } from '../types';
import { CandleIcon } from './Sidebar';

interface LoginProps {
  onLogin: (username: string) => void;
  users: UserAccount[];
  systemName: string;
  onCheckSession?: (username: string) => Promise<boolean>;
  userAvatars: Record<string, string>;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, systemName, onCheckSession, userAvatars }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showUserList, setShowUserList] = useState(false);

  useEffect(() => {
    // Sync with global theme if exists, else default to dark as per last design
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark || true);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError('يرجى اختيار مستخدم من القائمة');
      return;
    }
    setIsLoading(true);
    setError('');

    setTimeout(async () => {
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        if (onCheckSession) {
           const canLogin = await onCheckSession(user.username);
           if (!canLogin) {
              setError('عذراً، هذا المستخدم متصل حالياً من جهاز آخر');
              setIsLoading(false);
              return;
           }
        }
        
        setIsSuccess(true);
        setIsLoading(false);
        setTimeout(() => {
          onLogin(user.username);
        }, 800);
      } else {
        setError('عذراً، كلمة المرور التي أدخلتها غير صحيحة');
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div 
      className={`relative w-full h-screen flex items-center justify-center p-6 overflow-hidden transition-all duration-1000 ease-in-out ${
        isDarkMode ? 'bg-[#020617]' : 'bg-slate-50'
      } ${
        isSuccess ? 'opacity-0 scale-110 blur-2xl' : 'opacity-100'
      }`} 
      dir="rtl"
    >
      {/* Theme Toggle */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={toggleTheme}
        className={`absolute top-10 left-10 p-4 rounded-2xl z-50 transition-all ${
          isDarkMode ? 'bg-white/5 text-emerald-400 border-white/10' : 'bg-white text-emerald-600 border-slate-200 shadow-xl'
        } border`}
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </motion.button>
      
      {/* Background Animated Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: isDarkMode ? [0.1, 0.2, 0.1] : [0.03, 0.08, 0.03],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className={`absolute top-[-10%] right-[-10%] w-[50rem] h-[50rem] ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-500/10'} blur-[150px] rounded-full`} 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: isDarkMode ? [0.05, 0.15, 0.05] : [0.02, 0.06, 0.02],
          rotate: [0, -90, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className={`absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] ${isDarkMode ? 'bg-emerald-400/20' : 'bg-emerald-400/10'} blur-[120px] rounded-full`} 
      />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[65rem]"
      >
        
        <div className={`backdrop-blur-3xl rounded-[4rem] shadow-2xl p-10 md:p-20 relative border transition-colors duration-500 flex flex-col md:flex-row items-center gap-16 md:gap-24 ${
          isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/80 border-slate-200'
        }`}>
          
          {/* Logo Section */}
          <div className={`flex-1 flex flex-col items-center justify-center w-full md:border-l ${isDarkMode ? 'border-white/5' : 'border-slate-100'} md:pl-20`}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1 }}
              className="mb-10 relative"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.2, 0.4, 0.2] 
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-emerald-500/20 blur-[40px] rounded-full"
              />
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <CandleIcon className={`w-28 h-28 md:w-36 md:h-36 drop-shadow-[0_0_2rem_rgba(251,191,36,0.6)] ${isDarkMode ? 'text-amber-400' : 'text-emerald-600'}`} />
              </motion.div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`text-3xl md:text-4xl font-black mb-6 tracking-tighter text-center leading-tight bg-gradient-to-br bg-clip-text text-transparent whitespace-nowrap px-4 ${
                isDarkMode ? 'from-white to-emerald-400' : 'from-emerald-900 to-emerald-500'
              }`}
            >
              {systemName}
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: isDarkMode ? 0.3 : 0.6 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-3 w-full"
            >
              <span className={`h-px w-6 ${isDarkMode ? 'bg-white/20' : 'bg-emerald-200'}`}></span>
              <p className={`font-bold text-[0.55rem] md:text-[0.6rem] uppercase tracking-[0.2em] mr-[-0.2em] text-center ${isDarkMode ? 'text-white' : 'text-emerald-800'}`}>Portal Access</p>
              <span className={`h-px w-6 ${isDarkMode ? 'bg-white/20' : 'bg-emerald-200'}`}></span>
            </motion.div>
          </div>

          {/* Form Section */}
          <div className="flex-[1.4] w-full flex flex-col justify-center">
            <form onSubmit={handleSubmit} className="space-y-10">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              <label className={`block text-[0.75rem] font-black mr-4 uppercase tracking-[0.25em] ${isDarkMode ? 'text-white/30' : 'text-emerald-900/40'}`}>( المستخدم )</label>
              <div className="relative group">
                <div className={`absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center transition-all z-20 ${
                  isDarkMode ? 'bg-white/5 text-emerald-400/50 group-focus-within:text-emerald-400' : 'bg-slate-50 text-emerald-600/40 group-focus-within:text-emerald-600'
                }`}>
                  {username && userAvatars[username] ? (
                    <img src={userAvatars[username]} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div
                  onClick={() => !isSuccess && setShowUserList(!showUserList)}
                  className={`w-full pr-20 pl-14 py-6 border-2 outline-none transition-all font-bold cursor-pointer shadow-xl text-base md:text-lg disabled:opacity-50 rounded-[2.5rem] flex items-center justify-between ${
                    isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-emerald-900'
                  } ${showUserList ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
                >
                  <span className={!username ? (isDarkMode ? 'text-white/30' : 'text-slate-400') : ''}>
                    {username || 'اختر حسابك الشخصي...'}
                  </span>
                </div>
                <div className={`absolute left-7 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${showUserList ? 'rotate-180' : ''} ${
                  isDarkMode ? 'text-emerald-400/50' : 'text-emerald-600/40'
                }`}>
                  <ChevronDown size={22} />
                </div>

                <AnimatePresence>
                  {showUserList && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowUserList(false)}
                        className="fixed inset-0 z-30"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute top-full left-0 right-0 mt-4 z-40 rounded-[2.5rem] border shadow-2xl overflow-hidden p-4 ${
                          isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                          {users.map((user) => (
                            <button
                              key={user.username}
                              type="button"
                              onClick={() => {
                                setUsername(user.username);
                                setShowUserList(false);
                              }}
                              className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${
                                username === user.username
                                  ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                                  : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center border-2 ${
                                username === user.username ? 'border-emerald-500' : (isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-100')
                              }`}>
                                {userAvatars[user.username] ? (
                                  <img src={userAvatars[user.username]} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-lg font-black">{user.username[0].toUpperCase()}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-black text-sm">{user.username}</div>
                                <div className={`text-[10px] font-bold ${
                                  user.isManager 
                                    ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') 
                                    : 'text-gray-400'
                                }`}>
                                  {user.isManager ? 'مدير نظام' : 'موظف'}
                                </div>
                              </div>
                              {username === user.username && <Check size={18} className="mr-auto ml-2" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="space-y-4"
            >
              <label className={`block text-[0.75rem] font-black mr-4 uppercase tracking-[0.25em] ${isDarkMode ? 'text-white/30' : 'text-emerald-900/40'}`}>كلمة المرور</label>
              <div className="relative group">
                <div className={`absolute right-7 top-1/2 -translate-y-1/2 transition-colors ${
                  isDarkMode ? 'text-emerald-400/50 group-focus-within:text-emerald-400' : 'text-emerald-600/40 group-focus-within:text-emerald-600'
                }`}>
                  <Lock size={26} />
                </div>
                <input
                  type="password"
                  required
                  disabled={isSuccess}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pr-18 pl-8 py-6 border-2 outline-none transition-all font-bold shadow-xl tracking-[0.5em] placeholder:tracking-normal text-xl disabled:opacity-50 rounded-[2.5rem] ${
                    isDarkMode ? 'bg-white/5 border-white/5 focus:border-emerald-500/50 focus:bg-white/10 text-white placeholder:text-white/10' : 'bg-slate-50 border-slate-100 focus:border-emerald-500/50 focus:bg-white text-emerald-900 placeholder:text-slate-300'
                  }`}
                />
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className={`p-6 rounded-3xl text-[0.85rem] font-black flex items-center gap-5 border ${
                    isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl shadow-sm ${isDarkMode ? 'bg-red-500/20' : 'bg-white'}`}>
                    <ShieldCheck size={20} />
                  </div>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className={`group relative w-full py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all duration-500 flex items-center justify-center gap-6 active:scale-[0.98] disabled:opacity-90 overflow-hidden ${
                  isSuccess 
                    ? 'bg-emerald-500 text-white shadow-emerald-500/40' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                {isLoading ? (
                  <div className="w-9 h-9 border-[0.35rem] border-white/30 border-t-white rounded-full animate-spin" />
                ) : isSuccess ? (
                  <>
                    <span>تم الدخول بنجاح</span>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="bg-white/20 p-2.5 rounded-2xl"
                    >
                      <Check size={26} />
                    </motion.div>
                  </>
                ) : (
                  <>
                    <span>دخول للنظام</span>
                    <div className="bg-white/10 p-2.5 rounded-2xl transition-transform group-hover:-translate-x-3">
                      <ArrowLeft size={26} />
                    </div>
                  </>
                )}
              </button>
            </motion.div>
            </form>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: isDarkMode ? 0.2 : 0.4 }}
              transition={{ delay: 1 }}
              className={`mt-14 pt-10 border-t flex justify-between items-center ${isDarkMode ? 'border-white/5 text-white' : 'border-slate-100 text-emerald-900'}`}
            >
              <p className="text-[0.65rem] font-black uppercase tracking-[0.4em]">Secured System</p>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.4em]">v2.5.0</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
