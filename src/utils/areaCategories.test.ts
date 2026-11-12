// Uji unit fungsi murni area peta. Jalankan dengan: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREA_MAX_SPAN_M, areaCacheKey, areaSpanMeters } from './areaCategories.ts';

test('areaSpanMeters memakai sisi terpanjang area', () => {
  const span = areaSpanMeters({ west: 106.8, east: 106.9, south: -6.2, north: -6.1 });
  assert.ok(span > 10000 && span < 12000, String(span));
  assert.ok(span > AREA_MAX_SPAN_M);
  const small = areaSpanMeters({ west: 106.82, east: 106.83, south: -6.18, north: -6.17 });
  assert.ok(small < AREA_MAX_SPAN_M);
});

test('areaCacheKey stabil untuk geseran sangat kecil dan berbeda per zoom', () => {
  const a = { west: 106.82001, east: 106.83001, south: -6.18001, north: -6.17001 };
  const b = { west: 106.82002, east: 106.83002, south: -6.18002, north: -6.17002 };
  assert.equal(areaCacheKey(a, 15), areaCacheKey(b, 15));
  assert.notEqual(areaCacheKey(a, 15), areaCacheKey(a, 16));
});
