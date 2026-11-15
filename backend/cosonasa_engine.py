import math
from datetime import date, timedelta
import calendar
import numpy as np
import requests
from typing import Optional

CATALOGO_CULTIVOS = {
    "Tomate":   {"codigo_cdl": 54, "precio_usd_ton": 112.5,  "demanda_agua": "Alta",     "fija_nitrogeno": False, "rendimiento_ha": 95.0, "ciclo_dias": 150},
    "Algodón":  {"codigo_cdl": 2,  "precio_usd_ton": 1680.0, "demanda_agua": "Alta",     "fija_nitrogeno": False, "rendimiento_ha": 1.8, "ciclo_dias": 170},
    "Trigo":    {"codigo_cdl": 24, "precio_usd_ton": 245.0,  "demanda_agua": "Baja",     "fija_nitrogeno": False, "rendimiento_ha": 6.5, "ciclo_dias": 150},
    "Cártamo":  {"codigo_cdl": 33, "precio_usd_ton": 580.0,  "demanda_agua": "Muy Baja", "fija_nitrogeno": False, "rendimiento_ha": 3.2, "ciclo_dias": 130},
    "Alfalfa":  {"codigo_cdl": 36, "precio_usd_ton": 230.0,  "demanda_agua": "Muy Alta", "fija_nitrogeno": True,  "rendimiento_ha": 16.0, "ciclo_dias": 365},
    "Maíz":     {"codigo_cdl": 1,  "precio_usd_ton": 195.0,  "demanda_agua": "Alta",     "fija_nitrogeno": False, "rendimiento_ha": 12.0, "ciclo_dias": 150},
    "Nuez":     {"codigo_cdl": 75, "precio_usd_ton": 3500.0, "demanda_agua": "Alta",     "fija_nitrogeno": False, "rendimiento_ha": 2.5, "ciclo_dias": 365},
    "Manzana":  {"codigo_cdl": 68, "precio_usd_ton": 650.0,  "demanda_agua": "Alta",     "fija_nitrogeno": False, "rendimiento_ha": 40.0, "ciclo_dias": 365},
    "Descanso": {"codigo_cdl": 61, "precio_usd_ton": 0.0,    "demanda_agua": "Nula",     "fija_nitrogeno": True,  "rendimiento_ha": 0.0, "ciclo_dias": 0}
}

FACTOR_DEMANDA_AGUA = {"Muy Baja": 1.35, "Baja": 1.15, "Alta": 0.85, "Muy Alta": 0.65, "Nula": 1.40}

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


# =====================================================================
# 1. SISTEMA DIFUSO COSONASA (28 REGLAS; cobertura exhaustiva de 81 combinaciones discretas)
# =====================================================================
REGLAS_COSONASA_28 = (
(1, 0, 0, 0, 1), (1, 0, 1, 0, 1), (0, 0, 1, 3, 1), (2, 0, 0, 3, 1),
        (2, 2, 2, 0, 2), (0, 0, 2, 2, 2), (3, 3, 0, 0, 2), (3, 1, 3, 1, 3),
        (0, 0, 3, 1, 3), (3, 0, 3, 2, 3), (1, 2, 0, 0, 1), (1, 1, 3, 1, 2),
        (2, 1, 3, 1, 3), (2, 3, 1, 0, 1), (2, 3, 3, 1, 1), (3, 0, 1, 3, 1),
        (3, 2, 2, 0, 2), (3, 2, 3, 1, 3),
        (2, 0, 1, 1, 2), (3, 0, 1, 1, 2), (2, 0, 1, 2, 1), (3, 0, 1, 2, 1),
        (2, 3, 2, 0, 1), (3, 1, 2, 0, 2), (2, 0, 3, 2, 2),
    # Three uncovered antecedent combinations found by exhaustive 3^4 enumeration.
    (2, 1, 2, 1, 2), (3, 1, 3, 3, 2), (3, 2, 3, 3, 2),
)


def trapmf(x, a, b, c, d):
    """Trapezoidal membership with correct left/right shoulder handling."""
    if not a <= b <= c <= d:
        raise ValueError("Expected a <= b <= c <= d")
    values = np.asarray(x, dtype=float)
    rising = np.ones_like(values) if a == b else np.clip((values - a) / (b - a), 0.0, 1.0)
    falling = np.ones_like(values) if c == d else np.clip((d - values) / (d - c), 0.0, 1.0)
    result = np.minimum(rising, falling)
    return np.where((values < a) | (values > d), 0.0, result)

