// src/components/common/PrivateRoute.tsx - VERSIÓN CORREGIDA
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


// ✅ Rutas permitidas para usuarios con trial expirado
const isAllowedRouteForExpiredTrial = (pathname: string): boolean => {
  const allowedRoutes = [
    '/dashboard',           // ✅ CRÍTICO: Permitir dashboard (tiene botones de renovación)
    '/perfil',              
    '/usuarios',            
           
    '/admin',

  ];

  // Permitir rutas de visualización (no creación)
const isViewRoute = Boolean(pathname.match(/^\/cambios-aceite\/[^\/]+$/)) && 
                   !pathname.includes('/nuevo') && 
                   !pathname.includes('/editar');

  return allowedRoutes.some(route => pathname.startsWith(route)) || isViewRoute;
};


// Componente para mostrar cuando el período de prueba ha expirado
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
          <h4 className="text-sm font-medium text-blue-800 mb-2">Contactar Soporte</h4>
          <p className="text-sm text-blue-700 mb-3">
            Nuestro equipo está listo para ayudarte a activar tu cuenta y elegir el plan que mejor se adapte a tus necesidades.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-blue-600">
              📧 Email: ventas@hisma.com.ar
            </p>
            <p className="text-xs text-blue-600">
              📱 WhatsApp: +54 (260) 4515854
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            color="primary"
            fullWidth
            onClick={() => window.location.href = 'mailto:ventas@hisma.com.ar?subject=Activar%20suscripción%20-%20' + encodeURIComponent(lubricentro.fantasyName)}
          >
            Contactar por Email
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

// ✅ NUEVO: Componente para límite de prueba alcanzado
const TrialLimitReachedScreen = ({ lubricentro, currentServices, limit }: { 
  lubricentro: Lubricentro; 
  currentServices: number; 
  limit: number; 
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
          Límite de Prueba Alcanzado
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Has utilizado <strong>{currentServices} de {limit}</strong> servicios disponibles durante el período de prueba.
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Para continuar registrando cambios de aceite, necesitas activar tu suscripción.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-800 mb-2">¿Necesitas más servicios?</h4>
          <p className="text-sm text-blue-700 mb-3">
            Contáctanos para activar tu cuenta y elegir el plan que mejor se adapte a tus necesidades.
          </p>
          <div className="space-y-1">
            <p className="text-xs text-blue-600">📧 ventas@hisma.com.ar</p>
            <p className="text-xs text-blue-600">📱 +54 (260) 4515854</p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            color="primary"
            fullWidth
            onClick={() => window.location.href = 'mailto:ventas@hisma.com.ar?subject=Activar%20suscripción%20-%20' + encodeURIComponent(lubricentro.fantasyName)}
          >
            Contactar Soporte
          </Button>
          <Button
            variant="outline"
            color="secondary"
            fullWidth
            onClick={() => window.history.back()}
          >
            Volver
          </Button>
        </div>
      </div>
    </div>
  </div>
);

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
      // Redirigir al dashboard si no tiene los permisos
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // ✅ CORRECCIÓN: Verificar estado del lubricentro y período de prueba de manera más precisa
  if (userProfile && userProfile.role !== 'superadmin' && lubricentro) {
    // Si el lubricentro está inactivo
   if (lubricentro.estado === 'inactivo' && !isAllowedRouteForExpiredTrial(location.pathname)) {
      return <TrialExpiredScreen lubricentro={lubricentro} />;
    }
    
    // Si está en período de prueba, verificar si ha expirado
    if (lubricentro.estado === 'trial' && lubricentro.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(lubricentro.trialEndDate);
      
      if (trialEnd < now) {
        return <TrialExpiredScreen lubricentro={lubricentro} />;
      }
    }
    
    // ✅ CORRECCIÓN: Verificar límites durante el período de prueba para rutas específicas
    if (requiresActiveSubscription && lubricentro.estado === 'trial') {
      const trialServiceLimit = 10; // Límite coherente con constants.ts
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      
      // ✅ MEJORA: Solo bloquear si ha alcanzado exactamente el límite, permitir edición
      const isCreationRoute = location.pathname.includes('/nuevo') || 
                             (location.pathname.includes('/cambios-aceite') && location.search.includes('clone='));
      
      if (isCreationRoute && currentServices >= trialServiceLimit) {
        return <TrialLimitReachedScreen 
          lubricentro={lubricentro} 
          currentServices={currentServices} 
          limit={trialServiceLimit} 
        />;
      }
    }
  }
  
  // Verificar si la cuenta del usuario está activa
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
  
  // Si pasa todas las validaciones, renderizar los hijos
  return <>{children}</>;
};

export default PrivateRoute;