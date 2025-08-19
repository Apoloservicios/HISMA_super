// src/pages/admin/PaymentManagementPage.tsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { PaymentActivator } from '../../components/admin/PaymentActivator';
import { Card, CardBody, PageContainer, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getLubricentroById } from '../../services/lubricentroService';
import { Lubricentro } from '../../types';

interface LubricentroInfo {
  id: string;
  fantasyName: string;
  estado: string;
  servicesRemaining: number;
  lastPaymentDate?: Date;
  // Removemos lastPaymentAmount si no existe en el tipo Lubricentro
  paymentStatus?: string;
}

export const PaymentManagementPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [lubricentroInfo, setLubricentroInfo] = useState<LubricentroInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Cargar información del lubricentro
  useEffect(() => {
    const loadLubricentroInfo = async () => {
      if (!userProfile?.lubricentroId) {
        setLoading(false);
        return;
      }

      try {
        console.log('📊 Cargando información del lubricentro...');
        const lubricentro = await getLubricentroById(userProfile.lubricentroId);
        
        if (lubricentro) {
          setLubricentroInfo({
            id: lubricentro.id,
            fantasyName: lubricentro.fantasyName,
            estado: lubricentro.estado,
            servicesRemaining: lubricentro.servicesRemaining || 0,
            lastPaymentDate: lubricentro.lastPaymentDate,
            // Solo incluimos propiedades que existen en el tipo
            paymentStatus: (lubricentro as any).paymentStatus // Cast temporal
          });
        }
      } catch (error) {
        console.error('❌ Error cargando lubricentro:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLubricentroInfo();
  }, [userProfile?.lubricentroId, refreshKey]);

  const handlePaymentSuccess = () => {
    console.log('✅ Pago activado exitosamente, refrescando datos...');
    // Refrescar la información del lubricentro
    setRefreshKey(prev => prev + 1);
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

  return (
    <PageContainer title="Gestión de Pagos">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2">Gestión de Pagos</h1>
          <p className="text-blue-100">
            Administra los servicios y pagos de tu lubricentro
          </p>
        </div>

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Estado */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                    lubricentroInfo.estado === 'activo'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {lubricentroInfo.estado === 'activo' ? '✅' : '❌'} {lubricentroInfo.estado}
                  </div>
                  <p className="text-sm text-gray-600">Estado del Lubricentro</p>
                </div>

                {/* Servicios Disponibles */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {lubricentroInfo.servicesRemaining}
                  </div>
                  <p className="text-sm text-gray-600">Servicios Disponibles</p>
                </div>

                {/* Último Pago - Sin lastPaymentAmount para evitar error */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600 mb-1">
                    {lubricentroInfo.paymentStatus === 'paid' ? 'Pagado' : 'Sin pagos'}
                  </div>
                  <p className="text-sm text-gray-600">
                    {lubricentroInfo.lastPaymentDate
                      ? `Último pago: ${lubricentroInfo.lastPaymentDate.toLocaleDateString()}`
                      : 'Estado de Pago'
                    }
                  </p>
                </div>
              </div>

              {/* Alerta si servicios bajos */}
              {lubricentroInfo.servicesRemaining < 10 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-orange-500 mr-3">⚠️</div>
                    <div>
                      <p className="font-medium text-orange-800">Servicios Bajos</p>
                      <p className="text-sm text-orange-700">
                        Te quedan pocos servicios disponibles. Considera comprar un nuevo plan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Activador de Pagos */}
        <PaymentActivator
          lubricentroId={userProfile.lubricentroId}
          onSuccess={handlePaymentSuccess}
        />

        {/* Consejos de Uso */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold mb-4">💡 Consejos de Uso</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 text-blue-600 rounded-full p-1 mt-1">
                  <span className="text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Selecciona tu plan</p>
                  <p className="text-sm text-gray-600">
                    Elige el plan que mejor se adapte a tu volumen de trabajo mensual
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 text-blue-600 rounded-full p-1 mt-1">
                  <span className="text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Realiza el pago</p>
                  <p className="text-sm text-gray-600">
                    Completa el pago en MercadoPago de forma segura
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 text-blue-600 rounded-full p-1 mt-1">
                  <span className="text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium">Activa tus servicios</p>
                  <p className="text-sm text-gray-600">
                    Copia el Payment ID y activa instantáneamente tus servicios
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">✅ Ventajas de este sistema:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Activación instantánea - no esperas webhooks</li>
                <li>• 100% confiable - si el pago existe, se activa</li>
                <li>• Control total - tú decides cuándo activar</li>
                <li>• Historial completo - todos los pagos quedan registrados</li>
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