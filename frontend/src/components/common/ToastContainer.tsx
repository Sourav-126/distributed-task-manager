import React, { useEffect, useState } from 'react';
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
    success: 'bg-success text-white border-success',
    error: 'bg-danger text-white border-danger',
    warning: 'bg-warning text-white border-warning',
    info: 'bg-info text-white border-info'
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col space-y-3 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center justify-between px-4 py-3 rounded-lg border shadow-lg text-sm font-semibold animate-fadeIn ${styles[t.type]}`}
        >
          <div className="flex-1 pr-2">{t.message}</div>
          <Button
            variant="ghost"
            onClick={() => removeToast(t.id)}
            className="text-white hover:opacity-75 focus:outline-none text-base leading-none font-bold !p-1 hover:bg-white/10"
            aria-label="Close toast"
          >
            &times;
          </Button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
