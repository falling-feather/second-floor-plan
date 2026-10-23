import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

test('独立HTML只有一个可解析的内联程序，无外部模块和样式依赖', () => {
  const html=readFileSync(new URL('../dist/second-floor-plan.html',import.meta.url),'utf8');
  assert.equal(/<script[^>]+src=/.test(html),false);
  assert.equal(/<link[^>]+rel="stylesheet"/.test(html),false);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  assert.doesNotThrow(()=>new Script(scripts[0][1]));
});
