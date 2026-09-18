const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');
const { listPorts } = require('./scanner');

const PROTECTED_PROCESS_NAMES = new Set([
  'system',
  'registry',
  'smss',
  'csrss',
  'wininit',
  'services',
  'lsass',
  'winlogon',
  'svchost',
  'fontdrvhost',
  'dwm'
]);

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        resolve(stdout.replace(/^\uFEFF/, '').trim());
      }
    );
  });
}

async function getProcessSnapshot(pid) {
  const script = `
    $process = Get-Process -Id ${pid} -ErrorAction Stop
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue
    [pscustomobject]@{
      name=$process.ProcessName
      path=if ($process.Path) { $process.Path } else { $cim.ExecutablePath }
      commandLine=$cim.CommandLine
      startedAt=if ($process.StartTime) { $process.StartTime.ToString('o') } else { $null }
    } | ConvertTo-Json -Compress
  `;
  return JSON.parse(await runPowerShell(script));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1240,
    height: 790,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    transparent: false,
    backgroundColor: '#eceee7',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  window.once('ready-to-show', () => window.show());
  return window;
}

app.whenReady().then(() => {
  ipcMain.handle('ports:list', listPorts);
  ipcMain.handle('process:details', async (_event, rawPid) => {
    const pid = Number(rawPid);
    if (!Number.isInteger(pid) || pid <= 0) throw new Error('无效的进程 PID。');
    return getProcessSnapshot(pid);
  });

  ipcMain.handle('process:kill', async (_event, request) => {
    const pid = Number(request?.pid);
    if (!Number.isInteger(pid) || pid <= 4 || pid === process.pid) {
      throw new Error('该进程受系统保护，不能结束。');
    }

    const current = await getProcessSnapshot(pid);
    if (PROTECTED_PROCESS_NAMES.has(String(current.name).toLowerCase())) {
      throw new Error(`系统关键进程 ${current.name} 已被保护。`);
    }

    const args = request?.force ? ['/F', '/PID', String(pid)] : ['/PID', String(pid)];
    await new Promise((resolve, reject) => {
      execFile('taskkill.exe', args, { encoding: 'utf8', windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || stdout.trim() || '结束进程失败，请尝试以管理员身份运行。'));
          return;
        }
        resolve();
      });
    });
    return { pid, processName: current.name };
  });

  ipcMain.handle('process:reveal', async (_event, executablePath) => {
    if (!executablePath || !path.isAbsolute(executablePath)) return false;
    shell.showItemInFolder(executablePath);
    return true;
  });

  ipcMain.on('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
  ipcMain.on('window:toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    window.isMaximized() ? window.unmaximize() : window.maximize();
  });
  ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
