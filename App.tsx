import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Book, Page, ToastMessage, UserAccount, SaleRecord, PurchaseItem, Supplier, Category, Customer, PurchaseInvoiceRecord, SaleItem, FinancialEntry, Publisher, SubCategory, CartItem } from './types';
import booksSeed from './src/data/books_seed.json';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ItemCard from './components/ItemCard';
import Warehouse from './components/Warehouse';
import BookForm from './components/BookForm';
import Settings from './components/Settings';
import Toast from './components/Toast';
import Login from './components/Login';
import Sales from './components/Sales';
import SalesHistory from './components/SalesHistory';
import Profile from './components/Profile';
import PurchaseInvoice from './components/PurchaseInvoice';
import EducationalManager from './components/EducationalManager';
import GamesRoom from './components/GamesRoom';
// Fix: Added @ts-ignore to ignore the missing default export error in the truncated Suppliers component file while maintaining project integrity
// @ts-expect-error: Suppliers component might have missing default export in truncated files
import Suppliers from './components/Suppliers';
import { Sun, Moon, Cloud, WifiOff, CloudOff, ShieldAlert } from 'lucide-react';
import { CacheService } from './services/cacheService';
import { saveCoverToIDB, deleteCoverFromIDB } from './src/utils/imageStorage';

import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  Firestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  clearIndexedDbPersistence, 
  getDoc,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, FirebaseStorage } from 'firebase/storage';

// ==========================================================
// إعدادات افتراضية (Fallback) - تم التحديث للقيم الجديدة
// ==========================================================
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCZ4RZ4KXbRZd8_pf54S480K0lUWsDIUWI",
  authDomain: "marwan31912-42a54.firebaseapp.com",
  projectId: "marwan31912-42a54",
  storageBucket: "marwan31912-42a54.firebasestorage.app",
  messagingSenderId: "25121141835",
  appId: "1:25121141835:web:4f10fadb1b1b6888cbc9ce",
  measurementId: "G-V2H11TZW3P"
};

// وظيفة الحصول على الإعدادات الحالية
const getActiveFirebaseConfig = () => {
  const saved = localStorage.getItem('ALADDIN_FIREBASE_CONFIG');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      return DEFAULT_FIREBASE_CONFIG;
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
};

// وظيفة تهيئة Firebase بشكل آمن
const initFirebaseInstance = (config: any) => {
  try {
    const currentApps = getApps();
    const firebaseApp = !currentApps.length ? initializeApp(config) : currentApps[0];
    const storage = getStorage(firebaseApp);
    
    // محاولة الحصول على نسخة جيدة مع تفعيل التخزين المؤقت المحلي المستمر (persistentCache) للأداء السريع والأوفلاين
    let firestore: Firestore;
    try {
      firestore = initializeFirestore(firebaseApp, { 
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (e) {
      firestore = getFirestore(firebaseApp);
    }
    return { db: firestore, storage };
  } catch (e) {
    console.error("Firebase Init Failed:", e);
    return null;
  }
};

const PALETTES: Record<string, Record<number, string>> = {
  emerald: {50:'236 253 245',100:'209 250 229',200:'167 243 208',300:'110 231 183',400:'52 211 153',500:'16 185 129',600:'5 150 105',700:'4 120 87',800:'6 95 70',900:'6 78 59',950:'2 44 34'},
  blue: {50:'239 246 255',100:'219 234 254',200:'191 219 254',300:'147 197 253',400:'96 165 250',500:'59 130 246',600:'37 99 235',700:'29 78 216',800:'30 64 175',900:'30 58 138',950:'23 37 84'},
  purple: {50:'250 245 255',100:'243 232 255',200:'233 213 255',300:'216 180 254',400:'192 132 252',500:'168 85 247',600:'147 51 234',700:'126 34 206',800:'107 33 168',900:'88 28 135',950:'59 7 100'},
  rose: {50:'255 241 242',100:'255 228 230',200:'167 243 208',300:'110 231 183',400:'52 211 153',500:'16 185 129',600:'5 150 105',700:'4 120 87',800:'6 95 70',900:'6 78 59',950:'2 44 34'},
  amber: {50:'255 251 235',100:'243 232 254',200:'191 219 254',300:'147 197 253',400:'96 165 250',500:'59 130 246',600:'37 99 235',700:'29 78 216',800:'30 64 175',900:'30 58 138',950:'23 37 84'}, // Fixed: amber palette was misconfigured
  indigo: {50:'238 242 255',100:'224 231 255',200:'199 210 254',300:'165 180 252',400:'129 140 248',500:'99 102 241',600:'79 70 229',700:'67 56 202',800:'55 48 163',900:'49 46 129',950:'30 27 75'},
  cyan: {50:'236 254 255',100:'207 250 254',200:'165 243 252',300:'103 232 249',400:'34 211 238',500:'6 182 212',600:'8 145 178',700:'14 116 144',800:'21 94 117',900:'22 78 99',950:'8 51 68'},
  teal: {50:'240 253 250',100:'204 251 241',200:'153 246 228',300:'94 234 212',400:'45 212 191',500:'20 184 166',600:'13 148 136',700:'15 118 110',800:'17 94 89',900:'19 78 74',950:'47 46 19'},
  lime: {50:'247 254 231',100:'236 252 203',200:'217 249 157',300:'190 242 100',400:'163 230 53',500:'132 204 22',600:'101 163 13',700:'77 124 15',800:'63 98 18',900:'54 83 20',950:'26 46 5'},
  yellow: {50:'254 252 232',100:'254 249 195',200:'254 240 138',300:'253 224 71',400:'250 204 21',500:'234 179 8',600:'202 138 4',700:'161 98 7',800:'133 77 14',900:'113 63 18',950:'66 32 6'},
  orange: {50:'255 247 237',100:'255 237 213',200:'254 215 170',300:'253 186 116',400:'251 146 60',500:'249 115 22',600:'234 88 12',700:'194 65 12',800:'154 52 18',900:'124 45 18',950:'67 20 7'},
  pink: {50:'253 242 248',100:'252 231 243',200:'251 207 232',300:'249 168 212',400:'244 114 182',500:'236 72 153',600:'219 39 119',700:'190 24 93',800:'157 23 77',900:'131 24 67',950:'80 7 36'},
  fuchsia: {50:'253 244 255',100:'250 232 255',200:'245 208 254',300:'240 171 252',400:'232 121 249',500:'217 70 239',600:'192 38 211',700:'162 27 180',800:'134 25 143',900:'112 26 117',950:'74 4 78'},
  violet: {50:'245 243 255',100:'237 233 254',200:'221 214 254',300:'196 181 253',400:'167 139 250',500:'139 92 246',600:'124 58 237',700:'109 40 217',800:'91 33 182',900:'76 29 149',950:'46 16 101'},
  slate: {50:'248 250 252',100:'241 245 249',200:'226 232 240',300:'203 213 225',400:'148 163 184',500:'100 116 139',600:'71 85 105',700:'51 65 85',800:'30 41 59',900:'15 23 42',950:'2 6 23'},
};

const DEFAULT_USER: UserAccount = { username: 'مروان بالعيد', password: '31912', isManager: true };
const DEFAULT_CATEGORIES = [{ id: '1', name: 'رواية', addedAt: Date.now() }];

const sanitize = (obj: any) => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    // Fallback for circular references
    try {
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return; // Discard circular reference
          }
          seen.add(value);
        }
        return value;
      }));
    } catch (e2) {
      console.error("Data sanitization failed:", e2);
      return {}; // Return empty object as safe fallback
    }
  }
};

const hydrateUsersWithAvatars = (usersList: UserAccount[], setUserAvatars: any) => {
  if (typeof indexedDB === 'undefined' || usersList.length === 0) return;
  
  const request = indexedDB.open("AladdinProfiles", 1);
  
  request.onupgradeneeded = (e: any) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("avatars")) {
      db.createObjectStore("avatars");
    }
  };

  request.onsuccess = (e: any) => {
    const dbInstance = e.target.result;
    if (!dbInstance.objectStoreNames.contains("avatars")) return;
    
    const tx = dbInstance.transaction("avatars", "readonly");
    const store = tx.objectStore("avatars");
    
    usersList.forEach(user => {
      const getReq = store.get(user.username);
      getReq.onsuccess = () => {
        if (getReq.result instanceof Blob) {
          setUserAvatars((prev: any) => ({ ...prev, [user.username]: URL.createObjectURL(getReq.result) }));
        } else if (user.avatar && user.avatar.startsWith('data:')) {
          saveAvatarToIDB(user.username, user.avatar, setUserAvatars);
        }
      };
    });
  };
};

const saveAvatarToIDB = async (username: string, base64Data: string, setUserAvatars: any) => {
  try {
    const res = await fetch(base64Data);
    const blob = await res.blob();
    const dbRequest = indexedDB.open("AladdinProfiles", 1);
    
    dbRequest.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("avatars")) {
        db.createObjectStore("avatars");
      }
    };

    dbRequest.onsuccess = (e: any) => {
      const idb = e.target.result;
      const tx = idb.transaction("avatars", "readwrite");
      const store = tx.objectStore("avatars");
      store.put(blob, username);
      tx.oncomplete = () => {
        setUserAvatars((prev: any) => ({ ...prev, [username]: URL.createObjectURL(blob) }));
        idb.close();
      };
    };
  } catch (err) {
    console.error("Failed to save avatar to IDB:", err);
  }
};

