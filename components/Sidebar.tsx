
import React from 'react';
import { Settings, LogOut, GraduationCap, Library } from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  currentUser: string;
  currentUserAvatar?: string;
  isDarkMode?: boolean;
  systemName: string;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const CandleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="18" y="82" width="64" height="10" rx="5" fill="#C27D56" />
    <rect x="25" y="80" width="50" height="6" rx="3" fill="#D99B77" />
    <rect x="38" y="32" width="24" height="48" fill="#FDE68A" />
    <path d="M38 32H62V48C62 48 60 52 56 52C52 52 50 48 50 48C50 48 48 55 42 55C38 55 38 48 38 48V32Z" fill="#FEF3C7" />
    <circle cx="42" cy="55" r="4" fill="#FEF3C7" />
    <circle cx="56" cy="52" r="4" fill="#FEF3C7" />
    <rect x="49" y="24" width="2" height="8" fill="#451A03" />

    {/* Flame Container */}
    <g style={{ transformOrigin: '50% 25%' }}>
      <path d="M50 5C50 5 44 14 44 20C44 23.3137 46.6863 26 50 26C53.3137 26 56 23.3137 56 20C56 14 50 5 50 5Z" fill="#FCD34D">
        <animate attributeName="opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="scale" values="1 1; 1.05 1.1; 1 1" additive="sum" dur="1s" repeatCount="indefinite" />
      </path>
      <path d="M50 12C50 12 47 17 47 20C47 21.6569 48.3431 23 50 23C51.6569 23 53 21.6569 53 20C53 17 50 12 50 12Z" fill="#F59E0B" />
    </g>
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onLogout, currentUser, currentUserAvatar, isDarkMode, systemName, isOpen, toggleSidebar }) => {
  const menuItems = [
    { id: Page.PdfManager, label: 'المحتوى التعليمي', icon: GraduationCap },
    { id: Page.Warehouse, label: 'المكتبة الشاملة', icon: Library },
    { id: Page.Settings, label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className={`h-full flex flex-col py-10 transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-emerald-900'}`} dir="rtl">
      {/* Brand - Clickable to toggle */}
      <div 
        className={`flex flex-col items-center text-right transition-all duration-500 cursor-pointer ${isOpen ? 'px-8 mb-12' : 'px-0 mb-6'}`}
        onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
        title={isOpen ? "إخفاء القائمة" : "إظهار القائمة"}
      >
        <div className={`rounded-[22px] flex items-center justify-center shadow-lg border relative group overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white/10 border-white/20'} ${isOpen ? 'w-20 h-20 mb-4' : 'w-14 h-14 mb-0 hover:scale-110'}`}>
          {currentUserAvatar ? (
            <img src={currentUserAvatar} alt={currentUser} className="w-full h-full object-cover" />
          ) : (
            <CandleIcon className={`transition-all duration-500 ${isOpen ? 'w-12 h-12' : 'w-8 h-8'} drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]`} />
          )}
        </div>
        <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
           <h2 className="text-white text-xl font-black tracking-wide text-center whitespace-nowrap">{systemName}</h2>
        </div>
      </div>

      <nav className={`flex-1 space-y-4 overflow-hidden transition-all duration-500 ${isOpen ? 'px-6' : 'px-3'}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as Page)}
              className={`w-full flex items-center gap-4 px-2 py-2 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-white/10 text-white border border-white/20 shadow-lg' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
              title={item.label}
            >
              <div className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 group-hover:bg-white/10'}`}>
                <Icon size={20} />
              </div>
              <span className={`font-black text-sm whitespace-nowrap transition-all duration-500 overflow-hidden ${isOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
                {item.label}
              </span>
              {isActive && isOpen && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
            </button>
          );
        })}
      </nav>

      <div className={`mt-auto transition-all duration-500 ${isOpen ? 'px-6' : 'px-3'}`}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-2 py-2 rounded-2xl text-white/60 hover:bg-red-500/10 hover:text-red-400 transition-all group"
          title="تسجيل الخروج"
        >
          <div className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-red-500/20 transition-colors">
            <LogOut size={20} />
          </div>
          <span className={`font-black text-sm whitespace-nowrap transition-all duration-500 overflow-hidden ${isOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
            تسجيل الخروج
          </span>
        </button>
        
        <div className={`mt-6 flex flex-col items-center transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
           <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Aladdin Librarian</div>
           <div className="text-[8px] font-bold text-white/10 mt-1">v2.6.0 • Build 31912</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
