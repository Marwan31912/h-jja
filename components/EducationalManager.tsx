import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderPlus, Plus, Search, ChevronLeft, ChevronRight, 
  Layers, BookOpen, Video, FileText, CheckSquare, Award, 
  Sparkles, Home, ArrowRight, X, Edit3, Trash2, Check,
  Printer, Code, Smartphone
} from 'lucide-react';
import { 
  PdfCategory, VideoLesson, AssignmentItem, ExamItem,
  CustomContentCategory, CustomContentItem
} from '../types';
import { EditCoverModal } from './educational/EditCoverModal';
import { EditCourseWithFoldersModal } from './educational/EditCourseWithFoldersModal';
import { DepartmentCard } from './educational/DepartmentCard';
import { CourseCard } from './educational/CourseCard';
import { FolderCards } from './educational/FolderCards';
import { VideoSection } from './educational/VideoSection';
import { PdfSection } from './educational/PdfSection';
import { AssignmentSection } from './educational/AssignmentSection';
import { ExamSection } from './educational/ExamSection';
import { CourseReportModal } from './educational/CourseReportModal';
import { DepartmentReportModal } from './educational/DepartmentReportModal';
import { NewCustomCategoryModal } from './educational/NewCustomCategoryModal';
import { CustomContentSection } from './educational/CustomContentSection';
import { MobileBackendManager } from './educational/MobileBackendManager';
import { 
  getBannerCover, 
  fetchCatalogFromStorage, 
  saveCatalogToStorage, 
  runSafeStorageMigration,
  deleteVideoFile,
  deletePdfFile,
  EducationalCatalog 
} from '../services/eduStorage';

interface EducationalManagerProps {
  isDarkMode?: boolean;
}

// Initial Seed Data for Departments & Courses
const SEED_DEPARTMENTS: PdfCategory[] = [
  {
    id: 'dept_biz',
    name: 'قسم ريادة الأعمال والإدارة الحديثة',
    iconName: 'briefcase',
    categoryType: 'department',
    description: 'تخصص شامل يغطي استراتيجيات تأسيس المشاريع، دراسات الجدوى، والقيادة الريادية.',
    addedAt: Date.now() - 20000000
  },
  {
    id: 'dept_cs',
    name: 'قسم علوم الحاسب وهندسة البرمجيات',
    iconName: 'code',
    categoryType: 'department',
    description: 'تخصص تقني متكامل يغطي الخوارزميات، البرمجة، هياكل البيانات، والذكاء الاصطناعي.',
    addedAt: Date.now() - 15000000
  },
  {
    id: 'dept_math',
    name: 'قسم الرياضيات والتحليل العلمي',
    iconName: 'calculator',
    categoryType: 'department',
    description: 'تخصص علمي يركز على الجبر الخطي، التفاضل والتكامل، والإحصاء التطبيقي.',
    addedAt: Date.now() - 10000000
  }
];

const SEED_COURSES: PdfCategory[] = [
  {
    id: 'course_startup',
    name: 'مقرر تأسيس الشركات الناشئة ودراسة الجدوى',
    iconName: 'rocket',
    categoryType: 'course',
    departmentId: 'dept_biz',
    description: 'دليل عملي لتحويل الأفكار إلى شركات ناشئة ناجحة وقابلة للنمو.',
    addedAt: Date.now() - 12000000
  },
  {
    id: 'course_algorithms',
    name: 'مقرر الخوارزميات وهياكل البيانات المتقدمة',
    iconName: 'cpu',
    categoryType: 'course',
    departmentId: 'dept_cs',
    description: 'شرح مفصل للخوارزميات الأساسية والمتقدمة وتحليل التعقيد الزمني.',
    addedAt: Date.now() - 8000000
  },
  {
    id: 'course_linear_algebra',
    name: 'مقرر الجبر الخطي وتطبيقاته',
    iconName: 'binary',
    categoryType: 'course',
    departmentId: 'dept_math',
    description: 'المصفوفات، المتجهات، والتحويلات الخطية وتطبيقاتها الحديثة.',
    addedAt: Date.now() - 6000000
  }
];

const SEED_VIDEOS: VideoLesson[] = [
  {
    id: 'vid_seed_1',
    title: 'الدرس الأول: نموذج العمل التجاري (Business Model Canvas)',
    description: 'كيفية صياغة القيمة المقترحة وتحديد شرائح العملاء ومصادر الإيرادات.',
    author: 'د. سامي المنصور',
    duration: '22:30',
    folderId: 'course_startup_videos',
    addedAt: Date.now() - 5000000,
    isCompleted: true
  },
  {
    id: 'vid_seed_2',
    title: 'الدرس الثاني: التحقق من السوق وتجربة المنتج الأولي (MVP)',
    description: 'خطوات بناء المنتج بأقل تكلفة واختبار تجاوب السوق الفعلي.',
    author: 'د. سامي المنصور',
    duration: '18:45',
    folderId: 'course_startup_videos',
    addedAt: Date.now() - 4000000,
    isCompleted: false
  },
  {
    id: 'vid_seed_3',
    title: 'الدرس الأول: مقدمة في تحليل الخوارزميات والـ Big-O',
    description: 'مفهوم التعقيد الزمني والمكاني وكيفية قياس كفاءة الدوال البرمجية.',
    author: 'د. مروان بالعيد',
    duration: '25:10',
    folderId: 'course_algorithms_videos',
    addedAt: Date.now() - 3000000,
    isCompleted: true
  }
];

const SEED_PDFS: { name: string; pageCount: number; size: number; author: string; id?: string; folderId?: string }[] = [
  {
    id: 'pdf_seed_1',
    name: '01 - دليل ريادة الأعمال ودراسات الجدوى.pdf',
    pageCount: 64,
    size: 3200000,
    author: 'د. سامي المنصور',
    folderId: 'course_startup_pdf'
  },
  {
    id: 'pdf_seed_2',
    name: '02 - ملخص الخوارزميات وهياكل البيانات.pdf',
    pageCount: 48,
    size: 2450000,
    author: 'د. مروان بالعيد',
    folderId: 'course_algorithms_pdf'
  }
];

const SEED_ASSIGNMENTS: AssignmentItem[] = [
  {
    id: 'asg_seed_1',
    title: 'الواجب الأول: إعداد مخطط نموذج العمل لمشروع مبتكر',
    description: 'قم بتعبئة الأقسام التسعة لنموذج Business Model Canvas لمشروع تقني ناشئ.',
    dueDate: '2026-09-20',
    maxScore: 25,
    folderId: 'course_startup_assignments',
    addedAt: Date.now() - 2000000,
    status: 'submitted',
    submissionNotes: 'تم تسليم المخطط مع دراسة مختصرة لشريحة العملاء المستهدفة.',
    grade: 24,
    teacherFeedback: 'نموذج عمل ممتاز ومحدد بدقة.'
  },
  {
    id: 'asg_seed_2',
    title: 'الواجب الأول: تطبيق خوارزميات الترتيب والبحث',
    description: 'تنفيذ خوارزمية QuickSort و Binary Search مع رسم المخطط البياني للتعقيد.',
    dueDate: '2026-09-25',
    maxScore: 20,
    folderId: 'course_algorithms_assignments',
    addedAt: Date.now() - 1000000,
    status: 'pending'
  }
];

