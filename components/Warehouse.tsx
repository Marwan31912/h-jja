
import React, { useState } from 'react';
import { Book, Category, Publisher, SubCategory, SchoolBookSeries, SchoolBookGrade } from '../types';
import { BookOpen, Layers, Search, Plus, List, ChevronLeft, LayoutGrid, Pencil, Trash2, Image as ImageIcon, Globe, Menu, Scroll, StickyNote, Library } from 'lucide-react';
import BookList from './BookList';
import Categories from './Categories';
import Publishers from './Publishers';
import SchoolBooks from './SchoolBooks';
import ConfirmModal from './ConfirmModal';

interface WarehouseProps {
  books: Book[];
  categories: Category[];
  subCategories: SubCategory[];
  publishers: Publisher[];
  schoolBookSeries: SchoolBookSeries[];
  schoolBookGrades: SchoolBookGrade[];
  onEditBook: (book: Book) => void;
  onUpdateBook?: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  onAddCategory: (cat: Category) => void;
  onUpdateCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onAddSubCategory: (subCat: SubCategory) => void;
  onAddPublisher: (pub: Publisher) => void;
  onUpdatePublisher: (pub: Publisher) => void;
  onDeletePublisher: (id: string) => void;
  onDeleteSubCategory: (id: string) => void;
  onAddSchoolBookSeries: (series: SchoolBookSeries) => void;
  onDeleteSchoolBookSeries: (id: string) => void;
  onAddSchoolBookGrade: (grade: SchoolBookGrade) => void;
  onDeleteSchoolBookGrade: (id: string) => void;
  onBatchUpdateBooks?: (books: Book[]) => void;
  isDarkMode?: boolean;
}

