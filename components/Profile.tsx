import { User, Key, ShieldCheck, ArrowRight, Save, Lock, AlertCircle, TrendingUp, Calendar, Search, Users, ChevronDown, ChevronLeft, Shield, Play, Loader2, UserPlus, Trash2, ShieldAlert, Layout, Edit3, Sun, Moon, Palette, Check, Info, Printer, ZoomIn, Calculator, LockKeyhole, UnlockKeyhole, Database, RefreshCw, CloudDownload, CheckCircle2, FolderDown, FolderUp, Timer, ShieldAlert as DangerIcon, HardDrive, Activity, FileCheck, Image as ImageIcon, UploadCloud, Monitor, X, Banknote, BookOpen, FileArchive, Archive, Settings, FileSpreadsheet, FileText, Download, Sparkles, BookMarked, ArrowUpDown } from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { UserAccount, SaleRecord, Book, FinancialEntry, Page, Category, SubCategory } from '../types';
import { CacheService } from '../services/cacheService';
import { LibraryCustomization } from './LibraryCustomization';
import { getPrintBaseHead } from '../src/utils/printStyles';
import { compressAndGetBase64, saveCoverToIDB } from '../src/utils/imageStorage';

interface ProfileProps {
  currentUser: UserAccount;
  users: UserAccount[];
  books: Book[];
  categories?: Category[];
  subCategories?: SubCategory[];
  financialLedger: FinancialEntry[];
  salesHistory: SaleRecord[]; 
  systemName: string;
  accentColor: string;
  zoomLevel: number;
  lockedPages: Page[];
  onToggleLockedPage: (page: Page) => void;
  onUpdateZoomLevel: (level: number) => void;
  onUpdateSystemName: (name: string) => void;
  onUpdateAccentColor: (color: string) => void;
  onUpdatePassword: (newPass: string, newUsername: string) => void;
  onUpdateTheme: (isDark: boolean) => void;
  onAddUser: (user: UserAccount) => void;
  onDeleteUser: (username: string) => void;
  onToggleManager: (username: string) => void;
  onAddCategory?: (category: Category) => void;
  onAddSubCategory?: (subCategory: SubCategory) => void;
  onDeleteCategory?: (id: string) => void;
  onDeleteSubCategory?: (id: string) => void;
  onUpdateCategory?: (category: Category) => void;
  onUpdateBook?: (book: Book) => void;
  onBatchUpdateBooks?: (books: Book[]) => void;
  onClearData: (targets: string[]) => void;
  onClearEverythingPermanent: () => void;
  onRestoreBackup: (onProgress: (p: number) => void) => Promise<void>;
  onExport: (targets: string[]) => void;
  onImport: () => void;
  onRepair?: () => Promise<void>;
  onHealthCheck?: () => Promise<string[]>;
  lastBackupDate?: string | null;
  onBack: () => void;
  isDarkMode?: boolean;
  startView?: ProfileView;
  hideProfits?: boolean;
  isSplashEnabled: boolean;
  toggleSplash: () => void;
  userAvatars: Record<string, string>;
  onUpdateAvatar: (username: string, avatar: string) => void;
}

type ProfileView = 'menu' | 'password' | 'sales' | 'sales-auth' | 'user-management' | 'customization' | 'database-tools' | 'library-customization';
type RestoreStep = 'idle' | 'confirm' | 'loading' | 'finished';
type DangerZoneState = 'idle' | 'auth' | 'confirm';

interface SelectableOption {
  key: string;
  label: string;
  checked: boolean;
}

const colorOptions = [
  { id: 'emerald', label: 'الزمردي', hex: '#10b981' },
  { id: 'blue', label: 'الأزرق', hex: '#3b82f6' },
  { id: 'purple', label: 'البنفسجي', hex: '#a855f7' },
  { id: 'rose', label: 'الوردي', hex: '#f43f5e' },
  { id: 'amber', label: 'الكهرماني', hex: '#f59e0b' },
  { id: 'indigo', label: 'النيلي', hex: '#6366f1' },
  { id: 'cyan', label: 'السماوي', hex: '#06b6d4' },
  { id: 'teal', label: 'التركواز', hex: '#14b8a6' },
  { id: 'lime', label: 'الليموني', hex: '#84cc16' },
  { id: 'yellow', label: 'الأصفر', hex: '#eab308' },
  { id: 'orange', label: 'البرتقالي', hex: '#f97316' },
  { id: 'pink', label: 'الزهري', hex: '#ec4899' },
  { id: 'fuchsia', label: 'الفوشيا', hex: '#d946ef' },
  { id: 'violet', label: 'البنفسج', hex: '#8b5cf6' },
  { id: 'slate', label: 'الرمادي', hex: '#64748b' },
];

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return await res.blob();
};

