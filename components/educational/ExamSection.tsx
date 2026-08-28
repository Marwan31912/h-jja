import React, { useState, useEffect } from 'react';
import { 
  Award, Clock, CheckCircle2, AlertCircle, Play, 
  RotateCcw, Plus, Trash2, X, Check, HelpCircle 
} from 'lucide-react';
import { ExamItem, ExamQuestion } from '../../types';

interface ExamSectionProps {
  exams: ExamItem[];
  folderId: string;
  onUpdateExams: (updated: ExamItem[]) => void;
  isDarkMode?: boolean;
  onShowToast: (msg: string) => void;
}

export const ExamSection: React.FC<ExamSectionProps> = ({
  exams,
  folderId,
  onUpdateExams,
  isDarkMode,
  onShowToast
}) => {
  const [activeExam, setActiveExam] = useState<ExamItem | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);

  // New exam form state
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(15);
  const [qText, setQText] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctOpt, setCorrectOpt] = useState(0);

  // Timer countdown
  useEffect(() => {
    if (!activeExam || examSubmitted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeExam, examSubmitted, timeLeft]);

  const handleStartExam = (exam: ExamItem) => {
    setActiveExam(exam);
    setSelectedAnswers({});
    setExamSubmitted(false);
    setCurrentScore(null);
    setTimeLeft((exam.durationMinutes || 15) * 60);
  };

  const handleSubmitExam = () => {
    if (!activeExam) return;
    let score = 0;
    const pointsPerQ = activeExam.totalScore / (activeExam.questions.length || 1);

    activeExam.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        score += pointsPerQ;
      }
    });

    const finalScore = Math.round(score);
    const passed = finalScore >= (activeExam.totalScore * 0.6);

    setCurrentScore(finalScore);
    setExamSubmitted(true);

    const updated = exams.map(e => {
      if (e.id === activeExam.id) {
        return {
          ...e,
          lastScore: finalScore,
          isPassed: passed,
          completedAt: Date.now()
        };
      }
      return e;
    });

    onUpdateExams(updated);
    onShowToast(`تم إنهاء الاختبار! نتيجتك: ${finalScore} / ${activeExam.totalScore}`);
  };

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !qText.trim() || !opt0.trim() || !opt1.trim()) return;

    const questions: ExamQuestion[] = [
      {
        id: 'q_' + Date.now(),
        question: qText.trim(),
        options: [opt0.trim(), opt1.trim(), opt2.trim() || 'خيار إضافي', opt3.trim() || 'خيار آخر'],
        correctAnswerIndex: Number(correctOpt)
      }
    ];

    const newExam: ExamItem = {
      id: 'exam_' + Date.now(),
      title: title.trim(),
      durationMinutes: Number(duration) || 15,
      totalScore: 100,
      questions,
      folderId,
      addedAt: Date.now()
    };

    onUpdateExams([newExam, ...exams]);
    setShowAddModal(false);
    setTitle('');
    setQText('');
    setOpt0('');
    setOpt1('');
    onShowToast('تم إضافة الاختبار بنجاح');
  };

  const handleDeleteExam = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateExams(exams.filter(e => e.id !== id));
    if (activeExam?.id === id) setActiveExam(null);
    onShowToast('تم حذف الاختبار بنجاح');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black flex items-center gap-2">
            <Award className="text-purple-500" size={24} />
            <span>04 - الاختبارات والتقييم الذاتي</span>
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1">
            كويزات واختبارات تفاعلية مع توقيت زمني وتصحيح فوري وتقييم للدرجات.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-600/30 hover:bg-purple-700 transition-all hover:scale-105"
        >
          <Plus size={16} />
          <span>إنشاء اختبار جديد</span>
        </button>
      </div>

      {/* Active Exam Running View */}
      {activeExam && (
        <div className={`p-6 sm:p-8 rounded-[32px] border shadow-2xl space-y-6 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 flex-wrap gap-4">
            <div>
              <h4 className="text-lg font-black">{activeExam.title}</h4>
              <p className="text-xs text-gray-400 font-bold">إجمالي الدرجة: {activeExam.totalScore} • عدد الأسئلة: {activeExam.questions.length}</p>
            </div>

            <div className="flex items-center gap-3">
              {!examSubmitted && (
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-500/10 text-purple-600 font-black text-sm">
                  <Clock size={16} />
                  <span>الوقت المتبقي: {formatTimer(timeLeft)}</span>
                </div>
              )}
              <button onClick={() => setActiveExam(null)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Results banner if finished */}
          {examSubmitted && (
            <div className={`p-6 rounded-2xl border text-center space-y-2 ${
              (currentScore || 0) >= (activeExam.totalScore * 0.6)
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                : 'bg-red-500/10 border-red-500/30 text-red-600'
            }`}>
              <div className="text-2xl font-black">
                {(currentScore || 0) >= (activeExam.totalScore * 0.6) ? '🎉 مبروك، لقد اجتزت الاختبار بنجاح!' : '⚠️ لم تجتز الاختبار، يمكنك المحاولة مجدداً.'}
              </div>
              <div className="text-base font-black">
                الدرجة النهائية: {currentScore} / {activeExam.totalScore} ({Math.round(((currentScore || 0) / activeExam.totalScore) * 100)}%)
              </div>
            </div>
          )}

          {/* Questions list */}
          <div className="space-y-6">
            {activeExam.questions.map((q, qIndex) => {
              const selectedIdx = selectedAnswers[q.id];
              return (
                <div key={q.id} className="p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-white/5 space-y-3">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">{qIndex + 1}</span>
                    <span>{q.question}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedIdx === optIdx;
                      const isCorrect = q.correctAnswerIndex === optIdx;
                      let btnStyle = isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-white/5' : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200';

                      if (examSubmitted) {
                        if (isCorrect) btnStyle = 'bg-emerald-500/20 text-emerald-600 border-emerald-500 font-black';
                        else if (isSelected && !isCorrect) btnStyle = 'bg-red-500/20 text-red-600 border-red-500';
                      } else if (isSelected) {
                        btnStyle = 'bg-purple-600 text-white border-purple-600 font-black';
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={examSubmitted}
                          onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                          className={`p-3 rounded-xl border text-xs text-right transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {examSubmitted && isCorrect && <Check size={16} className="text-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
            {examSubmitted ? (
              <button 
                onClick={() => handleStartExam(activeExam)}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
              >
                <RotateCcw size={16} />
                <span>إعادة المحاولة</span>
              </button>
            ) : (
              <button 
                onClick={handleSubmitExam}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <Check size={16} />
                <span>تسليم الإجابات وإنهاء الاختبار</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid of Exams */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {exams.map((exam, idx) => (
          <div 
            key={exam.id}
            onClick={() => handleStartExam(exam)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 relative flex flex-col justify-between ${
              activeExam?.id === exam.id
                ? 'ring-2 ring-purple-500 bg-purple-50/20 dark:bg-purple-500/10 border-purple-500/40'
                : isDarkMode ? 'bg-zinc-900/90 border-white/5 hover:border-purple-500/30' : 'bg-white border-gray-200/80 hover:border-purple-200 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Award size={18} />
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => handleDeleteExam(exam.id, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="text-[10px] font-black text-purple-500 mb-1">اختبار {idx + 1}</div>
              <h4 className="text-xs sm:text-sm font-black mb-1 line-clamp-2 group-hover:text-purple-500 transition-colors">
                {exam.title}
              </h4>
              <p className="text-[11px] text-gray-400 font-bold mb-3">
                {exam.questions.length} أسئلة اختيار من متعدد
              </p>
            </div>

            <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-purple-500" />
                  <span>{exam.durationMinutes} دقيقة</span>
                </span>
                {exam.lastScore !== undefined ? (
                  <span className={`font-black text-[10px] ${exam.isPassed ? 'text-emerald-500' : 'text-red-500'}`}>
                    الدرجة: {exam.lastScore}/{exam.totalScore}
                  </span>
                ) : (
                  <span className="text-purple-600 dark:text-purple-400 font-black text-[10px]">ابدأ الآن</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Exam Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
              <h3 className="text-lg font-black">إنشاء كويز / اختبار جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddExam} className="space-y-4">
              <div>
                <label className="block text-xs font-black mb-1.5">عنوان الاختبار *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required
                  placeholder="مثال: الاختبار النصفي للمقرر"
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-purple-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">مدة الاختبار (بالدقائق)</label>
                <input 
                  type="number" 
                  min="1"
                  value={duration} 
                  onChange={(e) => setDuration(Number(e.target.value))} 
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-purple-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="text-xs font-black text-purple-600">السؤال الأول (نموذج):</div>
                <input 
                  type="text" 
                  value={qText} 
                  onChange={(e) => setQText(e.target.value)} 
                  required
                  placeholder="نص السؤال..."
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border outline-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />

                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={opt0} onChange={(e) => setOpt0(e.target.value)} required placeholder="الخيار (1) - الإجابة" className="p-2 rounded-xl text-xs border" />
                  <input type="text" value={opt1} onChange={(e) => setOpt1(e.target.value)} required placeholder="الخيار (2)" className="p-2 rounded-xl text-xs border" />
                  <input type="text" value={opt2} onChange={(e) => setOpt2(e.target.value)} placeholder="الخيار (3) اختياري" className="p-2 rounded-xl text-xs border" />
                  <input type="text" value={opt3} onChange={(e) => setOpt3(e.target.value)} placeholder="الخيار (4) اختياري" className="p-2 rounded-xl text-xs border" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">الإجابة الصحيحة:</label>
                  <select 
                    value={correctOpt} 
                    onChange={(e) => setCorrectOpt(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl text-xs font-bold border bg-gray-50 dark:bg-zinc-800"
                  >
                    <option value={0}>الخيار الأول (1)</option>
                    <option value={1}>الخيار الثاني (2)</option>
                    <option value={2}>الخيار الثالث (3)</option>
                    <option value={3}>الخيار الرابع (4)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-black bg-gray-100 dark:bg-zinc-800">
                  إلغاء
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl text-xs font-black bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2">
                  <Check size={16} />
                  <span>حفظ الاختبار</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
