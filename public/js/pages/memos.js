function MemosPage(container) {
  container.innerHTML = `
  <div class="page-enter">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div>
        <h2 class="page-title">📝 随笔备忘录</h2>
        <p class="page-sub">记录一闪而过的灵感</p>
      </div>
      <button class="btn btn-primary btn-sm" id="addMemoBtn">➕ 新建随笔</button>
    </div>
    <div class="memo-grid" id="memoGrid"></div>
    <div style="text-align:center;margin-top:60px;color:var(--text-light);display:none" id="emptyMemo">
      <div style="font-size:48px;margin-bottom:12px">📝</div>
      <p>暂无随笔，点击"新建"记录灵感</p>
    </div>
  </div>`;

  const grid = container.querySelector('#memoGrid');
  const empty = container.querySelector('#emptyMemo');

  async function loadMemos() {
    try {
      const memos = await API.getMemos();
      if (memos.length === 0) { empty.style.display = 'block'; grid.innerHTML = ''; return; }
      empty.style.display = 'none';
      grid.innerHTML = memos.map(m => `
        <div class="memo-card ${m.pinned ? 'pinned' : ''}" data-id="${m.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <h4>${m.pinned ? '📌 ' : ''}${esc(m.title || '无标题')}</h4>
            <button class="btn-text" style="color:var(--text-light);font-size:11px;flex-shrink:0" onclick="deleteMemo(${m.id})">✕</button>
          </div>
          <p>${esc(m.content || '')}</p>
          <div class="memo-time">${m.created_at || ''}</div>
        </div>
      `).join('');

      grid.querySelectorAll('.memo-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          const id = parseInt(card.dataset.id);
          editMemo(id);
        });
      });

      window.deleteMemo = async function(id) {
        try { await API.deleteMemo(id); loadMemos(); showToast('已删除', 'info'); }
        catch(e) { showToast('删除失败', 'error'); }
      };
    } catch(e) { showToast('加载失败', 'error'); }
  }

  function editMemo(id) {
    const all = document.querySelectorAll('.memo-card');
    // Find memo data
    API.getMemos().then(memos => {
      const memo = memos.find(m => m.id === id);
      if (!memo) return;

      const modal = openModal(`
        <div class="modal-header">
          <h3>✏️ 编辑随笔</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="form-group"><label>标题</label><input type="text" class="form-input" id="memoTitle" value="${esc(memo.title)}"></div>
        <div class="form-group"><label>内容</label><textarea class="form-input" id="memoContent" rows="8">${esc(memo.content)}</textarea></div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;margin-bottom:16px">
          <input type="checkbox" id="memoPinned" ${memo.pinned ? 'checked' : ''}> 📌 置顶
        </label>
        <div class="modal-footer">
          <button class="btn btn-sm btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="btn btn-sm btn-danger" onclick="(async()=>{await API.deleteMemo(${id});loadMemos();this.closest('.modal-overlay').remove();showToast('已删除','info')})()">删除</button>
          <button class="btn btn-sm btn-primary" id="saveMemoBtn">保存</button>
        </div>
      `);

      modal.querySelector('#saveMemoBtn').addEventListener('click', async () => {
        const t = modal.querySelector('#memoTitle').value.trim();
        const c = modal.querySelector('#memoContent').value;
        const p = modal.querySelector('#memoPinned').checked;
        try {
          await API.updateMemo(id, { title: t, content: c, pinned: p ? 1 : 0 });
          closeModal(modal);
          loadMemos();
          showToast('已保存 ✅', 'success');
        } catch(e) { showToast('保存失败', 'error'); }
      });
    });
  }

  container.querySelector('#addMemoBtn').addEventListener('click', () => {
    const modal = openModal(`
      <div class="modal-header">
        <h3>📝 新建随笔</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="form-group"><label>标题</label><input type="text" class="form-input" id="memoTitle" placeholder="随笔标题"></div>
      <div class="form-group"><label>内容</label><textarea class="form-input" id="memoContent" rows="8" placeholder="记录你的灵感..."></textarea></div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-sm btn-primary" id="createMemoBtn">创建</button>
      </div>
    `);

    modal.querySelector('#createMemoBtn').addEventListener('click', async () => {
      const t = modal.querySelector('#memoTitle').value.trim();
      const c = modal.querySelector('#memoContent').value;
      try {
        await API.addMemo(t, c);
        closeModal(modal);
        loadMemos();
        showToast('已创建 📝', 'success');
      } catch(e) { showToast('创建失败', 'error'); }
    });
  });

  loadMemos();
}
