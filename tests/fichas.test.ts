import { describe, expect, it } from "vitest";
import { ANIOS, CAPITULOS, POLITICAS, compararImportes, gastoMiles, partida, poblacion, resumen } from "@/lib/datos";
import { ayudaCapitulo } from "@/lib/ayudaCapitulo";

describe("comparación entre la ficha y el gráfico", () => {
  it.each(ANIOS)("el ajuste de población y las políticas reconcilian los totales de %s", anio => {
    const ratio = poblacion("CT", anio) / poblacion("MD", anio);
    const madrid = resumen("MD", anio).gasto / 1000;
    const cataluna = resumen("CT", anio).gasto / 1000;
    const filas = POLITICAS.map(p => compararImportes(gastoMiles("MD", anio, p.id) / 1000, gastoMiles("CT", anio, p.id) / 1000, ratio));
    expect(filas.reduce((s, f) => s + f.directa, madrid)).toBeCloseTo(cataluna, 6);
    expect(filas.reduce((s, f) => s + f.ajustada, madrid * ratio)).toBeCloseTo(cataluna, 6);
  });

  it("reproduce las dos diferencias de la política 95 en 2024", () => {
    const r = compararImportes(gastoMiles("MD", 2024, "95") / 1000, gastoMiles("CT", 2024, "95") / 1000, poblacion("CT", 2024) / poblacion("MD", 2024));
    expect(r.directa).toBeCloseTo(474.47668, 5);
    expect(r.baseAjustada).toBeCloseTo(970.28892, 5);
    expect(r.ajustada).toBeCloseTo(352.50843, 5);
  });
});

it("el mismo capítulo explica profesiones distintas en Educación y Sanidad", () => {
  expect(ayudaCapitulo(partida("32")!, CAPITULOS[0], 2024)).toContain("profesora");
  expect(ayudaCapitulo(partida("31")!, CAPITULOS[0], 2024)).toContain("enfermera");
  expect(ayudaCapitulo(partida("3")!, CAPITULOS[0], 2024)).toContain("2024");
});
