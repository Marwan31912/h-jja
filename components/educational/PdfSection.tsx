import React, { useState, useRef } from 'react';
import { 
  FileText, Upload, Download, Eye, Trash2, Plus, 
  ZoomIn, ZoomOut, Maximize2, Minimize2, X, BookOpen, HardDrive, Check,
  AlertCircle, RefreshCw, Layers, Sparkles, CheckCircle2
} from 'lucide-react';
import { PdfFile } from '../../types';
import { 
  savePdfFile, 
  getPdfFileUrl, 
  deletePdfFile, 
  savePdfBlob, 
  getPdfBlob, 
  deletePdfBlob 
} from '../../services/eduStorage';

interface PdfItem {
  name: string;
  pageCount: number;
  size: number;
  author: string;
  id?: string;
}

interface PdfSectionProps {
  pdfs: PdfItem[];
  folderId: string;
  onUpdatePdfs: (updated: PdfItem[]) => void;
  isDarkMode?: boolean;
  onShowToast: (msg: string) => void;
}

export interface BatchPdfQueueItem {
  id: string;
  file: File;
  name: string;
  author: string;
  pageCount: number;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  errorMessage?: string;
  createdPdf?: PdfItem;
}

export const PdfSection: React.FC<PdfSectionProps> = ({
  pdfs,
  folderId,
  onUpdatePdfs,
  isDarkMode,
  onShowToast
}) => {
  const [activePdf, setActivePdf] = useState<PdfItem | null>(null);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Batch Upload Queue State
  const [batchQueue, setBatchQueue] = useState<BatchPdfQueueItem[]>([]);
  const [batchCommonAuthor, setBatchCommonAuthor] = useState('');
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [overallBatchProgress, setOverallBatchProgress] = useState(0);
  const [isDraggingOverPicker, setIsDraggingOverPicker] = useState(false);

  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  const handleOpenPdf = async (pdf: PdfItem) => {
    setActivePdf(pdf);
    setCurrentPageNum(1);
    setZoom(100);

    // 1. Direct streaming from physical PDF storage on server
    const targetFileName = (pdf as any).fileName || pdf.name;
    if (targetFileName) {
      setActivePdfUrl(getPdfFileUrl(targetFileName));
      return;
    }

    if (pdf.id) {
      const blob = await getPdfBlob(pdf.id);
      if (blob) {
        setActivePdfUrl(URL.createObjectURL(blob));
        return;
      }
    }
    setActivePdfUrl(null);
  };

  // Helper to clean filename into readable document title
  const cleanFileNameToName = (filename: string): string => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return (nameWithoutExt
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'مستند دراسي') + '.pdf';
  };

  // Estimate page count based on PDF file size or default heuristic
  const estimatePageCount = (fileSize: number): number => {
    // Average 100KB per standard document page
    const estimated = Math.max(1, Math.round(fileSize / (85 * 1024)));
    return Math.min(estimated, 250);
  };

  // Handle adding selected multiple files to batch queue
  const handleFilesSelected = (filesList: FileList | File[]) => {
    const incomingFiles = Array.from(filesList).filter(f => 
      f.type === 'application/pdf' || /\.(pdf|doc|docx)$/i.test(f.name)
    );

    if (incomingFiles.length === 0) {
      onShowToast('يرجى اختيار ملفات مستندات مدعومة بصيغة (PDF)');
      return;
    }

    const newItems: BatchPdfQueueItem[] = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      const uniqueId = 'queue_pdf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + i;
      const formattedName = cleanFileNameToName(file.name);
      const estPages = estimatePageCount(file.size);

      newItems.push({
        id: uniqueId,
        file,
        name: formattedName,
        author: batchCommonAuthor.trim() || 'إدارة المحتوى الأكاديمي',
        pageCount: estPages,
        size: file.size,
        status: 'pending',
        progress: 0
      });
    }

    setBatchQueue(prev => [...prev, ...newItems]);
    onShowToast(`تمت إضافة ${incomingFiles.length} ملف PDF إلى قائمة الرفع المتعدد.`);
  };

  // Start Batch Upload Pipeline & Worker
  const startBatchUpload = async () => {
    const pendingItems = batchQueue.filter(item => item.status === 'pending' || item.status === 'error');
    if (pendingItems.length === 0) {
      onShowToast('لا توجد ملفات معلقة في قائمة الرفع');
      return;
    }

    setIsBatchUploading(true);
    let completedCount = batchQueue.filter(item => item.status === 'completed').length;
    const totalCount = batchQueue.length;
    const newlyCreatedPdfs: PdfItem[] = [];

    // Process items with fine progress updates & isolated error boundaries
    for (const item of pendingItems) {
      setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 20, errorMessage: undefined } : q));

      const docId = 'pdf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      try {
        setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 60 } : q));

        // Save PDF to physical filesystem (server_pdfs/)
        const fileRes = await savePdfFile(docId, item.file, item.name);

        setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 90 } : q));

        const finalName = item.name.trim().endsWith('.pdf') ? item.name.trim() : `${item.name.trim()}.pdf`;

        const newDoc: PdfItem = {
          id: docId,
          name: finalName,
          fileName: fileRes.fileName || finalName,
          pageCount: Number(item.pageCount) || 1,
          size: fileRes.size || item.size,
          author: (item.author.trim() || batchCommonAuthor.trim()) || 'إدارة المحتوى الأكاديمي'
        } as any;

        newlyCreatedPdfs.push(newDoc);
        completedCount++;

        // Mark individual item as completed
        setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', progress: 100, createdPdf: newDoc } : q));

        // Update overall progress
        const overall = Math.round((completedCount / totalCount) * 100);
        setOverallBatchProgress(overall);

      } catch (err: any) {
        console.error(`Error saving PDF for ${item.file.name}:`, err);
        // Isolated error handling: flag current item as error, let others continue
        setBatchQueue(prev => prev.map(q => q.id === item.id ? { 
          ...q, 
          status: 'error', 
          progress: 0, 
          errorMessage: err?.message || 'فشل في حفظ ملف PDF في مجلد الخادم' 
        } : q));
      }
    }

    setIsBatchUploading(false);

    if (newlyCreatedPdfs.length > 0) {
      onUpdatePdfs([...newlyCreatedPdfs, ...pdfs]);
      onShowToast(`تم حفظ وتخزين ${newlyCreatedPdfs.length} ملف PDF بنجاح في مجلد الخادم الموحد!`);
    } else {
      onShowToast('لم يكتمل رفع أي ملف بنجاح، يرجى مراجعة الأخطاء والمحاولة ثانية.');
    }
  };

  // Remove item from queue
  const handleRemoveQueueItem = (id: string) => {
    setBatchQueue(prev => prev.filter(q => q.id !== id));
  };

  // Update specific item in queue
  const handleUpdateQueueItem = (id: string, updates: Partial<BatchPdfQueueItem>) => {
    setBatchQueue(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  // Reset / Clear Queue
  const handleClearQueue = () => {
    if (isBatchUploading) return;
    setBatchQueue([]);
    setOverallBatchProgress(0);
  };

  const handleDeletePdf = async (idx: number, pdfId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const targetPdf = pdfs[idx];
    if ((targetPdf as any)?.fileName) {
      await deletePdfFile((targetPdf as any).fileName);
    }
    if (pdfId) {
      await deletePdfBlob(pdfId);
    }
    const updated = pdfs.filter((_, i) => i !== idx);
    onUpdatePdfs(updated);
    if (activePdf?.name === pdfs[idx]?.name) {
      setActivePdf(null);
      setActivePdfUrl(null);
    }
    onShowToast('تم حذف ملف PDF بنجاح من مجلد الخادم');
  };

  // Summary counts for batch queue
  const completedBatchCount = batchQueue.filter(q => q.status === 'completed').length;
  const errorBatchCount = batchQueue.filter(q => q.status === 'error').length;
  const pendingBatchCount = batchQueue.filter(q => q.status === 'pending' || q.status === 'uploading').length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black flex items-center gap-2">
            <FileText className="text-red-500" size={24} />
            <span>02 - ملفات PDF والمذكرات الدراسية</span>
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1">
            دعم كامل لرفع عدة ملفات ومذكرات PDF دفعة واحدة (Batch Upload) مع القارئ التفاعلي المدمج.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all hover:scale-105"
        >
          <Upload size={16} />
          <span>رفع ملفات PDF متعددة (Batch Upload)</span>
        </button>
      </div>

      {/* PDF Interactive Reader */}
      {activePdf && (
        <div className={`p-6 rounded-[32px] border shadow-2xl space-y-4 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-base font-black">{activePdf.name}</h4>
                <p className="text-xs text-gray-400 font-bold">{activePdf.author} • {activePdf.pageCount} صفحة • {formatSize(activePdf.size)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(prev => Math.max(60, prev - 15))} className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-black px-2">{zoom}%</span>
              <button onClick={() => setZoom(prev => Math.min(200, prev + 15))} className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                <ZoomIn size={16} />
              </button>
              <button onClick={() => { setActivePdf(null); setActivePdfUrl(null); }} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Reader Body */}
          <div className="min-h-[480px] max-h-[600px] overflow-auto rounded-2xl bg-zinc-950 p-6 flex flex-col items-center justify-center">
            {activePdfUrl ? (
              <iframe 
                src={activePdfUrl} 
                className="w-full h-[520px] rounded-xl border-0" 
                title={activePdf.name}
              />
            ) : (
              <div 
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }} 
                className="w-full max-w-2xl bg-white text-gray-900 rounded-xl shadow-2xl p-10 min-h-[500px] flex flex-col justify-between transition-transform duration-200"
              >
                <div>
                  <div className="border-b pb-4 mb-6 flex justify-between items-center text-xs text-gray-400 font-bold">
                    <span>{activePdf.name}</span>
                    <span>صفحة {currentPageNum} من {activePdf.pageCount}</span>
                  </div>
                  <h2 className="text-2xl font-black text-emerald-800 mb-4">{activePdf.name.replace('.pdf', '')}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed font-serif mb-6">
                    هذا عرض نموذجي لمحتوى المذكرة التعليمية والملخص الأكاديمي، مهيأ للقراءة التفاعلية مع دعم أدوات التكبير والتصغير وتصفح الصفحات والمراجع العلمية المعتمدة في المقرر.
                  </p>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500 font-bold space-y-2">
                    <div>📌 إعداد وتنسيق: {activePdf.author}</div>
                    <div>📚 عدد صفحات المرجع: {activePdf.pageCount} صفحة</div>
                    <div>💾 الحجم التقديري: {formatSize(activePdf.size)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t mt-8 text-xs font-bold text-gray-400">
                  <button 
                    disabled={currentPageNum <= 1}
                    onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-40"
                  >
                    الصفحة السابقة
                  </button>
                  <span>{currentPageNum} / {activePdf.pageCount}</span>
                  <button 
                    disabled={currentPageNum >= activePdf.pageCount}
                    onClick={() => setCurrentPageNum(p => Math.min(activePdf.pageCount, p + 1))}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-40"
                  >
                    الصفحة التالية
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid of PDFs */}
      {pdfs.length === 0 ? (
        <div className={`p-12 rounded-[32px] border text-center flex flex-col items-center justify-center ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <FileText size={32} />
          </div>
          <h4 className="text-base font-black mb-1">لا توجد ملفات PDF في هذا المجلد بعد</h4>
          <p className="text-xs text-gray-400 font-bold mb-6 max-w-md">
            قم برفع حزمة أو عدة مذكرات وكتب بصيغة PDF دفعة واحدة لتخزينها محلياً وقراءتها فوراً.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-red-700 transition-all flex items-center gap-2"
          >
            <Upload size={16} />
            <span>رفع ملفات PDF متعددة الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pdfs.map((pdf, idx) => (
            <div 
              key={idx}
              onClick={() => handleOpenPdf(pdf)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 relative flex flex-col justify-between ${
                activePdf?.name === pdf.name
                  ? 'ring-2 ring-red-500 bg-red-50/20 dark:bg-red-500/10 border-red-500/40'
                  : isDarkMode ? 'bg-zinc-900/90 border-white/5 hover:border-red-500/30' : 'bg-white border-gray-200/80 hover:border-red-200 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <FileText size={18} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenPdf(pdf); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title="عرض وقراءة"
                    >
                      <Eye size={15} />
                    </button>
                    <button 
                      onClick={(e) => handleDeletePdf(idx, pdf.id, e)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="حذف الملف"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h4 className="text-xs sm:text-sm font-black mb-1 line-clamp-2 group-hover:text-red-500 transition-colors">
                  {pdf.name}
                </h4>
                <p className="text-[11px] text-gray-400 font-bold mb-3 truncate">
                  {pdf.author}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-white/5 text-[11px] font-bold text-gray-400">
                <span className="flex items-center gap-1">
                  <BookOpen size={12} className="text-red-500" />
                  <span>{pdf.pageCount} صفحة</span>
                </span>
                <span className="flex items-center gap-1 text-[10px]">
                  <HardDrive size={11} />
                  <span>{formatSize(pdf.size)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multi-File Batch PDF Upload Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className={`w-full max-w-3xl rounded-[32px] p-6 sm:p-8 shadow-2xl border my-8 flex flex-col max-h-[90vh] ${
            isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <span>رفع حزمة ملفات ومذكرات PDF متعددة</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black">
                      طابور متسلسل معزول الأخطاء
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    اختر عدة ملفات ومذكرات PDF دفعة واحدة لتخزينها محلياً وبناء طابور الرفع
                  </p>
                </div>
              </div>
              <button 
                disabled={isBatchUploading}
                onClick={() => {
                  if (!isBatchUploading) {
                    setShowAddModal(false);
                  }
                }} 
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 disabled:opacity-30"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 space-y-5 pr-1 pl-1">
              
              {/* Drag/Drop and Multi-File Picker Zone */}
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOverPicker(true);
                }}
                onDragLeave={() => setIsDraggingOverPicker(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOverPicker(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFilesSelected(e.dataTransfer.files);
                  }
                }}
                onClick={() => {
                  if (!isBatchUploading) multiFileInputRef.current?.click();
                }}
                className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all ${
                  isDraggingOverPicker 
                    ? 'border-red-500 bg-red-500/10 scale-[1.01]' 
                    : isDarkMode ? 'border-zinc-700 bg-zinc-800/40 hover:border-red-500' : 'border-gray-300 bg-gray-50/80 hover:border-red-500'
                } ${isBatchUploading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input 
                  ref={multiFileInputRef} 
                  type="file" 
                  multiple 
                  accept="application/pdf,.pdf,.doc,.docx" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
                <FileText size={36} className="mx-auto mb-2 text-red-500" />
                <h4 className="text-sm font-black text-red-600 dark:text-red-400 mb-1">
                  اضغط لاختيار عدة ملفات PDF أو قم بسحبها وإفلاتها هنا (Multiple PDFs)
                </h4>
                <p className="text-xs text-gray-400 font-bold">
                  يدعم اختيار عشرات المذكرات والكتب الدراسية بصيغة PDF في نقرة واحدة
                </p>
              </div>

              {/* Batch Common Author / Department Configuration */}
              <div className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-zinc-800/30 border-white/5' : 'bg-gray-50 border-gray-200/70'}`}>
                <div className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-red-500" />
                  <span>اسم المؤلف أو القسم الموحد للحزمة:</span>
                </div>
                <input 
                  type="text"
                  disabled={isBatchUploading}
                  value={batchCommonAuthor}
                  onChange={(e) => {
                    setBatchCommonAuthor(e.target.value);
                    setBatchQueue(prev => prev.map(q => q.status === 'pending' ? { ...q, author: e.target.value } : q));
                  }}
                  placeholder="مثال: قسم علوم الحاسب / د. محمد علي"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                    isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-gray-200 text-gray-800'
                  }`}
                />
              </div>

              {/* Overall Progress Tracker */}
              {batchQueue.length > 0 && (
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-zinc-800/60 border-white/5' : 'bg-white border-gray-200'
                } space-y-2`}>
                  <div className="flex items-center justify-between text-xs font-black">
                    <div className="flex items-center gap-2">
                      <Layers size={15} className="text-red-500" />
                      <span>حالة طابور الرفع (Upload Queue):</span>
                      <span className="text-red-600 dark:text-red-400 font-bold">
                        {completedBatchCount} مكتمل من {batchQueue.length}
                      </span>
                      {errorBatchCount > 0 && (
                        <span className="text-red-500 font-bold">
                          • {errorBatchCount} تعثر
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 dark:text-red-400">{overallBatchProgress}%</span>
                      {!isBatchUploading && (
                        <button 
                          onClick={handleClearQueue}
                          className="text-[11px] text-gray-400 hover:text-red-500 font-bold mr-2"
                        >
                          إفراغ القائمة
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
                      style={{ width: `${overallBatchProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Items List in Queue */}
              {batchQueue.length > 0 ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {batchQueue.map((item, idx) => (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all text-xs ${
                        item.status === 'completed'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : item.status === 'error'
                          ? 'border-red-500/30 bg-red-500/5'
                          : item.status === 'uploading'
                          ? 'border-red-500/40 bg-red-500/5 ring-1 ring-red-500/20'
                          : isDarkMode ? 'border-zinc-800 bg-zinc-900/60' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                            item.status === 'completed' 
                              ? 'bg-emerald-500 text-white' 
                              : item.status === 'error'
                              ? 'bg-red-500 text-white'
                              : item.status === 'uploading'
                              ? 'bg-red-500 text-white animate-pulse'
                              : isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {item.status === 'completed' ? (
                              <Check size={16} />
                            ) : item.status === 'error' ? (
                              <AlertCircle size={16} />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            {/* Editable Document Title */}
                            <input 
                              type="text"
                              disabled={isBatchUploading || item.status === 'completed'}
                              value={item.name}
                              onChange={(e) => handleUpdateQueueItem(item.id, { name: e.target.value })}
                              placeholder="اسم المذكرة أو الكتاب..."
                              className={`w-full font-black text-xs px-2 py-1 rounded-lg border outline-none ${
                                isDarkMode ? 'bg-zinc-800/70 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                              }`}
                            />

                            <div className="flex items-center gap-3 text-[11px] text-gray-400 font-bold flex-wrap">
                              <span className="text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                                📄 {item.file.name}
                              </span>
                              <span>💾 {formatSize(item.size)}</span>
                              <span>📖 {item.pageCount} صفحة تقديرية</span>
                              {item.author && <span>👤 {item.author}</span>}
                            </div>

                            {item.errorMessage && (
                              <div className="text-[11px] font-bold text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle size={12} />
                                <span>{item.errorMessage}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status / Delete from queue */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'completed' ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>تم الحفظ</span>
                            </span>
                          ) : item.status === 'uploading' ? (
                            <span className="text-red-500 font-black text-xs">
                              {item.progress}%
                            </span>
                          ) : item.status === 'error' ? (
                            <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-black">
                              تعثر
                            </span>
                          ) : null}

                          {!isBatchUploading && item.status !== 'completed' && (
                            <button 
                              type="button"
                              onClick={() => handleRemoveQueueItem(item.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="حذف من الطابور"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Individual Progress Bar */}
                      {item.status === 'uploading' && (
                        <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden mt-2.5">
                          <div 
                            className="h-full bg-red-500 transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-400 font-bold border border-dashed rounded-2xl dark:border-zinc-800">
                  لم يتم إضافة ملفات إلى طابور الرفع بعد. اختر ملفات PDF من الزر أعلاه.
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-white/5 mt-4 shrink-0">
              <div className="text-xs font-bold text-gray-400">
                {batchQueue.length > 0 && (
                  <span>الإجمالي: {batchQueue.length} ملفات ({formatSize(batchQueue.reduce((acc, q) => acc + q.size, 0))})</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  disabled={isBatchUploading}
                  onClick={() => setShowAddModal(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black ${
                    isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {completedBatchCount > 0 ? 'إغلاق' : 'إلغاء'}
                </button>

                <button 
                  type="button"
                  disabled={isBatchUploading || pendingBatchCount === 0}
                  onClick={startBatchUpload}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
                >
                  {isBatchUploading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>جاري الرفع ({overallBatchProgress}%)...</span>
                    </>
                  ) : errorBatchCount > 0 && pendingBatchCount > 0 ? (
                    <>
                      <RefreshCw size={15} />
                      <span>إعادة محاولة رفع المتعثر ({pendingBatchCount})</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>بدء رفع الحزمة ({pendingBatchCount} ملف)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
