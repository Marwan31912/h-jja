import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Book, SaleRecord } from '../types';
import { Receipt, Calendar, User, ChevronDown, ChevronUp, Package, DollarSign, Wallet, Percent, Banknote, RotateCcw, ShieldCheck, History, Trash2, Search, X, Printer, Barcode, Palette, Plus, Minus, CheckCircle2, ShoppingCart, Landmark } from 'lucide-react';
import { generateBarcodeDataURL } from '../src/utils/barcode';
import { getPrintBaseHead } from '../src/utils/printStyles';
import ConfirmModal from './ConfirmModal';
import { CandleIcon } from './Sidebar';

interface SalesHistoryProps {
  books: Book[];
  sales: SaleRecord[];
  onDelete?: (saleId: string) => void;
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

const SalesHistory: React.FC<SalesHistoryProps> = ({ books, sales, onDelete, isDarkMode }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // استعلام (Query) State
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [queryCart, setQueryCart] = useState<any[]>([]);
  const [querySearch, setQuerySearch] = useState('');
  const [querySupplier, setQuerySupplier] = useState('');
  const [queryRecipient, setQueryRecipient] = useState('');
  const [queryDiscountPercent, setQueryDiscountPercent] = useState(0);
  const [querySelectedIndex, setQuerySelectedIndex] = useState(0);
  const [showQueryDropdown, setShowQueryDropdown] = useState(false);
  const queryResultsRef = useRef<HTMLDivElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);

  // إعدادات الباركود في الطباعة
  const [printWithBarcode, setPrintWithBarcode] = useState(() => {
    const saved = localStorage.getItem('ALADDIN_PRINT_BARCODE');
    return saved === null ? true : saved === 'true';
  });

  // إعدادات لون الطباعة
  const [printColorMode, setPrintColorMode] = useState<'default' | 'black'>(() => {
    const saved = localStorage.getItem('ALADDIN_PRINT_COLOR_MODE');
    return (saved as 'default' | 'black') || 'default';
  });

  const togglePrintBarcode = (val: boolean) => {
    setPrintWithBarcode(val);
    localStorage.setItem('ALADDIN_PRINT_BARCODE', String(val));
  };

  const togglePrintColorMode = (mode: 'default' | 'black') => {
    setPrintColorMode(mode);
    localStorage.setItem('ALADDIN_PRINT_COLOR_MODE', mode);
  };

