// src/services/dashboardService.ts
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OilChangeStats, Lubricentro, User, OilChange } from '../types';

/**
 * Servicio optimizado para el dashboard
 * Combina múltiples consultas en una sola función para reducir la latencia
 */
export class DashboardService {
  // Cache simple para evitar consultas repetidas
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  private static useCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 30000): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return Promise.resolve(cached.data);
    }
    
    return fetcher().then(data => {
      this.cache.set(key, { data, timestamp: now, ttl });
      return data;
    });
  }

  static clearCache(lubricentroId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(lubricentroId)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Helper para convertir fechas de manera segura
   */
  private static toDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    return new Date();
  }

  /**
   * Obtiene los datos esenciales del dashboard de forma optimizada
   */
  static async getDashboardEssentials(lubricentroId: string): Promise<{
    lubricentro: Lubricentro;
    stats: OilChangeStats;
    users: User[];
  }> {
    const cacheKey = `dashboard-essentials-${lubricentroId}`;
    
    return this.useCache(cacheKey, async () => {
      // Ejecutar las 3 consultas más importantes en paralelo
      const [lubricentroDoc, oilChangesSnapshot, usersSnapshot] = await Promise.all([
        getDoc(doc(db, 'lubricentros', lubricentroId)),
        getDocs(query(
          collection(db, 'cambiosAceite'),
          where('lubricentroId', '==', lubricentroId),
          orderBy('fecha', 'desc'),
          limit(100) // Limitar para mejorar rendimiento
        )),
        getDocs(query(
          collection(db, 'usuarios'),
          where('lubricentroId', '==', lubricentroId),
          where('estado', '==', 'activo')
        ))
      ]);

      // Procesar datos del lubricentro
      if (!lubricentroDoc.exists()) {
        throw new Error('Lubricentro no encontrado');
      }

      const lubricentro = {
        id: lubricentroDoc.id,
        ...lubricentroDoc.data()
      } as Lubricentro;

      // Procesar usuarios
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));

      // Procesar estadísticas de cambios de aceite de forma eficiente
      const oilChanges = oilChangesSnapshot.docs.map(doc => doc.data());
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 días

      let thisMonth = 0;
      let lastMonth = 0;
      let upcoming30Days = 0;

      oilChanges.forEach(change => {
        const changeDate = this.toDate(change.fecha);
        
        // Contar cambios de este mes
        if (changeDate >= thisMonthStart) {
          thisMonth++;
        }
        
        // Contar cambios del mes pasado
        if (changeDate >= lastMonthStart && changeDate <= lastMonthEnd) {
          lastMonth++;
        }

        // Contar próximos cambios (si existe fechaProximoCambio)
        if (change.fechaProximoCambio) {
          const nextDate = this.toDate(change.fechaProximoCambio);
          
          if (nextDate <= futureDate && nextDate >= now) {
            upcoming30Days++;
          }
        }
      });

      const stats: OilChangeStats = {
        total: oilChanges.length,
        thisMonth,
        lastMonth,
        upcoming30Days
      };

      return { lubricentro, stats, users };
    }, 60000); // Cache por 1 minuto
  }

  /**
   * Obtiene los próximos cambios de aceite de forma optimizada
   */
  static async getUpcomingChanges(lubricentroId: string, limitCount: number = 5): Promise<OilChange[]> {
    const cacheKey = `upcoming-changes-${lubricentroId}-${limitCount}`;
    
    return this.useCache(cacheKey, async () => {
      const now = Timestamp.now();
      const futureLimit = Timestamp.fromDate(new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)));

      const snapshot = await getDocs(query(
        collection(db, 'cambiosAceite'),
        where('lubricentroId', '==', lubricentroId),
        where('fechaProximoCambio', '>=', now),
        where('fechaProximoCambio', '<=', futureLimit),
        orderBy('fechaProximoCambio', 'asc'),
        limit(limitCount)
      ));

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OilChange));
    }, 120000); // Cache por 2 minutos
  }

  /**
   * Obtiene estadísticas de operadores para el mes actual
   */
  static async getOperatorStats(lubricentroId: string): Promise<Array<{
    operatorId: string;
    operatorName: string;
    count: number;
  }>> {
    const now = new Date();
    const cacheKey = `operator-stats-${lubricentroId}-${now.getFullYear()}-${now.getMonth()}`;
    
    return this.useCache(cacheKey, async () => {
      const thisMonthStart = Timestamp.fromDate(
        new Date(now.getFullYear(), now.getMonth(), 1)
      );
      const thisMonthEnd = Timestamp.fromDate(
        new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      );

      const snapshot = await getDocs(query(
        collection(db, 'cambiosAceite'),
        where('lubricentroId', '==', lubricentroId),
        where('fecha', '>=', thisMonthStart),
        where('fecha', '<=', thisMonthEnd),
        orderBy('fecha', 'desc')
      ));

      // Contar servicios por operador
      const operatorCounts = new Map<string, { name: string; count: number }>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const operatorId = data.operatorId || data.operatorName || 'Sin asignar';
        const operatorName = data.nombreOperario || 'Sin nombre';
        
        if (operatorCounts.has(operatorId)) {
          operatorCounts.get(operatorId)!.count++;
        } else {
          operatorCounts.set(operatorId, { name: operatorName, count: 1 });
        }
      });

      // Convertir a array y ordenar por cantidad
      return Array.from(operatorCounts.entries())
        .map(([id, data]) => ({
          operatorId: id,
          operatorName: data.name,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count);
    }, 300000); // Cache por 5 minutos
  }

  /**
   * Obtiene todos los datos del dashboard de una vez (para carga inicial optimizada)
   */
  static async getAllDashboardData(lubricentroId: string): Promise<{
    lubricentro: Lubricentro;
    stats: OilChangeStats;
    users: User[];
    upcomingChanges: OilChange[];
    operatorStats: Array<{
      operatorId: string;
      operatorName: string;
      count: number;
    }>;
  }> {
    try {
      // 1. Obtener datos esenciales primero
      const essentials = await this.getDashboardEssentials(lubricentroId);
      
      // 2. Obtener datos secundarios en paralelo
      const [upcomingChanges, operatorStats] = await Promise.allSettled([
        this.getUpcomingChanges(lubricentroId, 5),
        this.getOperatorStats(lubricentroId)
      ]);

      return {
        ...essentials,
        upcomingChanges: upcomingChanges.status === 'fulfilled' ? upcomingChanges.value : [],
        operatorStats: operatorStats.status === 'fulfilled' ? operatorStats.value : []
      };
    } catch (error) {
      console.error('Error obteniendo datos del dashboard:', error);
      throw error;
    }
  }

  /**
   * Verifica si el lubricentro existe antes de cargar datos completos
   */
  static async checkLubricentroExists(lubricentroId: string): Promise<boolean> {
    const cacheKey = `exists-${lubricentroId}`;
    
    return this.useCache(cacheKey, async () => {
      const docRef = doc(db, 'lubricentros', lubricentroId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    }, 300000); // Cache por 5 minutos
  }

  /**
   * Utilidad para corregir el cálculo de rangos de fechas
   */
  static fixDateRangeCalculation = (dateRange: string): { startDate: Date; endDate: Date; daysInPeriod: number } => {
    try {
      // Intentar parsear el rango de fechas
      const dates = dateRange.split(' - ');
      if (dates.length === 2) {
        // Formato DD/MM/YYYY
        const parseDate = (dateStr: string): Date => {
          const parts = dateStr.trim().split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
          return new Date(dateStr);
        };
        
        const startDate = parseDate(dates[0]);
        const endDate = parseDate(dates[1]);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return { startDate, endDate, daysInPeriod: Math.max(1, daysInPeriod) };
        }
      }
      
      // Fallback: usar fechas por defecto
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      return {
        startDate,
        endDate,
        daysInPeriod: 30
      };
    } catch (error) {
      console.error('Error parseando rango de fechas:', error);
      
      // Fallback seguro
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      return {
        startDate,
        endDate,
        daysInPeriod: 30
      };
    }
  };

  /**
   * Obtiene un resumen rápido para notificaciones
   */
  static async getNotificationSummary(lubricentroId: string): Promise<{
    overdueChanges: number;
    upcomingChanges: number;
    lowStock?: number;
    warrantyAlerts?: number;
  }> {
    try {
      const upcomingChanges = await this.getUpcomingChanges(lubricentroId, 50);

      const today = new Date();
      const overdue = upcomingChanges.filter(change => {
        if (!change.fechaProximoCambio) return false;
        const nextDate = this.toDate(change.fechaProximoCambio);
        return nextDate < today;
      }).length;
      
      const upcoming = upcomingChanges.filter(change => {
        if (!change.fechaProximoCambio) return false;
        const nextDate = this.toDate(change.fechaProximoCambio);
        const days = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 7;
      }).length;

      return {
        overdueChanges: overdue,
        upcomingChanges: upcoming
      };
    } catch (error) {
      console.error('Error obteniendo resumen de notificaciones:', error);
      return {
        overdueChanges: 0,
        upcomingChanges: 0
      };
    }
  }

  /**
   * Obtiene datos para gráficos del dashboard
   */
  static async getChartData(lubricentroId: string): Promise<{
    monthlyData: Array<{ month: string; cambios: number }>;
    operatorData: Array<{ operatorId: string; operatorName: string; count: number }>;
  }> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const q = query(
        collection(db, 'cambiosAceite'),
        where('lubricentroId', '==', lubricentroId),
        where('fecha', '>=', Timestamp.fromDate(sixMonthsAgo)),
        orderBy('fecha', 'desc'),
        limit(500)
      );

      const querySnapshot = await getDocs(q);
      const oilChanges = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OilChange[];

      // Agrupar por mes
      const monthlyGrouped = oilChanges.reduce((acc, change) => {
        const date = this.toDate(change.fecha);
        const month = date.toLocaleDateString('es-ES', { 
          month: 'short', 
          year: 'numeric' 
        });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const monthlyData = Object.entries(monthlyGrouped).map(([month, cambios]) => ({
        month,
        cambios
      }));

      const operatorData = await this.getOperatorStats(lubricentroId);

      return {
        monthlyData,
        operatorData
      };
    } catch (error) {
      console.error('Error obteniendo datos de gráficos:', error);
      return {
        monthlyData: [],
        operatorData: []
      };
    }
  }

  /**
   * Verifica el estado de la suscripción y límites
   */
  static async checkSubscriptionStatus(lubricentro: Lubricentro): Promise<{
    isActive: boolean;
    daysRemaining?: number;
    servicesUsed?: number;
    servicesLimit?: number;
    warningLevel: 'none' | 'warning' | 'critical';
  }> {
    try {
      if (lubricentro.estado === 'activo') {
        return {
          isActive: true,
          warningLevel: 'none'
        };
      }

      if (lubricentro.estado === 'trial' && lubricentro.trialEndDate) {
        const now = new Date();
        const endDate = this.toDate(lubricentro.trialEndDate);

        const diffTime = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const servicesUsed = lubricentro.servicesUsedThisMonth || 0;
        const servicesLimit = 10; // Límite de prueba
        
        let warningLevel: 'none' | 'warning' | 'critical' = 'none';
        
        if (daysRemaining <= 2 || servicesUsed >= servicesLimit) {
          warningLevel = 'critical';
        } else if (daysRemaining <= 5 || servicesUsed >= servicesLimit * 0.8) {
          warningLevel = 'warning';
        }

        return {
          isActive: daysRemaining > 0 && servicesUsed < servicesLimit,
          daysRemaining: Math.max(0, daysRemaining),
          servicesUsed,
          servicesLimit,
          warningLevel
        };
      }

      return {
        isActive: false,
        warningLevel: 'critical'
      };
    } catch (error) {
      console.error('Error verificando estado de suscripción:', error);
      return {
        isActive: false,
        warningLevel: 'critical'
      };
    }
  }

  /**
   * Obtiene métricas de performance del lubricentro
   */
  static async getPerformanceMetrics(lubricentroId: string): Promise<{
    totalClients: number;
    repeatCustomers: number;
    averageServiceInterval: number;
    topServices: Array<{ service: string; count: number }>;
  }> {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const q = query(
        collection(db, 'cambiosAceite'),
        where('lubricentroId', '==', lubricentroId),
        where('fecha', '>=', Timestamp.fromDate(threeMonthsAgo)),
        orderBy('fecha', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const oilChanges = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OilChange[];

      const uniqueClients = new Set(oilChanges.map(change => change.nombreCliente)).size;
      const clientCounts = oilChanges.reduce((acc, change) => {
        acc[change.nombreCliente] = (acc[change.nombreCliente] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const repeatCustomers = Object.values(clientCounts).filter(count => count > 1).length;

      const serviceTypes = oilChanges.reduce((acc, change) => {
        const service = `${change.marcaAceite} ${change.tipoAceite}`;
        acc[service] = (acc[service] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topServices = Object.entries(serviceTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([service, count]) => ({ service, count }));

      return {
        totalClients: uniqueClients,
        repeatCustomers,
        averageServiceInterval: 30,
        topServices
      };
    } catch (error) {
      console.error('Error obteniendo métricas de performance:', error);
      return {
        totalClients: 0,
        repeatCustomers: 0,
        averageServiceInterval: 0,
        topServices: []
      };
    }
  }

  /**
   * Función para obtener datos de cambios de aceite filtrados por fechas (para reportes)
   */
  static async getOilChangesForReports(
    lubricentroId: string, 
    startDate: Date, 
    endDate: Date,
    limitCount?: number
  ): Promise<OilChange[]> {
    try {
      let q = query(
        collection(db, 'cambiosAceite'),
        where('lubricentroId', '==', lubricentroId),
        where('fecha', '>=', Timestamp.fromDate(startDate)),
        where('fecha', '<=', Timestamp.fromDate(endDate)),
        orderBy('fecha', 'desc')
      );

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OilChange));
    } catch (error) {
      console.error('Error obteniendo cambios de aceite para reportes:', error);
      return [];
    }
  }
}