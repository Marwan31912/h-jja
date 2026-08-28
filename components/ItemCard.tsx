
import React, { useState, useRef, useEffect } from 'react';
import { Book, Category, Publisher, SubCategory } from '../types';
import { Barcode, Save, Package, DollarSign, AlertCircle, LayoutGrid, CheckCircle2, ChevronDown, Image as ImageIcon, X, BookOpen, Edit3, User, Globe, Hash, MapPin, Tag, Scroll, Palette, Layers, FileText, Plus, Sparkles, Loader2, UploadCloud, BellRing, BellOff, Library } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { saveCoverToIDB, loadCoverFromIDB, compressAndGetBase64 } from '../src/utils/imageStorage';

interface ItemCardProps {
  onAddItem: (book: Book) => void;
  isDarkMode?: boolean;
  initialBarcode?: string;
  books: Book[];
  categories?: Category[];
  subCategories?: SubCategory[];
  publishers?: Publisher[];
  schoolBookSeries?: SchoolBookSeries[];
  schoolBookGrades?: SchoolBookGrade[];
}

// وظيفة الحصول على مفتاح API الفعال
const getActiveApiKey = () => {
  return localStorage.getItem('ALADDIN_GEMINI_KEY') || (window as any).process?.env?.API_KEY || '';
};

