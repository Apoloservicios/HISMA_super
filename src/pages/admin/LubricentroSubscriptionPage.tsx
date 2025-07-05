// src/pages/admin/LubricentroSubscriptionPage.tsx
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
import { getSubscriptionPlans, invalidatePlansCache } from '../../services/hybridSubscriptionService';

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

// Modal para actualizar suscripción
const UpdateSubscriptionModal: React.FC<UpdateSubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  lubricentro, 
  loading,
  dynamicPlans
}) => {
  const [plan, setPlan] = useState<SubscriptionPlanType>('basic');
  const [renewalType, setRenewalType] = useState<'monthly' | 'semiannual'>('monthly');
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lubricentro) {
      setPlan(lubricentro.subscriptionPlan || 'basic');
      setRenewalType(lubricentro.subscriptionRenewalType || 'monthly');
      setAutoRenewal(lubricentro.autoRenewal !== false);
    }
  }, [lubricentro, dynamicPlans]);

  const handleSubmit = async () => {
    try {
      await onConfirm(plan, renewalType, autoRenewal);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la suscripción');
    }
  };

  const calculatePrice = (): number => {
    const planData = dynamicPlans[plan];
    if (!planData) return 0;
    
    if (planData.planType === 'service' && planData.servicePrice) {
      return planData.servicePrice;
    }
    
    return renewalType === 'monthly' ? planData.price.monthly : planData.price.semiannual;
  };

  const isCurrentPlanService = (planId: SubscriptionPlanType): boolean => {
    return dynamicPlans[planId]?.planType === 'service';
  };

  if (!lubricentro) return null;

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(dynamicPlans).map(([planId, planData]) => {
              const isServicePlan = planData.planType === 'service';
              return (
                <div 
                  key={planId}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors
                    ${plan === planId ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setPlan(planId as SubscriptionPlanType)}
                >
                  <h3 className="text-lg font-medium text-gray-900">{planData.name}</h3>
                  
                  {isServicePlan ? (
                    <>
                      <p className="text-sm text-primary-600 font-medium">
                        ${(planData.servicePrice || 0).toLocaleString()} - Pago único
                      </p>
                      <p className="text-xs text-gray-500">
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
                      <p className="text-sm text-gray-500">
                        ${planData.price.monthly.toLocaleString()} /mes
                      </p>
                      {planData.price.semiannual && (
                        <p className="text-xs text-gray-400">
                          ${planData.price.semiannual.toLocaleString()} /semestral
                        </p>
                      )}
                    </>
                  )}
                  
                  {/* Mostrar límites según el tipo de plan */}
                  {isServicePlan ? (
                    // Para planes por servicios, mostrar servicios totales
                    planData.totalServices && (
                      <p className="text-xs text-gray-500 mt-1">
                        {planData.totalServices} servicios incluidos
                      </p>
                    )
                  ) : (
                    // Para planes mensuales, mostrar límite mensual
                    <>
                      {planData.maxMonthlyServices && (
                        <p className="text-xs text-gray-500 mt-1">
                          {planData.maxMonthlyServices} servicios/mes
                        </p>
                      )}
                      
                      {planData.maxMonthlyServices === null && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          Servicios ilimitados
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!isCurrentPlanService(plan) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ciclo de Facturación
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors
                  ${renewalType === 'monthly' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setRenewalType('monthly')}
              >
                <h3 className="text-lg font-medium text-gray-900">Mensual</h3>
                <p className="text-sm text-gray-500">Facturación cada mes</p>
              </div>
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors
                  ${renewalType === 'semiannual' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setRenewalType('semiannual')}
              >
                <h3 className="text-lg font-medium text-gray-900">Semestral</h3>
                <p className="text-sm text-gray-500">Facturación cada 6 meses</p>
              </div>
            </div>
          </div>
        )}

        {!isCurrentPlanService(plan) && (
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRenewal}
                onChange={(e) => setAutoRenewal(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-900">
                Renovación automática
              </span>
            </label>
          </div>
        )}
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Resumen</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">{dynamicPlans[plan]?.name || 'Plan no disponible'}</span>
            </div>
            
            {isCurrentPlanService(plan) ? (
              <>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span className="font-medium">Pago único por servicios</span>
                </div>
                <div className="flex justify-between">
                  <span>Servicios:</span>
                  <span className="font-medium">{dynamicPlans[plan]?.totalServices || 0}</span>
                </div>
                {dynamicPlans[plan]?.validityMonths && (
                  <div className="flex justify-between">
                    <span>Validez:</span>
                    <span className="font-medium">{dynamicPlans[plan].validityMonths} meses</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between">
                <span>Facturación:</span>
                <span className="font-medium">{renewalType === 'monthly' ? 'Mensual' : 'Semestral'}</span>
              </div>
            )}
            
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-primary-600">${calculatePrice().toLocaleString()}</span>
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
  
  const [dynamicPlans, setDynamicPlans] = useState<Record<SubscriptionPlanType, SubscriptionPlan>>({
    starter: { 
      id: 'starter', 
      name: 'Cargando...', 
      description: '', 
      planType: PlanType.MONTHLY,
      price: { monthly: 0, semiannual: 0 }, 
      maxUsers: 0, 
      maxMonthlyServices: 0, 
      features: [] 
    },
    basic: { 
      id: 'basic', 
      name: 'Cargando...', 
      description: '', 
      planType: PlanType.MONTHLY,
      price: { monthly: 0, semiannual: 0 }, 
      maxUsers: 0, 
      maxMonthlyServices: 0, 
      features: [] 
    },
    premium: { 
      id: 'premium', 
      name: 'Cargando...', 
      description: '', 
      planType: PlanType.MONTHLY,
      price: { monthly: 0, semiannual: 0 }, 
      maxUsers: 0, 
      maxMonthlyServices: 0, 
      features: [] 
    },
    enterprise: { 
      id: 'enterprise', 
      name: 'Cargando...', 
      description: '', 
      planType: PlanType.MONTHLY,
      price: { monthly: 0, semiannual: 0 }, 
      maxUsers: 0, 
      maxMonthlyServices: 0, 
      features: [] 
    }
  });
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setLoadingPlans(true);
      setError(null);
      
      invalidatePlansCache();
      
      const [lubricentroData, plansData] = await Promise.all([
        getLubricentroById(id),
        getSubscriptionPlans()
      ]);
      
      setLubricentro(lubricentroData);
      setDynamicPlans(plansData);
      
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos del lubricentro. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
      setLoadingPlans(false);
    }
  };
  
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
      
      const paymentAmount = calculatePrice(plan, renewalType);
      
      await updateSubscription(lubricentro.id, plan, renewalType, autoRenewal);
      
      if (paymentAmount > 0) {
        await recordPayment(lubricentro.id, paymentAmount, 'admin_update', `admin_update_${Date.now()}`);
      }
      
      await loadData();
      setIsSubscriptionModalOpen(false);
      setSuccess('Suscripción actualizada correctamente');
    } catch (err: any) {
      console.error('Error al actualizar la suscripción:', err);
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
      await recordPayment(lubricentro.id, amount, method, reference);
      await loadData();
      setIsPaymentModalOpen(false);
      setSuccess('Pago registrado correctamente');
    } catch (err: any) {
      console.error('Error al registrar el pago:', err);
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
                    <label className="block text-sm font-medium text-gray-700">Límite de Servicios Mensuales</label>
                    <div className="mt-1 text-lg font-medium text-gray-900">
                      {lubricentro.subscriptionPlan && dynamicPlans[lubricentro.subscriptionPlan]
                        ? dynamicPlans[lubricentro.subscriptionPlan].maxMonthlyServices === null
                          ? 'Ilimitados'
                          : `${dynamicPlans[lubricentro.subscriptionPlan].maxMonthlyServices} servicios`
                        : 'No definido'}
                    </div>
                  </div>
                </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Servicios Usados (Mes Actual)
                  </label>
                  <div className="mt-1 flex items-end">
                    <span className="text-3xl font-bold text-gray-900">
                      {lubricentro.servicesUsedThisMonth || 0}
                    </span>
                    {lubricentro.subscriptionPlan && 
                     dynamicPlans[lubricentro.subscriptionPlan] &&
                     dynamicPlans[lubricentro.subscriptionPlan].maxMonthlyServices !== null && (
                      <span className="ml-2 text-sm text-gray-500">
                        de {dynamicPlans[lubricentro.subscriptionPlan].maxMonthlyServices}
                      </span>
                    )}
                  </div>

                  {lubricentro.subscriptionPlan && 
                   dynamicPlans[lubricentro.subscriptionPlan] &&
                   dynamicPlans[lubricentro.subscriptionPlan].maxMonthlyServices !== null && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-2.5 w-full">
                        <div 
                          className="bg-primary-600 h-2.5 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, ((lubricentro.servicesUsedThisMonth || 0) / 
                              (dynamicPlans[lubricentro.subscriptionPlan]?.maxMonthlyServices || 100)) * 100)}%`
                          }}
                        ></div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {Math.max(0, (dynamicPlans[lubricentro.subscriptionPlan]?.maxMonthlyServices || 0) - 
                          (lubricentro.servicesUsedThisMonth || 0))} servicios disponibles
                      </p>
                    </div>
                  )}
                </div>

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
                          className="bg-primary-600 h-2.5 rounded-full" 
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