def trimf(x, a, b, c):
    """Triangular membership; all breakpoints must be strictly ordered."""
    if not a < b < c:
        raise ValueError("Expected a < b < c")
    values = np.asarray(x, dtype=float)
    return np.maximum(0.0, np.minimum((values - a) / (b - a), (c - values) / (c - b)))

def evaluar_cosonasa_28(disp_hidrica: float, estres_termico: float, salud_suelo: float, hist_monocultivo: float) -> float:
    disp_hidrica = float(np.clip(disp_hidrica, 0.0, 1.0))
    estres_termico = float(np.clip(estres_termico, 0.0, 1.0))
    salud_suelo = float(np.clip(salud_suelo, 0.0, 1.0))
    hist_monocultivo = float(np.clip(hist_monocultivo, 0.0, 4.0))

    in1 = {1: trapmf(disp_hidrica, 0.0, 0.0, 0.2, 0.4), 2: trimf(disp_hidrica, 0.25, 0.5, 0.75), 3: trapmf(disp_hidrica, 0.6, 0.8, 1.0, 1.0)}
    in2 = {1: trapmf(estres_termico, 0.0, 0.0, 0.25, 0.45), 2: trimf(estres_termico, 0.3, 0.5, 0.7), 3: trapmf(estres_termico, 0.55, 0.8, 1.0, 1.0)}
    in3 = {1: trapmf(salud_suelo, 0.0, 0.0, 0.25, 0.45), 2: trimf(salud_suelo, 0.3, 0.5, 0.7), 3: trapmf(salud_suelo, 0.55, 0.8, 1.0, 1.0)}
    in4 = {1: trapmf(hist_monocultivo, 0.0, 0.0, 0.5, 1.5), 2: trimf(hist_monocultivo, 1.0, 2.0, 3.0), 3: trapmf(hist_monocultivo, 2.5, 3.5, 4.0, 4.0)}


    x_out = np.linspace(0, 100, 201)
    mf_out = {
        1: trapmf(x_out, 0.0, 0.0, 25.0, 45.0),
        2: trimf(x_out, 30.0, 50.0, 70.0),
        3: trapmf(x_out, 60.0, 80.0, 100.0, 100.0)
    }

    agregacion = np.zeros_like(x_out)
    for r1, r2, r3, r4, out_idx in REGLAS_COSONASA_28:
        vals = [in1[r1]] if r1 > 0 else []
        if r2 > 0: vals.append(in2[r2])
        if r3 > 0: vals.append(in3[r3])
        if r4 > 0: vals.append(in4[r4])
        act = min(vals) if vals else 0.0
        agregacion = np.maximum(agregacion, np.minimum(act, mf_out[out_idx]))

    if not np.any(agregacion):
        raise ValueError("CosoNASA rule base did not activate for the supplied inputs.")
    return round(float(np.sum(x_out * agregacion) / np.sum(agregacion)), 2)


# =====================================================================
# 2. EXTRACCIÓN SEGURA DE DATOS EN VIVO POR COORDENADAS
# =====================================================================
def obtener_nombre_lugar(lat: float, lon: float):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1"
        r = requests.get(url, headers={"User-Agent": "FieldShift_NASA_SpaceApps/4.5.2"}, timeout=6).json()
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
        return {"nombre_corto": f"Field ({round(lat,2)}, {round(lon,2)})", "ubicacion_completa": f"{lat}, {lon}", "condado": "N/A", "estado": "N/A", "pais": "N/A"}

