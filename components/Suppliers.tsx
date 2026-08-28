import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, Customer, PurchaseInvoiceRecord, SaleRecord } from '../types';
import { Truck, Phone, MapPin, Globe, Plus, Trash2, Search, UserCheck, Pencil, Users, ChevronLeft, ArrowRight, UserPlus, Info, Receipt, Calendar, Package, ChevronDown, Wallet, TrendingUp, AlertTriangle, CheckCircle2, Printer, Timer, AlertOctagon, Landmark, ShieldAlert, User as UserIcon, X, Banknote, Calculator, Barcode } from 'lucide-react';
import { generateBarcodeDataURL } from '../src/utils/barcode';
import { getPrintBaseHead } from '../src/utils/printStyles';

interface SuppliersProps {
  suppliers: Supplier[];
  customers: Customer[];
  debtCustomers: Customer[];
  purchaseHistory: PurchaseInvoiceRecord[];
  salesHistory: SaleRecord[];
  onAddSupplier: (s: Supplier) => void;
  onUpdateSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onAddCustomer: (c: Customer) => void;
  onUpdateCustomer: (c: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onAddDebtCustomer: (c: Customer) => void;
  onUpdateDebtCustomer: (c: Customer) => void;
  onDeleteDebtCustomer: (id: string) => void;
  onSettleDebt: (saleId: string) => void;
  onUpdatePartialPayment?: (saleId: string, amount: number) => void;
  onDeleteSale: (saleId: string) => void;
  isDarkMode?: boolean;
}

type ViewState = 'menu' | 'suppliers' | 'customers' | 'debts' | 'supplier-details' | 'customer-details' | 'debt-details';

const tafqeet = (val: number): string => {
  let n = Math.round(val);
  if (n === 0) return "صفر دينار";
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعامائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانبائة", "تسعون مائة"];
  const thousands = ["", "ألف", "ألفان", "ثلاثة آلاف", "أربعة آلاف", "خمسة آلاف", "ستة آلاف", "سبعة آلاف", "ثمانية آلاف", "تسعة آلاف", "عشرة آلاف"];
  let result = "";
  if (n >= 1000) { const th = Math.floor(n / 1000); result += (th <= 10 ? thousands[th] : tafqeet(th) + " ألف") + " "; n %= 1000; }
  if (n >= 100) { result += (result ? "و " : "") + hundreds[Math.floor(n / 100)] + " "; n %= 100; }
  if (n > 0) {
    result += (result ? "و " : "");
    if (n < 20) { result += ones[n]; } else {
      const unit = n % 10; const ten = Math.floor(n / 10);
      if (unit > 0) result += ones[unit] + " و "; result += tens[ten];
    }
  }
  return `${result.trim()} دينار فقط لاغير`;
};

const Suppliers: React.FC<SuppliersProps> = ({ 
  suppliers, 
  customers, 
  debtCustomers,
  purchaseHistory,
  salesHistory,
  onAddSupplier, 
  onUpdateSupplier, 
  onDeleteSupplier,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddDebtCustomer,
  onUpdateDebtCustomer,
  onDeleteDebtCustomer,
  onSettleDebt,
  onUpdatePartialPayment,
  onDeleteSale,
  isDarkMode
}) => {
  const [view, setView] = useState<ViewState>('menu');
  const [menuIndex, setMenuIndex] = useState(0); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | Customer | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSale, setDeletingSale] = useState<SaleRecord | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialSale, setPartialSale] = useState<SaleRecord | null>(null);
  const [partialInput, setPartialInput] = useState<string>('');

  const [showDeleteCustomerConfirm, setShowDeleteCustomerConfirm] = useState(false);

  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    address: '',
    country: '', 
    notes: ''
  });

  useEffect(() => {
    if (view !== 'menu') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setMenuIndex(prev => (prev + 1) % 3);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setMenuIndex(prev => (prev - 1 + 3) % 3);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const views: ViewState[] = ['suppliers', 'customers', 'debts'];
        setView(views[menuIndex]);
        setSearchTerm('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, menuIndex]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const openAddForm = () => {
    setEditingItem(null);
    setFormState({ name: '', phone: '', address: '', country: '', notes: '' });
    setShowAddForm(true);
  };

  const openEditForm = (item: Supplier | Customer) => {
    setEditingItem(item);
    setFormState({
      name: item.name,
      phone: item.phone,
      address: item.address || '',
      country: (item as Supplier).country || '',
      notes: (item as Supplier).notes || ''
    });
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name) return;
    
    if (view === 'suppliers' || view === 'supplier-details') {
      if (editingItem) {
        onUpdateSupplier({ ...formState, id: editingItem.id } as Supplier);
      } else {
        onAddSupplier({ ...formState, id: crypto.randomUUID() } as Supplier);
      }
    } else if (view === 'customers' || view === 'customer-details') {
      if (editingItem) {
        onUpdateCustomer({ ...formState, id: editingItem.id, addedAt: (editingItem as Customer).addedAt } as Customer);
      } else {
        onAddCustomer({ id: crypto.randomUUID(), name: formState.name, phone: formState.phone, address: formState.address, addedAt: Date.now() });
      }
    } else {
      if (editingItem) {
        onUpdateDebtCustomer({ ...formState, id: editingItem.id, addedAt: (editingItem as Customer).addedAt } as Customer);
      } else {
        onAddDebtCustomer({ id: crypto.randomUUID(), name: formState.name, phone: formState.phone, address: formState.address, addedAt: Date.now() });
      }
    }
    
    setShowAddForm(false);
    setEditingItem(null);
  };

  const handleViewSupplier = (s: Supplier) => {
    setSelectedSupplier(s);
    setView('supplier-details');
  };

  const handleViewCustomer = (c: Customer, context: 'general' | 'debts') => {
    setSelectedCustomer(c);
    setView(context === 'debts' ? 'debt-details' : 'customer-details');
  };

  const handlePrintInvoice = (inv: SaleRecord) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const remaining = Math.max(0, Math.round(inv.netAmount - (inv.paidAmount || 0)));
    const isActuallyPaid = inv.isPaid || (remaining <= 0);
    const mainColor = isActuallyPaid ? '#10b981' : '#f59e0b'; 
    const statusText = isActuallyPaid ? 'تم التسديد (Settled)' : 'غير مسدد (Unpaid)';
    const badgeText = 'سند مديونية عميل';

    // جلب إعداد الباركود
    const savedPrintBarcode = localStorage.getItem('ALADDIN_PRINT_BARCODE');
    const shouldShowBarcode = (savedPrintBarcode === null ? true : savedPrintBarcode === 'true') && inv.barcodeNum;
    
    let barcodeImageHtml = '';
    if (shouldShowBarcode && inv.barcodeNum) {
      const barcodeDataURL = generateBarcodeDataURL(inv.barcodeNum);
      barcodeImageHtml = `<img src="${barcodeDataURL}" style="max-width: 100%;" />`;
    }

    const itemsHtml = inv.items.map((item, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 800;">${item.title || 'صنف غير مسمى'}</td>
        <td style="padding: 10px 8px; text-align: center;">${Math.abs(item.quantity)}</td>
        <td style="padding: 10px 8px; text-align: center;">${item.price.toLocaleString()}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 900; font-size: 15px;">${Math.abs(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          ${getPrintBaseHead(`مكتبة علاء الدين - مديونية #${inv.invoiceNumber}`, `
            body { 
              font-family: 'Cairo', 'Almarai', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; 
              padding: 40px; 
              color: #334155; 
              line-height: 1.6; 
              min-height: 100vh; 
              position: relative; 
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
            .barcode-container { position: absolute; bottom: 40px; left: 40px; text-align: center; display: ${shouldShowBarcode ? 'block' : 'none'}; }
            @media print {
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `)}
        </head>
        <body>
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

  const initiateDelete = (sale: SaleRecord) => {
    setDeletingSale(sale);
    if (!sale.isPaid) {
      setCountdown(5);
    } else {
      setCountdown(0);
    }
    setShowDeleteModal(true);
  };

  const confirmDeleteSale = () => {
    if (deletingSale) {
      onDeleteSale(deletingSale.id);
      setShowDeleteModal(false);
      setDeletingSale(null);
    }
  };

  const handleConfirmDeleteCustomer = () => {
    if (selectedCustomer) {
      if (view === 'customer-details') {
        onDeleteCustomer(selectedCustomer.id);
        setView('customers');
      } else {
        onDeleteDebtCustomer(selectedCustomer.id);
        setView('debts');
      }
      setShowDeleteCustomerConfirm(false);
      setSelectedCustomer(null);
    }
  };

  const customerDebts = useMemo(() => {
    if (!selectedCustomer) return [];
    return salesHistory.filter(sale => sale.customer === selectedCustomer.name && sale.paymentType === 'آجل');
  }, [selectedCustomer, salesHistory]);

  const supplierInvoices = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchaseHistory.filter(inv => inv.supplierId === selectedSupplier.id);
  }, [selectedSupplier, purchaseHistory]);

  const totalOutstandingBalance = useMemo(() => {
    return customerDebts
      .filter(sale => !sale.isPaid && Math.round(sale.netAmount - (sale.paidAmount || 0)) > 0)
      .reduce((sum, sale) => sum + (sale.netAmount - (sale.paidAmount || 0)), 0);
  }, [customerDebts]);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const debtorsList = useMemo(() => {
    return debtCustomers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
    );
  }, [debtCustomers, searchTerm]);

  const renderMenu = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto py-20 animate-in fade-in zoom-in-95 duration-500">
      <button 
        onClick={() => { setView('suppliers'); setSearchTerm(''); }}
        onMouseEnter={() => setMenuIndex(0)}
        className={`group p-10 rounded-[40px] border-2 shadow-xl hover:shadow-2xl transition-all flex flex-col items-center text-center ${isDarkMode ? 'bg-zinc-900' : 'bg-white'} ${menuIndex === 0 ? 'border-emerald-500 scale-[1.02]' : 'border-transparent'}`}
      >
        <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
          <Truck size={40} strokeWidth={1.5} />
        </div>
        <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إدارة الموردين</h3>
        <p className="text-gray-400 font-bold text-[10px] leading-relaxed mb-6">قائمة شركات التوزيع وجهات توريد الكتب.</p>
        <div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">فتح القائمة <ChevronLeft size={14} /></div>
      </button>

      <button 
        onClick={() => { setView('customers'); setSearchTerm(''); }}
        onMouseEnter={() => setMenuIndex(1)}
        className={`group p-10 rounded-[40px] border-2 shadow-xl hover:shadow-2xl transition-all flex flex-col items-center text-center ${isDarkMode ? 'bg-zinc-900' : 'bg-white'} ${menuIndex === 1 ? 'border-emerald-500 scale-[1.02]' : 'border-transparent'}`}
      >
        <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
          <Users size={40} strokeWidth={1.5} />
        </div>
        <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>إدارة العملاء</h3>
        <p className="text-gray-400 font-bold text-[10px] leading-relaxed mb-6">إدارة البيانات الشخصية والاشتراكات العامة.</p>
        <div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">فتح القائمة <ChevronLeft size={14} /></div>
      </button>

      <button 
        onClick={() => { setView('debts'); setSearchTerm(''); }}
        onMouseEnter={() => setMenuIndex(2)}
        className={`group p-10 rounded-[40px] border-2 shadow-xl hover:shadow-2xl transition-all flex flex-col items-center text-center ${isDarkMode ? 'bg-zinc-900' : 'bg-white'} ${menuIndex === 2 ? 'border-emerald-500 scale-[1.02]' : 'border-transparent'}`}
      >
        <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
          <Landmark size={40} strokeWidth={1.5} />
        </div>
        <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>قائمة الآجل</h3>
        <p className="text-gray-400 font-bold text-[10px] leading-relaxed mb-6">متابعة تحصيل الديون والعملاء المدينين.</p>
        <div className="mt-auto flex items-center gap-2 text-emerald-600 font-black text-xs">فتح سجل الديون <ChevronLeft size={14} /></div>
      </button>
    </div>
  );

  const renderSuppliers = () => (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <button onClick={() => setView('menu')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:text-emerald-400 hover:bg-zinc-700' : 'bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
          <ArrowRight size={20} className="rotate-180" /> الرجوع للخلف
        </button>
        <button onClick={openAddForm} className={`px-8 py-3 rounded-2xl font-black shadow-lg hover:scale-[1.05] transition-all flex items-center gap-2 ${isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-900 text-white'}`}>
          <Plus size={20} /> إضافة مورد
        </button>
      </div>
      <div className="relative shrink-0">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600/50" size={20} />
        <input
          type="text"
          placeholder="بحث عن مورد..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pr-12 pl-4 py-4 border rounded-2xl shadow-sm outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-emerald-500' : 'bg-white border-gray-100 text-emerald-900 focus:border-emerald-500'}`}
        />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredSuppliers.map((s) => (
            <div key={s.id} onClick={() => handleViewSupplier(s)} className={`p-5 rounded-[32px] border shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all group relative cursor-pointer flex flex-col h-full min-h-[220px] ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-emerald-500 text-white rounded-2xl"><Truck size={20} /></div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEditForm(s); }} className="text-gray-300 hover:text-emerald-600"><Pencil size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteSupplier(s.id); }} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
              <h4 className={`text-base font-black mb-4 truncate ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{s.name}</h4>
              <div className="space-y-2 text-[11px] font-bold text-gray-500">
                <div className="flex items-center gap-2"><Phone size={12} className="text-emerald-600"/>{s.phone || 'لم يتم ملء الهاتف'}</div>
                <div className="flex items-center gap-2"><Globe size={12} className="text-emerald-600"/>{s.country || 'لم يتم ملء البلد'}</div>
              </div>
              <div className={`mt-auto pt-4 border-t flex items-center justify-between font-bold text-[10px] ${isDarkMode ? 'border-white/5 text-emerald-400' : 'border-gray-50 text-emerald-600'}`}>
                <span>سجل المشتريات</span><ChevronLeft size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <button onClick={() => setView('menu')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:text-emerald-400 hover:bg-zinc-700' : 'bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
          <ArrowRight size={20} className="rotate-180" /> الرجوع للخلف
        </button>
        <button onClick={openAddForm} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:scale-[1.05] transition-all flex items-center gap-2">
          <UserPlus size={20} /> إضافة عميل
        </button>
      </div>
      <div className="relative shrink-0">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600/50" size={20} />
        <input
          type="text"
          placeholder="بحث عن عميل..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pr-12 pl-4 py-4 border rounded-2xl shadow-sm outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-emerald-500' : 'bg-white border-gray-100 text-emerald-900 focus:border-emerald-500'}`}
        />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCustomers.map((c) => (
            <div key={c.id} onClick={() => handleViewCustomer(c, 'general')} className={`p-5 rounded-[32px] border shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all group relative cursor-pointer flex flex-col h-full min-h-[180px] ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-emerald-500 text-white rounded-2xl"><Users size={20} /></div>
                <div className="flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); openEditForm(c); }} className="text-gray-300 hover:text-emerald-600"><Pencil size={18} /></button>
                   <button onClick={(e) => { e.stopPropagation(); onDeleteCustomer(c.id); }} className={`hover:text-red-500 transition-colors ${isDarkMode ? 'text-zinc-600' : 'text-gray-200'}`}><Trash2 size={18} /></button>
                </div>
              </div>
              <h4 className={`text-base font-black mb-4 truncate ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{c.name}</h4>
              <div className="space-y-2 text-[11px] font-bold text-gray-500">
                <div className="flex items-center gap-2"><Phone size={12} className="text-emerald-600"/>{c.phone || 'لم يتم ملء الهاتف'}</div>
              </div>
              <div className={`mt-auto pt-4 border-t flex items-center justify-between font-bold text-[10px] ${isDarkMode ? 'border-white/5 text-emerald-400' : 'border-gray-50 text-emerald-600'}`}>
                <span>بيانات العميل</span><ChevronLeft size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDebts = () => (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <button onClick={() => setView('menu')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:text-emerald-400 hover:bg-zinc-700' : 'bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
          <ArrowRight size={20} className="rotate-180" /> الرجوع للخلف
        </button>
        <div className="flex items-center gap-3">
           <Landmark size={24} className="text-emerald-500" />
           <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>العملاء المدينون (تاريخ الآجل)</h2>
        </div>
      </div>
      <div className="relative shrink-0">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/50" size={20} />
        <input
          type="text"
          placeholder="بحث في قائمة الديون..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pr-12 pl-4 py-4 border rounded-2xl shadow-sm outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white focus:border-emerald-500' : 'bg-white border-gray-100 text-emerald-900 focus:border-emerald-500'}`}
        />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {debtorsList.map((c) => {
             const currentDebt = salesHistory
                .filter(s => s.customer === c.name && s.paymentType === 'آجل' && !s.isPaid && (Math.round(s.netAmount - (s.paidAmount || 0)) > 0))
                .reduce((sum, s) => sum + (s.netAmount - (s.paidAmount || 0)), 0);
             
             return (
              <div key={c.id} onClick={() => handleViewCustomer(c, 'debts')} className={`p-6 rounded-[40px] border shadow-md hover:shadow-2xl hover:border-emerald-500 transition-all group relative cursor-pointer flex flex-col h-full min-h-[220px] ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 text-white rounded-2xl shadow-lg ${currentDebt > 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-emerald-50 shadow-emerald-500/20'}`}>
                    {currentDebt > 0 ? <Wallet size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div className={`text-[10px] font-black px-3 py-1 rounded-full ${currentDebt > 0 ? 'text-emerald-500 bg-emerald-50' : 'text-emerald-500 bg-emerald-50'}`}>
                    {currentDebt > 0 ? 'عليه مديونية' : 'مسدد بالكامل'}
                  </div>
                </div>
                <h4 className={`text-lg font-black mb-1 truncate ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{c.name}</h4>
                <p className="text-[11px] font-bold text-gray-400 mb-6">{c.phone || 'بدون هاتف'}</p>
                
                <div className={`mt-auto pt-6 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}>
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">المبلغ المطلوب</p>
                   <div className="flex justify-between items-end">
                      <span className={`text-2xl font-black ${currentDebt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{currentDebt.toLocaleString()} <span className="text-[10px]">د.ل</span></span>
                      <ChevronLeft size={16} className="text-emerald-500 group-hover:-translate-x-1 transition-transform" />
                   </div>
                </div>
              </div>
             );
          })}
        </div>
        {debtorsList.length === 0 && (
           <div className="py-40 text-center opacity-20 text-gray-400">
              <Landmark size={80} className="mx-auto mb-4" />
              <p className="text-2xl font-black">لا توجد سجلات ديون سابقة</p>
           </div>
        )}
      </div>
    </div>
  );

  const renderSupplierDetails = () => (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <button onClick={() => setView('suppliers')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:text-emerald-400 hover:bg-zinc-700' : 'bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
          <ArrowRight size={20} className="rotate-180" /> قائمة الموردين
        </button>
        <div className="text-right">
           <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedSupplier?.name}</h2>
           <p className="text-xs text-gray-400 font-bold">{selectedSupplier?.country || 'بدون بلد'}</p>
        </div>
      </div>
      <div className={`rounded-[32px] border shadow-sm overflow-hidden flex flex-col flex-1 ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className={`px-8 py-5 border-b flex items-center gap-3 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-emerald-50/20 border-gray-100'}`}>
           <Receipt size={20} className="text-emerald-600" /><h3 className={`font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>أرشيف فواتير التوريد</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {supplierInvoices.length > 0 ? (
            <table className="w-full text-right border-collapse">
              <thead className={`sticky top-0 shadow-sm ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
                <tr className="border-b text-gray-400 text-[10px] uppercase font-black">
                  <th className="px-8 py-4">رقم الفاتورة</th><th className="px-8 py-4">التاريخ</th><th className="px-8 py-4 text-center">الإجمالي</th><th className="px-8 py-4 w-20"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
                {supplierInvoices.map((inv) => (
                  <React.Fragment key={inv.id}>
                    <tr onClick={() => setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id)} className={`transition-all cursor-pointer ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-emerald-50/20'}`}>
                      <td className={`px-8 py-5 font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{inv.invoiceNumber}</td>
                      <td className="px-8 py-5 text-gray-500 font-bold text-xs">{new Date(inv.timestamp).toLocaleDateString('en-GB')}</td>
                      <td className="px-8 py-5 text-center font-black text-emerald-600">{inv.totalAmount.toLocaleString()} د.ل</td>
                      <td className="px-8 py-5 text-center"><ChevronLeft size={16} className={`text-emerald-500 transition-transform ${expandedInvoiceId === inv.id ? '-rotate-90' : ''}`} /></td>
                    </tr>
                    {expandedInvoiceId === inv.id && (
                      <tr><td colSpan={4} className="p-0 border-none"><div className="p-8 bg-gray-50 dark:bg-black/20 animate-in fade-in duration-300"><div className="rounded-2xl border bg-white dark:bg-zinc-800 p-4 shadow-inner"><table className="w-full text-xs"><thead><tr className="text-gray-400 border-b"><th>الكتاب</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>{inv.items.map((it, i) => (<tr key={i}><td>{it.title}</td><td className="text-center">{it.quantityAdded}</td><td className="text-center">{it.purchasePrice}</td><td className="text-center font-bold text-emerald-600">{it.purchasePrice * it.quantityAdded}</td></tr>))}</tbody></table></div></div></td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (<div className="py-20 text-center opacity-20 text-gray-400"><Receipt size={64} className="mx-auto mb-4" /><p className="text-xl font-bold">لا توجد سجلات</p></div>)}
        </div>
      </div>
    </div>
  );

  const renderCustomerDetails = () => (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 h-full flex flex-col max-w-4xl mx-auto">
      <div className="flex items-center justify-between shrink-0">
        <button onClick={() => setView('customers')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:text-emerald-400 hover:bg-zinc-700' : 'bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
          <ArrowRight size={20} className="rotate-180" /> قائمة العملاء
        </button>
      </div>

      <div className={`p-10 rounded-[48px] border shadow-xl flex flex-col md:flex-row gap-12 items-center text-right ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
         <div className={`w-40 h-40 rounded-[48px] flex items-center justify-center shrink-0 shadow-inner ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
            <UserIcon size={80} strokeWidth={1.5} />
         </div>
         <div className="flex-1 space-y-6 w-full">
            <div>
               <h2 className={`text-4xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedCustomer?.name}</h2>
               <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                  <Calendar size={16} />
                  <span>تاريخ الانضمام: {selectedCustomer ? new Date(selectedCustomer.addedAt).toLocaleDateString('ar-EG') : '-'}</span>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} className="text-emerald-500" /> رقم الهاتف</p>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-zinc-200' : 'text-emerald-950'}`}>{selectedCustomer?.phone || 'غير مسجل'}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} className="text-emerald-500" /> العنوان الشخصي</p>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-zinc-200' : 'text-emerald-950'}`}>{selectedCustomer?.address || 'غير محدد'}</p>
               </div>
            </div>
            
            <div className={`pt-8 border-t flex justify-end ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}>
               <button onClick={() => openEditForm(selectedCustomer!)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${isDarkMode ? 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                  <Pencil size={16} /> تعديل البيانات
               </button>
            </div>
         </div>
      </div>
    </div>
  );

  const renderDebtDetails = () => (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <button onClick={() => setView('debts')} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:text-emerald-400 hover:bg-zinc-700' : 'bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
          <ArrowRight size={20} className="rotate-180" /> قائمة الآجل
        </button>
        <div className="flex items-center gap-4">
           <button 
             disabled={totalOutstandingBalance > 0}
             onClick={() => setShowDeleteCustomerConfirm(true)}
             title={totalOutstandingBalance > 0 ? "لا يمكن حذف عميل عليه ديون معلقة" : "حذف ملف العميل بالكامل"}
             className={`p-2.5 rounded-xl transition-all flex items-center gap-2 font-black text-xs ${
               totalOutstandingBalance > 0 
                 ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-transparent' 
                 : (isDarkMode ? 'bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100')
             }`}
           >
             <Trash2 size={18} />
             حذف العميل
           </button>
           <div className="text-right">
              <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedCustomer?.name}</h2>
              <p className="text-xs text-gray-400 font-bold">ملف المديونية المالي</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
         <div className={`p-6 rounded-[32px] border shadow-sm relative overflow-hidden group ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
            <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">إجمالي الديون المستحقة</p>
            <h4 className={`text-3xl font-black ${totalOutstandingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{totalOutstandingBalance.toLocaleString()} <span className="text-xs">د.ل</span></h4><Wallet size={60} className="absolute -bottom-2 -left-2 opacity-5" />
         </div>
         <div className={`p-6 rounded-[32px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
            <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">عدد عمليات الآجل</p><h4 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{customerDebts.length}</h4>
         </div>
         <div className={`p-6 rounded-[32px] border shadow-sm flex items-center gap-4 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
            <TrendingUp size={32} className="text-emerald-600" /><div><p className="text-[10px] font-black text-emerald-700 mb-1">حالة الحساب</p><p className="text-sm font-black text-emerald-900">{totalOutstandingBalance > 0 ? 'نشط (عليه مديونية)' : 'لا توجد ديون معلقة'}</p></div>
         </div>
      </div>

      <div className={`rounded-[32px] border shadow-sm overflow-hidden flex flex-col flex-1 ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className={`px-8 py-5 border-b flex items-center gap-3 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-emerald-50/20 border-gray-100'}`}>
           <Receipt size={20} className="text-emerald-600" /><h3 className={`font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>سجل البيع بالآجل</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {customerDebts.length > 0 ? (
            <table className="w-full text-right border-collapse">
              <thead className={`sticky top-0 shadow-sm ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
                <tr className="border-b text-gray-400 text-[10px] uppercase font-black">
                  <th className="px-8 py-4">رقم الفاتورة</th><th className="px-8 py-4">التاريخ</th><th className="px-8 py-4 text-center">المبلغ المستحق</th><th className="px-8 py-4 text-center">الحالة</th><th className="px-8 py-4 w-[280px]"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
                {customerDebts.map((sale) => {
                  const remaining = sale.netAmount - (sale.paidAmount || 0);
                  const isActuallyPaid = sale.isPaid || (Math.round(remaining) <= 0);
                  
                  return (
                  <React.Fragment key={sale.id}>
                    <tr onClick={() => setExpandedInvoiceId(expandedInvoiceId === sale.id ? null : sale.id)} className={`transition-all cursor-pointer ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-emerald-50/20'}`}>
                      <td className={`px-8 py-5 font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>#{sale.invoiceNumber}</td><td className="px-8 py-5 text-gray-500 font-bold text-xs">{new Date(sale.timestamp).toLocaleDateString('en-GB')}</td><td className={`px-8 py-5 text-center font-black ${isActuallyPaid ? 'text-emerald-500' : 'text-red-500'}`}>{Math.max(0, Math.round(remaining)).toLocaleString()} <span className="text-[10px] font-bold">د.ل</span></td>
                      <td className="px-8 py-5 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black border ${isActuallyPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{isActuallyPaid ? 'مسدد' : 'غير مسدد'}</span></td>
                      <td className="px-8 py-5 text-center flex items-center justify-end gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handlePrintInvoice(sale); }} className={`p-2 rounded-xl transition-all shadow-md flex items-center gap-2 group ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white text-gray-400 border border-gray-100 hover:bg-emerald-50 hover:text-emerald-600'}`} title="طباعة السند"><Printer size={16} /></button>
                        
                        {!isActuallyPaid && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setPartialSale(sale);
                              setPartialInput('');
                              setShowPartialModal(true);
                            }} 
                            className={`p-2 rounded-xl transition-all shadow-md flex items-center gap-2 group ${isDarkMode ? 'bg-zinc-800 text-blue-400 hover:bg-zinc-700' : 'bg-white text-blue-400 border border-blue-50 hover:bg-blue-50 hover:text-blue-600'}`}
                            title="تعديل تم دفع (دفع جزئي)"
                          >
                            <Banknote size={16} />
                            <span className="text-[9px] font-black hidden group-hover:block">دفع جزئي</span>
                          </button>
                        )}

                        {!isActuallyPaid && (<button onClick={(e) => { e.stopPropagation(); onSettleDebt(sale.id); }} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl shadow-lg transition-all flex items-center gap-2 group" title="تسديد كامل الدين"><CheckCircle2 size={16} /><span className="text-[10px] font-black hidden group-hover:block">تسديد كامل</span></button>)}
                        
                        <button onClick={(e) => { e.stopPropagation(); initiateDelete(sale); }} className={`p-2 rounded-xl transition-all shadow-md flex items-center gap-2 group ${isDarkMode ? 'bg-zinc-800 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-white text-red-300 border border-red-50 hover:bg-red-50 hover:text-red-600'}`}><Trash2 size={16} /></button>
                        <ChevronLeft size={16} className={`text-emerald-500 transition-transform ${expandedInvoiceId === sale.id ? '-rotate-90' : ''}`} />
                      </td>
                    </tr>
                    {expandedInvoiceId === sale.id && (
                      <tr><td colSpan={5} className="p-0 border-none"><div className="p-8 bg-gray-50 dark:bg-black/20 animate-in fade-in duration-300"><div className="rounded-2xl border bg-white dark:bg-zinc-800 p-4 shadow-inner"><table className="w-full text-xs"><thead><tr className="text-gray-400 border-b"><th>الكتاب</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>{sale.items.map((it, i) => (<tr key={i}><td>{it.title}</td><td className="text-center">{it.quantity}</td><td className="text-center">{it.price}</td><td className="text-center font-bold text-emerald-600">{it.price * it.quantity}</td></tr>))}</tbody></table></div></div></td></tr>
                    )}
                  </React.Fragment>
                );})}
              </tbody>
            </table>
          ) : (<div className="py-20 text-center opacity-20 text-gray-400"><Receipt size={64} className="mx-auto mb-4" /><p className="text-xl font-bold">لا توجد ديون</p></div>)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full text-right" dir="rtl">
      {view === 'menu' && renderMenu()}
      {view === 'suppliers' && renderSuppliers()}
      {view === 'customers' && renderCustomers()}
      {view === 'debts' && renderDebts()}
      {view === 'supplier-details' && renderSupplierDetails()}
      {view === 'customer-details' && renderCustomerDetails()}
      {view === 'debt-details' && renderDebtDetails()}

      {showPartialModal && partialSale && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`relative w-full max-w-md rounded-[40px] shadow-2xl p-10 border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/20 text-blue-500 rounded-2xl">
                    <Calculator size={24} />
                  </div>
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تعديل تم دفع</h3>
                </div>
                <button onClick={() => setShowPartialModal(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50'}`}>
                    <p className="text-[9px] font-black text-gray-400 mb-1">المبلغ الإجمالي</p>
                    <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>{partialSale.netAmount.toLocaleString()} د.ل</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50'}`}>
                    <p className="text-[9px] font-black text-gray-400 mb-1">المدفوع سابقاً</p>
                    <p className="text-lg font-black text-emerald-600">{(partialSale.paidAmount || 0).toLocaleString()} د.ل</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 mr-1 uppercase tracking-widest">المبلغ الذي استلمه الآن</label>
                  <input 
                    type="number" 
                    autoFocus
                    placeholder="0.00"
                    value={partialInput}
                    onChange={(e) => setPartialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onUpdatePartialPayment && partialSale && (parseFloat(partialInput) > 0)) {
                        onUpdatePartialPayment(partialSale.id, parseFloat(partialInput) || 0);
                        setShowPartialModal(false);
                        setPartialSale(null);
                        setPartialInput('');
                      }
                    }}
                    className={`w-full px-6 py-5 rounded-[24px] border-2 border-transparent outline-none transition-all font-black text-2xl text-center ${isDarkMode ? 'bg-zinc-800 border-white/5 text-blue-400 focus:border-blue-500' : 'bg-white border-blue-50 text-blue-600 focus:border-blue-500'}`}
                  />
                </div>

                <div className={`p-5 rounded-3xl border text-center ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                  <p className="text-[10px] font-black text-blue-600 mb-1">المتبقي على العميل بعد الدفع</p>
                  <p className="text-3xl font-black text-blue-600">
                    {Math.max(0, Math.round(partialSale.netAmount - (partialSale.paidAmount || 0) - (parseFloat(partialInput) || 0))).toLocaleString()} <span className="text-sm">د.ل</span>
                  </p>
                </div>

                <button 
                  disabled={!onUpdatePartialPayment || !partialSale || !(parseFloat(partialInput) > 0)}
                  onClick={() => {
                    if (onUpdatePartialPayment && partialSale) {
                      onUpdatePartialPayment(partialSale.id, parseFloat(partialInput) || 0);
                      setShowPartialModal(false);
                      setPartialSale(null);
                      setPartialInput('');
                    }
                  }}
                  className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all ${
                    !onUpdatePartialPayment || !partialSale || !(parseFloat(partialInput) > 0)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-500'
                  }`}
                >
                  اعتماد الدفعة الحالية
                </button>
              </div>
           </div>
        </div>
      )}

      {showDeleteCustomerConfirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`relative w-full max-w-md rounded-[40px] shadow-2xl p-10 border text-center animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/10">
                 <ShieldAlert size={40} />
              </div>
              <h3 className={`text-2xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>حذف ملف العميل</h3>
              <p className="text-gray-400 font-bold text-sm mb-8 leading-relaxed">أنت على وشك حذف ملف <span className="text-red-500 font-black">"{selectedCustomer?.name}"</span> نهائياً. سيتم إزالة بياناته الشخصية من السجلات العامة.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleConfirmDeleteCustomer} className="w-full py-4 rounded-2xl font-black text-lg bg-red-600 text-white shadow-xl shadow-red-500/30 hover:bg-red-700 transition-all">تأكيد الحذف النهائي</button>
                 <button onClick={() => setShowDeleteCustomerConfirm(false)} className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-50 text-gray-400'}`}>إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`relative w-full max-w-md rounded-[40px] shadow-2xl p-10 border text-center animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${deletingSale?.isPaid ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-600 shadow-[0_0_30px_rgba(220,38,38,0.2)]'}`}>{deletingSale?.isPaid ? <AlertTriangle size={40} /> : <AlertOctagon size={40} className="animate-pulse" />}</div>
              <h3 className={`text-2xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تأكيد حذف الفاتورة</h3>
              {!deletingSale?.isPaid ? (
                <div className={`p-5 rounded-2xl mb-8 border-2 border-dashed ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                   <p className="text-red-600 font-black text-sm mb-2 flex items-center justify-center gap-2"><ShieldAlert size={16}/> تحذير أمني</p>
                   <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>هذا الدين لم يسدد بعد. حذف السجل سيؤدي لمسح المديونية نهائياً.</p>
                </div>
              ) : (<p className="text-gray-400 font-bold text-sm mb-8">أنت على وشك حذف فاتورة مسددة من الأرشيف.</p>)}
              <div className="flex flex-col gap-3">
                 <button disabled={countdown > 0} onClick={confirmDeleteSale} className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${countdown > 0 ? 'bg-gray-100 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30'}`}>{countdown > 0 ? (
                     <><Timer size={20} className="animate-spin" />يرجى الانتظار ({countdown}) ثوانٍ...</>
                   ) : (
                     <><Trash2 size={20} />نعم، احذف السجل</>
                   )}</button>
                 <button onClick={() => setShowDeleteModal(false)} className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-50 text-gray-400'}`}>إلغاء والتراجع</button>
              </div>
           </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <form onSubmit={handleSubmit} className={`relative w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-6 border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
            <div className="flex items-center gap-4 mb-2"><div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>{editingItem ? <Pencil size={32} /> : <UserPlus size={32} />}</div><h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{editingItem ? 'تعديل البيانات' : 'إضافة شخص جديد'}</h3></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-bold text-gray-400 mb-2 mr-1">الاسم</label><input required type="text" value={formState.name} onChange={(e) => setFormState({...formState, name: e.target.value})} className={`w-full px-5 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-gray-400 mb-2 mr-1">الهاتف</label><input type="text" value={formState.phone} onChange={(e) => setFormState({...formState, phone: e.target.value})} className={`w-full px-5 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} /></div>
                <div><label className="block text-sm font-bold text-gray-400 mb-2 mr-1">العنوان</label><input type="text" value={formState.address} onChange={(e) => setFormState({...formState, address: e.target.value})} className={`w-full px-5 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} /></div>
              </div>
            </div>
            <div className="flex gap-4 pt-4"><button type="submit" className={`flex-1 text-white py-5 rounded-3xl font-black shadow-xl transition-all bg-emerald-600 hover:bg-emerald-500`}>تأكيد الحفظ</button><button type="button" onClick={() => setShowAddForm(false)} className={`px-8 rounded-3xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-400'}`}>تراجع</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
