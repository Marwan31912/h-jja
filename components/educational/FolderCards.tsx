import React, { useState } from 'react';
import { 
  Video, FileText, CheckSquare, Award, 
  ArrowLeft, LayoutGrid, List, ChevronLeft, Folder, 
  Plus, Code, Terminal, FileCode, Binary, FlaskConical, 
  Database, Cpu, Link as LinkIcon, Globe, Music, 
  Sparkles, Layers, Trash2
} from 'lucide-react';
import { PdfCategory, CustomContentCategory } from '../../types';

interface FolderCardsProps {
  course: PdfCategory;
  videosCount?: number;
  pdfsCount?: number;
  assignmentsCount?: number;
  examsCount?: number;
  customCategories?: CustomContentCategory[];
  customItemsCount?: Record<string, number>; // customCategoryId -> count
  onSelectFolder: (folderType: 'videos' | 'pdf' | 'assignments' | 'exams', folderCategory: PdfCategory) => void;
  onSelectCustomCategory?: (category: CustomContentCategory) => void;
  onOpenNewCustomCategory?: () => void;
  onDeleteCustomCategory?: (categoryId: string) => void;
  folderCovers: Record<string, string>; // folderId -> coverImage (1920x1080)
  isDarkMode?: boolean;
}

export const FolderCards: React.FC<FolderCardsProps> = ({
  course,
  videosCount = 0,
  pdfsCount = 0,
  assignmentsCount = 0,
  examsCount = 0,
  customCategories = [],
  customItemsCount = {},
  onSelectFolder,
  onSelectCustomCategory,
  onOpenNewCustomCategory,
  onDeleteCustomCategory,
  folderCovers,
  isDarkMode
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getCustomIcon = (iconName: string) => {
    switch (iconName) {
      case 'terminal': return <Terminal size={26} className="text-cyan-100" />;
      case 'filecode': return <FileCode size={26} className="text-cyan-100" />;
      case 'binary': return <Binary size={26} className="text-cyan-100" />;
      case 'flask': return <FlaskConical size={26} className="text-cyan-100" />;
      case 'database': return <Database size={26} className="text-cyan-100" />;
      case 'cpu': return <Cpu size={26} className="text-cyan-100" />;
      case 'link': return <LinkIcon size={26} className="text-cyan-100" />;
      case 'globe': return <Globe size={26} className="text-cyan-100" />;
      case 'music': return <Music size={26} className="text-cyan-100" />;
      case 'sparkles': return <Sparkles size={26} className="text-cyan-100" />;
      case 'layers': return <Layers size={26} className="text-cyan-100" />;
      default: return <Code size={26} className="text-cyan-100" />;
    }
  };

  const foldersConfig: {
    type: 'videos' | 'pdf' | 'assignments' | 'exams';
    id: string;
    number: string;
    name: string;
    shortTitle: string;
    desc: string;
    icon: React.ReactNode;
    count: number;
    countUnit: string;
    colorGrad: string;
    accentColor: string;
    borderColor: string;
    badgeBg: string;
    badgeText: string;
  }[] = [
    {
      type: 'videos',
      id: `${course.id}_videos`,
      number: '01',
      name: 'الفيديوهات التعليمية',
      shortTitle: 'دروس مرئية',
      desc: 'دروس ومحاضرات مرئية مخزنة محلياً للتشغيل الفوري بدون إنترنت.',
      icon: <Video size={26} className="text-blue-100" />,
      count: videosCount,
      countUnit: 'درس فيديو',
      colorGrad: 'from-blue-700 via-indigo-800 to-cyan-900',
      accentColor: 'text-blue-500',
      borderColor: 'border-blue-500/20 hover:border-blue-500/60',
      badgeBg: isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50',
      badgeText: 'text-blue-600 dark:text-blue-400'
    },
    {
      type: 'pdf',
      id: `${course.id}_pdf`,
      number: '02',
      name: 'ملفات PDF والمذكرات',
      shortTitle: 'ملفات PDF',
      desc: 'الكتب والمذكرات والملخصات الدراسية مع عارض تفاعلي مدمج.',
      icon: <FileText size={26} className="text-rose-100" />,
      count: pdfsCount,
      countUnit: 'ملف PDF',
      colorGrad: 'from-rose-700 via-red-800 to-pink-900',
      accentColor: 'text-rose-500',
      borderColor: 'border-rose-500/20 hover:border-rose-500/60',
      badgeBg: isDarkMode ? 'bg-rose-500/15' : 'bg-rose-50',
      badgeText: 'text-rose-600 dark:text-rose-400'
    },
    {
      type: 'assignments',
      id: `${course.id}_assignments`,
      number: '03',
      name: 'الواجبات والتكليفات',
      shortTitle: 'واجبات وتكليفات',
      desc: 'المهام الأكاديمية مع رفع الحلول وتتبع حالة التصحيح والدرجات.',
      icon: <CheckSquare size={26} className="text-amber-100" />,
      count: assignmentsCount,
      countUnit: 'واجب دراسي',
      colorGrad: 'from-amber-700 via-orange-800 to-yellow-900',
      accentColor: 'text-amber-500',
      borderColor: 'border-amber-500/20 hover:border-amber-500/60',
      badgeBg: isDarkMode ? 'bg-amber-500/15' : 'bg-amber-50',
      badgeText: 'text-amber-600 dark:text-amber-400'
    },
    {
      type: 'exams',
      id: `${course.id}_exams`,
      number: '04',
      name: 'الاختبارات والتقييم',
      shortTitle: 'اختبارات وكويزات',
      desc: 'اختبارات إلكترونية تفاعلية محددة بزمن مع تصحيح وحساب نتيجة فوري.',
      icon: <Award size={26} className="text-purple-100" />,
      count: examsCount,
      countUnit: 'اختبار تجريبي',
      colorGrad: 'from-purple-700 via-indigo-800 to-violet-900',
      accentColor: 'text-purple-500',
      borderColor: 'border-purple-500/20 hover:border-purple-500/60',
      badgeBg: isDarkMode ? 'bg-purple-500/15' : 'bg-purple-50',
      badgeText: 'text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar: Clean Header, Add Custom Content & View Switcher */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-4 ${
        isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-xs'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Folder size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
              أقسام ومحتويات المقرر ({4 + customCategories.length} أقسام)
            </h3>
            <p className="text-[11px] text-gray-400 font-bold">
              تنظيم هرمي شامل يجمع الفيديوهات، الملفات، التكليفات، الاختبارات، والأقسام المخصصة (Source Code)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenNewCustomCategory && (
            <button
              onClick={onOpenNewCustomCategory}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>إضافة قسم محتوى جديد (Create New Content)</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              title="عرض الشبكة"
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDarkMode ? 'text-gray-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutGrid size={15} />
              <span className="text-xs font-bold">شبكي</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="عرض القائمة"
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDarkMode ? 'text-gray-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List size={15} />
              <span className="text-xs font-bold">قائمة</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Mode 1: Responsive Grid (1 col on mobile, 2 cols on tablets, 4 cols on desktops) with 16:9 Aspect Ratio */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Standard 4 Folders */}
          {foldersConfig.map((folder) => {
            const cover = folderCovers[folder.id];
            const folderCategoryObj: PdfCategory = {
              id: folder.id,
              name: folder.name,
              iconName: folder.type,
              coverImage: cover,
              categoryType: folder.type,
              parentId: course.id,
              addedAt: Date.now()
            };

            return (
              <div 
                key={folder.id}
                onClick={() => onSelectFolder(folder.type, folderCategoryObj)}
                className={`w-full max-w-md sm:max-w-none mx-auto rounded-[32px] border overflow-hidden transition-all duration-300 group hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between relative select-none ${
                  isDarkMode 
                    ? 'bg-zinc-900 border-white/5 hover:border-white/20' 
                    : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                }`}
              >
                {/* 16:9 1920x1080 Aspect-Ratio Banner */}
                <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${folder.colorGrad}`}>
                  {cover ? (
                    <img 
                      src={cover} 
                      alt={folder.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white text-center">
                      <div className="w-14 h-14 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
                        {folder.icon}
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-white/80">
                        {folder.shortTitle}
                      </span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 right-3.5 left-3.5 flex items-center justify-between z-10">
                    <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                      <span>قسم {folder.number}</span>
                    </div>

                    <div className={`px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[10px] font-black shadow-sm`}>
                      <span>{folder.count} {folder.countUnit}</span>
                    </div>
                  </div>

                  {/* Title in banner */}
                  <div className="absolute bottom-3.5 right-3.5 left-3.5 z-10">
                    <h3 className="text-base sm:text-lg font-black text-white line-clamp-1 drop-shadow-md group-hover:text-white transition-colors">
                      {folder.name.split(' (')[0]}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold line-clamp-2 leading-relaxed mb-4">
                    {folder.desc}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                    <span className={`text-xs font-black flex items-center gap-1 group-hover:underline ${folder.accentColor}`}>
                      <span>دخول القسم</span>
                      <ArrowLeft size={13} className="group-hover:-translate-x-1 transition-transform mr-0.5" />
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">
                      1920 × 1080 HD
                    </span>
                  </div>
                </div>

              </div>
            );
          })}

          {/* Custom Content Categories (e.g. Source Code, Labs, etc.) */}
          {customCategories.map((cat, idx) => {
            const count = customItemsCount[cat.id] || 0;
            const cover = folderCovers[cat.id] || cat.coverImage;

            return (
              <div 
                key={cat.id}
                onClick={() => onSelectCustomCategory?.(cat)}
                className={`w-full max-w-md sm:max-w-none mx-auto rounded-[32px] border overflow-hidden transition-all duration-300 group hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between relative select-none ${
                  isDarkMode 
                    ? 'bg-zinc-900 border-white/5 hover:border-cyan-500/30' 
                    : 'bg-white border-gray-100 hover:border-cyan-200 shadow-sm'
                }`}
              >
                {/* 16:9 Aspect Ratio Banner */}
                <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${cat.colorGrad}`}>
                  {cover ? (
                    <img 
                      src={cover} 
                      alt={cat.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white text-center">
                      <div className="w-14 h-14 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
                        {getCustomIcon(cat.iconName)}
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-white/80">
                        {cat.shortTitle || 'قسم مخصص'}
                      </span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 right-3.5 left-3.5 flex items-center justify-between z-10">
                    <div className="px-3 py-1 rounded-full bg-cyan-900/60 backdrop-blur-md border border-cyan-400/30 text-white text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span>قسم مخصص 0{5 + idx}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[10px] font-black shadow-sm">
                        <span>{count} عنصر</span>
                      </div>
                      {onDeleteCustomCategory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCustomCategory(cat.id);
                          }}
                          className="p-1 rounded-full bg-red-600/70 hover:bg-red-600 text-white transition-colors"
                          title="حذف هذا القسم المخصص"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title in banner */}
                  <div className="absolute bottom-3.5 right-3.5 left-3.5 z-10">
                    <h3 className="text-base sm:text-lg font-black text-white line-clamp-1 drop-shadow-md group-hover:text-white transition-colors">
                      {cat.name}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold line-clamp-2 leading-relaxed mb-4">
                    {cat.description || 'محتويات وأكواد برمجية ومشاريع إضافية للمقرر.'}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                    <span className={`text-xs font-black flex items-center gap-1 group-hover:underline ${cat.accentColor}`}>
                      <span>دخول القسم</span>
                      <ArrowLeft size={13} className="group-hover:-translate-x-1 transition-transform mr-0.5" />
                    </span>
                    <span className="text-[10px] text-cyan-500 font-bold">
                      Source Code & Labs
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Slim Horizontal Rows */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {/* Standard 4 Folders */}
          {foldersConfig.map((folder) => {
            const cover = folderCovers[folder.id];
            const folderCategoryObj: PdfCategory = {
              id: folder.id,
              name: folder.name,
              iconName: folder.type,
              coverImage: cover,
              categoryType: folder.type,
              parentId: course.id,
              addedAt: Date.now()
            };

            return (
              <div 
                key={folder.id}
                onClick={() => onSelectFolder(folder.type, folderCategoryObj)}
                className={`p-4 rounded-2xl border transition-all duration-200 group hover:shadow-md cursor-pointer flex items-center justify-between gap-4 ${
                  isDarkMode 
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' 
                    : 'bg-white border-gray-100 hover:border-gray-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-24 aspect-[16/9] rounded-xl overflow-hidden shrink-0 relative bg-gradient-to-br ${folder.colorGrad} flex items-center justify-center text-white shadow-xs`}>
                    {cover ? (
                      <img src={cover} alt={folder.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="scale-75">{folder.icon}</div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-black/70 text-white backdrop-blur-xs">
                      {folder.number}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-black truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {folder.name}
                      </h4>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${folder.badgeBg} ${folder.badgeText}`}>
                        {folder.count} {folder.countUnit}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-bold truncate">
                      {folder.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectFolder(folder.type, folderCategoryObj)}
                    className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:scale-105 active:scale-95"
                  >
                    <span>فتح القسم</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>

              </div>
            );
          })}

          {/* Custom Content Categories */}
          {customCategories.map((cat, idx) => {
            const count = customItemsCount[cat.id] || 0;
            const cover = folderCovers[cat.id] || cat.coverImage;

            return (
              <div 
                key={cat.id}
                onClick={() => onSelectCustomCategory?.(cat)}
                className={`p-4 rounded-2xl border transition-all duration-200 group hover:shadow-md cursor-pointer flex items-center justify-between gap-4 ${
                  isDarkMode 
                    ? 'bg-zinc-900 border-zinc-800 hover:border-cyan-500/30' 
                    : 'bg-white border-gray-100 hover:border-cyan-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-24 aspect-[16/9] rounded-xl overflow-hidden shrink-0 relative bg-gradient-to-br ${cat.colorGrad} flex items-center justify-center text-white shadow-xs`}>
                    {cover ? (
                      <img src={cover} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="scale-75">{getCustomIcon(cat.iconName)}</div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-black/70 text-white backdrop-blur-xs">
                      0{5 + idx}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-black truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {cat.name}
                      </h4>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500">
                        {count} عنصر
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-bold truncate">
                      {cat.description || 'محتوى مخصص إضافي'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onDeleteCustomCategory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomCategory(cat.id);
                      }}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                      title="حذف هذا القسم"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => onSelectCustomCategory?.(cat)}
                    className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs hover:scale-105 active:scale-95"
                  >
                    <span>فتح القسم</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