def obtener_suelo_usda(lat: float, lon: float, respaldo: Optional[dict] = None):
    """Fetch SSURGO horizon observations at a point and aggregate the upper 30 cm.

    SSURGO stores organic matter, available water capacity and K-factor on
    chorizon, not component. Horizon values are thickness-weighted within
    each component; component values are then weighted by comppct_r.
    """
    respaldo = respaldo or {}
    point_wkt = f"POINT({lon} {lat})"
    query = f"""
    SELECT TOP 1000
        m.mukey, m.muname, c.cokey, c.compname, c.comppct_r,
        h.hzdept_r, h.hzdepb_r, h.om_r, h.awc_r, h.kffact
    FROM mupolygon p
    INNER JOIN mapunit m ON m.mukey = p.mukey
    INNER JOIN component c ON c.mukey = m.mukey
        AND c.majcompflag = 'Yes'
    LEFT JOIN chorizon h ON h.cokey = c.cokey
    WHERE p.mupolygongeo.STIntersects(
        geometry::STGeomFromText('{point_wkt}', 4326)
    ) = 1
    ORDER BY c.comppct_r DESC, h.hzdept_r
    """
    query_error = None

    def numeric(value):
        try:
            number = float(value)
            return number if math.isfinite(number) else None
        except (TypeError, ValueError):
            return None

    try:
        response = requests.post(
            "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest",
            json={"query": query, "format": "JSON"}, timeout=12
        )
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("Table") or []
        if rows:
            # Build a depth-weighted profile (0-30 cm) for each major
            # component, then weight those profiles by component percentage.
            components = {}
            for row in rows:
                if len(row) < 10:
                    continue
                mukey, muname, cokey = row[0], row[1], row[2]
                component_pct = numeric(row[4])
                top = numeric(row[5])
                bottom = numeric(row[6])
                if not cokey or component_pct is None or top is None or bottom is None:
                    continue
                overlap = max(0.0, min(bottom, 30.0) - max(top, 0.0))
                if overlap <= 0:
                    continue
                profile = components.setdefault(str(cokey), {
                    "weight": component_pct, "mukey": mukey, "muname": muname,
                    "properties": {
                        "materia_organica_pct": [0.0, 0.0],
                        "retencion_agua_awc": [0.0, 0.0],
                        "factor_erosion_k": [0.0, 0.0],
                    }
                })
                # Keep the largest reported component share if duplicate
                # spatial rows happen to include the same component.
                profile["weight"] = max(profile["weight"], component_pct)
                for key, value in (
                    ("materia_organica_pct", numeric(row[7])),
                    ("retencion_agua_awc", numeric(row[8])),
                    # SSURGO kffact is a choice/text field. Accept only
                    # values that are explicitly numeric; never guess codes.
                    ("factor_erosion_k", numeric(row[9])),
                ):
                    if value is not None:
                        profile["properties"][key][0] += value * overlap
                        profile["properties"][key][1] += overlap

            totals = {key: [0.0, 0.0] for key in (
                "materia_organica_pct", "retencion_agua_awc", "factor_erosion_k"
            )}
            total_component_weight = 0.0
            for profile in components.values():
                component_values = {}
                for key, (weighted_sum, depth_sum) in profile["properties"].items():
                    component_values[key] = weighted_sum / depth_sum if depth_sum else None
                available = [v for v in component_values.values() if v is not None]
                if not available:
                    continue
                weight = profile["weight"]
                total_component_weight += weight
                for key, value in component_values.items():
                    if value is not None:
                        totals[key][0] += value * weight
                        totals[key][1] += weight

            if total_component_weight > 0:
                first = rows[0]
                values = {
                    key: round(weighted_sum / weight_sum, 3) if weight_sum else None
                    for key, (weighted_sum, weight_sum) in totals.items()
                }
                return {
                    "mukey": str(first[0]) if first[0] is not None else None,
                    "textura": str(first[1]) if first[1] is not None else "Not reported",
                    **values,
                    "fuente": "USDA NRCS SSURGO (0-30 cm; horizon- and component-weighted)",
                    "cobertura_verificada": all(value is not None for value in values.values()),
                    "error_consulta": None
                }
        elif payload.get("error") or payload.get("Message"):
            query_error = str(payload.get("error") or payload.get("Message"))[:300]
    except (requests.RequestException, ValueError, TypeError, KeyError, IndexError) as exc:
        query_error = f"{type(exc).__name__}: {str(exc)[:240]}"

    has_baseline = any(respaldo.get(key) is not None for key in (
        "materia_organica_pct", "retencion_agua_awc", "factor_erosion_k"
    ))
    return {
        "mukey": respaldo.get("mukey"),
        "textura": respaldo.get("textura", "Unavailable"),
        "materia_organica_pct": respaldo.get("materia_organica_pct"),
        "retencion_agua_awc": respaldo.get("retencion_agua_awc"),
        "factor_erosion_k": respaldo.get("factor_erosion_k"),
        "fuente": "Pilot reference baseline (not an in-field measurement)" if has_baseline else "USDA SSURGO unavailable",
        "cobertura_verificada": False,
        "error_consulta": query_error
    }

