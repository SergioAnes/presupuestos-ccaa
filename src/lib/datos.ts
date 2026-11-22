import bruto from "@/data/gasto.json";
import ipcBruto from "@/data/ipc.json";

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

/**
 * Políticas en las que cada comunidad tiene competencias que otras no tienen (se quitan al comparar
 * «a competencias homogéneas»). Al añadir comunidades: País Vasco y Navarra también tienen policía propia.
 */
export const COMPETENCIAS_SINGULARES: Record<string, string[]> = { CT: ["13"] };
/** Políticas con competencias distintas en la pareja comparada (se marcan «≠ competencias»). */
export const COMPETENCIA_DISTINTA = new Set(CCAA.flatMap((c) => COMPETENCIAS_SINGULARES[c] ?? []));

/** Explicación de cada competencia singular: qué tiene la comunidad y qué pasa en las que no la tienen. */
export const COMPETENCIA_NOTA: Record<string, Record<string, { tiene: string; fuente: { texto: string; url: string }; sinElla: string }>> = {
  CT: {
    "13": {
      tiene: "tiene policía propia (Mossos d'Esquadra) y gestiona sus prisiones",
      fuente: { texto: "Estatuto de Autonomía, arts. 164 y 168", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-13087" },
      sinElla: "la Policía Nacional, la Guardia Civil y las prisiones las paga el Estado con los impuestos generales, y ese gasto no pasa por el presupuesto de la comunidad",
    },
  },
};
/** Para una política con competencias distintas: quién la tiene y quién no, en la pareja comparada. */
export function notasCompetencia(id: string): { quien: Ccaa; otras: Ccaa[]; nota: (typeof COMPETENCIA_NOTA)[string][string] }[] {
  return CCAA.filter((c) => COMPETENCIA_NOTA[c]?.[id]).map((c) => ({ quien: c, otras: CCAA.filter((o) => !COMPETENCIA_NOTA[o]?.[id]), nota: COMPETENCIA_NOTA[c][id] }));
}
/**
 * Por qué una comunidad hace de intermediaria del dinero de sus ayuntamientos (IFL). Solo donde una norma lo establece;
 * en el resto, el Estado paga directamente a cada ayuntamiento su participación en los impuestos estatales.
 */
export const IFL_NOTA: Record<string, { texto: string; fuente: { texto: string; url: string } }> = {
  CT: {
    texto: "su Estatuto establece que el dinero del Estado para los ayuntamientos catalanes (su parte de los impuestos estatales y las subvenciones sin condiciones) se cobra a través de la Generalitat, que lo distribuye",
    fuente: { texto: "Estatuto de Autonomía de Cataluña, art. 219.2", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-13087" },
  },
};

/** Color de cada comunidad según su posición en la comparación (primera azul, segunda naranja). */
export const COLOR_CCAA: Record<Ccaa, string> = Object.fromEntries(CCAA.map((c, i) => [c, i === 0 ? "var(--s1)" : "var(--s2)"])) as Record<Ccaa, string>;

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
  if (u === "hab") return `${nf(Math.abs(v) >= 0.05 && Math.abs(v) < 9.95 ? 1 : 0).format(v)} €`;
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
export const CAPITULOS: { n: number; nombre: string; oficial: string; explica: string }[] = [
  { n: 1, nombre: "Sueldos del personal", oficial: "Capítulo 1. Gastos de personal", explica: "Sueldos y cotizaciones sociales de los trabajadores de la comunidad y de sus organismos: médicos, profesores, funcionarios…" },
  { n: 2, nombre: "Compras de bienes y servicios", oficial: "Capítulo 2. Gastos corrientes en bienes y servicios", explica: "Lo que la comunidad compra o contrata para funcionar: material, suministros, alquileres, limpieza, mantenimiento y servicios hechos por otros, como los conciertos sanitarios." },
  { n: 3, nombre: "Intereses", oficial: "Capítulo 3. Gastos financieros", explica: "Intereses de la deuda y otros gastos de los préstamos. Casi todos se apuntan en la política «Deuda pública»; en las demás suelen ser cero. La devolución del préstamo en sí no está aquí." },
  { n: 4, nombre: "Transferencias y subvenciones corrientes", oficial: "Capítulo 4. Transferencias corrientes", explica: "Dinero que la comunidad entrega a otros para sus gastos del día a día, sin recibir a cambio un bien o servicio. Puede ir a familias, empresas, asociaciones, ayuntamientos o a entes y empresas públicas que no están en estas cuentas. Hacienda no publica, política a política, quién lo recibe." },
  { n: 5, nombre: "Fondo de contingencia", oficial: "Capítulo 5. Fondo de contingencia", explica: "Reserva para gastos imprevistos. Casi nunca se gasta desde aquí: se pasa a otros capítulos." },
  { n: 6, nombre: "Inversiones", oficial: "Capítulo 6. Inversiones reales", explica: "Obras, edificios, equipos y otros bienes duraderos de la propia comunidad: un hospital, una carretera, un equipo de resonancia…" },
  { n: 7, nombre: "Transferencias de capital", oficial: "Capítulo 7. Transferencias de capital", explica: "Dinero que la comunidad entrega a otros (ayuntamientos, empresas, universidades…) para que hagan inversiones. Hacienda no publica, política a política, quién lo recibe." },
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

// ---------- qué incluye cada partida ----------
/**
 * Descripción orientativa, en lenguaje llano, de lo que suele ir en cada área y política de la clasificación por
 * programas que usa Hacienda (la misma estructura que los Presupuestos Generales del Estado). Cada comunidad decide en
 * qué programa coloca cada gasto: no son listas cerradas. No incluir cifras ni valoraciones aquí.
 */
export const QUE_INCLUYE: Record<string, string> = {
  "1": "Justicia, seguridad y prisiones, y acción exterior: los servicios básicos de un Estado que la comunidad gestiona cuando tiene la competencia.",
  "11": "Los medios de la Administración de Justicia en la comunidad: funcionarios de los juzgados (no los jueces), edificios, medios materiales y justicia gratuita.",
  "13": "Policía autonómica, prisiones, protección civil y emergencias, y seguridad vial, según las competencias de cada comunidad.",
  "14": "Acción exterior de la comunidad (delegaciones y oficinas fuera de España, relaciones con la Unión Europea) y cooperación internacional al desarrollo.",
  "2": "Servicios sociales, empleo, vivienda y prestaciones que paga la propia comunidad.",
  "21": "Pensiones y complementos de pensión que paga la propia comunidad. Las pensiones de la Seguridad Social no están aquí.",
  "23": "Dependencia, residencias y centros de día, familia e infancia, rentas mínimas, igualdad, juventud y otros servicios sociales.",
  "24": "Políticas activas de empleo: formación para el empleo, orientación, oficinas de empleo e incentivos a la contratación.",
  "26": "Vivienda pública y protegida, ayudas al alquiler, a la compra y a la rehabilitación.",
  "3": "Sanidad, educación y cultura: los grandes servicios públicos que gestionan las comunidades.",
  "31": "Hospitales y centros de salud, su personal, medicamentos con receta, conciertos con centros sanitarios y salud pública.",
  "32": "Colegios e institutos públicos, conciertos con centros concertados, universidades, formación profesional y becas.",
  "33": "Museos, bibliotecas, archivos, patrimonio histórico, promoción cultural y deporte.",
  "4": "Ayudas y servicios a sectores económicos, transporte e infraestructuras, e investigación.",
  "41": "Agricultura, ganadería, pesca, desarrollo rural y seguridad alimentaria. La versión depurada de Hacienda no incluye las ayudas de la Política Agraria Común que la comunidad solo reparte.",
  "42": "Promoción industrial, energía y minas.",
  "43": "Comercio, turismo y apoyo a pequeñas y medianas empresas.",
  "44": "Ayudas al transporte público para que el billete cueste menos: abonos, metro, autobuses y consorcios de transporte.",
  "45": "Carreteras, obras hidráulicas, infraestructuras de transporte y actuaciones de medio ambiente.",
  "46": "Investigación, desarrollo e innovación: centros de investigación, ayudas a proyectos y transferencia de tecnología.",
  "49": "Otras actuaciones económicas, como telecomunicaciones y sociedad de la información, consumo o defensa de la competencia.",
  "9": "El funcionamiento general de la comunidad: gobierno y parlamento, administración, hacienda, dinero para otras administraciones y deuda.",
  "91": "Presidencia y gobierno de la comunidad, parlamento autonómico y otros órganos de su Estatuto (de control de cuentas, consultivos o defensor del pueblo autonómico).",
  "92": "Administración general: función pública, patrimonio, informática, estadística, boletín oficial y otros servicios comunes.",
  "93": "Gestión de los impuestos de la comunidad, tesorería y control interno de las cuentas.",
  "94": "Dinero para ayuntamientos, comarcas y otras administraciones. La versión depurada no incluye lo que la comunidad solo hace llegar a las entidades locales.",
  "95": "Intereses de la deuda de la comunidad. La devolución de los préstamos no se cuenta en esta página.",
};

/** Criterio fijo de «Diferencias que destacan» (€ por habitante): una comunidad gasta al menos el doble y la diferencia es de 5 € o más. */
export const DESTACA = { veces: 2, minDif: 5 };

// ---------- ingresos, serie y deuda ----------
interface Economica { ingresos: number[]; gastos: number[] }
/** «Ingresos y Gastos por capítulos» (consolidado, sin depurar): derechos y obligaciones reconocidos, miles de euros. */
export const ECONOMICA = bruto.economica as Record<string, Record<string, Economica>>;
/** Lo mismo, versión depurada de IFL y PAC (sin el dinero que la comunidad solo reparte). */
export const ECONOMICA_DEP = (bruto.economica_dep ?? {}) as Record<string, Record<string, Economica>>;
/** Versión depurada si existe; si no, la normal. */
export const economicaComparable = (c: string, anio: number): Economica | undefined =>
  ECONOMICA_DEP[c]?.[String(anio)] ?? ECONOMICA[c]?.[String(anio)];
/** En qué capítulos de gasto está el dinero que solo se reparte (todo el presupuesto), miles de €: [cap4, cap7, resto]. */
export function depuracionPorCapitulo(c: string, anio: number): { cap4: number; cap7: number; total: number } | null {
  const n = ECONOMICA[c]?.[String(anio)]?.gastos, d = ECONOMICA_DEP[c]?.[String(anio)]?.gastos;
  if (!n || !d) return null;
  const dif = n.map((x, i) => x - d[i]);
  return { cap4: dif[3], cap7: dif[6], total: dif.reduce((s, x) => s + x, 0) };
}
/** «Serie Consolidados» desde 2002, miles de euros. */
export const SERIE = bruto.serie as Record<string, { ingresos: Record<string, number[]>; gastos: Record<string, number[]> }>;
/** Deuda según el PDE a 31 de diciembre (Banco de España), miles de euros. */
export const DEUDA = bruto.deuda as Record<string, Record<string, number>>;
const POB = bruto.poblacion as Record<string, Record<string, number>>;
export const ANIOS_SERIE: number[] = Object.keys(SERIE.MD?.gastos ?? {})
  .map(Number)
  .filter((a) => CCAA.every((c) => SERIE[c]?.gastos[String(a)] && POB[c]?.[String(a)]))
  .sort((a, b) => a - b);
/** € por habitante a partir de miles de euros, para cualquier año con población. */
export const porHab = (miles: number, c: Ccaa, anio: number) => (miles * 1000) / POB[c][String(anio)];

/**
 * Ejemplo típico de transferencias corrientes (capítulo 4) en algunas políticas, para el «?» de la ficha.
 * Solo donde es lo habitual; en el resto no se pone ejemplo. No son cifras: Hacienda no da el destinatario por política.
 */
export const TRANSF_EJEMPLO: Record<string, string> = {
  "14": "ayudas a proyectos de cooperación internacional",
  "21": "las propias pensiones y complementos que paga la comunidad",
  "23": "ayudas a personas y familias (como rentas mínimas o prestaciones de dependencia) y a entidades sociales",
  "24": "subvenciones para la contratación y la formación",
  "31": "las recetas de farmacia",
  "32": "los conciertos con colegios concertados y las becas",
  "33": "subvenciones a entidades culturales y deportivas",
  "41": "ayudas a agricultores, ganaderos y pescadores",
  "44": "aportaciones a consorcios y empresas de transporte para abaratar el billete",
  "46": "ayudas a centros de investigación y universidades",
  "94": "dinero para ayuntamientos y otras entidades locales",
};

// ---------- sistema de financiación (régimen común, 15 comunidades) ----------
export interface Financiacion {
  fg_aporta: number; fg_recibe: number; fg: number; fsg: number; competitividad: number; cooperacion: number;
  no_homogeneas: number; homogenea: number; homogenea_hab_ajustado: number; poblacion_ajustada: number;
}
/** Liquidación del sistema de financiación por comunidad y año (miles de euros; población ajustada en personas). */
export const FINANCIACION = bruto.financiacion as Record<string, Record<string, Financiacion>>;
export const NOTAS_SFA = bruto.notas_sfa as { policia_ct?: { anio: number; valor_2013: number } };
export const sfa = (c: string, anio: number): Financiacion | undefined => FINANCIACION[c]?.[String(anio)];
/** Saldo de la comunidad con el sistema: Fondo de Garantía + Suficiencia + Competitividad + Cooperación (miles de €). */
export const saldoSistema = (f: Financiacion) => f.fg + f.fsg + f.competitividad + f.cooperacion;
/** Financiación homogénea por habitante ajustado incluidos los fondos de convergencia (cálculo propio, €). */
export const homogeneaConFondos = (f: Financiacion) => ((f.homogenea + f.competitividad + f.cooperacion) * 1000) / f.poblacion_ajustada;

export const singularesDe = (a: Ccaa, b: Ccaa) => [...new Set([...(COMPETENCIAS_SINGULARES[a] ?? []), ...(COMPETENCIAS_SINGULARES[b] ?? [])])];
/** Años con gasto y liquidación del sistema para las dos comunidades. */
export const aniosComparables = (a: Ccaa, b: Ccaa) => ANIOS.filter((y) => sfa(a, y) && sfa(b, y));

// ---------- inflación (IPC general nacional, media anual; mismo criterio que sanidad-ccaa) ----------
export const IPC = ipcBruto.medias as Record<string, number>;
export const IPC_FUENTE = { texto: ipcBruto.fuente as string, url: ipcBruto.url as string };
/** Pasa un importe de euros de `desde` a euros de `hasta` con el IPC. */
export const aEurosDe = (v: number, desde: number, hasta: number) =>
  IPC[String(desde)] && IPC[String(hasta)] ? (v * IPC[String(hasta)]) / IPC[String(desde)] : v;
/** Gasto comparado por habitante de una partida (o "T" para el total), en euros de cada año o de `real`. */
export function habPartida(c: Ccaa, anio: number, id: string, real?: number): number {
  const miles = id === "T" ? resumen(c, anio).gasto : gastoMiles(c, anio, id);
  const v = (miles * 1000) / poblacion(c, anio);
  return real ? aEurosDe(v, anio, real) : v;
}

// ---------- variaciones inusuales (criterio fijo; la fuente no las explica) ----------
/**
 * Con solo dos comunidades no se puede comparar con «lo que hicieron las demás» como en sanidad-ccaa. Criterio:
 * cambio del gasto por habitante de una política respecto al año anterior, sin inflación, de al menos un 30 %
 * y de al menos 10 € por habitante (y gasto de partida ≥ MIN_HAB_PCT). Al añadir comunidades, pasar a la z robusta.
 */
export const INUSUAL = { pct: 30, eur: 10 };
export interface Inusual { ccaa: Ccaa; anio: number; politica: string; antes: number; despues: number; pct: number }
export const INUSUALES: Inusual[] = (() => {
  const ult = ANIOS[ANIOS.length - 1];
  const out: Inusual[] = [];
  for (const c of CCAA)
    for (let i = 1; i < ANIOS.length; i++)
      for (const p of POLITICAS) {
        const antes = habPartida(c, ANIOS[i - 1], p.id, ult), despues = habPartida(c, ANIOS[i], p.id, ult);
        if (antes < MIN_HAB_PCT) continue;
        const pct = (despues / antes - 1) * 100;
        if (Math.abs(pct) >= INUSUAL.pct && Math.abs(despues - antes) >= INUSUAL.eur) out.push({ ccaa: c, anio: ANIOS[i], politica: p.id, antes, despues, pct });
      }
  return out;
})();
/** Variaciones inusuales de una comunidad y política dentro de un periodo (años posteriores a y0, hasta y1). */
export const inusualesEn = (c: Ccaa, id: string, y0: number, y1: number) =>
  INUSUALES.filter((v) => v.ccaa === c && v.politica === id && v.anio > y0 && v.anio <= y1);
