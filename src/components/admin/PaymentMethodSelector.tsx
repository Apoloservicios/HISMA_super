// 🔄 ARCHIVO CORREGIDO: src/components/admin/PaymentMethodSelector.tsx
import React, { useState } from 'react';
import { Card, CardBody, Button } from '../ui';
import TransferPaymentEmailForm from './TransferPaymentEmailForm';

// Iconos
import {
  CreditCardIcon,
  BanknotesIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface PaymentMethodSelectorProps {
  selectedPlan: any;
  onMercadoPagoSelect: () => void;
  onSuccess?: () => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedPlan,
  onMercadoPagoSelect,
  onSuccess
}) => {
  // ✅ SOLUCIÓN DEFINITIVA: Usar any para evitar conflictos de tipos
  const [selectedMethod, setSelectedMethod] = useState<any>(null);

  // Si se selecciona transferencia, mostrar el formulario
  if (selectedMethod === 'transfer') {
    return (
      <div className="space-y-4">
        {/* Botón para volver */}
        <Button
          color="secondary"
          variant="outline"
          onClick={() => setSelectedMethod(null)}
          className="flex items-center"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Cambiar método de pago
        </Button>

        {/* Formulario de transferencia */}
        <TransferPaymentEmailForm
          selectedPlan={selectedPlan}
          onSuccess={onSuccess}
        />
      </div>
    );
  }

  // Vista de selección de método de pago
  return (
    <Card>
      <CardBody>
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
          💳 Selecciona tu Método de Pago
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MercadoPago */}
          <div
            className={`cursor-pointer p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
              selectedMethod === 'mercadopago'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => {
              setSelectedMethod('mercadopago');
              onMercadoPagoSelect();
            }}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CreditCardIcon className="h-12 w-12 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">MercadoPago</h4>
              <p className="text-sm text-gray-600 mb-4">
                Tarjetas, transferencia y efectivo
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center text-green-600">
                  <span className="mr-2">⚡</span>
                  <span>Activación instantánea</span>
                </div>
                <div className="flex items-center justify-center text-blue-600">
                  <span className="mr-2">💳</span>
                  <span>Múltiples formas de pago</span>
                </div>
                <div className="flex items-center justify-center text-purple-600">
                  <span className="mr-2">🔒</span>
                  <span>100% seguro</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-800 font-medium">
                  🚀 Recomendado para activación inmediata
                </p>
              </div>
            </div>
          </div>

          {/* Transferencia Bancaria */}
          <div
            className={`cursor-pointer p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
              selectedMethod === 'transfer'
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedMethod('transfer')}
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

              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <p className="text-xs text-green-800 font-medium">
                  🏦 Ideal para pagos desde cuenta empresarial
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
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
                <li>• Envío automático de comprobante</li>
                <li>• Ideal para empresas</li>
                <li>• Sin límites de monto</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Plan seleccionado */}
        {selectedPlan && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">📋 Plan Seleccionado:</h4>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-blue-900">{selectedPlan.name}</p>
                <p className="text-sm text-blue-700">{selectedPlan.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">
                  ${selectedPlan.price?.monthly?.toLocaleString()}
                </p>
                <p className="text-sm text-blue-600">por mes</p>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default PaymentMethodSelector;