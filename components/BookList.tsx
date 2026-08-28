import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Book } from '../types';
import { Pencil, Trash2, Search, Image as ImageIcon, Globe, Loader2, Send, X, BookOpen, Sparkles, Trash, Download, ScanEye, Upload, Type, Minus, Plus, ChevronLeft, ChevronRight, ArrowUpDown, SortAsc, SortDesc, Calendar, Tag, Package, DollarSign, HardDrive, CheckCircle2, Filter } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import html2canvas from 'html2canvas';
import { CandleIcon } from './Sidebar';

interface BookListProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onUpdateBook?: (book: Book) => void;
  onDelete: (id: string) => void;
  isDarkMode?: boolean;
  isQuranMode?: boolean;
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

const BookList: React.FC<BookListProps> = ({ books, onEdit, onUpdateBook, onDelete, isDarkMode, isQuranMode = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'quantity' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [infoModalBook, setInfoModalBook] = useState<Book | null>(null);
  const [aiSummary, setAiSummary] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summaryFontSize, setSummaryFontSize] = useState(1.7);
  const [isAuthorExpanded, setIsAuthorExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const [dragOverBookId, setDragOverBookId] = useState<string | null>(null);
  const [uploadingBookId, setUploadingBookId] = useState<string | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{ id: string; text: string } | null>(null);

  // إغلاق قوائم المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBooks = books.filter(book => {
    return (
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      book.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.barcode && book.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (isQuranMode && book.quranReading && book.quranReading.includes(searchTerm))
    );
  });

  const displayBooks = useMemo(() => {
    return [...filteredBooks].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '', 'ar');
      } else if (sortBy === 'quantity') {
        comparison = (a.quantity || 0) - (b.quantity || 0);
      } else if (sortBy === 'price') {
        comparison = (a.price || 0) - (b.price || 0);
      } else {
        comparison = (a.addedAt || 0) - (b.addedAt || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredBooks, sortBy, sortOrder]);

  const sortOptions = [
    { key: 'date', label: 'تاريخ الإضافة', icon: Calendar },
    { key: 'title', label: 'الاسم (أ-ي)', icon: Tag },
    { key: 'quantity', label: 'الكمية المتوفرة', icon: Package },
    { key: 'price', label: 'السعر', icon: DollarSign },
  ];

  const handleExternalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !infoModalBook) return;
    
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
          const base64Result = reader.result as string;
          const base64Data = base64Result.split(',')[1];
          const mimeType = file.type || 'image/jpeg';

          // استخدام المفتاح الديناميكي
          const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
          
          const response = await generateWithRetry(ai, 'gemini-3-flash-preview', {
            contents: {
              parts: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                },
                {
                    text: `قم باستخراج نص النبذة أو الملخص المكتوب في هذه الصورة بدقة.
                    تجاهل اسم المؤلف واسم الكتاب وأي نصوص ترويجية أخرى، ركز فقط على محتوى النبذة.
                    أرجع النص المستخرج فقط كما هو مكتوب في الصورة بدقة.`
                }
              ]
            }
          });
          
          const summaryText = response.text || 'لم يتم العثور على نص واضح في الصورة.';
          
          setAiSummary(summaryText);
          localStorage.setItem(`book_summary_${infoModalBook.id}`, summaryText);
          setIsAnalyzing(false);
          
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
    } catch (error) {
      console.error("AI analysis failed:", error);
      setAiSummary("حدث خطأ أثناء محاولة تحليل الصورة (قد يكون بسبب تجاوز الحصة، يرجى المحاولة لاحقاً).");
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSummary = () => {
    if (infoModalBook) {
      localStorage.removeItem(`book_summary_${infoModalBook.id}`);
      setAiSummary('');
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('book-summary-card');
    if (element) {
      try {
        const canvas = await html2canvas(element, { 
          scale: 3,
          backgroundColor: null,
          useCORS: true,
          ignoreElements: (el) => el.classList.contains('no-capture'),
          onclone: (clonedDoc) => {
            const card = clonedDoc.getElementById('book-summary-card');
            const scrollContainer = clonedDoc.getElementById('summary-scroll-container');
            const summaryText = clonedDoc.getElementById('summary-text-p');
            const footer = clonedDoc.getElementById('capture-footer');

            // 1. Restore/Fix dimensions to keep Image Original Size
            if (card) {
                card.style.height = '850px'; 
                card.style.width = '1200px'; 
                card.style.maxWidth = 'none';
                card.style.overflow = 'hidden'; 
                card.style.borderRadius = '48px'; 
                card.style.backgroundColor = isDarkMode ? '#09090b' : '#ffffff';
                card.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                card.style.position = 'relative';
            }

            // 2. Adjust text container
            if (scrollContainer) {
                scrollContainer.style.overflow = 'hidden'; 
                scrollContainer.style.height = 'auto'; 
                scrollContainer.style.maxHeight = '650px';
                scrollContainer.style.display = 'block';
                scrollContainer.style.position = 'relative';
                scrollContainer.style.paddingBottom = '100px'; // Space for footer
            }

            // 3. Adjusted Text Size (Dynamic based on state)
            if (summaryText) {
                summaryText.style.fontSize = `${summaryFontSize}rem`;
                summaryText.style.lineHeight = '1.5';
                summaryText.style.fontWeight = '800';
            }

            // 4. Fixed Footer at Absolute Bottom - MODIFIED
            if (footer) {
              footer.style.display = 'flex';
              footer.style.flexDirection = 'column';
              footer.style.alignItems = 'center';
              footer.style.justifyContent = 'center';
              footer.style.gap = '10px';
              
              // FIXED: Always visible in capture
              footer.style.position = 'absolute';
              footer.style.bottom = '20px';
              footer.style.left = '0';
              footer.style.right = '0';
              footer.style.width = '100%';
              footer.style.margin = '0';
              footer.style.opacity = '1';
              footer.style.zIndex = '10';
              
              const logoContainer = footer.querySelector('div');
              if (logoContainer) {
                  logoContainer.style.width = '60px'; 
                  logoContainer.style.height = '60px';
              }
              
              const textSpan = footer.querySelector('span');
              if (textSpan) {
                  textSpan.style.fontSize = '20px';
                  textSpan.style.color = isDarkMode ? '#e4e4e7' : '#064e3b';
                  textSpan.style.textAlign = 'center';
              }
            }
          }
        });
        const link = document.createElement('a');
        link.download = `${infoModalBook?.title || 'summary'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        console.error("Screenshot failed", error);
      }
    }
  };

  const formatQuantity = (book: Book) => {
    const total = book.quantity || 0;
    const packCount = book.packingCount || 1;
    if (packCount <= 1) return `${total} قطعة`;
    
    const packs = Math.floor(total / packCount);
    const remainder = total % packCount;
    
    let result = '';
    if (packs > 0) result += `${packs} ${book.packingType || 'عبوة'}`;
    if (packs > 0 && remainder > 0) result += ' و ';
    if (remainder > 0 || packs === 0) result += `${remainder} ${book.packingName || 'قطعة'}`;
    
    return (
      <div className="flex flex-col items-center">
        <span className="font-black text-sm">{result}</span>
        <span className="text-[9px] text-gray-400 font-bold">(إجمالي {total} قطعة)</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-500 text-right">
      {/* Search and Sort Bar */}
      <div className={`sticky top-0 z-30 pb-6 pt-1 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search 
              className="absolute right-6 top-1/2 -translate-y-1/2 transition-colors" 
              size={20} 
              style={{ color: isDarkMode ? 'rgba(var(--accent-400-rgb), 0.6)' : 'var(--accent-600)' }}
            />
            <input
              type="text"
              placeholder={isQuranMode ? "ابحث عن مصحف بالاسم أو الرواية..." : "ابحث عن كتاب، مؤلف، تصنيف أو باركود..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pr-14 pl-6 py-4 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none transition-all shadow-sm font-medium text-right placeholder:text-gray-400 ${isDarkMode ? 'bg-zinc-800 focus:border-emerald-500 focus:bg-zinc-700 text-white placeholder:text-zinc-500' : 'bg-gray-50 focus:border-emerald-500 focus:bg-white text-emerald-900 placeholder:text-gray-400'}`}
            />
          </div>

          <div className="relative" ref={sortMenuRef}>
             <button 
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`px-6 py-4 rounded-2xl border-2 flex items-center gap-3 font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-sm ${isDarkMode ? 'bg-zinc-800 border-white/5 text-emerald-400 hover:bg-zinc-700' : 'bg-white border-emerald-50 text-emerald-700 hover:bg-emerald-50'}`}
             >
                <ArrowUpDown size={18} />
                فرز: {sortOptions.find(o => o.key === sortBy)?.label}
                <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700 mx-1" />
                {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
             </button>

             {showSortMenu && (
               <div className={`absolute top-full left-0 mt-3 w-64 rounded-3xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                  <div className="p-2 space-y-1">
                    {sortOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = sortBy === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => {
                            if (isActive) {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortBy(opt.key as any);
                              setSortOrder(opt.key === 'title' ? 'asc' : 'desc');
                            }
                            setShowSortMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-right font-bold text-sm transition-all ${isActive ? (isDarkMode ? 'bg-emerald-600/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700') : (isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-500 hover:bg-gray-50')}`}
                        >
                          <div className="flex items-center gap-3">
                             <Icon size={16} className={isActive ? 'text-emerald-500' : 'text-gray-400'} />
                             {opt.label}
                          </div>
                          {isActive && (sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
                        </button>
                      );
                    })}
                  </div>
                  <div className={`p-4 border-t text-[10px] font-bold text-gray-400 text-center ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50'}`}>
                    اضغط مرة أخرى لعكس اتجاه الترتيب
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className={`rounded-3xl overflow-hidden border shadow-sm flex-1 flex flex-col min-h-0 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-right border-collapse table-fixed min-w-[1000px]">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className={`border-b ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-emerald-50 border-emerald-100'}`}>
                {/* Title Column */}
                <th className={`sticky right-0 z-30 px-8 py-5 font-black text-sm transition-all duration-500 ease-in-out ${isAuthorExpanded ? 'w-[25%]' : 'w-[35%]'} ${isDarkMode ? 'text-white bg-zinc-900' : 'text-emerald-900 bg-emerald-50'}`}>الصنف (ثابت)</th>
                
                {/* Expandable Author Column */}
                <th className={`px-4 py-5 font-black text-sm transition-all duration-500 ease-in-out ${isAuthorExpanded ? 'w-[40%]' : 'w-[20%]'} ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{isQuranMode ? 'الرواية' : 'المؤلف'}</span>
                    <button 
                      onClick={() => setIsAuthorExpanded(!isAuthorExpanded)} 
                      className={`p-1.5 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}`}
                      title={isAuthorExpanded ? "تصغير العمود" : "توسيع العمود"}
                    >
                      {isAuthorExpanded ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
                    </button>
                  </div>
                </th>

                {/* Category Column (Centered) */}
                <th className={`px-8 py-5 font-black text-sm text-center transition-all duration-500 ease-in-out ${isAuthorExpanded ? 'w-[10%]' : 'w-[15%]'} ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{isQuranMode ? 'الحجم' : 'التصنيف'}</th>
                
                {/* Price Column */}
                <th className={`px-8 py-5 font-black text-sm text-center w-[10%] ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>السعر</th>
                
                {/* Stock Column */}
                <th className={`px-8 py-5 font-black text-sm text-center transition-all duration-500 ease-in-out ${isAuthorExpanded ? 'w-[10%]' : 'w-[15%]'} ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>المخزون التفصيلي</th>
                
                {/* Actions Column */}
                <th className={`px-8 py-5 font-black text-sm text-center w-[10%] ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>الإجراءات</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
              {displayBooks.length > 0 ? displayBooks.map((book) => (
                <tr key={book.id} className={`transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-emerald-50/30'}`}>
                  <td className={`sticky right-0 z-10 px-8 py-4 transition-colors ${isDarkMode ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-white group-hover:bg-emerald-50'}`}>
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div 
                        onClick={() => {
                          if (uploadingBookId !== book.id) {
                            setInfoModalBook(book);
                            const savedSummary = localStorage.getItem(`book_summary_${book.id}`);
                            setAiSummary(savedSummary || '');
                            setSummaryFontSize(1.7); // Reset to default when opening
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
                                  onEdit(updated);
                                }
                                setToastFeedback({ id: book.id, text: 'تم التحديث!' });
                                setTimeout(() => setToastFeedback(null), 3000);
                              } catch (err) {
                                console.error('Error uploading dropped cover:', err);
                              } finally {
                                setUploadingBookId(null);
                              }
                            }
                          }
                        }}
                        className={`w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all relative ${
                          dragOverBookId === book.id 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/50 scale-110 shadow-lg bg-emerald-500/20' 
                            : isDarkMode 
                              ? 'bg-zinc-900 border-white/5' 
                              : 'bg-gray-100 border-gray-100'
                        }`}
                        title="اسحب وافلت صورة هنا لتحديث الغلاف فوراً"
                      >
                        {book.image ? (
                          <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'text-zinc-600' : 'text-gray-300'}`}>
                            <ImageIcon size={20} />
                          </div>
                        )}

                        {dragOverBookId === book.id && (
                          <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-1 text-center z-20 animate-in fade-in">
                            <Upload size={16} className="text-emerald-400 animate-bounce" />
                          </div>
                        )}

                        {uploadingBookId === book.id && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                            <Loader2 size={16} className="text-emerald-400 animate-spin" />
                          </div>
                        )}

                        {toastFeedback?.id === book.id && (
                          <div className="absolute inset-0 bg-emerald-600 text-white flex items-center justify-center text-[8px] font-black z-20 animate-in fade-in">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden gap-1">
                        <span className={`font-bold truncate block ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`} title={book.title}>
                          {book.title}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`font-medium block ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'} ${isAuthorExpanded ? '' : 'truncate'}`} title={isQuranMode ? (book.quranReading || 'لم تحدد') : (book.author || 'لم يحدد')}>
                      {isQuranMode ? (book.quranReading || '-') : (book.author || '/')}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap inline-block ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                      {isQuranMode ? (book.quranSize || '-') : book.category}
                    </span>
                  </td>
                  <td className={`px-8 py-6 text-center font-black ${isDarkMode ? 'text-white' : 'text-emerald-600'}`}>
                    {book.price?.toLocaleString() || 0}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className={`rounded-xl py-1 px-3 border inline-block min-w-[80px] ${isDarkMode ? 'bg-zinc-900 border-white/5 text-zinc-100' : 'bg-white border-emerald-50 text-emerald-900'}`}>
                      {formatQuantity(book)}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => onEdit(book)} className={`p-2 rounded-xl transition-all shadow-sm ${isDarkMode ? 'bg-zinc-700 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}><Pencil size={18} /></button>
                      <button onClick={() => onDelete(book.id)} className={`p-2 rounded-xl transition-all shadow-sm ${isDarkMode ? 'bg-zinc-700 text-red-400 hover:bg-red-600 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'}`}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className={`px-8 py-20 text-center ${isDarkMode ? 'text-zinc-600' : 'text-gray-400'}`}>
                    {searchTerm ? 'لم يتم العثور على نتائج للبحث' : (isQuranMode ? 'لا يوجد مصاحف في هذه القائمة' : 'لا يوجد كتب في القائمة حالياً')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Book Intelligence Modal */}
      {infoModalBook && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300 gpu-accelerated">
          <div id="book-summary-card" className={`relative w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all border border-white/20 gpu-accelerated ${isDarkMode ? 'bg-zinc-950' : 'bg-white'}`}>
            
            {/* Dynamic Background Layer */}
            {infoModalBook.image && (
              <div 
                className="absolute inset-0 opacity-30 blur-[120px] pointer-events-none scale-125 transition-all duration-700"
                style={{ 
                  backgroundImage: `url(${infoModalBook.image})`, 
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            )}

            {/* Right Panel: Content Area (Fixed to the Right in RTL) */}
            <div className="flex-1 h-full p-10 md:p-14 flex flex-col relative z-10 text-right" dir="rtl">
              
              {/* Header: All elements grouped on the Right side */}
              <div className="flex items-start gap-6 mb-10">
                {/* Action buttons (Rightmost) */}
                <div className="flex gap-2 shrink-0 no-capture">
                  <button 
                    onClick={() => setInfoModalBook(null)}
                    className={`p-4 rounded-[22px] transition-all hover:rotate-90 ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >
                    <X size={24} />
                  </button>
                  {aiSummary && (
                    <button 
                      onClick={handleDeleteSummary}
                      title="حذف النبذة"
                      className={`p-4 rounded-[22px] transition-all bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white`}
                    >
                      <Trash size={24} />
                    </button>
                  )}
                </div>
                
                {/* Book Info (Immediately next to the buttons on the right) */}
                <div className="space-y-2 text-right">
                  <h2 className={`text-4xl font-black leading-tight ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>{infoModalBook.title}</h2>
                  <div className={`flex items-center gap-3 font-bold text-base ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                    {isQuranMode ? (infoModalBook.quranReading || '') : (infoModalBook.author || 'مؤلف غير معروف')}
                  </div>
                </div>
              </div>

              {/* Body: Conditional Rendering based on summary existence */}
              <div id="summary-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar relative pb-24">
                {aiSummary ? (
                  <div className={`animate-in slide-in-from-bottom-6 duration-700 relative z-10 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    <p id="summary-text-p" className="leading-relaxed font-bold w-full mb-6" style={{ fontSize: `${summaryFontSize}rem` }}>
                      {aiSummary}
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 space-y-6">
                    <div className={`p-6 rounded-full bg-indigo-500/10 mb-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      <ScanEye size={48} />
                    </div>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleExternalImageUpload}
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzing}
                      className={`w-full h-[72px] px-10 rounded-[28px] font-black text-white shadow-2xl transition-all flex items-center justify-center gap-4 disabled:opacity-40 ${isAnalyzing ? 'bg-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-indigo-600/30'}`}
                    >
                      {isAnalyzing ? (
                        <Loader2 size={28} className="animate-spin" />
                      ) : (
                        <>
                          <Upload size={24} />
                          <span className="text-lg">اختر صورة لاستخراج النص</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-gray-400 font-bold max-w-xs text-center">يمكنك تصوير الغلاف الخلفي للكتاب ورفعه هنا ليقوم النظام بقراءة النبذة تلقائياً</p>
                  </div>
                )}
                
                {/* Fixed Footer - مخفي في واجهة التطبيق، يظهر فقط في التنزيل */}
                <div id="capture-footer" style={{ display: 'none' }} className="absolute bottom-6 right-0 left-0 flex-col items-center justify-center gap-2 opacity-90 w-full">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <CandleIcon />
                  </div>
                  <span className="font-black text-lg text-center block">مكتبة علاء الدين درنة</span>
                </div>
              </div>

              {/* زر التحميل والتحكم بالخط - يبقى خارج الـ scroll container */}
              {aiSummary && (
                <div className="flex items-center gap-4 mt-6 self-start no-capture">
                  <button 
                    onClick={handleDownloadImage}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${isDarkMode ? 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700' : 'bg-gray-100 text-emerald-700 hover:bg-emerald-50'}`}
                  >
                    <Download size={18} />
                    حفظ كصورة
                  </button>

                  <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${isDarkMode ? 'bg-zinc-800 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <button 
                      onClick={() => setSummaryFontSize(s => Math.max(0.5, parseFloat((s - 0.1).toFixed(1))))}
                      className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-white text-gray-500'}`}
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex items-center gap-1 px-1">
                      <Type size={14} className={isDarkMode ? 'text-zinc-500' : 'text-gray-400'} />
                      <span className={`text-xs font-bold w-8 text-center ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{summaryFontSize.toFixed(1)}</span>
                    </div>
                    <button 
                      onClick={() => setSummaryFontSize(s => Math.min(3, parseFloat((s + 0.1).toFixed(1))))}
                      className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-white text-gray-500'}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Left: Book Image Container (Fixed to the Left in RTL) */}
            <div className={`w-full md:w-1/2 h-full flex items-center justify-center relative z-10 overflow-hidden ${isDarkMode ? 'bg-black/50' : 'bg-gray-100/40'}`}>
              {infoModalBook.image ? (
                <img 
                  src={infoModalBook.image} 
                  alt={infoModalBook.title} 
                  className="w-full h-full object-cover shadow-2xl transition-transform duration-1000" 
                />
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center gap-6 ${isDarkMode ? 'bg-zinc-900 text-zinc-700' : 'bg-white text-gray-200'}`}>
                  <BookOpen size={120} strokeWidth={1} />
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BookList;