import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  variant = 'danger'
}: ConfirmModalProps) {
  const variantStyles = {
    danger: 'bg-secondary text-black border-black',
    warning: 'bg-accent text-black border-black',
    info: 'bg-primary text-black border-black'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0, rotate: 2 }}
            className="relative w-full max-w-lg bg-surface-container border-[10px] border-on-surface p-10 shadow-kinetic-active z-10"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 border-[4px] border-on-surface hover:bg-secondary hover:text-black transition-colors shadow-kinetic-thud"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-6 mb-8">
              <div className={cn("p-4 border-[4px] border-black shadow-kinetic-thud rotate-[-12deg]", variantStyles[variant])}>
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-4xl font-black uppercase italic tracking-tighter drop-shadow-[4px_4px_0px_#00FFFF]">
                {title}
              </h3>
            </div>

            <p className="text-xl font-bold uppercase italic leading-tight tracking-tight mb-10 border-l-[8px] border-on-surface pl-6">
              {message}
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={onClose}
                className="flex-1 bg-surface-bg border-[4px] border-on-surface px-8 py-4 font-black text-xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "flex-1 border-[4px] px-8 py-4 font-black text-xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all",
                  variantStyles[variant]
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
