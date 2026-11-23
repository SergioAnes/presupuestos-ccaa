"""Genera src/data/gasto.json a partir de las descargas de la liquidación de presupuestos de las CCAA
(Ministerio de Hacienda, SGCIEF, datos consolidados) guardadas en datos-originales/.

Cada fichero se identifica por su contenido (año y comunidad), no por el nombre:
  - «Clasificación Funcional» (DescargaFuncionalDC*.xlsx): obligaciones por política, totales y
    «una vez depuradas la IFL y PAC».
  - «Clasificación Funcional por capítulos» (DescargaFuncionalCapDC*.xlsx): obligaciones por política y capítulo.
  - «Organismos y Entidades incluidos consolidación» (DescargaOrganismosDC*.xlsx): perímetro.
  - «Ingresos y Gastos por capítulos» (DescargaEconomicaDC*.xlsx): derechos y obligaciones reconocidos por capítulo.
  - «Ingresos y Gastos por capítulos depurados IFL y PAC» (DescargaEconomicaDCD*.xlsx): lo mismo sin el dinero que la
    comunidad solo reparte (entidades locales y Política Agraria Común).
  - «Serie Consolidados» (DescargaSeriesDC*.xlsx): ingresos y gastos por capítulo, 1984-último año.
Sistema de financiación: cuadros de la liquidación de los recursos del sistema de financiación de las CCAA de régimen
común (datos-originales/liquidacion-sfa/cuadros-liquidacion-AAAA.xlsx), las 15 comunidades: Fondo de Garantía,
Fondo de Suficiencia Global, Fondos de Competitividad y Cooperación, competencias no homogéneas y financiación homogénea.
Población: INE, Estadística Continua de Población, 1 de julio (series ECP115490 y ECP115494 de la tabla 56940,
datos-originales/ine/). Deuda: Banco de España, Boletín Estadístico, cuadro 13.9 (deuda según el PDE por CCAA,
miles de euros), saldo a 31 de diciembre (datos-originales/bde/be1309.csv).

Importes en miles de euros, tal cual la fuente. Uso: python scripts/extraer_liquidaciones.py
"""
import datetime
import glob
import json
import os
import re
import sys

import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, "datos-originales")
DESTINO = os.path.join(RAIZ, "src", "data", "gasto.json")

ENTES = {"Comunidad Autónoma de Madrid": "MD", "Generalitat": "CT"}
NOMBRES_INE = {"MD": "Madrid, Comunidad de", "CT": "Cataluña"}
TOL = 0.011  # miles de euros: los ficheros traen dos decimales

errores = []


def comprobar(cond, msg):
    if not cond:
        errores.append(msg)


def filas(ruta):
    ws = openpyxl.load_workbook(ruta, data_only=True).active
    return [list(r) for r in ws.iter_rows(values_only=True)]


