"use client";

import { useEffect, useRef, useState } from "react";
import {
  ANIOS_SERIE, CCAA, COLOR_CCAA, DEUDA, ECONOMICA, FUENTE, NOMBRE, SERIE, aEurosDe, fmt, porHab,
  type Ccaa, type Unidad,
} from "@/lib/datos";

const COLOR = COLOR_CCAA;

interface Par { id: string; nombre: string; ayuda?: string; v: Record<Ccaa, number>; fuerte?: boolean }

/** Filas con una barra por comunidad; admite valores negativos (eje en el cero). */
function FilasPar({ filas, u, anio }: { filas: Par[]; u: Unidad; anio: number }) {
  const val = (miles: number, c: Ccaa) => (u === "mill" ? miles / 1000 : porHab(miles, c, anio));
  const todos = filas.flatMap((f) => CCAA.map((c) => val(f.v[c], c)));
  const min = Math.min(0, ...todos), max = Math.max(0, ...todos);
  const rango = max - min || 1;
  const cero = (-min / rango) * 100;
  const un: Unidad = u === "mill" ? "mill" : "hab";
  return (
    <div className="barras">
      {filas.map((f) => (
        <div key={f.id} className={`bf${f.fuerte ? " fuerte" : ""}`}>
          <div className="bf-et">
            <span>{f.nombre}</span>
            {f.ayuda && <small className="bf-ayuda">{f.ayuda}</small>}
          </div>
          <div className="bf-barras">
            {CCAA.map((c) => {
              const x = val(f.v[c], c);
              const ancho = (Math.abs(x) / rango) * 100;
              return (
                <div className="bf-pista signo" key={c} title={`${NOMBRE[c]}: ${fmt(x, un)}`}>
                  <div className="bf-zona">
                    {min < 0 && <span className="bf-cero" style={{ left: `${cero}%` }} />}
                    <span className="bf-barra abs" style={{ left: `${x >= 0 ? cero : cero - ancho}%`, width: `max(2px, ${ancho}%)`, background: COLOR[c], borderRadius: x >= 0 ? "0 4px 4px 0" : "4px 0 0 4px" }} />
                  </div>
                  <span className="bf-v num">{fmt(x, un)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const suma = (xs: number[], ...idx: number[]) => idx.reduce((s, i) => s + (xs[i] ?? 0), 0);
const porCcaa = (fn: (c: Ccaa) => number) => Object.fromEntries(CCAA.map((c) => [c, fn(c)])) as Record<Ccaa, number>;

// ---------- de dónde sale el dinero ----------
export function Ingresos({ anio, u }: { anio: number; u: Unidad }) {
  const e = (c: Ccaa) => ECONOMICA[c]?.[String(anio)];
  if (!CCAA.every(e)) return null;
  const ing = (c: Ccaa) => e(c)!.ingresos, gas = (c: Ccaa) => e(c)!.gastos;
  const filas: Par[] = [
    { id: "imp", nombre: "Impuestos", ayuda: "Directos e indirectos, propios o cedidos por el Estado (como el IRPF autonómico o la parte del IVA de la comunidad).", v: porCcaa((c) => suma(ing(c), 0, 1)) },
    { id: "tasas", nombre: "Tasas, precios públicos y otros", v: porCcaa((c) => ing(c)[2]) },
    { id: "transf", nombre: "Transferencias recibidas", ayuda: "Del Estado, de la Unión Europea y de otras administraciones (corrientes y de capital). Si es negativo, la comunidad aporta en conjunto más de lo que recibe por este concepto.", v: porCcaa((c) => suma(ing(c), 3, 6)) },
    { id: "patr", nombre: "Patrimonio y venta de bienes", v: porCcaa((c) => suma(ing(c), 4, 5)) },
  ];
  const ingNoFin = porCcaa((c) => suma(ing(c), 0, 1, 2, 3, 4, 5, 6));
  const gasNoFin = porCcaa((c) => suma(gas(c), 0, 1, 2, 3, 4, 5, 6));
  const totales: Par[] = [
    { id: "ingnf", nombre: "Ingresos (sin préstamos)", v: ingNoFin, fuerte: true },
    { id: "gasnf", nombre: "Gastos (sin préstamos)", ayuda: "Incluye el dinero que la comunidad solo reparte (IFL y PAC), que también está en los ingresos.", v: gasNoFin, fuerte: true },
    { id: "saldo", nombre: "Diferencia", ayuda: "Ingresos menos gastos, sin contar préstamos. Si es negativa, la comunidad gastó más de lo que ingresó ese año.", v: porCcaa((c) => ingNoFin[c] - gasNoFin[c]), fuerte: true },
  ];
  return (
    <section className="panel">
      <h2>¿De dónde sale el dinero?</h2>
      <p className="sub">{u === "mill" ? "Millones de €" : "€ por habitante"}, {anio}. Ingresos de cada comunidad (derechos reconocidos), sin contar los préstamos.</p>
      <div className="leyenda">{CCAA.map((c) => <span key={c}><i style={{ background: COLOR[c] }} />{NOMBRE[c]}</span>)}</div>
      <FilasPar filas={filas} u={u} anio={anio} />
      <h3 className="h3-panel">Ingresos y gastos del año</h3>
      <FilasPar filas={totales} u={u} anio={anio} />
      <details className="pliegue">
        <summary>Cómo se cuenta (2 puntos)</summary>
        <div className="pliegue-c">
          <ul>
            <li>Son los derechos reconocidos y las obligaciones reconocidas de la descarga «Ingresos y Gastos por capítulos» (datos consolidados). Ingresos: capítulos 1 a 7; los préstamos (capítulos 8 y 9) se ven en «Deuda».</li>
            <li>Aquí el gasto es el total, sin quitar el dinero que la comunidad solo reparte, porque ese dinero también entra como ingreso. Por eso no coincide con el gasto comparado del resto de la página.</li>
          </ul>
        </div>
      </details>
    </section>
  );
}

// ---------- deuda ----------
export function Deuda({ anio, u }: { anio: number; u: Unidad }) {
  const e = (c: Ccaa) => ECONOMICA[c]?.[String(anio)];
  if (!CCAA.every((c) => e(c) && DEUDA[c]?.[String(anio)])) return null;
  const filas: Par[] = [
    { id: "viva", nombre: `Deuda acumulada a 31 de diciembre`, ayuda: "Según el Banco de España (Protocolo de Déficit Excesivo).", v: porCcaa((c) => DEUDA[c][String(anio)]), fuerte: true },
    { id: "nueva", nombre: "Préstamos nuevos en el año", ayuda: "Capítulo 9 de ingresos (pasivos financieros).", v: porCcaa((c) => e(c)!.ingresos[8]) },
    { id: "devol", nombre: "Devolución de préstamos", ayuda: "Capítulo 9 de gastos.", v: porCcaa((c) => e(c)!.gastos[8]) },
    { id: "neto", nombre: "Deuda nueva neta del año", ayuda: "Préstamos nuevos menos devolución: lo que aumenta (o baja) la deuda por el presupuesto del año.", v: porCcaa((c) => e(c)!.ingresos[8] - e(c)!.gastos[8]) },
    { id: "int", nombre: "Intereses pagados", ayuda: "Capítulo 3 de gastos (gastos financieros).", v: porCcaa((c) => e(c)!.gastos[2]) },
  ];
  // Intereses frente a devolución, con la otra comunidad escalada a la misma población (para comparar en millones)
  const pob = (c: Ccaa) => porHab(1, c, anio) ? 1000 / porHab(1, c, anio) : 0; // habitantes
  const [C1, C2] = CCAA;
  const r = pob(C2) / pob(C1);
  const dInt = e(C2)!.gastos[2] - e(C1)!.gastos[2] * r, dDev = e(C2)!.gastos[8] - e(C1)!.gastos[8] * r;
  const m = (x: number) => `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions).format(Math.abs(x) / 1000)} M€ ${x < 0 ? "menos" : "más"}`;
  return (
    <section className="panel">
      <h2>Deuda</h2>
      <p className="sub">{u === "mill" ? "Millones de €" : "€ por habitante"}, {anio}.</p>
      <div className="leyenda">{CCAA.map((c) => <span key={c}><i style={{ background: COLOR[c] }} />{NOMBRE[c]}</span>)}</div>
      <FilasPar filas={filas} u={u} anio={anio} />
      <details className="pliegue">
        <summary>Intereses no es lo mismo que devolver la deuda</summary>
        <div className="pliegue-c">
          <p>
            Los <b>intereses</b> son el coste de la deuda. La <b>devolución</b> (amortización) es pagar el principal de los préstamos que vencen, y casi siempre
            se hace pidiendo préstamos nuevos: por eso no se cuenta como gasto en servicios. Si se suman las dos cosas, como hace la política «Deuda pública» del
            presupuesto, la diferencia entre comunidades cambia mucho.
          </p>
          <p>
            En {anio}, con {NOMBRE[C1]} escalada a la población de {NOMBRE[C2]}, {NOMBRE[C2]} paga <b>{m(dInt)}</b> en intereses y <b>{m(dDev)}</b> en devolución
            de préstamos que {NOMBRE[C1]}. En esta web se compara el gasto con los intereses y sin la devolución.
          </p>
        </div>
      </details>
      <p className="ayuda">Fuentes: <a href={FUENTE.deuda_url}>Banco de España, Boletín Estadístico, cuadro 13.9</a> (deuda) y liquidación de Hacienda (préstamos e intereses).</p>
    </section>
  );
}

// ---------- evolución desde 2002 ----------
const MEDIDAS: { id: string; nombre: string; ayuda: string; f: (c: Ccaa, a: number) => number | undefined }[] = [
  { id: "deuda", nombre: "Deuda acumulada", ayuda: "Deuda a 31 de diciembre según el Banco de España.", f: (c, a) => DEUDA[c]?.[String(a)] },
  { id: "intereses", nombre: "Intereses", ayuda: "Intereses de la deuda pagados en el año (capítulo 3 de gastos).", f: (c, a) => SERIE[c].gastos[String(a)]?.[2] },
  { id: "personal", nombre: "Sueldos del personal", ayuda: "Gastos de personal de toda la comunidad (capítulo 1), de todas las políticas.", f: (c, a) => SERIE[c].gastos[String(a)]?.[0] },
  { id: "compras", nombre: "Compras de bienes y servicios", ayuda: "Capítulo 2 de gastos, de todas las políticas.", f: (c, a) => SERIE[c].gastos[String(a)]?.[1] },
  { id: "inversiones", nombre: "Inversiones", ayuda: "Capítulo 6 de gastos (inversiones reales).", f: (c, a) => SERIE[c].gastos[String(a)]?.[5] },
  { id: "impuestos", nombre: "Impuestos", ayuda: "Capítulos 1 y 2 de ingresos: impuestos directos e indirectos, propios o cedidos.", f: (c, a) => { const x = SERIE[c].ingresos[String(a)]; return x ? x[0] + x[1] : undefined; } },
];

export function Evolucion({ anio }: { anio: number }) {
  const [medida, setMedida] = useState("deuda");
  const [marcado, setMarcado] = useState<number | null>(null);
  const [real, setReal] = useState(true);
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(720);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const m = MEDIDAS.find((x) => x.id === medida)!;
  const anios = ANIOS_SERIE;
  if (anios.length < 2) return null;
  const ultimoAnio = anios[anios.length - 1];
  const serie = (c: Ccaa) => anios.map((a) => { const v = m.f(c, a); if (v === undefined) return null; const h = porHab(v, c, a); return real ? aEurosDe(h, a, ultimoAnio) : h; });
  const s = Object.fromEntries(CCAA.map((c) => [c, serie(c)])) as Record<Ccaa, (number | null)[]>;
  const W = Math.max(300, ancho), H = W < 500 ? 220 : 260, L = 44, R = 66, T = 12, B = 26;
  const vals = [...s.MD, ...s.CT].filter((v): v is number => v !== null);
  const paso = (() => { const bruto = Math.max(...vals) / 4; const p = 10 ** Math.floor(Math.log10(bruto || 1)); return [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= bruto) ?? p * 10; })();
  const ymax = Math.ceil(Math.max(...vals) / paso) * paso || 1;
  const x = (i: number) => L + (i / (anios.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / ymax) * (H - T - B);
  const camino = (c: Ccaa) => s[c].map((v, i) => (v === null ? "" : `${i === 0 || s[c][i - 1] === null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join("");
  const iSel = anios.indexOf(anio);
  const iVer = marcado ?? (iSel >= 0 ? iSel : anios.length - 1);
  const nf = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);
  const ultimo = (c: Ccaa) => { for (let i = anios.length - 1; i >= 0; i--) if (s[c][i] !== null) return i; return -1; };
  // Etiquetas finales sin solaparse
  const [k1, k2] = CCAA;
  const yEt = Object.fromEntries(CCAA.map((c) => [c, y(s[c][ultimo(c)] ?? 0)])) as Record<Ccaa, number>;
  if (Math.abs(yEt[k1] - yEt[k2]) < 16) { const mid = (yEt[k1] + yEt[k2]) / 2; const arr = yEt[k1] < yEt[k2] ? -1 : 1; yEt[k1] = mid + arr * 8; yEt[k2] = mid - arr * 8; }
  return (
    <section className="panel">
      <h2>Evolución desde {anios[0]}</h2>
      <p className="sub">€ por habitante{real ? `, en euros de ${anios[anios.length - 1]} (descontada la inflación)` : " de cada año (sin descontar la inflación)"}.</p>
      <div className="seg sm" role="group" aria-label="Euros" style={{ marginTop: 10 }}>
        <button aria-pressed={real} onClick={() => setReal(true)}>Sin inflación</button>
        <button aria-pressed={!real} onClick={() => setReal(false)}>Euros de cada año</button>
      </div>
      <div className="seg sm medidas" role="group" aria-label="Qué ver">
        {MEDIDAS.map((x) => <button key={x.id} aria-pressed={x.id === medida} onClick={() => setMedida(x.id)}>{x.nombre}</button>)}
      </div>
      <p className="ayuda">{m.ayuda}</p>
      <div className="lectura" aria-live="polite">
        <b>{anios[iVer]}</b>
        {CCAA.map((c) => <span key={c}><i style={{ background: COLOR[c] }} />{NOMBRE[c]}: <b className="num">{s[c][iVer] === null ? "sin dato" : `${nf.format(s[c][iVer]!)} €`}</b></span>)}
        <span className="lectura-ayuda">Toca o pasa por el gráfico para ver otro año.</span>
      </div>
      <div className="chart" ref={caja}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.nombre}, € por habitante, ${anios[0]}-${anios[anios.length - 1]}`}>
          {Array.from({ length: Math.round(ymax / paso) + 1 }, (_, k) => k * paso).map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{nf.format(v)}</text>
            </g>
          ))}
          {anios.map((a, i) => ((W < 500 ? a % 6 === 2 : a % 4 === 2) || i === anios.length - 1) && (
            <text key={a} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{a}</text>
          ))}
          {iSel >= 0 && <line x1={x(iSel)} x2={x(iSel)} y1={T} y2={H - B} stroke="var(--grey-line)" strokeDasharray="3 3" />}
          <line x1={x(iVer)} x2={x(iVer)} y1={T} y2={H - B} stroke="var(--muted)" strokeWidth="1" />
          {CCAA.map((c) => s[c][iVer] === null ? null : <circle key={c} cx={x(iVer)} cy={y(s[c][iVer]!)} r="4.5" fill={COLOR[c]} stroke="var(--surface)" strokeWidth="2" />)}
          {CCAA.map((c) => <path key={c} d={camino(c)} fill="none" stroke={COLOR[c]} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />)}
          {CCAA.map((c) => { const i = ultimo(c); return i < 0 ? null : (
            <g key={c}>
              <circle cx={x(i)} cy={y(s[c][i]!)} r="4" fill={COLOR[c]} stroke="var(--surface)" strokeWidth="2" />
              <text x={x(i) + 8} y={yEt[c] + 4} fontSize="12" fontWeight="700" fill="var(--fg)">{nf.format(s[c][i]!)} €</text>
            </g>
          ); })}
          {anios.map((a, i) => (
            <rect key={a} x={x(i) - (W - L - R) / (anios.length - 1) / 2} y={T} width={(W - L - R) / (anios.length - 1)} height={H - T - B} fill="transparent"
              onMouseEnter={() => setMarcado(i)} onClick={() => setMarcado(i)} style={{ cursor: "pointer" }}>
              <title>{`${a}\n` + CCAA.map((c) => `${NOMBRE[c]}: ${s[c][i] === null ? "sin dato" : nf.format(s[c][i]!) + " €"}`).join("\n")}</title>
            </rect>
          ))}
        </svg>
      </div>
      <div className="leyenda">{CCAA.map((c) => <span key={c}><i style={{ background: COLOR[c] }} />{NOMBRE[c]}</span>)}<span>Línea discontinua: año elegido arriba</span></div>
      <details className="pliegue">
        <summary>Por qué estas medidas (3 puntos)</summary>
        <div className="pliegue-c">
          <ul>
            <li>La serie de Hacienda va por capítulos, no por políticas, y no resta el dinero que la comunidad solo reparte (IFL y PAC). Por eso no se muestra aquí el gasto total: en las comunidades que hacen de intermediarias incluiría ese dinero y no sería comparable con el resto de la página. Las medidas elegidas no lo incluyen.</li>
            <li>Empieza en 2002, el primer año en que las dos comunidades gestionan la sanidad pública (traspasos del antiguo INSALUD).</li>
            <li>«Sin inflación»: euros del último año con el IPC general nacional, media anual (INE). «Euros de cada año»: tal cual. Población a 1 de julio de cada año (INE).</li>
          </ul>
        </div>
      </details>
    </section>
  );
}
