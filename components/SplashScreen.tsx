
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Lottie } from 'lottie-react';
import splashAnimation from '../src/assets/splashAnimation.json';

const SplashScreen: React.FC<{ systemName?: string; onComplete: () => void }> = ({ onComplete }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // إخفاء الشاشة الترحيبية تلقائياً بعد ثانيتين (2000ms)
    const timer = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        onComplete();
      }, 400);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      onClick={() => {
        setIsFading(true);
        setTimeout(onComplete, 200);
      }}
      className={`fixed inset-0 z-[9999] bg-[#090d16] flex flex-col items-center justify-center transition-all duration-500 ease-in-out cursor-pointer select-none ${
        isFading ? 'opacity-0 scale-105 blur-lg pointer-events-none' : 'opacity-100'
      }`} 
      dir="rtl"
    >
      {/* خلفية جمالية متدرجة ناعمة */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        {/* انيميشن Lottie المرفق */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center drop-shadow-[0_10px_35px_rgba(16,185,129,0.25)]"
        >
          <Lottie 
            animationData={splashAnimation} 
            loop={true} 
            autoplay={true}
            className="w-full h-full"
          />
        </motion.div>

        {/* جملة ( حجة ) بخط كبير وعريض تحت الانميشن مباشرة */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-4 flex flex-col items-center"
        >
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-white drop-shadow-[0_4px_25px_rgba(255,255,255,0.25)] font-sans">
            ( حجة )
          </h1>
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="h-1 w-24 sm:w-32 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mt-4 rounded-full"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default SplashScreen;

