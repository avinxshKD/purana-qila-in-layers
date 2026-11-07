import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Phones held sideways get the turn-upright screen; desktop windows (pointer: fine) never do.
const css=fs.readFileSync(new URL('../src/site/site.css',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../site.html',import.meta.url),'utf8'),main=fs.readFileSync(new URL('../src/site/main.js',import.meta.url),'utf8');
const QUERY='(orientation: landscape) and (max-height: 500px) and (pointer: coarse)';
test('turn-upright screen: markup, the coarse-pointer landscape query in CSS and script, and the inert page under it',()=>{
  assert.match(html,/<section id="rotate-screen"[^>]*><h1 id="rotate-title"><\/h1><p>Turn your phone upright to explore the layers\.<\/p><button data-panel="film">Watch the film<\/button><\/section>/);
  assert.ok(css.includes('.rotate-screen{display:none}'),'hidden by default');
  assert.ok(css.includes(QUERY.replace(/: /g,':').replace('(orientation:landscape) and','@media(orientation:landscape) and')),'CSS query');
  assert.ok(main.includes(`matchMedia('${QUERY}')`),'script query matches the CSS one');
  assert.match(main,/underRotate=\['#viewport','header','\.era-panel','\.scrubber'\]/);
});
