
export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  subCategory?: string; // التصنيف الفرعي
  quantity: number;
  price: number; // سعر البيع
  purchasePrice?: number; // سعر الشراء
  barcode?: string;
  location?: string; // موقع الكتاب (رف، طابق، إلخ)
  addedAt: number;
  image?: string;
  reorderLimit?: number; // حد الطلب
  reorderAlertEnabled?: boolean; // تفعيل تنبيه حد الطلب
  packingType?: string;
  packingCount?: number;
  packingName?: string;
  wholesalePrice?: number;
  publisher?: string;
  edition?: string;
  language?: string;
  // Quran Specific Fields
  quranReading?: string;
  quranScript?: string;
  quranSize?: string;
  quranPaperColor?: string;
  quranBinding?: string;
  quranCoverColor?: string;
  // School Book Specific Fields
  isSchoolBook?: boolean;
  schoolSubject?: string;
  schoolGrade?: string;
  schoolSeries?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  addedAt: number;
}

export interface SubCategory {
  id: string;
  name: string;
  addedAt: number;
}

export interface CustomGroupedCategory {
  id: string;
  name: string;
  mainCategories: string[]; // أسماء التصنيفات الرئيسية
  subCategories: string[]; // أسماء التصنيفات الفرعية
  color?: string; // لون مميز للبادج
  icon?: string;
  createdAt: number;
}

export interface Publisher {
  id: string;
  name: string;
  description?: string;
  addedAt: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  country: string;
  notes?: string;
}

export interface UserAccount {
  username: string;
  password: string;
  isManager?: boolean;
  avatar?: string;
}

export interface CartItem extends Book {
  orderQty: number;
}

export interface SaleItem {
  bookId: string;
  title: string;
  quantity: number;
  price: number;
}

export interface SaleRecord {
  id: string;
  invoiceNumber: string;
  items: SaleItem[];
  totalAmount: number; // الإجمالي قبل الخصم
  discountValue: number;
  netAmount: number; // الإجمالي بعد الخصم
  paidAmount: number;
  initialPaidAmount?: number; // المبلغ المدفوع لحظة البيع (للتقارير)
  realizedProfit?: number; // الربح المحقق من هذه الدفعة (للتقارير المالية)
  paymentType: string;
  timestamp: number;
  seller: string;
  customer?: string;
  isReturn?: boolean;
  isPaid?: boolean; // حالة السداد للبيع الآجل
  paidAt?: number; // تاريخ السداد الفعلي
  barcodeNum?: string; // رقم الباركود الخطي المكون من 8 أرقام
  status?: 'paid' | 'returned';
}

export interface FinancialEntry {
  id: string;
  type: 'sale' | 'return' | 'collection';
  amount: number;
  profit: number;
  timestamp: number;
  seller: string;
  customerName: string;
  invoiceNo: string;
}

export interface PurchaseItem {
  barcode: string;
  title: string;
  author?: string;
  category?: string;
  subCategory?: string;
  quantityAdded: number;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
}

export interface PurchaseInvoiceRecord {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  timestamp: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  addedAt: number;
}

export interface PdfCategory {
  id: string;
  name: string;
  iconName: string;
  iconImage?: string; // لتمكين استخدام صور خارجية PNG
  coverImage?: string; // صورة غلاف عريضة (1920 × 1080)
  description?: string;
  addedAt: number;
  parentId?: string; // لتمكين القوائم الفرعية أو ربط الكورس بالقسم
  departmentId?: string; // معرف القسم الرئيسي التابع له المقرر
  isIconPinned?: boolean; // تثبيت الأيقونة للمجلدات الفرعية والملفات
  isBookLayout?: boolean; // وضع غلاف الكتاب (مستطيل A4 كبير)
  isQuickAccess?: boolean; // إضافة للوصول السريع
  categoryType?: 'department' | 'course' | 'videos' | 'pdf' | 'assignments' | 'exams' | 'custom';
}

export interface VideoQualityOption {
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto';
  label: string;
  fileName: string;
  fileSize?: number;
  width?: number;
  height?: number;
  bitrate?: string;
}

export interface VideoLesson {
  id: string;
  title: string;
  description?: string;
  videoUrl?: string; // رابط خارجي اختياري
  videoFileUrl?: string;
  fileName?: string; // اسم ملف الفيديو المحلي MP4
  fileSize?: number; // حجم ملف الفيديو بالبايت
  isLocalFile?: boolean; // هل الفيديو مخزن محلياً بصيغة MP4
  duration?: string;
  author?: string;
  folderId: string;
  addedAt: number;
  isCompleted?: boolean;
  coverImage?: string; // صورة غلاف ومصغرة للفيديو بنسبة 16:9 وبأبعاد 1920 × 1080
  qualities?: Record<string, VideoQualityOption>; // نسخ الجودات المختلفة (720p, 480p, 360p)
  transcodingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  transcodeProgress?: number;
}

export interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  maxScore?: number;
  folderId: string;
  addedAt: number;
  status: 'pending' | 'submitted' | 'graded';
  submissionNotes?: string;
  submittedFile?: string;
  submittedAt?: number;
  grade?: number;
  teacherFeedback?: string;
}

export interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface ExamItem {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalScore: number;
  questions: ExamQuestion[];
  folderId: string;
  addedAt: number;
  lastScore?: number;
  isPassed?: boolean;
  completedAt?: number;
}

export interface CustomContentItem {
  id: string;
  title: string;
  description?: string;
  contentType: 'code' | 'snippet' | 'link' | 'text' | 'file';
  codeSnippet?: string;
  codeLanguage?: string;
  externalUrl?: string;
  author?: string;
  tags?: string[];
  folderId: string; // custom category ID
  courseId: string;
  addedAt: number;
}

export interface CustomContentCategory {
  id: string;
  name: string;
  shortTitle?: string;
  description?: string;
  iconName: string;
  colorGrad: string;
  accentColor: string;
  borderColor?: string;
  courseId: string;
  addedAt: number;
  coverImage?: string;
}

export interface PdfFile {
  id: string;
  name: string;
  size: number;
  addedAt: number;
  listId: string; // المعرف الخاص بالقائمة الملحق بها
  subCategoryId?: string; // معرف التصنيف الفرعي (اختياري)
  blob?: Blob;
  coverBlob?: Blob | string;
  pageCount?: number;
  price?: number;
  originalPath?: string;
  author?: string; // اسم المؤلف
  isTemporary?: boolean;
  lastOpenedAt?: number; // وقت آخر فتح للملف بالملي ثانية
}

export enum Page {
  Sales = 'sales',
  Dashboard = 'dashboard',
  AddBook = 'add-book',
  ItemCard = 'item-card',
  Warehouse = 'warehouse', 
  Settings = 'settings',
  SalesHistory = 'sales-history',
  Suppliers = 'suppliers',
  PageNotFound = '404',
  Profile = 'profile',
  SellersSafes = 'sellers-safes',
  PdfManager = 'pdf-manager',
  Games = 'games',
  SchoolBooks = 'school-books'
}

export interface SchoolBookSeries {
  id: string;
  name: string;
  addedAt: number;
}

export interface SchoolBookGrade {
  id: string;
  seriesId: string;
  name: string;
  addedAt: number;
}

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}