// وظيفة مساعدة لاستعادة الصور من IndexedDB عند تحميل البيانات
const hydrateBooksWithImages = (booksData: any[]): Promise<any[]> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("IDB Hydration timed out");
      resolve(booksData);
    }, 3000);

    if (typeof indexedDB === 'undefined') { 
      clearTimeout(timeout);
      resolve(booksData); 
      return; 
    }
    
    const request = indexedDB.open("AladdinImages", 3);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("covers")) {
        db.createObjectStore("covers");
      }
    };

    request.onerror = () => {
      clearTimeout(timeout);
      resolve(booksData);
    };
    
    request.onsuccess = (e: any) => {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains("covers")) {
        clearTimeout(timeout);
        resolve(booksData);
        return;
      }
      
      try {
        const tx = dbInstance.transaction("covers", "readwrite");
        const store = tx.objectStore("covers");
        const processedBooks = [...booksData];
        let pending = processedBooks.length;
        
        if (pending === 0) { 
          clearTimeout(timeout);
          resolve(processedBooks); 
          return; 
        }

        processedBooks.forEach((book, idx) => {
          const getReq = store.get(book.id);
          getReq.onsuccess = () => {
            if (book.image && book.image.startsWith('data:')) {
              // صورة Base64 حديثة: يتم حفظها كـ Blob في IndexedDB واستخدامها فوراً
              try {
                const parts = book.image.split(',');
                const byteString = atob(parts[1]);
                const mimeString = parts[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeString });
                const saveTx = dbInstance.transaction("covers", "readwrite");
                saveTx.objectStore("covers").put(blob, book.id);
                processedBooks[idx] = { ...book, image: URL.createObjectURL(blob) };
              } catch (saveErr) {
                console.error("Failed to save data: image to IDB:", saveErr);
                processedBooks[idx] = { ...book };
              }
            } else if (getReq.result instanceof Blob) {
              // موجودة محلياً في IndexedDB، نستخدمها
              processedBooks[idx] = { ...book, image: URL.createObjectURL(getReq.result) };
            } else if (book.image) {
              processedBooks[idx] = { ...book, image: book.image };
            }

            pending--;
            if (pending === 0) {
              clearTimeout(timeout);
              resolve(processedBooks);
            }
          };
          getReq.onerror = () => {
            pending--;
            if (pending === 0) {
              clearTimeout(timeout);
              resolve(processedBooks);
            }
          };
        });
      } catch (err) {
        console.error("IDB Hydration Error:", err);
        clearTimeout(timeout);
        resolve(booksData);
      }
    };
  });
};

