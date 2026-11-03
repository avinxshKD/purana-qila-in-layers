import test from 'node:test';
import assert from 'node:assert/strict';
import {formatSourceDate,formatCitation} from '../src/site/content.js';
test('ISO source dates use explicit UTC English day-month-year labels',()=>{
  assert.equal(formatSourceDate('2023-05-30'),'30 May 2023');
  assert.equal(formatSourceDate('2024-06-01'),'1 Jun 2024');
});
test('non-ISO and ambiguous source dates remain verbatim',()=>{
  for(const text of ['2023–24','01/02/2026','2026-02-30'])assert.equal(formatSourceDate(text),text);
});
test('drawer citations use research shortCite when present and retain fallback otherwise',()=>{
  const evidence={sourceId:'P1',page:357};
  assert.equal(formatCitation(evidence,{}),'P1 · 357');
  assert.equal(formatCitation(evidence,{shortCite:'Swarnkar and Bal'}),'Swarnkar and Bal, p.357');
  assert.equal(formatCitation({sourceId:'P2',page:'web release, unpaginated'},{shortCite:'PIB'}),'PIB, web release, unpaginated');
});
