// src/pages/oilchanges/OilChangeListPage.tsx
// Implementación completa con paginación y buscador mejorado

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { getOilChangesByLubricentro, searchOilChanges, getOilChangeById, fixCreatedAtFields } from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import { OilChange, Lubricentro } from '../../types';
import { SortableOilChangeTable } from '../../components/tables/SortableOilChangeTable';

import EnhancedPrintComponent from '../../components/print/EnhancedPrintComponent';
import  enhancedPdfService  from '../../services/enhancedPdfService';
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
  ClockIcon  
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
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
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
  const [sortBy, setSortBy] = useState<'nroCambio' | 'fechaServicio' | 'createdAt'>('nroCambio');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
        // Si hay término de búsqueda, usar la búsqueda
        setIsSearching(true);
        const searchResults = await searchOilChanges(
          userProfile.lubricentroId,
          'cliente', // Puedes hacer esto configurable
          debouncedSearch
        );
        
        setOilChanges(searchResults);
        setHasMore(false);
      } else {
        // Cargar datos normales con ordenamiento mejorado
        const { oilChanges: newOilChanges, lastVisible: newLastVisible } = 
          await getOilChangesByLubricentro(
            userProfile.lubricentroId,
            PAGE_SIZE,
            reset ? undefined : lastVisible,
            sortBy, // Pasar parámetro de ordenamiento
            sortOrder // Pasar dirección de ordenamiento
          );

        if (reset) {
          setOilChanges(newOilChanges);
        } else {
          setOilChanges(prev => [...prev, ...newOilChanges]);
        }
        
        setLastVisible(newLastVisible);
        // Mejorar detección de hasMore
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

      const phoneNumber = oilChange.celular?.replace(/\D/g, '');
      if (!phoneNumber) {
        alert('No hay número de teléfono registrado para este cliente');
        return;
      }

      const message = `¡Hola ${oilChange.nombreCliente}! Te envío el comprobante de tu cambio de aceite realizado el ${new Date(oilChange.fechaServicio).toLocaleDateString('es-ES')} en ${selectedLubricentro?.fantasyName}. Tu próximo cambio está programado para el ${new Date(oilChange.fechaProximoCambio).toLocaleDateString('es-ES')}.`;

      const whatsappUrl = `https://wa.me/54${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

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
    console.log('🎬 EFECTO DE BÚSQUEDA ACTIVADO:', { 
      debouncedSearchTerm, 
      searchTerm,
      iguales: debouncedSearchTerm === searchTerm 
    });
    
    if (debouncedSearchTerm !== searchTerm) return;
    
    console.log('✅ EJECUTANDO loadOilChanges con reset=true');
    loadOilChanges(true);
  }, [debouncedSearchTerm]);
  
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

      {/* Tabla de cambios de aceite */}
      {oilChanges.length > 0 ? (
        <Card>
          <CardHeader 
            title={`Cambios de Aceite (${oilChanges.length}${hasMore ? '+' : ''})`}
            subtitle="Haga doble click en una fila para ver los detalles completos"
            action={
              <div className="flex space-x-2">
                <Button
                  color="secondary"
                  size="sm"
                  onClick={handleFixData}
                  disabled={loading}
                >
                  🔧 Corregir Datos
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  onClick={() => loadOilChanges(true)}
                  disabled={loading}
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                >
                  Actualizar
                </Button>
                {/* Debug info */}
                <span className="text-xs text-gray-500">
                  {hasMore ? 'Hay más' : 'No hay más'} | Total: {oilChanges.length}
                </span>
              </div>
            }
          />
          <CardBody>
            <SortableOilChangeTable
              oilChanges={oilChanges}
              onRowDoubleClick={handleRowDoubleClick}
              onViewDetails={(id) => navigate(`/cambios-aceite/${id}`)}
              onEdit={(id) => navigate(`/cambios-aceite/${id}/edit`)}
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
                      Mostrando <span className="font-medium">{oilChanges.length}</span> resultados
                      {hasMore && <span className="text-gray-500"> (hay más disponibles)</span>}
                      {searchTerm && <span className="text-gray-500"> para "{searchTerm}"</span>}
                      {!hasMore && oilChanges.length >= PAGE_SIZE && <span className="text-gray-500"> (todos cargados)</span>}
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