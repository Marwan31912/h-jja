import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Book, PurchaseItem, Supplier } from '../types';
import { Barcode, Plus, Trash2, Save, X, Truck, Hash, Calendar, ChevronDown, BookOpen, DollarSign, Package, TrendingUp, AlertTriangle, Maximize2, Search, Image as ImageIcon } from 'lucide-react';

interface PurchaseInvoiceProps {
  books: Book[];
  suppliers: Supplier[];
  onProcessPurchase: (supplierId: string, supplierName: string, invoiceNum: string, items: PurchaseItem[]) => void;
  onCancel: () => void;
  onNavigateToItemCard: (barcode: string) => void;
  isDarkMode?: boolean;
  initialBarcode?: string;
  zoomLevel?: number;
  onUpdateZoomLevel?: (level: number) => void;
}

const PurchaseInvoice: React.FC<PurchaseInvoiceProps> = ({ 
  books, 
  suppliers, 
  onProcessPurchase, 
  onCancel, 
  onNavigateToItemCard, 
  isDarkMode, 
  initialBarcode,
  zoomLevel = 1,
  onUpdateZoomLevel
}) => {
  const packingTypes = ["قطعة", "صندوق", "علبة", "طرف", "كيس", "باكو", "استيكة"];
  
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [showScaleMenu, setShowScaleMenu] = useState(false);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [currentEntry, setCurrentEntry] = useState({
    barcode: '', title: '', quantityAdded: 1, purchasePrice: 0, defaultPackPrice: 0,
    sellingPrice: 0, currentStock: 0, qtyUnit: 'قطعة', purchaseUnit: 'قطعة', saleUnit: 'قطعة'
  });

  const barcodeRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const purchasePriceRef = useRef<HTMLInputElement>(null);
  const defaultPackPriceRef = useRef<HTMLInputElement>(null);
  const sellingPriceRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const supplierRef = useRef<HTMLSelectElement>(null);
  const invoiceNumRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const createCardBtnRef = useRef<HTMLButtonElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const scale = zoomLevel || 1;
  const responsiveStyles: React.CSSProperties = {
    // @ts-expect-error - custom property
    '--invoice-scale': scale,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    fontSize: `clamp(15px, calc(1.125rem * var(--invoice-scale)), 20px)`,
  };

  const fluidPadding = (baseRem: number) => `clamp(8px, calc(${baseRem}rem * var(--invoice-scale)), ${baseRem}rem)`;
  const fluidGap = (baseRem: number) => `clamp(6px, calc(${baseRem}rem * var(--invoice-scale)), ${baseRem}rem)`;
  const fluidIcon = (basePx: number) => Math.max(16, basePx * scale);

  const filteredSearchBooks = useMemo(() => {
    const term = currentEntry.barcode.trim().toLowerCase();
    if (!term || /^\d+$/.test(term)) return [];
    return books.filter(b => 
      b.title.toLowerCase().includes(term) || 
      (b.barcode && b.barcode.toLowerCase().includes(term))
    ).slice(0, 15);
  }, [currentEntry.barcode, books]);

  useEffect(() => {
    if (showDropdown && resultsContainerRef.current) {
      const activeItem = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showDropdown]);

  useEffect(() => {
    if (initialBarcode) {
      const existingBook = books.find(b => b.barcode === initialBarcode || b.title === initialBarcode);
      if (existingBook) {
        const pCount = existingBook.packingCount || 1;
        const defaultUnit = existingBook.packingType || 'قطعة';
        setTimeout(() => {
          setCurrentEntry(prev => ({
            ...prev, barcode: existingBook.barcode || existingBook.title, title: existingBook.title, sellingPrice: existingBook.price,
            defaultPackPrice: existingBook.price * pCount, purchasePrice: existingBook.purchasePrice || 0,
            currentStock: existingBook.quantity, qtyUnit: defaultUnit, purchaseUnit: defaultUnit, saleUnit: defaultUnit
          }));
        }, 0);
        setTimeout(() => qtyRef.current?.focus(), 150);
      } else {
        setTimeout(() => {
          setCurrentEntry(prev => ({ ...prev, barcode: initialBarcode, title: initialBarcode }));
        }, 0);
        if (barcodeRef.current) barcodeRef.current.focus();
      }
    } else {
      if (barcodeRef.current) barcodeRef.current.focus();
    }
  }, [initialBarcode, books]);

  useEffect(() => {
    if (showNotFoundModal) setTimeout(() => createCardBtnRef.current?.focus(), 50);
  }, [showNotFoundModal]);

  const selectBook = (book: Book) => {
    const pCount = book.packingCount || 1;
    const defaultUnit = book.packingType || 'قطعة';
    setCurrentEntry(prev => ({
      ...prev, 
      barcode: book.barcode || book.title, 
      title: book.title, 
      sellingPrice: book.price,
      defaultPackPrice: book.price * pCount, 
      purchasePrice: book.purchasePrice || 0,
      currentStock: book.quantity, 
      qtyUnit: defaultUnit, 
      purchaseUnit: defaultUnit, 
      saleUnit: defaultUnit
    }));
    setShowDropdown(false);
    setTimeout(() => qtyRef.current?.focus(), 10);
  };

  useEffect(() => {
    const barcode = currentEntry.barcode.trim();
    if (barcode && /^\d+$/.test(barcode)) {
      const existingBook = books.find(b => b.barcode === barcode);
      if (existingBook) {
        const pCount = existingBook.packingCount || 1;
        const defaultUnit = existingBook.packingType || 'قطعة';
        setTimeout(() => {
          setCurrentEntry(prev => ({
            ...prev, title: existingBook.title, sellingPrice: existingBook.price,
            defaultPackPrice: existingBook.price * pCount, purchasePrice: existingBook.purchasePrice || 0,
            currentStock: existingBook.quantity, qtyUnit: defaultUnit, purchaseUnit: defaultUnit, saleUnit: defaultUnit
          }));
        }, 0);
      }
    }
  }, [currentEntry.barcode, books]);

  const handleSellingPriceChange = (val: number) => setCurrentEntry(prev => ({ ...prev, sellingPrice: val }));

  const handleUnitArrowKey = (e: React.KeyboardEvent, field: 'qtyUnit' | 'purchaseUnit' | 'saleUnit') => {
    if (!e.ctrlKey) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = packingTypes.indexOf(currentEntry[field]);
      const nextIndex = e.key === 'ArrowUp' ? (currentIndex - 1 + packingTypes.length) % packingTypes.length : (currentIndex + 1) % packingTypes.length;
      setCurrentEntry(prev => ({ ...prev, [field]: packingTypes[nextIndex] }));
    }
  };

  const addItemToInvoice = () => {
    if (!currentEntry.barcode || !currentEntry.title || currentEntry.quantityAdded <= 0) return;
    setInvoiceItems([...invoiceItems, { ...currentEntry }]);
    setCurrentEntry({ barcode: '', title: '', quantityAdded: 1, purchasePrice: 0, defaultPackPrice: 0, sellingPrice: 0, currentStock: 0, qtyUnit: 'قطعة', purchaseUnit: 'قطعة', saleUnit: 'قطعة' });
    setTimeout(() => barcodeRef.current?.focus(), 10);
  };

  const handleFinalProcess = () => {
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    const processedItems: PurchaseItem[] = invoiceItems.map(item => {
      const b = books.find(book => book.barcode === item.barcode);
      const packCount = b?.packingCount || 1;
      let finalQty = item.quantityAdded, finalPurchasePrice = item.purchasePrice, finalSellingPrice = item.sellingPrice;
      if (b && item.qtyUnit === b.packingType && packCount > 1) finalQty = item.quantityAdded * packCount;
      if (b && item.purchaseUnit === b.packingType && packCount > 1) finalPurchasePrice = item.purchasePrice / packCount;
      if (b && item.saleUnit === b.packingType && packCount > 1) finalSellingPrice = item.sellingPrice / packCount;
      return { barcode: item.barcode, title: item.title, quantityAdded: finalQty, purchasePrice: finalPurchasePrice, sellingPrice: finalSellingPrice, currentStock: item.currentStock };
    });
    onProcessPurchase(selectedSupplierId, supplier?.name || 'مورد عام', invoiceNumber.trim() || 'بدون رقم', processedItems);
  };

  return (
    <div style={responsiveStyles} className="animate-in fade-in duration-500 text-right overflow-hidden" dir="rtl">
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl"><Truck className="text-emerald-500" size={fluidIcon(24)} /></div>
          <h2 className={`font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`} style={{ fontSize: `clamp(16px, calc(1.375rem * var(--invoice-scale)), 26px)` }}>فاتورة توريد</h2>
        </div>
        <div className="relative">
          <button onClick={() => setShowScaleMenu(!showScaleMenu)} className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-black text-xs transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-emerald-400 hover:bg-zinc-700' : 'bg-white border-gray-100 text-emerald-600 shadow-sm'}`}>
            <Maximize2 size={14} /> مقياس الواجهة ({Math.round(scale * 100)}%)
          </button>
          {showScaleMenu && (
            <div className={`absolute top-full left-0 mt-2 w-40 rounded-2xl shadow-2xl border overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className="p-1 space-y-0.5">
                {[1.0, 0.8, 0.6, 0.4, 0.2, 0.1].map((val) => (
                  <button key={val} onClick={() => { onUpdateZoomLevel?.(val); setShowScaleMenu(false); }} className={`w-full px-4 py-2 rounded-xl text-right font-black text-[10px] transition-all ${scale === val ? 'bg-emerald-500 text-white' : (isDarkMode ? 'text-zinc-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50')}`}>
                    {Math.round(val * 100)}% {val === 1.0 && '(افتراضي)'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid for Inputs */}
      <div 
        className={`border shadow-xl mb-4 transition-all rounded-[32px] overflow-visible ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}
        style={{ padding: fluidPadding(1.5) }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end" style={{ gap: fluidGap(1.5) }}>
          
          <div className="sm:col-span-2 space-y-1.5 w-full relative">
            <label className="flex items-center gap-2 font-black text-gray-400 uppercase tracking-widest" style={{ fontSize: `clamp(13px, 0.875rem, 15px)` }}>
              <Barcode size={fluidIcon(14)} className="text-emerald-500" /> الباركود / الاسم التجاري
            </label>
            <div className="relative group z-20">
              <input ref={barcodeRef} type="text" placeholder="امسح أو أدخل الاسم..." value={currentEntry.barcode} style={{ height: `clamp(40px, calc(3.8rem * var(--invoice-scale)), 60px)`, padding: fluidPadding(0.8) }}
                onChange={(e) => {
                  setCurrentEntry({ ...currentEntry, barcode: e.target.value, title: '' });
                  setShowDropdown(true);
                  setSelectedIndex(0);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') { 
                    e.preventDefault(); 
                    if (showDropdown && filteredSearchBooks[selectedIndex]) {
                      selectBook(filteredSearchBooks[selectedIndex]);
                      return;
                    }
                    const barcodeMatch = books.find(b => b.barcode === currentEntry.barcode || b.title === currentEntry.barcode);
                    if (barcodeMatch || currentEntry.barcode === '') {
                      qtyRef.current?.focus(); 
                    } else {
                      setShowNotFoundModal(true); 
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (filteredSearchBooks.length > 0) setSelectedIndex(prev => (prev + 1) % filteredSearchBooks.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (filteredSearchBooks.length > 0) setSelectedIndex(prev => (prev - 1 + filteredSearchBooks.length) % filteredSearchBooks.length);
                  } else if (e.key === 'Escape') {
                    setShowDropdown(false);
                  }
                }}
                className={`w-full rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900 shadow-inner'}`} />
              {currentEntry.barcode && <button onClick={() => setCurrentEntry({...currentEntry, barcode: '', title: ''})} className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-gray-200/50 hover:bg-red-500 hover:text-white text-gray-500"><X size={14} /></button>}
            </div>

            {showDropdown && filteredSearchBooks.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in duration-200 border ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
                <div ref={resultsContainerRef} className="overflow-y-auto max-h-60 custom-scrollbar">
                  {filteredSearchBooks.map((book, index) => (
                    <div 
                      key={book.id}
                      onMouseDown={() => selectBook(book)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${selectedIndex === index ? (isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-50') : ''}`}
                    >
                      {book.image && (
                        <div className={`w-8 h-10 rounded border overflow-hidden flex-shrink-0 ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
                          <img src={book.image} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-xs truncate ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{book.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{book.barcode || 'بدون باركود'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5 w-full">
            <label className="flex items-center gap-2 font-black text-gray-400 uppercase tracking-widest" style={{ fontSize: `clamp(13px, 0.875rem, 15px)` }}>
              <Package size={fluidIcon(14)} className="text-emerald-500" /> الكمية
            </label>
            <div className="flex flex-col">
              <input ref={qtyRef} type="number" value={currentEntry.quantityAdded || ''} placeholder="0" style={{ padding: fluidPadding(0.6) }}
                onChange={(e) => setCurrentEntry(prev => ({ ...prev, quantityAdded: parseInt(e.target.value) || 0 }))}
                onKeyDown={(e) => { handleUnitArrowKey(e, 'qtyUnit'); if (e.key === 'Enter') { e.preventDefault(); purchasePriceRef.current?.focus(); } }}
                className={`w-full rounded-t-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-black text-center ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900 shadow-inner'}`} />
              <div className="relative">
                <select value={currentEntry.qtyUnit} onChange={(e) => setCurrentEntry(prev => ({ ...prev, qtyUnit: e.target.value }))} className={`w-full py-1 rounded-b-2xl border-2 border-t-0 border-transparent focus:border-emerald-500 outline-none font-bold text-[10px] appearance-none transition-all ${isDarkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-gray-200 text-gray-600'}`}>
                  {packingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 w-full">
            <label className="flex items-center gap-2 font-black text-gray-400 uppercase tracking-widest" style={{ fontSize: `clamp(13px, 0.875rem, 15px)` }}>
              <DollarSign size={fluidIcon(14)} className="text-blue-500" /> سعر الشراء
            </label>
            <div className="flex flex-col">
              <input ref={purchasePriceRef} type="number" value={currentEntry.purchasePrice || ''} placeholder="0.00" style={{ padding: fluidPadding(0.6) }}
                onChange={(e) => setCurrentEntry(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                onKeyDown={(e) => { handleUnitArrowKey(e, 'purchaseUnit'); if (e.key === 'Enter') { e.preventDefault(); sellingPriceRef.current?.focus(); } }}
                className={`w-full rounded-t-2xl border-2 border-transparent focus:border-blue-500 outline-none font-black text-center ${isDarkMode ? 'bg-zinc-800 text-blue-400' : 'bg-gray-50 text-blue-700 shadow-inner'}`} />
              <select value={currentEntry.purchaseUnit} onChange={(e) => setCurrentEntry(prev => ({ ...prev, purchaseUnit: e.target.value }))} className={`w-full py-1 rounded-b-2xl border-2 border-t-0 border-transparent focus:border-blue-500 outline-none font-bold text-[10px] appearance-none ${isDarkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-gray-200 text-gray-600'}`}>
                {packingTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 w-full">
            <label className="flex items-center gap-2 font-black text-gray-400 uppercase tracking-widest" style={{ fontSize: `clamp(13px, 0.875rem, 15px)` }}>
              <TrendingUp size={fluidIcon(14)} className="text-emerald-500" /> سعر البيع
            </label>
            <div className="flex flex-col">
              <input ref={sellingPriceRef} type="number" value={currentEntry.sellingPrice || ''} placeholder="0.00" style={{ padding: fluidPadding(0.6) }}
                onChange={(e) => handleSellingPriceChange(parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => { handleUnitArrowKey(e, 'saleUnit'); if (e.key === 'Enter') { e.preventDefault(); dateRef.current?.focus(); } }}
                className={`w-full rounded-t-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-black text-center ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-gray-50 text-emerald-700 shadow-inner'}`} />
              <select value={currentEntry.saleUnit} onChange={(e) => setCurrentEntry(prev => ({ ...prev, saleUnit: e.target.value }))} className={`w-full py-1 rounded-b-2xl border-2 border-t-0 border-transparent focus:border-emerald-500 outline-none font-bold text-[10px] appearance-none ${isDarkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-gray-200 text-gray-600'}`}>
                {packingTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 w-full">
            <label className="flex items-center gap-2 font-black text-gray-400 text-[11px]"><Calendar size={12} className="text-emerald-500" /> تاريخ الفاتورة</label>
            <input ref={dateRef} type="date" value={invoiceDate} style={{ padding: fluidPadding(0.75) }} onChange={(e) => setInvoiceDate(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); supplierRef.current?.focus(); } }}
              className={`w-full rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900 shadow-inner'}`} />
          </div>

          <div className="space-y-1.5 w-full">
            <label className="flex items-center gap-2 font-black text-gray-400 text-[11px]"><Truck size={12} className="text-emerald-500" /> المورد</label>
            <div className="relative">
              <select ref={supplierRef} value={selectedSupplierId} style={{ padding: fluidPadding(0.75), paddingLeft: '2.5rem' }} onChange={(e) => setSelectedSupplierId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); invoiceNumRef.current?.focus(); } }}
                className={`w-full rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold appearance-none cursor-pointer ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900 shadow-inner'}`}>
                <option value="">مورد عام</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 w-full">
            <label className="flex items-center gap-2 font-black text-gray-400 text-[11px]"><Hash size={12} className="text-emerald-500" /> رقم المستند</label>
            <input ref={invoiceNumRef} type="text" placeholder="رقم الفاتورة..." value={invoiceNumber} style={{ padding: fluidPadding(0.75) }} onChange={(e) => setInvoiceNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBtnRef.current?.focus(); } }}
              className={`w-full rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900 shadow-inner'}`} />
          </div>

          <div className="sm:col-span-full pt-4 flex justify-center">
             <button ref={addBtnRef} onClick={addItemToInvoice} style={{ padding: `${fluidPadding(0.8)} ${fluidPadding(3)}` }}
                className={`w-full rounded-[20px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white'}`}>
                <Plus size={fluidIcon(24)} strokeWidth={3} /> إضافة الصنف للقائمة
             </button>
          </div>
        </div>
      </div>

      {/* Items Table Section */}
      <div className={`flex-1 border shadow-2xl overflow-hidden flex flex-col min-h-0 transition-all rounded-[40px] ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className={`px-8 py-3.5 border-b font-black flex items-center justify-between ${isDarkMode ? 'bg-black/20 text-emerald-400 border-white/5' : 'bg-gray-50/50 text-emerald-900 border-gray-100'}`}>
          <div className="flex items-center gap-2"><BookOpen size={18} /> أصناف الفاتورة ({invoiceItems.length})</div>
          <div className="text-gray-400 text-[10px] font-black uppercase">المراجعة النهائية</div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-right border-collapse">
            <thead className={`sticky top-0 z-10 border-b ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
              <tr className="text-gray-400 uppercase font-black text-[10px]">
                <th className="px-8 py-4">اسم الصنف</th><th className="px-4 py-4 text-center">الكمية</th><th className="px-4 py-4 text-center">سعر الشراء</th><th className="px-4 py-4 text-center">الإجمالي</th><th className="px-8 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
              {invoiceItems.map((item, idx) => (
                <tr key={idx} className={`transition-all ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-emerald-50/20'}`}>
                  <td className={`px-8 py-4 font-black ${isDarkMode ? 'text-zinc-200' : 'text-emerald-900'}`}>{item.title}</td>
                  <td className={`px-4 py-4 text-center font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>{item.quantityAdded} <span className="opacity-40 text-[9px]">({item.qtyUnit})</span></td>
                  <td className={`px-4 py-4 text-center font-bold ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>{item.purchasePrice.toLocaleString()}</td>
                  <td className={`px-4 py-4 text-center font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{(item.purchasePrice * item.quantityAdded).toLocaleString()}</td>
                  <td className="px-8 py-4 text-center"><button onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-transform hover:scale-110"><Trash2 size={18} /></button></td>
                </tr>
              ))}
              {invoiceItems.length === 0 && (
                <tr><td colSpan={5} className="py-24 text-center opacity-10 text-gray-400"><Plus size={64} className="mx-auto mb-2" /><p className="font-black text-xl">القائمة فارغة</p></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`border-t flex items-center justify-between shrink-0 p-6 ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex flex-col">
            <p className="font-black text-gray-400 uppercase text-[10px] mb-1">إجمالي الفاتورة</p>
            <p className={`font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`} style={{ fontSize: `clamp(20px, calc(2.2rem * var(--invoice-scale)), 36px)` }}>
              {invoiceItems.reduce((s, i) => s + (i.purchasePrice * i.quantityAdded), 0).toLocaleString()} <span className="font-bold opacity-30 text-base">د.ل</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className={`px-8 py-3 rounded-2xl font-black transition-all ${isDarkMode ? 'bg-zinc-800 text-gray-400 hover:bg-zinc-700' : 'bg-white border border-gray-200 text-gray-400 hover:bg-gray-100'}`}>إلغاء</button>
            <button onClick={handleFinalProcess} disabled={invoiceItems.length === 0}
              className={`px-12 py-3.5 rounded-[22px] font-black hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-30 flex items-center gap-3 ${isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'}`}>
              <Save size={fluidIcon(20)} /> حفظ الفاتورة
            </button>
          </div>
        </div>
      </div>

      {showNotFoundModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-[32px] shadow-2xl p-8 border text-center ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
            <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
            <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>صنف غير مسجل</h3>
            <p className="text-gray-400 font-bold text-sm mb-8">يرجى إنشاء بطاقة صنف لهذا الباركود للمتابعة.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowNotFoundModal(false); setCurrentEntry({...currentEntry, barcode: '', title: ''}); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-400">إلغاء</button>
              <button ref={createCardBtnRef} onClick={() => onNavigateToItemCard(currentEntry.barcode)} className="flex-1 py-3 rounded-xl font-black bg-emerald-600 text-white shadow-lg">اصنع بطاقة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseInvoice;