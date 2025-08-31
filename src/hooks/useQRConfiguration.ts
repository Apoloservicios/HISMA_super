// src/hooks/useQRConfiguration.ts - VERSIÓN CORREGIDA
import { useState, useEffect, useCallback } from 'react';
import { qrServiceNative, QRConfiguration } from '../services/qrServiceNative';
import { useAuth } from '../context/AuthContext'; // ✅ Corregido: ruta correcta

interface UseQRConfigurationReturn {
  config: QRConfiguration | null;
  loading: boolean;
  error: string | null;
  saveConfig: (newConfig: Partial<QRConfiguration>) => Promise<void>;
  resetConfig: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}

export const useQRConfiguration = (): UseQRConfigurationReturn => {
  const { userProfile } = useAuth(); // ✅ Corregido: usar userProfile
  const [config, setConfig] = useState<QRConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuración
  const loadConfig = useCallback(async () => {
    if (!userProfile?.lubricentroId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const loadedConfig = await qrServiceNative.loadQRConfiguration(userProfile.lubricentroId);
      setConfig(loadedConfig);
      
    } catch (err: any) {
      console.error('Error cargando configuración QR:', err);
      setError(err.message || 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.lubricentroId]);

  // Cargar configuración al inicializar
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Guardar configuración
  const saveConfig = useCallback(async (newConfig: Partial<QRConfiguration>) => {
    if (!userProfile?.lubricentroId) {
      throw new Error('Lubricentro no identificado');
    }

    try {
      setError(null);
      
      // Guardar en Firebase
      await qrServiceNative.saveQRConfiguration(userProfile.lubricentroId, newConfig);
      
      // Recargar configuración actualizada
      const updatedConfig = await qrServiceNative.loadQRConfiguration(userProfile.lubricentroId);
      setConfig(updatedConfig);
      
    } catch (err: any) {
      console.error('Error guardando configuración QR:', err);
      const errorMessage = err.message || 'Error al guardar configuración';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userProfile?.lubricentroId]);

  // Resetear configuración a valores por defecto
  const resetConfig = useCallback(async () => {
    if (!userProfile?.lubricentroId) {
      throw new Error('Lubricentro no identificado');
    }

    const defaultConfig: Partial<QRConfiguration> = {
      headerText: 'Historial de Mantenimiento',
      footerText: 'Escanee para consultar historial',
      instructions: '📱 Escanee para ver historial completo del vehículo en su celular',
      includeDate: true,
      includeCompanyName: true,
      paperSize: 'thermal',
      qrSize: 120,
      fontSize: 10,
      margins: {
        top: 10,
        bottom: 10,
        left: 5,
        right: 5
      },
      colors: {
        background: '#ffffff',
        text: '#000000',
        border: '#333333'
      }
    };

    await saveConfig(defaultConfig);
  }, [saveConfig]);

  // Refrescar configuración
  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    saveConfig,
    resetConfig,
    refreshConfig
  };
};

export default useQRConfiguration;