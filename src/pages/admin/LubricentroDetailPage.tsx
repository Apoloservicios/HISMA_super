// src/pages/admin/LubricentroDetailPage.tsx
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
  Modal
} from '../../components/ui';

import { 
  getLubricentroById, 
  updateLubricentroStatus, 
  extendTrialPeriod,
  deleteLubricentro,
  updateLubricentro
} from '../../services/lubricentroService';

import { 
  getUsersByLubricentro 
} from '../../services/userService';

import {
  getOilChangesStats
} from '../../services/oilChangeService';

import {
  updateSubscription,
  recordPayment
} from '../../services/subscriptionService';

import { Lubricentro, LubricentroStatus, User, OilChangeStats } from '../../types';
import { SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../../types/subscription';

// Íconos
import { 
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ChartBarIcon,
  CalendarIcon,
  CreditCardIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import LubricentroSubscriptionPanel from '../../components/subscription/LubricentroSubscriptionPanel';

// Componente para confirmar eliminación
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  lubricentro: Lubricentro | null;
  loading: boolean;
}> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  if (!lubricentro) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Eliminar Lubricentro"
      size="sm"
      footer={
        <div className="flex justify-end space-x-2">
          <Button 
            color="secondary" 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            color="error"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                Eliminando...
              </>
            ) : (
              'Eliminar Permanentemente'
            )}
          </Button>
        </div>
      }
    >
      <div className="text-center sm:text-left py-4">
        <div className="mb-4">
          <div className="flex items-center justify-center sm:justify-start">
            <div className="mr-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">¿Eliminar permanentemente?</p>
              <p className="text-lg font-medium text-gray-900">{lubricentro.fantasyName}</p>
              <p className="text-sm text-gray-500">{lubricentro.domicilio}</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-4">
          Esta acción eliminará permanentemente el lubricentro y todos sus datos asociados. Esta acción no se puede deshacer.
        </p>
        
        <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
          <p className="text-sm text-red-800 font-medium">
            Se perderán:
          </p>
          <ul className="list-disc pl-5 mt-1 text-sm text-red-700">
            <li>Todos los cambios de aceite registrados</li>
            <li>Todos los usuarios asociados</li>
            <li>Todos los informes y estadísticas</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

