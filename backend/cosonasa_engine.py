import math
import numpy as np
import requests
from typing import Optional

CATALOGO_CULTIVOS = {
    "Tomate":   {"codigo_cdl": 54, "precio_usd_ton": 112.5,  "demanda_agua": "Alta",     "fija_nitrogeno": False},
    "Algodón":  {"codigo_cdl": 2,  "precio_usd_ton": 1680.0, "demanda_agua": "Alta",     "fija_nitrogeno": False},
    "Trigo":    {"codigo_cdl": 24, "precio_usd_ton": 245.0,  "demanda_agua": "Baja",     "fija_nitrogeno": False},
    "Cártamo":  {"codigo_cdl": 33, "precio_usd_ton": 580.0,  "demanda_agua": "Muy Baja", "fija_nitrogeno": False},
    "Alfalfa":  {"codigo_cdl": 36, "precio_usd_ton": 230.0,  "demanda_agua": "Muy Alta", "fija_nitrogeno": True},
    "Maíz":     {"codigo_cdl": 1,  "precio_usd_ton": 195.0,  "demanda_agua": "Alta",     "fija_nitrogeno": False},
    "Descanso": {"codigo_cdl": 61, "precio_usd_ton": 0.0,    "demanda_agua": "Nula",     "fija_nitrogeno": True}
}

PARCELAS_PILOTO = {
    "fresno-01": {
        "nombre": "Parcela Fresno Sur", "lat": 36.6000, "lon": -120.1000,
        "suelo_respaldo": {"mukey": "466621", "textura": "Franco arcilloso", "materia_organica_pct": 1.15, "retencion_agua_awc": 0.16, "factor_erosion_k": 0.32},
        "cultivos": {"2015": "Algodón", "2016": "Tomate", "2017": "Tomate", "2018": "Maíz", "2019": "Algodón", "2020": "Algodón", "2021": "Descanso", "2022": "Tomate", "2023": "Tomate", "2024": "Tomate"}
    },
    "bakersfield-02": {
        "nombre": "Parcela Bakersfield Norte", "lat": 35.5000, "lon": -119.2500,
        "suelo_respaldo": {"mukey": "465108", "textura": "Franco arenoso", "materia_organica_pct": 0.65, "retencion_agua_awc": 0.11, "factor_erosion_k": 0.37},
        "cultivos": {"2015": "Alfalfa", "2016": "Alfalfa", "2017": "Algodón", "2018": "Algodón", "2019": "Descanso", "2020": "Trigo", "2021": "Algodón", "2022": "Algodón", "2023": "Algodón", "2024": "Algodón"}
    },
    "davis-03": {
        "nombre": "Parcela Davis Valle", "lat": 38.5500, "lon": -121.8000,
        "suelo_respaldo": {"mukey": "467812", "textura": "Franco limoso", "materia_organica_pct": 2.10, "retencion_agua_awc": 0.19, "factor_erosion_k": 0.28},
        "cultivos": {"2015": "Tomate", "2016": "Trigo", "2017": "Cártamo", "2018": "Tomate", "2019": "Trigo", "2020": "Alfalfa", "2021": "Alfalfa", "2022": "Trigo", "2023": "Cártamo", "2024": "Tomate"}
    }
}

MESES_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
MESES_NOMBRES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]


def trapmf(x, a, b, c, d):
    return np.maximum(0.0, np.minimum(np.minimum((x - a) / (b - a + 1e-9), 1.0), (d - x) / (d - c + 1e-9)))

def trimf(x, a, b, c):
    return np.maximum(0.0, np.minimum((x - a) / (b - a + 1e-9), (c - x) / (c - b + 1e-9)))

