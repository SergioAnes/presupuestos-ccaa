import { describe, expect, it } from "vitest";
import { ANIOS, CCAA, sfa } from "@/lib/datos";
import { cuentaRegional, divisiones, pesoFuncional, valorRegional } from "@/lib/igae";

describe("Detalle de la IGAE por ejercicio, millones de euros", () => {
  // Tabla1a, filas 36, 43 y 63 (empleos, D.41 a pagar y B.9).
  const referencia = [
    [2022, 33853, 43178, 799, 1049, -2046, -3704],
    [2023, 36698, 45274, 1139, 1418, -2211, -3498],
    [2024, 39177, 49964, 1239, 1709, -538, -1552],
  ];
  it.each(referencia)("reproduce Madrid y Cataluña en %i", (anio, gm, gc, im, ic, sm, sc) => {
    const { MD, CT } = cuentaRegional(anio)!.operaciones.territorios;
    expect([MD.gasto, CT.gasto, MD.intereses, CT.intereses, MD.saldo, CT.saldo]).toEqual([gm, gc, im, ic, sm, sc]);
  });
  it("concilia cada edición con su propia fuente", () => {
    expect(divisiones).toHaveLength(10);
    for (const anio of ANIOS) {
      const { operaciones, cofog } = cuentaRegional(anio)!;
      expect(operaciones.url).toContain(String(anio));
      expect(cofog.url).toContain(String(anio));
      for (const c of CCAA) {
        const f = cofog.territorios[c], o = operaciones.territorios[c];
        expect(Object.keys(f.divisiones).sort()).toEqual(divisiones.map(([id]) => id));
        expect(Object.values(f.divisiones).reduce<number>((s, n) => s + n!, 0)).toBe(f.total);
        expect(o.recursos! - o.gasto!).toBe(o.saldo);
      }
    }
  });
  it("conserva el total funcional provisional de 2024 y su denominador", () => {
    const { cofog } = cuentaRegional(2024)!;
    expect(cofog.estado).toBe("Provisional");
    const { MD, CT } = cofog.territorios;
    expect([MD.total, CT.total, MD.divisiones["07"], CT.divisiones["09"]]).toEqual([39233, 49980, 12534, 9514]);
    expect(pesoFuncional(MD.divisiones["07"], MD.total)).toBeCloseTo(31.95, 2);
  });
  it("convierte los millones con residentes INE y distingue la ausencia del cero", () => {
    expect(valorRegional(39177, "hab", "MD", 2024)).toBeCloseTo(5558.75, 2);
    expect(valorRegional(0, "mill", "CT", 2024)).toBe(0);
    expect(valorRegional(null, "hab", "MD", 2024)).toBeNull();
    expect(pesoFuncional(null, 49980)).toBeNull();
    expect(cuentaRegional(2021)).toBeUndefined();
    expect(sfa("CT", 2024)?.poblacion_ajustada).toBe(7842238);
  });
});
