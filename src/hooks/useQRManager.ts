import React, { useState, useCallback, useMemo } from 'react'; // ✅ Importar React
import { qrServiceNative } from '../services/qrServiceNative';
import { customQRService, QRCustomOptions } from '../services/customQRService';

export interface UseQRManagerOptions {
  oilChange: any;
  lubricentro: any;
  defaultMode?: 'simple' | 'custom';
  autoGeneratePreview?: boolean;
}

export interface QRManagerState {
  loading: boolean;
  error: string | null;
  previewImage: string | null;
  mode: 'simple' | 'custom';
}

export interface QRManagerActions {
  setMode: (mode: 'simple' | 'custom') => void;
  generatePreview: (options?: QRCustomOptions) => Promise<void>;
  printThermalLabel: (options?: QRCustomOptions) => Promise<void>;
  printBatchLabels: (oilChanges: any[], options?: QRCustomOptions) => Promise<void>;
  downloadQR: (filename?: string, options?: QRCustomOptions) => Promise<void>;
  downloadWithLogo: (filename?: string, options?: QRCustomOptions) => Promise<void>;
  downloadBatch: (oilChanges: any[], options?: QRCustomOptions) => Promise<void>;
  previewLabel: (options?: QRCustomOptions) => Promise<void>;
  clearError: () => void;
  getConsultationURL: () => string;
}

