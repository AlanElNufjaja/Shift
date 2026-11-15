# Field Shift 3.8.2 — Diagnóstico de Soil Data Access

**Propósito:** verificar por qué la consulta en vivo de USDA muestra “temporarily unavailable”. El resto del frontend no se modifica.

### 1. Actualizar proyecto

Extrae el ZIP en una carpeta nueva y utiliza sus archivos completos. Si ya tienes una versión funcionando y prefieres modificar solo el backend, sustituye únicamente `backend/soil.py` y añade `backend/diagnose_usda.py`.

### 2. Ejecutar diagnóstico de la conexión desde Windows

En la raíz `field-shift`:

```cmd
py -m pip install -r backend\requirements.txt
py backend\diagnose_usda.py
```

El diagnóstico prueba tres operaciones contra USDA para la coordenada de Fresno: una consulta SQL sencilla (formato de formulario), la búsqueda por punto (formulario) y la búsqueda por punto (JSON). **No escribe archivos, no usa claves privadas y no modifica el estado de la app.** Copia su salida para identificar el punto de fallo.

- `HTTP 200` + `Table rows` en prueba 1: USDA ejecuta SQL normal.
- `HTTP 200` + fila en prueba 2 o 3: el servicio resolvió un punto geográfico.
- `HTTP 500`: el servicio rechazó o no procesó esa consulta; comparte el fragmento de respuesta.
- `TIMEOUT` o `CONNECTION ERROR`: problema de conectividad, DNS, TLS, proxy o disponibilidad externa.
- Si prueba 1 funciona pero pruebas 2 y 3 fallan, enfocar revisión en la función espacial.

### 3. Ejecutar la aplicación y revisar logs

```cmd
py -m uvicorn backend.app:app --reload --port 8000 --log-level info
```

En otra terminal:

```cmd
npm install
npm run dev
```

Cuando pulses `Check again` en `Field Conditions`, la terminal del backend mostrará el tipo de error y si se produjo en la búsqueda espacial o de atributos. El mensaje de la UI seguirá siendo seguro y legible para el agricultor.

### 4. Pruebas realizadas

- `py -m unittest discover -s backend\tests` (20 de 20, simuladas)
- `npm test` (comprobar en la instalación)
- `npm run build` (comprobar en la instalación)

La conexión real con USDA **no se pudo probar** en el entorno de desarrollo porque no había resolución DNS hacia su dominio. No se debe afirmar que el servicio volvió a funcionar sin ejecutar este diagnóstico en una conexión externa.

Referencia: [USDA Soil Data Access Web Service Help](https://sdmdataaccess.nrcs.usda.gov/WebServiceHelp.aspx) y [soilDB SDA_query.R](https://github.com/ncss-tech/soilDB/blob/master/R/SDA_query.R).
