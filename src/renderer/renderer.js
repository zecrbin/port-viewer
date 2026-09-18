const state = {
  ports: [],
  filter: 'all',
  query: '',
  selected: null,
  loading: false,
  timer: null
};

const SERVICE_PORTS = new Map([
  [80, ['web', 'HTTP']], [443, ['web', 'HTTPS']],
  [3000, ['web', '前端开发']], [3001, ['web', '前端开发']], [4173, ['web', 'Vite 预览']],
  [4200, ['web', 'Angular']], [5000, ['web', '后端 API']], [5173, ['web', 'Vite']],
  [5190, ['web', 'Vite']], [8000, ['web', '后端 API']], [8080, ['web', '后端 API']],
  [8090, ['web', '后端 API']], [8091, ['web', 'Worker']], [9000, ['web', '应用服务']],
  [1433, ['data', 'SQL Server']], [1521, ['data', 'Oracle']], [3306, ['data', 'MySQL']],
  [5432, ['data', 'PostgreSQL']], [6379, ['data', 'Redis']], [9200, ['data', 'Elasticsearch']],
  [9300, ['data', 'ES 集群']], [11211, ['data', 'Memcached']], [27017, ['data', 'MongoDB']],
  [4222, ['message', 'NATS']], [5672, ['message', 'RabbitMQ']], [15672, ['message', 'RabbitMQ 控制台']],
  [9092, ['message', 'Kafka']], [9876, ['message', 'RocketMQ NameServer']], [10911, ['message', 'RocketMQ Broker']],
  [2375, ['infra', 'Docker']], [2376, ['infra', 'Docker TLS']], [6443, ['infra', 'Kubernetes']],
  [7233, ['infra', 'Temporal']], [8233, ['infra', 'Temporal UI']], [8500, ['infra', 'Consul']],
  [9090, ['infra', 'Prometheus']], [9100, ['infra', 'Node Exporter']],
  [7860, ['ai', 'Gradio']], [7861, ['ai', 'Gradio']], [8188, ['ai', 'ComfyUI']],
  [11434, ['ai', 'Ollama']], [1234, ['ai', '本地模型']]
]);

const CATEGORY_LABELS = {
  web: 'Web 与后端',
  data: '数据存储',
  message: '消息中间件',
  infra: '基础设施',
  ai: 'AI 与模型',
  other: '其他服务'
};

const elements = Object.fromEntries(
  [
    'portRows', 'emptyState', 'loadingState', 'searchInput', 'refreshButton', 'autoRefresh',
    'listeningStat', 'processStat', 'developerStat', 'allCount', 'webCount', 'dataCount',
    'messageCount', 'infraCount', 'aiCount', 'otherCount', 'visibleCount', 'lastUpdated', 'dialogBackdrop', 'dialogDescription',
    'processProof', 'cancelKill', 'confirmKill', 'toastRegion', 'themeButton'
  ].map((id) => [id, document.getElementById(id)])
);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function classifyService(item) {
  const processName = String(item.processName || '').toLowerCase();
  if (/ollama|llama|vllm|comfy|stable-diffusion/.test(processName)) return { category: 'ai', service: '模型服务' };
  if (/postgres|mysql|redis|mongod|sqlservr|elasticsearch/.test(processName)) {
    return { category: 'data', service: SERVICE_PORTS.get(Number(item.port))?.[1] || '数据服务' };
  }
  if (/rabbitmq|kafka|nats|rocketmq/.test(processName)) {
    return { category: 'message', service: SERVICE_PORTS.get(Number(item.port))?.[1] || '消息服务' };
  }
  if (/docker|containerd|kubectl|temporal|prometheus|grafana|consul/.test(processName)) {
    return { category: 'infra', service: SERVICE_PORTS.get(Number(item.port))?.[1] || '基础设施' };
  }
  const known = SERVICE_PORTS.get(Number(item.port));
  if (known) return { category: known[0], service: known[1] };
  if (/java|node|python|dotnet|php|ruby|go/.test(processName) && Number(item.port) >= 1024) {
    return { category: 'web', service: '开发服务' };
  }
  return { category: 'other', service: '未分类' };
}

function filteredPorts() {
  const query = state.query.trim().toLowerCase();
  return state.ports.filter((item) => {
    const filterMatches = state.filter === 'all'
      || classifyService(item).category === state.filter;
    const text = `${item.port} ${item.pid} ${item.protocol} ${item.processName} ${item.address} ${item.path} ${item.commandLine}`.toLowerCase();
    return filterMatches && (!query || text.includes(query));
  });
}

function render() {
  const visible = filteredPorts();
  const processCount = new Set(state.ports.map((item) => item.pid)).size;
  const categoryCounts = Object.fromEntries(Object.keys(CATEGORY_LABELS).map((category) => [category, 0]));
  state.ports.forEach((item) => { categoryCounts[classifyService(item).category] += 1; });
  const recognizedCount = state.ports.length - categoryCounts.other;

  elements.listeningStat.textContent = state.ports.length;
  elements.processStat.textContent = processCount;
  elements.developerStat.textContent = recognizedCount;
  elements.allCount.textContent = state.ports.length;
  Object.entries(categoryCounts).forEach(([category, count]) => {
    elements[`${category}Count`].textContent = count;
  });
  elements.visibleCount.textContent = visible.length;

  elements.portRows.innerHTML = visible.map((item, index) => {
    const classification = classifyService(item);
    return `
    <tr style="animation-delay:${Math.min(index * 18, 180)}ms">
      <td><span class="port-number">${item.port}</span></td>
      <td><span class="protocol ${item.protocol === 'UDP' ? 'udp' : ''}">${escapeHtml(item.protocol)}</span></td>
      <td class="process-cell" title="双击定位可执行文件">
        ${escapeHtml(item.processName)}
        <span>${escapeHtml(classification.service)}</span>
      </td>
      <td>${item.pid}</td>
      <td title="${escapeHtml(item.address)}">${escapeHtml(item.address)}</td>
      <td><span class="service-badge ${classification.category}">${escapeHtml(CATEGORY_LABELS[classification.category])}</span></td>
      <td><button class="action-button" data-kill-pid="${item.pid}" data-port="${item.port}">释放端口</button></td>
    </tr>
  `;
  }).join('');

  elements.emptyState.hidden = state.loading || visible.length > 0;
  elements.loadingState.hidden = !state.loading;
}

