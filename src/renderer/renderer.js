const state = {
  ports: [],
  filter: 'all',
  query: '',
  selected: null,
  loading: false,
  timer: null
};

const { categoryLabels: CATEGORY_LABELS, classifyService, explainService, getScopeInfo } = window.serviceCatalog;

const elements = Object.fromEntries(
  [
    'portRows', 'emptyState', 'loadingState', 'searchInput', 'refreshButton', 'autoRefresh',
    'listeningStat', 'processStat', 'developerStat', 'allCount', 'webCount', 'dataCount',
    'messageCount', 'infraCount', 'aiCount', 'otherCount', 'visibleCount', 'lastUpdated', 'dialogBackdrop', 'dialogDescription',
    'processProof', 'cancelKill', 'confirmKill', 'toastRegion', 'themeButton',
    'detailScrim', 'detailDrawer', 'detailCategory', 'detailTitle', 'detailSubtitle',
    'detailExplanation', 'scopeCard', 'scopeLabel', 'scopeDescription', 'detailProcess',
    'detailPid', 'detailStarted', 'detailOwner', 'detailMemory', 'detailThreads',
    'detailParent', 'detailSignature', 'detailFileDescription', 'detailProduct',
    'detailCompany', 'detailVersion', 'detailPath', 'windowsServiceSection',
    'windowsServices', 'relatedPorts', 'detailCommand', 'closeDetail', 'revealDetail',
    'killFromDetail'
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
      <td><div class="row-actions">
        <button class="action-button" data-view-pid="${item.pid}" data-port="${item.port}">详情</button>
        <button class="action-button kill" data-kill-pid="${item.pid}" data-port="${item.port}">结束</button>
      </div></td>
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

function formatDateTime(value) {
  if (!value) return '不可用';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '不可用';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(date);
}

function setDetailLoading(item) {
  const classification = classifyService(item);
  elements.detailCategory.textContent = CATEGORY_LABELS[classification.category];
  elements.detailTitle.textContent = classification.service;
  elements.detailSubtitle.textContent = `${item.protocol} ${item.address}:${item.port} · PID ${item.pid}`;
  elements.detailExplanation.textContent = explainService(item);
  ['detailProcess', 'detailStarted', 'detailOwner', 'detailMemory', 'detailThreads', 'detailParent',
    'detailSignature', 'detailFileDescription', 'detailProduct', 'detailCompany', 'detailVersion', 'detailPath']
    .forEach((key) => { elements[key].textContent = key === 'detailProcess' ? item.processName : '读取中…'; });
  elements.detailPid.textContent = item.pid;
  elements.detailCommand.textContent = '正在读取启动命令…';
  elements.windowsServiceSection.hidden = true;
  elements.relatedPorts.innerHTML = '';
  elements.revealDetail.disabled = true;

  const scope = getScopeInfo(item.address);
  elements.scopeCard.dataset.level = scope.level;
  elements.scopeLabel.textContent = scope.label;
  elements.scopeDescription.textContent = scope.description;
}

function renderDetail(item) {
  const details = item.details || {};
  const classification = classifyService(item);
  const services = Array.isArray(details.services) ? details.services : (details.services ? [details.services] : []);
  const related = state.ports.filter((candidate) => candidate.pid === item.pid);
  const signatureLabels = { Valid: '签名有效', NotSigned: '未签名', HashMismatch: '签名不匹配', NotTrusted: '签名不受信任', UnknownError: '无法验证', Unknown: '未知' };

  elements.detailCategory.textContent = CATEGORY_LABELS[classification.category];
  elements.detailTitle.textContent = classification.service;
  elements.detailExplanation.textContent = explainService(item, details);
  elements.detailProcess.textContent = details.name || item.processName || '未知';
  elements.detailPid.textContent = item.pid;
  elements.detailStarted.textContent = formatDateTime(details.startedAt);
  elements.detailOwner.textContent = details.owner || '不可用';
  elements.detailMemory.textContent = details.workingSetMb == null ? '不可用' : `${details.workingSetMb} MB`;
  elements.detailThreads.textContent = details.threadCount ?? '不可用';
  elements.detailParent.textContent = details.parentPid ? `${details.parentName || '未知'} · ${details.parentPid}` : '不可用';
  elements.detailSignature.textContent = `${signatureLabels[details.signatureStatus] || details.signatureStatus || '未知'}${details.signer ? ` · ${details.signer}` : ''}`;
  elements.detailFileDescription.textContent = details.fileDescription || '未提供';
  elements.detailProduct.textContent = details.productName || '未提供';
  elements.detailCompany.textContent = details.companyName || '未提供';
  elements.detailVersion.textContent = details.fileVersion || '未提供';
  elements.detailPath.textContent = details.path || '路径不可见';
  elements.detailCommand.textContent = details.commandLine || '无法读取命令行';
  elements.revealDetail.disabled = !details.path;

  elements.windowsServiceSection.hidden = services.length === 0;
  elements.windowsServices.innerHTML = services.map((service) => `
    <article><strong>${escapeHtml(service.displayName || service.name)}</strong><span>${escapeHtml(service.name)} · ${escapeHtml(service.state)} · ${escapeHtml(service.startMode)}</span></article>
  `).join('');
  elements.relatedPorts.innerHTML = related.map((port) => `
    <span>${escapeHtml(port.protocol)} ${escapeHtml(port.address)}:<b>${port.port}</b></span>
  `).join('');
}

async function openDetail(pid, port) {
  const item = state.ports.find((candidate) => candidate.pid === Number(pid) && candidate.port === Number(port));
  if (!item) return;
  state.selected = { ...item };
  setDetailLoading(item);
  elements.detailScrim.hidden = false;
  elements.detailDrawer.hidden = false;
  requestAnimationFrame(() => elements.detailDrawer.classList.add('open'));
  try {
    const details = await window.portLantern.getProcessDetails(item.pid);
    if (state.selected?.pid !== item.pid || state.selected?.port !== item.port) return;
    state.selected = { ...item, details };
    renderDetail(state.selected);
  } catch (error) {
    elements.detailExplanation.textContent = `${explainService(item)} 进程详情读取失败：${error.message}`;
    showToast('详情读取失败', error.message, 'error');
  }
}

function closeDetailPanel() {
  elements.detailDrawer.classList.remove('open');
  elements.detailScrim.hidden = true;
  setTimeout(() => { elements.detailDrawer.hidden = true; }, 180);
  state.selected = null;
}

async function openKillDialog(pid, port) {
  const item = state.selected?.pid === Number(pid)
    ? state.selected
    : state.ports.find((candidate) => candidate.pid === Number(pid) && candidate.port === Number(port));
  if (!item) return;
  state.selected = item;
  elements.dialogDescription.textContent = `进程“${item.processName}”正在使用 ${item.protocol} 端口 ${item.port}。结束它会同时释放该进程占用的其他端口。`;
  elements.processProof.textContent = `PID ${item.pid}  ·  正在读取进程路径…`;
  elements.dialogBackdrop.hidden = false;
  elements.confirmKill.focus();
  if (item.details) {
    elements.processProof.textContent = `PID ${item.pid}  ·  ${item.details.path || item.details.commandLine || '无法读取可执行文件路径'}`;
    return;
  }
  try {
    const details = await window.portLantern.getProcessDetails(item.pid);
    if (state.selected?.pid !== item.pid) return;
    state.selected = { ...item, details };
    elements.processProof.textContent = `PID ${item.pid}  ·  ${details.path || details.commandLine || '无法读取可执行文件路径'}`;
  } catch {
    elements.processProof.textContent = `PID ${item.pid}  ·  进程可能已经退出或路径不可见`;
  }
}

function closeKillDialog() {
  elements.dialogBackdrop.hidden = true;
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
    closeDetailPanel();
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
  const killButton = event.target.closest('[data-kill-pid]');
  if (killButton) {
    openKillDialog(killButton.dataset.killPid, killButton.dataset.port);
    return;
  }
  const button = event.target.closest('[data-view-pid]');
  if (button) openDetail(button.dataset.viewPid, button.dataset.port);
});

elements.closeDetail.addEventListener('click', closeDetailPanel);
elements.detailScrim.addEventListener('click', closeDetailPanel);
elements.revealDetail.addEventListener('click', async () => {
  const filePath = state.selected?.details?.path;
  if (filePath) await window.portLantern.revealProcess(filePath);
});
elements.killFromDetail.addEventListener('click', () => {
  if (state.selected) openKillDialog(state.selected.pid, state.selected.port);
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
    else if (!elements.detailDrawer.hidden) closeDetailPanel();
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
