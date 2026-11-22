"use client";

import { Fragment, useState } from "react";
import {
  ANIOS, AREAS, CCAA, COLOR_CCAA, INUSUAL, INUSUALES, IPC, IPC_FUENTE, MIN_HAB_PCT, NOMBRE, POLITICAS, habPartida, inusualesEn,
  type Ccaa, type Partida,
} from "@/lib/datos";
import { Icono } from "./Icono";

/** «Cómo ha cambiado»: variación del gasto por habitante de cada política entre dos años, en euros corrientes o constantes. */

const COLOR = COLOR_CCAA;
const nf = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);
const nf1 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const signo = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "");
const eur = (v: number) => `${nf.format(v)} €`;
const dEur = (v: number) => (Math.abs(v) < 0.05 ? "0 €" : `${signo(v)}${Math.abs(v) < 9.95 ? nf1.format(Math.abs(v)) : nf.format(Math.abs(v))} €`);
const dPct = (v: number) => (Math.abs(v) < 0.5 ? "0 %" : `${signo(v)}${nf.format(Math.abs(v))} %`);

type Orden = "partidas" | Ccaa;

export function Cambios({ abrir }: { abrir: (id: string) => void }) {
  const ult = ANIOS[ANIOS.length - 1];
  const periodos: [number, number][] = [];
  for (let i = 0; i < ANIOS.length; i++) for (let j = ANIOS.length - 1; j > i; j--) periodos.push([ANIOS[i], ANIOS[j]]);
  periodos.sort((a, b) => b[1] - b[0] - (a[1] - a[0]) || b[0] - a[0]);
  const [per, setPer] = useState<[number, number]>(periodos[0] ?? [ult, ult]);
  const [real, setReal] = useState(true);
  const [orden, setOrden] = useState<Orden>("partidas");
  if (ANIOS.length < 2) return null;
  const [y0, y1] = per;
  const ref = real ? ult : undefined;
  const v = (c: Ccaa, y: number, id: string) => habPartida(c, y, id, ref);
  const cambio = (c: Ccaa, id: string) => {
    const a = v(c, y0, id), b = v(c, y1, id);
    return { a, b, d: b - a, p: a >= MIN_HAB_PCT ? (b / a - 1) * 100 : NaN };
  };
  const filas: { p: Partida; nivel: 0 | 1 }[] = [];
  if (orden === "partidas") {
    for (const ar of AREAS) {
      filas.push({ p: ar, nivel: 0 });
      for (const p of POLITICAS.filter((x) => x.area === ar.id)) filas.push({ p, nivel: 1 });
    }
  } else {
    POLITICAS.map((p) => ({ p, d: cambio(orden, p.id).d })).sort((a, b) => b.d - a.d).forEach(({ p }) => filas.push({ p, nivel: 1 }));
  }
  const maxD = Math.max(...POLITICAS.flatMap((p) => CCAA.map((c) => Math.abs(cambio(c, p.id).d))), 1);
  const tot = Object.fromEntries(CCAA.map((c) => [c, cambio(c, "T")])) as Record<Ccaa, ReturnType<typeof cambio>>;
  const precios = (IPC[String(y1)] / IPC[String(y0)] - 1) * 100;

  const Celda = ({ c, id, fuerte }: { c: Ccaa; id: string; fuerte?: boolean }) => {
    const r = cambio(c, id);
    const inus = id === "T" ? [] : inusualesEn(c, id, y0, y1);
    const ancho = Math.min(50, (Math.abs(r.d) / maxD) * 50);
    return (
      <td className={`cb-c${fuerte ? " fuerte" : ""}`} title={`${NOMBRE[c]}: ${eur(r.a)} en ${y0} → ${eur(r.b)} en ${y1}`}>
        <div className="cb-celda">
          <span className="cb-pista">
            <span className="cb-eje" />
            <span className="cb-barra" style={{ left: r.d >= 0 ? "50%" : `${50 - ancho}%`, width: `max(2px, ${ancho}%)`, background: COLOR[c] }} />
          </span>
          <span className="cb-v num">
            {inus.length > 0 && <span className="cb-inus" title={`Variación inusual: ${inus.map((v) => `${v.anio} ${dPct(v.pct)}`).join(", ")}`}>!</span>}
            {dEur(r.d)} <small>{isNaN(r.p) ? "" : `(${dPct(r.p)})`}</small>
          </span>
        </div>
      </td>
    );
  };

  return (
    <section className="panel" id="cambios">
      <h2>Cómo ha cambiado</h2>
      <p className="sub">Variación del gasto por habitante de cada política entre dos años{real ? `, en euros de ${ult} (descontada la inflación)` : ", en euros de cada año"}.</p>
      <div className="cb-controles">
        <div className="seg sm" role="group" aria-label="Periodo">
          {periodos.map(([a, b]) => <button key={`${a}-${b}`} aria-pressed={a === y0 && b === y1} onClick={() => setPer([a, b])}>{a} → {b}</button>)}
        </div>
        <div className="seg sm" role="group" aria-label="Euros">
          <button aria-pressed={real} onClick={() => setReal(true)}>Sin inflación</button>
          <button aria-pressed={!real} onClick={() => setReal(false)}>Euros de cada año</button>
        </div>
      </div>
      <div className="cb-resumen">
        {CCAA.map((c) => (
          <p key={c}><i style={{ background: COLOR[c] }} /><b>{NOMBRE[c]}</b>: {eur(tot[c].a)} → {eur(tot[c].b)} por habitante, <b>{dEur(tot[c].d)} ({dPct(tot[c].p)})</b></p>
        ))}
        <p className="ayuda">
          {real
            ? `Las cifras de ${y0} están pasadas a euros de ${ult} con el IPC. `
            : `Entre ${y0} y ${y1} los precios subieron un ${nf1.format(precios)} %: un aumento menor que ese no es más gasto real. `}
          Pulsa en una política para ver su detalle.
        </p>
      </div>
      <div className="cb-orden">
        <span>Ordenar:</span>
        <div className="seg sm" role="group" aria-label="Ordenar">
          <button aria-pressed={orden === "partidas"} onClick={() => setOrden("partidas")}>Por áreas</button>
          {CCAA.map((c) => <button key={c} aria-pressed={orden === c} onClick={() => setOrden(c)}>Más sube en {NOMBRE[c]}</button>)}
        </div>
      </div>
      <div className="tabla-wrap">
        <table className="tabla cb">
          <thead>
            <tr><th>Política</th>{CCAA.map((c) => <th key={c}><i className="pq-p" style={{ background: COLOR[c] }} />{NOMBRE[c]}</th>)}</tr>
          </thead>
          <tbody>
            {filas.map(({ p, nivel }) => (
              <Fragment key={p.id + orden}>
                <tr className={nivel === 0 ? "area" : ""}>
                  <td className={nivel ? "sangria" : ""}>
                    <button className="enlace-p" onClick={() => abrir(p.id)}><Icono id={p.id} tam={16} /><span>{p.nombre}</span></button>
                  </td>
                  {CCAA.map((c) => <Celda key={c} c={c} id={p.id} fuerte={nivel === 0} />)}
                </tr>
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="area"><td>Total</td>{CCAA.map((c) => <Celda key={c} c={c} id="T" fuerte />)}</tr>
          </tfoot>
        </table>
      </div>
      {INUSUALES.length > 0 && (
        <details className="pliegue">
          <summary><span className="cb-inus">!</span> Variaciones inusuales ({INUSUALES.length})</summary>
          <div className="pliegue-c">
            <p>Cambios del gasto por habitante de una política respecto al año anterior, sin inflación, de al menos un {INUSUAL.pct} % y {INUSUAL.eur} € por habitante. Es un criterio fijo: la cifra es oficial, pero la fuente no explica el cambio y aquí tampoco se explica.</p>
            <ul>
              {INUSUALES.map((v) => (
                <li key={`${v.ccaa}-${v.anio}-${v.politica}`}>
                  <button className="enlace" onClick={() => abrir(v.politica)}>{POLITICAS.find((p) => p.id === v.politica)?.nombre}</button>, {NOMBRE[v.ccaa]}, {v.anio}: {eur(v.antes)} → {eur(v.despues)} por habitante ({dPct(v.pct)})
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      <details className="pliegue">
        <summary>Cómo leerlo (3 puntos)</summary>
        <div className="pliegue-c">
          <ul>
            <li><b>Sin inflación.</b> Pasamos el gasto de cada año a euros de {ult} con el IPC general nacional, media anual (<a href={IPC_FUENTE.url}>INE</a>), el mismo criterio que en Sanidad por comunidades. Así una subida refleja más gasto, no solo precios más altos.</li>
            <li><b>Por habitante.</b> Con la población de cada año: si la población crece, el mismo gasto da menos por habitante.</li>
            <li><b>Saltos grandes.</b> Pueden deberse a cambios en cómo se clasifica un gasto, a fondos extraordinarios o a pagos puntuales. La fuente no lo explica, así que aquí tampoco. El % no se muestra cuando el gasto de partida es menor de {MIN_HAB_PCT} € por habitante.</li>
          </ul>
        </div>
      </details>
    </section>
  );
}

/** Gráfico pequeño de la evolución de una partida en la ficha (euros de cada año). */
export function MiniEvolucion({ id }: { id: string }) {
  if (ANIOS.length < 2) return null;
  const s = Object.fromEntries(CCAA.map((c) => [c, ANIOS.map((y) => habPartida(c, y, id))])) as Record<Ccaa, number[]>;
  const W = 560, H = 130, L = 10, R = 74, T = 12, B = 22;
  const max = Math.max(...s.MD, ...s.CT) || 1;
  const x = (i: number) => L + (i / (ANIOS.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const n = ANIOS.length - 1;
  const [c1, c2] = CCAA;
  const yEt = Object.fromEntries(CCAA.map((c) => [c, y(s[c][n])])) as Record<Ccaa, number>;
  if (Math.abs(yEt[c1] - yEt[c2]) < 14) { const m = (yEt[c1] + yEt[c2]) / 2, arr = yEt[c1] <= yEt[c2] ? -1 : 1; yEt[c1] = m + arr * 7; yEt[c2] = m - arr * 7; }
  return (
    <div className="mini-evo">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolución ${ANIOS[0]}-${ANIOS[ANIOS.length - 1]}: ` + CCAA.map((c) => `${NOMBRE[c]} ${s[c].map((v) => eur(v)).join(", ")}`).join("; ")}>
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--line)" />
        {ANIOS.map((a, i) => <text key={a} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{a}</text>)}
        {CCAA.map((c) => (
          <g key={c}>
            <polyline points={s[c].map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={COLOR[c]} strokeWidth="2.2" strokeLinejoin="round" />
            {s[c].map((v, i) => {
              const inus = INUSUALES.some((x) => x.ccaa === c && x.politica === id && x.anio === ANIOS[i]);
              return (
                <g key={i}>
                  {inus && <circle cx={x(i)} cy={y(v)} r="8" fill="none" stroke="var(--note)" strokeWidth="2" />}
                  <circle cx={x(i)} cy={y(v)} r="3.5" fill={COLOR[c]} stroke="var(--surface)" strokeWidth="1.5"><title>{`${NOMBRE[c]} ${ANIOS[i]}: ${eur(v)}${inus ? " · variación inusual" : ""}`}</title></circle>
                </g>
              );
            })}
            <text x={x(n) + 8} y={yEt[c] + 4} fontSize="11.5" fontWeight="700" fill="var(--fg)">{eur(s[c][s[c].length - 1])}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