const SEED_EXAMS: ExamItem[] = [
  {
    id: 'exam_seed_1',
    title: 'الاختبار النصفي في ريادة الأعمال',
    durationMinutes: 20,
    totalScore: 100,
    folderId: 'course_startup_exams',
    addedAt: Date.now() - 500000,
    lastScore: 92,
    isPassed: true,
    questions: [
      {
        id: 'q1',
        question: 'ما هو الهدف الأساسي من بناء نموذج المنتج الأولي (MVP)؟',
        options: ['تحقيق أعلى ربح مباشر', 'التحقق من الفرضيات واختبار السوق بأقل تكلفة', 'طباعة الإعلانات', 'توظيف فريق كامل'],
        correctAnswerIndex: 1
      },
      {
        id: 'q2',
        question: 'أي من العناصر التالية يمثل مصدر الدخل الرئيسي في نموذج العمل التجاري؟',
        options: ['قنوات التوزيع', 'تدفقات الإيرادات (Revenue Streams)', 'الأنشطة الرئيسية', 'هيكل التكاليف'],
        correctAnswerIndex: 1
      }
    ]
  },
  {
    id: 'exam_seed_2',
    title: 'اختبار تقييم الخوارزميات وهياكل البيانات',
    durationMinutes: 15,
    totalScore: 100,
    folderId: 'course_algorithms_exams',
    addedAt: Date.now() - 400000,
    questions: [
      {
        id: 'q1',
        question: 'ما هو التعقيد الزمني للبحث الثنائي في أسوأ الحالات؟',
        options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
        correctAnswerIndex: 1
      }
    ]
  }
];

const SEED_CUSTOM_CATEGORIES: CustomContentCategory[] = [
  {
    id: 'custom_cat_algorithms_code',
    name: 'الشيفرات البرمجية وهياكل البيانات (Source Code)',
    shortTitle: 'أكواد ومشاريع',
    description: 'أمثلة برمجية مكتوبة بلغات Python و C++ لتطبيق خوارزميات الترتيب والبحث وهياكل البيانات.',
    iconName: 'code',
    colorGrad: 'from-cyan-700 via-teal-800 to-slate-900',
    accentColor: 'text-cyan-500',
    borderColor: 'border-cyan-500/20',
    courseId: 'course_algorithms',
    addedAt: Date.now() - 4000000
  }
];

const SEED_CUSTOM_ITEMS: CustomContentItem[] = [
  {
    id: 'code_item_1',
    title: 'خوارزمية البحث الثنائي (Binary Search Implementation)',
    description: 'تطبيق خوارزمية البحث الثنائي في مصفوفة مرتبة مع حساب التعقيد O(log n).',
    contentType: 'code',
    codeSnippet: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    
    while low <= high:
        mid = (low + high) // 2
        guess = arr[mid]
        
        if guess == target:
            return mid
        if guess > target:
            high = mid - 1
        else:
            low = mid + 1
            
    return -1

# تجربة الخوارزمية
numbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print("Index:", binary_search(numbers, 23)) # المخرجات: 5`,
    codeLanguage: 'python',
    author: 'د. مروان بالعيد',
    tags: ['algorithms', 'search', 'python'],
    folderId: 'custom_cat_algorithms_code',
    courseId: 'course_algorithms',
    addedAt: Date.now() - 3000000
  },
  {
    id: 'code_item_2',
    title: 'خوارزمية الترتيب السريع (QuickSort Algorithm in C++)',
    description: 'تطبيق عملي لمبدأ Divide & Conquer في ترتيب المصفوفات بكفاءة متوسطة O(n log n).',
    contentType: 'code',
    codeSnippet: `#include <iostream>
#include <vector>

int partition(std::vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = (low - 1);
    for (int j = low; j <= high - 1; j++) {
        if (arr[j] < pivot) {
            i++;
            std::swap(arr[i], arr[j]);
        }
    }
    std::swap(arr[i + 1], arr[high]);
    return (i + 1);
}

void quickSort(std::vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}`,
    codeLanguage: 'cpp',
    author: 'د. مروان بالعيد',
    tags: ['sorting', 'quicksort', 'cpp'],
    folderId: 'custom_cat_algorithms_code',
    courseId: 'course_algorithms',
    addedAt: Date.now() - 2000000
  }
];

