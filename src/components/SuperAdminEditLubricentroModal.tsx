// src/components/SuperAdminEditLubricentroModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Spinner } from '../components/ui';
import { updateLubricentro } from '../services/lubricentroService';
import { Lubricentro } from '../types';
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  CalendarIcon,
  CreditCardIcon,
  CogIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface SuperAdminEditLubricentroModalProps {
  isOpen: boolean;
  onClose: () => void;
  lubricentro: Lubricentro | null;
  onSuccess: () => void;
}

interface EditFormData {
  // Información básica
  fantasyName: string;
  responsable: string;
  domicilio: string;
  cuit: string;
  phone: string;
  email: string;
  ticketPrefix: string;
  
  // Estado y configuración
  estado: 'activo' | 'inactivo' | 'trial';
  subscriptionPlan: string;
  totalServicesContracted: number;
  servicesUsed: number;
  servicesRemaining: number;
  
  // Fechas importantes
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  billingCycleEndDate: string;
  trialEndDate: string;
  
  // Configuración de membresía
  paymentStatus: 'paid' | 'pending' | 'overdue';
  subscriptionRenewalType?: 'monthly' | 'semiannual' | 'annual' | 'service';
  autoRenewal: boolean;
  
  // Contadores y límites
  activeUserCount: number;
  servicesUsedThisMonth: number;
}

