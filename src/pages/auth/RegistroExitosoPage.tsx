// src/pages/auth/RegistroExitosoPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Alert } from '../../components/ui';

// Iconos
import { 
  CheckCircleIcon, 
  ArrowRightIcon, 
  ChartBarIcon, 
  CalendarIcon, 
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const RegistroExitosoPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, sendVerificationEmail, refreshUserProfile } = useAuth();
  const [countdown, setCountdown] = useState(15);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Redirigir al dashboard después de 15 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [navigate]);

  // Función para reenviar email de verificación
  const handleResendVerification = async () => {
    try {
      setSendingVerification(true);
      setError(null);
      await sendVerificationEmail();
      setVerificationSent(true);
    } catch (err: any) {
      console.error('Error al reenviar verificación:', err);
      setError('Error al enviar el correo de verificación. Intente nuevamente.');
    } finally {
      setSendingVerification(false);
    }
  };

  // Función para verificar el estado del email
  const handleCheckVerification = async () => {
    try {
      if (currentUser) {
        await currentUser.reload();
        await refreshUserProfile();
        
        if (currentUser.emailVerified) {
          navigate('/dashboard');
        } else {
          setError('El correo electrónico aún no ha sido verificado. Revisa tu bandeja de entrada.');
        }
      }
    } catch (err) {
      console.error('Error al verificar email:', err);
      setError('Error al verificar el estado del correo electrónico.');
    }
  };

  // Verificar si es dueño de lubricentro (necesita verificación)
  const needsEmailVerification = userProfile?.role === 'admin';
  const isEmailVerified = currentUser?.emailVerified || false;
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold text-gray-900">Sistema de Gestión de Cambios de Aceite</h1>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6 text-center">
              <div className="flex justify-center">
                <CheckCircleIcon className="h-20 w-20 text-green-500 mb-4" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Registro Exitoso!</h2>
              <p className="text-lg text-gray-600 mb-6">
                Su cuenta ha sido creada correctamente. ¡Bienvenido a nuestro sistema de gestión de cambios de aceite!
              </p>

              {/* Verificación de email para dueños de lubricentro */}
              {needsEmailVerification && !isEmailVerified && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3 text-left">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Verificación de Correo Electrónico Requerida
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p className="mb-3">
                          Como dueño de lubricentro, necesita verificar su correo electrónico para acceder a todas las funcionalidades del sistema.
                        </p>
                        <p className="mb-3">
                          Hemos enviado un enlace de verificación a: <strong>{currentUser?.email}</strong>
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            color="warning"
                            onClick={handleResendVerification}
                            disabled={sendingVerification}
                          >
                            {sendingVerification ? 'Enviando...' : 'Reenviar Verificación'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            color="warning"
                            onClick={handleCheckVerification}
                          >
                            Ya Verifiqué mi Email
                          </Button>
                        </div>
                        {verificationSent && (
                          <p className="mt-2 text-green-700 text-sm">
                            ✓ Correo de verificación reenviado. Revisa tu bandeja de entrada.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <Alert type="error" className="mb-4">
                  {error}
                </Alert>
              )}
              
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-8">
                <p className="text-sm text-green-800">
                  Será redirigido al panel de control en <span className="font-bold">{countdown}</span> segundos...
                </p>
              </div>
              
              <Button
                color="primary"
                size="lg"
                onClick={() => navigate('/dashboard')}
                icon={<ArrowRightIcon className="h-5 w-5" />}
              >
                Ir al Panel de Control
              </Button>
              
              {/* Sección de próximos pasos */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-xl font-semibold text-primary-700 mb-6">Próximos Pasos</h3>
                
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-center mb-3">
                      <EnvelopeIcon className="h-12 w-12 text-primary-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {needsEmailVerification && !isEmailVerified ? 'Verifica tu Email' : 'Email Verificado'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {needsEmailVerification && !isEmailVerified 
                        ? 'Revisa tu bandeja de entrada y confirma tu dirección de correo electrónico.'
                        : 'Tu correo electrónico está verificado y listo para usar.'
                      }
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-center mb-3">
                      <ChartBarIcon className="h-12 w-12 text-primary-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Configura tu Perfil</h4>
                    <p className="text-sm text-gray-600">
                      Completa la información de tu lubricentro para personalizar tu experiencia.
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-center mb-3">
                      <CalendarIcon className="h-12 w-12 text-primary-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Registra tu Primer Cambio</h4>
                    <p className="text-sm text-gray-600">
                      Comienza a utilizar el sistema registrando tu primer cambio de aceite.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Información sobre período de prueba */}
              <div className="mt-12 px-6 py-5 bg-blue-50 border-l-4 border-blue-400 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3 text-left">
                    <h4 className="text-lg font-medium text-blue-800 mb-2">Período de Prueba Gratuita</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Tienes 7 días de prueba gratuita para explorar todas las funcionalidades del sistema.
                      Durante este período puedes registrar hasta 10 cambios de aceite sin costo.
                    </p>
                    <p className="text-xs text-blue-600">
                      Para cualquier consulta o asistencia, no dudes en contactar a nuestro equipo de soporte.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Sistema de Gestión de Cambios de Aceite. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default RegistroExitosoPage;