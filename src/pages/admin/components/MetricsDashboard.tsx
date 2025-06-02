// src/pages/admin/components/MetricsDashboard.tsx
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  bgColor,
  textColor
}) => {
  return (
    <div className={`p-4 rounded-lg ${bgColor}`}>
      <div className="flex items-center mb-2">
        <div className={`rounded-full p-2 ${textColor} bg-white bg-opacity-30 mr-3`}>
          {icon}
        </div>
        <p className={`text-sm font-medium ${textColor}`}>{title}</p>
      </div>
      <p className={`text-3xl font-bold ${textColor} mt-2`}>
        {value}
      </p>
      <p className={`text-sm ${textColor} mt-1 opacity-80`}>
        {subtitle}
      </p>
    </div>
  );
};

interface MetricsDashboardProps {
  metrics: {
    retention: number;
    conversion: number;
    monthlyAvg: number;
    systemUsage: number;
  };
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Tasa de Retención"
        value={`${metrics.retention}%`}
        subtitle="Lubricentros activos tras prueba"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        }
        bgColor="bg-green-50"
        textColor="text-green-700"
      />
      
      <MetricCard
        title="Tasa de Conversión"
        value={`${metrics.conversion}%`}
        subtitle="Pruebas a membresías pagas"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        bgColor="bg-blue-50"
        textColor="text-blue-700"
      />
      
      <MetricCard
        title="Promedio Mensual"
        value={metrics.monthlyAvg}
        subtitle="Nuevos registros por mes"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        bgColor="bg-purple-50"
        textColor="text-purple-700"
      />
      
      <MetricCard
        title="Uso del Sistema"
        value={`${metrics.systemUsage}%`}
        subtitle="Actividad en últimos 7 días"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
        bgColor="bg-amber-50"
        textColor="text-amber-700"
      />
    </div>
  );
};

export default MetricsDashboard;