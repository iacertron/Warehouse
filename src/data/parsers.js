/**
 * @fileoverview Parsers de datos SAP para LUB-AI Plant.
 *
 * REGLA: Este archivo no importa React ni ningún componente.
 * Solo funciones puras: entrada → datos limpios.
 *
 * CONTRATO CON EL RESTO DEL SISTEMA:
 * Los componentes y hooks nunca acceden a nombres de columna SAP.
 * Solo consumen los objetos canónicos que retornan estas funciones.
 *
 *   MaestroRow  → { ubicacion, pasillo, rack, nivel, tipoUbi }
 *   Lx02Row     → { ubicacion, material, descripcion, lote, cantidad, unidad, formato }
 */

import { tenant } from '../config/tenants';
import { COLORES_FORMATO } from '../config/colores';

// ---------------------------------------------------------------------------
// resolveCol — núcleo del sistema de mapping
// ---------------------------------------------------------------------------

/**
 * Busca en `row` la primera variante de columna definida en el columnMap
 * del tenant activo. Retorna el valor como string limpio, o '' si no encuentra.
 *
 * @param {Record<string, string>} row        - Fila cruda del CSV
 * @param {'maestro'|'lx02'} fuente           - Qué sección del columnMap usar
 * @param {string} campo                      - Nombre canónico del campo
 * @returns {string}
 *
 * @example
 * // columnMap.lx02.ubicacion = ['Ubicación', 'Ubicacion']
 * resolveCol(row, 'lx02', 'ubicacion')
 * // → retorna row['Ubicación'] si existe, sino row['Ubicacion'], sino ''
 */
const resolveCol = (row, fuente, campo) => {
  const variantes = tenant.columnMap[fuente]?.[campo] ?? [];
  for (const variante of variantes) {
    if (row[variante] !== undefined && row[variante] !== null) {
      return String(row[variante]).trim();
    }
  }
  return '';
};

// ---------------------------------------------------------------------------
// getFormato — categorización de envase por descripción
// ---------------------------------------------------------------------------

/**
 * Infiere el formato de envase a partir de la descripción del material.
 * Retorna una de las claves de COLORES_FORMATO para garantizar
 * que siempre hay un color asignado.
 *
 * @param {string} descripcion
 * @returns {keyof typeof COLORES_FORMATO}
 */
export const getFormato = (descripcion) => {
  if (!descripcion) return 'OTRO';
  const d = descripcion.toLowerCase();
  if (/1040\s*l/i.test(d))  return 'BIN (1040L)';
  if (/208\s*l/i.test(d))   return 'TAMBOR (208L)';
  if (/19\s*l/i.test(d))    return 'BALDE (19L)';
  if (/\b5\s*l/i.test(d))   return 'CAJA 5L';
  if (/\b4\s*l/i.test(d))   return 'CAJA 4L';
  if (/\b1\s*l/i.test(d))   return 'CAJA 1L';
  return 'OTRO';
};

// ---------------------------------------------------------------------------
// parseMaestroRow — fila cruda CSV → MaestroRow canónico
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} MaestroRow
 * @property {string} ubicacion  - Ej: "1-12-3"
 * @property {number} pasillo
 * @property {number} rack
 * @property {number} nivel
 * @property {'U1'|'U2'|string} tipoUbi
 * @property {boolean} valida    - Cumple filtros del tenant (tipo + bloqueos)
 */

/**
 * @param {Record<string, string>} row - Fila cruda de PapaParse
 * @returns {MaestroRow}
 */
export const parseMaestroRow = (row) => {
  const ubicacion      = resolveCol(row, 'maestro', 'ubicacion');
  const tipoUbi        = resolveCol(row, 'maestro', 'tipoUbicacion').toUpperCase();
  const bloqueoSalida  = resolveCol(row, 'maestro', 'bloqueoSalida').toUpperCase();
  const bloqueoEntrada = resolveCol(row, 'maestro', 'bloqueoEntrada').toUpperCase();

  const partes  = ubicacion.split('-');
  const pasillo = parseInt(partes[0]) || 0;
  const rack    = parseInt(partes[1]) || 0;
  const nivel   = parseInt(partes[2]) || 0;

  const { tiposUbicacionValidos } = tenant.reglas;
  const valida =
    tiposUbicacionValidos.includes(tipoUbi) &&
    bloqueoSalida  !== 'X' &&
    bloqueoEntrada !== 'X';

  return { ubicacion, pasillo, rack, nivel, tipoUbi, valida };
};

// ---------------------------------------------------------------------------
// parseLx02Row — fila cruda CSV → Lx02Row canónico
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Lx02Row
 * @property {string} ubicacion
 * @property {string} material
 * @property {string} descripcion
 * @property {string} lote
 * @property {number} cantidad
 * @property {string} unidad
 * @property {string} formato    - Clave de COLORES_FORMATO
 */

/**
 * @param {Record<string, string>} row
 * @returns {Lx02Row | null} null si la fila no tiene material válido
 */
export const parseLx02Row = (row) => {
  const material = resolveCol(row, 'lx02', 'material');
  if (!material) return null;

  const descripcion = resolveCol(row, 'lx02', 'descripcion');
  const cantidadStr = resolveCol(row, 'lx02', 'cantidad')
    .replace(/\./g, '')   // separador de miles → quitar
    .replace(',', '.');   // separador decimal → punto

  return {
    ubicacion:   resolveCol(row, 'lx02', 'ubicacion'),
    material,
    descripcion,
    lote:        resolveCol(row, 'lx02', 'lote'),
    cantidad:    parseFloat(cantidadStr) || 0,
    unidad:      resolveCol(row, 'lx02', 'unidad'),
    formato:     getFormato(descripcion),
  };
};

// ---------------------------------------------------------------------------
// Funciones de filtrado de colecciones completas
// (las usa useWarehouseData, no los componentes directamente)
// ---------------------------------------------------------------------------

/**
 * Procesa el array crudo del maestro y retorna solo filas válidas.
 * @param {Record<string, string>[]} rawRows
 * @returns {MaestroRow[]}
 */
export const parseMaestro = (rawRows) =>
  rawRows.map(parseMaestroRow).filter((r) => r.valida);

/**
 * Procesa el array crudo de LX02 y retorna solo filas con material.
 * @param {Record<string, string>[]} rawRows
 * @returns {Lx02Row[]}
 */
export const parseLx02 = (rawRows) =>
  rawRows.map(parseLx02Row).filter(Boolean);
