import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glow' | 'border';
}

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-app-surface border border-app-border rounded-2xl shadow-sm hover:shadow-[0_0_30px_rgba(88,166,255,0.1)] transition-all duration-300',
    elevated: 'bg-app-surface border border-app-border/50 rounded-2xl shadow-[0_8_30px_rgba(0,0,0,0.4)] hover:shadow-[0_12_40px_rgba(0,0,0,0.5)] transition-all duration-300',
    glow: 'bg-app-surface border border-primary/30 rounded-2xl shadow-[0_0_30px_rgba(88,166,255,0.2)] hover:shadow-[0_0_40px_rgba(88,166,255,0.35)] transition-all duration-300',
    border: 'bg-transparent border-2 border-app-border rounded-2xl hover:border-primary/50 transition-all duration-300',
  };

  return (
    <div
      className={`${variants[variant]} p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
