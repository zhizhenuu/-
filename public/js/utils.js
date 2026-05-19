// Toast
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2800);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML; }

function fmtDate(s) {
  if (!s) return '';
  try {
    const d = s.includes('T') ? new Date(s) : new Date(s.replace(' ', 'T'));
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return s; }
}

function countdown(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const target = new Date(dateStr + 'T23:59:59');
  const diff = target - now;
  if (diff < 0) return '<span class="tag-expired">📅 已过期</span>';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `⏳ 剩余 ${days} 天`;
  if (hours > 0) return `<span style="color:var(--warning)">⏳ 剩余 ${hours} 小时</span>`;
  return `<span style="color:var(--danger)">⏳ 即将过期</span>`;
}

function toDateInput(s) {
  if (!s) return '';
  try { return new Date(s).toISOString().slice(0, 10); } catch { return s; }
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

// 生成 SVG 柱状图
function renderChart(canvasId, data, labelKey, valKey, color = 'var(--primary)', height = 100) {
  const el = document.getElementById(canvasId);
  if (!el || !data || data.length === 0) return;
  const max = Math.max(...data.map(d => d[valKey]), 1);
  el.innerHTML = '<div class="chart-bars">' + data.map((d, i) => {
    const pct = (d[valKey] / max * 100);
    const dayLabel = typeof d[labelKey] === 'string' ? d[labelKey].slice(5) : d[labelKey];
    return `<div class="chart-bar-wrap">
      <div class="chart-bar ${color}" style="height:${Math.max(pct, 2)}%"></div>
      <div class="chart-label">${dayLabel}</div>
    </div>`;
  }).join('') + '</div>';
}

// Modal helper
function openModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-content">${html}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  return overlay.querySelector('.modal-content');
}

function closeModal(el) {
  const overlay = el.closest('.modal-overlay');
  if (overlay) overlay.remove();
}

// Drag & drop helper for todo list
function makeSortable(listEl, onOrderChange) {
  let dragEl = null;
  listEl.addEventListener('dragstart', e => {
    const li = e.target.closest('.todo-item');
    if (!li) return;
    dragEl = li;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  listEl.addEventListener('dragend', e => {
    const li = e.target.closest('.todo-item');
    if (li) li.classList.remove('dragging');
    document.querySelectorAll('.todo-item.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
  listEl.addEventListener('dragover', e => {
    e.preventDefault();
    const li = e.target.closest('.todo-item');
    if (!li || li === dragEl) return;
    document.querySelectorAll('.todo-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    li.classList.add('drag-over');
  });
  listEl.addEventListener('dragleave', e => {
    const li = e.target.closest('.todo-item');
    if (li) li.classList.remove('drag-over');
  });
  listEl.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.todo-item');
    if (!target || !dragEl || target === dragEl) return;
    const items = [...listEl.querySelectorAll('.todo-item')];
    const fromIdx = items.indexOf(dragEl);
    const toIdx = items.indexOf(target);
    if (fromIdx === -1 || toIdx === -1) return;
    if (fromIdx < toIdx) target.after(dragEl);
    else target.before(dragEl);
    if (onOrderChange) {
      const newItems = [...listEl.querySelectorAll('.todo-item')];
      const orders = newItems.map((li, i) => ({ id: parseInt(li.dataset.id), sort_order: i * 10 }));
      onOrderChange(orders);
    }
  });
}
