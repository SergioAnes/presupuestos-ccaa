"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ANIOS, AREAS, CCAA, COMPETENCIA_DISTINTA, ENTIDADES, FUENTE, NOMBRE, POLITICAS, UNIDAD_TXT,
  MIN_HAB_PCT, depuracion, enUnidad, fmt, fmtDif, fmtNum, fmtPct, gastoMiles, poblacion, resumen,
  type Ccaa, type Partida, type Unidad,
} from "@/lib/datos";

const URL_ESTATUT = "https://www.boe.es/buscar/act.php?id=BOE-A-2006-13087";
const COLOR: Record<Ccaa, string> = { MD: "var(--s1)", CT: "var(--s2)" };

// ---------- estado en la dirección (#?anio=2024&u=hab) ----------
function leerHash(): { anio: number; u: Unidad } {
  const p = new URLSearchParams((typeof location !== "undefined" ? location.hash : "").replace(/^#\??/, ""));
  const anio = Number(p.get("anio"));
  const u = p.get("u") as Unidad;
  return {
    anio: ANIOS.includes(anio) ? anio : ANIOS[ANIOS.length - 1],
    u: u === "pct" || u === "mill" ? u : "hab",
  };
}

function Seg<T extends string | number>({ etiqueta, valor, opciones, cambiar }: {
  etiqueta: string; valor: T; opciones: [T, string][]; cambiar: (v: T) => void;
}) {
  return (
    <div className="control">
      <span className="control-t">{etiqueta}</span>
      <div className="seg" role="group" aria-label={etiqueta}>
        {opciones.map(([v, t]) => (
          <button key={String(v)} aria-pressed={v === valor} onClick={() => cambiar(v)}>{t}</button>
        ))}
      </div>
    </div>
  );
}

function Marca({ id }: { id: string }) {
  if (!COMPETENCIA_DISTINTA.has(id)) return null;
  return <span className="marca" title="Las dos comunidades no tienen las mismas competencias: no es comparable">≠ competencias</span>;
}

function Leyenda() {
  return (
    <div className="leyenda">
      {CCAA.map((c) => <span key={c}><i style={{ background: COLOR[c] }} />{NOMBRE[c]}</span>)}
    </div>
  );
}

// ---------- tarjetas ----------
function Tarjetas({ anio, u }: { anio: number; u: Unidad }) {
  const r = { MD: resumen("MD", anio), CT: resumen("CT", anio) };
  const mill = u === "mill";
  const v = (c: Ccaa) => (mill ? r[c].gasto / 1000 : (r[c].gasto * 1000) / r[c].poblacion);
  const unidad: Unidad = mill ? "mill" : "hab";
  const hab = (c: Ccaa) => (r[c].gasto * 1000) / r[c].poblacion;
  const pct = (hab("CT") / hab("MD") - 1) * 100;
  const sin13 = (c: Ccaa) => ((r[c].gasto - gastoMiles(c, anio, "13")) * 1000) / r[c].poblacion;
  const pctSin13 = (sin13("CT") / sin13("MD") - 1) * 100;
  const masHab = (r.CT.poblacion / r.MD.poblacion - 1) * 100;
  return (
    <div className="kpis">
      {CCAA.map((c) => (
        <div className="kpi" key={c}>
          <span className="kpi-n"><i style={{ background: COLOR[c] }} />{NOMBRE[c]}</span>
          <span className="kpi-v num">{fmt(v(c), unidad)}</span>
          <span className="kpi-s">{mill ? `${fmtNum(hab(c))} € por habitante` : `${fmt(r[c].gasto / 1000, "mill")} en total`} · {fmtNum(r[c].poblacion)} habitantes</span>
        </div>
      ))}
      <div className="kpi">
        <span className="kpi-n">Diferencia{mill ? "" : " por habitante"}</span>
        <span className="kpi-v num">{fmtDif(v("CT") - v("MD"), unidad)}</span>
        <span className="kpi-s">
          {mill
            ? `Cataluña tiene un ${fmtNum(masHab)} % más de habitantes que Madrid`
            : `Cataluña ${v("CT") >= v("MD") ? "gasta más" : "gasta menos"} por habitante que Madrid`}
        </span>
      </div>
      <div className="kpi">
        <span className="kpi-n">Diferencia en % (por habitante)</span>
        <span className="kpi-v num">{fmtPct(pct)}</span>
        <span className="kpi-s">Sin seguridad y prisiones, que solo gestiona Cataluña: {fmtPct(pctSin13)}</span>
      </div>
    </div>
  );
}

// ---------- barras comparadas por área (desplegables por política) ----------
function Barras({ anio, u }: { anio: number; u: Unidad }) {
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const val = (c: Ccaa, id: string) => enUnidad(gastoMiles(c, anio, id), u, c, anio);
  const filas: { p: Partida; nivel: 0 | 1 }[] = [];
  for (const a of AREAS) {
    filas.push({ p: a, nivel: 0 });
    if (abiertas[a.id]) for (const p of POLITICAS.filter((x) => x.area === a.id)) filas.push({ p, nivel: 1 });
  }
  const max = Math.max(...filas.flatMap(({ p }) => CCAA.map((c) => val(c, p.id))));
  return (
    <div className="barras">
      {filas.map(({ p, nivel }) => {
        const titulo = `${p.oficial}\n` + CCAA.map((c) => `${NOMBRE[c]}: ${fmt(val(c, p.id), u)}`).join("\n");
        return (
          <div key={p.id} className={`bf n${nivel}`} title={titulo}>
            <div className="bf-et">
              {nivel === 0 ? (
                <button className="bf-abrir" aria-expanded={!!abiertas[p.id]} onClick={() => setAbiertas((s) => ({ ...s, [p.id]: !s[p.id] }))}>
                  <span className="chev" aria-hidden>{abiertas[p.id] ? "▾" : "▸"}</span>{p.nombre}
                </button>
              ) : (
                <span>{p.nombre} <Marca id={p.id} /></span>
              )}
            </div>
            <div className="bf-barras">
              {CCAA.map((c) => {
                const x = val(c, p.id);
                return (
                  <div className="bf-fila" key={c}>
                    <div className="bf-pista">
                      <div className="bf-barra" style={{ width: `calc((100% - 84px) * ${max > 0 ? Math.max(x, 0) / max : 0})`, background: COLOR[c] }} />
                      <span className="bf-v num">{fmt(x, u)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- puente: de Madrid a Cataluña, política a política ----------
function Puente({ anio, u }: { anio: number; u: Unidad }) {
  const un: Unidad = u === "mill" ? "mill" : "hab";
  const val = (c: Ccaa, id: string) => enUnidad(gastoMiles(c, anio, id), un, c, anio);
  const tot = (c: Ccaa) => enUnidad(resumen(c, anio).gasto, un, c, anio);
  const ratio = poblacion("CT", anio) / poblacion("MD", anio);
  const pasos: { id: string; nombre: string; d: number; nota?: string }[] = [];
  if (un === "mill") pasos.push({ id: "pob", nombre: "Por tener más habitantes", d: tot("MD") * (ratio - 1), nota: `Madrid × ${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 }).format(ratio)} (habitantes de Cataluña ÷ habitantes de Madrid)` });
  const difs = POLITICAS.map((p) => ({ id: p.id, nombre: p.nombre, d: val("CT", p.id) - (un === "mill" ? val("MD", p.id) * ratio : val("MD", p.id)) }));
  difs.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const N = 9;
  const top = difs.slice(0, N).sort((a, b) => b.d - a.d);
  const resto = difs.slice(N);
  pasos.push(...top);
  if (resto.length) pasos.push({ id: "resto", nombre: `Resto (${resto.length} políticas)`, d: resto.reduce((s, x) => s + x.d, 0), nota: resto.map((x) => `${x.nombre}: ${fmtDif(x.d, un)}`).join("\n") });

  let acc = tot("MD");
  const segs = pasos.map((p) => { const a = acc; acc += p.d; return { ...p, desde: Math.min(a, acc), hasta: Math.max(a, acc) }; });
  const max = Math.max(tot("MD"), tot("CT"), ...segs.map((s) => s.hasta));
  const pc = (x: number) => `${(x / max) * 100}%`;
  return (
    <div className="puente">
      <div className="pf extremo">
        <span className="pf-et">Madrid</span>
        <div className="pf-pista"><div className="pf-seg" style={{ left: 0, width: pc(tot("MD")), background: COLOR.MD }} /></div>
        <span className="pf-v num">{fmt(tot("MD"), un)}</span>
      </div>
      {segs.map((s) => (
        <div className="pf" key={s.id} title={s.nota ?? undefined}>
          <span className="pf-et">{s.nombre} <Marca id={s.id} /></span>
          <div className="pf-pista">
            <div className="pf-seg" style={{ left: pc(s.desde), width: `max(2px, ${pc(s.hasta - s.desde)})`, background: s.id === "pob" ? "var(--grey-line)" : s.d >= 0 ? COLOR.CT : COLOR.MD, opacity: s.id === "pob" ? 1 : 0.85 }} />
          </div>
          <span className="pf-v num">{fmtDif(s.d, un)}</span>
        </div>
      ))}
      <div className="pf extremo">
        <span className="pf-et">Cataluña</span>
        <div className="pf-pista"><div className="pf-seg" style={{ left: 0, width: pc(tot("CT")), background: COLOR.CT }} /></div>
        <span className="pf-v num">{fmt(tot("CT"), un)}</span>
      </div>
      <div className="leyenda">
        <span><i style={{ background: COLOR.CT, opacity: 0.85 }} />Cataluña gasta más</span>
        <span><i style={{ background: COLOR.MD, opacity: 0.85 }} />Madrid gasta más</span>
        {un === "mill" && <span><i style={{ background: "var(--grey-line)" }} />Efecto del tamaño</span>}
      </div>
    </div>
  );
}

// ---------- tabla ordenable ----------
type Col = "orden" | "MD" | "CT" | "dif" | "pct";
function Tabla({ anio, u }: { anio: number; u: Unidad }) {
  const [orden, setOrden] = useState<{ col: Col; desc: boolean }>({ col: "orden", desc: false });
  const val = (c: Ccaa, id: string) => enUnidad(gastoMiles(c, anio, id), u, c, anio);
  const fila = (p: Partida) => {
    const md = val("MD", p.id), ct = val("CT", p.id);
    const hmd = enUnidad(gastoMiles("MD", anio, p.id), "hab", "MD", anio), hct = enUnidad(gastoMiles("CT", anio, p.id), "hab", "CT", anio);
    return { p, md, ct, dif: ct - md, pct: hmd >= MIN_HAB_PCT ? (hct / hmd - 1) * 100 : NaN };
  };
  const pols = POLITICAS.map(fila);
  const clave: Record<Exclude<Col, "orden">, (f: ReturnType<typeof fila>) => number> = { MD: (f) => f.md, CT: (f) => f.ct, dif: (f) => f.dif, pct: (f) => (isNaN(f.pct) ? -Infinity : f.pct) };
  const ordenadas = orden.col === "orden" ? null : [...pols].sort((a, b) => (clave[orden.col as Exclude<Col, "orden">](a) - clave[orden.col as Exclude<Col, "orden">](b)) * (orden.desc ? -1 : 1));
  const th = (col: Col, txt: string) => (
    <th aria-sort={orden.col === col ? (orden.desc ? "descending" : "ascending") : "none"}>
      <button onClick={() => setOrden((o) => ({ col, desc: o.col === col ? !o.desc : col !== "orden" }))}>
        {txt}{orden.col === col ? (orden.desc ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );
  const celdas = (f: ReturnType<typeof fila>) => (
    <>
      <td className="num">{fmt(f.md, u)}</td>
      <td className="num">{fmt(f.ct, u)}</td>
      <td className="num">{fmtDif(f.dif, u)}</td>
      <td className="num">{isNaN(f.pct) ? "—" : fmtPct(f.pct)}</td>
    </>
  );
  const totales = { MD: resumen("MD", anio).gasto, CT: resumen("CT", anio).gasto };
  const ftot = fila({ id: "T", area: "", nombre: "Total", oficial: "Total" });
  const tMd = enUnidad(totales.MD, u, "MD", anio), tCt = enUnidad(totales.CT, u, "CT", anio);
  const hT = { MD: enUnidad(totales.MD, "hab", "MD", anio), CT: enUnidad(totales.CT, "hab", "CT", anio) };
  Object.assign(ftot, { md: tMd, ct: tCt, dif: tCt - tMd, pct: (hT.CT / hT.MD - 1) * 100 });
  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            {th("orden", "Política de gasto")}
            {th("MD", "Madrid")}
            {th("CT", "Cataluña")}
            {th("dif", "Diferencia")}
            {th("pct", "Dif. por hab.")}
          </tr>
        </thead>
        <tbody>
          {ordenadas
            ? ordenadas.map((f) => (
                <tr key={f.p.id}><td title={f.p.oficial}>{f.p.nombre} <Marca id={f.p.id} /></td>{celdas(f)}</tr>
              ))
            : AREAS.map((a) => (
                <Fragment key={a.id}>
                  <tr className="area"><td title={a.oficial}>{a.id}. {a.nombre}</td>{celdas(fila(a))}</tr>
                  {pols.filter((f) => f.p.area === a.id).map((f) => (
                    <tr key={f.p.id}><td title={f.p.oficial} className="sangria">{f.p.id}. {f.p.nombre} <Marca id={f.p.id} /></td>{celdas(f)}</tr>
                  ))}
                </Fragment>
              ))}
        </tbody>
        <tfoot>
          <tr className="area"><td>Total</td>{celdas(ftot)}</tr>
        </tfoot>
      </table>
      <p className="ayuda">Pulsa en una columna para ordenar. «Diferencia»: Cataluña menos Madrid. «Dif. por hab.»: cuánto más (o menos) gasta Cataluña por habitante, en %; «—» cuando Madrid gasta menos de {MIN_HAB_PCT} € por habitante y el porcentaje no dice nada.</p>
    </div>
  );
}

// ---------- lo que queda fuera ----------
function Fuera({ anio }: { anio: number }) {
  const r = { MD: resumen("MD", anio), CT: resumen("CT", anio) };
  const m = (x: number) => fmt(x / 1000, "mill");
  const filas: [string, (c: Ccaa) => number, string][] = [
    ["Gasto comparado en esta página", (c) => r[c].gasto, "Incluye los intereses de la deuda."],
    ["Devolución de préstamos", (c) => r[c].devolucion, "Capítulo 9 (pasivos financieros): amortización de deuda."],
    ["Préstamos concedidos y compra de participaciones", (c) => r[c].prestamos, "Capítulo 8 (activos financieros)."],
    ["Dinero que solo se reparte (IFL y PAC)", (c) => r[c].intermediacion, "Fondos que la comunidad pasa a las entidades locales o que reparte de la Política Agraria Común. Hacienda los resta en su versión «depurada»."],
  ];
  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead><tr><th>Millones de euros, {anio}</th><th>Madrid</th><th>Cataluña</th></tr></thead>
        <tbody>
          {filas.map(([t, fn, ayuda], i) => (
            <tr key={t} className={i === 0 ? "area" : ""}><td>{t}<small>{ayuda}</small></td><td className="num">{m(fn("MD"))}</td><td className="num">{m(fn("CT"))}</td></tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="area"><td>Total de obligaciones registradas (Hacienda)</td><td className="num">{m(r.MD.total)}</td><td className="num">{m(r.CT.total)}</td></tr>
        </tfoot>
      </table>
      <p className="ayuda">Intereses de la deuda en {anio} (dentro del gasto comparado): Madrid {m(r.MD.intereses)}, Cataluña {m(r.CT.intereses)}.</p>
    </div>
  );
}

// ---------- página ----------
export function App() {
  const [estado, setEstado] = useState<{ anio: number; u: Unidad }>({ anio: ANIOS[ANIOS.length - 1], u: "hab" });
  useEffect(() => {
    const leer = () => { if (!/^#metodo/.test(location.hash)) setEstado(leerHash()); };
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, []);
  const cambiar = (n: Partial<{ anio: number; u: Unidad }>) => {
    const e = { ...estado, ...n };
    setEstado(e);
    history.replaceState(null, "", `#?anio=${e.anio}&u=${e.u}`);
  };
  const { anio, u } = estado;
  const dep = useMemo(() => ({ ifl: depuracion("CT", anio, "94"), pac: depuracion("CT", anio, "41") }), [anio]);

  return (
    <>
      <header className="top wrap">
        <div className="brand">Presupuestos por comunidades<small>Gasto liquidado · datos oficiales de Hacienda</small></div>
        <nav className="nav"><a href="#">Datos</a><a href="#metodo">Cómo leer los datos</a></nav>
      </header>
      <main className="wrap">
        <section className="intro">
          <h1>Madrid y Cataluña: ¿en qué gastan su presupuesto?</h1>
          <p>Lo que cada comunidad gastó de verdad en {anio} (presupuesto liquidado), política a política, según el Ministerio de Hacienda.</p>
        </section>

        <div className="controles">
          <Seg etiqueta="Año" valor={anio} opciones={ANIOS.map((a) => [a, String(a)] as [number, string])} cambiar={(a) => cambiar({ anio: a })} />
          <Seg etiqueta="Ver en" valor={u} opciones={[["hab", "€ por habitante"], ["pct", "% de su gasto"], ["mill", "Millones de €"]]} cambiar={(x) => cambiar({ u: x })} />
        </div>

        <Tarjetas anio={anio} u={u} />
        <details className="pliegue">
          <summary>Qué cuenta este gasto (4 puntos)</summary>
          <div className="pliegue-c">
            <ul>
              <li>Es el gasto <b>consolidado</b>: la administración de la comunidad y sus organismos ({ENTIDADES.MD?.["2024"]?.length ?? "—"} en Madrid y {ENTIDADES.CT?.["2024"]?.length ?? "—"} en Cataluña en 2024, entre ellos los servicios de salud), sin contar dos veces lo que se pasan entre ellos.</li>
              <li>No incluye la <b>devolución de préstamos</b> ni los <b>préstamos concedidos</b>, que no son gasto en servicios. Los <b>intereses</b> de la deuda sí están incluidos.</li>
              <li>No incluye el dinero que la comunidad <b>solo reparte</b>: en Cataluña, {fmt(dep.ifl / 1000, "mill")} que pasan a las entidades locales y {fmt(dep.pac / 1000, "mill")} de ayudas agrarias europeas. En Madrid, Hacienda no resta nada.</li>
              <li>Por habitante: población a 1 de julio del INE. <a href="#metodo">Más detalle</a>.</li>
            </ul>
          </div>
        </details>

        <section className="panel">
          <h2>En qué gasta cada una</h2>
          <p className="sub">{UNIDAD_TXT[u]}, {anio}. Pulsa en un área para ver sus políticas.</p>
          <Leyenda />
          <Barras anio={anio} u={u} />
          <details className="pliegue">
            <summary>Competencias que no son iguales (1)</summary>
            <div className="pliegue-c">
              <p><b>Seguridad y prisiones.</b> Cataluña tiene policía propia y gestiona sus prisiones (<a href={URL_ESTATUT}>Estatuto de Autonomía, arts. 164 y 168</a>). En Madrid la policía y las prisiones dependen del Estado y su gasto no está en este presupuesto; lo que Madrid tiene en esta política son otros servicios. Por eso se marca como <span className="marca">≠ competencias</span>.</p>
            </div>
          </details>
        </section>

        <section className="panel">
          <h2>Dónde está la diferencia</h2>
          <p className="sub">
            {u === "mill"
              ? `Millones de €, ${anio}. Del gasto de Madrid al de Cataluña: primero, lo que supone que Cataluña tenga más habitantes; después, la diferencia de cada política con la misma población.`
              : `Euros por habitante, ${anio}. Del gasto de Madrid al de Cataluña, sumando la diferencia de cada política.`}
          </p>
          <Puente anio={anio} u={u} />
        </section>

        <section className="panel">
          <h2>Todas las partidas</h2>
          <p className="sub">{UNIDAD_TXT[u]}, {anio}.</p>
          <Tabla anio={anio} u={u} />
        </section>

        <section className="panel">
          <h2>Lo que no se compara</h2>
          <p className="sub">Cómo se pasa del gasto comparado al total que registra Hacienda.</p>
          <Fuera anio={anio} />
        </section>

        <Metodo />
      </main>
    </>
  );
}

function Metodo() {
  return (
    <section className="metodo" id="metodo">
      <h2>Cómo leer los datos</h2>
      <h3>De dónde salen</h3>
      <p>
        De la <a href={FUENTE.gasto_url}>liquidación de los presupuestos de las comunidades autónomas</a> que publica el Ministerio de Hacienda: datos
        consolidados y definitivos, descargas «Clasificación Funcional» y «Clasificación Funcional por capítulos». Son <b>obligaciones reconocidas</b>:
        lo que la comunidad se comprometió a pagar ese año, no lo que presupuestó. Importes en euros corrientes de cada año.
      </p>
      <h3>Qué se compara</h3>
      <ul>
        <li><b>Consolidado.</b> Suma la administración general y los organismos de cada comunidad, quitando lo que se transfieren entre ellos.</li>
        <li><b>Depurado de IFL y PAC.</b> Hacienda publica una versión que resta el dinero que la comunidad solo hace llegar a otros: lo que pasa a las entidades locales (intermediación financiera local, IFL) y las ayudas de la Política Agraria Común (PAC). Usamos esa versión.</li>
        <li><b>Sin operaciones financieras.</b> Quitamos los capítulos 8 (préstamos concedidos y participaciones) y 9 (devolución de préstamos). En la política «Deuda pública» quedan los intereses.</li>
        <li><b>Por habitante.</b> Dividimos entre la población a 1 de julio del año (INE, <a href={FUENTE.poblacion_url}>Estadística Continua de Población</a>).</li>
        <li><b>% de su gasto.</b> Lo que pesa cada política dentro del gasto comparado de esa comunidad.</li>
      </ul>
      <h3>Límites</h3>
      <ul>
        <li><b>No mide calidad ni eficiencia.</b> Dice cuánto se gasta y en qué, no si está bien gastado.</li>
        <li><b>Competencias distintas.</b> Cataluña tiene policía y prisiones propias; en Madrid son del Estado. Se marcan con <span className="marca">≠ competencias</span>.</li>
        <li><b>Diputaciones.</b> Madrid es una comunidad uniprovincial: su comunidad hace también de diputación. Cataluña tiene cuatro diputaciones con presupuesto propio que aquí no aparecen.</li>
        <li><b>Precios y salarios.</b> No se corrige por diferencias de precios entre comunidades.</li>
        <li><b>Clasificación.</b> Cada comunidad asigna sus programas a las políticas; Hacienda los homogeneiza, pero puede haber diferencias de criterio.</li>
      </ul>
      <h3>Ficheros</h3>
      <p>Las cifras salen sin retocar de los Excel descargados (miles de euros). La extracción comprueba que las políticas suman el total de cada área, que las áreas suman el total y que las dos descargas coinciden.</p>
    </section>
  );
}

export default App;
