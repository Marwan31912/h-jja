
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  FileText, Plus, Trash2, Search, ExternalLink, X, FileUp, Loader2, 
  ChevronLeft, Folder, Book, GraduationCap, Gavel, Stethoscope, Briefcase, 
  LayoutGrid, Trash, Edit2, Check, Printer, Image as ImageIcon,
  School, Library, Atom, Calculator, BookOpen, PenTool, Settings,
  ShoppingCart, Heart, Zap, Database, Download, Upload
} from 'lucide-react';
import { PdfFile, PdfCategory } from '../types';
import { PDFDocument } from 'pdf-lib';

interface PdfManagerProps {
  isDarkMode?: boolean;
}

const PDF_ICONS = [
  { name: 'folder', Icon: Folder },
  { name: 'book', Icon: Book },
  { name: 'graduation', Icon: GraduationCap },
  { name: 'school', Icon: School },
  { name: 'library', Icon: Library },
  { name: 'gavel', Icon: Gavel },
  { name: 'medical', Icon: Stethoscope },
  { name: 'briefcase', Icon: Briefcase },
  { name: 'atom', Icon: Atom },
  { name: 'calculator', Icon: Calculator },
  { name: 'writing', Icon: PenTool },
  { name: 'openbook', Icon: BookOpen },
];

const GOVERNMENT_BOOKS_NAME = "كتب حكومية";
const SCHOOL_GRADES = [
  { name: "أول ابتدائي", icon: "writing" },
  { name: "ثاني ابتدائي", icon: "writing" },
  { name: "ثالث ابتدائي", icon: "writing" },
  { name: "رابع ابتدائي", icon: "writing" },
  { name: "خامس ابتدائي", icon: "writing" },
  { name: "سادس ابتدائي", icon: "writing" },
  { name: "أول إعدادي", icon: "calculator" },
  { name: "ثاني إعدادي", icon: "calculator" },
  { name: "ثالث إعدادي", icon: "calculator" },
  { name: "أول ثانوي", icon: "graduation" },
  { name: "ثاني ثانوي علمي", icon: "graduation" },
  { name: "ثاني ثانوي أدبي", icon: "graduation" },
  { name: "ثالث ثانوي علمي", icon: "graduation" },
  { name: "ثالث ثانوي أدبي", icon: "graduation" }
];

interface PdfCoverImageProps {
  pdf: PdfFile;
  getAutoCover: (name: string, listId?: string) => string | null;
  className?: string;
}

const PdfCoverImage: React.FC<PdfCoverImageProps> = ({ pdf, getAutoCover, className = '' }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdf.coverBlob) {
      const url = URL.createObjectURL(pdf.coverBlob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
    }
  }, [pdf.coverBlob]);

  const autoCover = getAutoCover(pdf.name, pdf.listId);
  const srcUrl = blobUrl || autoCover;

  if (srcUrl) {
    return (
      <img
        src={srcUrl}
        alt={pdf.name}
        className={className}
        referrerPolicy="no-referrer"
      />
    );
  }

  return null;
};

