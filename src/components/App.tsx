"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  ANIOS, AREAS, CAPITULOS, CCAA, COMPETENCIA_DISTINTA, ENTIDADES, FUENTE, MIN_HAB_PCT, NOMBRE, POLITICAS, UNIDAD_TXT,
  capitulosMiles, csv, depuracionDe, enUnidad, fmt, fmtDif, fmtNum, fmtPct, gastoMiles, partida, poblacion, resumen,
  type Ccaa, type Partida, type Unidad,
} from "@/lib/datos";
import { Icono } from "./Icono";

const URL_ESTATUT = "https://www.boe.es/buscar/act.php?id=BOE-A-2006-13087";
const COLOR: Record<Ccaa, string> = { MD: "var(--s1)", CT: "var(--s2)" };
const COLOR_AREA: Record<string, string> = { "1": "var(--a1)", "2": "var(--a2)", "3": "var(--a3)", "4": "var(--a4)", "9": "var(--a9)" };

type Abrir = (id: string) => void;
interface Estado { anio: number; u: Unidad; ficha: string | null }

// ---------- estado en la dirección (#?anio=2024&u=hab&ficha=31) ----------
function leerHash(): Estado {
  const p = new URLSearchParams(location.hash.replace(/^#\??/, ""));
  const anio = Number(p.get("anio"));
  const u = p.get("u") as Unidad;
  const ficha = p.get("ficha");
  return {
    anio: ANIOS.includes(anio) ? anio : ANIOS[ANIOS.length - 1],
    u: u === "pct" || u === "mill" ? u : "hab",
    ficha: ficha && partida(ficha) ? ficha : null,
  };
}
function escribirHash(e: Estado) {
  history.replaceState(null, "", `#?anio=${e.anio}&u=${e.u}${e.ficha ? `&ficha=${e.ficha}` : ""}`);
}

const hab = (c: Ccaa, anio: number, id: string) => enUnidad(gastoMiles(c, anio, id), "hab", c, anio);

/** Redondea porcentajes para que sumen exactamente 100 (restos mayores). */
function cien(vals: number[]): number[] {
  const base = vals.map(Math.floor);
  let falta = 100 - base.reduce((s, x) => s + x, 0);
  const orden = vals.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of orden) { if (falta <= 0) break; base[i]++; falta--; }
  return base;
}

// ---------- piezas pequeñas ----------
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

function Nombre({ p, abrir }: { p: Partida; abrir: Abrir }) {
  return (
    <button className="enlace-p" onClick={() => abrir(p.id)} title={`${p.oficial}. Ver detalle`}>
      <Icono id={p.id} tam={16} /><span>{p.nombre}</span>
    </button>
  );
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
  const unidad: Unidad = mill ? "mill" : "hab";
  const porHab = (c: Ccaa) => (r[c].gasto * 1000) / r[c].poblacion;
  const v = (c: Ccaa) => (mill ? r[c].gasto / 1000 : porHab(c));
  const pct = (porHab("CT") / porHab("MD") - 1) * 100;
  const sin13 = (c: Ccaa) => ((r[c].gasto - gastoMiles(c, anio, "13")) * 1000) / r[c].poblacion;
  const pctSin13 = (sin13("CT") / sin13("MD") - 1) * 100;
  const masHab = (r.CT.poblacion / r.MD.poblacion - 1) * 100;
  return (
    <div className="kpis">
      {CCAA.map((c) => (
        <div className="kpi" key={c} style={{ borderTopColor: COLOR[c] }}>
          <span className="kpi-n"><i style={{ background: COLOR[c] }} />{NOMBRE[c]}</span>
          <span className="kpi-v num">{fmt(v(c), unidad)}</span>
          <span className="kpi-s">{mill ? `${fmtNum(porHab(c))} € por habitante` : `${fmt(r[c].gasto / 1000, "mill")} en total`} · {fmtNum(r[c].poblacion)} habitantes</span>
        </div>
      ))}
      <div className="kpi">
        <span className="kpi-n">Diferencia{mill ? "" : " por habitante"}</span>
        <span className="kpi-v num">{fmtDif(v("CT") - v("MD"), unidad)}</span>
        <span className="kpi-s">
          {mill ? `Cataluña tiene un ${fmtNum(masHab)} % más de habitantes que Madrid` : `Lo que gasta Cataluña por habitante menos lo que gasta Madrid`}
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

// ---------- de cada 100 € ----------
function DeCada100({ anio, abrir }: { anio: number; abrir: Abrir }) {
  const reparto = Object.fromEntries(CCAA.map((c) => [c, cien(AREAS.map((a) => enUnidad(gastoMiles(c, anio, a.id), "pct", c, anio)))])) as Record<Ccaa, number[]>;
  return (
    <section className="panel cien">
      <h2>De cada 100 € que gastan</h2>
      <p className="sub">Reparto del gasto de {anio} entre las cinco grandes áreas. Pulsa en una para ver el detalle.</p>
      <div className="cien-barras">
        {CCAA.map((c) => (
          <div className="cien-fila" key={c}>
            <span className="cien-et"><i style={{ background: COLOR[c] }} />{NOMBRE[c]}</span>
            <div className="cien-barra" role="img" aria-label={`${NOMBRE[c]}: ` + AREAS.map((a, i) => `${a.nombre} ${reparto[c][i]} €`).join(", ")}>
              {AREAS.map((a, i) => (
                <button key={a.id} className="cien-seg" style={{ flexGrow: reparto[c][i], background: COLOR_AREA[a.id] }} onClick={() => abrir(a.id)} title={`${a.nombre}: ${reparto[c][i]} € de cada 100`}>
                  {reparto[c][i] >= 7 && <span>{reparto[c][i]} €</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="cien-ley">
        <div className="cien-ley-cab"><span /><span>Madrid</span><span>Cataluña</span></div>
        {AREAS.map((a, i) => (
          <button key={a.id} className="cien-ley-f" onClick={() => abrir(a.id)}>
            <span className="cien-ley-n"><i style={{ background: COLOR_AREA[a.id] }} /><Icono id={a.id} tam={16} />{a.nombre}</span>
            <span className="num">{reparto.MD[i]} €</span>
            <span className="num">{reparto.CT[i]} €</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------- titulares ----------
function Titulares({ anio, abrir }: { anio: number; abrir: Abrir }) {
  const difs = POLITICAS.map((p) => ({ p, d: hab("CT", anio, p.id) - hab("MD", anio, p.id) }));
  const masCT = [...difs].sort((a, b) => b.d - a.d);
  const masMD = [...difs].sort((a, b) => a.d - b.d)[0];
  const primeraComparable = masCT.find((x) => !COMPETENCIA_DISTINTA.has(x.p.id))!;
  const mayor = (c: Ccaa) => [...POLITICAS].sort((a, b) => gastoMiles(c, anio, b.id) - gastoMiles(c, anio, a.id))[0];
  const pctDe = (c: Ccaa, id: string) => fmtNum(enUnidad(gastoMiles(c, anio, id), "pct", c, anio));
  const mMD = mayor("MD"), mCT = mayor("CT");
  const e = (x: number) => `${fmtNum(Math.abs(x))} €`;
  const Enl = ({ p }: { p: Partida }) => <button className="enlace" onClick={() => abrir(p.id)}>{p.nombre.toLowerCase()}</button>;
  return (
    <div className="titulares">
      <div className="insight">
        <span className="k">Partida más grande</span>
        {mMD.id === mCT.id ? (
          <p>En las dos es <Enl p={mMD} />: <strong>{pctDe("MD", mMD.id)} €</strong> de cada 100 en Madrid y <strong>{pctDe("CT", mCT.id)} €</strong> en Cataluña.</p>
        ) : (
          <p>En Madrid, <Enl p={mMD} /> ({pctDe("MD", mMD.id)} € de cada 100); en Cataluña, <Enl p={mCT} /> ({pctDe("CT", mCT.id)} €).</p>
        )}
      </div>
      <div className="insight">
        <span className="k">Mayor diferencia</span>
        <p>Cataluña gasta <strong>{e(masCT[0].d)} más por habitante</strong> en <Enl p={masCT[0].p} />{COMPETENCIA_DISTINTA.has(masCT[0].p.id) ? ", una competencia que Madrid no tiene" : ""}.</p>
      </div>
      {COMPETENCIA_DISTINTA.has(masCT[0].p.id) && (
        <div className="insight">
          <span className="k">Mayor diferencia comparable</span>
          <p>Cataluña gasta <strong>{e(primeraComparable.d)} más por habitante</strong> en <Enl p={primeraComparable.p} />.</p>
        </div>
      )}
      {masMD.d < 0 && (
        <div className="insight">
          <span className="k">Donde Madrid gasta más</span>
          <p>Madrid gasta <strong>{e(masMD.d)} más por habitante</strong> en <Enl p={masMD.p} />.</p>
        </div>
      )}
    </div>
  );
}

// ---------- barras comparadas por área (desplegables por política) ----------
function Barras({ anio, u, abrir }: { anio: number; u: Unidad; abrir: Abrir }) {
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
      {filas.map(({ p, nivel }) => (
        <div key={p.id} className={`bf n${nivel}`} title={`${p.oficial}\n` + CCAA.map((c) => `${NOMBRE[c]}: ${fmt(val(c, p.id), u)}`).join("\n")}>
          <div className="bf-et">
            {nivel === 0 ? (
              <button className="bf-abrir" aria-expanded={!!abiertas[p.id]} onClick={() => setAbiertas((s) => ({ ...s, [p.id]: !s[p.id] }))}>
                <span className="chev" aria-hidden>{abiertas[p.id] ? "▾" : "▸"}</span>
                <span className="punto" style={{ background: COLOR_AREA[p.id] }} />
                {p.nombre}
              </button>
            ) : (
              <span><Nombre p={p} abrir={abrir} /> <Marca id={p.id} /></span>
            )}
          </div>
          <div className="bf-barras">
            {CCAA.map((c) => {
              const x = val(c, p.id);
              return (
                <div className="bf-pista" key={c}>
                  <div className="bf-barra" style={{ width: `calc((100% - 84px) * ${max > 0 ? Math.max(x, 0) / max : 0})`, background: COLOR[c] }} />
                  <span className="bf-v num">{fmt(x, u)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- puente: de Madrid a Cataluña, política a política ----------
function Puente({ anio, u, abrir }: { anio: number; u: Unidad; abrir: Abrir }) {
  const un: Unidad = u === "mill" ? "mill" : "hab";
  const val = (c: Ccaa, id: string) => enUnidad(gastoMiles(c, anio, id), un, c, anio);
  const tot = (c: Ccaa) => enUnidad(resumen(c, anio).gasto, un, c, anio);
  const ratio = poblacion("CT", anio) / poblacion("MD", anio);
  const pasos: { id: string; p?: Partida; nombre: string; d: number; nota?: string }[] = [];
  if (un === "mill") pasos.push({ id: "pob", nombre: "Por tener más habitantes", d: tot("MD") * (ratio - 1), nota: `Madrid × ${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 }).format(ratio)} (habitantes de Cataluña ÷ habitantes de Madrid)` });
  const difs = POLITICAS.map((p) => ({ id: p.id, p, nombre: p.nombre, d: val("CT", p.id) - (un === "mill" ? val("MD", p.id) * ratio : val("MD", p.id)) }));
  difs.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const N = 9;
  const resto = difs.slice(N);
  pasos.push(...difs.slice(0, N).sort((a, b) => b.d - a.d));
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
          <span className="pf-et">{s.p ? <Nombre p={s.p} abrir={abrir} /> : s.nombre} <Marca id={s.id} /></span>
          <div className="pf-pista">
            <div className="pf-seg" style={{ left: pc(s.desde), width: `max(2px, ${pc(s.hasta - s.desde)})`, background: s.id === "pob" ? "var(--grey-line)" : s.d >= 0 ? COLOR.CT : COLOR.MD }} />
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
        <span><i style={{ background: COLOR.CT }} />Cataluña gasta más</span>
        <span><i style={{ background: COLOR.MD }} />Madrid gasta más</span>
        {un === "mill" && <span><i style={{ background: "var(--grey-line)" }} />Efecto del tamaño</span>}
      </div>
    </div>
  );
}

// ---------- tabla ordenable ----------
type Col = "orden" | "MD" | "CT" | "dif" | "pct";
interface FilaT { p: Partida; md: number; ct: number; dif: number; pct: number }
function Tabla({ anio, u, abrir }: { anio: number; u: Unidad; abrir: Abrir }) {
  const [orden, setOrden] = useState<{ col: Col; desc: boolean }>({ col: "orden", desc: false });
  const fila = (p: Partida): FilaT => {
    const md = enUnidad(gastoMiles("MD", anio, p.id), u, "MD", anio), ct = enUnidad(gastoMiles("CT", anio, p.id), u, "CT", anio);
    const hmd = hab("MD", anio, p.id), hct = hab("CT", anio, p.id);
    return { p, md, ct, dif: ct - md, pct: hmd >= MIN_HAB_PCT ? (hct / hmd - 1) * 100 : NaN };
  };
  const pols = POLITICAS.map(fila);
  const clave: Record<Exclude<Col, "orden">, (f: FilaT) => number> = { MD: (f) => f.md, CT: (f) => f.ct, dif: (f) => f.dif, pct: (f) => (isNaN(f.pct) ? -Infinity : f.pct) };
  const ordenadas = orden.col === "orden" ? null : [...pols].sort((a, b) => (clave[orden.col as Exclude<Col, "orden">](a) - clave[orden.col as Exclude<Col, "orden">](b)) * (orden.desc ? -1 : 1));
  const th = (col: Col, txt: string) => (
    <th aria-sort={orden.col === col ? (orden.desc ? "descending" : "ascending") : "none"}>
      <button onClick={() => setOrden((o) => ({ col, desc: o.col === col ? !o.desc : col !== "orden" }))}>
        {txt}{orden.col === col ? (orden.desc ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );
  const celdas = (f: FilaT) => (
    <>
      <td className="num">{fmt(f.md, u)}</td>
      <td className="num">{fmt(f.ct, u)}</td>
      <td className="num">{fmtDif(f.dif, u)}</td>
      <td className="num">{isNaN(f.pct) ? "—" : fmtPct(f.pct)}</td>
    </>
  );
  const r = { MD: resumen("MD", anio).gasto, CT: resumen("CT", anio).gasto };
  const tMd = enUnidad(r.MD, u, "MD", anio), tCt = enUnidad(r.CT, u, "CT", anio);
  const ftot: FilaT = { p: { id: "T", area: "", nombre: "Total", oficial: "Total" }, md: tMd, ct: tCt, dif: tCt - tMd, pct: (enUnidad(r.CT, "hab", "CT", anio) / enUnidad(r.MD, "hab", "MD", anio) - 1) * 100 };
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([csv(anio)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `gasto-madrid-cataluna-${anio}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>{th("orden", "Política de gasto")}{th("MD", "Madrid")}{th("CT", "Cataluña")}{th("dif", "Diferencia")}{th("pct", "Dif. por hab.")}</tr>
          </thead>
          <tbody>
            {ordenadas
              ? ordenadas.map((f) => <tr key={f.p.id}><td><Nombre p={f.p} abrir={abrir} /> <Marca id={f.p.id} /></td>{celdas(f)}</tr>)
              : AREAS.map((a) => (
                  <Fragment key={a.id}>
                    <tr className="area"><td><span className="punto" style={{ background: COLOR_AREA[a.id] }} /><Nombre p={a} abrir={abrir} /></td>{celdas(fila(a))}</tr>
                    {pols.filter((f) => f.p.area === a.id).map((f) => (
                      <tr key={f.p.id}><td className="sangria"><Nombre p={f.p} abrir={abrir} /> <Marca id={f.p.id} /></td>{celdas(f)}</tr>
                    ))}
                  </Fragment>
                ))}
          </tbody>
          <tfoot><tr className="area"><td>Total</td>{celdas(ftot)}</tr></tfoot>
        </table>
      </div>
      <p className="ayuda">
        Pulsa en una columna para ordenar y en una política para ver su detalle. «Diferencia»: Cataluña menos Madrid. «Dif. por hab.»: cuánto más (o menos)
        gasta Cataluña por habitante, en %; «—» cuando Madrid gasta menos de {MIN_HAB_PCT} € por habitante y el porcentaje no dice nada.
      </p>
      <div className="acciones"><button className="btn sm" onClick={descargar}>Descargar datos de {anio} (CSV)</button></div>
    </>
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
        <tfoot><tr className="area"><td>Total de obligaciones registradas (Hacienda)</td><td className="num">{m(r.MD.total)}</td><td className="num">{m(r.CT.total)}</td></tr></tfoot>
      </table>
      <p className="ayuda">Intereses de la deuda en {anio} (dentro del gasto comparado): Madrid {m(r.MD.intereses)}, Cataluña {m(r.CT.intereses)}.</p>
    </div>
  );
}

// ---------- ficha de una política o área ----------
function Ficha({ id, anio, abrir, cerrar }: { id: string; anio: number; abrir: Abrir; cerrar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, [id]);
  const p = partida(id)!;
  const caps = { MD: capitulosMiles("MD", anio, id), CT: capitulosMiles("CT", anio, id) };
  const capHab = (c: Ccaa, i: number) => (caps[c][i] * 1000) / poblacion(c, anio);
  const filasCap = CAPITULOS.filter((k) => CCAA.some((c) => Math.abs(caps[c][k.n - 1]) >= 1));
  const maxCap = Math.max(...filasCap.flatMap((k) => CCAA.map((c) => capHab(c, k.n - 1))));
  const sumaCaps = (c: Ccaa) => caps[c].slice(0, 7).reduce((s, x) => s + x, 0);
  const dep = { MD: depuracionDe("MD", anio, id), CT: depuracionDe("CT", anio, id) };
  const fuera = { MD: caps.MD[7] + caps.MD[8], CT: caps.CT[7] + caps.CT[8] };
  const hijas = id.length === 1 ? POLITICAS.filter((x) => x.area === id) : [];
  const madre = id.length === 2 ? partida(id[0]) : undefined;
  return (
    <dialog ref={ref} className="ficha" onClose={cerrar} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
      <div className="ficha-c">
        <div className="ficha-cab">
          <span className="ficha-ico" style={{ color: COLOR_AREA[id[0]] }}><Icono id={id} tam={28} /></span>
          <div>
            {madre && <button className="enlace ficha-madre" onClick={() => abrir(madre.id)}>{madre.nombre}</button>}
            <h2>{p.nombre} <Marca id={id} /></h2>
            <p className="sub">{p.oficial} · {anio}</p>
          </div>
          <button className="ficha-x" onClick={() => ref.current?.close()} aria-label="Cerrar">×</button>
        </div>

        <div className="ficha-kpis">
          {CCAA.map((c) => (
            <div key={c} className="ficha-kpi" style={{ borderTopColor: COLOR[c] }}>
              <span className="kpi-n"><i style={{ background: COLOR[c] }} />{NOMBRE[c]}</span>
              <span className="kpi-v num">{fmt(hab(c, anio, id), "hab")}<small> por habitante</small></span>
              <span className="kpi-s">{fmt(gastoMiles(c, anio, id) / 1000, "mill")} · {fmtNum(enUnidad(gastoMiles(c, anio, id), "pct", c, anio))} € de cada 100 que gasta</span>
            </div>
          ))}
        </div>

        {COMPETENCIA_DISTINTA.has(id) && (
          <p className="aviso">Cataluña tiene policía propia y gestiona sus prisiones (<a href={URL_ESTATUT}>Estatuto, arts. 164 y 168</a>). En Madrid dependen del Estado y no están en este presupuesto: no es comparable.</p>
        )}

        {hijas.length > 0 && (
          <>
            <h3>Políticas de esta área</h3>
            <div className="ficha-tabla">
              <div className="ft-cab"><span /><span>Madrid</span><span>Cataluña</span></div>
              {hijas.map((h) => (
                <button key={h.id} className="ft-f" onClick={() => abrir(h.id)}>
                  <span className="ft-n"><Icono id={h.id} tam={16} />{h.nombre} <Marca id={h.id} /></span>
                  <span className="num">{fmt(hab("MD", anio, h.id), "hab")}</span>
                  <span className="num">{fmt(hab("CT", anio, h.id), "hab")}</span>
                </button>
              ))}
            </div>
            <p className="ayuda">€ por habitante. Pulsa en una política para ver su detalle.</p>
          </>
        )}

        <h3>En qué se va el dinero</h3>
        <p className="sub">€ por habitante, según el tipo de gasto (capítulos del presupuesto).</p>
        <Leyenda />
        <div className="barras">
          {filasCap.map((k) => (
            <div className="bf" key={k.n} title={`${k.oficial}\n` + CCAA.map((c) => `${NOMBRE[c]}: ${fmt(caps[c][k.n - 1] / 1000, "mill")} (${fmtNum((caps[c][k.n - 1] / (sumaCaps(c) || 1)) * 100)} %)`).join("\n")}>
              <div className="bf-et"><span>{k.nombre}</span></div>
              <div className="bf-barras">
                {CCAA.map((c) => {
                  const x = capHab(c, k.n - 1);
                  return (
                    <div className="bf-pista" key={c}>
                      <div className="bf-barra" style={{ width: `calc((100% - 84px) * ${maxCap > 0 ? Math.max(x, 0) / maxCap : 0})`, background: COLOR[c] }} />
                      <span className="bf-v num">{fmt(x, "hab")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {(dep.MD > 0 || dep.CT > 0) && (
          <p className="ayuda">
            Este desglose incluye {CCAA.filter((c) => dep[c] > 0).map((c) => `${fmt(dep[c] / 1000, "mill")} de ${NOMBRE[c]}`).join(" y ")} que Hacienda resta en su versión
            depurada (dinero que solo se reparte: IFL y PAC). Hacienda no dice en qué capítulos está, así que aquí no se puede quitar.
          </p>
        )}
        {(fuera.MD > 0 || fuera.CT > 0) && (
          <p className="ayuda">
            No incluye operaciones financieras (préstamos concedidos y devolución de préstamos): {CCAA.map((c) => `${NOMBRE[c]} ${fmt(fuera[c] / 1000, "mill")}`).join(", ")}.
          </p>
        )}
      </div>
    </dialog>
  );
}

// ---------- página ----------
export function App() {
  const [estado, setEstado] = useState<Estado>({ anio: ANIOS[ANIOS.length - 1], u: "hab", ficha: null });
  useEffect(() => {
    const leer = () => { if (!/^#metodo/.test(location.hash)) setEstado(leerHash()); };
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, []);
  const cambiar = (n: Partial<Estado>) => {
    const e = { ...estado, ...n };
    setEstado(e);
    escribirHash(e);
  };
  const abrir: Abrir = (id) => cambiar({ ficha: id });
  const { anio, u } = estado;
  const depCT = { ifl: depuracionDe("CT", anio, "94"), pac: depuracionDe("CT", anio, "41") };

  return (
    <>
      <header className="top wrap">
        <div className="brand"><Icono id="grafico" tam={20} /> Presupuestos por comunidades<small>Gasto liquidado · datos oficiales de Hacienda</small></div>
        <nav className="nav"><a href="#">Datos</a><a href="#metodo">Cómo leer los datos</a></nav>
      </header>
      <main className="wrap">
        <section className="intro">
          <h1>Madrid y Cataluña: ¿en qué gastan su presupuesto?</h1>
          <p>Lo que cada comunidad gastó de verdad (presupuesto liquidado), política a política, con los datos del Ministerio de Hacienda.</p>
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
              <li>No incluye el dinero que la comunidad <b>solo reparte</b>: en Cataluña, {fmt(depCT.ifl / 1000, "mill")} que pasan a las entidades locales y {fmt(depCT.pac / 1000, "mill")} de ayudas agrarias europeas. En Madrid, Hacienda no resta nada.</li>
              <li>Por habitante: población a 1 de julio del INE. <a href="#metodo">Más detalle</a>.</li>
            </ul>
          </div>
        </details>

        <DeCada100 anio={anio} abrir={abrir} />
        <Titulares anio={anio} abrir={abrir} />

        <section className="panel">
          <h2>En qué gasta cada una</h2>
          <p className="sub">{UNIDAD_TXT[u]}, {anio}. Pulsa en un área para ver sus políticas, y en una política para ver su detalle.</p>
          <Leyenda />
          <Barras anio={anio} u={u} abrir={abrir} />
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
          <Puente anio={anio} u={u} abrir={abrir} />
        </section>

        <section className="panel">
          <h2>Todas las partidas</h2>
          <p className="sub">{UNIDAD_TXT[u]}, {anio}.</p>
          <Tabla anio={anio} u={u} abrir={abrir} />
        </section>

        <section className="panel">
          <h2>Lo que no se compara</h2>
          <p className="sub">Cómo se pasa del gasto comparado al total que registra Hacienda.</p>
          <Fuera anio={anio} />
        </section>

        <Metodo />
        <footer className="pie">
          Fuentes: <a href={FUENTE.gasto_url}>Ministerio de Hacienda, liquidación de presupuestos de las CCAA</a> · <a href={FUENTE.poblacion_url}>INE, Estadística Continua de Población</a>.
          Proyecto hermano de <a href="https://sanidad-ccaa.vercel.app/">Sanidad por comunidades</a>.
        </footer>
      </main>
      {estado.ficha && <Ficha key={estado.ficha} id={estado.ficha} anio={anio} abrir={abrir} cerrar={() => cambiar({ ficha: null })} />}
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
        <li><b>% de su gasto y «de cada 100 €».</b> Lo que pesa cada partida dentro del gasto comparado de esa comunidad. En «de cada 100 €» se redondea a euros enteros de forma que sumen 100.</li>
        <li><b>En qué se va el dinero.</b> El detalle de cada política reparte su gasto por capítulos del presupuesto (personal, compras, transferencias, inversiones…). Hacienda no publica ese reparto en la versión depurada: en agricultura y transferencias a otras administraciones de Cataluña incluye el dinero que solo se reparte, y se avisa.</li>
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
      <p>Las cifras salen sin retocar de los Excel descargados (miles de euros). La extracción comprueba que las políticas suman el total de cada área, que las áreas suman el total y que las dos descargas coinciden. Los datos de cada año se pueden descargar en CSV debajo de la tabla.</p>
    </section>
  );
}

export default App;