async function refreshPorts({ quiet = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  elements.refreshButton.classList.add('loading');
  if (!quiet && state.ports.length === 0) render();
  try {
    const result = await window.portLantern.listPorts();
    state.ports = result.items;
    elements.lastUpdated.textContent = `更新于 ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())} · ${result.durationMs}ms`;
  } catch (error) {
    showToast('扫描失败', error.message, 'error');
  } finally {
    state.loading = false;
    elements.refreshButton.classList.remove('loading');
    render();
  }
}

function showToast(title, message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  elements.toastRegion.append(toast);
  setTimeout(() => toast.remove(), 3600);
}

async function openKillDialog(pid, port) {
  const item = state.ports.find((candidate) => candidate.pid === Number(pid) && candidate.port === Number(port));
  if (!item) return;
  state.selected = item;
  elements.dialogDescription.textContent = `进程“${item.processName}”正在使用 ${item.protocol} 端口 ${item.port}。结束它会同时释放该进程占用的其他端口。`;
  elements.processProof.textContent = `PID ${item.pid}  ·  正在读取进程路径…`;
  elements.dialogBackdrop.hidden = false;
  elements.confirmKill.focus();
  try {
    const details = await window.portLantern.getProcessDetails(item.pid);
    if (state.selected?.pid !== item.pid) return;
    state.selected = { ...item, ...details };
    elements.processProof.textContent = `PID ${item.pid}  ·  ${details.path || details.commandLine || '无法读取可执行文件路径'}`;
  } catch {
    elements.processProof.textContent = `PID ${item.pid}  ·  进程可能已经退出或路径不可见`;
  }
}

function closeKillDialog() {
  elements.dialogBackdrop.hidden = true;
  state.selected = null;
}

async function confirmKill() {
  if (!state.selected) return;
  const target = state.selected;
  elements.confirmKill.disabled = true;
  elements.confirmKill.textContent = '正在结束…';
  try {
    try {
      await window.portLantern.killProcess(target.pid, false);
    } catch {
      await window.portLantern.killProcess(target.pid, true);
    }
    closeKillDialog();
    showToast('端口已释放', `${target.processName}（PID ${target.pid}）已结束。`);
    setTimeout(() => refreshPorts({ quiet: true }), 350);
  } catch (error) {
    showToast('结束失败', error.message, 'error');
  } finally {
    elements.confirmKill.disabled = false;
    elements.confirmKill.textContent = '结束进程';
  }
}

function resetAutoRefresh() {
  clearInterval(state.timer);
  if (elements.autoRefresh.checked) {
    state.timer = setInterval(() => refreshPorts({ quiet: true }), 4000);
  }
}

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.nav-item.active')?.classList.remove('active');
    button.classList.add('active');
    state.filter = button.dataset.filter;
    render();
  });
});

elements.searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  render();
});

elements.portRows.addEventListener('click', (event) => {
  const button = event.target.closest('[data-kill-pid]');
  if (button) openKillDialog(button.dataset.killPid, button.dataset.port);
});

elements.portRows.addEventListener('dblclick', async (event) => {
  const row = event.target.closest('tr');
  const button = row?.querySelector('[data-kill-pid]');
  const item = button && state.ports.find((candidate) => candidate.pid === Number(button.dataset.killPid));
  if (!item) return;
  try {
    const details = await window.portLantern.getProcessDetails(item.pid);
    if (details.path) await window.portLantern.revealProcess(details.path);
    else showToast('无法定位', '该进程的可执行文件路径不可见。', 'error');
  } catch (error) {
    showToast('无法定位', error.message, 'error');
  }
});

elements.refreshButton.addEventListener('click', () => refreshPorts());
elements.autoRefresh.addEventListener('change', resetAutoRefresh);
elements.cancelKill.addEventListener('click', closeKillDialog);
elements.confirmKill.addEventListener('click', confirmKill);
elements.dialogBackdrop.addEventListener('click', (event) => {
  if (event.target === elements.dialogBackdrop) closeKillDialog();
});

elements.themeButton.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
  document.body.dataset.theme = next;
  localStorage.setItem('port-viewer-theme', next);
});

document.getElementById('minimizeButton').addEventListener('click', window.portLantern.minimize);
document.getElementById('maximizeButton').addEventListener('click', window.portLantern.toggleMaximize);
document.getElementById('closeButton').addEventListener('click', window.portLantern.close);

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    elements.searchInput.focus();
  }
  if (event.key === 'Escape') {
    if (!elements.dialogBackdrop.hidden) closeKillDialog();
    else elements.searchInput.blur();
  }
  if (event.key === 'F5') {
    event.preventDefault();
    refreshPorts();
  }
});

document.body.dataset.theme = localStorage.getItem('port-viewer-theme') || 'light';
resetAutoRefresh();
refreshPorts();
