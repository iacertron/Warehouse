/**
 * @fileoverview Asignación dinámica de colores por SKU.
 *
 * RESPONSABILIDAD:
 * Construye el mapa material → color en runtime según orden de aparición
 * en LX02. Estable entre renders mientras lx02 no cambie.
 *
 * REGLA: Solo useMemo. Sin fetch, sin efectos secundarios.
 */

import { useMemo } from 'react';
import _ from 'lodash';
import { COLORES_SKU_ROTACION, COLORES_FORMATO } from '../config/colores';
import { getFormato } from '../data/parsers';

/**
 * @param {import('../data/parsers').Lx02Row[]} lx02
 * @param {'sku'|'formato'} modoColor
 * @returns {Record<string, string>} material → color hex
 */
const useColorMap = (lx02, modoColor) => {
  return useMemo(() => {
    const materiales = _.uniq(lx02.map((p) => p.material));

    if (modoColor === 'formato') {
      // Cada material toma el color de su formato de envase
      return Object.fromEntries(
        materiales.map((mat) => {
          const row     = lx02.find((p) => p.material === mat);
          const formato = row ? getFormato(row.descripcion) : 'OTRO';
          return [mat, COLORES_FORMATO[formato] ?? COLORES_FORMATO['OTRO']];
        })
      );
    }

    // Modo SKU: rotación por orden de aparición
    return Object.fromEntries(
      materiales.map((mat, i) => [
        mat,
        COLORES_SKU_ROTACION[i % COLORES_SKU_ROTACION.length],
      ])
    );
  }, [lx02, modoColor]);
};

export default useColorMap;
