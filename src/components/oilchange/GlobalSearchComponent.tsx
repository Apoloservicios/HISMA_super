// src/components/oilchange/GlobalSearchComponent.tsx
import React, { useState } from 'react';
import { OilChange } from '../../types';
import { Button, Card, CardBody, Spinner } from '../ui';
import { 
  MagnifyingGlassIcon, 
  DocumentDuplicateIcon,
  EyeIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

interface GlobalSearchResult extends OilChange {
  lubricentroName: string;
}

interface GlobalSearchComponentProps {
  onSearch: (searchTerm: string) => Promise<GlobalSearchResult[]>;
  onDuplicate: (oilChange: GlobalSearchResult) => void;
  onViewDetails: (oilChange: GlobalSearchResult) => void;
  loading: boolean;
}

const GlobalSearchComponent: React.FC<GlobalSearchComponentProps> = ({
  onSearch,
  onDuplicate,
  onViewDetails,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setHasSearched(true);
    try {
      const searchResults = await onSearch(searchTerm.trim());
      setResults(searchResults);
    } catch (error) {
      console.error('Error en búsqueda global:', error);
      setResults([]);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES');
  };

  return (
    <Card className="mb-6">
      <CardBody>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center space-x-2">
            <BuildingStorefrontIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Búsqueda Global en Otros Lubricentros
            </h3>
          </div>
          
          <p className="text-sm text-gray-600">
            Busque servicios realizados en otros lubricentros y duplíquelos a su establecimiento.
          </p>

          {/* Search Input */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por cliente, dominio del vehículo, marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!searchTerm.trim() || loading}
              color="primary"
            >
              {loading ? <Spinner size="sm" /> : 'Buscar'}
            </Button>
          </div>

          {/* Results */}
          {hasSearched && (
            <div className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <Spinner size="md" />
                  <p className="mt-2 text-gray-500">Buscando en otros lubricentros...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">
                    Encontrados {results.length} servicios en otros lubricentros:
                  </h4>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            {/* Primera fila: Cliente y Vehículo */}
                            <div className="flex flex-wrap gap-4">
                              <div>
                                <span className="text-sm font-medium text-gray-900">
                                  {result.nombreCliente}
                                </span>
                                {result.celular && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    ({result.celular})
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                {result.marcaVehiculo} {result.modeloVehiculo}
                              </div>
                              <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                {result.dominioVehiculo}
                              </div>
                            </div>

                            {/* Segunda fila: Lubricentro y fecha */}
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center space-x-1">
                                <BuildingStorefrontIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {result.lubricentroName}
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {formatDate(result.fechaServicio)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {result.kmActuales?.toLocaleString()} km
                              </span>
                            </div>

                            {/* Tercera fila: Detalles del aceite */}
                            <div className="text-sm text-gray-600">
                              {result.marcaAceite} {result.tipoAceite} {result.sae} 
                              ({result.cantidadAceite}L)
                            </div>
                          </div>

                          {/* Botones de acción */}
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(result)}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                color="primary" 
                                onClick={() => onDuplicate(result)}
                                >
                                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                                Usar como Base
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">
                    No se encontraron servicios en otros lubricentros para "{searchTerm}"
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Intente con términos más específicos como dominio del vehículo o nombre del cliente
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default GlobalSearchComponent;