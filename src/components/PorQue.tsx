"use client";

import {
  COLOR_CCAA, ECONOMICA, FUENTE, NOMBRE, NOTAS_SFA, POLITICAS, aniosComparables, depuracionDe, fmtNum, gastoMiles, homogeneaConFondos,
  poblacion, resumen, saldoSistema, sfa, singularesDe,
  type Ccaa,
} from "@/lib/datos";

/**
 * «¿Por qué A gasta más que B?»: genérico para cualquier pareja de comunidades de régimen común.
 * Solo hechos contables y cifras oficiales (o cálculos propios con ellas, dichos como tales). Sin explicar causas.
 */

const COLOR = COLOR_CCAA;
const nf = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions);
const e = (v: number) => `${nf.format(v)} €`;
const ed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${nf.format(Math.abs(v))} €`;
const pc = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${nf.format(Math.abs(v))} %`;
const mill = (miles: number) => `${miles < 0 ? "−" : ""}${nf.format(Math.abs(miles) / 1000)} M€`;

/** Gasto comparado de una comunidad, sin las políticas indicadas (miles de €). */
function gastoSin(c: Ccaa, anio: number, sin: string[]) {
  return resumen(c, anio).gasto - sin.reduce((s, p) => s + gastoMiles(c, anio, p), 0);
}

function diferencias(a: Ccaa, b: Ccaa, anio: number, sin: string[]) {
  const f = { a: sfa(a, anio)!, b: sfa(b, anio)! };
  const porHab = (c: Ccaa, m: number) => (m * 1000) / poblacion(c, anio);
  const porAj = (c: Ccaa, m: number, pa: number) => (m * 1000) / pa;
  const ga = resumen(a, anio).gasto, gb = resumen(b, anio).gasto;
  const fila = (va: number, vb: number) => ({ d: va - vb, p: (va / vb - 1) * 100 });
  return {
    hab: fila(porHab(a, ga), porHab(b, gb)),
    aj: fila(porAj(a, ga, f.a.poblacion_ajustada), porAj(b, gb, f.b.poblacion_ajustada)),
    ajSin: fila(porAj(a, gastoSin(a, anio, sin), f.a.poblacion_ajustada), porAj(b, gastoSin(b, anio, sin), f.b.poblacion_ajustada)),
    fin: fila(homogeneaConFondos(f.a), homogeneaConFondos(f.b)),
  };
}

