// src/pages/admin/PaymentManagementPage.tsx - VERSIÓN MEJORADA
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getLubricentroById } from '../../services/lubricentroService';
import { getSubscriptionPlans } from '../../services/hybridSubscriptionService';
import { Card, CardBody, PageContainer, Button, Badge, Alert } from '../../components/ui';
import { Lubricentro } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';

// Componentes
import { PaymentActivator } from '../../components/admin/PaymentActivator';
import { PaymentMethodSelector } from '../../components/admin/PaymentMethodSelector';
import { TransferPaymentUpload } from '../../components/admin/TransferPaymentUpload';
import { PaymentHistory } from '../../components/admin/PaymentHistory';

// Iconos
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface LubricentroInfo {
  id: string;
  fantasyName: string;
  estado: string;
  servicesRemaining: number;
  lastPaymentDate?: Date;
  paymentStatus?: string;
  subscriptionPlan?: string;
  // Campos adicionales para validación
  totalServicesContracted?: number;
  servicesUsed?: number;
  serviceSubscriptionExpiryDate?: Date;
  servicesUsedThisMonth?: number;
  maxMonthlyServices?: number; // ✅ CORREGIDO: Permitir number | undefined
  trialEndDate?: Date;
  email?:string;
}

interface RenewalConditions {
  needsRenewal: boolean;
  reasons: string[];
  canPurchase: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export const PaymentManagementPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [lubricentroInfo, setLubricentroInfo] = useState<LubricentroInfo | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Record<string, SubscriptionPlan>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mercadopago' | 'transfer'>('mercadopago');
  const [renewalConditions, setRenewalConditions] = useState<RenewalConditions | null>(null);

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

    // 2. Verificar período de prueba
    if (info.estado === 'trial') {
      needsRenewal = true;
      canPurchase = true;
      
      if (info.trialEndDate) {
        const daysRemaining = Math.ceil((new Date(info.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          urgency = 'critical';
          reasons.push('El período de prueba ha expirado');
        } else if (daysRemaining <= 2) {
          urgency = 'high';
          reasons.push(`El período de prueba expira en ${daysRemaining} días`);
        } else {
          urgency = 'medium';
          reasons.push(`Período de prueba activo (${daysRemaining} días restantes)`);
        }
      } else {
        urgency = 'medium';
        reasons.push('Período de prueba activo');
      }
    }

    // 3. Verificar servicios restantes (planes por servicios)
    if (info.servicesRemaining !== undefined) {
      if (info.servicesRemaining <= 0) {
        needsRenewal = true;
        canPurchase = true;
        urgency = 'critical';
        reasons.push('Se han agotado los servicios contratados');
      } else if (info.servicesRemaining <= 5) {
        needsRenewal = true;
        canPurchase = true;
        urgency = 'high';
        reasons.push(`Quedan solo ${info.servicesRemaining} servicios`);
      } else if (info.servicesRemaining <= 20) {
        canPurchase = true;
        urgency = 'medium';
        reasons.push(`Servicios disponibles: ${info.servicesRemaining}`);
      }
    }

    // 4. Verificar límites mensuales (planes mensuales)
    if (info.maxMonthlyServices && info.servicesUsedThisMonth !== undefined) {
      const remaining = info.maxMonthlyServices - info.servicesUsedThisMonth;
      if (remaining <= 0) {
        needsRenewal = true;
        canPurchase = true;
        urgency = 'high';
        reasons.push('Se alcanzó el límite mensual de servicios');
      } else if (remaining <= 5) {
        canPurchase = true;
        urgency = 'medium';
        reasons.push(`Quedan ${remaining} servicios este mes`);
      }
    }

    // 5. Verificar fechas de expiración
    if (info.serviceSubscriptionExpiryDate) {
      const expiryDate = new Date(info.serviceSubscriptionExpiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        needsRenewal = true;
        canPurchase = true;
        urgency = 'critical';
        reasons.push('La suscripción ha expirado');
      } else if (daysUntilExpiry <= 7) {
        needsRenewal = true;
        canPurchase = true;
        urgency = 'high';
        reasons.push(`La suscripción expira en ${daysUntilExpiry} días`);
      } else if (daysUntilExpiry <= 30) {
        canPurchase = true;
        urgency = 'medium';
        reasons.push(`La suscripción expira en ${daysUntilExpiry} días`);
      }
    }

    // 6. Si todo está bien pero puede comprar más
    if (!needsRenewal && !canPurchase && info.estado === 'activo') {
      canPurchase = true;
      urgency = 'low';
      reasons.push('Puede agregar más servicios o mejorar su plan');
    }

    return {
      needsRenewal,
      reasons,
      canPurchase,
      urgency
    };
  };

  // Cargar información del lubricentro y planes disponibles
  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.lubricentroId) {
        setLoading(false);
        return;
      }

