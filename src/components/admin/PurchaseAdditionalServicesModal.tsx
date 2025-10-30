// src/components/admin/PurchaseAdditionalServicesModal.tsx
// Modal para comprar servicios adicionales - CORREGIDO SIN ERRORES

import React, { useState } from 'react';
import { Modal, Button, Alert } from '../ui';
import { 
  purchaseAdditionalServices, 
  canPurchaseMoreServices,
  getPlanStatusInfo 
} from '../../services/planRenewalService';
import { Lubricentro } from '../../types';

import {
  PlusIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lubricentro: Lubricentro | null;
  onSuccess: () => void;
}

const PurchaseAdditionalServicesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lubricentro,
  onSuccess
}) => {
  const [additionalServices, setAdditionalServices] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!lubricentro || !isOpen) return null;

  const canPurchaseCheck = canPurchaseMoreServices(lubricentro);
  const planStatus = getPlanStatusInfo(lubricentro);

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await purchaseAdditionalServices(
        lubricentro.id, 
        additionalServices
      );
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Error al procesar la asignacion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [50, 100, 250, 500];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💰 Asignar  Servicios - ${lubricentro.fantasyName}`}
    >
      <div className="space-y-6 max-w-2xl">
        
        {/* Estado Actual */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
          <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center">
            <ShoppingCartIcon className="w-5 h-5 mr-2 text-blue-600" />
            Estado Actual del Plan
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Contratados</div>
              <div className="text-2xl font-bold text-blue-600">
                {lubricentro.totalServicesContracted || 0}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Servicios Usados</div>
              <div className="text-2xl font-bold text-orange-600">
                {lubricentro.servicesUsed || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ({planStatus.percentageUsed}%)
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Disponibles</div>
              <div className={`text-2xl font-bold ${
                planStatus.status === 'ok' ? 'text-green-600' :
                planStatus.status === 'warning' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {lubricentro.servicesRemaining || 0}
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Uso del plan</span>
              <span>{planStatus.percentageUsed}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  planStatus.status === 'ok' ? 'bg-green-500' :
                  planStatus.status === 'warning' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${planStatus.percentageUsed}%` }}
              />
            </div>
          </div>

          <div className={`mt-3 p-2 rounded text-sm ${
            planStatus.isExpired 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            📅 {planStatus.expiryMessage}
          </div>
        </div>

        {/* Alerta si no puede comprar */}
        {!canPurchaseCheck.canPurchase && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-900 mb-1">No se pueden agregar servicios</div>
                <div className="text-sm text-red-800">{canPurchaseCheck.reason}</div>
              </div>
            </div>
          </div>
        )}

        {/* Selector de Cantidad */}
        {canPurchaseCheck.canPurchase && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                Cantidad de servicios a agregar
              </label>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAdditionalServices(amount)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      additionalServices === amount
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>

              <div className="relative">
                <PlusIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={additionalServices}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setAdditionalServices(Math.max(1, Math.min(10000, value)));
                  }}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg font-semibold"
                  placeholder="Cantidad personalizada"
                />
              </div>
            </div>

            {/* Preview de Resultado */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-lg border-2 border-green-300">
              <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center">
                <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                Después de asignar
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Contratados</div>
                  <div className="text-2xl font-bold text-green-600">
                    {(lubricentro.totalServicesContracted || 0) + additionalServices}
                  </div>
                  <div className="text-xs text-green-600 font-semibold mt-1">
                    +{additionalServices} nuevos
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Servicios Disponibles</div>
                  <div className="text-2xl font-bold text-green-600">
                    {(lubricentro.servicesRemaining || 0) + additionalServices}
                  </div>
                  <div className="text-xs text-green-600 font-semibold mt-1">
                    +{additionalServices} disponibles
                  </div>
                </div>
              </div>

              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                ℹ️ <strong>Nota:</strong> Los servicios usados ({lubricentro.servicesUsed || 0}) no cambiarán.
                La fecha de vencimiento se extenderá 6 meses más.
              </div>
            </div>

            {/* Mensajes de Error/Éxito */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800">{error}</div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center text-green-800">
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  <div>{success}</div>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              
              <Button
                color="primary"
                onClick={handlePurchase}
                disabled={loading || additionalServices <= 0 || success !== null}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                    Procesando...
                  </div>
                ) : success ? (
                  '✓ Asignacion Exitosa'
                ) : (
                  <>
                    <ShoppingCartIcon className="w-5 h-5 mr-2 inline" />
                    Confirmar Asignación
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default PurchaseAdditionalServicesModal;