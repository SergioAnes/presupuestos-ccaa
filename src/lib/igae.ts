import bruto from "@/data/igae.json";
import { poblacion, type Ccaa, type Unidad } from "./datos";

export type Importe = number | null;
type Fuente = { url: string; fecha: string; estado: string };
type Operaciones = Record<"gasto" | "recursos" | "intereses" | "saldo", Importe>;
type Funciones = { hoja: string; total: Importe; divisiones: Record<string, Importe> };
interface Ejercicio {
  operaciones: Fuente & { territorios: Record<Ccaa, Operaciones> };
  cofog: Fuente & { territorios: Record<Ccaa, Funciones> };
}

export const divisiones = Object.entries(bruto.divisiones).sort(([a], [b]) => a.localeCompare(b));
const ejercicios: Record<string, Ejercicio | undefined> = bruto.ejercicios;
export const cuentaRegional = (anio: number) => ejercicios[String(anio)];

export function valorRegional(millones: Importe, u: Unidad, ccaa: Ccaa, anio: number) {
  if (millones === null) return null;
  if (u === "mill") return millones;
  if (u !== "hab") throw new Error("El porcentaje requiere el total de la misma clasificación");
  return millones * 1_000_000 / poblacion(ccaa, anio);
}

export function pesoFuncional(importe: Importe, total: Importe) {
  return importe === null || total === null || total === 0 ? null : 100 * importe / total;
}
