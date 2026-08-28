import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Page, Book, SaleRecord, SubCategory, PurchaseItem } from '../types';
import { History, Package, X, Search, Zap, Truck, Import, Users, CreditCard, Wallet, LayoutDashboard, Sparkles, Send, Bot, User, Image as ImageIcon, Paperclip, Loader2, Mic, Copy, Settings, Download, Edit, Plus, Trash, Save, FileText, Key, FileUp, CheckCircle2, DollarSign, Eye, EyeOff, Trash2, Hash } from 'lucide-react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

interface QuickMenuProps {
  onNavigate: (p: Page) => void;
  onClose: () => void;
  isDarkMode?: boolean;
  books?: Book[];
  salesHistory?: SaleRecord[];
  subCategories?: SubCategory[];
  onUpdateBook?: (book: Book) => void;
  onAddBook?: (book: Book) => void;
  onProcessPurchase?: (supplierId: string, supplierName: string, invoiceNum: string, items: PurchaseItem[]) => Promise<void>;
  onAddSubCategory?: (sc: SubCategory) => void;
  onUpdateSystemName?: (name: string) => void;
  onUpdateAccentColor?: (color: string) => void;
}

// وظيفة الحصول على مفتاح API الفعال
const getActiveApiKey = () => {
  return localStorage.getItem('ALADDIN_GEMINI_KEY') || (window as any).process?.env?.API_KEY || '';
};

