import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararEntregableP1, fuentesDisponibles } from '../src/lib/multiSourceIntake.js';
const ids = ['fresno-01','bakersfield-02','davis-03'];
function fixture() {
  return {
    parcelas: [{
      id: 'fresno-01', nombre: 'Fresno Sur', lat:36.7468, lon:-119.7726,
      clima_mensual: [
        { mes: 'Enero', humedad_smap_m3m3: 0.23 },
        { mes: 'Febrero', humedad_smap_m3m3: 0.18 },
        { mes: 'Marzo', humedad_smap_m3m3: -999 },
      ],
      suelo_ssurgo: { textura:'Franco-arcilloso', materia_organica_pct:1.1, retencion_agua:'Alta',riesgo_erosion:'Medio'},
      historial_cropscape: ['2023: Algodón','2024: Tomate','2025: Tomate'],
      datos_procedencia: {
        smap: { fuente:'NASA SMAP', producto:'SPL4SMGP', periodo:'2025', anio:2025, resolucion_km:9, unidad:'m3/m3', url:'https://nsidc.org' },
        ssurgo: { fuente:'USDA SSURGO', periodo:'2024', unidad:'por propiedad', metodo:'Asociación a unidad de mapa SSURGO', mukey:'123',url:'https://nrcs.usda.gov' },
        cropscape: { fuente:'USDA CropScape CDL', periodo:'2023-2025', resoluciones_por_anio:{'2023':30,'2024':10,'2025':10}, unidad:'clasificación anual',url:'https://nass.usda.gov' },
      },
    }],
  };
}

test('importa y convierte SMAP volumétrico sin interpolar meses vacíos', () => {
  const res=prepararEntregableP1(fixture(),ids);
  assert.equal(res.valido,true);
  assert.equal(res.fuentes,3);
  const serie=res.porParcela['fresno-01'].smap.serie;
  assert.equal(serie.length,12);
  assert.equal(serie[0].humedad,23);
  assert.equal(serie[1].humedad,18);
  assert.equal(serie[2].humedad,null);
  assert.equal(serie[3].humedad,null);
  assert.equal(res.porParcela['fresno-01'].smap.disponibles,2);
});
test('fuentes SSURGO / CropScape se cargan sin inferir meses de suelo desnudo', () => {
  const res=prepararEntregableP1(fixture(),ids);
  const p=res.porParcela['fresno-01'];
  assert.deepEqual(fuentesDisponibles(p),['smap','ssurgo','cropscape']);
  assert.equal(p.ssurgo.suelo.materia_organica_pct,1.1);
  assert.equal(p.cropscape.registros[0].anio,2023);
  assert.equal(p.meses_suelo_desnudo,undefined);
});
test('nunca importa ID desconocido o altera coordenadas originales', () => {
  const src=fixture();src.parcelas[0].id='new-parcel';
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.valido,false);
  assert.equal(res.fuentes,0);
});
test('bloquea datasets con IDs duplicados', () => {
  const src=fixture();src.parcelas.push({...src.parcelas[0]});
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.valido,false);
  assert.match(res.errores.join(' '),/duplicado/);
});
test('SMAP rechaza percentiles disfrazados de humedad (%)', () => {
  const src=fixture();
  const p=src.parcelas[0];p.datos_procedencia.smap.unidad='%';p.datos_procedencia.smap.metodo='percentil normalizado';
  p.clima_mensual=[{mes:'Enero',humedad_smap_pct:30}];
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.porParcela['fresno-01'].smap,undefined);
  assert.equal(res.fuentes,2);
});
test('permite % volumétrico con método documentado', () => {
  const src=fixture();
  const p=src.parcelas[0];p.datos_procedencia.smap.unidad='%';p.datos_procedencia.smap.metodo='contenido volumétrico m3/m3 x 100';
  p.clima_mensual=[{mes:'Enero',humedad_smap_pct:21.4}];
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.porParcela['fresno-01'].smap.serie[0].humedad,21.4);
});
test('valores de SMAP fuera de rango cancelan solo la fuente afectada', () => {
  const src=fixture();src.parcelas[0].clima_mensual[0].humedad_smap_m3m3=2;
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.porParcela['fresno-01'].smap,undefined);
  assert.deepEqual(fuentesDisponibles(res.porParcela['fresno-01']), ['ssurgo','cropscape']);
});
test('rechaza meses repetidos y exige año SMAP específico', () => {
  const src=fixture();src.parcelas[0].clima_mensual.push({mes:'Enero',humedad_smap_m3m3:.4});
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.porParcela['fresno-01'].smap,undefined);
  const src2=fixture();delete src2.parcelas[0].datos_procedencia.smap.anio;
  const res2=prepararEntregableP1(src2,ids);
  assert.equal(res2.porParcela['fresno-01'].smap,undefined);
});
test('ignora procedencias con URL insegura en vez de abrirlas', () => {
  const src=fixture();src.parcelas[0].datos_procedencia.ssurgo.url='javascript:alert(1)';
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.valido,true);
  assert.equal(res.porParcela['fresno-01'].ssurgo.meta.url,'');
  assert.match(res.avisos.join(' '),/provenance URL is missing/);
});
test('descarta una fuente sin metadatos completos sin contaminar otras', () => {
  const src=fixture();delete src.parcelas[0].datos_procedencia.cropscape.periodo;
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.fuentes,2);
  assert.equal(res.porParcela['fresno-01'].cropscape,undefined);
});
test('rechaza root vacío, coordenadas malas y registros CropScape repetidos', () => {
  assert.equal(prepararEntregableP1({},ids).valido,false);
  const src=fixture();src.parcelas[0].lat=1000;
  assert.equal(prepararEntregableP1(src,ids).valido,false);
  const src2=fixture();src2.parcelas[0].historial_cropscape.push('2025: Algodón');
  const res2=prepararEntregableP1(src2,ids);
  assert.equal(res2.porParcela['fresno-01'].cropscape,undefined);
});

test('si las coordenadas de P1 difieren no cambia geometría y se advierte explícitamente', () => {
  const src=fixture();src.parcelas[0].lat=36.8;
  const res=prepararEntregableP1(src,ids,{'fresno-01':{lat:36.7468,lon:-119.7726}});
  assert.equal(res.valido,true);
  assert.equal(res.porParcela['fresno-01'].coordenadasP1.lat,36.8);
  assert.match(res.avisos.join(' '),/differ from the pilot point/);
});
test('el archivo sintético queda rotulado como ejemplo y no como dato auditado', () => {
  const src=fixture();src.tipo_dato='demo';
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.porParcela['fresno-01'].modoEjemplo,true);
});
test('CropScape mixto 2023–2025 necesita resolución por año', () => {
  const src=fixture();delete src.parcelas[0].datos_procedencia.cropscape.resoluciones_por_anio;
  src.parcelas[0].datos_procedencia.cropscape.resolucion_m=10;
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.porParcela['fresno-01'].cropscape,undefined);
  assert.match(res.avisos.join(' '),/resoluciones_por_anio/);
});

test('descarta metadatos objeto que podrían romper React', () => {
  const src=fixture(); src.parcelas[0].datos_procedencia.ssurgo.mukey={ malicioso:'objeto' };
  const res=prepararEntregableP1(src,ids);
  assert.equal(res.valido,true);
  assert.equal(res.porParcela['fresno-01'].ssurgo.meta.mukey,'');
});