def evaluar_cosonasa(disp_hidrica: float, estres_termico: float, salud_suelo: float, hist_monocultivo: float) -> float:
    in1 = {1: trapmf(disp_hidrica, 0, 0, 0.2, 0.4), 2: trimf(disp_hidrica, 0.25, 0.5, 0.75), 3: trapmf(disp_hidrica, 0.6, 0.8, 1, 1)}
    in2 = {1: trapmf(estres_termico, 0, 0, 0.25, 0.45), 2: trimf(estres_termico, 0.3, 0.5, 0.7), 3: trapmf(estres_termico, 0.55, 0.8, 1, 1)}
    in3 = {1: trapmf(salud_suelo, 0, 0, 0.25, 0.45), 2: trimf(salud_suelo, 0.3, 0.5, 0.7), 3: trapmf(salud_suelo, 0.55, 0.8, 1, 1)}
    in4 = {1: trapmf(hist_monocultivo, 0, 0, 0.5, 1.5), 2: trimf(hist_monocultivo, 1, 2, 3), 3: trapmf(hist_monocultivo, 2.5, 3.5, 4, 4)}

    reglas = [
        (0, 3, 0, 0, 1), (1, 0, 1, 0, 1), (0, 0, 1, 3, 1), (2, 0, 0, 3, 1),
        (2, 2, 2, 0, 2), (0, 0, 2, 2, 2), (3, 3, 0, 0, 2), (3, 1, 3, 1, 3),
        (0, 0, 3, 1, 3), (3, 0, 3, 2, 3), (1, 2, 0, 0, 1), (1, 1, 3, 1, 2),
        (2, 1, 3, 1, 3), (2, 3, 1, 0, 1), (2, 3, 3, 1, 1), (3, 0, 1, 3, 1),
        (3, 2, 2, 0, 2), (3, 2, 3, 1, 3)
    ]
    x_out = np.linspace(0, 100, 500)
    mf_out = {1: trapmf(x_out, 0, 0, 25, 45), 2: trimf(x_out, 30, 50, 70), 3: trapmf(x_out, 60, 80, 100, 100)}

    agregacion = np.zeros_like(x_out)
    for r1, r2, r3, r4, out_idx in reglas:
        vals = [in1[r1]] if r1 > 0 else []
        if r2 > 0: vals.append(in2[r2])
        if r3 > 0: vals.append(in3[r3])
        if r4 > 0: vals.append(in4[r4])
        act = min(vals) if vals else 0.0
        agregacion = np.maximum(agregacion, np.minimum(act, mf_out[out_idx]))

    return 50.0 if np.sum(agregacion) == 0 else round(float(np.sum(x_out * agregacion) / np.sum(agregacion)), 2)


def obtener_nombre_lugar(lat: float, lon: float):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1"
        r = requests.get(url, headers={"User-Agent": "FieldShift_NASA_SpaceApps/4.5.2"}, timeout=8).json()
        addr = r.get("address", {})
        localidad = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county") or "Agricultural Zone"
        estado = addr.get("state", "")
        return {
            "nombre_corto": f"Field in {localidad} ({estado})".strip(),
            "ubicacion_completa": r.get("display_name", f"Lat {lat}, Lon {lon}"),
            "condado": addr.get("county", ""),
            "estado": estado,
            "pais": addr.get("country", "")
        }
    except Exception:
        return {"nombre_corto": f"Field ({lat}, {lon})", "ubicacion_completa": f"{lat}, {lon}", "condado": "N/A", "estado": "N/A", "pais": "N/A"}

def obtener_suelo_usda(lat: float, lon: float, respaldo: dict):
    wkt_box = f"POLYGON(({lon-0.01} {lat-0.01}, {lon+0.01} {lat-0.01}, {lon+0.01} {lat+0.01}, {lon-0.01} {lat+0.01}, {lon-0.01} {lat-0.01}))"
    query = f"""
    SELECT TOP 1 m.mukey, m.muname, c.om_r, c.awc_r, c.kffact
    FROM mapunit m
    INNER JOIN component c ON m.mukey = c.mukey AND c.majcompflag = 'Yes'
    INNER JOIN mupolygon p ON m.mukey = p.mukey
    WHERE p.mupolygongeo.STIntersects(geometry::STGeomFromText('{wkt_box}', 4326)) = 1
    """
    try:
        resp = requests.post("https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest", json={"query": query, "format": "JSON"}, timeout=12).json()
        if "Table" in resp and len(resp["Table"]) > 0:
            f = resp["Table"][0]
            return {
                "mukey": str(f[0]),
                "textura": str(f[1]),
                "materia_organica_pct": round(float(f[2]), 2) if f[2] else respaldo["materia_organica_pct"],
                "retencion_agua_awc": round(float(f[3]), 2) if f[3] else respaldo["retencion_agua_awc"],
                "factor_erosion_k": round(float(f[4]), 2) if f[4] else respaldo["factor_erosion_k"],
                "fuente": "USDA NRCS SSURGO Live"
            }
    except Exception:
        pass
    return {**respaldo, "fuente": "Regional Baseline Fallback"}

