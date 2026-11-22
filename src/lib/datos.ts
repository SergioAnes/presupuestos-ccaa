import bruto from "@/data/gasto.json";

/** Comunidades de esta primera versión (ids como en sanidad-ccaa). */
export type Ccaa = "MD" | "CT";
export const CCAA: Ccaa[] = ["MD", "CT"];
export const NOMBRE: Record<Ccaa, string> = { MD: "Madrid", CT: "Cataluña" };
export const NOMBRE_LARGO: Record<Ccaa, string> = { MD: "Comunidad de Madrid", CT: "Cataluña" };

export type Unidad = "hab" | "pct" | "mill";

interface Fila {
  ccaa: string;
  anio: number;
  politica: string;
  total: number;
  depurado: number;
  capitulos: number[]; // 9 capítulos, miles de euros
}

export const FUENTE = bruto.fuente;
export const ANIOS: number[] = bruto.anios;
export const ENTIDADES = bruto.entidades as Record<string, Record<string, string[]>>;

/** Nombres cortos para gráficos; el oficial va en la tabla y en los textos de ayuda. */
const CORTO: Record<string, string> = {
  "1": "Servicios públicos básicos",
  "2": "Protección y promoción social",
  "3": "Sanidad, educación y cultura",
  "4": "Actuaciones económicas",
  "9": "Administración general y deuda",
  "11": "Justicia",
  "12": "Defensa",
  "13": "Seguridad y prisiones",
  "14": "Política exterior",
  "21": "Pensiones",
  "22": "Otras prestaciones económicas",
  "23": "Servicios sociales",
  "24": "Fomento del empleo",
  "25": "Desempleo",
  "26": "Vivienda",
  "29": "Gestión de la Seguridad Social",
  "31": "Sanidad",
  "32": "Educación",
  "33": "Cultura",
  "41": "Agricultura y pesca",
  "42": "Industria y energía",
  "43": "Comercio, turismo y pymes",
  "44": "Subvenciones al transporte",
  "45": "Infraestructuras",
  "46": "I+D+i",
  "49": "Otras actuaciones económicas",
  "91": "Alta dirección",
  "92": "Servicios generales",
  "93": "Administración financiera y tributaria",
  "94": "Transferencias a otras administraciones",
  "95": "Deuda pública (intereses)",
};

/** Políticas en las que las dos comunidades no tienen las mismas competencias. */
export const COMPETENCIA_DISTINTA = new Set(["13"]);

export interface Partida {
  id: string;
  area: string; // "" para las áreas
  nombre: string; // corto
  oficial: string;
}

export const AREAS: Partida[] = bruto.areas.map((a) => ({ id: a.id, area: "", nombre: CORTO[a.id] ?? a.nombre, oficial: a.nombre }));

const FILAS = bruto.datos as Fila[];

/** Gasto comparable de una política: obligaciones depuradas de IFL y PAC, sin activos ni pasivos financieros. */
const comparable = (f: Fila) => f.depurado - f.capitulos[7] - f.capitulos[8];

const conDatos = new Set(FILAS.filter((f) => f.total !== 0).map((f) => f.politica));
export const POLITICAS: Partida[] = bruto.politicas
  .filter((p) => conDatos.has(p.id))
  .map((p) => ({ id: p.id, area: p.area, nombre: CORTO[p.id] ?? p.nombre, oficial: p.nombre }));

export function poblacion(c: Ccaa, anio: number): number {
  return (bruto.poblacion as Record<string, Record<string, number>>)[c][String(anio)];
}

function filas(c: Ccaa, anio: number) {
  return FILAS.filter((f) => f.ccaa === c && f.anio === anio);
}

/** Gasto comparable por partida (política o área), en miles de euros. */
export function gastoMiles(c: Ccaa, anio: number, id: string): number {
  return filas(c, anio)
    .filter((f) => (id.length === 1 ? f.politica[0] === id : f.politica === id))
    .reduce((s, f) => s + comparable(f), 0);
}

export interface Resumen {
  gasto: number; // comparable, miles de euros
  total: number; // obligaciones totales registradas
  devolucion: number; // capítulo 9, pasivos financieros
  prestamos: number; // capítulo 8, activos financieros
  intermediacion: number; // IFL y PAC (total - depurado)
  intereses: number; // capítulo 3 de la política 95
  poblacion: number;
}

export function resumen(c: Ccaa, anio: number): Resumen {
  const fs = filas(c, anio);
  const suma = (fn: (f: Fila) => number) => fs.reduce((s, f) => s + fn(f), 0);
  return {
    gasto: suma(comparable),
    total: suma((f) => f.total),
    devolucion: suma((f) => f.capitulos[8]),
    prestamos: suma((f) => f.capitulos[7]),
    intermediacion: suma((f) => f.total - f.depurado),
    intereses: fs.find((f) => f.politica === "95")?.capitulos[2] ?? 0,
    poblacion: poblacion(c, anio),
  };
}

