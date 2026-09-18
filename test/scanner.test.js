const test = require('node:test');
const assert = require('node:assert/strict');
const { parseEndpoint, parseNetstat, parseTasklist } = require('../src/scanner');

test('parseEndpoint 支持 IPv4 和 IPv6 监听地址', () => {
  assert.deepEqual(parseEndpoint('127.0.0.1:8090'), { address: '127.0.0.1', port: 8090 });
  assert.deepEqual(parseEndpoint('[::]:5432'), { address: '::', port: 5432 });
});

test('parseNetstat 仅保留 TCP LISTENING 端点', () => {
  const output = [
    'TCP    127.0.0.1:8090    0.0.0.0:0    LISTENING    11324',
    'TCP    127.0.0.1:8090    127.0.0.1:52000    ESTABLISHED    11324'
  ].join('\r\n');
  assert.deepEqual(parseNetstat(output, 'TCP'), [
    { protocol: 'TCP', address: '127.0.0.1', port: 8090, pid: 11324 }
  ]);
});

test('parseNetstat 能读取 UDP 端点', () => {
  const output = 'UDP    0.0.0.0:5353    *:*    4120';
  assert.deepEqual(parseNetstat(output, 'UDP'), [
    { protocol: 'UDP', address: '0.0.0.0', port: 5353, pid: 4120 }
  ]);
});

test('parseTasklist 提取进程名和 PID', () => {
  const output = '"java.exe","11324","Console","1","182,000 K"\r\n"postgres.exe","8120","Services","0","20,000 K"';
  const processes = parseTasklist(output);
  assert.equal(processes.get(11324), 'java');
  assert.equal(processes.get(8120), 'postgres');
});
