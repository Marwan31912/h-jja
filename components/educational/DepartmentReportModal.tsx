import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Printer, Check, FileText, Video, 
  CheckSquare, Award, Code, Layers, BookOpen, 
  Calendar, User, CheckCircle2, Sliders, ShieldCheck,
  Building, Filter, BarChart3, CheckSquare2, Square,
  Search, RefreshCw, AlertCircle
} from 'lucide-react';
import { 
  PdfCategory, VideoLesson, AssignmentItem, 
  ExamItem, CustomContentCategory, CustomContentItem 
} from '../../types';

interface DepartmentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: PdfCategory | null;
  departmentPath?: PdfCategory[];
  courses?: PdfCategory[];
  videos?: VideoLesson[];
  pdfs?: { name: string; pageCount: number; size: number; author: string; id?: string; folderId?: string }[];
  assignments?: AssignmentItem[];
  exams?: ExamItem[];
  customCategories?: CustomContentCategory[];
  customItems?: CustomContentItem[];
  isDarkMode?: boolean;
  systemName?: string;
}

export const DepartmentReportModal: React.FC<DepartmentReportModalProps> = ({
  isOpen,
  onClose,
  department,
  departmentPath = [],
  courses = [],
  videos = [],
  pdfs = [],
  assignments = [],
  exams = [],
  customCategories = [],
  customItems = [],
  isDarkMode,
  systemName = 'حجة'
}) => {
  // Pre-export customizable selection states
  const [includeVideos, setIncludeVideos] = useState(true);
  const [includePdfs, setIncludePdfs] = useState(true);
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [includeExams, setIncludeExams] = useState(true);
  const [includeCustomContent, setIncludeCustomContent] = useState(true);
  const [includeDetailedListings, setIncludeDetailedListings] = useState(true);
  const [includeSummaryMatrix, setIncludeSummaryMatrix] = useState(true);
  
  // Department supervisor / instructor / notes
  const [supervisorName, setSupervisorName] = useState('رئيس القسم الأكاديمي');
  const [academicYear, setAcademicYear] = useState('العام الجامعي 2025 - 2026');
  const [reportNote, setReportNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter selected courses (by default all courses in this department)
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(() => (courses || []).map(c => c.id));
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseFilterTab, setCourseFilterTab] = useState<'all' | 'selected' | 'unselected'>('all');

  // Synchronize course selection whenever modal opens or courses change
  useEffect(() => {
    if (isOpen && courses && courses.length > 0) {
      setSelectedCourseIds(courses.map(c => c.id));
      setCourseSearchQuery('');
      setCourseFilterTab('all');
    }
  }, [isOpen, courses]);

  if (!isOpen || !department) return null;

  const deptPathString = (departmentPath || []).map(d => d.name).join(' ❯ ');

  // Filter active courses for this report
  const activeCourses = courses.filter(c => selectedCourseIds.includes(c.id));

  // Courses filtered by search and tabs in the UI selector
  const displayedCourses = courses.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(courseSearchQuery.toLowerCase().trim()) ||
      (c.description && c.description.toLowerCase().includes(courseSearchQuery.toLowerCase().trim()));
    if (!matchesSearch) return false;

    const isSelected = selectedCourseIds.includes(c.id);
    if (courseFilterTab === 'selected') return isSelected;
    if (courseFilterTab === 'unselected') return !isSelected;
    return true;
  });

  // Calculate department totals for selected courses
  const deptVideos = videos.filter(v => activeCourses.some(c => v.folderId === `${c.id}_videos`));
  const deptPdfs = pdfs.filter(p => activeCourses.some(c => p.folderId === `${c.id}_pdf` || !p.folderId));
  const deptAssignments = assignments.filter(a => activeCourses.some(c => a.folderId === `${c.id}_assignments`));
  const deptExams = exams.filter(e => activeCourses.some(c => e.folderId === `${c.id}_exams`));
  const deptCustomCategories = customCategories.filter(cat => activeCourses.some(c => cat.courseId === c.id));
  const deptCustomItems = customItems.filter(item => activeCourses.some(c => item.courseId === c.id));

  const totalCategoriesSelected = [
    includeVideos,
    includePdfs,
    includeAssignments,
    includeExams,
    includeCustomContent
  ].filter(Boolean).length;

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const selectAllCourses = () => {
    setSelectedCourseIds(courses.map(c => c.id));
  };

  const deselectAllCourses = () => {
    setSelectedCourseIds([]);
  };

  const invertCourseSelection = () => {
    setSelectedCourseIds(courses.map(c => c.id).filter(id => !selectedCourseIds.includes(id)));
  };

  const handleGenerateAndPrint = () => {
    if (activeCourses.length === 0 || totalCategoriesSelected === 0) return;

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

    // Build the clean, high-resolution printable HTML for the Department Report
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير مقررات قسم: ${department.name}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 14mm 14mm 14mm 14mm;
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
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            font-size: 11pt;
            direction: rtl;
          }
          .report-container {
            width: 100%;
            max-width: 100%;
          }
          .report-header {
            border-bottom: 2px solid #059669;
            padding-bottom: 14px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .dept-title-box h1 {
            margin: 0 0 4px 0;
            color: #065f46;
            font-size: 18pt;
            font-weight: 800;
          }
          .dept-subtitle {
            font-size: 9.5pt;
            color: #64748b;
            font-weight: 600;
          }
          .dept-badge {
            background-color: #ecfdf5;
            color: #047857;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 8.5pt;
            font-weight: 700;
            display: inline-block;
            margin-top: 4px;
            border: 1px solid #a7f3d0;
          }
          .meta-box {
            text-align: left;
            font-size: 8.5pt;
            color: #475569;
            line-height: 1.6;
          }
          .meta-box strong {
            color: #0f172a;
          }
          
          /* Key Metrics Cards */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin-bottom: 20px;
          }
          .metric-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 8px;
            text-align: center;
          }
          .metric-val {
            font-size: 15pt;
            font-weight: 800;
            color: #047857;
            display: block;
            line-height: 1.2;
          }
          .metric-lbl {
            font-size: 7.5pt;
            color: #64748b;
            font-weight: 700;
            margin-top: 2px;
            display: block;
          }

          /* Summary Matrix Table */
          .matrix-section {
            margin-bottom: 24px;
          }
          .section-heading {
            font-size: 12.5pt;
            font-weight: 800;
            color: #0f172a;
            border-right: 4px solid #059669;
            padding-right: 10px;
            margin: 18px 0 10px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-bottom: 12px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            text-align: right;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            font-weight: 700;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .total-row td {
            background-color: #ecfdf5 !important;
            font-weight: 800;
            color: #065f46;
            border-top: 2px solid #059669;
          }

          /* Detailed Course Breakdown */
          .course-box {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 16px;
            page-break-inside: avoid;
            background-color: #ffffff;
          }
          .course-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .course-name {
            font-size: 11pt;
            font-weight: 800;
            color: #0f172a;
          }
          .course-badges {
            display: flex;
            gap: 6px;
          }
          .mini-badge {
            padding: 2px 7px;
            border-radius: 6px;
            font-size: 7.5pt;
            font-weight: 700;
          }
          .badge-vid { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .badge-pdf { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
          .badge-asg { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
          .badge-exm { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }
          .badge-cod { background: #ecfeff; color: #0e7490; border: 1px solid #a5f3fc; }

          .sub-item-list {
            margin: 6px 0 0 0;
            padding-right: 18px;
            font-size: 8pt;
            color: #334155;
          }
          .sub-item-list li {
            margin-bottom: 3px;
          }

          .code-preview {
            background-color: #0f172a;
            color: #38bdf8;
            font-family: monospace;
            font-size: 7.5pt;
            padding: 6px 10px;
            border-radius: 6px;
            margin-top: 4px;
            white-space: pre-wrap;
            direction: ltr;
            text-align: left;
          }

          /* Footer / Signatures */
          .report-footer {
            margin-top: 26px;
            padding-top: 14px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
            color: #64748b;
            page-break-inside: avoid;
          }
          .signature-box {
            text-align: center;
            min-width: 140px;
          }
          .sig-line {
            margin-top: 25px;
            border-bottom: 1px solid #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          
          <!-- Header -->
          <div class="report-header">
            <div class="dept-title-box">
              <div style="font-size: 9pt; font-weight: 800; color: #059669; margin-bottom: 2px;">منظومة ${systemName} التعليمية الأكاديمية</div>
              <h1>تقرير المقررات الأكاديمية: ${department.name}</h1>
              <div class="dept-subtitle">التسلسل الهيكلي: ${deptPathString || department.name}</div>
              <div class="dept-badge">التقرير الشامل المعتمد للمقررات والمحتويات الدراسية</div>
            </div>
            
            <div class="meta-box">
              <div><strong>تاريخ الإصدار:</strong> ${reportDate}</div>
              <div><strong>وقت التقرير:</strong> ${reportTime}</div>
              <div><strong>العام الأكاديمي:</strong> ${academicYear}</div>
              <div><strong>المشرف / رئيس القسم:</strong> ${supervisorName}</div>
            </div>
          </div>

          <!-- Overall Summary Metrics -->
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-val">${activeCourses.length}</span>
              <span class="metric-lbl">المقررات المدرجة</span>
            </div>
            ${includeVideos ? `
            <div class="metric-card">
              <span class="metric-val" style="color: #2563eb;">${deptVideos.length}</span>
              <span class="metric-lbl">دروس الفيديو</span>
            </div>` : ''}
            ${includePdfs ? `
            <div class="metric-card">
              <span class="metric-val" style="color: #e11d48;">${deptPdfs.length}</span>
              <span class="metric-lbl">ملفات ومذكرات PDF</span>
            </div>` : ''}
            ${includeAssignments ? `
            <div class="metric-card">
              <span class="metric-val" style="color: #d97706;">${deptAssignments.length}</span>
              <span class="metric-lbl">واجبات وتكليفات</span>
            </div>` : ''}
            ${includeExams ? `
            <div class="metric-card">
              <span class="metric-val" style="color: #9333ea;">${deptExams.length}</span>
              <span class="metric-lbl">اختبارات وتقييمات</span>
            </div>` : ''}
            ${includeCustomContent ? `
            <div class="metric-card">
              <span class="metric-val" style="color: #0891b2;">${deptCustomItems.length}</span>
              <span class="metric-lbl">أكواد وأقسام مخصصة</span>
            </div>` : ''}
          </div>

          ${includeSummaryMatrix ? `
          <!-- Summary Matrix Table -->
          <div class="matrix-section">
            <div class="section-heading">
              <span>مصفوفة توزيع محتويات المقررات (Course Matrix)</span>
              <span style="font-size: 8pt; color: #64748b; font-weight: 600;">عدد المقررات: ${activeCourses.length}</span>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">#</th>
                  <th>اسم المقرر التعليمي</th>
                  ${includeVideos ? '<th style="text-align: center; width: 65px;">الفيديوهات</th>' : ''}
                  ${includePdfs ? '<th style="text-align: center; width: 65px;">المذكرات</th>' : ''}
                  ${includeAssignments ? '<th style="text-align: center; width: 65px;">الواجبات</th>' : ''}
                  ${includeExams ? '<th style="text-align: center; width: 65px;">الاختبارات</th>' : ''}
                  ${includeCustomContent ? '<th style="text-align: center; width: 75px;">أكواد ومشاريع</th>' : ''}
                  <th style="text-align: center; width: 70px;">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${activeCourses.map((c, i) => {
                  const cVids = videos.filter(v => v.folderId === `${c.id}_videos`).length;
                  const cPdfs = pdfs.filter(p => p.folderId === `${c.id}_pdf` || !p.folderId).length;
                  const cAsgs = assignments.filter(a => a.folderId === `${c.id}_assignments`).length;
                  const cExms = exams.filter(e => e.folderId === `${c.id}_exams`).length;
                  const cCust = customItems.filter(item => item.courseId === c.id).length;
                  const cTotal = (includeVideos ? cVids : 0) + 
                                (includePdfs ? cPdfs : 0) + 
                                (includeAssignments ? cAsgs : 0) + 
                                (includeExams ? cExms : 0) + 
                                (includeCustomContent ? cCust : 0);

                  return `
                    <tr>
                      <td style="text-align: center; font-weight: bold; color: #64748b;">${i + 1}</td>
                      <td>
                        <strong style="color: #0f172a;">${c.name}</strong>
                        ${c.description ? `<div style="font-size: 7.5pt; color: #64748b;">${c.description}</div>` : ''}
                      </td>
                      ${includeVideos ? `<td style="text-align: center; font-weight: bold; color: #2563eb;">${cVids}</td>` : ''}
                      ${includePdfs ? `<td style="text-align: center; font-weight: bold; color: #e11d48;">${cPdfs}</td>` : ''}
                      ${includeAssignments ? `<td style="text-align: center; font-weight: bold; color: #d97706;">${cAsgs}</td>` : ''}
                      ${includeExams ? `<td style="text-align: center; font-weight: bold; color: #9333ea;">${cExms}</td>` : ''}
                      ${includeCustomContent ? `<td style="text-align: center; font-weight: bold; color: #0891b2;">${cCust}</td>` : ''}
                      <td style="text-align: center; font-weight: 800; color: #047857; background-color: #f0fdf4;">${cTotal}</td>
                    </tr>
                  `;
                }).join('')}
                
                <tr class="total-row">
                  <td colspan="2" style="text-align: right; padding-right: 12px;">المجموع الإجمالي للقسم:</td>
                  ${includeVideos ? `<td style="text-align: center;">${deptVideos.length}</td>` : ''}
                  ${includePdfs ? `<td style="text-align: center;">${deptPdfs.length}</td>` : ''}
                  ${includeAssignments ? `<td style="text-align: center;">${deptAssignments.length}</td>` : ''}
                  ${includeExams ? `<td style="text-align: center;">${deptExams.length}</td>` : ''}
                  ${includeCustomContent ? `<td style="text-align: center;">${deptCustomItems.length}</td>` : ''}
                  <td style="text-align: center;">${
                    (includeVideos ? deptVideos.length : 0) +
                    (includePdfs ? deptPdfs.length : 0) +
                    (includeAssignments ? deptAssignments.length : 0) +
                    (includeExams ? deptExams.length : 0) +
                    (includeCustomContent ? deptCustomItems.length : 0)
                  }</td>
                </tr>
              </tbody>
            </table>
          </div>` : ''}

          ${includeDetailedListings ? `
          <!-- Detailed Course Breakdown -->
          <div class="detailed-section">
            <div class="section-heading">
              <span>التفصيل الأكاديمي لمحتويات كل مقرر (Detailed Course Inventory)</span>
            </div>

            ${activeCourses.map((c, i) => {
              const cVids = videos.filter(v => v.folderId === `${c.id}_videos`);
              const cPdfs = pdfs.filter(p => p.folderId === `${c.id}_pdf` || !p.folderId);
              const cAsgs = assignments.filter(a => a.folderId === `${c.id}_assignments`);
              const cExms = exams.filter(e => e.folderId === `${c.id}_exams`);
              const cCats = customCategories.filter(cat => cat.courseId === c.id);
              const cItems = customItems.filter(item => item.courseId === c.id);

              return `
                <div class="course-box">
                  <div class="course-header">
                    <div>
                      <span class="course-name">${i + 1}. ${c.name}</span>
                      ${c.description ? `<div style="font-size: 8pt; color: #64748b; margin-top: 2px;">${c.description}</div>` : ''}
                    </div>
                    <div class="course-badges">
                      ${includeVideos ? `<span class="mini-badge badge-vid">${cVids.length} فيديو</span>` : ''}
                      ${includePdfs ? `<span class="mini-badge badge-pdf">${cPdfs.length} ملف PDF</span>` : ''}
                      ${includeAssignments ? `<span class="mini-badge badge-asg">${cAsgs.length} واجب</span>` : ''}
                      ${includeExams ? `<span class="mini-badge badge-exm">${cExms.length} اختبار</span>` : ''}
                      ${includeCustomContent ? `<span class="mini-badge badge-cod">${cItems.length} كود ومخصص</span>` : ''}
                    </div>
                  </div>

                  <!-- Details of selected types -->
                  ${includeVideos && cVids.length > 0 ? `
                    <div style="margin-top: 6px;">
                      <strong style="font-size: 8.5pt; color: #1d4ed8;">الفيديوهات والمحاضرات (${cVids.length}):</strong>
                      <ol class="sub-item-list">
                        ${cVids.map(v => `
                          <li>
                            <strong>${v.title}</strong>
                            ${v.duration ? `<span style="color: #64748b;"> (${Math.floor(v.duration / 60)} دقيقة)</span>` : ''}
                            ${v.notes ? `<div style="font-size: 7.5pt; color: #64748b;">${v.notes}</div>` : ''}
                          </li>
                        `).join('')}
                      </ol>
                    </div>
                  ` : ''}

                  ${includePdfs && cPdfs.length > 0 ? `
                    <div style="margin-top: 6px;">
                      <strong style="font-size: 8.5pt; color: #be123c;">المذكرات والملفات الأكاديمية (${cPdfs.length}):</strong>
                      <ol class="sub-item-list">
                        ${cPdfs.map(p => `
                          <li>
                            <strong>${p.name}</strong>
                            <span style="color: #64748b;"> (${p.pageCount || 1} صفحة - ${p.author || 'القسم'})</span>
                          </li>
                        `).join('')}
                      </ol>
                    </div>
                  ` : ''}

                  ${includeAssignments && cAsgs.length > 0 ? `
                    <div style="margin-top: 6px;">
                      <strong style="font-size: 8.5pt; color: #b45309;">الواجبات والتكليفات الدراسية (${cAsgs.length}):</strong>
                      <ol class="sub-item-list">
                        ${cAsgs.map(a => `
                          <li>
                            <strong>${a.title}</strong>
                            ${a.dueDate ? `<span style="color: #b45309;"> [تاريخ التسليم: ${new Date(a.dueDate).toLocaleDateString('ar-EG')}]</span>` : ''}
                            ${a.totalPoints ? `<span style="color: #64748b;"> (الدرجة: ${a.totalPoints})</span>` : ''}
                            ${a.description ? `<div style="font-size: 7.5pt; color: #64748b;">${a.description}</div>` : ''}
                          </li>
                        `).join('')}
                      </ol>
                    </div>
                  ` : ''}

                  ${includeExams && cExms.length > 0 ? `
                    <div style="margin-top: 6px;">
                      <strong style="font-size: 8.5pt; color: #7e22ce;">الاختبارات والتقييمات الإلكترونية (${cExms.length}):</strong>
                      <ol class="sub-item-list">
                        ${cExms.map(e => `
                          <li>
                            <strong>${e.title}</strong>
                            <span style="color: #64748b;"> (${e.questionsCount || 10} سؤال - ${e.durationMinutes || 30} دقيقة - درجة النجاح: ${e.passingScore || 60}%)</span>
                            ${e.description ? `<div style="font-size: 7.5pt; color: #64748b;">${e.description}</div>` : ''}
                          </li>
                        `).join('')}
                      </ol>
                    </div>
                  ` : ''}

                  ${includeCustomContent && cItems.length > 0 ? `
                    <div style="margin-top: 6px;">
                      <strong style="font-size: 8.5pt; color: #0891b2;">الأقسام المخصصة والشيفرات البرمجية (${cItems.length}):</strong>
                      <ol class="sub-item-list">
                        ${cItems.map(item => `
                          <li>
                            <strong>${item.title}</strong>
                            ${item.codeLanguage ? `<span style="color: #0891b2;"> [${item.codeLanguage.toUpperCase()}]</span>` : ''}
                            ${item.description ? `<div style="font-size: 7.5pt; color: #64748b;">${item.description}</div>` : ''}
                            ${item.codeSnippet ? `<div class="code-preview">${item.codeSnippet.substring(0, 180)}${item.codeSnippet.length > 180 ? '...' : ''}</div>` : ''}
                          </li>
                        `).join('')}
                      </ol>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>` : ''}

          ${reportNote ? `
            <div style="margin-top: 16px; padding: 12px; background-color: #f8fafc; border-right: 3px solid #059669; border-radius: 8px; font-size: 8.5pt;">
              <strong style="color: #065f46;">توجيهات وملاحظات المشرف الأكاديمي:</strong>
              <div style="margin-top: 3px; color: #334155;">${reportNote}</div>
            </div>
          ` : ''}

          <!-- Footer with Signatures -->
          <div class="report-footer">
            <div>
              <div>تم إصدار التقرير عبر منظومة <strong>${systemName}</strong> لإدارة المحتوى التعليمي.</div>
              <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 3px;">وثيقة أكاديمية رسمية معتمدة لكافة المقررات والتكليفات.</div>
            </div>

            <div class="signature-box">
              <div>اعتماد رئيس القسم الأكاديمي</div>
              <div style="font-weight: bold; margin-top: 2px; color: #0f172a;">${supervisorName}</div>
              <div class="sig-line"></div>
            </div>
          </div>

        </div>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setIsGenerating(false);
      }, 400);
    } else {
      // Fallback if popup blocked: use hidden iframe
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
          setTimeout(() => document.body.removeChild(iframe), 1500);
          setIsGenerating(false);
        }, 500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div 
        className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 text-gray-800'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-100 bg-gray-50/70'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shadow-inner">
              <Printer size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black">
                  تقرير مقررات القسم (Department Courses Report)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black border border-emerald-500/20">
                  PDF & Print Ready
                </span>
              </div>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                {deptPathString || department.name} ({courses.length} مقررات)
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-2xl text-gray-400 hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Customizable Options */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Section 1: Categories Checkboxes Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={14} className="text-emerald-500" />
                <span>عناصر ومحتويات التقرير (Customizable Export Categories)</span>
              </h4>
              <span className="text-[11px] font-bold text-emerald-500">
                محدد: {totalCategoriesSelected} من 5 أقسام
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Videos */}
              <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                includeVideos 
                  ? 'border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10' 
                  : isDarkMode ? 'border-zinc-800 bg-zinc-900/40 opacity-60' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Video size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black">الفيديوهات والدروس المرئية</div>
                    <div className="text-[10px] text-gray-400 font-bold">{deptVideos.length} فيديو مسجل</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeVideos} 
                  onChange={(e) => setIncludeVideos(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              {/* PDFs */}
              <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                includePdfs 
                  ? 'border-rose-500/50 bg-rose-500/5 dark:bg-rose-500/10' 
                  : isDarkMode ? 'border-zinc-800 bg-zinc-900/40 opacity-60' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black">الملفات والمذكرات الأكاديمية</div>
                    <div className="text-[10px] text-gray-400 font-bold">{deptPdfs.length} ملف PDF</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={includePdfs} 
                  onChange={(e) => setIncludePdfs(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded"
                />
              </label>

              {/* Assignments */}
              <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                includeAssignments 
                  ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10' 
                  : isDarkMode ? 'border-zinc-800 bg-zinc-900/40 opacity-60' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <CheckSquare size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black">الواجبات والتكليفات</div>
                    <div className="text-[10px] text-gray-400 font-bold">{deptAssignments.length} تكليف دراسي</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeAssignments} 
                  onChange={(e) => setIncludeAssignments(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
              </label>

              {/* Exams */}
              <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                includeExams 
                  ? 'border-purple-500/50 bg-purple-500/5 dark:bg-purple-500/10' 
                  : isDarkMode ? 'border-zinc-800 bg-zinc-900/40 opacity-60' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Award size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black">الاختبارات والتقييمات</div>
                    <div className="text-[10px] text-gray-400 font-bold">{deptExams.length} اختبار وكويز</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeExams} 
                  onChange={(e) => setIncludeExams(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </label>

              {/* Custom Content Categories (Source Code, Labs, etc.) */}
              <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all sm:col-span-2 ${
                includeCustomContent 
                  ? 'border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-500/10' 
                  : isDarkMode ? 'border-zinc-800 bg-zinc-900/40 opacity-60' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                    <Code size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black">الأقسام المخصصة والشيفرات البرمجية (Source Code & Custom)</div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      {deptCustomCategories.length} أقسام مخصصة ({deptCustomItems.length} عنصر ومثال برمجي)
                    </div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeCustomContent} 
                  onChange={(e) => setIncludeCustomContent(e.target.checked)}
                  className="w-4 h-4 accent-cyan-600 rounded"
                />
              </label>

            </div>
          </div>

          {/* Section 2: Course Selection Filter & Interactive Picker */}
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
            isDarkMode ? 'bg-zinc-800/40 border-zinc-700/60' : 'bg-gray-50/80 border-gray-200/80'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <span>اختيار وتحديد المقررات التعليمية (Course Selection)</span>
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    محدد: {selectedCourseIds.length} من أصل {courses.length} مقرر
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={selectAllCourses}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-black transition-colors"
                  title="تحديد كافة المقررات لإدراجها في التقرير"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={deselectAllCourses}
                  className="px-2.5 py-1 rounded-lg bg-gray-200/70 hover:bg-gray-300 dark:bg-zinc-700/70 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 text-[11px] font-black transition-colors"
                  title="إلغاء تحديد كافة المقررات"
                >
                  إلغاء التحديد
                </button>
                <button
                  type="button"
                  onClick={invertCourseSelection}
                  className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 text-[11px] font-black transition-colors"
                  title="عكس التحديد الحالي"
                >
                  عكس التحديد
                </button>
              </div>
            </div>

            {/* Search and Tabs Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="relative flex-1">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  placeholder="ابحث عن مقرر باسمه أو موضوعه..."
                  className={`w-full pr-8 pl-8 py-2 rounded-xl text-xs font-bold border outline-none transition-all ${
                    isDarkMode ? 'bg-zinc-900 border-zinc-700 focus:border-emerald-500 text-white' : 'bg-white border-gray-200 focus:border-emerald-500 text-gray-800'
                  }`}
                />
                {courseSearchQuery && (
                  <button 
                    onClick={() => setCourseSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-200/50 dark:bg-zinc-900 border border-gray-200/50 dark:border-zinc-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCourseFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    courseFilterTab === 'all' 
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                  }`}
                >
                  الكل ({courses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilterTab('selected')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    courseFilterTab === 'selected' 
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                  }`}
                >
                  المحددة ({selectedCourseIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilterTab('unselected')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    courseFilterTab === 'unselected' 
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                  }`}
                >
                  غير المحددة ({courses.length - selectedCourseIds.length})
                </button>
              </div>
            </div>

            {/* Zero selected warning */}
            {selectedCourseIds.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>يرجى تحديد مقرر تعليمي واحد على الأقل لتتمكن من إنشاء وتصدير التقرير الأكاديمي.</span>
              </div>
            )}

            {/* Courses Cards Grid */}
            {displayedCourses.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-gray-400 border border-dashed rounded-xl dark:border-zinc-700">
                {courseSearchQuery ? 'لا توجد مقررات مطابقة لكلمة البحث الحالية' : 'لا توجد مقررات في هذا القسم بعد'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
                {displayedCourses.map(c => {
                  const isChecked = selectedCourseIds.includes(c.id);
                  const cVids = videos.filter(v => v.folderId === `${c.id}_videos`).length;
                  const cPdfs = pdfs.filter(p => p.folderId === `${c.id}_pdf` || !p.folderId).length;
                  const cAsgs = assignments.filter(a => a.folderId === `${c.id}_assignments`).length;
                  const cExms = exams.filter(e => e.folderId === `${c.id}_exams`).length;
                  const cItems = customItems.filter(item => item.courseId === c.id).length;

                  return (
                    <div 
                      key={c.id}
                      onClick={() => toggleCourse(c.id)}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm' 
                          : isDarkMode ? 'border-zinc-800 bg-zinc-900/50 text-gray-400 opacity-75 hover:opacity-100 hover:border-zinc-700' : 'border-gray-200 bg-white text-gray-500 opacity-75 hover:opacity-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked ? 'bg-emerald-500 text-white' : isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <BookOpen size={13} />
                          </div>
                          <div className="min-w-0">
                            <div className={`font-black truncate ${isChecked ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200'}`}>
                              {c.name}
                            </div>
                            {c.description && (
                              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                {c.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="w-4 h-4 accent-emerald-600 rounded shrink-0 cursor-pointer mt-0.5"
                        />
                      </div>

                      {/* Course Content Micro-Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800/80 text-[10px] font-bold">
                        {cVids > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">{cVids} فيديو</span>}
                        {cPdfs > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">{cPdfs} PDF</span>}
                        {cAsgs > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">{cAsgs} واجب</span>}
                        {cExms > 0 && <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">{cExms} اختبار</span>}
                        {cItems > 0 && <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">{cItems} مخصص</span>}
                        {cVids === 0 && cPdfs === 0 && cAsgs === 0 && cExms === 0 && cItems === 0 && (
                          <span className="text-gray-400 text-[9px]">لا يوجد محتوى مدرج بعد</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Formatting & Report Meta */}
          <div className="space-y-3 pt-2">
            <h4 className="font-black text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} className="text-emerald-500" />
              <span>خيارات التنسيق ومعلومات الاعتماد</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer text-gray-700 dark:text-gray-300">
                <input 
                  type="checkbox" 
                  checked={includeSummaryMatrix}
                  onChange={(e) => setIncludeSummaryMatrix(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>تضمين جدول مصفوفة المقارنة والإحصائيات الإجمالية</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer text-gray-700 dark:text-gray-300">
                <input 
                  type="checkbox" 
                  checked={includeDetailedListings}
                  onChange={(e) => setIncludeDetailedListings(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>تضمين القوائم المفصلة لدروس وملفات كل مقرر</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">اسم رئيس / مشرف القسم:</label>
                <input 
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="مثال: د. سامي المنصور"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">العام الأكاديمي:</label>
                <input 
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="مثال: 2025 - 2026"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">ملاحظة أو توجيه بالتقرير:</label>
                <input 
                  type="text"
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="ملاحظات وتوصيات خاصة بالقسم..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold outline-none transition-all ${
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
            سيتم تضمين <strong className="text-emerald-500">{activeCourses.length}</strong> مقرر في التقرير
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
              disabled={isGenerating || activeCourses.length === 0 || totalCategoriesSelected === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>{isGenerating ? 'جاري تجهيز تقرير المقررات...' : 'معاينة وطباعة تقرير المقررات PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