// --- Rate Limit Handler ---
const generateWithRetry = async (ai: GoogleGenAI, model: string, config: any, retries = 5, baseDelay = 3000): Promise<any> => {
  try {
    return await ai.models.generateContent({
      model,
      ...config
    });
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.status === 503;
    
    if (retries > 0 && isRateLimit) {
      let delay = baseDelay;
      // Try to extract exact wait time from error message
      const match = error.message?.match(/retry in (\d+(\.\d+)?)s/);
      if (match && match[1]) {
        delay = Math.ceil(parseFloat(match[1])) * 1000 + 2000; // Add 2s buffer
      }
      
      console.warn(`Quota exceeded for ${model}. Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateWithRetry(ai, model, config, retries - 1, delay * 2);
    }
    throw error;
  }
};

const ItemCard: React.FC<ItemCardProps> = ({ 
  onAddItem, 
  isDarkMode, 
  initialBarcode, 
  books, 
  categories = [], 
  subCategories = [], 
  publishers = [],
  schoolBookSeries = [],
  schoolBookGrades = []
}) => {
  const packingTypes = ["قطعة", "صندوق", "علبة", "طرف", "كيس", "باكو", "استيكة"];
  
  const packingHierarchy: Record<string, string[]> = {
    "قطعة": ["قطعة"],
    "طرف": ["قطعة"],
    "علبة": ["قطعة", "طرف"],
    "كيس": ["قطعة", "طرف"],
    "باكو": ["قطعة", "طرف", "علبة"],
    "استيكة": ["قطعة", "طرف", "علبة"],
    "صندوق": ["قطعة", "علبة", "طرف", "كيس", "باكو", "استيكة"]
  };

  // قوائم المصحف
  const quranReadings = ["حفص عن عاصم", "ورش عن نافع", "قالون عن نافع", "الدوري عن أبي عمرو", "السوسي عن أبي عمرو", "شعبة عن عاصم", "البزي عن ابن كثير", "قنبل عن ابن كثير", "هشام عن ابن عامر", "ابن ذكوان عن ابن عامر", "خلف عن حمزة", "خلاد عن حمزة"];
  const quranScripts = ["عثماني", "خط النسخ", "خط مغربي", "خط مجمع الملك فهد"];
  const quranSizes = ["الجيب", "ثمن", "الربع", "الربع المحيّر", "النص", "الجوامعي", "موسوعي"];
  const quranPaperColors = ["أبيض", "شامواه"];
  const quranBindings = ["تجليد فني فاخر", "غلاف عادي", "غلاف جلد", "سحاب"];
  const quranCoverColors = ["أخضر", "أزرق", "أحمر", "أسود", "بني", "كحلي", "عنابي", "أبيض", "ذهبي"];

  const [itemType, setItemType] = useState<'book' | 'stationery' | 'quran' | 'schoolBook'>('book');
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | Blob | null>(null);

  const [formData, setFormData] = useState({
    barcode: '',
    title: '',
    author: '',
    publisher: '',
    category: 'عام',
    subCategory: '',
    edition: '',
    language: 'العربية',
    location: '',
    packingType: 'قطعة',
    packingCount: 1,
    packingName: 'قطعة',
    unitWholesalePrice: 0,
    publicPrice: 0,
    reorderLimit: 5,
    reorderAlertEnabled: true, // تفعيل افتراضي
    image: '',
    // Quran Fields
    quranReading: '',
    quranScript: '',
    quranSize: '',
    quranPaperColor: '',
    quranBinding: '',
    quranCoverColor: '',
    // School Book Fields
    schoolSubject: '',
    schoolGrade: '',
    schoolSeries: ''
  });

  const [recentItems, setRecentItems] = useState<any[]>([]);
  const lastFilledBarcode = useRef('');
  const lastFilledTitle = useRef('');
  
  const barcodeRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // مراجع حقول الكتب
  const authorRef = useRef<HTMLInputElement>(null);
  const publisherRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const subCategoryRef = useRef<HTMLSelectElement>(null);
  const editionRef = useRef<HTMLInputElement>(null);
  const languageRef = useRef<HTMLSelectElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);

  // مراجع حقول القرطاسية
  const packTypeRef = useRef<HTMLSelectElement>(null);
  const packCountRef = useRef<HTMLInputElement>(null);
  const packNameRef = useRef<HTMLSelectElement>(null);

  // مراجع حقول المصحف
  const quranReadingRef = useRef<HTMLSelectElement>(null);
  const quranScriptRef = useRef<HTMLSelectElement>(null);
  const quranSizeRef = useRef<HTMLSelectElement>(null);
  const quranPaperRef = useRef<HTMLSelectElement>(null);
  const quranBindingRef = useRef<HTMLSelectElement>(null);
  const quranCoverColorSelectRef = useRef<HTMLSelectElement>(null);
  const quranCoverColorInputRef = useRef<HTMLInputElement>(null);

  // مراجع حقول الكتب المدرسية
  const schoolSubjectRef = useRef<HTMLInputElement>(null);
  const schoolGradeRef = useRef<HTMLSelectElement>(null);
  const schoolSeriesRef = useRef<HTMLSelectElement>(null);

  const wholesaleRef = useRef<HTMLInputElement>(null);
  const publicRef = useRef<HTMLInputElement>(null);
  const limitRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isDuplicate = books.some(b => 
    (b.barcode === formData.barcode.trim() && formData.barcode.trim() !== '') || 
    (b.title === formData.title.trim() && formData.title.trim() !== '')
  );

  // دالة مساعدة لتحميل الصورة من IndexedDB فقط
  const loadFromIndexedDB = (id: string, fallbackImage: string) => {
    try {
      const request = indexedDB.open("AladdinImages", 3);
      
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("covers")) {
          db.createObjectStore("covers");
        }
      };

      request.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("covers")) {
            if (fallbackImage) setFormData(prev => ({ ...prev, image: fallbackImage }));
            return;
        }
        
        try {
            const tx = db.transaction("covers", "readonly");
            const store = tx.objectStore("covers");
            const getReq = store.get(id);
            getReq.onsuccess = () => {
              if (getReq.result) {
                const url = URL.createObjectURL(getReq.result);
                setFormData(prev => ({ ...prev, image: url }));
              } else if (fallbackImage) {
                setFormData(prev => ({ ...prev, image: fallbackImage }));
              }
            };
        } catch (err) {
            console.error("Transaction error:", err);
            if (fallbackImage) setFormData(prev => ({ ...prev, image: fallbackImage }));
        }
      };
    } catch (e) {
      console.error("Failed to load from IndexedDB", e);
      if (fallbackImage) setFormData(prev => ({ ...prev, image: fallbackImage }));
    }
  };

  useEffect(() => {
    if (initialBarcode) {
      setFormData(prev => ({
        ...prev,
        barcode: initialBarcode,
        title: '' 
      }));
      titleRef.current?.focus(); 
    } else {
      barcodeRef.current?.focus();
    }
  }, [initialBarcode]);

  useEffect(() => {
    const barcode = formData.barcode.trim();
    const title = formData.title.trim();
    
    const existing = books.find(b => 
      (barcode !== '' && b.barcode === barcode) || 
      (title !== '' && b.title === title)
    );

    const isBarcodeChanged = barcode !== lastFilledBarcode.current;
    const isTitleChanged = title !== lastFilledTitle.current;

    if (existing) {
      const barcodeMismatch = isBarcodeChanged && barcode !== '' && existing.barcode !== barcode;
      const titleMismatch = isTitleChanged && title !== '' && existing.title !== title;

      if (barcodeMismatch || titleMismatch) {
         setFormData(prev => ({
            ...prev,
            author: '',
            publisher: '',
            category: 'عام',
            subCategory: '',
            edition: '',
            language: 'العربية',
            location: '',
            packingType: 'قطعة',
            packingCount: 1,
            packingName: 'قطعة',
            unitWholesalePrice: 0,
            publicPrice: 0,
            reorderLimit: 5,
            reorderAlertEnabled: true,
            image: '',
            quranReading: '',
            quranScript: '',
            quranSize: '',
            quranPaperColor: '',
            quranBinding: '',
            quranCoverColor: '',
            schoolSubject: '',
            schoolGrade: '',
            schoolSeries: '',
            barcode: barcodeMismatch ? prev.barcode : '',
            title: titleMismatch ? prev.title : ''
         }));
         lastFilledBarcode.current = '';
         lastFilledTitle.current = '';
         setIsCustomColor(false);
         setImageFile(null);
         return;
      }

      const newMatchByBarcode = isBarcodeChanged && existing.barcode === barcode;
      const newMatchByTitle = isTitleChanged && existing.title === title;

      if (newMatchByBarcode || newMatchByTitle) {
        if (existing.image) {
          setFormData(prev => ({ ...prev, image: existing.image || '' }));
          saveCoverToIDB(existing.id, existing.image).catch(() => {});
        } else {
          loadCoverFromIDB(existing.id).then(url => {
            if (url) {
              setFormData(prev => ({ ...prev, image: url }));
            }
          });
        }

        setFormData(prev => ({
            ...prev,
            author: existing.author || '',
            publisher: existing.publisher || '',
            category: existing.category || 'عام',
            subCategory: existing.subCategory || '',
            edition: existing.edition || '',
            language: existing.language || 'العربية',
            location: existing.location || '',
            packingType: existing.packingType || 'قطعة',
            packingCount: existing.packingCount || 1,
            packingName: existing.packingName || 'قطعة',
            unitWholesalePrice: (existing.wholesalePrice || existing.purchasePrice || 0) / (existing.packingCount || 1),
            publicPrice: existing.price,
            reorderLimit: existing.reorderLimit || 5,
            reorderAlertEnabled: existing.reorderAlertEnabled !== undefined ? existing.reorderAlertEnabled : true,
            quranReading: existing.quranReading || '',
            quranScript: existing.quranScript || '',
            quranSize: existing.quranSize || '',
            quranPaperColor: existing.quranPaperColor || '',
            quranBinding: existing.quranBinding || '',
            quranCoverColor: existing.quranCoverColor || '',
            schoolSubject: existing.schoolSubject || '',
            schoolGrade: existing.schoolGrade || '',
            schoolSeries: existing.schoolSeries || '',
            barcode: existing.barcode || '',
            title: existing.title
        }));
        lastFilledBarcode.current = existing.barcode || '';
        lastFilledTitle.current = existing.title;
        setImageFile(null); 
        
        if (existing.quranReading || existing.quranSize) {
          if (existing.quranCoverColor && !quranCoverColors.includes(existing.quranCoverColor)) {
            setIsCustomColor(true);
          } else {
            setIsCustomColor(false);
          }
        }
      }

    } else {
      if (lastFilledBarcode.current || lastFilledTitle.current) {
         setFormData(prev => ({
            ...prev,
            author: '',
            publisher: '',
            category: 'عام',
            subCategory: '',
            edition: '',
            language: 'العربية',
            location: '',
            packingType: 'قطعة',
            packingCount: 1,
            packingName: 'قطعة',
            unitWholesalePrice: 0,
            publicPrice: 0,
            reorderLimit: 5,
            reorderAlertEnabled: true,
            image: '',
            quranReading: '',
            quranScript: '',
            quranSize: '',
            quranPaperColor: '',
            quranBinding: '',
            quranCoverColor: '',
            schoolSubject: '',
            schoolGrade: '',
            schoolSeries: '',
            barcode: prev.barcode !== lastFilledBarcode.current ? prev.barcode : '',
            title: prev.title !== lastFilledTitle.current ? prev.title : ''
         }));
         lastFilledBarcode.current = '';
         lastFilledTitle.current = '';
         setIsCustomColor(false);
         setImageFile(null);
      }
    }
  }, [formData.barcode, formData.title, books]);

  useEffect(() => {
    const availableNames = packingHierarchy[formData.packingType] || ["قطعة"];
    if (!availableNames.includes(formData.packingName)) {
      setFormData(prev => ({ ...prev, packingName: availableNames[0] }));
    }
  }, [formData.packingType]);

  const [isDragging, setIsDragging] = useState(false);

  const processImageFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار أو سحب ملف صورة (PNG, JPG, WEBP...)');
      return;
    }
    try {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image: previewUrl }));
    } catch (error) {
      console.error("Image loading failed", error);
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

  const handleAIAnalysis = async () => {
    if (!imageFile && !formData.image) return;
    setIsAnalyzing(true);
    
    try {
      let base64Data = '';
      
      if (imageFile) {
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onload = (e) => {
             const result = e.target?.result as string;
             resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(imageFile);
        });
      } else if (formData.image.startsWith('data:image')) {
         base64Data = formData.image.split(',')[1];
      } else {
         alert("يرجى رفع صورة من الجهاز لتحليلها");
         setIsAnalyzing(false);
         return;
      }

      // استخدام المفتاح الفعال
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      
      const response = await generateWithRetry(ai, 'gemini-3-flash-preview', {
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: `Extract book details from this image.
              Return ONLY a valid JSON object with the following keys:
              - title: string (Arabic title preferred)
              - author: string
              - publisher: string
              - category: string (Suggest one: 'رواية', 'فقه', 'تاريخ', 'سيرة', 'عام', or 'مصحف' if it looks like a Quran)
              - isQuran: boolean (true if it's a Quran)
              - quranReading: string (e.g. 'حفص عن عاصم', 'ورش عن نافع' - infer from text if possible, else empty)
              - quranScript: string (e.g. 'عثماني', 'خط النسخ' - infer if possible)
              
              Do not wrap in markdown code blocks. Just return the raw JSON string.` }
          ]
        }
      });

      const text = response.text || '{}';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);

      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        author: data.author || prev.author,
        publisher: data.publisher || prev.publisher,
        category: data.category || prev.category,
        quranReading: data.quranReading || prev.quranReading,
        quranScript: data.quranScript || prev.quranScript,
      }));

      if (data.isQuran) {
        setItemType('quran');
      } else {
        setItemType('book');
      }

    } catch (e) {
      console.error("AI Analysis failed", e);
      alert("فشل التحليل الذكي للصورة (قد يكون بسبب تجاوز الحصة، يرجى المحاولة لاحقاً).");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGoogleSearch = () => {
    if (!formData.title.trim()) {
      alert('يرجى إدخال اسم الصنف أولاً للبحث في جوجل');
      return;
    }
    const authorPart = formData.author.trim() ? ` - ${formData.author.trim()}` : '';
    const query = `كتاب ${formData.title.trim()}${authorPart} "2d flat cover"`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, '_blank');
  };

  const clearForm = () => {
    setFormData({
      barcode: '',
      title: '',
      author: '',
      publisher: '',
      category: 'عام',
      subCategory: '',
      edition: '',
      language: 'العربية',
      location: '',
      packingType: 'قطعة',
      packingCount: 1,
      packingName: 'قطعة',
      unitWholesalePrice: 0,
      publicPrice: 0,
      reorderLimit: 5,
      reorderAlertEnabled: true,
      image: '',
      quranReading: '',
      quranScript: '',
      quranSize: '',
      quranPaperColor: '',
      quranBinding: '',
      quranCoverColor: '',
      schoolSubject: '',
      schoolGrade: '',
      schoolSeries: ''
    });
    lastFilledBarcode.current = '';
    lastFilledTitle.current = '';
    setIsCustomColor(false);
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setTimeout(() => barcodeRef.current?.focus(), 10);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalTitle = formData.title;
    if (itemType === 'schoolBook') {
      if (!formData.schoolSubject) {
        alert('يرجى إدخال اسم المادة');
        return;
      }
      finalTitle = formData.schoolSubject;
    }

    if (!formData.barcode || !finalTitle) return;

    setIsUploading(true);
    try {
      const existing = books.find(b => b.barcode === formData.barcode.trim() || b.title === finalTitle.trim());
      const bookId = existing ? existing.id : crypto.randomUUID();
      
      let finalImage = formData.image;
      if (imageFile) {
        finalImage = await compressAndGetBase64(imageFile);
        await saveCoverToIDB(bookId, imageFile);
      } else if (formData.image) {
        await saveCoverToIDB(bookId, formData.image);
      }

      const pCount = (itemType === 'book' || itemType === 'quran') ? 1 : formData.packingCount;
      const calculatedWholesale = formData.unitWholesalePrice * pCount;

      const newBook: Book = {
        id: bookId,
        barcode: formData.barcode,
        title: formData.title,
        author: formData.author || 'غير محدد',
        publisher: formData.publisher,
        category: formData.category,
        subCategory: formData.subCategory,
        edition: formData.edition,
        language: formData.language,
        location: formData.location,
        price: formData.publicPrice,
        purchasePrice: calculatedWholesale, 
        wholesalePrice: calculatedWholesale,
        quantity: existing ? existing.quantity : 0, 
        addedAt: existing ? existing.addedAt : Date.now(),
        reorderLimit: formData.reorderLimit,
        reorderAlertEnabled: formData.reorderAlertEnabled,
        packingType: (itemType === 'book' || itemType === 'quran') ? 'قطعة' : formData.packingType,
        packingCount: pCount,
        packingName: (itemType === 'book' || itemType === 'quran') ? 'قطعة' : formData.packingName,
        image: finalImage, 
        quranReading: itemType === 'quran' ? formData.quranReading : undefined,
        quranScript: itemType === 'quran' ? formData.quranScript : undefined,
        quranSize: itemType === 'quran' ? formData.quranSize : undefined,
        quranPaperColor: itemType === 'quran' ? formData.quranPaperColor : undefined,
        quranBinding: itemType === 'quran' ? formData.quranBinding : undefined,
        quranCoverColor: itemType === 'quran' ? formData.quranCoverColor : undefined,
        isSchoolBook: itemType === 'schoolBook',
        schoolSubject: itemType === 'schoolBook' ? formData.schoolSubject : undefined,
        schoolGrade: itemType === 'schoolBook' ? formData.schoolGrade : undefined,
        schoolSeries: itemType === 'schoolBook' ? formData.schoolSeries : undefined,
      };

      const finalBook: Book = {
        ...newBook,
        title: finalTitle
      };

      onAddItem(finalBook);
      setRecentItems([{...finalBook, image: formData.image}, ...recentItems].slice(0, 10));
      clearForm();

    } catch (e) {
      console.error("Save error:", e);
      alert("حدث خطأ أثناء حفظ البيانات.");
    } finally {
      setIsUploading(false);
    }
  };

  const nav = (e: React.KeyboardEvent, next: React.RefObject<any>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      next.current?.focus();
    }
  };

  const calculatedTotalWholesale = formData.unitWholesalePrice * ((itemType === 'book' || itemType === 'quran') ? 1 : formData.packingCount);

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-right" dir="rtl">
      <div className={`p-8 rounded-[32px] border shadow-xl mb-6 transition-all ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3 mb-8 border-b pb-4 border-gray-100 dark:border-white/5">
           <div className="p-3 bg-emerald-500 text-white rounded-2xl">
              <LayoutGrid size={24} />
           </div>
           <div>
              <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>بطاقة تعريف صنف</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">تسجيل صنف جديد أو تحديث بيانات موجود</p>
           </div>
           {isDuplicate && (
             <div className="mr-auto px-4 py-2 rounded-xl bg-red-500/10 text-red-500 flex items-center gap-2 animate-pulse">
                <AlertCircle size={16} />
                <span className="text-xs font-black">هذا الصنف مسجل مسبقاً!</span>
             </div>
           )}
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className={`p-1.5 rounded-2xl flex gap-2 w-fit mb-2 ${isDarkMode ? 'bg-zinc-800/50 border border-white/5' : 'bg-gray-100 border border-gray-200 shadow-inner'}`}>
            <button
              type="button"
              onClick={() => setItemType('book')}
              className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center gap-2 ${itemType === 'book' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-emerald-400'}`}
            >
              <BookOpen size={16} />
              كتاب
            </button>
            <button
              type="button"
              onClick={() => setItemType('quran')}
              className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center gap-2 ${itemType === 'quran' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-emerald-400'}`}
            >
              <Scroll size={16} />
              مصحف
            </button>
            <button
              type="button"
              onClick={() => setItemType('stationery')}
              className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center gap-2 ${itemType === 'stationery' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-emerald-400'}`}
            >
              <Edit3 size={16} />
              قرطاسية / صنف عام
            </button>
            <button
              type="button"
              onClick={() => setItemType('schoolBook')}
              className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center gap-2 ${itemType === 'schoolBook' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-emerald-400'}`}
            >
              <Library size={16} />
              كتب مدرسية
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 mr-1 uppercase tracking-widest">
                  <Barcode size={14} className="text-emerald-500" /> الباركود / المعرف الرقمي
                </label>
                <div className="relative group">
                  <input
                    ref={barcodeRef}
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, barcode: val });
                    }}
                    onKeyDown={(e) => nav(e, itemType === 'schoolBook' ? schoolSubjectRef : titleRef)}
                    placeholder="امسح أو أدخل الباركود..."
                    className={`w-full pr-6 pl-14 py-4 rounded-2xl border-2 transition-all outline-none font-bold ${isDuplicate ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-transparent focus:border-[var(--accent-500)]'} ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900 shadow-inner'}`}
                  />
                  {formData.barcode && (
                    <button 
                      type="button"
                      onClick={clearForm}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-gray-200/50 hover:bg-red-500 hover:text-white text-gray-500 transition-all"
                      title="مسح الصنف"
                    >
                      <X size={16} strokeWidth={3} />
                    </button>
                  )}
                </div>
             </div>
             {itemType !== 'schoolBook' && (
               <div className="space-y-2">
                  <label className="flex items-center justify-between text-[10px] font-black text-gray-400 mr-1 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <BookOpen size={14} className="text-emerald-500" />
                    {itemType === 'book' ? 'عنوان الكتاب' : itemType === 'quran' ? 'اسم المصحف' : 'اسم الصنف (التجاري)'}
                  </span>
                  {formData.image && <span className="text-emerald-500 flex items-center gap-1"><ImageIcon size={12}/> تم إرفاق صورة</span>}
                </label>
                <div className="relative flex items-center gap-2">
                  <input
                    ref={titleRef}
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, title: val });
                    }}
                    onKeyDown={(e) => {
                      if (itemType === 'book') nav(e, authorRef);
                      else if (itemType === 'quran') nav(e, quranReadingRef);
                      else nav(e, packTypeRef);
                    }}
                    placeholder={itemType === 'book' ? "مثلاً: رواية بؤس..." : itemType === 'quran' ? "مثلاً: مصحف المدينة..." : "مثلاً: قلم هلال..."}
                    className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900 shadow-inner'}`}
                  />
                  <div className="flex items-center shrink-0 gap-2">
                    {formData.image && (
                      <button 
                        type="button"
                        onClick={handleAIAnalysis}
                        disabled={isAnalyzing || isUploading}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${isAnalyzing ? 'bg-emerald-400 border-emerald-400 text-white cursor-wait' : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-500'}`}
                        title="تحليل الغلاف بالذكاء الاصطناعي"
                      >
                        {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                      </button>
                    )}

                    <button 
                      type="button" 
                      onClick={handleGoogleSearch}
                      disabled={isUploading}
                      className={`p-4 rounded-2xl transition-all flex items-center justify-center google-border-button hover:bg-blue-50/50 dark:hover:bg-blue-900/10`}
                      title="بحث في صور جوجل"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </button>
                    {formData.image && (
                      <div className="relative group w-12 h-12 rounded-2xl overflow-hidden border-2 border-emerald-500 shrink-0 shadow-sm">
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          title="إزالة الصورة"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    <input ref={imageInputRef} type="file" onChange={handleImageChange} accept="image/*" className="hidden" />
                    <button 
                      type="button" 
                      disabled={isUploading}
                      onClick={() => imageInputRef.current?.click()} 
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${
                        isDragging ? 'bg-emerald-600 border-emerald-500 text-white scale-110 shadow-lg ring-4 ring-emerald-500/20' :
                        formData.image ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-500'
                      }`}
                      title="إضافة أو سحب وإفلات صورة هنا"
                    >
                      <ImageIcon size={20} />
                    </button>
                  </div>
                </div>
             </div>
             )}
          </div>

          {/* بيانات خاصة بالكتب المدرسية */}
          {itemType === 'schoolBook' && (
            <div className={`p-6 rounded-[24px] border border-dashed flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-zinc-800/20 border-white/10' : 'bg-blue-50/30 border-blue-100'}`}>
              <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                <Library size={14} className="text-blue-500" /> مواصفات الكتاب المدرسي
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><BookOpen size={12} className="text-blue-500"/> المادة</label>
                  <input
                    ref={schoolSubjectRef}
                    type="text"
                    value={formData.schoolSubject}
                    onChange={(e) => setFormData({...formData, schoolSubject: e.target.value})}
                    onKeyDown={(e) => nav(e, schoolSeriesRef)}
                    placeholder="اسم المادة..."
                    className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-blue-900 shadow-sm'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Layers size={12} className="text-blue-500"/> السلسلة</label>
                  <div className="relative">
                    <select
                      ref={schoolSeriesRef}
                      value={formData.schoolSeries}
                      onChange={(e) => setFormData({...formData, schoolSeries: e.target.value})}
                      onKeyDown={(e) => nav(e, schoolGradeRef)}
                      className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-blue-900 shadow-sm'}`}
                    >
                      <option value="">اختر السلسلة...</option>
                      {schoolBookSeries?.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Tag size={12} className="text-blue-500"/> الصف</label>
                  <div className="relative">
                    <select
                      ref={schoolGradeRef}
                      value={formData.schoolGrade}
                      onChange={(e) => setFormData({...formData, schoolGrade: e.target.value})}
                      onKeyDown={(e) => nav(e, wholesaleRef)}
                      className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-blue-900 shadow-sm'}`}
                    >
                      <option value="">اختر الصف...</option>
                      {schoolBookGrades?.filter(g => !formData.schoolSeries || g.seriesId === schoolBookSeries?.find(s => s.name === formData.schoolSeries)?.id).map(g => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* بيانات خاصة بالكتاب فقط */}
          {itemType === 'book' && (
            <div className={`p-6 rounded-[24px] border border-dashed flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-zinc-800/20 border-white/10' : 'bg-emerald-50/30 border-emerald-100'}`}>
              <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={14} className="text-emerald-500" /> الخصائص الفنية للكتاب
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><User size={12} className="text-emerald-500"/> اسم المؤلف</label>
                  <input
                    ref={authorRef}
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    onKeyDown={(e) => nav(e, publisherRef)}
                    placeholder="اسم مؤلف الكتاب..."
                    className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Globe size={12} className="text-emerald-500"/> دار النشر</label>
                  <div className="relative">
                    <select
                      ref={publisherRef}
                      value={formData.publisher}
                      onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                      onKeyDown={(e) => nav(e, categoryRef)}
                      className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="">اختر دار النشر...</option>
                      {publishers.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Tag size={12} className="text-emerald-500"/> التصنيف / الموضوع</label>
                  <div className="relative">
                    <select
                      ref={categoryRef}
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      onKeyDown={(e) => nav(e, subCategoryRef)}
                      className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="عام">تصنيف عام</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                
                {/* حقل التصنيف الفرعي المضاف */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Tag size={12} className="text-emerald-500"/> التصنيف الفرعي</label>
                  <div className="relative">
                    <select
                      ref={subCategoryRef}
                      value={formData.subCategory}
                      onChange={(e) => setFormData({...formData, subCategory: e.target.value})}
                      onKeyDown={(e) => nav(e, editionRef)}
                      className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="">بدون تصنيف فرعي</option>
                      {subCategories.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Hash size={12} className="text-emerald-500"/> رقم الطبعة</label>
                  <input
                    ref={editionRef}
                    type="text"
                    value={formData.edition}
                    onChange={(e) => setFormData({...formData, edition: e.target.value})}
                    onKeyDown={(e) => nav(e, languageRef)}
                    placeholder="مثلاً: الأولى 2024"
                    className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Globe size={12} className="text-emerald-500"/> لغة الكتاب</label>
                  <div className="relative">
                    <select
                      ref={languageRef}
                      value={formData.language}
                      onChange={(e) => setFormData({...formData, language: e.target.value})}
                      onKeyDown={(e) => nav(e, locationRef)}
                      className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="العربية">العربية</option>
                      <option value="الانجليزية">الانجليزية</option>
                      <option value="الفرنسية">الفرنسية</option>
                      <option value="الاسبانية">الاسبانية</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><MapPin size={12} className="text-emerald-500"/> الموقع في المحل</label>
                  <input
                    ref={locationRef}
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    onKeyDown={(e) => nav(e, wholesaleRef)}
                    placeholder="رقم الرف أو الجناح..."
                    className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                  />
                </div>
              </div>
            </div>
          )}

          {itemType === 'quran' && (
            <div className={`p-6 rounded-[24px] border border-dashed flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-zinc-800/20 border-white/10' : 'bg-emerald-50/30 border-emerald-100'}`}>
              <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <Scroll size={14} className="text-emerald-500" /> مواصفات المصحف
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1">نوع الرواية</label>
                  <div className="relative">
                    <select
                      ref={quranReadingRef}
                      value={formData.quranReading}
                      onChange={(e) => setFormData({...formData, quranReading: e.target.value})}
                      onKeyDown={(e) => nav(e, quranScriptRef)}
                      className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="">اختر الرواية...</option>
                      {quranReadings.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1">نوع الخط</label>
                  <div className="relative">
                    <select
                      ref={quranScriptRef}
                      value={formData.quranScript}
                      onChange={(e) => setFormData({...formData, quranScript: e.target.value})}
                      onKeyDown={(e) => nav(e, quranSizeRef)}
                      className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="">اختر الخط...</option>
                      {quranScripts.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1">حجم المصحف</label>
                  <div className="relative">
                    <select
                      ref={quranSizeRef}
                      value={formData.quranSize}
                      onChange={(e) => setFormData({...formData, quranSize: e.target.value})}
                      onKeyDown={(e) => nav(e, quranPaperRef)}
                      className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="">اختر الحجم...</option>
                      {quranSizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1">لون الورق</label>
                  <div className="relative">
                    <select
                      ref={quranPaperRef}
                      value={formData.quranPaperColor}
                      onChange={(e) => setFormData({...formData, quranPaperColor: e.target.value})}
                      onKeyDown={(e) => nav(e, quranBindingRef)}
                      className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="">لون الورق...</option>
                      {quranPaperColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1">نوع التجليد</label>
                  <div className="relative">
                    <select
                      ref={quranBindingRef}
                      value={formData.quranBinding}
                      onChange={(e) => setFormData({...formData, quranBinding: e.target.value})}
                      onKeyDown={(e) => nav(e, isCustomColor ? quranCoverColorInputRef : quranCoverColorSelectRef)}
                      className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                    >
                      <option value="">نوع التجليد...</option>
                      {quranBindings.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Palette size={12} className="text-emerald-500"/> لون الغلاف</label>
                  {isCustomColor ? (
                    <div className="relative">
                      <input
                        ref={quranCoverColorInputRef}
                        type="text"
                        value={formData.quranCoverColor}
                        onChange={(e) => setFormData({...formData, quranCoverColor: e.target.value})}
                        onKeyDown={(e) => nav(e, wholesaleRef)}
                        placeholder="أكتب اللون..."
                        className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                      />
                      <button 
                        onClick={() => { setIsCustomColor(false); setFormData({...formData, quranCoverColor: ''}); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-red-100 text-red-500"
                        title="إلغاء وكتابة لون جديد"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        ref={quranCoverColorSelectRef}
                        value={formData.quranCoverColor}
                        onChange={(e) => {
                          if (e.target.value === 'ADD_NEW') {
                            setIsCustomColor(true);
                            setFormData({...formData, quranCoverColor: ''});
                            setTimeout(() => quranCoverColorInputRef.current?.focus(), 100);
                          } else {
                            setFormData({...formData, quranCoverColor: e.target.value});
                          }
                        }}
                        onKeyDown={(e) => nav(e, wholesaleRef)}
                        className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                      >
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

          {itemType === 'stationery' && (
            <div className={`p-6 rounded-[24px] border border-dashed flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-zinc-800/20 border-white/10' : 'bg-emerald-50/30 border-emerald-100'}`}>
               <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <Package size={14} className="text-emerald-500" /> بيانات شكل التعبئة
               </p>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 mr-1">نوع التعبئة</label>
                     <div className="relative">
                        <select
                          ref={packTypeRef}
                          value={formData.packingType}
                          onChange={(e) => setFormData({...formData, packingType: e.target.value})}
                          onKeyDown={(e) => nav(e, packCountRef)}
                          className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                        >
                          {packingTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 mr-1">عدد التعبئة (كم يحتوي ال{formData.packingType})</label>
                     <input
                       ref={packCountRef}
                       type="number"
                       min="1"
                       value={formData.packingCount}
                       onChange={(e) => setFormData({...formData, packingCount: parseInt(e.target.value) || 1})}
                       onKeyDown={(e) => nav(e, packNameRef)}
                       className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-[var(--accent-500)] rounded-xl outline-none font-black text-sm text-center ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 mr-1">مسمى التعبئة (الوحدة الداخلية)</label>
                     <div className="relative">
                        <select
                          ref={packNameRef}
                          value={formData.packingName}
                          onChange={(e) => setFormData({...formData, packingName: e.target.value})}
                          onKeyDown={(e) => nav(e, wholesaleRef)}
                          className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                        >
                          {(packingHierarchy[formData.packingType] || ["قطعة"]).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                     </div>
                  </div>
               </div>
            </div>
          )}

          <div className={`p-6 rounded-[24px] border border-dashed flex flex-col gap-6 ${isDarkMode ? 'bg-zinc-800/20 border-white/10' : 'bg-emerald-50/30 border-emerald-100'}`}>
             <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={14} className="text-emerald-500" /> مربع تكاليف الشراء وأسعار البيع
             </p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 mr-1">سعر الشراء (للوحدة الواحدة)</label>
                   <input
                     ref={wholesaleRef}
                     type="number"
                     step="0.01"
                     value={formData.unitWholesalePrice || ''}
                     onChange={(e) => setFormData({...formData, unitWholesalePrice: parseFloat(e.target.value) || 0})}
                     onKeyDown={(e) => nav(e, publicRef)}
                     placeholder="0.00"
                     className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-black text-sm text-center ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 mr-1">سعر البيع (للجمهور)</label>
                   <input
                     ref={publicRef}
                     type="number"
                     step="0.01"
                     value={formData.publicPrice || ''}
                     onChange={(e) => setFormData({...formData, publicPrice: parseFloat(e.target.value) || 0})}
                     onKeyDown={(e) => nav(e, limitRef)}
                     placeholder="0.00"
                     className={`w-full px-5 py-3.5 rounded-xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-black text-sm text-center ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 mr-1">{(itemType === 'book' || itemType === 'quran') ? 'إجمالي تكلفة الشراء' : `إجمالي تكلفة ال${formData.packingType}`}</label>
                   <div className={`w-full px-5 py-3.5 rounded-xl font-black text-sm border-2 border-transparent flex items-center justify-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-white text-emerald-600 shadow-inner'}`}>
                      {calculatedTotalWholesale.toLocaleString()} د.ل
                      {itemType === 'stationery' && <span className="text-[10px] text-gray-400 font-bold">({formData.unitWholesalePrice} × {formData.packingCount})</span>}
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
             <div className="space-y-2">
                <div className="flex items-center justify-between mb-2 mr-1">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <AlertCircle size={14} className="text-red-500" /> حد الطلب (تنبيه نفاذ الكمية)
                  </label>
                  <div className="flex items-center gap-1.5" title="تفعيل/تعطيل التنبيه لهذا الصنف">
                    <input 
                      type="checkbox"
                      checked={formData.reorderAlertEnabled}
                      onChange={(e) => setFormData({...formData, reorderAlertEnabled: e.target.checked})}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer transition-all"
                    />
                    {formData.reorderAlertEnabled ? <CheckCircle2 size={12} className="text-emerald-500" /> : <BellOff size={12} className="text-gray-400" />}
                  </div>
                </div>
                <input
                  ref={limitRef}
                  type="number"
                  min="0"
                  value={formData.reorderLimit}
                  onChange={(e) => setFormData({...formData, reorderLimit: parseInt(e.target.value) || 0})}
                  className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent focus:border-[var(--accent-500)] outline-none font-black transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900 shadow-inner'}`}
                />
             </div>
             <button
               type="submit"
               disabled={isUploading}
               className={`w-full py-5 rounded-[22px] font-black text-xl transition-all flex items-center justify-center gap-4 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:grayscale ${isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white'}`}
             >
               {isUploading ? <Loader2 size={28} className="animate-spin"/> : <Save size={28} />}
               {isUploading ? 'جاري حفظ الصورة محلياً...' : (isDuplicate ? 'تحديث بيانات الصنف' : 'حفظ الصنف الجديد')}
             </button>
          </div>
        </form>
      </div>

      <div className={`flex-1 rounded-[40px] border shadow-2xl overflow-hidden flex flex-col min-h-0 ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className={`px-10 py-5 border-b font-black text-sm flex items-center justify-between ${isDarkMode ? 'bg-black/20 text-emerald-400 border-white/5' : 'bg-gray-50/50 text-emerald-900 border-gray-100'}`}>
           <div className="flex items-center gap-3">
              <CheckCircle2 size={20} />
              معاينة الأصناف المضافة مؤخراً
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <table className="w-full text-right border-collapse">
              <thead className={`sticky top-0 z-10 border-b shadow-sm ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
                <tr className="text-gray-400 text-[10px] uppercase font-black">
                   <th className="px-10 py-5">المعرف / الباركود</th>
                   <th className="px-10 py-5">اسم الصنف</th>
                   <th className="px-10 py-5 text-center">التصنيف</th>
                   <th className="px-10 py-5 text-center">سعر البيع</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
                {recentItems.length > 0 ? recentItems.map((item, idx) => (
                   <tr key={idx} className={`transition-all ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-emerald-50/20'}`}>
                      <td className={`px-10 py-6 font-black text-base ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{item.barcode}</td>
                      <td className={`px-10 py-6 font-bold text-base ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
                        {item.title}
                        {item.author && <span className="block text-[10px] text-gray-400 font-bold">{item.author}</span>}
                      </td>
                      <td className="px-10 py-6 text-center">
                         <span className={`px-4 py-1 rounded-xl text-[10px] font-black border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                            {item.category}
                         </span>
                      </td>
                      <td className={`px-10 py-6 text-center font-black ${isDarkMode ? 'text-white' : 'text-emerald-600'}`}>
                        {item.price?.toLocaleString()} د.ل
                      </td>
                   </tr>
                )) : (
                   <tr>
                      <td colSpan={4} className="py-20 text-center text-gray-400 font-bold">
                        لم يتم إضافة أصناف في هذه الجلسة بعد
                      </td>
                   </tr>
                )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
