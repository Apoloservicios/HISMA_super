// src/components/tables/SortableOilChangeTable.tsx
// Versión completa corregida sin errores TypeScript

import React, { useState, useMemo, MouseEvent } from 'react';
import { ChevronUpIcon, ChevronDownIcon, EyeIcon, PencilIcon, PrinterIcon, ShareIcon } from '@heroicons/react/24/outline';
import { OilChange } from '../../types';
import { OilChangeStatusBadge } from '../oilchange/OilChangeStatusButton';
import OilChangeStatusButton from '../oilchange/OilChangeStatusButton';
import { Button } from '../ui';
import Tooltip from '../ui/Tooltip';

type SortField = 'nroCambio' | 'fechaServicio' | 'nombreCliente' | 'dominioVehiculo' | 'estado' | 'fechaProximoCambio';
type SortDirection = 'asc' | 'desc';

interface SortableOilChangeTableProps {
  oilChanges: OilChange[];
  onRowDoubleClick: (oilChange: OilChange) => void;
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onPrint: (oilChange: OilChange) => void;
  onShare: (oilChange: OilChange) => void;
  onComplete?: (id: string) => void;
  onStatusUpdated?: () => void;
  loading?: boolean;
}

export const SortableOilChangeTable: React.FC<SortableOilChangeTableProps> = ({
  oilChanges,
  onRowDoubleClick,
  onViewDetails,
  onEdit,
  onPrint,
  onShare,
  onComplete,
  onStatusUpdated,
  loading = false
}) => {
  const [sortField, setSortField] = useState<SortField>('nroCambio');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Función para manejar ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Función para extraer número del formato "AP-00005"
  const extractNumber = (nroCambio: string): number => {
    const parts = nroCambio.split('-');
    return parts.length === 2 ? parseInt(parts[1]) || 0 : 0;
  };

  // ✅ FUNCIONES HELPER PARA MANEJAR EVENTOS
  const handleViewClick = (oilChangeId: string) => () => {
    onViewDetails(oilChangeId);
  };

  const handleEditClick = (oilChangeId: string) => () => {
    onEdit(oilChangeId);
  };

  const handlePrintClick = (oilChange: OilChange) => () => {
    onPrint(oilChange);
  };

  const handleShareClick = (oilChange: OilChange) => () => {
    onShare(oilChange);
  };

  // Datos ordenados
  const sortedOilChanges = useMemo(() => {
    return [...oilChanges].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'nroCambio':
          aValue = extractNumber(a.nroCambio);
          bValue = extractNumber(b.nroCambio);
          break;
        case 'fechaServicio':
          aValue = new Date(a.fechaServicio).getTime();
          bValue = new Date(b.fechaServicio).getTime();
          break;
        case 'nombreCliente':
          aValue = a.nombreCliente.toLowerCase();
          bValue = b.nombreCliente.toLowerCase();
          break;
        case 'dominioVehiculo':
          aValue = a.dominioVehiculo.toLowerCase();
          bValue = b.dominioVehiculo.toLowerCase();
          break;
        case 'estado':
          aValue = a.estado;
          bValue = b.estado;
          break;
        case 'fechaProximoCambio':
          aValue = new Date(a.fechaProximoCambio).getTime();
          bValue = new Date(b.fechaProximoCambio).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [oilChanges, sortField, sortDirection]);

  // Función para renderizar header con ordenamiento
  const renderSortableHeader = (field: SortField, label: string, className: string = "") => {
    const isActive = sortField === field;
    
    return (
      <th 
        className={`py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
        onClick={() => handleSort(field)}
        title={`Ordenar por ${label}`}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          <div className="flex flex-col">
            <ChevronUpIcon 
              className={`h-3 w-3 ${isActive && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} 
            />
            <ChevronDownIcon 
              className={`h-3 w-3 -mt-1 ${isActive && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} 
            />
          </div>
        </div>
      </th>
    );
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-2 text-gray-500">Cargando cambios de aceite...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {renderSortableHeader('nroCambio', 'N° Cambio', 'px-3 w-20')}
            {renderSortableHeader('estado', 'Estado', 'px-2 w-24')}
            {renderSortableHeader('fechaServicio', 'Fecha', 'px-2 w-20')}
            {renderSortableHeader('nombreCliente', 'Cliente', 'px-3')}
            
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Vehículo
            </th>
            
            {renderSortableHeader('dominioVehiculo', 'Dominio', 'px-2 w-20')}
            {renderSortableHeader('fechaProximoCambio', 'Próximo', 'hidden lg:table-cell px-2 w-20')}
            
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedOilChanges.map((oilChange) => (
            <tr
              key={oilChange.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onDoubleClick={() => onRowDoubleClick(oilChange)}
              title="Doble click para ver detalles completos"
            >
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">
                  {oilChange.nroCambio}
                </span>
              </td>
              
              <td className="px-2 py-2 whitespace-nowrap">
                <OilChangeStatusBadge status={oilChange.estado} />
              </td>
              
              <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                {formatDate(oilChange.fechaServicio)}
              </td>
              
              <td className="px-3 py-2">
                <div className="text-sm text-gray-900 truncate max-w-32" title={oilChange.nombreCliente}>
                  {oilChange.nombreCliente}
                </div>
                {oilChange.celular && (
                  <div className="text-xs text-gray-500">{oilChange.celular}</div>
                )}
              </td>
              
              <td className="px-2 py-2">
                <div className="text-sm text-gray-900 truncate max-w-28" title={`${oilChange.marcaVehiculo} ${oilChange.modeloVehiculo}`}>
                  {oilChange.marcaVehiculo} {oilChange.modeloVehiculo}
                </div>
                <div className="text-xs text-gray-500">
                  {oilChange.kmActuales.toLocaleString()} km
                </div>
              </td>
              
              <td className="px-2 py-2 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">
                  {oilChange.dominioVehiculo}
                </span>
              </td>
              
              <td className="hidden lg:table-cell px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                {formatDate(oilChange.fechaProximoCambio)}
              </td>
              
              <td className="px-2 py-2 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex space-x-1">
                  {/* Ver detalles */}
                  <Tooltip content="Ver detalles">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleViewClick(oilChange.id)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  
                  {/* Editar */}
                  <Tooltip content="Editar">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditClick(oilChange.id)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  
                  {/* PDF - solo para completos o enviados */}
                  {(oilChange.estado === 'completo' || oilChange.estado === 'enviado') && (
                    <Tooltip content="Generar PDF">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrintClick(oilChange)}
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  )}
                  
                  {/* WhatsApp - solo para completos o enviados */}
                  {(oilChange.estado === 'completo' || oilChange.estado === 'enviado') && (
                    <Tooltip content="Compartir por WhatsApp">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleShareClick(oilChange)}
                      >
                        <ShareIcon className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  )}
                  
                  {/* Botón cambiar estado */}
                  <div className="flex items-center">
                    <OilChangeStatusButton 
                      oilChange={oilChange} 
                      onStatusUpdated={onStatusUpdated}
                      showLabel={false}
                      size="sm"
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {sortedOilChanges.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay cambios de aceite registrados.</p>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Ordenado por: {sortField === 'nroCambio' ? 'Número' : 
                       sortField === 'fechaServicio' ? 'Fecha' :
                       sortField === 'nombreCliente' ? 'Cliente' :
                       sortField === 'dominioVehiculo' ? 'Dominio' :
                       sortField === 'estado' ? 'Estado' : 'Próximo'} 
        ({sortDirection === 'asc' ? '↑' : '↓'})
      </div>
    </div>
  );
};

export default SortableOilChangeTable;