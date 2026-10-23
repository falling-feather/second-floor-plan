import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, initialState, defaultConditions, moveBench, checkRamp, narrowestSection, isClearSegment, SCENE } from '../src/model.ts';

const improved = () => ({ bench: { x: 6800, y: -2200 }, ramp: { enabled: true, ratio: 12 } });
const run = (state, changes = {}) => analyze(state, { ...defaultConditions(), ...changes });

test('横截面来自座椅几何：1050mm / 1600mm', () => {
  assert.equal(narrowestSection(initialState()), 1050);
  assert.equal(narrowestSection(improved()), 1600);
});
test('原状与两种单项改造仍保留独立阻断', () => {
  assert.equal(run(initialState()).route.reached, false);
  assert.equal(run({ ...initialState(), bench: improved().bench }).route.reason, 'step');
  assert.equal(run({ ...initialState(), ramp: improved().ramp }).route.reason, 'width');
});
test('净宽模式下移椅即可连通，不强行加入未选的台阶条件', () => {
  assert.equal(run({ ...initialState(), bench: improved().bench }, { stepFree: false, rest: false }).route.reached, true);
});
test('两种改造组合后存在可复算的完整路径', () => {
  const a = run(improved(), { rest: false });
  assert.equal(a.route.reached, true);
  assert.deepEqual(a.route.path[0], SCENE.start);
  assert.deepEqual(a.route.path.at(-1), SCENE.goal);
  assert.ok(Math.abs(a.route.length - 16400) < 1e-6);
  let sum = 0;
  for (let i = 1; i < a.route.path.length; i++) {
    const p = a.route.path[i-1], q = a.route.path[i];
    assert.equal(isClearSegment(p, q, improved(), defaultConditions()), true);
    sum += Math.hypot(q.x-p.x, q.y-p.y);
  }
  assert.ok(Math.abs(sum - a.route.length) < 1e-6);
});
test('休息约束检验整段行程，路径实际抵达座椅前的停留点', () => {
  const a = run(improved());
  assert.equal(a.route.reached, true);
  assert.equal(a.route.stops.length, 1);
  assert.ok(a.route.legs.every(x => x <= 12000));
  assert.ok(a.route.path.some(p => p.x === a.benchAccess.x && p.y === a.benchAccess.y));
  assert.ok(a.route.length > 16400);
});
test('座椅移到远端后几何连通，休息条件失败', () => {
  const a = run({ ...improved(), bench: { x: 15000, y: -2200 } });
  assert.equal(a.route.geometric, true);
  assert.equal(a.route.reached, false);
  assert.equal(a.route.reason, 'rest');
});
test('16.4m 行程不会因网格边都短于 12m 而被误判', () => {
  const a = run(improved(), { restLimit: 6000 });
  assert.equal(a.route.reached, false);
  assert.equal(a.route.reason, 'rest');
});
test('坡道长度、平台与过陡条件独立校核', () => {
  const a = checkRamp(improved());
  assert.equal(a.run, 2160);
  assert.equal(a.footprint, 5160);
  assert.equal(a.pass, true);
  assert.equal(checkRamp({ ...improved(), ramp: { enabled: true, ratio: 8 } }).pass, false);
  assert.equal(run({ ...improved(), ramp: { enabled: true, ratio: 8 } }).route.reason, 'step');
});
test('座椅越界和跨标高的移动被拒绝，原状态不变', () => {
  const s = initialState();
  assert.equal(moveBench(s, { x: 4000, y: -1000 }).valid, false);
  assert.equal(moveBench(s, { x: 11500, y: 0 }).valid, false);
  assert.deepEqual(s, initialState());
});
test('座椅可进入真实凹位，但不能侵入展开后的坡道平台', () => {
  assert.equal(moveBench(initialState(), improved().bench).valid, true);
  assert.equal(moveBench(improved(), { x: 9000, y: 0 }).valid, false);
});
test('线段包络不能穿墙或切过座椅', () => {
  assert.equal(isClearSegment({x: 0,y:800}, {x:1000,y:800}, improved(), defaultConditions()), false);
  assert.equal(isClearSegment({x:4400,y:800}, {x:7000,y:800}, initialState(), defaultConditions()), false);
  assert.equal(isClearSegment(SCENE.start, SCENE.goal, improved(), { ...defaultConditions(), rest: false }), true);
});
test('净宽阈值的等号成立，误差不改变几何事实', () => {
  const a = run(initialState(), { minWidth: 1050, stepFree: false, rest: false });
  assert.equal(a.route.reached, true);
  assert.equal(run(initialState(), { minWidth: 1051, stepFree: false, rest: false }).route.reached, false);
});
test('相同输入得到相同路径，对比状态彼此独立', () => {
  const s = improved(), snapshot = structuredClone(s);
  assert.deepEqual(run(s).route, run(snapshot).route);
  moveBench(s, { x:15000,y:-2200 });
  assert.deepEqual(s, snapshot);
});
