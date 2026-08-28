
import React, { useMemo, useState } from 'react';
import { Book, Page, SaleRecord } from '../types';
import { BookOpen, Calendar, Package, Layers, Image as ImageIcon, DollarSign, AlertCircle, TrendingUp, Archive, Plus, Minus, X, Eye, Receipt, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  books: Book[];
  salesHistory?: SaleRecord[];
  onNavigate: (p: Page) => void;
  isDarkMode?: boolean;
  onUpdateBook?: (book: Book) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ books, salesHistory = [], onNavigate, isDarkMode, onUpdateBook }) => {
  const [showDeadStockModal, setShowDeadStockModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  // 1. تصفية "آخر الكتب المضافة" لتظهر الكتب فقط (استبعاد المصاحف والقرطاسية)
  const recentBooksOnly = [...books]
    .filter(b => !b.quranReading && !b.quranSize && (!b.packingCount || b.packingCount <= 1))
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, 5);

  // 2. إجمالي الكتب
  const totalItemsCount = books.length;

  // 4. قيمة المخزون (Inventory Valuation)
  const totalInventoryValue = useMemo(() => {
    return books.reduce((total, book) => {
      const qty = Number(book.quantity) || 0;
      const price = Number(book.purchasePrice) || 0;
      return total + (price * qty);
    }, 0);
  }, [books]);

  const totalPhysicalPieces = useMemo(() => {
    return books.reduce((total, book) => total + (Number(book.quantity) || 0), 0);
  }, [books]);

  // 5. التحسينات الذكية
  
  // أ. تنبيه الحد الأدنى للطلب (Low Stock) - القائمة الكاملة
  // التعديل: تصفية القائمة بناءً على خاصية reorderAlertEnabled
  const allLowStockItems = useMemo(() => {
    return books.filter(b => (b.reorderAlertEnabled !== false) && (b.quantity <= (b.reorderLimit || 5)));
  }, [books]);

  const [thresholdDate] = useState(() => Date.now() - (6 * 30 * 24 * 60 * 60 * 1000));

  // ب. الأصناف الراكدة (Dead Stock)
  const deadStockItems = useMemo(() => {
    const recentSalesBookIds = new Set<string>();
    
    salesHistory.forEach(sale => {
      if (sale.timestamp >= thresholdDate) {
        sale.items.forEach(item => recentSalesBookIds.add(item.bookId));
      }
    });

    return books.filter(b => 
      !recentSalesBookIds.has(b.id) && 
      b.quantity > 0 && 
      b.addedAt < thresholdDate 
    );
  }, [books, salesHistory, thresholdDate]);

  // ج. الأصناف الأكثر مبيعاً (Top Selling)
  const topSellingItems = useMemo(() => {
    const salesCount: Record<string, number> = {};
    salesHistory.forEach(sale => {
      sale.items.forEach(item => {
        salesCount[item.bookId] = (salesCount[item.bookId] || 0) + item.quantity;
      });
    });

    return Object.entries(salesCount)
      .map(([id, count]) => {
        const book = books.find(b => b.id === id);
        return book ? { ...book, totalSold: count } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.totalSold || 0) - (a!.totalSold || 0))
      .slice(0, 5);
  }, [books, salesHistory]);

  const stats = [
    { label: 'إجمالي الأصناف', value: totalItemsCount, icon: BookOpen, color: 'bg-emerald-600' },
    { label: 'عدد القطع الكلي بالمخزن', value: totalPhysicalPieces, icon: Package, color: 'bg-emerald-600' },
    { label: 'أضيف مؤخراً (كتب)', value: recentBooksOnly.length, icon: Calendar, color: 'bg-emerald-500' },
  ];

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-right" dir="rtl">
        
        {/* البطاقات العلوية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className={`border p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg`}>
                  <stat.icon size={28} />
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-black uppercase tracking-wider">{stat.label}</p>
                  <h3 className={`text-3xl font-extrabold transition-colors ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{stat.value.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* تقرير قيمة المخزون المالي */}
        <div className={`p-8 rounded-[40px] border relative overflow-hidden ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-gradient-to-br from-emerald-900 to-emerald-800 border-emerald-800 text-white'}`}>
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                 <h3 className={`text-2xl font-black mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-emerald-50'}`}>
                   <DollarSign size={24} className="text-emerald-400"/> القيمة المالية للمخزون
                 </h3>
                 <p className={`text-xs font-bold opacity-70 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-white'}`}>
                   إجمالي قيمة البضاعة الحالية في المخزن (محسوبة بسعر الشراء).
                 </p>
              </div>
              
              <div className="text-center md:text-left">
                 <span className={`text-5xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-white'}`}>{totalInventoryValue.toLocaleString()}</span>
                 <span className="text-xl font-bold opacity-60 mr-2">د.ل</span>
              </div>
           </div>
           {/* Background Decoration */}
           <div className="absolute -bottom-10 -left-10 opacity-5 rotate-12 pointer-events-none">
              <Receipt size={250} className="text-white" />
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-right">
          {/* Recent Books Activity */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-black transition-colors ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`}>آخر الكتب المضافة</h2>
              <button 
                onClick={() => onNavigate(Page.Warehouse)}
                className="text-xs font-black text-emerald-600 hover:underline bg-emerald-50 px-3 py-1.5 rounded-lg"
              >
                عرض المستودع
              </button>
            </div>
            <div className="space-y-4">
              {recentBooksOnly.length > 0 ? recentBooksOnly.map(book => (
                <div key={book.id} className={`p-4 rounded-[24px] flex items-center gap-4 border transition-all ${isDarkMode ? 'bg-zinc-800/50 border-white/5 hover:border-emerald-500/30' : 'bg-white border-gray-100 hover:border-emerald-100 shadow-sm'}`}>
                  <div className={`w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 border shadow-sm flex items-center justify-center ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    {book.image ? (
                      <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-black text-sm leading-tight line-clamp-1 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{book.title}</h4>
                    <p className="text-gray-400 text-[10px] font-bold mt-1">{book.author}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-600">
                      {book.category}
                    </span>
                    <span className="text-gray-400 text-[10px] font-black">{book.price} د.ل</span>
                  </div>
                </div>
              )) : (
                <div className={`text-center py-10 rounded-[24px] border-2 border-dashed ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-gray-400 font-bold text-xs">لا توجد كتب مضافة حديثاً</p>
                </div>
              )}
            </div>
          </section>

          {/* Alerts & Insights Section */}
          <section className="space-y-8">
             
             {/* Low Stock Alert - Converted to Window Style */}
             <div className={`p-6 rounded-[32px] border transition-all ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                   <h3 className="font-black text-red-500 flex items-center gap-2"><AlertCircle size={20}/> تنبيه النفاذ (Low Stock)</h3>
                   <span className="text-[10px] font-black text-red-500 bg-red-100 px-2 py-1 rounded-lg">{allLowStockItems.length} صنف</span>
                </div>
                <p className={`text-[10px] font-bold mb-4 ${isDarkMode ? 'text-red-400/70' : 'text-red-400'}`}>أصناف وصلت للحد الأدنى من الكمية وتحتاج إعادة طلب.</p>
                
                <button 
                  onClick={() => setShowLowStockModal(true)}
                  className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-white text-red-500 hover:bg-red-100 shadow-sm'}`}
                >
                  <Eye size={14} />
                  عرض نواقص المخزن
                </button>
             </div>

             {/* Top Selling */}
             <div className={`p-6 rounded-[32px] border ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h3 className={`font-black mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}><TrendingUp size={20} className="text-emerald-500"/> الأكثر مبيعاً (Top Selling)</h3>
                <div className="space-y-3">
                   {topSellingItems.map((item, idx) => (
                      <div key={item!.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-3 overflow-hidden">
                            <span className={`text-lg font-black text-gray-300 w-4`}>{idx + 1}</span>
                            <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-zinc-300' : 'text-gray-700'}`}>{item!.title}</span>
                         </div>
                         <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>مباع: {(item as any).totalSold}</span>
                      </div>
                   ))}
                   {topSellingItems.length === 0 && <p className="text-center text-xs text-gray-400 font-bold py-4">لا توجد بيانات مبيعات كافية</p>}
                </div>
             </div>

             {/* Dead Stock */}
             <div className={`p-6 rounded-[32px] border ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                   <h3 className={`font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                     <Archive size={20} className="text-emerald-500"/> الأصناف الراكدة (Dead Stock)
                   </h3>
                   <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isDarkMode ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-100 text-emerald-900'}`}>{deadStockItems.length} صنف</span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold mb-4">أصناف لم يتم بيعها منذ أكثر من 6 أشهر</p>
                
                <button 
                  onClick={() => setShowDeadStockModal(true)}
                  className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                >
                  <Eye size={14} />
                  عرض القائمة الكاملة
                </button>
             </div>

          </section>
        </div>
      </div>

      {/* Dead Stock Modal */}
      {showDeadStockModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`relative w-full max-w-2xl h-[70vh] rounded-[40px] shadow-2xl border flex flex-col overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className={`flex justify-between items-center px-8 py-6 border-b shrink-0 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                 <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تقرير الأصناف الراكدة</h3>
                 <button onClick={() => setShowDeadStockModal(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"><X size={24} className="text-gray-400" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 p-8">
                 {deadStockItems.length > 0 ? deadStockItems.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                       <div>
                          <h4 className={`font-bold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-gray-800'}`}>{item.title}</h4>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">تاريخ الإضافة: {new Date(item.addedAt).toLocaleDateString('ar-EG')}</p>
                       </div>
                       <div className="text-left">
                          <span className={`block font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{item.price} د.ل</span>
                          <span className="text-[10px] text-gray-400 font-bold">الكمية: {item.quantity}</span>
                       </div>
                    </div>
                 )) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                       <Archive size={64} className="mb-4 text-emerald-500" />
                       <p className="font-black text-lg">ممتاز! حركة المخزون نشطة.</p>
                       <p className="text-xs font-bold">لا توجد أصناف راكدة تتجاوز 6 أشهر.</p>
                    </div>
                 )}
              </div>
              
              <div className={`px-8 py-6 border-t flex justify-end ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                 <button onClick={() => setShowDeadStockModal(false)} className={`px-8 py-3 rounded-2xl font-bold ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-emerald-900 text-white'}`}>إغلاق</button>
              </div>
           </div>
        </div>
      )}

      {/* Low Stock Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`relative w-full max-w-2xl h-[70vh] rounded-[40px] shadow-2xl border flex flex-col overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className={`flex justify-between items-center px-8 py-6 border-b shrink-0 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 text-red-500 rounded-xl"><AlertCircle size={24}/></div>
                    <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تقرير النواقص</h3>
                 </div>
                 <button onClick={() => setShowLowStockModal(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"><X size={24} className="text-gray-400" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 p-8">
                 {allLowStockItems.length > 0 ? allLowStockItems.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                       <div>
                          <h4 className={`font-bold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-gray-800'}`}>{item.title}</h4>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">{item.author || 'عام'}</p>
                       </div>
                       <div className="text-left flex items-center gap-4">
                          <div className="text-center">
                             <span className="block text-[9px] text-gray-400 font-bold mb-0.5">الحد الأدنى</span>
                             <span className="text-xs font-bold text-gray-500">{item.reorderLimit || 5}</span>
                          </div>
                          <div className="text-center bg-red-500 text-white px-3 py-1.5 rounded-xl min-w-[60px]">
                             <span className="block text-[8px] opacity-80 font-bold mb-0.5">المتاح</span>
                             <span className="text-sm font-black">{item.quantity}</span>
                          </div>
                       </div>
                    </div>
                 )) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                       <CheckCircle2 size={64} className="mb-4 text-emerald-500" />
                       <p className="font-black text-lg">المخزون بحالة جيدة!</p>
                       <p className="text-xs font-bold">لا توجد أصناف وصلت للحد الأدنى.</p>
                    </div>
                 )}
              </div>
              
              <div className={`px-8 py-6 border-t flex justify-end ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                 <button onClick={() => setShowLowStockModal(false)} className={`px-8 py-3 rounded-2xl font-bold ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-emerald-900 text-white'}`}>إغلاق</button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