export const useQRManager = ({
  oilChange,
  lubricentro,
  defaultMode = 'custom',
  autoGeneratePreview = true
}: UseQRManagerOptions) => {
  const [state, setState] = useState<QRManagerState>({
    loading: false,
    error: null,
    previewImage: null,
    mode: defaultMode
  });

  // Función auxiliar para manejar errores
  const handleError = useCallback((error: any, defaultMessage: string) => {
    console.error(error);
    setState(prev => ({
      ...prev,
      loading: false,
      error: error?.message || defaultMessage
    }));
  }, []);

  // Función auxiliar para iniciar loading
  const startLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));
  }, []);

  // Función auxiliar para finalizar loading
  const finishLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: false
    }));
  }, []);

  // Cambiar modo de QR
  const setMode = useCallback((mode: 'simple' | 'custom') => {
    setState(prev => ({
      ...prev,
      mode,
      previewImage: null
    }));
  }, []);

  // Generar vista previa
  const generatePreview = useCallback(async (options?: QRCustomOptions) => {
    if (!oilChange?.dominioVehiculo) {
      setState(prev => ({
        ...prev,
        error: 'No hay información del vehículo disponible'
      }));
      return;
    }

    try {
      startLoading();
      
      let imageUrl: string;
      
      if (state.mode === 'custom') {
        imageUrl = await customQRService.generateCustomQRImage(
          oilChange.dominioVehiculo,
          {
            lubricentroName: lubricentro?.fantasyName || 'Sistema HISMA',
            ...options
          }
        );
      } else {
        imageUrl = qrServiceNative.generateQRURL(oilChange.dominioVehiculo, 180);
      }

      setState(prev => ({
        ...prev,
        previewImage: imageUrl,
        loading: false
      }));
      
    } catch (error) {
      handleError(error, 'Error al generar vista previa del QR');
    }
  }, [oilChange?.dominioVehiculo, lubricentro, state.mode, startLoading, handleError]);

  // Imprimir etiqueta térmica
  const printThermalLabel = useCallback(async (options?: QRCustomOptions) => {
    if (!oilChange?.dominioVehiculo) {
      handleError(new Error('No hay información del vehículo'), 'Información del vehículo requerida');
      return;
    }

    try {
      startLoading();
      
      await qrServiceNative.printThermalLabel(oilChange, lubricentro, {
        useCustomQR: state.mode === 'custom',
        customOptions: state.mode === 'custom' ? options : {},
        autoPrint: true
      });
      
      finishLoading();
    } catch (error) {
      handleError(error, 'Error al imprimir etiqueta térmica');
    }
  }, [oilChange, lubricentro, state.mode, startLoading, finishLoading, handleError]);

  // Resto de funciones... (manteniendo la misma lógica pero sin errores)
  const printBatchLabels = useCallback(async (oilChanges: any[], options?: QRCustomOptions) => {
    if (!oilChanges?.length) {
      handleError(new Error('No hay cambios de aceite seleccionados'), 'Cambios de aceite requeridos');
      return;
    }

    try {
      startLoading();
      await qrServiceNative.printBatchLabels(oilChanges, lubricentro, options);
      finishLoading();
    } catch (error) {
      handleError(error, 'Error al imprimir etiquetas en lote');
    }
  }, [lubricentro, startLoading, finishLoading, handleError]);

  const downloadQR = useCallback(async (filename?: string, options?: QRCustomOptions) => {
    if (!oilChange?.dominioVehiculo) {
      handleError(new Error('No hay información del vehículo'), 'Información del vehículo requerida');
      return;
    }

    try {
      startLoading();
      
      const finalFilename = filename || `qr-${state.mode}-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`;
      
      await qrServiceNative.downloadQRImage(oilChange.dominioVehiculo, {
        filename: finalFilename,
        useCustom: state.mode === 'custom',
        customOptions: state.mode === 'custom' ? options : {}
      });
      
      finishLoading();
    } catch (error) {
      handleError(error, 'Error al descargar código QR');
    }
  }, [oilChange, state.mode, startLoading, finishLoading, handleError]);

  const downloadWithLogo = useCallback(async (filename?: string, options?: QRCustomOptions) => {
    if (!lubricentro?.logoUrl && !lubricentro?.logoBase64) {
      handleError(new Error('No hay logo disponible'), 'Logo del lubricentro requerido');
      return;
    }

    if (!oilChange?.dominioVehiculo) {
      handleError(new Error('No hay información del vehículo'), 'Información del vehículo requerida');
      return;
    }

    try {
      startLoading();
      
      const logoUrl = lubricentro.logoBase64 || lubricentro.logoUrl;
      const qrWithLogo = await customQRService.generateQRWithLogo(
        oilChange.dominioVehiculo,
        logoUrl,
        options
      );

      const link = document.createElement('a');
      link.href = qrWithLogo;
      link.download = filename || `qr-logo-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      finishLoading();
    } catch (error) {
      handleError(error, 'Error al generar QR con logo');
    }
  }, [oilChange, lubricentro, startLoading, finishLoading, handleError]);

  const downloadBatch = useCallback(async (oilChanges: any[], options?: QRCustomOptions) => {
    if (!oilChanges?.length) {
      handleError(new Error('No hay cambios seleccionados'), 'Cambios de aceite requeridos');
      return;
    }

    try {
      startLoading();
      
      const promises = oilChanges.map(async (change, index) => {
        const qrImage = await customQRService.generateCustomQRImage(
          change.dominioVehiculo,
          {
            lubricentroName: lubricentro?.fantasyName || 'Sistema HISMA',
            ...options
          }
        );
        return {
          filename: `qr-${change.dominioVehiculo}.png`,
          data: qrImage
        };
      });

      const results = await Promise.all(promises);
      
      for (const result of results) {
        const link = document.createElement('a');
        link.href = result.data;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      finishLoading();
    } catch (error) {
      handleError(error, 'Error al descargar QRs en lote');
    }
  }, [lubricentro, startLoading, finishLoading, handleError]);

  const previewLabel = useCallback(async (options?: QRCustomOptions) => {
    if (!oilChange?.dominioVehiculo) {
      handleError(new Error('No hay información del vehículo'), 'Información del vehículo requerida');
      return;
    }

    try {
      startLoading();
      
      await qrServiceNative.previewThermalLabel(
        oilChange,
        lubricentro,
        state.mode === 'custom' ? options : {}
      );
      
      finishLoading();
    } catch (error) {
      handleError(error, 'Error al mostrar vista previa de etiqueta');
    }
  }, [oilChange, lubricentro, state.mode, startLoading, finishLoading, handleError]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const getConsultationURL = useMemo(() => {
    return () => {
      if (!oilChange?.dominioVehiculo) return '';
      return `${window.location.origin}/consulta-historial?dominio=${encodeURIComponent(oilChange.dominioVehiculo.toUpperCase())}`;
    };
  }, [oilChange?.dominioVehiculo]);

  // Auto-generar preview si está habilitado
  React.useEffect(() => {
    if (autoGeneratePreview && oilChange?.dominioVehiculo && !state.previewImage) {
      generatePreview();
    }
  }, [autoGeneratePreview, oilChange?.dominioVehiculo, state.previewImage, generatePreview]);

  const info = useMemo(() => ({
    hasLogo: !!(lubricentro?.logoUrl || lubricentro?.logoBase64),
    isValidVehicle: !!oilChange?.dominioVehiculo,
    consultationURL: getConsultationURL(),
    currentMode: state.mode,
    canPrint: !!oilChange?.dominioVehiculo,
    canDownload: !!oilChange?.dominioVehiculo,
    previewAvailable: !!state.previewImage
  }), [lubricentro, oilChange, state.mode, state.previewImage, getConsultationURL]);

  const actions: QRManagerActions = {
    setMode,
    generatePreview,
    printThermalLabel,
    printBatchLabels,
    downloadQR,
    downloadWithLogo,
    downloadBatch,
    previewLabel,
    clearError,
    getConsultationURL
  };

  return {
    state,
    actions,
    info
  };
};

export type QRManagerReturn = ReturnType<typeof useQRManager>;