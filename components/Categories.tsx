import React, { useState, useRef, useEffect } from 'react';
import { Category, Book, SubCategory, CustomGroupedCategory } from '../types';
import { Layers, Plus, Trash2, Search, Pencil, BookOpen, ChevronLeft, LayoutGrid, X, MapPin, DollarSign, Package, User, Menu as MenuIcon, Tag, Maximize2, CheckCircle2, Filter, HardDrive, Upload, Loader2, Sparkles, FolderTree } from 'lucide-react';
import { BookDetailsModal } from './BookDetailsModal';
import { getCustomCategories, isBookInCustomCategory } from '../services/customCategoryService';
import { AICategoryDeduplicatorModal } from './AICategoryDeduplicatorModal';
import { fuzzyIncludesArabic } from '../src/utils/textUtils';

interface CategoriesProps {
  categories: Category[];
  subCategories: SubCategory[];
  books: Book[];
  onAdd: (cat: Category) => void;
  onUpdate: (cat: Category) => void;
  onDelete: (id: string) => void;
  onAddSubCategory: (subCat: SubCategory) => void;
  onDeleteSubCategory?: (id: string) => void;
  onEditBook: (book: Book) => void;
  onUpdateBook?: (book: Book) => void;
  onBatchUpdateBooks?: (books: Book[]) => void;
  isDarkMode?: boolean;
  initialCategoryName?: string | null;
}

const compressAndGetBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const Categories: React.FC<CategoriesProps> = ({ 
  categories, 
  subCategories, 
  books, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onAddSubCategory, 
  onDeleteSubCategory, 
  onEditBook, 
  onUpdateBook, 
  onBatchUpdateBooks,
  isDarkMode, 
  initialCategoryName 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [innerSearchTerm, setInnerSearchTerm] = useState(''); 
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSubCatForm, setShowSubCatForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(initialCategoryName !== undefined ? initialCategoryName : 'الكل');
  const [viewingBook, setViewingBook] = useState<Book | null>(null); 
  
  const [dragOverBookId, setDragOverBookId] = useState<string | null>(null);
  const [uploadingBookId, setUploadingBookId] = useState<string | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{ id: string; text: string } | null>(null);

  const [selectedSubCatFilter, setSelectedSubCatFilter] = useState<string[]>([]);
  const [showSubCatFilter, setShowSubCatFilter] = useState(false);
  const [subCatSearchTerm, setSubCatSearchTerm] = useState('');
  const [showSubCatSearch, setShowSubCatSearch] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isDeleteSubCatMode, setIsDeleteSubCatMode] = useState(false);
  const [subCatsToDelete, setSubCatsToDelete] = useState<string[]>([]);

  // التصنيفات المخصصة
  const [customCategories, setCustomCategories] = useState<CustomGroupedCategory[]>(() => getCustomCategories());
  const [selectedCustomCatId, setSelectedCustomCatId] = useState<string | null>(null);
  const [showDeduplicatorModal, setShowDeduplicatorModal] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setCustomCategories(getCustomCategories());
    };
    window.addEventListener('aladdin_custom_categories_updated', handleUpdate);
    return () => {
      window.removeEventListener('aladdin_custom_categories_updated', handleUpdate);
    };
  }, []);

  const [categoriesScale, setCategoriesScale] = useState(1);
  const [booksScale, setBooksScale] = useState(1);

  const [formState, setFormState] = useState({
    name: '',
    description: ''
  });

  const [newSubCatName, setNewSubCatName] = useState('');

  const openAddForm = () => {
    setEditingCategory(null);
    setFormState({ name: '', description: '' });
    setShowAddForm(true);
  };

  const openEditForm = (c: Category) => {
    setEditingCategory(c);
    setFormState({
      name: c.name,
      description: c.description || ''
    });
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name) return;

    if (editingCategory) {
      onUpdate({
        ...editingCategory,
        name: formState.name,
        description: formState.description
      });
    } else {
      onAdd({
        id: crypto.randomUUID(),
        name: formState.name,
        description: formState.description,
        addedAt: Date.now()
      });
    }

    setShowAddForm(false);
    setEditingCategory(null);
  };

  const handleSubCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCatName.trim()) return;
    onAddSubCategory({
      id: crypto.randomUUID(),
      name: newSubCatName.trim(),
      addedAt: Date.now()
    });
    setNewSubCatName('');
    setShowSubCatForm(false);
  };

  const filteredCategories = categories.filter(c =>
    fuzzyIncludesArabic(c.name, searchTerm)
  );

  const filteredCustomCategories = customCategories.filter(c =>
    fuzzyIncludesArabic(c.name, searchTerm) ||
    fuzzyIncludesArabic(c.description, searchTerm)
  );

  const getBooksCount = (catName: string) => {
    return books.filter(b => b.category === catName).length;
  };

  const toggleSubCatFilter = (name: string) => {
    if (isDeleteSubCatMode) {
      const sub = subCategories.find(s => s.name === name);
      if (sub) {
        if (subCatsToDelete.includes(sub.id)) {
          setSubCatsToDelete(prev => prev.filter(id => id !== sub.id));
        } else {
          setSubCatsToDelete(prev => [...prev, sub.id]);
        }
      }
    } else {
      if (selectedSubCatFilter.includes(name)) {
        setSelectedSubCatFilter(prev => prev.filter(n => n !== name));
      } else {
        setSelectedSubCatFilter(prev => [...prev, name]);
      }
    }
  };

  const handleConfirmDeleteSubCats = () => {
    if (onDeleteSubCategory) {
      subCatsToDelete.forEach(id => onDeleteSubCategory(id));
    }
    setSubCatsToDelete([]);
    setIsDeleteSubCatMode(false);
  };

  const ScaleControl = ({ currentScale, onUpdateScale }: { currentScale: number, onUpdateScale: (s: number) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className={`px-3 py-3 rounded-2xl border flex items-center gap-2 font-black text-xs transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-emerald-400 hover:bg-zinc-700' : 'bg-white border-gray-100 text-emerald-600 shadow-sm hover:bg-gray-50'}`}
          title="تغيير حجم الواجهة"
        >
          <Maximize2 size={20} />
        </button>
        {isOpen && (
          <div className={`absolute top-full left-0 mt-2 w-32 rounded-2xl shadow-xl border overflow-hidden z-[200] animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
            <div className="p-1.5 space-y-1">
              {[1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6].map((val) => (
                <button 
                  key={val} 
                  onClick={() => { onUpdateScale(val); setIsOpen(false); }} 
                  className={`w-full px-4 py-2.5 rounded-xl text-right font-black text-[10px] transition-all ${currentScale === val ? 'bg-emerald-600 text-white shadow-lg' : (isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-50')}`}
                >
                  {Math.round(val * 100)}% {val === 1.0 && '(افتراضي)'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (selectedCategoryName) {
    let categoryBooks = selectedCategoryName === 'الكل'
      ? books.filter(b => !b.quranReading && !b.quranSize && (!b.packingCount || b.packingCount <= 1))
      : books.filter(b => b.category === selectedCategoryName);
    
    // تطبيق تصفية التصنيف المخصص عند التواجد في قسم الكل
    if (selectedCategoryName === 'الكل' && selectedCustomCatId) {
      const activeCustom = customCategories.find(c => c.id === selectedCustomCatId);
      if (activeCustom) {
        categoryBooks = categoryBooks.filter(b => isBookInCustomCategory(b, activeCustom));
      }
    }

    categoryBooks.sort((a, b) => (a.author || '').localeCompare(b.author || '', 'ar'));

    if (selectedSubCatFilter.length > 0) {
      categoryBooks = categoryBooks.filter(b => {
        if (!b.subCategory) return false;
        return selectedSubCatFilter.some(filter => b.subCategory!.includes(filter));
      });
    }

    const searchedCategoryBooks = categoryBooks.filter(b => 
      fuzzyIncludesArabic(b.title, innerSearchTerm) ||
      (b.author && fuzzyIncludesArabic(b.author, innerSearchTerm)) ||
      (b.barcode && b.barcode.includes(innerSearchTerm.trim()))
    );

    const activeCustomCategory = selectedCategoryName === 'الكل' && selectedCustomCatId
      ? customCategories.find(c => c.id === selectedCustomCatId)
      : null;

    return (
      <div 
        className="animate-in fade-in slide-in-from-left-4 duration-500 text-right h-full flex flex-col relative min-h-0"
        style={{ zoom: booksScale }}
      >
        
        <BookDetailsModal
          book={viewingBook}
          onClose={() => setViewingBook(null)}
          onEditBook={onEditBook}
          isDarkMode={isDarkMode}
        />

        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
                <BookOpen size={24} />
             </div>
             <div>
                <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                  قسم: {selectedCategoryName}
                  {activeCustomCategory && (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mr-2">
                      ({activeCustomCategory.name})
                    </span>
                  )}
                </h2>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                  إجمالي الكتب المعروضة: {categoryBooks.length}
                </p>
             </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowSearchInput(prev => !prev)} 
              className={`px-3 py-3 rounded-2xl border flex items-center gap-2 font-black text-xs transition-all relative ${
                showSearchInput 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                  : (isDarkMode ? 'bg-zinc-800 border-white/5 text-emerald-400 hover:bg-zinc-700' : 'bg-white border-gray-100 text-emerald-600 shadow-sm hover:bg-gray-50')
              }`}
              title="بحث عن كتاب"
            >
              <Search size={20} />
              {innerSearchTerm.trim() !== '' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
              )}
            </button>
            <button 
              onClick={() => setShowSubCatFilter(prev => !prev)} 
              className={`px-3 py-3 rounded-2xl border flex items-center gap-2 font-black text-xs transition-all relative ${
                showSubCatFilter 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                  : (isDarkMode ? 'bg-zinc-800 border-white/5 text-indigo-400 hover:bg-zinc-700' : 'bg-white border-gray-100 text-indigo-600 shadow-sm hover:bg-gray-50')
              }`}
              title="تصفية حسب التصنيف"
            >
              <Filter size={20} />
              {(selectedSubCatFilter.length > 0 || (selectedCategoryName === 'الكل' && selectedCustomCatId !== null)) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {selectedSubCatFilter.length + (selectedCustomCatId ? 1 : 0)}
                </span>
              )}
            </button>

            <ScaleControl currentScale={booksScale} onUpdateScale={setBooksScale} />
            <button 
              onClick={() => { setSelectedCategoryName(null); setInnerSearchTerm(''); setSelectedSubCatFilter([]); setShowSubCatFilter(false); setShowSearchInput(false); setSelectedCustomCatId(null); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'bg-gray-100 text-emerald-900 hover:bg-gray-200'}`}
            >
              <ChevronLeft size={20} className="stroke-emerald-600" />
              العودة للأقسام
            </button>
          </div>
        </div>

        {/* شريط التصنيفات المخصصة السريع داخل قسم الكل - يظهر مع زر الفلترة */}
        {showSubCatFilter && selectedCategoryName === 'الكل' && customCategories.length > 0 && (
          <div className={`mb-6 p-4 rounded-3xl border shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            isDarkMode ? 'bg-zinc-900/80 border-white/5' : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-emerald-500" />
                <span className={`text-xs font-black ${isDarkMode ? 'text-zinc-200' : 'text-emerald-950'}`}>
                  التصنيفات المخصصة (المجمعة):
                </span>
              </div>

              {selectedCustomCatId && (
                <button
                  onClick={() => setSelectedCustomCatId(null)}
                  className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  <X size={13} />
                  إلغاء التصفية المخصصة (عرض كل الكتب)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {/* خيار الكل الافتراضي */}
              <button
                onClick={() => setSelectedCustomCatId(null)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                  selectedCustomCatId === null
                    ? (isDarkMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-700 text-white shadow-sm')
                    : (isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }`}
              >
                <LayoutGrid size={14} />
                <span>الكل (افتراضي)</span>
              </button>

              {/* أزرار التصنيفات المخصصة */}
              {customCategories.map((cat) => {
                const isSelected = selectedCustomCatId === cat.id;
                const matchCount = books.filter(b => isBookInCustomCategory(b, cat)).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCustomCatId(isSelected ? null : cat.id)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border ${
                      isSelected
                        ? (isDarkMode ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20' : 'bg-emerald-600 text-white border-emerald-600 shadow-md')
                        : (isDarkMode ? 'bg-zinc-800/80 border-white/5 text-zinc-300 hover:border-zinc-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-emerald-300')
                    }`}
                  >
                    <FolderTree size={14} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                    <span>{cat.name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-black/20 text-white'
                        : (isDarkMode ? 'bg-zinc-900 text-zinc-400' : 'bg-gray-200 text-gray-600')
                    }`}>
                      {matchCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showSearchInput && (
          <div className="relative mb-6 shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2" style={{ color: 'var(--accent-600)' }} size={20} />
            <input
              type="text"
              placeholder={`ابحث عن كتاب داخل قسم ${selectedCategoryName}...`}
              value={innerSearchTerm}
              onChange={(e) => setInnerSearchTerm(e.target.value)}
              className={`w-full pr-14 pl-6 py-4 border rounded-[24px] shadow-sm outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-emerald-500' : 'bg-white border-gray-100 text-emerald-900 focus:border-emerald-500'}`}
              autoFocus
            />
          </div>
        )}

        {showSubCatFilter && (
          <div className={`mb-6 p-4 md:p-5 rounded-[24px] border relative transition-all animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm ${isDeleteSubCatMode ? (isDarkMode ? 'border-red-500/30 bg-red-900/10' : 'border-red-200 bg-red-50') : (isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-gray-50/90 border-gray-200/80')}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Tag size={18} className={isDeleteSubCatMode ? "text-red-500" : "text-indigo-500"} />
                <span className={`text-xs font-black ${isDeleteSubCatMode ? "text-red-500" : (isDarkMode ? "text-zinc-200" : "text-gray-700")}`}>
                  {isDeleteSubCatMode ? "حدد التصنيفات لحذفها:" : "تصفية حسب التصنيف الفرعي:"}
                </span>
                {subCategories.length > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-gray-500 shadow-xs'}`}>
                    {subCatSearchTerm.trim() 
                      ? `${subCategories.filter(s => s.name.toLowerCase().includes(subCatSearchTerm.toLowerCase())).length} من ${subCategories.length}`
                      : `${subCategories.length} تصنيف`}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {!isDeleteSubCatMode && (
                  <button
                    onClick={() => setIsDeleteSubCatMode(true)}
                    className={`text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all ${isDarkMode ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                  >
                    <Trash2 size={12} />
                    حذف تصنيف فرعي
                  </button>
                )}
                {isDeleteSubCatMode && (
                  <>
                    <button
                      onClick={handleConfirmDeleteSubCats}
                      disabled={subCatsToDelete.length === 0}
                      className={`text-[10px] font-black px-4 py-1.5 rounded-xl flex items-center gap-1 transition-all bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shadow-sm`}
                    >
                      تأكيد الحذف ({subCatsToDelete.length})
                    </button>
                    <button
                      onClick={() => { setIsDeleteSubCatMode(false); setSubCatsToDelete([]); }}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* شريط البحث المخصص للتصنيفات */}
            <div className="relative mb-3.5">
              <Search 
                size={16} 
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  subCatSearchTerm ? 'text-indigo-500' : (isDarkMode ? 'text-zinc-500' : 'text-gray-400')
                }`} 
              />
              <input
                type="text"
                value={subCatSearchTerm}
                onChange={(e) => setSubCatSearchTerm(e.target.value)}
                placeholder="ابحث عن تصنيف محدد..."
                className={`w-full pr-10 pl-10 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-zinc-800/90 border-white/10 text-white placeholder-zinc-500 focus:border-indigo-500 focus:bg-zinc-800' 
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-indigo-500 shadow-xs'
                }`}
              />
              {subCatSearchTerm && (
                <button
                  type="button"
                  onClick={() => setSubCatSearchTerm('')}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors`}
                  title="مسح البحث"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* أزرار الفئات والخيارات */}
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
              {!isDeleteSubCatMode && !subCatSearchTerm && (
                <button
                  onClick={() => setSelectedSubCatFilter([])}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${
                    selectedSubCatFilter.length === 0
                      ? (isDarkMode ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-indigo-600 text-white border-indigo-600 shadow-md')
                      : (isDarkMode ? 'bg-zinc-800 text-zinc-400 border-white/5 hover:bg-zinc-700' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100')
                  }`}
                >
                  الكل
                </button>
              )}
              
              {subCategories
                .filter(sub => !subCatSearchTerm.trim() || sub.name.toLowerCase().includes(subCatSearchTerm.toLowerCase()))
                .map(sub => {
                  const isSelected = isDeleteSubCatMode ? subCatsToDelete.includes(sub.id) : selectedSubCatFilter.includes(sub.name);
                  
                  return (
                    <button
                      key={sub.id}
                      onClick={() => toggleSubCatFilter(sub.name)}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? (isDeleteSubCatMode 
                              ? 'bg-red-500 text-white border-red-500 animate-pulse shadow-sm' 
                              : (isDarkMode ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'))
                          : (isDarkMode ? 'bg-zinc-800 text-zinc-300 border-white/5 hover:bg-zinc-700 hover:text-white' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300 shadow-2xs')
                      }`}
                    >
                      {isDeleteSubCatMode && isSelected && <CheckCircle2 size={12} />}
                      {!isDeleteSubCatMode && isSelected && <CheckCircle2 size={12} className="text-white" />}
                      <span>{sub.name}</span>
                    </button>
                  );
                })}

              {subCategories.length === 0 && (
                <span className="text-[10px] text-gray-400 font-bold px-2 py-2">لا توجد تصنيفات فرعية مضافة بعد.</span>
              )}

              {subCategories.length > 0 && subCatSearchTerm.trim() && subCategories.filter(sub => sub.name.toLowerCase().includes(subCatSearchTerm.toLowerCase())).length === 0 && (
                <div className="w-full py-4 text-center">
                  <p className="text-xs text-gray-400 font-bold mb-2">
                    لا يوجد تصنيف مطابق لـ &quot;{subCatSearchTerm}&quot;
                  </p>
                  <button
                    onClick={() => setSubCatSearchTerm('')}
                    className="text-[10px] font-black text-indigo-500 hover:underline"
                  >
                    مسح البحث وعرض كل التصنيفات
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {searchedCategoryBooks.length > 0 ? searchedCategoryBooks.map(book => (
              <div 
                key={book.id} 
                onClick={() => {
                  if (uploadingBookId !== book.id) {
                    setViewingBook(book);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  if (dragOverBookId !== book.id) {
                    setDragOverBookId(book.id);
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverBookId(book.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (
                    e.clientX <= rect.left ||
                    e.clientX >= rect.right ||
                    e.clientY <= rect.top ||
                    e.clientY >= rect.bottom
                  ) {
                    setDragOverBookId(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverBookId(null);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    if (file.type.startsWith('image/')) {
                      try {
                        setUploadingBookId(book.id);
                        const base64 = await compressAndGetBase64(file);
                        const updated = { ...book, image: base64 };
                        if (onUpdateBook) {
                          onUpdateBook(updated);
                        } else {
                          onEditBook(updated);
                        }
                        setToastFeedback({ id: book.id, text: 'تم تحديث الغلاف بنجاح!' });
                        setTimeout(() => setToastFeedback(null), 3000);
                      } catch (err) {
                        console.error('Error uploading dropped cover image:', err);
                      } finally {
                        setUploadingBookId(null);
                      }
                    }
                  }
                }}
                className={`p-3 md:p-6 rounded-[20px] md:rounded-[32px] border shadow-sm transition-all cursor-pointer group relative overflow-hidden ${
                  dragOverBookId === book.id 
                    ? 'border-emerald-500 ring-4 ring-emerald-500/40 scale-[1.03] shadow-2xl bg-emerald-500/10' 
                    : isDarkMode 
                      ? 'bg-zinc-800 border-white/5 hover:shadow-xl hover:border-emerald-200/40' 
                      : 'bg-white border-gray-100 hover:shadow-xl hover:border-emerald-200'
                }`}
              >
                <div className={`aspect-[3/4] rounded-2xl mb-2 md:mb-4 overflow-hidden border relative ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  {book.image ? (
                    <img src={book.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'text-zinc-700' : 'text-gray-200'}`}>
                      <BookOpen size={48} />
                    </div>
                  )}

                  {/* حالة التأشير العادي بالمؤشر (تظهر التفاصيل) */}
                  {dragOverBookId !== book.id && uploadingBookId !== book.id && (
                    <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/10 transition-colors flex items-center justify-center pointer-events-none">
                       <span className={`px-4 py-2 rounded-xl font-black text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300 ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-white text-emerald-900'}`}>
                         عرض التفاصيل
                       </span>
                    </div>
                  )}

                  {/* حالة حمل وسحب الصورة فوق الكتاب (تظهر: افلت الصورة هنا لرفع الغلاف) */}
                  {dragOverBookId === book.id && (
                    <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-2 text-center z-20 animate-in fade-in zoom-in-95 duration-200 border-2 border-dashed border-emerald-400 pointer-events-none">
                      <div className="p-2.5 bg-emerald-500 text-white rounded-full mb-1.5 animate-bounce shadow-lg shadow-emerald-500/40">
                        <Upload size={22} />
                      </div>
                      <span className="text-white font-black text-[11px] leading-tight mb-0.5">
                        افلت الصورة هنا لرفع الغلاف
                      </span>
                      <span className="text-emerald-200 font-bold text-[8px]">
                        تحديث مباشر للغلاف
                      </span>
                    </div>
                  )}

                  {/* حالة قيد معالجة ورفع الصورة */}
                  {uploadingBookId === book.id && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-2 text-center z-20 animate-in fade-in duration-200 pointer-events-none">
                      <Loader2 size={24} className="text-emerald-400 animate-spin mb-1.5" />
                      <span className="text-white font-bold text-[10px]">
                        جاري حفظ الغلاف...
                      </span>
                    </div>
                  )}

                  {/* إشعار نجاح فوري للغلاف */}
                  {toastFeedback?.id === book.id && (
                    <div className="absolute inset-x-2 bottom-2 bg-emerald-600 text-white rounded-xl py-1.5 px-2 text-center text-[9px] font-black shadow-lg z-30 animate-in slide-in-from-bottom-2 duration-300 flex items-center justify-center gap-1">
                      <CheckCircle2 size={12} />
                      {toastFeedback.text}
                    </div>
                  )}
                </div>
                <h4 className={`font-black text-xs md:text-sm mb-1 truncate ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`}>{book.title}</h4>
                <div className="flex items-center gap-1 mb-2">
                  <p className={`text-[9px] md:text-[10px] font-bold truncate flex-1 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>{book.author || 'مؤلف غير معروف'}</p>
                  {book.subCategory && (
                    <span className={`px-1.5 py-0.5 md:px-2 rounded text-[8px] font-black border ${isDarkMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                      {book.subCategory.includes(' - ') ? 'متعدد' : book.subCategory}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                   <span className={`font-black text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{book.price.toLocaleString()} ر.س</span>
                   <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-lg ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-50'}`}>
                      <MapPin size={10} className="text-emerald-500" />
                      <span className={`text-[8px] md:text-[9px] font-bold ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>{book.location || 'غير محدد'}</span>
                   </div>
                </div>
              </div>
            )) : (
              <div className={`col-span-full py-20 text-center rounded-[40px] border-2 border-dashed ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-zinc-800 text-zinc-700' : 'bg-gray-50 text-gray-200'}`}>
                    <Search size={32} />
                 </div>
                 <p className={`font-bold ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                   {innerSearchTerm ? 'لا توجد نتائج مطابقة لبحثك في هذا القسم' : (selectedSubCatFilter.length > 0 ? 'لا توجد كتب تحت التصنيفات الفرعية المحددة' : 'لا توجد كتب مضافة لهذا القسم حالياً')}
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-right overflow-hidden min-h-0" 
      dir="rtl"
      style={{ zoom: categoriesScale }}
    >
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 shrink-0">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--accent-600)' }} size={20} />
          <input
            type="text"
            placeholder="بحث عن قسم معين..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pr-12 pl-4 py-4 border rounded-2xl shadow-sm outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-emerald-500' : 'bg-white border-gray-100 text-emerald-900 focus:border-emerald-500'}`}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <ScaleControl currentScale={categoriesScale} onUpdateScale={setCategoriesScale} />
          <button
            onClick={() => setShowDeduplicatorModal(true)}
            className={`px-6 py-4 rounded-2xl font-black shadow-lg hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-2 whitespace-nowrap ${
              isDarkMode 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-900/40 border border-emerald-400/20' 
                : 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-emerald-900/20'
            }`}
            title="فحص وحذف التصنيفات المكررة بالذكاء الاصطناعي"
          >
            <Sparkles size={20} className="text-yellow-300 animate-pulse" />
            <span>دمج المكرر (AI)</span>
          </button>
          <button
            onClick={() => setShowSubCatForm(true)}
            className={`px-6 py-4 rounded-2xl font-black shadow-lg hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-2 whitespace-nowrap ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-900 text-white shadow-indigo-900/30'}`}
          >
            <Tag size={20} /> إضافة تصنيف فرعي
          </button>
          <button
            onClick={openAddForm}
            className={`px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-2 whitespace-nowrap ${isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-900 text-white shadow-emerald-900/30'}`}
          >
            <Plus size={22} /> إضافة قسم جديد
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* قسم الكل - المضاف حديثاً */}
          <div 
            onClick={() => setSelectedCategoryName('الكل')}
            className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group relative overflow-hidden flex flex-col cursor-pointer ${isDarkMode ? 'bg-zinc-800 border-emerald-500/30' : 'bg-emerald-50 border-emerald-100'}`}
          >
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-3 rounded-2xl bg-emerald-500 text-white shadow-lg`}>
                <LayoutGrid size={24} />
              </div>
            </div>
            <div className="relative z-10">
              <h4 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`}>كل الكتب</h4>
              <p className={`text-xs font-bold line-clamp-2 min-h-[32px] mb-6 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                عرض كافة الكتب المتوفرة في المخزن بجميع تصنيفاتها وأقسامها.
              </p>
            </div>
            <div className={`mt-auto pt-6 border-t flex items-center justify-between relative z-10 ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}>
               <div className="flex items-center gap-2">
                  <Package size={16} className="text-emerald-500" />
                  <span className={`text-sm font-black ${isDarkMode ? 'text-zinc-300' : 'text-emerald-900'}`}>
                    {books.filter(b => !b.quranReading && !b.quranSize && (!b.packingCount || b.packingCount <= 1)).length}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">كتاب كلي</span>
               </div>
               <div className={`font-bold text-xs flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform ${isDarkMode ? 'text-zinc-400' : 'text-emerald-600'}`}>
                  فتح القائمة <ChevronLeft size={14} />
               </div>
            </div>
          </div>

          {/* بطاقات التصنيفات المخصصة (المجمعة) */}
          {filteredCustomCategories.map((customCat) => {
            const count = books.filter(b => isBookInCustomCategory(b, customCat)).length;
            return (
              <div 
                key={customCat.id} 
                className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all group relative overflow-hidden flex flex-col cursor-pointer ${
                  isDarkMode ? 'bg-zinc-800/90 border-emerald-500/20' : 'bg-emerald-50/40 border-emerald-200/80'
                }`}
                onClick={() => {
                  setSelectedCategoryName('الكل');
                  setSelectedCustomCatId(customCat.id);
                }}
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                    <FolderTree size={24} />
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    تصنيف مخصص
                  </span>
                </div>

                <div className="relative z-10">
                  <h4 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`}>{customCat.name}</h4>
                  <p className={`text-xs font-bold line-clamp-2 min-h-[32px] mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                    {customCat.description || `يجمع ${customCat.mainCategories.length} أقسام رئيسية و ${customCat.subCategories.length} تصنيفات فرعية.`}
                  </p>
                </div>

                <div className={`mt-auto pt-6 border-t flex items-center justify-between relative z-10 ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-emerald-500" />
                    <span className={`text-sm font-black ${isDarkMode ? 'text-zinc-300' : 'text-emerald-900'}`}>{count}</span>
                    <span className="text-[10px] text-gray-400 font-bold">كتاب مجمع</span>
                  </div>
                  <div className={`font-bold text-xs flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    فتح التصنيف <ChevronLeft size={14} />
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCategories.length > 0 ? filteredCategories.map((cat) => (
            <div 
              key={cat.id} 
              className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group relative overflow-hidden flex flex-col cursor-pointer ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-gray-100'}`}
              onClick={() => setSelectedCategoryName(cat.name)}
            >
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div 
                  className="p-3 rounded-2xl transition-all duration-300"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(var(--accent-500-rgb), 0.15)' : 'var(--accent-100)',
                    color: isDarkMode ? 'var(--accent-400)' : 'var(--accent-600)'
                  }}
                >
                  <Layers size={24} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditForm(cat); }}
                    className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${isDarkMode ? 'text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700' : 'text-gray-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(cat.id); }}
                    className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${isDarkMode ? 'text-zinc-500 hover:text-red-500 hover:bg-red-50' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="relative z-10">
                <h4 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`}>{cat.name}</h4>
                <p className={`text-xs font-bold line-clamp-2 min-h-[32px] mb-6 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                  {cat.description || 'لا يوجد وصف متاح لهذا القسم'}
                </p>
              </div>

              <div className={`mt-auto pt-6 border-t flex items-center justify-between relative z-10 ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}>
                 <div className="flex items-center gap-2">
                    <LayoutGrid size={16} className="text-emerald-500" />
                    <span className={`text-sm font-black ${isDarkMode ? 'text-zinc-300' : 'text-emerald-900'}`}>{getBooksCount(cat.name)}</span>
                    <span className="text-[10px] text-gray-400 font-bold">كتاب</span>
                 </div>
                 <div className={`font-bold text-xs flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform ${isDarkMode ? 'text-zinc-400' : 'text-emerald-600'}`}>
                    عرض الكتب <ChevronLeft size={14} className="stroke-emerald-600" />
                 </div>
              </div>

              <div 
                className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" 
                style={{ backgroundColor: isDarkMode ? 'rgba(var(--accent-500-rgb), 0.05)' : 'rgba(var(--accent-50-rgb), 0.3)' }}
              />
            </div>
          )) : (
            searchTerm !== '' && (
              <div className="col-span-full py-40 text-center flex flex-col items-center">
                 <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center mb-6 ${isDarkMode ? 'bg-zinc-800 text-zinc-700' : 'bg-gray-50 text-gray-200'}`}>
                   <Layers size={64} className="opacity-20" />
                 </div>
                 <p className={`text-2xl font-black ${isDarkMode ? 'text-zinc-600' : 'text-gray-300'}`}>لم يتم العثور على أي أقسام حالياً</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* نافذة إضافة قسم جديد */}
      {showAddForm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <form 
            onSubmit={handleSubmit}
            className={`relative w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-6 border border-white/20 animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}
          >
            <div className="flex items-center gap-4 mb-2">
              <div 
                className="p-3 rounded-2xl"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(var(--accent-500-rgb), 0.15)' : 'var(--accent-100)',
                  color: isDarkMode ? 'var(--accent-400)' : 'var(--accent-600)'
                }}
              >
                {editingCategory ? <Pencil size={32} /> : <Layers size={32} />}
              </div>
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                {editingCategory ? 'تعديل بيانات القسم' : 'إضافة قسم كتب جديد'}
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 mr-1">اسم القسم</label>
                <input
                  required
                  type="text"
                  placeholder="مثلاً: الخيال العلمي"
                  value={formState.name}
                  onChange={(e) => setFormState({...formState, name: e.target.value})}
                  className={`w-full px-5 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 mr-1">وصف القسم (اختياري)</label>
                <textarea
                  placeholder="وصف مختصر لمحتوى هذا القسم..."
                  value={formState.description}
                  onChange={(e) => setFormState({...formState, description: e.target.value})}
                  className={`w-full px-5 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold transition-all min-h-[100px] ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className={`flex-1 text-white py-5 rounded-3xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all ${isDarkMode ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-emerald-50 shadow-emerald-500/30'}`}
              >
                {editingCategory ? 'تحديث البيانات' : 'تأكيد الحفظ'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className={`px-8 rounded-3xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              >
                تراجع
              </button>
            </div>
          </form>
        </div>
      )}

      {/* نافذة إضافة تصنيف فرعي جديد */}
      {showSubCatForm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSubCatForm(false)} />
          <form 
            onSubmit={handleSubCatSubmit}
            className={`relative w-full max-w-md rounded-[40px] shadow-2xl p-10 space-y-6 border border-white/20 animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}
          >
            <div className="flex items-center gap-4 mb-2">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <Tag size={32} />
              </div>
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                إضافة تصنيف فرعي
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 mr-1">اسم التصنيف الفرعي</label>
                <input
                  required
                  type="text"
                  placeholder="مثلاً: رعب، رومانسي، تاريخي..."
                  value={newSubCatName}
                  onChange={(e) => setNewSubCatName(e.target.value)}
                  className={`w-full px-5 py-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className={`flex-1 text-white py-5 rounded-3xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all ${isDarkMode ? 'bg-indigo-600 shadow-indigo-600/30' : 'bg-indigo-500 shadow-indigo-500/30'}`}
              >
                إنشاء التصنيف
              </button>
              <button
                type="button"
                onClick={() => setShowSubCatForm(false)}
                className={`px-8 rounded-3xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              >
                تراجع
              </button>
            </div>
          </form>
        </div>
      )}

      {/* مودال دمج وحذف التصنيفات المكررة بالذكاء الاصطناعي */}
      <AICategoryDeduplicatorModal
        isOpen={showDeduplicatorModal}
        onClose={() => setShowDeduplicatorModal(false)}
        books={books}
        categories={categories}
        subCategories={subCategories}
        onAddCategory={onAdd}
        onAddSubCategory={onAddSubCategory}
        onDeleteCategory={onDelete}
        onDeleteSubCategory={onDeleteSubCategory}
        onUpdateCategory={onUpdate}
        onUpdateBook={onUpdateBook}
        onBatchUpdateBooks={onBatchUpdateBooks}
        onSuccessToast={(msg) => setToastFeedback({ id: 'dedup', text: msg })}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default Categories;