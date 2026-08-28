import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Check, Trash2 } from 'lucide-react';
import { PdfCategory } from '../../types';
import { saveBannerCover, deleteBannerCover, saveCoverFile, deleteCoverFile } from '../../services/eduStorage';

interface EditCoverModalProps {
  item: PdfCategory;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: PdfCategory) => void;
  isDarkMode?: boolean;
}

export const EditCoverModal: React.FC<EditCoverModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  isDarkMode
}) => {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [coverPreview, setCoverPreview] = useState<string | null>(item.coverImage || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize and scale to standard 1920x1080 banner format
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
          setCoverPreview(optimizedDataUrl);
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = async () => {
    setCoverPreview(null);
    if (item.coverImage && !item.coverImage.startsWith('data:')) {
      await deleteCoverFile(item.coverImage);
    }
    await deleteBannerCover(item.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalCover = coverPreview;
    if (coverPreview) {
      if (coverPreview.startsWith('data:')) {
        const coverRes = await saveCoverFile(item.id, coverPreview);
        if (coverRes.fileName) {
          finalCover = coverRes.fileName;
        }
      }
      await saveBannerCover(item.id, coverPreview);
    } else {
      if (item.coverImage && !item.coverImage.startsWith('data:')) {
        await deleteCoverFile(item.coverImage);
      }
      await deleteBannerCover(item.id);
    }

    onSave({
      ...item,
      name: name.trim(),
      description: description.trim(),
      coverImage: finalCover || undefined
    });
    onClose();
  };

  const titleType = item.categoryType === 'department' ? 'القسم / التخصص' :
                    item.categoryType === 'course' ? 'المقرر التعليمي' : 'المجلد';

  return (
    <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
      <div className={`w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black">تعديل {titleType} والغلاف</h3>
              <p className="text-xs text-gray-400 font-bold">تغيير الاسم ورفع غلاف عريض بدقة (1920 × 1080)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Name Field */}
          <div>
            <label className="block text-xs font-black mb-2">اسم {titleType} *</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
              placeholder={`أدخل اسم ${titleType}...`}
              className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-black mb-2">الوصف التعريفي (اختياري)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={2}
              placeholder="نبذة موجزة أو ملاحظات..."
              className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
            />
          </div>

          {/* 1920x1080 Wide Banner Cover Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black flex items-center gap-1.5">
                <ImageIcon size={14} className="text-emerald-500" />
                <span>صورة الغلاف العريضة (1920 × 1080)</span>
              </label>
              {coverPreview && (
                <button 
                  type="button" 
                  onClick={handleRemoveCover}
                  className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>حذف الغلاف</span>
                </button>
              )}
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-[16/9] w-full rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden group transition-all flex flex-col items-center justify-center ${
                coverPreview 
                  ? 'border-emerald-500' 
                  : isDarkMode ? 'border-zinc-700 hover:border-emerald-500 bg-zinc-800/50' : 'border-gray-300 hover:border-emerald-500 bg-gray-50'
              }`}
            >
              {coverPreview ? (
                <>
                  <img 
                    src={coverPreview} 
                    alt="غلاف" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4">
                    <Upload size={28} className="mb-2" />
                    <span className="text-xs font-black">اضغط لتغيير الغلاف (1920 × 1080)</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={22} />
                  </div>
                  <span className="text-xs font-black text-emerald-600 mb-1">اضغط لرفع صورة الغلاف</span>
                  <span className="text-[11px] text-gray-400 font-bold">الأبعاد الموصى بها: 1920 × 1080 (نسبة 16:9)</span>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                  جاري معالجة وضبط الأبعاد...
                </div>
              )}
            </div>

            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
            <button 
              type="button" 
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-colors ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
            >
              <Check size={16} />
              <span>حفظ التعديلات</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