  const filteredSales = useMemo(() => {
    let result = [...sales];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(sale => 
        sale.invoiceNumber.toLowerCase().includes(term) ||
        (sale.barcodeNum && sale.barcodeNum.toLowerCase().includes(term))
      );
    }

    return result.sort((a, b) => {
      const dateDiff = b.timestamp - a.timestamp;
      if (dateDiff !== 0) return dateDiff;
      return (parseInt(b.invoiceNumber) || 0) - (parseInt(a.invoiceNumber) || 0);
    });
  }, [sales, searchTerm]);

  const querySearchResults = useMemo(() => {
    if (!querySearch.trim()) return [];
    return books.filter(b => 
      b.title.toLowerCase().includes(querySearch.toLowerCase()) || 
      (b.barcode && b.barcode.includes(querySearch))
    ).slice(0, 15);
  }, [querySearch, books]);

  const addToQueryCart = (book: Book) => {
    const existing = queryCart.find(item => item.id === book.id);
    if (existing) {
      setQueryCart(queryCart.map(item => item.id === book.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setQueryCart([...queryCart, { ...book, qty: 1 }]);
    }
    setQuerySearch('');
    setShowQueryDropdown(false);
    setQuerySelectedIndex(0);
    setTimeout(() => queryInputRef.current?.focus(), 10);
  };

  const adjustQueryQty = (id: string, delta: number) => {
    setQueryCart(queryCart.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };

  const removeFromQueryCart = (id: string) => {
    setQueryCart(queryCart.filter(item => item.id !== id));
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // التأكد من تمرير السكرول للعنصر النشط في البحث (نفس الكاصة)
  useEffect(() => {
    if (showQueryDropdown && queryResultsRef.current) {
      const activeItem = queryResultsRef.current.children[querySelectedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [querySelectedIndex, showQueryDropdown]);

  const handlePrint = (inv: SaleRecord) => {
    const startOfDay = new Date(inv.timestamp);
    startOfDay.setHours(0, 0, 0, 0);
    const dayStart = startOfDay.getTime();

    const endOfDay = new Date(inv.timestamp);
    endOfDay.setHours(23, 59, 59, 999);
    const dayEnd = endOfDay.getTime();

    const dayInvoices = sales
      .filter(s => s.timestamp >= dayStart && s.timestamp <= dayEnd)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const dailySeq = dayInvoices.findIndex(s => s.id === inv.id) + 1;
    const displayInvoiceNumber = dailySeq > 0 ? dailySeq.toString() : inv.invoiceNumber;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const isGeneral = !inv.customer || inv.customer === 'عام';
    const mainColor = '#10b981'; 
    const badgeText = inv.isReturn ? 'سند إرجاع مبيعات' : 'فاتورة مبيعات';
    const footerText = isGeneral ? 'شكراً لزيارتكم' : 'شكراً لتعاملكم معنا';

    // Fix: Calculate discount percentage for the print template
    const dPercent = inv.totalAmount !== 0 ? Math.round((Math.abs(inv.discountValue) / Math.abs(inv.totalAmount)) * 100) : 0;

    // التحقق من خيار الباركود واللون
    const shouldShowBarcode = printWithBarcode && inv.barcodeNum;
    const isBlackMode = printColorMode === 'black';
    const rawBlack = '#000000';

    let barcodeImageHtml = '';
    if (shouldShowBarcode && inv.barcodeNum) {
      const barcodeDataURL = generateBarcodeDataURL(inv.barcodeNum);
      barcodeImageHtml = `<img src="${barcodeDataURL}" style="max-width: 100%;" />`;
    }

    const itemsHtml = inv.items.map((item, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; text-align: center; ${isBlackMode ? `color: ${rawBlack};` : ''}">${index + 1}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 800; ${isBlackMode ? `color: ${rawBlack};` : ''}">${item.title || 'صنف غير مسمى'}</td>
        <td style="padding: 10px 8px; text-align: center; ${isBlackMode ? `color: ${rawBlack};` : ''}">${Math.abs(item.quantity)}</td>
        <td style="padding: 10px 8px; text-align: center; ${isBlackMode ? `color: ${rawBlack};` : ''}">${item.price.toLocaleString()}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 900; font-size: 15px; ${isBlackMode ? `color: ${rawBlack};` : ''}">${Math.abs(item.price * item.quantity).toLocaleString()}</td>
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
            .header p { margin: 5px 0 0; font-weight: 700; color: ${isBlackMode ? rawBlack : '#64748b'}; font-size: 14px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .info-item { font-size: 13px; ${isBlackMode ? `color: ${rawBlack};` : ''} }
            .info-label { font-weight: 900; color: ${isBlackMode ? rawBlack : '#1e293b'}; margin-left: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f1f5f9; color: ${isBlackMode ? rawBlack : '#475569'}; padding: 10px 8px; text-align: center; font-weight: 900; border-bottom: 2px solid #e2e8f0; font-size: 13px; }
            .summary { margin-top: 15px; padding: 12px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
            .summary-row:last-child { border-bottom: none; font-size: 18px; font-weight: 900; color: ${mainColor}; margin-top: 5px; }
            .tafqeet { margin-top: 15px; font-weight: 800; font-size: 13px; font-style: italic; color: #64748b; border-right: 4px solid ${mainColor}; padding-right: 15px; }
            .footer { margin-top: 40px; text-align: center; font-size: 14px; font-weight: 900; color: ${isBlackMode ? rawBlack : '#64748b'}; border-top: 1px solid #e2e8f0; padding-top: 15px; }
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

  const handlePrintQuery = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const mainColor = '#10b981'; 
    const badgeText = 'فاتورة شراء';
    const totalAmount = queryCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountValue = (totalAmount * queryDiscountPercent) / 100;
    const netAmount = totalAmount - discountValue;

    const isBlackMode = printColorMode === 'black';
    const rawBlack = '#000000';

    // استخدام إعداد الباركود المختار في النافذة
    const shouldShowBarcode = printWithBarcode;
    const tempBarcodeNum = Math.floor(10000000 + Math.random() * 90000000).toString();

    let barcodeImageHtml = '';
    if (shouldShowBarcode) {
      const barcodeDataURL = generateBarcodeDataURL(tempBarcodeNum);
      barcodeImageHtml = `<img src="${barcodeDataURL}" style="max-width: 100%;" />`;
    }

    const itemsHtml = queryCart.map((item, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; text-align: center; ${isBlackMode ? `color: ${rawBlack};` : ''}">${index + 1}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 800; ${isBlackMode ? `color: ${rawBlack};` : ''}">${item.title || 'صنف غير مسمى'}</td>
        <td style="padding: 10px 8px; text-align: center; ${isBlackMode ? `color: ${rawBlack};` : ''}">${item.qty}</td>
        <td style="padding: 10px 8px; text-align: center; ${isBlackMode ? `color: ${rawBlack};` : ''}">${item.price.toLocaleString()}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 900; font-size: 15px; ${isBlackMode ? `color: ${rawBlack};` : ''}">${(item.price * item.qty).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <title>مكتبة علاء الدين - استعلام شراء</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 40px; 
              color: #334155; 
              line-height: 1.6; 
              position: relative; 
              min-height: 100%;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 4px solid ${mainColor}; padding-bottom: 15px; }
            .header h1 { margin: 0; color: ${mainColor}; font-size: 30px; font-weight: 900; }
            .header p { margin: 5px 0 0; font-weight: 700; color: ${isBlackMode ? rawBlack : '#64748b'}; font-size: 14px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .info-item { font-size: 13px; ${isBlackMode ? `color: ${rawBlack};` : ''} }
            .info-label { font-weight: 900; color: ${isBlackMode ? rawBlack : '#1e293b'}; margin-left: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f1f5f9; color: ${isBlackMode ? rawBlack : '#475569'}; padding: 10px 8px; text-align: center; font-weight: 900; border-bottom: 2px solid #e2e8f0; font-size: 13px; }
            .summary { margin-top: 15px; padding: 12px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
            .summary-row:last-child { border-bottom: none; font-size: 18px; font-weight: 900; color: ${mainColor}; margin-top: 5px; }
            .tafqeet { margin-top: 15px; font-weight: 800; font-size: 13px; font-style: italic; color: #64748b; border-right: 4px solid ${mainColor}; padding-right: 15px; }
            .footer { margin-top: 40px; text-align: center; font-size: 14px; font-weight: 900; color: ${isBlackMode ? rawBlack : '#64748b'}; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            .barcode-container { position: absolute; bottom: 10px; left: 10px; display: ${shouldShowBarcode ? 'block' : 'none'}; }
            @media print { body { padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
          </style>
        </head>
        <body>
          <div class="content-wrapper" style="position: relative; min-height: 100%;">
            <div class="header">
              <h1>مكتبة علاء الدين</h1>
              <p>${badgeText}</p>
            </div>
            
            <div class="info-grid">
              <div class="info-item"><span class="info-label">المورد:</span> ${querySupplier || 'غير محدد'}</div>
              <div class="info-item"><span class="info-label">التاريخ:</span> ${new Date().toLocaleDateString('en-GB')}</div>
              <div class="info-item"><span class="info-label">المستلم:</span> ${queryRecipient || 'غير محدد'}</div>
              <div class="info-item"><span class="info-label">الوقت:</span> ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
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
                <span>${totalAmount.toLocaleString()} د.ل</span>
              </div>
              <div class="summary-row" style="color: #ef4444;">
                <span>الخصم : ${queryDiscountPercent}%</span>
                <span>-${discountValue.toLocaleString()} د.ل</span>
              </div>
              <div class="summary-row">
                <span>الاجمالي النهائي:</span>
                <span>${netAmount.toLocaleString()} د.ل</span>
              </div>
            </div>

            <div class="tafqeet">
              فقط: ${tafqeet(netAmount)}
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

  const getInvoiceStatus = (sale: SaleRecord) => {
    if (sale.isReturn) {
      return {
        label: 'فاتورة مرتجع',
        icon: <RotateCcw size={12} />,
        colors: isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'
      };
    }
    if (sale.paymentType === 'آجل') {
      return {
        label: 'فاتورة آجل',
        icon: <History size={12} />,
        colors: isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-100'
      };
    }
    if (sale.paymentType === 'تحصيل ديون') {
      return {
        label: 'سند سداد ديون',
        icon: <ShieldCheck size={12} />,
        colors: isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'
      };
    }
    return {
      label: 'فاتورة نقدي',
      icon: <CheckCircle2 size={12} />,
      colors: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
    };
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSaleToDelete(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (saleToDelete && onDelete) {
      onDelete(saleToDelete);
      setShowDeleteModal(false);
      setSaleToDelete(null);
    }
  };

  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500 text-right space-y-6" dir="rtl">
      
      {/* Search Header Card */}
      <div className={`p-6 rounded-[32px] border shadow-sm flex flex-col md:flex-row items-center gap-6 ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-4 shrink-0">
          <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
            <History size={24} />
          </div>
          <div>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>أرشيف العمليات</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">البحث برقم الفاتورة أو الباركود</p>
          </div>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
          <input 
            type="text"
            placeholder="أدخل رقم الفاتورة أو امسح باركود الفاتورة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pr-14 pl-14 py-4 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold transition-all shadow-inner ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-gray-200/50 hover:bg-red-500 hover:text-white text-gray-500 transition-all"
            >
              <X size={16} strokeWidth={3} />
            </button>
          )}
        </div>
        
        {/* زر تبديل الباركود واللون في الطباعة */}
        <div className={`flex items-center p-1.5 rounded-2xl shrink-0 ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}>
          <div className="flex items-center border-l border-gray-200 dark:border-white/10 ml-2 pl-2">
            <button 
              onClick={() => togglePrintColorMode('black')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${printColorMode === 'black' ? 'bg-zinc-950 text-white shadow-lg' : (isDarkMode ? 'text-zinc-500' : 'text-gray-400')}`}
            >
              <Palette size={14} /> أسود
            </button>
            <button 
              onClick={() => togglePrintColorMode('default')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${printColorMode === 'default' ? (isDarkMode ? 'bg-zinc-700 text-white shadow-lg' : 'bg-white text-gray-700 shadow-sm') : (isDarkMode ? 'text-zinc-500' : 'text-gray-400')}`}
            >
              شفاف
            </button>
          </div>

          <button 
            onClick={() => togglePrintBarcode(true)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${printWithBarcode ? 'bg-emerald-600 text-white shadow-lg' : (isDarkMode ? 'text-zinc-500' : 'text-gray-400')}`}
          >
            <Barcode size={14} /> باركود
          </button>
          <button 
            onClick={() => togglePrintBarcode(false)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${!printWithBarcode ? (isDarkMode ? 'bg-zinc-700 text-white shadow-lg' : 'bg-white text-gray-700 shadow-sm') : (isDarkMode ? 'text-zinc-500' : 'text-gray-400')}`}
          >
            بدون
          </button>
        </div>

        <div className={`px-5 py-3 rounded-2xl border text-xs font-black flex items-center gap-2 ${isDarkMode ? 'bg-black/20 text-emerald-400 border-white/5' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          <Landmark size={16} />
          {filteredSales.length} فاتورة
        </div>
      </div>

      {/* Main Table Card */}
      <div className={`rounded-[32px] overflow-hidden border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-emerald-50/50 border-emerald-100'}`}>
              <th className={`px-8 py-5 font-black text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>الرقم والنوع</th>
              <th className={`px-8 py-5 font-black text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>التاريخ والوقت</th>
              <th className={`px-8 py-5 font-black text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>العميل</th>
              <th className={`px-8 py-5 font-black text-sm text-center ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>الصافي</th>
              <th className={`px-8 py-5 font-black text-sm text-center ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>الإجراءات</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
            {filteredSales.length > 0 ? filteredSales.map((sale) => {
              const status = getInvoiceStatus(sale);
              return (
                <React.Fragment key={sale.id}>
                  <tr 
                    onClick={() => toggleExpand(sale.id)}
                    className={`transition-all cursor-pointer ${expandedId === sale.id ? (isDarkMode ? 'bg-white/5' : 'bg-emerald-50/40') : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-emerald-50/30')}`}
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shadow-sm border ${isDarkMode ? 'bg-zinc-800 border-white/5 text-emerald-400' : 'bg-white border-emerald-100 text-emerald-600'}`}>
                            <Receipt size={18} />
                          </div>
                          <span className={`font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{sale.invoiceNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border w-fit font-black text-[9px] ${status.colors}`}>
                            {status.icon}
                            {status.label}
                          </div>
                          {sale.barcodeNum && (
                            <div className="px-2 py-1 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20 text-gray-400 font-mono text-[9px]">
                              {sale.barcodeNum}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-500 font-bold text-xs">
                        <Calendar size={14} className="text-gray-300" />
                        {new Date(sale.timestamp).toLocaleString('ar-EG')}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-600 font-bold text-xs">
                        <User size={14} className="text-gray-400" />
                        {sale.customer || 'عام'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`${sale.isReturn ? 'text-red-500' : 'text-emerald-600'} font-black text-lg`}>
                        {sale.netAmount?.toLocaleString() || sale.totalAmount.toLocaleString()} <span className="text-[10px]">د.ل</span>
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePrint(sale); }}
                          className={`p-2 rounded-xl transition-all shadow-sm ${isDarkMode ? 'bg-zinc-700 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                          title="طباعة الفاتورة"
                        >
                          <Printer size={18} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(e, sale.id)}
                          className={`p-2 rounded-xl transition-all shadow-sm ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'}`}
                          title="حذف الفاتورة"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button className="text-emerald-500 hover:bg-emerald-100 p-2 rounded-lg transition-colors">
                          {expandedId === sale.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === sale.id && (
                    <tr>
                      <td colSpan={5} className={`px-12 py-8 border-b ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50/50 border-gray-100'}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Summary Details Card */}
                          <div className="lg:col-span-1 space-y-4">
                             <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-gray-100'}`}>
                                <h4 className={`font-black text-sm mb-4 border-b pb-2 ${isDarkMode ? 'text-white border-white/5' : 'text-emerald-900 border-gray-50'}`}>ملخص الفاتورة</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-400">الإجمالي:</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-emerald-900'}>{sale.totalAmount.toLocaleString()} د.ل</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-400">الخصم الممنوح:</span>
                                    <span className="text-red-500">-{sale.discountValue?.toLocaleString() || 0} د.ل</span>
                                  </div>
                                  <div className={`flex justify-between text-sm font-black pt-2 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}>
                                    <span className={isDarkMode ? 'text-white' : 'text-emerald-900'}>الصافي النهائي:</span>
                                    <span className={sale.isReturn ? 'text-red-500' : 'text-emerald-600'}>{sale.netAmount?.toLocaleString() || sale.totalAmount.toLocaleString()} د.ل</span>
                                  </div>
                                  <div className={`flex justify-between text-xs font-bold pt-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    <span className="text-gray-400">المبلغ المسدد:</span>
                                    <span>{sale.paidAmount?.toLocaleString() || 0} د.ل</span>
                                  </div>
                                </div>
                             </div>
                          </div>

                          {/* Items Table Card */}
                          <div className={`lg:col-span-2 rounded-2xl border overflow-hidden shadow-sm ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-gray-100'}`}>
                            <div className={`px-6 py-4 border-b font-black text-xs flex items-center gap-2 ${isDarkMode ? 'bg-black/20 border-white/5 text-emerald-400' : 'bg-emerald-50/20 border-gray-50 text-emerald-900'}`}>
                              <Package size={16} /> الأصناف المشمولة
                            </div>
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className={`text-gray-400 ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-50'}`}>
                                  <th className="px-6 py-3 font-black">اسم الصنف</th>
                                  <th className="px-4 py-3 font-black text-center">الكمية</th>
                                  <th className="px-4 py-3 font-black text-center">السعر</th>
                                  <th className="px-6 py-3 font-black text-center">الإجمالي</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
                                {sale.items.length > 0 ? sale.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{item.title}</td>
                                    <td className={`px-4 py-4 text-center font-black ${isDarkMode ? 'text-zinc-100' : ''}`}>{item.quantity}</td>
                                    <td className="px-4 py-4 text-center text-gray-500">{item.price.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-center font-black text-emerald-600">{(item.price * item.quantity).toLocaleString()}</td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan={4} className="py-4 text-center text-gray-400 font-bold">لا توجد بنود (سند دفع أو سداد)</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center opacity-20 text-gray-400">
                    <Receipt size={64} className="mb-4" />
                    <p className="text-xl font-bold">لا توجد فواتير مطابقة لبحثك</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* زر انشء استعلام في أسفل اليسار */}
      <div className="fixed bottom-10 left-10 z-[100]">
        <button 
          onClick={() => {
            setShowQueryModal(true);
            setTimeout(() => queryInputRef.current?.focus(), 100);
          }}
          className={`flex items-center gap-3 px-8 py-5 rounded-[26px] font-black text-lg shadow-2xl hover:scale-[1.05] active:scale-[0.95] transition-all ${isDarkMode ? 'bg-emerald-600 text-white shadow-emerald-900/40' : 'bg-emerald-900 text-white shadow-emerald-900/40'}`}
        >
          <Plus size={24} strokeWidth={3} />
          انشء استعلام
        </button>
      </div>

      {/* نافذة انشاء استعلام */}
      {showQueryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" dir="rtl">
           <div 
             className={`relative w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col border-none outline-none ${isDarkMode ? 'bg-zinc-950' : 'bg-white'}`}
             style={{ border: 'none', outline: 'none' }}
           >
              <div 
                className={`px-10 border-b flex justify-between items-center pb-8 pt-[33px] -mt-[1px] ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>انشء استعلام شراء</h3>
                    <p className="text-xs text-gray-400 font-bold">اجمع بنود المشتريات للاستعلام عنها</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* زر تبديل الباركود داخل نافذة الاستعلام */}
                  <div className={`flex items-center p-1 rounded-xl shrink-0 ${isDarkMode ? 'bg-black/40' : 'bg-gray-100'}`}>
                    <button 
                      onClick={() => togglePrintBarcode(true)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 ${printWithBarcode ? 'bg-emerald-600 text-white shadow-md' : (isDarkMode ? 'text-zinc-500' : 'text-gray-400')}`}
                    >
                      <Barcode size={12} /> باركود
                    </button>
                    <button 
                      onClick={() => togglePrintBarcode(false)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${!printWithBarcode ? (isDarkMode ? 'bg-zinc-700 text-white shadow-md' : 'bg-white text-gray-600') : (isDarkMode ? 'text-zinc-500' : 'text-gray-400')}`}
                    >
                      بدون
                    </button>
                  </div>

                  <button onClick={() => setShowQueryModal(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={32} /></button>
                </div>
              </div>

              <div className="flex-1 p-10 flex flex-col md:flex-row gap-10 overflow-hidden">
                {/* الجانب الأيمن: البحث والإدخال */}
                <div className="flex-1 flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">المورد</label>
                      <input type="text" placeholder="اسم جهة التوريد..." value={querySupplier} onChange={(e) => setQuerySupplier(e.target.value)} className={`w-full px-5 py-3.5 rounded-2xl border-2 border-transparent outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-900 text-white focus:border-emerald-500' : 'bg-gray-50 text-emerald-900 focus:border-emerald-500'}`} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">المستلم</label>
                      <input type="text" placeholder="اسم الشخص المستلم..." value={queryRecipient} onChange={(e) => setQueryRecipient(e.target.value)} className={`w-full px-5 py-3.5 rounded-2xl border-2 border-transparent outline-none font-bold text-sm ${isDarkMode ? 'bg-zinc-900 text-white focus:border-emerald-500' : 'bg-gray-50 text-emerald-900 focus:border-emerald-500'}`} />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1 mb-1.5 block">ابحث عن الصنف لإضافته</label>
                    <div className="relative">
                      <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                      <input 
                        ref={queryInputRef}
                        type="text" 
                        value={querySearch}
                        onFocus={() => setShowQueryDropdown(true)}
                        onChange={(e) => {
                          setQuerySearch(e.target.value);
                          setShowQueryDropdown(true);
                          setQuerySelectedIndex(0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = querySearch.trim();
                            // البحث عن باركود مطابق تماماً (نفس منطق الكاصة)
                            const barcodeMatch = trimmed ? books.find(b => b.barcode === trimmed && b.quantity > 0) : undefined;
                            if (barcodeMatch) {
                              addToQueryCart(barcodeMatch);
                              return;
                            }
                            // إذا لم يكن باركود، نختار العنصر المحدد من القائمة المنسدلة
                            if (showQueryDropdown && querySearchResults[querySelectedIndex]) {
                              addToQueryCart(querySearchResults[querySelectedIndex]);
                            }
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (querySearchResults.length > 0) setQuerySelectedIndex(prev => (prev + 1) % querySearchResults.length);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (querySearchResults.length > 0) setQuerySelectedIndex(prev => (prev - 1 + querySearchResults.length) % querySearchResults.length);
                          } else if (e.key === 'Escape') {
                            setShowQueryDropdown(false);
                          }
                        }}
                        placeholder="ابحث باسم الكتاب أو امسح الباركود..."
                        className={`w-full pr-14 pl-6 py-4 rounded-2xl border-2 border-transparent outline-none font-bold ${isDarkMode ? 'bg-zinc-900 text-white focus:border-emerald-500' : 'bg-gray-50 text-emerald-900 focus:border-emerald-500 shadow-inner'}`}
                      />
                      <Barcode className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    </div>
                    {showQueryDropdown && querySearchResults.length > 0 && (
                      <div className={`absolute top-full left-0 right-0 mt-2 rounded-[24px] shadow-2xl z-50 overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                        <div ref={queryResultsRef} className="overflow-y-auto max-h-60 custom-scrollbar scroll-smooth">
                          {querySearchResults.map((book, idx) => (
                            <div 
                              key={book.id}
                              onClick={() => addToQueryCart(book)}
                              onMouseEnter={() => setQuerySelectedIndex(idx)}
                              className={`flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 ${querySelectedIndex === idx ? (isDarkMode ? 'bg-white/10 border-r-4 border-emerald-500 scale-[1.01]' : 'bg-emerald-50 border-r-4 border-emerald-500 scale-[1.01]') : 'border-r-4 border-transparent'}`}
                            >
                              {book.image && (
                                <div className="w-8 h-10 rounded shadow-sm overflow-hidden flex-shrink-0 bg-gray-100">
                                  <img src={book.image} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 text-right truncate">
                                <p className={`font-black text-sm truncate ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{book.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold truncate">{book.author || book.barcode}</p>
                              </div>
                              <span className="font-black text-emerald-600 text-xs shrink-0">{book.price.toLocaleString()} d.l</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 rounded-[32px] border overflow-hidden flex flex-col ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50/50 border-gray-100 shadow-inner'}`}>
                    <div className="px-6 py-3 border-b font-black text-xs text-gray-400 uppercase">الأصناف المجمعة ({queryCart.length})</div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                       {queryCart.length > 0 ? queryCart.map((item) => (
                         <div key={item.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
                           <div className="flex-1">
                              <p className={`font-black text-sm truncate max-w-[150px] ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>{item.title}</p>
                              <p className="text-[10px] font-black text-emerald-600">{item.price} d.l</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <div className={`flex items-center rounded-full px-1.5 py-1 ${isDarkMode ? 'bg-black/40' : 'bg-gray-100'}`}>
                                <button onClick={() => adjustQueryQty(item.id, 1)} className="p-1 text-emerald-600 hover:scale-110"><Plus size={14}/></button>
                                <span className="px-3 font-black text-sm">{item.qty}</span>
                                <button onClick={() => adjustQueryQty(item.id, -1)} className="p-1 text-red-500 hover:scale-110"><Minus size={14}/></button>
                              </div>
                              <button onClick={() => removeFromQueryCart(item.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                           </div>
                         </div>
                       )) : (
                         <div className="h-full flex flex-col items-center justify-center opacity-10 text-center">
                            <ShoppingCart size={80} />
                            <p className="font-black mt-4">لا توجد أصناف في الاستعلام</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                {/* الجانب الأيسر: المعاينة والإجراء */}
                <div className="w-full md:w-80 flex flex-col justify-between p-8 rounded-[40px] border relative overflow-hidden bg-emerald-900 text-white shadow-xl shadow-emerald-900/30 shrink-0">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">إجمالي الاستعلام</p>
                    <h4 className="text-4xl font-black mb-10">{queryCart.reduce((s, i) => s + (i.price * i.qty), 0).toLocaleString()} <span className="text-xs font-bold opacity-40">د.ل</span></h4>
                    
                    <div className="space-y-4 mb-10">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mr-1 flex items-center gap-2"><Percent size={12} /> نسبة الخصم</label>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          value={queryDiscountPercent || ''} 
                          onChange={(e) => setQueryDiscountPercent(Math.min(100, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white/10 border-2 border-transparent focus:border-white/30 rounded-2xl px-5 py-3.5 outline-none font-black text-sm text-white placeholder:text-white/30"
                          placeholder="0 %"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/10">
                       <div className="flex justify-between items-center text-xs font-bold opacity-80">
                         <span>عدد البنود:</span>
                         <span>{queryCart.length} أصناف</span>
                       </div>
                       <div className="flex justify-between items-center text-xs font-bold opacity-80">
                         <span>إجمالي القطع:</span>
                         <span>{queryCart.reduce((s, i) => s + i.qty, 0)} قطعة</span>
                       </div>
                    </div>
                  </div>

                  <button 
                    disabled={queryCart.length === 0}
                    onClick={handlePrintQuery}
                    className="relative z-10 w-full py-5 rounded-3xl bg-white text-emerald-900 font-black text-xl shadow-2xl hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-3"
                  >
                    <Printer size={24} />
                    انشاء وطباعة
                  </button>

                  <div className="absolute -bottom-10 -left-10 rotate-12 opacity-5 pointer-events-none">
                    <History size={250} />
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showDeleteModal}
        title="تأكيد حذف الفاتورة"
        message="تحذير: حذف الفاتورة سيؤدي إلى حذف قيمتها من السجل المالي نهائياً، وإرجاع كافة الأصناف المشمولة فيها إلى المخزون. هل أنت متأكد؟"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

const CheckCircleIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default SalesHistory;

function handlePrintInvoice(inv: SaleRecord, shouldShowBarcode: boolean, tafqeet: (val: number) => string, mainColor: string, isActuallyPaid: boolean, isBlackMode: boolean, rawBlack: string, statusText: string, badgeText: string, itemsHtml: string, remaining: number) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) return;

  let barcodeImageHtml = '';
  if (shouldShowBarcode && inv.barcodeNum) {
    const barcodeDataURL = generateBarcodeDataURL(inv.barcodeNum);
    barcodeImageHtml = `<img src="${barcodeDataURL}" style="max-width: 100%;" />`;
  }

  const html = `
      <html dir="rtl" lang="ar">
        <head>
          ${getPrintBaseHead(`مكتبة علاء الدين - مديونية #${inv.invoiceNumber}`, `
            body { 
              font-family: 'Cairo', 'Almarai', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; 
              padding: 40px; 
              color: #334155; 
              line-height: 1.6; 
              position: relative; 
              min-height: 100%;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 4px solid ${mainColor}; padding-bottom: 15px; }
            .header h1 { margin: 0; color: ${mainColor}; font-size: 30px; font-weight: 900; }
            .status-banner { background: ${mainColor}; color: white; padding: 10px; border-radius: 12px; margin-bottom: 20px; text-align: center; font-weight: 900; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f1f5f9; color: #475569; padding: 10px 8px; text-align: center; font-weight: 900; border-bottom: 2px solid #e2e8f0; font-size: 13px; }
            .summary { margin-top: 15px; padding: 12px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
            .summary-row.total-due { border-bottom: none; font-size: 20px; font-weight: 900; color: ${isActuallyPaid ? '#10b981' : '#ef4444'}; margin-top: 5px; }
            .tafqeet { margin-top: 15px; font-weight: 800; font-size: 13px; font-style: italic; color: #64748b; border-right: 4px solid ${mainColor}; padding-right: 15px; }
            .footer { margin-top: 40px; text-align: center; font-size: 14px; font-weight: 900; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            .barcode-container { position: absolute; bottom: 10px; left: 10px; display: ${shouldShowBarcode ? 'block' : 'none'}; }
            @media print {
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `)}
        </head>
        <body>
          <div class="content-wrapper" style="position: relative; min-height: 100%;">
            <div class="header"><h1>مكتبة علاء الدين</h1><p>${badgeText}</p></div>
            <div class="status-banner">الحالة: ${statusText}</div>
            <div class="info-grid">
              <div class="info-item"><b>رقم الفاتورة:</b> #${inv.invoiceNumber}</div>
              <div class="info-item"><b>التاريخ:</b> ${new Date(inv.timestamp).toLocaleDateString('en-GB')}</div>
              <div class="info-item"><b>العميل:</b> ${inv.customer || 'عام'}</div>
              <div class="info-item"><b>وقت الطباعة:</b> ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
            </div>
            <table><thead><tr><th>ر.م</th><th style="text-align: right;">الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="summary">
              <div class="summary-row"><span>إجمالي القيمة:</span><span>${inv.totalAmount.toLocaleString()} د.ل</span></div>
              <div class="summary-row" style="color: #ef4444;"><span>الخصم:</span><span>-${inv.discountValue.toLocaleString()} د.ل</span></div>
              <div class="summary-row"><span>الصافي المطلوب:</span><span>${inv.netAmount.toLocaleString()} د.ل</span></div>
              <div class="summary-row" style="color: #10b981; font-weight: 800;"><span>إجمالي المدفوع:</span><span>${(inv.paidAmount || 0).toLocaleString()} د.ل</span></div>
              <div class="summary-row total-due"><span>المتبقي المستحق:</span><span>${remaining.toLocaleString()} د.ل</span></div>
            </div>
            <div class="tafqeet">فقط: ${tafqeet(inv.netAmount)}</div>
            <div class="footer">وثيقة ديون معتمدة - شكراً لتعاملكم معنا</div>
            
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
}
