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
          collection(db, 'cambiosAceite'), // CORREGIDO: usar cambiosAceite
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
        const changeDate = change.fecha.toDate ? change.fecha.toDate() : new Date(change.fecha);
        
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
          const nextDate = change.fechaProximoCambio.toDate ? 
            change.fechaProximoCambio.toDate() : 
            new Date(change.fechaProximoCambio);
          
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
        collection(db, 'cambiosAceite'), // CORREGIDO: usar cambiosAceite
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
        collection(db, 'cambiosAceite'), // CORREGIDO: usar cambiosAceite
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
}