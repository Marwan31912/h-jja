import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Upload, Plus, Trash2, Play, CheckCircle2, 
  Clock, User, FileVideo, HardDrive, Check, X, 
  Maximize2, Minimize2, RotateCcw, Volume2, VolumeX, Edit3,
  GripVertical, ChevronUp, ChevronDown, ArrowUpDown, Image as ImageIcon,
  AlertCircle, RefreshCw, Layers, Sparkles, FolderPlus, Zap, Film
} from 'lucide-react';
import { VideoLesson } from '../../types';
import { 
  saveVideoFile, 
  getVideoStreamUrl, 
  deleteVideoFile, 
  saveVideoBlob, 
  getVideoBlob, 
  deleteVideoBlob,
  triggerVideoTranscoding,
  getVideoTranscodingStatus
} from '../../services/eduStorage';
import { VideoCard } from './VideoCard';

interface VideoSectionProps {
  videos: VideoLesson[];
  courseId: string;
  folderId: string;
  onUpdateVideos: (updated: VideoLesson[]) => void;
  isDarkMode?: boolean;
  onShowToast: (msg: string) => void;
}

export interface BatchVideoQueueItem {
  id: string;
  file: File;
  title: string;
  author: string;
  description: string;
  size: number;
  duration: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  errorMessage?: string;
  createdLesson?: VideoLesson;
}

export const VideoSection: React.FC<VideoSectionProps> = ({
  videos,
  courseId,
  folderId,
  onUpdateVideos,
  isDarkMode,
  onShowToast
}) => {
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(null);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoLesson | null>(null);
  
  // Drag and drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Batch Upload Queue State
  const [batchQueue, setBatchQueue] = useState<BatchVideoQueueItem[]>([]);
  const [batchCommonAuthor, setBatchCommonAuthor] = useState('');
  const [batchCommonCover, setBatchCommonCover] = useState<string>('');
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [overallBatchProgress, setOverallBatchProgress] = useState(0);
  const [isDraggingOverPicker, setIsDraggingOverPicker] = useState(false);

  // Edit Video Form
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [editFileSize, setEditFileSize] = useState<number | undefined>(undefined);
  const [editDuration, setEditDuration] = useState('');
  const [editNewVideoFile, setEditNewVideoFile] = useState<File | null>(null);
  const [isUploadingNewVideo, setIsUploadingNewVideo] = useState(false);
  const [editTranscodeStatus, setEditTranscodeStatus] = useState<string>('completed');
  const [editTranscodeProgress, setEditTranscodeProgress] = useState<number>(100);
  const [editQualities, setEditQualities] = useState<Record<string, any>>({});
  const [isTriggeringTranscode, setIsTriggeringTranscode] = useState(false);

  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const editCoverInputRef = useRef<HTMLInputElement>(null);
  const editVideoFileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Live polling for FFmpeg transcoding status
  useEffect(() => {
    let interval: any = null;

    const pollStatus = async () => {
      if (!editingVideo) return;
      try {
        const res = await getVideoTranscodingStatus(editingVideo.id);
        if (res.success) {
          if (res.isProcessing) {
            setEditTranscodeStatus('processing');
            setEditTranscodeProgress(res.progress || 0);
          } else {
            setEditTranscodeStatus(res.transcodingStatus || 'completed');
            setEditTranscodeProgress(100);
            if (res.qualities) {
              setEditQualities(res.qualities);
            }
          }

          // Also update in parent videos list
          if (res.qualities || res.isProcessing !== undefined) {
            onUpdateVideos(videos.map(v => {
              if (v.id === editingVideo.id) {
                return {
                  ...v,
                  qualities: res.qualities || v.qualities,
                  transcodingStatus: res.isProcessing ? 'processing' : (res.transcodingStatus || v.transcodingStatus || 'completed'),
                  transcodeProgress: res.isProcessing ? res.progress : 100
                };
              }
              return v;
            }));
          }
        }
      } catch (err) {
        // Silently continue polling
      }
    };

    if (editingVideo) {
      pollStatus();
      interval = setInterval(pollStatus, 2500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [editingVideo]);

  // Load video streaming source when active video changes
  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadSrc() {
      if (!activeVideo) {
        setActiveVideoSrc(null);
        return;
      }

      // 1. If it has a fileName or is a local file, stream directly from server
      if (activeVideo.fileName) {
        const streamUrl = getVideoStreamUrl(activeVideo.fileName, activeVideo);
        setActiveVideoSrc(streamUrl);
        return;
      }

      // 2. Check if stored locally in IndexedDB as fallback
      const blob = await getVideoBlob(activeVideo.id);
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setActiveVideoSrc(objectUrl);
      } else if (activeVideo.videoUrl) {
        setActiveVideoSrc(activeVideo.videoUrl);
      }
    }

    loadSrc();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeVideo]);

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  // Helper to extract duration from video file asynchronously
  const extractVideoDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        const url = URL.createObjectURL(file);
        tempVideo.src = url;

        tempVideo.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          const minutes = Math.floor(tempVideo.duration / 60);
          const seconds = Math.floor(tempVideo.duration % 60);
          resolve(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        };

        tempVideo.onerror = () => {
          URL.revokeObjectURL(url);
          resolve('10:00');
        };

        // Fallback timeout in case metadata event stalls
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve('10:00');
        }, 2000);
      } catch (err) {
        resolve('10:00');
      }
    });
  };

  // Helper to clean filename into readable video title
  const cleanFileNameToTitle = (filename: string): string => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return nameWithoutExt
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Handle adding selected multiple files to batch queue
  const handleFilesSelected = async (filesList: FileList | File[]) => {
    const incomingFiles = Array.from(filesList).filter(f => 
      f.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(f.name)
    );

    if (incomingFiles.length === 0) {
      onShowToast('يرجى اختيار ملفات فيديو مدعومة (MP4, WebM, MKV, MOV)');
      return;
    }

    const newItems: BatchVideoQueueItem[] = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      const uniqueId = 'queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + i;
      const title = cleanFileNameToTitle(file.name);

      newItems.push({
        id: uniqueId,
        file,
        title: title || `الدرس ${batchQueue.length + newItems.length + 1}`,
        author: batchCommonAuthor.trim(),
        description: '',
        size: file.size,
        duration: 'جاري الحساب...',
        status: 'pending',
        progress: 0
      });
    }

    setBatchQueue(prev => [...prev, ...newItems]);

    // Asynchronously resolve durations for new items
    for (const item of newItems) {
      extractVideoDuration(item.file).then(duration => {
        setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, duration } : q));
      });
    }

    onShowToast(`تمت إضافة ${incomingFiles.length} ملف إلى قائمة الرفع المتعدد.`);
  };

  // Process cover image upload
  const handleCoverUpload = (file: File, isEdit: boolean = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (isEdit) {
        setEditCoverImage(result);
      } else {
        setBatchCommonCover(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open edit modal
  const handleOpenEdit = (vid: VideoLesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVideo(vid);
    setEditTitle(vid.title);
    setEditAuthor(vid.author || '');
    setEditDesc(vid.description || '');
    setEditCoverImage(vid.coverImage || '');
    setEditFileName(vid.fileName || '');
    setEditFileSize(vid.fileSize);
    setEditDuration(vid.duration || '10:00');
    setEditNewVideoFile(null);
    setIsUploadingNewVideo(false);
    setEditTranscodeStatus(vid.transcodingStatus || 'completed');
    setEditTranscodeProgress(vid.transcodeProgress || 100);
    setEditQualities(vid.qualities || {});
  };

  // Handle selecting a new video file to replace or attach to this lesson
  const handleSelectNewVideoFileForEdit = async (file: File) => {
    setEditNewVideoFile(file);
    setEditFileName(file.name);
    setEditFileSize(file.size);
    try {
      const dur = await extractVideoDuration(file);
      setEditDuration(dur);
    } catch (e) {
      setEditDuration('10:00');
    }
    onShowToast(`تم اختيار ملف الفيديو الجديد: ${file.name} - سيتم حفظه عند الضغط على "حفظ التعديلات".`);
  };

  // Trigger manual re-transcoding for single video
  const handleTriggerManualTranscode = async () => {
    if (!editingVideo) return;
    setIsTriggeringTranscode(true);
    try {
      const res = await triggerVideoTranscoding(editingVideo.id);
      if (res.success) {
        setEditTranscodeStatus('processing');
        setEditTranscodeProgress(10);
        onShowToast('⚡ بدأت مكتبة FFmpeg في معالجة وضغط جودات الفيديو (1080p, 720p, 480p, 360p) في الخلفية!');
      } else {
        onShowToast(res.error || 'تعذر بدء المعالجة');
      }
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء تشغيل المعالجة');
    } finally {
      setIsTriggeringTranscode(false);
    }
  };

  // Save edited video details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    if (!editTitle.trim()) {
      onShowToast('يرجى إدخال عنوان الدرس');
      return;
    }

    let updatedFileName = editFileName || editingVideo.fileName || '';
    let updatedFileSize = editFileSize !== undefined ? editFileSize : editingVideo.fileSize;
    let updatedDuration = editDuration || editingVideo.duration || '10:00';

    // If user selected a new video file to upload/replace
    if (editNewVideoFile) {
      setIsUploadingNewVideo(true);
      try {
        // If there was an old file and the name differs, remove it
        if (editingVideo.fileName && editingVideo.fileName !== editNewVideoFile.name) {
          try {
            await deleteVideoFile(editingVideo.fileName);
          } catch (delErr) {
            console.warn('[VideoSection] Could not delete previous video file:', delErr);
          }
        }

        const fileRes = await saveVideoFile(editingVideo.id, editNewVideoFile, editNewVideoFile.name);
        updatedFileName = fileRes.fileName || editNewVideoFile.name;
        updatedFileSize = fileRes.size || editNewVideoFile.size;
        onShowToast('تم حفظ ورفع ملف الفيديو الجديد بنجاح في مجلد الخادم!');
      } catch (uploadErr: any) {
        console.error('[VideoSection] Error saving new video file:', uploadErr);
        onShowToast('تعذر رفع ملف الفيديو الجديد: ' + (uploadErr?.message || 'خطأ غير معروف'));
        setIsUploadingNewVideo(false);
        return;
      }
      setIsUploadingNewVideo(false);
    }

    const updated = videos.map(v => {
      if (v.id === editingVideo.id) {
        return {
          ...v,
          title: editTitle.trim(),
          author: editAuthor.trim(),
          description: editDesc.trim(),
          coverImage: editCoverImage || undefined,
          fileName: updatedFileName,
          fileSize: updatedFileSize,
          duration: updatedDuration,
          isLocalFile: true,
          qualities: editQualities && Object.keys(editQualities).length > 0 ? editQualities : v.qualities,
          transcodingStatus: editTranscodeStatus || v.transcodingStatus
        };
      }
      return v;
    });

    onUpdateVideos(updated);
    if (activeVideo?.id === editingVideo.id) {
      setActiveVideo({
        ...activeVideo,
        title: editTitle.trim(),
        author: editAuthor.trim(),
        description: editDesc.trim(),
        coverImage: editCoverImage || undefined,
        fileName: updatedFileName,
        fileSize: updatedFileSize,
        duration: updatedDuration,
        isLocalFile: true,
        qualities: editQualities && Object.keys(editQualities).length > 0 ? editQualities : activeVideo.qualities,
        transcodingStatus: editTranscodeStatus || activeVideo.transcodingStatus
      });
    }

    setEditingVideo(null);
    setEditNewVideoFile(null);
    onShowToast('تم تحديث بيانات وملف الفيديو بنجاح!');
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
    const newlyCreatedLessons: VideoLesson[] = [];

    // Process items sequentially with fine progress updates & isolated error boundaries
    for (const item of pendingItems) {
      // 1. Mark as uploading
      setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 15, errorMessage: undefined } : q));

      const videoId = 'vid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      try {
        // Step 2: calculate duration if not yet ready
        let finalDuration = item.duration;
        if (!finalDuration || finalDuration === 'جاري الحساب...') {
          finalDuration = await extractVideoDuration(item.file);
        }

        setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 45, duration: finalDuration } : q));

        // Step 3: Stream MP4 file to physical filesystem (server_videos/)
        const fileRes = await saveVideoFile(videoId, item.file, item.file.name);

        setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 85 } : q));

        const lesson: VideoLesson = {
          id: videoId,
          title: item.title.trim() || item.file.name,
          description: item.description.trim() || 'فيديو تعليمي محلي بصيغة MP4 تم حفظه في مجلد الخادم الموحد.',
          author: (item.author.trim() || batchCommonAuthor.trim()) || 'المعلم / المحاضر',
          fileName: fileRes.fileName || item.file.name,
          fileSize: fileRes.size || item.file.size,
          duration: finalDuration || '10:00',
          isLocalFile: true,
          coverImage: batchCommonCover || undefined,
          folderId: folderId,
          addedAt: Date.now(),
          isCompleted: false
        };

        newlyCreatedLessons.push(lesson);
        completedCount++;

        // Step 4: Mark individual item as completed
        setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', progress: 100, createdLesson: lesson } : q));

        // Step 5: Update overall progress
        const overall = Math.round((completedCount / totalCount) * 100);
        setOverallBatchProgress(overall);

      } catch (err: any) {
        console.error(`Error uploading item ${item.file.name}:`, err);
        // Isolated error handling: flag current item as error, let other items continue!
        setBatchQueue(prev => prev.map(q => q.id === item.id ? { 
          ...q, 
          status: 'error', 
          progress: 0, 
          errorMessage: err?.message || 'فشل في حفظ الفيديو في مجلد الخادم' 
        } : q));
      }
    }

    setIsBatchUploading(false);

    if (newlyCreatedLessons.length > 0) {
      onUpdateVideos([...newlyCreatedLessons, ...videos]);
      onShowToast(`تم حفظ وتخزين ${newlyCreatedLessons.length} فيديو بنجاح في مجلد الخادم الموحد!`);
    } else {
      onShowToast('لم يكتمل رفع أي فيديو بنجاح، يرجى مراجعة الأخطاء والمحاولة مجدداً.');
    }
  };

  // Remove item from queue
  const handleRemoveQueueItem = (id: string) => {
    setBatchQueue(prev => prev.filter(q => q.id !== id));
  };

  // Update specific item in queue
  const handleUpdateQueueItem = (id: string, updates: Partial<BatchVideoQueueItem>) => {
    setBatchQueue(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  // Reset / Clear Queue
  const handleClearQueue = () => {
    if (isBatchUploading) return;
    setBatchQueue([]);
    setOverallBatchProgress(0);
  };

  // Delete stored video
  const handleDeleteVideo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const vidToDelete = videos.find(v => v.id === id);
    if (vidToDelete?.fileName) {
      await deleteVideoFile(vidToDelete.fileName);
    }
    await deleteVideoBlob(id);

    const updated = videos.filter(v => v.id !== id);
    onUpdateVideos(updated);
    if (activeVideo?.id === id) {
      setActiveVideo(null);
    }
    onShowToast('تم حذف الفيديو بنجاح من مجلد الخادم وقاعدة البيانات');
  };

  const handleToggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = videos.map(v => v.id === id ? { ...v, isCompleted: !v.isCompleted } : v);
    onUpdateVideos(updated);
  };

  // Handle HTML5 Drag and Drop Reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...videos];
    const [movedVideo] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedVideo);

    onUpdateVideos(reordered);
    onShowToast(`تم نقل الدرس إلى الموضع (الدرس ${targetIndex + 1}) وتحديث الترتيب تلقائياً!`);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move 1 step up or down (for quick click reorder)
  const handleMoveStep = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= videos.length) return;

    const reordered = [...videos];
    const [movedVideo] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, movedVideo);

    onUpdateVideos(reordered);
    onShowToast(`تم تغيير الترتيب ليصبح (الدرس ${targetIndex + 1})`);
  };

  // Summary counts for batch queue
  const completedBatchCount = batchQueue.filter(q => q.status === 'completed').length;
  const errorBatchCount = batchQueue.filter(q => q.status === 'error').length;
  const pendingBatchCount = batchQueue.filter(q => q.status === 'pending' || q.status === 'uploading').length;

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black flex items-center gap-2">
            <Video className="text-blue-500" size={24} />
            <span>01 - الفيديوهات التعليمية (دروس مرئية)</span>
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1">
            دعم كامل لرفع الفيديوهات المتعددة دفعة واحدة (Batch Multi-Upload) وتشغيلها محلياً دون اتصال.
          </p>
        </div>

        <button 
          onClick={() => {
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all hover:scale-105"
        >
          <Upload size={16} />
          <span>رفع فيديوهات متعددة (Batch Upload)</span>
        </button>
      </div>

      {/* Video Player (when a video is selected) */}
      {activeVideo && (
        <div className={`p-6 rounded-[32px] border shadow-2xl space-y-4 ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Play size={20} />
              </div>
              <div>
                <h4 className="text-base font-black">{activeVideo.title}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-bold mt-0.5">
                  <span className="flex items-center gap-1"><User size={12} /> {activeVideo.author || 'المحاضر'}</span>
                  {activeVideo.fileSize && (
                    <span className="flex items-center gap-1 text-emerald-500 font-bold">
                      <HardDrive size={12} /> {formatSize(activeVideo.fileSize)} (محلي)
                    </span>
                  )}
                  {activeVideo.duration && <span className="flex items-center gap-1"><Clock size={12} /> {activeVideo.duration}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={(e) => handleOpenEdit(activeVideo, e)}
                className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 text-xs font-black flex items-center gap-1.5 transition-all"
                title="تعديل بيانات وغلاف وإرفاق ملف الفيديو"
              >
                <Edit3 size={14} />
                <span>تعديل وإرفاق الفيديو</span>
              </button>
              <button 
                onClick={() => setActiveVideo(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* HTML5 Native Video Player */}
          <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden shadow-inner flex items-center justify-center">
            {activeVideoSrc ? (
              <video 
                ref={videoPlayerRef}
                src={activeVideoSrc} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-white text-center p-6 space-y-3">
                <FileVideo size={40} className="mx-auto text-emerald-400 opacity-80" />
                <div>
                  <h5 className="text-sm font-black text-white">ملف الفيديو غير متوفر أو تم حذفه من مجلد الخادم</h5>
                  <p className="text-xs text-gray-400 mt-1">البطاقة والبيانات محفوظة، يمكنك إرفاق أو رفع ملف الفيديو للدرس الآن</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleOpenEdit(activeVideo, e)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-2 shadow-lg transition-all"
                >
                  <Upload size={15} />
                  <span>إرفاق ورفع ملف الفيديو (MP4)</span>
                </button>
              </div>
            )}
          </div>

          {activeVideo.description && (
            <p className="text-xs text-gray-400 font-bold p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 leading-relaxed">
              {activeVideo.description}
            </p>
          )}
        </div>
      )}

      {/* Videos List Grid */}
      {videos.length === 0 ? (
        <div className={`p-12 rounded-[32px] border text-center flex flex-col items-center justify-center ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
            <FileVideo size={32} />
          </div>
          <h4 className="text-base font-black mb-1">لا توجد فيديوهات محلية في هذا المجلد بعد</h4>
          <p className="text-xs text-gray-400 font-bold mb-6 max-w-md">
            قم برفع حزمة أو عدة دروس ومحاضرات بصيغة MP4 دفعة واحدة ليتم تخزينها محلياً في المتصفح ومشاهدتها في أي وقت.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Upload size={16} />
            <span>رفع ملفات فيديو متعددة الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((vid, idx) => (
            <VideoCard 
              key={vid.id}
              video={vid}
              index={idx}
              totalVideos={videos.length}
              isActive={activeVideo?.id === vid.id}
              isDragging={draggedIndex === idx}
              isDragOver={dragOverIndex === idx && draggedIndex !== idx}
              isDarkMode={isDarkMode}
              onSelect={setActiveVideo}
              onToggleComplete={handleToggleComplete}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteVideo}
              onMoveStep={handleMoveStep}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}

      {/* Multi-File Batch Upload Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className={`w-full max-w-3xl rounded-[32px] p-6 sm:p-8 shadow-2xl border my-8 flex flex-col max-h-[90vh] ${
            isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <span>رفع حزمة فيديوهات متعددة (Batch Upload)</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black">
                      طابور متسلسل معزول الأخطاء
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    اختر عدة ملفات MP4 / Video في إجراء واحد ليتم تخزينها وبناء طابور الرفع مع مؤشرات التقدم
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

            {/* Scrollable Modal Content */}
            <div className="overflow-y-auto flex-1 space-y-5 pr-1 pl-1">
              
              {/* Multi-File Picker & Drag/Drop Zone */}
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
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' 
                    : isDarkMode ? 'border-zinc-700 bg-zinc-800/40 hover:border-blue-500' : 'border-gray-300 bg-gray-50/80 hover:border-blue-500'
                } ${isBatchUploading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input 
                  ref={multiFileInputRef} 
                  type="file" 
                  multiple 
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,video/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelected(e.target.files);
                      e.target.value = ''; // Reset input to allow re-selecting same files if needed
                    }
                  }}
                />
                <FileVideo size={36} className="mx-auto mb-2 text-blue-500" />
                <h4 className="text-sm font-black text-blue-600 dark:text-blue-400 mb-1">
                  اضغط لاختيار عدة ملفات فيديو أو قم بسحبها وإفلاتها هنا (Multiple Files)
                </h4>
                <p className="text-xs text-gray-400 font-bold">
                  يدعم تحديد عدد غير محدود من الفيديوهات بصيغ (MP4, MKV, WebM, MOV)
                </p>
              </div>

              {/* Batch Global Configurations (Instructor & 16:9 Cover) */}
              <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-zinc-800/30 border-white/5' : 'bg-gray-50 border-gray-200/70'}`}>
                <div className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-500" />
                  <span>بيانات وإعدادات اختيارية تطبق على كافة الملفات في هذه الحزمة:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 mb-1">المحاضر / المعلم الموحد</label>
                    <input 
                      type="text"
                      disabled={isBatchUploading}
                      value={batchCommonAuthor}
                      onChange={(e) => {
                        setBatchCommonAuthor(e.target.value);
                        // update any pending items that don't have a custom author
                        setBatchQueue(prev => prev.map(q => q.status === 'pending' ? { ...q, author: e.target.value } : q));
                      }}
                      placeholder="مثال: د. أحمد المحمدي"
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                        isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-gray-400">غلاف موحد للفيديوهات (16:9)</label>
                      {batchCommonCover && (
                        <button 
                          type="button" 
                          disabled={isBatchUploading}
                          onClick={() => setBatchCommonCover('')}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          إزالة الغلاف
                        </button>
                      )}
                    </div>
                    <div 
                      onClick={() => {
                        if (!isBatchUploading) coverInputRef.current?.click();
                      }}
                      className={`h-9 px-3 rounded-xl border border-dashed flex items-center justify-between cursor-pointer text-xs font-bold ${
                        batchCommonCover 
                          ? 'border-blue-500 text-blue-500 bg-blue-500/5' 
                          : isDarkMode ? 'border-zinc-700 bg-zinc-900 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                      }`}
                    >
                      <span className="truncate text-[11px]">
                        {batchCommonCover ? 'تم تعيين غلاف موحد (16:9) للحزمة' : 'اضغط لاختيار صورة غلاف 16:9'}
                      </span>
                      <ImageIcon size={14} className="shrink-0" />
                    </div>
                    <input 
                      ref={coverInputRef} 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleCoverUpload(f, false);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Overall Batch Progress Header */}
              {batchQueue.length > 0 && (
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-zinc-800/60 border-white/5' : 'bg-white border-gray-200'
                } space-y-2`}>
                  <div className="flex items-center justify-between text-xs font-black">
                    <div className="flex items-center gap-2">
                      <Layers size={15} className="text-blue-500" />
                      <span>حالة طابور الرفع (Upload Queue):</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {completedBatchCount} مكتمل من {batchQueue.length}
                      </span>
                      {errorBatchCount > 0 && (
                        <span className="text-red-500 font-bold">
                          • {errorBatchCount} تعثر
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400">{overallBatchProgress}%</span>
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

                  {/* Overall Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                      style={{ width: `${overallBatchProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Queue Items List */}
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
                          ? 'border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20'
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
                              ? 'bg-blue-500 text-white animate-pulse'
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
                            {/* Editable Title */}
                            <input 
                              type="text"
                              disabled={isBatchUploading || item.status === 'completed'}
                              value={item.title}
                              onChange={(e) => handleUpdateQueueItem(item.id, { title: e.target.value })}
                              placeholder="عنوان الدرس..."
                              className={`w-full font-black text-xs px-2 py-1 rounded-lg border outline-none ${
                                isDarkMode ? 'bg-zinc-800/70 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                              }`}
                            />

                            <div className="flex items-center gap-3 text-[11px] text-gray-400 font-bold flex-wrap">
                              <span className="text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                                📄 {item.file.name}
                              </span>
                              <span>💾 {formatSize(item.size)}</span>
                              <span>⏱️ {item.duration}</span>
                              {item.author && <span>👤 {item.author}</span>}
                            </div>

                            {/* Error Message if failed */}
                            {item.errorMessage && (
                              <div className="text-[11px] font-bold text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle size={12} />
                                <span>{item.errorMessage}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status / Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'completed' ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>تم الحفظ</span>
                            </span>
                          ) : item.status === 'uploading' ? (
                            <span className="text-blue-500 font-black text-xs">
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
                            className="h-full bg-blue-500 transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-400 font-bold border border-dashed rounded-2xl dark:border-zinc-800">
                  لم يتم إضافة ملفات إلى طابور الرفع بعد. اختر الفيديوهات من الزر أعلاه.
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-white/5 mt-4 shrink-0">
              <div className="text-xs font-bold text-gray-400">
                {batchQueue.length > 0 && (
                  <span>الإجمالي: {batchQueue.length} فيديوهات ({formatSize(batchQueue.reduce((acc, q) => acc + q.size, 0))})</span>
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
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
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
                      <span>بدء رفع الحزمة ({pendingBatchCount} فيديو)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Video Modal (Title, Author, Description, Cover Image) */}
      {editingVideo && (
        <div className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className={`w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-2xl border my-8 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black">تعديل بيانات وغلاف الدرس</h3>
                  <p className="text-xs text-gray-400 font-bold">تحديث العنوان، المحاضر، وصورة الغلاف العريضة</p>
                </div>
              </div>
              <button onClick={() => setEditingVideo(null)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-black mb-1.5">عنوان الدرس / الفيديو *</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  required
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">اسم المحاضر / المعلم</label>
                <input 
                  type="text" 
                  value={editAuthor} 
                  onChange={(e) => setEditAuthor(e.target.value)} 
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              {/* Cover Image Picker in Edit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black">صورة الغلاف (1920 × 1080)</label>
                  {editCoverImage && (
                    <button 
                      type="button" 
                      onClick={() => setEditCoverImage('')}
                      className="text-[10px] text-red-500 font-bold hover:underline"
                    >
                      إزالة الغلاف
                    </button>
                  )}
                </div>

                <div 
                  onClick={() => editCoverInputRef.current?.click()}
                  className={`relative aspect-[16/9] w-full rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer flex flex-col items-center justify-center transition-all ${
                    editCoverImage 
                      ? 'border-blue-500' 
                      : isDarkMode ? 'border-zinc-700 bg-zinc-800/40 hover:border-blue-500' : 'border-gray-300 bg-gray-50 hover:border-blue-500'
                  }`}
                >
                  {editCoverImage ? (
                    <img src={editCoverImage} alt="غلاف الفيديو" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon size={24} className="mx-auto mb-1 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">
                        اضغط لرفع صورة غلاف مخصصة (16:9)
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">أبعاد 1920 × 1080</span>
                    </div>
                  )}
                </div>
                <input 
                  ref={editCoverInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCoverUpload(f, true);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-black mb-1.5">وصف ومحاور الدرس</label>
                <textarea 
                  value={editDesc} 
                  onChange={(e) => setEditDesc(e.target.value)} 
                  rows={2}
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-bold border outline-none focus:ring-2 focus:ring-blue-500 resize-none ${isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                />
              </div>

              {/* Video File Attachment / Replacement Section */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/50 border-white/10' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <FileVideo size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                        {editFileName ? 'ملف الفيديو المرتبط بالدرس' : 'لم يتم ربط ملف فيديو بهذا الدرس بعد'}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-bold">
                        {editFileName ? 'يمكنك استبدال ملف الفيديو أو إعادة رفعه إذا تم حذفه من الخادم' : 'ارفع ملف الفيديو MP4 لربطه بهذه البطاقة الآن'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => editVideoFileInputRef.current?.click()}
                    disabled={isUploadingNewVideo}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Upload size={13} />
                    <span>{editFileName ? 'تغيير / إعادة رفع الفيديو' : 'إضافة ورفع ملف الفيديو'}</span>
                  </button>
                </div>

                {/* Video File Details Banner */}
                {editFileName ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200/50 dark:border-emerald-500/20 text-[11px] font-bold">
                    <div className="flex items-center gap-2 truncate max-w-[280px]">
                      <span className="text-emerald-600">🎬 {editFileName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 shrink-0">
                      {editFileSize && <span>💾 {formatSize(editFileSize)}</span>}
                      {editDuration && <span>⏱️ {editDuration}</span>}
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => editVideoFileInputRef.current?.click()}
                    className="p-3 text-center border border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl cursor-pointer text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 transition-all"
                  >
                    اضغط هنا لاختيار ملف الفيديو (MP4, MKV, WebM) وربطه مباشرة بهذه البطاقة
                  </div>
                )}

                {editNewVideoFile && (
                  <div className="mt-2 text-[10px] font-black text-blue-500 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>تم تحديد ملف جديد ({editNewVideoFile.name}) - سيتم رفعه وحفظه فور الضغط على زر "حفظ التعديلات".</span>
                  </div>
                )}

                <input 
                  ref={editVideoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleSelectNewVideoFileForEdit(f);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* FFmpeg Multi-Quality Transcoding Progress & Status Card */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/60 border-white/10' : 'bg-blue-50/50 border-blue-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Zap size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black">محرك الجودات المتعددة (FFmpeg)</h4>
                      <p className="text-[10px] text-gray-400 font-bold">بث تكيفي وسريع لتطبيق الجوال والمتصفح</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerManualTranscode}
                    disabled={isTriggeringTranscode || editTranscodeStatus === 'processing'}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-black flex items-center gap-1.5 transition-all shadow-sm"
                    title="إعادة ضغط وتجهيز جميع الجودات بـ FFmpeg"
                  >
                    <RefreshCw size={12} className={isTriggeringTranscode || editTranscodeStatus === 'processing' ? 'animate-spin' : ''} />
                    <span>{editTranscodeStatus === 'processing' ? 'جاري المعالجة...' : 'إعادة ضغط بـ FFmpeg'}</span>
                  </button>
                </div>

                {/* Progress Bar when Transcoding */}
                {editTranscodeStatus === 'processing' ? (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="text-amber-500 flex items-center gap-1.5">
                        <RefreshCw size={12} className="animate-spin" />
                        <span>جاري ضغط وتجهيز الجودات (720p, 480p, 360p)...</span>
                      </span>
                      <span className="text-amber-600 font-mono">{editTranscodeProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 rounded-full transition-all duration-300 animate-pulse"
                        style={{ width: `${Math.max(10, editTranscodeProgress)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-500 mb-3">
                    <CheckCircle2 size={13} />
                    <span>مكتبة FFmpeg جاهزة وجميع الجودات مفعلة بنجاح</span>
                  </div>
                )}

                {/* Available Qualities Grid */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { key: '1080p', label: '1080p FHD', sub: 'الأصلية' },
                    { key: '720p', label: '720p HD', sub: 'عالية' },
                    { key: '480p', label: '480p SD', sub: 'متوسطة' },
                    { key: '360p', label: '360p Eco', sub: 'سريعة' },
                  ].map((q) => {
                    const isAvail = editQualities[q.key] || q.key === '1080p';
                    const qData = editQualities[q.key];
                    return (
                      <div 
                        key={q.key} 
                        className={`p-2 rounded-xl border text-[10px] font-bold ${
                          isAvail
                            ? isDarkMode ? 'bg-zinc-900 border-emerald-500/30 text-emerald-400' : 'bg-white border-emerald-200 text-emerald-700 shadow-sm'
                            : isDarkMode ? 'bg-zinc-900/40 border-white/5 text-gray-500' : 'bg-gray-100/70 border-gray-200 text-gray-400'
                        }`}
                      >
                        <div className="font-black text-[11px] flex items-center justify-center gap-1">
                          {isAvail && <Check size={10} />}
                          <span>{q.label}</span>
                        </div>
                        <div className="text-[9px] opacity-75 mt-0.5">
                          {qData?.fileSize ? formatSize(qData.fileSize) : q.sub}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => setEditingVideo(null)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