def obtener_agua_subterranea_usgs(lat: float, lon: float):
    b_box = f"{round(lon-0.15, 4)},{round(lat-0.15, 4)},{round(lon+0.15, 4)},{round(lat+0.15, 4)}"
    url = f"https://waterservices.usgs.gov/nwis/gwlevels/?format=json&bBox={b_box}&siteStatus=active"
    try:
        r = requests.get(url, timeout=6).json()
        series = r.get("value", {}).get("timeSeries", [])
        if series:
            return {
                "estacion_local_usgs": series[0]["sourceInfo"]["siteName"],
                "profundidad_nivel_freatico_pies": float(series[0]["values"][0]["value"][0]["value"]),
                "fuente": "USGS NWIS In-Situ Groundwater",
                "disponible": True
            }
    except Exception:
        pass
    return {"estacion_local_usgs": "Regional Groundwater Monitor", "profundidad_nivel_freatico_pies": None, "fuente": "USGS NWIS", "disponible": False}


# =====================================================================
# 3. SIMULACIÓN DE ESTRATEGIAS DINÁMICAS
# =====================================================================

def calcular_lluvia_ciclo(fecha_siembra: date, ciclo_dias: int, climatologia_mm_dia: dict):
    """Estimate crop-cycle precipitation from 2015-2024 NASA POWER monthly normals.

    This is a climatological expectation, not a deterministic weather forecast.
    Every calendar month touched by the crop cycle must have a monthly normal.
    """
    if ciclo_dias <= 0:
        return {"lluvia_ciclo_mm": 0.0, "ciclo_dias": 0, "completo": True}
    total = 0.0
    for offset in range(ciclo_dias):
        dia = fecha_siembra + timedelta(days=offset)
        normal = climatologia_mm_dia.get(dia.month)
        if normal is None:
            return {"lluvia_ciclo_mm": None, "ciclo_dias": ciclo_dias, "completo": False}
        total += normal
    return {"lluvia_ciclo_mm": round(total, 1), "ciclo_dias": ciclo_dias, "completo": True}


def factor_lluvia_estacional(lluvia_ciclo_mm: float, ciclo_dias: int,
                             lluvia_media_anual_mm_dia: float) -> float:
    """Bounded seasonal-rainfall modifier; not a crop water-balance model."""
    if ciclo_dias <= 0 or lluvia_media_anual_mm_dia <= 0:
        return 1.0
    expected_at_annual_rate = lluvia_media_anual_mm_dia * ciclo_dias
    ratio = lluvia_ciclo_mm / expected_at_annual_rate if expected_at_annual_rate else 1.0
    return float(np.clip(1.0 + 0.35 * (ratio - 1.0), 0.70, 1.30))


def agregar_calendario_lluvia_estrategias(estrategias: list, fecha_inicio: date, climatologia_mm_dia: dict):
    """Attach sequential crop-cycle rainfall estimates to each proposed rotation."""
    for estrategia in estrategias:
        cursor = fecha_inicio
        calendario = []
        total_mm = 0.0
        completo = True
        for cultivo in estrategia.get("sequence", []):
            info = CATALOGO_CULTIVOS.get(cultivo, {})
            dias = int(info.get("ciclo_dias", 0))
            ciclo = calcular_lluvia_ciclo(cursor, dias, climatologia_mm_dia)
            calendario.append({
                "cultivo": cultivo,
                "fecha_inicio": cursor.isoformat(),
                "fecha_fin": (cursor + timedelta(days=dias - 1)).isoformat() if dias > 0 else cursor.isoformat(),
                "ciclo_dias": dias,
                "demanda_agua": info.get("demanda_agua", "Nula"),
                "lluvia_esperada_mm": ciclo["lluvia_ciclo_mm"],
                "completo": ciclo["completo"]
            })
            if not ciclo["completo"] or ciclo["lluvia_ciclo_mm"] is None:
                completo = False
            else:
                total_mm += ciclo["lluvia_ciclo_mm"]
            cursor += timedelta(days=dias)
        estrategia["rainfall_schedule"] = calendario
        estrategia["rainfall_total_mm"] = round(total_mm, 1) if completo else None
        estrategia["rainfall_schedule_complete"] = completo
        duracion_total = sum(item["ciclo_dias"] for item in calendario)
        estrategia["rotation_duration_days"] = duracion_total
        # Never label a rotation "low water" based on a hand-written strategy name.
        # Derive its profile from the actual crops included in the sequence.
        demanda_orden = {"Nula": 0, "Muy Baja": 1, "Baja": 2, "Moderada": 3, "Alta": 4, "Muy Alta": 5}
        demandas = [item["demanda_agua"] for item in calendario if item["ciclo_dias"] > 0]
        estrategia["water_demand_profile"] = demandas
        estrategia["water_demand"] = (
            "Mixed" if len(set(demandas)) > 1 else (demandas[0] if demandas else "Nula")
        )
        estrategia["highest_crop_water_demand"] = (
            max(demandas, key=lambda value: demanda_orden.get(value, 3)) if demandas else "Nula"
        )
        # Normalize precipitation by duration to make rotations of different lengths comparable.
        estrategia["rainfall_mm_per_30_days"] = (
            round(total_mm / duracion_total * 30.0, 1)
            if completo and duracion_total > 0 else None
        )
    return estrategias


