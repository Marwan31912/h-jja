import React, { useEffect, useState } from 'react';
import { X, BookOpen, User, Menu as MenuIcon, Package, DollarSign, MapPin } from 'lucide-react';
import { Book } from '../types';

interface BookDetailsModalProps {
  book: Book | null;
  onClose: () => void;
  onEditBook: (book: Book) => void;
  isDarkMode?: boolean;
}

interface Palette {
  bgGradient: string;
  panelBg: string;
  titleColor: string;
  accentColor: string;
  accentBgLight: string;
  accentBorder: string;
  subtextColor: string;
  locationBg: string;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s, l };
}

function getInitialPalette(isDarkMode: boolean): Palette {
  if (isDarkMode) {
    return {
      bgGradient: 'linear-gradient(135deg, hsl(160, 25%, 15%), hsl(180, 25%, 9%))',
      panelBg: 'hsl(160, 25%, 6%)',
      titleColor: 'hsl(160, 15%, 96%)',
      accentColor: 'hsl(160, 65%, 65%)',
      accentBgLight: 'hsla(160, 65%, 60%, 0.15)',
      accentBorder: 'hsla(160, 65%, 60%, 0.3)',
      subtextColor: 'hsl(160, 15%, 72%)',
      locationBg: 'linear-gradient(135deg, hsl(160, 50%, 18%), hsl(180, 50%, 12%))'
    };
  }
  return {
    bgGradient: 'linear-gradient(135deg, hsl(160, 25%, 98%), hsl(180, 25%, 92%))',
    panelBg: 'hsl(160, 15%, 94%)',
    titleColor: 'hsl(160, 50%, 16%)',
    accentColor: 'hsl(160, 65%, 32%)',
    accentBgLight: 'hsla(160, 65%, 45%, 0.08)',
    accentBorder: 'hsla(160, 65%, 45%, 0.22)',
    subtextColor: 'hsl(160, 25%, 38%)',
    locationBg: 'linear-gradient(135deg, hsl(160, 55%, 22%), hsl(180, 55%, 15%))'
  };
}

const paletteCache = new Map<string, Palette>();

