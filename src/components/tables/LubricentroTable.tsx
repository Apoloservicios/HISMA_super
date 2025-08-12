// src/components/tables/LubricentroTable.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lubricentro, LubricentroStatus } from '../../types';
import { Button } from '../ui';
import { 
  EyeIcon, 
  PencilIcon, 
  XMarkIcon, 
  CheckIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';

interface LubricentroTableProps {
  lubricentros: Lubricentro[];
  onChangeStatus: (lubricentro: Lubricentro, status: LubricentroStatus) => void;
  onExtendTrial?: (lubricentro: Lubricentro) => void;
  onViewDetails?: (id: string) => void;
  onManageSubscription?: (lubricentro: Lubricentro) => void;
  loading?: boolean;
}

type SortField = 'fantasyName' | 'responsable' | 'cuit' | 'estado' | 'createdAt' | 'trialEndDate';
type SortDirection = 'asc' | 'desc';

const LubricentroTable: React.FC<LubricentroTableProps> = ({
  lubricentros,
  onChangeStatus,
  onExtendTrial,
  onViewDetails,
  onManageSubscription,
  loading = false
}) => {
  const navigate = useNavigate();
  
  // Estados para ordenamiento
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Función para formatear fecha
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para calcular días restantes
  const getDaysRemaining = (endDate: Date | string): number => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Función para obtener badge de estado
  const getStatusBadge = (estado: LubricentroStatus) => {
    const badges = {
      activo: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      inactivo: 'bg-red-100 text-red-800'
    };

    const labels = {
      activo: 'Activo',
      trial: 'En Prueba',
      inactivo: 'Inactivo'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[estado]}`}>
        {labels[estado]}
      </span>
    );
  };

  // Función para manejar ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Resetear a primera página al ordenar
  };

  // Función para renderizar header con ordenamiento
  const renderSortableHeader = (field: SortField, label: string) => {
    const isActive = sortField === field;
    
    return (
      <th 
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => handleSort(field)}
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

  // Datos ordenados y paginados
  const sortedAndPaginatedData = useMemo(() => {
    // Ordenar datos
    const sorted = [...lubricentros].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'fantasyName':
          aValue = a.fantasyName.toLowerCase();
          bValue = b.fantasyName.toLowerCase();
          break;
        case 'responsable':
          aValue = a.responsable.toLowerCase();
          bValue = b.responsable.toLowerCase();
          break;
        case 'cuit':
          aValue = a.cuit;
          bValue = b.cuit;
          break;
        case 'estado':
          aValue = a.estado;
          bValue = b.estado;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'trialEndDate':
          aValue = a.trialEndDate ? new Date(a.trialEndDate).getTime() : 0;
          bValue = b.trialEndDate ? new Date(b.trialEndDate).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Aplicar paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      items: sorted.slice(startIndex, endIndex),
      totalItems: sorted.length,
      totalPages: Math.ceil(sorted.length / itemsPerPage)
    };
  }, [lubricentros, sortField, sortDirection, currentPage]);

  // Función para manejar doble click
  const handleDoubleClick = (lubricentro: Lubricentro) => {
    if (onViewDetails) {
      onViewDetails(lubricentro.id);
    } else {
      navigate(`/superadmin/lubricentros/${lubricentro.id}`);
    }
  };

const getPlanName = (lubricentro: Lubricentro): string => {
  if (!lubricentro.subscriptionPlan) return 'Sin Plan';
  
  // Formato simple: capitalizar y reemplazar guiones bajos
  return lubricentro.subscriptionPlan
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Plan Personalizado';
};

// Agregar esta función después de getPlanName
const getServiceInfo = (lubricentro: Lubricentro): { current: number; total: number | string; percentage: number } => {
  // Para lubricentros en trial
  if (lubricentro.estado === 'trial') {
    const trialLimit = 10;
    const currentServices = lubricentro.servicesUsedThisMonth || 0;
    return {
      current: currentServices,
      total: trialLimit,
      percentage: Math.min(100, (currentServices / trialLimit) * 100)
    };
  }
  
  // Para planes por servicios
  if (lubricentro.subscriptionRenewalType === 'service') {
    const totalContracted = lubricentro.totalServicesContracted || 0;
    const servicesUsed = lubricentro.servicesUsed || 0;
    return {
      current: servicesUsed,
      total: totalContracted,
      percentage: totalContracted > 0 ? Math.min(100, (servicesUsed / totalContracted) * 100) : 0
    };
  }
  
  // Para planes mensuales/semestrales
  if (lubricentro.subscriptionPlan) {
    const staticPlan = SUBSCRIPTION_PLANS[lubricentro.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS];
    if (staticPlan && staticPlan.maxMonthlyServices) {
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      return {
        current: currentServices,
        total: staticPlan.maxMonthlyServices,
        percentage: Math.min(100, (currentServices / staticPlan.maxMonthlyServices) * 100)
      };
    }
  }
  
  // Plan ilimitado o sin información
  const currentServices = lubricentro.servicesUsedThisMonth || 0;
  return {
    current: currentServices,
    total: 'Ilimitado',
    percentage: 0
  };
};

    const renderActionButton = (
      icon: React.ReactNode, 
      onClick: () => void, 
      tooltip: string, 
      variant: 'view' | 'edit' | 'activate' | 'deactivate' | 'extend' = 'view'
    ) => {
      const variants = {
        view: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
        edit: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
        activate: 'bg-green-50 text-green-600 hover:bg-green-100',
        deactivate: 'bg-red-50 text-red-600 hover:bg-red-100',
        extend: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
      };

      return (
        <div className="relative group">
          <button
            onClick={onClick}
            className={`p-2 rounded-md transition-colors ${variants[variant]}`}
            title={tooltip}
          >
            {icon}
          </button>
          {/* Tooltip mejorado */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
            {tooltip}
            {/* Flecha del tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      );
    };

  // Renderizar controles de paginación
  const renderPagination = () => {
    if (sortedAndPaginatedData.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(sortedAndPaginatedData.totalPages, currentPage + 1))}
            disabled={currentPage === sortedAndPaginatedData.totalPages}
          >
            Siguiente
          </Button>
        </div>
        
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              a{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, sortedAndPaginatedData.totalItems)}
              </span>{' '}
              de{' '}
              <span className="font-medium">{sortedAndPaginatedData.totalItems}</span>{' '}
              lubricentros
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              {/* Números de página */}
              {[...Array(sortedAndPaginatedData.totalPages)].map((_, index) => {
                const page = index + 1;
                const isActive = page === currentPage;
                
                // Mostrar solo algunas páginas para evitar overflow
                if (
                  page === 1 || 
                  page === sortedAndPaginatedData.totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        isActive
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 || 
                  page === currentPage + 2
                ) {
                  return (
                    <span
                      key={page}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                    >
                      ...
                    </span>
                  );
                }
                return null;
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(sortedAndPaginatedData.totalPages, currentPage + 1))}
                disabled={currentPage === sortedAndPaginatedData.totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (lubricentros.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No se encontraron lubricentros.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {renderSortableHeader('fantasyName', 'Nombre')}
              {renderSortableHeader('responsable', 'Responsable')}
              {renderSortableHeader('cuit', 'CUIT')}
              {renderSortableHeader('estado', 'Estado')}
              {renderSortableHeader('createdAt', 'Registro')}
              {renderSortableHeader('trialEndDate', 'Fin Prueba')}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAndPaginatedData.items.map((lubricentro) => (
              <tr
                key={lubricentro.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onDoubleClick={() => handleDoubleClick(lubricentro)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {lubricentro.fantasyName}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {lubricentro.domicilio}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{lubricentro.responsable}</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{lubricentro.cuit}</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(lubricentro.estado)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(lubricentro.createdAt)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {lubricentro.estado === 'trial' && lubricentro.trialEndDate ? (
                    <div>
                      <div className="text-sm text-gray-900">
                        {formatDate(lubricentro.trialEndDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getDaysRemaining(lubricentro.trialEndDate) > 0 
                          ? `${getDaysRemaining(lubricentro.trialEndDate)} días restantes` 
                          : 'Expirado'}
                      </div>
                    </div>
                  ) : lubricentro.subscriptionEndDate ? (
                    <div>
                      <div className="text-sm text-gray-900">
                        {formatDate(lubricentro.subscriptionEndDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Fin de suscripción
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {getPlanName(lubricentro)}
                    
                  </div>
                  {lubricentro.subscriptionRenewalType && (
                    <div className="text-xs text-gray-500">
                      {lubricentro.subscriptionRenewalType === 'monthly' ? 'Mensual' : 
                       lubricentro.subscriptionRenewalType === 'semiannual' ? 'Semestral' : 
                       lubricentro.subscriptionRenewalType === 'service' ? 'Por servicios' : 
                       lubricentro.subscriptionRenewalType}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {renderActionButton(
                      <EyeIcon className="h-4 w-4" />,
                      () => onViewDetails ? onViewDetails(lubricentro.id) : navigate(`/superadmin/lubricentros/${lubricentro.id}`),
                      'Ver detalles',
                      'view'
                    )}
                    
                    {renderActionButton(
                      <PencilIcon className="h-4 w-4" />,
                      () => navigate(`/superadmin/lubricentros/editar/${lubricentro.id}`),
                      'Editar lubricentro',
                      'edit'
                    )}
                    
                    {lubricentro.estado === 'inactivo' && renderActionButton(
                      <CheckIcon className="h-4 w-4" />,
                      () => onChangeStatus(lubricentro, 'activo'),
                      'Activar membresía',
                      'activate'
                    )}
                    
                    {lubricentro.estado === 'activo' && renderActionButton(
                      <XMarkIcon className="h-4 w-4" />,
                      () => onChangeStatus(lubricentro, 'inactivo'),
                      'Desactivar membresía',
                      'deactivate'
                    )}
                    
                    {lubricentro.estado === 'trial' && onExtendTrial && renderActionButton(
                      <ClockIcon className="h-4 w-4" />,
                      () => onExtendTrial(lubricentro),
                      'Extender período de prueba',
                      'extend'
                    )}
                    
                    {lubricentro.estado !== 'trial' && renderActionButton(
                      <ClockIcon className="h-4 w-4" />,
                      () => onChangeStatus(lubricentro, 'trial'),
                      'Cambiar a período de prueba',
                      'extend'
                    )}
                    
                    {onManageSubscription && renderActionButton(
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>,
                      () => onManageSubscription(lubricentro),
                      'Gestionar suscripción',
                      'view'
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {renderPagination()}
    </div>
  );
};

export default LubricentroTable;