import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Check, 
  X, 
  ArrowLeftRight, 
  CheckCircle2, 
  Layers, 
  Tag, 
  BookOpen, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck,
  CheckSquare,
  Square,
  Edit3,
  Search,
  ArrowRight,
  Filter,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';
import { Book, Category, SubCategory } from '../types';
import { 
  requestAIDeduplicateCategories, 
  CategoryMergeProposal,
  normalizeArabicText
} from '../services/aiCategoryService';
import { getCustomCategories, saveCustomCategory } from '../services/customCategoryService';

interface AICategoryDeduplicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  categories: Category[];
  subCategories: SubCategory[];
  onAddCategory?: (category: Category) => void;
  onAddSubCategory?: (subCategory: SubCategory) => void;
  onDeleteCategory?: (id: string) => void;
  onDeleteSubCategory?: (id: string) => void;
  onUpdateCategory?: (category: Category) => void;
  onUpdateBook?: (book: Book) => void;
  onBatchUpdateBooks?: (books: Book[]) => void;
  onSuccessToast?: (msg: string) => void;
  isDarkMode?: boolean;
}

type ModalStep = 'select_categories' | 'review_results';

interface CategoryItemInfo {
  name: string;
  type: 'main' | 'sub';
  bookCount: number;
}

export const AICategoryDeduplicatorModal: React.FC<AICategoryDeduplicatorModalProps> = ({
  isOpen,
  onClose,
  books,
  categories,
  subCategories,
  onAddCategory,
  onAddSubCategory,
  onDeleteCategory,
  onDeleteSubCategory,
  onUpdateCategory,
  onUpdateBook,
  onBatchUpdateBooks,
  onSuccessToast,
  isDarkMode
}) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>('select_categories');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'main' | 'sub'>('all');

  // التصنيفات المحددة للفحص (مفاتيح فريدة بصيغة main:name أو sub:name)
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<Set<string>>(new Set());
  
  // نتائج ومقترحات الدمج
  const [proposals, setProposals] = useState<CategoryMergeProposal[]>([]);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editedChosenName, setEditedChosenName] = useState<string>('');

  // استخراج التصنيفات الفرعية من الكتاب بأمان
  const extractSubCategories = (b: Book): string[] => {
    if (!b.subCategory) return [];
    if (Array.isArray(b.subCategory)) return (b.subCategory as any[]).map(s => String(s).trim()).filter(Boolean);
    if (typeof b.subCategory === 'string') {
      return b.subCategory.split(/[,،\/]/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  // استخراج وحساب جميع التصنيفات الموجودة في النظام مع عدد الكتب المرتبطة بها
  const allCategoryItems = useMemo<CategoryItemInfo[]>(() => {
    const mainCounts = new Map<string, number>();
    const subCounts = new Map<string, number>();

    // 1. تسجيل التصنيفات من الجداول
    categories.forEach(c => {
      const name = c.name.trim();
      if (name && !mainCounts.has(name)) {
        mainCounts.set(name, 0);
      }
    });

    subCategories.forEach(s => {
      const name = s.name.trim();
      if (name && !subCounts.has(name)) {
        subCounts.set(name, 0);
      }
    });

    // 2. تسجيل التصنيفات وإحصاء الكتب
    books.forEach(b => {
      if (b.category && b.category.trim()) {
        const catName = b.category.trim();
        mainCounts.set(catName, (mainCounts.get(catName) || 0) + 1);
      }
      const subs = extractSubCategories(b);
      subs.forEach(sub => {
        const subName = sub.trim();
        if (subName) {
          subCounts.set(subName, (subCounts.get(subName) || 0) + 1);
        }
      });
    });

    const items: CategoryItemInfo[] = [];
    mainCounts.forEach((count, name) => {
      items.push({ name, type: 'main', bookCount: count });
    });
    subCounts.forEach((count, name) => {
      items.push({ name, type: 'sub', bookCount: count });
    });

    // فرز أبجدي
    return items.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [books, categories, subCategories]);

  // تهيئة وتحديد جميع التصنيفات افتراضياً عند فتح المودال
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('select_categories');
      setSearchFilter('');
      setActiveTab('all');
      setProposals([]);
      
      // اختيار الكل افتراضياً
      const allKeys = new Set<string>();
      allCategoryItems.forEach(item => {
        allKeys.add(`${item.type}:${item.name}`);
      });
      setSelectedCategoryKeys(allKeys);
    }
  }, [isOpen, allCategoryItems]);

  if (!isOpen) return null;

  // تصفية العناصر المعروضة في شاشة الاختيار
  const filteredCategoryItems = allCategoryItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch = !searchFilter.trim() || 
      item.name.toLowerCase().includes(searchFilter.toLowerCase().trim()) ||
      normalizeArabicText(item.name).includes(normalizeArabicText(searchFilter));
    return matchesTab && matchesSearch;
  });

  const totalMainCount = allCategoryItems.filter(i => i.type === 'main').length;
  const totalSubCount = allCategoryItems.filter(i => i.type === 'sub').length;

  const selectedMainCount = Array.from(selectedCategoryKeys).filter(k => k.startsWith('main:')).length;
  const selectedSubCount = Array.from(selectedCategoryKeys).filter(k => k.startsWith('sub:')).length;
  const totalSelectedCount = selectedCategoryKeys.size;

  // تحديد / إلغاء تحديد عنصر
  const handleToggleCategoryItem = (type: 'main' | 'sub', name: string) => {
    const key = `${type}:${name}`;
    setSelectedCategoryKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // اختيار الكل / إلغاء التحديد
  const handleSelectAllCategories = (select: boolean) => {
    if (select) {
      const allKeys = new Set<string>();
      allCategoryItems.forEach(item => {
        allKeys.add(`${item.type}:${item.name}`);
      });
      setSelectedCategoryKeys(allKeys);
    } else {
      setSelectedCategoryKeys(new Set());
    }
  };

  // اختيار الظاهر حالياً فقط
  const handleSelectVisibleOnly = (select: boolean) => {
    setSelectedCategoryKeys(prev => {
      const next = new Set(prev);
      filteredCategoryItems.forEach(item => {
        const key = `${item.type}:${item.name}`;
        if (select) {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  };

  // حساب عدد الكتب المتأثرة لكل مقترح دمج
  const calculateAffectedBooks = (proposal: CategoryMergeProposal): number => {
    const dupsNorm = new Set(proposal.duplicateNames.map(d => normalizeArabicText(d).toLowerCase().trim()));
    const dupsRaw = new Set(proposal.duplicateNames.map(d => d.toLowerCase().trim()));
    
    if (proposal.type === 'main') {
      return books.filter(b => {
        if (!b.category) return false;
        const bNorm = normalizeArabicText(b.category).toLowerCase().trim();
        const bRaw = b.category.toLowerCase().trim();
        return dupsNorm.has(bNorm) || dupsRaw.has(bRaw);
      }).length;
    } else {
      return books.filter(b => {
        const subs = extractSubCategories(b);
        return subs.some(s => {
          const sNorm = normalizeArabicText(s).toLowerCase().trim();
          const sRaw = s.toLowerCase().trim();
          return dupsNorm.has(sNorm) || dupsRaw.has(sRaw);
        });
      }).length;
    }
  };

  // تنفيذ عملية المسح والفحص بالذكاء الاصطناعي للتصنيفات المحددة فقط
  const handleStartScan = async () => {
    if (selectedCategoryKeys.size === 0) return;

    setIsLoading(true);
    try {
      const selectedMains: string[] = [];
      const selectedSubs: string[] = [];

      selectedCategoryKeys.forEach(k => {
        if (k.startsWith('main:')) {
          selectedMains.push(k.substring(5));
        } else if (k.startsWith('sub:')) {
          selectedSubs.push(k.substring(4));
        }
      });

      const result = await requestAIDeduplicateCategories(selectedMains, selectedSubs);
      const enhancedProposals = result.proposals.map(p => ({
        ...p,
        affectedBooksCount: calculateAffectedBooks(p),
        selected: true
      }));

      setProposals(enhancedProposals);
      setCurrentStep('review_results');
    } catch (err) {
      console.error('Error scanning selected categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // التعامل مع تحديد وتعديل مقترحات النتائج
  const handleToggleProposalSelect = (id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const handleSelectAllProposals = (select: boolean) => {
    setProposals(prev => prev.map(p => ({ ...p, selected: select })));
  };

  const handleStartEditProposal = (p: CategoryMergeProposal) => {
    setEditingProposalId(p.id);
    setEditedChosenName(p.chosenName);
  };

  const handleSaveEditProposal = (id: string) => {
    if (editedChosenName.trim()) {
      setProposals(prev => prev.map(p => p.id === id ? { ...p, chosenName: editedChosenName.trim() } : p));
    }
    setEditingProposalId(null);
  };

  // تنفيذ عملية الدمج والحذف والاستبدال بعد المراجعة
  const handleApplyMerges = async () => {
    const selectedProposals = proposals.filter(p => p.selected);
    if (selectedProposals.length === 0) return;

    setIsApplying(true);
    try {
      // 1. بناء خرائط الاستبدال
      const mainCatReplacements = new Map<string, string>();
      const subCatReplacements = new Map<string, string>();

      selectedProposals.forEach(p => {
        const chosen = p.chosenName.trim();
        if (p.type === 'main') {
          p.duplicateNames.forEach(dup => {
            const trimmedDup = dup.trim();
            mainCatReplacements.set(trimmedDup.toLowerCase(), chosen);
            mainCatReplacements.set(normalizeArabicText(trimmedDup).toLowerCase(), chosen);
          });
        } else {
          p.duplicateNames.forEach(dup => {
            const trimmedDup = dup.trim();
            subCatReplacements.set(trimmedDup.toLowerCase(), chosen);
            subCatReplacements.set(normalizeArabicText(trimmedDup).toLowerCase(), chosen);
          });
        }
      });

      // 2. ضمان وجود التصنيف النهائي المعتمد في قائمة التصنيفات
      const existingMainCatNorms = new Set(categories.map(c => normalizeArabicText(c.name).toLowerCase().trim()));
      for (const p of selectedProposals.filter(p => p.type === 'main')) {
        const normChosen = normalizeArabicText(p.chosenName).toLowerCase().trim();
        if (!existingMainCatNorms.has(normChosen)) {
          if (onAddCategory) {
            onAddCategory({
              id: crypto.randomUUID(),
              name: p.chosenName.trim(),
              addedAt: Date.now()
            });
            existingMainCatNorms.add(normChosen);
          }
        }
      }

      const existingSubCatNorms = new Set(subCategories.map(s => normalizeArabicText(s.name).toLowerCase().trim()));
      for (const p of selectedProposals.filter(p => p.type === 'sub')) {
        const normChosen = normalizeArabicText(p.chosenName).toLowerCase().trim();
        if (!existingSubCatNorms.has(normChosen)) {
          if (onAddSubCategory) {
            onAddSubCategory({
              id: crypto.randomUUID(),
              name: p.chosenName.trim(),
              addedAt: Date.now()
            });
            existingSubCatNorms.add(normChosen);
          }
        }
      }

      // 3. تحديث كافة الكتب المتأثرة بدقة مطلقة
      const modifiedBooks: Book[] = [];
      for (const book of books) {
        let isBookChanged = false;
        let newCategory = book.category ? book.category.trim() : '';
        let newSubCategory = book.subCategory;

        // التحقق من القسم الرئيسي
        if (newCategory) {
          const rawCatLower = newCategory.toLowerCase();
          const normCatLower = normalizeArabicText(newCategory).toLowerCase();

          if (mainCatReplacements.has(normCatLower)) {
            newCategory = mainCatReplacements.get(normCatLower)!;
            isBookChanged = true;
          } else if (mainCatReplacements.has(rawCatLower)) {
            newCategory = mainCatReplacements.get(rawCatLower)!;
            isBookChanged = true;
          }
        }

        // التحقق من التصنيف الفرعي
        if (newSubCategory) {
          const currentSubs = extractSubCategories(book);
          let subChanged = false;
          const updatedSubs: string[] = [];

          for (const sub of currentSubs) {
            const rawSubLower = sub.toLowerCase();
            const normSubLower = normalizeArabicText(sub).toLowerCase();

            if (subCatReplacements.has(normSubLower)) {
              const replacement = subCatReplacements.get(normSubLower)!;
              if (!updatedSubs.includes(replacement)) {
                updatedSubs.push(replacement);
              }
              subChanged = true;
            } else if (subCatReplacements.has(rawSubLower)) {
              const replacement = subCatReplacements.get(rawSubLower)!;
              if (!updatedSubs.includes(replacement)) {
                updatedSubs.push(replacement);
              }
              subChanged = true;
            } else {
              if (!updatedSubs.includes(sub)) {
                updatedSubs.push(sub);
              }
            }
          }

          if (subChanged) {
            newSubCategory = updatedSubs.join('، ');
            isBookChanged = true;
          }
        }

        // حماية صارمة: منع ترك أي كتاب بدون تصنيف
        if (!newCategory && book.category) {
          newCategory = book.category;
        }

        if (isBookChanged) {
          const updatedBook: Book = {
            ...book,
            category: newCategory,
            subCategory: newSubCategory
          };
          modifiedBooks.push(updatedBook);
          if (onUpdateBook && !onBatchUpdateBooks) {
            onUpdateBook(updatedBook);
          }
        }
      }

      // حفظ تحديثات الكتب
      if (onBatchUpdateBooks && modifiedBooks.length > 0) {
        onBatchUpdateBooks(modifiedBooks);
      }

      // 4. حذف التصنيفات المكررة القديمة من جدول التصنيفات الرئيسية
      for (const p of selectedProposals.filter(p => p.type === 'main')) {
        const dupsNormSet = new Set(p.duplicateNames.map(d => normalizeArabicText(d).toLowerCase().trim()));
        const dupsRawSet = new Set(p.duplicateNames.map(d => d.toLowerCase().trim()));
        const chosenNorm = normalizeArabicText(p.chosenName).toLowerCase().trim();

        for (const cat of categories) {
          const catNorm = normalizeArabicText(cat.name).toLowerCase().trim();
          const catRaw = cat.name.toLowerCase().trim();

          if (catNorm !== chosenNorm && (dupsNormSet.has(catNorm) || dupsRawSet.has(catRaw))) {
            if (onDeleteCategory) {
              onDeleteCategory(cat.id);
            }
          }
        }
      }

      // 5. حذف التصنيفات المكررة القديمة من جدول التصنيفات الفرعية
      for (const p of selectedProposals.filter(p => p.type === 'sub')) {
        const dupsNormSet = new Set(p.duplicateNames.map(d => normalizeArabicText(d).toLowerCase().trim()));
        const dupsRawSet = new Set(p.duplicateNames.map(d => d.toLowerCase().trim()));
        const chosenNorm = normalizeArabicText(p.chosenName).toLowerCase().trim();

        for (const sub of subCategories) {
          const subNorm = normalizeArabicText(sub.name).toLowerCase().trim();
          const subRaw = sub.name.toLowerCase().trim();

          if (subNorm !== chosenNorm && (dupsNormSet.has(subNorm) || dupsRawSet.has(subRaw))) {
            if (onDeleteSubCategory) {
              onDeleteSubCategory(sub.id);
            }
          }
        }
      }

      // 6. تحديث التصنيفات المخصصة (Custom Grouped Categories)
      const customCats = getCustomCategories();
      if (customCats.length > 0) {
        for (const customCat of customCats) {
          let catUpdated = false;
          let newMains = [...customCat.mainCategories];
          let newSubs = [...customCat.subCategories];

          for (const p of selectedProposals) {
            if (p.type === 'main') {
              const dups = new Set(p.duplicateNames.map(d => normalizeArabicText(d).toLowerCase().trim()));
              if (newMains.some(m => dups.has(normalizeArabicText(m).toLowerCase().trim()))) {
                newMains = Array.from(new Set(newMains.map(m => dups.has(normalizeArabicText(m).toLowerCase().trim()) ? p.chosenName : m)));
                catUpdated = true;
              }
            } else {
              const dups = new Set(p.duplicateNames.map(d => normalizeArabicText(d).toLowerCase().trim()));
              if (newSubs.some(s => dups.has(normalizeArabicText(s).toLowerCase().trim()))) {
                newSubs = Array.from(new Set(newSubs.map(s => dups.has(normalizeArabicText(s).toLowerCase().trim()) ? p.chosenName : s)));
                catUpdated = true;
              }
            }
          }

          if (catUpdated) {
            saveCustomCategory({
              ...customCat,
              mainCategories: newMains,
              subCategories: newSubs
            });
          }
        }
      }

      // إشعار بالنجاح
      const totalDups = selectedProposals.reduce((sum, p) => sum + p.duplicateNames.length, 0);
      const msg = `تم دمج ${totalDups} تصنيف وحذف القديم بنجاح، وتوحيد تصنيف ${modifiedBooks.length} كتاب تحت التصنيف المعتمد دون ترك أي كتاب بدون تصنيف ✨`;
      if (onSuccessToast) {
        onSuccessToast(msg);
      }

      // إطلاق حدث تحديث عام
      window.dispatchEvent(new Event('aladdin_custom_categories_updated'));
      window.dispatchEvent(new Event('aladdin_settings_updated'));

      onClose();
    } catch (err) {
      console.error('Error applying category deduplication:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const selectedProposalCount = proposals.filter(p => p.selected).length;
  const totalDupsSelected = proposals
    .filter(p => p.selected)
    .reduce((sum, p) => sum + p.duplicateNames.length, 0);
  const totalAffectedBooksSelected = proposals
    .filter(p => p.selected)
    .reduce((sum, p) => sum + (p.affectedBooksCount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl rounded-[36px] border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all text-right ${
          isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'
        }`}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between gap-4 shrink-0 ${
          isDarkMode ? 'border-white/10 bg-zinc-900/80' : 'border-gray-100 bg-gray-50/80'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-black tracking-wide">
                  فحص ودمج التصنيفات المكررة بالذكاء الاصطناعي
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  AI Smart Deduplicator
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  currentStep === 'select_categories' 
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}>
                  {currentStep === 'select_categories' ? 'الخطوة 1: اختيار التصنيفات للفحص' : 'الخطوة 2: مراجعة وقرار الحذف والاستبدال'}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                {currentStep === 'select_categories'
                  ? 'اختر التصنيفات التي ترغب بفحصها، أو حدد الكل واضغط زر المسح للبحث عن المكرر والمترادف'
                  : 'راجع التصنيفات المكررة المقترحة وقرر استبدالها وحذف القديم مع نقل كتبها آلياً'
                }
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading || isApplying}
            className={`p-2.5 rounded-2xl transition-all ${
              isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
            }`}
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">

          {/* Guarantee / Safe Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isDarkMode ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <ShieldCheck size={20} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-relaxed space-y-0.5">
              <span className="font-black text-emerald-600 dark:text-emerald-400 block">
                ضمان النقل الآمن للكتب:
              </span>
              <span>
                عند تأكيد الدمج، يتم اعتماد التصنيف الموحد، وتعديل تصنيف جميع الكتب التي كانت تحمل التصنيف القديم لتصبح تحته، ثم يُحذف التصنيف القديم. لن يبقى أي كتاب بدون تصنيف أبداً.
              </span>
            </div>
          </div>

          {/* LOADING STATE */}
          {isLoading && (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center animate-spin">
                <Loader2 size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-base">جاري فحص ومسح {totalSelectedCount} تصنيف بالذكاء الاصطناعي...</h4>
                <p className="text-xs text-gray-400 font-bold">
                  نقوم بتحليل التقارب اللغوي، صيغ المفرد والجمع، والترادفات لاكتشاف التكرارات
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: SELECT CATEGORIES SCREEN */}
          {!isLoading && currentStep === 'select_categories' && (
            <div className="space-y-4">

              {/* Action Toolbar & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="ابحث في تصنيفات النظام..."
                    className={`w-full pr-10 pl-4 py-2.5 rounded-2xl border text-xs font-bold outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-zinc-800/80 border-zinc-700 text-white focus:border-emerald-500' 
                        : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-emerald-500'
                    }`}
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Tabs Filter */}
                <div className={`p-1 rounded-2xl border flex items-center gap-1 shrink-0 ${
                  isDarkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-gray-100 border-gray-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    الكل ({allCategoryItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('main')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'main'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    الرئيسية ({totalMainCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sub')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'sub'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    الفرعية ({totalSubCount})
                  </button>
                </div>

              </div>

              {/* Selection Summary & Quick Toggles */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 flex-wrap ${
                isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-black text-gray-700 dark:text-gray-200">
                      تم تحديد <strong className="text-emerald-500">{totalSelectedCount}</strong> من أصل {allCategoryItems.length} تصنيف
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-bold">|</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                    رئيسية: <strong className="text-emerald-500">{selectedMainCount}</strong>
                  </span>
                  <span className="text-xs text-gray-400 font-bold">|</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                    فرعية: <strong className="text-cyan-500">{selectedSubCount}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllCategories(true)}
                    className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <CheckSquare size={13} />
                    <span>تحديد الكل ({allCategoryItems.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllCategories(false)}
                    className="px-3 py-1 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Square size={13} />
                    <span>إلغاء التحديد</span>
                  </button>
                </div>
              </div>

              {/* Category Grid Items */}
              {filteredCategoryItems.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-bold text-xs">
                  لم يتم العثور على تصنيفات مطابقة لبحثك
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto custom-scrollbar p-1">
                  {filteredCategoryItems.map(item => {
                    const key = `${item.type}:${item.name}`;
                    const isChecked = selectedCategoryKeys.has(key);

                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleCategoryItem(item.type, item.name)}
                        className={`p-3 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between gap-2.5 ${
                          isChecked
                            ? (isDarkMode ? 'bg-zinc-800/90 border-emerald-500/50 shadow-sm' : 'bg-emerald-50/70 border-emerald-300 shadow-sm')
                            : (isDarkMode ? 'bg-zinc-900/40 border-zinc-800 opacity-60 hover:opacity-100' : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-100')
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`shrink-0 ${isChecked ? 'text-emerald-500' : 'text-gray-400'}`}>
                            {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate leading-tight">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
                                item.type === 'main'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                              }`}>
                                {item.type === 'main' ? 'رئيسي' : 'فرعي'}
                              </span>
                              {item.bookCount > 0 && (
                                <span className="text-[10px] text-gray-400 font-bold">
                                  ({item.bookCount} كتاب)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isChecked && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* STEP 2: REVIEW RESULTS & MERGING DECISION SCREEN */}
          {!isLoading && currentStep === 'review_results' && (
            <div className="space-y-4">
              
              {proposals.length === 0 ? (
                <div className={`p-12 rounded-[32px] border text-center space-y-4 ${
                  isDarkMode ? 'bg-zinc-800/30 border-white/5' : 'bg-emerald-50/50 border-emerald-100'
                }`}>
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                    <CheckCircle2 size={36} />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                      لا توجد أي تصنيفات مكررة! ✨
                    </h4>
                    <p className="text-xs text-gray-400 font-bold leading-relaxed">
                      تم فحص التصنيفات المحددة ولم يتم العثور على أي تصنيفات مكررة أو مترادفة. جميع التصنيفات الحالية فريدة وموحدة.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setCurrentStep('select_categories')}
                      className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
                    >
                      <ChevronLeft size={14} />
                      <span>العودة لاختيار تصنيفات أخرى</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Results Summary Bar */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap ${
                    isDarkMode ? 'bg-zinc-800/60 border-white/5' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-gray-700 dark:text-gray-200">
                          تم العثور على <strong className="text-emerald-500">{proposals.length}</strong> مجموعة تصنيفات مكررة
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-bold">|</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                        إجمالي التكرارات: <strong className="text-red-500">{totalDupsSelected}</strong>
                      </span>
                      <span className="text-xs text-gray-400 font-bold">|</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                        الكتب المتأثرة: <strong className="text-indigo-500">{totalAffectedBooksSelected}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAllProposals(true)}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-gray-300 dark:text-gray-700">/</span>
                      <button
                        type="button"
                        onClick={() => handleSelectAllProposals(false)}
                        className="text-[11px] font-bold text-gray-500 hover:text-red-500 hover:underline"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  </div>

                  {/* Proposals Cards */}
                  <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar p-1">
                    {proposals.map((proposal) => {
                      const isSelected = proposal.selected;
                      const isEditing = editingProposalId === proposal.id;

                      return (
                        <div
                          key={proposal.id}
                          className={`p-4 rounded-3xl border transition-all space-y-3 ${
                            isSelected 
                              ? (isDarkMode ? 'bg-zinc-800/80 border-emerald-500/40 shadow-sm' : 'bg-white border-emerald-300 shadow-sm')
                              : (isDarkMode ? 'bg-zinc-900/50 border-zinc-800 opacity-60' : 'bg-gray-50 border-gray-200 opacity-60')
                          }`}
                        >
                          {/* Card Top */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleProposalSelect(proposal.id)}
                                className="p-1 text-emerald-500 hover:scale-110 transition-transform"
                              >
                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} className="text-gray-400" />}
                              </button>
                              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-xl border ${
                                proposal.type === 'main'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                              }`}>
                                {proposal.type === 'main' ? 'قسم رئيسي' : 'تصنيف فرعي'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {proposal.affectedBooksCount && proposal.affectedBooksCount > 0 ? (
                                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                                  <BookOpen size={12} />
                                  {proposal.affectedBooksCount} كتاب سيُنقل للتصنيف المعتمد
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-bold">لا توجد كتب متأثرة</span>
                              )}
                            </div>
                          </div>

                          {/* Merge Mapping Display */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                            
                            {/* 1. Chosen Replacement Category */}
                            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  التصنيف النهائي المعتمد (الاسم البديل الموحد):
                                </span>
                                {!isEditing && (
                                  <button
                                    onClick={() => handleStartEditProposal(proposal)}
                                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                    title="تعديل الاسم المعتمد"
                                  >
                                    <Edit3 size={10} />
                                    تعديل
                                  </button>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editedChosenName}
                                    onChange={(e) => setEditedChosenName(e.target.value)}
                                    className={`flex-1 px-2.5 py-1 rounded-xl text-xs font-black border ${
                                      isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveEditProposal(proposal.id)}
                                    className="p-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingProposalId(null)}
                                    className="p-1 rounded-lg bg-gray-500 text-white text-[10px] font-bold"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                                  {proposal.chosenName}
                                </span>
                              )}
                            </div>

                            {/* 2. Old Duplicates to be Merged & Deleted */}
                            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col justify-between gap-1.5">
                              <span className="text-[10px] font-black text-red-500 flex items-center gap-1">
                                <Trash2 size={12} />
                                التصنيفات القديمة (ستُنقل كتبها وتُحذف):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {proposal.duplicateNames.map((dup, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className="text-[11px] font-bold line-through px-2 py-0.5 rounded-lg bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30"
                                  >
                                    {dup}
                                  </span>
                                ))}
                              </div>
                            </div>

                          </div>

                          {/* Reason */}
                          {proposal.reason && (
                            <p className="text-[11px] text-gray-400 font-bold pr-1">
                              سبب الاقتراح: {proposal.reason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`p-6 border-t flex items-center justify-between gap-4 shrink-0 flex-wrap ${
          isDarkMode ? 'border-white/10 bg-zinc-900' : 'border-gray-100 bg-gray-50'
        }`}>
          
          {/* Left Controls */}
          <div>
            {currentStep === 'review_results' && (
              <button
                type="button"
                onClick={() => setCurrentStep('select_categories')}
                disabled={isApplying}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ArrowRight size={14} />
                <span>العودة لتعديل التصنيفات المحددة</span>
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isApplying}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              إلغاء
            </button>

            {currentStep === 'select_categories' && (
              <button
                type="button"
                onClick={handleStartScan}
                disabled={isLoading || totalSelectedCount === 0}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري الفحص بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>بدء مسح وفحص التصنيفات بالذكاء الاصطناعي ({totalSelectedCount})</span>
                  </>
                )}
              </button>
            )}

            {currentStep === 'review_results' && proposals.length > 0 && (
              <button
                type="button"
                onClick={handleApplyMerges}
                disabled={isApplying || selectedProposalCount === 0}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري الاستبدال ونقل الكتب والحذف...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>تأكيد الدمج والحذف والاستبدال ({totalDupsSelected} تصنيف)</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
