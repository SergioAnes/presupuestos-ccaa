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

import { ANIOS_SERIE, DEUDA, ECONOMICA, SERIE } from "@/lib/datos";

describe("ingresos, serie y deuda", () => {
  for (const anio of ANIOS)
    for (const c of CCAA) {
      it(`${c} ${anio}: los gastos por capítulos suman el total de Hacienda`, () => {
        expect(ECONOMICA[c][String(anio)].gastos.reduce((s, x) => s + x, 0)).toBeCloseTo(resumen(c, anio).total, 0);
      });
      it(`${c} ${anio}: la serie coincide con la descarga del año`, () => {
        expect(SERIE[c].gastos[String(anio)]).toEqual(ECONOMICA[c][String(anio)].gastos.map((x) => Math.round(x * 100) / 100));
      });
      it(`${c} ${anio}: hay deuda del Banco de España`, () => {
        expect(DEUDA[c][String(anio)]).toBeGreaterThan(0);
      });
    }
  it("la serie empieza en 2002 y no tiene huecos", () => {
    expect(ANIOS_SERIE[0]).toBe(2002);
    expect(ANIOS_SERIE.length).toBe(ANIOS_SERIE[ANIOS_SERIE.length - 1] - 2002 + 1);
  });
});

import { FINANCIACION, homogeneaConFondos, saldoSistema, sfa } from "@/lib/datos";

describe("sistema de financiación", () => {
  it("trae las 15 comunidades de régimen común en todos los años del gasto", () => {
    expect(Object.keys(FINANCIACION).length).toBe(15);
    for (const c of Object.keys(FINANCIACION)) for (const a of ANIOS) expect(sfa(c, a)).toBeDefined();
  });
  for (const a of ANIOS)
    it(`${a}: el saldo del Fondo de Garantía es lo recibido menos lo aportado`, () => {
      for (const c of Object.keys(FINANCIACION)) {
        const f = sfa(c, a)!;
        expect(f.fg_recibe - f.fg_aporta).toBeCloseTo(f.fg, 0);
        expect(Number.isFinite(saldoSistema(f)) && Number.isFinite(homogeneaConFondos(f))).toBe(true);
      }
    });
  it("2024 reproduce cifras publicadas (miles de €)", () => {
    expect(sfa("MD", 2024)!.fg).toBeCloseTo(-6365644.44, 1);
    expect(sfa("CT", 2024)!.fsg).toBeCloseTo(1142846.45, 1);
    expect(sfa("CT", 2024)!.homogenea_hab_ajustado).toBeCloseTo(3475.49, 1);
  });
});

import { IPC, aEurosDe, habPartida } from "@/lib/datos";

describe("evolución y euros constantes", () => {
  it("el IPC cubre todos los años con gasto y la serie desde 2002", () => {
    for (const a of [2002, ...ANIOS]) expect(IPC[String(a)]).toBeGreaterThan(0);
  });
  it("pasar a euros del mismo año no cambia nada y 2022→2024 sube con los precios", () => {
    expect(aEurosDe(100, 2024, 2024)).toBe(100);
    expect(aEurosDe(100, 2022, 2024)).toBeCloseTo((100 * IPC["2024"]) / IPC["2022"], 6);
    expect(aEurosDe(100, 2022, 2024)).toBeGreaterThan(100);
  });
  it("el total por habitante es la suma de las áreas", () => {
    for (const c of CCAA) for (const a of ANIOS)
      expect(AREAS.reduce((s, ar) => s + habPartida(c, a, ar.id), 0)).toBeCloseTo(habPartida(c, a, "T"), 6);
  });
});

import { COMPETENCIA_DISTINTA, INUSUAL, INUSUALES, notasCompetencia } from "@/lib/datos";

describe("variaciones inusuales y competencias", () => {
  it("todas cumplen el criterio (≥ 30 % y ≥ 10 € por habitante, sin inflación)", () => {
    expect(INUSUALES.length).toBeGreaterThan(0);
    for (const v of INUSUALES) {
      expect(Math.abs(v.pct)).toBeGreaterThanOrEqual(INUSUAL.pct);
      expect(Math.abs(v.despues - v.antes)).toBeGreaterThanOrEqual(INUSUAL.eur);
    }
  });
  it("cada política con competencias distintas tiene su nota", () => {
    for (const id of COMPETENCIA_DISTINTA) expect(notasCompetencia(id).length).toBeGreaterThan(0);
  });
});
