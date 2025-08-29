
// src/components/oilchange/DuplicateOilChangeModal.tsx
import React, { useState, useEffect } from 'react';
import { OilChange } from '../../types';
import { Button, Card, CardBody, Spinner } from '../ui';
import { 
  XMarkIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

interface GlobalSearchResult extends OilChange {
  lubricentroName: string;
}

interface DuplicateOilChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  oilChange: GlobalSearchResult | null;
  onConfirm: (originalOilChange: GlobalSearchResult, operario: string) => Promise<string>;
}

const DuplicateOilChangeModal: React.FC<DuplicateOilChangeModalProps> = ({
  isOpen,
  onClose,
  oilChange,
  onConfirm
}) => {
  const { userProfile } = useAuth();
  const [operario, setOperario] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOperario(userProfile ? `${userProfile.nombre || ''} ${userProfile.apellido || ''}`.trim() || userProfile.email || '' : '');
      setDuplicating(false);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, userProfile]);

  if (!isOpen || !oilChange) return null;

  const handleConfirm = async () => {
    if (!operario.trim()) {
      setError('Por favor ingrese el nombre del operario');
      return;
    }

    try {
      setDuplicating(true);
      setError(null);
      
      const newServiceId = await onConfirm(oilChange, operario.trim());
      
      setSuccess(true);
      
      // Auto-cerrar después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Error al duplicar servicio:', err);
      setError(err instanceof Error ? err.message : 'Error al duplicar el servicio');
    } finally {
      setDuplicating(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <DocumentDuplicateIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Duplicar Servicio de Otro Lubricentro
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            disabled={duplicating}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {success ? (
            // Success State
            <div className="text-center py-8">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-green-800 mb-2">
                ¡Servicio Duplicado Exitosamente!
              </h4>
              <p className="text-green-600">
                El servicio se ha agregado a su lubricentro. Cerrando...
              </p>
            </div>
          ) : (
            <>
              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      Información importante
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Se creará una copia de este servicio en su lubricentro con un nuevo número de cambio.
                      Los datos del vehículo y cliente se mantendrán, pero se registrará con la fecha actual.
                    </p>
                  </div>
                </div>
              </div>

              {/* Original Service Details */}
              <Card>
                <CardBody>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Servicio Original:
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Lubricentro:</span>
                      <div className="text-gray-600">{oilChange.lubricentroName}</div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Fecha del servicio:</span>
                      <div className="text-gray-600">{formatDate(oilChange.fechaServicio)}</div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Cliente:</span>
                      <div className="text-gray-600">{oilChange.nombreCliente}</div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Teléfono:</span>
                      <div className="text-gray-600">{oilChange.celular || 'No registrado'}</div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Vehículo:</span>
                      <div className="text-gray-600">
                        {oilChange.marcaVehiculo} {oilChange.modeloVehiculo}
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Dominio:</span>
                      <div className="text-gray-600 font-mono">{oilChange.dominioVehiculo}</div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Kilometraje:</span>
                      <div className="text-gray-600">{oilChange.kmActuales?.toLocaleString()} km</div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Aceite:</span>
                      <div className="text-gray-600">
                        {oilChange.marcaAceite} {oilChange.tipoAceite} {oilChange.sae} ({oilChange.cantidadAceite}L)
                      </div>
                    </div>
                  </div>

                  {/* Filtros cambiados */}
                  {(oilChange.filtroAceite || oilChange.filtroAire || oilChange.filtroHabitaculo || oilChange.filtroCombustible) && (
                    <div className="mt-4">
                      <span className="font-medium">Filtros cambiados:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {oilChange.filtroAceite && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Aceite
                          </span>
                        )}
                        {oilChange.filtroAire && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Aire
                          </span>
                        )}
                        {oilChange.filtroHabitaculo && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Habitáculo
                          </span>
                        )}
                        {oilChange.filtroCombustible && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Combustible
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observaciones originales */}
                  {oilChange.observaciones && (
                    <div className="mt-4">
                      <span className="font-medium">Observaciones originales:</span>
                      <div className="text-gray-600 text-sm mt-1 bg-gray-50 p-2 rounded">
                        {oilChange.observaciones}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Operario Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operario que registra el servicio *
                </label>
                <input
                  type="text"
                  value={operario}
                  onChange={(e) => setOperario(e.target.value)}
                  placeholder="Nombre del operario"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={duplicating}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este será el operario registrado en su lubricentro para este servicio
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={duplicating}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handleConfirm}
              disabled={duplicating || !operario.trim()}
            >
              {duplicating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Duplicando...
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                  Duplicar Servicio
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuplicateOilChangeModal;