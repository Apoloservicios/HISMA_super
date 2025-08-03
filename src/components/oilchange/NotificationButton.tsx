import React, { useState } from 'react';
import { Button, Alert } from '../ui';
import { markAsNotified } from '../../services/oilChangeService';
import { useAuth } from '../../context/AuthContext';
import { OilChange } from '../../types';
import { 
  BellIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface NotificationButtonProps {
  oilChange: OilChange;
  onNotified?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  oilChange,
  onNotified,
  size = 'sm'
}) => {
  const { userProfile } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notes, setNotes] = useState('');

  const handleMarkNotified = async () => {
    if (!userProfile?.id) return;

    try {
      setUpdating(true);
      setError(null);

      await markAsNotified(oilChange.id, userProfile.id, notes);
      
      setShowConfirmModal(false);
      setNotes('');
      
      if (onNotified) {
        onNotified();
      }
    } catch (err) {
      console.error('Error al marcar como notificado:', err);
      setError('Error al marcar como notificado. Por favor, intente nuevamente.');
    } finally {
      setUpdating(false);
    }
  };

  // Si ya está notificado, mostrar estado
  if (oilChange.notificado) {
    return (
      <div className="flex items-center text-green-600 text-sm">
        <CheckIcon className="h-4 w-4 mr-1" />
        <span>Notificado</span>
        {oilChange.fechaNotificacion && (
          <span className="text-xs text-gray-500 ml-2">
            {new Date(oilChange.fechaNotificacion).toLocaleDateString('es-ES')}
          </span>
        )}
      </div>
    );
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
        color="info"
        variant="outline"
        onClick={() => setShowConfirmModal(true)}
        disabled={updating}
        icon={<BellIcon className="h-4 w-4" />}
        title="Marcar como notificado"
      >
        {updating ? 'Marcando...' : 'Marcar Notificado'}
      </Button>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Marcar como Notificado
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Cliente: <strong>{oilChange.nombreCliente}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Vehículo: <strong>{oilChange.dominioVehiculo}</strong>
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas sobre la notificación (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Ej: Cliente contactado por WhatsApp, confirmó turno para el viernes..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                color="secondary"
                variant="outline"
                onClick={() => {
                  setShowConfirmModal(false);
                  setNotes('');
                }}
                disabled={updating}
              >
                Cancelar
              </Button>
              
              <Button
                color="info"
                onClick={handleMarkNotified}
                disabled={updating}
                icon={updating ? undefined : <CheckIcon className="h-4 w-4" />}
              >
                {updating ? 'Marcando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationButton;