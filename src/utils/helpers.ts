// src/utils/helpers.ts
import { isNumber as _isNumber } from 'lodash';

// Exportar la función para que los componentes la puedan importar
export const isNumber = _isNumber;

// Alternativa: definirla globalmente (menos recomendado pero más rápido)
// window.isNumber = _isNumber;