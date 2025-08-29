// src/components/payment/PlanSelectorModal.tsx
// ✅ VERSIÓN CORREGIDA: Solo muestra planes activos de Firebase

import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, CardBody, Badge, Spinner } from '../ui';
import { 
  getSubscriptionPlans, 
  hasFirebasePlans,
  getSystemDebugInfo 
} from '../../services/hybridSubscriptionService';
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
  totalServices?: number;
  validityMonths?: number;
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
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // ✅ HOOKS PRIMERO
  useEffect(() => {
    if (isOpen && lubricentroId) {
      loadPlans();
      setSelectedPlan(currentPlanId || null);
      
      // Cargar info de debug en desarrollo
      if (process.env.NODE_ENV === 'development') {
        loadDebugInfo();
      }
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

  const loadDebugInfo = async () => {
    try {
      const info = await getSystemDebugInfo();
      setDebugInfo(info);
  
    } catch (error) {
      console.error('Error cargando debug info:', error);
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
   
      
      // Verificar si hay planes de Firebase
      const hasFirebase = await hasFirebasePlans();
    
      
      const plansData = await getSubscriptionPlans();
    
      
      // ✅ NUEVA LÓGICA: Solo procesar planes que realmente deberían mostrarse
      const availablePlans = Object.entries(plansData).reduce((acc, [id, plan]) => {
        // Para planes de Firebase, verificar propiedades de activación
        const planData = plan as any;
        
        // Si el plan tiene propiedades de Firebase, verificar que esté activo y publicado
        if (planData.hasOwnProperty('isActive') || planData.hasOwnProperty('publishOnHomepage')) {
          const isActive = planData.isActive !== false;
          const isPublished = planData.publishOnHomepage !== false || planData.isPublished !== false;
          
          if (isActive && isPublished) {
            acc[id] = {
              ...plan,
              maxMonthlyServices: plan.maxMonthlyServices ?? 0
            };
          
          } else {
        
          }
        } else {
          // Para planes fallback, solo incluir si no hay planes de Firebase
          if (!hasFirebase) {
            acc[id] = {
              ...plan,
              maxMonthlyServices: plan.maxMonthlyServices ?? 0
            };
       
          } else {
       
          }
        }
        
        return acc;
      }, {} as Record<string, Plan>);


      
      if (Object.keys(availablePlans).length === 0) {
        throw new Error('No hay planes disponibles para mostrar');
      }
      
      setPlans(availablePlans);
      
    } catch (err) {
      console.error('❌ Error cargando planes:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los planes disponibles');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎯 DETECTAR SI ES PLAN POR SERVICIOS
   */
  const isServicePlan = (plan: Plan): boolean => {
    return plan.planType === PlanType.SERVICE || 
           (plan as any).servicePrice !== undefined ||
           plan.id.toLowerCase().includes('plan') ||
           plan.id.toLowerCase().includes('service');
  };

  /**
   * 💰 OBTENER PRECIO CORRECTO DEL PLAN
   */
  const getPlanPrice = (plan: Plan) => {
    if (isServicePlan(plan) && (plan as any).servicePrice) {
      return (plan as any).servicePrice;
    }
    return billingType === 'monthly' ? plan.price.monthly : plan.price.semiannual;
  };

  /**
   * 📅 OBTENER PERÍODO DEL PLAN
   */
  const getPlanPeriod = (plan: Plan) => {
    if (isServicePlan(plan)) {
      return 'Pago único';
    }
    return billingType === 'monthly' ? 'Mensual' : 'Semestral';
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const getDiscountPercentage = (plan: Plan) => {
    if (isServicePlan(plan)) return 0;
    const monthlyTotal = plan.price.monthly * 6;
    const discount = ((monthlyTotal - plan.price.semiannual) / monthlyTotal) * 100;
    return Math.round(discount);
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar Plan" size="xl">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Cargando planes disponibles...</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Error" size="md">
        <div className="text-center py-8">
          <XMarkIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-3">
            <Button onClick={loadPlans} color="primary">
              Reintentar
            </Button>
            <Button onClick={onClose} color="secondary">
              Cerrar
            </Button>
          </div>
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
        
        {/* Debug Info en desarrollo */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="bg-gray-100 p-3 rounded text-xs">
            <strong>Debug:</strong> {debugInfo.source} | 
            Planes: {debugInfo.totalPlans} | 
            Firebase: {debugInfo.firebasePlansCount} |
            Cache: {debugInfo.cacheStatus}
          </div>
        )}
        
        {/* Tipo de facturación - Solo para planes que no son por servicios */}
        {selectedPlanData && !isServicePlan(selectedPlanData) && (
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
        )}

        {/* Grid de planes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(plans).map(([planId, plan]) => {
            const isSelected = selectedPlan === planId;
            const isCurrent = planId === currentPlanId;
            const price = getPlanPrice(plan);
            const period = getPlanPeriod(plan);
            const discount = billingType === 'semiannual' && !isServicePlan(plan) ? getDiscountPercentage(plan) : 0;
            const planIsService = isServicePlan(plan);

            return (
              <div 
                key={planId}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'hover:shadow-md border-gray-200'
                } ${isCurrent ? 'border-green-500' : ''}`}
                onClick={() => handlePlanSelect(planId)}
              >
                <Card className="h-full">
                  {plan.recommended && (
                    <div className="bg-yellow-500 text-white text-xs font-medium px-3 py-1 rounded-t-lg text-center">
                      ⭐ Recomendado
                    </div>
                  )}
                  
                  {isCurrent && (
                    <div className="bg-green-500 text-white text-xs font-medium px-3 py-1 text-center">
                      ✅ Plan Actual
                    </div>
                  )}

                  <CardBody className="p-6 text-center">
                    {/* Tipo de plan badge */}
                    <div className="flex justify-center mb-3">
                      <Badge 
                        text={planIsService ? 'Por Servicios' : 'Mensual'} 
                        color={planIsService ? 'success' : 'info'} 
                      />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4">
                      {plan.description}
                    </p>

                    {/* Información del plan */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        {plan.maxUsers} usuario{plan.maxUsers !== 1 ? 's' : ''} • {' '}
                        {plan.maxMonthlyServices 
                          ? `${plan.maxMonthlyServices} servicios/mes`
                          : 'Servicios ilimitados'
                        }
                      </p>
                      
                      {planIsService && (plan as any).totalServices && (
                        <p className="text-sm text-blue-600 mt-1">
                          {(plan as any).totalServices} servicios por {(plan as any).validityMonths || 6} meses
                        </p>
                      )}
                    </div>

                    {/* Precio */}
                    <div className="mb-4">
                      {discount > 0 && (
                        <div className="text-sm text-gray-500 line-through mb-1">
                          ${(plan.price.monthly * 6).toLocaleString()}
                        </div>
                      )}
                      
                      <span className="text-3xl font-bold text-gray-900">
                        ${price.toLocaleString()}
                      </span>
                      <div className="text-sm text-gray-500 mt-1">
                        {period}
                        {discount > 0 && (
                          <Badge text={`${discount}% OFF`} color="success" className="ml-2" />
                        )}
                      </div>
                    </div>

                    {/* Características */}
                    <div className="text-left">
                      <ul className="text-sm text-gray-600 space-y-1">
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="text-xs text-gray-500 mt-2">
                            +{plan.features.length - 3} características más
                          </li>
                        )}
                      </ul>
                    </div>

                    {isSelected && (
                      <div className="mt-4 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <CheckCircleIcon className="h-5 w-5 text-blue-600 mx-auto" />
                        <p className="text-xs text-blue-600 mt-1">Plan seleccionado</p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Información adicional */}
        {Object.keys(plans).length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay planes disponibles en este momento</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button onClick={onClose} color="secondary">
            Cancelar
          </Button>
          
          {selectedPlan && selectedPlanData && (
            <Button
              onClick={async () => {
                // Aquí implementarías la lógica de pago directamente
                // o llamar a un servicio de pago
                try {
             
                  
                  // Aquí llamarías a tu servicio de pago
                  // await createPayment({ ... });
                  
                  onClose();
                } catch (error) {
                  console.error('Error en el pago:', error);
                  setError(`Error en el pago: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                }
              }}
              color="primary"
              className="px-6 py-3"
            >
              <CreditCardIcon className="h-5 w-5 mr-2" />
              {isServicePlan(selectedPlanData) ? 'Comprar Plan' : 'Suscribirse'}
              <span className="ml-2">
                ${getPlanPrice(selectedPlanData).toLocaleString()}
              </span>
            </Button>
          )}
        </div>
        
        {/* Footer informativo */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t">
          <p>
            💳 Pagos seguros con MercadoPago • 
            🔒 Datos protegidos • 
            📞 Soporte técnico incluido
          </p>
          {selectedPlanData && !isServicePlan(selectedPlanData) && (
            <p className="mt-1">
              Puedes cancelar tu suscripción en cualquier momento desde el panel de administración
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PlanSelectorModal;