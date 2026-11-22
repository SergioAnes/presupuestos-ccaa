# CLAUDE.md

Proyecto: web estática (Next.js + TypeScript) que compara el gasto liquidado de las comunidades autónomas.
Primera versión: Madrid y Cataluña, 2022, 2023 y 2024. Proyecto hermano de `sanidad-ccaa` (mismo estilo y mismas reglas).

## Estructura

- Cuatro pestañas por `#hash` (`#resumen`, `#gasto`, `#ingresos`, `#metodo`, con `?anio=…&u=…&ficha=…`), cada una con «Siguiente».
  Resumen: tarjetas, «De cada 100 €» (redondeo normal, puede no sumar 100), titulares y diferencias que destacan. En qué gastan:
  barras, puente y tabla. Ingresos y deuda. Cómo leer los datos + «Lo que no se compara». Contenido (`src/components/App.tsx`, React): tarjetas, «De cada 100 € que gastan» (barras al 100 % por área),
  titulares automáticos (solo cifras, sin valorar), «En qué gasta cada una» (barras por área, desplegables por política),
  «Dónde está la diferencia» (puente de Madrid a Cataluña), tabla ordenable con descarga CSV, «Lo que no se compara» y
  «Cómo leer los datos» (`#metodo`). Al pulsar un área o política se abre su ficha (`<dialog>`) con el desglose por
  capítulos («En qué se va el dinero»; los capítulos no están depurados de IFL y PAC: se avisa).
  Ficha: «?» junto a cada capítulo (texto en `CAPITULOS` de `datos.ts`) y fila gris con el dinero que solo se reparte (IFL y PAC).
- Después del puente: «¿De dónde sale el dinero?» (ingresos por capítulos, sin préstamos; gasto sin depurar porque IFL y PAC
  también son ingreso), «Deuda» (Banco de España + capítulos 9 y 3) y «Evolución desde 2002» (`src/components/Dinero.tsx`).
  La evolución solo usa medidas que no incluyen IFL ni PAC (deuda, intereses, personal, compras, inversiones, impuestos):
  la serie de Hacienda va por capítulos y sin depurar. Empieza en 2002 (traspasos del INSALUD). Euros corrientes.
- Selector de unidad: € por habitante o millones (el «% de su gasto» lo cubre «De cada 100 €»). Botón «Compartir».
- Iconos propios en `src/components/Icono.tsx`. Colores de áreas `--a1…--a9` (validados para daltonismo en ese orden).
- `public/og.png`: vista previa al compartir (captura 1200×630 de la cabecera); regenerarla si cambia mucho el diseño.
- `src/lib/datos.ts`: cálculos y nombres cortos de las políticas. Colores: Madrid `--s1`, Cataluña `--s2` (validados para daltonismo).

## Reglas de datos

- Nunca inventar cifras ni opinar: solo hechos y explicaciones de la fuente. Tono neutral (la idea nació de un debate político).
- `src/data/gasto.json` se genera con `python scripts/extraer_liquidaciones.py` a partir de las descargas de Hacienda
  (liquidación de presupuestos de las CCAA, **datos consolidados**) en `datos-originales/`: «Clasificación Funcional»
  (trae la columna depurada de IFL y PAC), «Clasificación Funcional por capítulos» y «Organismos y Entidades incluidos
  consolidación». Los ficheros se identifican por su contenido (año y comunidad), no por el nombre. No editar a mano.
- `extraer_liquidaciones.py` también lee «Ingresos y Gastos por capítulos» y «Serie Consolidados» (comprueba que cuadran
  con la clasificación funcional capítulo a capítulo) y la deuda del Banco de España (`datos-originales/bde/be1309.csv`,
  cuadro 13.9, miles de euros, saldo de diciembre).
- Población: INE, Estadística Continua de Población, 1 de julio (series ECP115490 y ECP115494 en `datos-originales/ine/`,
  comprobadas con la tabla 56940).
- Gasto comparado = obligaciones depuradas de IFL y PAC − capítulo 8 − capítulo 9 (la deuda queda en intereses).
  Gasto comparado + cap. 9 + cap. 8 + IFL/PAC = total de Hacienda (lo comprueban los tests).
- Política 13 (seguridad y prisiones): competencias distintas (Estatut arts. 164 y 168), se marca «≠ competencias».
  En Madrid las paga el Estado; no imputar estimaciones del gasto estatal (cuentas territorializadas: supuestos de reparto).
- Diputaciones: Madrid es uniprovincial; las cuatro catalanas no están en estas cifras. Se avisa en el método.
- La tabla del tuit que inspiró la web (28.142.468 / 47.156.287, 2022) no se reproduce con los datos publicados hoy.
- `datos-originales/` no se sube a git.

## Comandos

- `npm run dev`, `npm test` (desde `C:\Proyectos\presupuestos-ccaa` con C mayúscula), `npm run build` (exporta a `out/`).
- En PowerShell, `npm.cmd` / `npx.cmd`.