export const EducationalManager: React.FC<EducationalManagerProps> = ({ isDarkMode }) => {
  // Navigation Hierarchy State
  // Level 1: Root Departments (selectedDept === null)
  // Level 2: Sub-Departments / Courses in Department (selectedDept !== null && selectedCourse === null)
  // Level 3: Folders & Custom Categories in Course (selectedCourse !== null && selectedFolder === null && selectedCustomCategory === null)
  // Level 4: Content inside Folder / Custom Category (selectedFolder !== null || selectedCustomCategory !== null)
  const [selectedDept, setSelectedDept] = useState<PdfCategory | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<PdfCategory | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<{ type: 'videos' | 'pdf' | 'assignments' | 'exams'; category: PdfCategory } | null>(null);
  const [selectedCustomCategory, setSelectedCustomCategory] = useState<CustomContentCategory | null>(null);

  // Modals for Department Courses Report, Course Report, and New Custom Category
  const [showDepartmentReportModal, setShowDepartmentReportModal] = useState(false);
  const [departmentForReport, setDepartmentForReport] = useState<PdfCategory | null>(null);
  const [showCourseReportModal, setShowCourseReportModal] = useState(false);
  const [showNewCustomCategoryModal, setShowNewCustomCategoryModal] = useState(false);
  const [showMobileBackendModal, setShowMobileBackendModal] = useState(false);

  // Search & Toast
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Cover Modal state
  const [editingItem, setEditingItem] = useState<PdfCategory | null>(null);
  const [editingCourseWithFolders, setEditingCourseWithFolders] = useState<PdfCategory | null>(null);

  // Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  // New Department Modal
  const [showNewDeptModal, setShowNewDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [targetParentDeptId, setTargetParentDeptId] = useState<string>('');

  // New Course Modal
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseDeptId, setNewCourseDeptId] = useState<string>('');

  // Persistent Data States (initialized from localStorage or seed)
  const [departments, setDepartments] = useState<PdfCategory[]>(() => {
    try {
      const saved = localStorage.getItem('edu_departments_v2');
      return saved ? JSON.parse(saved) : SEED_DEPARTMENTS;
    } catch {
      return SEED_DEPARTMENTS;
    }
  });

  const [courses, setCourses] = useState<PdfCategory[]>(() => {
    try {
      const saved = localStorage.getItem('edu_courses_v2');
      return saved ? JSON.parse(saved) : SEED_COURSES;
    } catch {
      return SEED_COURSES;
    }
  });

  const [videos, setVideos] = useState<VideoLesson[]>(() => {
    try {
      const saved = localStorage.getItem('edu_videos_v2');
      return saved ? JSON.parse(saved) : SEED_VIDEOS;
    } catch {
      return SEED_VIDEOS;
    }
  });

  const [pdfs, setPdfs] = useState<typeof SEED_PDFS>(() => {
    try {
      const saved = localStorage.getItem('edu_pdfs_v2');
      return saved ? JSON.parse(saved) : SEED_PDFS;
    } catch {
      return SEED_PDFS;
    }
  });

  const [assignments, setAssignments] = useState<AssignmentItem[]>(() => {
    try {
      const saved = localStorage.getItem('edu_assignments_v2');
      return saved ? JSON.parse(saved) : SEED_ASSIGNMENTS;
    } catch {
      return SEED_ASSIGNMENTS;
    }
  });

  const [exams, setExams] = useState<ExamItem[]>(() => {
    try {
      const saved = localStorage.getItem('edu_exams_v2');
      return saved ? JSON.parse(saved) : SEED_EXAMS;
    } catch {
      return SEED_EXAMS;
    }
  });

  // Custom Content Categories & Items (e.g. Source Code, Labs)
  const [customCategories, setCustomCategories] = useState<CustomContentCategory[]>(() => {
    try {
      const saved = localStorage.getItem('edu_custom_categories_v2');
      return saved ? JSON.parse(saved) : SEED_CUSTOM_CATEGORIES;
    } catch {
      return SEED_CUSTOM_CATEGORIES;
    }
  });

  const [customItems, setCustomItems] = useState<CustomContentItem[]>(() => {
    try {
      const saved = localStorage.getItem('edu_custom_items_v2');
      return saved ? JSON.parse(saved) : SEED_CUSTOM_ITEMS;
    } catch {
      return SEED_CUSTOM_ITEMS;
    }
  });

  // Folder Covers Map (for 1920x1080 folder covers)
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('edu_folder_covers_v2');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Initialize from Unified Storage Engine on mount
  useEffect(() => {
    let isMounted = true;
    async function initializeData() {
      try {
        // Run safe non-destructive migration if needed
        await runSafeStorageMigration();

        // Load Single Source of Truth catalog from filesystem storage
        const catalog = await fetchCatalogFromStorage();
        if (catalog && isMounted) {
          if (Array.isArray(catalog.departments) && catalog.departments.length > 0) {
            setDepartments(catalog.departments);
          }
          if (Array.isArray(catalog.courses) && catalog.courses.length > 0) {
            setCourses(catalog.courses);
          }
          if (Array.isArray(catalog.videos) && catalog.videos.length > 0) {
            setVideos(catalog.videos);
          }
          if (Array.isArray(catalog.pdfs) && catalog.pdfs.length > 0) {
            setPdfs(catalog.pdfs);
          }
          if (Array.isArray(catalog.assignments)) setAssignments(catalog.assignments);
          if (Array.isArray(catalog.exams)) setExams(catalog.exams);
          if (Array.isArray(catalog.customCategories)) setCustomCategories(catalog.customCategories);
          if (Array.isArray(catalog.customItems)) setCustomItems(catalog.customItems);
          if (catalog.folderCovers && typeof catalog.folderCovers === 'object') setFolderCovers(catalog.folderCovers);
        }
      } catch (err) {
        console.warn('[EducationalManager] Init error:', err);
      }
    }
    initializeData();
    return () => { isMounted = false; };
  }, []);

  // Save changes atomically to Unified Storage (server_data.json) & localStorage cache
  useEffect(() => {
    // Generate folders for all courses to maintain backend mobile consistency
    const courseFolders: any[] = [];
    courses.forEach(c => {
      courseFolders.push(
        { id: `${c.id}_videos`, name: 'محاضرات الفيديو', courseId: c.id },
        { id: `${c.id}_pdf`, name: 'المذكرات والكتب (PDF)', courseId: c.id },
        { id: `${c.id}_assignments`, name: 'الواجبات والتكليفات', courseId: c.id },
        { id: `${c.id}_exams`, name: 'نماذج الامتحانات والاختبارات', courseId: c.id }
      );
    });

    const normalizedCourses = courses.map(c => ({
      ...c,
      title: c.title || c.name,
      name: c.name || c.title
    }));

    const catalog: EducationalCatalog = {
      departments,
      courses: normalizedCourses,
      folders: courseFolders,
      videos,
      pdfs,
      assignments,
      exams,
      customCategories,
      customItems,
      folderCovers
    };

    const timer = setTimeout(() => {
      saveCatalogToStorage(catalog);
    }, 400);

    return () => clearTimeout(timer);
  }, [departments, courses, videos, pdfs, assignments, exams, customCategories, customItems, folderCovers]);

  // Helper to calculate breadcrumb hierarchy path for any department
  const getDepartmentPath = (dept: PdfCategory | null): PdfCategory[] => {
    if (!dept) return [];
    const path: PdfCategory[] = [];
    let curr: PdfCategory | undefined = dept;
    const visited = new Set<string>();
    while (curr) {
      if (visited.has(curr.id)) break;
      visited.add(curr.id);
      path.unshift(curr);
      if (curr.parentId) {
        curr = departments.find(d => d.id === curr!.parentId);
      } else {
        break;
      }
    }
    return path;
  };

  // Helper to get formatted full path name for dropdowns
  const getDepartmentFullName = (dept: PdfCategory): string => {
    const path = getDepartmentPath(dept);
    return path.map(p => p.name).join(' ❯ ');
  };

  // Helper to get all descendant IDs of a department
  const getDescendantDeptIds = (deptId: string): string[] => {
    const directChildren = departments.filter(d => d.parentId === deptId).map(d => d.id);
    let allDescendants = [...directChildren];
    directChildren.forEach(childId => {
      allDescendants = [...allDescendants, ...getDescendantDeptIds(childId)];
    });
    return allDescendants;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Root Departments (departments with no parentId)
  const rootDepartments = useMemo(() => {
    return departments.filter(d => !d.parentId);
  }, [departments]);

  // Filtered root departments (or search across all departments)
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) {
      return rootDepartments;
    }
    const q = searchQuery.toLowerCase();
    return departments.filter(d => 
      d.name.toLowerCase().includes(q) || 
      (d.description && d.description.toLowerCase().includes(q))
    );
  }, [departments, rootDepartments, searchQuery]);

  // Sub-departments of the currently selected department
  const currentSubDepartments = useMemo(() => {
    if (!selectedDept) return [];
    return departments.filter(d => d.parentId === selectedDept.id);
  }, [departments, selectedDept]);

  const filteredSubDepartments = useMemo(() => {
    if (!searchQuery.trim()) return currentSubDepartments;
    const q = searchQuery.toLowerCase();
    return currentSubDepartments.filter(d => 
      d.name.toLowerCase().includes(q) || 
      (d.description && d.description.toLowerCase().includes(q))
    );
  }, [currentSubDepartments, searchQuery]);

  // Courses for currently selected department
  const coursesForCurrentDept = useMemo(() => {
    if (!selectedDept) return courses;
    return courses.filter(c => c.departmentId === selectedDept.id || c.parentId === selectedDept.id);
  }, [courses, selectedDept]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return coursesForCurrentDept;
    const q = searchQuery.toLowerCase();
    return coursesForCurrentDept.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [coursesForCurrentDept, searchQuery]);

  // Handler: Create Department / Sub-Department
  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    const parentIdToUse = targetParentDeptId.trim() ? targetParentDeptId.trim() : undefined;

    const newDept: PdfCategory = {
      id: 'dept_' + Date.now(),
      name: newDeptName.trim(),
      description: newDeptDesc.trim() || (parentIdToUse ? 'قسم وتخصص فرعي جديد.' : 'قسم وتخصص أكاديمي رئيسي جديد.'),
      iconName: 'folder',
      categoryType: 'department',
      parentId: parentIdToUse,
      addedAt: Date.now()
    };

    setDepartments(prev => [newDept, ...prev]);
    setShowNewDeptModal(false);
    setNewDeptName('');
    setNewDeptDesc('');
    setTargetParentDeptId('');

    if (parentIdToUse) {
      const parentDept = departments.find(d => d.id === parentIdToUse);
      const parentTitle = parentDept ? parentDept.name : 'القسم المحدد';
      showToast(`تم إنشاء القسم الفرعي "${newDept.name}" داخل "${parentTitle}" بنجاح!`);
    } else {
      showToast(`تم إنشاء القسم الرئيسي "${newDept.name}" بنجاح!`);
    }
  };

  // Handler: Create Course
  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    const targetDeptId = newCourseDeptId || selectedDept?.id || departments[0]?.id || 'dept_cs';

    const newCourse: PdfCategory = {
      id: 'course_' + Date.now(),
      name: newCourseName.trim(),
      description: newCourseDesc.trim() || 'مقرر دراسي جديد.',
      iconName: 'book',
      categoryType: 'course',
      departmentId: targetDeptId,
      parentId: targetDeptId,
      addedAt: Date.now()
    };

    setCourses(prev => [newCourse, ...prev]);
    setShowNewCourseModal(false);
    setNewCourseName('');
    setNewCourseDesc('');
    showToast(`تم إنشاء مقرر "${newCourse.name}" بنجاح!`);
  };

  // Handler: Save Edited Item (Department, Course, or Folder)
  const handleSaveEditedItem = (updated: PdfCategory) => {
    if (updated.categoryType === 'department') {
      setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
      if (selectedDept?.id === updated.id) setSelectedDept(updated);
    } else if (updated.categoryType === 'course') {
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (selectedCourse?.id === updated.id) setSelectedCourse(updated);
    } else {
      // Folder cover/name
      if (updated.coverImage) {
        setFolderCovers(prev => ({ ...prev, [updated.id]: updated.coverImage! }));
      }
    }
    showToast('تم تحديث البيانات والغلاف (1920 × 1080) بنجاح!');
  };

  // Handler: Save Course and its 4 Folders Covers in one place
  const handleSaveCourseWithFolders = (updatedCourse: PdfCategory, updatedFolderCovers: Record<string, string>) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    if (selectedCourse?.id === updatedCourse.id) {
      setSelectedCourse(updatedCourse);
    }
    setFolderCovers(prev => ({
      ...prev,
      ...updatedFolderCovers
    }));
    showToast('تم حفظ تعديلات المقرر وأغلفة الأقسام بنجاح!');
  };

  // Handler: Delete Department (Cascading deletion of all sub-departments and courses)
  const handleDeleteDepartment = (deptId: string) => {
    const deptToDelete = departments.find(d => d.id === deptId);
    const deptName = deptToDelete ? deptToDelete.name : 'القسم';

    const allDescendantIds = getDescendantDeptIds(deptId);
    const allIdsToDelete = [deptId, ...allDescendantIds];
    const idSet = new Set(allIdsToDelete);

    const impactedCourses = courses.filter(c => idSet.has(c.departmentId || '') || idSet.has(c.parentId || ''));

    setDeleteConfirmModal({
      isOpen: true,
      title: 'حذف القسم الأكاديمي',
      message: `هل أنت متأكد من حذف قسم «${deptName}» نهائياً؟`,
      details: allDescendantIds.length > 0 || impactedCourses.length > 0
        ? `سيتم أيضاً حذف (${allDescendantIds.length}) قسم فرعي و (${impactedCourses.length}) مقرر تعليمي تابع له.`
        : 'سيتم حذف القسم نهائياً من النظام.',
      confirmText: 'نعم، حذف القسم بالكامل',
      onConfirm: () => {
        setDepartments(prev => {
          const updated = prev.filter(d => !idSet.has(d.id));
          localStorage.setItem('edu_departments_v2', JSON.stringify(updated));
          return updated;
        });

        setCourses(prev => {
          const updated = prev.filter(c => !idSet.has(c.departmentId || '') && !idSet.has(c.parentId || ''));
          localStorage.setItem('edu_courses_v2', JSON.stringify(updated));
          return updated;
        });

        if (selectedDept && idSet.has(selectedDept.id)) {
          const parent = deptToDelete?.parentId ? departments.find(d => d.id === deptToDelete.parentId) : null;
          setSelectedDept(parent || null);
          setSelectedCourse(null);
          setSelectedFolder(null);
        }

        setDeleteConfirmModal(null);
        showToast(`تم حذف قسم «${deptName}» وكافة محتوياته بنجاح`);
      }
    });
  };

  // Handler: Delete Course
  const handleDeleteCourse = (courseId: string) => {
    const courseToDelete = courses.find(c => c.id === courseId);
    const courseName = courseToDelete ? courseToDelete.name : 'المقرر';

    setDeleteConfirmModal({
      isOpen: true,
      title: 'حذف المقرر التعليمي',
      message: `هل أنت متأكد من حذف مقرر «${courseName}»؟`,
      details: 'سيتم حذف المقرر وجميع مجلداته الأربعة (الفيديوهات والمذكرات والواجبات والاختبارات) نهائياً.',
      confirmText: 'نعم، حذف المقرر',
      onConfirm: () => {
        setCourses(prev => {
          const updated = prev.filter(c => c.id !== courseId);
          localStorage.setItem('edu_courses_v2', JSON.stringify(updated));
          return updated;
        });

        // Safely clean up associated videos and physical files
        const courseVideos = videos.filter(v => v.folderId?.startsWith(courseId) || (v as any).courseId === courseId);
        courseVideos.forEach(v => {
          if (v.fileName) deleteVideoFile(v.fileName);
        });
        setVideos(prev => prev.filter(v => !v.folderId?.startsWith(courseId) && (v as any).courseId !== courseId));

        // Safely clean up associated PDFs and physical files
        const coursePdfs = pdfs.filter(p => (p as any).folderId?.startsWith(courseId) || (p as any).courseId === courseId);
        coursePdfs.forEach(p => {
          if ((p as any).fileName) deletePdfFile((p as any).fileName);
        });
        setPdfs(prev => prev.filter(p => !(p as any).folderId?.startsWith(courseId) && (p as any).courseId !== courseId));

        if (selectedCourse?.id === courseId) {
          setSelectedCourse(null);
          setSelectedFolder(null);
        }

        setDeleteConfirmModal(null);
        showToast(`تم حذف مقرر «${courseName}» بنجاح`);
      }
    });
  };

  // Handler: Add Custom Category
  const handleAddCustomCategory = (newCat: CustomContentCategory) => {
    setCustomCategories(prev => [newCat, ...prev]);
    setShowNewCustomCategoryModal(false);
    showToast(`تم إنشاء قسم المحتوى الجديد "${newCat.name}" بنجاح!`);
  };

  // Handler: Delete Custom Category
  const handleDeleteCustomCategory = (catId: string) => {
    const catToDelete = customCategories.find(c => c.id === catId);
    const catName = catToDelete ? catToDelete.name : 'القسم المخصص';

    setDeleteConfirmModal({
      isOpen: true,
      title: 'حذف قسم المحتوى المخصص',
      message: `هل أنت متأكد من حذف قسم «${catName}»؟`,
      details: 'سيتم حذف هذا القسم وكافة العناصر والشيفرات البرمجية المخزنة بداخله.',
      confirmText: 'نعم، حذف القسم',
      onConfirm: () => {
        setCustomCategories(prev => prev.filter(c => c.id !== catId));
        setCustomItems(prev => prev.filter(item => item.folderId !== catId));
        if (selectedCustomCategory?.id === catId) {
          setSelectedCustomCategory(null);
        }
        setDeleteConfirmModal(null);
        showToast(`تم حذف قسم «${catName}» بنجاح`);
      }
    });
  };

  // Counts for folders
  const currentCourseVideos = useMemo(() => {
    if (!selectedCourse) return [];
    return videos.filter(v => v.folderId === `${selectedCourse.id}_videos`);
  }, [videos, selectedCourse]);

  const currentCoursePdfs = useMemo(() => {
    if (!selectedCourse) return [];
    return pdfs.filter(p => !p.folderId || p.folderId === `${selectedCourse.id}_pdf`);
  }, [pdfs, selectedCourse]);

  const currentCourseAssignments = useMemo(() => {
    if (!selectedCourse) return [];
    return assignments.filter(a => a.folderId === `${selectedCourse.id}_assignments`);
  }, [assignments, selectedCourse]);

  const currentCourseExams = useMemo(() => {
    if (!selectedCourse) return [];
    return exams.filter(e => e.folderId === `${selectedCourse.id}_exams`);
  }, [exams, selectedCourse]);

  // Custom categories for current course
  const currentCourseCustomCategories = useMemo(() => {
    if (!selectedCourse) return [];
    return customCategories.filter(cat => cat.courseId === selectedCourse.id);
  }, [customCategories, selectedCourse]);

  // Custom items count per custom category
  const customItemsCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    customCategories.forEach(cat => {
      counts[cat.id] = customItems.filter(item => item.folderId === cat.id).length;
    });
    return counts;
  }, [customCategories, customItems]);

  // Current Department Ancestor Path for Breadcrumbs
  const currentDeptPath = useMemo(() => {
    return getDepartmentPath(selectedDept);
  }, [selectedDept, departments]);

  return (
    <div className={`min-h-full p-4 sm:p-8 space-y-8 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`} dir="rtl">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-[6000] px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl shadow-emerald-600/40 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Title Bar */}
      <div className={`p-6 sm:p-7 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 ${
        isDarkMode 
          ? 'bg-zinc-900 border-zinc-800 text-white' 
          : 'bg-emerald-900 text-white border-emerald-900'
      }`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {selectedFolder ? selectedFolder.category.name :
             selectedCourse ? selectedCourse.name :
             selectedDept ? selectedDept.name :
             'الأقسام والتخصصات الأكاديمية'}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {selectedDept ? (
            <button 
              onClick={() => {
                setTargetParentDeptId(selectedDept.id);
                setShowNewDeptModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-black text-xs transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Layers size={16} />
              <span>قسم فرعي جديد</span>
            </button>
          ) : (
            <button 
              onClick={() => {
                setTargetParentDeptId('');
                setShowNewDeptModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-black text-xs transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Layers size={16} className="text-emerald-700" />
              <span>قسم جديد</span>
            </button>
          )}

          <button 
            onClick={() => {
              if (selectedDept) setNewCourseDeptId(selectedDept.id);
              setShowNewCourseModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
          >
            <BookOpen size={16} />
            <span>مقرر تعليمي جديد</span>
          </button>

          <button 
            onClick={() => setShowMobileBackendModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 border border-white/10"
            title="بنية وخادم تطبيق الأندرويد واختبار الروابط المؤقتة"
          >
            <Smartphone size={16} />
            <span>ربط تطبيق الهاتف (Backend)</span>
          </button>
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 text-xs font-black ${
        isDarkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center gap-2 flex-wrap text-gray-500">
          <button 
            onClick={() => { setSelectedDept(null); setSelectedCourse(null); setSelectedFolder(null); }}
            className={`hover:text-emerald-500 flex items-center gap-1.5 transition-colors ${!selectedDept ? 'text-emerald-600 font-black' : ''}`}
          >
            <Home size={14} />
            <span>الأقسام والتخصصات</span>
          </button>

          {currentDeptPath.map((dept, index) => {
            const isLastDept = index === currentDeptPath.length - 1;
            const isCurrentActive = isLastDept && !selectedCourse && !selectedFolder;
            return (
              <React.Fragment key={dept.id}>
                <ChevronLeft size={14} className="opacity-40" />
                <button 
                  onClick={() => {
                    setSelectedDept(dept);
                    setSelectedCourse(null);
                    setSelectedFolder(null);
                  }}
                  className={`hover:text-emerald-500 transition-colors ${isCurrentActive ? 'text-emerald-600 font-black' : ''}`}
                >
                  {dept.name}
                </button>
              </React.Fragment>
            );
          })}

          {selectedCourse && (
            <>
              <ChevronLeft size={14} className="opacity-40" />
              <button 
                onClick={() => {
                  setSelectedFolder(null);
                  setSelectedCustomCategory(null);
                }}
                className={`hover:text-emerald-500 transition-colors ${selectedCourse && !selectedFolder && !selectedCustomCategory ? 'text-emerald-600 font-black' : ''}`}
              >
                {selectedCourse.name}
              </button>
            </>
          )}

          {selectedFolder && (
            <>
              <ChevronLeft size={14} className="opacity-40" />
              <span className="text-emerald-600 font-black">{selectedFolder.category.name}</span>
            </>
          )}

          {selectedCustomCategory && (
            <>
              <ChevronLeft size={14} className="opacity-40" />
              <span className="text-cyan-500 font-black">{selectedCustomCategory.name}</span>
            </>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث سريع في المحتوى..."
            className={`w-full pr-9 pl-4 py-2 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-emerald-500 ${
              isDarkMode ? 'bg-zinc-800 border-white/5 text-white' : 'bg-gray-50 border-gray-200'
            }`}
          />
        </div>
      </div>

      {/* Main Content Area based on Hierarchy Level */}
      
      {/* LEVEL 1: Root Departments List */}
      {!selectedDept && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-black flex items-center gap-2">
              <Layers className="text-emerald-500" size={20} />
              <span>
                {searchQuery ? `نتائج البحث في الأقسام (${filteredDepartments.length})` : `الأقسام والتخصصات الأكاديمية (${filteredDepartments.length})`}
              </span>
            </h2>

            <button 
              onClick={() => {
                setTargetParentDeptId('');
                setShowNewDeptModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              <span>إضافة تخصص جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map((dept) => {
              const deptCoursesCount = courses.filter(c => c.departmentId === dept.id || c.parentId === dept.id).length;
              const deptSubCount = departments.filter(d => d.parentId === dept.id).length;
              return (
                <DepartmentCard 
                  key={dept.id}
                  department={dept}
                  coursesCount={deptCoursesCount}
                  subDepartmentsCount={deptSubCount}
                  onSelect={(d) => setSelectedDept(d)}
                  onEdit={(d) => setEditingItem(d)}
                  onDelete={handleDeleteDepartment}
                  isDarkMode={isDarkMode}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 2: Inside Selected Department (Sub-categories & Courses) */}
      {selectedDept && !selectedCourse && (
        <div className="space-y-10">
          
          {/* Action Bar inside Department */}
          <div className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between flex-wrap gap-4 transition-all ${
            isDarkMode 
              ? 'bg-zinc-900/90 border-white/5 shadow-lg' 
              : 'bg-white border-emerald-100/80 shadow-xs'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-gray-400">القسم الأكاديمي الحالي:</div>
                <div className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{selectedDept.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button 
                onClick={() => {
                  setDepartmentForReport(selectedDept);
                  setShowDepartmentReportModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                title="إنشاء وتصدير تقرير شامل لكافة مقررات هذا القسم بصيغة PDF مع خيارات التخصيص"
              >
                <Printer size={14} />
                <span>تقرير المقررات (PDF)</span>
              </button>

              <button 
                onClick={() => setEditingItem(selectedDept)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all ${
                  isDarkMode 
                    ? 'bg-zinc-800/80 hover:bg-zinc-700 border-white/10 text-zinc-200' 
                    : 'bg-emerald-50/60 hover:bg-emerald-100/80 border-emerald-200/80 text-emerald-800'
                }`}
              >
                <Edit3 size={14} className="text-emerald-500" />
                <span>تعديل الغلاف والاسم</span>
              </button>

              <button 
                onClick={() => handleDeleteDepartment(selectedDept.id)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all ${
                  isDarkMode 
                    ? 'bg-rose-950/30 hover:bg-rose-900/40 border-rose-900/40 text-rose-400' 
                    : 'bg-rose-50/70 hover:bg-rose-100 border-rose-200/80 text-rose-600'
                }`}
                title="حذف هذا القسم وكافة تفرعاته"
              >
                <Trash2 size={14} />
                <span>حذف القسم</span>
              </button>

              <button 
                onClick={() => {
                  setTargetParentDeptId(selectedDept.id);
                  setShowNewDeptModal(true);
                }}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-95"
              >
                <Plus size={14} />
                <span>إضافة قسم فرعي</span>
              </button>

              <button 
                onClick={() => {
                  setNewCourseDeptId(selectedDept.id);
                  setShowNewCourseModal(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-95"
              >
                <Plus size={14} />
                <span>إضافة مقرر تعليمي</span>
              </button>
            </div>
          </div>

          {/* Section 1: Sub-Departments / Sub-Categories */}
          {filteredSubDepartments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Layers className="text-cyan-500" size={18} />
                  <span>الأقسام والتخصصات الفرعية (Sub-categories) ({filteredSubDepartments.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubDepartments.map((subDept) => {
                  const subCoursesCount = courses.filter(c => c.departmentId === subDept.id || c.parentId === subDept.id).length;
                  const subChildrenCount = departments.filter(d => d.parentId === subDept.id).length;
                  return (
                    <DepartmentCard 
                      key={subDept.id}
                      department={subDept}
                      coursesCount={subCoursesCount}
                      subDepartmentsCount={subChildrenCount}
                      onSelect={(d) => setSelectedDept(d)}
                      onEdit={(d) => setEditingItem(d)}
                      onDelete={handleDeleteDepartment}
                      isDarkMode={isDarkMode}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Courses in this Department */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <BookOpen className="text-blue-500" size={18} />
                <span>المقررات التعليمية التابعة لهذا القسم ({filteredCourses.length})</span>
              </h3>
            </div>

            {filteredCourses.length === 0 && filteredSubDepartments.length === 0 ? (
              <div className={`p-12 rounded-[32px] border text-center flex flex-col items-center justify-center ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <BookOpen size={36} className="text-blue-500 mb-3" />
                <h3 className="text-base font-black mb-1">لا توجد أقسام فرعية أو مقررات بعد في هذا القسم</h3>
                <p className="text-xs text-gray-400 font-bold mb-6">يمكنك إنشاء قسم فرعي (Sub-category) لتنظيم التخصص، أو إضافة مقرر تعليمي مباشرة.</p>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <button 
                    onClick={() => {
                      setTargetParentDeptId(selectedDept.id);
                      setShowNewDeptModal(true);
                    }}
                    className="px-5 py-2.5 bg-cyan-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-cyan-700 transition-all flex items-center gap-1.5"
                  >
                    <Layers size={14} />
                    <span>+ إضافة قسم فرعي أول</span>
                  </button>
                  <button 
                    onClick={() => {
                      setNewCourseDeptId(selectedDept.id);
                      setShowNewCourseModal(true);
                    }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center gap-1.5"
                  >
                    <BookOpen size={14} />
                    <span>+ إضافة مقرر تعليمي أول</span>
                  </button>
                </div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className={`p-8 rounded-[24px] border text-center flex flex-col items-center justify-center ${isDarkMode ? 'bg-zinc-900/30 border-white/5' : 'bg-gray-50/50 border-gray-100'}`}>
                <p className="text-xs text-gray-400 font-bold mb-3">لا توجد مقررات مباشرة هنا، المقررات موزعة داخل الأقسام الفرعية أعلاه أو يمكنك إضافة مقرر جديد.</p>
                <button 
                  onClick={() => {
                    setNewCourseDeptId(selectedDept.id);
                    setShowNewCourseModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs shadow-md hover:bg-blue-700 transition-all"
                >
                  + إضافة مقرر لهذا القسم
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => {
                  const cVideos = videos.filter(v => v.folderId === `${course.id}_videos`).length;
                  const cPdfs = pdfs.filter(p => !p.folderId || p.folderId === `${course.id}_pdf`).length;
                  const cAsg = assignments.filter(a => a.folderId === `${course.id}_assignments`).length;
                  const cExams = exams.filter(e => e.folderId === `${course.id}_exams`).length;

                  return (
                    <CourseCard 
                      key={course.id}
                      course={course}
                      videosCount={cVideos}
                      pdfsCount={cPdfs}
                      assignmentsCount={cAsg}
                      examsCount={cExams}
                      onSelect={(c) => setSelectedCourse(c)}
                      onEdit={(c) => setEditingCourseWithFolders(c)}
                      onDelete={handleDeleteCourse}
                      isDarkMode={isDarkMode}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 3: 4 Folders + Custom Categories inside Selected Course */}
      {selectedCourse && !selectedFolder && !selectedCustomCategory && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <FolderPlus className="text-emerald-500" size={20} />
                <span>مجلدات المقرر: {selectedCourse.name}</span>
              </h2>
              <p className="text-xs text-gray-400 font-bold mt-1">
                تصفح المحتوى التعليمي عبر الأقسام الأربعة والأقسام المخصصة وتصدير التقارير بصيغة PDF.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button 
                onClick={() => setShowCourseReportModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                title="إنشاء وتصدير تقرير شامل لهذا المقرر بصيغة PDF مع خيارات التخصيص"
              >
                <Printer size={14} />
                <span>تقرير المقرر (PDF)</span>
              </button>

              <button 
                onClick={() => setEditingCourseWithFolders(selectedCourse)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Edit3 size={14} />
                <span>تعديل غلاف واسم المقرر</span>
              </button>

              <button 
                onClick={() => handleDeleteCourse(selectedCourse.id)}
                className="px-4 py-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-black flex items-center gap-1.5 transition-colors"
                title="حذف هذا المقرر ومجلداته"
              >
                <Trash2 size={14} />
                <span>حذف هذا المقرر</span>
              </button>
            </div>
          </div>

          <FolderCards 
            course={selectedCourse}
            videosCount={currentCourseVideos.length}
            pdfsCount={currentCoursePdfs.length}
            assignmentsCount={currentCourseAssignments.length}
            examsCount={currentCourseExams.length}
            customCategories={currentCourseCustomCategories}
            customItemsCount={customItemsCountMap}
            onSelectFolder={(type, cat) => {
              setSelectedCustomCategory(null);
              setSelectedFolder({ type, category: cat });
            }}
            onSelectCustomCategory={(cat) => {
              setSelectedFolder(null);
              setSelectedCustomCategory(cat);
            }}
            onOpenNewCustomCategory={() => setShowNewCustomCategoryModal(true)}
            onDeleteCustomCategory={handleDeleteCustomCategory}
            folderCovers={folderCovers}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* LEVEL 4: Active Standard Folder Sub-Section */}
      {selectedCourse && selectedFolder && (
        <div className="space-y-6">
          
          {selectedFolder.type === 'videos' && (
            <VideoSection 
              videos={currentCourseVideos}
              courseId={selectedCourse.id}
              folderId={`${selectedCourse.id}_videos`}
              onUpdateVideos={(updated) => {
                const other = videos.filter(v => v.folderId !== `${selectedCourse.id}_videos`);
                setVideos([...updated, ...other]);
              }}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

          {selectedFolder.type === 'pdf' && (
            <PdfSection 
              pdfs={currentCoursePdfs}
              folderId={`${selectedCourse.id}_pdf`}
              onUpdatePdfs={(updated) => {
                const other = pdfs.filter(p => p.folderId && p.folderId !== `${selectedCourse.id}_pdf`);
                setPdfs([...updated.map(u => ({ ...u, folderId: `${selectedCourse.id}_pdf` })), ...other]);
              }}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

          {selectedFolder.type === 'assignments' && (
            <AssignmentSection 
              assignments={currentCourseAssignments}
              folderId={`${selectedCourse.id}_assignments`}
              onUpdateAssignments={(updated) => {
                const other = assignments.filter(a => a.folderId !== `${selectedCourse.id}_assignments`);
                setAssignments([...updated, ...other]);
              }}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

          {selectedFolder.type === 'exams' && (
            <ExamSection 
              exams={currentCourseExams}
              folderId={`${selectedCourse.id}_exams`}
              onUpdateExams={(updated) => {
                const other = exams.filter(e => e.folderId !== `${selectedCourse.id}_exams`);
                setExams([...updated, ...other]);
              }}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          )}

        </div>
      )}

      {/* LEVEL 4 (Alternative): Active Custom Content Category Sub-Section */}
      {selectedCourse && selectedCustomCategory && (
        <CustomContentSection 
          items={customItems.filter(item => item.folderId === selectedCustomCategory.id)}
          category={selectedCustomCategory}
          courseId={selectedCourse.id}
          onUpdateItems={(updated) => {
            const other = customItems.filter(item => item.folderId !== selectedCustomCategory.id);
            setCustomItems([...updated, ...other]);
          }}
          onShowToast={showToast}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Edit Cover Modal for Department / Simple Items (1920x1080) */}
      {editingItem && (
        <EditCoverModal 
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEditedItem}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Unified Edit Modal for Course & its 4 Folders (1920x1080) */}
      {editingCourseWithFolders && (
        <EditCourseWithFoldersModal 
          course={editingCourseWithFolders}
          isOpen={!!editingCourseWithFolders}
          onClose={() => setEditingCourseWithFolders(null)}
          onSave={handleSaveCourseWithFolders}
          initialFolderCovers={folderCovers}
          isDarkMode={isDarkMode}
        />
      )}

      {/* New Department / Sub-Department Modal */}
      {showNewDeptModal && (
        <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Layers size={20} />
                </div>
                <h3 className="text-lg font-black">
                  {targetParentDeptId ? 'إنشاء قسم فرعي جديد (Sub-category)' : 'إنشاء قسم وتخصص جديد'}
                </h3>
              </div>
              <button onClick={() => setShowNewDeptModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-black mb-1.5">القسم الأب / التابع له</label>
                <select 
                  value={targetParentDeptId}
                  onChange={(e) => setTargetParentDeptId(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                >
                  <option value="">— قسم رئيسي (المستوى الأول بدون قسم أب) —</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {getDepartmentFullName(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">اسم القسم / التخصص *</label>
                <input 
                  type="text" 
                  value={newDeptName} 
                  onChange={(e) => setNewDeptName(e.target.value)} 
                  required
                  placeholder={targetParentDeptId ? "مثال: تخصص التسويق الرقمي، مسار هندسة البيانات..." : "مثال: قسم ريادة الأعمال وتطوير الأعمال..."}
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">الوصف والنبذة التعريفية</label>
                <textarea 
                  value={newDeptDesc} 
                  onChange={(e) => setNewDeptDesc(e.target.value)} 
                  rows={3}
                  placeholder="شرح مجالات التخصص وأهدافه التعليمية..."
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <button type="button" onClick={() => setShowNewDeptModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-black bg-gray-100 dark:bg-zinc-800">
                  إلغاء
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 flex items-center gap-2">
                  <Check size={16} />
                  <span>{targetParentDeptId ? 'إنشاء القسم الفرعي' : 'إنشاء القسم الرئيسي'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Course Modal */}
      {showNewCourseModal && (
        <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-lg font-black">إنشاء مقرر تعليمي جديد</h3>
              </div>
              <button onClick={() => setShowNewCourseModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-black mb-1.5">القسم التابع له المقرر *</label>
                <select 
                  value={newCourseDeptId || selectedDept?.id || departments[0]?.id} 
                  onChange={(e) => setNewCourseDeptId(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {getDepartmentFullName(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">اسم المقرر التعليمي *</label>
                <input 
                  type="text" 
                  value={newCourseName} 
                  onChange={(e) => setNewCourseName(e.target.value)} 
                  required
                  placeholder="مثال: مقرر استراتيجيات التسويق الرقمي..."
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">نبذة عن المقرر</label>
                <textarea 
                  value={newCourseDesc} 
                  onChange={(e) => setNewCourseDesc(e.target.value)} 
                  rows={2}
                  placeholder="محتويات المقرر وأهدافه..."
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-blue-500 resize-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <button type="button" onClick={() => setShowNewCourseModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-black bg-gray-100 dark:bg-zinc-800">
                  إلغاء
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30 flex items-center gap-2">
                  <Check size={16} />
                  <span>إنشاء المقرر والمجلدات الأربعة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
            isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'
          }`}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-500">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-red-500">{deleteConfirmModal.title}</h3>
                  <p className="text-[11px] text-gray-400 font-bold">يرجى تأكيد قرار الحذف</p>
                </div>
              </div>
              <button 
                onClick={() => setDeleteConfirmModal(null)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-6 text-right">
              <p className="text-sm font-black leading-relaxed">
                {deleteConfirmModal.message}
              </p>
              {deleteConfirmModal.details && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold leading-relaxed">
                  {deleteConfirmModal.details}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmModal(null)} 
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button 
                type="button" 
                onClick={() => deleteConfirmModal.onConfirm()} 
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all active:scale-95"
              >
                <Trash2 size={16} />
                <span>{deleteConfirmModal.confirmText || 'تأكيد الحذف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Courses Report Modal (PDF Generator) */}
      <DepartmentReportModal 
        isOpen={showDepartmentReportModal}
        onClose={() => {
          setShowDepartmentReportModal(false);
          setDepartmentForReport(null);
        }}
        department={departmentForReport || selectedDept || departments[0]}
        departmentPath={(departmentForReport || selectedDept) ? getDepartmentPath(departmentForReport || selectedDept) : []}
        courses={(() => {
          const targetDeptId = (departmentForReport || selectedDept || departments[0])?.id;
          if (!targetDeptId) return courses;
          // Collect all sub-department ids
          const deptIds = [targetDeptId];
          const queue = [targetDeptId];
          while (queue.length > 0) {
            const current = queue.shift()!;
            const children = departments.filter(d => d.parentId === current);
            for (const child of children) {
              if (!deptIds.includes(child.id)) {
                deptIds.push(child.id);
                queue.push(child.id);
              }
            }
          }
          const matched = courses.filter(c => deptIds.includes(c.parentId || ''));
          return matched.length > 0 ? matched : courses;
        })()}
        videos={videos}
        pdfs={pdfs}
        assignments={assignments}
        exams={exams}
        customCategories={customCategories}
        customItems={customItems}
        isDarkMode={isDarkMode}
      />

      {/* Course Report Modal (PDF Generator) */}
      {selectedCourse && (
        <CourseReportModal 
          isOpen={showCourseReportModal}
          onClose={() => setShowCourseReportModal(false)}
          course={selectedCourse}
          department={selectedDept}
          departmentPath={currentDeptPath}
          videos={currentCourseVideos}
          pdfs={currentCoursePdfs}
          assignments={currentCourseAssignments}
          exams={currentCourseExams}
          customCategories={currentCourseCustomCategories}
          customItems={customItems.filter(item => currentCourseCustomCategories.some(cat => cat.id === item.folderId))}
          isDarkMode={isDarkMode}
        />
      )}

      {/* New Custom Category Modal (e.g. Source Code, Labs) */}
      {selectedCourse && (
        <NewCustomCategoryModal 
          isOpen={showNewCustomCategoryModal}
          onClose={() => setShowNewCustomCategoryModal(false)}
          courseId={selectedCourse.id}
          onAddCategory={handleAddCustomCategory}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Mobile Backend & Temporary Stream Bridge Modal */}
      {showMobileBackendModal && (
        <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl border ${
            isDarkMode ? 'bg-zinc-950 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
          }`}>
            <button
              onClick={() => setShowMobileBackendModal(false)}
              className="absolute top-5 left-5 p-2 rounded-xl bg-gray-200/50 dark:bg-zinc-800 text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={20} />
            </button>

            <MobileBackendManager
              departments={departments.map(d => ({
                id: d.id,
                name: d.name,
                icon: d.iconName || 'folder',
                code: d.name.substring(0, 3).toUpperCase(),
                coursesCount: courses.filter(c => c.departmentId === d.id || c.parentId === d.id).length
              }))}
              courses={courses.map(c => ({
                id: c.id,
                title: c.name,
                description: c.description,
                departmentId: c.departmentId || c.parentId || 'dept_cs',
                instructor: 'المحاضر الأكاديمي',
                lessonsCount: 10,
                folders: [
                  {
                    id: `${c.id}_videos`,
                    name: 'محاضرات الفيديو',
                    videos: videos.filter(v => v.folderId === `${c.id}_videos`)
                  }
                ]
              }))}
              isDarkMode={isDarkMode}
              onShowToast={showToast}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default EducationalManager;
