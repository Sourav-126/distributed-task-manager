import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-app-surface border border-app-border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
