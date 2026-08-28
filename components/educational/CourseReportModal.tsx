import React, { useState } from 'react';
import { 
  X, Printer, Download, Check, FileText, Video, 
  CheckSquare, Award, Code, Sparkles, Layers, BookOpen, 
  Calendar, User, CheckCircle2, Sliders, ShieldCheck
} from 'lucide-react';
import { 
  PdfCategory, VideoLesson, AssignmentItem, 
  ExamItem, CustomContentCategory, CustomContentItem 
} from '../../types';

interface CourseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: PdfCategory;
  department?: PdfCategory | null;
  departmentPath?: PdfCategory[];
  videos?: VideoLesson[];
  pdfs?: { name: string; pageCount: number; size: number; author: string; id?: string; folderId?: string }[];
  assignments?: AssignmentItem[];
  exams?: ExamItem[];
  customCategories?: CustomContentCategory[];
  customItems?: CustomContentItem[];
  isDarkMode?: boolean;
  systemName?: string;
}

export const CourseReportModal: React.FC<CourseReportModalProps> = ({
  isOpen,
  onClose,
  course,
  department,
  departmentPath = [],
  videos = [],
  pdfs = [],
  assignments = [],
  exams = [],
  customCategories = [],
  customItems = [],
  isDarkMode,
  systemName = 'حجة'
}) => {
  // Pre-export selection states
  const [includeVideos, setIncludeVideos] = useState(true);
  const [includePdfs, setIncludePdfs] = useState(true);
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [includeExams, setIncludeExams] = useState(true);
  const [includeCustomContent, setIncludeCustomContent] = useState(true);
  const [includeCodeSnippets, setIncludeCodeSnippets] = useState(true);
  const [includeExamQuestions, setIncludeExamQuestions] = useState(true);
  const [instructorName, setInstructorName] = useState('أستاذ المقرر');
  const [reportNote, setReportNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !course) return null;

  const deptPathString = (departmentPath || []).length > 0 
    ? (departmentPath || []).map(d => d.name).join(' ❯ ')
    : (department?.name || '');

  // Filter items specific to this course
  const courseVideos = (videos || []).filter(v => v.folderId === `${course.id}_videos`);
  const coursePdfs = (pdfs || []).filter(p => p.folderId === `${course.id}_pdf`);
  const courseAssignments = (assignments || []).filter(a => a.folderId === `${course.id}_assignments`);
  const courseExams = (exams || []).filter(e => e.folderId === `${course.id}_exams`);
  const courseCustomCategories = (customCategories || []).filter(c => c.courseId === course.id);
  const courseCustomItems = (customItems || []).filter(item => item.courseId === course.id);

  const totalSectionsSelected = [
    includeVideos && courseVideos.length > 0,
    includePdfs && coursePdfs.length > 0,
    includeAssignments && courseAssignments.length > 0,
    includeExams && courseExams.length > 0,
    includeCustomContent && courseCustomItems.length > 0
  ].filter(Boolean).length;

  const handleGenerateAndPrint = () => {
    setIsGenerating(true);

    const reportDate = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const reportTime = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build the clean, high-resolution printable HTML for the report
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير مقرر: ${course.name}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * {
            box-sizing: border-box;
            font-family: 'Cairo', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Cairo', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            font-size: 13px;
            direction: rtl;
          }
          .header-box {
            border: 2px solid #10b981;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-title h1 {
            margin: 0 0 6px 0;
            font-size: 20px;
            font-weight: 900;
            color: #065f46;
          }
          .header-title p {
            margin: 0;
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
          }
          .meta-badge {
            background: #065f46;
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 800;
            text-align: center;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .summary-card {
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
          }
          .summary-card .val {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
          }
          .summary-card .lbl {
            font-size: 10px;
            color: #64748b;
            font-weight: 700;
            margin-top: 2px;
          }
          .section-block {
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          .section-header h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-header .count-tag {
            background: #e2e8f0;
            color: #334155;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 12px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 800;
            padding: 8px 10px;
            text-align: right;
            border: 1px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:nth-child(even) td {
            background: #fafafa;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
          }
          .status-green { background: #dcfce7; color: #166534; }
          .status-blue { background: #dbeafe; color: #1e40af; }
          .status-amber { background: #fef3c7; color: #92400e; }
          .code-box {
            background: #0f172a;
            color: #f8fafc;
            border-radius: 8px;
            padding: 12px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            direction: ltr;
            text-align: left;
            overflow-x: auto;
            white-space: pre-wrap;
            border: 1px solid #334155;
            margin: 6px 0 10px 0;
          }
          .code-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .code-tag {
            background: #0284c7;
            color: #ffffff;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #94a3b8;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-box">
          <div class="header-title">
            <h1>تقرير المقرر الأكاديمي: ${course.name}</h1>
            <p>القسم: ${deptPathString || 'القسم العام'} | إشراف: ${instructorName || 'أستاذ المادة'}</p>
            ${course.description ? `<p style="margin-top:4px; font-size:11px; color:#475569;">${course.description}</p>` : ''}
          </div>
          <div class="meta-badge">
            <div>منظومة ${systemName}</div>
            <div style="font-size:9px; font-weight:normal; opacity:0.85; margin-top:2px;">${reportDate}</div>
          </div>
        </div>

        <!-- Summary Statistics -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="val">${courseVideos.length}</div>
            <div class="lbl">دروس فيديو</div>
          </div>
          <div class="summary-card">
            <div class="val">${coursePdfs.length}</div>
            <div class="lbl">ملفات PDF</div>
          </div>
          <div class="summary-card">
            <div class="val">${courseAssignments.length}</div>
            <div class="lbl">واجبات وتكليفات</div>
          </div>
          <div class="summary-card">
            <div class="val">${courseExams.length}</div>
            <div class="lbl">اختبارات وتقييمات</div>
          </div>
        </div>

        ${reportNote ? `
          <div style="background:#f0fdf4; border-right:4px solid #10b981; padding:10px 14px; border-radius:6px; margin-bottom:20px; font-size:11px; color:#166534;">
            <strong>ملاحظة التقرير: </strong>${reportNote}
          </div>
        ` : ''}

        <!-- 1. Videos Section -->
        ${includeVideos && courseVideos.length > 0 ? `
          <div class="section-block">
            <div class="section-header">
              <h2>🎬 الفيديوهات والدروس المرئية</h2>
              <span class="count-tag">${courseVideos.length} درس</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">#</th>
                  <th>عنوان الدرس</th>
                  <th>المحاضر</th>
                  <th>المدة</th>
                  <th>الحالة</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                ${courseVideos.map((vid, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                    <td><strong>${vid.title}</strong></td>
                    <td>${vid.author || 'غير محدد'}</td>
                    <td style="direction: ltr; text-align: right;">${vid.duration || '--:--'}</td>
                    <td>
                      <span class="status-badge ${vid.isCompleted ? 'status-green' : 'status-blue'}">
                        ${vid.isCompleted ? 'مكتمل المشاهدة' : 'قيد المتابعة'}
                      </span>
                    </td>
                    <td style="font-size: 11px; color: #64748b;">${vid.description || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- 2. Files & PDFs Section -->
        ${includePdfs && coursePdfs.length > 0 ? `
          <div class="section-block">
            <div class="section-header">
              <h2>📄 ملفات PDF والمذكرات المرفقة</h2>
              <span class="count-tag">${coursePdfs.length} ملف</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">#</th>
                  <th>اسم الملف والمذكرة</th>
                  <th>المؤلف / المحاضر</th>
                  <th>عدد الصفحات</th>
                  <th>حجم الملف</th>
                </tr>
              </thead>
              <tbody>
                ${coursePdfs.map((pdf, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                    <td><strong>${pdf.name}</strong></td>
                    <td>${pdf.author || 'الكلية'}</td>
                    <td>${pdf.pageCount ? `${pdf.pageCount} صفحة` : 'غير محدد'}</td>
                    <td>${pdf.size ? `${(pdf.size / (1024 * 1024)).toFixed(2)} MB` : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- 3. Assignments Section -->
        ${includeAssignments && courseAssignments.length > 0 ? `
          <div class="section-block">
            <div class="section-header">
              <h2>📝 الواجبات والتكليفات الدراسية</h2>
              <span class="count-tag">${courseAssignments.length} واجب</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">#</th>
                  <th>عنوان التكليف</th>
                  <th>تاريخ التسليم</th>
                  <th>الدرجة القصوى</th>
                  <th>حالة التسليم</th>
                  <th>الدرجة المرصودة</th>
                </tr>
              </thead>
              <tbody>
                ${courseAssignments.map((asg, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                    <td>
                      <strong>${asg.title}</strong>
                      ${asg.description ? `<div style="font-size: 10px; color: #64748b; margin-top:2px;">${asg.description}</div>` : ''}
                    </td>
                    <td>${asg.dueDate || 'مفتوح'}</td>
                    <td>${asg.maxScore || 100} نقطة</td>
                    <td>
                      <span class="status-badge ${
                        asg.status === 'graded' ? 'status-green' : asg.status === 'submitted' ? 'status-blue' : 'status-amber'
                      }">
                        ${asg.status === 'graded' ? 'تم الرصد والتصحيح' : asg.status === 'submitted' ? 'تم التسليم' : 'معلق'}
                      </span>
                    </td>
                    <td><strong>${asg.grade !== undefined ? `${asg.grade} / ${asg.maxScore || 100}` : 'لم ترصد'}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- 4. Exams & Quizzes Section -->
        ${includeExams && courseExams.length > 0 ? `
          <div class="section-block">
            <div class="section-header">
              <h2>🏆 الاختبارات والتقييمات الأكاديمية</h2>
              <span class="count-tag">${courseExams.length} اختبار</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">#</th>
                  <th>عنوان الاختبار</th>
                  <th>المدة الزمنية</th>
                  <th>عدد الأسئلة</th>
                  <th>الدرجة الكلية</th>
                  <th>النتيجة الأخيرة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${courseExams.map((exm, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                    <td><strong>${exm.title}</strong></td>
                    <td>${exm.durationMinutes} دقيقة</td>
                    <td>${exm.questions?.length || 0} سؤال</td>
                    <td>${exm.totalScore} نقطة</td>
                    <td>${exm.lastScore !== undefined ? `${exm.lastScore} / ${exm.totalScore}` : '-'}</td>
                    <td>
                      <span class="status-badge ${exm.isPassed ? 'status-green' : exm.lastScore !== undefined ? 'status-amber' : 'status-blue'}">
                        ${exm.isPassed ? 'اجتياز ناجح' : exm.lastScore !== undefined ? 'مكتمل' : 'متاح للتقديم'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${includeExamQuestions ? `
              <div style="margin-top: 10px;">
                ${courseExams.map(exm => `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
                    <div style="font-weight: 800; font-size: 11px; color: #0f172a; margin-bottom: 6px;">
                      نموذج أسئلة: ${exm.title}
                    </div>
                    ${exm.questions?.slice(0, 3).map((q, qIdx) => `
                      <div style="font-size: 11px; margin-bottom: 4px; color: #334155;">
                        <strong>س${qIdx + 1}:</strong> ${q.question}
                        <span style="color: #10b981; font-weight: bold; margin-right: 8px;">(الإجابة الصحيحة: ${q.options[q.correctAnswerIndex] || ''})</span>
                      </div>
                    `).join('') || '<div style="font-size:10px; color:#94a3b8;">لا توجد أسئلة مسجلة.</div>'}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 5. Custom Content & Source Code Section -->
        ${includeCustomContent && (courseCustomCategories.length > 0 || courseCustomItems.length > 0) ? `
          <div class="section-block">
            <div class="section-header">
              <h2>💻 الأقسام والمحتويات المخصصة (الشيفرات والمشاريع)</h2>
              <span class="count-tag">${courseCustomItems.length} عنصر</span>
            </div>

            ${courseCustomCategories.map(cat => {
              const catItems = courseCustomItems.filter(i => i.folderId === cat.id);
              return `
                <div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #ffffff;">
                  <div style="font-size: 13px; font-weight: 900; color: #0369a1; margin-bottom: 4px; display:flex; justify-content:space-between;">
                    <span>قسم: ${cat.name}</span>
                    <span style="font-size:10px; color:#64748b; font-weight:bold;">${catItems.length} عنصر</span>
                  </div>
                  ${cat.description ? `<p style="font-size:11px; color:#64748b; margin:0 0 10px 0;">${cat.description}</p>` : ''}

                  ${catItems.length === 0 ? '<div style="font-size:11px; color:#94a3b8; padding:6px 0;">لا توجد عناصر مضافة في هذا القسم حالياً.</div>' : ''}

                  ${catItems.map((item, itemIdx) => `
                    <div style="border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 8px;">
                      <div class="code-meta">
                        <div>
                          <strong>${itemIdx + 1}. ${item.title}</strong>
                          ${item.author ? `<span style="font-size:10px; color:#64748b; margin-right:6px;">(إعداد: ${item.author})</span>` : ''}
                        </div>
                        ${item.codeLanguage ? `<span class="code-tag">${item.codeLanguage}</span>` : ''}
                      </div>
                      ${item.description ? `<div style="font-size:11px; color:#475569; margin-bottom:4px;">${item.description}</div>` : ''}
                      ${item.externalUrl ? `<div style="font-size:10px; color:#0284c7; margin-bottom:4px; direction:ltr; text-align:left;">🔗 ${item.externalUrl}</div>` : ''}
                      ${includeCodeSnippets && item.codeSnippet ? `
                        <div class="code-box">${escapeHtml(item.codeSnippet)}</div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div>تم استخراج هذا التقرير آلياً عبر منظومة ${systemName} التعليمية</div>
          <div>تاريخ الطباعة: ${reportDate} - ${reportTime}</div>
          <div>صفحة 1 من 1</div>
        </div>
      </body>
      </html>
    `;

    // Open print window / iframe
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setIsGenerating(false);
      }, 500);
    } else {
      // Fallback to hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printContent);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
          setIsGenerating(false);
        }, 500);
      }
    }
  };

  function escapeHtml(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 text-gray-800'
        }`}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-100 bg-gray-50/70'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shadow-inner">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <span>تخصيص وتصدير تقرير المقرر (PDF)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                  RTL عربي
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                مقرر: <strong className="text-emerald-500">{course.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl text-gray-400 hover:text-gray-600 transition-colors ${
              isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Selection Options */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Instruction Box */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isDarkMode ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-900'
          }`}>
            <Sliders className="shrink-0 mt-0.5 text-emerald-500" size={18} />
            <div className="text-xs leading-relaxed font-bold">
              حدد الأقسام والمكونات التي ترغب في إدراجها داخل تقرير المقرر بصيغة PDF الرسمية. سيتم تجهيز التقرير بجدول إحصائي وتنسيق أكاديمي فائق الدقة.
            </div>
          </div>

          {/* Section Checkboxes */}
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-3">
              الأقسام والمحتويات المطلوب تضمينها:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Videos Checkbox */}
              <label 
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeVideos 
                    ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/40' : 'bg-blue-50/60 border-blue-200')
                    : (isDarkMode ? 'bg-zinc-800/40 border-zinc-800 opacity-60' : 'bg-gray-50 border-gray-100 opacity-60')
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                    <Video size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                      الفيديوهات والدروس المرئية
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      {courseVideos.length} درس مسجل
                    </div>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={includeVideos}
                  onChange={(e) => setIncludeVideos(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </label>

              {/* PDFs Checkbox */}
              <label 
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  includePdfs 
                    ? (isDarkMode ? 'bg-rose-500/10 border-rose-500/40' : 'bg-rose-50/60 border-rose-200')
                    : (isDarkMode ? 'bg-zinc-800/40 border-zinc-800 opacity-60' : 'bg-gray-50 border-gray-100 opacity-60')
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                      ملفات PDF والمذكرات
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      {coursePdfs.length} ملف دراسي
                    </div>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={includePdfs}
                  onChange={(e) => setIncludePdfs(e.target.checked)}
                  className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                />
              </label>

              {/* Assignments Checkbox */}
              <label 
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeAssignments 
                    ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/40' : 'bg-amber-50/60 border-amber-200')
                    : (isDarkMode ? 'bg-zinc-800/40 border-zinc-800 opacity-60' : 'bg-gray-50 border-gray-100 opacity-60')
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <CheckSquare size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                      الواجبات والتكليفات
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      {courseAssignments.length} تكليف دراسي
                    </div>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={includeAssignments}
                  onChange={(e) => setIncludeAssignments(e.target.checked)}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
              </label>

              {/* Exams Checkbox */}
              <label 
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeExams 
                    ? (isDarkMode ? 'bg-purple-500/10 border-purple-500/40' : 'bg-purple-50/60 border-purple-200')
                    : (isDarkMode ? 'bg-zinc-800/40 border-zinc-800 opacity-60' : 'bg-gray-50 border-gray-100 opacity-60')
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                    <Award size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                      الاختبارات والتقييم
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      {courseExams.length} اختبار متاح
                    </div>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={includeExams}
                  onChange={(e) => setIncludeExams(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </label>

              {/* Custom Content Checkbox */}
              <label 
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all sm:col-span-2 ${
                  includeCustomContent 
                    ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-cyan-50/60 border-cyan-200')
                    : (isDarkMode ? 'bg-zinc-800/40 border-zinc-800 opacity-60' : 'bg-gray-50 border-gray-100 opacity-60')
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                    <Code size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-800 dark:text-gray-200">
                      الأقسام المخصصة والشيفرات البرمجية (Source Code & Labs)
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      {courseCustomCategories.length} أقسام مخصصة ({courseCustomItems.length} عنصر ومقتطف)
                    </div>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={includeCustomContent}
                  onChange={(e) => setIncludeCustomContent(e.target.checked)}
                  className="w-5 h-5 accent-cyan-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Advanced Detail Options */}
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-zinc-800">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">
              خيارات إضافية للتقرير:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer text-gray-700 dark:text-gray-300">
                <input 
                  type="checkbox" 
                  checked={includeCodeSnippets}
                  onChange={(e) => setIncludeCodeSnippets(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>تضمين مربعات الأكواد والشيفرات البرمجية كاملة</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer text-gray-700 dark:text-gray-300">
                <input 
                  type="checkbox" 
                  checked={includeExamQuestions}
                  onChange={(e) => setIncludeExamQuestions(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>تضمين نماذج وإجابات أسئلة الاختبارات</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">اسم مدرس / مشرف المقرر:</label>
                <input 
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="مثال: د. سامي المنصور"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">ملاحظة أو توجيه ختامي بالتقرير (اختياري):</label>
                <input 
                  type="text"
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="ملاحظات وتوصيات خاصة بالطلبة..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-6 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-100 bg-gray-50/70'
        }`}>
          <div className="text-xs font-bold text-gray-400">
            تم تحديد <strong className="text-emerald-500">{totalSectionsSelected}</strong> أقسام للإدراج
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                isDarkMode ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              إلغاء
            </button>

            <button
              onClick={handleGenerateAndPrint}
              disabled={isGenerating || totalSectionsSelected === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>{isGenerating ? 'جاري تجهيز التقرير...' : 'معاينة وطباعة تقرير PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
