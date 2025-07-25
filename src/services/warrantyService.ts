// src/services/warrantyService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Warranty, 
  CreateWarrantyData, 
  WarrantyFilters, 
  WarrantyStats,
  WarrantyAlert,
  ProductTemplate,
  WarrantyClaimHistoryItem
} from '../types/warranty';

const COLLECTION_NAME = 'warranties';
const TEMPLATES_COLLECTION = 'warranty_templates';
const ALERTS_COLLECTION = 'warranty_alerts';

/**
 * Convertir Date a Timestamp si es necesario
 */
const toTimestamp = (date: Date | Timestamp): Timestamp => {
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  return date;
};

/**
 * Convertir Timestamp a Date si es necesario
 */
const toDate = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return timestamp.toDate();
};

/**
 * Crear una nueva garantía
 */
export const createWarranty = async (
  data: CreateWarrantyData, 
  lubricentroId: string, 
  vendedorId: string,
  vendedorNombre: string
): Promise<string> => {
  try {
    // ✅ USAR LA FECHA DE VENTA DEL PARÁMETRO O LA ACTUAL COMO FALLBACK
    const fechaVenta = data.fechaVenta || new Date();
    const fechaVencimiento = new Date(fechaVenta);
    
    if (data.tipoGarantia === 'meses' || data.tipoGarantia === 'mixta') {
      if (data.garantiaMeses) {
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + data.garantiaMeses);
      }
    }
      const warrantyData: any = {
      lubricentroId,
      categoria: data.categoria,
      marca: data.marca,
      modelo: data.modelo,
      descripcion: data.descripcion,
      fechaVenta: Timestamp.fromDate(fechaVenta), // ✅ USAR LA FECHA CORRECTA
      precio: data.precio,
      vendedorId,
      vendedorNombre,
      clienteNombre: data.clienteNombre,
      tipoGarantia: data.tipoGarantia,
      fechaVencimiento: Timestamp.fromDate(fechaVencimiento),
      estado: 'vigente',
      reclamosHistorial: [],
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
      createdBy: vendedorId
    };

    // Agregar campos opcionales solo si tienen valor
    if (data.numeroSerie) warrantyData.numeroSerie = data.numeroSerie;
    if (data.facturaNumero) warrantyData.facturaNumero = data.facturaNumero;
    if (data.clienteTelefono) warrantyData.clienteTelefono = data.clienteTelefono;
    if (data.clienteEmail) warrantyData.clienteEmail = data.clienteEmail;
    if (data.vehiculoDominio) warrantyData.vehiculoDominio = data.vehiculoDominio;
    if (data.vehiculoMarca) warrantyData.vehiculoMarca = data.vehiculoMarca;
    if (data.vehiculoModelo) warrantyData.vehiculoModelo = data.vehiculoModelo;
    if (data.kilometrajeVenta) warrantyData.kilometrajeVenta = data.kilometrajeVenta;
    if (data.garantiaMeses) warrantyData.garantiaMeses = data.garantiaMeses;
    if (data.garantiaKilometros) warrantyData.garantiaKilometros = data.garantiaKilometros;
    if (data.observaciones) warrantyData.observaciones = data.observaciones;
    if (data.condicionesEspeciales) warrantyData.condicionesEspeciales = data.condicionesEspeciales;
    
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), warrantyData);
    
    // Crear alertas automáticas si es necesario
    await createAutomaticAlerts(docRef.id, fechaVencimiento, data.clienteNombre, `${data.marca} ${data.modelo}`, data.clienteTelefono);
    
    return docRef.id;
  } catch (error) {
    console.error('Error al crear garantía:', error);
    throw error; // Re-lanzar el error original para mejor debugging
  }
};

/**
 * Obtener garantías por lubricentro con filtros
 */
export const getWarrantiesByLubricentro = async (
  lubricentroId: string,
  filters?: WarrantyFilters,
  limitResults?: number
): Promise<Warranty[]> => {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      orderBy('createdAt', 'desc')
    );

    if (filters) {
      if (filters.categoria) {
        q = query(q, where('categoria', '==', filters.categoria));
      }
      if (filters.estado) {
        q = query(q, where('estado', '==', filters.estado));
      }
    }

    if (limitResults) {
      q = query(q, limit(limitResults));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Warranty));
  } catch (error) {
    console.error('Error al obtener garantías:', error);
    throw new Error('No se pudieron obtener las garantías');
  }
};

/**
 * Buscar garantías por cliente o vehículo
 */
