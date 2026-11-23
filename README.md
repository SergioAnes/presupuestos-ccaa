# Presupuestos por comunidades

En qué gastan su presupuesto Madrid y Cataluña: gasto liquidado por políticas, por habitante, con los datos oficiales
del Ministerio de Hacienda (liquidación de presupuestos de las comunidades autónomas, datos consolidados) y la población del INE.

```
npm install
python scripts/extraer_liquidaciones.py   # necesita las descargas en datos-originales/
npm run dev
```

El contraste SEC, los intereses devengados (D.41), el saldo (B.9) y las diez divisiones COFOG proceden de los libros anuales de la IGAE para 2022–2024. Para actualizar `src/data/igae.json`, ejecuta `python scripts/extraer_igae.py` con openpyxl. El script admite copias de los libros en `datos-originales/igae/` y consulta la fuente oficial cuando falta la copia local. Los importes de la IGAE se conservan en millones de euros, con la edición de cada publicación.
