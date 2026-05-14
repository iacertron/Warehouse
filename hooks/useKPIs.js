/**
 * @fileoverview KPIs operativos derivados del estado del warehouse.
 *
 * RESPONSABILIDAD:
 * Recibe maestro y lx02 ya parseados.
 * Retorna métricas listas para renderizar — sin lógica en componentes.
 *
 * REGLA: Solo useMemo. Sin fetch, sin efectos secundarios.
 */

import { useMemo } from 'react';
import _ from 'lodash';
import { generarInsights } from '../data/insightsEngine';

/**
 * @param {import('../data/parsers').MaestroRow[]} maestro
 * @param {import('../data/parsers').Lx02Row[]}    lx02
 * @returns {{
 *   totalPosiciones: number,
 *   ocupadas:        number,
 *   libres:          number,
 *   tasaOcupacion:   number,
 *   insights:        import('../data/insightsEngine').Insight[]
 * }}
 */
const useKPIs = (maestro, lx02) => {
  return useMemo(() => {
    const totalPosiciones = maestro.length;
    const ocupadas        = new Set(lx02.map((p) => p.ubicacion)).size;
    const libres          = totalPosiciones - ocupadas;
    const tasaOcupacion   =
      totalPosiciones > 0
        ? parseFloat(((ocupadas / totalPosiciones) * 100).toFixed(1))
        : 0;

    const insights = generarInsights(maestro, lx02);

    return { totalPosiciones, ocupadas, libres, tasaOcupacion, insights };
  }, [maestro, lx02]);
};

export default useKPIs;
