// src/components/admin/InactiveLubricentroScreen.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon, CreditCardIcon, GiftIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui';

interface InactiveLubricentroScreenProps {
  lubricentroName: string;
  reason?: 'trial_expired' | 'subscription_expired' | 'inactive';
}

const InactiveLubricentroScreen: React.FC<InactiveLubricentroScreenProps> = ({ 
  lubricentroName, 
  reason = 'inactive' 
}) => {
  const navigate = useNavigate();

  const getTitle = () => {
    switch(reason) {
      case 'trial_expired':
        return 'Período de Prueba Expirado';
      case 'subscription_expired':
        return 'Suscripción Expirada';
      default:
        return 'Cuenta Inactiva';
    }
  };

  const getMessage = () => {
    switch(reason) {
      case 'trial_expired':
        return `El período de prueba gratuita de ${lubricentroName} ha finalizado. Para continuar utilizando el sistema, debe activar su suscripción.`;
      case 'subscription_expired':
        return `La suscripción de ${lubricentroName} ha expirado. Para continuar utilizando el sistema, debe renovar su suscripción.`;
      default:
        return `La cuenta de ${lubricentroName} está inactiva. Para continuar utilizando el sistema, debe activar su suscripción.`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {getTitle()}
            </h2>
            <p className="text-gray-600 mb-8">
              {getMessage()}
            </p>

            <div className="space-y-4">
              {/* Botón principal - Gestión de Pagos */}
              <Button
                color="primary"
                className="w-full"
                onClick={() => navigate('/admin/pagos')}
              >
                <CreditCardIcon className="h-5 w-5 mr-2" />
                Ir a Gestión de Pagos
              </Button>

              {/* Información adicional */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Opciones de Activación:
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <GiftIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Con Cupón:</strong> Si tienes un cupón de tu distribuidor, 
                      úsalo para activar tu membresía sin costo.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CreditCardIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>MercadoPago:</strong> Paga con tarjeta o efectivo 
                      para activación instantánea.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-lg mr-2">🏦</span>
                    <span>
                      <strong>Transferencia:</strong> Realiza una transferencia 
                      bancaria (activación en 24-48hs).
                    </span>
                  </li>
                </ul>
              </div>

              {/* Contacto de soporte */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Contactar Soporte
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Nuestro equipo está listo para ayudarte a activar tu cuenta 
                  y elegir el plan que mejor se adapte a tus necesidades.
                </p>
                
                <div className="space-y-2">
                  <a 
                    href="mailto:ventas@hisma.com.ar"
                    className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
                  >
                    Contactar por Email
                  </a>
                  
                  <a 
                    href="https://wa.me/542604515854"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-center"
                  >
                    Contactar por WhatsApp
                  </a>
                </div>

                <div className="mt-3 text-xs text-gray-500 text-center">
                  📧 Email: ventas@hisma.com.ar<br />
                  📱 WhatsApp: +54 (260) 4515854
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactiveLubricentroScreen;