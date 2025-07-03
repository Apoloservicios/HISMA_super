// src/pages/oilchanges/OilChangeListPage.tsx
// Implementación completa con paginación y buscador mejorado

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageContainer, Card, CardHeader, CardBody, Button, Alert, Spinner } from '../../components/ui';
import { getOilChangesByLubricentro, searchOilChanges, getOilChangeById } from '../../services/oilChangeService';
import { getLubricentroById } from '../../services/lubricentroService';
import { OilChange, Lubricentro } from '../../types';

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
  ChevronRightIcon
} from '@heroicons/react/24/outline';

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
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Estados para búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Estado para el PDF y compartir
  const [selectedOilChange, setSelectedOilChange] = useState<OilChange | null>(null);
  const [selectedLubricentro, setSelectedLubricentro] = useState<Lubricentro | null>(null);
  const [showingPdfPreview, setShowingPdfPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Nuevo estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Datos para paginación
  const pageSize = 10; // Cambiado a 10 para mejor usabilidad
  
  // Cargar datos iniciales
  useEffect(() => {
    if (userProfile?.lubricentroId) {
      loadInitialData();
    }
  }, [userProfile]);
  
  // Efecto para búsqueda instantánea
  useEffect(() => {
    if (debouncedSearchTerm) {
      handleSearch();
    } else if (isSearching) {
      clearSearch();
    }
  }, [debouncedSearchTerm]);
  
  // Cargar datos iniciales
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userProfile?.lubricentroId) {
        setError('No se encontró información del lubricentro');
        return;
      }
      
      const result = await getOilChangesByLubricentro(userProfile.lubricentroId, pageSize);
      setOilChanges(result.oilChanges);
      setLastVisible(result.lastVisible);
      setHasMore(result.oilChanges.length === pageSize);
      
      // Estimar el total de páginas - esto debería idealmente venir del servidor
      // Por ahora usaremos una estimación
      const estimatedTotal = Math.max(1, result.oilChanges.length === pageSize ? 10 : 1);
      setTotalPages(estimatedTotal);
      setCurrentPage(1);
      
    } catch (err) {
      console.error('Error al cargar cambios de aceite:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar página específica
  const loadPage = async (page: number) => {
    if (page < 1) return;
    
    try {
      setLoading(true);
      
      if (!userProfile?.lubricentroId) {
        return;
      }
      
      // Si es la primera página, cargar datos iniciales
      if (page === 1) {
        return loadInitialData();
      }
      
      // Para otras páginas, necesitamos hacer cálculos
      // Idealmente, el backend debería soportar paginación por número de página
      // Como no tenemos eso, simulamos navegando con lastVisible
      
      // Esta es una implementación simple - para una app real, necesitarías
      // un mejor manejo de paginación, posiblemente cachear resultados anteriores
      let currentLastVisible = null;
      let skipPages = page - currentPage;
      
      if (skipPages > 0) {
        // Avanzar páginas
        currentLastVisible = lastVisible;
        
          while (skipPages > 0 && currentLastVisible) {
          const result: { 
            oilChanges: OilChange[],
            lastVisible: QueryDocumentSnapshot<DocumentData> | null 
          } = await getOilChangesByLubricentro(
            userProfile.lubricentroId,
            pageSize,
            currentLastVisible
          );
          
          if (result.oilChanges.length === 0) break;
          
          currentLastVisible = result.lastVisible;
          skipPages--;
          
          // Si llegamos a la última página
          if (result.oilChanges.length < pageSize) {
            setOilChanges(result.oilChanges);
            setLastVisible(result.lastVisible);
            setHasMore(false);
            setCurrentPage(page);
            return;
          }
          
          // Si es la página objetivo
          if (skipPages === 0) {
            setOilChanges(result.oilChanges);
            setLastVisible(result.lastVisible);
            setHasMore(result.oilChanges.length === pageSize);
            setCurrentPage(page);
            return;
          }
        }
      } else {
        // Retroceder páginas - esto es más complicado con Firestore
        // Para una implementación real, deberías almacenar los puntos de paginación
        // Como solución simple, recargamos desde el principio
        let tmpPage = 1;
        let tmpLastVisible = null;
        
        const initialResult = await getOilChangesByLubricentro(
          userProfile.lubricentroId,
          pageSize
        );
        
        setOilChanges(initialResult.oilChanges);
        tmpLastVisible = initialResult.lastVisible;
        
        while (tmpPage < page) {
          tmpPage++;
          
          if (tmpPage === page) {
            setCurrentPage(page);
            setLastVisible(tmpLastVisible);
            setHasMore(initialResult.oilChanges.length === pageSize);
            return;
          }
          
          const nextResult = await getOilChangesByLubricentro(
            userProfile.lubricentroId,
            pageSize,
           tmpLastVisible = initialResult.lastVisible || undefined
          );
          
          if (nextResult.oilChanges.length === 0) {
            // No hay más datos
            setHasMore(false);
            setCurrentPage(tmpPage - 1); // Retroceder a la última página válida
            return;
          }
          
          setOilChanges(nextResult.oilChanges);
          tmpLastVisible = nextResult.lastVisible;
          setHasMore(nextResult.oilChanges.length === pageSize);
        }
      }
      
      setCurrentPage(page);
    } catch (err) {
      console.error('Error al navegar a la página:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar más datos (avanzar página)
  const loadMoreData = async () => {
    if (!hasMore || !userProfile?.lubricentroId) return;
    loadPage(currentPage + 1);
  };
  
  // Realizar búsqueda mejorada que busca tanto en dominio como en cliente
  const handleSearch = async () => {
    if (!debouncedSearchTerm.trim() || !userProfile?.lubricentroId) return;
    
    try {
      setIsSearching(true);
      setLoading(true);
      setError(null);
      
      // Realizar dos búsquedas: una por cliente y otra por dominio
      const resultsCliente = await searchOilChanges(
        userProfile.lubricentroId,
        'cliente',
        debouncedSearchTerm.trim(),
        100
      );
      
      const resultsDominio = await searchOilChanges(
        userProfile.lubricentroId,
        'dominio',
        debouncedSearchTerm.trim(),
        100
      );
      
      // Combinar resultados y eliminar duplicados
      const combinedResults = [...resultsCliente, ...resultsDominio];
      const uniqueResults = combinedResults.filter((change, index, self) =>
        index === self.findIndex((c) => c.id === change.id)
      );
      
      setOilChanges(uniqueResults);
      setHasMore(false); // No paginamos los resultados de búsqueda
      
      // Si estamos buscando, consideramos que hay solo una página
      setTotalPages(1);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error al buscar cambios de aceite:', err);
      setError('Error al realizar la búsqueda. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Limpiar búsqueda y volver a cargar datos iniciales
  const clearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
    loadInitialData();
  };
  
  // Generar PDF
const generatePDF = async (oilChangeId: string) => {
  try {
    setError(null);
    setGeneratingPdf(true);
    
    // Obtener los datos del cambio de aceite
    const oilChange = await getOilChangeById(oilChangeId);
    
    // Obtener datos del lubricentro
    let lubricentro: Lubricentro | null = null;
    if (oilChange.lubricentroId) {
      lubricentro = await getLubricentroById(oilChange.lubricentroId);
    }
    
    // Usar el método directo que no depende de html2canvas
    enhancedPdfService.generateDirectPDF(oilChange, lubricentro);
   
    setGeneratingPdf(false);
  } catch (err) {
    console.error('Error al generar PDF:', err);
    setError('Error al generar el PDF. Por favor, intente nuevamente.');
    setGeneratingPdf(false);
  }
};
  
  // Compartir por WhatsApp
  const shareViaWhatsApp = async (oilChangeId: string) => {
    try {
      // Obtener los datos del cambio de aceite
      const oilChange = await getOilChangeById(oilChangeId);
      
      // Obtener datos del lubricentro
      let lubricentroName = "Lubricentro";
      if (oilChange.lubricentroId) {
        const lubricentro = await getLubricentroById(oilChange.lubricentroId);
        lubricentroName = lubricentro.fantasyName;
      }
      
      // Usar el servicio mejorado para generar el mensaje y URL
      const { whatsappUrl, whatsappUrlWithPhone } = enhancedPdfService.generateWhatsAppMessage(oilChange, lubricentroName);
      
      // Abrir en nueva ventana - priorizar URL con teléfono si está disponible
      window.open(whatsappUrlWithPhone || whatsappUrl, '_blank');
      
    } catch (err) {
      console.error('Error al compartir via WhatsApp:', err);
      setError('Error al preparar el mensaje para compartir. Por favor, intente nuevamente.');
    }
  };
  
  // Formatear fecha
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  if (loading && oilChanges.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Componente de paginación
  const Pagination = () => {
    // No mostrar paginación si solo hay una página o estamos buscando
    if (totalPages <= 1 || isSearching) return null;
    
    return (
      <div className="flex justify-center mt-6">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginación">
          <button
            onClick={() => loadPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
              currentPage === 1 || loading ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="sr-only">Anterior</span>
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          {/* Mostrar páginas */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            // Cálculo para mostrar páginas alrededor de la actual si hay muchas
            let pageNumber: number;
            if (totalPages <= 5) {
              pageNumber = i + 1;
            } else {
              // Complejo: mostrar 2 páginas antes y 2 después de la actual
              const middleIndex = 2; // índice del elemento central (0-based)
              if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - middleIndex + i;
              }
            }
            
            return (
              <button
                key={pageNumber}
                onClick={() => loadPage(pageNumber)}
                disabled={loading}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === pageNumber ? 'z-10 bg-primary-50 border-primary-500 text-primary-600' : 'text-gray-500 hover:bg-gray-50'
                } ${loading ? 'cursor-not-allowed' : ''}`}
              >
                {pageNumber}
              </button>
            );
          })}
          
          <button
            onClick={() => loadPage(currentPage + 1)}
            disabled={!hasMore || loading}
            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
              !hasMore || loading ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="sr-only">Siguiente</span>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </nav>
      </div>
    );
  };
  
  return (
    <PageContainer
      title="Historial de Cambios de Aceite"
      subtitle="Gestión y consulta de cambios de aceite"
      action={
        <Button
          color="primary"
          icon={<PlusIcon className="h-5 w-5" />}
          onClick={() => navigate('/cambios-aceite/nuevo')}
        >
          Nuevo Cambio
        </Button>
      }
    >
      {error && (
        <Alert type="error" className="mb-6" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Barra de búsqueda mejorada */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
            <div className="flex-1">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por patente o nombre del cliente"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              {isSearching && (
                <Button
                  color="secondary"
                  variant="outline"
                  onClick={clearSearch}
                >
                  Limpiar
                </Button>
              )}
              {!isSearching && debouncedSearchTerm === '' && (
                <Button
                  color="primary"
                  variant="outline"
                  onClick={loadInitialData}
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                >
                  Actualizar
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Tabla de cambios de aceite */}
      <Card>
        <CardHeader
          title={isSearching ? `Resultados de búsqueda para "${searchTerm}"` : "Cambios de Aceite"}
          subtitle={isSearching ? `${oilChanges.length} resultados encontrados` : `Mostrando ${oilChanges.length} registros`}
        />
        <CardBody>
          {generatingPdf && (
            <div className="my-4 text-center">
              <Spinner size="md" />
              <p className="mt-2 text-gray-600">Generando PDF, por favor espere...</p>
            </div>
          )}
          
          {oilChanges.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nº Cambio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehículo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dominio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Próximo Cambio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {oilChanges.map((change) => (
                    <tr key={change.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {change.nroCambio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(change.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {change.nombreCliente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {`${change.marcaVehiculo} ${change.modeloVehiculo}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {change.dominioVehiculo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(change.fechaProximoCambio)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 flex">
                        <Button
                          size="sm"
                          color="primary"
                          variant="outline"
                          onClick={() => navigate(`/cambios-aceite/${change.id}`)}
                          title="Ver detalle"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="secondary"
                          variant="outline"
                          onClick={() => navigate(`/cambios-aceite/editar/${change.id}`)}
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="success"
                          variant="outline"
                          onClick={() => navigate(`/cambios-aceite/nuevo?clone=${change.id}`)}
                          title="Duplicar"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="info"
                          variant="outline"
                          onClick={() => generatePDF(change.id)}
                          title="Generar PDF"
                          disabled={generatingPdf}
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </Button>
                          
                        <Button
                          size="sm"
                          color="warning"
                          variant="outline"
                          onClick={() => shareViaWhatsApp(change.id)}
                          title="Compartir"
                        >
                          <ShareIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500">
                {isSearching ? 'No se encontraron resultados para la búsqueda.' : 'No hay cambios de aceite registrados.'}
              </p>
              {!isSearching && (
                <Button 
                  color="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/cambios-aceite/nuevo')}
                >
                  Registrar Nuevo Cambio
                </Button>
              )}
            </div>
          )}
          
          {/* Paginación mejorada */}
          {oilChanges.length > 0 && (
            <Pagination />
          )}
        </CardBody>
      </Card>
      
      {/* Componente de impresión mejorado para generar PDF */}
      {showingPdfPreview && selectedOilChange && (
        <div className="hidden">
          <EnhancedPrintComponent 
            ref={pdfTemplateRef} 
            oilChange={selectedOilChange} 
            lubricentro={selectedLubricentro} 
          />
        </div>
      )}
    </PageContainer>
  );
};

export default OilChangeListPage;