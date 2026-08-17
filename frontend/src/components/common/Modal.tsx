import React from 'react';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div className="relative w-auto my-6 mx-auto max-w-md w-full px-4 z-50 animate-fadeIn">
        <div className="border-0 rounded-2xl shadow-xl relative flex flex-col w-full bg-white outline-none focus:outline-none border border-zinc-200">
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-100 rounded-t">
            <h3 className="text-base font-bold text-zinc-950">
              {title}
            </h3>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-zinc-400 hover:text-zinc-600 float-right text-xl leading-none font-bold outline-none focus:outline-none transition-colors"
              onClick={onClose}
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
          
          {/* Body */}
          <div className="relative p-6 flex-auto text-sm text-zinc-600 leading-relaxed">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end p-4 border-t border-zinc-100 rounded-b space-x-2 bg-zinc-50/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
