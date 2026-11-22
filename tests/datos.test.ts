import { describe, expect, it } from "vitest";
import { ANIOS, AREAS, CCAA, POLITICAS, enUnidad, gastoMiles, resumen } from "@/lib/datos";

describe("gasto comparable", () => {
  for (const anio of ANIOS)
    for (const c of CCAA) {
      const r = resumen(c, anio);
      it(`${c} ${anio}: gasto + operaciones financieras + IFL/PAC = total de Hacienda`, () => {
        expect(r.gasto + r.devolucion + r.prestamos + r.intermediacion).toBeCloseTo(r.total, 1);
      });
      it(`${c} ${anio}: las áreas suman el gasto y las políticas suman su área`, () => {
        expect(AREAS.reduce((s, a) => s + gastoMiles(c, anio, a.id), 0)).toBeCloseTo(r.gasto, 1);
        for (const a of AREAS) {
          const pols = POLITICAS.filter((p) => p.area === a.id).reduce((s, p) => s + gastoMiles(c, anio, p.id), 0);
          expect(pols).toBeCloseTo(gastoMiles(c, anio, a.id), 1);
        }
      });
      it(`${c} ${anio}: los % suman 100`, () => {
        expect(AREAS.reduce((s, a) => s + enUnidad(gastoMiles(c, anio, a.id), "pct", c, anio), 0)).toBeCloseTo(100, 6);
      });
      it(`${c} ${anio}: ninguna política negativa`, () => {
        for (const p of POLITICAS) expect(gastoMiles(c, anio, p.id)).toBeGreaterThanOrEqual(-0.01);
      });
    }

  it("2022 reproduce los totales publicados por Hacienda (miles de €)", () => {
    expect(resumen("MD", 2022).total).toBeCloseTo(27469052.49, 1);
    expect(resumen("CT", 2022).total).toBeCloseTo(51641586.49, 1);
    // Versión depurada de IFL y PAC
    expect(resumen("CT", 2022).total - resumen("CT", 2022).intermediacion).toBeCloseTo(46996308.24, 1);
  });
});
