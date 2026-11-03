import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticOptions,applyDiagnosticOverrides} from '../src/site/diagnostics.js';
test('diagnostic overrides cannot activate on the normal site URL',()=>{
  assert.deepEqual(diagnosticOptions('',{msaa:false}),{});
  assert.deepEqual(diagnosticOptions('?capture',{plainHeaviest:true}),{});
  assert.deepEqual(diagnosticOptions('?diagnose',{msaa:false}),{msaa:false});
  const report=applyDiagnosticOverrides({scene:{traverse(){throw new Error('default must not touch scene');}}},{});
  assert.equal(report.heaviestMaterial,null);
});