const PdfManager: React.FC<PdfManagerProps> = ({ isDarkMode }) => {
  const [categories, setCategories] = useState<PdfCategory[]>([]);
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<PdfFile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PdfCategory | null>(null);
  const [newList, setNewList] = useState({ name: '', icon: 'folder', iconImage: '', isIconPinned: false, isBookLayout: false, isQuickAccess: false });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showQuickPreview, setShowQuickPreview] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newPageCount, setNewPageCount] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'price' | 'author' | null>(null);
  const [editTempName, setEditTempName] = useState('');
  const [editTempPrice, setEditTempPrice] = useState('');
  const [editTempAuthor, setEditTempAuthor] = useState('');
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);

  const [autoCovers, setAutoCovers] = useState<{ id: string; folderName: string; coverBase64: string }[]>(() => {
    try {
      const saved = localStorage.getItem('aladdin_auto_covers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error reading aladdin_auto_covers from localStorage", e);
    }
    return [];
  });
  const [showAutoCoversSettings, setShowAutoCoversSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'covers' | 'pricing' | 'backup'>('covers');
  const [backupProgress, setBackupProgress] = useState<string | null>(null);
  const backupImportInputRef = useRef<HTMLInputElement>(null);
  const [simplexPrice, setSimplexPrice] = useState<string>(() => {
    return localStorage.getItem('aladdin_simplex_price') || '0.05';
  });
  const [duplexPrice, setDuplexPrice] = useState<string>(() => {
    return localStorage.getItem('aladdin_duplex_price') || '0.03';
  });
  const [printMode, setPrintMode] = useState<'simplex' | 'duplex' | 'custom'>(() => {
    return (localStorage.getItem('aladdin_wishlist_print_mode') as 'simplex' | 'duplex' | 'custom') || 'custom';
  });
  const [newAutoCoverFolderName, setNewAutoCoverFolderName] = useState('');
  const [newAutoCoverBase64, setNewAutoCoverBase64] = useState('');
  const autoCoverInputRef = useRef<HTMLInputElement>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleName, setEditingRuleName] = useState<string>('');
  const [simulationPages, setSimulationPages] = useState<string>('50');
  const [showImportCoverModal, setShowImportCoverModal] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('aladdin_auto_covers', JSON.stringify(autoCovers));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  }, [autoCovers]);

  useEffect(() => {
    localStorage.setItem('aladdin_simplex_price', simplexPrice);
  }, [simplexPrice]);

  useEffect(() => {
    localStorage.setItem('aladdin_duplex_price', duplexPrice);
  }, [duplexPrice]);

  useEffect(() => {
    localStorage.setItem('aladdin_wishlist_print_mode', printMode);
  }, [printMode]);

  const [wishlist, setWishlist] = useState<PdfFile[]>(() => {
    try {
      const saved = localStorage.getItem('aladdin_pdf_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error reading aladdin_pdf_wishlist from localStorage", e);
    }
    return [];
  });
  const [showWishlist, setShowWishlist] = useState(false);
  const [wishlistSearchTerm, setWishlistSearchTerm] = useState('');
  const [isDoubleSided, setIsDoubleSided] = useState<boolean>(() => {
    return localStorage.getItem('aladdin_wishlist_double_sided') === 'true';
  });
  const [pagePriceInput, setPagePriceInput] = useState<string>(() => {
    const isDouble = localStorage.getItem('aladdin_wishlist_double_sided') === 'true';
    const sPrice = localStorage.getItem('aladdin_simplex_price') || '0.05';
    const dPrice = localStorage.getItem('aladdin_duplex_price') || '0.03';
    return isDouble ? dPrice : sPrice;
  });
  const [additionalPriceInput, setAdditionalPriceInput] = useState<string>(() => {
    return localStorage.getItem('aladdin_wishlist_additional_price') || '0';
  });
  const [isAdditionalPriceEnabled, setIsAdditionalPriceEnabled] = useState<boolean>(() => {
    return localStorage.getItem('aladdin_wishlist_additional_enabled') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('aladdin_wishlist_double_sided', String(isDoubleSided));
  }, [isDoubleSided]);

  useEffect(() => {
    const priceStr = isDoubleSided ? duplexPrice : simplexPrice;
    setPagePriceInput(priceStr);
  }, [isDoubleSided, simplexPrice, duplexPrice]);

  const [tempPdfBlobs, setTempPdfBlobs] = useState<Record<string, Blob>>({});
  const [isTempUploading, setIsTempUploading] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const temporaryFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const serializable = wishlist.map(({ blob, coverBlob, ...rest }) => rest);
      localStorage.setItem('aladdin_pdf_wishlist', JSON.stringify(serializable));
    } catch (e) {
      console.warn("Failed to write aladdin_pdf_wishlist to localStorage:", e);
    }
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('aladdin_wishlist_page_price', pagePriceInput);
  }, [pagePriceInput]);

  useEffect(() => {
    localStorage.setItem('aladdin_wishlist_additional_price', additionalPriceInput);
  }, [additionalPriceInput]);

  useEffect(() => {
    localStorage.setItem('aladdin_wishlist_additional_enabled', String(isAdditionalPriceEnabled));
  }, [isAdditionalPriceEnabled]);

  const toggleWishlist = (file: PdfFile) => {
    const exists = wishlist.some(item => item.id === file.id);
    if (exists) {
      setWishlist(prev => prev.filter(item => item.id !== file.id));
      setTempPdfBlobs(prev => {
        const next = { ...prev };
        delete next[file.id];
        return next;
      });
    } else {
      const { blob, coverBlob, ...serializable } = file;
      setWishlist(prev => [...prev, serializable as PdfFile]);
    }
  };

  const getFullPdfFile = useCallback((item: PdfFile) => {
    const found = pdfs.find(p => p.id === item.id);
    if (found) return found;
    if (tempPdfBlobs[item.id]) {
      return { ...item, blob: tempPdfBlobs[item.id] } as PdfFile;
    }
    return item;
  }, [pdfs, tempPdfBlobs]);

  const getAutoCover = useCallback((fileName: string, listId?: string) => {
    if (listId) {
      let current = categories.find(c => c.id === listId);
      let check = current;
      while (check) {
        if (check.isIconPinned && check.iconImage) {
          return check.iconImage;
        }
        if (!check.parentId) break;
        const nextCheck = categories.find(c => c.id === check.parentId);
        if (!nextCheck) break;
        check = nextCheck;
      }
      if (current && current.iconImage) {
        return current.iconImage;
      }
    }

    const match = autoCovers.find(rule => 
      rule.folderName && fileName.toLowerCase().includes(rule.folderName.toLowerCase())
    );
    if (match) return match.coverBase64;

    return null;
  }, [categories, autoCovers]);

  const handleUploadTemporaryFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsTempUploading(true);
    
    const newItems: PdfFile[] = [];
    const newBlobs: Record<string, Blob> = {};
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let pageCount = 0;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
      } catch (err: any) {
        console.warn("Error counting pages for temporary file", file.name, err);
      }
      
      const tempId = 'temp_' + crypto.randomUUID();
      newBlobs[tempId] = file;
      
      newItems.push({
        id: tempId,
        name: file.name,
        size: file.size,
        addedAt: Date.now(),
        pageCount: pageCount,
        isTemporary: true,
        listId: 'wishlist'
      });
    }
    
    setTempPdfBlobs(prev => ({ ...prev, ...newBlobs }));
    setWishlist(prev => [
      ...prev,
      ...newItems
    ]);
    
    setIsTempUploading(false);
    if (temporaryFileInputRef.current) {
      temporaryFileInputRef.current.value = '';
    }
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const convertBase64ToBlob = (base64Data: string): Blob => {
    const parts = base64Data.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  };

  const exportDatabase = async () => {
    try {
      setBackupProgress("جاري جلب البيانات من قاعدة البيانات المحلية...");
      const request = indexedDB.open("AladdinPdfs", 2);
      request.onsuccess = async (e: any) => {
        const db = e.target.result;
        
        const tx = db.transaction(["categories", "files"], "readonly");
        const catStore = tx.objectStore("categories");
        const fileStore = tx.objectStore("files");
        
        const catRequest = catStore.getAll();
        const fileRequest = fileStore.getAll();
        
        catRequest.onsuccess = async () => {
          const categoriesData = catRequest.result || [];
          
          fileRequest.onsuccess = async () => {
            const filesData = fileRequest.result || [];
            
            setBackupProgress(`جاري معالجة وتحويل ${filesData.length} ملف PDF... (قد يستغرق ذلك ثوانٍ)`);
            
            const processedFiles = [];
            for (let i = 0; i < filesData.length; i++) {
              const fileItem = filesData[i];
              setBackupProgress(`جاري معالجة وتحويل الملفات (${i + 1} من أصل ${filesData.length})...`);
              
              let blobBase64: string | undefined = undefined;
              let coverBlobBase64: string | undefined = undefined;
              
              if (fileItem.blob) {
                try {
                  blobBase64 = await convertBlobToBase64(fileItem.blob);
                } catch (err) {
                  console.error("Failed to convert file blob:", err);
                }
              }
              if (fileItem.coverBlob) {
                try {
                  if (typeof fileItem.coverBlob === 'string') {
                    coverBlobBase64 = fileItem.coverBlob;
                  } else {
                    coverBlobBase64 = await convertBlobToBase64(fileItem.coverBlob);
                  }
                } catch (err) {
                  console.error("Failed to convert cover blob:", err);
                }
              }
              
              const { blob, coverBlob, ...rest } = fileItem;
              processedFiles.push({
                ...rest,
                blobBase64,
                coverBlobBase64
              });
            }
            
            const backupPayload = {
              version: 1,
              exportedAt: Date.now(),
              categories: categoriesData,
              files: processedFiles,
              localStorage: {
                aladdin_simplex_price: localStorage.getItem('aladdin_simplex_price'),
                aladdin_duplex_price: localStorage.getItem('aladdin_duplex_price'),
                gov_price_per_page: localStorage.getItem('gov_price_per_page'),
                gov_fixed_addition: localStorage.getItem('gov_fixed_addition'),
                aladdin_auto_covers: localStorage.getItem('aladdin_auto_covers')
              }
            };
            
            setBackupProgress("جاري توليد ملف النسخة الاحتياطية وتنزيله...");
            const jsonString = JSON.stringify(backupPayload);
            const blobOutput = new Blob([jsonString], { type: "application/json" });
            const downloadUrl = URL.createObjectURL(blobOutput);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            
            const dateStr = new Date().toISOString().slice(0, 10);
            a.download = `aladdin_pdf_library_backup_${dateStr}.json`;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(downloadUrl);
              setBackupProgress(null);
            }, 1000);
          };
        };
      };
    } catch (err: any) {
      console.error("Error backing up library:", err);
      alert("حدث خطأ أثناء تصدير النسخة الاحتياطية: " + err.message);
      setBackupProgress(null);
    }
  };

  const importDatabase = async (file: File) => {
    try {
      setBackupProgress("جاري قراءة ملف النسخة الاحتياطية...");
      
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data || !Array.isArray(data.categories) || !Array.isArray(data.files)) {
            alert("ملف غير صالح أو غير مدعوم!");
            setBackupProgress(null);
            return;
          }
          
          setBackupProgress(`تم العثور على ${data.categories.length} قسماً و ${data.files.length} ملفاً. جاري الحفظ وتنشيط الإعدادات...`);
          
          if (data.localStorage) {
            Object.keys(data.localStorage).forEach(key => {
              if (data.localStorage[key] !== null && data.localStorage[key] !== undefined) {
                localStorage.setItem(key, data.localStorage[key]);
              }
            });
            
            if (data.localStorage.aladdin_simplex_price) {
              setSimplexPrice(data.localStorage.aladdin_simplex_price);
            }
            if (data.localStorage.aladdin_duplex_price) {
              setDuplexPrice(data.localStorage.aladdin_duplex_price);
            }
            if (data.localStorage.gov_price_per_page) {
              setPricePerPage(parseFloat(data.localStorage.gov_price_per_page) || 0.125);
            }
            if (data.localStorage.gov_fixed_addition) {
              setFixedAddition(parseFloat(data.localStorage.gov_fixed_addition) || 1);
            }
            if (data.localStorage.aladdin_auto_covers) {
              try {
                const parsed = JSON.parse(data.localStorage.aladdin_auto_covers);
                if (Array.isArray(parsed)) setAutoCovers(parsed);
              } catch (err) {
                console.error(err);
              }
            }
          }
          
          const dbRequest = indexedDB.open("AladdinPdfs", 2);
          dbRequest.onsuccess = async (ev: any) => {
            const db = ev.target.result;
            
            const tx = db.transaction(["categories", "files"], "readwrite");
            const catStore = tx.objectStore("categories");
            const fileStore = tx.objectStore("files");
            
            catStore.clear();
            fileStore.clear();
            
            data.categories.forEach((cat: any) => {
              catStore.put(cat);
            });
            
            for (let i = 0; i < data.files.length; i++) {
              setBackupProgress(`جاري استيراد وتحويل الملفات (${i + 1} من أصل ${data.files.length})...`);
              const fileItem = data.files[i];
              
              const fileToStore: any = { ...fileItem };
              delete fileToStore.blobBase64;
              delete fileToStore.coverBlobBase64;
              
              if (fileItem.blobBase64) {
                try {
                  fileToStore.blob = convertBase64ToBlob(fileItem.blobBase64);
                } catch (err) {
                  console.error("Failed to restore blob:", err);
                }
              }
              if (fileItem.coverBlobBase64) {
                fileToStore.coverBlob = fileItem.coverBlobBase64;
              }
              
              fileStore.put(fileToStore);
            }
            
            tx.oncomplete = () => {
              setBackupProgress(null);
              loadData();
              alert("تم استيراد النسخة الاحتياطية واستعادتها بنجاح!");
            };
            
            tx.onerror = (errEvent: any) => {
              console.error("Transaction error importing:", errEvent);
              alert("حدث خطأ في قاعدة البيانات أثناء الاستيراد");
              setBackupProgress(null);
            };
          };
        } catch (jsonErr: any) {
          console.error("Failed parsing backup json:", jsonErr);
          alert("ملف النسخة الاحتياطية تالف أو غير صالح!");
          setBackupProgress(null);
        }
      };
      reader.onerror = () => {
        alert("فشل قراءة الملف!");
        setBackupProgress(null);
      };
      reader.readAsText(file);
    } catch (err: any) {
      console.error("Error importing backup:", err);
      alert("حدث خطأ أثناء الاستيراد: " + err.message);
      setBackupProgress(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  
  const loadData = useCallback(() => {
    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      
      // تحميل التصنيفات
      const txCat = db.transaction("categories", "readonly");
      const storeCat = txCat.objectStore("categories");
      const getAllCat = storeCat.getAll();
      getAllCat.onsuccess = () => setCategories(getAllCat.result || []);

      // تحميل الملفات
      const txFiles = db.transaction("files", "readonly");
      const storeFiles = txFiles.objectStore("files");
      const getAllFiles = storeFiles.getAll();
      getAllFiles.onsuccess = () => setPdfs(getAllFiles.result || []);
    };
  }, []);

  const isGovCategory = useCallback((catId: string | null) => {
    if (!catId) return false;
    if (catId === 'gov_books_main') return true;
    let current = categories.find(c => c.id === catId);
    while (current) {
      if (current.parentId === 'gov_books_main') return true;
      if (!current.parentId) break;
      const pid = current.parentId;
      current = categories.find(c => c.id === pid);
    }
    return false;
  }, [categories]);

  // دالة لجلب الأيقونة الفعالة للمجلد مع تتبع المجلد الأب المثبت أيقونته
  const getEffectiveCategoryIcon = useCallback((catId: string | undefined): { iconName: string; iconImage?: string; isIconPinned?: boolean; isBookLayout?: boolean } | null => {
    if (!catId) return null;
    let current = categories.find(c => c.id === catId);
    if (!current) return null;

    let check = current;
    while (check) {
      if (check.isIconPinned) {
        return { iconName: check.iconName, iconImage: check.iconImage, isIconPinned: true, isBookLayout: check.isBookLayout };
      }
      if (!check.parentId) break;
      const nextCheck = categories.find(c => c.id === check.parentId);
      if (!nextCheck) break;
      check = nextCheck;
    }

    return { iconName: current.iconName, iconImage: current.iconImage, isIconPinned: current.isIconPinned, isBookLayout: current.isBookLayout };
  }, [categories]);

  const closeQuickPreview = () => {
    setShowQuickPreview(false);
  };

  // تهيئة قاعدة البيانات
  useEffect(() => {
    const request = indexedDB.open("AladdinPdfs", 2);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      // Initialize Government Books structure
      const initGovBooks = async () => {
        const dbRequest = indexedDB.open("AladdinPdfs", 2);
        dbRequest.onsuccess = (ev: any) => {
          const db = ev.target.result;
          const tx = db.transaction("categories", "readwrite");
          const store = tx.objectStore("categories");
          const getAll = store.getAll();
          
          getAll.onsuccess = () => {
            const existingCats = getAll.result as PdfCategory[];
            let govMain = existingCats.find(c => c.name === GOVERNMENT_BOOKS_NAME);
            const now = Date.now();
            
            // 1. Ensure Main Category exists
            if (!govMain) {
              govMain = {
                id: 'gov_books_main',
                name: GOVERNMENT_BOOKS_NAME,
                iconName: 'graduation',
                addedAt: now - 1000000 // Ensure it stays at the top or recognizable order
              };
              store.put(govMain);
            } else if (govMain.parentId) {
              // Fix if it somehow got a parentId
              delete govMain.parentId;
              store.put(govMain);
            }

            // Delete old "متوسط" categories if present
            existingCats.forEach(c => {
               if (c.parentId === govMain?.id && c.name.includes("متوسط")) {
                  store.delete(c.id);
               }
            });

            // 2. Ensure all SCHOOL_GRADES exist under govMain and are ordered correctly
            SCHOOL_GRADES.forEach((grade, index) => {
              const gradeExists = existingCats.find(c => c.name === grade.name && c.parentId === govMain?.id);
              const targetAddedAt = now + (index * 60000);
              
              if (!gradeExists) {
                store.put({
                  id: crypto.randomUUID(),
                  name: grade.name,
                  iconName: grade.icon,
                  parentId: govMain?.id,
                  addedAt: targetAddedAt
                });
              } else {
                // Update existing to ensure correct order and icons
                let updated = false;
                if (gradeExists.iconName !== grade.icon) {
                  gradeExists.iconName = grade.icon;
                  updated = true;
                }
                // Update addedAt to force correct sorting order
                if (gradeExists.addedAt !== targetAddedAt) {
                  gradeExists.addedAt = targetAddedAt;
                  updated = true;
                }
                if (updated) store.put(gradeExists);
              }
            });
            
            tx.oncomplete = () => loadData();
          };
          
          tx.onerror = () => loadData();
        };
        dbRequest.onerror = () => loadData();
      };
      initGovBooks();
    };
  }, [loadData]);

  const handleCreateList = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newList.name) return;

    const now = Date.now();
    const category: PdfCategory = editingCategory ? {
      ...editingCategory,
      name: newList.name,
      iconName: newList.icon,
      iconImage: newList.iconImage || undefined,
      isIconPinned: newList.isIconPinned,
      isBookLayout: newList.isBookLayout,
      isQuickAccess: newList.isQuickAccess
    } : {
      id: crypto.randomUUID(),
      name: newList.name,
      iconName: newList.icon,
      iconImage: newList.iconImage || undefined,
      addedAt: now,
      parentId: selectedParentId || undefined,
      isIconPinned: newList.isIconPinned,
      isBookLayout: newList.isBookLayout,
      isQuickAccess: newList.isQuickAccess
    };

    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = (ev: any) => {
      const db = ev.target.result;
      const tx = db.transaction("categories", "readwrite");
      const store = tx.objectStore("categories");
      
      if (editingCategory) {
        store.put(category);
      } else {
        store.add(category);
      }
      
      tx.oncomplete = () => {
        loadData();
        setShowAddList(false);
        setEditingCategory(null);
        setNewList({ name: '', icon: 'folder', iconImage: '', isIconPinned: false, isBookLayout: false, isQuickAccess: false });
      };
    };
  }, [newList, loadData, editingCategory, selectedParentId]);

  const handleEditList = (cat: PdfCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setNewList({
      name: cat.name,
      icon: cat.iconName,
      iconImage: cat.iconImage || '',
      isIconPinned: !!cat.isIconPinned,
      isBookLayout: !!cat.isBookLayout,
      isQuickAccess: !!cat.isQuickAccess
    });
    setShowAddList(true);
  };

  const handleDeleteList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("هل أنت متأكد من حذف هذه القائمة وجميع الملفات المرتبطة بها؟")) return;

    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = (ev: any) => {
      const db = ev.target.result;
      const tx = db.transaction(["categories", "files"], "readwrite");
      const catStore = tx.objectStore("categories");
      const fileStore = tx.objectStore("files");

      // Find subcategories if this is a parent
      const subCats = categories.filter(c => c.parentId === id);
      const allCatIdsToDelete = [id, ...subCats.map(c => c.id)];

      allCatIdsToDelete.forEach(catId => {
        catStore.delete(catId);
        pdfs.filter(p => p.listId === catId).forEach(p => fileStore.delete(p.id));
      });

      tx.oncomplete = () => {
        loadData();
        if (selectedListId === id || subCats.some(s => s.id === selectedListId)) setSelectedListId(null);
        if (selectedParentId === id) setSelectedParentId(null);
      };
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesInput = e.target.files;
    if (!filesInput || filesInput.length === 0) return;

    setIsUploading(true);
    
    const filesList = Array.from(filesInput);
    const pdfFiles = filesList.filter(f => f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = async (ev: any) => {
      const db = ev.target.result;
      
      // 1. Get existing categories for reference
      const txRead = db.transaction("categories", "readonly");
      const existingCats: PdfCategory[] = await new Promise((resolve) => {
        const req = txRead.objectStore("categories").getAll();
        req.onsuccess = () => resolve(req.result || []);
      });

      const categoriesToCreate: PdfCategory[] = [];
      const categoryMap = new Map<string, string>(); // full path string -> category id

      // Map existing categories to help find matches
      // This is tricky because we need the full path structure
      // For now we'll match by name and parentId
      
      const findOrCreateCategory = (name: string, parentId?: string, fullPath?: string): string => {
        if (fullPath && categoryMap.has(fullPath)) return categoryMap.get(fullPath)!;

        // Try to find in existing
        const existing = existingCats.find(c => c.name === name && c.parentId === parentId) || 
                         categoriesToCreate.find(c => c.name === name && c.parentId === parentId);
        
        if (existing) {
          if (fullPath) categoryMap.set(fullPath, existing.id);
          return existing.id;
        }

        // Create new
        const newId = crypto.randomUUID();
        const newCat: PdfCategory = {
          id: newId,
          name: name,
          iconName: 'folder',
          addedAt: Date.now(),
          parentId: parentId
        };
        categoriesToCreate.push(newCat);
        if (fullPath) categoryMap.set(fullPath, newId);
        return newId;
      };

      const filesToProcess: PdfFile[] = [];

      for (const file of pdfFiles) {
        // Handle webkitRelativePath for directory structure
        // @ts-expect-error - webkitRelativePath is non-standard
        const relPath: string = file.webkitRelativePath || '';
        let targetListId = selectedListId;

        if (relPath && relPath.includes('/')) {
          const parts = relPath.split('/');
          // إذا كان المسار يحتوي على مجلدات، نتجاهل الجزء الأول (المجلد الذي اختاره المستخدم)
          // لنبدأ مباشرة بالمجلدات الفرعية والملفات التي بداخله
          const folderParts = parts.slice(1, parts.length - 1);
          
          let currentParentId = selectedListId || selectedParentId || undefined;
          let currentPath = "";

          for (const folderName of folderParts) {
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
            currentParentId = findOrCreateCategory(folderName, currentParentId, currentPath);
          }
          targetListId = currentParentId || null;
        }

        if (!targetListId) continue;

        // Check for duplicates in the specific list
        const isDuplicate = pdfs.some(p => p.listId === targetListId && p.name === file.name && p.size === file.size);
        if (isDuplicate) continue;

        let pageCount = 0;
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer.slice(0, 5));
          const header = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
          if (!header.startsWith('%PDF-')) {
            throw new Error('الملف لا يبدأ بترويسة PDF صالحة (No PDF header found)');
          }
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } catch (err: any) {
          console.warn("Error counting pages for", file.name, err.message || err);
        }

        let price = 0;
        // Find category info (either from existing or newly created)
        const catInfo = existingCats.find(c => c.id === targetListId) || categoriesToCreate.find(c => c.id === targetListId);
        
        let belongsToGov = false;
        let checkCat = catInfo;
        const allAvailableCats = [...existingCats, ...categoriesToCreate];
        while (checkCat) {
          if (checkCat.parentId === 'gov_books_main' || checkCat.id === 'gov_books_main') {
            belongsToGov = true;
            break;
          }
          if (!checkCat.parentId) break;
          const pid = checkCat.parentId;
          checkCat = allAvailableCats.find(c => c.id === pid);
        }

        if (belongsToGov && pageCount > 0) {
          price = (pageCount * pricePerPage) + fixedAddition;
        }

        const originalUserPath = (file as any).path || '';
        let finalPath = (file as any).path;
        
        // If in electron, save to the local library folder
        // @ts-expect-error - electronAPI injected by preload
        if (window.electronAPI) {
          try {
            const buffer = await file.arrayBuffer();
            const result = await window.electronAPI.savePdfToLibrary({
              name: file.name,
              buffer: buffer
            });
            if (result && result.success) {
              finalPath = result.path;
            }
          } catch (err) {
            console.error("Failed to save to local library:", err);
          }
        }

        filesToProcess.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          addedAt: Date.now(),
          listId: targetListId,
          blob: file,
          pageCount: pageCount,
          price: price > 0 ? price : undefined,
          originalPath: originalUserPath
        });
      }

      // 2. Perform write transaction
      if (categoriesToCreate.length === 0 && filesToProcess.length === 0) {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
        return;
      }

      const txWrite = db.transaction(["categories", "files"], "readwrite");
      const catStore = txWrite.objectStore("categories");
      const fileStore = txWrite.objectStore("files");

      categoriesToCreate.forEach(c => catStore.put(c));
      filesToProcess.forEach(f => fileStore.put(f));

      txWrite.oncomplete = () => {
        setIsUploading(false);
        loadData();
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
      };

      txWrite.onerror = (err: any) => {
        console.error("Upload transaction error:", err);
        setIsUploading(false);
      };
    };
    
    request.onerror = (err) => {
      console.error("IndexedDB error:", err);
      setIsUploading(false);
    };
  };

  const deletePdf = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("حذف الملف؟")) return;

    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(id);
      tx.oncomplete = () => {
        loadData();
        if (selectedFile?.id === id) {
          setSelectedFile(null);
          setPreviewUrl(null);
        }
      };
    };
  };

  const handleRename = useCallback((id: string, currentName: string, currentPrice?: number, currentPageCount?: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (renamingId === id) {
      if (!newName.trim()) {
        setRenamingId(null);
        return;
      }
      
      const request = indexedDB.open("AladdinPdfs", 2);
      request.onsuccess = (ev: any) => {
        const db = ev.target.result;
        const tx = db.transaction("files", "readwrite");
        const store = tx.objectStore("files");
        
        const finalName = newName.trim().endsWith('.pdf') ? newName.trim() : newName.trim() + '.pdf';
        const finalPrice = parseFloat(newPrice) || 0;
        const finalPageCount = parseInt(newPageCount) || 0;

        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const data = getReq.result;
          if (data) {
            data.name = finalName;
            data.price = finalPrice;
            data.pageCount = finalPageCount;
            store.put(data);
          }
        };

        tx.oncomplete = () => {
          loadData();
          setRenamingId(null);
          setNewName('');
          setNewPrice('');
          setNewPageCount('');
          if (selectedFile?.id === id) {
            setSelectedFile(prev => prev ? { ...prev, name: finalName, price: finalPrice, pageCount: finalPageCount } : null);
          }
        };
      };
    } else {
      setRenamingId(id);
      setNewName(currentName.replace('.pdf', ''));
      setNewPrice(currentPrice?.toString() || '');
      setNewPageCount(currentPageCount?.toString() || '');
    }
  }, [renamingId, newName, newPrice, newPageCount, loadData, selectedFile]);

  const handleSaveFileField = useCallback((field: 'name' | 'price' | 'author', value: any) => {
    if (!selectedFile) return;
    const fileId = selectedFile.id;
    
    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = (ev: any) => {
      const db = ev.target.result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      
      const getReq = store.get(fileId);
      getReq.onsuccess = () => {
        const data = getReq.result;
        if (data) {
          if (field === 'name') {
            const trimmed = value.trim();
            data.name = trimmed.endsWith('.pdf') ? trimmed : trimmed + '.pdf';
          } else if (field === 'price') {
            data.price = parseFloat(value) || 0;
          } else if (field === 'author') {
            data.author = value.trim();
          }
          store.put(data);
        }
      };

      tx.oncomplete = () => {
        loadData();
        setSelectedFile(prev => {
          if (!prev || prev.id !== fileId) return prev;
          if (field === 'name') {
            const trimmed = value.trim();
            return { ...prev, name: trimmed.endsWith('.pdf') ? trimmed : trimmed + '.pdf' };
          } else if (field === 'price') {
            return { ...prev, price: parseFloat(value) || 0 };
          } else if (field === 'author') {
            return { ...prev, author: value.trim() };
          }
          return prev;
        });
        setEditingField(null);
      };
    };
  }, [selectedFile, loadData]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFile) return;

    try {
      const base64 = await convertBlobToBase64(file);
      const request = indexedDB.open("AladdinPdfs", 2);
      request.onsuccess = (ev: any) => {
        const db = ev.target.result;
        const tx = db.transaction("files", "readwrite");
        const store = tx.objectStore("files");

        const getReq = store.get(selectedFile.id);
        getReq.onsuccess = () => {
          const data = getReq.result;
          if (data) {
            data.coverBlob = base64;
            store.put(data);
          }
        };

        tx.oncomplete = () => {
          loadData();
          setSelectedFile(prev => prev ? { ...prev, coverBlob: base64 } : null);
          if (coverInputRef.current) coverInputRef.current.value = '';
        };
      };
    } catch (err) {
      console.error("Failed to convert cover image to Base64:", err);
    }
  };

  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  };

  const handleImportCoverSelect = (base64: string) => {
    if (!selectedFile) return;
    try {
      const request = indexedDB.open("AladdinPdfs", 2);
      request.onsuccess = (ev: any) => {
        const db = ev.target.result;
        const tx = db.transaction("files", "readwrite");
        const store = tx.objectStore("files");

        const getReq = store.get(selectedFile.id);
        getReq.onsuccess = () => {
          const data = getReq.result;
          if (data) {
            data.coverBlob = base64;
            store.put(data);
          }
        };

        tx.oncomplete = () => {
          loadData();
          setSelectedFile(prev => prev ? { ...prev, coverBlob: base64 } : null);
          setShowImportCoverModal(false);
          setImportSearchTerm('');
        };
      };
    } catch (err) {
      console.error("Failed to save cover image:", err);
    }
  };

  const handlePrint = (coverInput: Blob | string | undefined) => {
    if (!coverInput) return;
    if (coverInput instanceof Blob) {
      const url = URL.createObjectURL(coverInput);
      const win = window.open(url);
      if (win) {
        win.onload = () => {
          win.print();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
      }
    } else if (typeof coverInput === 'string') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>طباعة الغلاف</title>
              <style>
                @page { size: A4 portrait; margin: 0; }
                body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: white; }
                img { max-width: 100%; max-height: 100%; object-fit: contain; width: 100%; height: 100%; }
              </style>
            </head>
            <body>
              <img src="${coverInput}" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  const handleSelectFile = useCallback((pdf: PdfFile) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(pdf);
    if (pdf.blob) {
      const url = URL.createObjectURL(pdf.blob);
      setPreviewUrl(url);
      setShowDetails(true);
    }
  }, [previewUrl]);

  // دالة لتسجيل تاريخ فتح الملف وتحديثه في المتصفح وقاعدة البيانات IndexedDB
  const registerFileOpen = (pdf: PdfFile) => {
    const openedTime = Date.now();
    
    // تحديث الحالة فوراً في الصفحة الحالية
    setPdfs(prev => prev.map(p => p.id === pdf.id ? { ...p, lastOpenedAt: openedTime } : p));
    setWishlist(prev => prev.map(p => p.id === pdf.id ? { ...p, lastOpenedAt: openedTime } : p));

    // تحديث البيانات في قاعدة البيانات IndexedDB
    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      
      const getReq = store.get(pdf.id);
      getReq.onsuccess = () => {
        const data = getReq.result;
        if (data) {
          data.lastOpenedAt = openedTime;
          store.put(data);
        } else {
          store.put({ ...pdf, lastOpenedAt: openedTime });
        }
      };
      
      tx.oncomplete = () => {
        loadData();
      };
    };
  };

  // Helper function to extract ArrayBuffer from PdfFile blob safely
  const getArrayBufferFromPdfBlob = async (pdf: PdfFile): Promise<ArrayBuffer | null> => {
    try {
      if (pdf.blob) {
        if (pdf.blob instanceof Blob) {
          return await pdf.blob.arrayBuffer();
        } else if (pdf.blob instanceof ArrayBuffer) {
          return pdf.blob;
        } else if ((pdf.blob as any).buffer instanceof ArrayBuffer) {
          return (pdf.blob as any).buffer;
        }
      }
      if ((pdf as any).blobBase64 && typeof (pdf as any).blobBase64 === 'string') {
        const blob = convertBase64ToBlob((pdf as any).blobBase64);
        return await blob.arrayBuffer();
      }
    } catch (err) {
      console.error("Failed to extract ArrayBuffer for PDF:", pdf.name, err);
    }
    return null;
  };

  // Helper function to update originalPath of a PDF in state and IndexedDB
  const updatePdfOriginalPath = (pdfId: string, newPath: string) => {
    setPdfs(prev => prev.map(p => p.id === pdfId ? { ...p, originalPath: newPath } : p));
    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const getReq = store.get(pdfId);
      getReq.onsuccess = () => {
        const data = getReq.result;
        if (data) {
          data.originalPath = newPath;
          store.put(data);
        }
      };
    };
  };

  // Helper function to open PDF externally or in browser
  const openPdfExternally = async (pdf: PdfFile) => {
    registerFileOpen(pdf);
    try {
      // @ts-expect-error - electronAPI is injected by preload script
      if (window.electronAPI) {
        // 1. Try opening by direct path if valid
        if (pdf.originalPath && window.electronAPI.openFile) {
          const result = await window.electronAPI.openFile(pdf.originalPath);
          if (result && result.success) return;
        }

        // 2. Try opening by name in local app library folder
        if (window.electronAPI.getPdfPath) {
          const libPath = await window.electronAPI.getPdfPath(pdf.name);
          if (libPath && window.electronAPI.openFile) {
            const result = await window.electronAPI.openFile(libPath);
            if (result && result.success) {
              updatePdfOriginalPath(pdf.id, libPath);
              return;
            }
          }
        }

        // 3. Fallback: Save stored blob to app library and open
        const buffer = await getArrayBufferFromPdfBlob(pdf);
        if (buffer) {
          if (window.electronAPI.savePdfToLibrary) {
            const saveRes = await window.electronAPI.savePdfToLibrary({ name: pdf.name, buffer });
            if (saveRes && saveRes.success && saveRes.path) {
              updatePdfOriginalPath(pdf.id, saveRes.path);
              await window.electronAPI.openFile(saveRes.path);
              return;
            }
          }
          if (window.electronAPI.saveAndOpenPdf) {
            await window.electronAPI.saveAndOpenPdf({ 
              name: pdf.name, 
              buffer: buffer 
            });
            return;
          }
        }
      }
      
      // Browser fallback
      if (pdf.blob) {
        const url = URL.createObjectURL(pdf.blob);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      console.error("Failed to open PDF:", err);
    }
  };

  // Helper function to show PDF in folder (auto-regenerates if file on disk was deleted)
  const showPdfInFolder = async (pdf: PdfFile) => {
    try {
      // @ts-expect-error - electronAPI is injected by preload script
      if (window.electronAPI) {
        // 1. Try direct original path
        if (pdf.originalPath && window.electronAPI.showItemInFolder) {
          const result = await window.electronAPI.showItemInFolder(pdf.originalPath);
          if (result && result.success) return;
        }

        // 2. Check local app library folder
        if (window.electronAPI.getPdfPath) {
          const libPath = await window.electronAPI.getPdfPath(pdf.name);
          if (libPath && window.electronAPI.showItemInFolder) {
            const result = await window.electronAPI.showItemInFolder(libPath);
            if (result && result.success) {
              updatePdfOriginalPath(pdf.id, libPath);
              return;
            }
          }
        }

        // 3. If file on disk was deleted/moved, regenerate copy in app library from stored blob!
        const buffer = await getArrayBufferFromPdfBlob(pdf);
        if (buffer && window.electronAPI.savePdfToLibrary) {
          const res = await window.electronAPI.savePdfToLibrary({ name: pdf.name, buffer });
          if (res && res.success && res.path) {
            updatePdfOriginalPath(pdf.id, res.path);
            if (window.electronAPI.showItemInFolder) {
              await window.electronAPI.showItemInFolder(res.path);
              return;
            }
          }
        }

        alert("الملف الأصلي لم يعد موجودًا في موقعه، ولم نتمكن من استخراج بياناته.");
      } else {
        // Web fallback: download file
        if (pdf.blob) {
          const url = URL.createObjectURL(pdf.blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = pdf.name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }
    } catch (err) {
      console.error("Failed to show file in folder:", err);
    }
  };

  // Open PDF folder directly
  const handleOpenPdfFolder = async () => {
    try {
      // @ts-expect-error - electronAPI injected
      if (window.electronAPI && window.electronAPI.openPdfFolder) {
        await window.electronAPI.openPdfFolder();
      } else {
        alert("خاصية فتح المجلد تعمل بشكل متكامل في نسخة سطح المكتب.");
      }
    } catch (err) {
      console.error("Error opening PDF folder:", err);
    }
  };

  // Bulk Re-create and Sync ALL PDFs in DB to Application Folder
  const syncAndExportPdfsToLibrary = async () => {
    try {
      setBackupProgress("جاري جلب كافة ملفات الـ PDF المخزنة وإعادة إنشائها وتصديرها إلى مجلد التطبيق...");
      
      const request = indexedDB.open("AladdinPdfs", 2);
      request.onsuccess = async (e: any) => {
        const db = e.target.result;
        const tx = db.transaction("files", "readwrite");
        const store = tx.objectStore("files");
        const getAllReq = store.getAll();

        getAllReq.onsuccess = async () => {
          const allFiles: PdfFile[] = getAllReq.result || [];
          if (allFiles.length === 0) {
            alert("لا توجد ملفات PDF مخزنة في التطبيق حالياً.");
            setBackupProgress(null);
            return;
          }

          let successCount = 0;

          for (let i = 0; i < allFiles.length; i++) {
            const item = allFiles[i];
            setBackupProgress(`جاري إعادة إنشاء وتحديث الملفات (${i + 1} من أصل ${allFiles.length}): ${item.name}...`);

            const buffer = await getArrayBufferFromPdfBlob(item);
            if (buffer) {
              // @ts-expect-error - electronAPI injected
              if (window.electronAPI && window.electronAPI.savePdfToLibrary) {
                const saveRes = await window.electronAPI.savePdfToLibrary({
                  name: item.name,
                  buffer: buffer
                });
                if (saveRes && saveRes.success && saveRes.path) {
                  item.originalPath = saveRes.path;
                  const writeTx = db.transaction("files", "readwrite");
                  writeTx.objectStore("files").put(item);
                  successCount++;
                }
              } else {
                // Web browser fallback download
                const blobObj = new Blob([buffer], { type: 'application/pdf' });
                const downloadUrl = URL.createObjectURL(blobObj);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = item.name;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(downloadUrl);
                }, 400);
                successCount++;
              }
            }
          }

          setBackupProgress(null);
          loadData();

          if (confirm(`تمت إعادة إنشاء وتصدير ${successCount} ملفاً من أصل ${allFiles.length} إلى مجلد التطبيق بنجاح!\n\nهل تريد فتح مجلد تحفظ الملفات الآن؟`)) {
            handleOpenPdfFolder();
          }
        };
      };
    } catch (err: any) {
      console.error("Error syncing and exporting PDFs:", err);
      alert("حدث خطأ أثناء تصدير الملفات: " + err.message);
      setBackupProgress(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredPdfs = useMemo(() => {
    return pdfs.filter(p => 
      p.listId === selectedListId && 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (p.author && p.author.toLowerCase().includes(searchTerm.toLowerCase())))
    ).sort((a, b) => b.addedAt - a.addedAt);
  }, [pdfs, selectedListId, searchTerm]);

  const globalFilteredPdfs = useMemo(() => {
    if (!globalSearch.trim()) return [];
    return pdfs.filter(p => 
      p.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (p.author && p.author.toLowerCase().includes(globalSearch.toLowerCase()))
    ).sort((a, b) => b.addedAt - a.addedAt);
  }, [pdfs, globalSearch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!selectedListId && !globalSearch.trim()) {
        // We are browsing categories/folders
        const rootCats = categories.filter(c => !c.parentId).sort((a, b) => a.addedAt - b.addedAt);
        const subCats = selectedParentId ? categories.filter(c => c.parentId === selectedParentId).sort((a, b) => a.addedAt - b.addedAt) : [];
        const activeCategories = selectedParentId ? subCats : rootCats;

        if (activeCategories.length === 0) return;

        const currentIndex = focusedCategoryId ? activeCategories.findIndex(c => c.id === focusedCategoryId) : -1;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % activeCategories.length;
          setFocusedCategoryId(activeCategories[nextIndex].id);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = currentIndex === -1 ? activeCategories.length - 1 : (currentIndex - 1 + activeCategories.length) % activeCategories.length;
          setFocusedCategoryId(activeCategories[prevIndex].id);
        } else if (e.key === 'Enter') {
          if (focusedCategoryId) {
            e.preventDefault();
            const focusedCat = categories.find(c => c.id === focusedCategoryId);
            if (focusedCat) {
              const hasChildren = categories.some(c => c.parentId === focusedCat.id);
              if (hasChildren) {
                setSelectedParentId(focusedCat.id);
                setFocusedCategoryId(null);
              } else {
                setSelectedListId(focusedCat.id);
                setFocusedCategoryId(null);
              }
            }
          }
        }
      } else {
        // We are browsing files (either search results or list view)
        const activeList = globalSearch.trim() ? globalFilteredPdfs : filteredPdfs;
        if (activeList.length === 0) return;

        const currentIndex = selectedFile ? activeList.findIndex(p => p.id === selectedFile.id) : -1;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % activeList.length;
          const nextFile = activeList[nextIndex];
          
          if (showDetails) {
            handleSelectFile(nextFile);
          } else {
            setSelectedFile(nextFile);
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = currentIndex === -1 ? activeList.length - 1 : (currentIndex - 1 + activeList.length) % activeList.length;
          const prevFile = activeList[prevIndex];
          
          if (showDetails) {
            handleSelectFile(prevFile);
          } else {
            setSelectedFile(prevFile);
          }
        } else if (e.key === 'Enter') {
          if (selectedFile) {
            e.preventDefault();
            if (globalSearch.trim()) {
              setSelectedListId(selectedFile.listId);
              handleSelectFile(selectedFile);
            } else if (!showDetails) {
              handleSelectFile(selectedFile);
            }
          }
        } else if (e.key === 'Escape') {
          setShowDetails(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, filteredPdfs, globalFilteredPdfs, globalSearch, handleSelectFile, showDetails, selectedListId, categories, selectedParentId, focusedCategoryId]);

  const [pricePerPage, setPricePerPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gov_price_per_page');
      return saved ? parseFloat(saved) : 0.125;
    } catch (e) {
      console.warn("Failed to read gov_price_per_page from localStorage:", e);
      return 0.125;
    }
  });
  const [fixedAddition, setFixedAddition] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gov_fixed_addition');
      return saved ? parseFloat(saved) : 1;
    } catch (e) {
      console.warn("Failed to read gov_fixed_addition from localStorage:", e);
      return 1;
    }
  });

  // Persistence for pricing settings - removed useEffect since initialization is handled in useState

  const updateGovPrices = useCallback((ppp: number, fixed: number, showLoading = false) => {
    if (showLoading) {
      setIsUpdatingPrices(true);
    }
    const request = indexedDB.open("AladdinPdfs", 2);
    request.onsuccess = (ev: any) => {
      const db = ev.target.result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");

      pdfs.forEach(pdf => {
        if (pdf.listId && isGovCategory(pdf.listId) && pdf.pageCount) {
          const newPrice = (pdf.pageCount * ppp) + fixed;
          
          if (pdf.price !== newPrice) {
            const updatedPdf = { ...pdf, price: newPrice };
            store.put(updatedPdf);
          }
        }
      });

      tx.oncomplete = () => {
        loadData();
        if (showLoading) {
          setTimeout(() => {
            setIsUpdatingPrices(false);
          }, 800);
        }
      };

      tx.onerror = () => {
        if (showLoading) {
          setIsUpdatingPrices(false);
        }
      };
    };
    request.onerror = () => {
      if (showLoading) {
        setIsUpdatingPrices(false);
      }
    };
  }, [categories, pdfs, loadData, isGovCategory]);

  const handlePricePerPageChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setPricePerPage(num);
    try {
      localStorage.setItem('gov_price_per_page', val);
    } catch (e) {
      console.warn("Failed to set gov_price_per_page in localStorage:", e);
    }
  };

  const handleFixedAdditionChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setFixedAddition(num);
    try {
      localStorage.setItem('gov_fixed_addition', val);
    } catch (e) {
      console.warn("Failed to set gov_fixed_addition in localStorage:", e);
    }
  };

  const currentList = categories.find(c => c.id === selectedListId);

  // عرض الواجهة الرئيسية (القوائم)
  if (!selectedListId) {
    const rootCategories = categories.filter(c => !c.parentId).sort((a, b) => a.addedAt - b.addedAt);
    const subCategories = selectedParentId ? categories.filter(c => c.parentId === selectedParentId).sort((a, b) => a.addedAt - b.addedAt) : [];
    const parentCategory = categories.find(c => c.id === selectedParentId);

    return (
      <div className="h-full flex flex-col animate-in fade-in duration-500 text-right" dir="rtl">
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center gap-4">
            {false && <div 
              onClick={() => setSelectedParentId(null)}
              className={`p-3 bg-emerald-600 text-white rounded-2xl shadow-lg cursor-pointer hover:bg-emerald-700 transition-all`}
              title="الرئيسية"
            >
              <LayoutGrid size={24} />
            </div>}
            
            {selectedParentId && (
              <button 
                onClick={() => setSelectedParentId(parentCategory?.parentId || null)}
                className={`p-3 rounded-2xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 font-black text-xs md:text-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400 border border-white/5 hover:bg-zinc-700' : 'bg-white text-emerald-700 border border-gray-100 hover:bg-gray-50'}`}
              >
                <ChevronLeft size={18} className="rotate-180" />
                <span>رجوع للخلف</span>
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                {selectedParentId && (
                  <>
                    <h2 onClick={() => setSelectedParentId(null)} className={`text-2xl font-black cursor-pointer hover:text-emerald-500 transition-colors ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>مكتبة PDF</h2>
                    <ChevronLeft size={20} className="text-gray-300" />
                  </>
                )}
                <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                  {parentCategory ? parentCategory.name : "مكتبة PDF"}
                </h2>
              </div>
              <p className="text-gray-400 text-sm font-bold">
                {parentCategory ? `تصفح أقسام ${parentCategory.name}` : "تصفح الكتب والملفات حسب القوائم"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-center max-w-2xl px-10">
            <div className="relative w-full">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="البحث السريع في جميع القوائم..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className={`w-full pr-12 pl-4 py-3 rounded-2xl border outline-none font-bold transition-all shadow-sm ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-emerald-500' : 'bg-white border-gray-100 text-emerald-900 focus:border-blue-500'}`}
              />
              {globalSearch && (
                <button 
                  onClick={() => setGlobalSearch('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedListId('wishlist')}
              className={`p-3.5 rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center relative ${
                isDarkMode 
                  ? 'bg-zinc-800 text-emerald-400 border border-white/5 hover:bg-zinc-700' 
                  : 'bg-white text-emerald-700 border border-gray-100 hover:bg-gray-50'
              }`}
              title="سلة الطلبات الذكية (الكاشير)"
            >
              <ShoppingCart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md animate-bounce">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setSelectedListId('quickaccess')}
              className={`p-3.5 rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center relative ${
                selectedListId === 'quickaccess'
                  ? (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-amber-50 text-amber-700 border border-amber-200')
                  : (isDarkMode 
                      ? 'bg-zinc-800 text-emerald-400 border border-white/5 hover:bg-zinc-700' 
                      : 'bg-white text-emerald-700 border border-gray-100 hover:bg-gray-50')
              }`}
              title="الوصول السريع للمجلدات"
            >
              <Zap size={20} />
              {false && categories.filter(c => c.isQuickAccess).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md animate-pulse">
                  {categories.filter(c => c.isQuickAccess).length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setSelectedListId('settings')}
              className={`p-3.5 rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-zinc-800 text-emerald-400 border border-white/5 hover:bg-zinc-700' 
                  : 'bg-white text-emerald-700 border border-gray-100 hover:bg-gray-50'
              }`}
              title="إعدادات مكتبة الـ PDF والتسعير"
            >
              <Settings size={20} />
            </button>

            <button 
              onClick={() => setShowAddList(true)}
              className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              إنشاء قائمة جديدة
            </button>
          </div>
        </div>

        {/* New Details Screen */}
        {showDetails && selectedFile && (
          <div data-details-panel="first" className={`absolute inset-0 z-[100] flex flex-col animate-in slide-in-from-left duration-300 ${isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
            <div className={`flex items-center justify-between p-6 border-b shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowDetails(false)}
                    className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    <ChevronLeft size={24} className="rotate-180" />
                  </button>
                  <div className="text-right">
                    <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedFile.name.replace(/\.pdf$/i, '')}</h2>
                    <p className="text-gray-400 text-xs font-bold">تفاصيل الملف ومعاينته</p>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowDetails(false)}
                    className={`p-2 rounded-xl hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 transition-all`}
                  >
                    <X size={24} />
                  </button>
               </div>
            </div>

            <div className={`flex-1 flex gap-8 p-6 overflow-hidden ${isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
               {/* Right: Details */}
               <div className="w-96 flex flex-col gap-6 shrink-0 text-right details-panel-1" dir="rtl">
                  <div className={`p-8 rounded-[32px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
                     <h3 className={`text-lg font-black mb-6 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>معلومات الملف</h3>
                     
                     <div className="space-y-4 first-details-space-y">
                        {/* تعديل حقل اسم الملف */}
                        {editingField === 'name' ? (
                           <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right first-panel-name-input-row">
                              <span className="text-gray-400 font-bold text-xs">اسم الملف الجديد:</span>
                              <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    value={editTempName}
                                    onChange={(e) => setEditTempName(e.target.value)}
                                    className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                    placeholder="اسم الملف"
                                 />
                              </div>
                              <div className="flex justify-end gap-2 text-xs">
                                 <button 
                                    onClick={() => handleSaveFileField('name', editTempName)} 
                                    className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                                 >
                                    حفظ
                                 </button>
                                 <button 
                                    onClick={() => setEditingField(null)} 
                                    className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                                 >
                                    إلغاء
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                              <div className="flex flex-col text-right">
                                 <span className="text-gray-400 font-bold text-xs">اسم الملف:</span>
                                 <span className={`font-black text-sm truncate max-w-[150px] ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedFile.name.replace(/\.pdf$/i, '')}</span>
                              </div>
                              <button 
                                 onClick={() => {
                                    setEditingField('name');
                                    setEditTempName(selectedFile.name.replace(/\.pdf$/i, ''));
                                 }} 
                                 className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                              >
                                 تعديل
                              </button>
                           </div>
                        )}

                        {/* تعديل حقل السعر */}
                        {editingField === 'price' ? (
                           <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right first-panel-price-input-row">
                              <span className="text-gray-400 font-bold text-xs">السعر الجديد (بالدينار):</span>
                              <div className="flex gap-2">
                                 <input 
                                    type="number" 
                                    value={editTempPrice}
                                    onChange={(e) => setEditTempPrice(e.target.value)}
                                    className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                    placeholder="السعر"
                                 />
                              </div>
                              <div className="flex justify-end gap-2 text-xs">
                                 <button 
                                    onClick={() => handleSaveFileField('price', editTempPrice)} 
                                    className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                                 >
                                    حفظ
                                 </button>
                                 <button 
                                    onClick={() => setEditingField(null)} 
                                    className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                                 >
                                    إلغاء
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="flex justify-between items-center py-3 border-b dark:border-white/5 first-panel-price-view-row">
                              <div className="flex flex-col text-right">
                                 <span className="text-gray-400 font-bold text-xs">السعر:</span>
                                 <span className="font-black text-emerald-500 text-sm">{selectedFile.price || 0} دينار</span>
                              </div>
                              <button 
                                 onClick={() => {
                                    setEditingField('price');
                                    setEditTempPrice((selectedFile.price || 0).toString());
                                 }} 
                                 className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                              >
                                 تعديل
                              </button>
                           </div>
                        )}

                        {/* حقل اسم المؤلف وتعديله */}
                        {editingField === 'author' ? (
                           <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right first-panel-author-input-row">
                              <span className="text-gray-400 font-bold text-xs">اسم المؤلف الجديد:</span>
                              <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    value={editTempAuthor}
                                    onChange={(e) => setEditTempAuthor(e.target.value)}
                                    className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                    placeholder="اسم المؤلف"
                                 />
                              </div>
                              <div className="flex justify-end gap-2 text-xs">
                                 <button 
                                    onClick={() => handleSaveFileField('author', editTempAuthor)} 
                                    className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                                 >
                                    حفظ
                                 </button>
                                 <button 
                                    onClick={() => setEditingField(null)} 
                                    className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                                 >
                                    إلغاء
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="flex justify-between items-center py-3 border-b dark:border-white/5 first-panel-author-view-row">
                              <div className="flex flex-col text-right">
                                 <span className="text-gray-400 font-bold text-xs">المؤلف:</span>
                                 <span className={`font-black text-xs md:text-sm ${isDarkMode ? 'text-zinc-200' : 'text-emerald-950'}`}>
                                    {selectedFile.author || 'غير محدد'}
                                 </span>
                              </div>
                              <button 
                                 onClick={() => {
                                    setEditingField('author');
                                    setEditTempAuthor(selectedFile.author || '');
                                 }} 
                                 className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                              >
                                 تعديل
                              </button>
                           </div>
                        )}

                        <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                           <span className="text-gray-400 font-bold text-xs">عدد الورق:</span>
                           <span className="font-black text-sm text-blue-500">{selectedFile.pageCount || 0} صفحة</span>
                        </div>
                        {false && <div className="flex justify-between items-center py-3">
                           <span className="text-gray-400 font-bold text-xs">الحجم:</span>
                           <span className="font-black text-sm text-gray-500">{formatSize(selectedFile.size)}</span>
                        </div>}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => toggleWishlist(selectedFile)}
                      className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg ${
                        wishlist.some(item => item.id === selectedFile.id)
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                      }`}
                    >
                      <ShoppingCart size={20} />
                      {wishlist.some(item => item.id === selectedFile.id) ? 'إزالة من السلة' : 'إضافة للسلة'}
                    </button>
                    <button 
                      onClick={() => handlePrint(selectedFile.blob)}
                      className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Printer size={20} />
                      طباعة الملف
                    </button>
                    
                    <button 
                      onClick={() => openPdfExternally(selectedFile)}
                      className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <ExternalLink size={20} />
                      فتح الملف
                    </button>

                    <button 
                      onClick={() => showPdfInFolder(selectedFile)}
                      className="w-full py-4 rounded-2xl bg-amber-400 text-amber-950 font-black hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                    >
                      <Folder size={20} className="text-amber-950" />
                      فتح موقع الملف
                    </button>

                    <input 
                      type="file" 
                      ref={coverInputRef} 
                      onChange={handleCoverUpload} 
                      accept="application/pdf,image/*" 
                      className="hidden" 
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => coverInputRef.current?.click()}
                        className="py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-xs text-center"
                      >
                        <ImageIcon size={18} />
                        إضافة غلاف
                      </button>
                      <button 
                        onClick={() => setShowImportCoverModal(true)}
                        className="py-4 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-xs text-center"
                      >
                        <ImageIcon size={18} />
                        استيراد صور
                      </button>
                    </div>
                  </div>

                  {(selectedFile.coverBlob || getAutoCover(selectedFile.name, selectedFile.listId)) && (
                    <div className={`p-6 rounded-[32px] border shadow-sm bg-blue-500/10 border-blue-500/20`}>
                       <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-blue-600 text-white rounded-lg">
                                <ImageIcon size={18} />
                             </div>
                             <div className="text-right">
                                <h4 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                                  {selectedFile.coverBlob ? 'يوجد غلاف مخصص' : 'يوجد غلاف تلقائي للمجلد'}
                                </h4>
                                <p className="text-[10px] font-bold text-blue-400">طباعة الغلاف حده</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => handlePrint(selectedFile.coverBlob || getAutoCover(selectedFile.name, selectedFile.listId) || undefined)}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                            title="طباعة الغلاف"
                          >
                            <Printer size={18} />
                          </button>
                       </div>
                    </div>
                  )}

                  <div className="mt-auto">
                     <p className="text-[10px] text-gray-400 font-bold text-center">تاريخ الإضافة: {new Date(selectedFile.addedAt).toLocaleString('ar-EG')}</p>
                  </div>
               </div>

               {/* Left: Preview A4 */}
               <div className="flex-1 flex items-start justify-center overflow-auto custom-scrollbar">
                  <div className={`w-full max-w-[600px] aspect-[1/1.414] shadow-2xl rounded-sm overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-200'}`}>
                     {previewUrl ? (
                        <iframe 
                           src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                           className="w-full h-full border-none"
                           title="PDF Content"
                        />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                           <Loader2 size={48} className="animate-spin text-red-500" />
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {globalSearch.trim() ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>نتائج البحث السريع ({globalFilteredPdfs.length})</h3>
                <button 
                  onClick={() => setGlobalSearch('')}
                  className="text-sm font-bold text-blue-500 hover:underline"
                >
                  إلغاء البحث والعودة للقوائم
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {globalFilteredPdfs.map((pdf) => {
                  const cat = categories.find(c => c.id === pdf.listId);
                  const effective = getEffectiveCategoryIcon(pdf.listId);
                  const effectiveIconName = effective?.iconName || 'folder';
                  const listName = cat?.name || 'غير معروف';
                  const hasCover = pdf.coverBlob || getAutoCover(pdf.name, pdf.listId);
                  const isBookStyle = effective?.isBookLayout || !!hasCover;
                  return (
                    <div 
                      key={pdf.id}
                      onClick={() => {
                        setSelectedListId(pdf.listId);
                        handleSelectFile(pdf);
                      }}
                      className={`group p-4 rounded-2xl border shadow-md hover:shadow-xl hover:border-emerald-500 transition-all cursor-pointer flex items-center gap-4 ${
                        selectedFile?.id === pdf.id 
                          ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-500/5 shadow-lg scale-[1.01]' 
                          : (isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100')
                      }`}
                      onMouseEnter={() => setSelectedFile(pdf)}
                    >
                      <div className={
                        isBookStyle
                          ? `w-20 h-28 rounded-r-xs rounded-l-lg border flex items-center justify-center shrink-0 overflow-hidden relative shadow-md ${
                              isDarkMode 
                                ? 'bg-zinc-800 text-emerald-400 border-white/5 border-l-[6px] border-l-black/40' 
                                : 'bg-emerald-50 text-emerald-600 border-emerald-50 border-l-[6px] border-l-black/25'
                            }`
                          : `p-4 rounded-2xl shrink-0 flex items-center justify-center ${
                              (effectiveIconName === 'folder' || !effectiveIconName)
                                ? (isDarkMode ? 'bg-amber-950/30 text-amber-500' : 'bg-amber-50 text-amber-600')
                                : (isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                            } w-20 h-20`
                      }>
                        {hasCover ? (
                          <PdfCoverImage 
                            pdf={pdf} 
                            getAutoCover={getAutoCover} 
                            className="w-full h-full object-cover" 
                          />
                        ) : effective?.iconImage ? (
                          <img 
                            src={effective.iconImage} 
                            alt={listName} 
                            className={effective?.isBookLayout ? "w-full h-full object-cover" : "w-12 h-12 object-contain"} 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <FileText size={36} className={(effectiveIconName === 'folder' || !effectiveIconName) ? 'text-amber-500' : ''} />
                        )}
                        {isBookStyle && (
                          <div className="absolute left-[5px] top-0 bottom-0 w-[1px] bg-white/20 z-10" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-right" dir="rtl">
                        <h4 className={`text-sm md:text-base font-black truncate leading-tight mb-1 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`} title={pdf.name}>
                          {pdf.name.replace(/\.pdf$/i, '')}
                        </h4>
                        
                        {pdf.author && (
                          <p className={`text-xs md:text-sm font-bold mb-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-emerald-850'}`}>
                            المؤلف: <span className="font-extrabold">{pdf.author}</span>
                          </p>
                        )}
                        
                        <p className="text-[11px] md:text-xs font-bold text-gray-400">توجد في: <span className={isDarkMode ? 'text-zinc-300' : 'text-emerald-800'}>{listName}</span></p>
                        
                        {pdf.price !== undefined && pdf.price > 0 && (
                          <p className="text-xs md:text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">{pdf.price} د.ع</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {globalFilteredPdfs.length === 0 && (
                <div className="py-20 text-center opacity-30">
                  <Search size={60} className="mx-auto mb-4" />
                  <p className="text-lg font-black">لا توجد نتائج مطابقة لمصطلح البحث</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(selectedParentId ? subCategories : rootCategories).map((cat) => {
                const effective = getEffectiveCategoryIcon(cat.id);
                const effectiveIconName = effective?.iconName || 'folder';
                const IconComp = PDF_ICONS.find(i => i.name === effectiveIconName)?.Icon || Folder;
                const count = pdfs.filter(p => p.listId === cat.id).length;
                
                return (
                  <div 
                    key={cat.id}
                    onMouseEnter={() => setFocusedCategoryId(cat.id)}
                    onClick={() => {
                      // Check if it has children
                      const hasChildren = categories.some(c => c.parentId === cat.id);
                      if (hasChildren) {
                        setSelectedParentId(cat.id);
                      } else {
                        setSelectedListId(cat.id);
                      }
                    }}
                    className={`group p-8 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all cursor-pointer flex flex-col items-center text-center relative ${
                      isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'
                    } ${
                      focusedCategoryId === cat.id 
                        ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-500/5 shadow-lg scale-[1.02]' 
                        : ''
                    }`}
                  >
                    <div className={
                      effective?.isBookLayout
                        ? `w-32 h-44 mb-6 rounded-r-md rounded-l-xl border flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-110 shadow-lg ${
                            isDarkMode 
                              ? 'bg-zinc-800 text-emerald-400 border-white/10 border-l-[6px] border-l-black/40' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100 border-l-[6px] border-l-black/25'
                          }`
                        : `p-5 rounded-3xl mb-6 group-hover:scale-110 transition-transform flex items-center justify-center relative ${
                            (effectiveIconName === 'folder' || !effectiveIconName)
                              ? (isDarkMode ? 'bg-amber-950/30 text-amber-500' : 'bg-amber-50 text-amber-600')
                              : (isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                          } ${effective?.iconImage ? 'w-24 h-24' : ''}`
                    }>
                      {effective?.iconImage ? (
                        <img 
                          src={effective.iconImage} 
                          alt={cat.name} 
                          className={effective?.isBookLayout ? "w-full h-full object-cover" : "w-16 h-16 object-contain"} 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <IconComp 
                          size={effective?.isBookLayout ? 56 : 48} 
                          strokeWidth={1.5} 
                          className={(effectiveIconName === 'folder' || !effectiveIconName) ? 'text-amber-500' : ''} 
                        />
                      )}
                      {effective?.isBookLayout && (
                        <div className="absolute left-1.5 top-0 bottom-0 w-[1px] bg-white/20 z-10" />
                      )}
                    </div>
                    <h4 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{cat.name}</h4>
                    <p className="text-xs font-bold text-gray-400">{count} ملف محفوظ</p>
                    
                    <button 
                      onClick={(e) => handleDeleteList(cat.id, e)}
                      className="absolute top-4 left-4 p-2 text-gray-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash size={18} />
                    </button>

                    <button 
                      onClick={(e) => handleEditList(cat, e)}
                      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <div className="col-span-full py-32 text-center opacity-30">
                   <Folder size={80} className="mx-auto mb-4 text-amber-500" />
                   <p className="text-xl font-black">لا توجد قوائم PDF بعد</p>
                </div>
              )}
            </div>
          )}
        </div>

        {showImportCoverModal && (
          <div className="fixed inset-0 z-[610] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`w-full max-w-2xl rounded-[40px] shadow-2xl p-8 border flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-emerald-950'}`}>
              <div className="flex items-center justify-between mb-6 shrink-0" dir="rtl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <ImageIcon size={20} />
                  </div>
                  <div className="text-right">
                    <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                      مستودع الصور
                    </h3>
                    <p className="text-xs text-gray-400 font-bold">اختر صورة أو غلاف من الصور المخزنة في المستودع</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowImportCoverModal(false);
                    setImportSearchTerm('');
                  }}
                  className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* حقل البحث */}
              <div className="mb-6 shrink-0">
                <div className="relative">
                  <input 
                    type="text"
                    value={importSearchTerm}
                    onChange={(e) => setImportSearchTerm(e.target.value)}
                    placeholder="ابحث عن اسم الصورة..."
                    className={`w-full pl-5 pr-12 py-3.5 rounded-2xl border outline-none font-bold text-sm transition-all focus:border-indigo-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white placeholder-zinc-500' : 'bg-gray-50 border-gray-200 text-emerald-900 placeholder-gray-400'}`}
                    dir="rtl"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={18} />
                  </div>
                </div>
              </div>

              {/* قائمة الصور */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                {autoCovers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ImageIcon size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-bold">مستودع الصور فارغ حالياً.</p>
                    <p className="text-[11px] mt-1">يمكنك إضافة صور جديدة من خلال زر الإعدادات أولاً.</p>
                  </div>
                ) : (() => {
                  const filtered = autoCovers.filter(rule => 
                    rule && rule.folderName && rule.folderName.toLowerCase().includes(importSearchTerm.toLowerCase())
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <Search size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-xs font-bold">لا توجد نتائج مطابقة لبحثك.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {filtered.map((rule) => (
                        <div 
                          key={rule.id}
                          onClick={() => handleImportCoverSelect(rule.coverBase64)}
                          className={`group cursor-pointer rounded-2xl border p-3 flex flex-col items-center text-center transition-all ${isDarkMode ? 'bg-zinc-800/40 border-white/5 hover:border-indigo-500 hover:bg-zinc-800' : 'bg-gray-50 border-gray-150 hover:border-indigo-500 hover:bg-white'} hover:shadow-lg`}
                        >
                          <div className="w-full aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                            <img 
                              src={rule.coverBase64} 
                              alt={rule.folderName} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <span className={`text-[11px] font-black line-clamp-2 w-full leading-normal ${isDarkMode ? 'text-zinc-200' : 'text-emerald-950'}`}>
                            {rule.folderName}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {showAutoCoversSettings && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-4xl h-[90vh] md:h-[85vh] rounded-[40px] shadow-2xl p-6 md:p-10 border flex flex-col ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-emerald-950'}`}>
              
              <div className="flex items-center justify-between mb-6 shrink-0" dir="rtl">
                <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                  إعدادات مكتبة الـ PDF والتسعير
                </h3>
                <button 
                  onClick={() => {
                    setShowAutoCoversSettings(false);
                    setNewAutoCoverFolderName('');
                    setNewAutoCoverBase64('');
                    setEditingRuleId(null);
                  }}
                  className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sidebar and content grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0" dir="rtl">
                
                {/* Sidebar Menu */}
                <div className="md:col-span-1 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 border-b md:border-b-0 md:border-l border-dashed border-gray-150 dark:border-zinc-800 md:pl-6 shrink-0 text-right">
                  <button
                    onClick={() => setActiveSettingsTab('covers')}
                    className={`w-full px-4 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-end gap-2 shrink-0 ${
                      activeSettingsTab === 'covers'
                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')
                        : (isDarkMode ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white' : 'text-zinc-600 hover:bg-gray-50 hover:text-emerald-950')
                    }`}
                  >
                    <span>مستودع الأغلفة</span>
                    <ImageIcon size={16} />
                  </button>

                  <button
                    onClick={() => setActiveSettingsTab('pricing')}
                    className={`w-full px-4 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-end gap-2 shrink-0 ${
                      activeSettingsTab === 'pricing'
                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')
                        : (isDarkMode ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white' : 'text-zinc-600 hover:bg-gray-50 hover:text-emerald-950')
                    }`}
                  >
                    <span>إعدادات التسعير</span>
                    <Calculator size={16} />
                  </button>

                  <button
                    onClick={() => setActiveSettingsTab('backup')}
                    className={`w-full px-4 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-end gap-2 shrink-0 ${
                      activeSettingsTab === 'backup'
                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')
                        : (isDarkMode ? 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white' : 'text-zinc-600 hover:bg-gray-50 hover:text-emerald-950')
                    }`}
                  >
                    <span>النسخ الاحتياطي والاسترداد</span>
                    <Database size={16} />
                  </button>
                </div>

                {/* Content Area */}
                <div className="md:col-span-3 flex flex-col min-h-0 overflow-y-auto custom-scrollbar md:pr-4">
                  {activeSettingsTab === 'covers' ? (
                    <div className="space-y-6 text-right pb-4">
                      {/* How does it work explain section */}
                      <div className={`p-6 rounded-3xl border text-right leading-relaxed shrink-0 ${isDarkMode ? 'bg-zinc-800/40 border-white/5 text-zinc-300' : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'}`}>
                        <h4 className="font-black text-sm mb-2 flex items-center justify-end gap-2 text-right">
                          <span>💡</span>
                          <span>كيفية استخدام مستودع الصور</span>
                        </h4>
                        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 text-right">
                          يمكنك رفع أغلفتك وتسميتها هنا لحفظها في المستودع. بعد ذلك، يمكنك الذهاب إلى تفاصيل أي ملف والضغط على زر <strong className="font-black text-indigo-500">"استيراد صور"</strong> لاختيار الغلاف وحفظه للملف مباشرة.
                        </p>
                      </div>

                      {/* Form to create new rule */}
                      <div className={`p-6 rounded-3xl border space-y-4 shrink-0 ${isDarkMode ? 'bg-zinc-800/30 border-white/5' : 'bg-gray-50/50 border-gray-150'}`}>
                        <h4 className="font-black text-sm text-right">إضافة غلاف أو صورة جديدة</h4>
                        <div className="space-y-4 text-right">
                          <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-2 mr-1">اسم الغلاف / الصورة</label>
                            <input 
                              type="text" 
                              value={newAutoCoverFolderName}
                              onChange={(e) => setNewAutoCoverFolderName(e.target.value)}
                              placeholder="مثلاً: رياضيات الصف الثالث"
                              className={`w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 outline-none font-bold text-sm transition-all focus:border-emerald-500 ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'}`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-2 mr-1">اختر الغلاف (صورة)</label>
                            <input 
                              type="file"
                              ref={autoCoverInputRef}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setNewAutoCoverBase64(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            
                            <div className="flex gap-2">
                              <button 
                                type="button"
                                onClick={() => autoCoverInputRef.current?.click()}
                                className={`flex-1 py-3 px-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${newAutoCoverBase64 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-zinc-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50')}`}
                              >
                                {newAutoCoverBase64 ? (
                                  <>
                                    <img src={newAutoCoverBase64} alt="Preview" className="w-6 h-8 object-contain shrink-0" referrerPolicy="no-referrer" />
                                    <span className="text-[11px] font-black">تم اختيار الصورة بنجاح</span>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon size={16} />
                                    <span className="text-[11px] font-black">اضغط هنا لاختيار صورة الغلاف</span>
                                  </>
                                )}
                              </button>

                              {newAutoCoverBase64 && (
                                <button 
                                  type="button"
                                  onClick={() => setNewAutoCoverBase64('')}
                                  className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/20 transition-all flex items-center justify-center"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!newAutoCoverFolderName.trim() || !newAutoCoverBase64}
                            onClick={() => {
                              const newRule = {
                                id: crypto.randomUUID(),
                                folderName: newAutoCoverFolderName.trim(),
                                coverBase64: newAutoCoverBase64
                              };
                              setAutoCovers(prev => [newRule, ...prev]);
                              setNewAutoCoverFolderName('');
                              setNewAutoCoverBase64('');
                              if (autoCoverInputRef.current) autoCoverInputRef.current.value = '';
                            }}
                            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                          >
                            <Plus size={16} />
                            حفظ الصورة في المستودع
                          </button>
                        </div>
                      </div>

                      {/* Existing Rules List */}
                      <div className="space-y-3 shrink-0">
                        <h4 className="font-black text-sm text-right">الصور والأغلفة بالمستودع ({autoCovers.length})</h4>
                        {autoCovers.length === 0 ? (
                          <p className="text-center text-xs text-gray-400 py-6">المستودع فارغ حالياً، قم بإضافة غلاف أعلاه</p>
                        ) : (
                          <div className="space-y-2">
                            {autoCovers.map((rule) => (
                              <div 
                                key={rule.id}
                                className={`flex items-center justify-between p-4 rounded-2xl border text-right ${isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-150'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      if (window.confirm('هل تريد حذف هذه الصورة من المستودع؟')) {
                                        setAutoCovers(prev => prev.filter(r => r.id !== rule.id));
                                        if (editingRuleId === rule.id) setEditingRuleId(null);
                                      }
                                    }}
                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition duration-200"
                                    title="حذف الصورة"
                                  >
                                    <Trash2 size={14} />
                                  </button>

                                  {editingRuleId === rule.id ? (
                                    <button
                                      onClick={() => {
                                        if (editingRuleName.trim()) {
                                          setAutoCovers(prev => prev.map(r => r.id === rule.id ? { ...r, folderName: editingRuleName.trim() } : r));
                                          setEditingRuleId(null);
                                        }
                                      }}
                                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition duration-200 text-xs font-bold"
                                    >
                                      حفظ
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingRuleId(rule.id);
                                        setEditingRuleName(rule.folderName);
                                      }}
                                      className={`p-2 rounded-lg transition duration-200 ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                      title="تعديل الاسم"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}

                                  {editingRuleId === rule.id && (
                                    <button
                                      onClick={() => setEditingRuleId(null)}
                                      className={`p-2 rounded-lg text-xs font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    >
                                      إلغاء
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                                  <div className="text-right flex-1 min-w-0 pr-2">
                                    {editingRuleId === rule.id ? (
                                      <input 
                                        type="text" 
                                        value={editingRuleName}
                                        onChange={(e) => setEditingRuleName(e.target.value)}
                                        className={`w-full px-3 py-1.5 rounded-lg border outline-none font-bold text-xs transition-all focus:border-emerald-500 ${isDarkMode ? 'bg-zinc-800 text-white border-white/10' : 'bg-white text-emerald-950 border-gray-200'}`}
                                      />
                                    ) : (
                                      <span className="text-xs font-black block truncate">{rule.folderName}</span>
                                    )}
                                  </div>
                                  <div className="w-8 h-10 rounded shadow-sm border border-gray-300 dark:border-zinc-700 overflow-hidden shrink-0">
                                    <img src={rule.coverBase64} alt={rule.folderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : activeSettingsTab === 'pricing' ? (
                    <div className="space-y-6 text-right pb-4">
                      {/* Pricing Guidelines Info */}
                      <div className={`p-5 rounded-3xl border text-right leading-relaxed shrink-0 ${isDarkMode ? 'bg-zinc-800/40 border-white/5 text-zinc-300' : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'}`}>
                        <h4 className="font-black text-sm mb-1.5 flex items-center justify-end gap-2">
                          <span>💡</span>
                          <span>حول أسعار طباعة الطلبات في السلة</span>
                        </h4>
                        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 leading-relaxed">
                          يمكن لتطبيق المحاسبة في السلة حساب إجمالي سعر طباعة الملفات والكتب تلقائياً بناءً على عدد الصفحات. يمكنك هنا تحديد السعر الافتراضي لكل من طباعة الوجه الواحد والوجهين لتطبيقها بنقرة واحدة وتوفير الوقت والجهد في الإدخال اليدوي.
                        </p>
                      </div>

                      {/* Pricing Config Area */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Single Sided */}
                        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-gray-50/50 border-gray-150'}`}>
                          <div className="flex items-center gap-3 justify-end mb-4">
                            <div className="text-right">
                              <h5 className="font-black text-sm">سعر الصفحة - وجه واحد</h5>
                              <p className="text-[10px] font-black text-gray-400 mt-0.5">سعر افتراضي لطباعة وجه واحد فقط</p>
                            </div>
                            <span className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
                              <FileText size={20} />
                            </span>
                          </div>
                          <div className="text-right">
                            <label className="block text-[11px] font-black text-gray-400 mb-1.5 mr-1">السعر بالدينار:</label>
                            <div className="relative">
                              <input 
                                type="number"
                                step="0.001"
                                min="0"
                                value={simplexPrice}
                                onChange={(e) => setSimplexPrice(e.target.value)}
                                className={`w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 outline-none font-bold text-sm transition-all focus:border-emerald-500 text-center ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'}`}
                                placeholder="0.05"
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400" dir="rtl">دينار</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Double Sided */}
                        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-gray-50/50 border-gray-150'}`}>
                          <div className="flex items-center gap-3 justify-end mb-4">
                            <div className="text-right">
                              <h5 className="font-black text-sm">سعر الصفحة - وجه وظهر</h5>
                              <p className="text-[10px] font-black text-gray-400 mt-0.5">سعر افتراضي لطباعة وجه وظهر (على نفس الورقة)</p>
                            </div>
                            <span className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl shrink-0">
                              <BookOpen size={20} />
                            </span>
                          </div>
                          <div className="text-right">
                            <label className="block text-[11px] font-black text-gray-400 mb-1.5 mr-1">السعر بالدينار:</label>
                            <div className="relative">
                              <input 
                                type="number"
                                step="0.001"
                                min="0"
                                value={duplexPrice}
                                onChange={(e) => setDuplexPrice(e.target.value)}
                                className={`w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 outline-none font-bold text-sm transition-all focus:border-emerald-500 text-center ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'}`}
                                placeholder="0.03"
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400" dir="rtl">دينار</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 text-right pb-4 animate-in fade-in duration-300">
                      {/* Info Header */}
                      <div className={`p-5 rounded-3xl border text-right leading-relaxed shrink-0 ${isDarkMode ? 'bg-zinc-800/40 border-white/5 text-zinc-300' : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'}`}>
                        <h4 className="font-black text-sm mb-1.5 flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-400">
                          <span>🛡️</span>
                          <span>النسخ الاحتياطي ومواجهة فورمات الجهاز</span>
                        </h4>
                        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 leading-relaxed">
                          عند فورمات جهاز الكمبيوتر أو المتصفح، قد تُفقد البيانات المخزنة محلياً بالكامل. يمكنك توليد ملف نسخة احتياطية آمن وتنزيله لحفظ المجلدات وأغلفة الكتب والتسعير والملفات، واستعادته لاحقاً بضغطة زر.
                        </p>
                      </div>

                      {backupProgress && (
                        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-pulse flex flex-col items-center justify-center gap-3">
                          <Loader2 size={36} className="animate-spin text-emerald-500" />
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{backupProgress}</div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Export */}
                        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-gray-50/50 border-gray-150'}`}>
                          <div>
                            <div className="flex items-center gap-3 justify-end mb-4">
                              <div className="text-right">
                                <h5 className="font-black text-sm">تصدير النسخة الاحتياطية</h5>
                                <p className="text-[10px] font-black text-gray-400 mt-0.5">تنزيل نسخة لجميع ملفاتك وإعدادات المجلدات والأسعار</p>
                              </div>
                              <span className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
                                <Download size={20} />
                              </span>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed text-gray-450 dark:text-zinc-400 mb-6">
                              سيقوم النظام بتحليل وضغط جميع ملفات الـ PDF والأغلفة المخصصة والروابط والرموز، بالإضافة للسرعة والأسعار في ملف واحد متكامل لتنزيله وحفظه بأمان.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={exportDatabase}
                            disabled={!!backupProgress}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-black text-xs transition-all flex items-center justify-center gap-2"
                          >
                            <Download size={14} />
                            <span>تصدير الآن</span>
                          </button>
                        </div>

                        {/* 2. Import */}
                        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-gray-50/50 border-gray-150'}`}>
                          <div>
                            <div className="flex items-center gap-3 justify-end mb-4">
                              <div className="text-right">
                                <h5 className="font-black text-sm">استيراد النسخة الاحتياطية</h5>
                                <p className="text-[10px] font-black text-gray-400 mt-0.5">استعادة كامل محتوى المكتبة بجميع تفاصيلها</p>
                              </div>
                              <span className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
                                <Upload size={20} />
                              </span>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed text-gray-450 dark:text-zinc-400 mb-6">
                              رفع ملف الـ JSON الذي تم تصديره مسبقاً لاسترجاع كافة الأقسام والكتب والأسعار. تنبيه: هذا سيؤدي إلى استبدال أي بيانات حالية بمحتويات الملف.
                            </p>
                          </div>
                          
                          <input
                            type="file"
                            ref={backupImportInputRef}
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                if (confirm("هل أنت متأكد من رغبتك في استيراد النسخة الاحتياطية؟ سيتم تنظيف المستودعات الحالية واستبدالها بالكامل.")) {
                                  importDatabase(f);
                                }
                                e.target.value = '';
                              }
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => backupImportInputRef.current?.click()}
                            disabled={!!backupProgress}
                            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white font-black text-xs transition-all flex items-center justify-center gap-2"
                          >
                            <Upload size={14} />
                            <span>استيراد الآن</span>
                          </button>
                        </div>

                        {/* 3. Recreate and Export PDF Files to App Folder */}
                        <div className={`col-span-full p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 mt-2 ${isDarkMode ? 'bg-blue-900/10 border-blue-500/20' : 'bg-blue-50/60 border-blue-150'}`}>
                          <div className="text-right flex-1 min-w-0">
                            <div className="flex items-center gap-3 justify-end mb-2">
                              <div className="text-right">
                                <h5 className="font-black text-sm text-blue-900 dark:text-blue-300">إعادة إنشاء وتصدير ملفات הـ PDF إلى مجلد التطبيق</h5>
                                <p className="text-[10px] font-black text-gray-400 mt-0.5">حل مشكلة المسارات المفقودة واستخراج نسخة طبق الأصل لكل ملف مخزن</p>
                              </div>
                              <span className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl shrink-0">
                                <Folder size={20} />
                              </span>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed text-gray-500 dark:text-zinc-400">
                              عند حذف مسار الملف من الجهاز أو نقله، تظل كافة بيانات وقراءات ملفات الـ PDF مخزنة محلياً بالكامل داخل قاعدة بيانات التطبيق. تتيح لك هذه الأداة إنشاء نسخة جديدة لجميع الملفات وحفظها في مجلد ثابت ومحدد بمجلدات التطبيق، ليتم تحديث وتثبيت مساراتها وتتمكن من فتح الملفات وفتح موقعها بفرز مباشر.
                            </p>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                            <button
                              type="button"
                              onClick={syncAndExportPdfsToLibrary}
                              disabled={!!backupProgress}
                              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md"
                            >
                              <Folder size={16} />
                              <span>تصدير وإعادة إنشاء كافة الملفات</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={handleOpenPdfFolder}
                              className={`w-full sm:w-auto px-4 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 border ${isDarkMode ? 'bg-zinc-800 text-zinc-200 border-white/10 hover:bg-zinc-700' : 'bg-white text-blue-900 border-gray-200 hover:bg-gray-50'}`}
                            >
                              <ExternalLink size={16} />
                              <span>فتح مجلد الملفات</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-dashed border-gray-200 dark:border-zinc-800 flex justify-end shrink-0" dir="rtl">
                <button 
                  onClick={() => {
                    setShowAutoCoversSettings(false);
                    setNewAutoCoverFolderName('');
                    setNewAutoCoverBase64('');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-zinc-650 text-white font-black text-xs hover:bg-zinc-550 transition-all shadow"
                >
                  إغلاق نافذة الإعدادات
                </button>
              </div>
            </div>
          </div>
        )}

        {false && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-6xl h-[90vh] md:h-[85vh] rounded-[40px] shadow-2xl p-6 md:p-10 border flex flex-col ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-emerald-950'}`}>
              
              {/* Header */}
              <div className="flex items-center justify-between mb-6 shrink-0" dir="rtl">
                <div className="flex items-center gap-3">
                  <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <ShoppingCart size={24} />
                  </span>
                  <div>
                    <h3 className={`text-xl md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                      سلة الطلبات الذكية (الكاشير)
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-0.5">البحث المباشر في المكتبة بالكامل، التسعير المرن، والدفع السريع</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowWishlist(false);
                    setWishlistSearchTerm('');
                  }}
                  className={`p-3 rounded-2xl transition-all cursor-pointer ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Main 2-Column POS Layout */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden" dir="rtl">
                
                {/* Right Column: Library Search & POS Adding (Col span 7) */}
                <div className="lg:col-span-7 flex flex-col h-full min-h-0 text-right">
                  {/* Search Bar */}
                  <div className="relative mb-4 shrink-0">
                    <span className="block text-xs font-black text-gray-400 mb-2 mr-1">البحث في كامل مكتبة الـ PDF:</span>
                    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/50 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <Search size={20} className="text-gray-400" />
                      <input 
                        type="text"
                        placeholder="ابحث باسم الكتاب، الملازم، أو المؤلف للإضافة الفورية..."
                        value={wishlistSearchTerm}
                        onChange={(e) => setWishlistSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-right font-black text-xs md:text-sm"
                        dir="rtl"
                      />
                      {wishlistSearchTerm && (
                        <button 
                          onClick={() => setWishlistSearchTerm('')}
                          className="text-gray-400 hover:text-gray-650 dark:hover:text-zinc-200"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Results grid */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pl-1 min-h-0">
                    {(() => {
                      const searchResults = (() => {
                        const term = wishlistSearchTerm.trim().toLowerCase();
                        if (term !== '') {
                          return pdfs.filter(item => {
                            return item.name.toLowerCase().includes(term) || (item.author && item.author.toLowerCase().includes(term));
                          });
                        } else {
                          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                          return pdfs.filter(item => {
                            return item.lastOpenedAt && item.lastOpenedAt >= oneWeekAgo;
                          }).sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
                        }
                      })();

                      if (searchResults.length === 0) {
                        return (
                          <div className="py-16 text-center text-gray-400 font-bold border-2 border-dashed border-gray-150 dark:border-white/5 rounded-3xl" dir="rtl">
                            {wishlistSearchTerm.trim() !== '' ? (
                              <>
                                <Search size={40} className="mx-auto mb-3 opacity-30" />
                                لا توجد نتائج مطابقة لبحثك في المكتبة.
                              </>
                            ) : (
                              <div className="flex flex-col gap-1.5 items-center px-4">
                                <Zap size={36} className="text-amber-500 animate-pulse mb-1" />
                                <span className="text-xs font-black text-emerald-800 dark:text-zinc-200">الكتب النشطة لهذا الأسبوع فارغة</span>
                                <span className="text-[10px] text-gray-450 dark:text-zinc-400">لم تقم بفتح أي ملف في المكتبة خلال الـ 7 أيام الماضية.</span>
                                <span className="text-[9px] text-gray-400 font-black mt-2">ابحث عن أي كتاب بالأعلى وافتحه لكي يظهر هنا كصنف نشط مؤخراً.</span>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                          {searchResults.map(pdf => {
                            const isInCart = wishlist.some(item => item.id === pdf.id);
                            const pCount = pdf.pageCount || 0;
                            const pPrice = parseFloat(pagePriceInput) || 0;
                            const addPrice = isAdditionalPriceEnabled ? (parseFloat(additionalPriceInput) || 0) : 0;
                            const calculatedPrice = (pdf.price && pdf.price > 0)
                              ? pdf.price
                              : (pCount * pPrice) + addPrice;

                            return (
                              <div 
                                key={pdf.id}
                                className={`p-4 rounded-3xl border transition flex flex-col justify-between gap-4 ${
                                  isInCart 
                                    ? (isDarkMode ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-emerald-50 border-emerald-200')
                                    : (isDarkMode ? 'bg-zinc-800/40 border-white/5 hover:bg-zinc-800' : 'bg-gray-50/50 border-gray-150 hover:bg-gray-100')
                                }`}
                              >
                                <div className="flex gap-3">
                                  <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 border border-black/5 bg-gray-150 dark:bg-zinc-850 flex items-center justify-center relative shadow-sm">
                                    <PdfCoverImage pdf={pdf} getAutoCover={getAutoCover} className="w-full h-full object-cover relative z-10" />
                                    <FileText size={20} className="absolute text-gray-400 z-0" />
                                  </div>
                                  <div className="flex flex-col text-right min-w-0 flex-1">
                                    <span className="font-extrabold text-xs md:text-sm text-emerald-950 dark:text-zinc-100 truncate" title={pdf.name}>
                                      {pdf.name.replace(/\.pdf$/i, '')}
                                    </span>
                                    {pdf.author && (
                                      <span className="text-[10px] text-gray-400 font-bold truncate mt-0.5">
                                        المؤلف: {pdf.author}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black mt-2">
                                      {pCount} صفحة • {calculatedPrice.toFixed(2)} دينار
                                      {(pdf.price && pdf.price > 0) && (
                                        <span className="text-[9px] text-indigo-500 font-extrabold mr-1">(سعر ثابت من الملف)</span>
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                  <button 
                                    onClick={() => toggleWishlist(pdf)}
                                    className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                      isInCart 
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/10' 
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/10'
                                    }`}
                                  >
                                    <ShoppingCart size={14} />
                                    {isInCart ? 'إزالة من السلة' : 'إضافة للطلب'}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const fullPdf = getFullPdfFile(pdf);
                                      await openPdfExternally(fullPdf);
                                    }}
                                    className={`p-2 rounded-xl transition cursor-pointer ${
                                      isDarkMode ? 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-150 hover:bg-gray-200 text-gray-650'
                                    }`}
                                    title="معاينة الملف"
                                  >
                                    <ExternalLink size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Left Column: Cart, pricing & combined calculations (Col span 5) */}
                <div className="lg:col-span-5 flex flex-col h-full min-h-0 border-t lg:border-t-0 lg:border-r lg:pr-6 dark:border-white/5 pt-6 lg:pt-0">
                  
                  {/* Pricing parameters */}
                  <div className={`p-5 rounded-3xl border space-y-4 mb-4 shrink-0 ${isDarkMode ? 'bg-zinc-800/30 border-white/5' : 'bg-gray-50/50 border-gray-150'}`}>
                    <h4 className="font-black text-sm text-right text-emerald-600 dark:text-emerald-400">محددات حساب السعر للطلب</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-right" dir="rtl">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 mr-1">
                          <label className="text-xs font-black text-gray-400">سعر الصفحة (بالدينار):</label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-emerald-600">
                            <input 
                              type="checkbox"
                              checked={isDoubleSided}
                              onChange={(e) => {
                                setIsDoubleSided(e.target.checked);
                              }}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <span>وجه وظهر</span>
                          </label>
                        </div>
                        <input 
                          type="number"
                          step="0.001"
                          min="0"
                          value={pagePriceInput}
                          onChange={(e) => setPagePriceInput(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-2xl border outline-none font-bold text-sm ${
                            isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-emerald-950'
                          }`}
                          placeholder="0"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5 mr-1">
                          <label className="text-xs font-black text-gray-400">سعر إضافي (بالدينار):</label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-emerald-600">
                            <input 
                              type="checkbox"
                              checked={isAdditionalPriceEnabled}
                              onChange={(e) => setIsAdditionalPriceEnabled(e.target.checked)}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            تفعيل
                          </label>
                        </div>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          disabled={!isAdditionalPriceEnabled}
                          value={additionalPriceInput}
                          onChange={(e) => setAdditionalPriceInput(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-2xl border outline-none font-bold text-sm transition-opacity ${
                            !isAdditionalPriceEnabled ? 'opacity-40 cursor-not-allowed' : ''
                          } ${
                            isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-emerald-950'
                          }`}
                          placeholder="0"
                          dir="rtl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cart Items List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4 pr-1 min-h-0 text-right">
                    <h4 className="font-black text-sm block mb-3">الملفات في السلة ({wishlist.length}):</h4>
                    {wishlist.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 font-bold border-2 border-dashed border-gray-150 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center h-[180px]">
                        <ShoppingCart size={32} className="opacity-30 mb-2" />
                        السلة فارغة حالياً.
                        <span className="text-[11px] block text-gray-400 mt-1">ابحث عن الملفات من القسم الأيمن وأضفها بالضغط على زر "إضافة للطلب".</span>
                      </div>
                    ) : (
                      <div className="space-y-2 pr-1 pb-4">
                        {wishlist.map(item => {
                          const pCount = item.pageCount || 0;
                          const pPrice = parseFloat(pagePriceInput) || 0;
                          const addPrice = isAdditionalPriceEnabled ? (parseFloat(additionalPriceInput) || 0) : 0;
                          const fullPdf = pdfs.find(p => p.id === item.id) || item;
                          const calculatedPrice = (fullPdf.price && fullPdf.price > 0)
                            ? fullPdf.price
                            : (pCount * pPrice) + addPrice;
                          const hasCover = fullPdf.coverBlob || getAutoCover(fullPdf.name, fullPdf.listId);
                          const effective = getEffectiveCategoryIcon(fullPdf.listId);
                          const customImage = effective?.iconImage;

                          return (
                            <div 
                              className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                                isDarkMode 
                                  ? 'bg-zinc-800/45 border-white/5 text-zinc-200' 
                                  : 'bg-gray-50/50 border-gray-150 hover:bg-gray-100 text-emerald-950'
                              }`} 
                              dir="rtl" 
                              key={item.id}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-12 rounded-lg overflow-hidden shrink-0 border border-black/5 bg-gray-150 dark:bg-zinc-850 flex items-center justify-center relative shadow-sm">
                                  {hasCover ? (
                                    <PdfCoverImage pdf={fullPdf} getAutoCover={getAutoCover} className="w-full h-full object-cover relative z-10" />
                                  ) : customImage ? (
                                    <img 
                                      src={customImage} 
                                      alt="category cover" 
                                      className="w-full h-full object-cover relative z-10" 
                                      referrerPolicy="no-referrer" 
                                    />
                                  ) : null}
                                  <FileText size={16} className="absolute text-gray-400 z-0" />
                                </div>
                                <div className="flex flex-col text-right">
                                  <span className="font-extrabold text-xs max-w-[150px] truncate" title={item.name}>
                                    {item.name.replace(/\.pdf$/i, '')}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-black mt-0.5">
                                    {pCount} ص • {calculatedPrice.toFixed(2)} دينار
                                    {(fullPdf.price && fullPdf.price > 0) && (
                                      <span className="text-[9px] text-indigo-500 font-extrabold mr-1">(سعر ثابت)</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={async () => {
                                    const fullPdf = getFullPdfFile(item);
                                    await openPdfExternally(fullPdf);
                                  }}
                                  className={`p-1.5 rounded-lg transition ${
                                    isDarkMode ? 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-650'
                                  }`}
                                  title="فتح ملف منفرد"
                                >
                                  <ExternalLink size={12} />
                                </button>
                                <button 
                                  onClick={() => toggleWishlist(item)}
                                  className="p-1.5 cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition"
                                  title="إزالة من السلة"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Total Calculations & Global Actions */}
                  {wishlist.length > 0 && (
                    <div className="pt-4 border-t border-dashed border-gray-200 dark:border-zinc-800 shrink-0 space-y-3">
                      {/* Sums */}
                      <div className="bg-emerald-500/5 p-4 rounded-3xl border border-emerald-500/10" dir="rtl">
                        <div className="flex justify-between items-center text-right font-black mb-1.5">
                          <span className="text-xs text-gray-400">مجموع الصفحات الكلي:</span>
                          <span className="text-sm text-emerald-600 dark:text-emerald-400">
                            {wishlist.reduce((acc, item) => acc + (item.pageCount || 0), 0)} صفحة
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-right font-black">
                          <span className="text-sm text-gray-400">المبلغ الإجمالي للطلب:</span>
                          <span className="text-lg md:text-xl text-emerald-600 dark:text-emerald-400">
                            {wishlist.reduce((acc, item) => {
                              const fullPdf = pdfs.find(p => p.id === item.id) || item;
                              const pCount = item.pageCount || 0;
                              const pPrice = parseFloat(pagePriceInput) || 0;
                              const addPrice = isAdditionalPriceEnabled ? (parseFloat(additionalPriceInput) || 0) : 0;
                              const itemPrice = (fullPdf.price && fullPdf.price > 0)
                                ? fullPdf.price
                                : (pCount * pPrice) + addPrice;
                              return acc + itemPrice;
                            }, 0).toFixed(2)} دينار
                          </span>
                        </div>
                      </div>

                      {/* Global Buttons */}
                      <div className="grid grid-cols-2 gap-3 shrink-0" dir="rtl">
                        <button 
                          onClick={() => {
                            wishlist.forEach(async (item) => {
                              const fullPdf = getFullPdfFile(item);
                              await openPdfExternally(fullPdf);
                            });
                          }}
                          className="py-3 px-4 text-xs md:text-sm rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow shadow-indigo-600/20 cursor-pointer"
                        >
                          <ExternalLink size={16} />
                          فتح جميع الملفات معاً
                        </button>
                        <button 
                          onClick={() => setWishlist([])}
                          className="py-3 px-4 text-xs md:text-sm rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition flex items-center justify-center gap-2 shadow shadow-rose-600/20 cursor-pointer"
                        >
                          <Trash2 size={16} />
                          تفريغ سلة السحب بالكامل
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          </div>
        )}

        {showAddList && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-3xl rounded-[40px] shadow-2xl p-10 border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-2xl font-black mb-8 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                {editingCategory ? 'تعديل القائمة' : 'إنشاء قائمة جديدة'}
              </h3>
              <form onSubmit={handleCreateList} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Right Column: Name & Settings Toggles */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-gray-400 mb-2 mr-1">اسم القائمة</label>
                      <input 
                        autoFocus required
                        type="text" 
                        value={newList.name}
                        onChange={(e) => setNewList({...newList, name: e.target.value})}
                        placeholder="مثلاً: كتب الطب"
                        className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-zinc-800 text-white focus:border-emerald-500' : 'bg-gray-50 text-emerald-900 focus:border-emerald-500'}`}
                      />
                    </div>

                    <div className="space-y-4">
                      {/* زر تثبيت الأيقونة */}
                      <div className={`p-4 rounded-xl flex items-center justify-between border ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex flex-col gap-0.5 text-right ml-4">
                          <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>تثبيت الأيقونة</span>
                          <span className="text-[10px] font-bold text-gray-450 dark:text-gray-400">توريث الأيقونة تلقائياً للملفات الفرعية</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewList({...newList, isIconPinned: !newList.isIconPinned})}
                          className={`w-11 h-6.5 rounded-full p-1 transition-all duration-300 relative outline-none shrink-0 ${newList.isIconPinned ? 'bg-emerald-600' : (isDarkMode ? 'bg-zinc-700' : 'bg-gray-300')}`}
                          style={{ direction: 'ltr' }}
                        >
                          <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ${newList.isIconPinned ? 'translate-x-4.5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* زر أيقونة كتاب (تحويل لغلاف كتاب A4) */}
                      <div className={`p-4 rounded-xl flex items-center justify-between border ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex flex-col gap-0.5 text-right ml-4">
                          <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>أيقونة كتاب (A4)</span>
                          <span className="text-[10px] font-bold text-gray-450 dark:text-gray-400">تغيير شكل الأيقونة لغلاف كتاب رأسي</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewList({...newList, isBookLayout: !newList.isBookLayout})}
                          className={`w-11 h-6.5 rounded-full p-1 transition-all duration-300 relative outline-none shrink-0 ${newList.isBookLayout ? 'bg-emerald-600' : (isDarkMode ? 'bg-zinc-700' : 'bg-gray-300')}`}
                          style={{ direction: 'ltr' }}
                        >
                          <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ${newList.isBookLayout ? 'translate-x-4.5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* زر الوصول السريع */}
                      <div className={`p-4 rounded-xl flex items-center justify-between border ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex flex-col gap-0.5 text-right ml-4">
                          <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>إضافة للوصول السريع</span>
                          <span className="text-[10px] font-bold text-gray-450 dark:text-gray-400">تثبيت المجلد في الوصول السريع للمكتبة</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewList({...newList, isQuickAccess: !newList.isQuickAccess})}
                          className={`w-11 h-6.5 rounded-full p-1 transition-all duration-300 relative outline-none shrink-0 ${newList.isQuickAccess ? 'bg-emerald-600' : (isDarkMode ? 'bg-zinc-700' : 'bg-gray-300')}`}
                          style={{ direction: 'ltr' }}
                        >
                          <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-300 ${newList.isQuickAccess ? 'translate-x-4.5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Left Column: Icon selection & Image Upload */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 mb-2 mr-1">اختر أيقونة أو ارفع صورة PNG</label>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <input 
                          type="file"
                          ref={iconInputRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewList({...newList, iconImage: reader.result as string});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          accept="image/png"
                          className="hidden"
                        />
                        <button 
                          type="button"
                          onClick={() => iconInputRef.current?.click()}
                          className={`flex-1 py-4 px-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${newList.iconImage ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-500 hover:border-zinc-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100')}`}
                        >
                          {newList.iconImage ? (
                            <>
                              <img src={newList.iconImage} alt="Preview" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                              <span className="text-xs font-black">تم اختيار صورة PNG</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon size={20} />
                              <span className="text-xs font-black">رفع أيقونة PNG مخصصة</span>
                            </>
                          )}
                        </button>
                        {newList.iconImage && (
                          <button 
                            type="button"
                            onClick={() => setNewList({...newList, iconImage: ''})}
                            className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-6 gap-3">
                        {PDF_ICONS.map((ico) => (
                          <button
                            key={ico.name}
                            type="button"
                            onClick={() => setNewList({...newList, icon: ico.name})}
                            className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer ${newList.icon === ico.name ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : (isDarkMode ? 'border-transparent bg-zinc-800 text-zinc-500 hover:bg-zinc-700' : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100')}`}
                          >
                            <ico.Icon size={20} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex gap-4 pt-6">
                  <button type="submit" className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black shadow-lg hover:bg-emerald-500 transition-all cursor-pointer">
                    {editingCategory ? 'حفظ التعديلات' : 'إنشاء'}
                  </button>
                  <button type="button" onClick={() => { setShowAddList(false); setEditingCategory(null); setNewList({name: '', icon: 'folder', iconImage: '', isIconPinned: false, isBookLayout: false, isQuickAccess: false}); }} className={`px-8 rounded-2xl font-bold transition-all cursor-pointer ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Shared Details Screen for ALL views */}
        {showDetails && selectedFile && (
          <div data-details-panel="second" className="absolute inset-0 z-[100] flex flex-col bg-zinc-50 dark:bg-zinc-950 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm shrink-0">
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowDetails(false)}
                    className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    <ChevronLeft size={24} className="rotate-180" />
                  </button>
                  <div className="text-right">
                    <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedFile.name.replace(/\.pdf$/i, '')}</h2>
                    <p className="text-gray-400 text-xs font-bold">تفاصيل الملف ومعاينته</p>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowDetails(false)}
                    className={`p-2 rounded-xl hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 transition-all`}
                  >
                    <X size={24} />
                  </button>
               </div>
            </div>

            <div className="flex-1 flex gap-8 p-8 overflow-hidden">
               {/* Right: Details */}
               <div className="w-96 flex flex-col gap-6 shrink-0 text-right details-panel-2" dir="rtl">
                  <div className={`p-8 rounded-[32px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
                     <h3 className={`text-lg font-black mb-6 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>معلومات الملف</h3>
                     
                     <div className="space-y-4 second-details-space-y">
                        {/* تعديل حقل اسم الملف */}
                        {editingField === 'name' ? (
                           <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right">
                              <span className="text-gray-400 font-bold text-xs">اسم الملف الجديد:</span>
                              <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    value={editTempName}
                                    onChange={(e) => setEditTempName(e.target.value)}
                                    className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                    placeholder="اسم الملف"
                                 />
                              </div>
                              <div className="flex justify-end gap-2 text-xs">
                                 <button 
                                    onClick={() => handleSaveFileField('name', editTempName)} 
                                    className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                                 >
                                    حفظ
                                 </button>
                                 <button 
                                    onClick={() => setEditingField(null)} 
                                    className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                                 >
                                    إلغاء
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                              <div className="flex flex-col text-right">
                                 <span className="text-gray-400 font-bold text-xs">اسم الملف:</span>
                                 <span className={`font-black text-sm truncate max-w-[150px] ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedFile.name.replace(/\.pdf$/i, '')}</span>
                              </div>
                              <button 
                                 onClick={() => {
                                    setEditingField('name');
                                    setEditTempName(selectedFile.name.replace(/\.pdf$/i, ''));
                                 }} 
                                 className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                              >
                                 تعديل
                              </button>
                           </div>
                        )}

                        {/* تعديل حقل السعر */}
                        {editingField === 'price' ? (
                           <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right">
                              <span className="text-gray-400 font-bold text-xs">السعر الجديد (بالدينار):</span>
                              <div className="flex gap-2">
                                 <input 
                                    type="number" 
                                    value={editTempPrice}
                                    onChange={(e) => setEditTempPrice(e.target.value)}
                                    className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                    placeholder="السعر"
                                 />
                              </div>
                              <div className="flex justify-end gap-2 text-xs">
                                 <button 
                                    onClick={() => handleSaveFileField('price', editTempPrice)} 
                                    className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                                 >
                                    حفظ
                                 </button>
                                 <button 
                                    onClick={() => setEditingField(null)} 
                                    className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                                 >
                                    إلغاء
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                              <div className="flex flex-col text-right">
                                 <span className="text-gray-400 font-bold text-xs">السعر:</span>
                                 <span className="font-black text-emerald-500 text-sm">{selectedFile.price || 0} دينار</span>
                              </div>
                              <button 
                                 onClick={() => {
                                    setEditingField('price');
                                    setEditTempPrice((selectedFile.price || 0).toString());
                                 }} 
                                 className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                              >
                                 تعديل
                              </button>
                           </div>
                        )}

                        {/* حقل اسم المؤلف وتعديله */}
                        {editingField === 'author' ? (
                           <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right">
                              <span className="text-gray-400 font-bold text-xs">اسم المؤلف الجديد:</span>
                              <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    value={editTempAuthor}
                                    onChange={(e) => setEditTempAuthor(e.target.value)}
                                    className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                    placeholder="اسم المؤلف"
                                 />
                              </div>
                              <div className="flex justify-end gap-2 text-xs">
                                 <button 
                                    onClick={() => handleSaveFileField('author', editTempAuthor)} 
                                    className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                                 >
                                    حفظ
                                 </button>
                                 <button 
                                    onClick={() => setEditingField(null)} 
                                    className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                                 >
                                    إلغاء
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="flex justify-between items-center py-3 border-b dark:border-white/5 second-panel-author-view-row">
                              <div className="flex flex-col text-right">
                                 <span className="text-gray-400 font-bold text-xs">المؤلف:</span>
                                 <span className={`font-black text-xs md:text-sm ${isDarkMode ? 'text-zinc-200' : 'text-emerald-950'}`}>
                                    {selectedFile.author || 'غير محدد'}
                                 </span>
                              </div>
                              <button 
                                 onClick={() => {
                                    setEditingField('author');
                                    setEditTempAuthor(selectedFile.author || '');
                                 }} 
                                 className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                              >
                                 تعديل
                              </button>
                           </div>
                        )}

                        <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                           <span className="text-gray-400 font-bold text-xs">عدد الورق:</span>
                           <span className="font-black text-sm text-blue-500">{selectedFile.pageCount || 0} صفحة</span>
                        </div>
                        {false && <div className="flex justify-between items-center py-3">
                           <span className="text-gray-400 font-bold text-xs">الحجم:</span>
                           <span className="font-black text-sm text-gray-500">{formatSize(selectedFile.size)}</span>
                        </div>}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => toggleWishlist(selectedFile)}
                      className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg ${
                        wishlist.some(item => item.id === selectedFile.id)
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                      }`}
                    >
                      <ShoppingCart size={20} />
                      {wishlist.some(item => item.id === selectedFile.id) ? 'إزالة من السلة' : 'إضافة للسلة'}
                    </button>
                    <button 
                      onClick={() => handlePrint(selectedFile.blob)}
                      className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Printer size={20} />
                      طباعة الملف
                    </button>
                    
                    <button 
                      onClick={() => openPdfExternally(selectedFile)}
                      className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <ExternalLink size={20} />
                      فتح الملف
                    </button>

                    <button 
                      onClick={() => showPdfInFolder(selectedFile)}
                      className="w-full py-4 rounded-2xl bg-amber-400 text-amber-950 font-black hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                    >
                      <Folder size={20} className="text-amber-950" />
                      فتح موقع الملف
                    </button>

                    <input 
                      type="file" 
                      ref={coverInputRef} 
                      onChange={handleCoverUpload} 
                      accept="application/pdf,image/*" 
                      className="hidden" 
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => coverInputRef.current?.click()}
                        className="py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-xs text-center"
                      >
                        <ImageIcon size={18} />
                        إضافة غلاف
                      </button>
                      <button 
                        onClick={() => setShowImportCoverModal(true)}
                        className="py-4 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-xs text-center"
                      >
                        <ImageIcon size={18} />
                        استيراد صور
                      </button>
                    </div>
                  </div>

                  {(selectedFile.coverBlob || getAutoCover(selectedFile.name, selectedFile.listId)) && (
                    <div className={`p-6 rounded-[32px] border shadow-sm bg-blue-500/10 border-blue-500/20`}>
                       <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-blue-600 text-white rounded-lg">
                                <ImageIcon size={18} />
                             </div>
                             <div className="text-right">
                                <h4 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                                  {selectedFile.coverBlob ? 'يوجد غلاف مخصص' : 'يوجد غلاف تلقائي للمجلد'}
                                </h4>
                                <p className="text-[10px] font-bold text-blue-400">طباعة الغلاف حده</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => handlePrint(selectedFile.coverBlob || getAutoCover(selectedFile.name, selectedFile.listId) || undefined)}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                            title="طباعة الغلاف"
                          >
                            <Printer size={18} />
                          </button>
                       </div>
                    </div>
                  )}

                  <div className="mt-auto">
                     <p className="text-[10px] text-gray-400 font-bold text-center">تاريخ الإضافة: {new Date(selectedFile.addedAt).toLocaleString('ar-EG')}</p>
                  </div>
               </div>

               {/* Left: Preview A4 */}
               <div className="flex-1 flex items-start justify-center overflow-auto custom-scrollbar">
                  <div className="w-full max-w-[600px] aspect-[1/1.414] bg-white shadow-2xl rounded-sm overflow-hidden border border-gray-200">
                     {previewUrl ? (
                        <iframe 
                           src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                           className="w-full h-full border-none"
                           title="PDF Content"
                        />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                           <Loader2 size={48} className="animate-spin text-red-500" />
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedListId === 'settings') {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-500 text-right" dir="rtl">
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 shrink-0 pb-5" dir="rtl">
          <div className="flex items-center gap-3">
            <span className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/15">
              <Settings size={24} />
            </span>
            <div>
              <h3 className={`text-xl md:text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                إعدادات مكتبة الـ PDF والتسعير
              </h3>
              <p className="text-xs text-gray-400 dark:text-zinc-400 font-bold mt-0.5">التحكم في مستودع الأغلفة وتسعير الصفحات لطباعة السلة</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Metrics */}
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <div className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-sm shadow-black/5 dark:shadow-black/15 ${isDarkMode ? 'bg-zinc-850 text-zinc-300' : 'bg-gray-50 text-emerald-950'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>الأغلفة: {autoCovers.length}</span>
              </div>
              <div className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-sm shadow-black/5 dark:shadow-black/15 ${isDarkMode ? 'bg-zinc-850 text-zinc-300' : 'bg-gray-50 text-emerald-950'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>وجه واحد: {simplexPrice} د</span>
              </div>
              <div className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-sm shadow-black/5 dark:shadow-black/15 ${isDarkMode ? 'bg-zinc-850 text-zinc-300' : 'bg-gray-50 text-emerald-950'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>وجهين: {duplexPrice} د</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedListId(null)}
              className={`p-3 rounded-2xl transition-all cursor-pointer shadow-sm shadow-black/5 dark:shadow-black/15 ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-gray-100 text-gray-600'}`}
              title="رجوع للمكتبة"
            >
              <ChevronLeft size={20} className="rotate-180" />
            </button>
          </div>
        </div>

        {/* Sidebar and content grid */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0" dir="rtl">
          
          {/* Sidebar Menu */}
          <div className="md:col-span-1 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 md:pl-6 shrink-0 text-right">
            <button
              onClick={() => setActiveSettingsTab('covers')}
              className={`w-full px-4 py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-between gap-3 shrink-0 ${
                activeSettingsTab === 'covers'
                  ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/5' : 'bg-emerald-555/10 text-emerald-800 shadow-sm shadow-emerald-500/5')
                  : (isDarkMode ? 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white' : 'text-zinc-600 hover:bg-gray-50 hover:text-emerald-950')
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${activeSettingsTab === 'covers' ? 'bg-emerald-500' : 'bg-transparent'}`}></span>
                <span>مستودع الأغلفة</span>
              </div>
              <ImageIcon size={16} />
            </button>

            <button
              onClick={() => setActiveSettingsTab('pricing')}
              className={`w-full px-4 py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-between gap-3 shrink-0 ${
                activeSettingsTab === 'pricing'
                  ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/5' : 'bg-emerald-555/10 text-emerald-800 shadow-sm shadow-emerald-500/5')
                  : (isDarkMode ? 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white' : 'text-zinc-600 hover:bg-gray-50 hover:text-emerald-950')
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${activeSettingsTab === 'pricing' ? 'bg-emerald-500' : 'bg-transparent'}`}></span>
                <span>إعدادات التسعير</span>
              </div>
              <Calculator size={16} />
            </button>

            <button
              onClick={() => setActiveSettingsTab('backup')}
              className={`w-full px-4 py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-between gap-3 shrink-0 ${
                activeSettingsTab === 'backup'
                  ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/5' : 'bg-emerald-555/10 text-emerald-800 shadow-sm shadow-emerald-500/5')
                  : (isDarkMode ? 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white' : 'text-zinc-600 hover:bg-gray-50 hover:text-emerald-950')
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${activeSettingsTab === 'backup' ? 'bg-emerald-500' : 'bg-transparent'}`}></span>
                <span>النسخ الاحتياطي والاسترداد</span>
              </div>
              <Database size={16} />
            </button>
          </div>

          {/* Content Area */}
          <div className="md:col-span-3 flex flex-col min-h-0 overflow-y-auto custom-scrollbar md:pr-4">
            {activeSettingsTab === 'covers' ? (
              <div className="space-y-6 text-right pb-4">
                {/* Info alert component */}
                <div className={`p-5 rounded-3xl text-right leading-relaxed shrink-0 shadow-sm shadow-black/5 dark:shadow-black/20 ${isDarkMode ? 'bg-gradient-to-r from-zinc-850/40 to-zinc-900/10 text-zinc-300' : 'bg-gradient-to-r from-emerald-50/50 to-teal-50/10 text-emerald-950'}`}>
                  <h4 className="font-black text-sm mb-1.5 flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-400">
                    <span>💡</span>
                    <span>كيف يعمل مستودع صور الأغلفة؟</span>
                  </h4>
                  <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 leading-relaxed">
                    من خلال حفظ الأغلفة في المستودع بأسماء واضحة، يمكنك ربطها بملفاتك بلمسة واحدة. انقر فوق 
                    <strong className="font-extrabold text-emerald-600 dark:text-emerald-400"> "استيراد صور" </strong> 
                    داخل الملفات لتغطية المستند بغلاف رائع وتجنب تكرار الرفع.
                  </p>
                </div>

                {/* Grid layout for file uploader + library info */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Uploader section */}
                  <div className={`lg:col-span-2 p-6 rounded-3xl space-y-4 shrink-0 transition-all shadow-md shadow-black/5 dark:shadow-black/25 ${isDarkMode ? 'bg-zinc-800/20' : 'bg-gray-50/40'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>إضافة سريعة</span>
                      <h4 className="font-black text-xs">إدراج غلاف جديد</h4>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-1.5 mr-1 text-right">اسم الغلاف أو المجلد</label>
                        <input 
                          type="text" 
                          value={newAutoCoverFolderName}
                          onChange={(e) => setNewAutoCoverFolderName(e.target.value)}
                          placeholder="مثال: لغتي الصف الرابع"
                          className={`w-full px-4 py-2.5 rounded-xl border-0 shadow-sm shadow-black/5 dark:shadow-black/20 outline-none font-bold text-xs transition-all focus:ring-4 focus:ring-emerald-500/10 ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-1.5 mr-1 text-right">الصورة المرغوبة</label>
                        <input 
                          type="file"
                          ref={autoCoverInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewAutoCoverBase64(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => autoCoverInputRef.current?.click()}
                          className={`flex-1 py-3 px-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center shadow-sm shadow-black/5 dark:shadow-black/20 ${newAutoCoverBase64 ? 'ring-2 ring-emerald-500/20 bg-emerald-500/5 text-emerald-500' : (isDarkMode ? 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700' : 'bg-white text-gray-400 hover:bg-gray-50')}`}
                        >
                          {newAutoCoverBase64 ? (
                            <>
                              <img src={newAutoCoverBase64} alt="Preview" className="w-10 h-12 object-cover rounded shadow mx-auto" referrerPolicy="no-referrer" />
                                <span className="text-[10px] font-black">غلاف جاهز للرفع</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon size={20} className="text-gray-400" />
                                <span className="text-[10px] font-black">اضغط لتحديد الصورة</span>
                              </>
                            )}
                          </button>

                          {newAutoCoverBase64 && (
                            <button 
                              type="button"
                              onClick={() => {
                                setNewAutoCoverBase64('');
                                if (autoCoverInputRef.current) autoCoverInputRef.current.value = '';
                              }}
                              className="p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all flex items-center justify-center self-stretch"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!newAutoCoverFolderName.trim() || !newAutoCoverBase64}
                        onClick={() => {
                          const newRule = {
                            id: crypto.randomUUID(),
                            folderName: newAutoCoverFolderName.trim(),
                            coverBase64: newAutoCoverBase64
                          };
                          setAutoCovers(prev => [newRule, ...prev]);
                          setNewAutoCoverFolderName('');
                          setNewAutoCoverBase64('');
                          if (autoCoverInputRef.current) autoCoverInputRef.current.value = '';
                        }}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <Plus size={16} />
                        حفظ في المستودع
                      </button>
                    </div>
                  </div>

                  {/* Covers Catalog Gallery */}
                  <div className="lg:col-span-3 space-y-3 flex flex-col min-h-0">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-[11px] font-extrabold text-gray-400">عدد الأغلفة: {autoCovers.length}</span>
                      <h4 className="font-black text-xs">قائمة الأغلفة المحفوظة بمستودعك</h4>
                    </div>

                    {autoCovers.length === 0 ? (
                      <div className={`p-10 rounded-3xl flex flex-col items-center justify-center text-center shadow-md shadow-black/5 dark:shadow-black/25 ${isDarkMode ? 'bg-zinc-800/10' : 'bg-gray-50/10'}`}>
                        <ImageIcon size={36} className="text-gray-450 dark:text-zinc-650 mb-3" />
                        <p className="text-xs text-gray-400 font-bold">لا توجد في المستودع أي أغلفة حالياً</p>
                        <p className="text-[10px] text-gray-500 mt-1">ابدأ برفع أول غلاف باستخدام المعالج الجانبي</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar max-h-[480px] p-0.5">
                        {autoCovers.map((rule) => (
                          <div 
                            key={rule.id}
                            className={`group relative rounded-2xl flex flex-col overflow-hidden transition-all duration-350 shadow-md shadow-black/5 dark:shadow-black/25 ${
                              isDarkMode 
                                ? 'bg-zinc-800/30 hover:bg-zinc-800' 
                                : 'bg-white hover:shadow-lg'
                            }`}
                          >
                            {/* Actions Top overlay */}
                            <div className="absolute top-2 right-2 left-2 z-10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button
                                onClick={() => {
                                  if (window.confirm('هل تريد حذف هذه الصورة من المستودع؟')) {
                                    setAutoCovers(prev => prev.filter(r => r.id !== rule.id));
                                    if (editingRuleId === rule.id) setEditingRuleId(null);
                                  }
                                }}
                                className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition duration-200"
                                title="حذف الغلاف"
                              >
                                <Trash2 size={12} />
                              </button>

                              {editingRuleId !== rule.id && (
                                <button
                                  onClick={() => {
                                    setEditingRuleId(rule.id);
                                    setEditingRuleName(rule.folderName);
                                  }}
                                  className="p-1.5 bg-zinc-900/80 backdrop-blur-md text-white rounded-lg shadow-lg hover:bg-emerald-600 transition duration-200"
                                  title="تعديل الاسم"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                            </div>

                            {/* Book Cover Image aspect-[3/4] */}
                            <div className="w-full aspect-[3/4] bg-gray-100 dark:bg-zinc-900 relative overflow-hidden shrink-0">
                              <img 
                                src={rule.coverBase64} 
                                alt={rule.folderName} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-85" />
                              
                              <div className="absolute bottom-2 left-2 right-2 text-right">
                                {editingRuleId === rule.id ? (
                                  <div className="space-y-1 z-20" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                      type="text" 
                                      value={editingRuleName}
                                      onChange={(e) => setEditingRuleName(e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-zinc-900 ring-1 ring-emerald-500/40 outline-none text-[10px] text-white font-bold"
                                    />
                                    <div className="flex gap-1 justify-end">
                                      <button
                                        onClick={() => {
                                          if (editingRuleName.trim()) {
                                            setAutoCovers(prev => prev.map(r => r.id === rule.id ? { ...r, folderName: editingRuleName.trim() } : r));
                                            setEditingRuleId(null);
                                          }
                                        }}
                                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[9px]"
                                      >
                                        حفظ
                                      </button>
                                      <button
                                        onClick={() => setEditingRuleId(null)}
                                        className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-350 font-bold rounded text-[9px]"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-black text-white line-clamp-1 block leading-tight">
                                    {rule.folderName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeSettingsTab === 'pricing' ? (
              <div className="space-y-6 text-right pb-4 animate-in fade-in duration-300">
                {/* Info guide alert */}
                <div className={`p-5 rounded-3xl text-right leading-relaxed shrink-0 shadow-sm shadow-black/5 dark:shadow-black/20 ${isDarkMode ? 'bg-gradient-to-r from-zinc-850/40 to-zinc-900/10 text-zinc-300' : 'bg-gradient-to-r from-emerald-50/50 to-teal-50/10 text-emerald-950'}`}>
                  <h4 className="font-black text-sm mb-1.5 flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-400">
                    <span>💡</span>
                    <span>توفير الوقت عبر التسعير القالب التلقائي</span>
                  </h4>
                  <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 leading-relaxed font-black">
                    من خلال حفظ التسعير القياسي هنا، ستتجنب القلق بشأن إدخال الأسعار يدوياً كل مرة. بمجرد إضافة أي ملف للسلة، سيقوم الكاشير بضرب عدد صفحات الملف تلقائياً بالدول العريض المحدد أدناه لحساب الإجمالي فوراً.
                  </p>
                </div>

                {/* Big inputs side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Single-sided page card */}
                  <div className={`p-6 rounded-3xl flex flex-col justify-between transition-all group shadow-md shadow-black/5 dark:shadow-black/25 ${isDarkMode ? 'bg-zinc-800/20 hover:bg-zinc-800/35' : 'bg-gray-50/40 hover:bg-white hover:shadow-xl hover:shadow-gray-250/20'}`}>
                    <div className="flex items-center gap-3 justify-end mb-4">
                      <div className="text-right">
                        <h5 className="font-black text-xs md:text-sm group-hover:text-emerald-500 transition-colors">طباعة صفحة (وجه واحد - Standard)</h5>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mt-0.5">الرسوم الافتراضية لكل صفحة فردية</p>
                      </div>
                      <span className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                        <FileText size={20} />
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 mr-1">تحديد القيمة بالدينار</label>
                      <div className="relative">
                        <input 
                          type="number"
                          step="0.001"
                          min="0"
                          value={simplexPrice}
                          onChange={(e) => {
                            setSimplexPrice(e.target.value);
                            localStorage.setItem('aladdin_simplex_price', e.target.value);
                          }}
                          className={`w-full px-5 py-3 rounded-2xl border-0 shadow-sm shadow-black/5 dark:shadow-black/20 outline-none font-bold text-sm transition-all text-center focus:ring-4 focus:ring-emerald-500/10 ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'}`}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400" dir="rtl">د.أ</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[9px] font-black mr-1 text-emerald-500">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>تم حفظ المتغير تلقائياً</span>
                      </div>
                    </div>
                  </div>

                  {/* Double sided sheet card */}
                  <div className={`p-6 rounded-3xl flex flex-col justify-between transition-all group shadow-md shadow-black/5 dark:shadow-black/25 ${isDarkMode ? 'bg-zinc-800/20 hover:bg-zinc-800/35' : 'bg-gray-50/40 hover:bg-white hover:shadow-xl hover:shadow-gray-250/20'}`}>
                    <div className="flex items-center gap-3 justify-end mb-4">
                      <div className="text-right">
                        <h5 className="font-black text-xs md:text-sm group-hover:text-emerald-500 transition-colors">طباعة ورقة (وجه وظهر - Duplex)</h5>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mt-0.5">السعر الاقتصادي لورقة مطبوعة من الجهتين</p>
                      </div>
                      <span className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen size={20} />
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 mr-1">تحديد القيمة بالدينار</label>
                      <div className="relative">
                        <input 
                          type="number"
                          step="0.001"
                          min="0"
                          value={duplexPrice}
                          onChange={(e) => {
                            setDuplexPrice(e.target.value);
                            localStorage.setItem('aladdin_duplex_price', e.target.value);
                          }}
                          className={`w-full px-5 py-3 rounded-2xl border-0 shadow-sm shadow-black/5 dark:shadow-black/20 outline-none font-bold text-sm transition-all text-center focus:ring-4 focus:ring-emerald-500/10 ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'}`}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400" dir="rtl">د.أ</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[9px] font-black mr-1 text-emerald-500">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>تم حفظ المتغير تلقائياً</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Premium Interactive Simulator Panel */}
                <div className={`p-6 rounded-3xl transition-all shadow-md shadow-black/5 dark:shadow-black/25 ${isDarkMode ? 'bg-zinc-800/15' : 'bg-gray-50/25'}`}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <span className="text-[10.5px] font-bold text-gray-400 dark:text-zinc-500">محاكاة فورية بناءً على المدخلات الحالية</span>
                    <h5 className="font-black text-xs md:text-sm text-emerald-600 dark:text-emerald-400">📊 محاكي تسعير السلة التفاعلي</h5>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch text-right">
                    {/* User simulator input */}
                    <div className="md:col-span-4 flex flex-col justify-center space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-1.5 mr-1 pt-1">عدد صفحات المستند للاختبار</label>
                        <div className="relative">
                          <input 
                            type="number"
                            min="1"
                            value={simulationPages}
                            onChange={(e) => setSimulationPages(e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-xl border-0 shadow-sm shadow-black/5 dark:shadow-black/20 outline-none font-bold text-xs transition-all text-center focus:outline-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'}`}
                          />
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">صفحة</span>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {['16', '32', '64', '128', '256'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSimulationPages(preset)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${simulationPages === preset ? 'bg-emerald-500 text-white shadow-sm' : (isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white' : 'bg-gray-100 text-gray-650 hover:bg-gray-200')}`}
                          >
                            {preset} ص
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sim values side by side */}
                    <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Simplex Result Card */}
                      <div className={`p-4 rounded-2xl text-center flex flex-col justify-center shadow-sm shadow-black/5 dark:shadow-black/20 ${isDarkMode ? 'bg-zinc-850/40' : 'bg-white'}`}>
                        <span className="text-[9px] font-black text-gray-400 block mb-1">حساب الوجه الواحد</span>
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {((parseInt(simulationPages) || 1) * (parseFloat(simplexPrice) || 0)).toFixed(3)}
                          <span className="text-[10px] font-medium mr-0.5">د.أ</span>
                        </div>
                        <span className="text-[8px] text-gray-450 dark:text-zinc-500 font-bold mt-1">
                          {simulationPages} col × {simplexPrice} d
                        </span>
                      </div>

                      {/* Duplex Result Card */}
                      <div className={`p-4 rounded-2xl text-center flex flex-col justify-center shadow-sm shadow-black/5 dark:shadow-black/20 ${isDarkMode ? 'bg-zinc-850/40' : 'bg-white'}`}>
                        <span className="text-[9px] font-black text-gray-400 block mb-1">حساب الوجه والظهر</span>
                        <div className="text-sm font-black text-indigo-500">
                          {((parseInt(simulationPages) || 1) * (parseFloat(duplexPrice) || 0)).toFixed(3)}
                          <span className="text-[10px] font-medium mr-0.5">د.أ</span>
                        </div>
                        <span className="text-[8px] text-gray-450 dark:text-zinc-500 font-bold mt-1">
                          {simulationPages} col × {duplexPrice} d
                        </span>
                      </div>

                      {/* Efficiency Ratio Card */}
                      <div className={`col-span-2 lg-col-span-1 p-4 rounded-2xl text-center flex flex-col justify-center shadow-sm shadow-black/5 dark:shadow-black/20 ${isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-50/20'}`}>
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 block mb-1">الفارق والموفر للعميل</span>
                        <div className="text-sm font-black text-teal-600 dark:text-teal-400">
                          {Math.max(0, ((parseInt(simulationPages) || 1) * (parseFloat(simplexPrice) || 0)) - ((parseInt(simulationPages) || 1) * (parseFloat(duplexPrice) || 0))).toFixed(3)}
                          <span className="text-[10px] font-medium mr-0.5">د.أ</span>
                        </div>
                        <span className="text-[8px] text-emerald-500 dark:text-emerald-400 font-bold mt-1">نسبة التوفير بالظهر</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-right pb-4 animate-in fade-in duration-300">
                {/* Info Header */}
                <div className={`p-5 rounded-3xl border text-right leading-relaxed shrink-0 ${isDarkMode ? 'bg-zinc-800/40 border-white/5 text-zinc-300' : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'}`}>
                  <h4 className="font-black text-sm mb-1.5 flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-400">
                    <span>🛡️</span>
                    <span>النسخ الاحتياطي ومواجهة فورمات الجهاز</span>
                  </h4>
                  <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 leading-relaxed flex-initial">
                    عند فورمات جهاز الكمبيوتر أو المتصفح، قد تُفقد البيانات المخزنة محلياً بالكامل. يمكنك توليد ملف نسخة احتياطية آمن وتنزيله لحفظ المجلدات وأغلفة الكتب والتسعير والملفات، واستعادته لاحقاً بضغطة زر.
                  </p>
                </div>

                {backupProgress && (
                  <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-pulse flex flex-col items-center justify-center gap-3">
                    <Loader2 size={36} className="animate-spin text-emerald-500" />
                    <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{backupProgress}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Export */}
                  <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-gray-50/50 border-gray-150'}`}>
                    <div>
                      <div className="flex items-center gap-3 justify-end mb-4">
                        <div className="text-right">
                          <h5 className="font-black text-sm">تصدير النسخة الاحتياطية</h5>
                          <p className="text-[10px] font-black text-gray-400 mt-0.5">تنزيل نسخة لجميع ملفاتك وإعدادات المجلدات والأسعار</p>
                        </div>
                        <span className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
                          <Download size={20} />
                        </span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed text-gray-450 dark:text-zinc-400 mb-6 font-sans">
                        سيقوم النظام بتحليل وضغط جميع ملفات الـ PDF والأغلفة المخصصة والروابط والرموز، بالإضافة للسرعة والأسعار في ملف واحد متكامل لتنزيله وحفظه بأمان.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={exportDatabase}
                      disabled={!!backupProgress}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-black text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={14} />
                      <span>تصدير الآن</span>
                    </button>
                  </div>

                  {/* 2. Import */}
                  <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-gray-50/50 border-gray-150'}`}>
                    <div>
                      <div className="flex items-center gap-3 justify-end mb-4">
                        <div className="text-right">
                          <h5 className="font-black text-sm">استيراد النسخة الاحتياطية</h5>
                          <p className="text-[10px] font-black text-gray-400 mt-0.5">استعادة كامل محتوى المكتبة بجميع تفاصيلها</p>
                        </div>
                        <span className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
                          <Upload size={20} />
                        </span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed text-gray-450 dark:text-zinc-400 mb-6 font-sans">
                        رفع ملف الـ JSON الذي تم تصديره مسبقاً لاسترجاع كافة الأقسام والكتب والأسعار. تنبيه: هذا سيؤدي إلى استبدال أي بيانات حالية بمحتويات الملف.
                      </p>
                    </div>
                    
                    <input
                      type="file"
                      ref={backupImportInputRef}
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (confirm("هل أنت متأكد من رغبتك في استيراد النسخة الاحتياطية؟ سيتم تنظيف المستودعات الحالية واستبدالها بالكامل.")) {
                            importDatabase(f);
                          }
                          e.target.value = '';
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => backupImportInputRef.current?.click()}
                      disabled={!!backupProgress}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white font-black text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Upload size={14} />
                      <span>استيراد الآن</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedListId === 'quickaccess') {
    const quickAccessCategories = categories.filter(c => c.isQuickAccess);
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-500 text-right" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 shrink-0 pb-5 border-b border-gray-100 dark:border-white/5" dir="rtl">
          <div className="flex items-center gap-3">
            <span className="p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-lg shadow-amber-500/15 animate-pulse">
              <Zap size={24} />
            </span>
            <div>
              <h3 className={`text-xl md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                الوصول السريع
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-0.5 font-sans">مجلداتك المفضلة والمثبتة للوصول الفوري والسريع</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setSelectedListId(null)}
            className={`px-5 py-3 rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-zinc-800 text-zinc-350 border border-white/5 hover:bg-zinc-700' 
                : 'bg-white text-emerald-800 border border-gray-100 hover:bg-zinc-50'
            }`}
          >
            <ChevronLeft size={16} className="rotate-180" />
            <span>العودة للمكتبة الرئيسية</span>
          </button>
        </div>

        {/* Categories Grid */}
        <div className="flex-1 overflow-auto px-1 py-1 custom-scrollbar">
          {quickAccessCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {quickAccessCategories.map((cat) => {
                const effective = getEffectiveCategoryIcon(cat.id);
                const effectiveIconName = effective?.iconName || 'folder';
                const IconComp = PDF_ICONS.find(i => i.name === effectiveIconName)?.Icon || Folder;
                const count = pdfs.filter(p => p.listId === cat.id).length;
                
                return (
                  <div 
                    key={cat.id}
                    onMouseEnter={() => setFocusedCategoryId(cat.id)}
                    onClick={() => {
                      // Navigate straight to this category/list or parent
                      const hasChildren = categories.some(c => c.parentId === cat.id);
                      if (hasChildren) {
                        setSelectedParentId(cat.id);
                        setSelectedListId(null);
                      } else {
                        setSelectedListId(cat.id);
                      }
                    }}
                    className={`group p-8 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all cursor-pointer flex flex-col items-center text-center relative ${
                      isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'
                    } ${
                      focusedCategoryId === cat.id 
                        ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-500/5 shadow-lg scale-[1.02]' 
                        : ''
                    }`}
                  >
                    <div className={
                      effective?.isBookLayout
                        ? `w-32 h-44 mb-6 rounded-r-md rounded-l-xl border flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-110 shadow-lg ${
                            isDarkMode 
                              ? 'bg-zinc-800 text-emerald-400 border-white/10 border-l-[6px] border-l-black/40' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100 border-l-[6px] border-l-black/25'
                          }`
                        : `p-5 rounded-3xl mb-6 group-hover:scale-110 transition-transform flex items-center justify-center relative ${
                            (effectiveIconName === 'folder' || !effectiveIconName)
                              ? (isDarkMode ? 'bg-amber-950/30 text-amber-500' : 'bg-amber-50 text-amber-600')
                              : (isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                          } ${effective?.iconImage ? 'w-24 h-24' : ''}`
                    }>
                      {effective?.iconImage ? (
                        <img 
                          src={effective.iconImage} 
                          alt={cat.name} 
                          className={effective?.isBookLayout ? "w-full h-full object-cover" : "w-16 h-16 object-contain"} 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <IconComp 
                          size={effective?.isBookLayout ? 56 : 48} 
                          strokeWidth={1.5} 
                          className={(effectiveIconName === 'folder' || !effectiveIconName) ? 'text-amber-500' : ''} 
                        />
                      )}
                      {effective?.isBookLayout && (
                        <div className="absolute left-1.5 top-0 bottom-0 w-[1px] bg-white/20 z-10" />
                      )}
                    </div>
                    <h4 className={`text-xl font-black mb-2 font-sans ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{cat.name}</h4>
                    <p className="text-xs font-bold text-gray-400 font-sans">{count} ملف محفوظ</p>
                    
                    <button 
                      type="button"
                      onClick={(e) => handleDeleteList(cat.id, e)}
                      className="absolute top-4 left-4 p-2 text-gray-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash size={18} />
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => handleEditList(cat, e)}
                      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
              <Zap size={80} className="text-amber-550 mb-4 animate-bounce" />
              <p className="text-xl font-black text-gray-400 font-sans">لا توجد مجلدات في الوصول السريع حالياً</p>
              <p className="text-xs font-bold text-gray-400 mt-2 font-sans">قم بتعديل أي مجلد وفعّل خيار "إضافة إلى الوصول السريع" ليظهر هنا</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedListId === 'wishlist') {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-500 text-right" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0" dir="rtl">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <ShoppingCart size={24} />
            </span>
            <div>
              <h3 className={`text-xl md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                سلة الطلبات الذكية (الكاشير)
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-0.5">البحث المباشر في المكتبة بالكامل، التسعير المرن، والدفع السريع</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedListId(null);
              setWishlistSearchTerm('');
            }}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <ChevronLeft size={24} className="rotate-180" />
          </button>
        </div>

        {/* Main 2-Column POS Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden" dir="rtl">
          
          {/* Right Column: Library Search & POS Adding (Col span 7) */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-0 text-right">
            {/* Search Bar */}
            <div className="relative mb-4 shrink-0">
              <span className="block text-xs font-black text-gray-400 mb-2 mr-1">البحث في كامل مكتبة الـ PDF:</span>
              <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-sm shadow-black/5 dark:shadow-black/20 ${isDarkMode ? 'bg-zinc-800/50' : 'bg-white'}`}>
                <Search size={20} className="text-gray-400" />
                <input 
                  type="text"
                  placeholder="ابحث باسم الكتاب، الملازم، أو المؤلف للإضافة الفورية..."
                  value={wishlistSearchTerm}
                  onChange={(e) => setWishlistSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-right font-black text-xs md:text-sm"
                  dir="rtl"
                />
                {wishlistSearchTerm && (
                  <button 
                    onClick={() => setWishlistSearchTerm('')}
                    className="text-gray-400 hover:text-gray-650 dark:hover:text-zinc-200"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Results grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pl-1 min-h-0">
              {(() => {
                const searchResults = (() => {
                  const term = wishlistSearchTerm.trim().toLowerCase();
                  if (term !== '') {
                    return pdfs.filter(item => {
                      return item.name.toLowerCase().includes(term) || (item.author && item.author.toLowerCase().includes(term));
                    });
                  } else {
                    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    return pdfs.filter(item => {
                      return item.lastOpenedAt && item.lastOpenedAt >= oneWeekAgo;
                    }).sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
                  }
                })();

                if (searchResults.length === 0) {
                  return (
                    <div className="py-16 text-center text-gray-400 font-bold border-2 border-dashed border-gray-150 dark:border-white/5 rounded-3xl" dir="rtl">
                      {wishlistSearchTerm.trim() !== '' ? (
                        <>
                          <Search size={40} className="mx-auto mb-3 opacity-30" />
                          لا توجد نتائج مطابقة لبحثك في المكتبة.
                        </>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-center px-4">
                          <Zap size={36} className="text-amber-500 animate-pulse mb-1" />
                          <span className="text-xs font-black text-emerald-800 dark:text-zinc-200">الكتب النشطة لهذا الأسبوع فارغة</span>
                          <span className="text-[10px] text-gray-450 dark:text-zinc-400">لم تقم بفتح أي ملف في المكتبة خلال الـ 7 أيام الماضية.</span>
                          <span className="text-[9px] text-gray-400 font-black mt-2">ابحث عن أي كتاب بالأعلى وافتحه لكي يظهر هنا كصنف نشط مؤخراً.</span>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                    {searchResults.map(pdf => {
                      const isInCart = wishlist.some(item => item.id === pdf.id);
                      const pCount = pdf.pageCount || 0;
                      const pPrice = parseFloat(pagePriceInput) || 0;
                      const addPrice = isAdditionalPriceEnabled ? (parseFloat(additionalPriceInput) || 0) : 0;
                      const calculatedPrice = (pdf.price && pdf.price > 0)
                        ? pdf.price
                        : (pCount * pPrice) + addPrice;

                      return (
                        <div 
                          key={pdf.id}
                          className={`p-4 rounded-3xl transition flex flex-col justify-between gap-4 shadow-md shadow-black/5 dark:shadow-black/25 ${
                            isInCart 
                              ? (isDarkMode ? 'bg-emerald-950/20 text-emerald-400' : 'bg-emerald-50/50 text-emerald-850')
                              : (isDarkMode ? 'bg-zinc-800/40 hover:bg-zinc-800' : 'bg-white hover:shadow-xl')
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/5 bg-gray-150 dark:bg-zinc-850 flex items-center justify-center relative shadow-sm">
                              <PdfCoverImage pdf={pdf} getAutoCover={getAutoCover} className="w-full h-full object-cover relative z-10" />
                              <FileText size={20} className="absolute text-gray-400 z-0" />
                            </div>
                            <div className="flex flex-col text-right min-w-0 flex-1">
                              <span className="font-extrabold text-xs md:text-sm text-emerald-950 dark:text-zinc-100 truncate" title={pdf.name}>
                                {pdf.name.replace(/\.pdf$/i, '')}
                              </span>
                              {pdf.author && (
                                <span className="text-[10px] text-gray-400 font-bold truncate mt-0.5">
                                  المؤلف: {pdf.author}
                                </span>
                              )}
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black mt-2">
                                {pCount} صفحة • {calculatedPrice.toFixed(2)} دينار
                                {(pdf.price && pdf.price > 0) && (
                                  <span className="text-[9px] text-indigo-500 font-extrabold mr-1">(سعر ثابت من الملف)</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <button 
                              onClick={() => toggleWishlist(pdf)}
                              className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                isInCart 
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/10' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/10'
                              }`}
                            >
                              <ShoppingCart size={14} />
                              {isInCart ? 'إزالة من السلة' : 'إضافة للطلب'}
                            </button>
                            <button
                              onClick={async () => {
                                const fullPdf = getFullPdfFile(pdf);
                                await openPdfExternally(fullPdf);
                              }}
                              className={`p-2 rounded-xl transition cursor-pointer ${
                                isDarkMode ? 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-150 hover:bg-gray-200 text-gray-650'
                              }`}
                              title="معاينة الملف"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Left Column: Cart, pricing & combined calculations (Col span 5) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0 border-t lg:border-t-0 lg:border-r lg:pr-6 dark:border-white/5 pt-6 lg:pt-0">
            
            {/* Pricing parameters */}
            <div className={`p-5 rounded-3xl space-y-4 mb-4 shrink-0 shadow-md shadow-black/5 dark:shadow-black/25 ${isDarkMode ? 'bg-zinc-800/30' : 'bg-white'}`}>
              <h4 className="font-black text-sm text-right text-emerald-600 dark:text-emerald-400">محددات حساب السعر للطلب</h4>
              
              <div className="grid grid-cols-2 gap-4 text-right" dir="rtl">
                <div>
                  <div className="flex items-center justify-between mb-1.5 mr-1">
                    <label className="text-xs font-black text-gray-400">سعر الصفحة (بالدينار):</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-emerald-600">
                      <input 
                        type="checkbox"
                        checked={isDoubleSided}
                        onChange={(e) => {
                          setIsDoubleSided(e.target.checked);
                        }}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span>وجه وظهر</span>
                    </label>
                  </div>
                  <input 
                    type="number"
                    step="0.001"
                    min="0"
                    value={pagePriceInput}
                    onChange={(e) => setPagePriceInput(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-2xl border-0 shadow-sm shadow-black/5 dark:shadow-black/20 outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500/20 ${
                      isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'
                    }`}
                    placeholder="0"
                    dir="rtl"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5 mr-1">
                    <label className="text-xs font-black text-gray-400">سعر إضافي (بالدينار):</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-emerald-600">
                      <input 
                        type="checkbox"
                        checked={isAdditionalPriceEnabled}
                        onChange={(e) => setIsAdditionalPriceEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      تفعيل
                    </label>
                  </div>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={!isAdditionalPriceEnabled}
                    value={additionalPriceInput}
                    onChange={(e) => setAdditionalPriceInput(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-2xl border-0 shadow-sm shadow-black/5 dark:shadow-black/20 outline-none font-bold text-sm transition-opacity focus:ring-2 focus:ring-emerald-500/20 ${
                      !isAdditionalPriceEnabled ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-emerald-950'
                    }`}
                    placeholder="0"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4 pr-1 min-h-0 text-right">
              <div className="flex items-center justify-between mb-3 border-b pb-2 dark:border-white/5">
                <h4 className="font-black text-sm block">الملفات في السلة ({wishlist.length}):</h4>
                <button
                  onClick={() => temporaryFileInputRef.current?.click()}
                  disabled={isTempUploading}
                  className="px-3.5 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-55"
                >
                  {isTempUploading ? (
                    <Loader2 size={13} className="animate-spin text-white" />
                  ) : (
                    <Plus size={13} className="text-white" />
                  )}
                  إضافة ملفات مؤقتة للسلة
                </button>
                <input 
                  type="file"
                  multiple
                  accept="application/pdf"
                  ref={temporaryFileInputRef}
                  onChange={handleUploadTemporaryFiles}
                  className="hidden"
                />
              </div>
              {wishlist.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-bold bg-zinc-50 dark:bg-zinc-800/20 rounded-3xl flex flex-col items-center justify-center h-[180px]">
                  <ShoppingCart size={32} className="opacity-30 mb-2" />
                  السلة فارغة حالياً.
                  <span className="text-[11px] block text-gray-400 mt-1">ابحث عن الملفات أو اضغط على "إضافة ملفات مؤقتة" لإضافتها والبدء في الحساب.</span>
                </div>
              ) : (
                <div className="space-y-2 pr-1 pb-4">
                  {wishlist.map(item => {
                    const pCount = item.pageCount || 0;
                    const pPrice = parseFloat(pagePriceInput) || 0;
                    const addPrice = isAdditionalPriceEnabled ? (parseFloat(additionalPriceInput) || 0) : 0;
                    const fullPdf = pdfs.find(p => p.id === item.id) || item;
                    const calculatedPrice = (fullPdf.price && fullPdf.price > 0)
                      ? fullPdf.price
                      : (pCount * pPrice) + addPrice;
                    const hasCover = fullPdf.coverBlob || getAutoCover(fullPdf.name, fullPdf.listId);
                    const effective = getEffectiveCategoryIcon(fullPdf.listId);
                    const customImage = effective?.iconImage;

                    return (
                      <div 
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-2xl transition shadow-sm shadow-black/5 dark:shadow-black/20 ${
                          isDarkMode 
                            ? 'bg-zinc-800/45 text-zinc-200' 
                            : 'bg-white hover:bg-gray-50 text-emerald-950'
                        }`} 
                        dir="rtl" 
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-12 rounded-lg overflow-hidden shrink-0 ring-1 ring-black/5 bg-gray-150 dark:bg-zinc-850 flex items-center justify-center relative shadow-sm">
                            {hasCover ? (
                              <PdfCoverImage pdf={fullPdf} getAutoCover={getAutoCover} className="w-full h-full object-cover relative z-10" />
                            ) : customImage ? (
                              <img 
                                src={customImage} 
                                alt="category cover" 
                                className="w-full h-full object-cover relative z-10" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : null}
                            <FileText size={16} className="absolute text-gray-400 z-0" />
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="font-extrabold text-xs max-w-[150px] truncate" title={item.name}>
                              {item.name.replace(/\.pdf$/i, '')}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-black">
                                {pCount} ص • {calculatedPrice.toFixed(2)} دينار
                                {(fullPdf.price && fullPdf.price > 0) && (
                                  <span className="text-[9px] text-indigo-500 font-extrabold mr-1">(سعر ثابت)</span>
                                )}
                              </span>
                              {item.isTemporary && (
                                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded-md font-extrabold shrink-0" title="هذا الملف مؤقت ولم يتم تخزينه في المكتبة">
                                  ملف مؤقت
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={async () => {
                              const fullPdf = getFullPdfFile(item);
                              await openPdfExternally(fullPdf);
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              isDarkMode ? 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-150 hover:bg-gray-200 text-gray-650'
                            }`}
                            title="فتح ملف منفرد"
                          >
                            <ExternalLink size={12} />
                          </button>
                          <button 
                            onClick={() => toggleWishlist(item)}
                            className="p-1.5 cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition"
                            title="إزالة من السلة"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total Calculations & Global Actions */}
            {wishlist.length > 0 && (
              <div className="pt-4 shrink-0 space-y-3">
                {/* Sums */}
                <div className="bg-emerald-500/5 p-4 rounded-3xl shadow-sm shadow-emerald-500/5 dark:shadow-black/10" dir="rtl">
                  <div className="flex justify-between items-center text-right font-black mb-1.5">
                    <span className="text-xs text-gray-400">مجموع الصفحات الكلي:</span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">
                      {wishlist.reduce((acc, item) => acc + (item.pageCount || 0), 0)} صفحة
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-right font-black">
                    <span className="text-sm text-gray-400">المبلغ الإجمالي للطلب:</span>
                    <span className="text-lg md:text-xl text-emerald-600 dark:text-emerald-400">
                      {wishlist.reduce((acc, item) => {
                        const fullPdf = pdfs.find(p => p.id === item.id) || item;
                        const pCount = item.pageCount || 0;
                        const pPrice = parseFloat(pagePriceInput) || 0;
                        const addPrice = isAdditionalPriceEnabled ? (parseFloat(additionalPriceInput) || 0) : 0;
                        const itemPrice = (fullPdf.price && fullPdf.price > 0)
                          ? fullPdf.price
                          : (pCount * pPrice) + addPrice;
                        return acc + itemPrice;
                      }, 0).toFixed(2)} دينار
                    </span>
                  </div>
                </div>

                {/* Global Buttons */}
                <div className="grid grid-cols-2 gap-3 shrink-0" dir="rtl">
                  <button 
                    onClick={() => {
                      wishlist.forEach(async (item) => {
                        const fullPdf = getFullPdfFile(item);
                        await openPdfExternally(fullPdf);
                      });
                    }}
                    className="py-3 px-4 text-xs md:text-sm rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow shadow-indigo-600/20 cursor-pointer"
                  >
                    <ExternalLink size={16} />
                    فتح جميع الملفات معاً
                  </button>
                  <button 
                    onClick={() => {
                      setWishlist([]);
                      setTempPdfBlobs({});
                    }}
                    className="py-3 px-4 text-xs md:text-sm rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition flex items-center justify-center gap-2 shadow shadow-rose-600/20 cursor-pointer"
                  >
                    <Trash2 size={16} />
                    تفريغ سلة السحب بالكامل
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    );
  }

  // عرض محتويات القائمة المختارة
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 text-right" dir="rtl">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setSelectedListId(null); setSelectedFile(null); setPreviewUrl(null); }}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <ChevronLeft size={24} className="rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              {currentList?.parentId && (
                <>
                  <span className="text-gray-400 text-xs font-bold">{categories.find(c => c.id === currentList.parentId)?.name}</span>
                  <ChevronLeft size={14} className="text-gray-300" />
                </>
              )}
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{currentList?.name}</h2>
            </div>
            <p className="text-gray-400 text-sm font-bold">قائمة الملفات ({filteredPdfs.length})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isGovCategory(selectedListId) && (
            <div className={`flex items-center gap-3 ml-2 ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-zinc-200'} p-1.5 px-3 rounded-2xl border shadow-inner transition-all`}>
               <div className="flex flex-col">
                  <span className={`text-[9px] font-bold ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'} mb-0.5 leading-none text-right`}>سعر الصفحة</span>
                  <input 
                     type="number" 
                     step="0.001"
                     value={pricePerPage}
                     onChange={(e) => handlePricePerPageChange(e.target.value)}
                     className={`w-16 ${isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'} border rounded-lg px-1.5 py-0.5 text-xs font-bold text-center outline-none focus:border-emerald-500 transition-colors`}
                  />
               </div>
               <div className="flex flex-col">
                  <span className={`text-[9px] font-bold ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'} mb-0.5 leading-none text-right`}>إضافة ثابتة</span>
                  <input 
                     type="number" 
                     step="0.1"
                     value={fixedAddition}
                     onChange={(e) => handleFixedAdditionChange(e.target.value)}
                     className={`w-14 ${isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'} border rounded-lg px-1.5 py-0.5 text-xs font-bold text-center outline-none focus:border-emerald-500 transition-colors`}
                  />
               </div>
               <button
                  onClick={() => updateGovPrices(pricePerPage, fixedAddition, true)}
                  disabled={isUpdatingPrices}
                  className="px-3 py-[3px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg text-[10px] font-black cursor-pointer disabled:cursor-not-allowed shadow-sm self-end transition-all h-[23px] ml-0.5 flex items-center gap-1"
                  title="تحديث أسعار كافة الكتب الحكومية طبقاً للمدخلات الجديدة"
               >
                  {isUpdatingPrices ? (
                     <>
                        <Loader2 size={12} className="animate-spin text-white" />
                        <span>جاري التحديث...</span>
                     </>
                  ) : (
                     <span>تحديث الأسعار</span>
                  )}
               </button>
            </div>
          )}
          <div className="relative w-64 md:w-80">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="بحث في القائمة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pr-12 pl-4 py-3 rounded-2xl border outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-emerald-500' : 'bg-white border-gray-100 text-emerald-900 focus:border-emerald-500 shadow-sm'}`}
            />
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="application/pdf" 
            multiple 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={folderInputRef} 
            onChange={handleFileUpload} 
            // @ts-expect-error - webkitdirectory is non-standard but widely supported
            webkitdirectory="" 
            className="hidden" 
          />
          
          <button 
            onClick={() => setSelectedListId('wishlist')}
            className={`p-3.5 rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center relative shrink-0 ${
              isDarkMode 
                ? 'bg-zinc-800 text-emerald-400 border border-white/5 hover:bg-zinc-700' 
                : 'bg-white text-emerald-700 border border-gray-100 hover:bg-gray-50'
            }`}
            title="سلة الطلبات الذكية (الكاشير)"
          >
            <ShoppingCart size={20} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md animate-bounce">
                {wishlist.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            className={`px-4 py-3 rounded-2xl font-black shadow-lg transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50 ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 shadow-sm'}`}
            title="إضافة مجلد كامل"
          >
            <Folder size={20} className="text-amber-500" />
            <span className="hidden md:inline">مجلد</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            ملفات
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* قسم العرض (يسار) - 60% - Placeholder for the selected file */}
        <div className={`flex-[1.5] rounded-[32px] border shadow-2xl overflow-hidden relative ${isDarkMode ? 'bg-zinc-950 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
          {selectedFile ? (
            <div className="w-full h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
               <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-emerald-600 text-white rounded-xl">
                        <FileText size={18} />
                     </div>
                     <div className="flex flex-col text-right">
                        <h3 className={`text-sm font-black truncate max-w-[200px] md:max-w-md ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                           {selectedFile.name.replace(/\.pdf$/i, '')}
                        </h3>
                        {selectedFile.price !== undefined && (
                          <span className="text-[10px] font-bold text-emerald-500">السعر: {(selectedFile.price).toLocaleString()} دينار</span>
                        )}
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                       onClick={() => showPdfInFolder(selectedFile)}
                       className="p-2 bg-amber-400 text-amber-950 rounded-xl hover:bg-amber-500 transition-all shadow-lg"
                       title="فتح موقع الملف"
                    >
                       <Folder size={14} className="text-amber-950" />
                    </button>

                    <button 
                       onClick={async () => {
                         if (selectedFile?.blob) {
                           try {
                             // @ts-expect-error - electronAPI is injected by preload script
                             if (window.electronAPI && window.electronAPI.saveAndOpenPdf) {
                               const buffer = await selectedFile.blob.arrayBuffer();
                               // @ts-expect-error - electronAPI is injected by preload script
                             await window.electronAPI.saveAndOpenPdf({ 
                               name: selectedFile.name, 
                               buffer: buffer 
                             });
                           } else {
                             if (previewUrl) {
                               const link = document.createElement('a');
                               link.href = previewUrl;
                               link.target = '_blank';
                               link.click();
                             }
                           }
                         } catch (err) {
                           console.error("Failed to open PDF:", err);
                         }
                       }
                     }}
                     className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                   >
                      <ExternalLink size={14} />
                      فتح خارجي
                   </button>
                  </div>
               </div>
               
               <div className="flex-1 bg-zinc-200 dark:bg-black relative">
                  {previewUrl ? (
                    <iframe 
                       src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                       className="w-full h-full border-none"
                       title="PDF Content"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Loader2 size={40} className="animate-spin text-emerald-500" />
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
               <FileText size={120} strokeWidth={1} className="text-gray-400 mb-6" />
               <p className="text-2xl font-black">حدد ملفاً لعرضه هنا</p>
               <p className="text-sm font-bold mt-2">انقر على أي ملف من القائمة لفتحه فوراً</p>
            </div>
          )}
        </div>

        {/* قسم القائمة (يمين) - 40% */}
        <div className={`flex-1 rounded-[32px] border shadow-sm overflow-hidden flex flex-col ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {filteredPdfs.map((pdf) => {
              const effective = getEffectiveCategoryIcon(pdf.listId);
              const customImage = effective?.iconImage;
              const hasCover = pdf.coverBlob || getAutoCover(pdf.name, pdf.listId);
              const isBookStyle = effective?.isBookLayout || !!hasCover;
              return (
                <div 
                  key={pdf.id}
                  onClick={() => handleSelectFile(pdf)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-4 ${
                    selectedFile?.id === pdf.id 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                      : (isDarkMode ? 'bg-zinc-800/50 border-white/5 hover:border-emerald-500/30 text-zinc-300' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-200 text-emerald-900')
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={
                      isBookStyle
                        ? `w-10 h-14 rounded-r-xs rounded-l-sm border shrink-0 overflow-hidden relative flex items-center justify-center shadow-sm ${
                            selectedFile?.id === pdf.id 
                              ? 'bg-white/10 text-white border-white/20 border-l-[3px] border-l-black/35' 
                              : (isDarkMode ? 'bg-zinc-800 text-emerald-400 border-white/5 border-l-[3px] border-l-black/30' : 'bg-emerald-50 text-emerald-600 border-emerald-100 border-l-[3px] border-l-black/20')
                          }`
                        : `p-2 rounded-xl shrink-0 ${selectedFile?.id === pdf.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'} ${customImage ? 'w-10 h-10 flex items-center justify-center bg-white/10' : ''}`
                    }>
                      {hasCover ? (
                        <PdfCoverImage 
                          pdf={pdf} 
                          getAutoCover={getAutoCover} 
                          className="w-full h-full object-cover" 
                        />
                      ) : customImage ? (
                        <img 
                          src={customImage} 
                          alt="icon" 
                          className={effective?.isBookLayout ? "w-full h-full object-cover" : "w-8 h-8 object-contain"} 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <FileText size={20} />
                      )}
                      {isBookStyle && (
                        <div className="absolute left-[3px] top-0 bottom-0 w-[1px] bg-white/20 z-10" />
                      )}
                    </div>
                  <div className="min-w-0 flex-1">
                    {renamingId === pdf.id ? (
                      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                           <input
                             autoFocus
                             type="text"
                             placeholder="اسم الملف"
                             value={newName}
                             onChange={(e) => setNewName(e.target.value)}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') handleRename(pdf.id, pdf.name, pdf.price, pdf.pageCount);
                               if (e.key === 'Escape') setRenamingId(null);
                             }}
                             className={`w-full px-2 py-1 rounded-lg text-xs font-bold border outline-none ${isDarkMode ? 'bg-zinc-700 border-white/20 text-white' : 'bg-white border-gray-300 text-emerald-900'}`}
                           />
                           <button 
                             onClick={(e) => handleRename(pdf.id, pdf.name, pdf.price, pdf.pageCount, e)}
                             className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shrink-0"
                           >
                             <Check size={14} />
                           </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="السعر"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold border outline-none ${isDarkMode ? 'bg-zinc-700 border-white/20 text-white' : 'bg-white border-gray-300 text-emerald-900'}`}
                          />
                          <input
                            type="number"
                            placeholder="عدد الورق"
                            value={newPageCount}
                            onChange={(e) => setNewPageCount(e.target.value)}
                            className={`w-16 px-2 py-1 rounded-lg text-[10px] font-bold border outline-none ${isDarkMode ? 'bg-zinc-700 border-white/20 text-white' : 'bg-white border-gray-100 text-blue-600'}`}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-xs font-black truncate leading-relaxed" title={pdf.name}>
                          {pdf.name.replace(/\.pdf$/i, '')}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-[9px] font-bold ${selectedFile?.id === pdf.id ? 'text-white/70' : 'text-gray-400'}`}>
                            {formatSize(pdf.size)} • {pdf.pageCount || 0} ص
                          </p>
                          {pdf.price !== undefined && pdf.price > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 text-[8px] font-bold">
                               {pdf.price} د.ع
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(pdf);
                    }}
                    className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                      selectedFile?.id === pdf.id 
                        ? 'hover:bg-black/20 text-white' 
                        : wishlist.some(item => item.id === pdf.id)
                          ? 'hover:bg-rose-50 text-rose-500' 
                          : 'hover:bg-emerald-50 text-emerald-500'
                    }`}
                    title={wishlist.some(item => item.id === pdf.id) ? "إزالة من السلة" : "إضافة إلى السلة"}
                   >
                     <ShoppingCart size={16} />
                   </button>
                   <button 
                    onClick={(e) => handleRename(pdf.id, pdf.name, pdf.price, pdf.pageCount, e)}
                    className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${selectedFile?.id === pdf.id ? 'hover:bg-black/20 text-white' : 'hover:bg-blue-50 text-blue-400'}`}
                   >
                     <Edit2 size={16} />
                   </button>
                   <button 
                    onClick={(e) => deletePdf(pdf.id, e)}
                    className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${selectedFile?.id === pdf.id ? 'hover:bg-black/20 text-white' : 'hover:bg-emerald-50 text-emerald-400'}`}
                   >
                     <Trash2 size={16} />
                   </button>
                   <ChevronLeft size={16} className={`transition-transform ${selectedFile?.id === pdf.id ? '-rotate-90' : ''}`} />
                </div>
              </div>
              );
            })}
            {filteredPdfs.length === 0 && (
              <div className="py-20 text-center opacity-30 flex flex-col items-center">
                <FileUp size={48} className="mb-4" />
                <p className="text-sm font-black">لا توجد ملفات في هذه القائمة</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {showQuickPreview && previewUrl && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
           <div className={`w-full h-full max-w-6xl rounded-[40px] shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                 <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl">
                       <FileText size={20} />
                    </div>
                    <div className="text-right">
                       <h3 className={`text-lg font-black truncate max-w-md ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedFile?.name.replace(/\.pdf$/i, '')}</h3>
                       <p className="text-[10px] font-bold text-gray-400">معاينة سريعة للصفحات</p>
                    </div>
                 </div>
                 <button 
                    onClick={closeQuickPreview}
                    className="p-3 bg-gray-200 hover:bg-emerald-500 hover:text-white dark:bg-zinc-800 text-gray-500 rounded-2xl transition-all"
                 >
                    <X size={24} />
                 </button>
              </div>
              <div className="flex-1 bg-zinc-100 dark:bg-black relative">
                 <iframe 
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-none"
                    title="PDF Preview"
                 />
              </div>
              <div className="p-6 flex justify-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-white/5">
                 <button 
                   onClick={async () => {
                     if (selectedFile?.blob) {
                       try {
                         // @ts-expect-error - electronAPI is injected by preload script
                         if (window.electronAPI && window.electronAPI.saveAndOpenPdf) {
                           const buffer = await selectedFile.blob.arrayBuffer();
                           // @ts-expect-error - electronAPI is injected by preload script
                           await window.electronAPI.saveAndOpenPdf({ 
                             name: selectedFile.name, 
                             buffer: buffer 
                           });
                         } else {
                           if (previewUrl) {
                             const link = document.createElement('a');
                             link.href = previewUrl;
                             link.target = '_blank';
                             link.click();
                           }
                         }
                       } catch (err) {
                         console.error("Failed to open PDF:", err);
                       }
                     }
                   }}
                   className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                 >
                    <ExternalLink size={18} />
                    فتح خارجي
                 </button>

                 <button 
                   onClick={async () => {
                     if (selectedFile?.blob) {
                       try {
                         // @ts-expect-error - electronAPI is injected by preload script
                         if (window.electronAPI && window.electronAPI.saveAndShowPdf) {
                           const buffer = await selectedFile.blob.arrayBuffer();
                           // @ts-expect-error - electronAPI is injected by preload script
                           await window.electronAPI.saveAndShowPdf({ 
                             name: selectedFile.name, 
                             buffer: buffer 
                           });
                         }
                       } catch (err) { console.error(err); }
                     }
                   }}
                   className="px-8 py-3 bg-amber-400 text-amber-950 rounded-2xl font-black shadow-lg hover:bg-amber-500 transition-all flex items-center gap-2"
                 >
                    <Folder size={18} className="text-amber-950" />
                    فتح موقع الملف
                 </button>
                 <button 
                  onClick={closeQuickPreview}
                  className={`px-8 py-3 rounded-2xl font-black ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-gray-600 shadow-sm border border-gray-200'}`}
                 >
                    إغلاق المعاينة
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Details Screen Overlay for inside category view */}
      {showDetails && selectedFile && (
        <div className={`absolute inset-0 z-[100] flex flex-col animate-in slide-in-from-left duration-300 ${isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
          <div className={`flex items-center justify-between p-6 border-b shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowDetails(false)}
                  className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <ChevronLeft size={24} className="rotate-180" />
                </button>
                <div className="text-right">
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedFile.name.replace(/\.pdf$/i, '')}</h2>
                  <p className="text-gray-400 text-xs font-bold">تفاصيل الملف ومعاينته</p>
                </div>
             </div>

             <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowDetails(false)}
                  className={`p-2 rounded-xl hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 transition-all`}
                >
                  <X size={24} />
                </button>
             </div>
          </div>

          <div className="flex-1 flex gap-8 p-6 overflow-hidden">
             {/* Right: Details */}
             <div className="w-96 flex flex-col gap-6 shrink-0 text-right details-panel-3" dir="rtl">
                <div className={`p-8 rounded-[32px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
                   <h3 className={`text-lg font-black mb-6 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>معلومات الملف</h3>
                   
                   <div className="space-y-4">
                      {/* تعديل حقل اسم الملف */}
                      {editingField === 'name' ? (
                         <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right">
                            <span className="text-gray-400 font-bold text-xs">اسم الملف الجديد:</span>
                            <div className="flex gap-2">
                               <input 
                                  type="text" 
                                  value={editTempName}
                                  onChange={(e) => setEditTempName(e.target.value)}
                                  className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                  placeholder="اسم الملف"
                               />
                            </div>
                            <div className="flex justify-end gap-2 text-xs">
                               <button 
                                  onClick={() => handleSaveFileField('name', editTempName)} 
                                  className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                               >
                                  حفظ
                               </button>
                               <button 
                                  onClick={() => setEditingField(null)} 
                                  className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                               >
                                  إلغاء
                               </button>
                            </div>
                         </div>
                      ) : (
                         <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                            <div className="flex flex-col text-right">
                               <span className="text-gray-400 font-bold text-xs">اسم الملف:</span>
                               <span className={`font-black text-sm truncate max-w-[150px] ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedFile.name.replace(/\.pdf$/i, '')}</span>
                            </div>
                            <button 
                               onClick={() => {
                                  setEditingField('name');
                                  setEditTempName(selectedFile.name.replace(/\.pdf$/i, ''));
                               }} 
                               className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                            >
                               تعديل
                            </button>
                         </div>
                      )}

                      {/* تعديل حقل السعر */}
                      {editingField === 'price' ? (
                         <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right">
                            <span className="text-gray-400 font-bold text-xs">السعر الجديد (بالدينار):</span>
                            <div className="flex gap-2">
                               <input 
                                  type="number" 
                                  value={editTempPrice}
                                  onChange={(e) => setEditTempPrice(e.target.value)}
                                  className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                  placeholder="السعر"
                               />
                            </div>
                            <div className="flex justify-end gap-2 text-xs">
                               <button 
                                  onClick={() => handleSaveFileField('price', editTempPrice)} 
                                  className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                               >
                                  حفظ
                               </button>
                               <button 
                                  onClick={() => setEditingField(null)} 
                                  className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                               >
                                  إلغاء
                               </button>
                            </div>
                         </div>
                      ) : (
                         <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                            <div className="flex flex-col text-right">
                               <span className="text-gray-400 font-bold text-xs">السعر:</span>
                               <span className="font-black text-emerald-500 text-sm">{selectedFile.price || 0} دينار</span>
                            </div>
                            <button 
                               onClick={() => {
                                  setEditingField('price');
                                  setEditTempPrice((selectedFile.price || 0).toString());
                               }} 
                               className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                            >
                               تعديل
                            </button>
                         </div>
                      )}

                      {/* حقل اسم المؤلف وتعديله */}
                      {editingField === 'author' ? (
                         <div className="py-3 border-b dark:border-white/5 flex flex-col gap-2 text-right">
                            <span className="text-gray-400 font-bold text-xs">اسم المؤلف الجديد:</span>
                            <div className="flex gap-2">
                               <input 
                                  type="text" 
                                  value={editTempAuthor}
                                  onChange={(e) => setEditTempAuthor(e.target.value)}
                                  className={`flex-1 px-3 py-1.5 text-sm rounded-xl border outline-none font-bold ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                                  placeholder="اسم المؤلف"
                               />
                            </div>
                            <div className="flex justify-end gap-2 text-xs">
                               <button 
                                  onClick={() => handleSaveFileField('author', editTempAuthor)} 
                                  className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg hover:bg-emerald-700 transition"
                               >
                                  حفظ
                               </button>
                               <button 
                                  onClick={() => setEditingField(null)} 
                                  className={`px-3 py-1 rounded-lg font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}
                               >
                                  إلغاء
                               </button>
                            </div>
                         </div>
                      ) : (
                         <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                            <div className="flex flex-col text-right">
                               <span className="text-gray-400 font-bold text-xs">المؤلف:</span>
                               <span className={`font-black text-xs md:text-sm ${isDarkMode ? 'text-zinc-200' : 'text-emerald-950'}`}>
                                  {selectedFile.author || 'غير محدد'}
                                </span>
                            </div>
                            <button 
                               onClick={() => {
                                  setEditingField('author');
                                  setEditTempAuthor(selectedFile.author || '');
                                }} 
                               className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition duration-200 font-black"
                            >
                               تعديل
                            </button>
                         </div>
                      )}

                      <div className="flex justify-between items-center py-3 border-b dark:border-white/5">
                         <span className="text-gray-400 font-bold text-xs">عدد الورق:</span>
                         <span className="font-black text-sm text-blue-500">{selectedFile.pageCount || 0} صفحة</span>
                      </div>
                      {false && <div className="flex justify-between items-center py-3">
                         <span className="text-gray-400 font-bold text-xs">الحجم:</span>
                         <span className="font-black text-sm text-gray-500">{formatSize(selectedFile.size)}</span>
                      </div>}
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => toggleWishlist(selectedFile)}
                    className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg ${
                      wishlist.some(item => item.id === selectedFile.id)
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                    }`}
                  >
                    <ShoppingCart size={20} />
                    {wishlist.some(item => item.id === selectedFile.id) ? 'إزالة من السلة' : 'إضافة للسلة'}
                  </button>
                  <button 
                    onClick={() => handlePrint(selectedFile.blob)}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Printer size={20} />
                    طباعة الملف
                  </button>
                  
                  <button 
                    onClick={() => openPdfExternally(selectedFile)}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <ExternalLink size={20} />
                    فتح الملف
                  </button>

                  <button 
                    onClick={() => showPdfInFolder(selectedFile)}
                    className="w-full py-4 rounded-2xl bg-amber-400 text-amber-950 font-black hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                  >
                    <Folder size={20} className="text-amber-950" />
                    فتح موقع الملف
                  </button>

                  <input 
                    type="file" 
                    ref={coverInputRef} 
                    onChange={handleCoverUpload} 
                    accept="application/pdf,image/*" 
                    className="hidden" 
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => coverInputRef.current?.click()}
                      className="py-4 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-xs text-center"
                    >
                      <ImageIcon size={18} />
                      إضافة غلاف
                    </button>
                    <button 
                      onClick={() => setShowImportCoverModal(true)}
                      className="py-4 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-xs text-center"
                    >
                      <ImageIcon size={18} />
                      استيراد صور
                    </button>
                  </div>
                </div>

                {(selectedFile.coverBlob || getAutoCover(selectedFile.name, selectedFile.listId)) && (
                  <div className={`p-6 rounded-[32px] border shadow-sm bg-blue-500/10 border-blue-500/20`}>
                     <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-blue-600 text-white rounded-lg">
                              <ImageIcon size={18} />
                           </div>
                           <div className="text-right">
                              <h4 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                                {selectedFile.coverBlob ? 'يوجد غلاف مخصص' : 'يوجد غلاف تلقائي للمجلد'}
                              </h4>
                              <p className="text-[10px] font-bold text-blue-400">طباعة الغلاف حده</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => handlePrint(selectedFile.coverBlob || getAutoCover(selectedFile.name, selectedFile.listId) || undefined)}
                          className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                          title="طباعة الغلاف"
                        >
                          <Printer size={18} />
                        </button>
                     </div>
                  </div>
                )}

                <div className="mt-auto">
                   <p className="text-[10px] text-gray-400 font-bold text-center">تاريخ الإضافة: {new Date(selectedFile.addedAt).toLocaleString('ar-EG')}</p>
                </div>
             </div>

             {/* Left: Preview A4 */}
             <div className="flex-1 flex items-start justify-center overflow-auto custom-scrollbar">
                <div className={`w-full max-w-[600px] aspect-[1/1.414] shadow-2xl rounded-sm overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-200'}`}>
                   {previewUrl ? (
                      <iframe 
                         src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                         className="w-full h-full border-none"
                         title="PDF Content"
                      />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                         <Loader2 size={48} className="animate-spin text-emerald-500" />
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfManager;
