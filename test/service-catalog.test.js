const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyService, explainService, getScopeInfo } = require('../src/renderer/service-catalog');

test('根据常见端口识别服务及用途', () => {
  const postgres = { port: 5432, processName: 'postgres' };
  assert.deepEqual(classifyService(postgres), { category: 'data', service: 'PostgreSQL' });
  assert.match(explainService(postgres), /关系型数据库/);
});

test('根据进程名称识别未知端口上的运行时', () => {
  assert.deepEqual(
    classifyService({ port: 18090, processName: 'java' }),
    { category: 'web', service: '开发服务' }
  );
  assert.match(explainService({ port: 18090, processName: 'java' }), /Java 虚拟机/);
});

test('正确解释不同监听范围', () => {
  assert.equal(getScopeInfo('127.0.0.1').level, 'safe');
  assert.equal(getScopeInfo('0.0.0.0').level, 'warn');
  assert.equal(getScopeInfo('192.168.1.10').level, 'info');
});
