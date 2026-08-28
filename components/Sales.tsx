import { Barcode, CheckCircle2, ChevronDown, History, Image as ImageIcon, Minus, Plus, Printer, RotateCcw, Search, ShoppingCart, LayoutGrid, Trash2, Wallet, Banknote, Percent, User, Calculator, X, AlertTriangle, UserPlus, Users, UserCheck, Package, Palette } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Book, SaleRecord, Customer, SaleItem, CartItem } from '../types';
import { generateBarcodeDataURL, generateRandomBarcode } from '../src/utils/barcode';
import { fuzzyIncludesArabic } from '../src/utils/textUtils';
import { getPrintBaseHead } from '../src/utils/printStyles';

interface SalesProps {
  books: Book[];
  salesHistory: SaleRecord[];
  customers: Customer[];
  debtCustomers: Customer[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onProcessSale: (items: SaleItem[], payment: any, isReturn?: boolean, existingId?: string) => void;
  onReturnSale: (saleId: string) => void;
  onAddDebtCustomer?: (c: Customer) => void;
  isDarkMode?: boolean;
}

const tafqeet = (val: number): string => {
  let n = Math.round(val);
  if (n === 0) return "صفر دينار";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعامائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانبائة", "تسعون مائة"];
  const thousands = ["", "ألف", "ألفان", "ثلاثة آلاف", "أربعة آلاف", "خمسة آلاف", "ستة آلاف", "سبعة آلاف", "ثمانية آلاف", "تسعة آلاف", "عشرة آلاف"];

  let result = "";

  if (n >= 1000) {
    const th = Math.floor(n / 1000);
    result += (th <= 10 ? thousands[th] : tafqeet(th) + " ألف") + " ";
    n %= 1000;
  }

  if (n >= 100) {
    result += (result ? "و " : "") + hundreds[Math.floor(n / 100)] + " ";
    n %= 100;
  }

  if (n > 0) {
    result += (result ? "و " : "");
    if (n < 20) {
      result += ones[n];
    } else {
      const unit = n % 10;
      const ten = Math.floor(n / 10);
      if (unit > 0) result += ones[unit] + " و ";
      result += tens[ten];
    }
  }

  return `${result.trim()} دينار فقط لاغير`;
};

const Sales: React.FC<SalesProps> = ({ books, salesHistory, customers, debtCustomers, cart, setCart, onProcessSale, onReturnSale, onAddDebtCustomer, isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showInvoicesDropdown, setShowInvoicesDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [loadedInvoiceStatus, setLoadedInvoiceStatus] = useState<'paid' | 'returned' | null>(null);
  
  // الحقول الجديدة المطلوبة
  const [nextQty, setNextQty] = useState(1);
  const [useDefaultPack, setUseDefaultPack] = useState(false);
  
  const [paymentType, setPaymentType] = useState('نقدي');
  const [customer, setCustomer] = useState('عام');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [actionMode, setActionMode] = useState<'sale' | 'return' | 'credit'>('sale');

  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [receivedFromCustomer, setReceivedFromCustomer] = useState<number>(0);
  
  // نظام إدارة قائمة البيع الآجل التفاعلية
  const [creditOverlay, setCreditOverlay] = useState<{
    isOpen: boolean;
    step: 'options' | 'search' | 'new';
    activeIndex: number;
    searchQuery: string;
    newCust: { name: string; phone: string; limit: number; partialPaid: number; partialType: string };
  }>({
    isOpen: false,
    step: 'options',
    activeIndex: 0,
    searchQuery: '',
    newCust: { name: '', phone: '', limit: 0, partialPaid: 0, partialType: 'نقدي' }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const invoicesDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // جلب العملاء الذين لديهم سجل ديون مسبق من قائمة debtCustomers المنفصلة
  const debtListCustomers = useMemo(() => {
    return debtCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(creditOverlay.searchQuery.toLowerCase()) || 
                           (c.phone && c.phone.includes(creditOverlay.searchQuery));
      return matchesSearch;
    });
  }, [debtCustomers, creditOverlay.searchQuery]);

  const playAddSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      const startTime = ctx.currentTime;
      const freqs = [440, 880, 1320];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, startTime);
        g.gain.setValueAtTime(0, startTime);
        g.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2 + (i * 0.1));
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        osc.stop(startTime + 0.5);
      });
    } catch (e) {
      // Audio play failed or deferred
    }
  };

  const adjustCartQty = (id: string, delta: number) => {
    // جلب الفاتورة الأصلية في حالة التعديل لحساب السقف الحقيقي للكمية (المخزن الحالي + الكمية في الفاتورة)
    const originalInvoice = editingInvoiceId ? salesHistory.find(s => s.id === editingInvoiceId) : null;
    const originalItem = originalInvoice?.items.find(i => i.bookId === id);
    const originalQty = originalItem ? Math.abs(originalItem.quantity) : 0;

    setCart(cart.map(item => {
      if (item.id === id) {
        // السقف هو الكمية الحالية في المخزن + الكمية التي كانت محجوزة في هذه الفاتورة الأصلية
        const maxAllowed = item.quantity + originalQty;
        const newQty = Math.min(Math.max(1, item.orderQty + delta), maxAllowed);
        if (newQty !== item.orderQty) playAddSound();
        return { ...item, orderQty: newQty };
      }
      return item;
    }));
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (invoicesDropdownRef.current && !invoicesDropdownRef.current.contains(event.target as Node)) {
        setShowInvoicesDropdown(false);
      }
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // تعديل: اختصار سريع لإرجاع التركيز لمربع البحث باستخدام زر *
      if (event.key === '*') {
        event.preventDefault();
        inputRef.current?.focus();
      }

      // تعديل: التحكم في كمية آخر صنف مضاف عبر أزرار الكيبورد + و -
      if (event.key === '+') {
        // إذا كان هناك عناصر في السلة ومربع البحث فارغ، نزيد كمية آخر صنف
        if (cart.length > 0 && (document.activeElement?.tagName !== 'INPUT' || (document.activeElement === inputRef.current && searchTerm === ''))) {
          event.preventDefault();
          adjustCartQty(cart[cart.length - 1].id, 1);
        } else if (document.activeElement?.tagName !== 'INPUT' || document.activeElement === inputRef.current) {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }

      if (event.key === '-') {
        // إذا كان هناك عناصر في السلة ومربع البحث فارغ، ننقص كمية آخر صنف
        if (cart.length > 0 && (document.activeElement?.tagName !== 'INPUT' || (document.activeElement === inputRef.current && searchTerm === ''))) {
          event.preventDefault();
          adjustCartQty(cart[cart.length - 1].id, -1);
        }
      }
      
      // تبديل حالة "العبوة الافتراضية" عبر مفتاح المسافة إذا كان مربع البحث فارغاً
      if (event.key === ' ' && searchTerm === '' && document.activeElement === inputRef.current) {
        event.preventDefault();
        setUseDefaultPack(prev => !prev);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [searchTerm, cart]); // تم إضافة cart للتبعات لضمان استجابة الاختصارات للتغييرات في السلة

  useEffect(() => {
    if (showDropdown && resultsContainerRef.current) {
      const activeItem = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showDropdown]);

  const playSaleSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(880, 0, 0.1); 
      playTone(440, 0.1, 0.2); 
    } catch (e) {
      console.debug("Audio play failed or deferred:", e);
    }
  };

  const searchResults = searchTerm.trim() === '' ? [] : books.filter(book => 
    book.quantity > 0 &&
    (fuzzyIncludesArabic(book.title, searchTerm) || 
     fuzzyIncludesArabic(book.author, searchTerm) ||
     (book.quranReading && fuzzyIncludesArabic(book.quranReading, searchTerm)) || 
     (book.quranSize && fuzzyIncludesArabic(book.quranSize, searchTerm)) ||
     (book.barcode && book.barcode.includes(searchTerm.trim()))
    )
  ).slice(0, 30);

  useEffect(() => {
    setTimeout(() => setSelectedIndex(0), 0);
  }, [searchTerm]);

  const addToCart = (book: Book) => {
    const qtyBase = nextQty || 1;
    const packCount = Number(book.packingCount) || 1;
    
    // التعديل المطلوب: عند استخدام العبوة الافتراضية، الكمية المضافة للسلة هي qtyBase (الافتراضي 1) والسعر هو (سعر القطعة * عدد التعبئة)
    const priceToUse = useDefaultPack ? (book.price * packCount) : book.price;
    const finalQtyToAdd = qtyBase;
    
    const stockLimit = book.quantity;

    const existing = cart.find(item => item.id === book.id && item.price === priceToUse);
    if (existing) {
      const newTotal = existing.orderQty + finalQtyToAdd;
      setCart(cart.map(item => 
        (item.id === book.id && item.price === priceToUse) ? { ...item, orderQty: Math.min(newTotal, stockLimit) } : item
      ));
      playAddSound();
    } else {
      setCart([...cart, { ...book, price: priceToUse, orderQty: Math.min(finalQtyToAdd, stockLimit) }]);
      playAddSound();
    }
    
    setSearchTerm('');
    setNextQty(1); // إعادة الكمية لـ 1 بعد الإضافة
    setUseDefaultPack(false); // إيقاف العبوة الافتراضية بعد الإضافة لتعود للحالة الطبيعية تلقائياً
    setShowDropdown(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const loadInvoiceItems = (inv: SaleRecord) => {
    setCart([]); // تصفير السلة للبدء بتعبئتها بالفاتورة المجلوبة فقط
    const newItems: CartItem[] = [];
    inv.items.forEach(invItem => {
      const book = books.find(b => b.id === invItem.bookId);
      if (book) {
        newItems.push({ ...book, orderQty: Math.abs(invItem.quantity), price: invItem.price });
      }
    });
    
    if (newItems.length > 0) {
      setCart(newItems);
      setEditingInvoiceId(inv.id);
      setLoadedInvoiceStatus(inv.status || 'paid');
      setPaymentType(inv.paymentType);
      setCustomer(inv.customer || 'عام');
      
      // تعبئة نسبة الخصم
      const totalBefore = inv.totalAmount || 1;
      const dPercent = ((inv.discountValue || 0) / totalBefore) * 100;
      setDiscountPercent(dPercent);
      setPaidAmount(inv.paidAmount || 0);
      
      playAddSound();
    }
    setShowInvoicesDropdown(false);
  };

  const returnableData = useMemo(() => {
    const data: Record<string, { available: number; soldEver: boolean }> = {};
    salesHistory.forEach(sale => {
      sale.items.forEach(item => {
        if (!data[item.bookId]) {
          data[item.bookId] = { available: 0, soldEver: false };
        }
        data[item.bookId].available += item.quantity;
        if (item.quantity > 0) data[item.bookId].soldEver = true;
      });
    });
    return data;
  }, [salesHistory]);

  const canProcessReturn = useMemo(() => {
    if (cart.length === 0) return false;
    // منع الإرجاع إذا كانت الفاتورة المحملة مسترجعة بالفعل
    if (editingInvoiceId && loadedInvoiceStatus === 'returned') return false;

    return cart.every(cartItem => {
      const stats = returnableData[cartItem.id];
      if (!stats || !stats.soldEver) return false;
      return cartItem.orderQty <= stats.available;
    });
  }, [cart, returnableData, editingInvoiceId, loadedInvoiceStatus]);

  const handlePrint = (inv: SaleRecord) => {
    const startOfDay = new Date(inv.timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const dayStart = startOfDay.getTime();

    const endOfDay = new Date(inv.timestamp);
    endOfDay.setHours(23, 59, 59, 999);
    const dayEnd = endOfDay.getTime();

    const dayInvoices = salesHistory
      .filter(s => s.timestamp >= dayStart && s.timestamp <= dayEnd)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const dailySeq = dayInvoices.findIndex(s => s.id === inv.id) + 1;
    const displayInvoiceNumber = dailySeq > 0 ? dailySeq.toString() : inv.invoiceNumber;

    // جلب إعداد الباركود
    const savedPrintBarcode = localStorage.getItem('ALADDIN_PRINT_BARCODE');
    const shouldShowBarcode = (savedPrintBarcode === null ? true : savedPrintBarcode === 'true') && inv.barcodeNum;

    let barcodeImageHtml = '';
    if (shouldShowBarcode && inv.barcodeNum) {
      const barcodeDataURL = generateBarcodeDataURL(inv.barcodeNum);
      barcodeImageHtml = `<img src="${barcodeDataURL}" style="max-width: 100%;" />`;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const isGeneral = !inv.customer || inv.customer === 'عام';
    const mainColor = '#10b981'; 
    const badgeText = inv.isReturn ? 'سند إرجاع مبيعات' : 'فاتورة مبيعات';
    const footerText = isGeneral ? 'شكراً لزيارتكم' : 'شكراً لتعاملكم معنا';

    const dPercent = inv.totalAmount !== 0 ? Math.round((Math.abs(inv.discountValue) / Math.abs(inv.totalAmount)) * 100) : 0;

    const itemsHtml = inv.items.map((item, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 800;">${item.title || 'صنف غير مسمى'}</td>
        <td style="padding: 10px 8px; text-align: center;">${Math.abs(item.quantity)}</td>
        <td style="padding: 10px 8px; text-align: center;">${item.price.toLocaleString()}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 900; font-size: 15px;">${Math.abs(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const savedPaperSize = localStorage.getItem('aladdin_print_paper_size') || 'A4';
    const savedMarginMode = localStorage.getItem('aladdin_print_margin_mode') || 'none';
    const pageMargin = savedMarginMode === 'none' ? '0' : savedMarginMode === 'minimal' ? '5mm' : '10mm';
    const pageSizeCss = savedPaperSize === '80mm' ? '80mm auto' : savedPaperSize;

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          ${getPrintBaseHead(`مكتبة علاء الدين - ${displayInvoiceNumber}`, `
            @page {
              size: ${pageSizeCss};
              margin: ${pageMargin};
            }
            body { 
              font-family: 'Cairo', 'Almarai', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; 
              padding: ${savedPaperSize === '80mm' ? '10px' : '30px'}; 
              color: #334155; 
              line-height: 1.6; 
              position: relative; 
              min-height: 100%;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 4px solid ${mainColor}; padding-bottom: 15px; }
            .header h1 { margin: 0; color: ${mainColor}; font-size: 30px; font-weight: 900; }
            .header p { margin: 5px 0 0; font-weight: 700; color: #64748b; font-size: 14px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .info-item { font-size: 13px; }
            .info-label { font-weight: 900; color: #1e293b; margin-left: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f1f5f9; color: #475569; padding: 10px 8px; text-align: center; font-weight: 900; border-bottom: 2px solid #e2e8f0; font-size: 13px; }
            .summary { margin-top: 15px; padding: 12px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
            .summary-row:last-child { border-bottom: none; font-size: 18px; font-weight: 900; color: ${mainColor}; margin-top: 5px; }
            .tafqeet { margin-top: 15px; font-weight: 800; font-size: 13px; font-style: italic; color: #64748b; border-right: 4px solid ${mainColor}; padding-right: 15px; }
            .footer { margin-top: 40px; text-align: center; font-size: 14px; font-weight: 900; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            .barcode-container { position: absolute; bottom: 10px; left: 10px; display: ${shouldShowBarcode ? 'block' : 'none'}; }
            @media print { 
              body { padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
              .no-print { display: none; } 
            }
          `)}
        </head>
        <body>
          <div class="content-wrapper" style="position: relative; min-height: 100%;">
            <div class="header">
              <h1>مكتبة علاء الدين</h1>
              <p>${badgeText}</p>
            </div>
            
            <div class="info-grid">
              <div class="info-item"><span class="info-label">رقم الفاتورة:</span> #${displayInvoiceNumber}</div>
              <div class="info-item"><span class="info-label">التاريخ:</span> ${new Date(inv.timestamp).toLocaleDateString('en-GB')}</div>
              <div class="info-item"><span class="info-label">العميل:</span> ${inv.customer || 'عام'}</div>
              <div class="info-item"><span class="info-label">الوقت:</span> ${new Date(inv.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">ر.م</th>
                  <th style="text-align: right;">الصنف</th>
                  <th style="width: 60px;">الكمية</th>
                  <th style="width: 80px;">السعر</th>
                  <th style="width: 100px;">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row">
                <span>الإجمالي:</span>
                <span>${inv.totalAmount.toLocaleString()} د.ل</span>
              </div>
              <div class="summary-row" style="color: #ef4444;">
                <span>الخصم : ${dPercent}%</span>
                <span>-${inv.discountValue.toLocaleString()} د.ل</span>
              </div>
              <div class="summary-row">
                <span>الاجمالي النهائي:</span>
                <span>${inv.netAmount.toLocaleString()} د.ل</span>
              </div>
            </div>

            ${isGeneral ? '' : `
              <div class="tafqeet">
                فقط: ${tafqeet(inv.netAmount)}
              </div>
            `}

            <div class="footer">
              ${footerText}
            </div>
            
            <div class="barcode-container">
              ${barcodeImageHtml}
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const removeFromCart = (id: string) => {
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    if (newCart.length === 0) {
      setEditingInvoiceId(null);
      setLoadedInvoiceStatus(null);
      setDiscountPercent(0);
      setCustomer('عام');
      setPaymentType('نقدي');
    }
  };

  const totalAmountBeforeDiscount = cart.reduce((sum, item) => sum + (item.price * item.orderQty), 0);
  const discountValue = (totalAmountBeforeDiscount * discountPercent) / 100;
  const netAmount = totalAmountBeforeDiscount - discountValue;

  useEffect(() => {
    setTimeout(() => {
      if (paymentType === 'آجل') {
        if (!editingInvoiceId) setPaidAmount(0);
      } else {
        if (!editingInvoiceId) setPaidAmount(netAmount);
      }
    }, 0);
  }, [netAmount, paymentType, editingInvoiceId]);

  const handleCheckout = (customPaymentType?: string, customCustomer?: string, customPaid?: number) => {
    if (cart.length === 0) return;
    
    let bCode = (customPaymentType || paymentType) === 'آجل' ? '' : undefined;
    if (!editingInvoiceId) {
      do {
        bCode = generateRandomBarcode();
      } while (salesHistory.some(s => s.barcodeNum === bCode));
    } else {
      const oldSale = salesHistory.find(s => s.id === editingInvoiceId);
      bCode = oldSale?.barcodeNum;
    }

    playSaleSound();
    const saleItems: SaleItem[] = cart.map(item => ({
      bookId: item.id,
      title: item.title,
      quantity: item.orderQty,
      price: item.price
    }));
    
    const finalPaid = customPaid !== undefined ? customPaid : paidAmount;
    
    onProcessSale(saleItems, { 
      discountValue, 
      netAmount, 
      paidAmount: finalPaid, 
      paymentType: customPaymentType || paymentType, 
      customer: customCustomer || customer,
      barcodeNum: bCode
    }, false, editingInvoiceId || undefined);

    setCart([]);
    setEditingInvoiceId(null);
    setLoadedInvoiceStatus(null);
    setDiscountPercent(0);
    setCustomer('عام');
    setActionMode('sale');
    setCreditOverlay(prev => ({ ...prev, isOpen: false }));
    inputRef.current?.focus();
  };

  const handleProcessSmartReturn = () => {
    if (!canProcessReturn) return;

    let bCode = '';
    if (!editingInvoiceId) {
      do {
        bCode = generateRandomBarcode();
      } while (salesHistory.some(s => s.barcodeNum === bCode));
    } else {
      const oldSale = salesHistory.find(s => s.id === editingInvoiceId);
      bCode = oldSale?.barcodeNum || '';
    }

    const saleItems: SaleItem[] = cart.map(item => ({
      bookId: item.id,
      title: item.title,
      quantity: item.orderQty,
      price: item.price
    }));
    onProcessSale(saleItems, { 
      discountValue: 0, 
      netAmount: totalAmountBeforeDiscount, 
      paidAmount: totalAmountBeforeDiscount, 
      paymentType, 
      customer,
      barcodeNum: bCode
    }, true, editingInvoiceId || undefined);
    setCart([]);
    setEditingInvoiceId(null);
    setLoadedInvoiceStatus(null);
    setDiscountPercent(0);
    setCustomer('عام');
    setSearchTerm('');
    setActionMode('sale');
    inputRef.current?.focus();
  };

  const handleInputEnterFocus = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmBtnRef.current?.focus();
    }
  };

  // معالج التنقل في قائمة البيع الآجل التفاعلية
  const handleCreditMenuKeyDown = (e: React.KeyboardEvent) => {
    if (creditOverlay.step === 'options') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCreditOverlay(prev => ({ ...prev, activeIndex: (prev.activeIndex + 1) % 2 }));
      }
      if (e.key === 'Enter') {
        if (creditOverlay.activeIndex === 0) {
          setCreditOverlay(prev => ({ ...prev, step: 'search', activeIndex: 0 }));
        } else {
          setCreditOverlay(prev => ({ ...prev, step: 'new' }));
        }
      }
      if (e.key === 'Escape') {
        setCreditOverlay(prev => ({ ...prev, isOpen: false }));
      }
    } else if (creditOverlay.step === 'search') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCreditOverlay(prev => ({ 
          ...prev, 
          activeIndex: (prev.activeIndex + 1) % (debtListCustomers.length || 1)
        }));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCreditOverlay(prev => ({ 
          ...prev, 
          activeIndex: (prev.activeIndex - 1 + debtListCustomers.length) % (debtListCustomers.length || 1)
        }));
      }
      if (e.key === 'Enter' && debtListCustomers[creditOverlay.activeIndex]) {
        e.preventDefault();
        handleCheckout('آجل', debtListCustomers[creditOverlay.activeIndex].name);
      }
      if (e.key === 'Escape') {
        setCreditOverlay(prev => ({ ...prev, step: 'options', activeIndex: 0 }));
      }
    } else if (creditOverlay.step === 'new') {
      if (e.key === 'Escape') {
        setCreditOverlay(prev => ({ ...prev, step: 'options' }));
      }
    }
  };

  const handleActionBtnKeyDown = (e: React.KeyboardEvent) => {
    const modes: ('sale' | 'return' | 'credit')[] = ['sale', 'return', 'credit'];
    const currentIndex = modes.indexOf(actionMode);
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextMode = modes[(currentIndex - 1 + modes.length) % modes.length];
      setActionMode(nextMode);
      if (nextMode === 'credit') setPaymentType('آجل');
      else if (nextMode === 'sale') setPaymentType('نقدي');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextMode = modes[(currentIndex + 1) % modes.length];
      setActionMode(nextMode);
      if (nextMode === 'credit') setPaymentType('آجل');
      else if (nextMode === 'sale') setPaymentType('نقدي');
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (actionMode === 'credit') {
        setPaymentType('آجل');
        setCreditOverlay({ 
          isOpen: true, 
          step: 'options', 
          activeIndex: 0, 
          searchQuery: '', 
          newCust: { name: '', phone: '', limit: 0, partialPaid: 0, partialType: 'نقدي' } 
        });
        return;
      }
      const isActionInvalid = cart.length === 0 || (actionMode === 'return' && !canProcessReturn);
      if (!isActionInvalid) {
        if (actionMode === 'sale') handleCheckout();
        else handleProcessSmartReturn();
      }
    }
  };

  const sortedSalesHistory = useMemo(() => {
    return [...salesHistory].sort((a, b) => b.timestamp - a.timestamp);
  }, [salesHistory]);

  const lastInvoices = useMemo(() => {
    if (!invoiceSearchQuery.trim()) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayStartTime = startOfToday.getTime();
      return sortedSalesHistory.filter(inv => inv.timestamp >= todayStartTime);
    }
    return sortedSalesHistory.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
      (inv.barcodeNum && inv.barcodeNum.toLowerCase().includes(invoiceSearchQuery.toLowerCase()))
    );
  }, [sortedSalesHistory, invoiceSearchQuery]);

  const latestInvoice = sortedSalesHistory.length > 0 ? sortedSalesHistory[0] : null;

  const changeDue = Math.max(0, receivedFromCustomer - netAmount);

  const isCreditError = false;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-right" dir="rtl">
      
      {/* طبقة البيع الآجل التفاعلية */}
      {creditOverlay.isOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" 
          onKeyDown={handleCreditMenuKeyDown}
          tabIndex={-1}
        >
          <div className={`w-full max-w-3xl rounded-[40px] shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
            <div className={`px-10 py-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                  <Wallet size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg">نظام البيع الآجل المطور</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">اختيار عميل المديونية</p>
                </div>
              </div>
              <button 
                onClick={() => setCreditOverlay(prev => ({ ...prev, isOpen: false }))} 
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={28}/>
              </button>
            </div>

            <div className="p-10">
              {creditOverlay.step === 'options' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    onClick={() => setCreditOverlay(prev => ({ ...prev, step: 'search', activeIndex: 0 }))}
                    onMouseEnter={() => setCreditOverlay(prev => ({ ...prev, activeIndex: 0 }))}
                    className={`w-full p-8 rounded-[32px] border-2 transition-all text-right flex flex-col items-center gap-4 ${creditOverlay.activeIndex === 0 ? 'border-emerald-500 bg-emerald-500/5 shadow-2xl scale-[1.03]' : (isDarkMode ? 'border-zinc-800 bg-zinc-800/50 opacity-60' : 'border-gray-50 bg-gray-50/50 opacity-60')}`}
                  >
                    <div className={`p-5 rounded-2xl ${creditOverlay.activeIndex === 0 ? 'bg-emerald-50 text-white shadow-emerald-500/30' : 'bg-zinc-100 text-gray-400'}`}>
                      <Users size={32} />
                    </div>
                    <div className="text-center">
                      <h4 className="font-black text-xl mb-1">اختر من قائمة الديون</h4>
                      <p className="text-xs text-gray-400 font-bold">البحث في السجلات المالية الحالية</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => setCreditOverlay(prev => ({ ...prev, step: 'new' }))}
                    onMouseEnter={() => setCreditOverlay(prev => ({ ...prev, activeIndex: 1 }))}
                    className={`w-full p-8 rounded-[32px] border-2 transition-all text-right flex flex-col items-center gap-4 ${creditOverlay.activeIndex === 1 ? 'border-blue-500 bg-blue-500/5 shadow-2xl scale-[1.03]' : (isDarkMode ? 'border-zinc-800 bg-zinc-800/50 opacity-60' : 'border-gray-50 bg-gray-50/50 opacity-60')}`}
                  >
                    <div className={`p-5 rounded-2xl ${creditOverlay.activeIndex === 1 ? 'bg-blue-500 text-white shadow-blue-500/30' : 'bg-zinc-100 text-gray-400'}`}>
                      <UserPlus size={32} />
                    </div>
                    <div className="text-center">
                      <h4 className="font-black text-xl mb-1">سجل عميل آجل جديد</h4>
                      <p className="text-xs text-gray-400 font-bold">إضافة عميل جديد فوراً للدفتر</p>
                    </div>
                  </button>
                </div>
              )}

              {creditOverlay.step === 'search' && (
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      autoFocus
                      type="text" 
                      value={creditOverlay.searchQuery}
                      onChange={(e) => setCreditOverlay(prev => ({ 
                        ...prev, 
                        searchQuery: e.target.value, 
                        activeIndex: 0 
                      }))}
                      placeholder="ابحث بالاسم أو رقم الهاتف..."
                      className={`w-full pr-14 pl-6 py-5 rounded-2xl border-2 border-transparent outline-none font-bold text-base ${isDarkMode ? 'bg-zinc-800 focus:border-emerald-500 text-white' : 'bg-gray-50 focus:border-emerald-500 text-emerald-950'}`}
                    />
                  </div>
                  <div className="max-h-[35rem] overflow-y-auto custom-scrollbar space-y-2 p-2">
                    {debtListCustomers.map((d, idx) => (
                      <div 
                        key={d.id} 
                        onClick={() => handleCheckout('آجل', d.name)}
                        onMouseEnter={() => setCreditOverlay(prev => ({ ...prev, activeIndex: idx }))}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${creditOverlay.activeIndex === idx ? 'border-emerald-500 bg-emerald-500/5 shadow-lg scale-[1.01]' : (isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-50 bg-gray-50/50')}`}
                      >
                        <span className="font-black text-lg flex items-center gap-3">
                          <UserCheck size={20} className="text-emerald-500" /> 
                          {d.name}
                        </span>
                        <span className="text-xs text-gray-400 font-bold">{d.phone || 'بدون هاتف'}</span>
                      </div>
                    ))}
                    {debtListCustomers.length === 0 && (
                      <div className="py-20 text-center flex flex-col items-center opacity-30">
                        <Search size={48} className="mb-4" />
                        <p className="font-black text-base">لا توجد نتائج مطابقة لبحثك</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <button 
                      onClick={() => setCreditOverlay(prev => ({ ...prev, step: 'options', activeIndex: 0 }))} 
                      className="text-sm font-black text-emerald-600 hover:underline flex items-center gap-2"
                    >
                      ← الرجوع لخيارات الآجل
                    </button>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">اختر عميلاً للمتابعة</p>
                  </div>
                </div>
              )}

              {creditOverlay.step === 'new' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase tracking-widest">اسم الزبون</label>
                      <input 
                        autoFocus
                        type="text" 
                        id="new-cust-name"
                        value={creditOverlay.newCust.name}
                        placeholder="أدخل الاسم الرباعي..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('new-cust-phone')?.focus(); } }}
                        onChange={(e) => setCreditOverlay(prev => ({ 
                          ...prev, 
                          newCust: { ...prev.newCust, name: e.target.value } 
                        }))}
                        className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 focus:border-blue-500 text-white' : 'bg-gray-50 focus:border-blue-500 text-emerald-950'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase tracking-widest">رصيد الزبون</label>
                      <div className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent font-black text-sm ${isDarkMode ? 'bg-zinc-800/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        0.00 د.ل
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase tracking-widest">رقم الفاتورة</label>
                      <div className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent font-black text-sm ${isDarkMode ? 'bg-zinc-800/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        #{salesHistory.length + 1}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase tracking-widest">رقم الهاتف</label>
                      <input 
                        type="text" 
                        id="new-cust-phone"
                        value={creditOverlay.newCust.phone}
                        placeholder="09XXXXXXXX"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('new-cust-limit')?.focus(); } }}
                        onChange={(e) => setCreditOverlay(prev => ({ 
                          ...prev, 
                          newCust: { ...prev.newCust, phone: e.target.value } 
                        }))}
                        className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 focus:border-blue-500 text-white' : 'bg-gray-50 focus:border-blue-500 text-emerald-950'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase tracking-widest">قيمة السقف</label>
                      <input 
                        type="number" 
                        id="new-cust-limit"
                        value={creditOverlay.newCust.limit || ''}
                        placeholder="0.00"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('new-cust-type')?.focus(); } }}
                        onChange={(e) => setCreditOverlay(prev => ({ 
                          ...prev, 
                          newCust: { ...prev.newCust, limit: parseFloat(e.target.value) || 0 } 
                        }))}
                        className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-800 focus:border-blue-500 text-white' : 'bg-gray-50 focus:border-blue-500 text-emerald-950'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase tracking-widest">نوع السداد</label>
                      <div className="relative group">
                        <select 
                          id="new-cust-type"
                          value={creditOverlay.newCust.partialType}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('new-cust-paid')?.focus(); } }}
                          onChange={(e) => setCreditOverlay(prev => ({ 
                            ...prev, 
                            newCust: { ...prev.newCust, partialType: e.target.value } 
                          }))}
                          className={`w-full pr-6 pl-10 py-4 rounded-2xl border-2 border-transparent focus:border-blue-500 text-white font-bold text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`}
                        >
                          <option value="نقدي">نقدي</option>
                          <option value="بطاقة">بطاقة</option>
                        </select>
                        <ChevronDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase tracking-widest">المدفوع</label>
                      <input 
                        type="number" 
                        id="new-cust-paid"
                        value={creditOverlay.newCust.partialPaid || ''}
                        placeholder="0.00"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('new-cust-save')?.focus(); } }}
                        onChange={(e) => setCreditOverlay(prev => ({ 
                          ...prev, 
                          newCust: { ...prev.newCust, partialPaid: parseFloat(e.target.value) || 0 } 
                        }))}
                        className={`w-full px-6 py-4 rounded-2xl border-2 border-transparent outline-none font-black text-2xl text-center ${isDarkMode ? 'bg-zinc-800 focus:border-blue-500 text-blue-400' : 'bg-gray-50 focus:border-blue-500 text-blue-600'}`}
                      />
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                    <p className="text-[11px] font-bold text-blue-600 leading-relaxed text-center">سيتم إنشاء ملف العميل المالي وربط الفاتورة بذمته تلقائياً.</p>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setCreditOverlay(prev => ({ ...prev, step: 'options' }))} 
                      className={`px-8 py-5 rounded-[20px] font-black text-sm transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      تراجع
                    </button>
                    <button 
                      id="new-cust-save"
                      disabled={!creditOverlay.newCust.name.trim()}
                      onClick={() => {
                        if (onAddDebtCustomer) {
                          onAddDebtCustomer({
                            id: crypto.randomUUID(),
                            name: creditOverlay.newCust.name.trim(),
                            phone: creditOverlay.newCust.phone.trim(),
                            addedAt: Date.now()
                          });
                        }
                        handleCheckout('آجل', creditOverlay.newCust.name.trim(), creditOverlay.newCust.partialPaid);
                      }}
                      className="flex-1 bg-blue-600 text-white py-5 rounded-[20px] font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-500 hover:scale-[1.02] transition-all disabled:opacity-30 disabled:grayscale"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className={`px-10 py-4 border-t flex justify-between items-center ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Aladdin POS Security</span>
              <span className="text-[9px] font-black text-amber-600">نظام الآجل يتطلب دقة في اختيار الأسماء</span>
            </div>
          </div>
        </div>
      )}

      {isCalcOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-[40px] shadow-2xl p-10 border border-white/10 animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-2xl">
                  <Calculator size={24} />
                </div>
                <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>حساب الباقي للعميل</h3>
              </div>
              <button onClick={() => setIsCalcOpen(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <p className="text-[10px] font-black text-gray-400 mb-1">إجمالي الفاتورة</p>
                <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{netAmount.toLocaleString()} <span className="text-sm">د.ل</span></p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 mr-1">المبلغ المستلم من العميل</label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0.00"
                  onKeyDown={handleInputEnterFocus}
                  value={receivedFromCustomer || ''}
                  onChange={(e) => setReceivedFromCustomer(parseFloat(e.target.value) || 0)}
                  className={`w-full px-6 py-5 rounded-[24px] border-2 border-transparent outline-none transition-all font-black text-2xl text-center ${isDarkMode ? 'bg-zinc-800 border-white/5 text-emerald-400 focus:border-emerald-500' : 'bg-white border-emerald-50 text-emerald-600 focus:border-emerald-500'}`}
                />
              </div>

              <div className={`p-6 rounded-3xl border text-center ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-widest">المبلغ المتبقي للعميل (الباقي)</p>
                <p className="text-5xl font-black text-emerald-600">
                  {changeDue.toLocaleString()} <span className="text-lg">د.ل</span>
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setPaidAmount(receivedFromCustomer);
                    setIsCalcOpen(false);
                    setTimeout(() => confirmBtnRef.current?.focus(), 10);
                  }}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-500 transition-all shadow-emerald-600/30"
                >
                  اعتماد المبلغ المستلم
                </button>
                <button 
                  onClick={() => setIsCalcOpen(false)}
                  className={`px-8 py-4 rounded-2xl font-black text-sm transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-400'}`}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* منطقة البحث والكمية المحدثة */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1" ref={dropdownRef}>
          <div className="relative z-20">
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Search className="text-emerald-600" size={24} />
            </div>
            <div className="absolute left-6 top-1/2 -translate-y-1/2">
              <Barcode className="text-gray-300" size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="ابحث باسم الكتاب أو امسح الباركود..."
              value={searchTerm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const trimmed = searchTerm.trim();
                  if (/^\d{1,3}$/.test(trimmed)) {
                    setNextQty(parseInt(trimmed));
                    setSearchTerm('');
                    return;
                  }
                  const barcodeMatch = trimmed ? books.find(b => b.barcode === trimmed && b.quantity > 0) : undefined;
                  if (barcodeMatch) { addToCart(barcodeMatch); return; }
                  if (showDropdown && searchResults[selectedIndex]) { addToCart(searchResults[selectedIndex]); return; }
                  if (cart.length > 0) confirmBtnRef.current?.focus();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (searchResults.length > 0) setSelectedIndex(prev => (prev + 1) % searchResults.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (searchResults.length > 0) setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
                } else if (e.key === 'Escape') { setShowDropdown(false); }
              }}
              onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className={`w-full pr-16 pl-16 py-5 rounded-[24px] border-2 border-transparent outline-none transition-all font-bold text-lg ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-zinc-600 shadow-none' : 'bg-white border-emerald-100 text-emerald-900 focus:border-gray-300 shadow-xl shadow-emerald-50/50'}`}
            />
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div className={`absolute top-full left-0 right-0 mt-2 rounded-[24px] shadow-2xl z-50 overflow-hidden animate-in fade-in duration-200 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
              <div ref={resultsContainerRef} className="overflow-y-auto overflow-x-hidden max-h-[32rem] custom-scrollbar scroll-smooth scroll-py-2">
                {searchResults.map((book, index) => (
                  <div 
                    key={book.id}
                    onClick={() => addToCart(book)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center gap-4 p-6 cursor-pointer transition-all duration-300 ${
                      selectedIndex === index ? (isDarkMode ? 'bg-white/10 border-r-4 border-emerald-500 scale-[1.01]' : 'bg-emerald-50 border-r-4 border-emerald-500 scale-[1.01]') : 'border-r-4 border-transparent'
                    }`}
                  >
                    {book.image && (
                      <div className={`w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm transition-transform duration-300 ${selectedIndex === index ? 'scale-110' : ''} ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                        <img src={book.image} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 text-right min-w-0">
                      <h4 className={`font-bold text-base truncate transition-colors duration-300 ${selectedIndex === index ? 'text-emerald-500' : (isDarkMode ? 'text-white' : 'text-emerald-900')}`}>{book.title}</h4>
                      <p className="text-gray-400 text-xs font-medium truncate flex items-center gap-2">
                        {book.author}
                        {Number(book.packingCount) > 1 && (
                          <span className="bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md text-[9px] font-black">
                             عبوة {book.packingCount}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <div className="text-emerald-600 font-black text-sm">{book.price.toLocaleString()} د.ل</div>
                      <div className="text-gray-300 text-[10px]">متاح: {book.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* حقل الكمية والعبوة الافتراضية */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-3xl border transition-all shrink-0 shadow-sm ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-emerald-50'}`}>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-emerald-600 mb-0.5 uppercase tracking-tighter">الكمية</span>
            <input 
              type="number" 
              min="1"
              value={nextQty} 
              onChange={(e) => setNextQty(Math.max(1, parseInt(e.target.value) || 1))}
              className={`w-14 bg-transparent text-center font-black text-lg outline-none ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}
            />
          </div>
          <div className="h-10 w-px bg-gray-100 dark:bg-white/5 mx-1" />
          <button 
            onClick={() => setUseDefaultPack(!useDefaultPack)}
            title="المسافة للتبديل السريع"
            className={`flex flex-col items-center px-3 py-1.5 rounded-2xl transition-all border-2 ${useDefaultPack ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-105' : 'border-transparent text-gray-400 hover:bg-emerald-50 dark:hover:bg-white/5'}`}
          >
            <span className="text-[7px] font-black uppercase mb-0.5 whitespace-nowrap">عبوة افتراضية</span>
            <Package size={18} />
          </button>
        </div>

        <button 
          onClick={() => lastInvoices.length > 0 && handlePrint(lastInvoices[0])}
          disabled={lastInvoices.length === 0}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-all disabled:opacity-30 disabled:grayscale ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-900'}`}
        >
          <Printer size={20} />
          طباعة آخر فاتورة
        </button>

        <div className="relative" ref={invoicesDropdownRef}>
          <button 
            onClick={() => setShowInvoicesDropdown(!showInvoicesDropdown)}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black shadow-sm transition-all border border-transparent ${isDarkMode ? 'bg-zinc-800 text-emerald-400 border-white/5 hover:bg-zinc-700' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}
          >
            <History size={20} />
            الفواتير الأخيرة
            <ChevronDown size={16} className={`transition-transform ${showInvoicesDropdown ? 'rotate-180' : ''} text-emerald-500`} />
          </button>
          
          {showInvoicesDropdown && (
            <div className={`absolute top-full left-0 mt-2 w-80 rounded-2xl shadow-2xl border border-transparent overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className={`px-4 py-3 border-b font-black text-xs ${isDarkMode ? 'bg-black text-emerald-400 border-white/5' : 'bg-gray-50 text-emerald-900 border-gray-100'}`}>أرشيف العمليات الأخيرة (اليوم)</div>
              <div className={`p-2 border-b ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text"
                    placeholder="رقم الفاتورة أو الباركود..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className={`w-full pr-9 pl-3 py-1.5 rounded-lg border border-transparent outline-none font-bold text-xs transition-all ${isDarkMode ? 'bg-zinc-900 focus:border-emerald-500 text-white' : 'bg-white focus:border-emerald-500 text-emerald-900 border-gray-200 shadow-inner'}`}
                  />
                  {invoiceSearchQuery && (
                    <button onClick={() => setInvoiceSearchQuery('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {lastInvoices.length > 0 ? lastInvoices.map((inv) => (
                  <div 
                    key={inv.id} 
                    className={`p-4 border-b transition-colors cursor-pointer group flex items-center justify-between ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-emerald-50'} ${inv.isReturn ? (isDarkMode ? 'bg-red-500/10' : 'bg-red-50/30') : (inv.paymentType === 'آجل' ? (isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50/30') : '')}`}
                    onClick={() => loadInvoiceItems(inv)}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-black text-sm ${inv.isReturn ? 'text-red-500' : (inv.paymentType === 'آجل' ? 'text-amber-500' : (isDarkMode ? 'text-emerald-400' : 'text-emerald-700'))}`}>
                          {inv.isReturn ? 'مردودات نقدية' : (inv.paymentType === 'آجل' ? `مبيعات بالاجل #${inv.invoiceNumber}` : `مبيعات نقدية #${inv.invoiceNumber}`)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">{new Date(inv.timestamp).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', hour12: true, numberingSystem: 'latn'})}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-bold">{Math.abs(inv.items.length)} أصناف</span>
                        <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{Math.abs(inv.netAmount).toLocaleString()} د.ل</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePrint(inv); }}
                      className={`mr-2 p-2 rounded-xl transition-all shadow-sm border border-transparent ${isDarkMode ? 'bg-zinc-800 text-emerald-400 border-white/5 hover:bg-emerald-500 hover:text-white' : 'bg-white text-emerald-600 border-emerald-50 hover:bg-emerald-600 hover:text-white'}`}
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                )) : (
                  <div className="p-8 text-center text-gray-400 text-xs font-bold">لا توجد عمليات مسجلة لهذا اليوم</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className={`flex-1 rounded-[40px] border shadow-sm overflow-hidden flex flex-col min-h-0 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className={`px-8 py-5 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-emerald-50/20 border-gray-50'}`}>
            <div className="flex items-center gap-3">
              <ShoppingCart className="text-emerald-600" size={22} />
              <h3 className={`text-lg font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>
                {editingInvoiceId ? `تعديل فاتورة رقم #${salesHistory.find(s => s.id === editingInvoiceId)?.invoiceNumber}` : 'قائمة الطلبات'}
              </h3>
            </div>
            {editingInvoiceId && (
              <button 
                onClick={() => { setEditingInvoiceId(null); setLoadedInvoiceStatus(null); setCart([]); setDiscountPercent(0); setCustomer('عام'); }}
                className="text-[10px] font-black text-red-500 hover:underline flex items-center gap-1"
              >
                <X size={12} /> إلغاء التعديل
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-right border-collapse">
              <thead className={`sticky top-0 z-10 shadow-sm ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
                <tr className={`border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                  <th className={`px-2 py-4 font-black text-[10px] uppercase w-[40px] text-center ${isDarkMode ? 'text-zinc-500' : 'text-emerald-600'}`}>ر.م</th>
                  <th className={`px-6 py-4 font-black text-[10px] uppercase w-[35%] text-right ${isDarkMode ? 'text-zinc-500' : 'text-emerald-600'}`}>الكتاب</th>
                  <th className={`px-4 py-4 font-black text-[10px] uppercase text-center w-[12%] ${isDarkMode ? 'text-zinc-500' : 'text-emerald-600'}`}>السعر</th>
                  <th className={`px-4 py-4 font-black text-[10px] uppercase text-center w-[12%] ${isDarkMode ? 'text-zinc-500' : 'text-emerald-600'}`}>العبوة</th>
                  <th className={`px-4 py-4 font-black text-[10px] uppercase text-center w-[15%] ${isDarkMode ? 'text-zinc-500' : 'text-emerald-600'}`}>الكمية</th>
                  <th className={`px-4 py-4 font-black text-[10px] uppercase text-center w-[12%] ${isDarkMode ? 'text-zinc-500' : 'text-emerald-600'}`}>الإجمالي</th>
                  <th className="px-6 py-4 w-[10%]"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
                {cart.length > 0 ? cart.map((item, index) => (
                  <tr key={item.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-2 py-4 text-center text-gray-300 font-bold text-xs">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-5">
                        {item.image && (
                          <div className={`w-16 h-20 rounded-xl border border-transparent shadow-md overflow-hidden ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                            <img src={item.image} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <h5 className={`font-extrabold text-base truncate max-w-[200px] ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{item.title}</h5>
                          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-2">
                             {item.author}
                             {Number(item.packingCount) > 1 && (
                               <span className="text-[8px] bg-emerald-500/5 text-emerald-600 px-1 rounded-sm">
                                 {item.packingName} ({item.packingCount})
                               </span>
                             )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-center font-bold text-sm ${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}`}>{item.price.toLocaleString()}</td>
                    <td className={`px-4 py-4 text-center font-bold text-xs ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                      {(() => {
                        const unitPrice = books.find(b => b.id === item.id)?.price || 0;
                        const isPackPrice = Math.round(item.price) === Math.round(unitPrice * (item.packingCount || 1)) && (item.packingCount || 1) > 1;
                        const isFullQty = item.orderQty === item.packingCount && (item.packingCount || 0) > 1;
                        return (isPackPrice || isFullQty) ? (item.packingType || 'عبوة') : (item.packingName || 'قطعة');
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-2">
                        {(item.reorderAlertEnabled !== false) && (item.quantity - item.orderQty) < (item.reorderLimit || 5) && (
                          <span className="text-[9px] text-red-500 font-bold block text-center mb-1 animate-pulse">تبقى {Math.max(0, item.quantity - item.orderQty)} قطع</span>
                        )}
                        <div className={`flex items-center rounded-full px-1.5 py-1 shadow-inner border border-transparent ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-gray-100 border-gray-200/50'}`}>
                          <button onClick={() => adjustCartQty(item.id, 1)} className={`p-1.5 text-emerald-600 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white hover:shadow-md'}`}><Plus size={14} strokeWidth={3} /></button>
                          <span className={`px-4 font-black text-sm min-w-[32px] text-center ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{item.orderQty}</span>
                          <button onClick={() => adjustCartQty(item.id, -1)} className={`p-1.5 text-red-500 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-white hover:shadow-md'}`}><Minus size={14} strokeWidth={3} /></button>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-center font-black text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{(item.price * item.orderQty).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="py-24 text-center text-gray-200"><Barcode size={48} className="mx-auto mb-2 opacity-10" /><p className="font-bold">السلة فارغة</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`rounded-[32px] p-4 border shadow-lg flex flex-col md:flex-row gap-4 shrink-0 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex-1 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 mb-2 mr-1 flex items-center gap-1"><Wallet size={12} className="text-emerald-600"/> طريقة السداد</label>
                <div className="relative group">
                  <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} onKeyDown={handleInputEnterFocus} className={`w-full pr-4 pl-10 py-2 border border-transparent rounded-xl outline-none focus:border-emerald-500 font-black text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-emerald-900'}`}>
                    <option value="نقدي">نقدي</option><option value="بطاقة">بطاقة</option><option value="آجل">آجل</option>
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><Percent size={12} className="text-emerald-600"/> نسبة الخصم</label>
                <input type="number" value={discountPercent || ''} onKeyDown={handleInputEnterFocus} onChange={(e) => setDiscountPercent(Math.min(100, parseFloat(e.target.value) || 0))} className={`w-full px-4 py-2 border border-transparent rounded-xl outline-none focus:border-emerald-500 font-black text-sm ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-emerald-900'}`} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center pr-1">
                  <label className="text-[10px] font-black text-gray-400 flex items-center gap-1"><Banknote size={12} className="text-emerald-600"/> المدفوع</label>
                  <button 
                    onClick={() => {
                      setReceivedFromCustomer(0);
                      setIsCalcOpen(true);
                    }}
                    className="text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1 px-2"
                    title="حساب الباقي"
                  >
                    <Calculator size={12} />
                    <span className="text-[9px] font-black">حساب الباقي</span>
                  </button>
                </div>
                <input type="number" value={paidAmount || ''} onKeyDown={handleInputEnterFocus} onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} className={`w-full px-4 py-2 border border-transparent rounded-xl outline-none focus:border-emerald-500 font-black text-sm ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-emerald-900'}`} placeholder="0" />
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 mr-1 flex items-center gap-1"><User size={12} className="text-emerald-600"/> العميل</label>
                <div className="relative group">
                  <select 
                    id="customer-select-field"
                    value={customer} 
                    onChange={(e) => setCustomer(e.target.value)} 
                    onKeyDown={handleInputEnterFocus} 
                    className={`w-full pr-4 pl-10 py-2 border rounded-xl outline-none transition-all font-black text-sm appearance-none ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-emerald-900'} ${isCreditError ? 'border-red-500 ring-2 ring-red-500/20' : 'border-transparent focus:border-emerald-500'}`}
                  >
                    <option value="عام">عام </option>
                    {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isCreditError ? 'text-red-500' : 'text-emerald-500'}`} />
                </div>
              </div>
            </div>
          </div>
          <div className={`w-full md:w-[420px] rounded-2xl p-3 border border-transparent flex flex-col justify-between transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'} ${isCreditError ? 'ring-2 ring-red-500/20' : ''}`}>
            <div className={`grid grid-cols-2 gap-y-1 mb-2 pb-2 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
              <span className="text-[10px] font-bold text-gray-400">قيمة الخصم:</span><span className="text-left text-xs font-black text-red-500">{discountValue.toLocaleString()} د.ل</span>
              <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إجمالي الفاتورة:</span><span className={`text-left text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>{netAmount.toLocaleString()} د.ل</span>
            </div>
            <div className="flex gap-2">
               <button 
                  ref={confirmBtnRef}
                  onKeyDown={handleActionBtnKeyDown}
                  onClick={() => {
                    if (actionMode === 'credit') {
                      setPaymentType('آجل'); 
                      setCreditOverlay({ 
                        isOpen: true, 
                        step: 'options', 
                        activeIndex: 0, 
                        searchQuery: '', 
                        newCust: { name: '', phone: '', limit: 0, partialPaid: 0, partialType: 'نقدي' } 
                      });
                      return;
                    }
                    const isActionInvalid = cart.length === 0 || (actionMode === 'return' && !canProcessReturn);
                    if (isActionInvalid) return;
                    if (actionMode === 'sale') handleCheckout();
                    else handleProcessSmartReturn();
                  }}
                  className={`w-full py-4 rounded-xl font-black text-lg shadow-xl outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-center gap-3 ${
                    actionMode === 'sale'
                      ? (isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-900')
                      : (actionMode === 'credit'
                        ? 'bg-blue-600 hover:bg-blue-500'
                        : 'bg-red-600 hover:bg-red-500')
                  } ${
                    (cart.length === 0 || (actionMode === 'return' && !canProcessReturn)) 
                      ? 'opacity-40 cursor-not-allowed grayscale' 
                      : `hover:scale-[1.02] focus:scale-[1.03] focus:ring-4 ${
                        actionMode === 'sale' ? 'focus:ring-emerald-500/50' : 
                        actionMode === 'credit' ? 'focus:ring-blue-500/50' : 
                        'focus:ring-red-500/50'
                      }`
                  } text-white`}
               >
                 <div key={actionMode} className="flex items-center justify-center gap-3 animate-in fade-in duration-300">
                   {actionMode === 'sale' ? <CheckCircle2 size={24} /> : (actionMode === 'credit' ? <Wallet size={24} /> : <RotateCcw size={24} />)}
                   {isCreditError ? (
                     <span className="flex items-center gap-2 text-xs md:text-sm animate-pulse"><AlertTriangle size={16}/> اختر عميل أولاً</span>
                   ) : (
                     actionMode === 'sale' 
                       ? (editingInvoiceId ? (loadedInvoiceStatus === 'returned' ? 'الفاتورة مسترجعة' : 'تعديل والحفظ') : 'تأكيد وطباعة الفاتورة') 
                       : (actionMode === 'credit' 
                          ? (editingInvoiceId ? 'تعديل والحفظ (آجل)' : 'بيع بالآجل') 
                          : (canProcessReturn ? 'تأكيد عملية الإرجاع' : (cart.length === 0 ? 'السلة فارغة' : (loadedInvoiceStatus === 'returned' ? 'مسترجعة مسبقاً' : 'الآرجاع غير متاح'))))
                   )}
                 </div>
               </button>
            </div>
            {actionMode === 'return' && !canProcessReturn && cart.length > 0 && (
              <p className="text-[10px] text-red-500 font-black text-center mt-2 animate-pulse">
                {loadedInvoiceStatus === 'returned' ? 'تم تنفيذ الإرجاع لهذه الفاتورة مسبقاً' : 'لا يمكن إرجاع أصناف أكثر من المباع تاريخياً'}
              </p>
            )}
            {editingInvoiceId && cart.length > 0 && (
              <p className="text-[10px] text-emerald-500 font-black text-center mt-2">أنت تقوم بتعديل فاتورة حالية، سيتم تحديث السجلات آلياً</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;