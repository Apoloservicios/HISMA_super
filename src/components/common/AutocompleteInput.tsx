// src/components/common/AutocompleteInput.tsx
import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';

interface AutocompleteInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
  icon?: React.ReactNode;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  helperText,
  error,
  className,
  icon
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filtrar opciones basadas en el valor de entrada
  useEffect(() => {
    if (value.trim() === '') {
      setFilteredOptions([]);
    } else {
      const filtered = options.filter(option => 
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered.slice(0, 7)); // Limitar a 7 sugerencias
    }
    // Resetear el índice seleccionado cuando cambian las opciones
    setSelectedIndex(-1);
  }, [value, options]);

  // Cerrar sugerencias al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Manejar clic en una sugerencia
  const handleSuggestionClick = (suggestion: string) => {
    const event = {
      target: {
        name,
        value: suggestion
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(event);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Manejar focus en el input
  const handleFocus = () => {
    setShowSuggestions(true);
  };

  // Exponer el input nativo para poder hacer focus directamente
  const handleWrapperClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Manejar navegación por teclado
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Solo procesar si hay sugerencias para navegar
    if (!showSuggestions || filteredOptions.length === 0) return;

    // Flecha abajo - moverse a la siguiente sugerencia
    if (e.key === 'ArrowDown') {
      e.preventDefault(); // Prevenir el desplazamiento de la página
      setSelectedIndex(prevIndex => {
        const newIndex = prevIndex < filteredOptions.length - 1 ? prevIndex + 1 : 0;
        
        // Hacer scroll si es necesario
        if (suggestionsRef.current && suggestionsRef.current.children[newIndex]) {
          const element = suggestionsRef.current.children[newIndex] as HTMLElement;
          if (element) {
            element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
        
        return newIndex;
      });
    }
    
    // Flecha arriba - moverse a la sugerencia anterior
    else if (e.key === 'ArrowUp') {
      e.preventDefault(); // Prevenir el desplazamiento de la página
      setSelectedIndex(prevIndex => {
        const newIndex = prevIndex > 0 ? prevIndex - 1 : filteredOptions.length - 1;
        
        // Hacer scroll si es necesario
        if (suggestionsRef.current && suggestionsRef.current.children[newIndex]) {
          const element = suggestionsRef.current.children[newIndex] as HTMLElement;
          if (element) {
            element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
        
        return newIndex;
      });
    }
    
    // Enter - seleccionar la sugerencia destacada
    else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault(); // Prevenir el envío del formulario
      handleSuggestionClick(filteredOptions[selectedIndex]);
    }
    
    // Escape - cerrar las sugerencias
    else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef} onClick={handleWrapperClick}>
      <div className="w-full">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative rounded-md shadow-sm">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`
              block w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 
              border border-gray-300 rounded-md shadow-sm 
              focus:ring-primary-500 focus:border-primary-500 
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
              ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              z-10
            `}
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
      
      {/* Sugerencias */}
      {showSuggestions && filteredOptions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ top: 'calc(100% - 0.5rem)' }}
        >
          <ul className="py-1">
            {filteredOptions.map((option, index) => (
              <li
                key={index}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  selectedIndex === index 
                    ? 'bg-primary-100 text-primary-900' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleSuggestionClick(option)}
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
