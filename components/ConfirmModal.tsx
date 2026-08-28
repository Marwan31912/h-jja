
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onConfirm, onCancel, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#064e3b]/40 backdrop-blur-sm animate-in fade-in duration-300 px-4">
      <div 
        className="bg-white w-full max-w-[400px] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20"
        dir="rtl"
      >
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
            <AlertTriangle size={40} />
          </div>
          
          <h3 className="text-2xl font-extrabold text-[#064e3b] mb-3">{title}</h3>
          <p className="text-gray-500 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="flex border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-6 font-bold text-gray-400 hover:bg-gray-50 transition-colors border-l border-gray-100"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-6 font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            نعم، احذف
          </button>
        </div>
      </div>
      
      {/* Close button for safety */}
      <button 
        onClick={onCancel}
        className="absolute top-6 left-6 text-white/60 hover:text-white transition-colors"
      >
        <X size={32} />
      </button>
    </div>
  );
};

export default ConfirmModal;