def obtener_agua_subterranea_usgs(lat: float, lon: float):
    b_box = f"{round(lon-0.15, 4)},{round(lat-0.15, 4)},{round(lon+0.15, 4)},{round(lat+0.15, 4)}"
    url = f"https://waterservices.usgs.gov/nwis/gwlevels/?format=json&bBox={b_box}&siteStatus=active"
    try:
        r = requests.get(url, timeout=8).json()
        series = r.get("value", {}).get("timeSeries", [])
        if series:
            return {
                "estacion_local_usgs": series[0]["sourceInfo"]["siteName"],
                "profundidad_nivel_freatico_pies": float(series[0]["values"][0]["value"][0]["value"]),
                "fuente": "USGS NWIS In-Situ Groundwater"
            }
    except Exception:
        pass
    return {"estacion_local_usgs": "Regional Groundwater Monitor", "profundidad_nivel_freatico_pies": None, "fuente": "USGS NWIS"}


def simular_estrategias_predictivas(cultivo_actual: str, humedad: float, estres_termico: float, salud_suelo: float, monocultivo: float, prioridad: str):
    score_base = evaluar_cosonasa(humedad, estres_termico, salud_suelo, monocultivo)
    score_agua = evaluar_cosonasa(min(humedad * 1.35, 1.0), estres_termico * 0.9, min(salud_suelo * 1.30, 1.0), 0.5)
    score_econ = evaluar_cosonasa(min(humedad * 1.15, 1.0), estres_termico, min(salud_suelo * 1.15, 1.0), 1.0)

    estrategias = [
        {
            "id": "baseline-current",
            "name": f"Baseline: Continue {cultivo_actual}",
            "sequence": [cultivo_actual, cultivo_actual, "Fallow"],
            "suitability_score": score_base,
            "water_demand": CATALOGO_CULTIVOS.get(cultivo_actual, CATALOGO_CULTIVOS["Maíz"])["demanda_agua"],
            "rationale": f"Maintains current crop ({cultivo_actual}). Continuous cropping increases moisture depletion and pest pressure.",
            "risks": "Progressive organic matter decline and heatwave vulnerability."
        },
        {
            "id": "water-resilient",
            "name": "Strategy 2: Water Resilience & Nitrogen Fixation",
            "sequence": ["Safflower", "Wheat", "Alfalfa"],
            "suitability_score": score_agua,
            "water_demand": "Very Low -> Low",
            "rationale": "Deep-rooted Safflower reduces irrigation demand, Wheat breaks pest cycles, and Alfalfa restores soil nitrogen.",
            "risks": "Requires irrigation planning in Year 3 when introducing Alfalfa."
        },
        {
            "id": "economic-balanced",
            "name": "Strategy 3: Balanced Commercial Rotation",
            "sequence": ["Wheat", "Cotton", "Safflower"],
            "suitability_score": score_econ,
            "water_demand": "Moderate (Balanced)",
            "rationale": "Alternates low-water grains (Wheat/Safflower) to recover moisture before high-value Cotton ($1,680/ton).",
            "risks": "Sensitive to cotton market price fluctuations and mid-summer heat."
        }
    ]

    if prioridad == "water":
        estrategias.sort(key=lambda x: x["id"] == "water-resilient", reverse=True)
    elif prioridad == "profit":
        estrategias.sort(key=lambda x: x["id"] == "economic-balanced", reverse=True)
    else:
        estrategias.sort(key=lambda x: x["suitability_score"], reverse=True)

    return estrategias


