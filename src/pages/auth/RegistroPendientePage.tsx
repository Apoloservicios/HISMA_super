// src/pages/auth/RegistroPendientePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';

// Iconos
import { ClockIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

const RegistroPendientePage: React.FC = () => {
  const navigate = useNavigate();
  
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
                <ClockIcon className="h-20 w-20 text-yellow-500 mb-4" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Registro Pendiente de Aprobación</h2>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 mx-auto max-w-2xl">
                <p className="text-sm text-yellow-800">
                  Tu solicitud ha sido enviada correctamente y está pendiente de aprobación por parte del administrador del lubricentro.
                </p>
              </div>
              
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                El administrador será notificado de tu solicitud y la revisará a la brevedad.
                Una vez que tu cuenta sea aprobada, podrás iniciar sesión en el sistema.
              </p>
              
              <Button
                color="primary"
                onClick={() => navigate('/login')}
              >
                Volver a Iniciar Sesión
              </Button>
              
              {/* Información de contacto */}
              <div className="mt-12 border-t border-gray-200 pt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">¿Necesitas ayuda?</h3>
                
                <div className="max-w-xl mx-auto">
                  <p className="text-sm text-gray-600 mb-4">
                    Si tienes alguna pregunta o necesitas asistencia mientras esperas la aprobación, 
                    no dudes en contactar a nuestro equipo de soporte:
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-2">
                        <EnvelopeIcon className="h-5 w-5 text-primary-600 mr-2" />
                        <h4 className="text-sm font-medium text-gray-900">Email</h4>
                      </div>
                      <p className="text-sm text-gray-600">soporte@lubricentro-app.com</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-2">
                        <PhoneIcon className="h-5 w-5 text-primary-600 mr-2" />
                        <h4 className="text-sm font-medium text-gray-900">Teléfono</h4>
                      </div>
                      <p className="text-sm text-gray-600">+54 (11) 1234-5678</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Nota informativa */}
              <div className="mt-8 px-6 py-5 bg-blue-50 border-l-4 border-blue-400 rounded-md max-w-2xl mx-auto text-left">
                <h4 className="text-base font-medium text-blue-800 mb-1">Nota</h4>
                <p className="text-sm text-blue-700">
                  Las cuentas de empleados requieren aprobación para garantizar la seguridad del sistema y los datos del lubricentro. 
                  Normalmente, este proceso toma menos de 24 horas durante días hábiles.
                </p>
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

export default RegistroPendientePage;