export const searchWarranties = async (
  lubricentroId: string,
  searchTerm: string
): Promise<Warranty[]> => {
  try {
    const allWarranties = await getWarrantiesByLubricentro(lubricentroId);
    
    const term = searchTerm.toLowerCase();
    return allWarranties.filter(warranty => 
      warranty.clienteNombre.toLowerCase().includes(term) ||
      warranty.vehiculoDominio?.toLowerCase().includes(term) ||
      warranty.marca.toLowerCase().includes(term) ||
      warranty.modelo.toLowerCase().includes(term) ||
      warranty.descripcion.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error('Error al buscar garantías:', error);
    throw new Error('No se pudo realizar la búsqueda');
  }
};

/**
 * Obtener garantías que vencen pronto
 */
export const getExpiringWarranties = async (
  lubricentroId: string,
  daysAhead: number = 30
): Promise<Warranty[]> => {
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('estado', '==', 'vigente'),
      where('fechaVencimiento', '>=', Timestamp.fromDate(now)),
      where('fechaVencimiento', '<=', Timestamp.fromDate(futureDate)),
      orderBy('fechaVencimiento', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Warranty));
  } catch (error) {
    console.error('Error al obtener garantías por vencer:', error);
    throw new Error('No se pudieron obtener las garantías por vencer');
  }
};


/**
 * Procesar reclamo de garantía - VERSIÓN CORREGIDA
 */
