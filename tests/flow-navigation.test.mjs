import test from 'node:test';
import assert from 'node:assert/strict';
import { limitarPaso, PASOS, resolverAncla } from '../src/lib/flowNavigation.js';

test('El recorrido principal contiene tres etapas diferenciadas', () => {
  assert.deepEqual(PASOS.map((paso) => paso.id), ['explorar', 'entender', 'decidir']);
});
test('Las anclas originales navegan a la etapa pertinente', () => {
  for (const id of ['resumen', 'mapa', 'etapa-1']) assert.deepEqual(resolverAncla(id).paso, 0);
  for (const id of ['senales', 'diagnostico', 'etapa-2']) assert.equal(resolverAncla(id).paso, 1);
  for (const id of ['strategies', 'etapa-3']) assert.equal(resolverAncla(id).paso, 2);
});
test('La navegación avanzada abre las herramientas concretas', () => {
  for (const id of ['datos', 'integracion', 'evidencias-p1', 'comparacion-fuentes', 'motor-p2']) {
    assert.equal(resolverAncla(`#${id}`).vista, 'laboratorio');
  }
  assert.equal(resolverAncla('#datos').tab, 'nasa');
  assert.equal(resolverAncla('#comparacion-fuentes').tab, 'p1');
  assert.equal(resolverAncla('#motor-p2').tab, 'p2');
});
test('Las anclas ajenas al recorrido no se interceptan', () => {
  assert.equal(resolverAncla('#contenido'), null);
  assert.equal(resolverAncla(''), null);
  assert.equal(resolverAncla('#desconocido'), null);
});
test('El paso solicitado se mantiene dentro de los límites', () => {
  assert.equal(limitarPaso(-7), 0);
  assert.equal(limitarPaso(100), 2);
  assert.equal(limitarPaso(1.9), 1);
  assert.equal(limitarPaso(Number.NaN), 0);
});
