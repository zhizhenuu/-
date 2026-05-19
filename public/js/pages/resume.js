function ResumePage(container) {
  container.innerHTML = `
  <div class="page-enter">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div>
        <h2 class="page-title">📄 简历编辑器</h2>
        <p class="page-sub">管理多份求职简历</p>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" id="newResumeBtn">➕ 新建</button>
        <button class="btn btn-sm btn-outline" id="templateBtn">📋 模板</button>
        <button class="btn btn-sm btn-outline" id="pdfBtn">📎 PDF</button>
      </div>
    </div>

    <div style="display:flex;gap:20px;flex-wrap:wrap">
      <!-- 简历列表 -->
      <div style="flex:0 0 220px;min-width:160px" id="resumeSidebar">
        <div class="resume-list" id="resumeList"></div>
        <p style="font-size:12px;color:var(--text-light);margin-top:8px;text-align:center" id="noResumeHint">暂无简历，点击"新建"创建</p>
      </div>

      <!-- 编辑器 -->
      <div style="flex:1;min-width:300px">
        <div class="resume-editor" id="resumeEditor">
          <div style="display:none;text-align:center;padding:60px 0;color:var(--text-light)" id="editorEmpty">
            <p>请选择或创建一份简历</p>
          </div>
          <div id="editorContent" style="display:none">
            <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;align-items:start">
              <div class="resume-avatar" id="resumeAvatarUpload" style="cursor:pointer;width:64px;height:64px;font-size:24px;position:relative">
                <span id="avatarLetter">📄</span>
                <div class="avatar-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;font-size:11px;color:#fff;border-radius:50%">📷上传</div>
              </div>
              <div style="flex:1;min-width:0">
                <div class="form-group" style="margin-bottom:8px">
                  <input type="text" class="form-input" id="resumeTitleInput" placeholder="简历标题">
                </div>
                <div class="form-group" style="margin-bottom:8px">
                  <input type="text" class="form-input" id="resumeTarget" placeholder="求职方向（例如：前端开发工程师）">
                </div>
              </div>
            </div>

            <!-- 富文本工具栏 -->
            <div class="rte-toolbar">
              <button class="rte-btn" data-cmd="bold" title="加粗"><b>B</b></button>
              <button class="rte-btn" data-cmd="italic" title="斜体"><i>I</i></button>
              <button class="rte-btn" data-cmd="underline" title="下划线"><u>U</u></button>
              <button class="rte-btn" data-cmd="formatBlock" data-arg="h2">H2</button>
              <button class="rte-btn" data-cmd="formatBlock" data-arg="h3">H3</button>
              <button class="rte-btn" data-cmd="insertUnorderedList">• 列表</button>
              <button class="rte-btn" data-cmd="insertOrderedList">1. 列表</button>
              <button class="rte-btn" data-cmd="formatBlock" data-arg="blockquote">❝ 引用</button>
            </div>

            <div class="rte-content" id="resumeContent" contenteditable="true" placeholder="📝 在这里编写简历内容..."></div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;flex-wrap:wrap;gap:8px">
              <div style="display:flex;gap:12px;align-items:center">
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
                  <input type="checkbox" id="publicCheck"> 🌐 公开
                </label>
                <button class="btn-text" id="saveStatusBtn" style="font-size:12px;color:var(--text-light);cursor:default">💾 已就绪</button>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-primary" id="saveBtn">💾 保存</button>
                <button class="btn btn-sm btn-outline" id="cloneBtn">📋 克隆</button>
                <button class="btn btn-sm btn-outline" id="printBtn">🖨️ 打印</button>
                <button class="btn btn-sm btn-outline" id="exportTxtBtn">📤 导出</button>
                <button class="btn btn-sm btn-danger" id="deleteResumeBtn">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  // ===== State =====
  let resumes = [];
  let currentId = null;
  let autoTimer = null;

  const listEl = container.querySelector('#resumeList');
  const noHint = container.querySelector('#noResumeHint');
  const editorEmpty = container.querySelector('#editorEmpty');
  const editorContent = container.querySelector('#editorContent');
  const titleInput = container.querySelector('#resumeTitleInput');
  const targetInput = container.querySelector('#resumeTarget');
  const contentEd = container.querySelector('#resumeContent');
  const publicCheck = container.querySelector('#publicCheck');
  const saveStatus = container.querySelector('#saveStatusBtn');
  const avatarLetter = container.querySelector('#avatarLetter');

  // ===== Load =====
  async function loadResumes() {
    try {
      resumes = await API.getResumes();
      renderList();
      if (resumes.length > 0) {
        if (!currentId || !resumes.find(r => r.id === currentId)) {
          selectResume(resumes[0].id);
        } else {
          selectResume(currentId);
        }
      } else {
        editorEmpty.style.display = 'block';
        editorContent.style.display = 'none';
        noHint.style.display = '';
      }
    } catch(e) { showToast('加载简历失败', 'error'); }
  }

  function renderList() {
    listEl.innerHTML = resumes.map(r => `
      <div class="resume-card ${r.id === currentId ? 'active' : ''}" data-id="${r.id}">
        <div class="resume-avatar">
          ${r.avatar_data ? `<img src="${r.avatar_data}" alt="">` : '📄'}
        </div>
        <div class="resume-info">
          <h4>${esc(r.title)}</h4>
          <p>${r.target ? esc(r.target) : '未设置方向'} · ${r.is_public ? '🌐 公开' : '🔒 私密'}</p>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.resume-card').forEach(card => {
      card.addEventListener('click', () => selectResume(parseInt(card.dataset.id)));
    });
    noHint.style.display = resumes.length > 0 ? 'none' : '';
  }

  async function selectResume(id) {
    currentId = id;
    renderList();
    try {
      const r = await API.getResume(id);
      titleInput.value = r.title || '';
      targetInput.value = r.target || '';
      contentEd.innerHTML = r.content || '';
      publicCheck.checked = !!r.is_public;
      avatarLetter.textContent = r.avatar_data ? '<img>' : r.target ? r.target[0].toUpperCase() : '📄';
      if (r.avatar_data) {
        avatarLetter.innerHTML = `<img src="${r.avatar_data}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        avatarLetter.textContent = r.target ? r.target[0].toUpperCase() : '📄';
        avatarLetter.className = '';
      }
      saveStatus.textContent = `💾 上次保存: ${r.updated_at || '未知'}`;
      editorEmpty.style.display = 'none';
      editorContent.style.display = 'block';
    } catch(e) { showToast('加载简历失败', 'error'); }
  }

  async function saveCurrent(showTip = true) {
    if (!currentId) return;
    const title = titleInput.value.trim() || '未命名简历';
    try {
      const r = await API.saveResume(currentId, {
        title, content: contentEd.innerHTML,
        target: targetInput.value.trim(),
        is_public: publicCheck.checked ? 1 : 0
      });
      saveStatus.textContent = `💾 已保存: ${r.updated_at || '刚刚'}`;
      if (showTip) showToast('简历已保存 ✅', 'success');
      // 更新列表
      const idx = resumes.findIndex(x => x.id === currentId);
      if (idx !== -1) {
        resumes[idx].title = r.title;
        resumes[idx].target = r.target;
        resumes[idx].is_public = r.is_public;
        resumes[idx].updated_at = r.updated_at;
        renderList();
      }
    } catch(e) { if (showTip) showToast('保存失败', 'error'); }
  }

  // ===== Events =====
  // Auto save
  contentEd.addEventListener('input', () => {
    saveStatus.textContent = '✏️ 未保存...';
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => saveCurrent(false), 2000);
  });
  titleInput.addEventListener('input', () => {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => saveCurrent(false), 1500);
  });

  container.querySelector('#saveBtn').addEventListener('click', () => saveCurrent(true));

  // Rich text toolbar
  container.querySelectorAll('.rte-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      const arg = btn.dataset.arg || null;
      contentEd.focus();
      document.execCommand(cmd, false, arg);
    });
  });

  // New resume
  container.querySelector('#newResumeBtn').addEventListener('click', async () => {
    try {
      const r = await API.createResume('新简历', '', '');
      resumes.push(r);
      selectResume(r.id);
      showToast('已创建新简历 📄', 'success');
    } catch(e) { showToast('创建失败', 'error'); }
  });

  // Clone
  container.querySelector('#cloneBtn').addEventListener('click', async () => {
    if (!currentId) return;
    try {
      const r = await API.cloneResume(currentId);
      resumes.push(r);
      selectResume(r.id);
      showToast('已克隆简历 📋', 'success');
    } catch(e) { showToast('克隆失败', 'error'); }
  });

  // Delete
  container.querySelector('#deleteResumeBtn').addEventListener('click', async () => {
    if (!currentId) return;
    if (!confirm('确定删除这份简历？')) return;
    try {
      await API.deleteResume(currentId);
      resumes = resumes.filter(r => r.id !== currentId);
      currentId = null;
      loadResumes();
      showToast('已删除', 'info');
    } catch(e) { showToast('删除失败', 'error'); }
  });

  // Print
  container.querySelector('#printBtn').addEventListener('click', () => {
    if (!currentId) return;
    const title = titleInput.value || '简历';
    const win = window.open('', '_blank');
    const avatarHtml = '';
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${esc(title)} - 打印</title>
      <style>
        body { font-family: 'Microsoft YaHei','PingFang SC',sans-serif; max-width: 800px; margin: 20px auto; padding: 0 20px; line-height: 1.7; color: #333; }
        h1 { font-size: 24px; border-bottom: 2px solid #165DFF; padding-bottom: 8px; }
        .target { color: #666; font-size: 14px; margin-bottom: 20px; }
        blockquote { border-left: 3px solid #165DFF; padding: 8px 16px; background: #f0f4ff; margin: 12px 0; }
        ul, ol { padding-left: 20px; }
        @media print { body { margin: 0; padding: 15px; } }
      </style></head>
      <body>
        <h1>${esc(title)}</h1>
        ${targetInput.value.trim() ? `<div class="target">🎯 ${esc(targetInput.value.trim())}</div>` : ''}
        ${contentEd.innerHTML}
        <div style="margin-top:20px;color:#999;font-size:12px;text-align:center">ccc 简历 · 打印于 ${new Date().toLocaleString()}</div>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  });

  // Export txt
  container.querySelector('#exportTxtBtn').addEventListener('click', () => {
    if (!currentId) return;
    const title = titleInput.value || '简历';
    // Strip HTML
    const text = contentEd.innerText || contentEd.textContent || '';
    const blob = new Blob(['\ufeff' + title + '\n' + '='.repeat(title.length) + '\n\n' + text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = title.replace(/[\\/:*?"<>|]/g, '_') + '.txt';
    a.click(); URL.revokeObjectURL(url);
    showToast('导出成功 📤', 'success');
  });

  // PDF export (html to pdf via print)
  container.querySelector('#pdfBtn').addEventListener('click', () => {
    if (!currentId) return;
    container.querySelector('#printBtn').click();
    showToast('请在打印对话框中选择"另存为 PDF"', 'info');
  });

  // Templates
  container.querySelector('#templateBtn').addEventListener('click', () => {
    const content = openModal(`
      <div class="modal-header">
        <h3>📋 简历模板</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="display:grid;gap:12px">
        ${[
          { name: '前端工程师', target: '前端开发工程师',
            content: '<h2>个人简介</h2><p>热爱前端技术，具备扎实的 JavaScript/TypeScript 基础，熟悉 Vue/React 框架及生态。</p><h2>技能清单</h2><ul><li><strong>前端：</strong>HTML5, CSS3, JavaScript, TypeScript, React, Vue</li><li><strong>工具：</strong>Git, Webpack, Vite, Figma</li><li><strong>后端：</strong>Node.js, Express, SQL</li></ul><h2>项目经历</h2><p><strong>ccc 效率平台</strong> — 全栈开发<br>从零搭建带登录、待办、简历管理的全栈 Web 应用</p>' },
          { name: '数据分析师', target: '数据分析师',
            content: '<h2>个人简介</h2><p>擅长数据挖掘与分析，熟悉 Python 数据科学工具栈，具备从数据清洗到可视化的全流程经验。</p><h2>技能清单</h2><ul><li><strong>编程：</strong>Python, SQL, R</li><li><strong>分析工具：</strong>Pandas, NumPy, Scikit-learn</li><li><strong>可视化：</strong>Matplotlib, ECharts, Tableau</li></ul><h2>项目经历</h2><p>...</p>' },
          { name: '产品经理', target: '产品经理',
            content: '<h2>个人简介</h2><p>具备市场洞察力与用户思维，熟悉产品从需求分析到上线的完整流程。</p><h2>技能清单</h2><ul><li><strong>工具：</strong>Figma, Axure, XMind</li><li><strong>方法：</strong>用户调研, A/B测试, 数据分析</li><li><strong>文档：</strong>PRD, BRD, 竞品分析</li></ul><h2>项目经历</h2><p>...</p>' }
        ].map((t, i) => `
          <div class="card" style="cursor:pointer" data-tpl='${JSON.stringify(t)}'>
            <h4 style="margin-bottom:4px">${t.name}</h4>
            <p style="font-size:13px;color:var(--text-secondary)">🎯 ${t.target}</p>
          </div>
        `).join('')}
      </div>
    `);

    content.querySelectorAll('[data-tpl]').forEach(el => {
      el.addEventListener('click', async () => {
        const t = JSON.parse(el.dataset.tpl);
        try {
          const r = await API.createResume(t.name, t.content, t.target);
          resumes.push(r);
          selectResume(r.id);
          closeModal(content);
          showToast('模板已应用 📋', 'success');
        } catch(e) { showToast('创建失败', 'error'); }
      });
    });
  });

  loadResumes();

  // Resume avatar upload
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#resumeAvatarUpload');
    if (!target) return;
    if (!currentId) { showToast('请先选择一份简历', 'info'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast('图片不能超过5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', async (loadEvent) => {
        try {
          const dataUrl = loadEvent.target.result;
          showToast('正在上传...', 'info');
          await API.saveResume(currentId, { avatar_data: dataUrl });
          const idx = resumes.findIndex(x => x.id === currentId);
          if (idx !== -1) {
            resumes[idx].avatar_data = dataUrl;
            renderList();
            const letterEl = container.querySelector('#avatarLetter');
            if (letterEl) {
              letterEl.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            }
          }
          showToast('头像已更新 ✅', 'success');
        } catch(e) {
          showToast('上传失败: ' + e.message, 'error');
        }
      });
      reader.addEventListener('error', () => {
        showToast('图片读取失败', 'error');
      });
      reader.readAsDataURL(file);
    });
    input.click();
  });
}
