// src/utils/warrantyErrorHandler.ts

export const handleWarrantyError = (error: any): string => {
  console.error('Error de garantía:', error);
  
  // Errores de permisos de Firebase
  if (error.code === 'permission-denied') {
    return 'No tiene permisos para realizar esta acción. Contacte al administrador.';
  }
  
  // Errores de conexión
  if (error.code === 'unavailable') {
    return 'Servicio temporalmente no disponible. Intente nuevamente en unos momentos.';
  }
  
  // Errores de red
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return 'Error de conexión. Verifique su conexión a internet.';
  }
  
  // Errores de validación
  if (error.message?.includes('required')) {
    return 'Faltan campos obligatorios. Verifique los datos ingresados.';
  }
  
  // Error genérico
  return error.message || 'Error inesperado. Intente nuevamente.';
};

// src/components/warranty/WarrantyErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WarrantyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error en Garantías:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error en el Sistema de Garantías
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Ha ocurrido un error inesperado. Por favor, recargue la página o contacte al soporte técnico.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Recargar Página
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Ir al Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}