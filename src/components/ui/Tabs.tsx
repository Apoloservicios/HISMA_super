// src/components/ui/Tabs.tsx
import React from 'react';

interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  activeTab, 
  onChange,
  className = ''
}) => {
  return (
    <div className={className}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                ${tab.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'}
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              disabled={tab.disabled}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

// Componente Tab para tipado
export interface TabProps {
  id: string;
  label: string;
  disabled?: boolean;
}

export const Tab: React.FC<TabProps> = () => null; // Solo para tipado

// Exportación por defecto con ambos componentes
export default Tabs;