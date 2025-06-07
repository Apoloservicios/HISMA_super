// src/hooks/useDashboardData.ts - VERSIÓN ACTUALIZADA
import { useState, useEffect, useCallback } from 'react';
import { DashboardService } from '../services/dashboardService';
import { Lubricentro, OilChangeStats, User, OilChange, OperatorStats } from '../types';

interface DashboardData {
  lubricentro: Lubricentro | null;
  stats: OilChangeStats | null;
  users: User[];
  upcomingOilChanges: OilChange[];
  operatorStats: Array<{
    operatorId: string;
    operatorName: string;
    count: number;
  }>;
}

interface UseDashboardDataReturn {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

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

      // ✅ USAR EL NUEVO DASHBOARD SERVICE OPTIMIZADO
      const dashboardData = await DashboardService.getAllDashboardData(lubricentroId);
      
      setData({
        lubricentro: dashboardData.lubricentro,
        stats: dashboardData.stats,
        users: dashboardData.users,
        upcomingOilChanges: dashboardData.upcomingChanges,
        operatorStats: dashboardData.operatorStats
      });

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
      DashboardService.clearCache(lubricentroId);
    }
    fetchData();
  }, [fetchData, lubricentroId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};