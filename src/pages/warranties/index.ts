// src/pages/warranties/index.ts

// ✅ CORRECCIÓN: Solo exports, sin imports duplicados
export { default as WarrantyDashboardPage } from './WarrantyDashboardPage';
export { default as WarrantyFormPage } from './WarrantyFormPage';
export { default as WarrantyDetailPage } from './WarrantyDetailPage';

// Re-exportar tipos de garantías para facilitar importaciones
export type { 
  Warranty, 
  CreateWarrantyData, 
  WarrantyFilters, 
  WarrantyStats,
  ProductCategory,
  WarrantyType,
  WarrantyStatus
} from '../../types/warranty';