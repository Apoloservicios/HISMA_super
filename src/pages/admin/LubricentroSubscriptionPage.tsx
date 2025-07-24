// src/pages/admin/LubricentroSubscriptionPage.tsx
// IMPLEMENTACIÓN COMPLETA - Reemplazar todo el archivo

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  PageContainer, 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Alert, 
  Spinner, 
  Badge,
  Tabs,
  Tab,
  Input,
  Select,
  Modal
} from '../../components/ui';

import { 
  getLubricentroById,
  updateLubricentroStatus
} from '../../services/lubricentroService';

import {
  updateSubscription,
  recordPayment
} from '../../services/subscriptionService';

import { Lubricentro, SubscriptionPlanType } from '../../types';
import { SubscriptionPlan, PlanType } from '../../types/subscription';
import { getSubscriptionPlans, invalidatePlansCache,getAllDynamicPlans } from '../../services/hybridSubscriptionService';

// Iconos
import { 
  BuildingOfficeIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  CheckIcon,
  XMarkIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Interfaces para modales
interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: string, reference: string) => Promise<void>;
  lubricentro: Lubricentro | null;
  loading: boolean;
  dynamicPlans: Record<SubscriptionPlanType, SubscriptionPlan>;
  loadingPlans: boolean;
}

interface UpdateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (plan: SubscriptionPlanType, renewalType: 'monthly' | 'semiannual', autoRenewal: boolean) => Promise<void>;
  lubricentro: Lubricentro | null;
  loading: boolean;
  dynamicPlans: Record<SubscriptionPlanType, SubscriptionPlan>;
}

// 🔍 COMPONENTE DE DEBUG
const PlansDebugInfo: React.FC<{ 
  dynamicPlans: Record<SubscriptionPlanType, SubscriptionPlan>,
  loadingPlans: boolean,
  lubricentro: Lubricentro | null
}> = ({ dynamicPlans, loadingPlans, lubricentro }) => {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <div className="mb-4">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setShowDebug(true)}
        >
          🔍 Mostrar Debug de Planes
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardHeader 
        title="🔍 Debug - Información de Planes" 
        action={
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowDebug(false)}
          >
            Ocultar
          </Button>
        }
      />
      <CardBody>
        <div className="space-y-4 text-sm font-mono">
          {/* Estado de carga */}
          <div>
            <strong>Estado de carga:</strong>
            <p className={loadingPlans ? 'text-orange-600' : 'text-green-600'}>
              {loadingPlans ? '⏳ Cargando planes...' : '✅ Planes cargados'}
            </p>
          </div>

          {/* Información del lubricentro */}
          <div>
            <strong>Lubricentro actual:</strong>
            <div className="bg-white p-2 rounded border ml-2">
              <p>ID: {lubricentro?.id || 'No disponible'}</p>
              <p>Nombre: {lubricentro?.fantasyName || 'No disponible'}</p>
              <p>Plan actual: <span className="text-blue-600">{lubricentro?.subscriptionPlan || 'Sin plan'}</span></p>
              <p>Estado: <span className="text-purple-600">{lubricentro?.estado || 'No disponible'}</span></p>
            </div>
          </div>

          {/* Planes dinámicos disponibles */}
          <div>
            <strong>Planes dinámicos cargados ({Object.keys(dynamicPlans).length}):</strong>
            <div className="bg-white p-2 rounded border ml-2 max-h-64 overflow-y-auto">
              {Object.keys(dynamicPlans).length === 0 ? (
                <p className="text-red-600">❌ No hay planes cargados</p>
              ) : (
                Object.entries(dynamicPlans).map(([planId, planData]) => (
                  <div key={planId} className="border-b border-gray-200 pb-2 mb-2 last:border-b-0">
                    <p className="font-semibold text-blue-600">Plan ID: {planId}</p>
                    <p>Nombre: {planData?.name || '❌ Sin nombre'}</p>
                    <p>Tipo: {planData?.planType || '❌ Sin tipo'}</p>
                    <p>Precio mensual: ${planData?.price?.monthly?.toLocaleString() || '❌ Sin precio'}</p>
                    <p>Precio semestral: ${planData?.price?.semiannual?.toLocaleString() || 'N/A'}</p>
                    {planData?.servicePrice && (
                      <p>Precio por servicio: ${planData.servicePrice.toLocaleString()}</p>
                    )}
                    {planData?.totalServices && (
                      <p>Total servicios: {planData.totalServices}</p>
                    )}
                    <p>Max usuarios: {planData?.maxUsers || '❌ Sin límite definido'}</p>
                    <p>Max servicios mensuales: {
                      planData?.maxMonthlyServices === null 
                        ? 'Ilimitados' 
                        : planData?.maxMonthlyServices || '❌ Sin límite definido'
                    }</p>
                    <p>Recomendado: {planData?.recommended ? '⭐ Sí' : 'No'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// Modal para registrar pago
const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  lubricentro, 
  loading,
  dynamicPlans,
  loadingPlans
}) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('transferencia');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lubricentro?.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan as SubscriptionPlanType]) {
      const plan = dynamicPlans[lubricentro.subscriptionPlan as SubscriptionPlanType];
      let planPrice = 0;
      
      if (plan.planType === 'service' && plan.servicePrice) {
        planPrice = plan.servicePrice;
      } else {
        planPrice = lubricentro.subscriptionRenewalType === 'semiannual' 
          ? plan.price.semiannual 
          : plan.price.monthly;
      }
      
      setAmount(planPrice);
    }
  }, [lubricentro, dynamicPlans]);

  const handleSubmit = async () => {
    if (amount <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }
    if (!reference.trim()) {
      setError('La referencia de pago es obligatoria');
      return;
    }
    try {
      await onConfirm(amount, method, reference);
    } catch (err: any) {
      setError(err.message || 'Error al registrar el pago');
    }
  };

  if (loading || loadingPlans || !lubricentro) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago" size="md">
        <div className="flex justify-center items-center h-40">
          <Spinner size="lg" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Registrar Pago"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button color="secondary" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button color="success" onClick={handleSubmit} disabled={loading}>
            {loading ? <>
              <Spinner size="sm" color="white" className="mr-2" />
              Procesando...
            </> : 'Registrar Pago'}
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" className="mb-4" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-lg font-medium text-gray-900">{lubricentro.fantasyName}</p>
          <p className="text-sm text-gray-500">
            Plan: {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]
              ? dynamicPlans[lubricentro.subscriptionPlan].name 
              : 'Sin plan'}
          </p>
        </div>

        <Input
          label="Monto"
          name="amount"
          type="number"
          value={amount.toString()}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
          helperText="Monto del pago en pesos"
        />

        <Select
          label="Método de Pago"
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={[
            { value: 'transferencia', label: 'Transferencia Bancaria' },
            { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'mercadopago', label: 'MercadoPago' },
            { value: 'otro', label: 'Otro' }
          ]}
        />

        <Input
          label="Referencia"
          name="reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
          helperText="Número de transacción, comprobante, etc."
        />
      </div>
    </Modal>
  );
};

