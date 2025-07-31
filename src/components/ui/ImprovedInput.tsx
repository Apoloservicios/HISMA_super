// src/components/ui/ImprovedInput.tsx
import React, { useState } from 'react';

interface ImprovedInputProps {
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const ImprovedInput: React.FC<ImprovedInputProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  helperText,
  icon
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            block w-full rounded-lg border-2 px-3 py-2.5 text-sm
            transition-all duration-200 ease-in-out
            ${icon ? 'pl-10' : 'pl-3'}
            ${disabled 
              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
              : error 
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50'
                : isFocused
                  ? 'border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-blue-50/30'
                  : 'border-gray-300 hover:border-gray-400 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }
            shadow-sm hover:shadow-md focus:shadow-lg
            placeholder:text-gray-400
          `}
        />
      </div>
      {error && (
        <div className="mt-1 flex items-center">
          <svg className="h-4 w-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};