import { CCAA, NOMBRE, UNIDAD_TXT, fmt, fmtDif, resumen, type Ccaa, type Unidad } from "@/lib/datos";
import { cuentaRegional, divisiones, pesoFuncional, valorRegional, type Importe } from "@/lib/igae";

const [a, b] = CCAA;
type Fila = { nombre: string; importe: (c: Ccaa) => Importe };

function TablaCuentas({ filas, anio, u, total }: {
  filas: Fila[]; anio: number; u: Unidad; total?: (c: Ccaa) => Importe;
}) {
  return <div className="tabla-wrap"><table className="tabla">
    <thead><tr><th scope="col">Concepto</th>{CCAA.map(c => <th key={c} scope="col">{NOMBRE[c]}</th>)}
      <th scope="col">{NOMBRE[b]} − {NOMBRE[a]}</th></tr></thead>
    <tbody>{filas.map(({ nombre, importe }) => {
      const valor = (c: Ccaa) => valorRegional(importe(c), u, c, anio);
      const primero = valor(a), segundo = valor(b);
      return <tr key={nombre}><th scope="row">{nombre}</th>{CCAA.map(c => {
        const v = valor(c);
        const peso = total ? pesoFuncional(importe(c), total(c)) : null;
        return <td key={c} className="num">{v === null ? "No disponible" : fmt(v, u)}
          {peso !== null && <small className="bf-ayuda">{fmt(peso, "pct")} del total</small>}</td>;
      })}<td className="num">{primero === null || segundo === null ? "No disponible" : fmtDif(segundo - primero, u)}</td></tr>;
    })}</tbody>
  </table></div>;
}

function Fuente({ datos }: { datos: { url: string; fecha: string; estado: string } | undefined }) {
  return datos && <p className="ayuda"><a href={datos.url}>IGAE · libro oficial</a> · {datos.estado} · Actualizado el {datos.fecha.split("-").reverse().join("/")}.</p>;
}

export function Contraste({ anio, u }: { anio: number; u: Unidad }) {
  const datos = cuentaRegional(anio)?.operaciones;
  const filas: Fila[] = [
    { nombre: "Presupuesto liquidado y depurado", importe: c => resumen(c, anio).gasto / 1000 },
    { nombre: "Gasto no financiero SEC 2010", importe: c => datos?.territorios[c].gasto ?? null },
  ];
  return <section className="panel">
    <h2>Dos medidas del gasto autonómico</h2>
    <p><b>El presupuesto liquidado</b> muestra el gasto que la comunidad ha reconocido con cargo a su presupuesto. Para esta comparación se descuenta, entre otras partidas, el dinero que solo pasa por sus cuentas para llegar a ayuntamientos o agricultores.</p>
    <p><b>El Sistema Europeo de Cuentas (SEC 2010)</b> mide el gasto según el año en que se produce. También cuenta el gasto de entidades que las reglas europeas consideran parte de la administración regional, aunque tengan cuentas separadas del presupuesto.</p>
    <p><b>Por ejemplo,</b> imagina que un hospital recibe material en diciembre y la comunidad reconoce la factura con cargo al presupuesto del año siguiente. El SEC cuenta ese material en diciembre y la liquidación lo recoge en el año siguiente. La fecha del pago puede ser distinta de ambas.</p>
    <p className="sub">{anio} · {UNIDAD_TXT[u]}. Lee hacia abajo para comparar los dos métodos en una comunidad. Lee de izquierda a derecha para comparar las comunidades con el mismo método.</p>
    <TablaCuentas filas={filas} anio={anio} u={u} />
    <p className="ayuda">La distancia entre las dos filas recoge el efecto conjunto de estos y otros ajustes. Para saber cuánto explica cada uno en {anio} haría falta el desglose de esos ajustes por comunidad.</p>
    <Fuente datos={datos} />
  </section>;
}

export function Funciones({ anio, u }: { anio: number; u: Unidad }) {
  const datos = cuentaRegional(anio)?.cofog;
  const total = (c: Ccaa) => datos?.territorios[c].total ?? null;
  const filas: Fila[] = divisiones.map(([codigo, nombre]) => ({
    nombre: codigo + " · " + nombre, importe: c => datos?.territorios[c].divisiones[codigo] ?? null,
  }));
  return <section className="panel">
    <h2>Gasto por funciones COFOG</h2>
    <p className="sub">{anio} · {UNIDAD_TXT[u]}. COFOG reparte el gasto del SEC en diez grupos según para qué se usa, como salud o educación. Una política presupuestaria con un nombre parecido puede incluir gastos distintos. Cada porcentaje indica qué parte del total de esta tabla corresponde a esa función.</p>
    <TablaCuentas filas={[...filas, { nombre: "Total de las diez divisiones", importe: total }]} anio={anio} u={u} total={total} />
    <Fuente datos={datos} />
  </section>;
}

export function MagnitudesSEC({ anio, u }: { anio: number; u: Unidad }) {
  const datos = cuentaRegional(anio)?.operaciones;
  return <>
    <h3 className="h3-panel">Intereses y saldo en contabilidad nacional</h3>
    <TablaCuentas anio={anio} u={u} filas={[
      { nombre: "Intereses devengados a pagar (D.41)", importe: c => datos?.territorios[c].intereses ?? null },
      { nombre: "Capacidad (+) o necesidad (−) de financiación (B.9)", importe: c => datos?.territorios[c].saldo ?? null },
    ]} />
    <p className="ayuda">D.41 mide los intereses generados en el ejercicio. B.9 es la diferencia entre los recursos y los empleos no financieros del sector regional.</p>
    <Fuente datos={datos} />
  </>;
}
