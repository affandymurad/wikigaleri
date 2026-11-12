// Uji unit fungsi murni "Kategori di area ini". Jalankan dengan: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA_MAX_SPAN_M,
  areaCacheKey,
  areaSpanMeters,
  categoryKey,
  countCategories,
  filterAreaCategories,
  inferAreaCategories,
  isMaintenanceCategory,
  mergeAreaCategories,
  normalizeAreaCategoryName,
} from './areaCategories.ts';

const file = (...categories: string[]) => ({ title: 'File:x.jpg', categories });

test('normalizeAreaCategoryName membuang awalan, garis bawah, dan spasi ganda', () => {
  assert.equal(normalizeAreaCategoryName('Category:Monumen_Nasional'), 'Monumen Nasional');
  assert.equal(normalizeAreaCategoryName('Kategori:  Gambir   Station '), 'Gambir Station');
  assert.equal(normalizeAreaCategoryName(''), '');
});

test('countCategories menghitung satu foto sekali per kategori dan mengurutkan terbanyak dulu', () => {
  const counts = countCategories([
    file('Category:Monas', 'Category:Monas', 'Category:Jakarta'),
    file('Category:Monas'),
    file('Category:Jakarta', 'Category:Alpha'),
  ]);
  assert.deepEqual(counts, [
    { name: 'Monas', count: 2 },
    { name: 'Jakarta', count: 2 },
    { name: 'Alpha', count: 1 },
  ].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)));
});

test('countCategories pada daftar kosong menghasilkan daftar kosong', () => {
  assert.deepEqual(countCategories([]), []);
});

test('isMaintenanceCategory mengenali kategori pemeliharaan umum', () => {
  for (const name of [
    'Taken with Canon EOS 5D',
    'Uploaded via Mobile Web',
    'CC-BY-SA-4.0',
    'Self-published work',
    'Files by Someone',
    'Pages with maps',
  ]) {
    assert.equal(isMaintenanceCategory(name), true, name);
  }
  for (const name of ['Monumen Nasional', 'Central Jakarta', 'Betawi culture']) {
    assert.equal(isMaintenanceCategory(name), false, name);
  }
});

test('filterAreaCategories membuang kategori tunggal hanya bila area berisi banyak foto', () => {
  const counts = [
    { name: 'Monas', count: 5 },
    { name: 'Only one', count: 1 },
  ];
  assert.deepEqual(filterAreaCategories(counts, 20).map((c) => c.name), ['Monas']);
  assert.deepEqual(filterAreaCategories(counts, 3).map((c) => c.name), ['Monas', 'Only one']);
});

test('filterAreaCategories memakai ambang dan pola yang bisa diubah, serta memotong sampai maxResults', () => {
  const counts = [
    { name: 'A', count: 9 },
    { name: 'B', count: 3 },
    { name: 'Skip me', count: 8 },
  ];
  const out = filterAreaCategories(counts, 100, { patterns: [/^skip/i], minCategoryCount: 5, maxResults: 5 });
  assert.deepEqual(out.map((c) => c.name), ['A']);
  assert.equal(filterAreaCategories(counts, 100, { patterns: [], minCategoryCount: 1, maxResults: 2 }).length, 2);
});

test('inferAreaCategories: pemeliharaan dibuang, kategori umum tetap', () => {
  const files = Array.from({ length: 10 }, (_, i) =>
    file('Category:Monas', 'Category:CC-BY-SA-4.0', 'Category:Taken with Canon', ...(i < 3 ? ['Category:Jakarta'] : []), ...(i === 0 ? ['Category:Only one'] : []))
  );
  assert.deepEqual(inferAreaCategories(files), [
    { name: 'Monas', count: 10 },
    { name: 'Jakarta', count: 3 },
  ]);
});

test('categoryKey tidak membedakan huruf besar/kecil, awalan, atau garis bawah', () => {
  assert.equal(categoryKey('Category:Monumen_nasional'), categoryKey('monumen Nasional'));
});

test('mergeAreaCategories membuang duplikat dan menandai sumber', () => {
  const merged = mergeAreaCategories(
    [
      { name: 'Monumen Nasional', count: 9 },
      { name: 'Central Jakarta', count: 28 },
    ],
    [
      { name: 'Monumen_Nasional', label: 'Monumen Nasional' },
      { name: 'Gambir Station', label: 'Stasiun Gambir' },
      { name: 'Gambir Station' },
    ]
  );
  assert.deepEqual(
    merged.map((m) => [m.name, m.count, m.fromPhotos, m.fromWikidata]),
    [
      ['Central Jakarta', 28, true, false],
      ['Monumen Nasional', 9, true, true],
      ['Gambir Station', 0, false, true],
    ]
  );
  assert.equal(merged.find((m) => m.name === 'Gambir Station')?.wikidataLabel, 'Stasiun Gambir');
});

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
