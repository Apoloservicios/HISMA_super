// src/pages/reports/components/OperatorPerformanceChart.tsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { OperatorStats } from '../../../types';
import isNumber from 'lodash/isNumber';


interface OperatorPerformanceChartProps {
  data: OperatorStats[];
}

const OperatorPerformanceChart: React.FC<OperatorPerformanceChartProps> = ({ data }) => {
  // Personalizar tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-md border border-gray-200 rounded-md">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-secondary-600 font-semibold">
            {`${payload[0].value} cambios`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Si no hay datos, mostrar mensaje
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 text-center">
          No hay datos disponibles para este período
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          type="number" 
          tick={{ fill: '#666', fontSize: 12 }}
          allowDecimals={false}
        />
        <YAxis 
          dataKey="operatorName" 
          type="category" 
          tick={{ fill: '#666', fontSize: 12 }}
          width={120}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="count" 
          fill="#ff9800" 
          radius={[0, 4, 4, 0]} 
          barSize={30}
        >
          <LabelList dataKey="count" position="right" fill="#333" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default OperatorPerformanceChart;