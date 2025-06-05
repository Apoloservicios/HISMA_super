// src/types/warranty.ts

// Categorías de productos con garantía
export type ProductCategory = 
  | 'bateria' 
  | 'matafuego' 
  | 'aceite' 
  | 'filtro' 
  | 'lubricante' 
  | 'neumatico' 
  | 'amortiguador'
  | 'otro';

// Estados de la garantía
export type WarrantyStatus = 
  | 'vigente'      // Garantía activa
  | 'vencida'      // Garantía expirada
  | 'reclamada'    // Garantía ya utilizada
  | 'cancelada';   // Garantía cancelada por algún motivo

// Tipo de garantía
export type WarrantyType = 
  | 'meses'        // Garantía por tiempo (ej: 12 meses)
  | 'kilometros'   // Garantía por kilometraje (ej: 10,000 km)
  | 'mixta';       // Lo que se cumpla primero

// Interfaz principal de Garantía
export interface Warranty {
  id: string;
  
  // Relación con otros documentos
  lubricentroId: string;
  clienteId?: string;          // Si está asociado a un cliente específico
  vehiculoId?: string;         // Si está asociado a un vehículo específico
  oilChangeId?: string;        // Si se vendió durante un cambio de aceite
  
  // Información del producto
  categoria: ProductCategory;
  marca: string;
  modelo: string;
  numeroSerie?: string;        // Para productos con número de serie
  descripcion: string;         // Descripción detallada del producto
  
  // Información de la venta
  fechaVenta: Date;
  precio: number;
  facturaNumero?: string;      // Número de factura si aplica
  vendedorId: string;          // ID del empleado que vendió
  vendedorNombre: string;      // Nombre del vendedor (para mostrar)
  
  // Información del cliente (duplicamos algunos datos por conveniencia)
  clienteNombre: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  
  // Información del vehículo (si aplica)
  vehiculoDominio?: string;
  vehiculoMarca?: string;
  vehiculoModelo?: string;
  kilometrajeVenta?: number;   // Kilometraje al momento de la venta
  
  // Configuración de la garantía
  tipoGarantia: WarrantyType;
  garantiaMeses?: number;      // Cantidad de meses de garantía
  garantiaKilometros?: number; // Cantidad de kilómetros de garantía
  fechaVencimiento: Date;      // Fecha calculada de vencimiento
  
  // Estado actual
  estado: WarrantyStatus;
  
  // Información adicional
  observaciones?: string;      // Notas adicionales
  condicionesEspeciales?: string; // Condiciones particulares de esta garantía
  
  // Reclamos (si los hay)
  reclamosHistorial?: WarrantyClaimHistoryItem[];
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;           // ID del usuario que creó el registro
}

// Historial de reclamos
export interface WarrantyClaimHistoryItem {
  id: string;
  fecha: Date;
  motivo: string;              // Razón del reclamo
  solucion: string;            // Qué se hizo para resolver
  empleadoId: string;          // Quién atendió el reclamo
  empleadoNombre: string;
  observaciones?: string;
  estado: 'pendiente' | 'resuelto' | 'rechazado';
}

// Interfaz para crear una nueva garantía
export interface CreateWarrantyData {
  categoria: ProductCategory;
  marca: string;
  modelo: string;
  numeroSerie?: string;
  descripcion: string;
  precio: number;
  facturaNumero?: string;
  clienteNombre: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  vehiculoDominio?: string;
  vehiculoMarca?: string;
  vehiculoModelo?: string;
  kilometrajeVenta?: number;
  tipoGarantia: WarrantyType;
  garantiaMeses?: number;
  garantiaKilometros?: number;
  observaciones?: string;
  condicionesEspeciales?: string;
}

// Para filtros y búsquedas
export interface WarrantyFilters {
  categoria?: ProductCategory;
  estado?: WarrantyStatus;
  fechaDesde?: Date;
  fechaHasta?: Date;
  clienteNombre?: string;
  vehiculoDominio?: string;
  marca?: string;
  vencenEn?: number;           // Días hasta vencimiento
}

// Estadísticas de garantías
export interface WarrantyStats {
  total: number;
  vigentes: number;
  vencidas: number;
  reclamadas: number;
  vencenEn30Dias: number;
  vencenEn7Dias: number;
  totalFacturado: number;      // Suma de precios de productos vendidos
  categoriasMasVendidas: { categoria: string; cantidad: number }[];
  marcasMasVendidas: { marca: string; cantidad: number }[];
}

// Configuración de productos predefinidos
export interface ProductTemplate {
  id: string;
  categoria: ProductCategory;
  marca: string;
  modelo: string;
  descripcion: string;
  precioSugerido?: number;
  garantiaMesesDefault: number;
  garantiaKilometrosDefault?: number;
  tipoGarantiaDefault: WarrantyType;
  condicionesDefault?: string;
  activo: boolean;
}

// Para notificaciones de vencimiento
export interface WarrantyAlert {
  id: string;
  warrantyId: string;
  tipo: 'vencimiento_proximo' | 'vencimiento_hoy' | 'vencida';
  diasParaVencimiento: number;
  clienteNombre: string;
  producto: string;
  telefono?: string;
  fechaCreacion: Date;
  notificado: boolean;
}