      try {
        console.log('📊 Cargando información del lubricentro y planes...');
        
        // Cargar información del lubricentro
        const lubricentro = await getLubricentroById(userProfile.lubricentroId);
        
        // Cargar planes dinámicos desde Firebase
        const plans = await getSubscriptionPlans();
        
        if (lubricentro) {
          const info: LubricentroInfo = {
            id: lubricentro.id,
            fantasyName: lubricentro.fantasyName,
            estado: lubricentro.estado,
            servicesRemaining: lubricentro.servicesRemaining || 0,
            lastPaymentDate: lubricentro.lastPaymentDate,
            paymentStatus: (lubricentro as any).paymentStatus,
            subscriptionPlan: lubricentro.subscriptionPlan,
            // ✅ CAMPOS ADICIONALES para evaluación
            totalServicesContracted: lubricentro.totalServicesContracted,
            servicesUsed: lubricentro.servicesUsed,
            serviceSubscriptionExpiryDate: lubricentro.serviceSubscriptionExpiryDate,
            servicesUsedThisMonth: lubricentro.servicesUsedThisMonth,
            maxMonthlyServices: lubricentro.maxMonthlyServices || undefined, // ✅ CORREGIDO
            trialEndDate: lubricentro.trialEndDate
          };
          
          setLubricentroInfo(info);
          
          // ✅ EVALUAR condiciones de renovación
          const conditions = evaluateRenewalConditions(info);
          setRenewalConditions(conditions);
          
          console.log('🔍 Condiciones de renovación:', conditions);
        }

        setAvailablePlans(plans);
        console.log('✅ Datos cargados:', { 
          lubricentro: lubricentro?.fantasyName, 
          plansCount: Object.keys(plans).length 
        });
        
      } catch (error) {
        console.error('❌ Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userProfile?.lubricentroId, refreshKey]);

  const handlePaymentSuccess = () => {
    console.log('✅ Pago procesado exitosamente, refrescando datos...');
    setRefreshKey(prev => prev + 1);
  };

  // ✅ FUNCIÓN: Renderizar alerta de estado
  const renderStatusAlert = () => {
    if (!renewalConditions) return null;

    const { needsRenewal, reasons, canPurchase, urgency } = renewalConditions;

    if (!needsRenewal && !canPurchase) return null;

    const getAlertProps = () => {
      switch (urgency) {
        case 'critical':
          return { type: 'error' as const, icon: XCircleIcon, bgColor: 'bg-red-50', textColor: 'text-red-800' };
        case 'high':
          return { type: 'warning' as const, icon: ExclamationTriangleIcon, bgColor: 'bg-orange-50', textColor: 'text-orange-800' };
        case 'medium':
          return { type: 'warning' as const, icon: ClockIcon, bgColor: 'bg-yellow-50', textColor: 'text-yellow-800' };
        default:
          return { type: 'info' as const, icon: CheckCircleIcon, bgColor: 'bg-blue-50', textColor: 'text-blue-800' };
      }
    };

    const alertProps = getAlertProps();

    return (
      <div className={`${alertProps.bgColor} border border-opacity-20 rounded-lg p-4 mb-6`}>
        <div className="flex items-start">
          <alertProps.icon className={`h-6 w-6 ${alertProps.textColor} mr-3 mt-0.5`} />
          <div className="flex-1">
            <h3 className={`font-medium ${alertProps.textColor} mb-2`}>
              {needsRenewal ? '⚠️ Renovación Necesaria' : '💡 Opciones Disponibles'}
            </h3>
            <ul className={`text-sm ${alertProps.textColor} space-y-1`}>
              {reasons.map((reason, index) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
            
            {canPurchase && (
              <div className="mt-3">
                <Badge 
                  text={needsRenewal ? 'Renovación habilitada' : 'Compra disponible'}
                  color={needsRenewal ? 'error' : 'warning'}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ✅ FUNCIÓN: Filtrar planes disponibles
  const getAvailablePlansToShow = () => {
    if (!renewalConditions?.canPurchase) {
      return {}; // No mostrar planes si no puede comprar
    }

    // Mostrar todos los planes disponibles cuando puede comprar
    return availablePlans;
  };

  if (loading) {
    return (
      <PageContainer title="Gestión de Pagos">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando información...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!userProfile?.lubricentroId) {
    return (
      <PageContainer title="Acceso Restringido">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Acceso Restringido
              </h2>
              <p className="text-gray-500">
                Esta página es solo para administradores de lubricentros.
              </p>
            </div>
          </CardBody>
        </Card>
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
                    lubricentroInfo.servicesRemaining < 10 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {lubricentroInfo.servicesRemaining}
                  </div>
                  <p className="text-sm text-gray-600">Servicios Disponibles</p>
                </div>

                {/* Plan Actual */}
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600 mb-1">
                    {lubricentroInfo.subscriptionPlan || 'Sin Plan'}
                  </div>
                  <p className="text-sm text-gray-600">Plan Actual</p>
                </div>

                {/* Estado de Pago */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600 mb-1">
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

              {/* ✅ INFORMACIÓN ADICIONAL detallada */}
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

        {/* ✅ SELECTOR Y OPCIONES DE PAGO - Solo si puede comprar */}
        {showPaymentOptions ? (
          <>
            {/* Selector de Método de Pago */}
            <PaymentMethodSelector
              selectedMethod={selectedPaymentMethod}
              onMethodChange={setSelectedPaymentMethod}
            />

            {/* Renderizar componente según método seleccionado */}
            {selectedPaymentMethod === 'mercadopago' ? (
              <PaymentActivator
                lubricentroId={userProfile.lubricentroId}
                availablePlans={plansToShow}
                onSuccess={handlePaymentSuccess}
                userEmail={userProfile.email || lubricentroInfo?.email} // ✅ PASAR EMAIL REAL
                fantasyName={lubricentroInfo?.fantasyName} // ✅ PASAR NOMBRE REAL
              />
            ) : (
              <TransferPaymentUpload
                lubricentroId={userProfile.lubricentroId}
                availablePlans={plansToShow}
                onSuccess={handlePaymentSuccess}
              />
            )}
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
        <PaymentHistory lubricentroId={userProfile.lubricentroId} />

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
                    `Hola! Necesito ayuda con la activación de servicios en mi lubricentro: ${lubricentroInfo?.fantasyName || 'Mi Lubricentro'}`
                  );
                  window.open(`https://wa.me/5492604515854?text=${whatsappMessage}`, '_blank');
                }}
                className="bg-green-600 hover:bg-green-700 text-white p-4 h-auto"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💬</div>
                  <div className="font-medium">Soporte WhatsApp</div>
                  <div className="text-sm opacity-75">Ayuda inmediata</div>
                </div>
              </Button>

              <Button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="bg-gray-600 hover:bg-gray-700 text-white p-4 h-auto"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🔄</div>
                  <div className="font-medium">Actualizar Estado</div>
                  <div className="text-sm opacity-75">Refrescar datos</div>
                </div>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
};