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
    <p className="sub">{anio} · {UNIDAD_TXT[u]}. El presupuesto recoge obligaciones reconocidas. El SEC mide cuándo se genera el gasto e incluye todas las unidades de la administración regional según la contabilidad nacional.</p>
    <TablaCuentas filas={filas} anio={anio} u={u} />
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
    <p className="sub">{anio} · {UNIDAD_TXT[u]}. Las diez divisiones agrupan el gasto por su finalidad. Cada porcentaje usa el total de la misma edición funcional.</p>
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
