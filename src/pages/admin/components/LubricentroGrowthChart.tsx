// src/pages/admin/components/LubricentroGrowthChart.tsx
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface LubricentroGrowthChartProps {
  data: { name: string; cantidad: number; nuevos?: number }[];
}

const LubricentroGrowthChart: React.FC<LubricentroGrowthChartProps> = ({ data }) => {
  // Personalizar tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-md border border-gray-200 rounded-md">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-green-600 font-semibold">
            {`Total: ${payload[0].value} lubricentros`}
          </p>
          {payload.length > 1 && (
            <p className="text-blue-600 font-semibold">
              {`Nuevos: ${payload[1].value} lubricentros`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
        <Legend />
        <Area 
          type="monotone" 
          dataKey="cantidad" 
          name="Total Lubricentros"
          stroke="#4caf50" 
          fill="#4caf50" 
          fillOpacity={0.2}
          strokeWidth={2}
          activeDot={{ r: 8 }}
        />
        {data[0].nuevos !== undefined && (
          <Area 
            type="monotone" 
            dataKey="nuevos" 
            name="Nuevos Registros"
            stroke="#2196f3" 
            fill="#2196f3" 
            fillOpacity={0.1}
            strokeWidth={2}
            activeDot={{ r: 6 }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default LubricentroGrowthChart;