const Profile: React.FC<ProfileProps> = ({ 
  currentUser, 
  users, 
  books, 
  categories = [],
  subCategories = [],
  financialLedger = [], 
  salesHistory = [], 
  systemName, 
  accentColor, 
  zoomLevel,
  lockedPages,
  onToggleLockedPage,
  onUpdateZoomLevel,
  onUpdateSystemName, 
  onUpdateAccentColor,
  onUpdatePassword, 
  onUpdateTheme,
  onAddUser, 
  onDeleteUser, 
  onToggleManager, 
  onAddCategory,
  onAddSubCategory,
  onDeleteCategory,
  onDeleteSubCategory,
  onUpdateCategory,
  onUpdateBook,
  onBatchUpdateBooks,
  onClearData,
  onClearEverythingPermanent,
  onRestoreBackup,
  onExport,
  onImport,
  onRepair,
  onHealthCheck,
  lastBackupDate,
  onBack, 
  isDarkMode,
  startView,
  hideProfits = false,
  isSplashEnabled,
  toggleSplash,
  userAvatars,
  onUpdateAvatar
}) => {
  const [activeView, setActiveView] = useState<ProfileView>(startView || 'menu');
  const [pendingView, setPendingView] = useState<ProfileView | null>(null);
  const [pendingTogglePage, setPendingTogglePage] = useState<Page | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  const [restoreStep, setRestoreStep] = useState<RestoreStep>('idle');
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [dangerState, setDangerState] = useState<DangerZoneState>('idle');
  const [timer, setTimer] = useState(10);
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

  // حالات إعدادات السحابة والذكاء الاصطناعي الجديدة
  const [showFbEditor, setShowFbEditor] = useState(false);
  const [showApiEditor, setShowApiEditor] = useState(false);
  const [fbText, setFbText] = useState(localStorage.getItem('ALADDIN_FIREBASE_CONFIG') || '');
  const [apiText, setApiText] = useState(localStorage.getItem('ALADDIN_GEMINI_KEY') || '');

  // حالات تخصيص غلاف الكتاب وقاعدة البيانات والطباعة
  const [activeCustomizationTab, setActiveCustomizationTab] = useState<'identity' | 'zoom' | 'colors' | 'book_cover' | 'splash' | 'auto_login' | 'printer' | 'library'>('identity');
  const [activeDatabaseTab, setActiveDatabaseTab] = useState<'books_report' | 'backup' | 'restore' | 'images_zip' | 'images_json' | 'health' | 'cloud_ai' | 'delete'>('books_report');
  const [booksReportSearch, setBooksReportSearch] = useState<string>('');
  const [booksReportFilter, setBooksReportFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [booksReportSort, setBooksReportSort] = useState<'author_asc' | 'title_asc' | 'qty_desc' | 'price_desc' | 'date_desc'>('author_asc');
  const [cloudCoverSync, setCloudCoverSync] = useState<boolean>(() => {
    return localStorage.getItem('aladdin_cloud_cover_sync') !== 'false';
  });
  const [coverCornerStyle, setCoverCornerStyle] = useState<'soft' | 'sharp'>(() => {
    return (localStorage.getItem('aladdin_cover_corner_style') as 'soft' | 'sharp') || 'soft';
  });
  const [coverImageSize, setCoverImageSize] = useState<number>(() => {
    const saved = localStorage.getItem('aladdin_cover_image_size');
    return saved ? parseInt(saved, 10) : 100;
  });

  // حالات إعدادات الطابعة والطباعة الصامتة
  const [printerName, setPrinterName] = useState<string>(() => {
    return localStorage.getItem('aladdin_printer_name') || 'Konica Minolta bizhub';
  });
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'A5' | 'A3' | '80mm'>(() => {
    return (localStorage.getItem('aladdin_print_paper_size') as any) || 'A4';
  });
  const [printSilentMode, setPrintSilentMode] = useState<boolean>(() => {
    return localStorage.getItem('aladdin_print_silent_mode') === 'true';
  });
  const [printColorMode, setPrintColorMode] = useState<'color' | 'monochrome'>(() => {
    return (localStorage.getItem('aladdin_print_color_mode') as any) || 'color';
  });
  const [printAutoOpenDialog, setPrintAutoOpenDialog] = useState<boolean>(() => {
    const saved = localStorage.getItem('aladdin_print_auto_open');
    return saved ? saved === 'true' : true;
  });
  const [printMarginMode, setPrintMarginMode] = useState<'none' | 'default' | 'minimal'>(() => {
    return (localStorage.getItem('aladdin_print_margin_mode') as any) || 'none';
  });

  const handleUpdatePrinterName = (name: string) => {
    setPrinterName(name);
    localStorage.setItem('aladdin_printer_name', name);
    window.dispatchEvent(new Event('aladdin_settings_updated'));
  };

  const handleUpdatePaperSize = (size: 'A4' | 'A5' | 'A3' | '80mm') => {
    setPrintPaperSize(size);
    localStorage.setItem('aladdin_print_paper_size', size);
    window.dispatchEvent(new Event('aladdin_settings_updated'));
  };

  const handleUpdateSilentMode = (silent: boolean) => {
    setPrintSilentMode(silent);
    localStorage.setItem('aladdin_print_silent_mode', String(silent));
    window.dispatchEvent(new Event('aladdin_settings_updated'));
  };

  const handleUpdateColorMode = (color: 'color' | 'monochrome') => {
    setPrintColorMode(color);
    localStorage.setItem('aladdin_print_color_mode', color);
    window.dispatchEvent(new Event('aladdin_settings_updated'));
  };

  const handleUpdateAutoOpen = (auto: boolean) => {
    setPrintAutoOpenDialog(auto);
    localStorage.setItem('aladdin_print_auto_open', String(auto));
    window.dispatchEvent(new Event('aladdin_settings_updated'));
  };

  const handleUpdateMarginMode = (margin: 'none' | 'default' | 'minimal') => {
    setPrintMarginMode(margin);
    localStorage.setItem('aladdin_print_margin_mode', margin);
    window.dispatchEvent(new Event('aladdin_settings_updated'));
  };

  const handleUpdateCoverCornerStyle = (style: 'soft' | 'sharp') => {
    setCoverCornerStyle(style);
    localStorage.setItem('aladdin_cover_corner_style', style);
    window.dispatchEvent(new Event('aladdin_settings_updated'));
  };

  const handleUpdateCoverImageSize = (size: number) => {
    setCoverImageSize(size);
    localStorage.setItem('aladdin_cover_image_size', String(size));
    window.dispatchEvent(new Event('aladdin_settings_updated'));
  };

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<SelectableOption[]>([
    { key: 'books', label: 'قائمة الكتب والمصاحف', checked: true },
    { key: 'salesHistory', label: 'سجل المبيعات والفواتير', checked: true },
    { key: 'purchaseHistory', label: 'سجل المشتريات والتوريد', checked: true },
    { key: 'financialLedger', label: 'السجل المالي والخزينة', checked: true },
    { key: 'suppliers', label: 'بيانات الموردين', checked: true },
    { key: 'customers', label: 'قائمة العملاء', checked: true },
    { key: 'debtCustomers', label: 'سجل الديون (الآجل)', checked: true },
    { key: 'categories', label: 'الأقسام والتصنيفات', checked: true },
    { key: 'users', label: 'حسابات المستخدمين', checked: true },
  ]);

  const [deleteOptions, setDeleteOptions] = useState<SelectableOption[]>([
    { key: 'books', label: 'جميع الكتب والمصاحف', checked: false },
    { key: 'salesHistory', label: 'تصفير المبيعات والفواتير', checked: false },
    { key: 'purchaseHistory', label: 'تصفير سجل المشتريات', checked: false },
    { key: 'financialLedger', label: 'تصفير السجل المالي', checked: false },
    { key: 'suppliers', label: 'حذف جميع الموردين', checked: false },
    { key: 'customers', label: 'حذف جميع العملاء', checked: false },
    { key: 'debtCustomers', label: 'حذف سجلات الديون', checked: false },
  ]);

  const [healthStatus, setHealthStatus] = useState<string[] | null>(null);
  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false);

  const [tempSystemName, setTempSystemName] = useState(systemName);
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [filterFrom, setFilterFrom] = useState(new Date().toISOString().split('T')[0]);
  const [filterTo, setFilterTo] = useState(new Date().toISOString().split('T')[0]);
  const [filterUser, setFilterUser] = useState('all');
  const [newUser, setNewUser] = useState({ username: '', password: '', isManager: false, avatar: '' as string | undefined });

  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);
  const userSelectRef = useRef<HTMLSelectElement>(null);
  const generateBtnRef = useRef<HTMLButtonElement>(null);
  const imageImportRef = useRef<HTMLInputElement>(null);
  const zipImportRef = useRef<HTMLInputElement>(null);
  const folderImportRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
  const [importImagePreviewItems, setImportImagePreviewItems] = useState<{ id: string, title: string }[]>([]);
  const [importedRawData, setImportedRawData] = useState<Record<string, string>>({});

  // حالات الدخول الفوري للحساب
  const [showAutoLoginModal, setShowAutoLoginModal] = useState(false);
  const [autoLoginPassInput, setAutoLoginPassInput] = useState('');
  const [autoLoginError, setAutoLoginError] = useState('');
  const [isAutoLoginEnabled, setIsAutoLoginEnabled] = useState(() => {
    return localStorage.getItem('aladdin_auto_login_disabled') !== 'true';
  });

  const handleConfirmAutoLogin = () => {
    if (autoLoginPassInput === currentUser.password) {
      localStorage.removeItem('aladdin_auto_login_disabled');
      localStorage.setItem('aladdin_auto_login_username', currentUser.username);
      localStorage.setItem('aladdin_auto_login_password', currentUser.password);
      setIsAutoLoginEnabled(true);
      setShowAutoLoginModal(false);
      alert('تم تفعيل الدخول الفوري لحسابك بنجاح! سيتم تسجيل دخولك تلقائياً عند فتح النظام.');
    } else {
      setAutoLoginError('عذراً، كلمة المرور غير صحيحة');
    }
  };

  useEffect(() => {
    let interval: any;
    if (dangerState === 'confirm' && timer > 0) {
      interval = setInterval(() => { setTimer((prev) => prev - 1); }, 1000);
    }
    return () => clearInterval(interval);
  }, [dangerState, timer]);

  useEffect(() => {
    if (activeView === 'sales') {
      setTimeout(() => { fromDateRef.current?.focus(); }, 300);
    }
  }, [activeView]);

  const handlePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (editUsername !== currentUser.username && users.some(u => u.username === editUsername)) {
      setError('اسم المستخدم هذا موجود بالفعل، يرجى اختيار اسم آخر');
      return;
    }

    if (currentPass !== currentUser.password) { setError('كلمة مرور الحالية غير صحيحة'); return; }
    if (newPass.length < 4) { setError('كلمة مرور الجديدة يجب أن تكون 4 خانات على الأقل'); return; }
    if (newPass !== confirmPass) { setError('كلمة مرور الجديدة غير متطابقة مع التأكيد'); return; }
    
    onUpdatePassword(newPass, editUsername);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setActiveView('menu');
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const authenticatedManager = users.find(u => u.isManager && u.password === authPass);
    if (authenticatedManager) {
      if (pendingTogglePage) {
        onToggleLockedPage(pendingTogglePage);
        setPendingTogglePage(null);
        setAuthPass('');
        setActiveView('password');
        return;
      }
      if (pendingView) { 
        if (pendingView === 'database-tools' && dangerState === 'auth') {
          setDangerState('confirm');
          setTimer(10);
          setActiveView('database-tools');
        } else {
          setActiveView(pendingView); 
        }
        setPendingView(null); 
      }
      setAuthPass('');
    } else { setAuthError('كلمة مرور المدير غير صحيحة، الوصول مرفوض'); }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    if (users.some(u => u.username === newUser.username)) { alert('اسم المستخدم موجود بالفعل'); return; }
    onAddUser(newUser);
    setNewUser({ username: '', password: '', isManager: false, avatar: '' });
  };

  const handleNewUserAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setNewUser(prev => ({ ...prev, avatar: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveSystemName = () => { if (tempSystemName.trim()) { onUpdateSystemName(tempSystemName.trim()); } };

  const requestProtectedView = (view: ProfileView, customizationTab?: 'identity' | 'zoom' | 'colors' | 'book_cover' | 'splash' | 'auto_login' | 'printer') => {
    if (customizationTab) {
      setActiveCustomizationTab(customizationTab);
    }
    const isLocked = lockedPages.includes(view === 'sales' ? Page.Sales : view as any);
    if (currentUser.isManager || !isLocked) { setActiveView(view); } 
    else { setPendingView(view); setActiveView('sales-auth'); }
  };

  const aggregatedDailyData = useMemo(() => {
    const dailyGroups: Record<string, { date: number, revenue: number, profit: number, userLabel: string }> = {};
    
    // التعديل الجذري: الاعتماد على سجل الفواتير (salesHistory) كمصدر للتقارير لضمان دقة الرصيد عند الإرجاع (بيع + مرتجع)
    salesHistory.forEach(sale => {
      const dateKey = new Date(sale.timestamp).toISOString().split('T')[0];
      const isWithinDate = (!filterFrom || dateKey >= filterFrom) && (!filterTo || dateKey <= filterTo);
      const isMatchingUser = filterUser === 'all' || sale.seller === filterUser;
      
      if (isWithinDate && isMatchingUser) {
        if (!dailyGroups[dateKey]) { 
          dailyGroups[dateKey] = { 
            date: sale.timestamp, 
            revenue: 0, 
            profit: 0, 
            userLabel: filterUser === 'all' ? 'الكل' : sale.seller 
          }; 
        }
        
        // بما أن المرتجعات تخزن الآن بسالب، فإن الجمع المباشر يحقق الصافي المطلوب
        const rev = sale.netAmount;
        dailyGroups[dateKey].revenue += rev;

        // احتساب الربح ديناميكياً من بنود الفاتورة وتكلفة الكتب المسجلة حالياً
        let saleProfit = 0;
        sale.items.forEach(item => {
            const b = books.find(book => book.id === item.bookId);
            const cost = b ? (b.purchasePrice || 0) : 0;
            // يتم ضرب الفرق في الكمية (المرتجع له netAmount سالب وبالتالي الربح يجب أن يتبع الإشارة)
            saleProfit += (item.price - cost) * item.quantity;
        });
        
        // التأكد من أن إشارة الربح تطابق إشارة الإيراد
        const finalProfit = (sale.netAmount < 0) ? -Math.abs(saleProfit) : Math.abs(saleProfit);
        dailyGroups[dateKey].profit += finalProfit;
      }
    });
    
    return Object.values(dailyGroups).sort((a, b) => b.date - a.date);
  }, [salesHistory, books, filterFrom, filterTo, filterUser]);

  const totals = useMemo(() => {
    return aggregatedDailyData.reduce((acc, curr) => ({ revenue: acc.revenue + curr.revenue, profit: acc.profit + curr.profit }), { revenue: 0, profit: 0 });
  }, [aggregatedDailyData]);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setShowReport(true);
    setProgress(0);
    setVisibleCount(0);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setProgress(currentProgress);
      if (aggregatedDailyData.length > 0) {
        setVisibleCount(Math.ceil((currentProgress / 100) * aggregatedDailyData.length));
      }
      if (currentProgress >= 100) { clearInterval(interval); setIsGenerating(false); }
    }, 30);
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (!printWindow) return;
    const profitHeader = hideProfits ? '' : '<th>صافي الربح</th>';
    const rowsHtml = aggregatedDailyData.map((day) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; text-align: right; font-weight: 700;">${new Date(day.date).toLocaleDateString('ar-EG')}</td>
        <td style="padding: 12px; text-align: center;">${day.userLabel}</td>
        <td style="padding: 12px; text-align: center; font-weight: 800;">${day.revenue.toLocaleString()} د.ل</td>
        ${hideProfits ? '' : `<td style="padding: 12px; text-align: center; font-weight: 800; color: ${day.profit >= 0 ? '#10b981' : '#ef4444'};">${day.profit.toLocaleString()} د.ل</td>`}
      </tr>
    `).join('');
    const summaryHtml = `
      <div class="summary-cards" style="${hideProfits ? 'grid-template-columns: 1fr;' : ''}">
        <div class="card revenue"><span class="card-label">إجمالي المبيعات (الفواتير)</span><span class="card-value">${totals.revenue.toLocaleString()} د.ل</span></div>
        ${hideProfits ? '' : `<div class="card profit"><span class="card-label">صافي الأرباح المحققة</span><span class="card-value">${totals.profit.toLocaleString()} د.ل</span></div>`}
      </div>
    `;
    const html = `
      <html dir="rtl" lang="ar">
        <head>
          ${getPrintBaseHead(`تقرير مالي - ${systemName}`, `
            body { font-family: 'Cairo', 'Almarai', sans-serif !important; padding: 40px; color: #334155; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 4px solid #10b981; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #10b981; font-size: 32px; font-weight: 900; }
            .filter-info { display: flex; justify-content: space-between; background: #f8fafc; padding: 15px 25px; border-radius: 15px; margin-bottom: 30px; border: 1px solid #e2e8f0; font-size: 14px; font-weight: 700; }
            .summary-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .card { padding: 25px; border-radius: 20px; text-align: center; border: 2px solid #e2e8f0; }
            .card.profit { background: #f0fdf4; border-color: #bbf7d0; }
            .card.revenue { background: #eff6ff; border-color: #bfdbfe; }
            .card-label { font-size: 12px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 10px; display: block; }
            .card-value { font-size: 28px; font-weight: 900; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #10b981; color: white; padding: 15px; text-align: center; font-weight: 900; font-size: 14px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          `)}
        </head>
        <body>
          <div class="header"><h1>${hideProfits ? 'خزائن البائعين (تقرير المبيعات)' : 'التقرير المالي التفصيلي (من الفواتير)'}</h1><p style="margin-top: 8px; font-weight: 700; color: #64748b;">${systemName}</p></div>
          <div class="filter-info"><div>من تاريخ: ${filterFrom}</div><div>إلى تاريخ: ${filterTo}</div><div>المستخدم: ${filterUser === 'all' ? 'كافة المستخدمين' : filterUser}</div></div>
          ${summaryHtml}
          <table><thead><tr><th style="text-align: right;">التاريخ</th><th>المسؤول</th><th>إجمالي المبيعات</th>${profitHeader}</tr></thead><tbody>${rowsHtml}</tbody></table>
          <div class="footer">تم استخراج التقرير بتاريخ: ${new Date().toLocaleString('ar-EG')} - نظام ${systemName}</div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const lockablePages = [
    { id: Page.Dashboard, label: 'لوحة التحكم والإحصائيات' },
    { id: Page.Warehouse, label: 'المخزن الشامل والأقسام' },
    { id: Page.Suppliers, label: 'الموردون والعملاء والديون' },
    { id: Page.SalesHistory, label: 'سجل الفواتير والأرشيف' },
    { id: Page.AddBook, label: 'فواتير التوريد (المشتريات)' },
    { id: 'customization' as any, label: 'تخصيص النظام' },
    { id: 'sales' as any, label: 'التقارير المالية' },
    { id: 'user-management' as any, label: 'إدارة الحسابات' },
    { id: 'database-tools' as any, label: 'إدارة وقواعد البيانات' },
  ];

  const runRepair = async () => {
    setIsRunningMaintenance(true);
    await new Promise(r => setTimeout(r, 2000));
    if (onRepair) await onRepair();
    setIsRunningMaintenance(false);
  };

  const runHealthCheck = async () => {
    setIsRunningMaintenance(true);
    if (onHealthCheck) {
      const results = await onHealthCheck();
      setHealthStatus(results);
    }
    setIsRunningMaintenance(false);
  };

  const toggleExportOption = (key: string) => { setExportOptions(prev => prev.map(opt => opt.key === key ? { ...opt, checked: !opt.checked } : opt)); };
  const toggleDeleteOption = (key: string) => { setDeleteOptions(prev => prev.map(opt => opt.key === key ? { ...opt, checked: !opt.checked } : opt)); };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // تقليل حجم الصورة قبل الرفع
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onUpdateAvatar(currentUser.username, dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectiveExport = () => {
    const selectedKeys = exportOptions.filter(o => o.checked).map(o => o.key);
    if (selectedKeys.length === 0) return alert('يرجى اختيار عنصر واحد على الأقل للتصدير');
    setIsRunningMaintenance(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setRestoreProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        onExport(selectedKeys);
        setIsRunningMaintenance(false);
        setRestoreProgress(0);
        setShowExportModal(false);
      }
    }, 100);
  };

  const handleSelectiveDelete = () => {
    const selectedKeys = deleteOptions.filter(o => o.checked).map(o => o.key);
    if (selectedKeys.length === 0) return alert('يرجى اختيار عنصر واحد على الأقل للحذف');
    onClearData(selectedKeys);
    setDangerState('idle');
  };

  // دالة مساعدة للحصول على رابط الصورة كـ Base64 لضمان ظهورها في التقرير والطباعة
  const getBookCoverBase64 = async (book: Book): Promise<string> => {
    if (book.image && typeof book.image === 'string' && book.image.startsWith('data:image')) {
      return book.image;
    }
    if (book.image && typeof book.image === 'string' && (book.image.startsWith('blob:') || book.image.startsWith('http'))) {
      try {
        const response = await fetch(book.image);
        const blob = await response.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve(book.image || '');
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Failed to fetch blob image:', e);
      }
    }

    // التحقق من قاعدة بيانات الصور المحلية IndexedDB
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('AladdinImages', 3);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (db.objectStoreNames.contains('covers')) {
        const tx = db.transaction('covers', 'readonly');
        const store = tx.objectStore('covers');
        const blobResult = await new Promise<any>((resolve) => {
          const getReq = store.get(book.id);
          getReq.onsuccess = () => resolve(getReq.result);
          getReq.onerror = () => resolve(null);
        });
        if (blobResult instanceof Blob) {
          return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blobResult);
          });
        }
      }
    } catch (err) {
      console.warn('Failed to read cover from IndexedDB:', err);
    }

    return book.image || '';
  };

  // دالة مقارنة النصوص العربية للترتيب الأبجدي الدقيق
  const compareArabicText = (a?: string, b?: string): number => {
    const cleanA = (a || '').trim();
    const cleanB = (b || '').trim();
    if (!cleanA && !cleanB) return 0;
    if (!cleanA) return 1; // السجلات بدون مؤلف أو بدون عنوان توضع في النهاية
    if (!cleanB) return -1;
    return cleanA.localeCompare(cleanB, 'ar', { sensitivity: 'base', numeric: true });
  };

  // تصفية وترتيب الكتب لتقرير وتصدير الكتب (أبجدياً وحسب المؤلف)
  const filteredBooksForReport = useMemo(() => {
    const list = books.filter(b => {
      const matchSearch = !booksReportSearch || 
        b.title?.toLowerCase().includes(booksReportSearch.toLowerCase()) ||
        b.author?.toLowerCase().includes(booksReportSearch.toLowerCase()) ||
        b.barcode?.toLowerCase().includes(booksReportSearch.toLowerCase()) ||
        b.category?.toLowerCase().includes(booksReportSearch.toLowerCase());
      
      const qty = Number(b.quantity) || 0;
      let matchFilter = true;
      if (booksReportFilter === 'in_stock') matchFilter = qty > 0;
      else if (booksReportFilter === 'low_stock') matchFilter = qty > 0 && qty <= 5;
      else if (booksReportFilter === 'out_of_stock') matchFilter = qty <= 0;

      return matchSearch && matchFilter;
    });

    return [...list].sort((a, b) => {
      if (booksReportSort === 'author_asc') {
        // ترتيب أبجدي حسب اسم المؤلف (أ - ي)، وعند تساوي المؤلف يتم الترتيب حسب عنوان الكتاب (أ - ي)
        const authorDiff = compareArabicText(a.author, b.author);
        if (authorDiff !== 0) return authorDiff;
        return compareArabicText(a.title, b.title);
      }
      if (booksReportSort === 'title_asc') {
        // ترتيب أبجدي حسب عنوان الكتاب (أ - ي)، وعند تساوي العنوان يتم الترتيب حسب اسم المؤلف (أ - ي)
        const titleDiff = compareArabicText(a.title, b.title);
        if (titleDiff !== 0) return titleDiff;
        return compareArabicText(a.author, b.author);
      }
      if (booksReportSort === 'qty_desc') {
        return (Number(b.quantity) || 0) - (Number(a.quantity) || 0);
      }
      if (booksReportSort === 'price_desc') {
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      }
      if (booksReportSort === 'date_desc') {
        return (b.addedAt || 0) - (a.addedAt || 0);
      }
      return 0;
    });
  }, [books, booksReportSearch, booksReportFilter, booksReportSort]);

  // تصدير تقرير الكتب PDF
  const handleExportBooksPDF = async (reportList: Book[] = filteredBooksForReport) => {
    if (!reportList || reportList.length === 0) {
      alert('لا توجد كتب لتضمينها في تقرير PDF');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
      return;
    }

    // كتابة شاشة تحميل مؤقتة داخل نافذة الطباعة
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head><title>جاري إعداد التقرير...</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
          <div style="text-align: center; color: #047857; font-weight: bold; font-size: 16px;">
            جاري تجهيز تقرير وجرد الكتب مع الصور والأرقام...
          </div>
        </body>
      </html>
    `);

    // تجهيز الصور كـ Base64 لضمان عرضها بدون مشاكل في نافذة الطباعة
    const resolvedCovers = await Promise.all(
      reportList.map(async (book) => {
        return await getBookCoverBase64(book);
      })
    );

    const totalCount = reportList.length;
    const totalQty = reportList.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0);

    const rowsHtml = reportList.map((book, idx) => {
      const price = Number(book.price) || 0;
      const qty = Number(book.quantity) || 0;
      const coverSrc = resolvedCovers[idx];
      const hasImage = coverSrc && typeof coverSrc === 'string' && coverSrc.length > 20;
      const imgHtml = hasImage 
        ? `<div class="cover-wrapper">
             <img src="${coverSrc}" alt="" class="book-cover-img" loading="eager" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
             <div class="no-cover-placeholder" style="display:none;">📖</div>
           </div>`
        : `<div class="no-cover-placeholder">📖</div>`;

      return `
        <tr class="book-row">
          <td class="col-seq">${idx + 1}</td>
          <td class="col-img">${imgHtml}</td>
          <td class="col-title">
            <div class="book-title">${book.title || 'بدون عنوان'}</div>
            ${book.category ? `<div class="book-category">${book.category}</div>` : ''}
          </td>
          <td class="col-author">${book.author || 'غير محدد'}</td>
          <td class="col-price">${price.toFixed(2)} د.ل</td>
          <td class="col-qty">${qty.toLocaleString('en-US')}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          ${getPrintBaseHead(`تقرير جرد وسجل الكتب - ${systemName}`, `
            @page {
              size: A4 portrait;
              margin: 12mm 10mm 15mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Cairo', 'Almarai', system-ui, -apple-system, sans-serif !important;
              margin: 0;
              padding: 24px;
              color: #0f172a;
              background: #ffffff;
              font-size: 12px;
            }
            .header-container {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3px solid #059669;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .header-info h1 {
              margin: 0 0 4px 0;
              color: #065f46;
              font-size: 24px;
              font-weight: 900;
            }
            .header-info p {
              margin: 0;
              color: #64748b;
              font-weight: 700;
              font-size: 13px;
            }
            .header-meta {
              text-align: left;
              font-size: 11px;
              color: #475569;
              font-weight: 700;
              line-height: 1.6;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .stat-card {
              padding: 14px 20px;
              border-radius: 14px;
              text-align: center;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
            }
            .stat-card.emerald {
              background: #ecfdf5;
              border-color: #a7f3d0;
            }
            .stat-card.blue {
              background: #eff6ff;
              border-color: #bfdbfe;
            }
            .stat-label {
              font-size: 12px;
              font-weight: 800;
              color: #475569;
              display: block;
              margin-bottom: 4px;
            }
            .stat-value {
              font-size: 22px;
              font-weight: 900;
              color: #065f46;
            }
            .stat-value small {
              font-size: 12px;
              font-weight: 700;
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-top: 10px;
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid #e2e8f0;
            }
            thead {
              background: linear-gradient(135deg, #065f46, #047857);
              color: #ffffff;
            }
            th {
              padding: 12px 10px;
              font-weight: 900;
              font-size: 12px;
              text-align: center;
              border: none;
            }
            th.text-right {
              text-align: right;
            }
            .book-row {
              page-break-inside: avoid;
            }
            .book-row:nth-child(even) {
              background-color: #f8fafc;
            }
            .book-row:nth-child(odd) {
              background-color: #ffffff;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: middle;
              font-size: 12px;
            }
            .col-seq {
              width: 35px;
              text-align: center;
              font-weight: 800;
              color: #94a3b8;
              font-size: 11px;
            }
            .col-img {
              width: 65px;
              text-align: center;
            }
            .book-cover-img {
              width: 44px;
              height: 58px;
              object-fit: cover;
              border-radius: 4px;
              border: 1px solid #cbd5e1;
              display: block;
              margin: 0 auto;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .no-cover-placeholder {
              width: 44px;
              height: 58px;
              border-radius: 4px;
              border: 1px dashed #cbd5e1;
              background: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              color: #94a3b8;
              margin: 0 auto;
            }
            .col-title {
              text-align: right;
              font-weight: 800;
            }
            .book-title {
              font-size: 13px;
              font-weight: 900;
              color: #0f172a;
              line-height: 1.3;
            }
            .book-category {
              display: block;
              font-size: 11px;
              font-weight: 600;
              color: #334155;
              margin-top: 3px;
            }
            .col-author {
              text-align: right;
              font-weight: 700;
              color: #334155;
              font-size: 12px;
            }
            .col-price {
              text-align: center;
              white-space: nowrap;
              font-weight: 900;
              font-size: 13px;
              color: #000000;
            }
            .col-qty {
              text-align: center;
              white-space: nowrap;
              font-weight: 900;
              font-size: 13px;
              color: #000000;
            }
            .total-row-last {
              background: #f8fafc;
              font-weight: 900;
              border-top: 2px solid #059669;
              page-break-inside: avoid;
            }
            .total-row-last td {
              padding: 12px 10px;
              font-size: 13px;
            }
            .footer-info {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              font-weight: 700;
              color: #94a3b8;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
            }
          `)}
        </head>
        <body>
          <div class="header-container">
            <div class="header-info">
              <h1>تقرير جرد وسجل الكتب الشامل</h1>
              <p>${systemName}</p>
            </div>
            <div class="header-meta">
              <div>تاريخ التقرير: ${new Date().toISOString().slice(0, 10)}</div>
              <div>الوقت: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              <div>المستخدم: ${currentUser.username || 'المسؤول'}</div>
              <div>الترتيب: ${booksReportSort === 'author_asc' ? 'أبجدي حسب المؤلف (أ - ي)' : booksReportSort === 'title_asc' ? 'أبجدي حسب عنوان الكتاب (أ - ي)' : booksReportSort === 'qty_desc' ? 'حسب أعلى كمية' : booksReportSort === 'price_desc' ? 'حسب السعر' : 'حسب تاريخ الإضافة'}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card emerald">
              <span class="stat-label">إجمالي عناوين الكتب</span>
              <span class="stat-value">${totalCount.toLocaleString('en-US')}</span>
            </div>
            <div class="stat-card blue">
              <span class="stat-label">إجمالي الكمية الموجودة بالمخزن</span>
              <span class="stat-value">${totalQty.toLocaleString('en-US')} <small>نسخة</small></span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35px;">#</th>
                <th style="width: 65px;">صورة الكتاب</th>
                <th class="text-right">عنوان الكتاب</th>
                <th class="text-right">اسم المؤلف</th>
                <th style="width: 110px;">السعر</th>
                <th style="width: 100px;">الكمية الموجودة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="total-row-last">
                <td colspan="5" style="text-align: right; font-weight: 900; color: #000000; padding-right: 15px;">
                  الإجمالي العام (${totalCount.toLocaleString('en-US')} عنوان)
                </td>
                <td style="text-align: center; font-weight: 900; color: #000000; font-size: 14px;">
                  ${totalQty.toLocaleString('en-US')} نسخة
                </td>
              </tr>
            </tbody>
          </table>

          <div class="footer-info">
            <div>نظام إدارة المكتبة والمبيعات - ${systemName}</div>
            <div>صفحة تقرير رسمي معتمد للمخزون</div>
            <div>تاريخ الاستخراج: ${new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>

          <script>
            const doPrint = () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 500);
            };
            if (document.readyState === 'complete') {
              doPrint();
            } else {
              window.addEventListener('load', doPrint);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // تصدير تقرير الكتب Excel
  const handleExportBooksExcel = async (reportList: Book[] = filteredBooksForReport) => {
    if (!reportList || reportList.length === 0) {
      alert('لا توجد كتب لتصديرها في تقرير Excel');
      return;
    }

    const resolvedCovers = await Promise.all(
      reportList.map(async (book) => {
        return await getBookCoverBase64(book);
      })
    );

    const totalCount = reportList.length;
    const totalQty = reportList.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0);

    const rowsHtml = reportList.map((book, idx) => {
      const price = Number(book.price) || 0;
      const qty = Number(book.quantity) || 0;
      const coverSrc = resolvedCovers[idx];
      const hasImage = coverSrc && typeof coverSrc === 'string' && coverSrc.length > 20;
      const imgHtml = hasImage 
        ? `<img src="${coverSrc}" width="45" height="60" style="border-radius:4px; border:1px solid #cbd5e1; object-fit:cover;" />` 
        : `<span style="color:#94a3b8; font-size:14pt;">📖</span>`;

      return `
        <tr style="height: 65px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; font-weight: bold; color: #64748b; font-size: 10pt;">${idx + 1}</td>
          <td style="text-align: center; vertical-align: middle; border: 1px solid #cbd5e1;">${imgHtml}</td>
          <td style="text-align: right; vertical-align: middle; border: 1px solid #cbd5e1; font-weight: bold; padding: 6px 10px; font-size: 11pt; color: #0f172a;">
            ${book.title || 'بدون عنوان'}
            ${book.category ? `<br/><span style="font-size: 9pt; color: #334155; font-weight: normal;">${book.category}</span>` : ''}
          </td>
          <td style="text-align: right; vertical-align: middle; border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; color: #334155;">${book.author || 'غير محدد'}</td>
          <td style="text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; font-weight: bold; color: #000000; mso-number-format:'0\\.00'; font-size: 11pt;">${price.toFixed(2)}</td>
          <td style="text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; font-weight: bold; color: #000000; mso-number-format:'\\#\\,\\#\\#0'; font-size: 11pt;">${qty}</td>
        </tr>
      `;
    }).join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>تقرير الكتب</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayRightToLeft/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }
            table { border-collapse: collapse; width: 100%; }
            th { background-color: #047857; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #065f46; padding: 10px; font-size: 11pt; }
            td { vertical-align: middle; }
          </style>
        </head>
        <body dir="rtl">
          <table>
            <tr>
              <td colspan="6" style="text-align: center; font-size: 18pt; font-weight: bold; color: #047857; padding: 15px 0;">
                تقرير جرد وحصر الكتب الشامل - ${systemName}
              </td>
            </tr>
            <tr>
              <td colspan="6" style="text-align: center; font-size: 10pt; color: #64748b; padding-bottom: 12px;">
                تاريخ الاستخراج: ${new Date().toISOString().slice(0, 10)} | المستخدم المسؤول: ${currentUser.username} | الترتيب: ${booksReportSort === 'author_asc' ? 'أبجدي حسب المؤلف (أ - ي)' : booksReportSort === 'title_asc' ? 'أبجدي حسب عنوان الكتاب (أ - ي)' : booksReportSort === 'qty_desc' ? 'حسب أعلى كمية' : booksReportSort === 'price_desc' ? 'حسب السعر' : 'حسب تاريخ الإضافة'}
              </td>
            </tr>
            <tr style="background-color: #ecfdf5; height: 35px;">
              <td colspan="3" style="border: 1px solid #a7f3d0; text-align: center; font-weight: bold; color: #065f46; font-size: 11pt;">إجمالي العناوين: ${totalCount}</td>
              <td colspan="3" style="border: 1px solid #a7f3d0; text-align: center; font-weight: bold; color: #065f46; font-size: 11pt;">إجمالي الكميات: ${totalQty} نسخة</td>
            </tr>
            <tr><td colspan="6" style="height: 10px;"></td></tr>
            <thead>
              <tr style="height: 40px;">
                <th style="width: 45px;">#</th>
                <th style="width: 80px;">صورة الكتاب</th>
                <th style="width: 260px;">عنوان الكتاب</th>
                <th style="width: 180px;">اسم المؤلف</th>
                <th style="width: 110px;">السعر (د.ل)</th>
                <th style="width: 110px;">الكمية الموجودة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="height: 40px; background-color: #f1f5f9; font-weight: bold;">
                <td colspan="5" style="text-align: right; border: 1px solid #cbd5e1; padding: 10px; font-weight: bold; color: #000000; font-size: 11pt;">
                  الإجمالي العام (${totalCount} عنوان)
                </td>
                <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: #000000; font-size: 12pt; mso-number-format:'\\#\\,\\#\\#0';">${totalQty}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `تقرير_الكتب_${systemName.replace(/\s+/g, '_')}_${dateStr}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportImages = async () => {
    if (!window.confirm("سيتم تجميع جميع الصور المحفوظة محلياً في ملف واحد للتنزيل. هل تريد المتابعة؟")) return;
    setIsRunningMaintenance(true);
    setRestoreProgress(0);
    
    try {
      const dbRequest = indexedDB.open("AladdinImages", 3);
      
      dbRequest.onsuccess = async (e: any) => {
        const idb = e.target.result;
        
        try {
            if (!idb.objectStoreNames.contains("covers")) {
               throw new Error("مخزن الصور غير موجود");
            }

            const tx = idb.transaction("covers", "readonly");
            const store = tx.objectStore("covers");
            
            const getAllKeysReq = store.getAllKeys();
            const getAllValuesReq = store.getAll();

            const [keys, values] = await Promise.all([
                new Promise<IDBValidKey[]>((resolve, reject) => {
                    getAllKeysReq.onsuccess = () => resolve(getAllKeysReq.result);
                    getAllKeysReq.onerror = () => reject(getAllKeysReq.error);
                }),
                new Promise<any[]>((resolve, reject) => {
                    getAllValuesReq.onsuccess = () => resolve(getAllValuesReq.result);
                    getAllValuesReq.onerror = () => reject(getAllValuesReq.error);
                })
            ]);

            const total = keys.length;
            if (total === 0) {
                alert("لا توجد صور محفوظة للتصدير.");
                setIsRunningMaintenance(false);
                idb.close();
                return;
            }

            const exportData: Record<string, string> = {};
            
            for (let i = 0; i < total; i++) {
                const key = keys[i] as string;
                const blob = values[i];
                
                if (blob instanceof Blob) {
                    try {
                        const base64 = await blobToBase64(blob);
                        exportData[key] = base64;
                    } catch (err) {
                        console.error("Failed to convert blob:", key, err);
                    }
                }
                
                setRestoreProgress(Math.round(((i + 1) / total) * 100));
            }
            
            const dataStr = JSON.stringify(exportData);
            const blobFile = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blobFile);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Aladdin_Images_Backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            alert("تم تصدير ملف الصور بنجاح.");
        } catch (innerError) {
            console.error("Export processing error:", innerError);
            alert("حدث خطأ أثناء معالجة الصور.");
        } finally {
            setIsRunningMaintenance(false);
            setRestoreProgress(0);
            idb.close();
        }
      };
      
      dbRequest.onerror = (e) => {
         console.error("DB Open Error:", e);
         setIsRunningMaintenance(false);
         alert("فشل فتح قاعدة البيانات المحلية.");
      };

    } catch (error) {
      console.error("Export failed", error);
      setIsRunningMaintenance(false);
      alert("حدث خطأ غير متوقع.");
    }
  };

  const handleImportImagesFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData: Record<string, string> = JSON.parse(text);
      const keys = Object.keys(importedData);
      
      const previewItems = keys.map(key => {
        const book = books.find(b => b.id === key);
        return { id: key, title: book ? book.title : `صنف (ID: ${key})` };
      });

      setImportedRawData(importedData);
      setImportImagePreviewItems(previewItems);
      setShowImagePreviewModal(true);
      
      if (imageImportRef.current) imageImportRef.current.value = '';
    } catch (error) {
      alert("الملف غير صالح أو تالف.");
    }
  };

  const executeImageImport = async () => {
    setIsRunningMaintenance(true);
    setRestoreProgress(1);
    setShowImagePreviewModal(false);

    try {
      const keys = Object.keys(importedRawData);
      const total = keys.length;
      
      const updatedBooksList: Book[] = [];
      let count = 0;

      for (let i = 0; i < total; i++) {
        const key = keys[i];
        const base64 = importedRawData[key];
        if (base64) {
          try {
            await saveCoverToIDB(key, base64);
            const bookToUpdate = books.find(b => b.id === key);
            if (bookToUpdate) {
              updatedBooksList.push({ ...bookToUpdate, image: base64 });
            }
            count++;
          } catch (itemErr) {
            console.warn("Failed to process cover for key:", key, itemErr);
          }
        }
        setRestoreProgress(Math.round(((i + 1) / total) * 90));
      }

      if (updatedBooksList.length > 0) {
        if (onBatchUpdateBooks) {
          onBatchUpdateBooks(updatedBooksList);
        } else if (onUpdateBook) {
          for (const b of updatedBooksList) onUpdateBook(b);
        }

        try {
          const cachedBooks = (await CacheService.loadCollection('books')) || books;
          const map = new Map(updatedBooksList.map(b => [b.id, b]));
          const finalCached = cachedBooks.map(b => map.get(b.id) || b);
          await CacheService.saveCollection('books', finalCached);
        } catch (cErr) {
          console.warn("Cache save warning:", cErr);
        }
      }

      setRestoreProgress(100);
      setImportedRawData({});
      alert(`تمت عملية الاستيراد بنجاح! تم حفظ وتحديث ${count} صورة للكتب في قاعدة البيانات والمكتبة.`);
    } catch (error) {
      console.error("Import failed", error);
      alert("حدث خطأ غير متوقع أثناء المعالجة.");
    } finally {
      setIsRunningMaintenance(false);
      setRestoreProgress(0);
    }
  };

  // وظائف حفظ إعدادات السحابة الجديدة
  const saveFbConfig = () => {
    try {
      if (fbText.trim()) JSON.parse(fbText);
      localStorage.setItem('ALADDIN_FIREBASE_CONFIG', fbText);
      alert('تم حفظ إعدادات Firebase بنجاح. سيتم تفعيلها عند إعادة تشغيل التطبيق.');
      setShowFbEditor(false);
    } catch(e) {
      alert('كود Firebase غير صالح (يجب أن يكون JSON).');
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('ALADDIN_GEMINI_KEY', apiText);
    alert('تم حفظ مفتاح Gemini API بنجاح.');
    setShowApiEditor(false);
  };

  const handleExportAllImagesZip = async () => {
    if (isRunningMaintenance) return;
    setIsRunningMaintenance(true);
    setRestoreProgress(1);

    try {
      const zip = new JSZip();
      const folder = zip.folder("صور_الكتب");
      let count = 0;

      // 1. Fetch any blob covers stored in IndexedDB "AladdinImages"
      const idbImages: Record<string, Blob> = {};
      try {
        await new Promise<void>((resolve) => {
          const dbReq = indexedDB.open("AladdinImages", 3);
          dbReq.onsuccess = (ev: any) => {
            const idb = ev.target.result;
            if (!idb.objectStoreNames.contains("covers")) {
              idb.close();
              resolve();
              return;
            }
            const tx = idb.transaction("covers", "readonly");
            const store = tx.objectStore("covers");
            const getAllKeysReq = store.getAllKeys();
            const getAllValsReq = store.getAll();

            tx.oncomplete = () => {
              const keys = getAllKeysReq.result || [];
              const vals = getAllValsReq.result || [];
              for (let i = 0; i < keys.length; i++) {
                if (vals[i] instanceof Blob) {
                  idbImages[String(keys[i])] = vals[i];
                }
              }
              idb.close();
              resolve();
            };
            tx.onerror = () => {
              idb.close();
              resolve();
            };
          };
          dbReq.onerror = () => resolve();
        });
      } catch (e) {
        console.warn("Could not load IndexedDB covers:", e);
      }

      const totalToProcess = books.length;
      let processedIndex = 0;
      const usedFilenamesCount: Record<string, number> = {};

      for (const book of books) {
        processedIndex++;
        setRestoreProgress(Math.min(85, Math.round((processedIndex / Math.max(1, totalToProcess)) * 80)));

        let imgBlob: Blob | null = null;
        let ext = 'jpg';

        if (book.image) {
          if (book.image.startsWith('data:image/png')) ext = 'png';
          else if (book.image.startsWith('data:image/webp')) ext = 'webp';
          else if (book.image.startsWith('data:image/gif')) ext = 'gif';

          if (book.image.startsWith('data:')) {
            const commaIdx = book.image.indexOf(',');
            if (commaIdx !== -1) {
              const base64Data = book.image.slice(commaIdx + 1);
              const targetFolder = folder || zip;
              const cleanTitle = (book.title || 'كتاب').replace(/[\\/:*?"<>|]/g, '_').trim() || 'كتاب';
              
              let fileName = `${cleanTitle}.${ext}`;
              if (usedFilenamesCount[fileName]) {
                usedFilenamesCount[fileName]++;
                fileName = `${cleanTitle} (${usedFilenamesCount[fileName]}).${ext}`;
              } else {
                usedFilenamesCount[fileName] = 1;
              }

              targetFolder.file(fileName, base64Data, { base64: true });
              count++;
              continue;
            }
          } else {
            try {
              const response = await fetch(book.image);
              imgBlob = await response.blob();
            } catch (err) {
              console.warn(`Failed to fetch image for book ${book.title}`, err);
            }
          }
        }

        if (!imgBlob && idbImages[book.id]) {
          imgBlob = idbImages[book.id];
          if (imgBlob.type.includes('png')) ext = 'png';
          else if (imgBlob.type.includes('webp')) ext = 'webp';
        }

        if (imgBlob) {
          const targetFolder = folder || zip;
          const cleanTitle = (book.title || 'كتاب').replace(/[\\/:*?"<>|]/g, '_').trim() || 'كتاب';

          let fileName = `${cleanTitle}.${ext}`;
          if (usedFilenamesCount[fileName]) {
            usedFilenamesCount[fileName]++;
            fileName = `${cleanTitle} (${usedFilenamesCount[fileName]}).${ext}`;
          } else {
            usedFilenamesCount[fileName] = 1;
          }

          targetFolder.file(fileName, imgBlob);
          count++;
        }
      }

      if (count === 0) {
        alert("لا توجد صور مضافة على الكتب حالياً للتصدير.");
        setIsRunningMaintenance(false);
        setRestoreProgress(0);
        return;
      }

      setRestoreProgress(90);
      const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setRestoreProgress(90 + Math.round(metadata.percent * 0.1));
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Aladdin_Book_Covers_${dateStr}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      alert(`تم بنجاح تجميع وتصدير ${count} صورة كتاب في ملف مضغوط (ZIP)!`);
    } catch (error) {
      console.error("ZIP Export failed:", error);
      alert("حدث خطأ أثناء تجميع ملف ZIP للصور.");
    } finally {
      setIsRunningMaintenance(false);
      setRestoreProgress(0);
    }
  };

  const normalizeTitleForMatch = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|jfif)$/i, "")
      // Remove Arabic tashkeel/diacritics
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
      // Normalize alif letters
      .replace(/[أإآٱ]/g, "ا")
      // Normalize taa marbuta
      .replace(/ة/g, "ه")
      // Normalize yaa
      .replace(/[ىي]/g, "ي")
      // Normalize hamzas
      .replace(/[ؤئ]/g, "ء")
      // Remove common prefix tokens from file names
      .replace(/^(غلاف|كتاب|صورة|صوره|cover|book|front)[_\-\s]+/i, "")
      // Remove duplicate indices like (1), _1, - Copy
      .replace(/\(\d+\)/g, "")
      .replace(/_\d+$/g, "")
      .replace(/-\s*copy/i, "")
      // Replace non-alphanumerics with single space
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  };

  const findMatchingBook = (fileName: string): Book | undefined => {
    const normFileName = normalizeTitleForMatch(fileName);
    if (!normFileName) return undefined;
    const nsFileName = normFileName.replace(/\s+/g, '');
    const cleanFileNameOriginal = fileName.toLowerCase().replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|jfif)$/i, "").trim();

    // 1. Exact match by ID or Barcode
    for (const book of books) {
      if (book.barcode && cleanFileNameOriginal === book.barcode.toLowerCase()) return book;
      if (book.id && cleanFileNameOriginal === book.id.toLowerCase()) return book;
    }

    // 2. Exact normalized title match
    for (const book of books) {
      const normBookTitle = normalizeTitleForMatch(book.title);
      if (normBookTitle && normBookTitle === normFileName) return book;
      const nsBook = normBookTitle.replace(/\s+/g, '');
      if (nsBook && nsFileName && nsBook === nsFileName) return book;
    }

    // 3. Barcode or ID substring match
    for (const book of books) {
      if (book.barcode && (fileName.includes(book.barcode) || normFileName.includes(book.barcode))) return book;
      if (book.id && (fileName.includes(book.id) || normFileName.includes(book.id))) return book;
    }

    // 4. Substring inclusion if meaningful length (>= 3 chars)
    for (const book of books) {
      const normBookTitle = normalizeTitleForMatch(book.title);
      if (normBookTitle && normBookTitle.length >= 3) {
        if (normFileName.includes(normBookTitle) || normBookTitle.includes(normFileName)) return book;
        const nsBook = normBookTitle.replace(/\s+/g, '');
        if (nsBook && nsFileName && (nsFileName.includes(nsBook) || nsBook.includes(nsFileName))) return book;
      }
    }

    // 5. Word token overlap match (if at least 70% of words in title match)
    const fileWords = normFileName.split(/\s+/).filter(w => w.length > 1);
    if (fileWords.length > 0) {
      for (const book of books) {
        const normBookTitle = normalizeTitleForMatch(book.title);
        const bookWords = normBookTitle.split(/\s+/).filter(w => w.length > 1);
        if (bookWords.length >= 2) {
          const matchCount = bookWords.filter(bw => fileWords.includes(bw)).length;
          if (matchCount / bookWords.length >= 0.7) {
            return book;
          }
        }
      }
    }

    return undefined;
  };

  const handleImportZipFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRunningMaintenance(true);
    setRestoreProgress(5);

    try {
      const zip = new JSZip();
      const unzipped = await zip.loadAsync(file);
      const zipFiles = Object.values(unzipped.files);
      
      const validImageFiles = zipFiles.filter(f => !f.dir && !f.name.includes('__MACOSX') && /\.(jpg|jpeg|png|webp|gif|bmp|jfif)$/i.test(f.name));

      if (validImageFiles.length === 0) {
        alert("لم يتم العثور على أي صور صالحة داخل ملف ZIP المرفوع.");
        return;
      }

      // Step 1: Scanning and matching files
      const matchedEntries: { book: Book; zFile: JSZip.JSZipObject; fileName: string }[] = [];
      const totalFiles = validImageFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const zFile = validImageFiles[i];
        setRestoreProgress(5 + Math.round(((i + 1) / totalFiles) * 25)); // 5% -> 30%

        const pathParts = zFile.name.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        const matchedBook = findMatchingBook(fileName);
        if (matchedBook) {
          matchedEntries.push({
            book: matchedBook,
            zFile,
            fileName
          });
        }
      }

      if (matchedEntries.length === 0) {
        alert(`تم قراءة ${totalFiles} صورة من الملف المضغوط، ولكن لم تتطابق أي صورة مع أسماء أو باركود الكتب في المكتبة.\n\nيرجى التأكد من أن أسماء ملفات الصور مطابقة لأسماء الكتب أو أرقام الباركود.`);
        return;
      }

      // Step 2: Extracting, compressing and saving covers safely
      const updatedBooksList: Book[] = [];
      const totalMatched = matchedEntries.length;

      for (let i = 0; i < totalMatched; i++) {
        const entry = matchedEntries[i];
        setRestoreProgress(30 + Math.round(((i + 1) / totalMatched) * 55)); // 30% -> 85%

        try {
          const blob = await entry.zFile.async('blob');
          const base64 = await compressAndGetBase64(blob);
          
          // Save cover directly to IndexedDB
          await saveCoverToIDB(entry.book.id, blob);
          
          updatedBooksList.push({
            ...entry.book,
            image: base64
          });
        } catch (itemErr) {
          console.warn(`Failed to process cover for ${entry.book.title}:`, itemErr);
        }
      }

      setRestoreProgress(90);

      // Step 3: Batch update state in React & Cloud / Firestore
      if (updatedBooksList.length > 0) {
        if (onBatchUpdateBooks) {
          onBatchUpdateBooks(updatedBooksList);
        } else if (onUpdateBook) {
          for (const b of updatedBooksList) {
            onUpdateBook(b);
          }
        }

        try {
          const cachedBooks = (await CacheService.loadCollection('books')) || books;
          const map = new Map(updatedBooksList.map(b => [b.id, b]));
          const finalCached = cachedBooks.map(b => map.get(b.id) || b);
          await CacheService.saveCollection('books', finalCached);
        } catch (cacheErr) {
          console.warn("CacheService sync warning:", cacheErr);
        }
      }

      setRestoreProgress(100);
      alert(`تمت عملية الاستيراد بنجاح!\nتم ربط وتحديث ${updatedBooksList.length} صورة غلاف كتاب من أصل ${totalFiles} صورة بالملف المضغوط.`);

    } catch (err) {
      console.error("ZIP import error:", err);
      alert("حدث خطأ أثناء قراءة واستخراج ملف ZIP للصور.");
    } finally {
      setIsRunningMaintenance(false);
      setRestoreProgress(0);
      if (zipImportRef.current) zipImportRef.current.value = '';
    }
  };

  const handleImportFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    setIsRunningMaintenance(true);
    setRestoreProgress(5);

    try {
      const rawFiles = Array.from(filesList).filter(f => /\.(jpg|jpeg|png|webp|gif|bmp|jfif)$/i.test(f.name));
      if (rawFiles.length === 0) {
        alert("لم يتم اختيار أي صور صالحة.");
        return;
      }

      const totalFiles = rawFiles.length;
      const matchedEntries: { book: Book; file: File; fileName: string }[] = [];

      // Step 1: Scanning and matching files
      for (let i = 0; i < totalFiles; i++) {
        const file = rawFiles[i];
        setRestoreProgress(5 + Math.round(((i + 1) / totalFiles) * 25)); // 5% -> 30%

        const matchedBook = findMatchingBook(file.name);
        if (matchedBook) {
          matchedEntries.push({
            book: matchedBook,
            file,
            fileName: file.name
          });
        }
      }

      if (matchedEntries.length === 0) {
        alert(`تم فحص ${totalFiles} صورة، ولكن لم تتطابق أسماؤها مع أسماء أو باركود الكتب في المكتبة.\n\nيرجى التأكد من أن أسماء ملفات الصور مطابقة لأسماء الكتب أو أرقام الباركود.`);
        return;
      }

      // Step 2: Compressing and saving covers
      const updatedBooksList: Book[] = [];
      const totalMatched = matchedEntries.length;

      for (let i = 0; i < totalMatched; i++) {
        const entry = matchedEntries[i];
        setRestoreProgress(30 + Math.round(((i + 1) / totalMatched) * 55)); // 30% -> 85%

        try {
          const base64 = await compressAndGetBase64(entry.file);
          
          // Save cover directly to IndexedDB
          await saveCoverToIDB(entry.book.id, entry.file);
          
          updatedBooksList.push({
            ...entry.book,
            image: base64
          });
        } catch (itemErr) {
          console.warn(`Failed to process cover for ${entry.book.title}:`, itemErr);
        }
      }

      setRestoreProgress(90);

      // Step 3: Batch update state in React & Cloud / Firestore
      if (updatedBooksList.length > 0) {
        if (onBatchUpdateBooks) {
          onBatchUpdateBooks(updatedBooksList);
        } else if (onUpdateBook) {
          for (const b of updatedBooksList) {
            onUpdateBook(b);
          }
        }

        try {
          const cachedBooks = (await CacheService.loadCollection('books')) || books;
          const map = new Map(updatedBooksList.map(b => [b.id, b]));
          const finalCached = cachedBooks.map(b => map.get(b.id) || b);
          await CacheService.saveCollection('books', finalCached);
        } catch (cacheErr) {
          console.warn("CacheService sync warning:", cacheErr);
        }
      }

      setRestoreProgress(100);
      alert(`تمت عملية الاستيراد بنجاح!\nتم ربط وتحديث ${updatedBooksList.length} صورة غلاف كتاب من أصل ${totalFiles} صورة محددة.`);

    } catch (err) {
      console.error("Folder import error:", err);
      alert("حدث خطأ أثناء استيراد مجلد الصور وحفظ البيانات.");
    } finally {
      setIsRunningMaintenance(false);
      setRestoreProgress(0);
      if (folderImportRef.current) folderImportRef.current.value = '';
    }
  };

  const databaseSections = [
    {
      id: 'books_report' as const,
      title: 'تقرير وتصدير الكتب',
      desc: 'كشف وجرد الكتب بصيغة PDF أو Excel بتصميم عصري',
      icon: FileSpreadsheet,
      iconBgDark: 'bg-emerald-500/10 text-emerald-400',
      iconBgLight: 'bg-emerald-50 text-emerald-600',
      badge: 'PDF / Excel',
    },
    {
      id: 'backup' as const,
      title: 'تصدير البيانات وتفريغها',
      desc: 'تصدير جميع بيانات النظام إلى ملف JSON',
      icon: FolderDown,
      iconBgDark: 'bg-teal-500/10 text-teal-400',
      iconBgLight: 'bg-teal-50 text-teal-600',
      badge: 'نسخة احتياطية',
    },
    {
      id: 'restore' as const,
      title: 'استعادة واستيراد السجلات',
      desc: 'تنسيق واستعادة بيانات من ملف سابق',
      icon: FolderUp,
      iconBgDark: 'bg-indigo-500/10 text-indigo-400',
      iconBgLight: 'bg-indigo-50 text-indigo-600',
      badge: 'استرجاع البيانات',
    },
    {
      id: 'images_zip' as const,
      title: 'تصدير صور الكتب (ZIP)',
      desc: 'تحميل جميع صور الأغلفة في ملف مضغوط واحد',
      icon: FileArchive,
      iconBgDark: 'bg-blue-500/10 text-blue-400',
      iconBgLight: 'bg-blue-50 text-blue-600',
      badge: 'أرشيف ZIP',
    },
    {
      id: 'images_json' as const,
      title: 'تصدير واستيراد الصور (JSON)',
      desc: 'حفظ واسترجاع صور المتصفح المحلية',
      icon: ImageIcon,
      iconBgDark: 'bg-amber-500/10 text-amber-400',
      iconBgLight: 'bg-amber-50 text-amber-600',
      badge: 'نسخة الصور',
    },
    {
      id: 'health' as const,
      title: 'صحة النظام والصيانة',
      desc: 'فحص سلامة البيانات وإصلاح الخلل السريع',
      icon: Activity,
      iconBgDark: 'bg-cyan-500/10 text-cyan-400',
      iconBgLight: 'bg-cyan-50 text-cyan-600',
      badge: 'فحص وإصلاح',
    },
    {
      id: 'cloud_ai' as const,
      title: 'الاتصال السحابي والذكاء الاصطناعي',
      desc: 'إعدادات Firebase ومفتاح Gemini API',
      icon: Shield,
      iconBgDark: 'bg-purple-500/10 text-purple-400',
      iconBgLight: 'bg-purple-50 text-purple-600',
      badge: 'سحابي و AI',
    },
    {
      id: 'delete' as const,
      title: 'تصفير وحذف البيانات',
      desc: 'حذف سجلات مخصصة أو تصفير النظام',
      icon: Trash2,
      iconBgDark: 'bg-red-500/10 text-red-400',
      iconBgLight: 'bg-red-50 text-red-600',
      badge: 'منطقة الخطر',
    },
  ];

  const renderContent = () => {
    if (activeView === 'database-tools') {
      return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>أدوات وحفظ قاعدة البيانات</h3>
              <p className="text-xs text-gray-400 font-bold mt-1">نسخ احتياطي، استرجاع البيانات، تقارير الكتب المتقدمة، وصيانة الصور</p>
            </div>
            <button onClick={() => setActiveView('menu')} className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>إغلاق</button>
          </div>

          {/* شبكة أقسام قاعدة البيانات للتنقل السريع */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {databaseSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeDatabaseTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveDatabaseTab(sec.id)}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                    isActive
                      ? (isDarkMode ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-lg' : 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-md')
                      : (isDarkMode ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50')
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isDarkMode ? sec.iconBgDark : sec.iconBgLight}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-black leading-tight line-clamp-2">{sec.title}</span>
                </button>
              );
            })}
          </div>

          {/* نافذة معالجة وإظهار شريط التقدم عند الاستيراد والتصدير */}
          {(isRunningMaintenance && restoreProgress > 0) && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-in zoom-in-95 duration-200">
              <div className={`w-full max-w-sm rounded-[36px] shadow-2xl p-7 border text-center relative overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-emerald-500/30' : 'bg-white border-emerald-100'}`}>
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 animate-pulse" />
                
                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
                  <Loader2 size={32} className="animate-spin text-emerald-500" />
                </div>

                <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                  جاري المعالجة والاستيراد...
                </h4>
                <p className="text-xs font-bold text-gray-400 mt-1 mb-6">
                  يرجى الانتظار لحين الانتهاء ومطابقة بيانات الأغلفة
                </p>

                {/* شريط التقدم والنسبة المئوية */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black px-1">
                    <span className="text-emerald-500">مستوى التقدم</span>
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{restoreProgress}%</span>
                  </div>
                  <div className="h-3.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5 border border-emerald-500/20">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-md" 
                      style={{ width: `${restoreProgress}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* محتوى التبويب النشط أو العرض الشامل */}
          <div className="space-y-6">
            {activeDatabaseTab === 'books_report' && (
              <div className="space-y-6">
                {/* كروت الإحصائيات السريعة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-[24px] border-2 transition-all ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-emerald-100 shadow-sm'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-400">إجمالي عناوين الكتب</span>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><BookOpen size={18} /></div>
                    </div>
                    <div className="mt-3">
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                        {books.length.toLocaleString('en-US')}
                      </span>
                      <span className="text-xs text-gray-400 font-bold mr-1">عنوان مسجل</span>
                    </div>
                  </div>

                  <div className={`p-5 rounded-[24px] border-2 transition-all ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-blue-100 shadow-sm'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-400">إجمالي النسخ المتوفرة</span>
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><Archive size={18} /></div>
                    </div>
                    <div className="mt-3">
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                        {books.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0).toLocaleString('en-US')}
                      </span>
                      <span className="text-xs text-gray-400 font-bold mr-1">نسخة بالمخزن</span>
                    </div>
                  </div>
                </div>

                {/* أزرار التصدير الفائقة الأناقة (PDF و Excel) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* زر تصدير PDF */}
                  <button
                    onClick={() => handleExportBooksPDF(filteredBooksForReport)}
                    className="p-6 rounded-[28px] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between group text-right"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                        <FileText size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg">تصدير تقرير PDF عصري</span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">طباعة وحفظ PDF</span>
                        </div>
                        <p className="text-xs text-emerald-100 font-bold mt-1 leading-relaxed">
                          تقرير مصمم بأناقة عالية، يشمل الأغلفة، التفاصيل، الأسعار، والإجماليات جاهز للطباعة المباشرة.
                        </p>
                      </div>
                    </div>
                    <Printer size={22} className="text-white/70 group-hover:text-white shrink-0 mr-2 transition-colors" />
                  </button>

                  {/* زر تصدير Excel */}
                  <button
                    onClick={() => handleExportBooksExcel(filteredBooksForReport)}
                    className="p-6 rounded-[28px] bg-gradient-to-br from-teal-700 via-emerald-800 to-green-900 text-white shadow-xl shadow-teal-700/20 hover:shadow-teal-700/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between group text-right"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                        <FileSpreadsheet size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg">تصدير تقرير Excel منسق</span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">ملف XLS</span>
                        </div>
                        <p className="text-xs text-emerald-100 font-bold mt-1 leading-relaxed">
                          جدول بيانات إكسيل منسق بالأعمدة والترتيب المطلوب مع دعم الصور وتنسيق العملات والأرقام.
                        </p>
                      </div>
                    </div>
                    <Download size={22} className="text-white/70 group-hover:text-white shrink-0 mr-2 transition-colors" />
                  </button>
                </div>

                {/* شريط البحث وتصفية وترتيب جدول المعاينة */}
                <div className={`p-5 rounded-[28px] border-2 space-y-4 ${isDarkMode ? 'bg-zinc-900/90 border-white/5' : 'bg-white border-emerald-100'}`}>
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="relative w-full lg:w-80">
                      <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={booksReportSearch}
                        onChange={(e) => setBooksReportSearch(e.target.value)}
                        placeholder="بحث بالعنوان، المؤلف، الباركود..."
                        className={`w-full pr-10 pl-4 py-2.5 rounded-xl border text-xs font-bold transition-all outline-none ${
                          isDarkMode 
                            ? 'bg-zinc-800 border-white/10 text-white focus:border-emerald-500' 
                            : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-emerald-500 focus:bg-white'
                        }`}
                      />
                      {booksReportSearch && (
                        <button onClick={() => setBooksReportSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* خيارات تصفية المخزون */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                      {[
                        { key: 'all', label: `الكل (${books.length.toLocaleString('en-US')})` },
                        { key: 'in_stock', label: 'متوفر' },
                        { key: 'low_stock', label: 'منخفض المخزون' },
                        { key: 'out_of_stock', label: 'نفد المخزون' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setBooksReportFilter(tab.key as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                            booksReportFilter === tab.key
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                              : isDarkMode
                              ? 'bg-zinc-800 text-gray-400 hover:text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* شريط اختيار طريقة ترتيب التقرير */}
                  <div className={`p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 border ${
                    isDarkMode ? 'bg-zinc-800/60 border-white/5' : 'bg-emerald-50/50 border-emerald-100/60'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black flex items-center gap-1.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                        <ArrowUpDown size={15} />
                        ترتيب التقرير والتصدير:
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { key: 'author_asc', label: '✍️ أبجدياً حسب المؤلف (أ - ي)', desc: 'ترتيب حسب اسم المؤلف ثم العنوان أبجدياً' },
                        { key: 'title_asc', label: '📖 أبجدياً حسب عنوان الكتاب (أ - ي)', desc: 'ترتيب حسب عنوان الكتاب ثم المؤلف أبجدياً' },
                        { key: 'qty_desc', label: '📦 أعلى كمية', desc: 'الكميات الأكبر أولاً' },
                        { key: 'price_desc', label: '💰 الأعلى سعراً', desc: 'الأسعار الأعلى أولاً' },
                        { key: 'date_desc', label: '🕒 أحدث إضافة', desc: 'الكتب المضافة حديثاً أولاً' },
                      ].map((sortOption) => (
                        <button
                          key={sortOption.key}
                          onClick={() => setBooksReportSort(sortOption.key as any)}
                          title={sortOption.desc}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            booksReportSort === sortOption.key
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/30'
                              : isDarkMode
                              ? 'bg-zinc-800 text-gray-300 hover:text-white hover:bg-zinc-700'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/80 shadow-sm'
                          }`}
                        >
                          {sortOption.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* جدول معاينة السجلات بالترتيب المطلوب بدقة */}
                  <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/5">
                    <table className="w-full text-right text-xs">
                      <thead className={`${isDarkMode ? 'bg-zinc-800/80 text-gray-300' : 'bg-emerald-50 text-emerald-950'} font-black`}>
                        <tr>
                          <th className="p-3.5 text-center w-12">#</th>
                          <th className="p-3.5 text-center w-20">صورة الكتاب</th>
                          <th 
                            onClick={() => setBooksReportSort('title_asc')}
                            className="p-3.5 cursor-pointer hover:text-emerald-600 transition-colors select-none"
                          >
                            <div className="flex items-center gap-1">
                              <span>عنوان الكتاب</span>
                              {booksReportSort === 'title_asc' && <span className="text-emerald-500 font-bold">▲ (أ-ي)</span>}
                            </div>
                          </th>
                          <th 
                            onClick={() => setBooksReportSort('author_asc')}
                            className="p-3.5 cursor-pointer hover:text-emerald-600 transition-colors select-none"
                          >
                            <div className="flex items-center gap-1">
                              <span>اسم المؤلف</span>
                              {booksReportSort === 'author_asc' && <span className="text-emerald-500 font-bold">▲ (أ-ي)</span>}
                            </div>
                          </th>
                          <th 
                            onClick={() => setBooksReportSort('price_desc')}
                            className="p-3.5 text-center w-28 cursor-pointer hover:text-emerald-600 transition-colors select-none"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>السعر</span>
                              {booksReportSort === 'price_desc' && <span className="text-emerald-500 font-bold">▼</span>}
                            </div>
                          </th>
                          <th 
                            onClick={() => setBooksReportSort('qty_desc')}
                            className="p-3.5 text-center w-28 cursor-pointer hover:text-emerald-600 transition-colors select-none"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>الكمية الموجودة</span>
                              {booksReportSort === 'qty_desc' && <span className="text-emerald-500 font-bold">▼</span>}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-bold">
                        {filteredBooksForReport.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400 font-bold">
                              لا توجد كتب مطابقة لخيارات البحث والتصفية
                            </td>
                          </tr>
                        ) : (
                          filteredBooksForReport.slice(0, 40).map((b, idx) => {
                            const price = Number(b.price) || 0;
                            const qty = Number(b.quantity) || 0;
                            return (
                              <tr key={b.id || idx} className={`${isDarkMode ? 'hover:bg-zinc-800/40' : 'hover:bg-emerald-50/30'} transition-colors`}>
                                <td className="p-3 text-center text-gray-400 text-[11px] font-black">{idx + 1}</td>
                                <td className="p-3 text-center">
                                  {b.image && b.image.length > 20 ? (
                                    <div className="relative w-10 h-14 mx-auto flex items-center justify-center">
                                      <img 
                                        src={b.image} 
                                        alt={b.title} 
                                        className="w-10 h-14 object-cover rounded-lg border border-gray-200 dark:border-white/10 mx-auto shadow-sm"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const next = e.currentTarget.nextElementSibling as HTMLElement;
                                          if (next) next.style.display = 'flex';
                                        }}
                                      />
                                      <div 
                                        className="w-10 h-14 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-dashed border-gray-300 dark:border-zinc-700 items-center justify-center text-gray-400 mx-auto text-base"
                                        style={{ display: 'none' }}
                                      >
                                        📖
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-10 h-14 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center text-gray-400 mx-auto text-base">
                                      📖
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <div className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{b.title || 'بدون عنوان'}</div>
                                  {b.category && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                                      {b.category}
                                    </div>
                                  )}
                                </td>
                                <td className={`p-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{b.author || 'غير محدد'}</td>
                                <td className="p-3 text-center">
                                  <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {price.toFixed(2)} د.ل
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {qty.toLocaleString('en-US')} نسخة
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredBooksForReport.length > 40 && (
                    <div className="p-3 text-center text-xs font-bold text-gray-400 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                      يتم عرض أول 40 كتاب في المعاينة الحية. عند تصدير تقرير PDF أو Excel سيتم تصدير كامل القائمة ({filteredBooksForReport.length.toLocaleString('en-US')} كتاب) بالكامل.
                    </div>
                  )}
                </div>
              </div>
            )}

            {(activeDatabaseTab === 'backup' || activeDatabaseTab === 'restore') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button onClick={() => setShowExportModal(true)} className={`w-full flex items-center justify-between p-8 border-2 rounded-[32px] transition-all text-right ${isDarkMode ? 'bg-zinc-900 border-white/5 hover:border-emerald-500/50' : 'bg-white border-gray-100 hover:border-emerald-500'}`}>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl"><FolderDown size={28} /></div>
                    <div>
                      <span className={`block font-black text-base ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>تصدير بيانات النظام (JSON)</span>
                      <span className="text-xs text-gray-400 font-bold mt-1 block">حفظ نسخة احتياطية من جميع السجلات أو سجلات محددة</span>
                    </div>
                  </div>
                  <ChevronLeft size={20} className="text-gray-300 shrink-0"/>
                </button>

                <button onClick={onImport} className={`w-full flex items-center justify-between p-8 border-2 rounded-[32px] transition-all text-right ${isDarkMode ? 'bg-zinc-900 border-white/5 hover:border-indigo-500/50' : 'bg-white border-gray-100 hover:border-indigo-500'}`}>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl"><FolderUp size={28} /></div>
                    <div>
                      <span className={`block font-black text-base ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>استيراد بيانات النظام</span>
                      <span className="text-xs text-gray-400 font-bold mt-1 block">استرجاع البيانات والسجلات من ملف JSON سابق</span>
                    </div>
                  </div>
                  <ChevronLeft size={20} className="text-gray-300 shrink-0"/>
                </button>
              </div>
            )}

            {(activeDatabaseTab === 'images_zip' || activeDatabaseTab === 'images_json') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-[32px] border-2 flex flex-col justify-between gap-4 ${isDarkMode ? 'bg-zinc-900 border-blue-500/20' : 'bg-blue-50/50 border-blue-100'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-3 bg-blue-500 text-white rounded-2xl"><FileArchive size={22} /></div>
                      <div>
                        <h4 className={`font-black text-base ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>أرشيف صور الكتب (تصدير واستيراد ZIP)</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">أرشيف ومطابقة تلقائية</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 font-bold leading-relaxed">تصدير أغلفة الكتب لملف ZIP، أو استيراد ملف ZIP/مجلد صور حيث يتم التعرف تلقائياً على ألقاب الكتب وتحديث أغلفتها فوراً.</p>
                  </div>

                  <input type="file" ref={zipImportRef} onChange={handleImportZipFileSelect} accept=".zip" className="hidden" />
                  <input type="file" ref={folderImportRef} onChange={handleImportFolderSelect} accept="image/*" multiple className="hidden" />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={handleExportAllImagesZip} disabled={isRunningMaintenance} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                      {isRunningMaintenance ? <Loader2 size={16} className="animate-spin"/> : <FileArchive size={16} />} تصدير ZIP
                    </button>
                    <button onClick={() => zipImportRef.current?.click()} disabled={isRunningMaintenance} className={`flex-1 py-3 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-blue-400 border-white/5 hover:bg-zinc-700' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}>
                      <FolderUp size={16} /> استيراد ZIP
                    </button>
                    <button onClick={() => folderImportRef.current?.click()} disabled={isRunningMaintenance} className={`flex-1 py-3 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-emerald-400 border-white/5 hover:bg-zinc-700' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}>
                      <UploadCloud size={16} /> استيراد صور
                    </button>
                  </div>
                </div>

                <div className={`p-6 rounded-[32px] border-2 flex flex-col justify-between gap-4 ${isDarkMode ? 'bg-zinc-900 border-amber-500/20' : 'bg-amber-50/50 border-amber-100'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-3 bg-amber-500 text-white rounded-2xl"><ImageIcon size={22} /></div>
                      <div>
                        <h4 className={`font-black text-base ${isDarkMode ? 'text-amber-400' : 'text-amber-900'}`}>تصدير واستيراد الصور (JSON)</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">ذاكرة المتصفح</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 font-bold leading-relaxed">حفظ واسترجاع الصور المحفوظة محلية في IndexedDB لسهولة النقل بين المتصفحات.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleExportImages} disabled={isRunningMaintenance} className={`flex-1 py-3 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-amber-400 border-white/5 hover:bg-zinc-700' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}>
                      <UploadCloud size={16} /> تصدير JSON
                    </button>
                    <input type="file" ref={imageImportRef} onChange={handleImportImagesFileSelect} accept=".json" className="hidden" />
                    <button onClick={() => imageImportRef.current?.click()} disabled={isRunningMaintenance} className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-black text-xs hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                      <CloudDownload size={16} /> استيراد JSON
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeDatabaseTab === 'health' && (
              <div className={`p-6 rounded-[32px] border-2 border-dashed flex flex-col md:flex-row gap-6 items-center ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'}`}>
                <div className="flex-1">
                  <h4 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-900'}`}>
                    <Activity size={20} /> صحة النظام والصيانة
                  </h4>
                  <p className="text-xs text-gray-400 font-bold mt-1">أدوات فحص سلامة البيانات وإصلاح الخلل السريع للكتب والأسعار والحقول.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={runHealthCheck} disabled={isRunningMaintenance} className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white font-black text-xs hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2">
                    {isRunningMaintenance ? <Loader2 size={16} className="animate-spin"/> : <FileCheck size={16} />} فحص الصحة
                  </button>
                  <button onClick={runRepair} disabled={isRunningMaintenance} className={`px-5 py-2.5 rounded-xl font-black text-xs border transition-all flex items-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-gray-300 border-white/5 hover:text-white' : 'bg-white text-gray-600 border-gray-200 hover:text-emerald-900'}`}>
                    {isRunningMaintenance ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16} />} إصلاح وتحسين
                  </button>
                </div>
              </div>
            )}

            {activeDatabaseTab === 'cloud_ai' && (
              <div className="space-y-6">
                {/* مفتاح تفعيل/تعطيل اتصال الأغلفة بالسحابة */}
                <div className={`p-6 rounded-[32px] border-2 transition-all ${
                  isDarkMode 
                    ? 'bg-zinc-900 border-white/5 shadow-xl' 
                    : 'bg-white border-emerald-100 shadow-sm'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-4 rounded-2xl shrink-0 transition-colors ${
                        cloudCoverSync 
                          ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                          : (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                      }`}>
                        <ImageIcon size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                            اتصال ومزامنة أغلفة الكتب بالسحابة
                          </h4>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                            cloudCoverSync 
                              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                          }`}>
                            {cloudCoverSync ? 'مفعل (سحابي + محلي)' : 'معطل (تخزين محلي فقط)'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-bold mt-1.5 max-w-2xl leading-relaxed">
                          {cloudCoverSync 
                            ? 'يتم رفع صور الكتب للسحابة مع التخزين المحلي. (ملاحظة: إذا تجاوزت الصورة الحد الأقصى للسحابة قد لا تظهر على أجهزة أخرى).'
                            : 'الصور تُحفظ مباشرة وبشكل دائم على القرص الصلب للجهاز (IndexedDB) بدون حدود للحجم، مما يمنع اختفاء أي صورة تم رفعها من جهازك.'}
                        </p>
                      </div>
                    </div>

                    {/* زر التبديل التفاعلي مع أنيميشن سلس ومميز (Toggle Switch) */}
                    <div className="flex items-center gap-3.5 self-end md:self-center shrink-0">
                      <div className="text-left hidden sm:block">
                        <span className={`text-xs font-black block transition-all duration-300 ${
                          cloudCoverSync ? 'text-emerald-500' : 'text-amber-500/90'
                        }`}>
                          {cloudCoverSync ? '⚡ متصل بالسحابة' : '💾 تخزين محلي فقط'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold block">انقر للتبديل الفوري</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !cloudCoverSync;
                          setCloudCoverSync(nextVal);
                          localStorage.setItem('aladdin_cloud_cover_sync', String(nextVal));
                        }}
                        className={`group relative inline-flex h-9 w-20 items-center rounded-full p-1 transition-all duration-500 ease-out hover:scale-105 active:scale-95 focus:outline-none select-none cursor-pointer ${
                          cloudCoverSync 
                            ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20' 
                            : 'bg-zinc-700 hover:bg-zinc-600 shadow-md ring-2 ring-zinc-500/20'
                        }`}
                        title={cloudCoverSync ? "الصور متزامنة مع السحابة - انقر للتحويل للمحلي" : "الصور محفوظة محلياً فقط - انقر للمزامنة السحابية"}
                      >
                        {/* أيقونات الخلفية الداخلية للزر */}
                        <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[11px] font-black pointer-events-none">
                          <span className={`transition-opacity duration-300 ${cloudCoverSync ? 'opacity-100 text-white drop-shadow' : 'opacity-0'}`}>
                            ON
                          </span>
                          <span className={`transition-opacity duration-300 ${!cloudCoverSync ? 'opacity-70 text-gray-300' : 'opacity-0'}`}>
                            OFF
                          </span>
                        </div>

                        {/* رأس المفتاح الدوار والمتحرك بأنيميشن فيزيائي سلس (Switch Thumb) */}
                        <span
                          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:shadow-lg ${
                            cloudCoverSync 
                              ? '-translate-x-11 rotate-[360deg] text-emerald-600' 
                              : 'translate-x-0 rotate-0 text-zinc-600'
                          }`}
                        >
                          {cloudCoverSync ? (
                            <UploadCloud size={15} className="animate-pulse" />
                          ) : (
                            <HardDrive size={14} className="opacity-90" />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-[32px] border-2 border-dashed flex flex-col md:flex-row gap-6 items-center ${isDarkMode ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50 border-purple-100'}`}>
                  <div className="flex-1">
                    <h4 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-900'}`}>
                      <Shield size={20} /> مفاتيح الربط السحابي والذكاء الاصطناعي
                    </h4>
                    <p className="text-xs text-gray-400 font-bold mt-1">تعديل كود Firebase ومفاتيح Gemini API في حال تم تعديلها أو إعدادها لاحقاً.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowFbEditor(true)} className={`px-5 py-2.5 rounded-xl font-black text-xs border transition-all flex items-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-white border-white/5 hover:bg-zinc-700' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}>
                      <Database size={16} /> إعداد Firebase
                    </button>
                    <button onClick={() => setShowApiEditor(true)} className={`px-5 py-2.5 rounded-xl font-black text-xs border transition-all flex items-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-white border-white/5 hover:bg-zinc-700' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}>
                      <Key size={16} /> إعداد مفتاح API
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeDatabaseTab === 'delete' && (
              <div className={`p-8 rounded-[40px] border-2 border-red-500/20 bg-red-500/5 w-full`}>
                <div className="flex items-start gap-5">
                  <Trash2 size={32} className="text-red-600 shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-black text-red-950 dark:text-red-400 text-lg">حذف وتصفير البيانات</h4>
                    <p className="text-xs font-bold text-red-700/70 mb-4 mt-1">يمكنك اختيار حذف سجلات مخصصة (مثل المبيعات أو الكتب فقط) أو تصفير بيانات النظام بالكامل.</p>
                    <button onClick={() => { setIsPermanentDelete(false); setPendingView('database-tools'); setActiveView('sales-auth'); setDangerState('auth'); }} className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg hover:bg-red-700 transition-all">بدء الحذف الانتقائي</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {healthStatus && (
            <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <h5 className="font-black text-sm mb-3">تقرير الفحص:</h5>
              <ul className="space-y-2">
                {healthStatus.map((msg, idx) => (
                  <li key={idx} className={`text-xs font-bold flex items-center gap-2 ${msg.includes('ممتازة') ? 'text-emerald-500' : 'text-amber-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${msg.includes('ممتازة') ? 'bg-emerald-500' : 'bg-amber-500'}`} /> {msg}
                  </li>
                ))}
              </ul>
              <button onClick={() => setHealthStatus(null)} className="mt-4 text-[10px] underline text-gray-400">إغلاق التقرير</button>
            </div>
          )}

          <div className={`text-center py-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className="text-[10px] text-gray-400 font-bold flex items-center justify-center gap-2">
              <HardDrive size={14} /> آخر نسخة احتياطية للبيانات: <span className="text-emerald-500">{lastBackupDate || 'لم يتم النسخ بعد'}</span>
            </p>
          </div>

          {/* نوافذ المحرر الجديدة لـ Firebase و API */}
          {showFbEditor && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className={`w-full max-w-md rounded-[40px] shadow-2xl p-8 border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg"><Database size={24}/></div>
                     <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إعداد Firebase</h3>
                  </div>
                  <textarea 
                    value={fbText}
                    onChange={(e) => setFbText(e.target.value)}
                    placeholder='{"apiKey": "...", ...}'
                    className="w-full h-40 px-4 py-3 rounded-2xl border-2 outline-none font-mono text-xs transition-all bg-black border-white/10 text-emerald-400 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-gray-400 font-bold mt-4 leading-relaxed">ألصق كود JSON الخاص بتهيئة مشروع Firebase هنا.</p>
                  <div className="flex gap-3 mt-6">
                     <button onClick={saveFbConfig} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black shadow-lg">حفظ التغييرات</button>
                     <button onClick={() => setShowFbEditor(false)} className={`px-6 py-3 rounded-xl font-bold ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>إلغاء</button>
                  </div>
               </div>
            </div>
          )}

          {showApiEditor && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className={`w-full max-w-md rounded-[40px] shadow-2xl p-8 border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg"><Key size={24}/></div>
                     <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>مفتاح Gemini API</h3>
                  </div>
                  <input 
                    type="password"
                    value={apiText}
                    onChange={(e) => setApiText(e.target.value)}
                    placeholder="ألصق مفتاح Gemini هنا..."
                    className="w-full px-4 py-4 rounded-2xl border-2 outline-none font-bold text-sm transition-all bg-black border-white/10 text-white focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-gray-400 font-bold mt-4 leading-relaxed">المفتاح مطلوب لتشغيل المساعد الذكي ووظائف تحليل الصور.</p>
                  <div className="flex gap-3 mt-6">
                     <button onClick={saveApiKey} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black shadow-lg">حفظ المفتاح</button>
                     <button onClick={() => setShowApiEditor(false)} className={`px-6 py-3 rounded-xl font-bold ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>إلغاء</button>
                  </div>
               </div>
            </div>
          )}

          {showExportModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className={`w-full max-w-md rounded-[40px] shadow-2xl p-8 border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                  <h3 className={`text-xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تصدير البيانات</h3>
                  <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar p-1">
                     {exportOptions.map((opt) => (
                        <label key={opt.key} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${opt.checked ? 'border-emerald-500 bg-emerald-500/10' : (isDarkMode ? 'border-white/10' : 'border-gray-200')}`}>
                           <input type="checkbox" checked={opt.checked} onChange={() => toggleExportOption(opt.key)} className="w-5 h-5 accent-emerald-500 rounded-lg" />
                           <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{opt.label}</span>
                        </label>
                     ))}
                  </div>
                  <div className="flex gap-3">
                     <button onClick={handleSelectiveExport} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black shadow-lg">تصدير المحدد</button>
                     <button onClick={() => setShowExportModal(false)} className={`px-6 py-3 rounded-xl font-bold ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>إلغاء</button>
                  </div>
               </div>
            </div>
          )}

          {dangerState === 'confirm' && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-red-950/40 backdrop-blur-xl animate-in fade-in duration-300">
              <div className={`${isDarkMode ? 'bg-zinc-950 border-red-500/30' : 'bg-white border-red-200'} w-full max-w-lg rounded-[50px] shadow-2xl p-8 border-2 text-center animate-in zoom-in-95 duration-300`}>
                <div className="relative mb-4"><DangerIcon size={64} className="mx-auto text-red-600" /></div>
                <h3 className="text-2xl font-black text-red-600 mb-2">تحديد البيانات للحذف</h3>
                <p className="text-xs text-gray-400 font-bold mb-6">يرجى تحديد السجلات التي ترغب بحذفها نهائياً.</p>
                
                <div className="grid grid-cols-1 gap-2 mb-8 text-right max-h-60 overflow-y-auto custom-scrollbar p-1">
                   {deleteOptions.map((opt) => (
                      <label key={opt.key} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${opt.checked ? 'border-red-500 bg-red-500/10' : (isDarkMode ? 'border-white/10' : 'border-gray-200')}`}>
                         <input type="checkbox" checked={opt.checked} onChange={() => toggleDeleteOption(opt.key)} className="w-5 h-5 accent-red-500 rounded-lg" />
                         <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{opt.label}</span>
                      </label>
                   ))}
                </div>

                <div className="flex flex-col gap-4">
                  <button onClick={handleSelectiveDelete} disabled={timer > 0} className={`w-full py-4 rounded-3xl font-black text-lg transition-all ${timer > 0 ? `انتظر (${timer})...` : `تأكيد الحذف النهائي`}`}>
                    {timer > 0 ? `انتظر (${timer})...` : `تأكيد الحذف النهائي`}
                  </button>
                  <button onClick={() => { setDangerState('idle'); setIsPermanentDelete(false); }} className={`w-full py-3 rounded-3xl font-black text-sm transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-emerald-950'}`}>إلغاء العملية</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeView === 'password') {
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
          <div className={`p-8 rounded-[40px] border shadow-xl flex flex-col md:flex-row gap-8 items-center ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
             <div className="flex flex-col items-center gap-4">
                <div className="group relative">
                  <div className={`w-32 h-32 rounded-3xl border-4 flex items-center justify-center overflow-hidden transition-all group-hover:border-emerald-500 shadow-xl ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-emerald-50 border-emerald-100'}`}>
                    {userAvatars[currentUser.username] ? (
                      <img src={userAvatars[currentUser.username]} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className={isDarkMode ? 'text-zinc-500' : 'text-emerald-200'} />
                    )}
                    <button 
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ImageIcon size={24} />
                    </button>
                    <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                  </div>
                </div>
                <div className="text-center">
                  <h4 className={`font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>الصورة الشخصية</h4>
                  <p className="text-[10px] text-gray-400 font-bold">تظهر عند تسجيل الدخول وفي القوائم</p>
                </div>
             </div>
             <div className="flex-1 w-full text-right">
                <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تغيير كلمة المرور</h3>
                <p className="text-xs text-gray-400 font-bold mb-6">تأكد من اختيار كلمة مرور قوية وسهلة التذكر.</p>
                <form onSubmit={handlePassSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 mr-1">اسم المستخدم</label>
                    <input 
                      type="text" 
                      value={editUsername} 
                      onChange={(e) => setEditUsername(e.target.value)} 
                      className={`w-full px-4 py-2.5 border-2 border-transparent focus:border-emerald-500 rounded-xl outline-none transition-all font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="block text-[10px] font-black text-gray-400 mr-1">كلمة المرور الحالية</label><input type="password" required value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className={`w-full px-4 py-2.5 border-2 border-transparent focus:border-emerald-500 rounded-xl outline-none transition-all font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50'}`} /></div>
                    <div className="space-y-1"><label className="block text-[10px] font-black text-gray-400 mr-1">كلمة المرور الجديدة</label><input type="password" required value={newPass} onChange={(e) => setNewPass(e.target.value)} className={`w-full px-4 py-2.5 border-2 border-transparent focus:border-emerald-500 rounded-xl outline-none transition-all font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50'}`} /></div>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                    <Save size={18} /> حفظ التغييرات
                  </button>
                </form>
             </div>
          </div>

          <div className={`p-8 rounded-[40px] border shadow-xl ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center gap-3 mb-8 border-b pb-6 ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}>
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-900 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <LockKeyhole size={24} />
              </div>
              <div>
                <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>قفل القوائم</h3>
                <p className="text-[10px] text-gray-400 font-bold">تفعيل حماية كلمة المرور للقوائم المختارة</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {lockablePages.map((page) => {
                const isLocked = lockedPages.includes(page.id);
                return (
                  <button
                    key={page.id}
                    onClick={() => {
                      if (isLocked) {
                        setPendingTogglePage(page.id);
                        setPendingView(null);
                        setActiveView('sales-auth');
                      } else {
                        onToggleLockedPage(page.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                      isLocked 
                        ? (isDarkMode ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-emerald-100 bg-emerald-50 text-emerald-900')
                        : (isDarkMode ? 'border-transparent bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800' : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-colors ${isLocked ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400 dark:bg-zinc-700'}`}>
                        {isLocked ? <LockKeyhole size={18} /> : <UnlockKeyhole size={18} />}
                      </div>
                      <span className="font-bold text-sm">{page.label}</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${isLocked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-600'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isLocked ? 'right-5' : 'right-1'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (activeView === 'sales-auth') {
      return (
        <div className="max-w-md mx-auto animate-in zoom-in-95 duration-300">
          <div className={`p-10 rounded-[40px] border shadow-xl text-center ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}><Shield size={40} /></div>
            <h3 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تأكيد هوية المدير</h3>
            <p className="text-gray-400 text-xs font-bold mb-8">هذا القسم محمي، يرجى إدخال كلمة مرور أي مدير نظام للمتابعة.</p>
            <form onSubmit={handleAuthSubmit} className="space-y-6">
              <input type="password" autoFocus required placeholder="كلمة مرور المدير" value={authPass} onChange={(e) => setAuthPass(e.target.value)} className={`w-full px-6 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold text-center text-lg ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} />
              {authError && <p className="text-red-500 text-[10px] font-black">{authError}</p>}
              <div className="flex gap-4"><button type="button" onClick={() => { setActiveView('menu'); setPendingView(null); setPendingTogglePage(null); }} className={`flex-1 py-4 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-400'}`}>إلغاء</button><button type="submit" className={`flex-1 text-white py-4 rounded-2xl font-black shadow-lg bg-emerald-600 hover:bg-emerald-500`}>تحقق</button></div>
            </form>
          </div>
        </div>
      );
    }

    if (activeView === 'sales') {
      return (
        <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
           <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => hideProfits ? onBack() : setActiveView('menu')} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-100 text-emerald-900 hover:bg-gray-200'}`}><ArrowRight size={20} className="rotate-0" /></button>
                 <div>
                    <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{hideProfits ? 'خزائن البائعين' : 'التقارير المالية (من سجل الفواتير)'}</h3>
                    <p className="text-xs text-gray-400 font-bold">يتم احتساب الرصيد مباشرة من إجمالي الفواتير المسجلة (المبيعات والمرتجعات).</p>
                 </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                 <div className="flex items-center gap-2 bg-zinc-800/5 p-2 rounded-2xl border border-transparent focus-within:border-emerald-500 transition-all">
                    <Calendar size={16} className="text-emerald-600 mr-2" />
                    <input 
                      ref={fromDateRef} 
                      type="date" 
                      value={filterFrom} 
                      onChange={(e) => setFilterFrom(e.target.value)} 
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); toDateRef.current?.focus(); } }}
                      className="bg-transparent border-none outline-none text-xs font-black text-emerald-900 dark:text-emerald-400" 
                    />
                    <span className="text-gray-300 mx-1">إلى</span>
                    <input 
                      ref={toDateRef} 
                      type="date" 
                      value={filterTo} 
                      onChange={(e) => setFilterTo(e.target.value)} 
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); userSelectRef.current?.focus(); } }}
                      className="bg-transparent border-none outline-none text-xs font-black text-emerald-900 dark:text-emerald-400" 
                    />
                 </div>
                 <select 
                    ref={userSelectRef} 
                    value={filterUser} 
                    onChange={(e) => setFilterUser(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); generateBtnRef.current?.focus(); } }}
                    className={`px-4 py-2.5 rounded-2xl border-none outline-none font-black text-xs shadow-sm cursor-pointer transition-all duration-300 ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-gray-50 text-emerald-900'}`}
                 >
                   <option value="all">كافة المستخدمين</option>
                   {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                 </select>
                 <button 
                    ref={generateBtnRef} 
                    onClick={handleGenerateReport} 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateReport(); } }}
                    className={`px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center gap-2 ${isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-900 text-white'}`}
                 >
                   {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}عرض البيانات
                 </button>
              </div>
           </div>
           {showReport && (
             <div className="space-y-8 animate-in fade-in duration-700">
                <div className={`grid grid-cols-1 ${hideProfits ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
                   <div className={`p-8 rounded-[40px] border shadow-sm relative overflow-hidden group ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}><p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">إجمالي المبيعات (صافي الفواتير)</p><h4 className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{totals.revenue.toLocaleString()} <span className="text-sm font-bold opacity-40">د.ل</span></h4><TrendingUp size={80} className="absolute -bottom-4 -left-4 text-emerald-500/5 group-hover:scale-110 transition-transform" /></div>
                   {!hideProfits && (
                     <div className={`p-8 rounded-[40px] border shadow-sm relative overflow-hidden group ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}><p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">صافي الأرباح المحققة</p><h4 className={`text-4xl font-black ${totals.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{totals.profit.toLocaleString()} <span className="text-sm font-bold opacity-40">د.ل</span></h4><div className={`absolute top-8 left-8 p-3 rounded-2xl ${totals.profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{totals.profit >= 0 ? <TrendingUp size={24} /> : <ShieldAlert size={24} />}</div></div>
                   )}
                </div>
                <div className={`rounded-[40px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
                   <div className={`px-10 py-5 border-b flex justify-between items-center ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}><h5 className={`font-black text-sm flex items-center gap-3 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}><Layout size={18} /> {hideProfits ? 'سجل الخزائن (فواتير)' : 'أرشيف المبيعات التفصيلي'}</h5><button onClick={handlePrintReport} className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}><Printer size={16} /> طباعة تقرير</button></div>
                   <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-right border-collapse">
                         <thead><tr className={`border-b text-[10px] uppercase font-black text-gray-400 ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}><th className="px-10 py-5">التاريخ</th><th className="px-10 py-5 text-center">المسؤول</th><th className="px-10 py-5 text-center">إجمالي الفواتير</th>{!hideProfits && <th className="px-10 py-5 text-center">صافي الربح</th>}</tr></thead>
                         <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>{aggregatedDailyData.slice(0, visibleCount).map((day, idx) => (<tr key={idx} className={`transition-colors duration-300 animate-in fade-in slide-in-from-right-2 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}><td className={`px-10 py-6 font-black text-sm ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`}>{new Date(day.date).toLocaleDateString('ar-EG')}</td><td className="px-10 py-6 text-center"><span className={`px-4 py-1 rounded-xl text-[10px] font-black border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{day.userLabel}</span></td><td className={`px-10 py-6 text-center font-black ${isDarkMode ? 'text-white' : ''}`}>{day.revenue.toLocaleString()} د.ل</td>{!hideProfits && <td className={`px-10 py-6 text-center font-black ${day.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{day.profit.toLocaleString()} د.ل</td>}</tr>))}</tbody>
                      </table>
                   </div>
                </div>
             </div>
           )}
        </div>
      );
    }

    if (activeView === 'user-management') {
      return (
        <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
           <div className="flex items-center gap-4"><button onClick={() => setActiveView('menu')} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-100 text-emerald-900 hover:bg-gray-200'}`}><ArrowRight size={20} /></button><div><h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إدارة حسابات النظام</h3><p className="text-xs text-gray-400 font-bold">التحكم في صلاحيات الوصول وإضافة مستخدمين جدد.</p></div></div>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className={`lg:col-span-1 p-8 rounded-[40px] border shadow-xl ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}><h4 className={`text-lg font-black mb-6 flex items-center gap-3 border-b pb-4 ${isDarkMode ? 'text-emerald-400 border-white/5' : 'text-emerald-900 border-gray-50'}`}><UserPlus size={22} /> إنشاء حساب جديد</h4><form onSubmit={handleCreateUser} className="space-y-5">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center overflow-hidden cursor-pointer group relative shadow-md ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-emerald-50 border-emerald-100'}`} onClick={() => avatarInputRef.current?.click()}>
                    {newUser.avatar ? (
                      <img src={newUser.avatar} alt="New User Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-emerald-500 transition-colors">
                        <ImageIcon size={24} />
                        <span className="text-[8px] font-black mt-1">إضافة صورة</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImageIcon size={18} />
                    </div>
                  </div>
                  <input type="file" ref={avatarInputRef} onChange={handleNewUserAvatarChange} accept="image/*" className="hidden" />
                </div>
                <div className="space-y-2"><label className="block text-xs font-black text-gray-400 mr-1">اسم المستخدم</label><input required type="text" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} /></div><div className="space-y-2"><label className="block text-xs font-black text-gray-400 mr-1">كلمة المرور</label><input required type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} /></div><div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50"><input type="checkbox" checked={newUser.isManager} onChange={(e) => setNewUser({...newUser, isManager: e.target.checked})} className="w-5 h-5 accent-emerald-500 rounded" /><label className="text-xs font-black text-emerald-700 dark:text-emerald-400">صلاحيات مدير نظام</label></div><button type="submit" className={`w-full text-white py-4 rounded-2xl font-black text-sm shadow-lg transition-all bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30`}>إنشاء الحساب الآن</button></form></div>
              <div className={`lg:col-span-2 rounded-[40px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}><div className={`px-10 py-5 border-b font-black text-sm ${isDarkMode ? 'bg-black/20 border-white/5 text-emerald-400' : 'bg-gray-50 border-gray-100 text-emerald-900'}`}>قائمة الحسابات النشطة ({users.length})</div><div className="overflow-x-auto"><table className="w-full text-right border-collapse"><thead><tr className={`text-[10px] uppercase font-black text-gray-400 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}><th className="px-10 py-5">المستخدم</th><th className="px-10 py-5 text-center">رتبة</th><th className="px-10 py-5 text-center">الإجراءات</th></tr></thead><tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>{users.map(u => (<tr key={u.username} className={`transition-all ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}><td className="px-10 py-6"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-black ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>{userAvatars[u.username] ? <img src={userAvatars[u.username]} className="w-full h-full object-cover" /> : u.username[0].toUpperCase()}</div><span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{u.username}</span></div></td><td className="px-10 py-6 text-center"><button onClick={() => onToggleManager(u.username)} disabled={u.username === currentUser.username} className={`px-4 py-1.5 rounded-xl text-[10px] font-black border transition-all ${u.isManager ? (isDarkMode ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-emerald-900 border-emerald-900 text-white') : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-500 hover:text-emerald-400' : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-emerald-900')}`}>{u.isManager ? 'مدير' : 'موظف'}</button></td><td className="px-10 py-6"><div className="flex justify-center gap-3"><button onClick={() => onDeleteUser(u.username)} disabled={u.username === currentUser.username || users.length === 1} className={`p-2 rounded-xl transition-all shadow-sm ${u.username === currentUser.username || users.length === 1 ? 'opacity-20 cursor-not-allowed grayscale' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'}`}><Trash2 size={16} /></button></div></td></tr>))}</tbody></table></div></div>
           </div>
        </div>
      );
    }

    if (activeView === 'customization') {
      const customizationSections = [
        {
          id: 'identity' as const,
          title: 'هوية المنظومة',
          desc: 'اسم النظام وتخصيص العنوان',
          icon: Edit3,
          iconBgDark: 'bg-amber-500/10 text-amber-400',
          iconBgLight: 'bg-amber-50 text-amber-600',
          badge: systemName,
        },
        {
          id: 'zoom' as const,
          title: 'حجم واجهة النظام',
          desc: 'دقة الشاشة ونسبة الزوم',
          icon: ZoomIn,
          iconBgDark: 'bg-blue-500/10 text-blue-400',
          iconBgLight: 'bg-blue-50 text-blue-600',
          badge: `${Math.round(zoomLevel * 100)}%`,
        },
        {
          id: 'colors' as const,
          title: 'ألوان الواجهة',
          desc: 'اللون التمييزي للمشروع',
          icon: Palette,
          iconBgDark: 'bg-indigo-500/10 text-indigo-400',
          iconBgLight: 'bg-indigo-50 text-indigo-600',
          badge: colorOptions.find(c => c.id === accentColor)?.label || 'افتراضي',
        },
        {
          id: 'book_cover' as const,
          title: 'غلاف الكتاب في التفاصيل',
          desc: 'شكل الحواف وحجم الغلاف',
          icon: BookOpen,
          iconBgDark: 'bg-emerald-500/10 text-emerald-400',
          iconBgLight: 'bg-emerald-50 text-emerald-600',
          badge: coverCornerStyle === 'soft' ? 'حواف ناعمة' : 'حواف حادة',
        },
        {
          id: 'splash' as const,
          title: 'شاشة البداية',
          desc: 'الشاشة الترحيبية عند الفتح',
          icon: Play,
          iconBgDark: 'bg-purple-500/10 text-purple-400',
          iconBgLight: 'bg-purple-50 text-purple-600',
          badge: isSplashEnabled ? 'مفعلة' : 'معطلة',
        },
        {
          id: 'auto_login' as const,
          title: 'الدخول الفوري للحساب',
          desc: 'تسجيل الدخول التلقائي المستمر',
          icon: UnlockKeyhole,
          iconBgDark: 'bg-cyan-500/10 text-cyan-400',
          iconBgLight: 'bg-cyan-50 text-cyan-600',
          badge: isAutoLoginEnabled ? 'مفعل' : 'معطل',
        },
        {
          id: 'printer' as const,
          title: 'إعدادات الطابعة والطباعة المباشرة',
          desc: 'اختيار الطابعة الافتراضية، مقاس الورق، والطباعة الصامتة (Electron)',
          icon: Printer,
          iconBgDark: 'bg-emerald-500/10 text-emerald-400',
          iconBgLight: 'bg-emerald-50 text-emerald-600',
          badge: `${printPaperSize} | ${printerName ? printerName.split(' ')[0] : 'الافتراضية'}`,
        },
        {
          id: 'library' as const,
          title: 'تخصيص المكتبة (التصنيف التلقائي)',
          desc: 'إعدادات التصنيف التلقائي والذكي للكتب بالذكاء الاصطناعي',
          icon: Sparkles,
          iconBgDark: 'bg-amber-500/10 text-amber-400',
          iconBgLight: 'bg-amber-50 text-amber-600',
          badge: 'تلقائي / ذكي ✨',
        },
      ];

      return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in zoom-in-95 duration-300" dir="rtl">
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <Layout size={26} />
              </div>
              <div>
                <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تخصيص النظام</h3>
                <p className="text-xs text-gray-400 font-bold">إدارة مظهر وإعدادات واجهة المنظومة بنفس طريقة iPad Split View</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveView('menu')} 
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>إغلاق</span>
              <X size={16} />
            </button>
          </div>

          {/* iPad Master-Detail Split View Container */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Right Side: Sidebar / Master View (القائمة الجانبية) */}
            <div className={`w-full md:w-80 shrink-0 p-4 rounded-[32px] border shadow-xl ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
              <div className="px-3 py-2 mb-2 flex items-center justify-between">
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">أقسام التخصيص</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                  {customizationSections.length} أقسام
                </span>
              </div>
              <div className="space-y-2">
                {customizationSections.map((sec) => {
                  const IconComponent = sec.icon;
                  const isActive = activeCustomizationTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveCustomizationTab(sec.id)}
                      className={`w-full p-3.5 rounded-2xl text-right transition-all flex items-center justify-between gap-3 group relative border ${
                        isActive
                          ? (isDarkMode 
                              ? 'bg-emerald-600/15 border-emerald-500/40 text-white shadow-md' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-sm')
                          : (isDarkMode 
                              ? 'border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-white' 
                              : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-emerald-900')
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-105 shrink-0 ${
                          isActive 
                            ? (isDarkMode ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white') 
                            : (isDarkMode ? sec.iconBgDark : sec.iconBgLight)
                        }`}>
                          <IconComponent size={20} />
                        </div>
                        <div className="text-right min-w-0">
                          <div className={`text-xs font-black leading-tight ${
                            isActive ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-900') : ''
                          }`}>
                            {sec.title}
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 mt-0.5 truncate">
                            {sec.desc}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {sec.badge && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg truncate max-w-[80px] ${
                            isActive
                              ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                              : (isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500')
                          }`}>
                            {sec.badge}
                          </span>
                        )}
                        <ChevronLeft size={16} className={`transition-transform ${
                          isActive 
                            ? 'text-emerald-500 translate-x-[-2px]' 
                            : 'text-gray-300 dark:text-zinc-600 group-hover:translate-x-[-2px]'
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Left Side: Detail View (شاشة التفاصيل) */}
            <div className={`flex-1 w-full p-8 rounded-[32px] border shadow-xl min-h-[460px] flex flex-col justify-between ${
              isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'
            }`}>
              {/* 1. Identity */}
              {activeCustomizationTab === 'identity' && (
                <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                      <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        <Edit3 size={24} />
                      </div>
                      <div>
                        <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>هوية المنظومة</h4>
                        <p className="text-xs font-bold text-gray-400">تعديل اسم النظام ليظهر في الشريط العلوي وشاشة الترحيب والتقارير</p>
                      </div>
                    </div>

                    <div className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 mr-1">اسم النظام الحالي</label>
                        <input 
                          type="text" 
                          value={tempSystemName} 
                          onChange={(e) => setTempSystemName(e.target.value)} 
                          className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold text-sm ${
                            isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'
                          }`} 
                          placeholder="أدخل اسم المنظومة..."
                        />
                      </div>
                      
                      <div className={`p-4 rounded-2xl border text-xs font-bold leading-relaxed ${
                        isDarkMode ? 'bg-zinc-800/50 border-white/5 text-zinc-300' : 'bg-amber-50/50 border-amber-100 text-amber-900'
                      }`}>
                        💡 ملاحظة: تغيير الاسم يظهر فوراً في كافة شاشات وأروقة المكتبة وفي التقارير المطبوعة.
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex justify-end">
                    <button 
                      onClick={saveSystemName} 
                      disabled={tempSystemName === systemName} 
                      className={`px-8 py-3.5 rounded-2xl font-black text-sm text-white shadow-lg transition-all disabled:opacity-30 ${
                        isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-800 shadow-emerald-500/20'
                      }`}
                    >
                      حفظ التغييرات
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Zoom */}
              {activeCustomizationTab === 'zoom' && (
                <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                      <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <ZoomIn size={24} />
                      </div>
                      <div>
                        <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>حجم واجهة النظام</h4>
                        <p className="text-xs font-bold text-gray-400">تعديل مقاسات الأزرار والبطاقات للتناسب مع حجم شاشتك</p>
                      </div>
                    </div>

                    <div className="space-y-6 max-w-xl">
                      <button 
                        onClick={() => onUpdateZoomLevel(zoomLevel === 1 ? 0.75 : 1)}
                        className={`w-full py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all shadow-md border ${
                          zoomLevel !== 1 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-blue-600/30 hover:bg-blue-500' 
                          : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200')
                        }`}
                      >
                        <Monitor size={18} />
                        <span>{zoomLevel === 1 ? 'تفعيل وضع الشاشات الصغيرة (1366px)' : 'العودة للوضع القياسي (Full HD)'}</span>
                      </button>

                      <div className="space-y-3">
                        <label className="block text-xs font-black text-gray-400 mr-1">تخصيص يدوي دقيق (Zoom)</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {[1.0, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50].map((val) => (
                            <button 
                              key={val} 
                              onClick={() => onUpdateZoomLevel(val)} 
                              className={`py-3 rounded-2xl text-xs font-black transition-all border ${
                                zoomLevel === val 
                                  ? (isDarkMode ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-emerald-900 border-emerald-900 text-white shadow-emerald-900/30') 
                                  : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                              }`}
                            >
                              {Math.round(val * 100)}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>النسبة المطبقة حالياً: <strong className="text-emerald-500">{Math.round(zoomLevel * 100)}%</strong></span>
                  </div>
                </div>
              )}

              {/* 3. Colors */}
              {activeCustomizationTab === 'colors' && (
                <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                      <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Palette size={24} />
                      </div>
                      <div>
                        <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>ألوان الواجهة</h4>
                        <p className="text-xs font-bold text-gray-400">اختر الثيم واللون التمييزي المفضل للواجهة والأزرار</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto custom-scrollbar p-1">
                      {colorOptions.map(option => (
                        <button 
                          key={option.id} 
                          onClick={() => onUpdateAccentColor(option.id)} 
                          style={accentColor === option.id ? { 
                            borderColor: option.hex, 
                            backgroundColor: isDarkMode ? `${option.hex}33` : `${option.hex}11`
                          } : {}}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group ${
                            accentColor !== option.id 
                              ? (isDarkMode ? 'border-transparent bg-zinc-800 hover:bg-zinc-700' : 'border-transparent bg-gray-50 hover:bg-gray-100') 
                              : ''
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full shadow-md group-hover:scale-110 transition-transform flex items-center justify-center" style={{ backgroundColor: option.hex }}>
                            {accentColor === option.id && <Check size={18} className="text-white drop-shadow" />}
                          </div>
                          <span 
                            className={`text-xs font-black text-center leading-tight ${
                              accentColor === option.id ? '' : (isDarkMode ? 'text-zinc-400' : 'text-zinc-600')
                            }`}
                            style={accentColor === option.id ? { color: option.hex } : {}}
                          >
                            {option.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>اللون المحدد: <strong style={{ color: colorOptions.find(c => c.id === accentColor)?.hex }}>{colorOptions.find(c => c.id === accentColor)?.label}</strong></span>
                  </div>
                </div>
              )}

              {/* 4. Book Cover */}
              {activeCustomizationTab === 'book_cover' && (
                <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                      <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>غلاف الكتاب في التفاصيل</h4>
                        <p className="text-xs font-bold text-gray-400">التحكم في زوايا وحجم الغلاف داخل نافذة عرض تفاصيل الكتاب</p>
                      </div>
                    </div>

                    <div className="space-y-8 max-w-lg">
                      {/* 1. Corner style */}
                      <div className="space-y-3">
                        <label className="block text-xs font-black text-gray-400 mr-1">حواف غلاف الكتاب</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => handleUpdateCoverCornerStyle('soft')}
                            className={`py-4 rounded-2xl text-xs font-black transition-all border flex items-center justify-center gap-2 ${
                              coverCornerStyle === 'soft' 
                                ? (isDarkMode ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-emerald-900 border-emerald-900 text-white shadow-md')
                                : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                            }`}
                          >
                            <div className="w-4 h-4 rounded-md border-2 border-current"></div>
                            <span>حواف ناعمة (مستديرة)</span>
                          </button>
                          <button 
                            onClick={() => handleUpdateCoverCornerStyle('sharp')}
                            className={`py-4 rounded-2xl text-xs font-black transition-all border flex items-center justify-center gap-2 ${
                              coverCornerStyle === 'sharp' 
                                ? (isDarkMode ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-emerald-900 border-emerald-900 text-white shadow-md')
                                : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                            }`}
                          >
                            <div className="w-4 h-4 rounded-none border-2 border-current"></div>
                            <span>حواف حادة (مربعة)</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Slider */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-black text-gray-400 mr-1">حجم صورة الغلاف</label>
                          <span className={`text-xs font-black px-3 py-1 rounded-xl ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                            {coverImageSize}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <input 
                            type="range" 
                            min="60" 
                            max="140" 
                            step="5" 
                            value={coverImageSize} 
                            onChange={(e) => handleUpdateCoverImageSize(Number(e.target.value))}
                            className="w-full accent-emerald-600 cursor-pointer h-2.5 bg-gray-200 rounded-lg appearance-none dark:bg-zinc-700"
                          />
                          <div className="flex justify-between items-center text-xs font-black text-gray-400 px-1">
                            <span>صغير جداً (60%)</span>
                            <span>افتراضي (100%)</span>
                            <span>كبير جداً (140%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>يتم تطبيق التغيير فوراً عند فتح نافذة التفاصيل</span>
                  </div>
                </div>
              )}

              {/* 5. Splash */}
              {activeCustomizationTab === 'splash' && (
                <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                      <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                        <Play size={24} />
                      </div>
                      <div>
                        <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>شاشة البداية</h4>
                        <p className="text-xs font-bold text-gray-400">التحكم في ظهور واجهة الترحيب وشعار المكتبة عند الدخول</p>
                      </div>
                    </div>

                    <div className="space-y-6 max-w-md">
                      <div className={`p-6 rounded-3xl border flex items-center justify-between gap-4 ${
                        isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <div>
                          <h5 className={`font-black text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>عرض الشاشة الترحيبية</h5>
                          <p className="text-xs font-bold text-gray-400">تفعيل حركة الرسوم والشعار عند تشغيل المنظومة</p>
                        </div>

                        <button 
                          onClick={toggleSplash}
                          className={`px-6 py-3 rounded-2xl font-black text-xs shadow-lg transition-all shrink-0 ${
                            isSplashEnabled 
                              ? 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500' 
                              : (isDarkMode ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')
                          }`}
                        >
                          {isSplashEnabled ? 'مفعلة (ON)' : 'معطلة (OFF)'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>الحالة الحالية: <strong className={isSplashEnabled ? 'text-emerald-500' : 'text-gray-400'}>{isSplashEnabled ? 'مفعلة' : 'معطلة'}</strong></span>
                  </div>
                </div>
              )}

              {/* 6. Auto Login */}
              {activeCustomizationTab === 'auto_login' && (
                <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                      <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                        <UnlockKeyhole size={24} />
                      </div>
                      <div>
                        <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>الدخول الفوري للحساب</h4>
                        <p className="text-xs font-bold text-gray-400">الدخول المباشر إلى المنظومة دون الحاجة للوقوف عند شاشة تسجيل الدخول</p>
                      </div>
                    </div>

                    <div className="space-y-6 max-w-md">
                      <div className={`p-6 rounded-3xl border space-y-4 ${
                        isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>التسجيل التلقائي</h5>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">لحساب: <strong className="text-emerald-500">{currentUser.username}</strong></p>
                          </div>
                          <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                            isAutoLoginEnabled 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'
                          }`}>
                            {isAutoLoginEnabled ? 'نشط حالياً' : 'غير نشط'}
                          </span>
                        </div>

                        <button 
                          onClick={() => {
                            if (isAutoLoginEnabled) {
                              localStorage.setItem('aladdin_auto_login_disabled', 'true');
                              localStorage.removeItem('aladdin_auto_login_username');
                              localStorage.removeItem('aladdin_auto_login_password');
                              setIsAutoLoginEnabled(false);
                              alert('تم تعطيل الدخول الفوري للحساب بنجاح.');
                            } else {
                              setAutoLoginPassInput('');
                              setAutoLoginError('');
                              setShowAutoLoginModal(true);
                            }
                          }}
                          className={`w-full py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all ${
                            isAutoLoginEnabled 
                              ? 'bg-red-600 text-white shadow-red-500/20 hover:bg-red-500' 
                              : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500'
                          }`}
                        >
                          {isAutoLoginEnabled ? 'تعطيل الدخول الفوري' : 'تفعيل الدخول الفوري الآن'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>يوفر وصولاً سريعاً على الأجهزة الشخصية الموثوقة</span>
                  </div>
                </div>
              )}

              {/* 7. Printer Settings */}
              {activeCustomizationTab === 'printer' && (
                <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                      <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        <Printer size={24} />
                      </div>
                      <div>
                        <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إعدادات الطابعة والطباعة المباشرة</h4>
                        <p className="text-xs font-bold text-gray-400">تخصيص ماكينات الطباعة الافتراضية، أبعاد الورق، والطباعة الصامتة لتسجيل الفواتير فوراً</p>
                      </div>
                    </div>

                    <div className="space-y-6 max-w-2xl max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                      {/* Printer Name & Action buttons */}
                      <div className="space-y-3">
                        <label className="block text-xs font-black text-gray-400 mr-1">طابعة الفواتير والتقارير الافتراضية</label>
                        <div className="flex flex-col gap-3">
                          <input 
                            type="text" 
                            value={printerName} 
                            readOnly={true}
                            className={`w-full px-5 py-3.5 border-2 border-transparent rounded-2xl outline-none font-bold text-sm cursor-not-allowed select-none ${
                              isDarkMode ? 'bg-zinc-800/80 text-white/90' : 'bg-gray-100 text-emerald-950'
                            }`} 
                            placeholder="اسم الطابعة المحددة (مثال: Konica Minolta C224e)"
                          />
                          
                          {/* Two separate buttons */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button 
                              onClick={() => {
                                window.print();
                              }}
                              className="px-5 py-3.5 rounded-2xl font-black text-xs bg-emerald-600 text-white hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-emerald-600/20 active:scale-95"
                              title="اختيار الطابعة الافتراضية في النظام"
                            >
                              <Printer size={16} />
                              <span>زر اختيار الطابعة الافتراضية</span>
                            </button>

                            <button 
                              onClick={() => {
                                window.print();
                              }}
                              className={`px-5 py-3.5 rounded-2xl font-black text-xs border transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 ${
                                isDarkMode 
                                  ? 'bg-zinc-800 border-emerald-500/30 text-emerald-400 hover:bg-zinc-700' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              }`}
                              title="تعديل تفضيلات وخصائص ماكينة الطباعة"
                            >
                              <Settings size={16} />
                              <span>زر تفضيلات وإعدادات الطابعة</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-gray-400">
                          مربع اسم الطابعة للعرض فقط ولا يمكن تعديله أو حذفه يدوياً. استخدم زر اختيار الطابعة للتغيير.
                        </p>
                      </div>

                      {/* Paper Size */}
                      <div className="space-y-3">
                        <label className="block text-xs font-black text-gray-400 mr-1">حجم الورق الافتراضي للطباعة</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { id: 'A4', label: 'ورق A4 القياسي', desc: 'ماكينات كونيكا / ملون' },
                            { id: 'A5', label: 'ورق A5 صغير', desc: 'نصف صفحة ملون' },
                            { id: '80mm', label: 'إيصال حراري (80mm)', desc: 'طابعات الفواتير السريعة' },
                            { id: 'A3', label: 'ورق A3 كبير', desc: 'المخططات والكشوفات' },
                          ].map((paper) => (
                            <button
                              key={paper.id}
                              onClick={() => handleUpdatePaperSize(paper.id as any)}
                              className={`p-3.5 rounded-2xl text-right transition-all border flex flex-col justify-between gap-2 ${
                                printPaperSize === paper.id
                                  ? (isDarkMode ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-lg' : 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm')
                                  : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs">{paper.id}</span>
                                {printPaperSize === paper.id && <Check size={14} className="text-emerald-500" />}
                              </div>
                              <div>
                                <div className="font-black text-xs">{paper.label}</div>
                                <div className="text-[10px] opacity-70 font-bold">{paper.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Mode & Margins */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-gray-400 mr-1">نمط الألوان (Color Mode)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleUpdateColorMode('color')}
                              className={`py-3 rounded-2xl text-xs font-black border transition-all ${
                                printColorMode === 'color'
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                                  : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-400' : 'bg-gray-50 border-gray-200 text-gray-600')
                              }`}
                            >
                              طباعة ملونة (Color)
                            </button>
                            <button
                              onClick={() => handleUpdateColorMode('monochrome')}
                              className={`py-3 rounded-2xl text-xs font-black border transition-all ${
                                printColorMode === 'monochrome'
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                                  : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-400' : 'bg-gray-50 border-gray-200 text-gray-600')
                              }`}
                            >
                              أبيض وأسود (B&W)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-black text-gray-400 mr-1">هوامش الصفحة (Margins)</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'none', label: 'بدون (0)' },
                              { id: 'minimal', label: 'دقيقة (Minimal)' },
                              { id: 'default', label: 'افتراضي' },
                            ].map((m) => (
                              <button
                                key={m.id}
                                onClick={() => handleUpdateMarginMode(m.id as any)}
                                className={`py-3 rounded-2xl text-[11px] font-black border transition-all ${
                                  printMarginMode === m.id
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                                    : (isDarkMode ? 'bg-zinc-800 border-white/5 text-zinc-400' : 'bg-gray-50 border-gray-200 text-gray-600')
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Silent Printing & Auto-Open Options */}
                      <div className={`p-5 rounded-3xl border space-y-4 ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h5 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>وضع الطباعة الصامتة المباشرة (Silent Print)</h5>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">إرسال الفواتير للطابعة صامتاً بدون إظهار نوافذ المعاينة (مفعّل في تطبيق Electron لسطح المكتب)</p>
                          </div>
                          <button
                            onClick={() => handleUpdateSilentMode(!printSilentMode)}
                            className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all shrink-0 ${
                              printSilentMode
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                : (isDarkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-gray-200 text-gray-600')
                            }`}
                          >
                            {printSilentMode ? 'مفعل (Silent ON)' : 'معطل (OFF)'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-gray-200 dark:border-white/5 pt-3">
                          <div>
                            <h5 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تشغيل أمر الطباعة تلقائياً عند تسجيل الفاتورة</h5>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">بدء الطباعة فور الحفظ تلقائياً دون إهدار وقت الزبون</p>
                          </div>
                          <button
                            onClick={() => handleUpdateAutoOpen(!printAutoOpenDialog)}
                            className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all shrink-0 ${
                              printAutoOpenDialog
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                : (isDarkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-gray-200 text-gray-600')
                            }`}
                          >
                            {printAutoOpenDialog ? 'مفعل (تلقائي)' : 'معطل'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>تُحفظ الإعدادات تلقائياً وتطبق فوراً عند طباعة الفواتير والتقارير</span>
                  </div>
                </div>
              )}

              {activeCustomizationTab === 'library' && (
                <div className="animate-in fade-in duration-300">
                  <LibraryCustomization
                    books={books}
                    categories={categories}
                    subCategories={subCategories}
                    onBack={() => setActiveCustomizationTab('identity')}
                    onAddCategory={onAddCategory}
                    onAddSubCategory={onAddSubCategory}
                    onUpdateBook={onUpdateBook}
                    onBatchUpdateBooks={onBatchUpdateBooks}
                    isDarkMode={isDarkMode}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeView === 'library-customization') {
      return (
        <div className="animate-in zoom-in-95 duration-300 max-w-6xl mx-auto" dir="rtl">
          <LibraryCustomization
            books={books}
            categories={categories}
            subCategories={subCategories}
            onBack={() => setActiveView('menu')}
            onAddCategory={onAddCategory}
            onAddSubCategory={onAddSubCategory}
            onDeleteCategory={onDeleteCategory}
            onDeleteSubCategory={onDeleteSubCategory}
            onUpdateCategory={onUpdateCategory}
            onUpdateBook={onUpdateBook}
            onBatchUpdateBooks={onBatchUpdateBooks}
            isDarkMode={isDarkMode}
          />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 max-w-6xl mx-auto px-4">
        <button onClick={() => setActiveView('password')} className={`group p-8 rounded-[40px] border-2 border-transparent transition-all text-right flex flex-col items-center text-center shadow-xl hover:shadow-2xl ${isDarkMode ? 'bg-zinc-900 hover:border-emerald-500' : 'bg-white hover:border-emerald-500'}`}><div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><ShieldCheck size={32} strokeWidth={1.5} /></div><h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>أمن الحساب</h3><div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">إدارة الرمز <ChevronLeft size={14} /></div></button>
        <button onClick={() => requestProtectedView('customization')} className={`group p-8 rounded-[40px] border-2 border-transparent transition-all text-right flex flex-col items-center text-center shadow-xl hover:shadow-2xl ${isDarkMode ? 'bg-zinc-900 hover:border-emerald-500' : 'bg-white hover:border-emerald-500'}`}><div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Layout size={32} strokeWidth={1.5} /></div><h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تخصيص النظام</h3><div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">تعديل المظهر <ChevronLeft size={14} /></div></button>
        <button onClick={() => requestProtectedView('customization', 'printer')} className={`group p-8 rounded-[40px] border-2 border-transparent transition-all text-right flex flex-col items-center text-center shadow-xl hover:shadow-2xl ${isDarkMode ? 'bg-zinc-900 hover:border-emerald-500' : 'bg-white hover:border-emerald-500'}`}><div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Printer size={32} strokeWidth={1.5} /></div><h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إعدادات الطابعة</h3><div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">ضبط الطابعة والورق <ChevronLeft size={14} /></div></button>
        <button onClick={() => setActiveView('library-customization')} className={`group p-8 rounded-[40px] border-2 border-transparent transition-all text-right flex flex-col items-center text-center shadow-xl hover:shadow-2xl ${isDarkMode ? 'bg-zinc-900 hover:border-emerald-500' : 'bg-white hover:border-emerald-500'}`}><div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Sparkles size={32} strokeWidth={1.5} /></div><h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تخصيص المكتبة</h3><div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">إدارة وتصنيف الكتب <ChevronLeft size={14} /></div></button>
        <button onClick={() => requestProtectedView('database-tools')} className={`group p-8 rounded-[40px] border-2 border-transparent transition-all text-right flex flex-col items-center text-center shadow-xl hover:shadow-2xl ${isDarkMode ? 'bg-zinc-900 hover:border-emerald-500' : 'bg-white hover:border-emerald-500'}`}><div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Database size={32} strokeWidth={1.5} /></div><h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إدارة وقواعد البيانات</h3><div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">أدوات السحابة <ChevronLeft size={14} /></div></button>
        <button onClick={() => requestProtectedView('sales')} className={`group p-8 rounded-[40px] border-2 border-transparent transition-all text-right flex flex-col items-center text-center shadow-xl hover:shadow-2xl ${isDarkMode ? 'bg-zinc-900 hover:border-emerald-500' : 'bg-white hover:border-emerald-500'}`}><div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>{currentUser.isManager ? <TrendingUp size={32} strokeWidth={1.5} /> : <Lock size={32} strokeWidth={1.5} />}</div><h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>التقارير المالية</h3><div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">عرض المبيعات {currentUser.isManager ? <ChevronLeft size={14} /> : <Lock size={12} />}</div></button>
        <button onClick={() => requestProtectedView('user-management')} className={`group p-8 rounded-[40px] border-2 border-transparent transition-all text-right flex flex-col items-center text-center shadow-xl hover:shadow-2xl ${isDarkMode ? 'bg-zinc-900 hover:border-emerald-500' : 'bg-white hover:border-emerald-500'}`}><div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>{currentUser.isManager ? <Users size={32} strokeWidth={1.5} /> : <ShieldAlert size={32} strokeWidth={1.5} />}</div><h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إدارة الحسابات</h3><div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">إدارة الأفراد {currentUser.isManager ? <ChevronLeft size={14} /> : <Lock size={12} />}</div></button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 text-right pb-24 relative" dir="rtl">
      <div className={`py-4 px-8 rounded-[32px] mb-10 relative overflow-hidden shadow-xl border flex items-center justify-between ${isDarkMode ? 'bg-black text-white border-white/5' : 'bg-emerald-900 text-white border-white/5'}`}><div className="relative z-10 flex items-center gap-6"><div className={`w-14 h-14 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-white/5' : 'bg-white/10'}`}>{userAvatars[currentUser.username] ? <img src={userAvatars[currentUser.username]} alt="Avatar" className="w-full h-full object-cover" /> : (currentUser.isManager ? <ShieldCheck size={28} className="text-emerald-400" /> : <User size={28} className="text-white" />)}</div><div><h2 className="text-xl font-black tracking-tight">{currentUser.username}</h2><p className="font-bold text-xs text-emerald-400 opacity-80 uppercase tracking-widest">{currentUser.isManager ? 'مدير نظام معتمد' : 'مستخدم نظام'}</p></div></div></div>
      {renderContent()}
      
      {showImagePreviewModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`w-full max-w-2xl h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className={`p-8 border-b flex justify-between items-center ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                 <div>
                    <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>معاينة استيراد الصور</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">سيتم استبدال صور الكتب التالية بالصور الموجودة في الملف.</p>
                 </div>
                 <div className={`p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 font-black text-sm`}>{importImagePreviewItems.length} صورة</div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-3">
                 {importImagePreviewItems.map((item, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><ImageIcon size={18} /></div>
                          <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{item.title}</span>
                       </div>
                       <span className="text-[10px] font-mono text-gray-400 opacity-50 uppercase">{item.id.slice(0, 8)}...</span>
                    </div>
                 ))}
              </div>

              <div className={`p-8 border-t flex flex-col gap-4 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                 <div className="flex gap-4">
                    <button onClick={executeImageImport} className="flex-1 py-4 rounded-2xl font-black text-white bg-emerald-600 shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3">
                       <CheckCircle2 size={22} /> تأكيد الاستيراد الآن
                    </button>
                    <button onClick={() => { setShowImagePreviewModal(false); setImportedRawData({}); }} className={`px-8 py-4 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-zinc-700'}`}>إلغاء</button>
                 </div>
                 <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">تحذير: سيتم حذف الصور القديمة للأصناف المذكورة أعلاه</p>
              </div>
           </div>
        </div>
      )}

      {showAutoLoginModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-[40px] shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-slate-900'}`}>
            <div className={`p-8 border-b flex justify-between items-center ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}>
              <div>
                <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{`تفعيل الدخول الفوري`}</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">الرجاء إدخال كلمة المرور لتفعيل الخدمة بشكل آمن.</p>
              </div>
              <button onClick={() => setShowAutoLoginModal(false)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8 space-y-4 text-right">
              <label className="block text-xs font-black text-gray-400 mr-1">كلمة مرور حسابك الحالي ({currentUser.username})</label>
              <input 
                type="password" 
                value={autoLoginPassInput} 
                onChange={(e) => setAutoLoginPassInput(e.target.value)} 
                className={`w-full px-5 py-3.5 border-2 border-transparent focus:border-cyan-500 rounded-2xl outline-none font-bold text-sm text-right ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} 
                placeholder="أدخل كلمة المرور هنا"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmAutoLogin();
                  }
                }}
              />
              {autoLoginError && (
                <p className="text-xs font-bold text-red-500 mr-1 flex items-center gap-2">
                  <AlertCircle size={14} /> {autoLoginError}
                </p>
              )}
            </div>

            <div className={`p-8 border-t flex gap-4 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
              <button 
                onClick={handleConfirmAutoLogin} 
                className="flex-1 py-4 rounded-2xl font-black text-white bg-emerald-600 shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3"
              >
                <CheckCircle2 size={22} /> تأكيد وتفعيل الآن
              </button>
              <button 
                onClick={() => setShowAutoLoginModal(false)} 
                className={`px-8 py-4 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:bg-zinc-700' : 'bg-gray-200 text-zinc-700'}`}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'menu' && (<div className="flex justify-end mt-12 px-6"><button onClick={onBack} className={`group px-6 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-3 shadow-lg border hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-zinc-800 text-zinc-400 border-white/5 hover:bg-zinc-700 hover:text-zinc-100' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:text-emerald-900'}`}>رجوع<ArrowRight size={14} className="rotate-180 transition-transform group-hover:-translate-x-1" /></button></div>)}
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
};

export default Profile;