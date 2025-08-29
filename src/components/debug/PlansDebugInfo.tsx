// src/components/debug/PlansDebugInfo.tsx
// 🔍 COMPONENTE TEMPORAL PARA DEBUGGEAR PLANES

import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Badge } from '../ui';
import { 
  getSubscriptionPlans, 
  getAllDynamicPlans, 
  hasFirebasePlans,
  getSystemDebugInfo,
  clearPlansCache 
} from '../../services/hybridSubscriptionService';
import { getActivePlans } from '../../services/planManagementService';

const PlansDebugInfo: React.FC = () => {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadDebugData = async () => {
    setLoading(true);
    try {

      
      // 1. Info básica del sistema
      const systemInfo = await getSystemDebugInfo();
      
      // 2. Planes desde Firebase directamente
      const firebasePlans = await getActivePlans();
      
      // 3. Planes procesados por híbrido
      const hybridPlans = await getSubscriptionPlans();
      
      // 4. Metadata de planes
      const plansMetadata = await getAllDynamicPlans();
      
      // 5. Verificar si hay Firebase
      const hasFirebase = await hasFirebasePlans();
      
      const debugInfo = {
        systemInfo,
        hasFirebase,
        firebasePlans: firebasePlans.map(plan => ({
          id: plan.id,
          name: plan.name,
          isActive: plan.isActive,
          isPublished: plan.isPublished,
          publishOnHomepage: plan.publishOnHomepage,
          planType: plan.planType,
          price: plan.price,
          servicePrice: plan.servicePrice
        })),
        hybridPlans: Object.entries(hybridPlans).map(([id, plan]) => ({
          id,
          name: plan.name,
          planType: plan.planType,
          price: plan.price,
          servicePrice: (plan as any).servicePrice,
          source: 'hybrid'
        })),
        plansMetadata,
        counts: {
          firebaseTotal: firebasePlans.length,
          firebaseActive: firebasePlans.filter(p => p.isActive).length,
          firebasePublished: firebasePlans.filter(p => p.isActive && (p.isPublished || p.publishOnHomepage)).length,
          hybridTotal: Object.keys(hybridPlans).length
        }
      };
      
      setDebugData(debugInfo);
      setLastUpdate(new Date());
      

      
    } catch (error) {
      console.error('❌ Error cargando debug info:', error);
      setDebugData({ error: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    clearPlansCache();
    await loadDebugData();
  };

  useEffect(() => {
    loadDebugData();
  }, []);

  if (loading && !debugData) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p>🔍 Cargando información de debug...</p>
        </CardBody>
      </Card>
    );
  }

  if (!debugData) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-red-600">❌ Error cargando información</p>
          <Button onClick={loadDebugData} className="mt-3">
            Reintentar
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">🔍 Debug de Planes de Suscripción</h3>
            <div className="space-x-2">
              <Button onClick={loadDebugData} disabled={loading} size="sm">
                {loading ? '🔄 Cargando...' : '↻ Actualizar'}
              </Button>
              <Button onClick={handleClearCache} size="sm" color="secondary">
                🗑️ Limpiar Cache
              </Button>
            </div>
          </div>
          
          {lastUpdate && (
            <p className="text-xs text-gray-500 mb-4">
              📅 Última actualización: {lastUpdate.toLocaleString()}
            </p>
          )}

          {/* Información del sistema */}
          {debugData.systemInfo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-gray-600">Fuente de Datos</p>
                <p className="font-bold text-blue-600">
                  {debugData.systemInfo.source === 'firebase' ? '🔥 Firebase' : '📦 Fallback'}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-gray-600">¿Hay Firebase?</p>
                <p className="font-bold text-green-600">
                  {debugData.hasFirebase ? '✅ Sí' : '❌ No'}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-xs text-gray-600">Total Planes</p>
                <p className="font-bold text-purple-600">
                  {debugData.counts.hybridTotal}
                </p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-xs text-gray-600">Cache Status</p>
                <p className="font-bold text-yellow-600">
                  {debugData.systemInfo.cacheStatus}
                </p>
              </div>
            </div>
          )}

          {/* Resumen de conteos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-2xl font-bold text-gray-700">{debugData.counts.firebaseTotal}</p>
              <p className="text-xs text-gray-500">Total en Firebase</p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-2xl font-bold text-green-700">{debugData.counts.firebaseActive}</p>
              <p className="text-xs text-gray-500">Activos en Firebase</p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-2xl font-bold text-blue-700">{debugData.counts.firebasePublished}</p>
              <p className="text-xs text-gray-500">Publicados</p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-2xl font-bold text-purple-700">{debugData.counts.hybridTotal}</p>
              <p className="text-xs text-gray-500">Servidos por Hybrid</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Planes de Firebase (raw) */}
      <Card>
        <CardBody>
          <h4 className="font-bold mb-3">🔥 Planes Directos de Firebase ({debugData.firebasePlans.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {debugData.firebasePlans.map((plan: any, index: number) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                <div className="flex items-center space-x-2">
                  <strong>{plan.name}</strong>
                  <code className="bg-gray-200 px-1 rounded text-xs">{plan.id}</code>
                </div>
                <div className="flex space-x-1">
                  <Badge 
                    text={plan.isActive ? 'Activo' : 'Inactivo'} 
                    color={plan.isActive ? 'success' : 'error'} 
                  />
                  <Badge 
                    text={plan.isPublished || plan.publishOnHomepage ? 'Publicado' : 'No Publicado'} 
                    color={plan.isPublished || plan.publishOnHomepage ? 'info' : 'default'} 
                  />
                  <Badge 
                    text={plan.planType || 'monthly'} 
                    color="info" 
                  />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Planes procesados por Hybrid */}
      <Card>
        <CardBody>
          <h4 className="font-bold mb-3">⚙️ Planes Procesados por Hybrid Service ({debugData.hybridPlans.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {debugData.hybridPlans.map((plan: any, index: number) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                <div className="flex items-center space-x-2">
                  <strong>{plan.name}</strong>
                  <code className="bg-gray-200 px-1 rounded text-xs">{plan.id}</code>
                </div>
                <div className="flex space-x-1">
                  <Badge 
                    text={plan.planType} 
                    color={plan.planType === 'service' ? 'warning' : 'info'} 
                  />
                  {plan.servicePrice && (
                    <Badge text={`$${plan.servicePrice.toLocaleString()}`} color="success" />
                  )}
                  <Badge text={`$${plan.price.monthly.toLocaleString()}/mes`} color="info" />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Análisis del problema */}
      <Card>
        <CardBody>
          <h4 className="font-bold mb-3">🎯 Análisis del Problema</h4>
          <div className="space-y-2 text-sm">
            {debugData.hasFirebase ? (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✅</span>
                  <span>Hay planes en Firebase</span>
                </div>
                {debugData.counts.firebasePublished > 0 ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-green-500">✅</span>
                    <span>Hay planes publicados ({debugData.counts.firebasePublished})</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-red-500">❌</span>
                    <span>No hay planes publicados - revisar campos isActive e isPublished/publishOnHomepage</span>
                  </div>
                )}
                
                {debugData.counts.hybridTotal === debugData.counts.firebasePublished ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-green-500">✅</span>
                    <span>Hybrid Service está devolviendo solo planes de Firebase</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-500">⚠️</span>
                    <span>Hybrid Service tiene {debugData.counts.hybridTotal} planes vs {debugData.counts.firebasePublished} publicados</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-red-500">❌</span>
                  <span>No hay planes en Firebase - usando fallback</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500">⚠️</span>
                  <span>Revisa que los planes estén creados en Firebase con isActive=true</span>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* JSON Raw para desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardBody>
            <details>
              <summary className="font-bold cursor-pointer">🔧 Datos Raw (Desarrollo)</summary>
              <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto max-h-40">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </details>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default PlansDebugInfo;