import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  id,
  type = 'text',
  placeholder,
  error,
  required = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col space-y-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-app-text-muted">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        type={type}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3.5 py-2.5 bg-app-surface border ${
          error ? 'border-danger focus:ring-danger/20' : 'border-app-border focus:ring-primary/20'
        } rounded-lg text-sm text-app-text placeholder-app-text-muted/60 transition-all duration-200 focus:outline-none focus:ring-4 focus:border-primary`}
        {...props}
      />
      {error && (
        <span className="text-xs text-danger font-medium animate-fadeIn">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