def texto(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def cabecera(fs):
    """Devuelve (año, ccaa) a partir de las primeras filas."""
    anio = ccaa = None
    for t in [texto(f[0]) for f in fs[:25] if texto(f[0])][:6]:
        m = re.search(r"Ejercicio (\d{4})", t)
        if m:
            anio = int(m.group(1))
        t2 = re.sub(r"\s*\(miles de euros\)", "", t).rstrip(".").strip()
        if t2 in ENTES:
            ccaa = ENTES[t2]
    if anio is None or ccaa is None:
        sys.exit(f"No se reconoce año o comunidad en la cabecera: {[texto(f[0]) for f in fs[:25] if texto(f[0])][:6]}")
    return anio, ccaa


def num(v):
    return float(v) if isinstance(v, (int, float)) else 0.0


def partidas(fs):
    """Filas de áreas ('1. …'), políticas ('11. …') y total. Devuelve lista (codigo, nombre, valores)."""
    out = []
    for f in fs:
        t = texto(f[0])
        m = re.match(r"^(\d{1,2})\. (.+)$", t)
        if m:
            out.append((m.group(1), m.group(2), f[1:]))
        elif t == "Total Gastos":
            out.append(("T", "Total Gastos", f[1:]))
    return out


CAP = re.compile(r"^(\d)\s?\.\s")


def por_capitulos(fs, col):
    """Ingresos y gastos por capítulo (1-9) de una descarga «por capítulos»: col = índice de la columna de valores."""
    ing, gas, seccion = [0.0] * 9, [0.0] * 9, None
    totales = {}
    for f in fs:
        t = texto(f[0])
        if t.lower().startswith(("capítulos de ingresos", "derechos reconocidos netos")):
            seccion = "ing"
        elif t.lower().startswith(("capítulos de gastos", "obligaciones reconocidas")):
            seccion = "gas"
        m = CAP.match(t)
        if m and seccion:
            (ing if seccion == "ing" else gas)[int(m.group(1)) - 1] = num(f[col])
        elif t.startswith("Total") and seccion:
            totales[seccion] = num(f[col])
    return ing, gas, totales


funcional = {}  # (ccaa, anio) -> {codigo: (total, depurado)}
economica = {}  # (ccaa, anio) -> {"ingresos": [9], "gastos": [9]}
economica_dep = {}  # lo mismo, versión depurada de IFL y PAC
serie = {}  # ccaa -> {"ingresos": {anio: [9]}, "gastos": {anio: [9]}}
capitulos = {}  # (ccaa, anio) -> {codigo: [c1..c9, total]}
entidades = {}  # ccaa -> {anio: [nombres]}
nombres = {}  # codigo -> nombre
ficheros = {}  # (tipo, ccaa, anio) -> nombre de fichero

for ruta in sorted(glob.glob(os.path.join(ORIGEN, "*.xlsx"))):
    fs = filas(ruta)
    textos = [texto(f[0]) for f in fs[:25] if texto(f[0])]
    titulo = textos[1] if len(textos) > 1 else ""
    base = os.path.basename(ruta)
    if titulo.startswith("Organismos Autónomos y Entidades incluidos en la consolidación"):
        anio, ccaa = cabecera(fs)
        lista = []
        empezar = False
        for f in fs:
            t = texto(f[0])
            if t.startswith("RELACIÓN DE ORGANISMOS"):
                empezar = True
                continue
            if empezar and t and t not in ("Madrid", "Cataluña"):
                lista.append(t)
        entidades.setdefault(ccaa, {})[anio] = lista
        ficheros[("entidades", ccaa, anio)] = base
        continue
    if titulo.startswith("Ingresos y Gastos por capítulos. Datos consolidados"):
        if any("Serie de Liquidaciones" in t for t in textos):
            ccaa = None
            for t in textos[:6]:
                t2 = re.sub(r"\s*\(miles de euros\)", "", t).rstrip(".").strip()
                ccaa = ENTES.get(t2, ccaa)
            if not ccaa:
                sys.exit(f"Comunidad no reconocida en {base}")
            d = {"ingresos": {}, "gastos": {}}
            for f in fs:
                t = texto(f[0])
                if t.startswith(("Derechos Reconocidos Netos", "Obligaciones Reconocidas")):
                    clave = "ingresos" if t.startswith("Derechos") else "gastos"
                    cols = [(i, int(v)) for i, v in enumerate(f) if isinstance(v, (int, float)) and 1980 < v < 2100]
                    continue
                m = CAP.match(t)
                if m:
                    for i, a in cols:
                        d[clave].setdefault(a, [0.0] * 9)[int(m.group(1)) - 1] = num(f[i])
                elif t.startswith("Total"):
                    for i, a in cols:
                        comprobar(abs(sum(d[clave][a]) - num(f[i])) < TOL * 9, f"{base} {a}: la suma de capítulos no da el total")
            serie[ccaa] = d
            ficheros[("serie", ccaa, max(d["gastos"]))] = base
        else:
            anio, ccaa = cabecera(fs)
            ing, gas, tot = por_capitulos(fs, 3)  # derechos reconocidos netos / obligaciones reconocidas
            comprobar(abs(sum(ing) - tot.get("ing", 0)) < TOL * 9, f"{base}: suma de ingresos ≠ total")
            comprobar(abs(sum(gas) - tot.get("gas", 0)) < TOL * 9, f"{base}: suma de gastos ≠ total")
            nuevo = {"ingresos": ing, "gastos": gas}
            destino, tipo = (economica_dep, "economica_dep") if "depurad" in titulo.lower() else (economica, "economica")
            comprobar(destino.get((ccaa, anio), nuevo) == nuevo, f"{base}: otra descarga de {ccaa} {anio} trae cifras distintas")
            destino[(ccaa, anio)] = nuevo
            ficheros[(tipo, ccaa, anio)] = base
        continue
    if not titulo.lower().startswith("áreas y políticas de gasto. datos consolidados"):
        print(f"  (se ignora {base}: {titulo})")
        continue
    anio, ccaa = cabecera(fs)
    cab = [texto(c) for c in next(f for f in fs if texto(f[0]).startswith("Áreas y Políticas de gasto") and sum(c is not None for c in f) > 2) if c is not None]
    ps = partidas(fs)
    if any("Gastos de personal" in c for c in cab):
        # 9 capítulos (5 = fondo de contingencia) + total
        d = {}
        for cod, nom, v in ps:
            vals = [num(x) for x in v[:10]]
            d[cod] = vals
            nombres.setdefault(cod, nom)
            comprobar(abs(sum(vals[:9]) - vals[9]) < TOL * 9, f"{base} {cod}: la suma de capítulos no da el total")
        comprobar(capitulos.get((ccaa, anio), d) == d, f"{base}: otra descarga de {ccaa} {anio} trae cifras distintas")
        capitulos[(ccaa, anio)] = d
        ficheros[("capitulos", ccaa, anio)] = base
    elif any("depuradas" in c for c in cab):
        d = {}
        for cod, nom, v in ps:
            d[cod] = (num(v[0]), num(v[2]))
            nombres.setdefault(cod, nom)
        comprobar(funcional.get((ccaa, anio), d) == d, f"{base}: otra descarga de {ccaa} {anio} trae cifras distintas")
        funcional[(ccaa, anio)] = d
        ficheros[("funcional", ccaa, anio)] = base
    else:
        sys.exit(f"Cabecera no reconocida en {base}: {cab}")

claves = sorted(set(funcional) | set(capitulos))
if not claves:
    sys.exit("No hay ficheros de clasificación funcional en datos-originales/")
for k in claves:
    comprobar(k in funcional, f"Falta la «Clasificación Funcional» de {k}")
    comprobar(k in capitulos, f"Falta la «Clasificación Funcional por capítulos» de {k}")
if errores:
    sys.exit("\n".join(errores))

politicas = sorted(c for c in nombres if len(c) == 2)
areas = sorted(c for c in nombres if len(c) == 1 and c.isdigit())

datos = []
for ccaa, anio in claves:
    fu, ca = funcional[(ccaa, anio)], capitulos[(ccaa, anio)]
    et = f"{ccaa} {anio}"
    # Las dos descargas cuentan lo mismo
    for cod in set(fu) | set(ca):
        t1 = fu.get(cod, (0, 0))[0]
        t2 = ca.get(cod, [0] * 10)[9]
        comprobar(abs(t1 - t2) < TOL, f"{et} {cod}: funcional {t1} ≠ por capítulos {t2}")
    # Suma de políticas = área = total
    for a in areas:
        s = sum(fu.get(p, (0, 0))[0] for p in politicas if p[0] == a)
        sd = sum(fu.get(p, (0, 0))[1] for p in politicas if p[0] == a)
        comprobar(abs(s - fu.get(a, (0, 0))[0]) < TOL * 10, f"{et} área {a}: suma de políticas ≠ área")
        comprobar(abs(sd - fu.get(a, (0, 0))[1]) < TOL * 10, f"{et} área {a}: suma depurada ≠ área")
    comprobar(abs(sum(fu[a][0] for a in areas if a in fu) - fu["T"][0]) < TOL * 10, f"{et}: suma de áreas ≠ total")
    comprobar(abs(sum(fu[a][1] for a in areas if a in fu) - fu["T"][1]) < TOL * 10, f"{et}: suma depurada de áreas ≠ total")
    for p in politicas:
        total, dep = fu.get(p, (0.0, 0.0))
        caps = ca.get(p, [0.0] * 10)[:9]
        comprobar(dep <= total + TOL, f"{et} {p}: depurado mayor que total")
        # La depuración (IFL y PAC) son transferencias: no toca activos ni pasivos financieros
        comprobar(dep - caps[7] - caps[8] >= -TOL, f"{et} {p}: depurado menor que sus operaciones financieras")
        if abs(total - dep) > TOL:
            print(f"  {et} {p} {nombres[p]}: depuración IFL/PAC {total - dep:,.2f} miles de €")
        datos.append({
            "ccaa": ccaa, "anio": anio, "politica": p,
            "total": round(total, 2), "depurado": round(dep, 2),
            "capitulos": [round(x, 2) for x in caps],
        })

# Las descargas por capítulos y la serie cuadran con la clasificación funcional por capítulos
for ccaa, anio in claves:
    caps = [sum(ca[p][i] for p in politicas if p in ca) for ca in [capitulos[(ccaa, anio)]] for i in range(9)]
    if (ccaa, anio) in economica:
        for i in range(9):
            comprobar(abs(economica[(ccaa, anio)]["gastos"][i] - caps[i]) < TOL * 30, f"{ccaa} {anio} cap. {i + 1}: «por capítulos» ≠ funcional")
    else:
        errores.append(f"Falta «Ingresos y Gastos por capítulos» de {ccaa} {anio}")
    # La versión depurada, sin capítulos 8 y 9, es el gasto comparado (depurado − activos − pasivos financieros)
    if (ccaa, anio) in economica_dep:
        dep_gas = economica_dep[(ccaa, anio)]["gastos"]
        comparado = sum(f["depurado"] - f["capitulos"][7] - f["capitulos"][8] for f in datos if f["ccaa"] == ccaa and f["anio"] == anio)
        comprobar(abs(sum(dep_gas[:7]) - comparado) < TOL * 40, f"{ccaa} {anio}: «por capítulos depurados» no da el gasto comparado")
        for i in (7, 8):
            comprobar(abs(dep_gas[i] - caps[i]) < TOL * 30, f"{ccaa} {anio} cap. {i + 1}: la depuración no debería tocar activos ni pasivos")
    if ccaa in serie:
        for i in range(9):
            comprobar(abs(serie[ccaa]["gastos"][anio][i] - caps[i]) < TOL * 30, f"{ccaa} {anio} cap. {i + 1}: serie ≠ funcional")
            comprobar(abs(serie[ccaa]["ingresos"][anio][i] - economica[(ccaa, anio)]["ingresos"][i]) < TOL * 30, f"{ccaa} {anio} ingresos cap. {i + 1}: serie ≠ «por capítulos»")
    else:
        errores.append(f"Falta la «Serie Consolidados» de {ccaa}")

# Población a 1 de julio (INE, Estadística Continua de Población)
SERIES_INE = {"MD": "ECP115490", "CT": "ECP115494"}
poblacion = {}
for ccaa, cod in SERIES_INE.items():
    with open(os.path.join(ORIGEN, "ine", f"serie-{cod}.json"), encoding="utf-8") as f:
        sj = json.load(f)
    comprobar(NOMBRES_INE[ccaa] in texto(sj["Nombre"]) and "Todas las edades" in sj["Nombre"], f"Serie del INE inesperada: {sj['Nombre']}")
    for x in sj["Data"]:
        fecha = datetime.datetime.fromtimestamp(x["Fecha"] / 1000)
        if fecha.month == 7:
            poblacion.setdefault(ccaa, {})[str(fecha.year)] = int(x["Valor"])
# Misma cifra que la tabla 56940 descargada aparte
with open(os.path.join(ORIGEN, "ine", "ine-56940-poblacion-ccaa.json"), encoding="utf-8") as f:
    ine = json.load(f)
for ccaa, nom in NOMBRES_INE.items():
    st = next(x for x in ine if texto(x["Nombre"]) == f"Total. Todas las edades. {nom}. Población. Número.")
    for x in st["Data"]:
        fecha = datetime.datetime.fromtimestamp(x["Fecha"] / 1000)
        if fecha.month == 7:
            comprobar(poblacion[ccaa].get(str(fecha.year)) == int(x["Valor"]), f"Población {ccaa} {fecha.year}: serie ≠ tabla")
anios_serie = sorted(set.intersection(*[set(serie[c]["gastos"]) for c in serie])) if serie else []
for ccaa, anio in claves:
    comprobar(str(anio) in poblacion.get(ccaa, {}), f"Falta la población a 1 de julio de {ccaa} {anio}")

# Sistema de financiación (régimen común): las 15 comunidades, todos los años descargados
SFA_NOMBRES = {
    "AN": "andaluc", "AR": "arag", "AS": "asturias", "IB": "balears", "CN": "canarias", "CB": "cantabria",
    "CL": "castilla y le", "CM": "mancha", "CT": "catalu", "EX": "extremadura", "GA": "galicia", "MD": "madrid",
    "MC": "murcia", "RI": "rioja", "VC": "valencia",
}


def sfa_hoja(wb, *claves):
    return next((ws for ws in wb.worksheets if all(k in ws.title for k in claves)), None)


def sfa_filas(ws, columna=None):
    """{id_ccaa: [valores numéricos de la fila]} y la fila de total."""
    out, total = {}, None
    for r in ws.iter_rows(values_only=True):
        if not r or r[0] is None:
            continue
        nom = texto(r[0]).lower()
        valores = r[1:] if columna is None else r[columna:columna + 1]
        nums = [x for x in valores if isinstance(x, (int, float))]
        if not nums:
            continue
        if nom.startswith("total"):
            total = total or nums
            continue
        for cid, clave in SFA_NOMBRES.items():
            if clave in nom:
                out[cid] = nums
    return out, total


financiacion = {}
notas_sfa = {}
for ruta in sorted(glob.glob(os.path.join(ORIGEN, "liquidacion-sfa", "cuadros-liquidacion-*.xlsx"))):
    anio = int(re.search(r"(\d{4})", os.path.basename(ruta)).group(1))
    wb = openpyxl.load_workbook(ruta, data_only=True, read_only=True)
    fg, fg_t = sfa_filas(sfa_hoja(wb, "Liq TFG"))
    fs, fs_t = sfa_filas(sfa_hoja(wb, "Fondo de Suficiencia"))
    rf, _ = sfa_filas(sfa_hoja(wb, "Recursos financieros"))
    fh, _ = sfa_filas(sfa_hoja(wb, "Finan homog"))
    hoja_poblacion = sfa_hoja(wb, "1.9.1.", "Pobl")
    pa, _ = sfa_filas(hoja_poblacion, columna=23)
    comprobar("Población Ajustada" in texto(hoja_poblacion["X4"].value), f"Cabecera de población inesperada: {anio}")
    ld, _ = sfa_filas(sfa_hoja(wb, "Liquidación definitiva"))
    for cid in SFA_NOMBRES:
        comprobar(all(cid in t for t in (fg, fs, rf, fh, pa, ld)), f"Liquidación SFA {anio}: falta {cid}")
    if errores:
        sys.exit("\n".join(errores))
    comprobar(abs(sum(v[3] for v in fg.values()) - fg_t[3]) < 15, f"Liquidación SFA {anio}: el Fondo de Garantía no suma el total")
    for cid in SFA_NOMBRES:
        cap, tfg, fsg, rec = rf[cid][0], rf[cid][1], rf[cid][2], rf[cid][-1]
        comprobar(abs(cap + tfg + fsg - rec) < 5, f"Liquidación SFA {anio} {cid}: capacidad + Fondo de Garantía + Suficiencia ≠ recursos")
        comprobar(abs(tfg - fg[cid][3]) < 1 and abs(fsg - fs[cid][-3]) < 1, f"Liquidación SFA {anio} {cid}: cuadros incoherentes")
        comprobar(abs(fh[cid][0] - rec) < 1 and abs(fh[cid][0] - fh[cid][1] - fh[cid][2]) < 5, f"Liquidación SFA {anio} {cid}: financiación homogénea incoherente")
        financiacion.setdefault(cid, {})[str(anio)] = {
            "fg_aporta": round(fg[cid][2], 2),  # 75 % de los recursos tributarios
            "fg_recibe": round(fg[cid][1], 2),  # participación en el Fondo de Garantía
            "fg": round(tfg, 2),
            "fsg": round(fsg, 2),
            "competitividad": round(ld[cid][6], 2),
            "cooperacion": round(ld[cid][7], 2) if len(ld[cid]) > 8 else 0.0,
            "no_homogeneas": round(fh[cid][1], 2),
            "homogenea": round(fh[cid][2], 2),
            "homogenea_hab_ajustado": round(fh[cid][4], 2),
            "poblacion_ajustada": int(pa[cid][0]),
        }
    pol = sfa_hoja(wb, "Integrac.Pol.Cat")
    if pol:
        filas_pol, _ = sfa_filas(pol)
        if "CT" in filas_pol:
            notas_sfa["policia_ct"] = {"anio": anio, "valor_2013": round(filas_pol["CT"][1], 2)}
    ficheros[("sfa", "todas", anio)] = os.path.basename(ruta)
for ccaa, anio in claves:
    comprobar(str(anio) in financiacion.get(ccaa, {}), f"Falta la liquidación del sistema de financiación de {anio}")

# Deuda (Banco de España, cuadro 13.9, miles de euros), saldo a 31 de diciembre
import csv as _csv
deuda = {}
with open(os.path.join(ORIGEN, "bde", "be1309.csv"), encoding="latin-1") as f:
    filas_bde = list(_csv.reader(f))
desc = filas_bde[3]
unid = filas_bde[4]
COL_BDE = {"MD": "Comunidad de Madrid", "CT": "Cataluña"}
for ccaa, nom in COL_BDE.items():
    i = next(i for i, d in enumerate(desc) if f"CCAA. {nom}. Deuda PDE. Total" in d)
    comprobar(unid[i] == "Miles de euros", f"Unidad inesperada en el Banco de España: {unid[i]}")
    for r in filas_bde[6:]:
        m = re.match(r"^DIC (\d{4})$", r[0].strip())
        if m and r[i].strip():
            deuda.setdefault(ccaa, {})[m.group(1)] = float(r[i])

if errores:
    sys.exit("\n".join(errores))

salida = {
    "nota": "Generado por scripts/extraer_liquidaciones.py. No editar a mano. Importes en miles de euros.",
    "fuente": {
        "gasto": "Ministerio de Hacienda, Liquidación de los Presupuestos de las Comunidades Autónomas, datos consolidados (definitivos)",
        "gasto_url": "https://serviciostelematicosext.hacienda.gob.es/SGCIEF/PublicacionLiquidaciones/aspx/menuInicio.aspx",
        "poblacion": "INE, Estadística Continua de Población (tabla 56940), población a 1 de julio",
        "poblacion_url": "https://www.ine.es/jaxiT3/Tabla.htm?t=56940",
        "deuda": "Banco de España, Boletín Estadístico, cuadro 13.9: deuda según el Protocolo de Déficit Excesivo por comunidades autónomas, saldo a 31 de diciembre",
        "deuda_url": "https://www.bde.es/webbe/es/estadisticas/otras-clasificaciones/publicaciones/boletin-estadistico/capitulo-13.html",
        "sfa": "Ministerio de Hacienda, liquidación de los recursos del sistema de financiación de las CCAA de régimen común (cuadros)",
        "sfa_url": "https://www.hacienda.gob.es/es-ES/CDI/Paginas/SistemasFinanciacionDeuda/InformacionCCAAs/Informes%20financiacion%20comunidades%20autonomas2.aspx",
    },
    "anios": sorted({a for _, a in claves}),
    "areas": [{"id": a, "nombre": nombres[a]} for a in areas],
    "politicas": [{"id": p, "area": p[0], "nombre": nombres[p]} for p in politicas],
    "poblacion": poblacion,
    "entidades": {c: {str(a): v for a, v in d.items()} for c, d in entidades.items()},
    "ficheros": [{"tipo": t, "ccaa": c, "anio": a, "fichero": f} for (t, c, a), f in sorted(ficheros.items())],
    "datos": datos,
    "economica": {c: {str(a): v for (cc, a), v in sorted(economica.items()) if cc == c} for c in sorted({c for c, _ in economica})},
    "economica_dep": {c: {str(a): v for (cc, a), v in sorted(economica_dep.items()) if cc == c} for c in sorted({c for c, _ in economica_dep})},
    "serie": {c: {k: {str(a): [round(x, 2) for x in v] for a, v in sorted(d[k].items()) if a >= 2002} for k in ("ingresos", "gastos")} for c, d in serie.items()},
    "deuda": {c: {a: v for a, v in sorted(d.items()) if int(a) >= 2002} for c, d in deuda.items()},
    "financiacion": financiacion,
    "notas_sfa": notas_sfa,
}
os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
with open(DESTINO, "w", encoding="utf-8") as f:
    json.dump(salida, f, ensure_ascii=False, indent=1)
print(f"OK: {len(datos)} filas ({', '.join(f'{c} {a}' for c, a in claves)}) -> {os.path.relpath(DESTINO, RAIZ)}")
