import React, { useState, useRef } from 'react';
import { 
  X, Upload, Image as ImageIcon, Check, Trash2, 
  Video, FileText, CheckSquare, Award, BookOpen, Sparkles
} from 'lucide-react';
import { PdfCategory } from '../../types';
import { saveBannerCover, deleteBannerCover } from '../../services/eduStorage';

interface EditCourseWithFoldersModalProps {
  course: PdfCategory;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCourse: PdfCategory, updatedFolderCovers: Record<string, string>) => void;
  initialFolderCovers: Record<string, string>;
  isDarkMode?: boolean;
}

type TabType = 'course' | 'videos' | 'pdf' | 'assignments' | 'exams';

export const EditCourseWithFoldersModal: React.FC<EditCourseWithFoldersModalProps> = ({
  course,
  isOpen,
  onClose,
  onSave,
  initialFolderCovers,
  isDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('course');
  const [courseName, setCourseName] = useState(course.name);
  const [courseDesc, setCourseDesc] = useState(course.description || '');
  const [courseCover, setCourseCover] = useState<string | null>(course.coverImage || null);

  const videosFolderId = `${course.id}_videos`;
  const pdfFolderId = `${course.id}_pdf`;
  const assignmentsFolderId = `${course.id}_assignments`;
  const examsFolderId = `${course.id}_exams`;

  const [folderCovers, setFolderCovers] = useState<Record<string, string>>({
    [videosFolderId]: initialFolderCovers[videosFolderId] || '',
    [pdfFolderId]: initialFolderCovers[pdfFolderId] || '',
    [assignmentsFolderId]: initialFolderCovers[assignmentsFolderId] || '',
    [examsFolderId]: initialFolderCovers[examsFolderId] || '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadTargetRef = useRef<string>('course');

  if (!isOpen) return null;

  const tabsConfig: {
    id: TabType;
    label: string;
    subLabel: string;
    icon: React.ReactNode;
    color: string;
    folderId?: string;
  }[] = [
    {
      id: 'course',
      label: 'غلاف وبيانات المقرر',
      subLabel: 'الغلاف الرئيسي واسم المقرر',
      icon: <BookOpen size={16} />,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    },
    {
      id: 'videos',
      label: '01. غلاف الفيديوهات التعليمية',
      subLabel: 'المحاضرات والدروس المرئية',
      icon: <Video size={16} />,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
      folderId: videosFolderId
    },
    {
      id: 'pdf',
      label: '02. غلاف ملفات PDF',
      subLabel: 'الكتب والمذكرات والمراجع',
      icon: <FileText size={16} />,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
      folderId: pdfFolderId
    },
    {
      id: 'assignments',
      label: '03. غلاف الواجبات',
      subLabel: 'التكليفات والمهام الدراسية',
      icon: <CheckSquare size={16} />,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      folderId: assignmentsFolderId
    },
    {
      id: 'exams',
      label: '04. غلاف الاختبارات',
      subLabel: 'الاختبارات والتقييمات',
      icon: <Award size={16} />,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
      folderId: examsFolderId
    }
  ];

  const handleTriggerUpload = (target: string) => {
    currentUploadTargetRef.current = target;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize and scale to standard 1920x1080 banner format (16:9)
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Center crop to 16:9 ratio
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width / 2) - (img.width / 2) * scale;
          const y = (canvas.height / 2) - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          const target = currentUploadTargetRef.current;
          
          if (target === 'course') {
            setCourseCover(optimizedDataUrl);
          } else {
            setFolderCovers(prev => ({
              ...prev,
              [target]: optimizedDataUrl
            }));
          }
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input value so selecting the same file triggers onChange
    e.target.value = '';
  };

  const handleRemoveCurrentCover = (target: string) => {
    if (target === 'course') {
      setCourseCover(null);
    } else {
      setFolderCovers(prev => ({
        ...prev,
        [target]: ''
      }));
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    // Save or delete course cover
    if (courseCover) {
      await saveBannerCover(course.id, courseCover);
    } else {
      await deleteBannerCover(course.id);
    }

    // Save or delete all folder covers
    for (const [fId, fCover] of Object.entries(folderCovers)) {
      if (fCover) {
        await saveBannerCover(fId, fCover);
      } else {
        await deleteBannerCover(fId);
      }
    }

    const updatedCourseObj: PdfCategory = {
      ...course,
      name: courseName.trim(),
      description: courseDesc.trim(),
      coverImage: courseCover || undefined
    };

    onSave(updatedCourseObj, folderCovers);
    onClose();
  };

  const getActiveCoverPreview = (): string | null => {
    if (activeTab === 'course') return courseCover;
    const folderId = tabsConfig.find(t => t.id === activeTab)?.folderId;
    return folderId ? (folderCovers[folderId] || null) : null;
  };

  const activeCover = getActiveCoverPreview();
  const currentTargetId = activeTab === 'course' ? 'course' : (tabsConfig.find(t => t.id === activeTab)?.folderId || 'course');
  const activeTabConfig = tabsConfig.find(t => t.id === activeTab)!;

  return (
    <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in" dir="rtl">
      <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
        isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>تعديل أغلفة واسم المقرر والمجلدات الأربعة</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">1920 × 1080 HD</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold">
                خصص صورة الغلاف العريضة للمقرر الرئيسي ولكل مجلد من المجلدات الأربعة من مكان واحد
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body with Tabs */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Tabs Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {tabsConfig.map((tab) => {
              const isSelected = activeTab === tab.id;
              const hasCustomCover = tab.id === 'course' 
                ? !!courseCover 
                : !!folderCovers[tab.folderId || ''];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                    isSelected 
                      ? `${tab.color} ring-2 ring-emerald-500 font-black shadow-sm` 
                      : isDarkMode 
                        ? 'bg-zinc-800/60 border-white/5 text-gray-400 hover:border-white/20' 
                        : 'bg-gray-50 border-gray-200/80 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="p-1.5 rounded-lg bg-white/20 dark:bg-black/20">
                      {tab.icon}
                    </span>
                    {hasCustomCover && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="تم تعيين غلاف مخصص" />
                    )}
                  </div>
                  <div className="text-xs font-black truncate">{tab.label}</div>
                  <div className="text-[10px] text-gray-400 font-bold truncate mt-0.5">{tab.subLabel}</div>
                </button>
              );
            })}
          </div>

          {/* Form & Active Tab Area */}
          <div className={`p-5 rounded-3xl border ${
            isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50/60 border-gray-100'
          }`}>

            {/* If Course Tab, show Course Name & Desc fields */}
            {activeTab === 'course' && (
              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-white/10">
                <div>
                  <label className="block text-xs font-black mb-1.5">اسم المقرر التعليمي *</label>
                  <input 
                    type="text" 
                    value={courseName} 
                    onChange={(e) => setCourseName(e.target.value)} 
                    required
                    placeholder="مثال: مقرر استراتيجيات التسويق الرقمي..."
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                      isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black mb-1.5">نبذة عن المقرر</label>
                  <textarea 
                    value={courseDesc} 
                    onChange={(e) => setCourseDesc(e.target.value)} 
                    rows={2}
                    placeholder="محتويات المقرر وأهدافه التعليمية..."
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none ${
                      isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* 1920x1080 Cover Upload Area for the Active Tab */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black flex items-center gap-2">
                    <span className="text-emerald-500">{activeTabConfig.icon}</span>
                    <span>{activeTabConfig.label} - صورة الغلاف (1920 × 1080)</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 font-bold">
                    {activeTab === 'course' 
                      ? 'الغلاف الرئيسي الذي يظهر في أعلى صفحة المقرر وبطاقته الخارجية' 
                      : `الغلاف العريض الخاص بـ ${activeTabConfig.label}`}
                  </p>
                </div>

                {activeCover && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveCurrentCover(currentTargetId)}
                    className="text-xs text-red-500 hover:text-red-600 font-black flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>حذف الغلاف والعودة للنمط الافتراضي</span>
                  </button>
                )}
              </div>

              {/* Upload Dropzone / Live 16:9 Banner Preview */}
              <div 
                onClick={() => handleTriggerUpload(currentTargetId)}
                className={`relative aspect-[16/9] max-h-[260px] w-full rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden group transition-all flex flex-col items-center justify-center ${
                  activeCover 
                    ? 'border-emerald-500 shadow-md' 
                    : isDarkMode 
                      ? 'border-zinc-700 hover:border-emerald-500 bg-zinc-800/60' 
                      : 'border-gray-300 hover:border-emerald-500 bg-white'
                }`}
              >
                {activeCover ? (
                  <>
                    <img 
                      src={activeCover} 
                      alt="غلاف" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4">
                      <Upload size={30} className="mb-2" />
                      <span className="text-xs font-black">اضغط لتغيير الغلاف (1920 × 1080)</span>
                      <span className="text-[10px] text-gray-200 mt-1">يتم القص والتحسين تلقائياً بدقة HD</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={22} />
                    </div>
                    <span className="text-xs font-black text-emerald-600 mb-1">اضغط لرفع صورة غلاف عريضة</span>
                    <span className="text-[11px] text-gray-400 font-bold">الأبعاد القياسية المعتمدة: 1920 × 1080 (نسبة 16:9)</span>
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs font-bold gap-2">
                    <Sparkles size={16} className="animate-spin text-emerald-400" />
                    <span>جاري معالجة وضبط أبعاد الصورة (1920 × 1080)...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold px-1">
                <span>الصيغ المدعومة: JPG, PNG, WEBP</span>
                <span>سيتم حفظ الغلاف محلياً بجودة فائقة</span>
              </div>
            </div>

          </div>

          {/* Hidden Global File Input */}
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
          />

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/50 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-colors ${
              isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            إلغاء
          </button>

          <button 
            type="button"
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 active:scale-95"
          >
            <Check size={16} />
            <span>حفظ كافة الأغلفة والتعديلات</span>
          </button>
        </div>

      </div>
    </div>
  );
};
