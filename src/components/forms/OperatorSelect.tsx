// src/components/forms/OperatorSelect.tsx
import React, { useState, useEffect } from 'react';
import { getUsersByLubricentro } from '../../services/userService';
import { User } from '../../types';
import { WrenchIcon, UserIcon } from '@heroicons/react/24/outline';

interface OperatorSelectProps {
  label: string;
  name: string;
  value: string;
  operatorId?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onOperatorIdChange?: (operatorId: string) => void;
  lubricentroId: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export const OperatorSelect: React.FC<OperatorSelectProps> = ({
  label,
  name,
  value,
  operatorId,
  onChange,
  onOperatorIdChange,
  lubricentroId,
  error,
  required = false,
  disabled = false,
  className = '',
  helperText
}) => {
  const [operators, setOperators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const fetchOperators = async () => {
      if (!lubricentroId) return;
      
      try {
        setLoading(true);
        const users = await getUsersByLubricentro(lubricentroId);
        
        // Filtrar solo usuarios activos
        const activeOperators = users.filter(user => 
          user.estado === 'activo' && 
          (user.role === 'admin' || user.role === 'user')
        );
        
        setOperators(activeOperators);
      } catch (error) {
        console.error('Error al cargar operarios:', error);
        setOperators([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOperators();
  }, [lubricentroId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    const selectedOperator = operators.find(op => `${op.nombre} ${op.apellido}` === selectedValue);
    
    // Llamar al onChange original
    onChange(e);
    
    // Si hay callback para el operatorId, llamarlo
    if (onOperatorIdChange && selectedOperator) {
      onOperatorIdChange(selectedOperator.id);
    }
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <WrenchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <select
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled || loading}
          required={required}
          className={`
            block w-full rounded-lg border-2 pl-10 pr-10 py-2.5 text-sm
            transition-all duration-200 ease-in-out
            ${disabled || loading
              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
              : error 
                ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50'
                : isFocused
                  ? 'border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-blue-50/30'
                  : 'border-gray-300 hover:border-gray-400 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }
            shadow-sm hover:shadow-md focus:shadow-lg
            appearance-none
          `}
        >
          <option value="">
            {loading ? 'Cargando operarios...' : 'Seleccionar operario/mecánico'}
          </option>
          {operators.map((operator) => (
            <option key={operator.id} value={`${operator.nombre} ${operator.apellido}`}>
              {operator.nombre} {operator.apellido}
              {operator.role === 'admin' && ' (Administrador)'}
            </option>
          ))}
        </select>
        
        {/* Icono de flecha personalizado */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
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
        <div className="mt-1 flex items-center">
          <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
          <p className="text-sm text-gray-500">{helperText}</p>
        </div>
      )}
      
      {!loading && operators.length === 0 && (
        <div className="mt-1 flex items-center">
          <svg className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-yellow-600">No hay operarios activos disponibles</p>
        </div>
      )}
    </div>
  );
};

export default OperatorSelect;