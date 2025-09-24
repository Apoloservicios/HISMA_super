// src/pages/admin/PaymentManagementPage.tsx - CÓDIGO COMPLETO
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getLubricentroById } from '../../services/lubricentroService';
import { getSubscriptionPlans } from '../../services/hybridSubscriptionService';
import { Card, CardBody, PageContainer, Button, Badge, Alert } from '../../components/ui';
import { Lubricentro } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';

// Componentes
import { PaymentActivator } from '../../components/admin/PaymentActivator';
import { TransferPaymentUpload } from '../../components/admin/TransferPaymentUpload';
import { PaymentHistory } from '../../components/admin/PaymentHistory';
import TransferPaymentEmailForm from '../../components/admin/TransferPaymentEmailForm';

import CouponPaymentActivator from '../../components/admin/CouponPaymentActivator';



// Iconos
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  GiftIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface LubricentroInfo {
  id: string;
  fantasyName: string;
  estado: string;
  servicesRemaining?: number; // ✅ CORREGIDO: Hacer opcional con ?
  lastPaymentDate?: Date;
  paymentStatus?: string;
  subscriptionPlan?: string;
  totalServicesContracted?: number;
  servicesUsed?: number;
  serviceSubscriptionExpiryDate?: Date;
  servicesUsedThisMonth?: number;
  maxMonthlyServices?: number;
  trialEndDate?: Date;
  email?: string;
}

interface RenewalConditions {
  needsRenewal: boolean;
  reasons: string[];
  canPurchase: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

const PaymentManagementPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [lubricentroInfo, setLubricentroInfo] = useState<LubricentroInfo | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Record<string, SubscriptionPlan>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mercadopago' | 'transfer' | 'coupon' | null>(null);
  const [renewalConditions, setRenewalConditions] = useState<RenewalConditions | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // ✅ FUNCIÓN: Evaluar condiciones de renovación
  const evaluateRenewalConditions = (info: LubricentroInfo): RenewalConditions => {
    const reasons: string[] = [];
    let needsRenewal = false;
    let canPurchase = false;
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // 1. Verificar estado del lubricentro
    if (info.estado === 'inactivo') {
      needsRenewal = true;
      canPurchase = true;
      urgency = 'critical';
      reasons.push('El lubricentro está inactivo');
    }

    // 2. Verificar servicios restantes
    const servicesRemaining = info.servicesRemaining || 0; // ✅ CORREGIDO: Manejar undefined
    if (servicesRemaining <= 0) {
      needsRenewal = true;
      canPurchase = true;
      urgency = urgency === 'critical' ? 'critical' : 'high';
      reasons.push('No tienes servicios restantes');
    } else if (servicesRemaining <= 5) {
      needsRenewal = true;
      canPurchase = true;
      urgency = urgency === 'critical' ? 'critical' : 'medium';
      reasons.push('Pocos servicios restantes');
    }

    // 3. Verificar fecha de vencimiento
    if (info.serviceSubscriptionExpiryDate) {
      const expiryDate = new Date(info.serviceSubscriptionExpiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        needsRenewal = true;
        canPurchase = true;
        urgency = 'critical';
        reasons.push('Tu suscripción ha expirado');
      } else if (daysUntilExpiry <= 7) {
        needsRenewal = true;
        canPurchase = true;
        urgency = urgency === 'critical' ? 'critical' : 'high';
        reasons.push(`Tu suscripción expira en ${daysUntilExpiry} días`);
      } else if (daysUntilExpiry <= 30) {
        canPurchase = true;
        urgency = 'medium';
        reasons.push(`Tu suscripción expira en ${daysUntilExpiry} días`);
      }
    }

    // 4. Verificar período de prueba
    if (info.trialEndDate) {
      const trialEnd = new Date(info.trialEndDate);
      const today = new Date();
      const daysUntilTrialEnd = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilTrialEnd <= 0) {
        needsRenewal = true;
        canPurchase = true;
        urgency = 'critical';
        reasons.push('Tu período de prueba ha finalizado');
      } else if (daysUntilTrialEnd <= 3) {
        needsRenewal = true;
        canPurchase = true;
        urgency = 'high';
        reasons.push(`Tu período de prueba termina en ${daysUntilTrialEnd} días`);
      }
    }

    // Si no hay razones específicas pero puede comprar, permitir compras opcionales
    if (reasons.length === 0) {
      canPurchase = true;
      urgency = 'low';
    }

