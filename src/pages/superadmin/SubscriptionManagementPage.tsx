// src/pages/superadmin/SubscriptionManagementPage.tsx
import React, { useState } from 'react';
import { 
  PageContainer,
  Card,
  CardHeader,
  CardBody,
  Button,
  Modal
} from '../../components/ui';

// Components
import SubscriptionDashboard from '../../components/subscription/SubscriptionDashboard';
import EnhancedSubscriptionManager from '../../components/subscription/EnhancedSubscriptionManager';

// Types
import { Lubricentro } from '../../types';

// Icons
import {
  ChartBarIcon,
  CogIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const SubscriptionManagementPage: React.FC = () => {
  // Estados principales
  const [selectedLubricentro, setSelectedLubricentro] = useState<Lubricentro | null>(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Manejar selección de lubricentro
  const handleSelectLubricentro = (lubricentro: Lubricentro) => {
    setSelectedLubricentro(lubricentro);
    setShowManagerModal(true);
  };

  // Manejar actualización de datos
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    // Aquí podrías agregar lógica adicional para refrescar el dashboard
  };

  // Cerrar modal y refrescar si es necesario
  const handleCloseManager = () => {
    setShowManagerModal(false);
    setSelectedLubricentro(null);
    handleRefresh();
  };

  return (
    <PageContainer
      title="Gestión de Suscripciones"
      subtitle="Panel de control avanzado para administrar todas las suscripciones"
      action={
        <div className="flex space-x-2">
          <Button
            color="secondary"
            variant="outline"
            icon={<CogIcon className="h-5 w-5" />}
            onClick={() => {
              // Aquí podrías abrir configuraciones globales
            }}
          >
            Configuración
          </Button>
          <Button
            color="primary"
            icon={<ChartBarIcon className="h-5 w-5" />}
            onClick={() => {
              // Aquí podrías abrir reportes avanzados
            }}
          >
            Reportes Avanzados
          </Button>
        </div>
      }
    >
      {/* Dashboard principal */}
      <SubscriptionDashboard
        selectedLubricentro={selectedLubricentro}
        onSelectLubricentro={handleSelectLubricentro}
        key={refreshTrigger} // Forzar re-render cuando sea necesario
      />

      {/* Modal del gestor de suscripciones */}
      <Modal
        isOpen={showManagerModal}
        onClose={handleCloseManager}
        title={`Gestión de Suscripción - ${selectedLubricentro?.fantasyName}`}
        size="xl"
        footer={
          <div className="flex justify-start">
            <Button
              color="secondary"
              variant="outline"
              icon={<ArrowLeftIcon className="h-5 w-5" />}
              onClick={handleCloseManager}
            >
              Volver al Dashboard
            </Button>
          </div>
        }
      >
        {selectedLubricentro && (
          <EnhancedSubscriptionManager
            lubricentro={selectedLubricentro}
            onRefresh={handleRefresh}
          />
        )}
      </Modal>

      {/* Información de ayuda */}
      <Card className="mt-6">
        <CardHeader title="Guía Rápida" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📊 Dashboard</h4>
              <p className="text-sm text-blue-700">
                Visualiza métricas clave, distribución por planes y estado general de todas las suscripciones.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">🏥 Salud</h4>
              <p className="text-sm text-green-700">
                Monitorea la salud de cada suscripción con puntuaciones automáticas y recomendaciones.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Alertas</h4>
              <p className="text-sm text-yellow-700">
                Recibe notificaciones sobre vencimientos próximos, pagos pendientes y problemas críticos.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">⚙️ Gestión</h4>
              <p className="text-sm text-purple-700">
                Administra planes, registra pagos, extiende períodos y gestiona facturación de forma avanzada.
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">💡 Funcionalidades Destacadas</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Análisis predictivo:</strong> Identifica lubricentros en riesgo de cancelación</li>
              <li>• <strong>Gestión automatizada:</strong> Acciones automáticas basadas en reglas de negocio</li>
              <li>• <strong>Reportes detallados:</strong> Exporta datos para análisis externos</li>
              <li>• <strong>Prorrateo inteligente:</strong> Calcula automáticamente ajustes en cambios de plan</li>
              <li>• <strong>CLV (Customer Lifetime Value):</strong> Analiza el valor de cada cliente</li>
              <li>• <strong>Métricas en tiempo real:</strong> Dashboard actualizado con las últimas transacciones</li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default SubscriptionManagementPage;