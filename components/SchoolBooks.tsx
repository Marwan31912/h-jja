
import React, { useState } from 'react';
import { Book, SchoolBookSeries, SchoolBookGrade } from '../types';
import { Library, Plus, ChevronLeft, Trash2, BookOpen, Layers, Tag, GraduationCap } from 'lucide-react';
import BookList from './BookList';

interface SchoolBooksProps {
  books: Book[];
  series: SchoolBookSeries[];
  grades: SchoolBookGrade[];
  onAddSeries: (series: SchoolBookSeries) => void;
  onDeleteSeries: (id: string) => void;
  onAddGrade: (grade: SchoolBookGrade) => void;
  onDeleteGrade: (id: string) => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  isDarkMode?: boolean;
}

const SchoolBooks: React.FC<SchoolBooksProps> = ({
  books,
  series,
  grades,
  onAddSeries,
  onDeleteSeries,
  onAddGrade,
  onDeleteGrade,
  onEditBook,
  onDeleteBook,
  isDarkMode
}) => {
  const [view, setView] = useState<'series' | 'grades' | 'books'>('series');
  const [selectedSeries, setSelectedSeries] = useState<SchoolBookSeries | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<SchoolBookGrade | null>(null);
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newGradeName, setNewGradeName] = useState('');

  const schoolBooks = books.filter(b => b.isSchoolBook);

  const handleAddSeries = () => {
    if (!newSeriesName.trim()) return;
    const newSeries: SchoolBookSeries = {
      id: crypto.randomUUID(),
      name: newSeriesName.trim(),
      addedAt: Date.now()
    };
    onAddSeries(newSeries);
    setNewSeriesName('');
    setShowAddSeries(false);
  };

  const handleAddGrade = () => {
    if (!newGradeName.trim() || !selectedSeries) return;
    const newGrade: SchoolBookGrade = {
      id: crypto.randomUUID(),
      seriesId: selectedSeries.id,
      name: newGradeName.trim(),
      addedAt: Date.now()
    };
    onAddGrade(newGrade);
    setNewGradeName('');
    setShowAddGrade(false);
  };

  if (view === 'books' && selectedGrade && selectedSeries) {
    const filteredBooks = schoolBooks.filter(b => b.schoolSeries === selectedSeries.name && b.schoolGrade === selectedGrade.name);
    return (
      <div className="h-full flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><BookOpen size={24} /></div>
            <div>
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>{selectedGrade.name} - {selectedSeries.name}</h2>
              <p className="text-gray-400 text-sm font-bold">قائمة الكتب المدرسية</p>
            </div>
          </div>
          <button 
            onClick={() => setView('grades')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-gray-100 text-blue-900'}`}
          >
            <ChevronLeft size={20} className="stroke-blue-600" /> العودة للصفوف
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
          <BookList 
            books={filteredBooks} 
            onEdit={onEditBook} 
            onDelete={onDeleteBook} 
            isDarkMode={isDarkMode} 
          />
        </div>
      </div>
    );
  }

  if (view === 'grades' && selectedSeries) {
    const seriesGrades = grades.filter(g => g.seriesId === selectedSeries.id);
    return (
      <div className="h-full flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Layers size={24} /></div>
            <div>
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>{selectedSeries.name}</h2>
              <p className="text-gray-400 text-sm font-bold">صفوف السلسلة</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAddGrade(true)} 
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus size={20} /> إضافة صف
            </button>
            <button 
              onClick={() => setView('series')} 
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-gray-100 text-blue-900'}`}
            >
              <ChevronLeft size={20} className="stroke-blue-600" /> العودة للسلاسل
            </button>
          </div>
        </div>

        {showAddGrade && (
          <div className={`mb-6 p-6 rounded-[32px] border animate-in zoom-in duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-blue-100 shadow-xl'}`}>
            <h3 className={`text-lg font-black mb-4 ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>إضافة صف جديد لـ {selectedSeries.name}</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
                placeholder="اسم الصف (مثلاً: الأول الابتدائي)..."
                className={`flex-1 px-5 py-3.5 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold ${isDarkMode ? 'bg-zinc-900 text-white' : 'bg-gray-50 text-blue-900'}`}
              />
              <button onClick={handleAddGrade} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all">حفظ</button>
              <button onClick={() => setShowAddGrade(false)} className={`px-8 py-3.5 rounded-2xl font-black transition-all ${isDarkMode ? 'bg-zinc-700 text-white' : 'bg-gray-100 text-gray-600'}`}>إلغاء</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {seriesGrades.map((grade) => (
            <div 
              key={grade.id}
              className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group relative ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-gray-100'}`}
              onClick={() => { setSelectedGrade(grade); setView('books'); }}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteGrade(grade.id); }}
                className="absolute top-4 left-4 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
              <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform flex items-center justify-center w-fit mx-auto"><GraduationCap size={32} /></div>
              <h4 className={`text-lg font-black text-center ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>{grade.name}</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-2 text-center">
                {schoolBooks.filter(b => b.schoolSeries === selectedSeries.name && b.schoolGrade === grade.name).length} كتاب
              </p>
            </div>
          ))}
          {seriesGrades.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold">لا توجد صفوف مضافة لهذه السلسلة</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Library size={24} /></div>
          <div>
            <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>كل السلاسل</h2>
            <p className="text-gray-400 text-sm font-bold">إدارة سلاسل الكتب المدرسية</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddSeries(true)} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} /> إضافة سلسلة جديدة
        </button>
      </div>

      {showAddSeries && (
        <div className={`mb-6 p-6 rounded-[32px] border animate-in zoom-in duration-300 ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-blue-100 shadow-xl'}`}>
          <h3 className={`text-lg font-black mb-4 ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>إضافة سلسلة مدرسية جديدة</h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={newSeriesName}
              onChange={(e) => setNewSeriesName(e.target.value)}
              placeholder="اسم السلسلة (مثلاً: سلسلة الأضواء)..."
              className={`flex-1 px-5 py-3.5 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold ${isDarkMode ? 'bg-zinc-900 text-white' : 'bg-gray-50 text-blue-900'}`}
            />
            <button onClick={handleAddSeries} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all">حفظ</button>
            <button onClick={() => setShowAddSeries(false)} className={`px-8 py-3.5 rounded-2xl font-black transition-all ${isDarkMode ? 'bg-zinc-700 text-white' : 'bg-gray-100 text-gray-600'}`}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {series.map((s) => (
          <div 
            key={s.id}
            className={`p-6 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group relative ${isDarkMode ? 'bg-zinc-800 border-white/5' : 'bg-white border-gray-100'}`}
            onClick={() => { setSelectedSeries(s); setView('grades'); }}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteSeries(s.id); }}
              className="absolute top-4 left-4 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
            <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform flex items-center justify-center w-fit mx-auto"><Tag size={32} /></div>
            <h4 className={`text-lg font-black text-center ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>{s.name}</h4>
            <p className="text-[10px] text-gray-400 font-bold mt-2 text-center">
              {grades.filter(g => g.seriesId === s.id).length} صفوف
            </p>
          </div>
        ))}
        {series.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold">لا توجد سلاسل مضافة بعد</div>
        )}
      </div>
    </div>
  );
};

export default SchoolBooks;