function extractPaletteFromImage(imageUrl: string, isDarkMode: boolean): Promise<Palette | null> {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const size = 32;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        const colorBuckets: { [key: string]: { r: number; g: number; b: number; count: number } } = {};

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;

          totalR += r;
          totalG += g;
          totalB += b;
          count++;

          const qR = Math.round(r / 32) * 32;
          const qG = Math.round(g / 32) * 32;
          const qB = Math.round(b / 32) * 32;
          const key = `${qR},${qG},${qB}`;

          if (!colorBuckets[key]) {
            colorBuckets[key] = { r, g, b, count: 0 };
          }
          colorBuckets[key].count++;
        }

        if (count === 0) {
          resolve(null);
          return;
        }

        let domR = Math.round(totalR / count);
        let domG = Math.round(totalG / count);
        let domB = Math.round(totalB / count);

        const sortedBuckets = Object.values(colorBuckets).sort((a, b) => b.count - a.count);
        for (const bucket of sortedBuckets) {
          const avgBr = (bucket.r * 299 + bucket.g * 587 + bucket.b * 114) / 1000;
          if (avgBr > 20 && avgBr < 235) {
            domR = bucket.r;
            domG = bucket.g;
            domB = bucket.b;
            break;
          }
        }

        const { h, s } = rgbToHsl(domR, domG, domB);
        const sat = Math.max(0.25, Math.min(s, 0.75));

        if (isDarkMode) {
          const bgHue = h;
          const bgSat = sat * 0.25;
          const accentSat = Math.max(sat, 0.55);

          resolve({
            bgGradient: `linear-gradient(135deg, hsl(${bgHue}, ${bgSat * 100}%, 15%), hsl(${(bgHue + 20) % 360}, ${bgSat * 100}%, 9%))`,
            panelBg: `hsl(${bgHue}, ${bgSat * 100}%, 6%)`,
            titleColor: `hsl(${bgHue}, 15%, 96%)`,
            accentColor: `hsl(${bgHue}, ${accentSat * 100}%, 65%)`,
            accentBgLight: `hsla(${bgHue}, ${accentSat * 100}%, 60%, 0.15)`,
            accentBorder: `hsla(${bgHue}, ${accentSat * 100}%, 60%, 0.3)`,
            subtextColor: `hsl(${bgHue}, 15%, 72%)`,
            locationBg: `linear-gradient(135deg, hsl(${bgHue}, ${accentSat * 70}%, 18%), hsl(${(bgHue + 20) % 360}, ${accentSat * 70}%, 12%))`
          });
        } else {
          const bgHue = h;
          const bgSat = sat * 0.25;
          const accentSat = Math.max(sat, 0.55);

          resolve({
            bgGradient: `linear-gradient(135deg, hsl(${bgHue}, ${bgSat * 100}%, 98%), hsl(${(bgHue + 20) % 360}, ${bgSat * 100}%, 92%))`,
            panelBg: `hsl(${bgHue}, ${(bgSat * 0.6) * 100}%, 94%)`,
            titleColor: `hsl(${bgHue}, 50%, 16%)`,
            accentColor: `hsl(${bgHue}, ${accentSat * 100}%, 32%)`,
            accentBgLight: `hsla(${bgHue}, ${accentSat * 100}%, 45%, 0.08)`,
            accentBorder: `hsla(${bgHue}, ${accentSat * 100}%, 45%, 0.22)`,
            subtextColor: `hsl(${bgHue}, 25%, 38%)`,
            locationBg: `linear-gradient(135deg, hsl(${bgHue}, ${accentSat * 75}%, 22%), hsl(${(bgHue + 20) % 360}, ${accentSat * 75}%, 15%))`
          });
        }
      } catch (e) {
        console.error('Failed to extract image palette:', e);
        resolve(null);
      }
    };

    img.onerror = () => {
      resolve(null);
    };
  });
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  book,
  onClose,
  onEditBook,
  isDarkMode = false
}) => {
  const [palette, setPalette] = useState<Palette>(() => getInitialPalette(isDarkMode));
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  const [coverCornerStyle, setCoverCornerStyle] = useState<'soft' | 'sharp'>(() => {
    return (localStorage.getItem('aladdin_cover_corner_style') as 'soft' | 'sharp') || 'soft';
  });
  const [coverImageSize, setCoverImageSize] = useState<number>(() => {
    const saved = localStorage.getItem('aladdin_cover_image_size');
    return saved ? parseInt(saved, 10) : 100;
  });

  useEffect(() => {
    const loadSettings = () => {
      const savedStyle = (localStorage.getItem('aladdin_cover_corner_style') as 'soft' | 'sharp') || 'soft';
      const savedSize = localStorage.getItem('aladdin_cover_image_size');
      setCoverCornerStyle(savedStyle);
      setCoverImageSize(savedSize ? parseInt(savedSize, 10) : 100);
    };

    loadSettings();
    window.addEventListener('aladdin_settings_updated', loadSettings);
    return () => {
      window.removeEventListener('aladdin_settings_updated', loadSettings);
    };
  }, []);

  // Frame synchronization to prevent initial frame flickering/grey layout
  useEffect(() => {
    if (!book) {
      setIsReady(false);
      return;
    }

    setIsReady(false);
    setIsImageLoaded(false);

    // Double requestAnimationFrame ensures full DOM layout & styles are calculated before initiating modal entrance
    let raf1: number, raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsReady(true);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [book?.id]);

  // Palette extraction & caching
  useEffect(() => {
    let isMounted = true;
    if (!book) return;

    const cacheKey = `${book.id}_${book.image || 'noimage'}_${isDarkMode ? 'dark' : 'light'}`;
    if (paletteCache.has(cacheKey)) {
      setPalette(paletteCache.get(cacheKey)!);
    } else {
      setPalette(getInitialPalette(isDarkMode));
      if (book.image) {
        extractPaletteFromImage(book.image, !!isDarkMode).then((res) => {
          if (isMounted && res) {
            paletteCache.set(cacheKey, res);
            setPalette(res);
          }
        });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [book?.id, book?.image, isDarkMode]);

  if (!book) return null;

  const cornerRadiusClass = coverCornerStyle === 'sharp' ? 'rounded-none' : 'rounded-[32px]';

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6 gpu-accelerated">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ease-out gpu-accelerated ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`} 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div 
        className={`relative w-full max-w-4xl rounded-[36px] md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20 transition-all duration-300 ease-out gpu-accelerated ${
          isReady ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3 pointer-events-none'
        }`}
        style={{ background: palette.bgGradient }}
      >
        {/* Cover image panel */}
        <div 
          className="w-full md:w-2/5 flex items-center justify-center p-6 md:p-8 relative transition-colors duration-500 overflow-hidden shrink-0"
          style={{ backgroundColor: palette.panelBg }}
        >
          <div className="absolute top-4 right-4 z-20 md:hidden">
            <button 
              onClick={onClose} 
              className={`p-2.5 rounded-2xl shadow-sm ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-white/80 text-gray-500'}`}
            >
              <X size={20}/>
            </button>
          </div>

          <div 
            className={`w-full aspect-[3/4] max-w-[280px] md:max-w-none ${cornerRadiusClass} overflow-hidden shadow-2xl border-4 rotate-1 hover:rotate-0 transition-all duration-300 relative ${
              isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-white bg-slate-100'
            }`}
            style={{
              transform: `scale(${coverImageSize / 100}) rotate(1deg)`,
              transformOrigin: 'center'
            }}
          >
            {book.image ? (
              <>
                {/* Skeleton Loader for Image */}
                {!isImageLoaded && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-200 dark:bg-zinc-800 animate-pulse">
                    <div className="w-16 h-16 rounded-2xl bg-slate-300 dark:bg-zinc-700 flex items-center justify-center">
                      <BookOpen size={36} className="text-slate-400 dark:text-zinc-600 opacity-60" />
                    </div>
                    <div className="w-1/2 h-3 rounded-full bg-slate-300 dark:bg-zinc-700" />
                    <div className="absolute inset-0 skeleton-shimmer pointer-events-none" />
                  </div>
                )}
                <img 
                  src={book.image} 
                  alt={book.title} 
                  onLoad={() => setIsImageLoaded(true)}
                  onError={() => setIsImageLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isImageLoaded ? 'opacity-100' : 'opacity-0'
                  }`} 
                />
              </>
            ) : (
              <div className={`w-full h-full flex flex-col items-center justify-center gap-4 ${
                isDarkMode ? 'bg-zinc-900 text-zinc-800' : 'bg-white text-gray-200'
              }`}>
                <BookOpen size={80} strokeWidth={1} />
                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-zinc-700' : 'text-gray-300'}`}>لا توجد صورة غلاف</span>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="flex-1 p-6 md:p-12 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span 
                    className="px-4 py-1.5 rounded-xl text-xs font-black border transition-colors"
                    style={{
                      backgroundColor: palette.accentBgLight,
                      color: palette.accentColor,
                      borderColor: palette.accentBorder
                    }}
                  >
                    {book.category}
                  </span>

                  {book.subCategory && (
                    <span 
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors"
                      style={{
                        backgroundColor: palette.accentBgLight,
                        color: palette.accentColor,
                        borderColor: palette.accentBorder
                      }}
                    >
                      {book.subCategory}
                    </span>
                  )}
                </div>

                <h2 
                  className="text-2xl md:text-4xl font-black leading-tight mb-2 transition-colors break-words"
                  style={{ color: palette.titleColor }}
                >
                  {book.title}
                </h2>
                
                <div className="flex flex-col gap-3">
                  <div 
                    className="flex items-center gap-2 font-bold transition-colors"
                    style={{ color: palette.subtextColor }}
                  >
                    <User size={18} style={{ color: palette.accentColor }} />
                    <span className="truncate">{book.author || 'مؤلف غير معروف'}</span>
                  </div>
                  
                  <div className="flex justify-end mt-2 ml-1">
                    <button 
                      onClick={() => onEditBook(book)}
                      className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-md group/edit active:scale-95"
                      style={{
                        backgroundColor: palette.accentColor,
                        color: '#ffffff'
                      }}
                    >
                      <MenuIcon size={18} className="transition-transform group-hover/edit:rotate-90" />
                      <span>تعديل الكتاب</span>
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose} 
                className="hidden md:flex p-3 rounded-2xl transition-colors shrink-0 ml-4 hover:opacity-80"
                style={{
                  backgroundColor: palette.accentBgLight,
                  color: palette.titleColor
                }}
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6 mt-6 pt-4 border-t border-white/10">
            {/* Quantity box */}
            <div 
              className="p-5 md:p-6 rounded-[28px] border transition-colors"
              style={{
                backgroundColor: palette.accentBgLight,
                borderColor: palette.accentBorder
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="p-2 rounded-xl text-white transition-colors"
                  style={{ backgroundColor: palette.accentColor }}
                >
                  <Package size={20} />
                </div>
                <span 
                  className="text-[10px] font-black uppercase tracking-widest transition-colors"
                  style={{ color: palette.accentColor }}
                >
                  الكمية المتاحة
                </span>
              </div>
              <p 
                className="text-xl md:text-2xl font-black transition-colors"
                style={{ color: palette.titleColor }}
              >
                {book.quantity}{' '}
                <span 
                  className="text-xs transition-colors"
                  style={{ color: palette.subtextColor }}
                >
                  نسخة
                </span>
              </p>
            </div>

            {/* Price box */}
            <div 
              className="p-5 md:p-6 rounded-[28px] border transition-colors"
              style={{
                backgroundColor: palette.accentBgLight,
                borderColor: palette.accentBorder
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="p-2 text-white rounded-xl"
                  style={{ backgroundColor: palette.accentColor }}
                >
                  <DollarSign size={20} />
                </div>
                <span 
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: palette.accentColor }}
                >
                  سعر البيع
                </span>
              </div>
              <p 
                className="text-xl md:text-2xl font-black"
                style={{ color: palette.accentColor }}
              >
                {book.price.toLocaleString()}{' '}
                <span className="text-xs">ر.س</span>
              </p>
            </div>

            {/* Location box */}
            <div 
              className="p-5 md:p-6 rounded-[28px] shadow-xl flex items-center justify-start col-span-2 transition-all"
              style={{
                background: palette.locationBg,
                color: '#ffffff'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl text-white shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">موقع الكتاب بالمكتبة</p>
                  <p className="text-lg md:text-xl font-bold text-white">{book.location || 'لم يتم تحديد المكان'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
