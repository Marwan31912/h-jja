
import React, { useState } from 'react';
import { Publisher, Category, Book } from '../types';
import { Globe, Plus, Trash2, Search, Pencil, BookOpen, ChevronLeft, LayoutGrid, X, MapPin, DollarSign, Package, User, Layers, Menu as MenuIcon, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { BookDetailsModal } from './BookDetailsModal';

interface PublishersProps {
  publishers: Publisher[];
  categories: Category[];
  books: Book[];
  onAdd: (pub: Publisher) => void;
  onUpdate: (pub: Publisher) => void;
  onDelete: (id: string) => void;
  onAddCategory: (cat: Category) => void;
  onUpdateCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onEditBook: (book: Book) => void;
  onUpdateBook?: (book: Book) => void;
  isDarkMode?: boolean;
}

const compressAndGetBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const Publishers: React.FC<PublishersProps> = ({ 
  publishers, 
  categories, 
  books, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory, 
  onEditBook, 
  onUpdateBook,
  isDarkMode 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [innerSearchTerm, setInnerSearchTerm] = useState(''); 
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  
  const [dragOverBookId, setDragOverBookId] = useState<string | null>(null);
  const [uploadingBookId, setUploadingBookId] = useState<string | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{ id: string; text: string } | null>(null); 

  const [formState, setFormState] = useState({ name: '', description: '' });
  const [catFormState, setCatFormState] = useState({ name: '', description: '' });

  const openAddForm = () => {
    setEditingPublisher(null);
    setFormState({ name: '', description: '' });
    setShowAddForm(true);
  };

  const openEditForm = (p: Publisher) => {
    setEditingPublisher(p);
    setFormState({ name: p.name, description: p.description || '' });
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name) return;
    if (editingPublisher) {
      onUpdate({ ...editingPublisher, name: formState.name, description: formState.description });
    } else {
      onAdd({ id: crypto.randomUUID(), name: formState.name, description: formState.description, addedAt: Date.now() });
    }
    setShowAddForm(false);
    setEditingPublisher(null);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormState.name) return;
    onAddCategory({ id: crypto.randomUUID(), name: catFormState.name, description: catFormState.description, addedAt: Date.now() });
    setShowCategoryForm(false);
    setCatFormState({ name: '', description: '' });
  };

  const filteredPublishers = publishers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getBooksCount = (pubName: string) => books.filter(b => b.publisher === pubName).length;

  // إذا تم اختيار دار نشر ولكن لم يتم اختيار تصنيف بعد
  if (selectedPublisher && !selectedCategoryName) {
    return (
      <div className="animate-in fade-in slide-in-from-left-4 duration-500 text-right h-full flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20"><Globe size={24} /></div>
            <div>
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedPublisher.name}</h2>
              <p className="text-gray-400 text-sm font-bold">عرض التصنيفات المتوفرة لهذه الدار</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setShowCategoryForm(true)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all ${isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-900 text-white'}`}><Plus size={20} /> إضافة تصنيف</button>
             <button onClick={() => setSelectedPublisher(null)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'bg-gray-100 text-emerald-900 hover:bg-gray-200'}`}><ChevronLeft size={20} className="stroke-emerald-600" /> العودة للدور</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* تصنيف افتراضي: كل التصنيفات */}
            <div 
              onClick={() => setSelectedCategoryName('all')}
              className={`p-6 rounded-[40px] border-2 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-zinc-800 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'}`}
            >
               <div className="p-4 bg-indigo-500 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform"><LayoutGrid size={32} /></div>
               <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-indigo-900'}`}>كل التصنيفات</h4>
               <p className="text-[10px] text-gray-400 font-bold mt-2">عرض كافة كتب الدار</p>
            </div>

            {categories.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => setSelectedCategoryName(cat.name)}
                className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group flex flex-col ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}
              >
                <div className="flex justify-between items-start mb-6">
                   <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl"><Layers size={22} /></div>
                   <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-50 dark:bg-zinc-800 font-black text-[10px] text-gray-400">{books.filter(b => b.publisher === selectedPublisher.name && b.category === cat.name).length} كتاب</div>
                </div>
                <h4 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{cat.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold line-clamp-2">{cat.description || 'لا يوجد وصف'}</p>
                <div className="mt-auto pt-4 flex justify-end text-emerald-500 group-hover:translate-x-[-4px] transition-transform"><ChevronLeft size={16} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* نموذج إضافة تصنيف */}
        {showCategoryForm && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <form onSubmit={handleCategorySubmit} className={`relative w-full max-w-md rounded-[40px] shadow-2xl p-10 space-y-6 border ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
               <h3 className="text-2xl font-black flex items-center gap-3"><Layers className="text-emerald-500" size={24} /> إضافة تصنيف جديد</h3>
               <div className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-400 mb-2">اسم التصنيف</label><input required type="text" value={catFormState.name} onChange={(e) => setCatFormState({...catFormState, name: e.target.value})} className={`w-full px-5 py-4 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} /></div>
               </div>
               <div className="flex gap-4"><button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-3xl font-black">حفظ</button><button type="button" onClick={() => setShowCategoryForm(false)} className="px-8 rounded-3xl font-bold bg-gray-100 text-gray-400">تراجع</button></div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // إذا تم اختيار دار النشر والتصنيف (عرض الكتب)
  if (selectedPublisher && selectedCategoryName) {
    const categoryBooks = books.filter(b => b.publisher === selectedPublisher.name && (selectedCategoryName === 'all' || b.category === selectedCategoryName));
    const searchedBooks = categoryBooks.filter(b => b.title.toLowerCase().includes(innerSearchTerm.toLowerCase()));

    return (
      <div className="animate-in fade-in slide-in-from-left-4 duration-500 text-right h-full flex flex-col relative">
        <BookDetailsModal
          book={viewingBook}
          onClose={() => setViewingBook(null)}
          onEditBook={onEditBook}
          isDarkMode={isDarkMode}
        />

        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><BookOpen size={24} /></div>
             <div>
                <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedCategoryName === 'all' ? 'كافة الكتب' : `تصنيف: ${selectedCategoryName}`}</h2>
                <p className="text-gray-400 text-sm font-bold">{selectedPublisher.name}</p>
             </div>
          </div>
          <button onClick={() => setSelectedCategoryName(null)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-gray-100 text-emerald-900'}`}><ChevronLeft size={20} className="stroke-emerald-600" /> العودة للتصنيفات</button>
        </div>

        <div className="relative mb-8 shrink-0">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
          <input type="text" placeholder="بحث عن كتاب..." value={innerSearchTerm} onChange={(e) => setInnerSearchTerm(e.target.value)} className={`w-full pr-14 pl-6 py-4 border rounded-[24px] shadow-sm outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white' : 'bg-white border-gray-100 text-emerald-900 focus:border-emerald-500'}`} />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {searchedBooks.map(book => (
              <div 
                key={book.id} 
                onClick={() => {
                  if (uploadingBookId !== book.id) {
                    setViewingBook(book);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  if (dragOverBookId !== book.id) {
                    setDragOverBookId(book.id);
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverBookId(book.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (
                    e.clientX <= rect.left ||
                    e.clientX >= rect.right ||
                    e.clientY <= rect.top ||
                    e.clientY >= rect.bottom
                  ) {
                    setDragOverBookId(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverBookId(null);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    if (file.type.startsWith('image/')) {
                      try {
                        setUploadingBookId(book.id);
                        const base64 = await compressAndGetBase64(file);
                        const updated = { ...book, image: base64 };
                        if (onUpdateBook) {
                          onUpdateBook(updated);
                        } else {
                          onEditBook(updated);
                        }
                        setToastFeedback({ id: book.id, text: 'تم تحديث الغلاف بنجاح!' });
                        setTimeout(() => setToastFeedback(null), 3000);
                      } catch (err) {
                        console.error('Error uploading dropped cover:', err);
                      } finally {
                        setUploadingBookId(null);
                      }
                    }
                  }
                }}
                className={`p-3 md:p-6 rounded-[20px] md:rounded-[32px] border shadow-sm transition-all cursor-pointer group relative overflow-hidden ${
                  dragOverBookId === book.id 
                    ? 'border-emerald-500 ring-4 ring-emerald-500/40 scale-[1.03] shadow-2xl bg-emerald-500/10' 
                    : isDarkMode 
                      ? 'bg-zinc-900 border-white/5 hover:shadow-xl' 
                      : 'bg-white border-gray-100 hover:shadow-xl'
                }`}
              >
                <div className={`aspect-[3/4] rounded-2xl mb-2 md:mb-4 overflow-hidden border relative ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  {book.image ? (
                    <img src={book.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <BookOpen size={48} />
                    </div>
                  )}

                  {/* حالة التأشير العادي بالمؤشر (تظهر التفاصيل) */}
                  {dragOverBookId !== book.id && uploadingBookId !== book.id && (
                    <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/10 transition-colors flex items-center justify-center pointer-events-none">
                       <span className={`px-4 py-2 rounded-xl font-black text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300 ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-white text-emerald-900'}`}>
                         عرض التفاصيل
                       </span>
                    </div>
                  )}

                  {/* حالة حمل وسحب الصورة فوق الكتاب (تظهر: افلت الصورة هنا لرفع الغلاف) */}
                  {dragOverBookId === book.id && (
                    <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-2 text-center z-20 animate-in fade-in zoom-in-95 duration-200 border-2 border-dashed border-emerald-400 pointer-events-none">
                      <div className="p-2.5 bg-emerald-500 text-white rounded-full mb-1.5 animate-bounce shadow-lg shadow-emerald-500/40">
                        <Upload size={22} />
                      </div>
                      <span className="text-white font-black text-[11px] leading-tight mb-0.5">
                        افلت الصورة هنا لرفع الغلاف
                      </span>
                      <span className="text-emerald-200 font-bold text-[8px]">
                        تحديث مباشر للغلاف
                      </span>
                    </div>
                  )}

                  {/* حالة قيد معالجة ورفع الصورة */}
                  {uploadingBookId === book.id && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-2 text-center z-20 animate-in fade-in duration-200 pointer-events-none">
                      <Loader2 size={24} className="text-emerald-400 animate-spin mb-1.5" />
                      <span className="text-white font-bold text-[10px]">
                        جاري حفظ الغلاف...
                      </span>
                    </div>
                  )}

                  {/* إشعار نجاح فوري للغلاف */}
                  {toastFeedback?.id === book.id && (
                    <div className="absolute inset-x-2 bottom-2 bg-emerald-600 text-white rounded-xl py-1.5 px-2 text-center text-[9px] font-black shadow-lg z-30 animate-in slide-in-from-bottom-2 duration-300 flex items-center justify-center gap-1">
                      <CheckCircle2 size={12} />
                      {toastFeedback.text}
                    </div>
                  )}
                </div>
                <h4 className={`font-black text-xs md:text-sm mb-1 truncate ${isDarkMode ? 'text-zinc-100' : 'text-emerald-900'}`}>{book.title}</h4>
                <div className="flex justify-between items-center"><span className="font-black text-xs text-emerald-600">{book.price} د.ل</span><span className="text-[9px] md:text-[10px] font-bold text-gray-400">الكمية: {book.quantity}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // الواجهة الرئيسية: قائمة دور النشر
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-right overflow-hidden" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 shrink-0">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
          <input type="text" placeholder="بحث عن دار نشر..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full pr-12 pl-4 py-4 border rounded-2xl shadow-sm outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 border-white/5 text-white' : 'bg-white border-gray-100 text-emerald-900 focus:border-indigo-500'}`} />
        </div>
        <button onClick={openAddForm} className={`px-10 py-4 rounded-2xl font-black shadow-lg hover:scale-[1.05] transition-all flex items-center gap-3 whitespace-nowrap ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-900 text-white shadow-indigo-900/30'}`}><Plus size={22} /> إضافة دار نشر</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPublishers.map(pub => (
            <div key={pub.id} onClick={() => setSelectedPublisher(pub)} className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group relative overflow-hidden flex flex-col cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl"><Globe size={24} /></div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEditForm(pub); }} className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-50 dark:hover:bg-zinc-800 text-gray-400 hover:text-indigo-600"><Pencil size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(pub.id); }} className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-zinc-800 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
              <h4 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{pub.name}</h4>
              <p className="text-xs font-bold text-gray-400 mb-6 line-clamp-2">{pub.description || 'لا يوجد وصف متاح لهذه الدار'}</p>
              <div className={`mt-auto pt-6 border-t flex items-center justify-between ${isDarkMode ? 'border-white/5' : 'border-gray-50'}`}>
                 <div className="flex items-center gap-2"><LayoutGrid size={16} className="text-indigo-500" /><span className="text-sm font-black">{getBooksCount(pub.name)}</span><span className="text-[10px] text-gray-400 font-bold">كتاب</span></div>
                 <div className="text-indigo-500 group-hover:translate-x-[-4px] transition-transform"><ChevronLeft size={16} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <form onSubmit={handleSubmit} className={`relative w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-6 border ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
             <h3 className="text-2xl font-black flex items-center gap-3"><Globe className="text-indigo-500" size={32} /> {editingPublisher ? 'تعديل بيانات الدار' : 'إضافة دار نشر جديدة'}</h3>
             <div className="space-y-4">
                <div><label className="block text-sm font-bold text-gray-400 mb-2">اسم دار النشر</label><input required type="text" value={formState.name} onChange={(e) => setFormState({...formState, name: e.target.value})} className={`w-full px-5 py-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} /></div>
                <div><label className="block text-sm font-bold text-gray-400 mb-2">وصف مختصر</label><textarea value={formState.description} onChange={(e) => setFormState({...formState, description: e.target.value})} className={`w-full px-5 py-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold transition-all min-h-[100px] ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-50 text-emerald-900'}`} /></div>
             </div>
             <div className="flex gap-4 pt-4"><button type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl">تأكيد الحفظ</button><button type="button" onClick={() => setShowAddForm(false)} className="px-8 rounded-3xl font-bold bg-gray-100 text-gray-400">تراجع</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Publishers;
