import React, { useState } from 'react';
import { 
  X, Plus, Code, Terminal, Cpu, Database, Link as LinkIcon, 
  Globe, Music, Sparkles, Folder, FileCode, BookOpen, 
  Layers, FlaskConical, Binary, Check 
} from 'lucide-react';
import { CustomContentCategory } from '../../types';

interface NewCustomCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onAddCategory: (category: CustomContentCategory) => void;
  isDarkMode?: boolean;
}

const AVAILABLE_ICONS = [
  { id: 'code', label: 'كود برمجي', icon: <Code size={20} /> },
  { id: 'terminal', label: 'طرفية ومشاريع', icon: <Terminal size={20} /> },
  { id: 'filecode', label: 'ملف برمجي', icon: <FileCode size={20} /> },
  { id: 'binary', label: 'خوارزميات', icon: <Binary size={20} /> },
  { id: 'flask', label: 'مختبر وتجارب', icon: <FlaskConical size={20} /> },
  { id: 'database', label: 'قواعد بيانات', icon: <Database size={20} /> },
  { id: 'cpu', label: 'عتاد ومعالجات', icon: <Cpu size={20} /> },
  { id: 'link', label: 'روابط ومراجع', icon: <LinkIcon size={20} /> },
  { id: 'globe', label: 'ويب ومواقع', icon: <Globe size={20} /> },
  { id: 'music', label: 'صوتيات وبودكاست', icon: <Music size={20} /> },
  { id: 'sparkles', label: 'ذكاء اصطناعي', icon: <Sparkles size={20} /> },
  { id: 'layers', label: 'أقسام مجمعة', icon: <Layers size={20} /> }
];

const COLOR_THEMES = [
  { id: 'cyan', name: 'أزرق سماوي', grad: 'from-cyan-700 via-teal-800 to-slate-900', accent: 'text-cyan-500', border: 'border-cyan-500/20' },
  { id: 'indigo', name: 'نيلي حديث', grad: 'from-indigo-700 via-blue-800 to-slate-900', accent: 'text-indigo-500', border: 'border-indigo-500/20' },
  { id: 'emerald', name: 'زمردي راقي', grad: 'from-emerald-700 via-teal-800 to-green-950', accent: 'text-emerald-500', border: 'border-emerald-500/20' },
  { id: 'purple', name: 'بنفسجي داكن', grad: 'from-purple-700 via-violet-800 to-slate-900', accent: 'text-purple-500', border: 'border-purple-500/20' },
  { id: 'amber', name: 'برتقالي كهرماني', grad: 'from-amber-700 via-orange-800 to-stone-900', accent: 'text-amber-500', border: 'border-amber-500/20' },
  { id: 'rose', name: 'وردي ياقوتي', grad: 'from-rose-700 via-pink-800 to-zinc-900', accent: 'text-rose-500', border: 'border-rose-500/20' }
];

export const NewCustomCategoryModal: React.FC<NewCustomCategoryModalProps> = ({
  isOpen,
  onClose,
  courseId,
  onAddCategory,
  isDarkMode
}) => {
  const [name, setName] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('code');
  const [selectedColor, setSelectedColor] = useState('cyan');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const theme = COLOR_THEMES.find(t => t.id === selectedColor) || COLOR_THEMES[0];

    const newCat: CustomContentCategory = {
      id: `custom_cat_${Date.now()}`,
      name: name.trim(),
      shortTitle: shortTitle.trim() || name.trim(),
      description: description.trim() || 'قسم مخصص لإدارة الشيفرات والمحتويات الإضافية للمقرر.',
      iconName: selectedIcon,
      colorGrad: theme.grad,
      accentColor: theme.accent,
      borderColor: theme.border,
      courseId,
      addedAt: Date.now()
    };

    onAddCategory(newCat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 text-gray-800'
        }`}
        dir="rtl"
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-100 bg-gray-50/70'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold shadow-inner">
              <Code size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black">
                إضافة قسم محتوى جديد (Create New Content)
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                إنشاء تبويب ومجلد مخصص مثل الشيفرات البرمجية، المشاريع، أو المراجع
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl text-gray-400 hover:text-gray-600 transition-colors ${
              isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Category Name */}
          <div>
            <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1.5">
              اسم القسم الجديد (مثال: الشيفرات البرمجية والمشاريع / Source Code): *
            </label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: الشيفرات البرمجية والأمثلة التطبيقية"
              className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold outline-none transition-all ${
                isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'
              }`}
            />
          </div>

          {/* Short Title & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1.5">
                عنوان مختصر للبطاقة:
              </label>
              <input 
                type="text"
                value={shortTitle}
                onChange={(e) => setShortTitle(e.target.value)}
                placeholder="مثال: كود ومشاريع"
                className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold outline-none transition-all ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1.5">
                وصف القسم:
              </label>
              <input 
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="أمثلة وشيفرات برمجية مرافقة للدروس..."
                className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold outline-none transition-all ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'
                }`}
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-2">
              اختر الأيقونة المعبرة عن القسم:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {AVAILABLE_ICONS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedIcon(item.id)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                    selectedIcon === item.id 
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500 shadow-xs' 
                      : (isDarkMode ? 'bg-zinc-800/50 border-zinc-800 text-gray-400 hover:bg-zinc-800' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100')
                  }`}
                >
                  <div>{item.icon}</div>
                  <span className="text-[10px] truncate max-w-full">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Gradient Theme Selector */}
          <div>
            <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-2">
              المظهر والنسق اللوني:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COLOR_THEMES.map((theme) => (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => setSelectedColor(theme.id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                    selectedColor === theme.id 
                      ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                      : (isDarkMode ? 'border-zinc-800 bg-zinc-800/40' : 'border-gray-100 bg-gray-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${theme.grad} shadow-xs`} />
                    <span className="text-xs font-bold">{theme.name}</span>
                  </div>
                  {selectedColor === theme.id && <Check size={14} className="text-cyan-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer Inside Form */}
          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                isDarkMode ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>إنشاء وتثبيت القسم في المقرر</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