/** Valor en la unidad elegida, a partir de miles de euros. */
export function enUnidad(miles: number, u: Unidad, c: Ccaa, anio: number): number {
  if (u === "mill") return miles / 1000;
  if (u === "hab") return (miles * 1000) / poblacion(c, anio);
  return (miles / resumen(c, anio).gasto) * 100;
}

// ---------- formatos ----------
// «always»: en español, Intl no separa los miles en números de cuatro cifras (4069 → 4.069)
const nf = (d: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: "always" } as Intl.NumberFormatOptions);
export function fmt(v: number, u: Unidad): string {
  if (u === "hab") return `${nf(0).format(v)} €`;
  if (u === "pct") return `${nf(1).format(v)} %`;
  return `${nf(Math.abs(v) < 100 ? 1 : 0).format(v)} M€`;
}
export function fmtDif(v: number, u: Unidad): string {
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  const a = Math.abs(v);
  if (u === "pct") return `${s}${nf(1).format(a)} p.`;
  return s + fmt(a, u);
}
export const fmtPct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${nf(0).format(Math.abs(v))} %`;
export const fmtNum = (v: number) => nf(0).format(v);
/** Por debajo de esto (€ por habitante en Madrid), el % de diferencia no se muestra: sale desorbitado y no dice nada. */
export const MIN_HAB_PCT = 5;
export const UNIDAD_TXT: Record<Unidad, string> = { hab: "€ por habitante", pct: "% de su gasto", mill: "millones de €" };

// ---------- desglose por capítulos (en qué se va el dinero) ----------
/** Capítulos de gasto no financieros. El 5 (fondo de contingencia) casi nunca tiene obligaciones. */
export const CAPITULOS: { n: number; nombre: string; oficial: string }[] = [
  { n: 1, nombre: "Sueldos del personal", oficial: "Capítulo 1. Gastos de personal" },
  { n: 2, nombre: "Compras de bienes y servicios", oficial: "Capítulo 2. Gastos corrientes en bienes y servicios" },
  { n: 3, nombre: "Intereses", oficial: "Capítulo 3. Gastos financieros" },
  { n: 4, nombre: "Transferencias y subvenciones corrientes", oficial: "Capítulo 4. Transferencias corrientes" },
  { n: 5, nombre: "Fondo de contingencia", oficial: "Capítulo 5. Fondo de contingencia" },
  { n: 6, nombre: "Inversiones", oficial: "Capítulo 6. Inversiones reales" },
  { n: 7, nombre: "Transferencias de capital", oficial: "Capítulo 7. Transferencias de capital" },
];

/** Obligaciones por capítulo (1 a 9) de una política o área, en miles de euros, SIN depurar IFL y PAC. */
export function capitulosMiles(c: Ccaa, anio: number, id: string): number[] {
  const out = Array(9).fill(0) as number[];
  for (const f of filas(c, anio)) {
    if (id.length === 1 ? f.politica[0] !== id : f.politica !== id) continue;
    f.capitulos.forEach((v, i) => (out[i] += v));
  }
  return out;
}

/** Lo que Hacienda resta en la versión depurada (IFL y PAC) de una política o área, en miles de euros. */
export function depuracionDe(c: Ccaa, anio: number, id: string): number {
  return filas(c, anio)
    .filter((f) => (id.length === 1 ? f.politica[0] === id : f.politica === id))
    .reduce((s, f) => s + f.total - f.depurado, 0);
}

export function partida(id: string): Partida | undefined {
  return id.length === 1 ? AREAS.find((a) => a.id === id) : POLITICAS.find((p) => p.id === id);
}

/** Datos del año en CSV (separador «;» y coma decimal, para abrirlo en Excel en español). */
export function csv(anio: number): string {
  const n = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
  const cab = ["codigo", "partida", "nombre_oficial", ...CCAA.flatMap((c) => [`${NOMBRE[c]}_miles_eur`, `${NOMBRE[c]}_eur_hab`, `${NOMBRE[c]}_pct`])];
  const lineas = [cab.join(";")];
  for (const p of [...AREAS, ...POLITICAS].sort((a, b) => (a.id[0] === b.id[0] ? a.id.length - b.id.length || a.id.localeCompare(b.id) : a.id.localeCompare(b.id)))) {
    const vals = CCAA.flatMap((c) => {
      const m = gastoMiles(c, anio, p.id);
      return [n(m), n(enUnidad(m, "hab", c, anio)), n(enUnidad(m, "pct", c, anio))];
    });
    lineas.push([p.id, `"${p.nombre}"`, `"${p.oficial}"`, ...vals].join(";"));
  }
  lineas.push("");
  lineas.push(`"Gasto comparado: obligaciones reconocidas, datos consolidados, depuradas de IFL y PAC, sin capítulos 8 y 9. Fuente: ${FUENTE.gasto}. Población: ${FUENTE.poblacion}. Año ${anio}."`);
  return "﻿" + lineas.join("\r\n");
}