const getPdfApiKey = () => {
  return localStorage.getItem('ALADDIN_PDF_READER_KEY') || '';
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
      const match = error.message?.match(/retry in (\d+(\.\d+)?)s/);
      if (match && match[1]) {
        delay = Math.ceil(parseFloat(match[1])) * 1000 + 2000;
      }
      
      console.warn(`Quota exceeded for ${model}. Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateWithRetry(ai, model, config, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

const normalizeArabic = (text: string) => {
  if (!text) return '';
  let normalized = text.trim();
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  normalized = normalized.replace(/ة/g, 'ه');
  normalized = normalized.replace(/ى/g, 'ي');
  return normalized;
};

const removeDefiniteArticle = (text: string) => {
  return text.split(' ').map(w => w.startsWith('ال') && w.length > 3 ? w.slice(2) : w).join(' ');
};

const calculateLevenshtein = (a: string, b: string) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
};

const findSmartMatch = (query: string, books: Book[]) => {
  const normQuery = normalizeArabic(query).toLowerCase();
  const cleanQuery = removeDefiniteArticle(normQuery);
  let match = books.find(b => normalizeArabic(b.title).toLowerCase() === normQuery);
  if (match) return match;
  match = books.find(b => removeDefiniteArticle(normalizeArabic(b.title).toLowerCase()) === cleanQuery);
  if (match) return match;
  let bestDist = Infinity;
  let bestBook = null;
  for (const book of books) {
    const normTitle = normalizeArabic(book.title).toLowerCase();
    const cleanTitle = removeDefiniteArticle(normTitle);
    if (cleanTitle.includes(cleanQuery)) return book;
    const dist = calculateLevenshtein(cleanQuery, cleanTitle);
    const threshold = Math.floor(cleanQuery.length / 3) + 1;
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      bestBook = book;
    }
  }
  return bestBook;
};

const QuickMenu: React.FC<QuickMenuProps> = ({ 
  onNavigate, 
  onClose, 
  isDarkMode,
  books = [],
  salesHistory = [],
  subCategories,
  onUpdateBook,
  onAddBook,
  onProcessPurchase,
  onAddSubCategory,
  onUpdateSystemName,
  onUpdateAccentColor
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAiChat, setShowAiChat] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; image?: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [showCoverCreator, setShowCoverCreator] = useState(false);
  const [coverInputImage, setCoverInputImage] = useState<string | null>(null);
  const [generatedCover, setGeneratedCover] = useState<string | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  
  const [showPdfReader, setShowPdfReader] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfApiKey, setPdfApiKey] = useState(getPdfApiKey());
  const [showPdfKeyEditor, setShowPdfKeyEditor] = useState(false);
  const [tempPdfKey, setTempPdfKey] = useState(getPdfApiKey());
  const [pdfResults, setPdfResults] = useState<{ supplier: string; invoiceNumber: string; items: any[] } | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  const [showEditMenu, setShowEditMenu] = useState(false);
  const [editPrompts, setEditPrompts] = useState<string[]>([]);
  const [newEditPrompt, setNewEditPrompt] = useState('');

  const [menuOrder, setMenuOrder] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragContainerRef = useRef<HTMLDivElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const defaultMenus = useMemo(() => [
    { id: Page.Profile, label: 'اعدادات', desc: 'إعدادات الحساب والنظام', icon: Settings, color: 'bg-slate-600' },
  ], []);

  useEffect(() => {
    const savedOrder = localStorage.getItem('aladdin_quick_menu_order');
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        setMenuOrder(parsedOrder);
      } catch (e) {
        setMenuOrder(defaultMenus.map(m => m.label));
      }
    } else {
      setMenuOrder(defaultMenus.map(m => m.label));
    }
  }, [defaultMenus]);

  const sortedMenus = useMemo(() => {
    if (menuOrder.length === 0) return defaultMenus;
    const menuMap = new Map(defaultMenus.map(m => [m.label, m]));
    const currentLabels = defaultMenus.map(m => m.label);
    const orderedItems = menuOrder
      .filter(label => currentLabels.includes(label))
      .map(label => menuMap.get(label))
      .filter(Boolean) as typeof defaultMenus;
    const newItems = defaultMenus.filter(m => !menuOrder.includes(m.label));
    return [...orderedItems, ...newItems];
  }, [defaultMenus, menuOrder]);

  const handlePointerDown = (label: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      setActiveDragItem(label);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 1000);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isDragging) {
      setIsDragging(false);
      setActiveDragItem(null);
      localStorage.setItem('aladdin_quick_menu_order', JSON.stringify(sortedMenus.map(m => m.label)));
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !activeDragItem) return;
    e.preventDefault();
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const targetButton = elements.find(el => el.getAttribute('data-menu-item'));
    if (targetButton) {
      const targetLabel = targetButton.getAttribute('data-menu-item');
      if (targetLabel && targetLabel !== activeDragItem) {
        const currentIndex = menuOrder.indexOf(activeDragItem);
        const targetIndex = menuOrder.indexOf(targetLabel);
        if (currentIndex !== -1 && targetIndex !== -1) {
          const newOrder = [...menuOrder];
          const [movedItem] = newOrder.splice(currentIndex, 1);
          newOrder.splice(targetIndex, 0, movedItem);
          setMenuOrder(newOrder);
        }
      }
    }
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalUp = () => handlePointerUp();
      window.addEventListener('pointerup', handleGlobalUp);
      return () => window.removeEventListener('pointerup', handleGlobalUp);
    }
  }, [isDragging, sortedMenus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const savedPrompts = localStorage.getItem('aladdin_cover_edit_prompts');
    if (savedPrompts) {
      try {
        setEditPrompts(JSON.parse(savedPrompts));
      } catch (e) {
        console.error("Failed to parse edit prompts", e);
      }
    }
  }, []);

  const saveEditPrompt = () => {
    if (!newEditPrompt.trim()) return;
    const updatedPrompts = [...editPrompts, newEditPrompt.trim()];
    setEditPrompts(updatedPrompts);
    localStorage.setItem('aladdin_cover_edit_prompts', JSON.stringify(updatedPrompts));
    setNewEditPrompt('');
  };

  const deleteEditPrompt = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedPrompts = editPrompts.filter((_, i) => i !== index);
    setEditPrompts(updatedPrompts);
    localStorage.setItem('aladdin_cover_edit_prompts', JSON.stringify(updatedPrompts));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAiChat || showCoverCreator || showPdfReader) {
        if (e.key === 'Escape') {
          if (showEditMenu) setShowEditMenu(false);
          else if (showPdfKeyEditor) setShowPdfKeyEditor(false);
          else {
            setShowAiChat(false);
            setShowCoverCreator(false);
            if (pdfResults) setPdfResults(null);
            else setShowPdfReader(false);
          }
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + sortedMenus.length) % sortedMenus.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % sortedMenus.length);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 4) % sortedMenus.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 4 + sortedMenus.length) % sortedMenus.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = sortedMenus[selectedIndex];
        if ((item as any).action) (item as any).action();
        else onNavigate(item.id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, onNavigate, onClose, sortedMenus.length, showAiChat, showCoverCreator, showEditMenu, showPdfReader, showPdfKeyEditor, pdfResults]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
          else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          let quality = 0.7;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (dataUrl.length > 700000 && quality > 0.1) { quality -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', quality); }
          setSelectedImage(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1500;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setCoverInputImage(canvas.toDataURL('image/jpeg', 0.85));
          setGeneratedCover(null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverGeneration = async (customPrompt?: string) => {
    const inputImage = generatedCover || coverInputImage; 
    if (!inputImage) return;
    setIsGeneratingCover(true);
    setShowEditMenu(false);
    try {
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      const [header, base64Data] = inputImage.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      const fixedPrompt = "Transform this image into a perfectly flat 2D front cover design. Remove all 3D perspective, shadows, and background elements. Display only the front face of the book as a high-resolution digital graphic, cropped exactly to its edges with no margins or frames. Set the background to a solid green color. Avoid placing any vertical lines, borders, or spine-like elements on the left or right sides of the book, and remove any light reflections, glare, or shine effects. Increase the image resolution and clarity to a clean 1K quality output, and enhance the image by correcting any blurriness or softness if detected.";
      const finalPrompt = customPrompt ? `${fixedPrompt} Additional instructions: ${customPrompt}` : fixedPrompt;
      const imageResponse = await generateWithRetry(ai, 'gemini-3-pro-image-preview', {
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Data } },
            { text: finalPrompt }
          ]
        },
        config: {
          imageConfig: { aspectRatio: "3:4", imageSize: "1K" }
        }
      });
      let foundImage = false;
      if (imageResponse.candidates && imageResponse.candidates[0] && imageResponse.candidates[0].content) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString: string = part.inlineData.data;
            setGeneratedCover(`data:image/png;base64,${base64EncodeString}`);
            foundImage = true;
            break;
          }
        }
      }
      if (!foundImage) alert("لم يتمكن النموذج من إنشاء صورة. يرجى التأكد من أن الصورة واضحة.");
    } catch (e: any) {
      console.error(e);
      let msg = "حدث خطأ أثناء المعالجة.";
      if (e.status === 429 || e.message?.includes('429') || e.message?.includes('Quota')) msg += " (تم تجاوز حدود الاستخدام، يرجى المحاولة بعد دقيقة واحدة)";
      else if (e.status === 403 || e.message?.includes('403')) msg += " (فشل الوصول: تأكد من تفعيل صلاحيات النموذج في Google AI Studio)";
      else msg += " (تحقق من اتصال الإنترنت أو مفتاح API)";
      alert(msg);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!pdfApiKey) {
      alert('يرجى إدخال مفتاح API الخاص بقارئ PDF من أيقونة المفتاح بالأعلى أولاً للمتابعة.');
      setShowPdfKeyEditor(true);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('يرجى اختيار ملف PDF صالح');
      return;
    }
    
    setIsProcessingPdf(true);
    setPdfResults(null);
    
    const readFile = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    };

    try {
      const base64Data = await readFile(file);
      const ai = new GoogleGenAI({ apiKey: pdfApiKey });
      const response = await generateWithRetry(ai, 'gemini-3-flash-preview', {
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            { text: `Extract all book items and invoice information from this document.
            Return a JSON object with exactly these keys:
            - "supplier": string (The name of the supplier if found, else "")
            - "invoiceNumber": string (The invoice number if found, else "")
            - "items": Array of objects with keys "title", "author", "category", "subCategory", "quantity" (number), "price" (number).
            Use Arabic for text fields. Return ONLY the raw JSON object string.` }
          ]
        }
      });
      const extractedText = response.text || '{}';
      const cleanJson = extractedText.replace(/```json|```/g, '').trim();
      const extractedData = JSON.parse(cleanJson);
      
      if (extractedData && Array.isArray(extractedData.items)) {
        setPdfResults({
          supplier: extractedData.supplier || '',
          invoiceNumber: extractedData.invoiceNumber || '',
          items: extractedData.items
        });
      } else if (Array.isArray(extractedData)) {
        setPdfResults({ supplier: '', invoiceNumber: '', items: extractedData });
      } else {
        alert('لم يتم العثور على بيانات كتب في الملف.');
      }
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء معالجة ملف PDF. تأكد من صحة مفتاح API ووضوح الملف.');
    } finally {
      setIsProcessingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleConfirmPdfImport = async () => {
    if (!pdfResults || (!onAddBook && !onProcessPurchase)) return;
    
    const booksToProcess = pdfResults.items;
    
    if (onProcessPurchase) {
        const items: PurchaseItem[] = booksToProcess.map(b => ({
          barcode: '', 
          title: b.title || 'صنف بدون عنوان',
          author: b.author || 'غير معروف',
          category: b.category || 'عام',
          subCategory: b.subCategory || '',
          quantityAdded: Number(b.quantity) || 1,
          purchasePrice: Number(b.price) || 0,
          sellingPrice: Number(b.price) || 0, // تم التعديل ليكون سعر البيع هو نفسه سعر الشراء
          currentStock: 0
        }));
      
      await onProcessPurchase('', pdfResults.supplier || 'مورد عام', pdfResults.invoiceNumber || 'PDF-Import', items);
    } else if (onAddBook) {
      booksToProcess.forEach(b => {
        if (b.title) {
          onAddBook({
            id: crypto.randomUUID(),
            title: b.title,
            author: b.author || 'غير معروف',
            category: b.category || 'عام',
            subCategory: b.subCategory || '',
            quantity: Number(b.quantity) || 1,
            price: Number(b.price) || 0,
            addedAt: Date.now(),
            barcode: '',
            location: ''
          });
        }
      });
    }

    alert(`تم استخراج وإضافة ${booksToProcess.length} صنف بنجاح كفاتورة توريد!`);
    setPdfResults(null);
    setShowPdfReader(false);
  };

  const handleRemovePdfItem = (index: number) => {
    if (!pdfResults) return;
    const updatedItems = [...pdfResults.items];
    updatedItems.splice(index, 1);
    if (updatedItems.length === 0) setPdfResults(null);
    else setPdfResults({ ...pdfResults, items: updatedItems });
  };

  const savePdfApiKey = () => {
    localStorage.setItem('ALADDIN_PDF_READER_KEY', tempPdfKey);
    setPdfApiKey(tempPdfKey);
    setShowPdfKeyEditor(false);
    alert('تم حفظ مفتاح API لقارئ PDF');
  };

  const downloadCover = () => {
    if (!generatedCover) return;
    const link = document.createElement('a');
    link.href = generatedCover;
    link.download = `cover_2d_${Date.now()}.png`;
    link.click();
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("متصفحك لا يدعم التعرف الصوتي (أو غير مدعوم في هذا الإصدار)");
      return;
    }
    // @ts-expect-error - webkitSpeechRecognition is not in window type
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { setIsListening(true); };
    recognition.onend = () => { setIsListening(false); };
    recognition.onerror = () => { setIsListening(false); };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => handleSendMessage(undefined, transcript), 500);
    };
    recognition.start();
  };

  const handleSendMessage = async (e?: React.FormEvent, directInput?: string) => {
    e?.preventDefault();
    const txt = directInput || input;
    if ((!txt.trim() && !selectedImage) || isLoading) return;
    const userMessage = txt;
    const userImage = selectedImage;
    setMessages(prev => [...prev, { role: 'user', text: userMessage, image: userImage || undefined }]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      
      // تجهيز سياق المخزن للنموذج
      const inventoryContext = books.length > 0 
        ? books.map(b => `- "${b.title}" ${b.author ? `بواسطة ${b.author}` : ''} (التصنيف: ${b.category}${b.subCategory ? `, فرعي: ${b.subCategory}` : ''}, السعر: ${b.price} د.ل, الكمية: ${b.quantity})`).join('\n')
        : "المخزن فارغ حالياً.";

      const updateSystemNameTool: FunctionDeclaration = { 
        name: 'updateSystemName', 
        description: 'تحديث اسم المكتبة أو النظام.', 
        parameters: { type: Type.OBJECT, properties: { newName: { type: Type.STRING } }, required: ['newName'] } 
      };
      
      const updateThemeTool: FunctionDeclaration = { 
        name: 'updateThemeColor', 
        description: 'تغيير لون سمة النظام.', 
        parameters: { type: Type.OBJECT, properties: { color: { type: Type.STRING } }, required: ['color'] } 
      };
      
      const updateBookTitleTool: FunctionDeclaration = { 
        name: 'updateBookTitle', 
        description: 'تعديل عنوان كتاب موجود (يدعم البحث الذكي).', 
        parameters: { type: Type.OBJECT, properties: { searchTitle: { type: Type.STRING }, newTitle: { type: Type.STRING } }, required: ['searchTitle', 'newTitle'] } 
      };
      
      const addBookTool: FunctionDeclaration = { 
        name: 'addBookToInventory', 
        description: 'إضافة كتاب جديد للمخزن.', 
        parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, author: { type: Type.STRING }, category: { type: Type.STRING }, subCategory: { type: Type.STRING }, price: { type: Type.NUMBER }, purchasePrice: { type: Type.NUMBER }, quantity: { type: Type.NUMBER } }, required: ['title', 'price'] } 
      };
      
      const navigatePageTool: FunctionDeclaration = { 
        name: 'navigateSystem', 
        description: 'التنقل بين صفحات النظام. استخدم هذا فقط إذا طلب المستخدم صراحة فتح صفحة معينة.', 
        parameters: { type: Type.OBJECT, properties: { destination: { type: Type.STRING, enum: ['sales', 'warehouse', 'history', 'suppliers', 'item_card', 'add_book', 'pdf_manager', 'settings', 'safes', 'dashboard'] } }, required: ['destination'] } 
      };
      
      const getSalesStatsTool: FunctionDeclaration = { 
        name: 'getSalesStats', 
        description: 'الحصول على إحصائيات المبيعات والأرباح.', 
        parameters: { type: Type.OBJECT, properties: {}, required: [] } 
      };

      const requestContents: any[] = [];
      if (userImage) requestContents.push({ inlineData: { mimeType: 'image/jpeg', data: userImage.split(',')[1] } });
      if (userMessage) requestContents.push({ text: userMessage });
      
      const response = await generateWithRetry(ai, 'gemini-3-flash-preview', {
        contents: { parts: requestContents },
        config: {
          tools: [{ functionDeclarations: [updateSystemNameTool, updateThemeTool, updateBookTitleTool, addBookTool, navigatePageTool, getSalesStatsTool] }],
          systemInstruction: `أنت "مساعد حجة الذكي"، مساعد ذكي متطور لإدارة النظام والمحتوى التعليمي والمكتبة.
أجب دائماً باللغة العربية بأسلوب مهني وودود.

سياق المخزن الحالي:
${inventoryContext}

مهامك:
1. الإجابة على استفسارات المستخدم حول الكتب المتوفرة في المخزن بناءً على السياق أعلاه.
2. إذا طلب المستخدم كتباً عن موضوع معين (مثل الرعب أو التاريخ)، ابحث في القائمة أعلاه وأعطه العناوين المتوفرة.
3. لا تقم بالانتقال (Navigate) إلى أي صفحة إلا إذا طلب المستخدم صراحة "افتح صفحة كذا" أو "اذهب إلى كذا".
4. إذا لم تجد الكتاب المطلوب في السياق، أخبر المستخدم بذلك بدقة بدل الانتقال لصفحة أخرى.
5. ساعد في إدارة البيانات عبر الأدوات المتاحة (Tools).`
        }
      });
      const functionCalls = response.functionCalls;
      let botResponseText = response.text || '';
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'updateSystemName' && onUpdateSystemName) {
            const args = call.args as any; onUpdateSystemName(args.newName); botResponseText = `تم تغيير اسم المكتبة إلى "${args.newName}" بنجاح.`;
          } else if (call.name === 'updateThemeColor' && onUpdateAccentColor) {
            const args = call.args as any; onUpdateAccentColor(args.color); botResponseText = `تم تغيير لون الثيم إلى "${args.color}".`;
          } else if (call.name === 'updateBookTitle' && onUpdateBook) {
            const args = call.args as any; const bookToEdit = findSmartMatch(args.searchTitle, books);
            if (bookToEdit) { onUpdateBook({ ...bookToEdit, title: args.newTitle }); botResponseText = `تم تعديل اسم الكتاب من "${bookToEdit.title}" إلى "${args.newTitle}".`; }
            else botResponseText = `عذراً، لم أتمكن من العثور على كتاب يطابق "${args.searchTitle}".`;
          } else if (call.name === 'addBookToInventory' && onAddBook) {
            const args = call.args as any; const existingBook = books.find(b => normalizeArabic(b.title).toLowerCase() === normalizeArabic(args.title).toLowerCase());
            if (existingBook) botResponseText = `⚠️ تنبيه: الكتاب "${existingBook.title}" موجود بالفعل في المخزن.`;
            else {
              if (args.subCategory && onAddSubCategory && subCategories) {
                const exists = subCategories.find(sc => sc.name === args.subCategory);
                if (!exists) onAddSubCategory({ id: crypto.randomUUID(), name: args.subCategory, addedAt: Date.now() });
              }
              const newBook: Book = { id: crypto.randomUUID(), title: args.title, author: args.author || 'غير معروف', category: args.category || 'عام', subCategory: args.subCategory || '', price: args.price || 0, purchasePrice: args.purchasePrice || 0, quantity: args.quantity || 1, addedAt: Date.now(), barcode: '', location: '', image: userImage || '' };
              onAddBook(newBook); botResponseText = `✅ تم إضافة الكتاب "${newBook.title}" إلى المخزن.`;
            }
          } else if (call.name === 'navigateSystem' && onNavigate) {
            const args = call.args as any; let targetPage = Page.Dashboard;
            switch (args.destination) { 
              case 'sales': targetPage = Page.Sales; break; 
              case 'warehouse': targetPage = Page.Warehouse; break; 
              case 'history': targetPage = Page.SalesHistory; break; 
              case 'suppliers': targetPage = Page.Suppliers; break; 
              case 'item_card': targetPage = Page.ItemCard; break; 
              case 'add_book': targetPage = Page.AddBook; break;
              case 'pdf_manager': targetPage = Page.PdfManager; break;
              case 'settings': targetPage = Page.Settings; break;
              case 'safes': targetPage = Page.SellersSafes; break;
              case 'dashboard': targetPage = Page.Dashboard; break;
            }
            onNavigate(targetPage); botResponseText = `جاري نقلك إلى ${args.destination}...`;
          } else if (call.name === 'getSalesStats') {
            const totalRevenue = salesHistory.reduce((sum, sale) => sum + (sale.netAmount || 0), 0);
            botResponseText = `إجمالي المبيعات (تاريخي): ${totalRevenue.toLocaleString()} د.ل`;
          }
        }
      }
      if (!botResponseText) botResponseText = "تم تنفيذ طلبك.";
      setMessages(prev => [...prev, { role: 'model', text: botResponseText }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'عذراً، حدث خطأ. يرجى الانتظار قليلاً.' }]);
    } finally { setIsLoading(false); }
  };

  const pdfTotalValue = useMemo(() => {
    if (!pdfResults) return 0;
    return pdfResults.items.reduce((sum, book) => sum + (Number(book.quantity || 0) * Number(book.price || 0)), 0);
  }, [pdfResults]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" dir="rtl">
      <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className={`relative w-full max-w-[64rem] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 ${isDarkMode ? 'bg-zinc-950' : 'bg-white'}`}>
        
        {/* PDF Reader Overlay */}
        {showPdfReader && (
          <div className={`absolute inset-0 z-[100] flex flex-col backdrop-blur-xl animate-in slide-in-from-bottom-10 duration-300 ${isDarkMode ? 'bg-zinc-900/95' : 'bg-white/95'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-700 rounded-xl text-white"><FileText size={24} /></div>
                <div>
                  <h3 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>قارء PDF الذكي</h3>
                  <p className="text-xs text-gray-500 font-bold">استخراج بيانات الكتب والفواتير آلياً</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPdfKeyEditor(true)} className={`p-3 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-amber-400 hover:bg-zinc-700' : 'bg-gray-100 text-amber-600 hover:bg-gray-200'}`} title="المفتاح الخاص بالخدمة">
                  <Key size={20} />
                </button>
                <button onClick={() => { if(pdfResults) setPdfResults(null); else setShowPdfReader(false); }} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              {!pdfResults ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center mb-8 shadow-inner ${isDarkMode ? 'bg-zinc-800 text-red-500' : 'bg-red-50 text-red-600'}`}>
                    {isProcessingPdf ? <Loader2 size={64} className="animate-spin text-red-500" /> : <FileUp size={64} />}
                  </div>
                  <h4 className={`text-2xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{isProcessingPdf ? 'جاري تحليل الملف...' : 'ارفع ملف PDF يحتوي على قائمة الكتب'}</h4>
                  <p className="text-gray-400 font-bold text-sm max-w-md mb-10 leading-relaxed">
                    سيقوم النظام بقراءة العناوين، المورد، رقم الفاتورة، والكميات والأسعار آلياً ومراجعتها معك قبل الإضافة.
                  </p>
                  
                  <input type="file" ref={pdfInputRef} accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                  <button 
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isProcessingPdf}
                    className={`px-12 py-5 rounded-[22px] font-black text-white shadow-2xl transition-all flex items-center gap-4 ${isProcessingPdf ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-700 hover:bg-red-600 active:scale-95 shadow-red-700/30'}`}
                  >
                    {isProcessingPdf ? <Loader2 className="animate-spin" size={24}/> : <FileUp size={24}/>}
                    <span>{isProcessingPdf ? 'يرجى الانتظار...' : 'اختر ملف PDF للكتابعة'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between mb-6 px-4">
                    <h4 className={`font-black text-xl flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <CheckCircle2 className="text-emerald-500" /> مراجعة {pdfResults.items.length} صنف مستخرج
                    </h4>
                    <button onClick={() => setPdfResults(null)} className="text-sm font-black text-red-500 hover:underline">إلغاء واستبدال الملف</button>
                  </div>

                  {/* Invoice Metadata Header */}
                  <div className={`mb-6 p-6 rounded-[32px] border grid grid-cols-1 md:grid-cols-2 gap-6 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest"><Truck size={14} className="text-blue-500" /> اسم المورد</label>
                      <input 
                        type="text" 
                        value={pdfResults.supplier} 
                        onChange={(e) => setPdfResults({...pdfResults, supplier: e.target.value})}
                        placeholder="أدخل اسم المورد..."
                        className={`w-full px-5 py-3 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest"><Hash size={14} className="text-blue-500" /> رقم الفاتورة</label>
                      <input 
                        type="text" 
                        value={pdfResults.invoiceNumber} 
                        onChange={(e) => setPdfResults({...pdfResults, invoiceNumber: e.target.value})}
                        placeholder="أدخل رقم الفاتورة..."
                        className={`w-full px-5 py-3 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-900 shadow-sm'}`}
                      />
                    </div>
                  </div>
                  
                  <div className={`flex-1 overflow-y-auto custom-scrollbar rounded-3xl border mb-6 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-100'}`}>
                    <table className="w-full text-right border-collapse">
                      <thead className={`sticky top-0 z-10 border-b shadow-sm ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-50'}`}>
                        <tr className="text-gray-400 text-[10px] font-black uppercase">
                          <th className="px-6 py-4">اسم الكتاب</th>
                          <th className="px-6 py-4">المؤلف</th>
                          <th className="px-6 py-4">التصنيف</th>
                          <th className="px-6 py-4">التصنيف الفرعي</th>
                          <th className="px-6 py-4 text-center">الكمية</th>
                          <th className="px-6 py-4 text-center">سعر الشراء</th>
                          <th className="px-6 py-4 text-center">الإجمالي</th>
                          <th className="px-6 py-4 text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
                        {pdfResults.items.map((item, idx) => (
                          <tr key={idx} className={`transition-all ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-emerald-50/20'}`}>
                            <td className={`px-6 py-4 font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.title}</td>
                            <td className="px-6 py-4 text-xs font-bold text-gray-500">{item.author || 'غير معروف'}</td>
                            <td className="px-6 py-4 text-xs font-bold text-emerald-600">{item.category || 'عام'}</td>
                            <td className="px-6 py-4 text-xs font-bold text-blue-500">{item.subCategory || '-'}</td>
                            <td className="px-6 py-4 text-center font-black text-sm">{item.quantity}</td>
                            <td className="px-6 py-4 text-center font-black text-sm text-emerald-600">{Number(item.price).toLocaleString()}</td>
                            <td className={`px-6 py-4 text-center font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{(Number(item.quantity || 0) * Number(item.price || 0)).toLocaleString()}</td>
                            <td className="px-6 py-4 text-center">
                              <button onClick={() => handleRemovePdfItem(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-all">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={`p-6 rounded-[32px] border flex flex-col md:flex-row items-center justify-between gap-6 ${isDarkMode ? 'bg-zinc-800 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي الفاتورة</p>
                        <p className={`text-3xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{pdfTotalValue.toLocaleString()} <span className="text-sm">د.ل</span></p>
                      </div>
                      <div className="h-10 w-px bg-gray-200 dark:bg-white/10" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الأصناف للمراجعة</p>
                        <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pdfResults.items.length}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleConfirmPdfImport}
                      className="px-10 py-4 rounded-2xl bg-emerald-600 text-white font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all flex items-center gap-3"
                    >
                      <Save size={20} /> إدخال وحفظ الكل في المخزن
                    </button>
                  </div>
                </div>
              )}

              {showPdfKeyEditor && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                  <div className={`w-full max-w-md rounded-[32px] shadow-2xl p-8 border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg"><Key size={24}/></div>
                       <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>مفتاح API خاص بالقارئ</h3>
                    </div>
                    <div className="relative">
                      <input 
                        type={isKeyVisible ? "text" : "password"}
                        value={tempPdfKey}
                        onChange={(e) => setTempPdfKey(e.target.value)}
                        placeholder="ألصق مفتاح Gemini هنا..."
                        className={`w-full px-4 py-4 rounded-2xl border-2 outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-black border-white/10 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-100 text-emerald-900 focus:border-indigo-500'}`}
                      />
                      <button 
                        type="button"
                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors"
                      >
                        {isKeyVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <div className="flex gap-3 mt-8">
                       <button onClick={savePdfApiKey} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black shadow-lg">حفظ التغييرات</button>
                       <button onClick={() => setShowPdfKeyEditor(false)} className={`px-6 py-3 rounded-xl font-bold ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>إلغاء</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cover Creator Overlay */}
        {showCoverCreator && (
          <div className={`absolute inset-0 z-[100] flex flex-col backdrop-blur-xl animate-in slide-in-from-bottom-10 duration-300 ${isDarkMode ? 'bg-zinc-900/95' : 'bg-white/95'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-600 rounded-xl text-white"><ImageIcon size={24} /></div>
                <div>
                  <h3 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>منشء الغلاف (2D Flat)</h3>
                  <p className="text-xs text-gray-500 font-bold">تحويل صور الكتب ثلاثية الأبعاد إلى أغلفة مسطحة</p>
                </div>
              </div>
              <button onClick={() => setShowCoverCreator(false)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-500'}`}><X size={24} /></button>
            </div>
            <div className="flex-1 p-8 flex flex-col md:flex-row gap-8 overflow-y-auto custom-scrollbar relative">
              <div className={`flex-1 flex flex-col gap-4 p-6 rounded-[32px] border-2 border-dashed ${isDarkMode ? 'border-zinc-700 bg-zinc-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <h4 className={`text-center font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>الصورة الأصلية</h4>
                <input type="file" ref={coverInputRef} accept="image/*" className="hidden" onChange={handleCoverImageSelect} />
                <div onClick={() => coverInputRef.current?.click()} className={`flex-1 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden relative group ${!coverInputImage ? (isDarkMode ? 'bg-zinc-900' : 'bg-white') : ''}`}>
                  {coverInputImage ? <img src={coverInputImage} className="w-full h-full object-contain" alt="Original" /> : <div className="text-center p-6 opacity-50"><ImageIcon size={48} className="mx-auto mb-2" /><p className="text-sm font-bold">اضغط لرفع صورة الكتاب</p></div>}
                  {coverInputImage && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">تغيير الصورة</div>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleCoverGeneration()} disabled={!coverInputImage || isGeneratingCover} className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg flex items-center justify-center gap-2 transition-all ${!coverInputImage || isGeneratingCover ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/30'}`}>{isGeneratingCover ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}{isGeneratingCover ? 'جاري المعالجة...' : 'تحويل لغلاف 2D'}</button>
                  <button onClick={() => setShowEditMenu(true)} disabled={!coverInputImage || isGeneratingCover} className={`px-4 py-4 rounded-2xl font-black text-sm transition-all border-2 ${!coverInputImage || isGeneratingCover ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-transparent' : (isDarkMode ? 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50')}`}><Edit size={20} /></button>
                </div>
              </div>
              <div className={`flex-1 flex flex-col gap-4 p-6 rounded-[32px] border-2 ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-gray-100 bg-white'}`}>
                <h4 className={`text-center font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>النتيجة (Flat 2D)</h4>
                <div className={`flex-1 rounded-2xl flex items-center justify-center overflow-hidden border ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>{generatedCover ? <img src={generatedCover} className="w-full h-full object-cover" alt="Generated Cover" /> : <div className="text-center p-6 opacity-30"><Sparkles size={48} className="mx-auto mb-2" /><p className="text-sm font-bold">ستظهر النتيجة هنا</p></div>}</div>
                <button onClick={downloadCover} disabled={!generatedCover} className={`w-full py-4 rounded-2xl font-black text-white shadow-lg flex items-center justify-center gap-2 transition-all ${!generatedCover ? (isDarkMode ? 'bg-zinc-800 text-zinc-600' : 'bg-gray-300 text-gray-500') + ' cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'}`}><Download size={20} />تحميل الغلاف</button>
              </div>
              {showEditMenu && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                  <div className={`w-full max-w-lg rounded-[32px] shadow-2xl p-6 flex flex-col gap-4 border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className="flex justify-between items-center border-b pb-4 border-gray-100 dark:border-white/10"><h3 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>قائمة التعديلات</h3><button onClick={() => setShowEditMenu(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-gray-500">إضافة نص تعديل جديد</label><div className="flex gap-2"><input type="text" value={newEditPrompt} onChange={(e) => setNewEditPrompt(e.target.value)} placeholder="مثلاً: اجعل الخلفية زرقاء، أضف إطار ذهبي..." className={`flex-1 px-4 py-3 rounded-xl border-2 outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white focus:border-pink-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-pink-500'}`} /><button onClick={saveEditPrompt} className="p-3 bg-pink-600 text-white rounded-xl hover:bg-pink-500 transition-all shadow-lg shadow-pink-600/20"><Save size={20} /></button></div></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px] space-y-2 p-1">{editPrompts.length === 0 && <p className="text-center text-gray-400 text-xs font-bold py-8">لا توجد تعديلات محفوظة.</p>}{editPrompts.map((prompt, idx) => (<div key={idx} onClick={() => handleCoverGeneration(prompt)} className={`group p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${isDarkMode ? 'bg-zinc-800 border-zinc-700 hover:border-pink-500' : 'bg-gray-50 border-gray-200 hover:border-pink-500'}`}><span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{prompt}</span><div className="flex items-center gap-2"><span className="text-[10px] font-black text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">تطبيق</span><button onClick={(e) => deleteEditPrompt(idx, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash size={16} /></button></div></div>))}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Overlay */}
        {showAiChat && (
          <div className={`absolute inset-0 z-[100] flex flex-col backdrop-blur-xl animate-in slide-in-from-bottom-10 duration-300 ${isDarkMode ? 'bg-zinc-900/95' : 'bg-white/95'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl text-white"><Sparkles size={24} /></div><div><h3 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>المساعد الذكي (G-Brain)</h3><p className="text-xs text-gray-500 font-bold">بحث متصل بالإنترنت، تصنيف ذكي، وتحليل المحتوى</p></div></div>
              <button onClick={() => setShowAiChat(false)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-500'}`}><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.length === 0 && (<div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4"><Bot size={64} className="text-gray-400" /><p className="text-sm font-bold text-gray-500 leading-relaxed">مرحباً! أنا مساعد علاء الدين المتصل بالإنترنت.<br/>• ارفع صورة كتاب وسأجلب لك معلومات دقيقة.<br/>• اطلب كتباً مشابهة في "المحتوى" وليس العنوان فقط.<br/>• استعلم عن المبيعات والمخزون صوتياً.</p></div>)}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-2 rounded-full shrink-0 ${msg.role === 'user' ? (isDarkMode ? 'bg-zinc-700' : 'bg-gray-200') : (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100')}`}>{msg.role === 'user' ? <User size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} /> : <Sparkles size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />}</div>
                  <div className={`flex flex-col gap-2 max-w-[80%]`}>
                    {msg.image && <div className={`w-32 h-32 rounded-2xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}><img src={msg.image} className="w-full h-full object-cover" alt="User upload" /></div>}
                    <div className={`px-4 py-3 rounded-2xl text-sm font-bold whitespace-pre-wrap ${msg.role === 'user' ? (isDarkMode ? 'bg-zinc-800 text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tr-none') : (isDarkMode ? 'bg-blue-600/10 text-blue-100 rounded-tl-none border border-blue-500/20' : 'bg-blue-50 text-blue-900 rounded-tl-none border border-blue-100')}`}>
                      {msg.role === 'model' ? (<div>{msg.text.split('\n').map((line, i) => { const cleanLine = line.trim(); if (!cleanLine) return null; if (cleanLine.startsWith('IMAGE_LINK:')) { const url = cleanLine.replace('IMAGE_LINK:', '').trim(); return (<div key={i} className={`mt-2 mb-2 p-2 rounded-xl flex items-center justify-between gap-3 overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-200'}`}><div className="flex-1 truncate text-[10px] text-blue-500 font-mono select-all" dir="ltr">{url}</div><button onClick={() => navigator.clipboard.writeText(url)} className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 shrink-0 transition-all" title="نسخ الرابط"><Copy size={12} /><span className="text-[9px] font-black">نسخ</span></button></div>); } const isTitle = /^\d+[.)]\s/.test(cleanLine) || cleanLine.startsWith('##') || (cleanLine.startsWith('**') && cleanLine.length < 50); const isLocation = cleanLine.includes('الموقع:') || cleanLine.includes('المكان:') || cleanLine.includes('الرف:') || cleanLine.includes('Location:'); const displayText = cleanLine.replace(/[*#]/g, '').trim(); if (isTitle) return (<div key={i} className={`text-xl font-black mt-6 mb-2 border-b pb-1 ${isDarkMode ? 'text-emerald-400 border-emerald-500/20' : 'text-emerald-600 border-emerald-100'}`}>{displayText}</div>); if (isLocation) return (<div key={i} className={`text-sm font-extrabold mb-2 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-500'}`}>{displayText}</div>); return (<div key={i} className="text-xs font-bold opacity-80 mb-1 leading-relaxed">{displayText}</div>); })}</div>) : msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && <div className="flex items-center gap-2 text-gray-400 text-xs font-bold mr-10"><Loader2 size={14} className="animate-spin" />جاري البحث في الإنترنت وتحليل البيانات...</div>}
              <div ref={messagesEndRef} />
            </div>
            <div className={`p-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
              {selectedImage && (<div className={`mb-2 flex items-center gap-2 px-3 py-2 rounded-xl w-fit ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}><ImageIcon size={14} className="text-blue-500" /><span className={`text-xs font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>تم اختيار صورة</span><button onClick={() => setSelectedImage(null)} className="text-red-500 hover:text-red-700 ml-2"><X size={14} /></button></div>)}
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-3 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="رفع صورة (فهرسة أو بحث)"><Paperclip size={20} /></button>
                <input autoFocus type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="اسأل، ارفع صورة كتاب، أو اطلب توصيات..." className={`flex-1 px-4 py-3.5 rounded-xl outline-none font-bold shadow-sm transition-all ${isDarkMode ? 'bg-zinc-800 text-white focus:bg-zinc-700' : 'bg-gray-50 text-gray-900 focus:bg-white border-2 border-transparent focus:border-blue-500'}`} />
                <button type="button" onClick={startListening} className={`p-3.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : (isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`} title="تحدث صوتياً"><Mic size={20} /></button>
                <button type="submit" disabled={(!input.trim() && !selectedImage) || isLoading} className={`p-3.5 rounded-xl transition-all ${(!input.trim() && !selectedImage) ? 'opacity-30 cursor-not-allowed bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30'}`}><Send size={18} /></button>
              </form>
            </div>
          </div>
        )}

        <div className={`px-10 py-8 text-white flex justify-between items-center transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-emerald-900'}`}>
          <div><h3 className="text-2xl font-black flex items-center gap-3"><div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(var(--accent-400-rgb), 0.2)' }}><Search size={24} className="text-emerald-400" /></div>القائمة السريعة</h3></div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><X size={24} /></button>
        </div>

        <div ref={dragContainerRef} onPointerMove={handlePointerMove} className={`p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-50/50'}`}>
          {sortedMenus.map((menu, index) => {
            const isSelected = index === selectedIndex;
            const isDraggingThis = activeDragItem === menu.label;
            return (
              <button
                key={menu.label}
                data-menu-item={menu.label}
                onPointerDown={(e) => handlePointerDown(menu.label, e)}
                onClick={() => { 
                  if (!isDragging) {
                    if ((menu as any).action) {
                      (menu as any).action();
                    } else {
                      onNavigate(menu.id);
                    }
                  }
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`group p-6 rounded-[1.75rem] border-2 shadow-sm transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden select-none touch-none ${isDraggingThis ? 'scale-110 z-50 shadow-2xl ring-4 ring-emerald-500 ring-opacity-50 cursor-grabbing ' + (isDarkMode ? 'bg-zinc-800' : 'bg-white') : isSelected ? (isDarkMode ? 'bg-zinc-800 border-zinc-700 ring-2 ring-white/5 shadow-lg scale-[1.02]' : 'bg-white border-gray-200 shadow-xl scale-[1.02]') : (isDarkMode ? 'bg-zinc-800 border-white/5 shadow-none' : 'bg-white border-gray-100 shadow-none')}`}
              >
                <div className={`p-4 ${menu.color} text-white rounded-2xl shadow-lg mb-4 transition-transform ${isSelected && !isDraggingThis ? 'scale-110' : 'group-hover:scale-110'}`}><menu.icon size={28} /></div>
                <h4 className={`font-black text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{menu.label}</h4>
                <p className="text-gray-400 text-[0.625rem] mt-1 font-bold leading-relaxed">{menu.desc}</p>
                <div className={`absolute -bottom-4 -left-4 text-white/5 transition-opacity ${isSelected ? 'opacity-20' : 'opacity-0'}`}><menu.icon size={100} /></div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickMenu;