# CLAUDE.md

Proyecto: web estática (Next.js + TypeScript) que compara el gasto liquidado de las comunidades autónomas.
Primera versión: Madrid y Cataluña, 2022 y 2024. Proyecto hermano de `sanidad-ccaa` (mismo estilo y mismas reglas).

## Estructura

- Una sola página (`src/components/App.tsx`, React): tarjetas, «De cada 100 € que gastan» (barras al 100 % por área),
  titulares automáticos (solo cifras, sin valorar), «En qué gasta cada una» (barras por área, desplegables por política),
  «Dónde está la diferencia» (puente de Madrid a Cataluña), tabla ordenable con descarga CSV, «Lo que no se compara» y
  «Cómo leer los datos» (`#metodo`). Al pulsar un área o política se abre su ficha (`<dialog>`) con el desglose por
  capítulos («En qué se va el dinero»; los capítulos no están depurados de IFL y PAC: se avisa).
  Estado en la dirección: `#?anio=2024&u=hab|pct|mill&ficha=31`.
- Iconos propios en `src/components/Icono.tsx`. Colores de áreas `--a1…--a9` (validados para daltonismo en ese orden).
- `public/og.png`: vista previa al compartir (captura 1200×630 de la cabecera); regenerarla si cambia mucho el diseño.
- `src/lib/datos.ts`: cálculos y nombres cortos de las políticas. Colores: Madrid `--s1`, Cataluña `--s2` (validados para daltonismo).

## Reglas de datos

- Nunca inventar cifras ni opinar: solo hechos y explicaciones de la fuente. Tono neutral (la idea nació de un debate político).
- `src/data/gasto.json` se genera con `python scripts/extraer_liquidaciones.py` a partir de las descargas de Hacienda
  (liquidación de presupuestos de las CCAA, **datos consolidados**) en `datos-originales/`: «Clasificación Funcional»
  (trae la columna depurada de IFL y PAC), «Clasificación Funcional por capítulos» y «Organismos y Entidades incluidos
  consolidación». Los ficheros se identifican por su contenido (año y comunidad), no por el nombre. No editar a mano.
- Población: INE, Estadística Continua de Población, tabla 56940, 1 de julio (`datos-originales/ine/`).
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
