import React, { useState } from 'react';
import { 
  BookOpen, Video, FileText, CheckSquare, Award, 
  Edit3, Trash2, MoreVertical, ArrowLeft, Image as ImageIcon 
} from 'lucide-react';
import { PdfCategory } from '../../types';
import { getCoverDisplayUrl } from '../../services/eduStorage';

interface CourseCardProps {
  course: PdfCategory;
  videosCount: number;
  pdfsCount: number;
  assignmentsCount: number;
  examsCount: number;
  onSelect: (course: PdfCategory) => void;
  onEdit: (course: PdfCategory) => void;
  onDelete: (courseId: string) => void;
  isDarkMode?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  videosCount,
  pdfsCount,
  assignmentsCount,
  examsCount,
  onSelect,
  onEdit,
  onDelete,
  isDarkMode
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div 
      onClick={() => onSelect(course)}
      className={`rounded-[32px] border overflow-hidden transition-all duration-300 group hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between relative ${
        isDarkMode 
          ? 'bg-zinc-900 border-white/5 hover:border-blue-500/40' 
          : 'bg-white border-gray-100 hover:border-blue-200'
      }`}
    >
      {/* 1920x1080 Wide Banner Area */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900">
        {course.coverImage ? (
          <img 
            src={getCoverDisplayUrl(course.coverImage)} 
            alt={course.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform">
              <BookOpen size={30} className="text-blue-200" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-blue-200/80">مقرر دراسي متكامل</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* Options Menu & Top badges */}
        <div className="absolute top-4 right-4 left-4 flex items-center justify-between z-10" onClick={(e) => e.stopPropagation()}>
          <div className="px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-black">
            مقرر دراسي
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
                    onEdit(course); 
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-black text-right flex items-center gap-2 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                >
                  <Edit3 size={14} />
                  <span>تعديل الاسم والغلاف</span>
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setShowMenu(false); 
                    onDelete(course.id); 
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-black text-right flex items-center gap-2 hover:bg-red-500/10 text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>حذف المقرر</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="absolute bottom-4 right-4 left-4 z-10">
          <h3 className="text-lg font-black text-white line-clamp-1 drop-shadow-md group-hover:text-blue-300 transition-colors">
            {course.name}
          </h3>
        </div>
      </div>

      {/* Card Body with 4 folder badges */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/5 text-blue-600 dark:text-blue-400 text-xs font-bold">
            <Video size={14} />
            <span>{videosCount} فيديو</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/5 text-red-600 dark:text-red-400 text-xs font-bold">
            <FileText size={14} />
            <span>{pdfsCount} ملفات PDF</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <CheckSquare size={14} />
            <span>{assignmentsCount} واجبات</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-500/5 text-purple-600 dark:text-purple-400 text-xs font-bold">
            <Award size={14} />
            <span>{examsCount} اختبارات</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <span>فتح المجلدات الأربعة</span>
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          </span>
          <span className="text-[10px] text-gray-400 font-bold">1920 × 1080 HD</span>
        </div>
      </div>

    </div>
  );
};
