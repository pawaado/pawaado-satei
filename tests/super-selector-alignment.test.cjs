'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const supers=fs.readFileSync(path.join(root,'resistance_patch.js'),'utf8');

test('variable-score super selectors align with unacquired skill candidate selectors',()=>{
  // Both rows must use the same four-track grid (name, label, numeric selector, remove).
  const tracks='minmax(0,1fr) 21px 44px 34px';
  assert(css.includes('.skill-candidate-row{display:grid;grid-template-columns:'+tracks+';align-items:center;gap:3px;'));
  assert(css.includes('.super-controls{display:grid;grid-template-columns:'+tracks+';gap:3px;'));

  // The old super-only framed inset moved the left edge and shrank the name field.
  assert(css.includes('.extra-resistance-group{padding:0;border:0;border-radius:0;background:transparent}'));
  assert(css.includes('.super-name-field{grid-column:1;grid-row:1}'));
  assert(css.includes('.super-level-field{display:contents}'));
  assert(css.includes('.super-level-label{grid-column:2;grid-row:1;'));
  assert(css.includes('.super-level-control{grid-column:3;grid-row:1}'));
  assert(css.includes('.extra-resistance-group-remove{display:block;grid-column:4;grid-row:1;margin:0;width:34px;'));

  // Reuse candidate button dimensions and arrow offsets in both selector windows.
  assert(css.includes('.super-name-control .custom-select-button{font-size:clamp(12px,3.4vw,14px);letter-spacing:-.045em;padding:8px 15px 8px 7px}'));
  assert(css.includes('.super-name-control .custom-select-button::after{right:5px;width:7px;height:7px}'));
  assert(css.includes('.super-level-control .custom-select-button{padding:8px 15px 8px 6px;font-size:clamp(11px,3vw,13px);letter-spacing:-.04em}'));
  assert(css.includes('.super-level-control .custom-select-button::after{right:6px;width:7px;height:7px}'));
  assert(css.includes('.super-custom-select .custom-select-button{height:52px;min-height:52px}'));

  // Narrow phones also share one grid width, not two independently maintained widths.
  assert(css.includes('.skill-candidate-row,.super-controls{grid-template-columns:minmax(0,1fr) 20px 44px 34px;gap:3px}'));

  // The existing interactive markup stays intact; the change is visual only.
  assert(supers.includes('class="super-field super-name-field"'));
  assert(supers.includes('class="super-field super-level-field"'));
  assert(supers.includes("superSelectControlHtml('level',levelOptions,'')"));
  assert.match(html,/style\.css\?v=20\d{6}-[a-z0-9-]+/, 'the stylesheet must use a dated cache-busting version');
});

test('empty candidate and super rows keep the same four columns as selected rows',()=>{
  const tracks='minmax(0,1fr) 21px 44px 34px';
  assert(css.includes('.super-controls{display:grid;grid-template-columns:'+tracks+';gap:3px;'));
  assert(css.includes('.skill-candidate-row{display:grid;grid-template-columns:'+tracks+';align-items:center;'));
  // No selected/unselected-specific grid-width overrides may shift the selectors.
  assert(!css.includes('.extra-resistance-group:not(.has-super-name) .super-controls,'));
  assert(!css.includes('.skill-candidate-row:not(.has-skill){'));
  // The super row's delete button hides visually without disappearing from layout.
  assert(css.includes('.extra-resistance-group:not(.has-super-name) .extra-resistance-group-remove{visibility:hidden;pointer-events:none}'));
  // The skill candidate row uses a same-size invisible placeholder until selected.
  assert(css.includes('.skill-candidate-remove-placeholder{display:block;width:34px;height:48px}'));
  const candidates=fs.readFileSync(path.join(root,'script.js'),'utf8');
  assert(candidates.includes('skill-candidate-remove-placeholder'));
  assert(supers.includes('class="secondary extra-resistance-group-remove"'));
  assert(css.includes('.skill-candidate-row,.super-controls{grid-template-columns:minmax(0,1fr) 20px 44px 34px;gap:3px}'));
});