def simular_estrategias_predictivas(cultivo_actual: str, agua_n: float, calor_n: float, suelo_n: float, mono_n: float, prioridad: str, lluvia_por_cultivo: Optional[dict] = None):
    ranking = []
    lluvia_por_cultivo = lluvia_por_cultivo or {}
    for nom_c, info_m in CATALOGO_CULTIVOS.items():
        if nom_c == "Descanso":
            continue
        nuevo_mono = min(4.0, mono_n + 1.0) if nom_c == cultivo_actual else 0.5
        lluvia = lluvia_por_cultivo.get(nom_c, {})
        lluvia_mm = lluvia.get("lluvia_ciclo_mm")
        factor_lluvia = lluvia.get("factor_estacional", 1.0)
        agua_ef = float(np.clip(
            agua_n * FACTOR_DEMANDA_AGUA[info_m["demanda_agua"]] * factor_lluvia,
            0.0, 1.0
        ))
        sc_c = evaluar_cosonasa_28(agua_ef, calor_n, suelo_n, nuevo_mono)
        ingreso_ha = round(info_m["rendimiento_ha"] * info_m["precio_usd_ton"] * (sc_c / 100.0), 0)
        ranking.append({
            "cultivo": nom_c,
            "demanda_agua": info_m["demanda_agua"],
            "ciclo_dias": info_m["ciclo_dias"],
            "lluvia_ciclo_mm": lluvia_mm,
            "factor_lluvia_estacional": round(factor_lluvia, 3),
            "rompe_monocultivo": nom_c != cultivo_actual,
            "score_proyectado": sc_c,
            "precio_usd_ton": info_m["precio_usd_ton"],
            "ingreso_estimado_usd_ha": ingreso_ha
        })
    ranking.sort(key=lambda x: x["score_proyectado"], reverse=True)

    crop_base = cultivo_actual if cultivo_actual in CATALOGO_CULTIVOS else "Maíz"
    factor_base = lluvia_por_cultivo.get(crop_base, {}).get("factor_estacional", 1.0)
    score_base = evaluar_cosonasa_28(float(np.clip(agua_n * factor_base, 0.0, 1.0)), calor_n, suelo_n, min(4.0, mono_n + 1.0))
    crop_water = ranking[0]["cultivo"] if ranking else "Cártamo"
    factor_water = lluvia_por_cultivo.get(crop_water, {}).get("factor_estacional", 1.0)
    score_agua = evaluar_cosonasa_28(float(np.clip(agua_n * 1.35 * factor_water, 0.0, 1.0)), calor_n * 0.9, min(suelo_n * 1.30, 1.0), 0.5)
    factor_wheat = lluvia_por_cultivo.get("Trigo", {}).get("factor_estacional", 1.0)
    score_econ = evaluar_cosonasa_28(float(np.clip(agua_n * 1.15 * factor_wheat, 0.0, 1.0)), calor_n, min(suelo_n * 1.15, 1.0), 0.5)

    estrategias = [
        {
            "id": "baseline-current",
            "name": f"Baseline: Continue {cultivo_actual}",
            "sequence": [cultivo_actual, cultivo_actual, "Descanso"],
            "suitability_score": score_base,
            "water_demand": CATALOGO_CULTIVOS.get(cultivo_actual, CATALOGO_CULTIVOS["Maíz"])["demanda_agua"],
            "rationale": f"Maintains current crop ({cultivo_actual}). Continuous repetition can increase soil fatigue and moisture stress.",
            "risks": "Higher vulnerability to heatwaves and gradual organic matter depletion."
        },
        {
            "id": "water-resilient",
            "name": "Strategy 2: Water Resilience & Nitrogen Fixation",
            "sequence": [ranking[0]["cultivo"] if len(ranking) > 0 else "Cártamo", "Trigo", "Alfalfa"],
            "suitability_score": score_agua,
            "water_demand": "Mixed",
            "rationale": f"Introduces drought-tolerant rotation ({ranking[0]['cultivo'] if len(ranking) > 0 else 'Safflower'}) to cut irrigation pressure and restore soil structure.",
            "risks": "Requires careful water scheduling during establishment."
        },
        {
            "id": "economic-balanced",
            "name": "Strategy 3: Balanced Commercial Rotation",
            "sequence": ["Trigo", ranking[1]["cultivo"] if len(ranking) > 1 else "Algodón", "Cártamo"],
            "suitability_score": score_econ,
            "water_demand": "Mixed",
            "rationale": "Alternates low-water grains with high-value cash crops to optimize earnings while preserving moisture.",
            "risks": "Sensitive to seasonal commodity market price shifts."
        }
    ]

    if prioridad == "water":
        estrategias.sort(key=lambda x: (x["water_demand"] not in ("Very Low -> Low", "Muy Baja"), x["suitability_score"] * -1))
    elif prioridad == "profit":
        estrategias.sort(key=lambda x: x["id"] != "economic-balanced")
    elif prioridad == "erosion":
        # Prefer diversified rotations over repeating the current crop.
        estrategias.sort(key=lambda x: (x["id"] == "baseline-current", -x["suitability_score"]))
    else:
        # "soil" and "balanced" use the FIS suitability score.
        estrategias.sort(key=lambda x: x["suitability_score"], reverse=True)

    return estrategias, ranking


