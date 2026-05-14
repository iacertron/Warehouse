/**
 * @fileoverview Paleta visual de LUB-AI Plant.
 *
 * REGLA: Este archivo no importa nada del proyecto.
 * Solo exporta constantes puras. Los componentes leen de aquí;
 * nunca definen colores inline.
 *
 * EXTENSIÓN MULTITENANT:
 * Si un cliente necesita paleta propia, el tenant en tenants.js
 * puede sobreescribir estas constantes en runtime (ver useColorMap).
 * No tocar este archivo para customización por cliente.
 */

// ---------------------------------------------------------------------------
// Rotación dinámica para SKUs (se asignan en orden de aparición en LX02)
// ---------------------------------------------------------------------------
export const COLORES_SKU_ROTACION = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f43f5e', // rose-500
  '#84cc16', // lime-500
];

// ---------------------------------------------------------------------------
// Colores fijos por formato de envase (dominio de negocio, no de cliente)
// Clave = valor canónico retornado por parsers.getFormato()
// ---------------------------------------------------------------------------
export const COLORES_FORMATO = {
  'BIN (1040L)':   '#8b5cf6',
  'TAMBOR (208L)': '#f59e0b',
  'BALDE (19L)':   '#10b981',
  'CAJA 5L':       '#3b82f6',
  'CAJA 4L':       '#06b6d4',
  'CAJA 1L':       '#ef4444',
  'OTRO':          '#64748b',
};

// ---------------------------------------------------------------------------
// Semáforo de ocupación (usado en StatusPanel y KPI cards)
// ---------------------------------------------------------------------------
export const COLOR_OCUPACION = {
  optimo:   '#10b981', // < 70%
  moderado: '#f59e0b', // 70–89%
  critico:  '#ef4444', // ≥ 90%
};

/**
 * Devuelve el color de semáforo según tasa de ocupación (0–100).
 * @param {number} tasa
 * @returns {string} hex color
 */
export const colorPorOcupacion = (tasa) => {
  if (tasa >= 90) return COLOR_OCUPACION.critico;
  if (tasa >= 70) return COLOR_OCUPACION.moderado;
  return COLOR_OCUPACION.optimo;
};

// ---------------------------------------------------------------------------
// Colores de insights (nivel de criticidad)
// ---------------------------------------------------------------------------
export const COLOR_INSIGHT = {
  CRITICO:      { text: 'text-red-400',  bg: 'bg-red-600',  border: 'border-red-500/30'  },
  ALTO_IMPACTO: { text: 'text-blue-400', bg: 'bg-blue-600', border: 'border-blue-500/30' },
};
