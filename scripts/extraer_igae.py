"""Extrae las cuentas regionales SEC y COFOG para Madrid y Cataluña (M€).

Lee los XLSX de datos-originales/igae si existen. En otro caso consulta la IGAE.
"""
import json
from datetime import datetime
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

from openpyxl import load_workbook

RAIZ = Path(__file__).resolve().parents[1]
BASE = ("https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/"
        "ContabilidadNacional/Publicaciones/Documents/CCAA-A/")
REGIONES = {"MD": ("Comunidad de Madrid", "Madrid", "Tabla13a"),
            "CT": ("Cataluña", "Cataluña", "Tabla10a")}


def cargar(nombre):
    ruta = RAIZ / "datos-originales" / "igae" / nombre
    if ruta.is_file():
        contenido = ruta.read_bytes()
    else:
        with urlopen(BASE + nombre, timeout=30) as respuesta:
            contenido = respuesta.read()
    return load_workbook(BytesIO(contenido), data_only=True, read_only=True)


def exigir(condicion, mensaje):
    if not condicion:
        raise ValueError(mensaje)


def fecha(celda):
    return datetime.strptime(celda.strip(), "Fecha de actualización: %d/%m/%Y").date().isoformat()


def importe(celda):
    exigir(celda is None or type(celda) in (int, float), f"Importe inesperado: {celda!r}")
    return celda


def operaciones(anio):
    nombre = f"A_CCAA_Det_{anio}.xlsx"
    libro = cargar(nombre)
    filas = list(libro["Tabla1a"].values)
    exigir("S.1312" in filas[0][0] and filas[2][0].strip() == f"Año {anio}. Millones de euros", nombre)
    edicion = fecha(filas[3][0])
    exigir(filas[6][1].strip() == "RECURSOS NO FINANCIEROS"
           and filas[35][1].strip() == "EMPLEOS NO FINANCIEROS"
           and filas[42][0].strip() == "D.41" and filas[62][0].strip() == "B.9", nombre)
    territorios = {}
    for codigo, (region, _, _) in REGIONES.items():
        columna = filas[5].index(region)
        recursos, gasto, intereses, saldo = (importe(filas[i][columna]) for i in (6, 35, 42, 62))
        if None not in (recursos, gasto, saldo):
            exigir(abs(recursos - gasto - saldo) <= 1, f"B.9 incoherente: {region} {anio}")
        territorios[codigo] = dict(recursos=recursos, gasto=gasto, intereses=intereses, saldo=saldo)
    libro.close()
    return dict(url=BASE + nombre, fecha=edicion, estado="Definitivo", territorios=territorios)


def funcional(anio):
    nombre = f"COFOG_A_Detalle_CCAA_{anio}.xlsx"
    libro = cargar(nombre)
    territorios = {}
    for codigo, (_, region, hoja) in REGIONES.items():
        filas = list(libro[hoja].values)
        periodo = str(filas[6][0]).strip()
        exigir(periodo in (str(anio), f"{anio}(P)") and filas[0][0].strip() == region
               and filas[3][0].strip() == "Millones de euros" and filas[8][1].strip() == "GASTO TOTAL"
               and filas[6][12].strip() == "TOTAL", f"{nombre} {hoja}")
        fuente = (fecha(filas[4][0]), "Provisional" if "(P)" in periodo else "Definitivo")
        divisiones = {}
        for columna in range(2, 12):
            encabezado = filas[6][columna].strip()
            division, etiqueta = encabezado.split(".", 1)
            exigir(division == f"{columna - 1:02}", encabezado)
            divisiones[division] = etiqueta.strip()
        valores = {clave: importe(valor) for clave, valor in zip(divisiones, filas[8][2:12])}
        total = importe(filas[8][12])
        if total is not None and None not in valores.values():
            exigir(abs(sum(valores.values()) - total) <= 1, f"Total COFOG incoherente: {region} {anio}")
        if territorios:
            exigir(fuente == edicion and divisiones == etiquetas, f"Ediciones incompatibles: {nombre}")
        edicion, etiquetas = fuente, divisiones
        territorios[codigo] = dict(hoja=hoja, total=total, divisiones=valores)
    libro.close()
    return dict(url=BASE + nombre, fecha=edicion[0], estado=edicion[1], territorios=territorios), etiquetas


def main():
    datos = {}
    divisiones = {}
    for anio in (2022, 2023, 2024):
        cofog, etiquetas = funcional(anio)
        exigir(not divisiones or etiquetas == divisiones, "Cambio de clasificación COFOG")
        divisiones = etiquetas
        datos[str(anio)] = dict(operaciones=operaciones(anio), cofog=cofog)
    destino = RAIZ / "src/data/igae.json"
    contenido = dict(unidad="M€", perimetro="S.1312", divisiones=divisiones, ejercicios=datos)
    destino.write_text(json.dumps(contenido, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
