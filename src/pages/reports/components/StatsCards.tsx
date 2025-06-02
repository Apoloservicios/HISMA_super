// src/pages/reports/components/StatsCards.tsx
import React from 'react';
import { Card, CardBody } from '../../../components/ui';
import { OilChangeStats } from '../../../types';

import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ClockIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import isNumber from 'lodash/isNumber';


interface StatsCardsProps {
  stats: OilChangeStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  // Calcular porcentaje de cambio mensual
  const calculateMonthlyChange = () => {
    if (stats.lastMonth === 0) return { value: 100, increase: true };
    
    const change = ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100;
    return {
      value: Math.abs(Math.round(change)),
      increase: change >= 0
    };
  };
  
  const monthlyChange = calculateMonthlyChange();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total de Cambios */}
      <Card>
        <CardBody>
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-primary-100 mr-4">
              <DocumentTextIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Cambios</p>
              <p className="text-2xl font-semibold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Histórico acumulado</p>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Cambios este mes */}
      <Card>
        <CardBody>
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-green-100 mr-4">
              <ClipboardDocumentListIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Este Mes</p>
              <p className="text-2xl font-semibold text-gray-800">{stats.thisMonth}</p>
              <div className="flex items-center mt-1">
                {monthlyChange.increase ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-xs font-medium ${monthlyChange.increase ? 'text-green-500' : 'text-red-500'}`}>
                  {monthlyChange.value}% vs mes anterior
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Mes anterior */}
      <Card>
        <CardBody>
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-blue-100 mr-4">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Mes Anterior</p>
              <p className="text-2xl font-semibold text-gray-800">{stats.lastMonth}</p>
              <p className="text-xs text-gray-500">Total del mes pasado</p>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Próximos servicios */}
      <Card>
        <CardBody>
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-yellow-100 mr-4">
              <CalendarDaysIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Próximos 30 días</p>
              <p className="text-2xl font-semibold text-gray-800">{stats.upcoming30Days}</p>
              <p className="text-xs text-gray-500">Servicios programados</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default StatsCards;