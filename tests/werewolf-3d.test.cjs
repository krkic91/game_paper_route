'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('werewolf 3D removes eliminated people and explicitly labels their seats', () => {
  const A = { editions: {}, editionHelpers: { selected: () => false, text: el => el?.textContent || '' } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/3d/extended-tables.js'), 'utf8'), { window: { Arcade3D: A } });
  const seats = Array.from({ length: 8 }, (_, id) => ({
    matches: selector => id === 2 && selector === '.is-eliminated',
    querySelector: selector => ({ textContent: selector.includes('identity') ? (id === 2 ? 'Ma sói' : 'Chưa rõ vai') : '' }),
  }));
  const objects = A.editions.werewolf().read({ all: () => seats });
  assert.equal(objects.filter(item => item.model === 'person').length, 7);
  assert.equal(objects.some(item => item.key === 'person-2'), false);
  assert.match(objects.find(item => item.key === 'name-2').text, /Đã bị loại/);
  assert.equal(objects.filter(item => item.key.startsWith('villager-')).length, 8);
});