const Warehouse: React.FC<WarehouseProps> = ({ 
  books, 
  categories, 
  subCategories,
  publishers,
  schoolBookSeries,
  schoolBookGrades,
  onEditBook, 
  onUpdateBook,
  onBatchUpdateBooks,
  onDeleteBook, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory, 
  onAddSubCategory, 
  onAddPublisher, 
  onUpdatePublisher, 
  onDeletePublisher, 
  onDeleteSubCategory,
  onAddSchoolBookSeries,
  onDeleteSchoolBookSeries,
  onAddSchoolBookGrade,
  onDeleteSchoolBookGrade,
  isDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<'books' | 'sections' | 'publishers' | 'qurans' | 'school-books'>('sections');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedQuranSize, setSelectedQuranSize] = useState<string | null>(null);
  
  // حالات الحذف والتأكيد
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookIdToDelete, setBookIdToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setBookIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (bookIdToDelete) {
      onDeleteBook(bookIdToDelete);
      setBookIdToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const cancelDelete = () => {
    setBookIdToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const menuOptions = [
    { id: 'sections', label: 'الأقسام والتصنيفات', icon: Layers },
    { id: 'books', label: 'قائمة الكتب', icon: List },
    { id: 'qurans', label: 'المصاحف', icon: Scroll },
    { id: 'publishers', label: 'دور النشر', icon: Globe },
    { id: 'school-books', label: 'الكتب المدرسية', icon: Library },
  ];

  const currentTabLabel = menuOptions.find(opt => opt.id === activeTab)?.label;

  const getQurans = () => {
    return books.filter(b => b.quranReading || b.quranSize);
  };

  const getQuranSizes = () => {
    const sizes = new Set(getQurans().map(b => b.quranSize || 'غير محدد'));
    return Array.from(sizes);
  };

  const renderQuransTab = () => {
    const allQurans = getQurans();
    const sizes = getQuranSizes();

    if (selectedQuranSize) {
      const filteredQurans = allQurans.filter(b => 
        (selectedQuranSize === 'الكل' || b.quranSize === selectedQuranSize || (!b.quranSize && selectedQuranSize === 'غير محدد'))
      );

      return (
        <div className="h-full flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><Scroll size={24} /></div>
               <div>
                  <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{selectedQuranSize === 'الكل' ? 'كل المصاحف' : `حجم: ${selectedQuranSize}`}</h2>
                  <p className="text-gray-400 text-sm font-bold">عرض المصاحف</p>
               </div>
            </div>
            <button onClick={() => setSelectedQuranSize(null)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-gray-100 text-emerald-900'}`}><ChevronLeft size={20} className="stroke-emerald-600" /> العودة للأحجام</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
             <BookList 
               books={filteredQurans} 
               onEdit={onEditBook} 
               onDelete={handleDeleteClick} 
               isDarkMode={isDarkMode} 
               isQuranMode={true}
             />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-2">
          {/* قسم الكل */}
          <div 
            onClick={() => setSelectedQuranSize('الكل')}
            className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-gray-100'}`}
          >
             <div className="p-4 bg-emerald-500 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform"><LayoutGrid size={32} /></div>
             <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>الكل</h4>
             <p className="text-[10px] text-gray-400 font-bold mt-2">{allQurans.length} مصحف</p>
          </div>

          {sizes.map((item) => {
            const size = item as string;
            const count = allQurans.filter(b => b.quranSize === size || (!b.quranSize && size === 'غير محدد')).length;
            
            let Icon = Scroll;
            if (size.includes('الجيب') || size.includes('ثمن')) Icon = StickyNote;
            else if (size.includes('الجوامعي') || size.includes('موسوعي')) Icon = Library;
            else if (size.includes('الربع') || size.includes('النص')) Icon = BookOpen;

            return (
              <div 
                key={size} 
                onClick={() => setSelectedQuranSize(size)}
                className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-gray-100'}`}
              >
                 <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform"><Icon size={32} /></div>
                 <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{size}</h4>
                 <p className="text-[10px] text-gray-400 font-bold mt-2">{count} مصحف</p>
              </div>
            );
          })}
          {sizes.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold">لا توجد مصاحف مضافة بعد</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-right overflow-hidden" dir="rtl">
      
      {/* Header Area with Dynamic Menu Button - Dynamic Z-Index */}
      <div className="flex items-center gap-4 mb-6 px-2 shrink-0 relative">
        <div className={`relative ${isMenuOpen ? 'z-50' : 'z-0'}`}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black transition-all duration-300 shadow-md hover:scale-105 active:scale-95 ${
              isDarkMode 
                ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-white/5' 
                : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-100'
            }`}
          >
            <Menu size={20} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
            قوائم
          </button>

          {/* Animated Dropdown Menu */}
          <div className={`absolute top-full right-0 mt-3 w-64 rounded-3xl shadow-2xl border overflow-hidden transition-all duration-300 origin-top-right transform ${
            isMenuOpen 
              ? 'opacity-100 scale-100 translate-y-0 visible' 
              : 'opacity-0 scale-95 -translate-y-2 invisible pointer-events-none'
            } ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-emerald-100'}`}
          >
            <div className="p-2 flex flex-col gap-1">
              {menuOptions.filter(opt => opt.id !== activeTab).map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => { setActiveTab(option.id as any); setIsMenuOpen(false); setSelectedQuranSize(null); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                      isDarkMode 
                        ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' 
                        : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <Icon size={18} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <h2 className={`text-2xl font-black tracking-wide ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
          المخزن <span className="text-gray-400 text-lg mx-2">/</span> {currentTabLabel}
        </h2>
      </div>

      {/* Backdrop to close menu when clicking outside */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {activeTab === 'books' ? (
          <BookList 
            books={books.filter(b => !b.quranReading && !b.quranSize && !b.isSchoolBook)} // Filter out Qurans and School Books from main book list
            onEdit={onEditBook} 
            onUpdateBook={onUpdateBook}
            onDelete={handleDeleteClick} 
            isDarkMode={isDarkMode}
          />
        ) : activeTab === 'qurans' ? (
          <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-10">
            {renderQuransTab()}
          </div>
        ) : activeTab === 'school-books' ? (
          <div className="h-full min-h-0 flex flex-col">
            <SchoolBooks 
              books={books}
              series={schoolBookSeries}
              grades={schoolBookGrades}
              onAddSeries={onAddSchoolBookSeries}
              onDeleteSeries={onDeleteSchoolBookSeries}
              onAddGrade={onAddSchoolBookGrade}
              onDeleteGrade={onDeleteSchoolBookGrade}
              onEditBook={onEditBook}
              onDeleteBook={handleDeleteClick}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : activeTab === 'sections' ? (
          <div className="h-full min-h-0 flex flex-col">
            <Categories 
              categories={categories} 
              subCategories={subCategories}
              books={books} 
              onAdd={onAddCategory} 
              onUpdate={onUpdateCategory} 
              onDelete={onDeleteCategory} 
              onAddSubCategory={onAddSubCategory}
              onDeleteSubCategory={onDeleteSubCategory}
              onEditBook={onEditBook}
              onUpdateBook={onUpdateBook}
              onBatchUpdateBooks={onBatchUpdateBooks}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : (
          <div className="h-full min-h-0 flex flex-col">
            <Publishers 
              publishers={publishers}
              categories={categories}
              books={books}
              onAdd={onAddPublisher}
              onUpdate={onUpdatePublisher}
              onDelete={onDeletePublisher}
              onAddCategory={onAddCategory}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
              onEditBook={onEditBook}
              onUpdateBook={onUpdateBook}
              isDarkMode={isDarkMode}
            />
          </div>
        )}
      </div>

      {/* نافذة تأكيد حذف الكتاب */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف الكتاب"
        message="هل أنت متأكد من رغبتك في حذف هذا الكتاب بشكل نهائي؟ لا يمكن التراجع عن هذه العملية."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default Warehouse;
