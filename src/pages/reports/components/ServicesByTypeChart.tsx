// src/pages/reports/components/ServicesByTypeChart.tsx
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import isNumber from 'lodash/isNumber';


interface ServicesByTypeChartProps {
  data: { name: string; value: number }[];
}

// Colores para cada tipo de servicio
const COLORS = ['#8bc34a', '#ff9800', '#03a9f4', '#9c27b0'];

const ServicesByTypeChart: React.FC<ServicesByTypeChartProps> = ({ data }) => {
  // Personalizar tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white p-3 shadow-md border border-gray-200 rounded-md">
          <p className="font-medium text-sm" style={{ color: item.color }}>
            {item.name}
          </p>
          <p className="font-semibold text-gray-800">
          {`${item.value} servicios${item.percent ? ` (${Math.round(item.percent * 100)}%)` : ''}`}

          </p>
        </div>
      );
    }
    return null;
  };

  // Calcular total para porcentajes
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            fill="#8884d8"
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}

          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            formatter={(value, entry, index) => (
              <span style={{ color: COLORS[index % COLORS.length] }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Total de servicios: {total}
        </p>
      </div>
    </div>
  );
};

export default ServicesByTypeChart;