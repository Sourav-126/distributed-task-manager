import React from 'react';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}) => {
  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div className={`relative w-auto my-6 mx-auto ${maxWidthClass} w-full px-4 z-50 animate-fadeIn`}>
        <div className="border border-app-border rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col w-full bg-app-surface outline-none focus:outline-none">

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-app-border rounded-t">
            <h3 className="text-base font-bold text-app-text">
              {title}
            </h3>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-app-text-muted hover:text-app-text float-right text-xl leading-none font-bold outline-none focus:outline-none transition-colors"
              onClick={onClose}
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="relative p-6 flex-auto text-sm text-app-text-muted leading-relaxed">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end p-4 border-t border-app-border rounded-b space-x-2 bg-app-bg/30">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
