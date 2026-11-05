import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSvg } from './svgCleaner.js';

test('cleanSvg strips markdown code fences and preserves inner shapes', () => {
  const fenced = '```xml\n<svg width="400" height="200"><circle cx="50" cy="50" r="40" fill="red" /></svg>\n```';
  const result = cleanSvg(fenced);

  assert.equal(result.isValid, true);
  assert.equal(result.svgHtml.includes('```'), false);
  assert.equal(result.svgHtml.includes('<circle cx="50" cy="50" r="40" fill="red" />'), true);
  assert.equal(result.viewBox, '0 0 400 200');
  assert.equal(result.svgHtml.includes('xmlns="http://www.w3.org/2000/svg"'), true);
});

test('cleanSvg synthesizes viewBox when missing from width/height', () => {
  const raw = '<svg width="500" height="300"><rect width="100" height="100" fill="blue" /></svg>';
  const result = cleanSvg(raw);

  assert.equal(result.isValid, true);
  assert.equal(result.viewBox, '0 0 500 300');
  assert.equal(result.svgHtml.includes('viewBox="0 0 500 300"'), true);
});

test('cleanSvg handles HTML-encoded tags', () => {
  const encoded = '&lt;svg viewBox="0 0 100 100"&gt;&lt;path d="M10 10 H 90 V 90 H 10 Z" fill="orange"/&gt;&lt;/svg&gt;';
  const result = cleanSvg(encoded);

  assert.equal(result.isValid, true);
  assert.equal(result.viewBox, '0 0 100 100');
  assert.equal(result.svgHtml.includes('<path d="M10 10 H 90 V 90 H 10 Z"'), true);
});
