# Field Shift 3.8.1 — USDA soil lookup fix

This patch is based on **Field Shift 3.8**. It addresses backend errors when the official USDA NRCS Soil Data Access service replies with HTTP 500, times out, or returns incomplete data.

## Qué se corrigió

- La consulta USDA ahora usa **dos fases**: primero identifica la unidad cartográfica (MUKEY) mediante `SDA_Get_Mukey_from_intersection_with_WktWgs84`, y después consulta su componente/horizonte principal. Evita hacer todo en una sola consulta espacial y tabular.
- Si USDA responde con un error, FastAPI entrega **HTTP 503 con un mensaje controlado**, no una excepción interna sin explicación. El frontend presenta el aviso sin interrumpir el asistente.
- Si la búsqueda geográfica funciona pero falla la consulta de atributos, la ficha muestra el nombre/MUKEY y marca los atributos como no disponibles, **sin inventar valores**.
- Los fallos temporales y respuestas parciales no quedan en caché durante 12 horas. Solo se guardan consultas completas y casos confirmados sin cobertura.
- El reporte PDF y el panel de fuentes distinguen las respuestas parciales.
- No se modifican el mapa, NASA POWER, el modelo de P2, los datos P1 ni las estrategias existentes.

## Instalación en Windows

Extrae el ZIP completo **en una carpeta nueva**. No mezcles el backend 3.8 anterior con el frontend 3.8.1. Abre dos terminales en la carpeta `field-shift`:

**Terminal 1 — FastAPI**

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — Vite**

```cmd
npm install
npm run dev
```

Abre http://localhost:5173 . Comprueba primero http://127.0.0.1:8000/api/health (debe responder `status: ok` y `version: 3.8.1`).

1. **My Field → Fresno**.
2. **Field Conditions → Check USDA soil mapping → Check this location**.
3. Posibles resultados: información cartográfica, información parcial, sin cobertura o mensaje temporal de servicio no disponible.
4. Independientemente de USDA, la aplicación debe continuar navegable y NASA POWER debe seguir funcionando.

## Pruebas

```cmd
npm test
py -m unittest discover -s backend\tests -v
npm run build
```

Las pruebas de servicios externos usan respuestas simuladas para ejercitar fallos y datos faltantes. **No se ha podido validar una llamada real a USDA desde el entorno de construcción**, por lo que esta versión mejora la recuperación y puede resolver el problema de SQL, pero no garantiza que el servicio externo esté disponible en el momento de probarlo.

Si aparece un aviso de indisponibilidad, anota el código HTTP en DevTools → Network → `fields/soil` y revisa la salida de la terminal de FastAPI. La API no requiere clave para esta consulta pública, pero su disponibilidad depende de USDA.
