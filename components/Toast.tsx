
import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: ToastMessage;
  // Fix: add isDarkMode to props interface
  isDarkMode?: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, isDarkMode }) => {
  const icons = {
    success: <CheckCircle2 className="text-emerald-500" />,
    error: <AlertCircle className="text-red-500" />,
    info: <Info className="text-emerald-400" />
  };

  const borderColors = {
    success: isDarkMode ? 'border-emerald-500/20' : 'border-emerald-100',
    error: isDarkMode ? 'border-red-500/20' : 'border-red-100',
    info: isDarkMode ? 'border-emerald-500/10' : 'border-emerald-50'
  };

  return (
    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border-2 animate-in slide-in-from-left-full fade-in duration-300 ${borderColors[message.type]} ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
      {icons[message.type]}
      <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#064e3b]'}`}>{message.text}</span>
    </div>
  );
};

export default Toast;