def ejecutar_modelo_predictivo_coordenadas(
    lat: float,
    lon: float,
    prioridad: str = "balanced",
    materia_organica_local: Optional[float] = None,
    cultivo_actual: Optional[str] = None
):
    lugar = obtener_nombre_lugar(lat, lon)
    
    pid = "custom-coord"
    info_base = PARCELAS_PILOTO["fresno-01"]
    for k, v in PARCELAS_PILOTO.items():
        if math.hypot(lat - v["lat"], lon - v["lon"]) <= 0.15:
            pid, info_base = k, v
            break

    suelo = obtener_suelo_usda(lat, lon, info_base["suelo_respaldo"])
    if materia_organica_local is not None:
        suelo["materia_organica_pct"] = round(materia_organica_local, 2)
        suelo["fuente"] = "Farmer Local Lab + USDA SSURGO"

    agua_usgs = obtener_agua_subterranea_usgs(lat, lon)

    url_nasa = (
        f"https://power.larc.nasa.gov/api/temporal/monthly/point"
        f"?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,GWETTOP"
        f"&community=AG&longitude={lon}&latitude={lat}"
        f"&start=2015&end=2024&format=JSON"
    )
    res_nasa = requests.get(url_nasa, timeout=15).json()["properties"]["parameter"]

    hist_cultivos = info_base["cultivos"]
    historial_unificado = []
    for anio in range(2015, 2025):
        anio_str = str(anio)
        cultivo_anio = hist_cultivos.get(anio_str, "Trigo") if pid != "custom-coord" else (cultivo_actual if cultivo_actual in CATALOGO_CULTIVOS else "Maíz")
        info_merc = CATALOGO_CULTIVOS[cultivo_anio]
        for m_num, nombre_mes in zip(MESES_KEYS, MESES_NOMBRES):
            clave = f"{anio}{m_num}"
            t_max = res_nasa["T2M_MAX"].get(clave, -999)
            t_min = res_nasa["T2M_MIN"].get(clave, -999)
            lluvia = res_nasa["PRECTOTCORR"].get(clave, -999)
            humedad = res_nasa["GWETTOP"].get(clave, -999)

            historial_unificado.append({
                "anio": anio,
                "mes": nombre_mes,
                "fecha": f"{anio}-{m_num}",
                "temp_max_c": round(t_max, 1) if t_max != -999 else 25.0,
                "lluvia_mm": round(lluvia * 30, 1) if lluvia != -999 else 0.0,
                "riesgo_helada": bool(t_min <= 2.5) if t_min != -999 else False,
                "humedad_suelo_pct": round(humedad * 100, 1) if humedad != -999 else 15.0,
                "cultivo_principal": cultivo_anio,
                "codigo_cdl": info_merc["codigo_cdl"],
                "precio_usd_ton": info_merc["precio_usd_ton"]
            })

    ultimos_12 = historial_unificado[-12:]
    humedad_media = sum(m["humedad_suelo_pct"] for m in ultimos_12) / (12 * 100.0)
    temp_max_media = sum(m["temp_max_c"] for m in ultimos_12) / 12.0
    estres_termico = min(max((temp_max_media - 20.0) / 28.0, 0.0), 1.0)
    salud_suelo = min(suelo["materia_organica_pct"] / 2.5, 1.0)
    monocultivo_val = 3.0 if pid in ["fresno-01", "bakersfield-02"] else 1.0

    if cultivo_actual and cultivo_actual in CATALOGO_CULTIVOS:
        cultivo_reciente = cultivo_actual
    elif pid != "custom-coord":
        cultivo_reciente = ultimos_12[-1]["cultivo_principal"]
    else:
        cultivo_reciente = "Maíz"

    score_actual = evaluar_cosonasa(humedad_media, estres_termico, salud_suelo, monocultivo_val)
    estrategias = simular_estrategias_predictivas(cultivo_reciente, humedad_media, estres_termico, salud_suelo, monocultivo_val, prioridad)

    return {
        "model_version": "CosoNASA-Mamdani-v1.0",
        "coordinates": {"lat": lat, "lon": lon},
        "location": lugar,
        "soil_properties": suelo,
        "local_groundwater_usgs": agua_usgs,
        "fuzzy_evaluation": {
            "inputs": {
                "Disponibilidad_Hidrica": round(humedad_media, 2),
                "Estres_Termico": round(estres_termico, 2),
                "Salud_suelo": round(salud_suelo, 2),
                "Historial_Monocultivo": monocultivo_val
            },
            "suitability_score": score_actual,
            "category": "Optimal" if score_actual >= 65 else ("Acceptable" if score_actual >= 40 else "Not Recommended")
        },
        "rotation_strategies": estrategias,
        "historical_series_10y": historial_unificado
    }