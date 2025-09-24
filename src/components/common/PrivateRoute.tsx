// src/components/common/PrivateRoute.tsx - VERSIÓN ACTUALIZADA PARA CUPONES
import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLubricentroById } from '../../services/lubricentroService';
import { UserRole, Lubricentro } from '../../types';
import { Alert, Button } from '../ui';

// Componente de carga
const LoadingScreen = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

// ✅ ACTUALIZADO: Rutas permitidas para usuarios con suscripción expirada/limitada
const isAllowedRouteForLimitedAccess = (pathname: string): boolean => {
  const allowedRoutes = [
    '/dashboard',           // ✅ CRÍTICO: Permitir dashboard (botones de renovación/cupones)
    '/perfil',              
    '/usuarios',            
    '/admin',               // Panel de administración
    '/pagos',               // ✅ NUEVO: Sección de pagos/cupones
    '/suscripcion',         // ✅ NUEVO: Gestión de suscripción
  ];

  // Permitir rutas de visualización (no creación/edición)
  const isViewRoute = Boolean(pathname.match(/^\/cambios-aceite\/[^\/]+$/)) && 
                     !pathname.includes('/nuevo') && 
                     !pathname.includes('/editar') &&
                     !pathname.includes('/clone');

  return allowedRoutes.some(route => pathname.startsWith(route)) || isViewRoute;
};

// ✅ ACTUALIZADO: Pantalla para cuando el período de prueba ha expirado
const TrialExpiredScreen = ({ lubricentro }: { lubricentro: Lubricentro }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Período de Prueba Expirado
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          El período de prueba gratuita de {lubricentro.fantasyName} ha finalizado. 
          Para continuar utilizando el sistema, debe activar su suscripción.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💳 Opciones de Activación</h4>
          <p className="text-sm text-blue-700 mb-3">
            Puedes activar tu suscripción de varias maneras:
          </p>
          <div className="space-y-1 text-xs text-blue-600">
            <p>🎁 Con cupón de distribuidor</p>
            <p>💳 Pago con MercadoPago</p>
            <p>📧 Contactar soporte: ventas@hisma.com.ar</p>
            <p>📱 WhatsApp: +54 (260) 4515854</p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            color="primary"
            fullWidth
            onClick={() => window.location.href = '/dashboard'}
          >
            Ir a Activar Suscripción
          </Button>
          <Button
            color="success"
            variant="outline"
            fullWidth
            onClick={() => window.open('https://wa.me/5492604515854?text=' + encodeURIComponent(`Hola, necesito activar la suscripción para ${lubricentro.fantasyName}`))}
          >
            Contactar por WhatsApp
          </Button>
        </div>
      </div>
    </div>
  </div>
);

