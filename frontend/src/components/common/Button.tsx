import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'black' | 'white';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  type = 'button', 
  variant = 'primary', 
  onClick, 
  disabled = false, 
  className = '',
  ...props 
}) => {
  const baseStyle = 'px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500/50',
    secondary: 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm focus:ring-sky-400/50',
    black: 'bg-black hover:bg-zinc-800 text-white shadow-sm focus:ring-black/50',
    white: 'bg-white hover:bg-zinc-50 text-black border border-zinc-300 shadow-sm focus:ring-zinc-200/50',
    outline: 'border border-app-border text-app-text hover:bg-app-surface focus:ring-blue-500/20',
    ghost: 'text-app-text hover:bg-app-surface/50 focus:ring-blue-500/20',
    danger: 'bg-danger hover:bg-opacity-90 text-white shadow-sm focus:ring-danger/50'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
