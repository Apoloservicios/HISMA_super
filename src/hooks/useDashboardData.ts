// src/hooks/useDashboardData.ts
import { useState, useEffect, useCallback } from 'react';
import { getLubricentroById } from '../services/lubricentroService';
import { getOilChangesStats, getUpcomingOilChanges } from '../services/oilChangeService';
import { getUsersByLubricentro, getUsersOperatorStats } from '../services/userService';
import { Lubricentro, OilChangeStats, User, OilChange, OperatorStats } from '../types';

interface DashboardData {
  lubricentro: Lubricentro | null;
  stats: OilChangeStats | null;
  users: User[];
  upcomingOilChanges: OilChange[];
  operatorStats: OperatorStats[];
}

interface UseDashboardDataReturn {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache simple en memoria para evitar consultas repetidas
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const useCache = <T>(key: string, fetcher: () => Promise<T>, ttl: number = 30000): Promise<T> => {
  const cached = cache.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < cached.ttl) {
    return Promise.resolve(cached.data);
  }
  
  return fetcher().then(data => {
    cache.set(key, { data, timestamp: now, ttl });
    return data;
  });
};

export const useDashboardData = (lubricentroId: string | undefined): UseDashboardDataReturn => {
  const [data, setData] = useState<DashboardData>({
    lubricentro: null,
    stats: null,
    users: [],
    upcomingOilChanges: [],
    operatorStats: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!lubricentroId) {
      setError('No se encontró información del lubricentro');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Datos críticos primero (lubricentro y estadísticas básicas)
      const [lubricentroResult, statsResult] = await Promise.allSettled([
        useCache(`lubricentro-${lubricentroId}`, () => getLubricentroById(lubricentroId), 60000), // 1 minuto cache
        useCache(`stats-${lubricentroId}`, () => getOilChangesStats(lubricentroId), 30000) // 30 segundos cache
      ]);

      let lubricentroData: Lubricentro | null = null;
      let statsData: OilChangeStats | null = null;

      if (lubricentroResult.status === 'fulfilled') {
        lubricentroData = lubricentroResult.value;
      } else {
        console.error('Error cargando lubricentro:', lubricentroResult.reason);
        setError('Error al cargar información del lubricentro');
        return;
      }

      if (statsResult.status === 'fulfilled') {
        statsData = statsResult.value;
      } else {
        console.warn('Error cargando estadísticas:', statsResult.reason);
        // Usar estadísticas por defecto si falla
        statsData = {
          total: 0,
          thisMonth: 0,
          lastMonth: 0,
          upcoming30Days: 0
        };
      }

      // Actualizar estado con datos críticos
      setData(prev => ({
        ...prev,
        lubricentro: lubricentroData,
        stats: statsData
      }));

      // 2. Datos secundarios en paralelo (no bloquean la UI)
      const [usersResult, upcomingResult] = await Promise.allSettled([
        useCache(`users-${lubricentroId}`, () => getUsersByLubricentro(lubricentroId), 120000), // 2 minutos cache
        useCache(`upcoming-${lubricentroId}`, () => getUpcomingOilChanges(lubricentroId, 30), 60000) // 1 minuto cache
      ]);

      let usersData: User[] = [];
      let upcomingData: OilChange[] = [];

      if (usersResult.status === 'fulfilled') {
        usersData = usersResult.value;
      } else {
        console.warn('Error cargando usuarios:', usersResult.reason);
      }

      if (upcomingResult.status === 'fulfilled') {
        upcomingData = upcomingResult.value.slice(0, 5); // Solo los primeros 5
      } else {
        console.warn('Error cargando próximos cambios:', upcomingResult.reason);
      }

      // 3. Datos de operadores (menos críticos, se cargan al final)
      try {
        const today = new Date();
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const operatorData = await useCache(
          `operators-${lubricentroId}-${today.getMonth()}`,
          () => getUsersOperatorStats(lubricentroId, firstDayThisMonth, lastDayThisMonth),
          300000 // 5 minutos cache para datos de operadores
        );
        
        // Actualizar todo el estado al final
        setData({
          lubricentro: lubricentroData,
          stats: statsData,
          users: usersData,
          upcomingOilChanges: upcomingData,
          operatorStats: operatorData
        });
      } catch (operatorError) {
        console.warn('Error cargando estadísticas de operadores:', operatorError);
        // Actualizar estado sin estadísticas de operadores
        setData({
          lubricentro: lubricentroData,
          stats: statsData,
          users: usersData,
          upcomingOilChanges: upcomingData,
          operatorStats: []
        });
      }

    } catch (err) {
      console.error('Error general en dashboard:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [lubricentroId]);

  const refetch = useCallback(() => {
    // Limpiar cache antes de recargar
    if (lubricentroId) {
      cache.delete(`lubricentro-${lubricentroId}`);
      cache.delete(`stats-${lubricentroId}`);
      cache.delete(`users-${lubricentroId}`);
      cache.delete(`upcoming-${lubricentroId}`);
      const today = new Date();
      cache.delete(`operators-${lubricentroId}-${today.getMonth()}`);
    }
    fetchData();
  }, [fetchData, lubricentroId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};