// Componente para verificación de email
const EmailVerificationRequired = () => {
  const { currentUser, sendVerificationEmail } = useAuth();
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleResendVerification = async () => {
    try {
      setSendingVerification(true);
      await sendVerificationEmail();
      setVerificationSent(true);
    } catch (error) {
      console.error('Error al reenviar verificación:', error);
    } finally {
      setSendingVerification(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Verificación de Email Requerida
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Para acceder al sistema, debe verificar su dirección de correo electrónico.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Hemos enviado un enlace de verificación a: <br />
            <strong>{currentUser?.email}</strong>
          </p>
          
          {verificationSent && (
            <Alert type="success" className="mb-4">
              Correo de verificación reenviado. Revisa tu bandeja de entrada.
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              color="primary"
              fullWidth
              onClick={handleRefresh}
            >
              Ya Verifiqué mi Email
            </Button>
            <Button
              variant="outline"
              color="primary"
              fullWidth
              onClick={handleResendVerification}
              disabled={sendingVerification}
            >
              {sendingVerification ? 'Enviando...' : 'Reenviar Verificación'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ ACTUALIZADO: Componente para límite de servicios alcanzado
const ServiceLimitReachedScreen = ({ 
  lubricentro, 
  currentServices, 
  limit, 
  hasUnlimitedServices 
}: { 
  lubricentro: Lubricentro; 
  currentServices: number; 
  limit: number | null;
  hasUnlimitedServices: boolean;
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
          <svg className="h-6 w-6 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {lubricentro.estado === 'trial' ? 'Límite de Prueba Alcanzado' : 'Límite de Plan Alcanzado'}
        </h3>
        
        {lubricentro.estado === 'trial' ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Has utilizado <strong>{currentServices} de {limit}</strong> servicios disponibles durante el período de prueba.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Para continuar registrando cambios de aceite, necesitas activar tu suscripción.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Has alcanzado el límite de <strong>{limit}</strong> servicios de tu plan actual este mes.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Considera upgrade a un plan superior o espera al próximo ciclo.
            </p>
          </>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            {lubricentro.estado === 'trial' ? '🎁 Activa tu cuenta' : '⬆️ Mejora tu plan'}
          </h4>
          <p className="text-sm text-blue-700 mb-3">
            {lubricentro.estado === 'trial' 
              ? 'Usa un cupón de distribuidor o contacta soporte para activar tu cuenta.'
              : 'Contacta soporte para upgrade o gestiona tu suscripción desde el dashboard.'
            }
          </p>
          <div className="space-y-1">
            <p className="text-xs text-blue-600">📧 ventas@hisma.com.ar</p>
            <p className="text-xs text-blue-600">📱 +54 (260) 4515854</p>
          </div>
        </div>

        <div className="space-y-3">
          {lubricentro.estado === 'trial' ? (
            <Button
              color="primary"
              fullWidth
              onClick={() => window.location.href = '/dashboard'}
            >
              Activar con Cupón
            </Button>
          ) : (
            <Button
              color="primary"
              fullWidth
              onClick={() => window.location.href = '/dashboard'}
            >
              Ver Opciones de Upgrade
            </Button>
          )}
          <Button
            color="success"
            variant="outline"
            fullWidth
            onClick={() => window.open('https://wa.me/5492604515854?text=' + encodeURIComponent(`Hola, necesito ayuda con mi plan para ${lubricentro.fantasyName}`))}
          >
            Contactar Soporte
          </Button>
        </div>
      </div>
    </div>
  </div>
);

// ✅ NUEVA FUNCIÓN: Verificar límites de servicios de manera unificada
const checkServiceLimits = (lubricentro: Lubricentro, isCreationRoute: boolean) => {
  if (!isCreationRoute) {
    return { canProceed: true, reason: '' };
  }

  const currentServices = lubricentro.servicesUsedThisMonth || 0;

  // ✅ CASO 1: Período de prueba
  if (lubricentro.estado === 'trial') {
    const trialLimit = 10; // Constante del sistema
    
    if (currentServices >= trialLimit) {
      return {
        canProceed: false,
        reason: 'trial_limit',
        data: { currentServices, limit: trialLimit, hasUnlimitedServices: false }
      };
    }
    return { canProceed: true, reason: 'trial_ok' };
  }

  // ✅ CASO 2: Suscripción activa con servicios ilimitados
  if (lubricentro.estado === 'activo' && (lubricentro as any).hasUnlimitedServices) {
    return { canProceed: true, reason: 'unlimited_services' };
  }

  // ✅ CASO 3: Suscripción activa con límite específico
  if (lubricentro.estado === 'activo' && (lubricentro as any).totalServicesContracted) {
    const contractedLimit = (lubricentro as any).totalServicesContracted;
    const remainingServices = (lubricentro as any).servicesRemaining || 0;

    if (remainingServices <= 0) {
      return {
        canProceed: false,
        reason: 'plan_limit',
        data: { currentServices, limit: contractedLimit, hasUnlimitedServices: false }
      };
    }
    return { canProceed: true, reason: 'plan_ok' };
  }

  // ✅ CASO 4: Suscripción activa sin límites específicos (servicios ilimitados por defecto)
  if (lubricentro.estado === 'activo') {
    return { canProceed: true, reason: 'active_unlimited' };
  }

  // ✅ CASO 5: Estado inactivo
  return { canProceed: false, reason: 'inactive' };
};

interface PrivateRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  requiresActiveSubscription?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  requiredRoles = ['superadmin', 'admin', 'user'],
  requiresActiveSubscription = false
}) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const [lubricentro, setLubricentro] = useState<Lubricentro | null>(null);
  const [loadingLubricentro, setLoadingLubricentro] = useState(false);

  // Cargar información del lubricentro si es necesario
  useEffect(() => {
    const loadLubricentro = async () => {
      if (userProfile?.lubricentroId && userProfile.role !== 'superadmin') {
        try {
          setLoadingLubricentro(true);
          const lubricentroData = await getLubricentroById(userProfile.lubricentroId);
          setLubricentro(lubricentroData);
        } catch (error) {
          console.error('Error al cargar lubricentro:', error);
        } finally {
          setLoadingLubricentro(false);
        }
      }
    };

    if (userProfile) {
      loadLubricentro();
    }
  }, [userProfile]);

  // Mostrar spinner mientras se verifica la autenticación
  if (loading || loadingLubricentro) {
    return <LoadingScreen />;
  }
  
  // Si no hay usuario autenticado, redirigir al login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar email para dueños de lubricentro
  if (userProfile?.role === 'admin' && !currentUser.emailVerified) {
    return <EmailVerificationRequired />;
  }
  
  // Si hay requisitos de roles, verificar el rol del usuario
  if (requiredRoles.length > 0 && userProfile) {
    if (!requiredRoles.includes(userProfile.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // ✅ LÓGICA ACTUALIZADA: Verificación de estado del lubricentro
  if (userProfile && userProfile.role !== 'superadmin' && lubricentro) {
    
    // ✅ CASO 1: Lubricentro inactivo
    if (lubricentro.estado === 'inactivo' && !isAllowedRouteForLimitedAccess(location.pathname)) {
      return <TrialExpiredScreen lubricentro={lubricentro} />;
    }
    
    // ✅ CASO 2: Período de prueba expirado por fecha
    if (lubricentro.estado === 'trial' && lubricentro.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(lubricentro.trialEndDate);
      
      if (trialEnd < now && !isAllowedRouteForLimitedAccess(location.pathname)) {
        return <TrialExpiredScreen lubricentro={lubricentro} />;
      }
    }
    
    // ✅ CASO 3: Verificar límites de servicios (solo para rutas que lo requieren)
    if (requiresActiveSubscription) {
      const isCreationRoute = location.pathname.includes('/nuevo') || 
                             (location.pathname.includes('/cambios-aceite') && location.search.includes('clone='));
      
      const limitsCheck = checkServiceLimits(lubricentro, isCreationRoute);
      
      if (!limitsCheck.canProceed) {
        console.log(`🚫 Acceso denegado por límites: ${limitsCheck.reason}`, limitsCheck.data);
        
        if (limitsCheck.reason === 'trial_limit' || limitsCheck.reason === 'plan_limit') {
          return (
            <ServiceLimitReachedScreen 
              lubricentro={lubricentro} 
              currentServices={limitsCheck.data?.currentServices || 0}
              limit={limitsCheck.data?.limit || 0}
              hasUnlimitedServices={limitsCheck.data?.hasUnlimitedServices || false}
            />
          );
        }
        
        if (limitsCheck.reason === 'inactive') {
          return <TrialExpiredScreen lubricentro={lubricentro} />;
        }
      }
    }
  }
  
  // ✅ Verificar si la cuenta del usuario está activa
  if (userProfile && userProfile.estado === 'inactivo') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Cuenta Inactiva
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Su cuenta ha sido desactivada. Contacte al administrador para más información.
            </p>
            <Button
              color="primary"
              fullWidth
              onClick={() => window.location.href = 'mailto:ventas@hisma.com.ar'}
            >
              Contactar Soporte
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Verificar si la cuenta del empleado está pendiente de aprobación
  if (userProfile && userProfile.estado === 'pendiente') {
    return <Navigate to="/registro-pendiente" replace />;
  }
  
  // ✅ Si pasa todas las validaciones, renderizar los hijos
  return <>{children}</>;
};

export default PrivateRoute;