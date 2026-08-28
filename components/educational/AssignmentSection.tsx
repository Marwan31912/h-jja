import React, { useState } from 'react';
import { 
  CheckSquare, Plus, Trash2, Calendar, Award, 
  Upload, FileCheck, CheckCircle2, Clock, X, Check, Edit3 
} from 'lucide-react';
import { AssignmentItem } from '../../types';

interface AssignmentSectionProps {
  assignments: AssignmentItem[];
  folderId: string;
  onUpdateAssignments: (updated: AssignmentItem[]) => void;
  isDarkMode?: boolean;
  onShowToast: (msg: string) => void;
}

export const AssignmentSection: React.FC<AssignmentSectionProps> = ({
  assignments,
  folderId,
  onUpdateAssignments,
  isDarkMode,
  onShowToast
}) => {
  const [activeItem, setActiveItem] = useState<AssignmentItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Submission modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionFile, setSubmissionFile] = useState<string>('');

  // Add form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('2026-09-30');
  const [maxScore, setMaxScore] = useState(20);

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: AssignmentItem = {
      id: 'asg_' + Date.now(),
      title: title.trim(),
      description: desc.trim() || 'المطلوب حل التمارين المرفقة وتسليم الإجابات قبل انتهاء الموعد المحدد.',
      dueDate,
      maxScore: Number(maxScore) || 20,
      folderId,
      addedAt: Date.now(),
      status: 'pending'
    };

    onUpdateAssignments([newItem, ...assignments]);
    setShowAddModal(false);
    setTitle('');
    setDesc('');
    onShowToast('تم إضافة الواجب الدراسي بنجاح');
  };

  const handleDeleteAssignment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateAssignments(assignments.filter(a => a.id !== id));
    if (activeItem?.id === id) setActiveItem(null);
    onShowToast('تم حذف الواجب بنجاح');
  };

  const handleSaveSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    const updated = assignments.map(a => {
      if (a.id === activeItem.id) {
        return {
          ...a,
          status: 'submitted' as const,
          submissionNotes: submissionNotes.trim(),
          submittedFile: submissionFile || 'ملف_حل_الواجب.pdf',
          submittedAt: Date.now()
        };
      }
      return a;
    });

    onUpdateAssignments(updated);
    setShowSubmitModal(false);
    setActiveItem(updated.find(a => a.id === activeItem.id) || null);
    onShowToast('تم تسليم حل الواجب بنجاح!');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black flex items-center gap-2">
            <CheckSquare className="text-amber-500" size={24} />
            <span>03 - الواجبات والتكليفات الدراسية</span>
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1">
            إدارة المهام والتكليفات الأكاديمية مع تتبع المواعيد والتسليم والتقييم.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-600/30 hover:bg-amber-700 transition-all hover:scale-105"
        >
          <Plus size={16} />
          <span>إضافة واجب جديد</span>
        </button>
      </div>

      {/* Active Assignment Details Drawer/Modal */}
      {activeItem && (
        <div className={`p-6 rounded-[32px] border shadow-2xl space-y-4 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <CheckSquare size={20} />
              </div>
              <div>
                <h4 className="text-base font-black">{activeItem.title}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-bold mt-0.5">
                  <span className="flex items-center gap-1"><Calendar size={12} /> آخر موعد: {activeItem.dueDate || 'غير محدد'}</span>
                  <span className="flex items-center gap-1"><Award size={12} /> الدرجة القصوى: {activeItem.maxScore || 20} درجة</span>
                </div>
              </div>
            </div>

            <button onClick={() => setActiveItem(null)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 text-xs font-bold leading-relaxed space-y-2">
            <div className="text-gray-500 dark:text-zinc-400">تعليمات التكليف:</div>
            <p className="text-gray-800 dark:text-zinc-200">{activeItem.description}</p>
          </div>

          {/* Submission status & action */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black">حالة التسليم:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                activeItem.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-600' :
                activeItem.status === 'graded' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {activeItem.status === 'submitted' ? 'تم التسليم بنجاح' :
                 activeItem.status === 'graded' ? `تم التصحيح (${activeItem.grade}/${activeItem.maxScore})` : 'في انتظار التسليم'}
              </span>
            </div>

            <button 
              onClick={() => {
                setSubmissionNotes(activeItem.submissionNotes || '');
                setShowSubmitModal(true);
              }}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              <Upload size={14} />
              <span>{activeItem.status === 'submitted' ? 'تعديل الحل المسلّم' : 'تسليم الحل الآن'}</span>
            </button>
          </div>

          {activeItem.teacherFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              💬 ملاحظات المصحح: {activeItem.teacherFeedback}
            </div>
          )}
        </div>
      )}

      {/* Grid of Assignments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assignments.map((asg, idx) => (
          <div 
            key={asg.id}
            onClick={() => setActiveItem(asg)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 relative flex flex-col justify-between ${
              activeItem?.id === asg.id
                ? 'ring-2 ring-amber-500 bg-amber-50/20 dark:bg-amber-500/10 border-amber-500/40'
                : isDarkMode ? 'bg-zinc-900/90 border-white/5 hover:border-amber-500/30' : 'bg-white border-gray-200/80 hover:border-amber-200 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <CheckSquare size={18} />
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => handleDeleteAssignment(asg.id, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="text-[10px] font-black text-amber-500 mb-1">واجب {idx + 1}</div>
              <h4 className="text-xs sm:text-sm font-black mb-1 line-clamp-2 group-hover:text-amber-500 transition-colors">
                {asg.title}
              </h4>
              <p className="text-[11px] text-gray-400 font-bold mb-3 line-clamp-2 leading-relaxed">
                {asg.description}
              </p>
            </div>

            <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-amber-500" />
                  <span>{asg.dueDate || 'قريباً'}</span>
                </span>
                <span className="flex items-center gap-1 font-black text-amber-600 dark:text-amber-400 text-[10px]">
                  <Award size={11} />
                  <span>{asg.maxScore || 20} درجة</span>
                </span>
              </div>
              <div className="text-left">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black ${
                  asg.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
                }`}>
                  {asg.status === 'submitted' ? 'تم التسليم' : 'معلق'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <CheckSquare size={20} />
                </div>
                <h3 className="text-lg font-black">إضافة واجب دراسي جديد</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-black mb-1.5">عنوان الواجب *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required
                  placeholder="مثال: الواجب الأول: حل مسائل المصفوفات"
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black mb-1.5">آخر موعد للتسليم</label>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1.5">الدرجة القصوى</label>
                  <input 
                    type="number" 
                    min="1"
                    value={maxScore} 
                    onChange={(e) => setMaxScore(Number(e.target.value))} 
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">تعليمات ومطلوب الواجب</label>
                <textarea 
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                  rows={3}
                  placeholder="شرح متطلبات الحل وكيفية التقييم..."
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-amber-500 resize-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-black bg-gray-100 dark:bg-zinc-800">
                  إلغاء
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2">
                  <Check size={16} />
                  <span>حفظ الواجب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
              <h3 className="text-lg font-black">تسليم إجابة الواجب</h3>
              <button onClick={() => setShowSubmitModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSubmission} className="space-y-4">
              <div>
                <label className="block text-xs font-black mb-1.5">ملاحظات وشرح الإجابة</label>
                <textarea 
                  value={submissionNotes} 
                  onChange={(e) => setSubmissionNotes(e.target.value)} 
                  rows={3}
                  placeholder="أدخل ملخص إجابتك أو روابط أو خطوات الحل..."
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">اسم ملف الحل المرفق</label>
                <input 
                  type="text" 
                  value={submissionFile} 
                  onChange={(e) => setSubmissionFile(e.target.value)} 
                  placeholder="مثال: حل_الواجب_احمد_علي.pdf"
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-black bg-gray-100 dark:bg-zinc-800">
                  إلغاء
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                  <Check size={16} />
                  <span>تأكيد التسليم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
