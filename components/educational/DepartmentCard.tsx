import React, { useState } from 'react';
import { 
  Folder, BookOpen, Edit3, Trash2, MoreVertical, 
  Layers, ArrowLeft, Image as ImageIcon, Sparkles 
} from 'lucide-react';
import { PdfCategory } from '../../types';
import { getCoverDisplayUrl } from '../../services/eduStorage';

interface DepartmentCardProps {
  department: PdfCategory;
  coursesCount: number;
  subDepartmentsCount?: number;
  onSelect: (dept: PdfCategory) => void;
  onEdit: (dept: PdfCategory) => void;
  onDelete: (deptId: string) => void;
  isDarkMode?: boolean;
}

export const DepartmentCard: React.FC<DepartmentCardProps> = ({
  department,
  coursesCount,
  subDepartmentsCount = 0,
  onSelect,
  onEdit,
  onDelete,
  isDarkMode
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isSubDepartment = !!department.parentId;

  return (
    <div 
      onClick={() => onSelect(department)}
      className={`rounded-[32px] border overflow-hidden transition-all duration-300 group hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between relative ${
        isDarkMode 
          ? 'bg-zinc-900 border-white/5 hover:border-emerald-500/40' 
          : 'bg-white border-gray-100 hover:border-emerald-200'
      }`}
    >
      {/* 1920x1080 Wide Banner Area */}
      <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${
        isSubDepartment 
          ? 'from-teal-700 via-cyan-800 to-indigo-900' 
          : 'from-emerald-600 via-teal-700 to-cyan-800'
      }`}>
        {department.coverImage ? (
          <img 
            src={getCoverDisplayUrl(department.coverImage)} 
            alt={department.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white text-center relative">
            <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform">
              <Layers size={32} className="text-emerald-200" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-emerald-200/80">
              {isSubDepartment ? 'قسم فرعي (Sub-category)' : 'قسم وتخصص رئيسي'}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Badges & Options Menu */}
        <div className="absolute top-4 right-4 left-4 flex items-center justify-between z-10" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {subDepartmentsCount > 0 && (
              <div className="px-3 py-1 rounded-full bg-cyan-900/60 backdrop-blur-md border border-cyan-400/30 text-cyan-200 text-[10px] font-black flex items-center gap-1">
                <Layers size={11} className="text-cyan-300" />
                <span>{subDepartmentsCount} أقسام فرعية</span>
              </div>
            )}
            <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[10px] font-black flex items-center gap-1">
              <BookOpen size={11} className="text-emerald-400" />
              <span>{coursesCount} مقررات</span>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-2xl bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors border border-white/20"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute left-0 mt-2 w-44 rounded-2xl p-1.5 shadow-2xl border z-30 animate-in fade-in ${
                  isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'
                }`}
              >
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setShowMenu(false); 
                    onEdit(department); 
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-black text-right flex items-center gap-2 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                >
                  <Edit3 size={14} />
                  <span>تعديل الاسم والغلاف</span>
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setShowMenu(false); 
                    onDelete(department.id); 
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-black text-right flex items-center gap-2 hover:bg-red-500/10 text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>حذف القسم بالكامل</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Banner Title */}
        <div className="absolute bottom-4 right-4 left-4 z-10">
          <div className="flex items-center gap-2 mb-1">
            {isSubDepartment && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-[9px] font-black">
                قسم فرعي
              </span>
            )}
          </div>
          <h3 className="text-lg font-black text-white line-clamp-1 drop-shadow-md group-hover:text-emerald-300 transition-colors">
            {department.name}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <p className="text-xs text-gray-400 font-bold line-clamp-2 leading-relaxed mb-4">
          {department.description || 'تخصص أكاديمي شامل يضم المقررات والمناهج الدراسية المتخصصة.'}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>{subDepartmentsCount > 0 ? 'استعراض الأقسام والمقررات' : 'استعراض المقررات والمحتوى'}</span>
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          </span>
          <span className="text-[10px] text-gray-400 font-bold">1920 × 1080 HD</span>
        </div>
      </div>

    </div>
  );
};