def ejecutar_modelo_predictivo_coordenadas(
    lat: float,
    lon: float,
    prioridad: str = "balanced",
    materia_organica_local: Optional[float] = None,
    cultivo_actual: Optional[str] = None,
    fecha_siembra: Optional[str] = None
):
    lugar = obtener_nombre_lugar(lat, lon)

    # Only the three documented pilot areas have a crop-history archive.
    pid = "custom-coord"
    info_base = {
        "suelo_respaldo": {},
        "cultivos": {}
    }
    for pilot_id, pilot in PARCELAS_PILOTO.items():
        if math.hypot(lat - pilot["lat"], lon - pilot["lon"]) <= 0.25:
            pid, info_base = pilot_id, pilot
            break

    suelo = obtener_suelo_usda(lat, lon, info_base.get("suelo_respaldo", {}))
    if materia_organica_local is not None:
        suelo["materia_organica_pct"] = round(float(materia_organica_local), 2)
        soil_source = suelo.get("fuente", "USDA SSURGO")
        suelo["fuente"] = f"{soil_source} + user-supplied local organic matter"
        suelo["materia_organica_es_local"] = True

    agua_usgs = obtener_agua_subterranea_usgs(lat, lon)

    # NASA POWER observations are kept missing when absent or flagged as -999.
    url_nasa = (
        "https://power.larc.nasa.gov/api/temporal/monthly/point"
        "?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,GWETTOP"
        f"&community=AG&longitude={lon}&latitude={lat}"
        "&start=2015&end=2024&format=JSON"
    )
    try:
        response = requests.get(url_nasa, timeout=12)
        response.raise_for_status()
        res_nasa = response.json().get("properties", {}).get("parameter", {})
    except (requests.RequestException, ValueError, TypeError, AttributeError):
        res_nasa = {}

    def observation(parameter, key):
        try:
            value = float(res_nasa.get(parameter, {}).get(key))
            return round(value, 3) if math.isfinite(value) and value > -990 else None
        except (TypeError, ValueError):
            return None

    cultivo_reciente = cultivo_actual if cultivo_actual in CATALOGO_CULTIVOS else "Maíz"
    historial_unificado = []
    for anio in range(2015, 2025):
        cultivo_anio = info_base.get("cultivos", {}).get(str(anio))
        info_merc = CATALOGO_CULTIVOS.get(cultivo_anio, {}) if cultivo_anio else {}
        for m_num, nombre_mes in zip(MESES_KEYS, MESES_NOMBRES):
            clave = f"{anio}{m_num}"
            t_max = observation("T2M_MAX", clave)
            t_min = observation("T2M_MIN", clave)
            lluvia = observation("PRECTOTCORR", clave)
            humedad = observation("GWETTOP", clave)
            historial_unificado.append({
                "anio": anio,
                "mes": nombre_mes,
                "fecha": f"{anio}-{m_num}",
                "temp_max_c": t_max,
                "temp_min_c": t_min,
                "lluvia_mm_dia": lluvia,
                "lluvia_mm": round(lluvia * calendar.monthrange(anio, int(m_num))[1], 1) if lluvia is not None else None,
                "riesgo_helada": (t_min <= 2.5) if t_min is not None else None,
                "humedad_suelo_pct": round(humedad * 100, 1) if humedad is not None else None,
                "cultivo_principal": cultivo_anio,
                "codigo_cdl": info_merc.get("codigo_cdl"),
                "precio_usd_ton": info_merc.get("precio_usd_ton")
            })

    # Build monthly rainfall normals from the 2015-2024 NASA POWER archive.
    lluvia_por_mes = {}
    for month in range(1, 13):
        values = [
            row["lluvia_mm_dia"] for row in historial_unificado
            if int(row["fecha"].split("-")[1]) == month and row["lluvia_mm_dia"] is not None
        ]
        lluvia_por_mes[month] = float(np.mean(values)) if values else None
    lluvia_media_anual_mm_dia = (
        float(np.mean([v for v in lluvia_por_mes.values() if v is not None]))
        if any(v is not None for v in lluvia_por_mes.values()) else 0.0
    )
    try:
        fecha_inicio_ciclo = date.fromisoformat(str(fecha_siembra)) if fecha_siembra else date.today()
    except ValueError:
        raise ValueError("fecha_siembra must use YYYY-MM-DD.")

    lluvia_por_cultivo = {}
    for crop, crop_info in CATALOGO_CULTIVOS.items():
        cycle = calcular_lluvia_ciclo(fecha_inicio_ciclo, crop_info["ciclo_dias"], lluvia_por_mes)
        if cycle["completo"] and crop_info["ciclo_dias"] > 0:
            cycle["factor_estacional"] = factor_lluvia_estacional(
                cycle["lluvia_ciclo_mm"], crop_info["ciclo_dias"], lluvia_media_anual_mm_dia
            )
        else:
            cycle["factor_estacional"] = 1.0
        lluvia_por_cultivo[crop] = cycle

    # Score only when the required climate and soil inputs are actually present.
    clima_2024 = [row for row in historial_unificado if row["anio"] == 2024]
    humedad_valid = [row["humedad_suelo_pct"] for row in clima_2024 if row["humedad_suelo_pct"] is not None]
    temp_valid = [row["temp_max_c"] for row in clima_2024 if row["temp_max_c"] is not None]
    missing_data = []
    if len(humedad_valid) < 9:
        missing_data.append("NASA POWER GWETTOP: at least 9 valid monthly observations in 2024 are required.")
    if len(temp_valid) < 9:
        missing_data.append("NASA POWER T2M_MAX: at least 9 valid monthly observations in 2024 are required.")
    if any(not profile["completo"] for crop, profile in lluvia_por_cultivo.items() if CATALOGO_CULTIVOS[crop]["ciclo_dias"] > 0):
        missing_data.append("NASA POWER PRECTOTCORR: monthly rainfall normals are incomplete for at least one crop cycle.")
    for key, label in (
        ("materia_organica_pct", "Soil organic matter (SSURGO or local lab)"),
        ("retencion_agua_awc", "Available water capacity (SSURGO)"),
        ("factor_erosion_k", "Soil erodibility K factor (SSURGO)")
    ):
        if suelo.get(key) is None:
            missing_data.append(f"{label} is unavailable.")

    if suelo.get("error_consulta"):
        missing_data.append(f"USDA Soil Data Access query error: {suelo['error_consulta']}")

    data_quality = {
        "pilot_id": None if pid == "custom-coord" else pid,
        "soil_query_error": suelo.get("error_consulta"),
        "climate_valid_months_2024": {
            "temperature_max": len(temp_valid),
            "topsoil_moisture": len(humedad_valid)
        },
        "rainfall_climatology": {
            "source": "NASA POWER PRECTOTCORR monthly normals, 2015-2024",
            "planting_date": fecha_inicio_ciclo.isoformat(),
            "monthly_normals_available": sum(v is not None for v in lluvia_por_mes.values()),
            "interpretation": "Climatological expectation, not a deterministic weather forecast."
        },
        "soil_source": suelo.get("fuente"),
        "soil_is_field_verified": bool(suelo.get("cobertura_verificada")),
        "crop_history_status": "pilot reference dataset; provenance requires verification" if pid != "custom-coord" else "unavailable for custom coordinates",
        "crop_history_is_observed": False
    }
    if missing_data:
        return {
            "status": "insufficient-data",
            "model_version": "CosoNASA-Mamdani-28Rules",
            "coordinates": {"lat": lat, "lon": lon},
            "location": lugar,
            "soil_properties": suelo,
            "local_groundwater_usgs": agua_usgs,
            "data_quality": data_quality,
            "missing_data": missing_data,
            "rotation_strategies": [],
            "crop_ranking": [],
            "historical_series_10y": historial_unificado,
            "rainfall_by_crop_cycle": lluvia_por_cultivo,
            "message": "No recommendation was generated because required observations are missing. No substitute climate or soil values were invented."
        }

    hum_media_2024 = float(np.mean(humedad_valid))
    temp_pico_2024 = float(np.max(temp_valid))
    om_pct = float(suelo["materia_organica_pct"])
    awc = float(suelo["retencion_agua_awc"])
    erosion_k = float(suelo["factor_erosion_k"])

    agua_n = float(np.clip((hum_media_2024 / 75.0) * 0.75 + (awc / 0.20) * 0.25, 0.0, 1.0))
    calor_n = float(np.clip((temp_pico_2024 - 15.0) / 30.0, 0.0, 1.0))
    suelo_n = float(np.clip((om_pct / 2.0) * 0.7 + ((0.45 - erosion_k) / 0.30) * 0.3, 0.0, 1.0))

    if pid == "custom-coord":
        # A neutral prior is explicitly disclosed; no synthetic crop history is returned.
        mono_n = 2.0
        monoculture_assumption = "Neutral prior (2/4); actual crop history unavailable."
    else:
        crop_history = info_base.get("cultivos", {})
        last_crop = crop_history.get("2024")
        consecutive_years = 0
        for year in range(2024, 2014, -1):
            if crop_history.get(str(year)) == last_crop:
                consecutive_years += 1
            else:
                break
        mono_n = float(min(consecutive_years, 4))
        monoculture_assumption = "Derived from the pilot reference dataset; crop-history provenance is not independently verified."

    score_fis_actual = evaluar_cosonasa_28(agua_n, calor_n, suelo_n, mono_n)
    estrategias, ranking_cultivos = simular_estrategias_predictivas(
        cultivo_reciente, agua_n, calor_n, suelo_n, mono_n, prioridad,
        lluvia_por_cultivo=lluvia_por_cultivo
    )
    estrategias = agregar_calendario_lluvia_estrategias(
        estrategias, fecha_inicio_ciclo, lluvia_por_mes
    )

    return {
        "status": "ok",
        "model_version": "CosoNASA-Mamdani-28Rules",
        "coordinates": {"lat": lat, "lon": lon},
        "location": lugar,
        "soil_properties": suelo,
        "local_groundwater_usgs": agua_usgs,
        "data_quality": {
            **data_quality,
            "monoculture_input": monoculture_assumption,
            "recommendations_are_exploratory": True
        },
        "model_reliability": {
            "architecture": "Mamdani fuzzy inference system; 28 authored rules with all 81 discrete antecedent combinations covered.",
            "validation_status": "Not independently validated. No benchmark accuracy, R2, MAPE or error margin is claimed.",
            "rule_count": len(REGLAS_COSONASA_28)
        },
        "fuzzy_evaluation": {
            "inputs": {
                "Disponibilidad_Hidrica": round(agua_n, 3),
                "Estres_Termico": round(calor_n, 3),
                "Salud_suelo": round(suelo_n, 3),
                "Historial_Monocultivo": mono_n
            },
            "suitability_score": score_fis_actual,
            "category": "Optimal" if score_fis_actual >= 60 else ("Acceptable" if score_fis_actual >= 40 else "Low suitability")
        },
        "rotation_strategies": estrategias,
        "crop_ranking": ranking_cultivos,
        "rainfall_by_crop_cycle": lluvia_por_cultivo,
        "historical_series_10y": historial_unificado
    }
