const { execFile } = require('node:child_process');

function execute(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }
      resolve(stdout.replace(/^\uFEFF/, ''));
    });
  });
}

function parseEndpoint(endpoint) {
  const match = String(endpoint).match(/^(.*):(\d+)$/);
  if (!match) return null;
  return {
    address: match[1].replace(/^\[|\]$/g, ''),
    port: Number(match[2])
  };
}

function parseNetstat(output, protocol) {
  const items = [];
  for (const rawLine of output.split(/\r?\n/)) {
    const fields = rawLine.trim().split(/\s+/);
    if (fields[0]?.toUpperCase() !== protocol) continue;

    if (protocol === 'TCP' && fields[3]?.toUpperCase() !== 'LISTENING') continue;
    const endpoint = parseEndpoint(fields[1]);
    const pid = Number(protocol === 'TCP' ? fields[4] : fields[3]);
    if (!endpoint || !Number.isInteger(pid)) continue;

    items.push({
      protocol,
      address: endpoint.address,
      port: endpoint.port,
      pid
    });
  }
  return items;
}

function parseTasklist(output) {
  const processes = new Map();
  for (const rawLine of output.split(/\r?\n/)) {
    const match = rawLine.match(/^"([^"]+)","(\d+)"/);
    if (!match) continue;
    processes.set(Number(match[2]), match[1].replace(/\.exe$/i, ''));
  }
  return processes;
}

async function listPorts() {
  const startedAt = performance.now();
  const [tcpOutput, udpOutput, taskOutput] = await Promise.all([
    execute('netstat.exe', ['-ano', '-p', 'TCP']),
    execute('netstat.exe', ['-ano', '-p', 'UDP']),
    execute('tasklist.exe', ['/FO', 'CSV', '/NH'])
  ]);

  const processes = parseTasklist(taskOutput);
  const unique = new Map();
  for (const item of [...parseNetstat(tcpOutput, 'TCP'), ...parseNetstat(udpOutput, 'UDP')]) {
    const key = `${item.protocol}|${item.address}|${item.port}|${item.pid}`;
    unique.set(key, {
      ...item,
      processName: processes.get(item.pid) || '未知进程'
    });
  }

  return {
    items: [...unique.values()].sort((left, right) => left.port - right.port || left.protocol.localeCompare(right.protocol)),
    durationMs: Math.round(performance.now() - startedAt)
  };
}

module.exports = { listPorts, parseEndpoint, parseNetstat, parseTasklist };