export const processWarrantyClaim = async (
  warrantyId: string,
  motivo: string,
  solucion: string,
  empleadoId: string,
  empleadoNombre: string,
  observaciones?: string
): Promise<void> => {
  try {
    const warrantyRef = doc(db, COLLECTION_NAME, warrantyId);
    const warrantyDoc = await getDoc(warrantyRef);
    
    if (!warrantyDoc.exists()) {
      throw new Error('Garantía no encontrada');
    }
    
    const warranty = warrantyDoc.data() as Warranty;
    
    // ✅ CREAR EL NUEVO RECLAMO - SIN CAMPOS UNDEFINED
    const newClaim: WarrantyClaimHistoryItem = {
      id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fecha: Timestamp.fromDate(new Date()),
      motivo: motivo.trim(),
      solucion: solucion.trim(),
      empleadoId,
      empleadoNombre,
      estado: 'resuelto'
    };
    
    // ✅ SOLO AGREGAR OBSERVACIONES SI TIENEN CONTENIDO
    if (observaciones && observaciones.trim()) {
      newClaim.observaciones = observaciones.trim();
    }
    
    const updatedHistory = [...(warranty.reclamosHistorial || []), newClaim];
    
    // ✅ LÓGICA MEJORADA PARA EL ESTADO DE LA GARANTÍA
    let newStatus = warranty.estado;
    
    // Solo cambiar a "reclamada" en el primer reclamo
    if (!warranty.reclamosHistorial || warranty.reclamosHistorial.length === 0) {
      newStatus = 'reclamada';
    }
    
    // ✅ CREAR OBJETO DE ACTUALIZACIÓN SIN CAMPOS UNDEFINED
    const updateData: Record<string, any> = {
      reclamosHistorial: updatedHistory,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    // Solo actualizar el estado si es necesario
    if (newStatus !== warranty.estado) {
      updateData.estado = newStatus;
    }
    
    
    await updateDoc(warrantyRef, updateData);
    
    
  } catch (error) {
    console.error('Error al procesar reclamo:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de garantías
 */
export const getWarrantyStats = async (lubricentroId: string): Promise<WarrantyStats> => {
  try {
    const warranties = await getWarrantiesByLubricentro(lubricentroId);
    
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    
    const vigentes = warranties.filter(w => w.estado === 'vigente');
    const vencidas = warranties.filter(w => w.estado === 'vencida');
    const reclamadas = warranties.filter(w => w.estado === 'reclamada');
    
    const vencenEn7Dias = vigentes.filter(w => {
      const vencimiento = toDate(w.fechaVencimiento);
      return vencimiento >= now && vencimiento <= in7Days;
    });
    
    const vencenEn30Dias = vigentes.filter(w => {
      const vencimiento = toDate(w.fechaVencimiento);
      return vencimiento >= now && vencimiento <= in30Days;
    });
    
    // Estadísticas por categoría
    const categoriaCount = warranties.reduce((acc, w) => {
      acc[w.categoria] = (acc[w.categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const categoriasMasVendidas = Object.entries(categoriaCount)
      .map(([categoria, cantidad]) => ({ categoria, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
    
    // Estadísticas por marca
    const marcaCount = warranties.reduce((acc, w) => {
      acc[w.marca] = (acc[w.marca] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const marcasMasVendidas = Object.entries(marcaCount)
      .map(([marca, cantidad]) => ({ marca, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
    
    return {
      total: warranties.length,
      vigentes: vigentes.length,
      vencidas: vencidas.length,
      reclamadas: reclamadas.length,
      vencenEn30Dias: vencenEn30Dias.length,
      vencenEn7Dias: vencenEn7Dias.length,
      totalFacturado: warranties.reduce((sum, w) => sum + w.precio, 0),
      categoriasMasVendidas,
      marcasMasVendidas
    };
  } catch (error) {
    console.error('Error al calcular estadísticas:', error);
    throw new Error('No se pudieron calcular las estadísticas');
  }
};

/**
 * Crear alertas automáticas para vencimientos
 */
const createAutomaticAlerts = async (
  warrantyId: string,
  fechaVencimiento: Date,
  clienteNombre: string,
  producto: string,
  telefono?: string
): Promise<void> => {
  try {
    const alerts: Omit<WarrantyAlert, 'id'>[] = [];
    
    // Alerta 30 días antes
    const alert30Days = new Date(fechaVencimiento);
    alert30Days.setDate(alert30Days.getDate() - 30);
    
    if (alert30Days > new Date()) {
      alerts.push({
        warrantyId,
        tipo: 'vencimiento_proximo',
        diasParaVencimiento: 30,
        clienteNombre,
        producto,
        telefono,
        fechaCreacion: Timestamp.fromDate(new Date()),
        notificado: false
      });
    }
    
    // Alerta 7 días antes
    const alert7Days = new Date(fechaVencimiento);
    alert7Days.setDate(alert7Days.getDate() - 7);
    
    if (alert7Days > new Date()) {
      alerts.push({
        warrantyId,
        tipo: 'vencimiento_proximo',
        diasParaVencimiento: 7,
        clienteNombre,
        producto,
        telefono,
        fechaCreacion: Timestamp.fromDate(new Date()),
        notificado: false
      });
    }
    
    // Crear alertas en batch
    if (alerts.length > 0) {
      const batch = writeBatch(db);
      alerts.forEach(alert => {
        const alertRef = doc(collection(db, ALERTS_COLLECTION));
        batch.set(alertRef, alert);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error al crear alertas automáticas:', error);
    // No lanzamos error porque esto no debe fallar la creación de la garantía
  }
};

/**
 * Obtener plantillas de productos
 */
export const getProductTemplates = async (lubricentroId: string): Promise<ProductTemplate[]> => {
  try {
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      where('lubricentroId', '==', lubricentroId),
      where('activo', '==', true),
      orderBy('categoria'),
      orderBy('marca')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProductTemplate));
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    return [];
  }
};

/**
 * Actualizar garantía
 */
export const updateWarranty = async (
  warrantyId: string,
  updates: Partial<CreateWarrantyData>
): Promise<void> => {
  try {
    const warrantyRef = doc(db, COLLECTION_NAME, warrantyId);
    
    // Filtrar campos undefined
    const updateData: any = {
      updatedAt: Timestamp.fromDate(new Date())
    };

    // Solo agregar campos que tienen valor
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        updateData[key] = value;
      }
    });
    
    await updateDoc(warrantyRef, updateData);
  } catch (error) {
    console.error('Error al actualizar garantía:', error);
    throw new Error('No se pudo actualizar la garantía');
  }
};

/**
 * Eliminar garantía
 */
export const deleteWarranty = async (warrantyId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, warrantyId));
  } catch (error) {
    console.error('Error al eliminar garantía:', error);
    throw new Error('No se pudo eliminar la garantía');
  }
};

/**
 * Obtener garantía por ID
 */
export const getWarrantyById = async (warrantyId: string): Promise<Warranty | null> => {
  try {
    const warrantyDoc = await getDoc(doc(db, COLLECTION_NAME, warrantyId));
    
    if (!warrantyDoc.exists()) {
      return null;
    }
    
    return {
      id: warrantyDoc.id,
      ...warrantyDoc.data()
    } as Warranty;
  } catch (error) {
    console.error('Error al obtener garantía:', error);
    throw new Error('No se pudo obtener la garantía');
  }
};

/**
 * Obtener alertas de vencimiento
 */
export const getWarrantyAlerts = async (lubricentroId: string): Promise<WarrantyAlert[]> => {
  try {
    // Obtener todas las garantías vigentes
    const warranties = await getWarrantiesByLubricentro(lubricentroId, { estado: 'vigente' });
    
    const now = new Date();
    const alerts: WarrantyAlert[] = [];
    
    warranties.forEach(warranty => {
      const vencimiento = toDate(warranty.fechaVencimiento);
      const diffTime = vencimiento.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        // Vencida
        alerts.push({
          id: `alert_${warranty.id}`,
          warrantyId: warranty.id,
          tipo: 'vencida',
          diasParaVencimiento: diffDays,
          clienteNombre: warranty.clienteNombre,
          producto: `${warranty.marca} ${warranty.modelo}`,
          telefono: warranty.clienteTelefono,
          fechaCreacion: Timestamp.fromDate(now),
          notificado: false
        });
      } else if (diffDays <= 7) {
        // Vence en 7 días o menos
        alerts.push({
          id: `alert_${warranty.id}`,
          warrantyId: warranty.id,
          tipo: 'vencimiento_proximo',
          diasParaVencimiento: diffDays,
          clienteNombre: warranty.clienteNombre,
          producto: `${warranty.marca} ${warranty.modelo}`,
          telefono: warranty.clienteTelefono,
          fechaCreacion: Timestamp.fromDate(now),
          notificado: false
        });
      }
    });
    
    return alerts;
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    throw new Error('No se pudieron obtener las alertas');
  }
};

/**
 * Exportar garantías a Excel
 */
export const exportWarrantiesToExcel = async (warranties: Warranty[]): Promise<void> => {
  try {
    // Importación dinámica para evitar problemas de SSR
    const XLSX = await import('xlsx');
    
    const excelData = warranties.map(warranty => ({
      'Fecha de Venta': toDate(warranty.fechaVenta).toLocaleDateString('es-ES'),
      'Categoría': warranty.categoria,
      'Marca': warranty.marca,
      'Modelo': warranty.modelo,
      'Número de Serie': warranty.numeroSerie || '',
      'Descripción': warranty.descripcion,
      'Cliente': warranty.clienteNombre,
      'Teléfono': warranty.clienteTelefono || '',
      'Email': warranty.clienteEmail || '',
      'Vehículo Dominio': warranty.vehiculoDominio || '',
      'Vehículo Marca': warranty.vehiculoMarca || '',
      'Vehículo Modelo': warranty.vehiculoModelo || '',
      'Kilometraje Venta': warranty.kilometrajeVenta || '',
      'Tipo Garantía': warranty.tipoGarantia,
      'Meses Garantía': warranty.garantiaMeses || '',
      'Kilómetros Garantía': warranty.garantiaKilometros || '',
      'Fecha Vencimiento': toDate(warranty.fechaVencimiento).toLocaleDateString('es-ES'),
      'Estado': warranty.estado,
      'Precio': warranty.precio,
      'Factura': warranty.facturaNumero || '',
      'Vendedor': warranty.vendedorNombre,
      'Observaciones': warranty.observaciones || '',
      'Condiciones Especiales': warranty.condicionesEspeciales || ''
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Configurar anchos de columna
    const colWidths = [
      { wch: 12 }, // Fecha de Venta
      { wch: 15 }, // Categoría
      { wch: 15 }, // Marca
      { wch: 20 }, // Modelo
      { wch: 15 }, // Número de Serie
      { wch: 30 }, // Descripción
      { wch: 25 }, // Cliente
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 10 }, // Vehículo Dominio
      { wch: 15 }, // Vehículo Marca
      { wch: 15 }, // Vehículo Modelo
      { wch: 12 }, // Kilometraje
      { wch: 12 }, // Tipo Garantía
      { wch: 10 }, // Meses
      { wch: 12 }, // Kilómetros
      { wch: 15 }, // Fecha Vencimiento
      { wch: 10 }, // Estado
      { wch: 12 }, // Precio
      { wch: 15 }, // Factura
      { wch: 20 }, // Vendedor
      { wch: 30 }, // Observaciones
      { wch: 30 }  // Condiciones
    ];
    
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Garantías');
    
    // Agregar hoja de resumen
    const resumenData = [
      { Métrica: 'Total de Garantías', Valor: warranties.length },
      { Métrica: 'Garantías Vigentes', Valor: warranties.filter(w => w.estado === 'vigente').length },
      { Métrica: 'Garantías Vencidas', Valor: warranties.filter(w => w.estado === 'vencida').length },
      { Métrica: 'Garantías Reclamadas', Valor: warranties.filter(w => w.estado === 'reclamada').length },
      { Métrica: 'Total Facturado', Valor: `${warranties.reduce((sum, w) => sum + w.precio, 0).toLocaleString()}` },
      { Métrica: 'Fecha de Exportación', Valor: new Date().toLocaleDateString('es-ES') }
    ];
    
    const resumenWs = XLSX.utils.json_to_sheet(resumenData);
    resumenWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, resumenWs, 'Resumen');
    
    const fileName = `Garantias_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    throw new Error('No se pudo exportar a Excel');
  }
};

/**
 * Generar reporte PDF de garantías
 */
export const generateWarrantyReport = async (
  warranties: Warranty[],
  lubricentroName: string,
  reportType: 'vigentes' | 'vencidas' | 'por_vencer' | 'todas' = 'todas'
): Promise<void> => {
  try {
    // Importación dinámica para evitar problemas de SSR
    const jsPDF = await import('jspdf');
    const pdf = new jsPDF.default();
    
    let yPos = 20;
    const primaryColor = [46, 125, 50];
    
    // Título principal
    pdf.setFontSize(18);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.text('REPORTE DE GARANTÍAS', 105, yPos, { align: 'center' });
    yPos += 10;
    
    // Subtítulo
    pdf.setFontSize(14);
    pdf.text(lubricentroName, 105, yPos, { align: 'center' });
    yPos += 8;
    
    // Tipo de reporte
    const reportTitles = {
      vigentes: 'Garantías Vigentes',
      vencidas: 'Garantías Vencidas',
      por_vencer: 'Garantías Por Vencer',
      todas: 'Todas las Garantías'
    };
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(reportTitles[reportType], 105, yPos, { align: 'center' });
    yPos += 5;
    pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Estadísticas
    pdf.setFontSize(12);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN', 20, yPos);
    yPos += 10;
    
    const vigentes = warranties.filter(w => w.estado === 'vigente').length;
    const vencidas = warranties.filter(w => w.estado === 'vencida').length;
    const reclamadas = warranties.filter(w => w.estado === 'reclamada').length;
    const totalFacturado = warranties.reduce((sum, w) => sum + w.precio, 0);
    
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'normal');
    
    const stats = [
      ['Total de garantías:', warranties.length.toString()],
      ['Garantías vigentes:', vigentes.toString()],
      ['Garantías vencidas:', vencidas.toString()],
      ['Garantías reclamadas:', reclamadas.toString()],
      ['Total facturado:', `${totalFacturado.toLocaleString()}`]
    ];
    
    stats.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 80, yPos);
      yPos += 6;
    });
    
    yPos += 10;
    
    // Lista de garantías (primeras 15)
    pdf.setFontSize(12);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALLE DE GARANTÍAS', 20, yPos);
    yPos += 10;
    
    const guarantiesToShow = warranties.slice(0, 15);
    
    guarantiesToShow.forEach((warranty, index) => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.setFillColor(245, 245, 245);
      pdf.rect(20, yPos - 5, 170, 8, 'F');
      
      pdf.setFontSize(9);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${warranty.marca} ${warranty.modelo}`, 25, yPos);
      yPos += 6;
      
      pdf.setFontSize(8);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const details = [
        `Cliente: ${warranty.clienteNombre}`,
        `Venta: ${toDate(warranty.fechaVenta).toLocaleDateString('es-ES')}`,
        `Vencimiento: ${toDate(warranty.fechaVencimiento).toLocaleDateString('es-ES')}`,
        `Estado: ${warranty.estado}`,
        `Precio: ${warranty.precio.toLocaleString()}`
      ];
      
      details.forEach(detail => {
        pdf.text(detail, 25, yPos);
        yPos += 4;
      });
      
      yPos += 4;
    });
    
    if (warranties.length > 15) {
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`... y ${warranties.length - 15} garantías más`, 25, yPos);
    }
    
    // Pie de página
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Reporte de Garantías - ${lubricentroName}`, 20, 285);
    pdf.text(`Generado por Sistema HISMA`, 105, 290, { align: 'center' });
    
    const fileName = `Reporte_Garantias_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Error al generar reporte PDF:', error);
    throw new Error('No se pudo generar el reporte PDF');
  }
};

export default {
  createWarranty,
  getWarrantiesByLubricentro,
  searchWarranties,
  getExpiringWarranties,
  processWarrantyClaim,
  getWarrantyStats,
  getProductTemplates,
  exportWarrantiesToExcel,
  generateWarrantyReport,
  updateWarranty,
  deleteWarranty,
  getWarrantyById,
  getWarrantyAlerts
};