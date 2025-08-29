// src/pages/superadmin/ManualRenewalDashboard.tsx
// 🎯 DASHBOARD MANUAL PARA GESTIÓN DE RENOVACIONES

import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  PlayIcon,
  CogIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import { Button, Card, CardBody, Alert, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { SUBSCRIPTION_CONSTANTS, canAddService, getSubscriptionInfo } from '../../constants/subscription';

interface RenewalStats {
  totalActive: number;
  pendingRenewals: number;
  expiringSoon: number;
  overdue: number;
  lastProcessed: Date | null;
}

interface ProcessingResult {
  processedCount: number;
  renewedCount: number;
  expiredCount: number;
  errorCount: number;
  errors: Array<{ lubricentroId: string; error: string; fantasyName?: string; }>;
}

const ManualRenewalDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<RenewalStats | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ProcessingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

   // Cargar datos al montar el componente
  useEffect(() => {
    loadStats();
  }, []);

  // Verificar permisos
  if (userProfile?.role !== 'superadmin') {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Acceso Denegado</h3>
        <p className="text-gray-600">Solo superadmins pueden acceder a este panel.</p>
      </div>
    );
  }

  /**
   * 📊 CARGAR ESTADÍSTICAS
   */
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      // Consultas paralelas para estadísticas
      const [
        allActiveSnapshot,
        overdueSnapshot,
        expiringSoonSnapshot,
        logsSnapshot
      ] = await Promise.all([
        // Total activos
        getDocs(query(
          collection(db, 'lubricentros'),
          where('estado', '==', 'activo')
        )),

        // Vencidos (necesitan renovación)
        getDocs(query(
          collection(db, 'lubricentros'),
          where('estado', '==', 'activo'),
          where('billingCycleEndDate', '<', today)
        )),

        // Expiran pronto (próximos 7 días)
        getDocs(query(
          collection(db, 'lubricentros'),
          where('estado', '==', 'activo'),
          where('billingCycleEndDate', '>=', today),
          where('billingCycleEndDate', '<=', weekFromNow)
        )),

        // Último proceso ejecutado
        getDocs(query(
          collection(db, 'system_logs'),
          where('type', '==', 'manual_renewal_process')
        ))
      ]);

      // Obtener último proceso
        const logs = logsSnapshot.docs
        .map(doc => ({ 
            id: doc.id, 
            ...doc.data() as any // ✅ Usar 'as any' para obtener datos completos
        }))
        .sort((a, b) => (b.timestamp?.toDate?.() || new Date()).getTime() - (a.timestamp?.toDate?.() || new Date()).getTime());

      const lastLog = logs[0];

      setStats({
        totalActive: allActiveSnapshot.size,
        overdue: overdueSnapshot.size,
        expiringSoon: expiringSoonSnapshot.size,
        pendingRenewals: overdueSnapshot.size,
        lastProcessed: lastLog?.timestamp?.toDate() || null
      });

      // Si hay un resultado del último proceso, mostrarlo
      if (lastLog?.result) {
        setLastResult(lastLog.result);
      }

    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔄 PROCESAR RENOVACIONES MANUALMENTE
   */
  const processRenewalsManually = async () => {
    try {
      setProcessing(true);
      setError(null);


      const result: ProcessingResult = {
        processedCount: 0,
        renewedCount: 0,
        expiredCount: 0,
        errorCount: 0,
        errors: []
      };

      // 1. Obtener lubricentros que necesitan renovación
      const today = new Date();
      const overdueSnapshot = await getDocs(query(
        collection(db, 'lubricentros'),
        where('estado', '==', 'activo'),
        where('billingCycleEndDate', '<=', today)
      ));

      result.processedCount = overdueSnapshot.size;


      // 2. Procesar cada lubricentro
      for (const docRef of overdueSnapshot.docs) {
        try {
            const lubricentroData = docRef.data() as any; // ✅ Tipar como 'any'
            const lubricentro = { 
            id: docRef.id, 
            ...lubricentroData 
            };
    


          // Verificar auto-renovación
          if (!lubricentro.autoRenewal) {
   
            await expireSubscription(lubricentro);
            result.expiredCount++;
            continue;
          }

          // TODO: Aquí puedes agregar verificación de MercadoPago si necesitas
          // const mpStatus = await checkMercadoPagoStatus(lubricentro.subscriptionId);

          // Ejecutar renovación
          await executeRenewal(lubricentro);
          result.renewedCount++;

        } catch (error) {
          console.error(`❌ Error procesando ${docRef.id}:`, error);
          result.errorCount++;
          result.errors.push({
            lubricentroId: docRef.id,
            error: error instanceof Error ? error.message : 'Error desconocido',
            fantasyName: docRef.data().fantasyName
          });
        }
      }

      // 3. Registrar resultado
      await addDoc(collection(db, 'system_logs'), {
        type: 'manual_renewal_process',
        executedBy: userProfile?.id,
        executedByEmail: userProfile?.email,
        timestamp: serverTimestamp(),
        result
      });

      setLastResult(result);


      // Recargar estadísticas
      await loadStats();

    } catch (err) {
      console.error('❌ Error en proceso manual:', err);
      setError('Error al procesar renovaciones');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * ✅ EJECUTAR RENOVACIÓN
   */
  const executeRenewal = async (lubricentro: any) => {
    const now = new Date();
    const renewalType = lubricentro.subscriptionRenewalType || 'monthly';
    
    // Calcular nueva fecha de ciclo
    const newCycleEndDate = new Date(now);
    if (renewalType === 'semiannual') {
      newCycleEndDate.setMonth(newCycleEndDate.getMonth() + 6);
    } else {
      newCycleEndDate.setMonth(newCycleEndDate.getMonth() + 1);
    }

    // Actualizar lubricentro
    await updateDoc(doc(db, 'lubricentros', lubricentro.id), {
      // RESETEAR CONTADORES
      servicesUsedThisMonth: 0,
      
      // ACTUALIZAR FECHAS
      billingCycleEndDate: newCycleEndDate,
      subscriptionEndDate: newCycleEndDate,
      lastRenewalDate: now,
      
      // MANTENER ACTIVO
      estado: 'activo',
      paymentStatus: 'paid',
      
      // CONTAR RENOVACIONES
      renewalCount: (lubricentro.renewalCount || 0) + 1,
      
      updatedAt: now
    });

    // Registrar en historial
    await addDoc(collection(db, 'renewal_history'), {
      lubricentroId: lubricentro.id,
      action: 'renewed',
      details: renewalType,
      timestamp: serverTimestamp(),
      processedBy: userProfile?.id
    });
  };

  /**
   * ❌ EXPIRAR SUSCRIPCIÓN
   */
  const expireSubscription = async (lubricentro: any) => {
    const now = new Date();

    await updateDoc(doc(db, 'lubricentros', lubricentro.id), {
      estado: 'inactivo',
      paymentStatus: 'overdue',
      inactiveReason: 'subscription_expired',
      inactiveSince: now,
      autoRenewal: false,
      updatedAt: now
    });

    // Registrar en historial
    await addDoc(collection(db, 'renewal_history'), {
      lubricentroId: lubricentro.id,
      action: 'expired',
      details: 'manual_expiration',
      timestamp: serverTimestamp(),
      processedBy: userProfile?.id
    });
  };

  /**
   * 🔧 RESETEAR CONTADORES MANUALMENTE
   */
  const resetAllCounters = async () => {
    if (!window.confirm('¿Estás seguro de resetear TODOS los contadores mensuales? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setProcessing(true);

      const activeSnapshot = await getDocs(query(
        collection(db, 'lubricentros'),
        where('estado', 'in', ['activo', 'trial'])
      ));

      let resetCount = 0;

      for (const docRef of activeSnapshot.docs) {
        await updateDoc(doc(db, 'lubricentros', docRef.id), {
          servicesUsedThisMonth: 0,
          lastManualReset: new Date(),
          resetBy: userProfile?.id,
          updatedAt: new Date()
        });
        resetCount++;
      }

      alert(`✅ ${resetCount} contadores reseteados exitosamente`);
      await loadStats();

    } catch (err) {
      console.error('Error reseteando contadores:', err);
      setError('Error al resetear contadores');
    } finally {
      setProcessing(false);
    }
  };

 

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Cargando estadísticas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Renovaciones</h1>
          <p className="mt-2 text-gray-600">
            Gestión manual de renovaciones y contadores de suscripción
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={loadStats}
            variant="outline"
            icon={<ChartBarIcon className="h-4 w-4" />}
            disabled={loading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {/* ESTADÍSTICAS PRINCIPALES */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Activos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalActive}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Vencidas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Expiran Pronto</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</p>
                </div>
                <ClockIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Último Proceso</p>
                  <p className="text-sm text-gray-800">
                    {stats.lastProcessed 
                      ? stats.lastProcessed.toLocaleString()
                      : 'Nunca'
                    }
                  </p>
                </div>
                <CogIcon className="h-8 w-8 text-gray-500" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ACCIONES PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <div className="text-center">
              <PlayIcon className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Procesar Renovaciones
              </h3>
              <p className="text-gray-600 mb-4">
                Ejecuta el proceso de renovación para todas las suscripciones vencidas.
                Se renovarán automáticamente las que tengan auto-renovación activada.
              </p>
              <Button
                onClick={processRenewalsManually}
                disabled={processing || stats?.overdue === 0}
                color="primary"
                icon={processing ? undefined : <PlayIcon className="h-4 w-4" />}
                className="w-full"
              >
                {processing ? 'Procesando...' : `Procesar ${stats?.overdue || 0} Renovaciones`}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-center">
              <CogIcon className="mx-auto h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Resetear Contadores
              </h3>
              <p className="text-gray-600 mb-4">
                Resetea manualmente todos los contadores mensuales de servicios.
                Úsalo solo en casos especiales.
              </p>
              <Button
                onClick={resetAllCounters}
                disabled={processing}
                variant="outline"
                color="warning"
                icon={<CogIcon className="h-4 w-4" />}
                className="w-full"
              >
                Resetear Todos los Contadores
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* RESULTADO DEL ÚLTIMO PROCESO */}
      {lastResult && (
        <Card>
          <CardBody>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Resultado del Último Proceso
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{lastResult.processedCount}</p>
                <p className="text-sm text-gray-600">Procesados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{lastResult.renewedCount}</p>
                <p className="text-sm text-gray-600">Renovados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{lastResult.expiredCount}</p>
                <p className="text-sm text-gray-600">Expirados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{lastResult.errorCount}</p>
                <p className="text-sm text-gray-600">Errores</p>
              </div>
            </div>

            {lastResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-900 mb-2">Errores Encontrados:</h4>
                <div className="bg-red-50 rounded-lg p-3">
                  {lastResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      <strong>{error.fantasyName || error.lubricentroId}</strong>: {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default ManualRenewalDashboard;