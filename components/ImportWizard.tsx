
import React, { useState } from 'react';
import { Book, Supplier, Customer, Category, UserAccount } from '../types';
import { ChevronLeft, ChevronRight, CheckCircle2, BookOpen, Truck, Users, Layers, ShieldCheck, X, Image as ImageIcon, Phone, Globe, MapPin } from 'lucide-react';

interface ImportWizardProps {
  data: {
    books?: Book[];
    suppliers?: Supplier[];
    customers?: Customer[];
    categories?: Category[];
    users?: UserAccount[];
  };
  onConfirm: () => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

const ImportWizard: React.FC<ImportWizardProps> = ({ data, onConfirm, onCancel, isDarkMode }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    { id: 'books', label: 'الكتب والأصناف', icon: BookOpen, color: 'emerald' },
    { id: 'suppliers', label: 'الموردون', icon: Truck, color: 'blue' },
    { id: 'customers', label: 'العملاء', icon: Users, color: 'teal' },
    { id: 'summary', label: 'ملخص النظام', icon: ShieldCheck, color: 'purple' }
  ];

  const nextStep = () => setStep(prev => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const renderBooks = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 h-[480px] overflow-y-auto custom-scrollbar p-2 animate-in slide-in-from-left-4 duration-500">
      {(data.books || []).map((book, idx) => (
        <div key={idx} className={`p-4 rounded-[32px] border shadow-sm hover:shadow-md transition-all flex flex-col gap-3 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className={`aspect-[3/4] rounded-[24px] overflow-hidden relative ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
            {book.image ? (
              <img src={book.image} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'text-zinc-700' : 'text-gray-200'}`}><ImageIcon size={40} /></div>
            )}
            <div className="absolute top-3 right-3 bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg">
              {book.category}
            </div>
          </div>
          <div className="px-1 pb-1">
            <h4 className={`font-black text-sm truncate ${isDarkMode ? 'text-zinc-100' : 'text-[#064e3b]'}`}>{book.title}</h4>
            <div className="flex justify-between items-center mt-2">
               <p className={`text-[11px] font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{book.price.toLocaleString()} د.ل</p>
               <p className={`text-[10px] font-bold ${isDarkMode ? 'text-zinc-500' : 'text-gray-300'}`}>متاح: {book.quantity}</p>
            </div>
          </div>
        </div>
      ))}
      {(!data.books || data.books.length === 0) && (
        <div className="col-span-full py-32 text-center text-gray-300 font-bold flex flex-col items-center gap-4">
           <BookOpen size={64} className="opacity-10" />
           <span className={isDarkMode ? 'text-zinc-600' : ''}>لا توجد بيانات كتب في هذا الملف</span>
        </div>
      )}
    </div>
  );

  const renderSuppliers = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-[480px] overflow-y-auto custom-scrollbar p-2 animate-in slide-in-from-left-4 duration-500">
      {(data.suppliers || []).map((s, idx) => (
        <div key={idx} className={`p-6 rounded-[32px] border shadow-sm hover:shadow-md transition-all group ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-start mb-4">
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-zinc-800 text-emerald-400 border border-white/5' : 'bg-emerald-50 text-emerald-600'}`}>
               <Truck size={28} />
             </div>
             <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isDarkMode ? 'bg-zinc-950 text-zinc-500' : 'bg-gray-50 text-gray-400'}`}>المورد #{idx + 1}</span>
          </div>
          <div className="space-y-3">
            <h4 className={`font-black text-base truncate ${isDarkMode ? 'text-zinc-100' : 'text-[#064e3b]'}`}>{s.name}</h4>
            <div className="space-y-1.5">
               <div className={`flex items-center gap-2 font-bold text-[11px] ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                  <Phone size={12} className="text-emerald-500" />
                  <span>{s.phone || 'بدون هاتف'}</span>
               </div>
               <div className={`flex items-center gap-2 font-bold text-[11px] ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                  <Globe size={12} className="text-emerald-500" />
                  <span>{s.country || 'بلد غير محدد'}</span>
               </div>
            </div>
          </div>
        </div>
      ))}
      {(!data.suppliers || data.suppliers.length === 0) && (
        <div className="col-span-full py-32 text-center text-gray-300 font-bold flex flex-col items-center gap-4">
           <Truck size={64} className="opacity-10" />
           <span className={isDarkMode ? 'text-zinc-600' : ''}>لا توجد بيانات موردين</span>
        </div>
      )}
    </div>
  );

  const renderCustomers = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-[480px] overflow-y-auto custom-scrollbar p-2 animate-in slide-in-from-left-4 duration-500">
      {(data.customers || []).map((c, idx) => (
        <div key={idx} className={`p-6 rounded-[32px] border shadow-sm hover:shadow-md transition-all group ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-start mb-4">
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-zinc-800 text-emerald-400 border border-white/5' : 'bg-emerald-50 text-emerald-600'}`}>
               <Users size={28} />
             </div>
             <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isDarkMode ? 'bg-zinc-950 text-zinc-500' : 'bg-gray-50 text-gray-400'}`}>عميل #{idx + 1}</span>
          </div>
          <div className="space-y-3">
            <h4 className={`font-black text-base truncate ${isDarkMode ? 'text-zinc-100' : 'text-[#064e3b]'}`}>{c.name}</h4>
            <div className="space-y-1.5">
               <div className={`flex items-center gap-2 font-bold text-[11px] ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                  <Phone size={12} className="text-emerald-500" />
                  <span>{c.phone || 'بدون هاتف'}</span>
               </div>
               <div className={`flex items-center gap-2 font-bold text-[11px] ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                  <MapPin size={12} className="text-emerald-500" />
                  <span className="truncate">{c.address || 'بدون عنوان'}</span>
               </div>
            </div>
          </div>
        </div>
      ))}
      {(!data.customers || data.customers.length === 0) && (
        <div className="col-span-full py-32 text-center text-gray-300 font-bold flex flex-col items-center gap-4">
           <Users size={64} className="opacity-10" />
           <span className={isDarkMode ? 'text-zinc-600' : ''}>لا توجد بيانات عملاء</span>
        </div>
      )}
    </div>
  );

  const renderSummary = () => (
    <div className="flex flex-col items-center justify-center h-[480px] text-center space-y-8 animate-in fade-in zoom-in duration-500">
      <div className={`w-28 h-28 rounded-[40px] flex items-center justify-center shadow-inner relative ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600'}`}>
        <CheckCircle2 size={56} />
        <div className={`absolute inset-0 rounded-[40px] animate-ping opacity-20 ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-100'}`} />
      </div>
      <div>
        <h3 className={`text-3xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-[#064e3b]'}`}>البيانات جاهزة للاستيراد</h3>
        <p className="text-gray-400 font-bold text-sm max-w-md mx-auto leading-relaxed">يرجى التأكد من مراجعة كافة الأقسام السابقة. الضغط على زر الاعتماد سيقوم بتحديث النظام بالكامل.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full px-10">
        <div className={`p-5 rounded-[28px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
           <p className="text-[10px] font-black text-gray-400 mb-1">الكتب</p>
           <p className={`text-2xl font-black ${isDarkMode ? 'text-zinc-100' : 'text-[#064e3b]'}`}>{data.books?.length || 0}</p>
        </div>
        <div className={`p-5 rounded-[28px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
           <p className="text-[10px] font-black text-gray-400 mb-1">الموردون</p>
           <p className={`text-2xl font-black ${isDarkMode ? 'text-zinc-100' : 'text-[#064e3b]'}`}>{data.suppliers?.length || 0}</p>
        </div>
        <div className={`p-5 rounded-[28px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
           <p className="text-[10px] font-black text-gray-400 mb-1">العملاء</p>
           <p className={`text-2xl font-black ${isDarkMode ? 'text-zinc-100' : 'text-[#064e3b]'}`}>{data.customers?.length || 0}</p>
        </div>
        <div className={`p-5 rounded-[28px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
           <p className="text-[10px] font-black text-gray-400 mb-1">الأقسام</p>
           <p className={`text-2xl font-black ${isDarkMode ? 'text-zinc-100' : 'text-[#064e3b]'}`}>{data.categories?.length || 0}</p>
        </div>
      </div>
      <div className={`border px-6 py-3 rounded-2xl flex items-center gap-3 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-100'}`}>
         <ShieldCheck size={18} className="text-orange-500" />
         <p className={`text-xs font-black ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>تحذير: هذا الإجراء سيعيد تهيئة قاعدة بياناتك بالكامل.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-[#064e3b]/60 backdrop-blur-md animate-in fade-in duration-300" dir="rtl">
      <div className={`relative w-full max-w-5xl h-[800px] rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border ${isDarkMode ? 'bg-zinc-950 border-white/10' : 'bg-[#f8fafc] border-white/20'}`}>
        
        <div className="flex h-full">
          {/* Sidebar Steps */}
          <div className={`w-80 border-l p-10 flex flex-col shrink-0 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
            <div className="mb-12">
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-[#064e3b]'}`}>معالج الاسترداد</h2>
              <p className="text-[11px] text-gray-400 font-bold mt-2 leading-relaxed">مراجعة البيانات المستخرجة من الملف قبل الحفظ النهائي.</p>
            </div>
            
            <div className="space-y-6 flex-1">
              {steps.map((s, idx) => {
                const isActive = step === idx;
                const isDone = step > idx;
                return (
                  <div key={s.id} className="flex items-center gap-5 relative group cursor-pointer" onClick={() => (isDone || isActive) && setStep(idx)}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all z-10 ${isActive ? (isDarkMode ? 'bg-emerald-600 text-white' : 'bg-[#064e3b] text-white scale-110 shadow-xl') : isDone ? 'bg-emerald-500 text-white' : (isDarkMode ? 'bg-zinc-800 text-zinc-600 border border-white/5' : 'bg-gray-50 text-gray-300')}`}>
                      {isDone ? <CheckCircle2 size={24} /> : <s.icon size={24} />}
                    </div>
                    <div>
                       <span className={`text-xs font-black block transition-colors ${isActive ? (isDarkMode ? 'text-emerald-400' : 'text-[#064e3b]') : isDone ? (isDarkMode ? 'text-zinc-400' : 'text-gray-600') : 'text-gray-300'}`}>{s.label}</span>
                       {isActive && <span className="text-[10px] text-emerald-600 font-bold animate-pulse">يتم العرض الآن</span>}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`absolute right-[23px] top-12 w-0.5 h-8 ${isDone ? 'bg-emerald-500' : (isDarkMode ? 'bg-white/5' : 'bg-gray-100')}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={onCancel} className={`mt-auto flex items-center gap-2 font-bold text-xs transition-colors group ${isDarkMode ? 'text-zinc-500 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>
              <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-zinc-800 group-hover:bg-red-500/20' : 'bg-gray-50 group-hover:bg-red-50'}`}>
                <X size={16} />
              </div>
              إلغاء الاستيراد والعودة
            </button>
          </div>

          {/* Main Content Area */}
          <div className={`flex-1 flex flex-col p-12 overflow-hidden ${isDarkMode ? 'bg-zinc-950/40' : 'bg-white/40'}`}>
            <header className={`mb-10 flex justify-between items-center p-6 rounded-[28px] border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
               <div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-zinc-100' : 'text-[#064e3b]'}`}>{steps[step].label}</h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">المعاينة المباشرة للسجلات</p>
               </div>
               <div className={`px-5 py-3 rounded-2xl text-[12px] font-black border flex items-center gap-2 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 تم العثور على {step === 0 ? (data.books?.length || 0) : step === 1 ? (data.suppliers?.length || 0) : step === 2 ? (data.customers?.length || 0) : 'كامل'} سجل
               </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
              {step === 0 && renderBooks()}
              {step === 1 && renderSuppliers()}
              {step === 2 && renderCustomers()}
              {step === 3 && renderSummary()}
              
              <div className={`absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t pointer-events-none ${isDarkMode ? 'from-zinc-950' : 'from-[#f8fafc]'}`} />
            </div>

            <footer className="mt-10 flex justify-between items-center shrink-0">
               <button 
                onClick={prevStep} 
                disabled={step === 0}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all border border-transparent ${isDarkMode ? 'text-zinc-500 hover:bg-zinc-800 disabled:opacity-0' : 'text-gray-400 hover:bg-gray-100 disabled:opacity-0 hover:border-gray-200'}`}
               >
                 <ChevronRight size={20} /> السابق
               </button>

               {step < steps.length - 1 ? (
                 <button 
                  onClick={nextStep}
                  className={`px-12 py-4 rounded-[22px] font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-[#064e3b] text-white'}`}
                 >
                   الخطوة التالية <ChevronLeft size={20} />
                 </button>
               ) : (
                 <button 
                  onClick={onConfirm}
                  className={`px-14 py-5 rounded-[26px] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-emerald-600 text-white shadow-emerald-900/20' : 'bg-emerald-600 text-white shadow-emerald-100'}`}
                 >
                   <CheckCircle2 size={24} /> اعتماد وحفظ البيانات الآن
                 </button>
               )}
            </footer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ImportWizard;