const SuperAdminEditLubricentroModal: React.FC<SuperAdminEditLubricentroModalProps> = ({
  isOpen,
  onClose,
  lubricentro,
  onSuccess
}) => {
  const [formData, setFormData] = useState<EditFormData>({
    fantasyName: '',
    responsable: '',
    domicilio: '',
    cuit: '',
    phone: '',
    email: '',
    ticketPrefix: '',
    estado: 'activo',
    subscriptionPlan: '',
    totalServicesContracted: 0,
    servicesUsed: 0,
    servicesRemaining: 0,
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    billingCycleEndDate: '',
    trialEndDate: '',
    paymentStatus: 'paid',
    subscriptionRenewalType: 'monthly',
    autoRenewal: false,
    activeUserCount: 1,
    servicesUsedThisMonth: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'subscription' | 'dates'>('basic');

  // Cargar datos del lubricentro cuando se abre el modal
  useEffect(() => {
    if (lubricentro && isOpen) {
      setFormData({
        fantasyName: lubricentro.fantasyName || '',
        responsable: lubricentro.responsable || '',
        domicilio: lubricentro.domicilio || '',
        cuit: lubricentro.cuit || '',
        phone: lubricentro.phone || '',
        email: lubricentro.email || '',
        ticketPrefix: lubricentro.ticketPrefix || '',
        estado: lubricentro.estado || 'activo',
        subscriptionPlan: lubricentro.subscriptionPlan || '',
        totalServicesContracted: lubricentro.totalServicesContracted || 0,
        servicesUsed: lubricentro.servicesUsed || 0,
        servicesRemaining: lubricentro.servicesRemaining || 0,
        subscriptionStartDate: lubricentro.subscriptionStartDate 
          ? new Date(lubricentro.subscriptionStartDate).toISOString().split('T')[0] 
          : '',
        subscriptionEndDate: lubricentro.subscriptionEndDate 
          ? new Date(lubricentro.subscriptionEndDate).toISOString().split('T')[0] 
          : '',
        billingCycleEndDate: lubricentro.billingCycleEndDate 
          ? new Date(lubricentro.billingCycleEndDate).toISOString().split('T')[0] 
          : '',
        trialEndDate: lubricentro.trialEndDate 
          ? new Date(lubricentro.trialEndDate).toISOString().split('T')[0] 
          : '',
        paymentStatus: lubricentro.paymentStatus || 'paid',
        subscriptionRenewalType: lubricentro.subscriptionRenewalType || 'monthly',
        autoRenewal: lubricentro.autoRenewal || false,
        activeUserCount: lubricentro.activeUserCount || 1,
        servicesUsedThisMonth: lubricentro.servicesUsedThisMonth || 0
      });
      setError(null);
      setSuccess(null);
    }
  }, [lubricentro, isOpen]);

  const handleInputChange = (field: keyof EditFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lubricentro?.id) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Preparar datos para actualizar
      const updateData: Partial<Lubricentro> = {
        // Información básica
        fantasyName: formData.fantasyName,
        responsable: formData.responsable,
        domicilio: formData.domicilio,
        cuit: formData.cuit,
        phone: formData.phone,
        email: formData.email,
        ticketPrefix: formData.ticketPrefix,
        
        // Estado y configuración
        estado: formData.estado as any,
        subscriptionPlan: formData.subscriptionPlan,
        totalServicesContracted: formData.totalServicesContracted,
        servicesUsed: formData.servicesUsed,
        servicesRemaining: formData.servicesRemaining,
        
        // Fechas importantes (convertir a Date objects)
        subscriptionStartDate: formData.subscriptionStartDate ? new Date(formData.subscriptionStartDate) : undefined,
        subscriptionEndDate: formData.subscriptionEndDate ? new Date(formData.subscriptionEndDate) : undefined,
        billingCycleEndDate: formData.billingCycleEndDate ? new Date(formData.billingCycleEndDate) : undefined,
        trialEndDate: formData.trialEndDate ? new Date(formData.trialEndDate) : undefined,
        
        // Configuración de membresía
        paymentStatus: formData.paymentStatus as any,
        subscriptionRenewalType: formData.subscriptionRenewalType as any,
        autoRenewal: formData.autoRenewal,
        
        // Contadores
        activeUserCount: formData.activeUserCount,
        servicesUsedThisMonth: formData.servicesUsedThisMonth,
        
        // Actualizar timestamp
        updatedAt: new Date()
      };

      // Actualizar en Firebase
      await updateLubricentro(lubricentro.id, updateData);
      
      setSuccess('Lubricentro actualizado correctamente');
      
      // Llamar callback de éxito después de un breve delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Error al actualizar lubricentro:', err);
      setError(err.message || 'Error al actualizar el lubricentro');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Información Básica', icon: PencilIcon },
    { id: 'subscription', label: 'Suscripción', icon: CreditCardIcon },
    { id: 'dates', label: 'Fechas', icon: CalendarIcon }
  ] as const;

  if (!isOpen || !lubricentro) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Lubricentro: ${lubricentro.fantasyName}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Alertas */}
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert type="success" dismissible onDismiss={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenido de las pestañas */}
        <div className="mt-6">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Fantasía *
                </label>
                <input
                  type="text"
                  value={formData.fantasyName}
                  onChange={(e) => handleInputChange('fantasyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsable Legal *
                </label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(e) => handleInputChange('responsable', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUIT *
                </label>
                <input
                  type="text"
                  value={formData.cuit}
                  onChange={(e) => handleInputChange('cuit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefijo de Ticket *
                </label>
                <input
                  type="text"
                  value={formData.ticketPrefix}
                  onChange={(e) => handleInputChange('ticketPrefix', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domicilio *
                </label>
                <input
                  type="text"
                  value={formData.domicilio}
                  onChange={(e) => handleInputChange('domicilio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="trial">Período de Prueba</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuarios Activos
                </label>
                <input
                  type="number"
                  value={formData.activeUserCount}
                  onChange={(e) => handleInputChange('activeUserCount', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan de Suscripción
                </label>
                <input
                  type="text"
                  value={formData.subscriptionPlan}
                  onChange={(e) => handleInputChange('subscriptionPlan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: P100, PLAN250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado de Pago
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="paid">Pagado</option>
                  <option value="pending">Pendiente</option>
                  <option value="overdue">Vencido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicios Contratados
                </label>
                <input
                  type="number"
                  value={formData.totalServicesContracted}
                  onChange={(e) => handleInputChange('totalServicesContracted', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicios Utilizados
                </label>
                <input
                  type="number"
                  value={formData.servicesUsed}
                  onChange={(e) => handleInputChange('servicesUsed', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicios Restantes
                </label>
                <input
                  type="number"
                  value={formData.servicesRemaining}
                  onChange={(e) => handleInputChange('servicesRemaining', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicios Usados Este Mes
                </label>
                <input
                  type="number"
                  value={formData.servicesUsedThisMonth}
                  onChange={(e) => handleInputChange('servicesUsedThisMonth', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Renovación
                </label>
                <select
                  value={formData.subscriptionRenewalType}
                  onChange={(e) => handleInputChange('subscriptionRenewalType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Mensual</option>
                  <option value="semiannual">Semestral</option>
                  <option value="annual">Anual</option>
                  <option value="service">Por Servicios</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRenewal"
                  checked={formData.autoRenewal}
                  onChange={(e) => handleInputChange('autoRenewal', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRenewal" className="text-sm text-gray-700">
                  Renovación Automática
                </label>
              </div>
            </div>
          )}

          {activeTab === 'dates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inicio de Suscripción
                </label>
                <input
                  type="date"
                  value={formData.subscriptionStartDate}
                  onChange={(e) => handleInputChange('subscriptionStartDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin de Suscripción
                </label>
                <input
                  type="date"
                  value={formData.subscriptionEndDate}
                  onChange={(e) => handleInputChange('subscriptionEndDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin del Ciclo de Facturación
                </label>
                <input
                  type="date"
                  value={formData.billingCycleEndDate}
                  onChange={(e) => handleInputChange('billingCycleEndDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin del Período de Prueba
                </label>
                <input
                  type="date"
                  value={formData.trialEndDate}
                  onChange={(e) => handleInputChange('trialEndDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {        /* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            color="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="solid"
            color="primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SuperAdminEditLubricentroModal;