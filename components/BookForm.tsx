
import React, { useState, useEffect, useRef } from 'react';
import { Book, Category, SubCategory, Publisher } from '../types';
import { Save, X, Image as ImageIcon, UploadCloud, Plus, Minus, Barcode, Tag, MapPin, ChevronRight, Pencil, AlertCircle, Globe, Hash, BookOpen, ChevronDown, Scroll, Palette, Link, BellRing, CheckCircle2, Loader2, BellOff, Search } from 'lucide-react';
import { saveCoverToIDB, loadCoverFromIDB, compressAndGetBase64 } from '../src/utils/imageStorage';

interface BookFormProps {
  onSubmit: (data: Omit<Book, 'id' | 'addedAt'>) => void;
  categories: Category[];
  subCategories?: SubCategory[];
  publishers?: Publisher[];
  books: Book[];
  initialData?: Book;
  onCancel: () => void;
  onAddSubCategory?: (sc: SubCategory) => void;
  isDarkMode?: boolean;
}

const BookForm: React.FC<BookFormProps> = ({ onSubmit, categories, subCategories = [], publishers = [], books, initialData, onCancel, onAddSubCategory, isDarkMode }) => {
  // قوائم المصحف
  const quranReadings = ["حفص عن عاصم", "ورش عن نافع", "قالون عن نافع", "الدوري عن أبي عمرو", "السوسي عن أبي عمرو", "شعبة عن عاصم", "البزي عن ابن كثير", "قنبل عن ابن كثير", "هشام عن ابن عامر", "ابن ذكوان عن ابن عامر", "خلف عن حمزة", "خلاد عن حمزة"];
  const quranScripts = ["عثماني", "خط النسخ", "خط مغربي", "خط مجمع الملك فهد"];
  const quranSizes = ["الجيب", "ثمن", "الربع", "الربع المحيّر", "النص", "الجوامعي", "موسوعي"];
  const quranPaperColors = ["أبيض", "شامواه"];
  const quranBindings = ["تجليد فني فاخر", "غلاف عادي", "غلاف جلد", "سحاب"];
  const quranCoverColors = ["أخضر", "أزرق", "أحمر", "أسود", "بني", "كحلي", "عنابي", "أبيض", "ذهبي"];

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publisher: '',
    edition: '',
    language: 'العربية',
    category: 'رواية',
    subCategory: '',
    quantity: 1,
    price: 0,
    barcode: '',
    location: '',
    image: '',
    reorderLimit: 5, // Default reorder limit
    reorderAlertEnabled: true, // تفعيل التنبيه افتراضياً
    // Quran Fields
    quranReading: '',
    quranScript: '',
    quranSize: '',
    quranPaperColor: '',
    quranBinding: '',
    quranCoverColor: ''
  });
  
  const [isQuran, setIsQuran] = useState(false);
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // State for multi-subcategory modal
  const [showSubCatModal, setShowSubCatModal] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState('');
  const [subCatSearchTerm, setSubCatSearchTerm] = useState('');
  const [tempSelectedSubCats, setTempSelectedSubCats] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      const isQuranItem = !!(initialData.quranReading || initialData.quranSize);
      setIsQuran(isQuranItem);
      
      const coverColor = initialData.quranCoverColor || '';
      const isCustom = isQuranItem && coverColor !== '' && !quranCoverColors.includes(coverColor);
      setIsCustomColor(isCustom);

      if (initialData.image) {
        setFormData(prev => ({ ...prev, image: initialData.image || '' }));
        saveCoverToIDB(initialData.id, initialData.image).catch(() => {});
      } else {
        loadCoverFromIDB(initialData.id).then(url => {
          if (url) {
            setFormData(prev => ({ ...prev, image: url }));
          }
        });
      }

      setFormData(prev => ({
        ...prev,
        title: initialData.title,
        author: initialData.author || '',
        publisher: initialData.publisher || '',
        edition: initialData.edition || '',
        language: initialData.language || 'العربية',
        category: initialData.category,
        subCategory: initialData.subCategory || '',
        quantity: initialData.quantity,
        price: initialData.price || 0,
        barcode: initialData.barcode || '',
        location: initialData.location || '',
        reorderLimit: initialData.reorderLimit || 5,
        reorderAlertEnabled: initialData.reorderAlertEnabled !== undefined ? initialData.reorderAlertEnabled : true,
        quranReading: initialData.quranReading || '',
        quranScript: initialData.quranScript || '',
        quranSize: initialData.quranSize || '',
        quranPaperColor: initialData.quranPaperColor || '',
        quranBinding: initialData.quranBinding || '',
        quranCoverColor: coverColor
      }));
    }
  }, [initialData]);

  // التحقق من تكرار الباركود
  const isDuplicateBarcode = books.some(b => 
    formData.barcode.trim() !== '' && 
    b.barcode === formData.barcode.trim() && 
    b.id !== initialData?.id
  );

  // التحقق من تكرار اسم الكتاب
  const isDuplicateTitle = books.some(b => 
    formData.title.trim() !== '' && 
    b.title.trim().toLowerCase() === formData.title.trim().toLowerCase() && 
    b.id !== initialData?.id
  );

  const compressImage = (file: File): Promise<Blob> => {
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
          // تم تقليل الدقة لضمان ملاءمة حجم Base64 في Firestore (الحد الأقصى 1 ميجابايت للديكومنت)
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

          // جودة 0.85
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.85);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processImageFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار أو سحب ملف صورة (PNG, JPG, WEBP...)');
      return;
    }
    try {
      setIsUploading(true);
      // ضغط الصورة قبل حفظها لتقليل استهلاك السحابة والمساحة المحلية
      const compressedBlob = await compressImage(file);
      setImageFile(compressedBlob);
      const previewUrl = URL.createObjectURL(compressedBlob);
      setFormData(prev => ({ ...prev, image: previewUrl }));
    } catch (error) {
      console.error("Image compression failed", error);
      // Fallback to original file if compression fails
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image: previewUrl }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processImageFile(file);
          break;
        }
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: '' }));
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const adjustQuantity = (amount: number) => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + amount)
    }));
  };

  const handleGoogleSearch = () => {
    if (!formData.title.trim()) {
      alert('يرجى إدخال اسم الكتاب أولاً للبحث في جوجل');
      return;
    }
    const authorPart = formData.author.trim() ? ` - ${formData.author.trim()}` : '';
    const query = `كتاب ${formData.title.trim()}${authorPart} "2d flat cover"`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, '_blank');
  };

  const openSubCatModal = () => {
    // Split current string into array
    const currentTags = formData.subCategory 
      ? formData.subCategory.split(' - ').filter(t => t.trim() !== '') 
      : [];
    setTempSelectedSubCats(currentTags);
    setNewSubCatName('');
    setShowSubCatModal(true);
  };

  const toggleSubCatSelection = (name: string) => {
    setTempSelectedSubCats(prev => {
      if (prev.includes(name)) return prev.filter(t => t !== name);
      return [...prev, name];
    });
  };

  const handleAddNewSubCat = () => {
    if (newSubCatName.trim() && onAddSubCategory) {
      const newSc: SubCategory = {
        id: crypto.randomUUID(),
        name: newSubCatName.trim(),
        addedAt: Date.now()
      };
      onAddSubCategory(newSc);
      // Automatically select it
      setTempSelectedSubCats(prev => [...prev, newSc.name]);
      setNewSubCatName('');
    }
  };

  const saveSubCats = () => {
    setFormData(prev => ({
      ...prev,
      subCategory: tempSelectedSubCats.join(' - ')
    }));
    setShowSubCatModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || (!formData.category && !isQuran) || isDuplicateBarcode || isDuplicateTitle) return;
    
    setIsUploading(true);
    try {
      const docId = initialData?.id || crypto.randomUUID(); 

      let cloudImage = formData.image;

      // 1. التعامل مع الصورة (الحفظ في IndexedDB وتحويلها لـ Base64 للسحابة)
      if (imageFile) {
        cloudImage = await compressAndGetBase64(imageFile);
        await saveCoverToIDB(docId, imageFile);
      } else if (formData.image) {
        await saveCoverToIDB(docId, formData.image);
      }

      onSubmit({
        ...formData,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        reorderLimit: Number(formData.reorderLimit),
        reorderAlertEnabled: Boolean(formData.reorderAlertEnabled),
        // نرسل صورة Base64 للسحابة لضمان ظهورها في كافة الأجهزة
        image: cloudImage,
        quranReading: isQuran ? formData.quranReading : undefined,
        quranScript: isQuran ? formData.quranScript : undefined,
        quranSize: isQuran ? formData.quranSize : undefined,
        quranPaperColor: isQuran ? formData.quranPaperColor : undefined,
        quranBinding: isQuran ? formData.quranBinding : undefined,
        quranCoverColor: isQuran ? formData.quranCoverColor : undefined,
      });

    } catch (e) {
      console.error("Submit error:", e);
      alert("حدث خطأ غير متوقع.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6" dir="rtl">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-emerald-900/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onCancel}
      />
      
      {/* Form Card */}
      <div className={`relative w-full max-w-5xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col ${isDarkMode ? 'bg-zinc-950' : 'bg-white'}`}>
        
        {/* Modal Header */}
        <div className={`px-10 py-8 text-white flex justify-between items-center transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-emerald-900'}`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-400/20 rounded-2xl">
              {isQuran ? <Scroll size={24} className="text-emerald-400" /> : <Pencil size={24} className="text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-2xl font-black">{initialData ? (isQuran ? "تعديل بيانات المصحف" : "تعديل بيانات الكتاب") : "إضافة كتاب جديد"}</h3>
              <p className="text-emerald-100/60 text-xs mt-1 font-bold">يرجى مراجعة كافة الحقول قبل الحفظ</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all border border-white/10 ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-white/10 hover:bg-white/20'}`}
          >
            <ChevronRight size={20} className="rotate-0" />
            <span className="font-bold">رجوع للخلف</span>
          </button>
        </div>

        <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} onPaste={handlePaste} className="flex flex-col md:flex-row gap-12">
            
            <div className="flex-1 space-y-8">
              {/* ... الحقول النصية ... */}
              <div className="grid grid-cols-2 gap-6">
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 mr-1">
                    <label className="block text-sm font-bold text-gray-500">اسم الصنف</label>
                    {isDuplicateTitle && <span className="text-[10px] text-red-500 font-black animate-pulse flex items-center gap-1"><AlertCircle size={10}/> الاسم مكرر!</span>}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: رواية بؤس"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-6 py-4 border-2 outline-none transition-all duration-300 font-medium shadow-inner rounded-2xl ${isDuplicateTitle ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent focus:border-emerald-500 ' + (isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white')}`}
                  />
                </div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 mr-1">
                    <label className="block text-sm font-bold text-gray-500">البار كود (Barcode)</label>
                    {isDuplicateBarcode && <span className="text-[10px] text-red-500 font-black animate-pulse flex items-center gap-1"><AlertCircle size={10}/> مسجل مسبقاً!</span>}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="اسحب الباركود هنا..."
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className={`w-full pr-12 pl-4 py-4 border-2 outline-none transition-all duration-300 font-bold shadow-inner rounded-2xl ${isDuplicateBarcode ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent focus:border-emerald-500 ' + (isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white')}`}
                    />
                    <Barcode size={20} className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDuplicateBarcode ? 'text-red-500' : 'text-emerald-600/50'}`} />
                  </div>
                </div>
              </div>

              {/* Conditional Fields: Book vs Quran */}
              {!isQuran ? (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-500 mb-2 mr-1">اسم المؤلف</label>
                      <input
                        type="text"
                        placeholder="اسم المؤلف"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        className={`w-full px-6 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all duration-300 font-medium shadow-inner ${isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white'}`}
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-500 mb-2 mr-1">موقع الكتاب (المكان)</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="مثلاً: الرف A-4"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className={`w-full pr-12 pl-4 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all duration-300 font-bold shadow-inner ${isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white'}`}
                        />
                        <MapPin size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600/50" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-500 mb-2 mr-1 flex items-center gap-1">
                        <BookOpen size={14} className="text-emerald-500" /> دار النشر
                      </label>
                      <div className="relative">
                        <select
                          value={formData.publisher}
                          onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                          className={`w-full px-6 py-4 pr-6 pl-10 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all duration-300 font-medium shadow-inner appearance-none ${isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white'}`}
                        >
                          <option value="">اختر دار النشر...</option>
                          {publishers?.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-500 mb-2 mr-1 flex items-center gap-1">
                        <Hash size={14} className="text-emerald-500" /> رقم الطبعة
                      </label>
                      <input
                        type="text"
                        placeholder="رقم الطبعة"
                        value={formData.edition}
                        onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                        className={`w-full px-6 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all duration-300 font-medium shadow-inner ${isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white'}`}
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-500 mb-2 mr-1 flex items-center gap-1">
                        <Globe size={14} className="text-emerald-500" /> لغة الكتاب
                      </label>
                      <div className="relative">
                        <select
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                          className={`w-full px-6 py-4 pr-6 pl-10 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all duration-300 font-medium shadow-inner appearance-none ${isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white'}`}
                        >
                          <option value="العربية">العربية</option>
                          <option value="الانجليزية">الانجليزية</option>
                          <option value="الفرنسية">الفرنسية</option>
                          <option value="الاسبانية">الاسبانية</option>
                        </select>
                        <ChevronDown size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Modified Grid: Category full width, SubCategory removed (moved to chips below image) */}
                  <div className="grid grid-cols-4 gap-6">
                    <div className="relative col-span-4">
                      <label className="block text-sm font-bold text-gray-500 mb-2 mr-1">التصنيف (القسم)</label>
                      <div className="relative">
                        <select
                          required
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className={`w-full px-4 py-4 pr-10 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all duration-300 font-black shadow-inner appearance-none ${isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white'}`}
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                          {categories.length === 0 && <option value="رواية">رواية</option>}
                        </select>
                        <Tag size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Quran Specific Edit Fields
                <div className={`p-6 rounded-[24px] border border-dashed flex flex-col gap-6 ${isDarkMode ? 'bg-zinc-800/20 border-white/10' : 'bg-emerald-50/30 border-emerald-100'}`}>
                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <Scroll size={14} /> مواصفات المصحف
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 mr-1">نوع الرواية</label>
                      <div className="relative">
                        <select value={formData.quranReading} onChange={(e) => setFormData({...formData, quranReading: e.target.value})} className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}>
                          <option value="">اختر الرواية...</option>
                          {quranReadings.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 mr-1">نوع الخط</label>
                      <div className="relative">
                        <select value={formData.quranScript} onChange={(e) => setFormData({...formData, quranScript: e.target.value})} className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}>
                          <option value="">اختر الخط...</option>
                          {quranScripts.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 mr-1">حجم المصحف</label>
                      <div className="relative">
                        <select value={formData.quranSize} onChange={(e) => setFormData({...formData, quranSize: e.target.value})} className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}>
                          <option value="">اختر الحجم...</option>
                          {quranSizes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 mr-1">لون الورق</label>
                      <div className="relative">
                        <select value={formData.quranPaperColor} onChange={(e) => setFormData({...formData, quranPaperColor: e.target.value})} className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}>
                          <option value="">لون الورق...</option>
                          {quranPaperColors.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 mr-1">نوع التجليد</label>
                      <div className="relative">
                        <select value={formData.quranBinding} onChange={(e) => setFormData({...formData, quranBinding: e.target.value})} className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}>
                          <option value="">نوع التجليد...</option>
                          {quranBindings.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Palette size={12}/> لون الغلاف</label>
                      {isCustomColor ? (
                        <div className="relative">
                          <input type="text" value={formData.quranCoverColor} onChange={(e) => setFormData({...formData, quranCoverColor: e.target.value})} placeholder="أكتب اللون..." className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`} />
                          <button onClick={() => { setIsCustomColor(false); setFormData({...formData, quranCoverColor: ''}); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-red-100 text-red-500"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="relative">
                          <select value={formData.quranCoverColor} onChange={(e) => { if (e.target.value === 'ADD_NEW') { setIsCustomColor(true); setFormData({...formData, quranCoverColor: ''}); } else { setFormData({...formData, quranCoverColor: e.target.value}); } }} className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}>
                            <option value="">اختر لون الغلاف...</option>
                            {quranCoverColors.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="ADD_NEW" className="font-black text-emerald-600 bg-emerald-50">+ إضافة لون جديد</option>
                          </select>
                          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 items-end">
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-500 mb-2 mr-1">سعر البيع</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className={`w-full pr-12 pl-4 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all duration-300 font-black shadow-inner ${isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white'}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">ر.س</span>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-gray-500 mb-2 mr-1">الكمية</label>
                  <div className={`flex items-center rounded-2xl border-2 border-transparent focus-within:border-emerald-500 transition-all duration-300 shadow-inner overflow-hidden h-[60px] ${isDarkMode ? 'bg-zinc-900 focus-within:bg-zinc-800' : 'bg-gray-50 focus-within:bg-white'}`}>
                    <button
                      type="button"
                      onClick={() => adjustQuantity(1)}
                      className={`w-12 h-full flex items-center justify-center text-emerald-500 transition-colors border-l ${isDarkMode ? 'hover:bg-zinc-800 border-zinc-700' : 'hover:bg-emerald-50 border-gray-100'}`}
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 0) })}
                      className={`flex-1 h-full text-center bg-transparent outline-none font-black text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}
                    />
                    <button
                      type="button"
                      onClick={() => adjustQuantity(-1)}
                      className={`w-12 h-full flex items-center justify-center text-red-500 transition-colors border-r ${isDarkMode ? 'hover:bg-zinc-800 border-zinc-700' : 'hover:bg-red-50 border-gray-100'}`}
                    >
                      <Minus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-2 mr-1">
                    <label className="block text-[10px] font-black text-gray-400 flex items-center gap-1 uppercase tracking-widest">
                      <BellRing size={12} className="text-red-500" /> حد الطلب (تنبيه)
                    </label>
                    <div className="flex items-center gap-1.5" title="تفعيل/تعطيل التنبيه لهذا الكتاب">
                      <input 
                        type="checkbox"
                        id="alert-toggle"
                        checked={formData.reorderAlertEnabled}
                        onChange={(e) => setFormData({...formData, reorderAlertEnabled: e.target.checked})}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer transition-all"
                      />
                      {formData.reorderAlertEnabled ? <CheckCircle2 size={12} className="text-emerald-500" /> : <BellOff size={12} className="text-gray-400" />}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderLimit}
                    onChange={(e) => setFormData({ ...formData, reorderLimit: parseInt(e.target.value) || 0 })}
                    className={`w-full px-6 py-4 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none transition-all duration-300 font-black shadow-inner ${isDarkMode ? 'bg-zinc-900 text-white focus:bg-zinc-800' : 'bg-gray-50 text-emerald-900 focus:bg-white'}`}
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isDuplicateBarcode || isDuplicateTitle || isUploading}
                  className={`w-full text-white py-6 rounded-3xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-4 ${isDuplicateBarcode || isDuplicateTitle ? 'bg-gray-400 cursor-not-allowed opacity-50 grayscale' : 'hover:scale-[1.02] active:scale-[0.98] ' + (isDarkMode ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-emerald-50 shadow-emerald-100')}`}
                >
                  {isUploading ? <Loader2 size={28} className="animate-spin" /> : <Save size={28} />}
                  {isUploading ? 'جاري الحفظ محلياً...' : (isDuplicateBarcode || isDuplicateTitle ? 'الاسم أو الباركود مكرر!' : (initialData ? 'حفظ تعديلات الصنف' : 'إضافة الصنف للمخزن'))}
                </button>
              </div>
            </div>

            <div className="w-full md:w-1/3 flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-4">
                <label className="text-sm font-bold text-gray-500">صورة الغلاف</label>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200/50">
                  سحب وإفلات أو لصق
                </span>
              </div>
              <div 
                className={`w-full aspect-[3/4] rounded-3xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-2xl ring-4 ring-emerald-500/20' 
                    : formData.image 
                      ? 'border-transparent shadow-2xl' 
                      : (isDarkMode ? 'border-zinc-800 bg-zinc-900/80 hover:border-emerald-500/50' : 'border-gray-200 bg-gray-50 hover:border-emerald-400')
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {isDragging && (
                  <div className="absolute inset-0 z-20 pointer-events-none bg-emerald-600/90 text-white flex flex-col items-center justify-center p-4 gap-3 text-center backdrop-blur-sm animate-in fade-in duration-150">
                    <UploadCloud size={56} className="animate-bounce" />
                    <p className="font-black text-lg">أفلت الصورة هنا لرفع الغلاف</p>
                    <p className="text-xs font-bold text-emerald-100">سيتم حفظ الصورة تلقائياً</p>
                  </div>
                )}

                {formData.image ? (
                  <>
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white p-4 text-center">
                      <UploadCloud size={40} />
                      <span className="text-xs font-black">اسحب صورة جديدة لإستبدال الغلاف</span>
                      <span className="text-[10px] text-gray-300">أو انقر لاختيار ملف من الجهاز</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4">
                    <div className={`flex flex-col items-center gap-3 w-full p-4 rounded-3xl transition-all ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-emerald-50/50'}`}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm text-emerald-500 ${isDarkMode ? 'bg-zinc-950' : 'bg-white'}`}>
                        <UploadCloud size={36} />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-700 dark:text-gray-200 font-black text-sm">اسحب وأسقط صورة الغلاف هنا</p>
                        <p className="text-gray-400 font-bold text-xs mt-1">أو اضغط لاختيار صورة من الجهاز</p>
                      </div>
                    </div>

                    <div className="flex items-center w-full gap-2 opacity-30">
                        <div className={`h-0.5 flex-1 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
                        <span className={`text-[10px] font-black ${isDarkMode ? 'text-zinc-600' : 'text-gray-400'}`}>أو</span>
                        <div className={`h-0.5 flex-1 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
                    </div>

                    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            placeholder="ألصق رابط الصورة..."
                            className={`w-full px-4 py-3 pr-10 rounded-2xl border-2 outline-none font-bold text-xs transition-all ${
                                isDarkMode 
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-300 focus:border-zinc-500 placeholder:text-zinc-600' 
                                : 'bg-white border-gray-100 text-gray-500 focus:border-emerald-200 placeholder:text-gray-300'
                            }`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = e.currentTarget.value.trim();
                                    if (val) setFormData(prev => ({ ...prev, image: val }));
                                }
                            }}
                            onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val) setFormData(prev => ({ ...prev, image: val }));
                            }}
                        />
                        <Link size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-600' : 'text-gray-300'}`} />
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); handleGoogleSearch(); }}
                      disabled={isUploading}
                      className={`p-3 w-full rounded-2xl transition-all flex items-center justify-center gap-2 google-border-button hover:bg-blue-50/50 dark:hover:bg-blue-900/10`}
                      title="بحث صور جوجل"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="text-xs font-bold text-gray-500">بحث صور جوجل</span>
                    </button>
                  </div>
                )}
              </div>
              {formData.image && (
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); removeImage(); }}
                  disabled={isUploading}
                  className="mt-6 text-red-500 text-sm font-black flex items-center gap-2 hover:underline"
                >
                  <X size={18} />
                  إزالة الصورة الحالية
                </button>
              )}
              
              {/* Subcategories Display & Add Button - UPDATED */}
              {!isQuran && (
                <div className="mt-4 w-full flex flex-wrap gap-2 items-center justify-center">
                  {formData.subCategory && formData.subCategory.split(' - ').filter(t => t.trim() !== '').map((tag, idx) => (
                    <span 
                      key={idx} 
                      className={`px-3 py-2 rounded-xl text-[10px] font-black border flex items-center gap-1 animate-in zoom-in duration-300 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}
                    >
                      {tag}
                    </span>
                  ))}
                  
                  <button 
                    type="button"
                    onClick={openSubCatModal}
                    title="إضافة تصنيفات فرعية"
                    className={`${
                      (formData.subCategory?.split(' - ').filter(t => t.trim() !== '').length || 0) >= 2
                        ? `p-2 rounded-xl aspect-square flex items-center justify-center transition-all ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`
                        : `w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${isDarkMode ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`
                    }`}
                  >
                    <Plus size={(formData.subCategory?.split(' - ').filter(t => t.trim() !== '').length || 0) >= 2 ? 20 : 18} />
                    {(formData.subCategory?.split(' - ').filter(t => t.trim() !== '').length || 0) < 2 && "إضافة تصنيفات فرعية"}
                  </button>
                </div>
              )}

              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            </div>
          </form>
        </div>
        
        <div className={`px-10 py-5 border-t text-center ${isDarkMode ? 'bg-black/40' : 'bg-gray-50'}`}>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تحديثات فورية • حفظ تلقائي للبيانات</p>
        </div>
      </div>

      {/* Multi-SubCategory Selection Modal */}
      {showSubCatModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className={`w-full max-w-md rounded-[32px] shadow-2xl p-8 border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تحديد التصنيفات الفرعية</h3>
              <button onClick={() => setShowSubCatModal(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="space-y-4 mb-6">
              {/* شريط البحث في التصنيفات الفرعية */}
              <div className="relative">
                <Search size={16} className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
                <input 
                  type="text" 
                  placeholder="بحث في التصنيفات الفرعية..." 
                  value={subCatSearchTerm}
                  onChange={(e) => setSubCatSearchTerm(e.target.value)}
                  className={`w-full pr-10 pl-9 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-500'
                  }`}
                />
                {subCatSearchTerm && (
                  <button 
                    type="button" 
                    onClick={() => setSubCatSearchTerm('')} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="إضافة تصنيف جديد..." 
                  value={newSubCatName}
                  onChange={(e) => setNewSubCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewSubCat())}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-emerald-900 focus:border-indigo-500'}`}
                />
                <button 
                  onClick={handleAddNewSubCat}
                  disabled={!newSubCatName.trim()}
                  className={`px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-all`}
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 p-1">
                {subCategories
                  .filter(sc => !subCatSearchTerm.trim() || sc.name.toLowerCase().includes(subCatSearchTerm.toLowerCase()))
                  .map(sc => {
                    const isSelected = tempSelectedSubCats.includes(sc.name);
                    return (
                      <div 
                        key={sc.id} 
                        onClick={() => toggleSubCatSelection(sc.name)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border-2 transition-all ${isSelected ? (isDarkMode ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-500 bg-indigo-50') : (isDarkMode ? 'border-zinc-800 hover:bg-zinc-800' : 'border-gray-100 hover:bg-gray-50')}`}
                      >
                        <span className={`font-bold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-gray-700'}`}>{sc.name}</span>
                        {isSelected && <CheckCircle2 size={18} className="text-indigo-500" />}
                      </div>
                    );
                  })}
                {subCategories.length === 0 && <p className="text-center text-xs text-gray-400 py-4">لا توجد تصنيفات، أضف واحداً جديداً.</p>}
                {subCategories.length > 0 && subCatSearchTerm.trim() && subCategories.filter(sc => sc.name.toLowerCase().includes(subCatSearchTerm.toLowerCase())).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">لا يوجد تصنيف مطابق لـ &quot;{subCatSearchTerm}&quot;</p>
                )}
              </div>
            </div>

            <button 
              onClick={saveSubCats}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all bg-emerald-600 hover:bg-emerald-500`}
            >
              حفظ الاختيارات ({tempSelectedSubCats.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookForm;
