// src/components/payment/PlanSelectorModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, CardBody, Badge, Spinner } from '../ui';
import PaymentButton from './PaymentButton';
import { getSubscriptionPlans } from '../../services/hybridSubscriptionService';
import { SubscriptionPlan, PlanType } from '../../types/subscription';
import { 
  CheckCircleIcon, 
  CreditCardIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface PlanSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId?: string;
  lubricentroId: string | null | undefined;
  userEmail: string;
  fantasyName: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    semiannual: number;
  };
  maxUsers: number;
  maxMonthlyServices: number | null;
  features: string[];
  recommended?: boolean;
  planType: PlanType;
  servicePrice?: number;
  isActive: boolean;
  publishOnHomepage: boolean;
}

const PlanSelectorModal: React.FC<PlanSelectorModalProps> = ({
  isOpen,
  onClose,
  currentPlanId,
  lubricentroId,
  userEmail,
  fantasyName
}) => {
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingType, setBillingType] = useState<'monthly' | 'semiannual'>('monthly');
  const [error, setError] = useState<string | null>(null);

  // ✅ HOOKS PRIMERO - Antes de cualquier return condicional
  useEffect(() => {
    if (isOpen && lubricentroId) {
      loadPlans();
      setSelectedPlan(currentPlanId || null);
    }
  }, [isOpen, currentPlanId, lubricentroId]);

  // ✅ VALIDACIÓN DESPUÉS DE LOS HOOKS
  if (!lubricentroId) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Error" size="md">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Usuario no asociado a un lubricentro</p>
          <Button onClick={onClose} color="secondary">
            Cerrar
          </Button>
        </div>
      </Modal>
    );
  }

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const plansData = await getSubscriptionPlans();
      
      // Filtrar solo planes activos y que se muestran en homepage
      const availablePlans = Object.entries(plansData).reduce((acc, [id, plan]) => {
        // Verificar si el plan tiene las propiedades necesarias
        const isActive = (plan as any).isActive !== false; // Default true si no existe
        const publishOnHomepage = (plan as any).publishOnHomepage !== false; // Default true si no existe
        
        if (isActive && publishOnHomepage) {
          acc[id] = {
            ...plan,
            isActive,
            publishOnHomepage,
            maxMonthlyServices: plan.maxMonthlyServices ?? 0 // Convertir null a 0
          };
        }
        return acc;
      }, {} as Record<string, Plan>);

      setPlans(availablePlans);
    } catch (err) {
      console.error('Error cargando planes:', err);
      setError('Error al cargar los planes disponibles');
    } finally {
      setLoading(false);
    }
  };

  const getPlanPrice = (plan: Plan) => {
    if (plan.planType === PlanType.SERVICE && plan.servicePrice) {
      return plan.servicePrice;
    }
    return billingType === 'monthly' ? plan.price.monthly : plan.price.semiannual;
  };

  const getPlanPeriod = (plan: Plan) => {
    if (plan.planType === PlanType.SERVICE) {
      return 'Por servicios';
    }
    return billingType === 'monthly' ? 'Mensual' : 'Semestral';
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const getDiscountPercentage = (plan: Plan) => {
    if (plan.planType === PlanType.SERVICE) return 0;
    const monthlyTotal = plan.price.monthly * 6;
    const discount = ((monthlyTotal - plan.price.semiannual) / monthlyTotal) * 100;
    return Math.round(discount);
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar Plan" size="xl">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Error" size="md">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={onClose} color="secondary">
            Cerrar
          </Button>
        </div>
      </Modal>
    );
  }

  const selectedPlanData = selectedPlan ? plans[selectedPlan] : null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Seleccionar Plan de Suscripción" 
      size="xl"
    >
      <div className="space-y-6">
        
        {/* Tipo de facturación */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Tipo de facturación:
          </h4>
          <div className="flex space-x-4">
            <button
              onClick={() => setBillingType('monthly')}
              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                billingType === 'monthly'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">Mensual</div>
              <div className="text-xs text-gray-500">Facturación cada mes</div>
            </button>
            <button
              onClick={() => setBillingType('semiannual')}
              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                billingType === 'semiannual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">Semestral</div>
              <div className="text-xs text-gray-500">Facturación cada 6 meses</div>
              <Badge text="Hasta 20% descuento" color="success" className="mt-1" />
            </button>
          </div>
        </div>

        {/* Grid de planes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(plans).map(([planId, plan]) => {
            const isSelected = selectedPlan === planId;
            const isCurrent = planId === currentPlanId;
            const price = getPlanPrice(plan);
            const period = getPlanPeriod(plan);
            const discount = billingType === 'semiannual' ? getDiscountPercentage(plan) : 0;

            return (
              <div 
                key={planId}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'hover:shadow-md border-gray-200'
                } ${isCurrent ? 'bg-blue-50' : ''}`}
                onClick={() => handlePlanSelect(planId)}
              >
                <Card className="h-full">
                  <CardBody>
                    <div className="space-y-3">
                      
                      {/* Header del plan */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {plan.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {plan.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {plan.recommended && (
                            <Badge text="Recomendado" color="success" />
                          )}
                          {isCurrent && (
                            <Badge text="Plan Actual" color="info" />
                          )}
                          {isSelected && (
                            <CheckCircleIcon className="h-6 w-6 text-blue-500" />
                          )}
                        </div>
                      </div>

                      {/* Precio */}
                      <div className="border-t border-b border-gray-200 py-3">
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-gray-900">
                            ${price.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-600 ml-1">
                            / {period.toLowerCase()}
                          </span>
                        </div>
                        {discount > 0 && (
                          <div className="text-sm text-green-600 font-medium">
                            Ahorrás {discount}% pagando semestral
                          </div>
                        )}
                      </div>

                      {/* Características principales */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Usuarios:</span>
                          <span className="font-medium">{plan.maxUsers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Servicios mensuales:</span>
                          <span className="font-medium">
                            {plan.maxMonthlyServices === null || plan.maxMonthlyServices === -1 
                              ? 'Ilimitados' 
                              : plan.maxMonthlyServices.toLocaleString()
                            }
                          </span>
                        </div>
                      </div>

                      {/* Características adicionales */}
                      <div className="space-y-1 text-xs text-gray-600">
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-center">
                            <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        {plan.features.length > 3 && (
                          <div className="text-gray-500">
                            +{plan.features.length - 3} características más
                          </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Resumen y botón de pago */}
        {selectedPlanData && (
          <div className="bg-gray-50 rounded-lg p-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  Plan seleccionado: {selectedPlanData.name}
                </h4>
                <p className="text-sm text-gray-600">
                  ${getPlanPrice(selectedPlanData).toLocaleString()} / {getPlanPeriod(selectedPlanData).toLowerCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex space-x-3">
              <Button
                color="secondary"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              
              <div className="flex-2">
                <PaymentButton
                  planType={selectedPlan || ''}
                  planName={`${selectedPlanData.name} (${getPlanPeriod(selectedPlanData)})`}
                  amount={getPlanPrice(selectedPlanData)}
                  billingType={selectedPlanData.planType === PlanType.SERVICE ? 'monthly' : billingType}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PlanSelectorModal;