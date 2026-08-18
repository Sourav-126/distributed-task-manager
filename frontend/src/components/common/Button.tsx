import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'pill' | 'white';
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
  const baseStyle = 'px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-app-bg disabled:opacity-50 disabled:cursor-not-allowed text-sm relative overflow-hidden';

  const variants = {
    primary: 'text-white font-black shadow-[0_0_20px_rgba(88,166,255,0.35)] hover:shadow-[0_0_30px_rgba(88,166,255,0.5)] active:scale-[0.98]',
    secondary: 'bg-app-surface text-app-text border border-app-border hover:bg-app-bg hover:border-primary/50 shadow-sm',
    success: 'text-white font-black bg-success hover:opacity-90 shadow-[0_0_20px_rgba(63,185,80,0.35)]',
    danger: 'text-white font-black bg-danger hover:opacity-90 shadow-[0_0_20px_rgba(248,81,73,0.35)]',
    outline: 'bg-transparent text-app-text border-2 border-app-border hover:bg-app-bg hover:border-primary/50',
    ghost: 'bg-transparent text-app-text-muted hover:text-app-text hover:bg-app-surface/50',
    pill: 'bg-app-surface/50 text-app-text border border-app-border/50 hover:bg-app-bg hover:border-primary/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider',
    white: 'bg-white text-black border border-gray-300 hover:bg-gray-50 shadow-sm',
  };

  // Primary gets gradient background
  const primaryGradient = 'bg-gradient-to-r from-primary via-primary-hover to-[rgb(163,113,247)]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${variant === 'primary' ? primaryGradient : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
