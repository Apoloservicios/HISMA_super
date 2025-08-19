// src/components/admin/PaymentMethodSelector.tsx
import React from 'react';
import { Card, CardBody } from '../ui';
import { CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline';

interface PaymentMethodSelectorProps {
  selectedMethod: 'mercadopago' | 'transfer';
  onMethodChange: (method: 'mercadopago' | 'transfer') => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange
}) => {
  return (
    <Card>
      <CardBody>
        <h3 className="text-lg font-semibold mb-4">💳 Selecciona tu Método de Pago</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MercadoPago */}
          <div
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedMethod === 'mercadopago'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onMethodChange('mercadopago')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CreditCardIcon className="h-12 w-12 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">MercadoPago</h4>
              <p className="text-sm text-gray-600 mb-4">
                Pago instantáneo con tarjeta de débito, crédito o transferencia
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center text-green-600">
                  <span className="mr-2">✅</span>
                  <span>Activación instantánea</span>
                </div>
                <div className="flex items-center justify-center text-green-600">
                  <span className="mr-2">✅</span>
                  <span>Pago 100% seguro</span>
                </div>
                <div className="flex items-center justify-center text-green-600">
                  <span className="mr-2">✅</span>
                  <span>Cuotas disponibles</span>
                </div>
              </div>

              {selectedMethod === 'mercadopago' && (
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">
                    ⚡ Método recomendado para activación inmediata
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transferencia Bancaria */}
          <div
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedMethod === 'transfer'
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onMethodChange('transfer')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <BanknotesIcon className="h-12 w-12 text-green-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Transferencia</h4>
              <p className="text-sm text-gray-600 mb-4">
                Transferencia bancaria tradicional
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center text-green-600">
                  <span className="mr-2">✅</span>
                  <span>Sin comisiones extra</span>
                </div>
                <div className="flex items-center justify-center text-orange-600">
                  <span className="mr-2">⏰</span>
                  <span>Activación en 24-48hs</span>
                </div>
                <div className="flex items-center justify-center text-blue-600">
                  <span className="mr-2">📋</span>
                  <span>Requiere comprobante</span>
                </div>
              </div>

              {selectedMethod === 'transfer' && (
                <div className="mt-4 p-3 bg-green-100 rounded-lg">
                  <p className="text-xs text-green-800 font-medium">
                    🏦 Ideal para pagos desde cuenta empresarial
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-800 mb-2">📱 MercadoPago incluye:</h5>
              <ul className="text-gray-600 space-y-1">
                <li>• Tarjetas de crédito y débito</li>
                <li>• Transferencia desde MercadoPago</li>
                <li>• Pago en efectivo (RapiPago, PagoFácil)</li>
                <li>• Cuotas sin interés disponibles</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-800 mb-2">🏦 Transferencia incluye:</h5>
              <ul className="text-gray-600 space-y-1">
                <li>• Transferencia bancaria directa</li>
                <li>• Débito automático disponible</li>
                <li>• Ideal para empresas</li>
                <li>• Sin límites de monto</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to action según método seleccionado */}
        <div className="mt-6 text-center">
          {selectedMethod === 'mercadopago' ? (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 font-medium">
                🚀 Con MercadoPago, tus servicios se activan automáticamente al completar el pago
              </p>
            </div>
          ) : (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">
                📋 Con transferencia bancaria, nuestro equipo activará tus servicios en 24-48 horas
              </p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};