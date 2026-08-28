import React, { useState } from 'react';
import { 
  Play, Clock, User, HardDrive, CheckCircle2, 
  Trash2, Edit3, MoreVertical, ArrowLeft, GripVertical, 
  ChevronUp, ChevronDown, Video as VideoIcon, Image as ImageIcon,
  Sparkles, RefreshCw, Layers, Zap
} from 'lucide-react';
import { VideoLesson } from '../../types';

interface VideoCardProps {
  video: VideoLesson;
  index: number;
  totalVideos: number;
  isActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isDarkMode?: boolean;
  onSelect: (video: VideoLesson, quality?: string) => void;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onEdit: (video: VideoLesson, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onMoveStep: (index: number, direction: 'up' | 'down', e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  index,
  totalVideos,
  isActive,
  isDragging,
  isDragOver,
  isDarkMode,
  onSelect,
  onToggleComplete,
  onEdit,
  onDelete,
  onMoveStep,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'محلي';
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  const lessonNumberFormatted = String(index + 1).padStart(2, '0');
  const availableQualities = video.qualities ? Object.keys(video.qualities) : [];
  const isTranscoding = video.transcodingStatus === 'processing';

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(video)}
      className={`rounded-[32px] border overflow-hidden transition-all duration-300 group cursor-pointer flex flex-col justify-between relative select-none ${
        isDragging
          ? 'opacity-40 scale-95 border-dashed border-blue-500 bg-blue-50/20'
          : isDragOver
          ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.02] border-blue-500 bg-blue-50/60 dark:bg-blue-500/20 shadow-2xl'
          : isActive 
          ? 'ring-2 ring-blue-500 shadow-2xl bg-blue-50/10 dark:bg-blue-500/10 border-blue-500/40 -translate-y-1' 
          : isDarkMode 
          ? 'bg-zinc-900 border-white/5 hover:border-blue-500/40 hover:shadow-2xl hover:-translate-y-1.5' 
          : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-2xl hover:-translate-y-1.5 shadow-sm'
      }`}
    >
      {/* Drag target indicator banner */}
      {isDragOver && !isDragging && (
        <div className="absolute inset-x-0 top-0 py-1 bg-blue-600 text-white text-[10px] font-black text-center animate-pulse z-30">
          إفلات هنا ليصبح (الدرس {index + 1})
        </div>
      )}

      {/* 16:9 1920x1080 Wide Banner Cover Area */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-800 to-cyan-900">
        {video.coverImage ? (
          <img 
            src={video.coverImage} 
            alt={video.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="w-14 h-14 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
              <Play size={26} className="text-blue-200 mr-0.5" />
            </div>
            <span className="text-[11px] font-black tracking-wider uppercase text-blue-200/80">
              درس مرئي
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

        {/* Top Badges & Controls Header */}
        <div className="absolute top-3.5 right-3.5 left-3.5 flex items-center justify-between z-10" onClick={(e) => e.stopPropagation()}>
          
          {/* Right Badges: Lesson Number & Completion status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] font-black flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span>الدرس {lessonNumberFormatted}</span>
            </div>

            {video.isCompleted && (
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md border border-emerald-400/40 text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                <CheckCircle2 size={11} />
                <span>مكتمل</span>
              </div>
            )}

            {/* Live FFmpeg Transcoding Badge */}
            {isTranscoding ? (
              <div className="px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black flex items-center gap-1 shadow-sm animate-pulse">
                <RefreshCw size={11} className="animate-spin" />
                <span>FFmpeg {video.transcodeProgress ? `${video.transcodeProgress}%` : 'جاري المعالجة'}</span>
              </div>
            ) : availableQualities.length > 0 ? (
              <div className="px-2 py-0.5 rounded-full bg-blue-500/80 backdrop-blur-md border border-blue-400/30 text-white text-[10px] font-black flex items-center gap-1 shadow-sm" title={`الجودات المتوفرة: ${availableQualities.join(', ')}`}>
                <Layers size={10} />
                <span>{availableQualities.length} جودات</span>
              </div>
            ) : null}
          </div>

          {/* Left Actions: Drag handle, Reorder & Options Menu */}
          <div className="flex items-center gap-1">
            {/* Grip Drag Handle */}
            <div 
              className="p-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/60 cursor-grab active:cursor-grabbing border border-white/20 transition-colors"
              title="اسحب هذا الكرت وأفلته لتغيير ترتيب ورقم الدرس"
            >
              <GripVertical size={14} />
            </div>

            {/* Quick Step Reordering buttons */}
            {totalVideos > 1 && (
              <div className="flex items-center rounded-xl bg-black/40 backdrop-blur-md border border-white/20 p-0.5">
                <button 
                  type="button"
                  onClick={(e) => onMoveStep(index, 'up', e)}
                  disabled={index === 0}
                  title="تقديم الدرس"
                  className="p-1 rounded text-white/70 hover:text-white disabled:opacity-20 hover:bg-white/10 transition-colors"
                >
                  <ChevronUp size={12} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => onMoveStep(index, 'down', e)}
                  disabled={index === totalVideos - 1}
                  title="تأخير الدرس"
                  className="p-1 rounded text-white/70 hover:text-white disabled:opacity-20 hover:bg-white/10 transition-colors"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            )}

            {/* More Menu */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors border border-white/20"
                title="خيارات إضافية"
              >
                <MoreVertical size={15} />
              </button>

              {showMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute left-0 mt-2 w-56 rounded-2xl p-2 shadow-2xl border z-40 animate-in fade-in ${
                    isDarkMode ? 'bg-zinc-800 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-800'
                  }`}
                >
                  {/* Quality Select Section in 3-Dots */}
                  <div className="pb-2 mb-2 border-b border-gray-100 dark:border-white/10">
                    <div className="text-[10px] font-black text-gray-400 px-2 mb-1.5 flex items-center justify-between">
                      <span>اختيار جودة التشغيل:</span>
                      <span className="text-blue-500 font-mono">{availableQualities.length || 1} جودة</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {['1080p', '720p', '480p', '360p', '320p'].map((q) => {
                        const isAvail = availableQualities.includes(q) || (q === '1080p' && !availableQualities.length);
                        return (
                          <button
                            key={q}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              onSelect(video, q);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black text-center transition-all ${
                              isAvail
                                ? isDarkMode ? 'bg-zinc-700/60 hover:bg-blue-600 text-gray-200 hover:text-white' : 'bg-gray-100 hover:bg-blue-600 text-gray-700 hover:text-white'
                                : isDarkMode ? 'opacity-30 bg-zinc-900/40 text-gray-500 cursor-not-allowed' : 'opacity-30 bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                            title={isAvail ? `تشغيل بجودة ${q}` : `جودة ${q} غير متوفرة بعد`}
                          >
                            {q}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={(e) => { 
                      e.stopPropagation();
                      setShowMenu(false); 
                      onToggleComplete(video.id, e); 
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-black text-right flex items-center gap-2 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                  >
                    <CheckCircle2 size={14} className={video.isCompleted ? 'text-emerald-500' : ''} />
                    <span>{video.isCompleted ? 'تعيين كغير مكتمل' : 'تعيين كمكتمل'}</span>
                  </button>

                  <button 
                    onClick={(e) => { 
                      e.stopPropagation();
                      setShowMenu(false); 
                      onEdit(video, e); 
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-black text-right flex items-center gap-2 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                  >
                    <Edit3 size={14} className="text-blue-500" />
                    <span>تعديل وإرفاق / استبدال الفيديو</span>
                  </button>

                  <button 
                    onClick={(e) => { 
                      e.stopPropagation();
                      setShowMenu(false); 
                      onDelete(video.id, e); 
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-black text-right flex items-center gap-2 hover:bg-red-500/10 text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>حذف الفيديو</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live FFmpeg Progress Bar Overlay on Card */}
        {isTranscoding && (
          <div className="absolute inset-x-0 bottom-0 z-20">
            <div className="w-full h-1.5 bg-black/60 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 transition-all duration-300 animate-pulse"
                style={{ width: `${Math.max(15, video.transcodeProgress || 30)}%` }}
              />
            </div>
          </div>
        )}

        {/* Bottom Banner Title */}
        <div className="absolute bottom-3.5 right-3.5 left-3.5 z-10">
          {video.author && (
            <div className="flex items-center gap-1 text-[10px] text-blue-200 font-black mb-0.5 drop-shadow-sm">
              <User size={11} />
              <span>{video.author}</span>
            </div>
          )}
          <h3 className="text-base sm:text-lg font-black text-white line-clamp-1 drop-shadow-md group-hover:text-blue-300 transition-colors">
            {video.title}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold line-clamp-2 leading-relaxed mb-4">
          {video.description || 'درس ومحاضرة تعليمية مخزنة محلياً للتشغيل الفوري بجودة عالية.'}
        </p>

        {/* Bottom Details Bar */}
        <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-blue-500" />
              <span>{video.duration || '15:00'}</span>
            </span>

            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-[11px]">
              <HardDrive size={13} />
              <span>{formatSize(video.fileSize)}</span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:underline">
              <Play size={13} className="fill-current mr-0.5" />
              <span>{isActive ? 'جاري التشغيل الآن' : 'مشاهدة الدرس'}</span>
            </span>

            {/* Quality Badges */}
            <div className="flex items-center gap-1">
              {availableQualities.length > 0 ? (
                availableQualities.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(video, q);
                    }}
                    className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white transition-all cursor-pointer"
                    title={`تشغيل الدرس بجودة ${q}`}
                  >
                    {q}
                  </button>
                ))
              ) : (
                <span className="text-[10px] text-gray-400 font-bold">1080p HD</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

