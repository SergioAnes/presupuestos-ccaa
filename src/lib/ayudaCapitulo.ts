import { CAPITULOS, CCAA, NOMBRE, POLITICAS, capitulosMiles, type Partida } from "./datos";

// Ejemplos ilustrativos. La tabla de Hacienda solo desglosa cada política hasta el capítulo.
const ejemplos: Record<string, Partial<Record<number, string>>> = {
  "11": { 1: "el personal de apoyo de los juzgados", 2: "la limpieza de una sede judicial", 4: "la financiación de la asistencia jurídica gratuita", 6: "la reforma de un juzgado" },
  "13": { 1: "el personal autonómico de emergencias", 2: "el mantenimiento de vehículos de emergencias", 4: "una ayuda para el funcionamiento de una agrupación de protección civil", 6: "la compra de un vehículo de emergencias", 7: "una ayuda a un ayuntamiento para equipar su servicio de protección civil" },
  "14": { 1: "el personal de una oficina de asuntos europeos", 2: "el alquiler de una oficina en el exterior", 4: "una ayuda para un proyecto de cooperación internacional", 7: "una ayuda para construir un centro en un proyecto de cooperación" },
  "21": { 1: "el personal que tramita las prestaciones", 4: "un complemento de pensión a cargo de la comunidad" },
  "23": { 1: "el personal de una residencia de gestión pública", 2: "el servicio de comedor contratado para un centro de día", 4: "una prestación de dependencia", 6: "la construcción de una residencia pública", 7: "una ayuda a un ayuntamiento para equipar un centro de día" },
  "24": { 1: "el personal de orientación de una oficina de empleo", 2: "un curso de formación que contrata el servicio de empleo", 4: "una ayuda a una empresa por contratar a una persona desempleada", 6: "la reforma de una oficina de empleo", 7: "una ayuda para equipar un taller de formación" },
  "26": { 1: "el personal que tramita las ayudas de vivienda", 2: "el mantenimiento ordinario de viviendas públicas", 4: "una ayuda al alquiler", 6: "la construcción de vivienda pública por la comunidad", 7: "una ayuda a propietarios para rehabilitar un edificio" },
  "31": { 1: "el sueldo y las cotizaciones de una enfermera de un hospital público", 2: "el material de curas o la limpieza contratada de un hospital", 4: "la financiación pública de medicamentos dispensados con receta en farmacias", 6: "la compra de un equipo de resonancia para un hospital público", 7: "una aportación a otra entidad para renovar un centro sanitario" },
  "32": { 1: "el sueldo y las cotizaciones de una profesora de un instituto público", 2: "la electricidad, el papel o la limpieza contratada de un centro educativo", 4: "una beca de estudios o la financiación de la enseñanza en un centro concertado", 6: "la construcción de un instituto público o la compra de equipos para un aula de FP", 7: "una aportación a una universidad para que renueve un laboratorio" },
  "33": { 1: "el personal de una biblioteca pública", 2: "la vigilancia contratada de un museo", 4: "una ayuda a una asociación cultural para organizar un festival", 6: "la reforma de un museo de la comunidad", 7: "una ayuda a un ayuntamiento para rehabilitar un teatro" },
  "41": { 1: "el personal técnico de una oficina agraria", 2: "los análisis contratados para una campaña de sanidad animal", 4: "una ayuda para cubrir gastos de una explotación agraria", 6: "la compra de equipos para un laboratorio agrario público", 7: "una ayuda para modernizar maquinaria agrícola" },
  "42": { 1: "el personal de inspección industrial", 2: "un estudio técnico contratado sobre consumo energético", 4: "una ayuda para asesorar a empresas industriales", 6: "equipos de inspección que adquiere la comunidad", 7: "una ayuda a una fábrica para renovar maquinaria" },
  "43": { 1: "el personal de una oficina autonómica de turismo", 2: "una campaña de promoción turística contratada por la comunidad", 4: "una ayuda a una asociación de comerciantes para organizar una feria", 6: "el equipamiento de una oficina pública de turismo", 7: "una ayuda a un pequeño comercio para reformar su local" },
  "44": { 2: "un estudio contratado sobre líneas de transporte", 4: "una aportación a un consorcio para abaratar el precio del abono", 6: "la compra de equipamiento de transporte por la comunidad", 7: "una aportación a una entidad de transporte para renovar su flota" },
  "45": { 1: "el personal técnico que supervisa carreteras", 2: "la conservación ordinaria de una carretera", 4: "una aportación para que otra entidad mantenga una infraestructura", 6: "las obras de un puente que encarga la comunidad", 7: "una ayuda a un ayuntamiento para construir una infraestructura" },
  "46": { 1: "el personal investigador de un centro de la comunidad", 2: "los reactivos de un laboratorio público", 4: "una ayuda para los gastos de funcionamiento de un grupo de investigación", 6: "la compra de instrumental científico por un centro de la comunidad", 7: "una ayuda a una universidad para adquirir instrumental científico" },
  "49": { 1: "el personal de un servicio de consumo", 2: "análisis contratados para comprobar la calidad de productos", 4: "una ayuda a una asociación de consumidores", 6: "equipos que adquiere un servicio autonómico de inspección", 7: "una ayuda para que otra entidad instale infraestructura de telecomunicaciones" },
  "91": { 1: "el personal de apoyo del parlamento autonómico", 2: "la limpieza contratada de una sede institucional", 4: "una aportación para los gastos corrientes de una institución", 6: "la reforma de una sede institucional", 7: "una aportación a otra institución para equipar su sede" },
  "92": { 1: "el personal de los servicios administrativos comunes", 2: "el alquiler de una oficina administrativa", 4: "una aportación para que otra entidad preste servicios administrativos comunes", 6: "la compra de servidores para la administración", 7: "una ayuda para que otra administración modernice sus equipos" },
  "93": { 1: "el personal que gestiona los impuestos autonómicos", 2: "el mantenimiento de un programa de gestión tributaria", 4: "una aportación para los gastos de funcionamiento de un organismo tributario", 6: "equipos informáticos para una oficina tributaria" },
  "94": { 4: "una aportación a un ayuntamiento para sus gastos de funcionamiento", 7: "una aportación a un ayuntamiento para realizar una obra" },
  "95": { 3: "los intereses de un préstamo de la comunidad o los de un bono que ha emitido" },
};

export function ayudaCapitulo(p: Partida, cap: typeof CAPITULOS[number], anio: number): string {
  const ejemplo = ejemplos[p.id]?.[cap.n];
  if (ejemplo) return `${cap.explica} Por ejemplo, ${ejemplo}.`;
  if (p.id.length === 1) {
    const politicas = POLITICAS.filter(hija => hija.area === p.id);
    const detalle = CCAA.flatMap(c => {
      const importes = politicas.map(hija => ({ nombre: hija.nombre, valor: capitulosMiles(c, anio, hija.id)[cap.n - 1] }));
      const mayor = importes.sort((a, b) => b.valor - a.valor)[0];
      return mayor?.valor > 0 ? [`En ${NOMBRE[c]}, «${mayor.nombre}» fue la política de esta área con mayor importe en este capítulo en ${anio}.`] : [];
    });
    if (detalle.length) return `${cap.explica} ${detalle.join(" ")}`;
  }
  return `${cap.explica} La liquidación de ${anio} da el total de este capítulo en «${p.nombre}». Para identificar las operaciones concretas haría falta un desglose más detallado.`;
}
