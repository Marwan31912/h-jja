import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  BookOpen, 
  HelpCircle, 
  Play, 
  RefreshCw, 
  Download, 
  Save, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  AlertCircle, 
  Tag, 
  Check, 
  Loader2, 
  FileText, 
  Zap, 
  BookMarked, 
  Sliders, 
  Info,
  ExternalLink,
  SpellCheck,
  CheckCheck,
  ArrowRightLeft,
  X,
  Palette,
  FolderPlus,
  FolderTree,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { Book, Category, SubCategory, CustomGroupedCategory } from '../types';
import { 
  parseCategorizationText, 
  formatCategorizationLine, 
  requestAICategorization, 
  requestAICheckTitles,
  checkAndCorrectTitlesLocally,
  normalizeArabicText,
  findClosestLibraryTitle,
  ParsedCategoryItem,
  TitleCorrectionChange
} from '../services/aiCategoryService';
import { CacheService } from '../services/cacheService';
import { 
  getCustomCategories, 
  saveCustomCategory, 
  deleteCustomCategory, 
  isBookInCustomCategory 
} from '../services/customCategoryService';
import { AICategoryDeduplicatorModal } from './AICategoryDeduplicatorModal';

interface LibraryCustomizationProps {
  books: Book[];
  categories?: Category[];
  subCategories?: SubCategory[];
  onBack: () => void;
  onAddCategory?: (category: Category) => void;
  onAddSubCategory?: (subCategory: SubCategory) => void;
  onDeleteCategory?: (id: string) => void;
  onDeleteSubCategory?: (id: string) => void;
  onUpdateCategory?: (category: Category) => void;
  onUpdateBook?: (book: Book) => void;
  onBatchUpdateBooks?: (books: Book[]) => void;
  isDarkMode?: boolean;
}

const SAMPLE_TEXT = `الهول: (رواية) / رعب / أدب عربي
ثلاثية غرناطة: (رواية) / تاريخي / أدب أندلسي
مقدمة ابن خلدون: (تاريخ) / علم اجتماع / فلسفة إسلامية
في ظلال القرآن: (علوم دينية) / تفسير / دراسات قرآنية
العادات الذرية: (تنمية بشرية) / تطوير ذات / إنتاجية
البؤساء: (رواية) / أدب عالمي / دراما كلاسيكية
أرض زيكولا: (رواية) / خيال علمي / فانتازيا
سيرة ابن هشام: (علوم دينية) / سيرة نبوية / تاريخ إسلامي`;