export function PorQue({ a: c1, b: c2, anio }: { a: Ccaa; b: Ccaa; anio: number }) {
  const anios = aniosComparables(c1, c2);
  if (!anios.length) return null;
  const y = anios.includes(anio) ? anio : anios[anios.length - 1];
  const habDe = (c: Ccaa) => (resumen(c, y).gasto * 1000) / poblacion(c, y);
  // A es la que gasta más por habitante ese año
  const [A, B] = habDe(c1) >= habDe(c2) ? [c1, c2] : [c2, c1];
  const sin = singularesDe(A, B);
  const nombresSin = sin.map((id) => POLITICAS.find((p) => p.id === id)?.nombre.toLowerCase() ?? id).join(", ");
  const dif = diferencias(A, B, y, sin);
  const f = { [A]: sfa(A, y)!, [B]: sfa(B, y)! } as Record<Ccaa, NonNullable<ReturnType<typeof sfa>>>;
  const pob = (c: Ccaa) => poblacion(c, y);
  const hab = (c: Ccaa, miles: number) => (miles * 1000) / pob(c);

  // Ingresos del presupuesto (derechos reconocidos), € por habitante
  const ing = (c: Ccaa) => ECONOMICA[c]?.[String(y)]?.ingresos;
  const imp = (c: Ccaa) => hab(c, (ing(c)?.[0] ?? 0) + (ing(c)?.[1] ?? 0));
  const transf = (c: Ccaa) => hab(c, (ing(c)?.[3] ?? 0) + (ing(c)?.[6] ?? 0) - POLITICAS.reduce((s, p) => s + depuracionDe(c, y, p.id), 0));
  const saldo = (c: Ccaa) => hab(c, saldoSistema(f[c]));
  const masImp = imp(A) >= imp(B) ? A : B;
  const otraImp = masImp === A ? B : A;

  const casiIgual = Math.abs(dif.fin.p) < 1.5;
  const filasSistema: { k: string; n: string; v: (c: Ccaa) => number; fuerte?: boolean }[] = [
    { k: "fga", n: "Fondo de Garantía: aporta", v: (c) => -f[c].fg_aporta },
    { k: "fgr", n: "Fondo de Garantía: recibe", v: (c) => f[c].fg_recibe },
    { k: "fsg", n: "Fondo de Suficiencia", v: (c) => f[c].fsg },
    { k: "com", n: "Fondo de Competitividad", v: (c) => f[c].competitividad },
    { k: "coo", n: "Fondo de Cooperación", v: (c) => f[c].cooperacion },
    { k: "sal", n: "Saldo con el sistema", v: (c) => saldoSistema(f[c]), fuerte: true },
  ];
  const orden: Ccaa[] = [c1, c2]; // columnas siempre en el orden de la página
  const policia = NOTAS_SFA.policia_ct && (A === "CT" || B === "CT") ? NOTAS_SFA.policia_ct : null;

  return (
    <section className="panel porque" id="porque">
      <h2>¿Por qué {NOMBRE[A]} gasta más que {NOMBRE[B]}?</h2>
      <p className="sub">{y}. Liquidación de presupuestos y del sistema de financiación (Ministerio de Hacienda).</p>

      <div className="pq-resumen">
        <p>
          Por habitante, {NOMBRE[A]} gasta <b>{ed(dif.hab.d)} ({pc(dif.hab.p)})</b>. Teniendo en cuenta la edad y el reparto de la población
          (habitante ajustado) y sin {nombresSin || "las competencias que solo tiene una"}, la diferencia es <b>{ed(dif.ajSin.d)} ({pc(dif.ajSin.p)})</b>.
        </p>
        <p>
          {NOMBRE[masImp]} recauda <b>{e(Math.abs(imp(masImp) - imp(otraImp)))} más por habitante</b> en impuestos, pero el sistema de financiación
          le deja un saldo de <b>{ed(saldo(masImp))}</b> por habitante, frente a <b>{ed(saldo(otraImp))}</b> de {NOMBRE[otraImp]}.
        </p>
        <p>
          Con las mismas competencias, el sistema da {casiIgual ? <>prácticamente lo mismo a las dos (<b>{e(homogeneaConFondos(f[A]))}</b> y <b>{e(homogeneaConFondos(f[B]))}</b> por habitante ajustado)</> : <>a {NOMBRE[A]} <b>{ed(dif.fin.d)} ({pc(dif.fin.p)})</b> por habitante ajustado respecto a {NOMBRE[B]}</>}.
          {" "}La parte del gasto que no corresponde a más financiación del sistema se cubre con otros ingresos (impuestos propios por encima de lo que considera el
          sistema, tasas, otros fondos) o con déficit; con estos datos no se puede repartir con exactitud. Nada de esto dice si el gasto está justificado.
        </p>
      </div>

      <h3 className="h3-panel">La diferencia de gasto, con distintos ajustes</h3>
      <div className="tabla-wrap">
        <table className="tabla pq">
          <thead><tr><th>Lo que gasta {NOMBRE[A]} de más</th>{anios.map((x) => <th key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {([
              ["Por habitante", "hab"],
              ["Por habitante ajustado", "aj"],
              [`Por habitante ajustado y sin ${nombresSin || "competencias singulares"}`, "ajSin"],
            ] as const).map(([t, k]) => (
              <tr key={k}><td>{t}</td>{anios.map((x) => { const r = diferencias(A, B, x, sin)[k]; return <td key={x} className="num">{ed(r.d)} <small>({pc(r.p)})</small></td>; })}</tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="h3-panel">Ingresos: impuestos y transferencias</h3>
      <div className="tabla-wrap">
        <table className="tabla pq">
          <thead><tr><th>€ por habitante, {y}</th>{orden.map((c) => <th key={c}><i className="pq-p" style={{ background: COLOR[c] }} />{NOMBRE[c]}</th>)}</tr></thead>
          <tbody>
            <tr><td>Impuestos (directos e indirectos)</td>{orden.map((c) => <td key={c} className="num">{e(imp(c))}</td>)}</tr>
            <tr><td>Transferencias recibidas (sin el dinero que solo se reparte)</td>{orden.map((c) => <td key={c} className="num">{ed(transf(c))}</td>)}</tr>
          </tbody>
        </table>
      </div>

      <h3 className="h3-panel">Lo que hace el sistema de financiación</h3>
      <div className="tabla-wrap">
        <table className="tabla pq">
          <thead><tr><th>{y}</th>{orden.map((c) => <th key={c}><i className="pq-p" style={{ background: COLOR[c] }} />{NOMBRE[c]}</th>)}</tr></thead>
          <tbody>
            {filasSistema.filter((r) => r.k !== "coo" || f[A].cooperacion || f[B].cooperacion).map((r) => (
              <tr key={r.k} className={r.fuerte ? "area" : ""}>
                <td>{r.n}</td>
                {orden.map((c) => <td key={c} className="num">{mill(r.v(c))} <small>({ed(hab(c, r.v(c)))} por hab.)</small></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ayuda">
        Diferencia entre los saldos: {ed(saldo(A) - saldo(B))} por habitante. Diferencia de transferencias en los presupuestos: {ed(transf(A) - transf(B))} por habitante
        (no coinciden del todo porque el presupuesto de cada año registra pagos a cuenta y la liquidación de dos años antes).
      </p>
      <details className="pliegue">
        <summary>Qué es cada fondo ({policia ? 4 : 3} puntos)</summary>
        <div className="pliegue-c">
          <ul>
            <li><b>Fondo de Garantía.</b> Cada comunidad pone el 75 % de sus impuestos (calculados con las normas comunes, no con sus propios tipos) y el fondo se reparte según la población ajustada. Si aporta más de lo que recibe, el saldo es negativo.</li>
            <li><b>Fondo de Suficiencia.</b> Cuadra, para cada comunidad, lo que necesitaba en el año base del sistema, incluido el coste de las competencias que no tienen todas, con lo que aportan sus impuestos y el Fondo de Garantía. Puede ser negativo.</li>
            <li><b>Fondos de Competitividad y Cooperación.</b> Aportaciones adicionales del Estado con reglas propias: el de Competitividad va a las comunidades cuya financiación por habitante ajustado queda por debajo de la media o de su capacidad fiscal; el de Cooperación, a las de menor renta por habitante, baja densidad o poco crecimiento de población.</li>
            {policia && <li><b>Policía de Cataluña.</b> La propia liquidación de {policia.anio} recoge que la financiación de los Mossos d&apos;Esquadra va dentro del Fondo de Suficiencia de Cataluña: {mill(policia.valor_2013)} valorados en 2013.</li>}
          </ul>
        </div>
      </details>

      <h3 className="h3-panel">Con las mismas competencias</h3>
      <div className="tabla-wrap">
        <table className="tabla pq">
          <thead><tr><th>€ por habitante ajustado</th>{anios.map((x) => <th key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {orden.map((c) => (
              <tr key={c}><td><i className="pq-p" style={{ background: COLOR[c] }} />{NOMBRE[c]}: financiación homogénea</td>{anios.map((x) => <td key={x} className="num">{e(homogeneaConFondos(sfa(c, x)!))}</td>)}</tr>
            ))}
            {orden.map((c) => (
              <tr key={c + "nh"}><td>{NOMBRE[c]}: competencias que no tienen todas (valoración de Hacienda)</td>{anios.map((x) => <td key={x} className="num">{e((sfa(c, x)!.no_homogeneas * 1000) / sfa(c, x)!.poblacion_ajustada)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="pliegue">
        <summary>Cómo se calcula (4 puntos)</summary>
        <div className="pliegue-c">
          <ul>
            <li><b>Habitante ajustado.</b> Es la población que usa el sistema de financiación para repartir el Fondo de Garantía: pondera la población por edad (los mayores y los niños cuentan más), superficie, dispersión e insularidad (Ley 22/2009). La sacamos de los cuadros de la liquidación.</li>
            <li><b>Financiación homogénea.</b> Los recursos del sistema (impuestos con normas comunes, Fondo de Garantía y Fondo de Suficiencia) menos la valoración de las competencias que no tienen todas, según Hacienda. Le sumamos los fondos de Competitividad y Cooperación y dividimos entre la población ajustada: es un cálculo nuestro con cifras oficiales.</li>
            <li><b>Sin competencias singulares.</b> En el gasto quitamos las políticas en las que las dos comunidades no tienen las mismas competencias ({nombresSin || "ninguna"}). Es una aproximación: Hacienda valora esas competencias en la financiación, pero no dice cuánto se gasta en ellas.</li>
            <li><b>Fechas.</b> El sistema se liquida dos años después. El presupuesto de cada año recoge pagos a cuenta de ese año y la liquidación de dos años antes, así que la comparación con los ingresos del presupuesto es aproximada.</li>
          </ul>
          <p>Fuente: <a href={FUENTE.sfa_url}>{FUENTE.sfa}</a>. País Vasco y Navarra no están en este sistema (concierto y convenio económico).</p>
        </div>
      </details>
    </section>
  );
}