// Componente para extender período de prueba
const ExtendTrialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (days: number) => Promise<void>;
  lubricentro: Lubricentro | null;
  loading: boolean;
}> = ({ isOpen, onClose, onConfirm, lubricentro, loading }) => {
  const [days, setDays] = useState(7);

  if (!lubricentro) return null;

  // Sin recibir evento para evitar errores de tipo
  const handleSubmit = () => {
    onConfirm(days);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Extender Período de Prueba"
      size="sm"
      footer={
        <div className="flex justify-end space-x-2">
          <Button 
            color="secondary" 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                Procesando...
              </>
            ) : (
              'Extender Período'
            )}
          </Button>
        </div>
      }
    >
      <div className="py-4">
        <div className="mb-4">
          <div className="flex items-center justify-center sm:justify-start">
            <div className="mr-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Extender período para:</p>
              <p className="text-lg font-medium text-gray-900">{lubricentro.fantasyName}</p>
              <p className="text-sm text-gray-500">{lubricentro.domicilio}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-1">
            Días a extender
          </label>
          <input
            type="number"
            id="days"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 7)}
            min={1}
            max={90}
            required
            className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
          <p className="mt-1 text-xs text-gray-500">
            Ingrese la cantidad de días para extender el período de prueba
          </p>
          
          {lubricentro.trialEndDate && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Fecha actual de finalización:</span> {' '}
                {new Date(lubricentro.trialEndDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <span className="font-medium">Nueva fecha de finalización:</span> {' '}
                {new Date(new Date(lubricentro.trialEndDate).getTime() + (days * 24 * 60 * 60 * 1000)).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Componente principal
const LubricentroDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<OilChangeStats | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  
  // Estados para modales
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExtendTrialModalOpen, setIsExtendTrialModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  
  // Cargar datos iniciales
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  // Cargar datos del lubricentro, usuarios y estadísticas
  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Cargar datos del lubricentro
      const lubricentroData = await getLubricentroById(id);
      setLubricentro(lubricentroData);
      
      // Cargar usuarios asociados
      const usersData = await getUsersByLubricentro(id);
      setUsers(usersData);
      
      // Cargar estadísticas
      try {
        const statsData = await getOilChangesStats(id);
        setStats(statsData);
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        // No fallamos toda la carga por esto
      }
      
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos del lubricentro. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cambiar estado del lubricentro
  const handleChangeStatus = async (status: LubricentroStatus) => {
    if (!id) return;
    
    try {
      setProcessingAction(true);
      await updateLubricentroStatus(id, status);
      
      // Recargar datos
      await loadData();
      
      setSuccess(`Estado del lubricentro cambiado a ${status}`);
      
    } catch (err) {
      console.error('Error al cambiar el estado del lubricentro:', err);
      setError('Error al cambiar el estado del lubricentro');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Extender período de prueba
  const handleExtendTrial = async (days: number) => {
    if (!id) return;
    
    try {
      setProcessingAction(true);
      await extendTrialPeriod(id, days);
      
      // Recargar datos
      await loadData();
      
      setIsExtendTrialModalOpen(false);
      setSuccess(`Período de prueba extendido por ${days} días`);
    } catch (err) {
      console.error('Error al extender el período de prueba:', err);
      setError('Error al extender el período de prueba');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Eliminar lubricentro
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setProcessingAction(true);
      await deleteLubricentro(id);
      
      // Redirigir a la lista de lubricentros
      navigate('/superadmin/lubricentros', { replace: true });
    } catch (err) {
      console.error('Error al eliminar el lubricentro:', err);
      setError('Error al eliminar el lubricentro');
      setIsDeleteModalOpen(false);
    } finally {
      setProcessingAction(false);
    }
  };

  // Función para cambiar el plan de suscripción
const handleChangePlan = async (plan: SubscriptionPlanType) => {
  if (!id) return;
  
  // Solo continuar si hay un cambio de plan
  if (lubricentro?.subscriptionPlan === plan) {
    return;
  }
  
  try {
    setProcessingAction(true);
    
    // 🔧 CORRECCIÓN: Determinar el tipo de renovación manejando 'service'
    let renewalType: 'monthly' | 'semiannual' = 'monthly';
    
    const currentRenewalType = lubricentro?.subscriptionRenewalType;
    if (currentRenewalType === 'monthly' || currentRenewalType === 'semiannual') {
      renewalType = currentRenewalType;
    } else {
      // Para 'service' o undefined, usar 'monthly' como default
      renewalType = 'monthly';
    }
    
    // Determinar la renovación automática (mantener o activar por defecto)
    const autoRenewal = lubricentro?.autoRenewal !== false;
    
    // Llamar al servicio para actualizar la suscripción
    if (!lubricentro) return;
    await updateSubscription(
      lubricentro.id,
      plan,
      renewalType, // ✅ Ahora es seguro porque siempre es 'monthly' | 'semiannual'
      autoRenewal
    );
    
    // Si necesitas registrar el cambio como pago, hazlo por separado:
    await recordPayment(
      lubricentro.id,
      0, // Sin costo adicional por cambio de plan
      'admin_update',
      `plan_change_${Date.now()}`
    );
    
    // Recargar datos
    await loadData();
    
    setSuccess(`Plan actualizado a ${SUBSCRIPTION_PLANS[plan].name}`);
  } catch (err) {
    console.error('Error al cambiar el plan de suscripción:', err);
    setError('Error al cambiar el plan de suscripción');
  } finally {
    setProcessingAction(false);
  }
};

  // Función para renovar el ciclo de facturación
  const handleUpdateBillingCycle = async () => {
    if (!id) return;
    
    try {
      setProcessingAction(true);
      
      // Obtener la fecha actual
      const now = new Date();
      
      // Calcular nueva fecha de fin de ciclo
      const newBillingEnd = new Date(now);
      const cycleMonths = lubricentro?.subscriptionRenewalType === 'semiannual' ? 6 : 1;
      newBillingEnd.setMonth(newBillingEnd.getMonth() + cycleMonths);
      
      // Actualizar el lubricentro
      await updateLubricentro(id, {
        billingCycleEndDate: newBillingEnd,
        nextPaymentDate: newBillingEnd,
        paymentStatus: 'paid',
        lastPaymentDate: now,
        estado: 'activo' // Asegurar que esté activo
      } as Partial<Lubricentro>);
      
      // Recargar datos
      await loadData();
      
      setSuccess('Ciclo de facturación renovado correctamente');
    } catch (err) {
      console.error('Error al renovar ciclo de facturación:', err);
      setError('Error al renovar el ciclo de facturación');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Formatear fecha
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Obtener días restantes
  const getDaysRemaining = (endDate: Date | undefined): number => {
    if (!endDate) return 0;
    
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };
  
  // Obtener clase CSS de badge según estado
  const getStatusBadgeClass = (status: LubricentroStatus): string => {
    switch (status) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactivo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <PageContainer title="Detalle de Lubricentro">
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
      title={lubricentro.fantasyName}
      subtitle={lubricentro.domicilio}
      action={
        <div className="flex space-x-2">
          <Button
            color="primary"
            icon={<PencilIcon className="h-5 w-5" />}
            onClick={() => navigate(`/superadmin/lubricentros/editar/${id}`)}
          >
            Editar
          </Button>
          <Button
            color="info"
            icon={<CreditCardIcon className="h-5 w-5" />}
            onClick={() => navigate(`/superadmin/lubricentros/suscripcion/${id}`)}
          >
            Gestionar Suscripción
          </Button>
          <Button
            color="error"
            variant="outline"
            icon={<TrashIcon className="h-5 w-5" />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Eliminar
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
      
      {/* Estado y acciones rápidas */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusBadgeClass(lubricentro.estado)}`}>
            {lubricentro.estado === 'activo' ? 'Activo' : 
             lubricentro.estado === 'trial' ? 'Período de Prueba' : 
             'Inactivo'}
          </div>
          
          {lubricentro.estado === 'trial' && lubricentro.trialEndDate && (
            <span className="ml-2 text-sm text-gray-500">
              (Expira: {formatDate(lubricentro.trialEndDate)} - 
              {getDaysRemaining(lubricentro.trialEndDate) > 0 
                ? ` ${getDaysRemaining(lubricentro.trialEndDate)} días restantes` 
                : ' Expirado'})
            </span>
          )}
        </div>
        
        <div className="flex space-x-2">
          {lubricentro.estado !== 'activo' && (
            <Button
              size="sm"
              color="success"
              onClick={() => handleChangeStatus('activo')}
              disabled={processingAction}
              icon={<CheckIcon className="h-4 w-4" />}
            >
              Activar
            </Button>
          )}
          
          {lubricentro.estado !== 'inactivo' && (
            <Button
              size="sm"
              color="error"
              onClick={() => handleChangeStatus('inactivo')}
              disabled={processingAction}
              icon={<XMarkIcon className="h-4 w-4" />}
            >
              Desactivar
            </Button>
          )}
          
          {lubricentro.estado === 'trial' && (
            <Button
              size="sm"
              color="warning"
              onClick={() => setIsExtendTrialModalOpen(true)}
              disabled={processingAction}
              icon={<ClockIcon className="h-4 w-4" />}
            >
              Extender Prueba
            </Button>
          )}
        </div>
      </div>
      
      {/* Tabs para navegar entre secciones */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'info', label: 'Información' },
          { id: 'users', label: 'Usuarios' },
          { id: 'stats', label: 'Estadísticas' },
          { id: 'suscripcion', label: 'Suscripción' }, // Nueva pestaña
        ]}
        className="mb-6"
      />
      
      {/* Contenido de la pestaña Información */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Información básica */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader title="Información del Lubricentro" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Nombre del Lubricentro</label>
                      <div className="mt-1 flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">{lubricentro.fantasyName}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Responsable</label>
                      <div className="mt-1 flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">{lubricentro.responsable}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">CUIT</label>
                      <div className="mt-1 flex items-center">
                        <IdentificationIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">{lubricentro.cuit}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Domicilio</label>
                      <div className="mt-1 flex items-center">
                        <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">{lubricentro.domicilio}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <div className="mt-1 flex items-center">
                        <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">{lubricentro.phone}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 flex items-center">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">{lubricentro.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            {/* Información del sistema */}
            <Card className="mt-6">
              <CardHeader title="Datos del Sistema" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">ID del Lubricentro</label>
                      <div className="mt-1">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-900">{lubricentro.id}</code>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">ID del Propietario</label>
                      <div className="mt-1">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-900">{lubricentro.ownerId}</code>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Prefijo de Tickets</label>
                      <div className="mt-1">
                        <span className="text-gray-900 font-medium">{lubricentro.ticketPrefix}</span>
                        <span className="text-xs text-gray-500 ml-2">(Ejemplo: {lubricentro.ticketPrefix}-00001)</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Estado de la Cuenta</label>
                      <div className="mt-1">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(lubricentro.estado)}`}>
                          {lubricentro.estado === 'activo' ? 'Activo' : 
                          lubricentro.estado === 'trial' ? 'Período de Prueba' : 
                          'Inactivo'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            {/* Fechas importantes */}
            <Card className="mt-6">
              <CardHeader title="Fechas Importantes" />
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                    <div className="mt-1">
                      <span className="text-gray-900">{formatDate(lubricentro.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Última Actualización</label>
                    <div className="mt-1">
                      <span className="text-gray-900">{formatDate(lubricentro.updatedAt)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fin de Período de Prueba</label>
                    <div className="mt-1">
                      {lubricentro.estado === 'trial' && lubricentro.trialEndDate ? (
                        <div>
                          <span className="text-gray-900">{formatDate(lubricentro.trialEndDate)}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({getDaysRemaining(lubricentro.trialEndDate) > 0 
                              ? `${getDaysRemaining(lubricentro.trialEndDate)} días restantes` 
                              : 'Expirado'})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">No aplicable</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
          
          {/* Columna lateral */}
          <div>
            {/* Logo */}
            <Card>
              <CardHeader title="Logo" />
              <CardBody className="flex justify-center items-center p-6">
                {lubricentro.logoUrl ? (
                  <img 
                    src={lubricentro.logoUrl} 
                    alt={lubricentro.fantasyName} 
                    className="max-w-full max-h-48"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-md">
                    <BuildingOfficeIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </CardBody>
            </Card>
            
            {/* Resumen de actividad */}
            <Card className="mt-6">
              <CardHeader title="Resumen de Actividad" />
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total de Cambios de Aceite</label>
                    <div className="mt-1 flex items-center">
                      <span className="text-2xl font-semibold text-primary-600">{stats?.total || 0}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cambios este Mes</label>
                    <div className="mt-1 flex items-center">
                      <span className="text-xl font-medium text-gray-900">{stats?.thisMonth || 0}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Usuarios Registrados</label>
                    <div className="mt-1 flex items-center">
                      <span className="text-xl font-medium text-gray-900">{users.length}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            {/* Acciones */}
            <Card className="mt-6">
              <CardHeader title="Acciones" />
              <CardBody>
                <div className="space-y-3">
                  <Button
                    color="primary"
                    fullWidth
                    icon={<PencilIcon className="h-5 w-5" />}
                    onClick={() => navigate(`/superadmin/lubricentros/editar/${id}`)}
                  >
                    Editar Información
                  </Button>
                  
                  <Button
                    color="info"
                    fullWidth
                    icon={<CreditCardIcon className="h-5 w-5" />}
                    onClick={() => navigate(`/superadmin/lubricentros/suscripcion/${id}`)}
                  >
                    Gestionar Suscripción
                  </Button>
                  
                  {lubricentro.estado === 'trial' && (
                    <Button
                      color="warning"
                      fullWidth
                      icon={<ClockIcon className="h-5 w-5" />}
                      onClick={() => setIsExtendTrialModalOpen(true)}
                    >
                      Extender Período de Prueba
                    </Button>
                  )}
                  
                  {lubricentro.estado !== 'activo' && (
                    <Button
                      color="success"
                      fullWidth
                      icon={<CheckIcon className="h-5 w-5" />}
                      onClick={() => handleChangeStatus('activo')}
                    >
                      Activar Lubricentro
                    </Button>
                  )}
                  
                  {lubricentro.estado !== 'inactivo' && (
                    <Button
                      color="error"
                      variant="outline"
                      fullWidth
                      icon={<XMarkIcon className="h-5 w-5" />}
                      onClick={() => handleChangeStatus('inactivo')}
                    >
                      Desactivar Lubricentro
                    </Button>
                  )}
                  
                  <Button
                    color="error"
                    fullWidth
                    icon={<TrashIcon className="h-5 w-5" />}
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    Eliminar Permanentemente
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
      
      {/* Contenido de la pestaña Usuarios */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader 
            title="Usuarios del Lubricentro" 
            subtitle={`Mostrando ${users.length} usuarios registrados`}
            action={
              <Button
                size="sm"
                color="primary"
                icon={<UserIcon className="h-4 w-4" />}
                onClick={() => navigate(`/superadmin/usuarios?lubricentroId=${id}`)}
              >
                Gestionar Usuarios
              </Button>
            }
          />
          <CardBody>
            {users.length > 0 ? (
              <div className="overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {user.photoURL ? (
                                <img 
                                  className="h-10 w-10 rounded-full" 
                                  src={user.photoURL} 
                                  alt={`${user.nombre} ${user.apellido}`} 
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                  <span className="text-primary-800 font-medium text-sm">
                                    {user.nombre.charAt(0)}{user.apellido.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.nombre} {user.apellido}
                              </div>
                              {user.id === lubricentro.ownerId && (
                                <div className="text-xs text-primary-600">
                                  Propietario
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.role === 'admin' ? 'Administrador' : 
                             user.role === 'superadmin' ? 'Super Admin' : 
                             'Empleado'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.estado === 'activo' ? 'bg-green-100 text-green-800' : 
                            user.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {user.estado === 'activo' ? 'Activo' : 
                             user.estado === 'pendiente' ? 'Pendiente' : 
                             'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No se encontraron usuarios registrados para este lubricentro.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      )}
      
      {/* Contenido de la pestaña Estadísticas */}
      {activeTab === 'stats' && (
        <div>
          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-green-100 mr-4">
                    <ChartBarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total de Cambios</p>
                    <p className="text-3xl font-semibold text-gray-900">{stats?.total || 0}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-blue-100 mr-4">
                    <CalendarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Este Mes</p>
                    <p className="text-3xl font-semibold text-gray-900">{stats?.thisMonth || 0}</p>
                    {stats && stats.lastMonth > 0 && (
                      <div className="flex items-center mt-1">
                        {stats.thisMonth > stats.lastMonth ? (
                          <>
                            <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            <span className="text-xs text-green-500 ml-1">
                              {Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)}% vs mes anterior
                            </span>
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            <span className="text-xs text-red-500 ml-1">
                              {Math.round(((stats.lastMonth - stats.thisMonth) / stats.lastMonth) * 100)}% vs mes anterior
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-yellow-100 mr-4">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Próximos 30 días</p>
                    <p className="text-3xl font-semibold text-gray-900">{stats?.upcoming30Days || 0}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
          
          {/* Gráfico mensual y comparativa */}
          <Card>
            <CardHeader title="Comparativa Mensual" />
            <CardBody>
              {stats ? (
                <div className="h-64">
                  <div className="flex h-full items-end">
                    <div className="flex-1 flex flex-col items-center">
                      <div className="text-sm text-gray-500 mb-2">Mes Anterior</div>
                      <div className="bg-gray-200 w-20 rounded-t-md" style={{ height: `${Math.min(200, stats.lastMonth * 10)}px` }}></div>
                      <div className="mt-2 text-lg font-medium">{stats.lastMonth}</div>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center">
                      <div className="text-sm text-gray-500 mb-2">Mes Actual</div>
                      <div className="bg-primary-500 w-20 rounded-t-md" style={{ height: `${Math.min(200, stats.thisMonth * 10)}px` }}></div>
                      <div className="mt-2 text-lg font-medium">{stats.thisMonth}</div>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center">
                      <div className="text-sm text-gray-500 mb-2">Próximos 30 días</div>
                      <div className="bg-yellow-400 w-20 rounded-t-md" style={{ height: `${Math.min(200, stats.upcoming30Days * 10)}px` }}></div>
                      <div className="mt-2 text-lg font-medium">{stats.upcoming30Days}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay datos</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay datos estadísticos disponibles para este lubricentro.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
      
     {activeTab === 'suscripcion' && (
        <LubricentroSubscriptionPanel 
          lubricentro={lubricentro} 
          onRefresh={loadData} 
        />
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
      
      {/* Modales */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        lubricentro={lubricentro}
        loading={processingAction}
      />
      
      <ExtendTrialModal
        isOpen={isExtendTrialModalOpen}
        onClose={() => setIsExtendTrialModalOpen(false)}
        onConfirm={handleExtendTrial}
        lubricentro={lubricentro}
        loading={processingAction}
      />
    </PageContainer>
  );
};

export default LubricentroDetailPage;