export const LibraryCustomization: React.FC<LibraryCustomizationProps> = ({
  books,
  categories = [],
  subCategories = [],
  onBack,
  onAddCategory,
  onAddSubCategory,
  onDeleteCategory,
  onDeleteSubCategory,
  onUpdateCategory,
  onUpdateBook,
  onBatchUpdateBooks,
  isDarkMode
}) => {
  // حالة تفعيل التصنيف التلقائي
  const [isAutoCategorizationEnabled, setIsAutoCategorizationEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('aladdin_auto_categorization_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [activeTab, setActiveTab] = useState<'categorization' | 'rules' | 'custom_categories'>('categorization');
  const [inputText, setInputText] = useState(SAMPLE_TEXT);
  const [parsedItems, setParsedItems] = useState<ParsedCategoryItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isCheckingTitles, setIsCheckingTitles] = useState(false);
  const [titleCorrections, setTitleCorrections] = useState<TitleCorrectionChange[]>([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showDeduplicatorModal, setShowDeduplicatorModal] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'matched' | 'unmatched'>('all');

  // --- حالات التصنيفات المخصصة (Custom Grouped Categories) ---
  const [customCategories, setCustomCategories] = useState<CustomGroupedCategory[]>(() => getCustomCategories());
  const [editingCustomCat, setEditingCustomCat] = useState<CustomGroupedCategory | null>(null);
  const [showCustomCatForm, setShowCustomCatForm] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [customCatColor, setCustomCatColor] = useState('emerald');
  const [selectedMainCats, setSelectedMainCats] = useState<Set<string>>(new Set());
  const [selectedSubCats, setSelectedSubCats] = useState<Set<string>>(new Set());
  const [mainCatSearch, setMainCatSearch] = useState('');
  const [subCatSearch, setSubCatSearch] = useState('');
  const [deleteCustomCatId, setDeleteCustomCatId] = useState<string | null>(null);

  // مزامنة التصنيفات المخصصة عند حدوث أي تعديل
  useEffect(() => {
    const handleUpdate = () => {
      setCustomCategories(getCustomCategories());
    };
    window.addEventListener('aladdin_custom_categories_updated', handleUpdate);
    return () => {
      window.removeEventListener('aladdin_custom_categories_updated', handleUpdate);
    };
  }, []);

  // استخراج قائمة التصنيفات الرئيسية المتاحة بالمكتبة بدقة
  const allMainCategoryNames = useMemo(() => {
    const names = new Set<string>();
    categories.forEach(c => { if (c.name) names.add(c.name.trim()); });
    books.forEach(b => { if (b.category) names.add(b.category.trim()); });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [categories, books]);

  // استخراج قائمة التصنيفات الفرعية المتاحة بالمكتبة بدقة
  const allSubCategoryNames = useMemo(() => {
    const names = new Set<string>();
    subCategories.forEach(s => { if (s.name) names.add(s.name.trim()); });
    books.forEach(b => {
      if (b.subCategory) {
        const parts = b.subCategory.split(/[/,،]/).map(p => p.trim()).filter(Boolean);
        parts.forEach(p => names.add(p));
      }
    });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [subCategories, books]);

  // عداد الكتب المطابقة للتصنيف المخصص أثناء التعديل
  const matchingBooksCountForCurrentForm = useMemo(() => {
    if (selectedMainCats.size === 0 && selectedSubCats.size === 0) return 0;
    const tempCustom: CustomGroupedCategory = {
      id: 'temp',
      name: customCatName,
      mainCategories: Array.from(selectedMainCats),
      subCategories: Array.from(selectedSubCats),
      createdAt: Date.now()
    };
    return books.filter(b => isBookInCustomCategory(b, tempCustom)).length;
  }, [selectedMainCats, selectedSubCats, customCatName, books]);

  // فتح نموذج إضافة تصنيف مخصص جديد
  const handleOpenAddCustomCat = () => {
    setEditingCustomCat(null);
    setCustomCatName('');
    setCustomCatColor('emerald');
    setSelectedMainCats(new Set());
    setSelectedSubCats(new Set());
    setMainCatSearch('');
    setSubCatSearch('');
    setShowCustomCatForm(true);
  };

  // فتح نموذج تعديل تصنيف مخصص
  const handleOpenEditCustomCat = (cat: CustomGroupedCategory) => {
    setEditingCustomCat(cat);
    setCustomCatName(cat.name);
    setCustomCatColor(cat.color || 'emerald');
    setSelectedMainCats(new Set(cat.mainCategories || []));
    setSelectedSubCats(new Set(cat.subCategories || []));
    setMainCatSearch('');
    setSubCatSearch('');
    setShowCustomCatForm(true);
  };

  // حفظ أو تحديث التصنيف المخصص
  const handleSaveCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCatName.trim()) {
      showToast('يرجى إدخال اسم للتصنيف المخصص');
      return;
    }

    if (selectedMainCats.size === 0 && selectedSubCats.size === 0) {
      showToast('يرجى تحديد تصنيف رئيسي أو فرعي واحد على الأقل');
      return;
    }

    const newCustomCat: CustomGroupedCategory = {
      id: editingCustomCat ? editingCustomCat.id : crypto.randomUUID(),
      name: customCatName.trim(),
      mainCategories: Array.from(selectedMainCats),
      subCategories: Array.from(selectedSubCats),
      color: customCatColor,
      createdAt: editingCustomCat ? editingCustomCat.createdAt : Date.now()
    };

    saveCustomCategory(newCustomCat);
    setCustomCategories(getCustomCategories());
    setShowCustomCatForm(false);
    setEditingCustomCat(null);
    showToast(editingCustomCat ? 'تم تحديث التصنيف المخصص بنجاح' : 'تم إنشاء التصنيف المخصص بنجاح ✨');
  };

  // حذف تصنيف مخصص
  const handleConfirmDeleteCustomCat = () => {
    if (deleteCustomCatId) {
      deleteCustomCategory(deleteCustomCatId);
      setCustomCategories(getCustomCategories());
      setDeleteCustomCatId(null);
      showToast('تم حذف التصنيف المخصص');
    }
  };

  // تبديل اختيار تصنيف رئيسي
  const handleToggleMainCat = (name: string) => {
    setSelectedMainCats(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // تبديل اختيار تصنيف فرعي
  const handleToggleSubCat = (name: string) => {
    setSelectedSubCats(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // تحديد كل التصنيفات الرئيسية
  const handleSelectAllMainCats = () => {
    setSelectedMainCats(new Set(allMainCategoryNames));
  };

  // إلغاء تحديد كل التصنيفات الرئيسية
  const handleClearAllMainCats = () => {
    setSelectedMainCats(new Set());
  };

  // تحديد كل التصنيفات الفرعية
  const handleSelectAllSubCats = () => {
    setSelectedSubCats(new Set(allSubCategoryNames));
  };

  // إلغاء تحديد كل التصنيفات الفرعية
  const handleClearAllSubCats = () => {
    setSelectedSubCats(new Set());
  };

  // تحديث حفظ الإعداد
  const handleToggleAutoCategorization = (enabled: boolean) => {
    setIsAutoCategorizationEnabled(enabled);
    localStorage.setItem('aladdin_auto_categorization_enabled', String(enabled));
    window.dispatchEvent(new Event('aladdin_settings_updated'));
    showToast(enabled ? 'تم تفعيل ميزة التصنيف التلقائي بنجاح' : 'تم إيقاف التصنيف التلقائي');
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // مطابقة العناصر مع كتب المكتبة الحالية بدقة متناهية تشمل المقارنة اللغوية
  const matchItemsWithBooks = (items: ParsedCategoryItem[]): ParsedCategoryItem[] => {
    const libraryTitles = books.map(b => b.title);
    return items.map(item => {
      const normalizedTitle = normalizeArabicText(item.title);
      // 1. بحث مباشر
      let matched = books.find(b => {
        const bNorm = normalizeArabicText(b.title);
        return bNorm === normalizedTitle || (normalizedTitle && (bNorm.includes(normalizedTitle) || normalizedTitle.includes(bNorm)));
      });

      // 2. إذا لم يجد، نجرب خوارزمية التطابق التقريبي الأقرب
      if (!matched && item.title) {
        const closest = findClosestLibraryTitle(item.title, libraryTitles, 0.72);
        if (closest) {
          matched = books.find(b => b.title.trim() === closest.matchedTitle);
        }
      }

      return {
        ...item,
        matchedBookId: matched?.id,
        matchedBookTitle: matched?.title
      };
    });
  };

  // تفكيك وتحليل النص المدخل يدوياً أو آلياً
  const handleParseInput = (textToParse = inputText) => {
    setAiError(null);
    const parsed = parseCategorizationText(textToParse);
    const matched = matchItemsWithBooks(parsed);
    setParsedItems(matched);
    // تحديد جميع العناصر افتراضياً
    setSelectedIndices(new Set(matched.map((_, idx) => idx)));
    if (matched.length > 0) {
      showToast(`تم استخراج وتحليل ${matched.length} كتاب بنجاح`);
    }
  };

  // تشغيل التحليل الأولي عند تحميل الصفحة
  useEffect(() => {
    handleParseInput(SAMPLE_TEXT);
  }, [books]);

  // طلب التصنيف بالذكاء الاصطناعي
  const handleRunAICategorization = async () => {
    if (!inputText.trim()) {
      setAiError('يرجى إدخال أسماء الكتب أو النصوص أولاً ليقوم الذكاء الاصطناعي بتصنيفها.');
      return;
    }

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const response = await requestAICategorization({ text: inputText });
      if (response.result) {
        setInputText(response.result);
        const matched = matchItemsWithBooks(response.parsed);
        setParsedItems(matched);
        setSelectedIndices(new Set(matched.map((_, idx) => idx)));
        showToast(`قام الذكاء الاصطناعي بتصنيف ${matched.length} كتاب وفق القاعدة المعتمدة! ✨`);
      }
    } catch (err: any) {
      console.error('AI categorization error:', err);
      // إذا كان المفتاح غير مهيأ أو خطأ شبكة، نقوم بالتحليل المحلي للنص المتوفر
      const parsedLocal = parseCategorizationText(inputText);
      if (parsedLocal.length > 0) {
        const matched = matchItemsWithBooks(parsedLocal);
        setParsedItems(matched);
        setSelectedIndices(new Set(matched.map((_, idx) => idx)));
        setAiError('تم التحليل بالقواعد المحلية. للتصنيف الذكي عبر Gemini تأكد من إعداد GEMINI_API_KEY.');
      } else {
        setAiError(err?.message || 'تعذر معالجة الطلب بالذكاء الاصطناعي. يرجى التحقق من الاتصال.');
      }
    } finally {
      setIsLoadingAI(false);
    }
  };

  // أداة فحص وتدقيق العناوين بالذكاء الاصطناعي ومطابقتها مع كتب المكتبة
  const handleCheckTitles = async () => {
    if (!inputText.trim()) {
      setAiError('يرجى إدخال نصوص أو عناوين الكتب أولاً لفحصها ومطابقتها مع المكتبة.');
      return;
    }

    if (books.length === 0) {
      setAiError('لا توجد كتب في المكتبة حالياً للمقارنة والمطابقة معها.');
      return;
    }

    setIsCheckingTitles(true);
    setAiError(null);

    try {
      const libraryTitles = books.map(b => b.title.trim()).filter(Boolean);
      const response = await requestAICheckTitles({
        text: inputText,
        libraryTitles
      });

      if (response.result) {
        setInputText(response.result);
        const matched = matchItemsWithBooks(response.parsed);
        setParsedItems(matched);
        setSelectedIndices(new Set(matched.map((_, idx) => idx)));

        if (response.corrections && response.corrections.length > 0) {
          setTitleCorrections(response.corrections);
          setShowCorrectionModal(true);
          showToast(`تم فحص وتصحيح ${response.corrections.length} عنوان بنجاح ومطابقتها مع كتب المكتبة! 🔍`);
        } else {
          setTitleCorrections([]);
          showToast('تم فحص العناوين: جميع العناوين متطابقة ومضبوطة تماماً مع كتب المكتبة.');
        }
      }
    } catch (err: any) {
      console.error('Check titles error:', err);
      // Fallback local fuzzy check
      const libraryTitles = books.map(b => b.title.trim()).filter(Boolean);
      const localRes = checkAndCorrectTitlesLocally(inputText, libraryTitles);
      setInputText(localRes.result);
      const matched = matchItemsWithBooks(localRes.parsed);
      setParsedItems(matched);
      setSelectedIndices(new Set(matched.map((_, idx) => idx)));
      if (localRes.corrections.length > 0) {
        setTitleCorrections(localRes.corrections);
        setShowCorrectionModal(true);
        showToast(`تم تصحيح ${localRes.corrections.length} عنوان محلياً ومطابقتها مع المكتبة!`);
      } else {
        showToast('تم فحص العناوين محلياً: جميع العناوين متطابقة مع المكتبة.');
      }
    } finally {
      setIsCheckingTitles(false);
    }
  };

  // جلب الكتب غير المصنفة أو المصنفة تصنيفاً عاماً من المكتبة
  const handleLoadUncategorizedBooks = () => {
    const targetBooks = books.filter(b => !b.category || b.category === 'رواية' || b.category === 'عام' || !b.subCategory);
    if (targetBooks.length === 0) {
      // جلب أول 20 كتاب كعينة
      const sample = books.slice(0, 20).map(b => b.title).join('\n');
      setInputText(sample);
      showToast('تم تحميل قائمة كتب من المكتبة للمعالجة والتصنيف');
      return;
    }

    const titlesList = targetBooks.slice(0, 30).map(b => b.title).join('\n');
    setInputText(titlesList);
    showToast(`تم جلب ${Math.min(targetBooks.length, 30)} كتاب من المكتبة لمراجعة وتحديث تصنيفاتها`);
  };

  // تبديل اختيار عنصر واحد
  const toggleSelectIndex = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // اختيار الكل / إلغاء اختيار الكل
  const toggleSelectAll = () => {
    if (selectedIndices.size === filteredItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(filteredItems.map(item => parsedItems.indexOf(item))));
    }
  };

  // تطبيق وحفظ التصنيفات على المكتبة
  const handleApplyToLibrary = async () => {
    const selectedItems = parsedItems.filter((_, idx) => selectedIndices.has(idx));
    if (selectedItems.length === 0) {
      alert('يرجى تحديد عنصر واحد على الأقل لتطبيق تصنيفه على المكتبة.');
      return;
    }

    let updatedBooksCount = 0;
    let addedCategoriesCount = 0;
    let addedSubCategoriesCount = 0;

    const existingCatNames = new Set(categories.map(c => c.name.trim().toLowerCase()));
    const existingSubCatNames = new Set(subCategories.map(s => s.name.trim().toLowerCase()));

    // 1. إضافة أي تصنيفات رئيسية جديدة للنظام
    selectedItems.forEach(item => {
      if (item.mainCategory && !existingCatNames.has(item.mainCategory.trim().toLowerCase())) {
        existingCatNames.add(item.mainCategory.trim().toLowerCase());
        if (onAddCategory) {
          onAddCategory({
            id: crypto.randomUUID(),
            name: item.mainCategory.trim(),
            description: 'تم إنشاؤه عبر التصنيف التلقائي الذكي',
            addedAt: Date.now()
          });
          addedCategoriesCount++;
        }
      }

      // إضافة أي تصنيفات فرعية جديدة للنظام
      item.subCategories.forEach(sub => {
        if (sub && !existingSubCatNames.has(sub.trim().toLowerCase())) {
          existingSubCatNames.add(sub.trim().toLowerCase());
          if (onAddSubCategory) {
            onAddSubCategory({
              id: crypto.randomUUID(),
              name: sub.trim(),
              addedAt: Date.now()
            });
            addedSubCategoriesCount++;
          }
        }
      });
    });

    // 2. تحديث الكتب المطابقة في المكتبة
    const updatedBooksList: Book[] = [];
    selectedItems.forEach(item => {
      const targetBook = books.find(b => 
        (item.matchedBookId && b.id === item.matchedBookId) ||
        b.title.trim().toLowerCase() === item.title.trim().toLowerCase()
      );

      if (targetBook) {
        const subCatStr = item.subCategories.join(' - ');
        const updated: Book = {
          ...targetBook,
          category: item.mainCategory || targetBook.category,
          subCategory: subCatStr || targetBook.subCategory
        };
        updatedBooksList.push(updated);
        if (onUpdateBook) {
          onUpdateBook(updated);
        }
        updatedBooksCount++;
      }
    });

    // تحديث التخزين المؤقت
    try {
      if (updatedBooksList.length > 0) {
        const currentCached = (await CacheService.loadCollection('books')) || books;
        const updatedCache = currentCached.map(b => {
          const matchedUpdate = updatedBooksList.find(u => u.id === b.id);
          return matchedUpdate || b;
        });
        await CacheService.saveCollection('books', updatedCache);
      }
    } catch (e) {
      console.error('Failed to update cache in library customization:', e);
    }

    const summaryMsg = `تم تطبيق التحديثات بنجاح!
• تحديث تصنيف ${updatedBooksCount} كتاب في المكتبة
• إضافة ${addedCategoriesCount} قسم رئيسي جديد
• إضافة ${addedSubCategoriesCount} تصنيف فرعي جديد`;

    alert(summaryMsg);
    showToast(`تم بنجاح تحديث ${updatedBooksCount} كتاب في مكتبتك!`);
  };

  // فلترة العناصر المعروضة
  const filteredItems = parsedItems.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mainCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subCategories.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterMode === 'matched') return !!item.matchedBookId;
    if (filterMode === 'unmatched') return !item.matchedBookId;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300" dir="rtl">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={20} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className={`p-3 rounded-2xl transition-all ${
              isDarkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-100 text-emerald-900 hover:bg-gray-200'
            }`}
            title="رجوع للقائمة السابقة"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تخصيص المكتبة</h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles size={12} />
                الذكاء الاصطناعي
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">
              إعدادات التصنيف التلقائي الذكي للكتب، تفكيك النصوص، وإدارة الأقسام
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`p-1.5 rounded-2xl flex items-center gap-1 border ${
          isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-gray-100 border-gray-200'
        }`}>
          <button
            onClick={() => setActiveTab('categorization')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'categorization'
                ? (isDarkMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-emerald-950 shadow-sm')
                : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-emerald-900')
            }`}
          >
            <Zap size={15} />
            <span>معالج التصنيف الذكي</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'rules'
                ? (isDarkMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-emerald-950 shadow-sm')
                : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-emerald-900')
            }`}
          >
            <BookMarked size={15} />
            <span>قواعد وصيغة التصنيف</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_categories')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'custom_categories'
                ? (isDarkMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-emerald-950 shadow-sm')
                : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-emerald-900')
            }`}
          >
            <Layers size={15} />
            <span>التصنيفات</span>
            {customCategories.length > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === 'custom_categories'
                  ? (isDarkMode ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800')
                  : (isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-gray-600 shadow-xs')
              }`}>
                {customCategories.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Auto-Categorization Master Switch */}
      <div className={`p-6 rounded-[32px] border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
        isAutoCategorizationEnabled
          ? (isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200/60')
          : (isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100')
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-2xl shrink-0 ${
            isAutoCategorizationEnabled
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : (isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-400')
          }`}>
            <Sparkles size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                إعداد التصنيف التلقائي (Automatic Categorization)
              </h4>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                isAutoCategorizationEnabled 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-gray-200 text-gray-500 dark:bg-zinc-800'
              }`}>
                {isAutoCategorizationEnabled ? 'مفعّل حالياً' : 'معطّل'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1 max-w-2xl leading-relaxed">
              عند تفعيل هذا الخيار، يقوم النظام بالتعرف الذكي التلقائي على الأقسام الرئيسية والتصنيفات الفرعية للكتب بصيغة <span className="font-black text-emerald-600 dark:text-emerald-400">اسم الكتاب: (الرئيسي) / فرعي</span> وتطبيقها مباشرة عند إضافة أو استيراد الكتب.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleToggleAutoCategorization(!isAutoCategorizationEnabled)}
          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-md flex items-center gap-2 shrink-0 ${
            isAutoCategorizationEnabled
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
              : (isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
          }`}
        >
          <div className={`w-3 h-3 rounded-full ${isAutoCategorizationEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-gray-400'}`} />
          <span>{isAutoCategorizationEnabled ? 'التصنيف التلقائي: شغال' : 'تفعيل التصنيف التلقائي'}</span>
        </button>
      </div>

      {/* Tab 1: AI & Batch Categorization Suite */}
      {activeTab === 'categorization' && (
        <div className="space-y-6">
          
          {/* Top Info Banner on the exact syntax */}
          <div className={`p-5 rounded-3xl border flex items-center justify-between gap-4 flex-wrap ${
            isDarkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-white border-gray-100 shadow-sm'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Info size={20} />
              </div>
              <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
                <span>الصيغة المعتمدة: </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  الهول: (رواية) / رعب / أدب عربي
                </span>
                <span className="text-gray-400 text-[11px] mr-2">
                  (بين القوسين = رئيسي | بعد الشرطة = فرعي)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputText(SAMPLE_TEXT)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                إدراج أمثلة توضيحية
              </button>
              <button
                onClick={handleLoadUncategorizedBooks}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                جلب كتب من مكتبتي
              </button>
            </div>
          </div>

          {/* Text Input Area & Action Controls */}
          <div className={`p-6 rounded-[32px] border shadow-xl space-y-4 ${
            isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                <span>أدخل أو ألصق نصوص الكتب هنا (سطر لكل كتاب):</span>
              </label>
              <span className="text-[11px] font-bold text-gray-400">
                {inputText.split('\n').filter(l => l.trim()).length} سطر
              </span>
            </div>

            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="الهول: (رواية) / رعب / أدب عربي&#10;ثلاثية غرناطة: (رواية) / تاريخي / أدب عربي&#10;أو فقط أكتب أسماء الكتب واضغط 'تصنيف ذكي بالذكاء الاصطناعي'..."
              className={`w-full p-4 rounded-2xl border-2 outline-none font-bold text-xs leading-relaxed transition-all resize-y ${
                isDarkMode 
                  ? 'bg-zinc-800/80 border-zinc-700/60 text-zinc-100 focus:border-emerald-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-emerald-500'
              }`}
            />

            {/* Error Display */}
            {aiError && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* Processing Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleParseInput(inputText)}
                  disabled={isLoadingAI || isCheckingTitles}
                  className={`px-4 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 border shadow-sm ${
                    isDarkMode 
                      ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' 
                      : 'bg-gray-100 border-gray-200 text-emerald-950 hover:bg-gray-200'
                  }`}
                >
                  <Zap size={16} className="text-amber-500" />
                  <span>تفكيك وتحليل النصوص</span>
                </button>

                {/* زر التصنيف الذكي */}
                <button
                  onClick={handleRunAICategorization}
                  disabled={isLoadingAI || isCheckingTitles}
                  className={`px-5 py-3 rounded-2xl font-black text-xs text-white transition-all flex items-center gap-2 shadow-lg ${
                    isLoadingAI 
                      ? 'bg-emerald-800 cursor-wait opacity-80' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  {isLoadingAI ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري المعالجة بالذكاء الاصطناعي...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>تصنيف ذكي بالذكاء الاصطناعي (Gemini) ✨</span>
                    </>
                  )}
                </button>

                {/* الأداة الجديدة بجانب زر التصنيف الذكي: زر فحص العناوين */}
                <button
                  onClick={handleCheckTitles}
                  disabled={isLoadingAI || isCheckingTitles}
                  className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 border shadow-md ${
                    isCheckingTitles 
                      ? 'bg-indigo-800 text-white cursor-wait opacity-85 border-indigo-700' 
                      : isDarkMode
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30 hover:border-indigo-400'
                      : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300'
                  }`}
                  title="مسح وتدقيق العناوين المستخرجة آلياً، واكتشاف الأخطاء وتصحيحها لتطابق كتب المكتبة بدقة"
                >
                  {isCheckingTitles ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-indigo-400" />
                      <span>جاري فحص ومطابقة العناوين...</span>
                    </>
                  ) : (
                    <>
                      <SpellCheck size={16} className="text-indigo-500 dark:text-indigo-400" />
                      <span>فحص العناوين (Check Titles) 🔍</span>
                    </>
                  )}
                </button>

                {titleCorrections.length > 0 && (
                  <button
                    onClick={() => setShowCorrectionModal(true)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                  >
                    <ArrowRightLeft size={13} />
                    <span>تم تصحيح {titleCorrections.length} عنوان (عرض التعديلات)</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => { setInputText(''); setParsedItems([]); setTitleCorrections([]); }}
                className={`p-3 rounded-2xl transition-all text-gray-400 hover:text-red-500 ${
                  isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                }`}
                title="مسح النص"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Results Table Section */}
          {parsedItems.length > 0 && (
            <div className={`p-6 rounded-[32px] border shadow-xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ${
              isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'
            }`}>
              {/* Header Controls for Table */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h4 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                      معاينة الكتب المصنفة ({parsedItems.length})
                    </h4>
                    <p className="text-xs text-gray-400 font-bold mt-0.5">
                      تم اختيار {selectedIndices.size} من أصل {parsedItems.length} عنصر للتطبيق
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* Search input */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border ${
                    isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="بحث في النتائج..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent outline-none text-xs font-bold w-32 md:w-40"
                    />
                  </div>

                  {/* Filter Mode */}
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value as any)}
                    className={`px-3 py-2 rounded-2xl border text-xs font-bold outline-none cursor-pointer ${
                      isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <option value="all">كافة النتائج</option>
                    <option value="matched">كتب مطابقة في المكتبة</option>
                    <option value="unmatched">أصناف جديدة</option>
                  </select>

                  {/* Apply Button */}
                  <button
                    onClick={handleApplyToLibrary}
                    disabled={selectedIndices.size === 0}
                    className={`px-6 py-2.5 rounded-2xl font-black text-xs text-white transition-all shadow-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'
                    }`}
                  >
                    <Save size={16} />
                    <span>تطبيق وحفظ في المكتبة ({selectedIndices.size})</span>
                  </button>
                </div>
              </div>

              {/* Table list */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className={`border-b text-[11px] font-black text-gray-400 ${
                      isDarkMode ? 'border-white/5' : 'border-gray-100'
                    }`}>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIndices.size === filteredItems.length && filteredItems.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                      </th>
                      <th className="p-3">اسم الكتاب</th>
                      <th className="p-3">التصنيف الرئيسي (بين القوسين)</th>
                      <th className="p-3">التصنيفات الفرعية (المفصولة بـ /)</th>
                      <th className="p-3 text-center">المطابقة في المكتبة</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
                    {filteredItems.map((item, idx) => {
                      const realIndex = parsedItems.indexOf(item);
                      const isSelected = selectedIndices.has(realIndex);
                      const isMatched = !!item.matchedBookId;

                      return (
                        <tr 
                          key={idx}
                          onClick={() => toggleSelectIndex(realIndex)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? (isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-50/50') 
                              : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50')
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectIndex(realIndex)}
                              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                            />
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <BookOpen size={16} className="text-emerald-500 shrink-0" />
                              <span className={`font-black text-xs ${isDarkMode ? 'text-zinc-100' : 'text-emerald-950'}`}>
                                {item.title}
                              </span>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black border ${
                              isDarkMode 
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                : 'bg-emerald-100/70 border-emerald-200 text-emerald-900'
                            }`}>
                              <Tag size={12} />
                              ({item.mainCategory})
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {item.subCategories.length > 0 ? (
                                item.subCategories.map((sub, sIdx) => (
                                  <span 
                                    key={sIdx}
                                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                                      isDarkMode
                                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                                        : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                                    }`}
                                  >
                                    {sub}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-gray-400 italic">بدون تصنيف فرعي</span>
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            {isMatched ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <Check size={12} />
                                موجود بالمكتبة
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                                صنف جديد
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Rules and Documentation */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className={`p-8 rounded-[36px] border shadow-xl space-y-6 ${
            isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <BookMarked size={28} />
              </div>
              <div>
                <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                  دليل وقاعدة التصنيف التلقائي للكتب
                </h4>
                <p className="text-xs text-gray-400 font-bold mt-0.5">
                  هيكل التنسيق البرمجي المعتمد في نظام علاء الدين
                </p>
              </div>
            </div>

            {/* Visual breakdown diagram */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-200/70'
            }`}>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block">
                الهيكل النموذجي للسطر:
              </span>
              
              <div className="p-4 rounded-2xl bg-zinc-950 text-white font-bold text-sm sm:text-base flex flex-wrap items-center gap-2 leading-loose text-right" dir="ltr">
                <span className="text-amber-400 font-bold">الهول</span>
                <span className="text-white">:</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/40">(رواية)</span>
                <span className="text-gray-400">/</span>
                <span className="text-cyan-400 font-bold">رعب</span>
                <span className="text-gray-400">/</span>
                <span className="text-purple-400 font-bold">أدب عربي</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-amber-500 font-black text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    اسم الكتاب (Title)
                  </div>
                  <p className="text-[11px] text-gray-400 font-bold">النص المكتوب قبل النقطتين الرأسيتين : أو قبل القوسين مباشرة.</p>
                </div>

                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-emerald-500 font-black text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    التصنيف الرئيسي (Main Category)
                  </div>
                  <p className="text-[11px] text-gray-400 font-bold">النص المحصور حصراً بين القوسين <span className="font-bold text-emerald-400">(...)</span> مثل (رواية) أو (تاريخ).</p>
                </div>

                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-cyan-500 font-black text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    التصنيفات الفرعية (Sub-Categories)
                  </div>
                  <p className="text-[11px] text-gray-400 font-bold">كافة النصوص المفصولة بالشرطة المائلة <span className="font-bold text-cyan-400">/</span> بعد القوسين.</p>
                </div>
              </div>
            </div>

            {/* Real world examples list */}
            <div className="space-y-3">
              <h5 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                أمثلة عملية واقعية:
              </h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { text: 'الهول: (رواية) / رعب / أدب عربي', desc: 'رواية رعب عربية' },
                  { text: 'ثلاثية غرناطة: (رواية) / تاريخي / أدب أندلسي', desc: 'رواية تاريخية' },
                  { text: 'مقدمة ابن خلدون: (تاريخ) / علم اجتماع / فلسفة', desc: 'تاريخ واجتماع' },
                  { text: 'صحيح البخاري: (علوم دينية) / حديث نبوي / سنة', desc: 'كتب الحديث الشريف' },
                  { text: 'سحر الترتيب: (تنمية بشرية) / تنظيم / أسلوب حياة', desc: 'تطوير أسلوب الحياة' },
                  { text: 'أطلس العالم: (جغرافيا) / خرائط / موسوعة', desc: 'موسوعات وجغرافيا' }
                ].map((ex, i) => (
                  <div 
                    key={i}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {ex.text}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">
                      {ex.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab 3: Custom Grouped Categories (التصنيفات المخصصة) */}
      {activeTab === 'custom_categories' && (
        <div className="space-y-6">
          
          {/* Header Card with Add button */}
          <div className={`p-6 sm:p-8 rounded-[36px] border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
            isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-3xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Layers size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                    التصنيفات المجمعة والمخصصة (Custom Categories)
                  </h4>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    {customCategories.length} تصنيف مخصص
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1.5 max-w-2xl leading-relaxed">
                  أنشئ تصنيفات مخصصة تجمع عدة تصنيفات رئيسية وفرعية تحت اسم واحد، مما يتيح لك فلترة وعرض كل الكتب التابعة لها بضغطة زر واحدة داخل قسم <span className="text-emerald-600 dark:text-emerald-400 font-black">«الكل»</span> دون تعديل بيانات الكتب الأصلية.
                </p>
              </div>
            </div>

            {!showCustomCatForm && (
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <button
                  onClick={() => setShowDeduplicatorModal(true)}
                  className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 hover:scale-105 border border-emerald-400/20"
                  title="حذف وتوحيد التصنيفات المكررة بالذكاء الاصطناعي"
                >
                  <Sparkles size={18} className="text-yellow-300 animate-pulse" />
                  <span>حذف المكرر بالذكاء الاصطناعي (AI)</span>
                </button>
                <button
                  onClick={handleOpenAddCustomCat}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 hover:scale-105"
                >
                  <FolderPlus size={18} />
                  <span>إنشاء تصنيف مخصص جديد</span>
                </button>
              </div>
            )}
          </div>

          {/* Form to Create or Edit Custom Category */}
          {showCustomCatForm && (
            <div className={`p-6 sm:p-8 rounded-[36px] border shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200 ${
              isDarkMode ? 'bg-zinc-900 border-emerald-500/30' : 'bg-white border-emerald-200'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                    <FolderTree size={22} />
                  </div>
                  <div>
                    <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                      {editingCustomCat ? 'تعديل التصنيف المخصص' : 'إنشاء تصنيف مخصص جديد'}
                    </h4>
                    <p className="text-xs text-gray-400 font-bold mt-0.5">
                      حدد اسم التصنيف واختر التصنيفات الرئيسية والفرعية التي يجمعها
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCustomCatForm(false)}
                  className={`p-2 rounded-xl transition-all ${
                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-gray-400'
                  }`}
                  title="إلغاء"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCustomCategory} className="space-y-6">
                
                {/* Name & Color Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-300 block">
                      اسم التصنيف المخصص <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customCatName}
                      onChange={(e) => setCustomCatName(e.target.value)}
                      placeholder="مثال: كتب أدبية، الروايات العربية، العلوم الإسلامية، تطوير الذات..."
                      className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-300 block">
                      لون التمييز والبادج
                    </label>
                    <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                      {[
                        { id: 'emerald', bg: 'bg-emerald-500' },
                        { id: 'indigo', bg: 'bg-indigo-500' },
                        { id: 'blue', bg: 'bg-blue-500' },
                        { id: 'amber', bg: 'bg-amber-500' },
                        { id: 'rose', bg: 'bg-rose-500' },
                        { id: 'purple', bg: 'bg-purple-500' },
                        { id: 'cyan', bg: 'bg-cyan-500' },
                        { id: 'teal', bg: 'bg-teal-500' }
                      ].map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setCustomCatColor(col.id)}
                          className={`w-8 h-8 rounded-full ${col.bg} transition-all flex items-center justify-center ${
                            customCatColor === col.id ? 'ring-4 ring-offset-2 ring-emerald-500 scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {customCatColor === col.id && <Check size={14} className="text-white stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2-Column Selectors: Main Categories & Sub-Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Column 1: Main Categories */}
                  <div className={`p-5 rounded-3xl border space-y-3.5 flex flex-col ${
                    isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50/80 border-gray-200/80'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h5 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                          التصنيفات الرئيسية (المتوفرة بالمكتبة)
                        </h5>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        تم تحديد {selectedMainCats.size} من {allMainCategoryNames.length}
                      </span>
                    </div>

                    {/* Search & Quick Select */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={mainCatSearch}
                          onChange={(e) => setMainCatSearch(e.target.value)}
                          placeholder="بحث في التصنيفات الرئيسية..."
                          className={`w-full pr-8 pl-3 py-1.5 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSelectAllMainCats}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllMainCats}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-red-400' : 'bg-white border-gray-200 text-gray-500 hover:text-red-600'
                        }`}
                      >
                        إلغاء
                      </button>
                    </div>

                    {/* Chips Grid */}
                    <div className="flex-1 max-h-56 overflow-y-auto pr-1 space-y-1.5">
                      {allMainCategoryNames
                        .filter(name => !mainCatSearch || name.toLowerCase().includes(mainCatSearch.toLowerCase()))
                        .map(name => {
                          const isSelected = selectedMainCats.has(name);
                          const count = books.filter(b => b.category === name).length;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleToggleMainCat(name)}
                              className={`w-full p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? (isDarkMode ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-sm' : 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs')
                                  : (isDarkMode ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300')
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-emerald-500 text-white' : (isDarkMode ? 'border border-zinc-600' : 'border border-gray-300')
                                }`}>
                                  {isSelected && <Check size={12} className="stroke-[3]" />}
                                </div>
                                <span className="text-xs font-black truncate">{name}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                isSelected 
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                  : (isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-500')
                              }`}>
                                {count} كتاب
                              </span>
                            </button>
                          );
                        })}
                      {allMainCategoryNames.length === 0 && (
                        <p className="text-xs text-gray-400 font-bold text-center py-4">لا توجد تصنيفات رئيسية مسجلة بعد</p>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Sub-Categories */}
                  <div className={`p-5 rounded-3xl border space-y-3.5 flex flex-col ${
                    isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50/80 border-gray-200/80'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        <h5 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                          التصنيفات الفرعية (المتوفرة بالمكتبة)
                        </h5>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                        تم تحديد {selectedSubCats.size} من {allSubCategoryNames.length}
                      </span>
                    </div>

                    {/* Search & Quick Select */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={subCatSearch}
                          onChange={(e) => setSubCatSearch(e.target.value)}
                          placeholder="بحث في التصنيفات الفرعية..."
                          className={`w-full pr-8 pl-3 py-1.5 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSelectAllSubCats}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllSubCats}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-red-400' : 'bg-white border-gray-200 text-gray-500 hover:text-red-600'
                        }`}
                      >
                        إلغاء
                      </button>
                    </div>

                    {/* Chips Grid */}
                    <div className="flex-1 max-h-56 overflow-y-auto pr-1 space-y-1.5">
                      {allSubCategoryNames
                        .filter(name => !subCatSearch || name.toLowerCase().includes(subCatSearch.toLowerCase()))
                        .map(name => {
                          const isSelected = selectedSubCats.has(name);
                          const count = books.filter(b => b.subCategory && b.subCategory.includes(name)).length;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleToggleSubCat(name)}
                              className={`w-full p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? (isDarkMode ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-sm' : 'bg-cyan-50 border-cyan-300 text-cyan-950 shadow-xs')
                                  : (isDarkMode ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300')
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-cyan-500 text-white' : (isDarkMode ? 'border border-zinc-600' : 'border border-gray-300')
                                }`}>
                                  {isSelected && <Check size={12} className="stroke-[3]" />}
                                </div>
                                <span className="text-xs font-black truncate">{name}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                isSelected 
                                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' 
                                  : (isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-500')
                              }`}>
                                {count} كتاب
                              </span>
                            </button>
                          );
                        })}
                      {allSubCategoryNames.length === 0 && (
                        <p className="text-xs text-gray-400 font-bold text-center py-4">لا توجد تصنيفات فرعية مسجلة بعد</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Real-time Match Indicator */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap ${
                  matchingBooksCountForCurrentForm > 0
                    ? (isDarkMode ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')
                    : (isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-100 border-gray-200')
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-700 dark:text-gray-200">
                        معاينة نتائج الفلترة المباشرة:
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                        يجمع هذا التصنيف المخصص حالياً <span className="font-black text-emerald-600 dark:text-emerald-400">{matchingBooksCountForCurrentForm}</span> كتاب من مكتبتك
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomCatForm(false)}
                      className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all ${
                        isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                    >
                      <Save size={16} />
                      <span>{editingCustomCat ? 'حفظ التعديلات' : 'حفظ التصنيف المخصص'}</span>
                    </button>
                  </div>
                </div>

              </form>
            </div>
          )}

          {/* List of Existing Custom Categories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                قائمة التصنيفات المخصصة المحفوظة ({customCategories.length})
              </h5>
            </div>

            {customCategories.length === 0 ? (
              <div className={`p-12 rounded-[36px] border text-center space-y-4 ${
                isDarkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-gray-100 shadow-sm'
              }`}>
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                  <Layers size={32} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                    لم تقم بإنشاء أي تصنيف مخصص بعد
                  </h4>
                  <p className="text-xs text-gray-400 font-bold leading-relaxed">
                    اضغط على زر «إنشاء تصنيف مخصص جديد» أعلاه لتجميع عدة أقسام وفرعيات تحت مسمى واحد لسرعة وسهولة التصفح.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddCustomCat}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>إنشاء أول تصنيف مخصص</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customCategories.map((cat) => {
                  const matchCount = books.filter(b => isBookInCustomCategory(b, cat)).length;
                  const colorMap: Record<string, { badge: string; border: string; bg: string }> = {
                    emerald: { badge: 'bg-emerald-500 text-white', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
                    indigo: { badge: 'bg-indigo-500 text-white', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10' },
                    blue: { badge: 'bg-blue-500 text-white', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
                    amber: { badge: 'bg-amber-500 text-white', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
                    rose: { badge: 'bg-rose-500 text-white', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
                    purple: { badge: 'bg-purple-500 text-white', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
                    cyan: { badge: 'bg-cyan-500 text-white', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
                    teal: { badge: 'bg-teal-500 text-white', border: 'border-teal-500/30', bg: 'bg-teal-500/10' },
                  };
                  const col = colorMap[cat.color || 'emerald'] || colorMap.emerald;

                  return (
                    <div 
                      key={cat.id}
                      className={`p-6 rounded-[32px] border transition-all space-y-4 shadow-sm flex flex-col justify-between ${
                        isDarkMode ? 'bg-zinc-900 border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl ${col.bg} ${col.border} border`}>
                              <Layers size={22} className={cat.color ? `text-${cat.color}-500` : 'text-emerald-500'} />
                            </div>
                            <div>
                              <h4 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                                {cat.name}
                              </h4>
                              <span className="text-[11px] text-gray-400 font-bold">
                                يضم {matchCount} كتاب في المكتبة
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditCustomCat(cat)}
                              className={`p-2 rounded-xl transition-all ${
                                isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-emerald-900'
                              }`}
                              title="تعديل التصنيف المخصص"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteCustomCatId(cat.id)}
                              className={`p-2 rounded-xl transition-all ${
                                isDarkMode ? 'hover:bg-red-950/30 text-zinc-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                              }`}
                              title="حذف التصنيف المخصص"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Included Main Categories */}
                        {cat.mainCategories && cat.mainCategories.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-400 block">
                              التصنيفات الرئيسية المندرجة ({cat.mainCategories.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.mainCategories.map((main, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${
                                    isDarkMode ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {main}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Included Sub Categories */}
                        {cat.subCategories && cat.subCategories.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-400 block">
                              التصنيفات الفرعية المندرجة ({cat.subCategories.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.subCategories.map((sub, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${
                                    isDarkMode ? 'bg-cyan-950/30 text-cyan-300 border-cyan-500/20' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                  }`}
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-bold">
                        <span>جاهز للاستخدام في قسم «الكل»</span>
                        <span className={`px-2 py-0.5 rounded-lg ${col.badge} text-[10px] font-black`}>
                          نشط
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* مودال تأكيد حذف تصنيف مخصص */}
      {deleteCustomCatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-[32px] border p-6 space-y-4 shadow-2xl text-right ${
            isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'
          }`}>
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 rounded-2xl bg-red-500/10">
                <Trash2 size={24} />
              </div>
              <h4 className="font-black text-base">تأكيد حذف التصنيف المخصص</h4>
            </div>
            <p className="text-xs text-gray-400 font-bold leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا التصنيف المخصص؟ لن يؤثر الحذف إطلاقاً على أي كتاب أو تصنيف رئيسي/فرعي داخل مكتبتك.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteCustomCatId(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDeleteCustomCat}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-md transition-all"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال استعراض تفاصيل العناوين المصححة */}
      {showCorrectionModal && titleCorrections.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className={`w-full max-w-2xl rounded-[32px] border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[85vh] flex flex-col ${
              isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                  <SpellCheck size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-black">
                    نتائج فحص وتصحيح العناوين
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    تم اكتشاف وتصحيح {titleCorrections.length} عنوان ليتطابق مع العناوين الحقيقية في المكتبة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCorrectionModal(false)}
                className={`p-2 rounded-xl transition-all ${
                  isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-gray-400'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {titleCorrections.map((corr, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDarkMode ? 'bg-zinc-800/60 border-white/5' : 'bg-gray-50 border-gray-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400">
                      سطر {corr.lineIndex + 1}
                    </span>
                    {corr.similarity && (
                      <span className="text-[10px] font-bold text-gray-400">
                        نسبة المطابقة: {corr.similarity}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    {/* العنوان المستخرج الخاطئ */}
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-right">
                      <span className="text-[10px] font-bold text-red-500 block mb-0.5">العنوان المستخرج (خطأ OCR / AI):</span>
                      <span className="font-mono text-xs line-through text-red-400 font-bold">
                        {corr.original}
                      </span>
                    </div>

                    {/* العنوان المصحح المطابق للمكتبة */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-right">
                      <span className="text-[10px] font-bold text-emerald-500 block mb-0.5">العنوان المعتمد في المكتبة:</span>
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-black">
                        {corr.corrected}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg transition-all"
              >
                موافق وإغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال دمج وحذف التصنيفات المكررة بالذكاء الاصطناعي */}
      <AICategoryDeduplicatorModal
        isOpen={showDeduplicatorModal}
        onClose={() => setShowDeduplicatorModal(false)}
        books={books}
        categories={categories}
        subCategories={subCategories}
        onDeleteCategory={onDeleteCategory}
        onDeleteSubCategory={onDeleteSubCategory}
        onUpdateCategory={onUpdateCategory}
        onUpdateBook={onUpdateBook}
        onBatchUpdateBooks={onBatchUpdateBooks}
        onSuccessToast={(msg) => setSuccessToast(msg)}
        isDarkMode={isDarkMode}
      />

    </div>
  );
};

export default LibraryCustomization;
