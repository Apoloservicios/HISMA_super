// src/pages/admin/components/modals/ChangeStatusModal.tsx
import React from 'react';
import { Lubricentro, LubricentroStatus } from '../../types';
import { Button } from '../../components/ui';
import { 
  CheckIcon, 
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lubricentro: Lubricentro | null;
  newStatus: LubricentroStatus;
  loading?: boolean;
}

const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  lubricentro,
  newStatus,
  loading = false
}) => {
  if (!lubricentro || !isOpen) return null;

  // Configuración de iconos y colores según el estado
  const statusConfig: Record<LubricentroStatus, {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    title: string;
    description: string;
    action: string;
  }> = {
    activo: {
      icon: <CheckIcon className="h-6 w-6 text-green-600" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      title: 'Activar Lubricentro',
      description: 'El lubricentro tendrá acceso completo al sistema.',
      action: 'Activar'
    },
    inactivo: {
      icon: <XMarkIcon className="h-6 w-6 text-red-600" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      title: 'Desactivar Lubricentro',
      description: 'El lubricentro perderá acceso al sistema.',
      action: 'Desactivar'
    },
    trial: {
      icon: <ClockIcon className="h-6 w-6 text-yellow-600" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      title: 'Cambiar a Período de Prueba',
      description: 'El lubricentro tendrá acceso limitado durante el período de prueba.',
      action: 'Cambiar'
    }
  };

  const config = statusConfig[newStatus];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Centrar modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {config.title}
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={onClose}
              >
                <span className="sr-only">Cerrar</span>
                <svg 
                  className="h-6 w-6" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pt-0 pb-4 sm:p-6 sm:pb-4 sm:pt-0">
            {/* Icono y información del estado */}
            <div className="flex items-center mb-4">
              <div className={`rounded-full p-3 ${config.bgColor} mr-4`}>
                {config.icon}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {config.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {lubricentro.fantasyName}
                </p>
              </div>
            </div>

            {/* Descripción del cambio */}
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-3">
                {config.description}
              </p>
              
              {/* Información actual del lubricentro */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Información del Lubricentro:
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Nombre:</span>
                    <p className="font-medium">{lubricentro.fantasyName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Responsable:</span>
                    <p className="font-medium">{lubricentro.responsable}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Estado Actual:</span>
                    <p className="font-medium capitalize">{lubricentro.estado}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">CUIT:</span>
                    <p className="font-medium">{lubricentro.cuit}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Advertencia para desactivación */}
            {newStatus === 'inactivo' && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      <strong>Advertencia:</strong> Al desactivar este lubricentro, 
                      todos sus usuarios perderán acceso al sistema inmediatamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Información sobre período de prueba */}
            {newStatus === 'trial' && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      El período de prueba será extendido automáticamente por 7 días 
                      desde la fecha actual.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Información sobre activación */}
            {newStatus === 'activo' && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      El lubricentro tendrá acceso completo a todas las funcionalidades 
                      del sistema inmediatamente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              color={newStatus === 'inactivo' ? 'error' : 'primary'}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </div>
              ) : (
                config.action
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeStatusModal;