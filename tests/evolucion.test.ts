import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Evolucion } from "@/components/Dinero";
import { CCAA, DEUDA, UNIDAD_TXT, aEurosDe, fmt, poblacion } from "@/lib/datos";

it.each(["hab", "mill"] as const)("la evolución muestra la deuda y las etiquetas en %s", (u) => {
  const html = renderToStaticMarkup(createElement(Evolucion, { anio: 2014, u }));
  expect(html).toContain(`aria-label="Deuda acumulada, ${UNIDAD_TXT[u]}`);
  for (const c of CCAA) {
    for (const anio of [2014, 2024]) {
      const miles = DEUDA[c][String(anio)];
      const importe = u === "mill" ? miles / 1000 : miles * 1000 / poblacion(c, anio);
      expect(html).toContain(fmt(aEurosDe(importe, anio, 2024), u));
    }
  }
});
