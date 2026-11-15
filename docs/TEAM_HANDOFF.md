# Field Shift 4.5.2 Stable — Entrega al equipo

**Estado:** paquete de trabajo estable para continuar desarrollo. **No es una certificación científica ni una aplicación de producción con disponibilidad garantizada.**

## 1. ¿Qué contiene esta entrega?

- Aplicación React 19 + Vite 7 + Tailwind 4 + React-Leaflet + Recharts, en **inglés** para agricultores y jueces.
- Backend FastAPI para solicitudes por coordenadas (NASA POWER, USDA Soil Data Access y CDL) y opción local de AppEEARS / Market News con autenticación privada.
- Experiencia actual de **3 pasos**: **My Field → Field Conditions → My Options**. Los paneles de fuentes, importación, gráficas y modelos están en **Data & Details**. **NO se implementó el paso 4 opcional** ni el rediseño solicitado; ver `AI_HANDOFF.md`.
- Tres parcelas piloto (Fresno, Bakersfield y Davis), coordenadas globales, datos del equipo 2015–2024 y ejemplos DEMO rotulados.
- Una **muestra NASA SMAP L4 v8 entregada por AppEEARS para Fresno (2024)**: 2,928 observaciones, 12 meses, punto (36.7468, -119.7726). Se carga voluntariamente en **Data & Details → NASA SMAP → Load supplied Fresno sample**. No altera estrategias P2 ni alertas DEMO.
- Configuración Docker/Render para desplegar React + FastAPI bajo un único dominio HTTPS. **No se ha desplegado ningún enlace público desde este paquete.**

## 2. Arranque local (Windows, dos terminales)

Descomprimir el ZIP y abrir CMD o PowerShell **dentro de `field-shift/`**.

**Backend**

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

Verificar `http://127.0.0.1:8000/api/health`: versión `4.5.2`.

**Frontend (otra terminal)**

```cmd
npm install
npm run dev
```

Abrir la URL que muestre Vite, normalmente `http://localhost:5173`. Usar **Node >= 20.19**, Python 3.12 es el runtime de producción del Dockerfile (el código de backend también se probó con Python 3.13). Para apagar, `Ctrl+C` en las dos terminales.

**Comprobación de entrega**

```cmd
npm test
npm run build
py -m unittest discover -s backend/tests -p "test_*.py"
```

`npm run build` debe comprobarse en un equipo con acceso al registro npm. En el entorno de creación no había dependencias Vite instaladas y no se pudo certificar el build; sí pasaron las pruebas unitarias de código. Un servidor de prueba puede quedar bajo `http://127.0.0.1:8000` después de compilar (FastAPI sirve `dist/`).

## 3. Recorrido de comprobación funcional

1. **My Field**: cambiar entre Fresno/Bakersfield/Davis; comprobar mapa y ubicación. Elegir coordenadas internacionales para validar que no heredan datos de California.
2. **Field Conditions**: comprobar NASA POWER y USDA Soil, luego USDA Crop Map (dependen de disponibilidad de terceros). Una respuesta sin cobertura debe mostrarse como ausencia de datos, no como cero.
3. **My Options**: prioridades y escenarios **demo**; revisar límites y exportación PDF.
4. **Data & Details → NASA SMAP**: seleccionar Fresno y año **2024**, pulsar **Load supplied Fresno sample**. Deben aparecer 12 meses de humedad volumétrica (`m³/m³`) y la procedencia AppEEARS. **No aplicar** a otros puntos/años. Consultar NASA POWER 2024 para habilitar el cruce descriptivo de fuentes en Assessment; no es estrés hídrico validado.
5. **Data & Details → Market News**: apertura de panel y CSV manual; API autenticada solo en entorno local, con clave propia.
6. **Judge demo**: recorrer los 3 pasos; verificar report PDF sin atribuir SMAP a ubicación distinta.

## 4. ¿Qué se conecta realmente?

