// =============================================================================
// src/components/subscription/PlanSelector.tsx - CORREGIDO
// =============================================================================

import React, { useState } from 'react';
import { SubscriptionPlan } from '../../types/subscription';
import { Button, Card, CardBody, Badge } from '../ui';
import { createPayment, PaymentRequest, calculatePrice, determinePaymentType } from '../../services/paymentService';

interface PlanSelectorProps {
  plans: SubscriptionPlan[];
  selectedPlan: SubscriptionPlan | null;
  onPlanSelect: (plan: SubscriptionPlan) => void;
  lubricentroId: string;
  email: string;
  fantasyName: string;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: string) => void;
}

export const PlanSelector: React.FC<PlanSelectorProps> = ({
  plans,
  selectedPlan,
  onPlanSelect,
  lubricentroId,
  email,
  fantasyName,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [billingType, setBillingType] = useState<'monthly' | 'semiannual'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlanSelection = (plan: SubscriptionPlan) => {
    onPlanSelect(plan);
    
    // Si es un plan por servicios, resetear billing type
    if (plan.planType === 'service') {
      setBillingType('monthly'); // No se usa, pero mantener consistencia
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      alert('Por favor selecciona un plan');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentRequest: PaymentRequest = {
        lubricentroId,
        planId: selectedPlan.id,
        planType: selectedPlan.planType as 'monthly' | 'service',
        amount: calculatePrice(selectedPlan, billingType),
        email,
        fantasyName,
        // Solo incluir billingType para planes de suscripción
        ...(selectedPlan.planType !== 'service' && { billingType })
      };

      console.log('🚀 Iniciando pago con datos:', paymentRequest);
      
      const result = await createPayment(paymentRequest);
      
      if (result.success && result.data?.initUrl) {
        // Redirigir a MercadoPago
        window.location.href = result.data.initUrl;
        onPaymentSuccess?.(result);
      } else {
        throw new Error(result.error || 'Error iniciando pago');
      }

    } catch (error) {
      console.error('❌ Error iniciando pago:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
      onPaymentError?.(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isSelected = selectedPlan?.id === plan.id;
    const isServicePlan = plan.planType === 'service';
    const price = calculatePrice(plan, billingType);

    return (
      <div
        key={plan.id}
        className={`
          cursor-pointer transition-all duration-200 relative
          ${isSelected 
            ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg transform scale-105' 
            : 'hover:shadow-md hover:scale-102'
          }
          ${plan.recommended ? 'ring-2 ring-yellow-300' : ''}
        `}
        onClick={() => handlePlanSelection(plan)}
      >
        <Card className="h-full">
          {plan.recommended && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
              <Badge text="Recomendado" color="warning" className="px-4 py-1" />
            </div>
          )}

          <CardBody className="p-6 text-center h-full flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {plan.name}
            </h3>
            
            <p className="text-gray-600 text-sm mb-4 flex-grow">
              {plan.description}
            </p>

            {/* Precio */}
            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">
                ${price.toLocaleString()}
              </span>
              
              {isServicePlan ? (
                <div className="text-sm text-gray-500 mt-1">
                  <div>Pago único</div>
                  <div>{(plan as any).totalServices || 0} servicios incluidos</div>
                  {(plan as any).validityMonths && (
                    <div>Válido por {(plan as any).validityMonths} meses</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-1">
                  <div>/{billingType === 'monthly' ? 'mes' : '6 meses'}</div>
                  {plan.maxMonthlyServices ? (
                    <div>{plan.maxMonthlyServices} servicios/mes</div>
                  ) : (
                    <div>Servicios ilimitados</div>
                  )}
                </div>
              )}
            </div>

            {/* Características */}
            <ul className="text-left space-y-2 mb-6 flex-grow">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Tipo de plan */}
            <div className="mt-auto">
              {isServicePlan ? (
                <Badge text="🔧 Paquete de Servicios" color="info" />
              ) : (
                <Badge text="🔄 Suscripción Recurrente" color="success" />
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Elige tu Plan
        </h2>
        <p className="text-gray-600">
          Selecciona el plan que mejor se adapte a las necesidades de tu lubricentro
        </p>
      </div>

      {/* Selector de facturación solo para planes de suscripción */}
      {selectedPlan && selectedPlan.planType !== 'service' && (
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setBillingType('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingType === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingType('semiannual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingType === 'semiannual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semestral
              <span className="ml-1 text-xs text-green-600">(Ahorra hasta 20%)</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid de planes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {plans.map(renderPlanCard)}
      </div>

      {/* Botón de pago */}
      {selectedPlan && (
        <div className="text-center">
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            color="primary"
            size="lg"
            className="px-8 py-3"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : (
              <>
                {selectedPlan.planType === 'service' ? '🔧 Comprar Paquete' : '🔄 Suscribirse'}
                <span className="ml-2">
                  ${calculatePrice(selectedPlan, billingType).toLocaleString()}
                </span>
              </>
            )}
          </Button>
          
          <p className="mt-3 text-sm text-gray-500">
            {selectedPlan.planType === 'service' 
              ? 'Pago único - No hay renovación automática'
              : `Renovación automática ${billingType === 'monthly' ? 'mensual' : 'semestral'} - Puedes cancelar en cualquier momento`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PlanSelector;