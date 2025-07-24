// src/components/oilchange/OilChangeStatusButton.tsx
import React, { useState } from 'react';
import { Button, Alert } from '../ui';
import { updateOilChangeStatus } from '../../services/oilChangeService';
import { useAuth } from '../../context/AuthContext';
import { OilChange, OilChangeStatus } from '../../types';
import { 
  ClockIcon,
  CheckIcon,
  PaperAirplaneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface OilChangeStatusButtonProps {
  oilChange: OilChange;
  onStatusUpdated?: () => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const OilChangeStatusButton: React.FC<OilChangeStatusButtonProps> = ({
  oilChange,
  onStatusUpdated,
  showLabel = true,
  size = 'sm'
}) => {
  const { userProfile } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');

  // Obtener el siguiente estado posible
  const getNextStatus = (): OilChangeStatus | null => {
    switch (oilChange.estado) {
      case 'pendiente':
        return 'completo';
      case 'completo':
        return 'enviado';
      case 'enviado':
        return null; // No hay siguiente estado
      default:
        return null;
    }
  };

  // Obtener configuración del botón según el estado actual
  const getButtonConfig = () => {
    const nextStatus = getNextStatus();
    
    switch (nextStatus) {
      case 'completo':
        return {
          color: 'success' as const,
          icon: <CheckIcon className="h-4 w-4" />,
          label: 'Marcar Completo',
          title: 'Cambiar estado a completado - El servicio ha sido realizado'
        };
      case 'enviado':
        return {
          color: 'info' as const,
          icon: <PaperAirplaneIcon className="h-4 w-4" />,
          label: 'Marcar Enviado',
          title: 'Cambiar estado a enviado - El comprobante ha sido entregado al cliente'
        };
      default:
        return null;
    }
  };

  // Actualizar estado
  const handleStatusUpdate = async (newStatus: OilChangeStatus, withNotes = false) => {
    if (!userProfile?.id) return;

    if (withNotes) {
      setShowNotesModal(true);
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      await updateOilChangeStatus(oilChange.id, newStatus, userProfile.id, notes);
      
      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      setError('Error al actualizar el estado. Por favor, intente nuevamente.');
    } finally {
      setUpdating(false);
      setShowNotesModal(false);
      setNotes('');
    }
  };

  // Confirmar actualización con notas
  const handleConfirmWithNotes = () => {
    const nextStatus = getNextStatus();
    if (nextStatus) {
      handleStatusUpdate(nextStatus);
    }
  };

  const buttonConfig = getButtonConfig();

  // Si no hay siguiente estado, no mostrar botón
  if (!buttonConfig) {
    return null;
  }

  return (
    <div className="relative">
      {error && (
        <Alert type="error" className="mb-2 text-xs">
          {error}
        </Alert>
      )}

      <Button
        size={size}
        color={buttonConfig.color}
        variant="outline"
        onClick={() => handleStatusUpdate(getNextStatus()!, true)}
        disabled={updating}
        icon={updating ? undefined : buttonConfig.icon}
        title={buttonConfig.title}
      >
        {updating ? 'Actualizando...' : (showLabel ? buttonConfig.label : '')}
      </Button>

      {/* Modal para notas */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmar Cambio de Estado
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              ¿Está seguro que desea cambiar el estado a "{getNextStatus()}"?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Agregar notas sobre este cambio de estado..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                color="secondary"
                variant="outline"
                onClick={() => {
                  setShowNotesModal(false);
                  setNotes('');
                }}
                disabled={updating}
              >
                Cancelar
              </Button>
              
              <Button
                color={buttonConfig.color}
                onClick={handleConfirmWithNotes}
                disabled={updating}
                icon={updating ? undefined : buttonConfig.icon}
              >
                {updating ? 'Actualizando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para mostrar el estado actual con badge
interface OilChangeStatusBadgeProps {
  status: OilChangeStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const OilChangeStatusBadge: React.FC<OilChangeStatusBadgeProps> = ({
  status,
  size = 'sm'
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pendiente':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <ClockIcon className="h-3 w-3" />,
          label: 'Pendiente'
        };
      case 'completo':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <CheckIcon className="h-3 w-3" />,
          label: 'Completo'
        };
      case 'enviado':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <PaperAirplaneIcon className="h-3 w-3" />,
          label: 'Enviado'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <XMarkIcon className="h-3 w-3" />,
          label: 'Desconocido'
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span 
      className={`inline-flex items-center ${sizeClasses[size]} font-medium rounded-full border ${config.color}`}
    >
      {config.icon}
      <span className="ml-1">{config.label}</span>
    </span>
  );
};

export default OilChangeStatusButton;