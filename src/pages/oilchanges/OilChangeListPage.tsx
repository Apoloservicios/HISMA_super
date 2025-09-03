// src/pages/oilchanges/OilChangeListPage.tsx
// Implementación completa con paginación y buscador mejorado

import React, { useState, useEffect, useRef } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { getOilChangesByLubricentro, searchOilChanges, getOilChangeById, fixCreatedAtFields, searchOilChangesMultiField,fixCreatedAtFieldsForAll } from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import { OilChange, Lubricentro } from '../../types';
import { SortableOilChangeTable } from '../../components/tables/SortableOilChangeTable';

import EnhancedPrintComponent from '../../components/print/EnhancedPrintComponent';
import  enhancedPdfService  from '../../services/enhancedPdfService';


import { 
  globalSearchOilChanges, 
  duplicateOilChangeToLubricentro 
} from '../../services/oilChangeService';
import GlobalSearchComponent from '../../components/oilchange/GlobalSearchComponent';
import DuplicateOilChangeModal from '../../components/oilchange/DuplicateOilChangeModal';

import { 
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';

// Iconos
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  PrinterIcon,
  ShareIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon  ,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

import { OilChangeStatusBadge } from '../../components/oilchange/OilChangeStatusButton';
import OilChangeStatusButton from '../../components/oilchange/OilChangeStatusButton';
import Tooltip from '../../components/ui/Tooltip';



// Debounce function para la búsqueda
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const OilChangeListPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
const [isStale, setIsStale] = useState(false); // Para indicar si los datos pueden estar desactualizados

const [showGlobalSearch, setShowGlobalSearch] = useState(false);
const [globalSearchLoading, setGlobalSearchLoading] = useState(false);


  
  // Estados para búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
    // Estados para el PDF y compartir
    const [selectedOilChange, setSelectedOilChange] = useState<OilChange | null>(null);
    const [selectedLubricentro, setSelectedLubricentro] = useState<Lubricentro | null>(null);
    const [showingPdfPreview, setShowingPdfPreview] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
  
    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10; // Cambiado de 20 a 10 para mejor usabilidad
  
      // Estados para ordenamiento
    const [sortBy, setSortBy] = useState<'nroCambio' | 'fechaServicio' | 'createdAt'>('fechaServicio');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Función para manejar búsqueda global
    const handleGlobalSearch = async (searchTerm: string) => {
      if (!userProfile?.lubricentroId) {
        throw new Error('No se encontró información del lubricentro');
      }
      
      setGlobalSearchLoading(true);
      try {
        const results = await globalSearchOilChanges(
          searchTerm,
          userProfile.lubricentroId
        );
        return results;
      } finally {
        setGlobalSearchLoading(false);
      }
    };


    const handleViewExternalDetails = (oilChange: any) => {
        // Mostrar información más detallada en un alert mejorado
        const info = `
      SERVICIO DE OTRO LUBRICENTRO

      Lubricentro: ${oilChange.lubricentroName}
      Fecha: ${new Date(oilChange.fechaServicio).toLocaleDateString('es-ES')}

      CLIENTE:
      ${oilChange.nombreCliente}
      Tel: ${oilChange.celular || 'No registrado'}

      VEHÍCULO:
      ${oilChange.marcaVehiculo} ${oilChange.modeloVehiculo} (${oilChange.añoVehiculo || 'N/A'})
      Dominio: ${oilChange.dominioVehiculo}
      Km: ${oilChange.kmActuales?.toLocaleString() || 'N/A'}

      ACEITE:
      ${oilChange.marcaAceite} ${oilChange.tipoAceite} ${oilChange.sae}
      Cantidad: ${oilChange.cantidadAceite}L

      ¿Desea usar estos datos como base para un nuevo servicio?
        `;
        
        if (window.confirm(info)) {
            handleDuplicate(oilChange);
          }
      };
    // Función para manejar duplicación
  const handleDuplicate = (oilChange: any) => {
  // En lugar de abrir modal, navegar al formulario con los datos precargados
  const searchParams = new URLSearchParams({
    useAsBase: 'true',
    sourceData: JSON.stringify({
      nombreCliente: oilChange.nombreCliente,
      celular: oilChange.celular,
      dominioVehiculo: oilChange.dominioVehiculo,
      marcaVehiculo: oilChange.marcaVehiculo,
      modeloVehiculo: oilChange.modeloVehiculo,
      tipoVehiculo: oilChange.tipoVehiculo,
      añoVehiculo: oilChange.añoVehiculo,
      marcaAceite: oilChange.marcaAceite,
      tipoAceite: oilChange.tipoAceite,
      sae: oilChange.sae,
      cantidadAceite: oilChange.cantidadAceite,
      perioricidad_servicio: oilChange.perioricidad_servicio || 6,
      // Datos del servicio original para referencia
      originalLubricentro: oilChange.lubricentroName,
      originalFecha: oilChange.fechaServicio,
      originalKm: oilChange.kmActuales
    })
  });
  
  navigate(`/cambios-aceite/nuevo?${searchParams.toString()}`);
};



   



 // ✅ FUNCIÓN CORREGIDA para OilChangeListPage.tsx

const loadOilChanges = async (reset: boolean = false) => {
  if (loading && !reset) return;
  
  try {
    setLoading(true);
    
    if (reset) {
      setOilChanges([]);
      setLastVisible(null);
      setHasMore(true);
      setCurrentPage(1);
    }

    if (!userProfile?.lubricentroId) {
      throw new Error('No se encontró el lubricentro del usuario');
    }

    const debouncedSearch = searchTerm.trim();
    
    if (debouncedSearch) {
      // ✅ CORREGIDO: Usar búsqueda multi-campo
      setIsSearching(true);
      
 
      
      // Intentar la nueva función multi-campo primero
      try {
        const searchResults = await searchOilChangesMultiField(
          userProfile.lubricentroId,
          debouncedSearch,
          50 // Buscar más resultados
        );
        
  
        setOilChanges(searchResults);
        setTotalCount(searchResults.length); // ✅ NUEVO: Actualizar total para búsqueda
        setHasMore(false);
      } catch (searchError) {
        console.warn('Error en búsqueda multi-campo, usando fallback local:', searchError);
        
        // Fallback: cargar todos los datos y filtrar localmente
        const { oilChanges: allChanges } = await getOilChangesByLubricentro(
          userProfile.lubricentroId,
          200, // Cargar más registros para búsqueda local
          undefined,
          'fechaServicio',
          'desc'
        );
        
        // Usar la función de búsqueda local existente
        const filteredResults = performLocalSearch(debouncedSearch, allChanges);
        
        setOilChanges(filteredResults);
        setTotalCount(filteredResults.length); // ✅ NUEVO: Actualizar total para búsqueda local
        setHasMore(false);
      }
    } else {
      // ✅ NUEVO: Para carga normal, obtener el conteo total primero
      if (reset) {
        try {
          // Obtener conteo total aproximado (solo en reset)
          const { oilChanges: allForCount } = await getOilChangesByLubricentro(
            userProfile.lubricentroId,
            500, // Número alto para obtener conteo total aproximado
            undefined,
            'fechaServicio',
            'desc'
          );
          setTotalCount(allForCount.length);
        } catch (countError) {
          console.warn('Error obteniendo conteo total:', countError);
          setTotalCount(0);
        }
        setLastRefresh(new Date());
setIsStale(false);
      }
      
      // Cargar datos normales sin búsqueda
      const { oilChanges: newOilChanges, lastVisible: newLastVisible } = 
        await getOilChangesByLubricentro(
          userProfile.lubricentroId,
          PAGE_SIZE,
          reset ? undefined : lastVisible,
          sortBy,
          sortOrder
        );

      if (reset) {
        setOilChanges(newOilChanges);
      } else {
        setOilChanges(prev => [...prev, ...newOilChanges]);
      }
      
      setLastVisible(newLastVisible);
      setHasMore(newOilChanges.length === PAGE_SIZE && newLastVisible !== null);
    }
  } catch (error) {
    console.error('Error al cargar cambios de aceite:', error);
    setError('Error al cargar los cambios de aceite. Por favor, intente nuevamente.');
  } finally {
    setLoading(false);
    setIsSearching(false);
  }
};

  // Función de búsqueda local como fallback
  const performLocalSearch = (searchTerm: string, allChanges: OilChange[]) => {
    const searchLower = searchTerm.toLowerCase();
    const searchUpper = searchTerm.toUpperCase();
    
    return allChanges.filter(change => {
      // Búsqueda por nombre cliente
      const matchesCliente = change.nombreCliente?.toLowerCase().includes(searchLower);
      
      // Búsqueda por dominio (exacta y parcial)
      const matchesDominioExacto = change.dominioVehiculo === searchUpper;
      const matchesDominioParcial = change.dominioVehiculo?.toLowerCase().includes(searchLower);
      
      // Búsqueda por otros campos
      const matchesMarca = change.marcaVehiculo?.toLowerCase().includes(searchLower);
      const matchesModelo = change.modeloVehiculo?.toLowerCase().includes(searchLower);
      const matchesNroCambio = change.nroCambio?.toLowerCase().includes(searchLower);
      
      return matchesCliente || matchesDominioExacto || matchesDominioParcial || 
             matchesMarca || matchesModelo || matchesNroCambio;
    });
  };

  // Función para manejar completar servicio
  const handleComplete = (id: string) => {
    navigate(`/cambios-aceite/${id}/completar`);
  };

  // Función para actualizar después de cambios de estado
  const handleStatusUpdated = () => {
    loadOilChanges(true);
  };

  // Función para manejar doble click
  const handleRowDoubleClick = (oilChange: OilChange) => {
    navigate(`/cambios-aceite/${oilChange.id}`);
  };

  // Función para manejar edición
const handleEdit = (id: string) => {

  navigate(`/cambios-aceite/editar/${id}`);
};

  // Función para corregir datos inconsistentes
  const handleFixData = async () => {
    if (!userProfile?.lubricentroId) return;
    
    try {
      setLoading(true);
      const fixedCount = await fixCreatedAtFields(userProfile.lubricentroId);
      
      if (fixedCount > 0) {
        // Recargar datos después de la corrección
        await loadOilChanges(true);
        alert(`Se corrigieron ${fixedCount} registros. Los datos se han actualizado.`);
      } else {
        alert('Todos los datos están correctos.');
      }
    } catch (error) {
      console.error('Error al corregir datos:', error);
      alert('Error al corregir los datos. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar más cambios de aceite (paginación)
  const loadMoreOilChanges = async () => {
    if (!hasMore || loading || isSearching) return;
    await loadOilChanges(false);
  };

  // Función para imprimir PDF
  const handlePrint = async (oilChange: OilChange) => {
    try {
      setGeneratingPdf(true);
      setSelectedOilChange(oilChange);
      
      if (!selectedLubricentro && userProfile?.lubricentroId) {
        const lubricentro = await getLubricentroById(userProfile.lubricentroId);
        if (lubricentro) {
          setSelectedLubricentro(lubricentro);
        }
      }

      // Pequeña pausa para que el estado se actualice
      setTimeout(async () => {
        if (selectedLubricentro) {
          await enhancedPdfService.generateDirectPDF(oilChange, selectedLubricentro);
        }
        setGeneratingPdf(false);
      }, 100);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      setError('Error al generar el PDF');
      setGeneratingPdf(false);
    }
  };

  // Función para compartir
  const handleShare = async (oilChange: OilChange) => {
    try {
      if (!selectedLubricentro && userProfile?.lubricentroId) {
        const lubricentro = await getLubricentroById(userProfile.lubricentroId);
        if (lubricentro) {
          setSelectedLubricentro(lubricentro);
        }
      }

      // Verificar número de teléfono
      const phoneNumber = oilChange.celular?.replace(/\D/g, '');
      if (!phoneNumber) {
        alert('No hay número de teléfono registrado para este cliente');
        return;
      }

      // ✅ USAR LA FUNCIÓN COMPLETA DEL ENHANCED PDF SERVICE
      const lubricentroName = selectedLubricentro?.fantasyName || 'Lubricentro';
      const { whatsappUrl, whatsappUrlWithPhone } = enhancedPdfService.generateWhatsAppMessage(
        oilChange,
        lubricentroName
      );

      // Abrir WhatsApp con el mensaje completo
      window.open(whatsappUrlWithPhone || whatsappUrl, '_blank');

    } catch (error) {
      console.error('Error al compartir:', error);
      setError('Error al compartir por WhatsApp');
    }
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadOilChanges(true);
  }, [userProfile?.lubricentroId]);

  // Efecto para la búsqueda
  useEffect(() => {
   
    
    if (debouncedSearchTerm !== searchTerm) return;
    
    loadOilChanges(true);
  }, [debouncedSearchTerm]);
  // 5️⃣ EFECTO PARA DETECTAR NAVEGACIÓN - Agregar después de los useEffect existentes
// ✅ Recargar cuando se navega a la página desde otra ruta
useEffect(() => {
  
  
  // Solo recargar si venimos de otra página
  if (location.pathname === '/cambios-aceite') {
 
    loadOilChanges(true);
  }
}, [location.pathname]);

// 6️⃣ EFECTO PARA DETECTAR DATOS DESACTUALIZADOS - Agregar después del anterior
// ✅ Marcar como desactualizado después de 2 minutos
useEffect(() => {
  const staleTimer = setTimeout(() => {
    if (!searchTerm.trim()) {
      
      setIsStale(true);
    }
  }, 300000); // 2 minutos

  return () => clearTimeout(staleTimer);
}, [lastRefresh, searchTerm]);

// 7️⃣ EFECTO PARA FOCUS - Recargar cuando la ventana vuelve a tener foco
useEffect(() => {
  const handleFocus = () => {
    if (!searchTerm.trim() && !loading) {
  
      loadOilChanges(true);
    }
  };

  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [searchTerm, loading]);
  
  return (
    <PageContainer
      title="Historial de Cambios de Aceite"
      subtitle="Gestión y consulta de cambios de aceite"
      action={
        <div className="flex space-x-2">
            <Button
              color="warning"
              variant="outline"
              icon={<ClockIcon className="h-5 w-5" />}
              onClick={() => navigate('/cambios-aceite/pendientes')}
            >
              Ver Pendientes
            </Button>
            <Button
              color="secondary"
              variant="outline"
              icon={<PlusIcon className="h-5 w-5" />}
              onClick={() => navigate('/cambios-aceite/precarga')}
            >
              Precarga Rápida
            </Button>
            <Button
              color="primary"
              icon={<PlusIcon className="h-5 w-5" />}
              onClick={() => navigate('/cambios-aceite/nuevo')}
            >
              Nuevo Cambio
            </Button>
          </div>
      }
    >
      {/* Barra de búsqueda */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por cliente o dominio del vehículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                color="secondary"
                variant="outline"
                icon={<ArrowPathIcon className="h-5 w-5" />}
                onClick={() => {
                  setSearchTerm('');
                  loadOilChanges(true);
                }}
                disabled={loading}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>


      {/* Búsqueda Global - Agregar después de la Card de búsqueda local */}
        <div className="mb-6">
          <Button
            color={showGlobalSearch ? "secondary" : "primary"}
            variant={showGlobalSearch ? "solid" : "outline"}
            onClick={() => setShowGlobalSearch(!showGlobalSearch)}
            icon={<BuildingStorefrontIcon className="h-5 w-5" />}
          >
            {showGlobalSearch ? 'Ocultar Búsqueda Global' : 'Buscar en Otros Lubricentros'}
          </Button>
        </div>

        {/* Componente de búsqueda global */}
        {showGlobalSearch && (
          <GlobalSearchComponent
            onSearch={handleGlobalSearch}
            onDuplicate={handleDuplicate}
            onViewDetails={handleViewExternalDetails}
            loading={globalSearchLoading}
          />
        )}

      {/* Mostrar errores */}
      {error && (
        <Alert type="error" className="mb-6">
          {error}
          <Button
            color="secondary"
            size="sm"
            className="ml-4"
            onClick={() => {
              setError(null);
              loadOilChanges(true);
            }}
          >
            Reintentar
          </Button>
        </Alert>
      )}

      {/* ✅ AGREGAR AQUÍ LA NOTIFICACIÓN (después del Alert de error) */}
      {isStale && !error && (
        <Alert type="warning" className="mb-6">
          <div className="flex items-center justify-between">
            <span>Los datos pueden estar desactualizados. Se recomienda actualizar para ver los cambios más recientes.</span>
            <Button
              size="sm"
              color="warning"
              onClick={() => loadOilChanges(true)}
              disabled={loading}
            >
              Actualizar Ahora
            </Button>
          </div>
        </Alert>
      )}

      {/* Tabla de cambios de aceite */}
      {oilChanges.length > 0 ? (
        <Card>

            <CardHeader 
              title={`Cambios de Aceite (${oilChanges.length}${hasMore ? '+' : ''})`}
              subtitle={`Haga doble click en una fila para ver los detalles completos. Última actualización: ${lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
              action={
                <div className="flex space-x-2 items-center">
                  {/* Indicador de datos desactualizados */}
                  {isStale && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Datos desactualizados
                    </span>
                  )}
                  
                  {/* Botón actualizar

                  <Button
                    color="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!userProfile?.lubricentroId) return;
                      
                      try {
                        setLoading(true);
                        const fixedCount = await fixCreatedAtFieldsForAll(userProfile.lubricentroId);
                        alert(`Se corrigieron ${fixedCount} registros. Recarga la página.`);
                        loadOilChanges(true);
                      } catch (error) {
                        console.error('Error:', error);
                        alert('Error al corregir datos');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    🔧 Arreglar Fechas
                  </Button>  */}
                  <Button
                    color={isStale ? "warning" : "primary"}
                    size="sm"
                    onClick={() => {
                                        loadOilChanges(true);
                    }}
                    disabled={loading}
                    icon={<ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                  >
                    {loading ? 'Actualizando...' : isStale ? 'Actualizar Ahora' : 'Actualizar'}
                  </Button>
                  
                  {/* Información de estado */}
                  <div className="text-xs text-gray-500 flex items-center space-x-2">
                    <span>
                      {hasMore ? 'Hay más' : 'Completo'}
                    </span>
                    {totalCount > 0 && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        Total: {totalCount}
                      </span>
                    )}
                  </div>
                </div>
              }
            />

          <CardBody>
            <SortableOilChangeTable
              oilChanges={oilChanges}
              onRowDoubleClick={handleRowDoubleClick}
              onViewDetails={(id) => navigate(`/cambios-aceite/${id}`)}
              onEdit={handleEdit}
              onPrint={handlePrint}
              onShare={handleShare}
              onComplete={handleComplete}
              onStatusUpdated={handleStatusUpdated}
              loading={loading && oilChanges.length === 0}
            />
          </CardBody>
          
          {/* Paginación corregida - Mostrar si hay 10+ registros o hasMore */}
          {(hasMore || oilChanges.length >= 10) && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex flex-1 justify-between items-center">
                {/* Información de resultados */}
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => loadOilChanges(true)}
                    disabled={loading}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      loading 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Recargar
                  </button>
                  {hasMore && (
                    <button
                      onClick={loadMoreOilChanges}
                      disabled={loading}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ml-3 ${
                        loading 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {loading ? 'Cargando...' : 'Cargar más'}
                    </button>
                  )}
                </div>

                {/* Versión desktop */}
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{oilChanges.length}</span>
                        {searchTerm ? (
                          <span> resultados{hasMore ? '+' : ''} para "{searchTerm}"</span>
                        ) : (
                          <>
                            {totalCount > 0 && (
                              <span> de <span className="font-medium">{totalCount}</span> total</span>
                            )}
                            {hasMore && <span className="text-gray-500"> (cargando por páginas)</span>}
                          </>
                        )}
                      </p>
                    </div>
                  
                  <div className="flex items-center space-x-2">
                    {searchTerm && (
                      <Button
                        size="sm"
                        color="secondary"
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('');
                          loadOilChanges(true);
                        }}
                      >
                        Limpiar búsqueda
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      color="secondary"
                      variant="outline"
                      onClick={() => loadOilChanges(true)}
                      disabled={loading}
                      icon={<ArrowPathIcon className="h-4 w-4" />}
                    >
                      Recargar
                    </Button>
                    
                    {hasMore && (
                      <Button
                        size="sm"
                        color="primary"
                        variant="outline"
                        onClick={loadMoreOilChanges}
                        disabled={loading}
                        icon={loading ? undefined : <ChevronRightIcon className="h-4 w-4" />}
                      >
                        {loading ? 'Cargando...' : 'Cargar más'}
                      </Button>
                    )}
                    
                    {!hasMore && oilChanges.length >= PAGE_SIZE && (
                      <p className="text-sm text-green-600 font-medium">
                        ✓ Todos los resultados cargados ({oilChanges.length} total)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </Card>
      ) : !loading && !error ? (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                {searchTerm ? 'No se encontraron resultados' : 'No hay cambios de aceite registrados'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 
                  `No se encontraron cambios de aceite que coincidan con "${searchTerm}"` :
                  'Comience registrando el primer cambio de aceite.'
                }
              </p>
              <div className="mt-6">
                {searchTerm ? (
                  <Button
                    color="secondary"
                    onClick={() => {
                      setSearchTerm('');
                      loadOilChanges(true);
                    }}
                  >
                    Ver Todos los Cambios
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    onClick={() => navigate('/cambios-aceite/nuevo')}
                  >
                    Registrar Primer Cambio
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      ) : loading && oilChanges.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-500">
                {isSearching ? 'Buscando...' : 'Cargando cambios de aceite...'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Componente oculto para generar PDF */}
      {selectedOilChange && selectedLubricentro && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <EnhancedPrintComponent
            ref={pdfTemplateRef}
            oilChange={selectedOilChange}
            lubricentro={selectedLubricentro}
          />
        </div>
      )}

      {/* Indicador de carga para PDF */}
      {generatingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <Spinner size="md" />
              <span>Generando PDF...</span>
            </div>
          </div>
        </div>
      )}



      {/* Modal de vista previa del PDF (si se necesita) */}
      {showingPdfPreview && selectedOilChange && selectedLubricentro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Vista Previa del PDF</h3>
              <Button
                color="secondary"
                onClick={() => setShowingPdfPreview(false)}
              >
                Cerrar
              </Button>
            </div>
            <EnhancedPrintComponent
              oilChange={selectedOilChange}
              lubricentro={selectedLubricentro}
            />
          </div>
        </div>
      )}
      
  
      
    </PageContainer>
    
  );
};

export default OilChangeListPage;