// Modal para actualizar suscripción - VERSIÓN COMPLETA
const UpdateSubscriptionModal: React.FC<UpdateSubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  lubricentro, 
  loading,
  dynamicPlans
}) => {
  const [plan, setPlan] = useState<string>('basic');
  const [renewalType, setRenewalType] = useState<'monthly' | 'semiannual'>('monthly'); // ✅ Mantener solo los tipos del UI
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  

    if (lubricentro) {
      setPlan(lubricentro.subscriptionPlan || 'basic');
      
      // 🔧 CORRECCIÓN: Manejar correctamente el tipo 'service'
      const currentRenewalType = lubricentro.subscriptionRenewalType;
      if (currentRenewalType === 'service') {
        // Para planes por servicios, usar 'monthly' como default en el UI
        // ya que los planes por servicios no tienen ciclo de facturación
        setRenewalType('monthly');
      } else if (currentRenewalType === 'monthly' || currentRenewalType === 'semiannual') {
        setRenewalType(currentRenewalType);
      } else {
        setRenewalType('monthly');
      }
      
      setAutoRenewal(lubricentro.autoRenewal !== false);
    }
  }, [lubricentro, dynamicPlans]);

  const handleSubmit = async () => {
    try {
      setError(null);

      
      await onConfirm(plan as SubscriptionPlanType, renewalType, autoRenewal);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la suscripción');
    }
  };

  const calculatePrice = (): number => {
    const planData = dynamicPlans[plan as SubscriptionPlanType];
    if (!planData) return 0;
    
    if (planData.planType === 'service' && planData.servicePrice) {
      return planData.servicePrice;
    }
    
    return renewalType === 'monthly' ? planData.price.monthly : planData.price.semiannual;
  };

  const isCurrentPlanService = (planId: string): boolean => {
    return dynamicPlans[planId as SubscriptionPlanType]?.planType === 'service';
  };

  if (!lubricentro) return null;

  const availablePlansEntries = Object.entries(dynamicPlans).filter(([planId, planData]) => {
    return planData && planData.name && planData.price;
  });

 

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Actualizar Suscripción"
      size="lg"
      footer={
        <div className="flex justify-end space-x-2">
          <Button color="secondary" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <>
              <Spinner size="sm" color="white" className="mr-2" />
              Procesando...
            </> : 'Actualizar Suscripción'}
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" className="mb-4" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan de Suscripción
          </label>
          
          {availablePlansEntries.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">
                No se encontraron planes disponibles. 
                <br />
                Verifique la configuración de planes en el sistema.
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 ${
              availablePlansEntries.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
              availablePlansEntries.length <= 6 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}>
              {availablePlansEntries.map(([planId, planData]) => {
                const isServicePlan = planData.planType === 'service';
                const isSelected = plan === planId;
                
                return (
                  <div 
                    key={planId}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors hover:shadow-md ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {

                      setPlan(planId);
                    }}
                  >
                    {isSelected && (
                      <div className="flex justify-end mb-2">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isServicePlan 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isServicePlan ? '🔧 Por Servicios' : '📅 Mensual'}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {planData.name}
                    </h3>
                    
                    {isServicePlan ? (
                      <>
                        <p className="text-lg font-semibold text-primary-600 mb-1">
                          ${(planData.servicePrice || 0).toLocaleString()} - Pago único
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          {planData.totalServices || 0} servicios incluidos
                        </p>
                        {planData.validityMonths && (
                          <p className="text-xs text-gray-500">
                            Válido por {planData.validityMonths} meses
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-semibold text-gray-900 mb-1">
                          ${planData.price.monthly.toLocaleString()} /mes
                        </p>
                        {planData.price.semiannual && planData.price.semiannual !== planData.price.monthly && (
                          <p className="text-sm text-gray-600 mb-2">
                            ${planData.price.semiannual.toLocaleString()} /semestral
                          </p>
                        )}
                      </>
                    )}
                    
                    <div className="space-y-1">
                      {planData.maxUsers && (
                        <p className="text-xs text-gray-500">
                          👥 {planData.maxUsers === 999 ? 'Usuarios ilimitados' : `${planData.maxUsers} usuarios`}
                        </p>
                      )}
                      
                      {isServicePlan ? (
                        planData.totalServices && (
                          <p className="text-xs text-gray-500">
                            🔧 {planData.totalServices} servicios totales
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-gray-500">
                          🔧 {planData.maxMonthlyServices === null 
                            ? 'Servicios ilimitados' 
                            : `${planData.maxMonthlyServices} servicios/mes`}
                        </p>
                      )}
                    </div>

                    {planData.recommended && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⭐ Recomendado
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Solo mostrar opciones de facturación para planes no-servicios */}
        {!isCurrentPlanService(plan) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ciclo de Facturación
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  renewalType === 'monthly' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setRenewalType('monthly')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Mensual</h3>
                    <p className="text-sm text-gray-500">Facturación cada mes</p>
                  </div>
                  {renewalType === 'monthly' && (
                    <CheckIcon className="w-5 h-5 text-primary-500" />
                  )}
                </div>
              </div>
              
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  renewalType === 'semiannual' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setRenewalType('semiannual')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Semestral</h3>
                    <p className="text-sm text-gray-500">Facturación cada 6 meses</p>
                  </div>
                  {renewalType === 'semiannual' && (
                    <CheckIcon className="w-5 h-5 text-primary-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Renovación automática - Solo para planes mensuales */}
        {!isCurrentPlanService(plan) && (
          <div>
            <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={autoRenewal}
                onChange={(e) => setAutoRenewal(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Renovación automática
                </span>
                <p className="text-xs text-gray-500">
                  El plan se renovará automáticamente al final de cada período
                </p>
              </div>
            </label>
          </div>
        )}
        
        {/* Resumen de la selección */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Resumen</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Plan:</span>
              <span className="font-medium text-gray-900">
                {dynamicPlans[plan as SubscriptionPlanType]?.name || 'Plan no disponible'}
              </span>
            </div>
            
            {isCurrentPlanService(plan) ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium text-gray-900">Pago único por servicios</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicios:</span>
                  <span className="font-medium text-gray-900">
                    {dynamicPlans[plan as SubscriptionPlanType]?.totalServices || 0}
                  </span>
                </div>
                {dynamicPlans[plan as SubscriptionPlanType]?.validityMonths && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Validez:</span>
                    <span className="font-medium text-gray-900">
                      {dynamicPlans[plan as SubscriptionPlanType].validityMonths} meses
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Facturación:</span>
                  <span className="font-medium text-gray-900">
                    {renewalType === 'monthly' ? 'Mensual' : 'Semestral'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Renovación automática:</span>
                  <span className="font-medium text-gray-900">
                    {autoRenewal ? 'Activada' : 'Desactivada'}
                  </span>
                </div>
              </>
            )}
            
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">Total:</span>
              <span className="font-bold text-lg text-primary-600">
                ${calculatePrice().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Componente principal
const LubricentroSubscriptionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [activeTab, setActiveTab] = useState('info');

  const [dynamicPlans, setDynamicPlans] = useState<Record<string, SubscriptionPlan>>({});
  

  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // 🔧 FUNCIÓN CORREGIDA loadData
const loadData = async () => {
  if (!id) return;
  
  try {
    setLoading(true);
    setLoadingPlans(true);
    setError(null);
    

    
    // Invalidar cache para obtener datos frescos
    invalidatePlansCache();
    
    // 🔧 USAR LA NUEVA FUNCIÓN para obtener TODOS los planes
    const [lubricentroData, allPlansData] = await Promise.all([
      getLubricentroById(id),
      getAllDynamicPlans()
    ]);
    
   
    
    
    // Verificar que se obtuvieron datos válidos
    if (!lubricentroData) {
      throw new Error('No se pudo cargar la información del lubricentro');
    }
    
    if (!allPlansData.allPlans || Object.keys(allPlansData.allPlans).length === 0) {
      console.warn('⚠️ No se cargaron planes dinámicos, intentando recarga...');
      
      // Intentar recargar planes una vez más
      try {
        const retryPlans = await getSubscriptionPlans();
        if (retryPlans && Object.keys(retryPlans).length > 0) {
          setDynamicPlans(retryPlans as Record<string, SubscriptionPlan>);
    
        } else {
          throw new Error('No hay planes disponibles');
        }
      } catch (retryError) {
        console.error('❌ Error en segundo intento de carga de planes:', retryError);
        setError('No se pudieron cargar los planes de suscripción. Verifique la configuración del sistema.');
        return;
      }
    } else {
      // 🔧 Usar todos los planes (estándar + dinámicos)
      setDynamicPlans(allPlansData.allPlans);
    }
    
    setLubricentro(lubricentroData);
    

    
  } catch (err) {
    console.error('❌ Error al cargar datos:', err);
    setError('Error al cargar los datos del lubricentro. Por favor, intente nuevamente.');
  } finally {
    setLoading(false);
    setLoadingPlans(false);
  }
};
  
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  const handleChangeStatus = async (status: 'activo' | 'inactivo') => {
    if (!id) return;
    
    try {
      setProcessing(true);
      await updateLubricentroStatus(id, status);
      await loadData();
      setSuccess(`Estado del lubricentro cambiado a ${status === 'activo' ? 'Activo' : 'Inactivo'}`);
    } catch (err) {
      console.error('Error al cambiar el estado:', err);
      setError('Error al cambiar el estado del lubricentro');
    } finally {
      setProcessing(false);
    }
  };
  
  const calculatePrice = (plan: SubscriptionPlanType, renewalType: 'monthly' | 'semiannual'): number => {
    const planData = dynamicPlans[plan];
    if (!planData) return 0;
    
    if (planData.planType === 'service' && planData.servicePrice) {
      return planData.servicePrice;
    }
    
    return renewalType === 'monthly' ? planData.price.monthly : planData.price.semiannual;
  };
  
const handleUpdateSubscription = async (
  plan: SubscriptionPlanType,
  renewalType: 'monthly' | 'semiannual',
  autoRenewal: boolean
) => {
  if (!lubricentro) {
    setError('No se encontró la información del lubricentro');
    return;
  }
  
  try {
    setProcessing(true);
    setError(null);
  
    
    // 🔧 PASO 1: Actualizar la suscripción (esto cambia el estado a 'activo')
    await updateSubscription(lubricentro.id, plan, renewalType, autoRenewal);
  
    
    // 🔧 PASO 2: Registrar el pago automáticamente
    const planData = dynamicPlans[plan];
    if (planData) {
      let paymentAmount = 0;
      let paymentDescription = '';
      
      if (planData.planType === 'service' && planData.servicePrice) {
        paymentAmount = planData.servicePrice;
        paymentDescription = `Pago único - ${planData.name}`;
      } else {
        paymentAmount = renewalType === 'monthly' ? planData.price.monthly : planData.price.semiannual;
        paymentDescription = `Pago ${renewalType === 'monthly' ? 'mensual' : 'semestral'} - ${planData.name}`;
      }
      
      if (paymentAmount > 0) {
    
        
        await recordPayment(
          lubricentro.id, 
          paymentAmount, 
          'admin_update', 
          `admin_update_${Date.now()}`
        );
       
      }
    }
    
    // 🔧 PASO 3: Recargar datos para reflejar cambios
    await loadData();
   
    
    // 🔧 PASO 4: Cerrar modal y mostrar éxito
    setIsSubscriptionModalOpen(false);
    setSuccess(`Suscripción actualizada correctamente a: ${planData?.name || plan}`);
    
  } catch (err: any) {
    console.error('❌ Error al actualizar la suscripción:', err);
    setError(`Error al actualizar la suscripción: ${err.message}`);
  } finally {
    setProcessing(false);
  }
};
  
const handleRecordPayment = async (amount: number, method: string, reference: string) => {
  if (!lubricentro) {
    setError('No se encontró la información del lubricentro');
    return;
  }
  
  try {
    setProcessing(true);
    setError(null);
    

    
    await recordPayment(lubricentro.id, amount, method, reference);

    
    await loadData();
    setIsPaymentModalOpen(false);
    setSuccess('Pago registrado correctamente');
    
  } catch (err: any) {

    setError(`Error al registrar el pago: ${err.message}`);
  } finally {
    setProcessing(false);
  }
};
  
  const formatDate = (date: any): string => {
    if (!date) return 'No disponible';
    
    try {
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Fecha inválida';
      
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };
  
  const getDaysRemaining = (date: any): number => {
    if (!date) return 0;
    
    try {
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return 0;
      
      const now = new Date();
      const diffTime = dateObj.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      return 0;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo':
        return <Badge color="success" text="Activo" />;
      case 'trial':
        return <Badge color="warning" text="Prueba" />;
      case 'inactivo':
        return <Badge color="error" text="Inactivo" />;
      default:
        return <Badge color="default" text={status} />;
    }
  };
  
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge color="success" text="Pagado" />;
      case 'pending':
        return <Badge color="warning" text="Pendiente" />;
      case 'overdue':
        return <Badge color="error" text="Vencido" />;
      default:
        return <Badge color="default" text={status} />;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error || !lubricentro) {
    return (
      <PageContainer title="Gestión de Suscripción">
        <Alert type="error" className="mb-4">
          {error || 'No se encontró el lubricentro solicitado.'}
        </Alert>
        <Button
          color="primary"
          onClick={() => navigate('/superadmin/lubricentros')}
          icon={<ChevronLeftIcon className="h-5 w-5" />}
        >
          Volver a la lista
        </Button>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer
      title={`Gestión de Suscripción: ${lubricentro?.fantasyName || 'Cargando...'}`}
      subtitle="Administración de suscripción y pagos"
      action={
        <div className="flex space-x-2">
          <Button
            color="primary"
            onClick={() => setIsSubscriptionModalOpen(true)}
            icon={<CreditCardIcon className="h-5 w-5" />}
          >
            Actualizar Suscripción
          </Button>
          <Button
            color="success"
            onClick={() => setIsPaymentModalOpen(true)}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
          >
            Registrar Pago
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success" className="mb-6" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* 🔍 DEBUG INFO - Remover en producción */}
      <PlansDebugInfo 
        dynamicPlans={dynamicPlans}
        loadingPlans={loadingPlans}
        lubricentro={lubricentro}
      />
      
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Estado de la Suscripción
              </h3>
              <div className="mt-2 flex items-center">
                {getStatusBadge(lubricentro.estado)}
                <span className="ml-2 text-sm text-gray-500">
                  {lubricentro.estado === 'trial' && lubricentro.trialEndDate && (
                    <>
                      Prueba finaliza el {formatDate(lubricentro.trialEndDate)}
                      {getDaysRemaining(lubricentro.trialEndDate) > 0
                        ? ` (${getDaysRemaining(lubricentro.trialEndDate)} días restantes)`
                        : ' (Expirado)'}
                    </>
                  )}
                  {lubricentro.estado === 'activo' && lubricentro.subscriptionEndDate && (
                    <>
                      Suscripción válida hasta {formatDate(lubricentro.subscriptionEndDate)}
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="mt-5 sm:mt-0 sm:ml-4">
              {lubricentro.estado !== 'activo' ? (
                <Button
                  color="success"
                  onClick={() => handleChangeStatus('activo')}
                  disabled={processing}
                  icon={<CheckIcon className="h-5 w-5" />}
                >
                  Activar
                </Button>
              ) : (
                <Button
                  color="error"
                  onClick={() => handleChangeStatus('inactivo')}
                  disabled={processing}
                  icon={<XMarkIcon className="h-5 w-5" />}
                >
                  Desactivar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'info', label: 'Información de Suscripción' },
          { id: 'payments', label: 'Historial de Pagos' },
          { id: 'usage', label: 'Uso del Servicio' },
        ]}
        className="mb-6"
      />
      
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Detalles de la Suscripción" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Actual</label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]
                        ? dynamicPlans[lubricentro.subscriptionPlan].name
                        : 'Sin plan asignado'}
                    </div>
                    {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan] && (
                      <p className="mt-1 text-sm text-gray-500">
                        {dynamicPlans[lubricentro.subscriptionPlan].description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ciclo de Facturación</label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.subscriptionRenewalType === 'semiannual'
                        ? 'Semestral'
                        : lubricentro.subscriptionRenewalType === 'monthly'
                          ? 'Mensual'
                          : 'No definido'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Renovación Automática</label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.autoRenewal !== false ? 'Activada' : 'Desactivada'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado del Pago</label>
                    <div className="mt-1">
                      {lubricentro.paymentStatus
                        ? getPaymentStatusBadge(lubricentro.paymentStatus)
                        : <Badge color="default" text="No disponible" />}
                    </div>
                  </div>
                </div>

                <hr className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
                    <div className="mt-1 text-base font-medium text-gray-900">
                      {lubricentro.subscriptionStartDate
                        ? formatDate(lubricentro.subscriptionStartDate)
                        : 'No disponible'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fin del Contrato</label>
                    <div className="mt-1 text-base font-medium text-gray-900">
                      {lubricentro.contractEndDate
                        ? formatDate(lubricentro.contractEndDate)
                        : 'No disponible'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fin del Ciclo Actual</label>
                    <div className="mt-1 text-base font-medium text-gray-900">
                      {lubricentro.billingCycleEndDate
                        ? formatDate(lubricentro.billingCycleEndDate)
                        : 'No disponible'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="mt-6">
              <CardHeader title="Límites del Plan" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Límite de Usuarios</label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]
                        ? `${dynamicPlans[lubricentro.subscriptionPlan].maxUsers} usuarios`
                        : 'No definido'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {/* 🔧 CORRECCIÓN: Título dinámico según tipo de plan */}
                      {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]?.planType === 'service'
                        ? 'Servicios del Paquete'
                        : 'Límite de Servicios Mensuales'}
                    </label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {(() => {
                        if (!lubricentro.subscriptionPlan || !dynamicPlans[lubricentro.subscriptionPlan]) {
                          return 'No definido';
                        }
                        
                        const currentPlan = dynamicPlans[lubricentro.subscriptionPlan];
                        
                        // 🔧 CORRECCIÓN: Lógica específica para cada tipo de plan
                        if (currentPlan.planType === 'service') {
                          // Para planes por servicios, mostrar servicios totales del paquete
                          const totalServices = currentPlan.totalServices || 0;
                          const usedServices = lubricentro.servicesUsed || 0;
                          const remainingServices = lubricentro.servicesRemaining || totalServices;
                          
                          return (
                            <div>
                              <div className="text-lg font-medium">
                                {totalServices} servicios totales
                              </div>
                              <div className="text-sm text-gray-600">
                                Usados: {usedServices} • Restantes: {remainingServices}
                              </div>
                              {currentPlan.validityMonths && (
                                <div className="text-xs text-gray-500">
                                  Válido por {currentPlan.validityMonths} meses
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // Para planes mensuales tradicionales
                          if (currentPlan.maxMonthlyServices === null) {
                            return 'Ilimitados';
                          } else {
                            const monthlyLimit = currentPlan.maxMonthlyServices;
                            const monthlyUsed = lubricentro.servicesUsedThisMonth || 0;
                            const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);
                            
                            return (
                              <div>
                                <div className="text-lg font-medium">
                                  {monthlyLimit} servicios/mes
                                </div>
                                <div className="text-sm text-gray-600">
                                  Usados este mes: {monthlyUsed} • Restantes: {monthlyRemaining}
                                </div>
                              </div>
                            );
                          }
                        }
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* 🔧 NUEVA SECCIÓN: Información adicional para planes por servicios */}
                {lubricentro.subscriptionPlan && 
                dynamicPlans[lubricentro.subscriptionPlan]?.planType === 'service' && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      ℹ️ Información del Plan por Servicios
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Servicios Contratados:</span>
                        <div className="text-blue-900">
                          {lubricentro.totalServicesContracted || dynamicPlans[lubricentro.subscriptionPlan].totalServices || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Servicios Utilizados:</span>
                        <div className="text-blue-900">
                          {lubricentro.servicesUsed || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Servicios Restantes:</span>
                        <div className="text-blue-900 font-semibold">
                          {lubricentro.servicesRemaining || 0}
                        </div>
                      </div>
                    </div>
                    
                    {/* Barra de progreso para planes por servicios */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-blue-700 mb-1">
                        <span>Progreso de uso</span>
                        <span>
                          {lubricentro.servicesUsed || 0} / {lubricentro.totalServicesContracted || 0}
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${Math.min(100, ((lubricentro.servicesUsed || 0) / 
                              (lubricentro.totalServicesContracted || 1)) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Fecha de expiración para planes por servicios */}
                    {lubricentro.serviceSubscriptionExpiryDate && (
                      <div className="mt-2 text-xs text-blue-600">
                        <strong>Expira:</strong> {formatDate(lubricentro.serviceSubscriptionExpiryDate)}
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader title="Acciones Rápidas" />
              <CardBody>
                <div className="space-y-3">
                  <Button
                    color="primary"
                    fullWidth
                    onClick={() => setIsSubscriptionModalOpen(true)}
                    icon={<CreditCardIcon className="h-5 w-5" />}
                  >
                    Actualizar Suscripción
                  </Button>

                  <Button
                    color="success"
                    fullWidth
                    onClick={() => setIsPaymentModalOpen(true)}
                    icon={<CurrencyDollarIcon className="h-5 w-5" />}
                  >
                    Registrar Pago
                  </Button>

                  {lubricentro.estado === 'activo' ? (
                    <Button
                      color="error"
                      variant="outline"
                      fullWidth
                      onClick={() => handleChangeStatus('inactivo')}
                      icon={<XMarkIcon className="h-5 w-5" />}
                    >
                      Desactivar Suscripción
                    </Button>
                  ) : (
                    <Button
                      color="success"
                      variant="outline"
                      fullWidth
                      onClick={() => handleChangeStatus('activo')}
                      icon={<CheckIcon className="h-5 w-5" />}
                    >
                      Activar Suscripción
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
            
            <Card className="mt-6">
              <CardHeader title="Próximos Eventos" />
              <CardBody>
                <div className="space-y-4">
                  {lubricentro.billingCycleEndDate && (
                    <div className="flex items-start">
                      <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Fin del Ciclo de Facturación</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(lubricentro.billingCycleEndDate)}
                          {getDaysRemaining(lubricentro.billingCycleEndDate) > 0 &&
                            ` (en ${getDaysRemaining(lubricentro.billingCycleEndDate)} días)`}
                        </p>
                      </div>
                    </div>
                  )}

                  {lubricentro.nextPaymentDate && (
                    <div className="flex items-start">
                      <CreditCardIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Próximo Pago</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(lubricentro.nextPaymentDate)}
                          {getDaysRemaining(lubricentro.nextPaymentDate) > 0 &&
                            ` (en ${getDaysRemaining(lubricentro.nextPaymentDate)} días)`}
                        </p>
                      </div>
                    </div>
                  )}

                  {lubricentro.contractEndDate && (
                    <div className="flex items-start">
                      <DocumentCheckIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Fin del Contrato</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(lubricentro.contractEndDate)}
                          {getDaysRemaining(lubricentro.contractEndDate) > 0 &&
                            ` (en ${getDaysRemaining(lubricentro.contractEndDate)} días)`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
      
      {activeTab === 'payments' && (
        <Card>
          <CardHeader 
            title="Historial de Pagos" 
            subtitle="Registro de pagos realizados"
            action={
              <Button
                size="sm"
                color="success"
                onClick={() => setIsPaymentModalOpen(true)}
                icon={<CurrencyDollarIcon className="h-4 w-4" />}
              >
                Registrar Pago
              </Button>
            }
          />
          <CardBody>
            {lubricentro.paymentHistory && lubricentro.paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Método
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Referencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...lubricentro.paymentHistory]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((payment, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(payment.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${payment.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.method === 'transferencia' ? 'Transferencia Bancaria' :
                             payment.method === 'tarjeta' ? 'Tarjeta de Crédito/Débito' :
                             payment.method === 'efectivo' ? 'Efectivo' :
                             payment.method === 'mercadopago' ? 'MercadoPago' :
                             payment.method}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.reference}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pagos registrados</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comience registrando un pago para este lubricentro.
                </p>
                <div className="mt-6">
                  <Button color="success" onClick={() => setIsPaymentModalOpen(true)}>
                    Registrar Pago
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
      
      {activeTab === 'usage' && (
        <div className="space-y-6">
        <Card>
          <CardHeader title="Uso de Servicios" subtitle="Servicios utilizados en el período actual" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 🔧 PRIMERA COLUMNA: Información específica según tipo de plan */}
              <div>
                {(() => {
                  if (!lubricentro.subscriptionPlan || !dynamicPlans[lubricentro.subscriptionPlan]) {
                    return (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                        <div className="mt-1 text-lg font-medium text-gray-900">Sin plan asignado</div>
                      </div>
                    );
                  }
                  
                  const currentPlan = dynamicPlans[lubricentro.subscriptionPlan];
                  
                  if (currentPlan.planType === 'service') {
                    // 🔧 VISTA PARA PLANES POR SERVICIOS
                    const totalServices = lubricentro.totalServicesContracted || currentPlan.totalServices || 0;
                    const usedServices = lubricentro.servicesUsed || 0;
                    const remainingServices = lubricentro.servicesRemaining || (totalServices - usedServices);
                    
                    return (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Servicios del Paquete
                        </label>
                        <div className="mt-1 flex items-end">
                          <span className="text-3xl font-bold text-gray-900">
                            {usedServices}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            de {totalServices} servicios
                          </span>
                        </div>
                        
                        <div className="mt-2">
                          <div className="bg-gray-200 rounded-full h-2.5 w-full">
                            <div 
                              className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                              style={{ 
                                width: `${Math.min(100, totalServices > 0 ? (usedServices / totalServices) * 100 : 0)}%`
                              }}
                            ></div>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {remainingServices} servicios restantes
                          </p>
                        </div>
                        
                        {/* Información adicional del paquete */}
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-green-700">Paquete:</span>
                              <span className="font-medium text-green-900">{currentPlan.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-700">Precio pagado:</span>
                              <span className="font-medium text-green-900">
                                ${(currentPlan.servicePrice || 0).toLocaleString()}
                              </span>
                            </div>
                            {lubricentro.serviceSubscriptionExpiryDate && (
                              <div className="flex justify-between">
                                <span className="text-green-700">Expira:</span>
                                <span className="font-medium text-green-900">
                                  {formatDate(lubricentro.serviceSubscriptionExpiryDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // 🔧 VISTA PARA PLANES MENSUALES
                    const monthlyUsed = lubricentro.servicesUsedThisMonth || 0;
                    const monthlyLimit = currentPlan.maxMonthlyServices;
                    
                    return (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Servicios Usados (Mes Actual)
                        </label>
                        <div className="mt-1 flex items-end">
                          <span className="text-3xl font-bold text-gray-900">
                            {monthlyUsed}
                          </span>
                          {monthlyLimit !== null && (
                            <span className="ml-2 text-sm text-gray-500">
                              de {monthlyLimit} servicios
                            </span>
                          )}
                          {monthlyLimit === null && (
                            <span className="ml-2 text-sm text-gray-500">
                              servicios (ilimitados)
                            </span>
                          )}
                        </div>

                        {monthlyLimit !== null && (
                          <div className="mt-2">
                            <div className="bg-gray-200 rounded-full h-2.5 w-full">
                              <div 
                                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                                style={{ 
                                  width: `${Math.min(100, (monthlyUsed / monthlyLimit) * 100)}%`
                                }}
                              ></div>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {Math.max(0, monthlyLimit - monthlyUsed)} servicios disponibles este mes
                            </p>
                          </div>
                        )}
                        
                        {monthlyLimit === null && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700">
                              ✨ Plan con servicios ilimitados
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>

              {/* 🔧 SEGUNDA COLUMNA: Usuarios (sin cambios) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Usuarios Activos</label>
                <div className="mt-1 flex items-end">
                  <span className="text-3xl font-bold text-gray-900">
                    {lubricentro.activeUserCount || 0}
                  </span>
                  {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan] && (
                    <span className="ml-2 text-sm text-gray-500">
                      de {dynamicPlans[lubricentro.subscriptionPlan].maxUsers}
                    </span>
                  )}
                </div>

                {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan] && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2.5 w-full">
                      <div 
                        className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${Math.min(100, ((lubricentro.activeUserCount || 0) / 
                            dynamicPlans[lubricentro.subscriptionPlan].maxUsers) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {Math.max(0, dynamicPlans[lubricentro.subscriptionPlan].maxUsers - 
                        (lubricentro.activeUserCount || 0))} usuarios disponibles
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

          {lubricentro.servicesUsedHistory && Object.keys(lubricentro.servicesUsedHistory).length > 0 && (
            <Card>
              <CardHeader title="Historial de Uso" subtitle="Servicios utilizados por mes" />
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Servicios Realizados
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Limite
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Utilización
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(lubricentro.servicesUsedHistory)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([month, count]) => {
                          const [year, monthNum] = month.split('-');
                          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
                            .toLocaleDateString('es-ES', { month: 'long' });
                          
                          const limit = lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]
                            ? dynamicPlans[lubricentro.subscriptionPlan].maxMonthlyServices 
                            : null;
                          
                          const utilizationPercent = limit ? Math.min(100, (count / limit) * 100) : 0;
                          
                          return (
                            <tr key={month} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {count}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {limit === null ? 'Ilimitado' : limit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {limit === null ? (
                                  <span className="text-sm text-gray-900">N/A</span>
                                ) : (
                                  <div className="flex items-center">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                                      <div 
                                        className={`h-2.5 rounded-full ${
                                          utilizationPercent > 90 ? 'bg-red-600' : 
                                          utilizationPercent > 75 ? 'bg-yellow-500' : 
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${utilizationPercent}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm text-gray-900">
                                      {utilizationPercent.toFixed(0)}%
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
      
      <div className="mt-6">
        <Button
          color="secondary"
          variant="outline"
          onClick={() => navigate('/superadmin/lubricentros')}
          icon={<ChevronLeftIcon className="h-5 w-5" />}
        >
          Volver a la lista
        </Button>
      </div>
      
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleRecordPayment}
        lubricentro={lubricentro}
        loading={processing}
        dynamicPlans={dynamicPlans}
        loadingPlans={loadingPlans}
      />
      
      <UpdateSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onConfirm={handleUpdateSubscription}
        lubricentro={lubricentro}
        loading={processing}
        dynamicPlans={dynamicPlans}
      />
    </PageContainer>
  );
};

export default LubricentroSubscriptionPage;