| Fuente | Estado / límites |
|---|---|
| NASA POWER | Consulta oficial bajo demanda por coordenada y año, **no** estación en campo ni tiempo real instantáneo. |
| USDA SSURGO | Consulta bajo demanda para ubicaciones cubiertas (principalmente EE. UU.); cartografía, no análisis de laboratorio. |
| USDA CDL/CropScape | Clase por píxel y año (EE. UU.), no cultivo verificado de toda la parcela. |
| NASA GIBS SMAP | Imagen por fecha (visual, no numerología del color). |
| SMAP L4 AppEEARS | **Muestra numérica incorporada Fresno 2024**; CSV de otros puntos cargable manualmente; automatización local autenticada está preparada pero debe verificarse extremo a extremo. |
| Histórico P1 | Archivo del equipo, 2015–2024, identificado como provisto/no auditado. |
| P2 | Salidas históricas y revisor de JSON; **faltan reglas, funciones de pertenencia y código ejecutable**; no hay recomendación validada para cualquier punto global. |
| USDA MyMarketNews | Importación CSV y gráfico de cotizaciones; API opcional con clave local aún pendiente de validación real; **no** alimenta automáticamente escenarios económicos. |

Los ZIP y CSV de referencia **no son un flujo de datos en tiempo real**. Las consultas oficiales se realizan bajo demanda. Los datos locales de ejemplo no equivalen a verificaciones de campo.

## 5. Despliegue público para evaluación (sin coste inicial, sujeto a plan)

Leer `README-DEPLOY-FREE.md`. El paquete incluye `Dockerfile` + `render.yaml` para **Render Free** (comprobar en el panel que sea **$0**, las condiciones del plan pueden cambiar). Procedimiento:

1. Subir **el contenido de `field-shift/`** a la raíz de un repositorio GitHub. **No subir** `.env`, tokens, contraseñas ni `backend/.private/`.
2. Render → **New → Blueprint** → repositorio → verificar **plan Free** → desplegar.
3. Verificar `https://<nombre-real>.onrender.com/api/health` y la ruta raíz. `<nombre-real>` es un ejemplo, no un enlace existente.
4. Probar desde móvil, red distinta y navegador incógnito, incluidas llamadas NASA y USDA. Mantener una demo local por si el hosting gratuito tarda en despertar.
5. El despliegue público deshabilita intencionalmente las llamadas que utilizan credenciales personales de Earthdata y MyMarketNews. No publicar credenciales compartidas.

Render gratuito no garantiza estar siempre activo ni una duración contractual. No afirmar que el enlace «dura para siempre»; conservar copia descargable.

## 6. Archivos de interés

| Ruta | Uso |
|---|---|
| `src/App.jsx` | Asistente, área avanzada y contextos compartidos |
| `src/components/overview/` | Las 3 pantallas visibles del agricultor |
| `src/components/data/DataWorkbench.jsx` | Herramientas científicas avanzadas |
| `src/components/data/SmapNumericPanel.jsx` | CSV y muestra incluida NASA |
| `src/lib/smapCsvImport.js` | Validación y agregación mensual de muestras SMAP |
| `src/lib/observedEvidence.js` | Cruce descriptivo POWER–SMAP (no diagnóstico agronómico) |
| `backend/app.py` | FastAPI, gateway, rutas y respuesta de salud |
| `public/data/smap-fresno-2024.csv` | CSV oficial entregado por usuario, en solo lectura |
| `public/data/smap-fresno-2024-provenance.json` | Procedencia sin datos personales |
| `docs/SMAP_FRESNO_2024.md` | Detalles y cautelas de la nueva muestra |
| `docs/AI_HANDOFF.md` | Tareas para siguiente desarrollador / IA |
| `docs/RELEASE_QA.md` | Comprobaciones finales y limitaciones |

## 7. Reglas para trabajar en equipo

- Crear ramas por cambio; no trabajar todos directamente sobre `main`.
- Conservar IDs/propiedades del JSON de P1/P2 salvo que se cree adaptador versionado y pruebas.
- Nunca transformar ausencias de datos en valores inventados; no unir fechas/años/ubicaciones sin validación.
- No presentar SMAP L4, CropScape, SSURGO o POWER como mediciones de la parcela a escala de sensor.
- Mantener la interfaz de agricultor simple y en inglés; documentos del equipo pueden seguir en español.
- Antes de merge: `npm test`, `npm run build`, pruebas FastAPI y recorrido manual.

**Entrega:** este ZIP es el punto de partida recomendado. Los diseños del **paso 4 opcional** y la simplificación general deben plantearse **después** del traspaso, según `docs/AI_HANDOFF.md`.