    return {
      needsRenewal,
      reasons,
      canPurchase,
      urgency
    };
  };

  // ✅ FUNCIÓN: Cargar datos del lubricentro
  const loadLubricentroData = async () => {
    if (!userProfile?.lubricentroId) return;

    try {
      setLoading(true);
      const data = await getLubricentroById(userProfile.lubricentroId);
      
      // ✅ MAPEO SEGURO: Convertir Lubricentro a LubricentroInfo
      const lubricentroInfo: LubricentroInfo = {
        id: data.id,
        fantasyName: data.fantasyName || 'Sin nombre', // ✅ CORREGIDO: Solo fantasyName
        estado: data.estado || 'inactivo',
        servicesRemaining: data.servicesRemaining,
        lastPaymentDate: data.lastPaymentDate,
        paymentStatus: data.paymentStatus,
        subscriptionPlan: data.subscriptionPlan,
        totalServicesContracted: data.totalServicesContracted,
        servicesUsed: data.servicesUsed,
        serviceSubscriptionExpiryDate: data.serviceSubscriptionExpiryDate,
        servicesUsedThisMonth: data.servicesUsedThisMonth,
        maxMonthlyServices: data.maxMonthlyServices || undefined, // ✅ CORREGIDO: Convertir null a undefined
        trialEndDate: data.trialEndDate,
        email: data.email
      };
      
      setLubricentroInfo(lubricentroInfo);

      // Evaluar condiciones de renovación
      const conditions = evaluateRenewalConditions(lubricentroInfo);
      setRenewalConditions(conditions);

    } catch (error) {
      console.error('Error al cargar datos del lubricentro:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN: Cargar planes disponibles
  const loadAvailablePlans = async () => {
    try {
      const plans = await getSubscriptionPlans();
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Error al cargar planes:', error);
    }
  };

  // ✅ EFFECT: Cargar datos iniciales
  useEffect(() => {
    loadLubricentroData();
    loadAvailablePlans();
  }, [userProfile?.lubricentroId, refreshKey]);

  // ✅ FUNCIÓN: Manejar éxito de pago
  const handlePaymentSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setSelectedPlan(null);
  };

  // ✅ FUNCIÓN: Obtener planes disponibles para mostrar
  const getAvailablePlansToShow = (): Record<string, SubscriptionPlan> => {
    if (!renewalConditions?.canPurchase) return {};
    return availablePlans;
  };

  // ✅ FUNCIÓN: Renderizar alerta de estado
  const renderStatusAlert = () => {
    if (!renewalConditions) return null;

    const { needsRenewal, reasons, urgency } = renewalConditions;

    if (!needsRenewal) return null;

    const alertConfig = {
      critical: { type: 'error' as const, icon: XCircleIcon, title: '🚨 Acción Urgente Requerida' },
      high: { type: 'warning' as const, icon: ExclamationTriangleIcon, title: '⚠️ Atención Necesaria' },
      medium: { type: 'warning' as const, icon: ClockIcon, title: '📅 Renovación Recomendada' },
      low: { type: 'info' as const, icon: CheckCircleIcon, title: '💡 Información' }
    };

    const config = alertConfig[urgency];

    return (
      <Alert type={config.type} className="mb-6">
        <div className="flex items-start">
          <config.icon className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium mb-2">{config.title}</h3>
            <ul className="space-y-1">
              {reasons.map((reason, index) => (
                <li key={index} className="text-sm">• {reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </Alert>
    );
  };

  // ✅ FUNCTION: Verificar si el usuario tiene datos válidos
  if (!userProfile?.lubricentroId) {
    return (
      <PageContainer title="Gestión de Pagos">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">No se encontró información del lubricentro</div>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Gestión de Pagos">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando información...</div>
        </div>
      </PageContainer>
    );
  }

  const plansToShow = getAvailablePlansToShow();
  const showPaymentOptions = renewalConditions?.canPurchase && Object.keys(plansToShow).length > 0;

  return (
    <PageContainer title="Gestión de Pagos y Suscripciones">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2">Gestión de Pagos</h1>
          <p className="text-blue-100">
            Administra los servicios y pagos de tu lubricentro
          </p>
        </div>

        {/* ✅ ALERTA DE ESTADO */}
        {renderStatusAlert()}

        {/* Estado Actual del Lubricentro */}
        {lubricentroInfo && (
          <Card>
            <CardBody>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Estado Actual</h2>
                  <p className="text-gray-600">{lubricentroInfo.fantasyName}</p>
                </div>
                <Button
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2"
                >
                  🔄 Actualizar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Estado */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                    lubricentroInfo.estado === 'activo'
                      ? 'bg-green-100 text-green-800'
                      : lubricentroInfo.estado === 'trial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {lubricentroInfo.estado === 'activo' ? '✅' : 
                     lubricentroInfo.estado === 'trial' ? '⏳' : '❌'} {lubricentroInfo.estado}
                  </div>
                  <p className="text-sm text-gray-600">Estado del Lubricentro</p>
                </div>

                {/* Servicios Disponibles */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className={`text-3xl font-bold mb-1 ${
                    (lubricentroInfo.servicesRemaining || 0) < 10 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {lubricentroInfo.servicesRemaining || 0}
                  </div>
                  <p className="text-sm text-gray-600">Servicios Restantes</p>
                </div>

                {/* Servicios Usados Este Mes */}
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {lubricentroInfo.servicesUsedThisMonth || 0}
                  </div>
                  <p className="text-sm text-gray-600">Usados Este Mes</p>
                </div>

                {/* Estado de Pago */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                    lubricentroInfo.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {lubricentroInfo.paymentStatus === 'paid' ? 'Al día' : 'Pendiente'}
                  </div>
                  <p className="text-sm text-gray-600">
                    {lubricentroInfo.lastPaymentDate
                      ? `Último pago: ${new Date(lubricentroInfo.lastPaymentDate).toLocaleDateString()}`
                      : 'Estado de Pago'
                    }
                  </p>
                </div>
              </div>

              {/* Información adicional detallada */}
              {(lubricentroInfo.totalServicesContracted || lubricentroInfo.servicesUsedThisMonth !== undefined) && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">📊 Detalles de Uso</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {lubricentroInfo.totalServicesContracted && (
                      <div>
                        <span className="text-gray-600">Total contratado:</span>
                        <div className="font-bold text-gray-900">{lubricentroInfo.totalServicesContracted}</div>
                      </div>
                    )}
                    
                    {lubricentroInfo.servicesUsed !== undefined && (
                      <div>
                        <span className="text-gray-600">Utilizados:</span>
                        <div className="font-bold text-gray-900">{lubricentroInfo.servicesUsed}</div>
                      </div>
                    )}
                    
                    {lubricentroInfo.servicesUsedThisMonth !== undefined && (
                      <div>
                        <span className="text-gray-600">Este mes:</span>
                        <div className="font-bold text-gray-900">{lubricentroInfo.servicesUsedThisMonth}</div>
                      </div>
                    )}
                    
                    {lubricentroInfo.serviceSubscriptionExpiryDate && (
                      <div>
                        <span className="text-gray-600">Vencimiento:</span>
                        <div className="font-bold text-gray-900">
                          {new Date(lubricentroInfo.serviceSubscriptionExpiryDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Selector y opciones de pago - Solo si puede comprar */}
        {showPaymentOptions ? (
          <>
            {/* Selector de Método de Pago ACTUALIZADO CON CUPONES */}
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4">💳 Método de Pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Botón Cupón - NUEVO */}
                  <button
                    className={`p-4 border-2 rounded-lg transition-all relative ${
                      selectedPaymentMethod === 'coupon'
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
                    }`}
                    onClick={() => setSelectedPaymentMethod('coupon')}
                  >
                    <div className="absolute -top-2 -right-2">
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold animate-pulse">
                        ¡NUEVO!
                      </span>
                    </div>
                    <div className="text-center">
                      <GiftIcon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <h4 className="font-semibold">Cupón</h4>
                      <p className="text-sm text-gray-600">Sin costo - Patrocinado</p>
                      <p className="text-xs text-purple-600 mt-1 font-medium">Activación inmediata</p>
                    </div>
                  </button>

                  {/* Botón MercadoPago - EXISTENTE */}
                  <button
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedPaymentMethod === 'mercadopago'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                    onClick={() => setSelectedPaymentMethod('mercadopago')}
                  >
                    <div className="text-center">
                      <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <h4 className="font-semibold">MercadoPago</h4>
                      <p className="text-sm text-gray-600">Tarjetas y efectivo</p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">Activación instantánea</p>
                    </div>
                  </button>

                  {/* Botón Transferencia - EXISTENTE */}
                  <button
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedPaymentMethod === 'transfer'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
                    }`}
                    onClick={() => setSelectedPaymentMethod('transfer')}
                  >
                    <div className="text-center">
                      <BanknotesIcon className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <h4 className="font-semibold">Transferencia</h4>
                      <p className="text-sm text-gray-600">Bancaria tradicional</p>
                      <p className="text-xs text-orange-600 mt-1 font-medium">Activación en 24-48hs</p>
                    </div>
                  </button>
                </div>
              </CardBody>
            </Card>

            {/* Renderizar componente según método seleccionado */}
            <div className="mt-6">
              {selectedPaymentMethod === 'coupon' ? (
                <CouponPaymentActivator
                  lubricentroId={userProfile?.lubricentroId || ''}
                  onSuccess={handlePaymentSuccess}
                  lubricentroInfo={{
                    fantasyName: lubricentroInfo?.fantasyName,
                    email: userProfile?.email || lubricentroInfo?.email
                  }}
                />
              ) : selectedPaymentMethod === 'mercadopago' ? (
                <PaymentActivator
                  lubricentroId={userProfile?.lubricentroId || ''}
                  availablePlans={plansToShow}
                  onSuccess={handlePaymentSuccess}
                  userEmail={userProfile?.email || lubricentroInfo?.email}
                  fantasyName={lubricentroInfo?.fantasyName}
                />
              ) : selectedPaymentMethod === 'transfer' ? (
                // Formulario de transferencia existente
                <div className="space-y-6">
                  {!selectedPlan ? (
                    <Card>
                      <CardBody>
                        <h3 className="text-lg font-semibold mb-4">💰 Selecciona el plan para transferencia</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.values(plansToShow).map((plan: any) => (
                            <div 
                              key={plan.id}
                              className="border border-gray-200 rounded-lg p-4 hover:border-green-500 cursor-pointer transition-colors"
                              onClick={() => setSelectedPlan(plan)}
                            >
                              <h4 className="font-semibold text-lg text-gray-900">{plan.name}</h4>
                              <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
                              <div className="text-2xl font-bold text-green-600 mb-3">
                                ${plan.price?.monthly?.toLocaleString() || 'Consultar'}
                                {plan.planType !== 'service' && <span className="text-sm font-normal">/mes</span>}
                              </div>
                              <Button 
                                color="primary" 
                                className="w-full"
                                onClick={() => setSelectedPlan(plan)}
                              >
                                Pagar por Transferencia
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        color="secondary"
                        variant="outline"
                        onClick={() => setSelectedPlan(null)}
                        className="flex items-center"
                      >
                        ← Cambiar plan
                      </Button>

                      <TransferPaymentEmailForm
                        selectedPlan={selectedPlan}
                        onSuccess={() => {
                          setSelectedPlan(null);
                          handlePaymentSuccess();
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // Mensaje cuando no hay método seleccionado
                <Card>
                  <CardBody>
                    <div className="text-center py-8 text-gray-500">
                      <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>Selecciona un método de pago para continuar</p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          </>
        ) : (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <ShieldCheckIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  ¡Todo está en orden!
                </h3>
                <p className="text-gray-600 mb-4">
                  Tu suscripción está activa y no necesitas renovar en este momento.
                </p>
                <p className="text-sm text-gray-500">
                  Puedes revisar tu historial de pagos más abajo.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Historial de Pagos */}
        <PaymentHistory lubricentroId={userProfile?.lubricentroId || ''} />

        {/* Consejos de Uso */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold mb-4">💡 Consejos de Uso</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-800 mb-3">📱 Pago con MercadoPago</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Selecciona tu plan preferido</li>
                  <li>Completa el pago en MercadoPago</li>
                  <li>Copia el Payment ID</li>
                  <li>Activa instantáneamente tus servicios</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-green-800 mb-3">🏦 Pago por Transferencia</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Selecciona tu plan preferido</li>
                  <li>Realiza la transferencia bancaria</li>
                  <li>Sube el comprobante de pago</li>
                  <li>Espera la activación manual (24-48hs)</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">✅ Ventajas de nuestro sistema:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Activación instantánea con MercadoPago</li>
                <li>• Flexibilidad para pagar por transferencia</li>
                <li>• Evaluación automática de necesidades de renovación</li>
                <li>• Historial completo de todos los pagos</li>
                <li>• Soporte técnico especializado</li>
              </ul>
            </div>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold mb-4">🚀 Acciones Rápidas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => window.open('https://www.mercadopago.com.ar', '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💳</div>
                  <div className="font-medium">Ir a MercadoPago</div>
                  <div className="text-sm opacity-75">Realizar pagos</div>
                </div>
              </Button>

              <Button
                onClick={() => {
                  const whatsappMessage = encodeURIComponent(
                    `Hola! Necesito ayuda con los pagos de mi lubricentro ${lubricentroInfo?.fantasyName}. Gracias!`
                  );
                  window.open(`https://wa.me/542604515854?text=${whatsappMessage}`, '_blank');
                }}
                className="bg-green-600 hover:bg-green-700 text-white p-4 h-auto"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💬</div>
                  <div className="font-medium">Contactar Soporte</div>
                  <div className="text-sm opacity-75">WhatsApp</div>
                </div>
              </Button>

              <Button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="bg-gray-600 hover:bg-gray-700 text-white p-4 h-auto"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🔄</div>
                  <div className="font-medium">Actualizar</div>
                  <div className="text-sm opacity-75">Recargar datos</div>
                </div>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
};

export default PaymentManagementPage;