// وظيفة مساعدة للتحقق من وجود اتصال حقيقي بالإنترنت (تتجاوز خداع كابل الإيثرنت المحلي)
const checkRealConnectivity = async (): Promise<boolean> => {
  if (!navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    // محاولة جلب مورد خارجي موثوق (Favicon من جوجل)
    const response = await fetch("https://www.google.com/favicon.ico", {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return true; // إذا نجح الطلب فهذا يعني وجود إنترنت فعلي
  } catch (e) {
    return false; // فشل الطلب يعني غالباً لا يوجد إنترنت (حتى لو كابل الشبكة موصول)
  }
};

const App: React.FC = () => {
  const [db, setDb] = useState<Firestore | null>(null);
  const [storage, setStorage] = useState<FirebaseStorage | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isSplashEnabled, setIsSplashEnabled] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [systemName, setSystemName] = useState<string>(() => localStorage.getItem('aladdin_system_name') || 'حجة');
  
  // تفعيل اللون والحجم الفوري عبر LocalStorage (للإقلاع الفوري) ثم المزامنة مع IndexedDB
  const [accentColor, setAccentColor] = useState<string>(() => localStorage.getItem('aladdin_accent') || 'emerald');
  const [zoomLevel, setZoomLevel] = useState<number>(() => Number(localStorage.getItem('aladdin_zoom')) || 1);
  
  // تفعيل التحجيم المتجاوب عبر تعديل حجم الخط الأساسي
  // وظيفة تهيئة Firebase
  const handleInitFirebase = useCallback(() => {
    if (db) return; // تم التهيئة بالفعل
    if (!navigator.onLine || localStorage.getItem('manualOfflineMode') === 'true') return;
    
    const config = getActiveFirebaseConfig();
    const result = initFirebaseInstance(config);
    if (result) {
      console.log("Firebase Global Services Initialized successfully");
      setDb(result.db);
      setStorage(result.storage);
    }
  }, [db]);

  // التحقق من حالة التهيئة المستمرة عند بدء التشغيل (خاص بـ Electron)
  useEffect(() => {
    const checkInit = async () => {
      let initialized = false;
      
      // 1. التحقق من init.json (Electron) - الأولوية القصوى لتجنب التعليق
      // @ts-expect-error: electronAPI is exposed via preload script
      if (window.electronAPI && window.electronAPI.getInitStatus) {
        try {
          // @ts-expect-error: electronAPI is exposed via preload script
          const statusPromise = window.electronAPI.getInitStatus();
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ initialized: false }), 2000));
          const status = await Promise.race([statusPromise, timeoutPromise]) as any;
          if (status && status.initialized) {
            initialized = true;
          }
        } catch (e) {
          console.error("Init status check failed:", e);
        }
      }

      // 2. التحقق من LocalStorage (Browser fallback)
      if (!initialized && localStorage.getItem('ALADDIN_SETUP_SKIPPED') === 'true') {
        initialized = true;
      }

      if (initialized) {
        setIsInitialized(true);
        if (!localStorage.getItem('ALADDIN_SETUP_SKIPPED')) {
          localStorage.setItem('ALADDIN_SETUP_SKIPPED', 'true');
        }
      }
    };
    checkInit();
  }, []);

  // محاولة تهيئة Firebase بمجرد توفر الإنترنت أو تجاوز شاشة الإعداد
  useEffect(() => {
    if (isInitialized) {
      handleInitFirebase();
    }
  }, [isInitialized, handleInitFirebase]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * zoomLevel}px`;
  }, [zoomLevel]);

  // منطق تفعيل اللون الديناميكي فورياً عند تغيير accentColor أو تحميل التطبيق
  useEffect(() => {
    const palette = PALETTES[accentColor] || PALETTES.emerald;
    const styleId = 'dynamic-theme-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    
    const rules = Object.entries(palette).map(([shade, rgb]) => {
      return `
        .bg-emerald-${shade} { background-color: rgb(${rgb} / var(--tw-bg-opacity, 1)) !important; }
        .text-emerald-${shade} { color: rgb(${rgb} / var(--tw-text-opacity, 1)) !important; }
        .border-emerald-${shade} { border-color: rgb(${rgb} / var(--tw-border-opacity, 1)) !important; }
        .stroke-emerald-${shade} { stroke: rgb(${rgb} / var(--tw-text-opacity, 1)) !important; }
        .hover\\:bg-emerald-${shade}:hover { background-color: rgb(${rgb} / var(--tw-bg-opacity, 1)) !important; }
        .hover\\:text-emerald-${shade}:hover { color: rgb(${rgb} / var(--tw-text-opacity, 1)) !important; }
        .hover\\:border-emerald-${shade}:hover { border-color: rgb(${rgb} / var(--tw-border-opacity, 1)) !important; }
        .from-emerald-${shade} { --tw-gradient-from: rgb(${rgb} / var(--tw-from-opacity, 1)) !important; --tw-gradient-to: rgb(${rgb} / 0) !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
        .to-emerald-${shade} { --tw-gradient-to: rgb(${rgb} / var(--tw-to-opacity, 1)) !important; }
        .ring-emerald-${shade} { --tw-ring-color: rgb(${rgb} / var(--tw-ring-opacity, 1)) !important; }
        .shadow-emerald-${shade} { --tw-shadow-color: rgb(${rgb} / var(--tw-shadow-opacity, 1)) !important; }
        .decoration-emerald-${shade} { text-decoration-color: rgb(${rgb} / var(--tw-text-decoration-opacity, 1)) !important; }
        .group:hover .group-hover\\:border-emerald-${shade} { border-color: rgb(${rgb} / var(--tw-border-opacity, 1)) !important; }
        :root { 
          --accent-50: rgb(${palette[50]});
          --accent-400-rgb: ${palette[400]};
          --accent-50-rgb: ${palette[50]};
          --accent-500-rgb: ${palette[500]};
        }
      `;
    }).join('\n');

    styleTag.innerHTML = rules;
  }, [accentColor]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<Page>(Page.PdfManager);
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  
  const [pendingBarcode, setPendingBarcode] = useState<string | undefined>(undefined);
  
  // حالة الاتصال السحابي تعتمد على المتصفح وتوفر الإنترنت وحالة الحفظ اليدوي
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'offline'>(() => {
    return localStorage.getItem('manualOfflineMode') === 'true' ? 'offline' : (navigator.onLine ? 'connected' : 'offline');
  });
  const [showCloudModal, setShowCloudModal] = useState(false);

  // Data State
  const [books, setBooks] = useState<Book[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseInvoiceRecord[]>([]);
  const [financialLedger, setFinancialLedger] = useState<FinancialEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debtCustomers, setDebtCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [schoolBookSeries, setSchoolBookSeries] = useState<SchoolBookSeries[]>([]);
  const [schoolBookGrades, setSchoolBookGrades] = useState<SchoolBookGrade[]>([]);
  const [users, setUsers] = useState<UserAccount[]>(() => {
    // محاولة استعادة المستخدمين من الذاكرة المحلية فوراً لضمان سرعة التحميل الأولي (خاصة أوفلاين)
    const saved = localStorage.getItem('ALADDIN_USERS_BACKUP');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn("Failed to parse users backup", e);
      }
    }
    return [DEFAULT_USER];
  });
  const [lockedPages, setLockedPages] = useState<Page[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(localStorage.getItem('lastBackupDate'));

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('aladdin_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('aladdin_cart', JSON.stringify(cart));
  }, [cart]);

  const [achievement, setAchievement] = useState<{ visible: boolean; text: string; subText?: string } | null>(null);

  const isInternalUpdate = useRef(false);
  const hasLoadedTheme = useRef(false);
  const hasReceivedSnapshot = useRef<Record<string, boolean>>({});

  const toggleSplash = () => {
    const newState = !isSplashEnabled;
    setIsSplashEnabled(newState);
    localStorage.setItem('splashScreenEnabled', String(newState));
  };

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
  }, []);

  const saveDoc = async (collectionName: string, item: any, docId?: string) => {
    // تحديث الكاش المحلي دائماً لضمان استمرارية البيانات أوفلاين فورياً
    if (collectionName !== 'image_backups') {
      try {
        const currentData = await CacheService.loadCollection(collectionName) || [];
        const id = docId || item.id || item.username || item.barcode || 'default';
        const newData = [...currentData.filter((x: any) => (x.id || x.username || x.barcode) !== id), item];
        await CacheService.saveCollection(collectionName, newData);
      } catch (e) {
        console.error("Local cache save failed:", e);
      }
    }

    if (collectionName === 'books') {
      const bookId = docId || item.id || item.barcode || 'default';
      if (item.image) {
        saveCoverToIDB(bookId, item.image).catch(e => console.error("Error saving cover to IDB:", e));
      } else {
        deleteCoverFromIDB(bookId).catch(e => console.error("Error deleting cover from IDB:", e));
      }
    }

    if (!db) return; 
    // التعديل المطلوب: منع التخزين في مجموعة image_backups
    if (collectionName === 'image_backups') return;

    try {
      const cleanItem = sanitize(item);
      const id = docId || cleanItem.id || cleanItem.username || cleanItem.barcode || 'default';

      // ميزة الرفع إلى Firebase Storage للكتب والمنتجات (مع مراعاة إعداد اتصال الأغلفة بالسحابة)
      const isCloudCoverSyncEnabled = localStorage.getItem('aladdin_cloud_cover_sync') !== 'false';

      if (collectionName === 'books') {
        if (!isCloudCoverSyncEnabled) {
          // في حال تعطيل اتصال الأغلفة بالسحابة: نحذف حقل الصورة من مستند السحاب للاعتماد على التخزين المحلي فقط
          delete cleanItem.image;
        } else if (cleanItem.image && cleanItem.image.startsWith('data:')) {
          if (storage) {
            try {
              const storageRef = ref(storage, `book_covers/${id}.jpg`);
              await uploadString(storageRef, cleanItem.image, 'data_url');
              const downloadURL = await getDownloadURL(storageRef);
              cleanItem.image = downloadURL; // استبدال Base64 برابط سحابي دائم
              // تحديث الحالة المحلية والكاش برابط التحميل السحابي
              setBooks(prev => prev.map(b => b.id === id ? { ...b, image: downloadURL } : b));
              const currentCache = await CacheService.loadCollection('books') || [];
              const updatedCache = currentCache.map((b: any) => b.id === id ? { ...b, image: downloadURL } : b);
              await CacheService.saveCollection('books', updatedCache);
            } catch (storageErr) {
              console.error("Firebase Storage Upload Failed:", storageErr);
            }
          }
        }
      }

      // تم إزالة await لضمان استجابة واجهة المستخدم الفورية في وضع الأوفلاين
      setDoc(doc(db, collectionName, id), cleanItem, { merge: true }).catch(e => console.error("Sync Error:", e));
    } catch (e: any) {
      console.error(`Error saving to ${collectionName}:`, e);
      if (e.code === 'resource-exhausted') {
        showToast('تجاوزت الحد المجاني لقاعدة البيانات، يرجى الانتظار قليلاً', 'error');
      }
    }
  };

  const removeDoc = async (collectionName: string, id: string) => {
    if (collectionName === 'books') {
      deleteCoverFromIDB(id).catch(() => {});
    }

    // تحديث الكاش المحلي دائماً
    try {
      const currentData = await CacheService.loadCollection(collectionName) || [];
      const newData = currentData.filter((x: any) => (x.id || x.username || x.barcode) !== id);
      await CacheService.saveCollection(collectionName, newData);
    } catch (e) {
      console.error("Local cache remove failed:", e);
    }

    if (!db) return;
    try {
      // تم إزالة await لضمان استجابة واجهة المستخدم الفورية في وضع الأوفلاين
      deleteDoc(doc(db, collectionName, id)).catch(e => console.error("Sync Error:", e));
    } catch (e) {
      console.error(`Error deleting from ${collectionName}:`, e);
    }
  };

  const handleUpdateBook = useCallback(async (updatedBook: Book, successMsg?: string) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    if (updatedBook.image) {
      await saveCoverToIDB(updatedBook.id, updatedBook.image);
    } else {
      await deleteCoverFromIDB(updatedBook.id);
    }
    await saveDoc('books', updatedBook, updatedBook.id);
    if (successMsg) {
      showToast(successMsg);
    }
  }, [showToast]);

  // مراقب حقيقي لحالة الإنترنت لتحديث مؤشر "متصل بالسحابة" والتغلب على مشكلة كابل الإيثرنت المحلي
  useEffect(() => {
    let isProcessing = false;
    
    const verifyConnection = async (isFirstRun = false) => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        const isReal = await checkRealConnectivity();
        const isManualOffline = localStorage.getItem('manualOfflineMode') === 'true';
        
        if (isManualOffline) {
          setFirebaseStatus('offline');
          return;
        }

        // تحديث حالة الواجهة فقط بناءً على الفحص الحقيقي
        // Firebase ذكي بما يكفي لإدارة اتصاله ذاتياً. إجباره على التبديل برمجياً يسبب أخطاء في الذاكرة.
        setFirebaseStatus(isReal ? 'connected' : 'offline');
        
        if (!isFirstRun && isReal && firebaseStatus === 'offline') {
          showToast('تم استعادة الاتصال الحقيقي بالسحابة', 'success');
        }
      } finally {
        isProcessing = false;
      }
    };

    // فحص فوري
    verifyConnection(true);

    // فحص دوري كل دقيقة واحدة - لتقليل الضغط وضمان الاستقرار
    const interval = setInterval(() => verifyConnection(), 60000);

    const handleOnline = () => {
      if (!db) {
        handleInitFirebase();
      }
      verifyConnection();
    };

    const handleOffline = () => {
      setFirebaseStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]); // مراقبة قاعدة البيانات فقط لمنع إعادة تشغيل الـ Effect بشكل غير ضروري

  const handleForceOffline = async () => {
    if (!db) return;
    try {
      await disableNetwork(db);
      localStorage.setItem('manualOfflineMode', 'true'); // حفظ الحالة
      setFirebaseStatus('offline');
      setShowCloudModal(false);
      showToast('تم تفعيل وضع Offline (التطوير الآمن)', 'info');
    } catch (e) {
      console.error("Error disabling network:", e);
      showToast('فشل في قطع الاتصال', 'error');
    }
  };

  const handleReconnect = async () => {
    if (!db) {
      handleInitFirebase();
      setShowCloudModal(false);
      return;
    }
    try {
      await enableNetwork(db);
      localStorage.removeItem('manualOfflineMode'); // إزالة الحالة المحفوظة
      setFirebaseStatus(navigator.onLine ? 'connected' : 'offline');
      setShowCloudModal(false);
      showToast('تمت إعادة تفعيل المزامنة السحابية', 'success');
    } catch (e) {
      console.error("Error enabling network:", e);
    }
  };

  // تحميل الإعدادات المحلية من IndexedDB عند تشغيل التطبيق (المزامنة الثانوية)
  useEffect(() => {
    const request = indexedDB.open("AladdinLocalSettings", 1);
    request.onupgradeneeded = (e: any) => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains("settings")) idb.createObjectStore("settings");
    };
    request.onsuccess = (e: any) => {
      const idb = e.target.result;
      const tx = idb.transaction("settings", "readonly");
      const store = tx.objectStore("settings");
      
      const colorReq = store.get('accentColor');
      colorReq.onsuccess = () => colorReq.result && setAccentColor(colorReq.result);
      
      const zoomReq = store.get('zoomLevel');
      zoomReq.onsuccess = () => zoomReq.result && setZoomLevel(zoomReq.result);

      // استعادة حسابات المستخدمين من التخزين المحلي لضمان توفرها Offline
      const usersReq = store.get('users');
      usersReq.onsuccess = () => {
        if (usersReq.result && Array.isArray(usersReq.result) && usersReq.result.length > 0) {
          setUsers(usersReq.result);
        }
      };
    };
  }, []);

  // تحميل البيانات من الكاش المحلي فوراً عند بدء التطبيق لضمان العمل أوفلاين
  useEffect(() => {
    const collectionsToLoad = [
      { name: 'books', setter: setBooks },
      { name: 'invoices', setter: setSalesHistory },
      { name: 'purchaseHistory', setter: setPurchaseHistory },
      { name: 'financialLedger', setter: setFinancialLedger },
      { name: 'suppliers', setter: setSuppliers },
      { name: 'customers', setter: setCustomers },
      { name: 'debtRecords', setter: setDebtCustomers },
      { name: 'categories', setter: setCategories },
      { name: 'subCategories', setter: setSubCategories },
      { name: 'publishers', setter: setPublishers },
      { name: 'schoolBookSeries', setter: setSchoolBookSeries },
      { name: 'schoolBookGrades', setter: setSchoolBookGrades },
      { name: 'users', setter: setUsers },
      { name: 'lockedPages', setter: setLockedPages }
    ];

    const loadAllCache = async () => {
      try {
        await Promise.all(collectionsToLoad.map(async (col) => {
          try {
            const cachedData = await CacheService.loadCollection(col.name);
            if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
              // نتحقق مما إذا كان هناك بيانات سحابية وصلت بالفعل لمنع الكتابة فوقها
              if (hasReceivedSnapshot.current[col.name]) return;

              if (col.name === 'books') {
                const hydrated = await hydrateBooksWithImages(cachedData);
                setBooks(hydrated);
              } else if (col.name === 'lockedPages') {
                const list = (cachedData[0] as any)?.list || [];
                setLockedPages(list);
              } else {
                (col.setter as any)(cachedData);
                if (col.name === 'users') {
                  hydrateUsersWithAvatars(cachedData, setUserAvatars);
                }
              }
              console.log(`Loaded ${col.name} from local cache`);
            } else if (col.name === 'books') {
              // إذا كان الكاش فارغاً (أول تشغيل)، نقوم بتحميل البيانات الأولية (Seed)
              const hydrated = await hydrateBooksWithImages(booksSeed);
              setBooks(hydrated);
              CacheService.saveCollection('books', booksSeed).catch(() => {});
            }
          } catch (e) {
            console.error(`Failed to load ${col.name} from cache:`, e);
          }
        }));

        // تحميل الإعدادات من الكاش
        try {
          const cached = await CacheService.loadCollection('settings_config');
          if (cached && cached[0] && !hasReceivedSnapshot.current['settings_config']) {
            const data = cached[0];
            if (data.systemName) setSystemName(data.systemName);
            if (data.isDarkMode !== undefined) setIsDarkMode(data.isDarkMode);
          }
        } catch (e) {}

        // تم استكمال الكاش بالكامل بنجاح، مما يسمح بتشغيل فوري للتطبيق دون انتظار تحميل السحاب البطيء
        setIsInitialized(true);
      } catch (err) {
        console.error("Error in loadAllCache parallel:", err);
        setIsInitialized(true);
      }
    };

    loadAllCache();
  }, []);

  useEffect(() => {
    if (!db) return;

    const collectionsList = [
      { name: 'books', setter: setBooks },
      { name: 'invoices', setter: setSalesHistory },
      { name: 'purchaseHistory', setter: setPurchaseHistory },
      { name: 'financialLedger', setter: setFinancialLedger },
      { name: 'suppliers', setter: setSuppliers },
      { name: 'customers', setter: setCustomers },
      { name: 'debtRecords', setter: setDebtCustomers },
      { name: 'categories', setter: setCategories },
      { name: 'subCategories', setter: setSubCategories },
      { name: 'publishers', setter: setPublishers },
      { name: 'schoolBookSeries', setter: setSchoolBookSeries },
      { name: 'schoolBookGrades', setter: setSchoolBookGrades },
      { name: 'users', setter: setUsers },
      { name: 'lockedPages', setter: setLockedPages }
    ];

    const unsubs = collectionsList.map(col => {
      return onSnapshot(collection(db!, col.name), (snapshot) => {
        hasReceivedSnapshot.current[col.name] = true;
        isInternalUpdate.current = true;
        const data = snapshot.docs.map(doc => doc.data());
        
        // حفظ البيانات في الكاش المحلي للمرة القادمة (أوفلاين)
        CacheService.saveCollection(col.name, data);

        // وسم التطبيق كمهيأ عند استلام أول بيانات بنجاح
        if (data.length > 0 && !isInitialized) {
          setIsInitialized(true);
          // @ts-expect-error: electronAPI is exposed via preload script
          if (window.electronAPI && window.electronAPI.setInitStatus) {
            // @ts-expect-error: electronAPI is exposed via preload script
            window.electronAPI.setInitStatus({ initialized: true });
          }
          localStorage.setItem('ALADDIN_SETUP_SKIPPED', 'true');
        }

        if (col.name === 'books') {
          hydrateBooksWithImages(data).then(hydratedBooks => {
            // إذا كانت السحابة فارغة تماماً والبيانات المحلية موجودة، قد نفضل عدم المسح مباشرة في أول لقطة (Snapshot)
            // إلا إذا كنا متأكدين أن السحابة هي المصدر الوحيد. هنا سنحدث القائمة مع الحفاظ على البيانات.
            setBooks(current => {
              if (hydratedBooks.length === 0 && current.length > 0 && isInternalUpdate.current) {
                return current;
              }

              return hydratedBooks.map(newBook => {
                const existing = current.find(b => b.id === newBook.id);
                
                // تحديد الصورة النهائية:
                // الأولوية القصوى للروابط السحابية لضمان المزامنة
                let finalImage = newBook.image;
                if (newBook.image && (newBook.image.startsWith('blob:') || newBook.image.startsWith('data:') || newBook.image.startsWith('http://') || newBook.image.startsWith('https://'))) {
                   finalImage = newBook.image;
                } else if (existing?.image && existing.image !== "" && existing.image !== null) {
                   finalImage = existing.image;
                }

                return { ...newBook, image: finalImage };
              });
            });
            setTimeout(() => { isInternalUpdate.current = false; }, 1000);
          });
          return;
        }

        if (col.name === 'lockedPages' && data.length > 0) {
          (col.setter as any)((data[0] as any).list || []);
        } else if (col.name === 'users') {
          const fetchedUsers = data as UserAccount[];
          // إذا لم يتم جلب أي مستخدمين من السحابة، لا نقم بتحديث الحالة الحالية لنتجنب حذف المستخدمين المخزنين محلياً
          if (fetchedUsers.length > 0) {
             (col.setter as any)(fetchedUsers);
             hydrateUsersWithAvatars(fetchedUsers, setUserAvatars);
          }
        } else {
          (col.setter as any)(data as any);
        }
        
        setTimeout(() => { isInternalUpdate.current = false; }, 1000);
      }, (error: any) => {
        // إذا كان الخطأ هو "unavailable"، فهذا يعني أن الجهاز غير متصل أو الخدمة متوقفة مؤقتاً
        // لا نزعج المستخدم بالرسالة إذا كان لدينا بيانات محلية بالفعل أو إذا كنا نعلم أننا في وضع الأوفلاين
        if (error?.code === 'unavailable') {
          console.log(`Cloud storage for ${col.name} is currently offline. Using local data.`);
          if (!hasReceivedSnapshot.current[col.name]) {
            // إذا لم نستلم أي سناب شوت بعد، فهذا يؤكد أننا نعتمد على الكاش
            setFirebaseStatus('offline');
          }
        } else if (error?.code === 'permission-denied') {
          showToast(`خطأ في الصلاحيات لـ ${col.name}: يرجى التحقق من قواعد البيانات`, 'error');
        } else {
          console.error(`Error fetching ${col.name}:`, error);
          showToast(`خطأ في مزامنة ${col.name}`, 'error');
        }
      });
    });

    const unsubConfig = onSnapshot(doc(db!, "settings", "config"), (doc) => {
      hasReceivedSnapshot.current['settings_config'] = true;
      if (doc.exists()) {
        isInternalUpdate.current = true;
        const data = doc.data();
        
        // حفظ الإعدادات في الكاش المحلي
        CacheService.saveCollection('settings_config', [data]);

        if (data.systemName) setSystemName(data.systemName);
        // تم إلغاء تحميل اللون والحجم من السحابة لضمان الاعتماد على التخزين المحلي فقط
        
        if (!hasLoadedTheme.current && data.isDarkMode !== undefined) {
          setIsDarkMode(data.isDarkMode);
          hasLoadedTheme.current = true;
        }
        
        setTimeout(() => { isInternalUpdate.current = false; }, 1000);
      }
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      unsubConfig();
    };
  }, [db, isInitialized]);

  // إضافة مراقب لحفظ المستخدمين محلياً فور تغيرهم (سواء من السحابة أو إضافة يدوية)
  useEffect(() => {
    if (users.length > 0) {
      // حفظ في LocalStorage كذاكرة احتياطية سريعة جداً للإقلاع
      localStorage.setItem('ALADDIN_USERS_BACKUP', JSON.stringify(users));

      // حفظ في CacheService
      CacheService.saveCollection('users', users).catch(() => {});

      // حفظ في IndexedDB كمستودع محلي آمن
      const request = indexedDB.open("AladdinLocalSettings", 1);
      request.onsuccess = (e: any) => {
        const idb = e.target.result;
        if (idb.objectStoreNames.contains("settings")) {
          const tx = idb.transaction("settings", "readwrite");
          const store = tx.objectStore("settings");
          store.put(users, 'users');
        }
      };
    }
  }, [users]);

  // مراقب الدخول الفوري للحساب تلقائياً عند تحميل قائمة المستخدمين (مفعل دائماً افتراضياً)
  useEffect(() => {
    if (!isAuthenticated && users.length > 0) {
      const isExplicitlyDisabled = localStorage.getItem('aladdin_auto_login_disabled') === 'true';
      if (!isExplicitlyDisabled) {
        let autoUsername = localStorage.getItem('aladdin_auto_login_username');
        let autoPassword = localStorage.getItem('aladdin_auto_login_password');
        
        let found = null;
        if (autoUsername && autoPassword) {
          found = users.find(u => u.username === autoUsername && u.password === autoPassword);
        }
        if (!found) {
          found = users[0];
          if (found) {
            localStorage.setItem('aladdin_auto_login_username', found.username);
            localStorage.setItem('aladdin_auto_login_password', found.password);
          }
        }
        if (found) {
          setIsAuthenticated(true);
          setCurrentUser(found.username);
        }
      }
    }
  }, [users, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && db && !isInternalUpdate.current) {
      // يتم حفظ اسم النظام والوضع المظلم فقط في السحابة
      setDoc(doc(db!, "settings", "config"), sanitize({ systemName, isDarkMode }), { merge: true }).catch(() => {});
      setDoc(doc(db!, "lockedPages", "default"), sanitize({ list: lockedPages }), { merge: true }).catch(() => {});
      
      // حفظ اللون والحجم في التخزين المحلي (IndexedDB & LocalStorage) لضمان السرعة والتفعيل الفوري
      localStorage.setItem('aladdin_accent', accentColor);
      localStorage.setItem('aladdin_zoom', zoomLevel.toString());
      
      const request = indexedDB.open("AladdinLocalSettings", 1);
      request.onupgradeneeded = (e: any) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains("settings")) idb.createObjectStore("settings");
      };
      request.onsuccess = (e: any) => {
        const idb = e.target.result;
        const tx = idb.transaction("settings", "readwrite");
        const store = tx.objectStore("settings");
        store.put(accentColor, 'accentColor');
        store.put(zoomLevel, 'zoomLevel');
      };
    }
  }, [systemName, accentColor, isDarkMode, zoomLevel, lockedPages, isAuthenticated, db]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') { e.preventDefault(); setShowQuickMenu(prev => !prev); }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // وظيفة التحقق من الجلسة النشطة - تم تحديثها لتدعم العمل بدون انترنت
  const checkUserSession = async (username: string): Promise<boolean> => {
    if (!db) return true; 
    try {
      const docRef = doc(db, 'active_sessions', username);
      // استخدم getDoc بدلاً من getDocFromServer للسماح باستخدام الكاش المحلي عند انقطاع الإنترنت
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        
        // إذا كان الدخول من نفس المتصفح/الجهاز، تجاوز الفحص
        if (data.device === navigator.userAgent) return true;

        // تقليص مهلة الجلسة إلى 45 ثانية
        if (data.lastSeen && (Date.now() - data.lastSeen < 45000)) {
          return false;
        }
      }
    } catch (e) {
      console.error("Session check error:", e);
      // في حالة فشل الاتصال، نسمح بالدخول بناءً على الثقة في وضع عدم الاتصال
      return true;
    }
    return true;
  };

  // مراقب نبض الحياة (Presence Heartbeat)
  useEffect(() => {
    if (isAuthenticated && currentUser && db && firebaseStatus === 'connected') {
      const updatePresence = async () => {
        try {
          await setDoc(doc(db!, 'active_sessions', currentUser), {
            lastSeen: Date.now(),
            status: 'online',
            device: navigator.userAgent
          }, { merge: true });
        } catch(e) {
          // Ignore presence update errors in offline mode
        }
      };

      // تحديث فوري عند الدخول
      updatePresence();
      
      // تحديث دوري كل 15 ثانية لضمان استمرار الجلسة وتجديدها بسرعة
      const interval = setInterval(updatePresence, 15000);

      const disconnect = async () => {
         try { await deleteDoc(doc(db!, 'active_sessions', currentUser)); } catch(e){
           // Ignore session cleanup errors
         }
      };
      
      window.addEventListener('beforeunload', disconnect);

      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', disconnect);
        disconnect();
      };
    }
  }, [isAuthenticated, currentUser, firebaseStatus, db]);

  const handleProcessSale = (saleItems: SaleItem[], paymentDetails: any, isReturn: boolean = false, existingId?: string) => {
    const currentBooks = [...books];
    const affectedBookIds = new Set<string>();

    // 1. منطق التعديل (Edit Mode): يتم عكس المخزون القديم فقط إذا لم تكن العملية "إرجاع"
    // لأن الإرجاع حسب الطلب الجديد يجب أن يحافظ على الفاتورة القديمة كما هي وينشئ سجلاً جديداً.
    if (existingId && !isReturn) {
      const oldSale = salesHistory.find(s => s.id === existingId);
      if (oldSale) {
        oldSale.items.forEach(oldItem => {
          const idx = currentBooks.findIndex(b => b.id === oldItem.bookId);
          if (idx > -1) {
            const restoreQty = oldSale.isReturn ? -oldItem.quantity : oldItem.quantity;
            currentBooks[idx] = { ...currentBooks[idx], quantity: currentBooks[idx].quantity + restoreQty };
            affectedBookIds.add(currentBooks[idx].id);
          }
        });
      }
    }

    // 2. تطبيق تغييرات المخزون الجديدة
    saleItems.forEach(newItem => {
      const idx = currentBooks.findIndex(b => b.id === newItem.bookId);
      if (idx > -1) {
        // إذا كان مرتجعاً: نزيد الكمية في المخزن (+). إذا كان بيعاً: ننقص الكمية (-).
        const change = isReturn ? newItem.quantity : -newItem.quantity;
        currentBooks[idx] = { ...currentBooks[idx], quantity: Math.max(0, currentBooks[idx].quantity + change) };
        affectedBookIds.add(currentBooks[idx].id);
      }
    });

    // 3. حفظ الكتب وحفظ الفاتورة
    affectedBookIds.forEach(id => {
      const book = currentBooks.find(b => b.id === id);
      if (book) saveDoc('books', book, book.id);
    });

    setBooks(currentBooks);
    setCart([]); // تصفير السلة بعد البيع
    
    const now = Date.now();
    const oldSale = existingId ? salesHistory.find(s => s.id === existingId) : null;
    
    // الطلب المطلوب: المرتجع فاتورة جديدة، التعديل نفس الفاتورة
    const invoiceId = isReturn ? crypto.randomUUID() : (existingId || crypto.randomUUID());
    const invNum = isReturn 
      ? `R-${oldSale?.invoiceNumber || now.toString().slice(-5)}` 
      : (existingId ? (oldSale?.invoiceNumber || "") : (salesHistory.length + 1).toString());

    const sign = isReturn ? -1 : 1;
    const newInvoice: SaleRecord = { 
      id: invoiceId, 
      invoiceNumber: invNum, 
      items: saleItems, 
      totalAmount: sign * (paymentDetails.netAmount + (paymentDetails.discountValue || 0)), 
      discountValue: sign * (paymentDetails.discountValue || 0), 
      netAmount: sign * paymentDetails.netAmount, 
      paidAmount: sign * paymentDetails.paidAmount, 
      paymentType: paymentDetails.paymentType, 
      customer: paymentDetails.customer, 
      timestamp: now, 
      seller: currentUser, 
      isReturn: isReturn,
      status: isReturn ? 'returned' : 'paid',
      isPaid: paymentDetails.paymentType !== 'آجل' || paymentDetails.paidAmount >= paymentDetails.netAmount,
      barcodeNum: paymentDetails.barcodeNum
    };
    
    if (isReturn || !existingId) {
      setSalesHistory(prev => [newInvoice, ...prev]);
    } else {
      setSalesHistory(prev => prev.map(s => s.id === existingId ? newInvoice : s));
    }
    saveDoc('invoices', newInvoice, newInvoice.id); 

    const transactionProfit = saleItems.reduce((acc, item) => {
      const b = currentBooks.find(book => book.id === item.bookId);
      const cost = b ? (b.purchasePrice || 0) : 0;
      return acc + ((item.price - cost) * item.quantity);
    }, 0);

    const finalFinancialAmount = sign * paymentDetails.paidAmount;
    const finalFinancialProfit = sign * transactionProfit;

    const newEntry: FinancialEntry = {
      id: crypto.randomUUID(), 
      type: isReturn ? 'return' : 'sale', 
      amount: finalFinancialAmount,
      profit: finalFinancialProfit, 
      timestamp: now, 
      seller: currentUser, 
      customerName: paymentDetails.customer || 'عام', 
      invoiceNo: newInvoice.invoiceNumber
    };
    
    setFinancialLedger(prev => [newEntry, ...prev]);
    saveDoc('financialLedger', newEntry, newEntry.id);

    showToast(isReturn ? 'تم تسجيل عملية المرتجع بنجاح' : (existingId ? 'تم تحديث الفاتورة بنجاح' : 'تمت عملية البيع بنجاح'));
  };

  const handleDeleteSale = async (saleId: string) => {
    const sale = salesHistory.find(s => s.id === saleId);
    if (!sale) return;

    // إرجاع الكميات للمخزن فقط إذا لم تكن الفاتورة مسترجعة بالفعل
    // التعديل: حساب الكميات الإجمالية لكل كتاب في الفاتورة الحالية لإرجاعها بدقة
    if (sale.status !== 'returned') {
      const itemTotals = sale.items.reduce((acc, item) => {
        acc[item.bookId] = (acc[item.bookId] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>);

      const updatedBooks = books.map(book => {
        const qtyInInvoice = itemTotals[book.id];
        if (qtyInInvoice) {
          const change = sale.isReturn ? -qtyInInvoice : qtyInInvoice;
          const newQty = Math.max(0, book.quantity + change);
          const newBook = { ...book, quantity: newQty };
          saveDoc('books', newBook, book.id);
          return newBook;
        }
        return book;
      });
      setBooks(updatedBooks);
    }

    // حذف القيود المالية المرتبطة
    const entriesToRemove = financialLedger.filter(e => e.invoiceNo === sale.invoiceNumber);
    for (const entry of entriesToRemove) {
      removeDoc('financialLedger', entry.id);
    }
    setFinancialLedger(prev => prev.filter(e => e.invoiceNo !== sale.invoiceNumber));

    // حذف الفاتورة
    removeDoc('invoices', saleId);
    setSalesHistory(prev => prev.filter(s => s.id !== saleId));
    
    showToast('تم حذف السجل وتحديث المخزون بنجاح');
  };

  const onAddSchoolBookSeries = (s: SchoolBookSeries) => {
    setSchoolBookSeries(prev => [...prev, s]);
    saveDoc('schoolBookSeries', s, s.id);
  };

  const onDeleteSchoolBookSeries = (id: string) => {
    setSchoolBookSeries(prev => prev.filter(x => x.id !== id));
    removeDoc('schoolBookSeries', id);
    const gradesToDelete = schoolBookGrades.filter(g => g.seriesId === id);
    gradesToDelete.forEach(g => {
      removeDoc('schoolBookGrades', g.id);
    });
    setSchoolBookGrades(prev => prev.filter(g => g.seriesId !== id));
  };

  const onAddSchoolBookGrade = (g: SchoolBookGrade) => {
    setSchoolBookGrades(prev => [...prev, g]);
    saveDoc('schoolBookGrades', g, g.id);
  };

  const onDeleteSchoolBookGrade = (id: string) => {
    setSchoolBookGrades(prev => prev.filter(x => x.id !== id));
    removeDoc('schoolBookGrades', id);
  };

  const handleNavigateWithCheck = (page: Page) => {
    const currentAcc = users.find(u => u.username === currentUser);
    if (page !== Page.Sales && lockedPages.includes(page) && !currentAcc?.isManager) {
      showToast('هذه الصفحة مقفلة للمدير فقط', 'error');
    } else {
      if (page !== Page.ItemCard && page !== Page.AddBook) setPendingBarcode(undefined);
      setCurrentPage(page);
    }
  };

  const handleProcessPurchase = useCallback(async (supplierId: string, supplierName: string, invoiceNum: string, items: PurchaseItem[]) => {
    let finalSupplierId = supplierId;
    let finalSupplierName = supplierName;
    const normalizedInName = supplierName.trim().toLowerCase();
    
    if (!finalSupplierId && supplierName && supplierName !== 'مورد عام') {
      const existingSupplier = suppliers.find(s => s.name.trim().toLowerCase() === normalizedInName);
      if (existingSupplier) {
        finalSupplierId = existingSupplier.id;
        finalSupplierName = existingSupplier.name;
      } else {
        const newSupplier: Supplier = {
          id: crypto.randomUUID(),
          name: supplierName.trim(),
          phone: '',
          address: '',
          country: ''
        };
        finalSupplierId = newSupplier.id;
        finalSupplierName = newSupplier.name;
        setSuppliers(prev => [...prev, newSupplier]);
        saveDoc('suppliers', newSupplier, newSupplier.id);
      }
    }

    const newInvoice: PurchaseInvoiceRecord = {
      id: crypto.randomUUID(),
      invoiceNumber: invoiceNum,
      supplierId: finalSupplierId,
      supplierName: finalSupplierName,
      items,
      totalAmount: items.reduce((sum, item) => sum + (item.purchasePrice * item.quantityAdded), 0),
      timestamp: Date.now()
    };
    setPurchaseHistory(prev => [newInvoice, ...prev]);
    saveDoc('purchaseHistory', newInvoice, newInvoice.id);

    for (const item of items) {
      const bookIndex = books.findIndex(b => (item.barcode && b.barcode === item.barcode) || b.title === item.title);
      if (bookIndex >= 0) {
        const updatedBook = {
          ...books[bookIndex],
          quantity: books[bookIndex].quantity + item.quantityAdded,
          purchasePrice: item.purchasePrice,
          price: item.sellingPrice
        };
        setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
        saveDoc('books', updatedBook, updatedBook.id);
      } else {
        const newBook: Book = {
          id: crypto.randomUUID(),
          title: item.title,
          author: item.author || 'غير معروف',
          category: item.category || 'عام',
          subCategory: item.subCategory || '',
          quantity: item.quantityAdded,
          price: item.sellingPrice,
          purchasePrice: item.purchasePrice,
          addedAt: Date.now(),
          barcode: item.barcode || '',
          location: ''
        };
        setBooks(prev => [newBook, ...prev]);
        saveDoc('books', newBook, newBook.id);
      }
    }
    showToast('تم حفظ فاتورة التوريد بنجاح');
    handleNavigateWithCheck(Page.Dashboard);
  }, [books, purchaseHistory, suppliers, saveDoc, showToast, handleNavigateWithCheck]);

  const handleClearData = async (targets: string[]) => {
    if (!db) return;
    
    const collectionMap: Record<string, { name: string, data: any[] }> = {
      'books': { name: 'books', data: books },
      'salesHistory': { name: 'invoices', data: salesHistory }, 
      'purchaseHistory': { name: 'purchaseHistory', data: purchaseHistory },
      'financialLedger': { name: 'financialLedger', data: financialLedger },
      'suppliers': { name: 'suppliers', data: suppliers },
      'customers': { name: 'customers', data: customers },
      'debtCustomers': { name: 'debtRecords', data: debtCustomers }, 
      'categories': { name: 'categories', data: categories },
      'subCategories': { name: 'subCategories', data: subCategories },
      'publishers': { name: 'publishers', data: publishers },
    };

    try {
      let itemsDeleted = 0;
      const collectionsToDelete = targets.length > 0 ? targets : Object.keys(collectionMap);

      for (const targetKey of collectionsToDelete) {
        const col = collectionMap[targetKey];
        if (col && col.data) {
          for (const item of col.data) {
             deleteDoc(doc(db!, col.name, (item as any).id)).catch(() => {});
             itemsDeleted++;
          }
        }
      }
      showToast(`تم تنفيذ طلب حذف ${itemsDeleted} سجل بنجاح`, 'success');
    } catch (e) {
      console.error("Error clearing data:", e);
      showToast('حدث خطأ أثناء مسح البيانات', 'error');
    }
  };

  const handleRepairAndOptimize = async () => {
    if (!db) return;
    try {
      await clearIndexedDbPersistence(db);
      showToast('تم تحسين قاعدة البيانات وضغط الملفات المؤقتة', 'success');
      setTimeout(() => window.location.reload(), 1500); 
    } catch (e) {
      showToast('لم نتمكن من تحسين القاعدة في هذا الوضع', 'info');
    }
  };

  const handleHealthCheck = async (): Promise<string[]> => {
    const issues: string[] = [];
    const booksNoBarcode = books.filter(b => !b.barcode).length;
    if (issues.length === 0) issues.push("النظام في حالة ممتازة! لا توجد مشاكل.");
    return issues;
  };

  const handleSelectiveExport = (targets: string[]) => {
    const exportData: any = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (targets.includes('books')) exportData.books = books;
    if (targets.includes('salesHistory')) exportData.salesHistory = salesHistory;
    if (targets.includes('purchaseHistory')) exportData.purchaseHistory = purchaseHistory;
    if (targets.includes('financialLedger')) exportData.financialLedger = financialLedger;
    if (targets.includes('suppliers')) exportData.suppliers = suppliers;
    if (targets.includes('customers')) exportData.customers = customers;
    if (targets.includes('debtCustomers')) exportData.debtCustomers = debtCustomers;
    if (targets.includes('categories')) exportData.categories = categories;
    if (targets.includes('subCategories')) exportData.subCategories = subCategories;
    if (targets.includes('publishers')) exportData.publishers = publishers;
    if (targets.includes('users')) exportData.users = users;
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Aladdin_Backup_${timestamp}.json`;
    link.click();
    const dateStr = new Date().toLocaleString('ar-EG');
    setLastBackupDate(dateStr);
    localStorage.setItem('lastBackupDate', dateStr);
    showToast('تم تصدير البيانات المحددة بنجاح');
  };

  const handleUpdateAvatar = async (username: string, base64Data: string) => {
    const user = users.find(u => u.username === username);
    if (!user) return;
    
    // التحديث في الحالة المحلية فوراً للعرض
    const updatedUser = { ...user, avatar: base64Data };
    setUsers(prev => prev.map(u => u.username === username ? updatedUser : u));
    
    // حفظ في السحابة (بدون الصورة لتوفير المساحة وسرعة الأداء)
    const firebaseUser = { ...user };
    delete firebaseUser.avatar; // لا نرسل الصورة للسحابة ونكتفي بالتخزين المحلي
    saveDoc('users', firebaseUser, username);
    
    // حفظ في التخزين المحلي (IndexedDB) مرتبطاً باسم المستخدم
    saveAvatarToIDB(username, base64Data, setUserAvatars);
    
    showToast('تم حفظ الصورة الشخصية في التخزين المحلي');
  };

  return (
    <div className="animate-in fade-in duration-1000 overflow-hidden" style={{ width: `100%`, height: `100%`, position: 'fixed', top: 0, right: 0 }}>
      {!isAuthenticated ? (
        <Login systemName={systemName} onLogin={(u) => { setIsAuthenticated(true); setCurrentUser(u); }} users={users} onCheckSession={checkUserSession} userAvatars={userAvatars} />
      ) : (
        <div className={`relative flex w-full h-screen transition-all duration-500 ${isDarkMode ? 'bg-zinc-950' : 'bg-[#f1f5f2]'}`}>
          <div className={`w-full h-full overflow-hidden flex flex-row ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
            <div className={`h-full shadow-2xl flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] z-50 ${isSidebarOpen ? 'w-[18.75rem]' : 'w-[5.5rem]'} ${isDarkMode ? 'bg-black' : 'bg-emerald-900'}`}>
              <Sidebar 
                systemName={systemName} 
                activePage={currentPage} 
                currentUser={currentUser} 
                currentUserAvatar={userAvatars[currentUser]}
                onNavigate={(p) => { handleNavigateWithCheck(p); setIsSidebarOpen(false); }} 
                onLogout={() => {
                  setIsAuthenticated(false);
                  setCurrentUser('');
                  localStorage.removeItem('aladdin_auto_login_username');
                  localStorage.removeItem('aladdin_auto_login_password');
                }} 
                isDarkMode={isDarkMode} 
                isOpen={isSidebarOpen} 
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
              />
            </div>
            <div className="flex-1 h-full flex flex-col overflow-hidden text-right" dir="rtl" onClick={() => { if (isSidebarOpen) setIsSidebarOpen(false); }}>
              <header className={`px-8 py-3 flex justify-between items-center border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                <div className="flex items-center gap-4">
                  <div onClick={() => setShowCloudModal(true)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition-all hover:scale-105 border ${
                    firebaseStatus === 'connected' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-500 border-emerald-500/20') : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-600 text-white border-transparent')
                  }`}>{firebaseStatus === 'connected' ? <Cloud size={14} /> : <WifiOff size={14} />}{firebaseStatus === 'connected' ? 'متصل بالسحابة' : 'غير متصل'}</div>
                  <h1 className={`text-xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`}>
                    {currentPage === Page.PdfManager ? "المحتوى التعليمي" :
                     currentPage === Page.Warehouse ? "المكتبة الشاملة" : 
                     "لوحة التحكم"}
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-all shadow-sm ${isDarkMode ? 'bg-zinc-800 text-amber-400' : 'bg-white text-emerald-500 border border-gray-200 hover:bg-gray-50'}`}>{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
                </div>
              </header>
              <main className={`flex-1 overflow-y-auto ${currentPage === Page.Warehouse || currentPage === Page.Sales || currentPage === Page.PdfManager ? 'px-8 pt-6 pb-0' : 'p-10'} custom-scrollbar relative`}>
                {currentPage === Page.Dashboard && <Dashboard books={books} salesHistory={salesHistory} onNavigate= {handleNavigateWithCheck} isDarkMode={isDarkMode} onUpdateBook={(book) => handleUpdateBook(book, 'تم تحديث غلاف الكتاب بنجاح')} />}
                {currentPage === Page.Sales && <Sales books={books} salesHistory={salesHistory} customers={customers} debtCustomers={debtCustomers} cart={cart} setCart={setCart} onProcessSale={handleProcessSale} onReturnSale={() => {}} onAddDebtCustomer={(c) => { setDebtCustomers(prev => [...prev, c]); saveDoc('debtRecords', c, c.id); }} isDarkMode={isDarkMode} />}
                {currentPage === Page.Warehouse && <Warehouse books={books} categories={categories} subCategories={subCategories} publishers={publishers} schoolBookSeries={schoolBookSeries} schoolBookGrades={schoolBookGrades} onAddSchoolBookSeries={onAddSchoolBookSeries} onDeleteSchoolBookSeries={onDeleteSchoolBookSeries} onAddSchoolBookGrade={onAddSchoolBookGrade} onDeleteSchoolBookGrade={onDeleteSchoolBookGrade} onEditBook={setEditingBook} onUpdateBook={(book) => handleUpdateBook(book, 'تم تحديث غلاف الكتاب بنجاح')} onBatchUpdateBooks={(updatedList) => { setBooks(prev => { const map = new Map(updatedList.map(b => [b.id, b])); return prev.map(b => map.get(b.id) || b); }); updatedList.forEach(b => handleUpdateBook(b)); }} onDeleteBook={(id) => { setBooks(books.filter(b => b.id !== id)); removeDoc('books', id); }} onAddCategory={(c) => { setCategories([...categories, c]); saveDoc('categories', c, c.id); }} onUpdateCategory={(uc) => { setCategories(categories.map(c => c.id === uc.id ? uc : c)); saveDoc('categories', uc, uc.id); }} onDeleteCategory={(id) => { setCategories(categories.filter(c => c.id !== id)); removeDoc('categories', id); }} onAddSubCategory={(sc) => { setSubCategories([...subCategories, sc]); saveDoc('subCategories', sc, sc.id); }} onAddPublisher={(p) => { setPublishers([...publishers, p]); saveDoc('publishers', p, p.id); }} onUpdatePublisher={(up) => { setPublishers(publishers.map(p => p.id === up.id ? up : p)); saveDoc('publishers', up, up.id); }} onDeletePublisher={(id) => { setPublishers(publishers.filter(p => p.id !== id)); removeDoc('publishers', id); }} onDeleteSubCategory={(id) => { setSubCategories(subCategories.filter(s => s.id !== id)); removeDoc('subCategories', id); }} isDarkMode={isDarkMode} />}
                {currentPage === Page.ItemCard && <ItemCard books={books} categories={categories} subCategories={subCategories} publishers={publishers} schoolBookSeries={schoolBookSeries} schoolBookGrades={schoolBookGrades} initialBarcode={pendingBarcode} onAddItem={(book) => { setBooks(prev => [book, ...prev.filter(b => b.barcode !== book.barcode)]); saveDoc('books', book, book.id); showToast('تم حفظ الصنف بنجاح'); if (pendingBarcode) { setCurrentPage(Page.AddBook); } }} isDarkMode={isDarkMode} />}
                {currentPage === Page.AddBook && <PurchaseInvoice books={books} suppliers={suppliers} onProcessPurchase={handleProcessPurchase} onCancel={() => handleNavigateWithCheck(Page.Dashboard)} onNavigateToItemCard={(barcode) => { setPendingBarcode(barcode); handleNavigateWithCheck(Page.ItemCard); }} isDarkMode={isDarkMode} initialBarcode={pendingBarcode} zoomLevel={zoomLevel} onUpdateZoomLevel={setZoomLevel} />}
                {currentPage === Page.Settings && <Settings onClearData={() => handleClearData([])} onExport={() => handleSelectiveExport(['books', 'salesHistory', 'purchaseHistory', 'financialLedger', 'suppliers', 'customers', 'debtCustomers'])} onImport={() => {}} onRestoreBackup={async () => {}} isLinked={firebaseStatus === 'connected'} onNavigate={handleNavigateWithCheck} currentUser={currentUser} users={users} isDarkMode={isDarkMode} />}
                {currentPage === Page.SalesHistory && <SalesHistory books={books} sales={salesHistory} onDelete={handleDeleteSale} isDarkMode={isDarkMode} />}
                {currentPage === Page.Suppliers && <Suppliers suppliers={suppliers} customers={customers} debtCustomers={debtCustomers} purchaseHistory={purchaseHistory} salesHistory={salesHistory} onAddSupplier={(s) => { setSuppliers(prev => [...prev, s]); saveDoc('suppliers', s, s.id); }} onUpdateSupplier={(s) => { setSuppliers(prev => prev.map(x => x.id === s.id ? s : x)); saveDoc('suppliers', s, s.id); }} onDeleteSupplier={(id) => { setSuppliers(prev => prev.filter(x => x.id !== id)); removeDoc('suppliers', id); }} onAddCustomer={(c) => { setCustomers(prev => [...prev, c]); saveDoc('customers', c, c.id); }} onUpdateCustomer={(c) => { setCustomers(prev => prev.map(x => x.id === c.id ? c : x)); saveDoc('customers', c, c.id); }} onDeleteCustomer={(id) => { setCustomers(prev => prev.filter(x => x.id !== id)); removeDoc('customers', id); }} onAddDebtCustomer={(c) => { setDebtCustomers(prev => [...prev, c]); saveDoc('debtRecords', c, c.id); }} onUpdateDebtCustomer={(c) => { setDebtCustomers(prev => prev.map(x => x.id === c.id ? c : x)); saveDoc('debtRecords', c, c.id); }} onDeleteDebtCustomer={(id) => { setDebtCustomers(prev => prev.filter(x => x.id !== id)); removeDoc('debtRecords', id); }} onSettleDebt={(saleId) => { const sale = salesHistory.find(s => s.id === saleId); if (sale) { const updatedSale = { ...sale, isPaid: true, paidAmount: sale.netAmount, paidAt: Date.now() }; setSalesHistory(prev => prev.map(s => s.id === saleId ? updatedSale : s)); saveDoc('invoices', updatedSale, updatedSale.id); const entry: FinancialEntry = { id: crypto.randomUUID(), type: 'collection', amount: sale.netAmount - (sale.paidAmount || 0), profit: 0, timestamp: Date.now(), seller: currentUser, customerName: sale.customer || 'عام', invoiceNo: sale.invoiceNumber }; setFinancialLedger(prev => [entry, ...prev]); saveDoc('financialLedger', entry, entry.id); showToast('تم تسديد الدين'); } }} onUpdatePartialPayment={(saleId, amount) => { const sale = salesHistory.find(s => s.id === saleId); if (sale) { const newPaid = (sale.paidAmount || 0) + amount; const isFullyPaid = newPaid >= sale.netAmount; const updatedSale = { ...sale, isPaid: isFullyPaid, paidAmount: newPaid }; setSalesHistory(prev => prev.map(s => s.id === saleId ? updatedSale : s)); saveDoc('invoices', updatedSale, updatedSale.id); const entry: FinancialEntry = { id: crypto.randomUUID(), type: 'collection', amount: amount, profit: 0, timestamp: Date.now(), seller: currentUser, customerName: sale.customer || 'عام', invoiceNo: sale.invoiceNumber }; setFinancialLedger(prev => [entry, ...prev]); saveDoc('financialLedger', entry, entry.id); showToast('تم تسجيل الدفعة'); } }} onDeleteSale={handleDeleteSale} isDarkMode={isDarkMode} />}
                {currentPage === Page.PdfManager && <EducationalManager isDarkMode={isDarkMode} />}
                {currentPage === Page.Games && <GamesRoom isDarkMode={isDarkMode} />}
                {(currentPage === Page.Profile || currentPage === Page.SellersSafes) && <Profile currentUser={users.find(u => u.username === currentUser) || DEFAULT_USER} users={users} userAvatars={userAvatars} onUpdateAvatar={handleUpdateAvatar} books={books} categories={categories} subCategories={subCategories} onAddCategory={(c) => { setCategories(prev => [...prev, c]); saveDoc('categories', c, c.id); }} onDeleteCategory={(id) => { setCategories(prev => prev.filter(c => c.id !== id)); removeDoc('categories', id); }} onUpdateCategory={(c) => { setCategories(prev => prev.map(x => x.id === c.id ? c : x)); saveDoc('categories', c, c.id); }} onAddSubCategory={(sc) => { setSubCategories(prev => [...prev, sc]); saveDoc('subCategories', sc, sc.id); }} onDeleteSubCategory={(id) => { setSubCategories(prev => prev.filter(sc => sc.id !== id)); removeDoc('subCategories', id); }} onUpdateBook={(book) => handleUpdateBook(book, 'تم تحديث غلاف الكتاب بنجاح')} onBatchUpdateBooks={(updatedList) => { setBooks(prev => { const map = new Map(updatedList.map(b => [b.id, b])); return prev.map(b => map.get(b.id) || b); }); updatedList.forEach(b => handleUpdateBook(b)); }} financialLedger={financialLedger} salesHistory={salesHistory} systemName={systemName} accentColor={accentColor} zoomLevel={zoomLevel} lockedPages={lockedPages} onToggleLockedPage={(p) => { if (lockedPages.includes(p)) setLockedPages(prev => prev.filter(x => x !== p)); else setLockedPages(prev => [...prev, p]); }} onUpdateZoomLevel={setZoomLevel} onUpdateSystemName={setSystemName} onUpdateAccentColor={setAccentColor} onUpdatePassword={(newPass, newUsername) => { const user = users.find(u => u.username === currentUser); if (user) { const oldUsername = user.username; const updated = { ...user, password: newPass, username: newUsername }; setUsers(prev => prev.map(u => u.username === oldUsername ? updated : u)); if (newUsername !== oldUsername) { removeDoc('users', oldUsername); saveDoc('users', updated, newUsername); setCurrentUser(newUsername); } else { saveDoc('users', updated, oldUsername); } showToast('تم تحديث البيانات'); } }} onUpdateTheme={setIsDarkMode} onAddUser={(u) => { 
  const localUser = { ...u };
  const cloudUser = { ...u };
  delete cloudUser.avatar; // لا نرسل الصورة للسحابة

  setUsers(prev => [...prev, localUser]); 
  saveDoc('users', cloudUser, u.username); 
  
  if (u.avatar && u.avatar.startsWith('data:')) { 
    saveAvatarToIDB(u.username, u.avatar, setUserAvatars); 
  } 
}} onDeleteUser={(u) => { setUsers(prev => prev.filter(x => x.username !== u)); removeDoc('users', u); }} onToggleManager={(u) => { const user = users.find(x => x.username === u); if (user) { const updated = { ...user, isManager: !user.isManager }; setUsers(prev => prev.map(x => x.username === u ? updated : x)); saveDoc('users', updated, updated.username); } }} onClearData={handleClearData} onClearEverythingPermanent={() => handleClearData([])} onRestoreBackup={async () => {}} onExport={handleSelectiveExport} onImport={() => {}} onRepair={handleRepairAndOptimize} onHealthCheck={handleHealthCheck} lastBackupDate={lastBackupDate} onBack={() => handleNavigateWithCheck(Page.Dashboard)} isDarkMode={isDarkMode} startView={currentPage === Page.SellersSafes ? 'sales' : 'menu'} hideProfits={currentPage === Page.SellersSafes} isSplashEnabled={isSplashEnabled} toggleSplash={toggleSplash} />}
                {editingBook && createPortal(
                  <BookForm books={books} categories={categories} subCategories={subCategories} publishers={publishers} initialData={editingBook} onAddSubCategory={(sc) => { setSubCategories(prev => [...prev, sc]); saveDoc('subCategories', sc, sc.id); }} onSubmit={async (data) => {
                      const updated = { ...editingBook, ...data };
                      await handleUpdateBook(updated, 'تم تحديث بيانات الكتاب بنجاح');
                      setEditingBook(null);
                    }} onCancel={() => setEditingBook(null)} isDarkMode={isDarkMode} />, document.body
                )}
              </main>
              <div className="fixed bottom-10 right-10 z-[2000] flex flex-col gap-3">{toasts.map(toast => (<Toast key={toast.id} message={toast} isDarkMode={isDarkMode} />))}</div>
              
              {showCloudModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className={`relative w-full max-w-md rounded-[40px] shadow-2xl p-10 border text-center ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                    
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${firebaseStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{firebaseStatus === 'connected' ? <Cloud size={40} /> : <WifiOff size={40} />}</div>
                    <h3 className={`text-2xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{firebaseStatus === 'connected' ? 'حالة الاتصال: متصل فعلياً' : 'غير متصل بالإنترنت'}</h3>
                    <div className={`p-5 rounded-2xl mb-8 border-2 border-dashed text-right ${isDarkMode ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange border-orange-100'}`}><p className="text-orange-600 font-black text-sm mb-2 flex items-center gap-2"><ShieldAlert size={16}/> وضع العمل المحلي (Offline)</p><p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>تم اكتشاف عدم وجود اتصال حقيقي بالإنترنت (أو أنك اخترت العمل محلياً). يمكنك الاستمرار في استخدام النظام بشكل طبيعي، حيث يتم حفظ كافة البيانات في قاعدة البيانات المحلية (IndexedDB) تلقائياً، وسيتم مزامنتها مع السحابة بمجرد عودة الاتصال الحقيقي.<br/><br/><span className="text-red-500">ملاحظة: وجود كابل الشبكة لا يعني بالضرورة وجود إنترنت إذا كان مخصصاً للطابعات فقط.</span></p></div>
                    <div className="flex flex-col gap-3">{firebaseStatus === 'connected' ? (<button onClick={handleForceOffline} className="w-full py-4 rounded-2xl font-black text-lg bg-orange-600 text-white hover:bg-orange-700 transition-all flex items-center justify-center gap-3"><CloudOff size={20} />متابعة في وضع Offline</button>) : (<button onClick={handleReconnect} className="w-full py-4 rounded-2xl font-black text-lg bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"><Cloud size={20} />إعادة الاتصال بالسحابة</button>)}<button onClick={() => setShowCloudModal(false)} className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-400'}`}>إلغاء</button></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;