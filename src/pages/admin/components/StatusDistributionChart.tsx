// src/pages/admin/components/StatusDistributionChart.tsx
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

interface StatusDistributionChartProps {
  data: { name: string; value: number; color: string }[];
}

const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data }) => {
  // Personalizar tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, payload: { color } } = payload[0];
      return (
        <div className="bg-white p-3 shadow-md border border-gray-200 rounded-md">
          <p className="font-medium text-sm" style={{ color }}>
            {name}
          </p>
          <p className="font-semibold" style={{ color }}>
            {`${value} lubricentros`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calcular porcentajes para las etiquetas
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  
  // Crear una etiqueta personalizada que muestre el porcentaje
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontWeight="bold"
        fontSize="12"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          formatter={(value, entry, index) => (
            <span style={{ color: data[index]?.color || '#000', fontWeight: 500 }}>
              {value}: {data[index]?.value || 0}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StatusDistributionChart;