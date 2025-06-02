// src/pages/reports/components/MonthlySalesChart.tsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import isNumber from 'lodash/isNumber';


interface MonthlySalesChartProps {
  data: { name: string; cantidad: number }[];
}

const MonthlySalesChart: React.FC<MonthlySalesChartProps> = ({ data }) => {
  // Personalizar tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-md border border-gray-200 rounded-md">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-primary-600 font-semibold">
            {`${payload[0].value} cambios`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#666', fontSize: 12 }}
        />
        <YAxis 
          tick={{ fill: '#666', fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: 10 }}
        />
        <Bar 
          name="Cambios de Aceite" 
          dataKey="cantidad" 
          fill="#8bc34a" 
          radius={[4, 4, 0, 0]} 
          barSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlySalesChart;