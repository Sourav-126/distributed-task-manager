import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast, ToastItem } from '@/utils/toast';
import Button from './Button';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast: ToastItem) => {
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration !== 0) {
        setTimeout(() => {
          removeToast(newToast.id);
        }, newToast.duration || 4000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const removeToast = (id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  const styles = {
    success: 'bg-app-surface border-success/50 text-app-text shadow-[0_0_30px_rgba(63,185,80,0.3)]',
    error: 'bg-app-surface border-danger/50 text-app-text shadow-[0_0_30px_rgba(248,81,73,0.3)]',
    warning: 'bg-app-surface border-warning/50 text-app-text shadow-[0_0_30px_rgba(210,153,34,0.3)]',
    info: 'bg-app-surface border-primary/50 text-app-text shadow-[0_0_30px_rgba(88,166,255,0.3)]',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col space-y-2 max-w-sm w-full">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${styles[t.type]}`}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{
              background: t.type === 'success' ? '#3fb950' :
                          t.type === 'error' ? '#f85149' :
                          t.type === 'warning' ? '#d29922' : '#58a6ff',
              color: '#0d1117',
            }}
          >
            {icons[t.type]}
          </div>
          <div className="flex-1 text-sm font-medium">{t.message}</div>
          <Button
            variant="ghost"
            onClick={() => removeToast(t.id)}
            className="text-app-text-muted hover:text-app-text !p-1 hover:bg-app-bg/50"
            aria-label="Close toast"
          >
            &times;
          </Button>
        </motion.div>
      ))}
    </div>
  );
};

export default ToastContainer;
