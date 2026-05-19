function SchedulePage(container) {
  container.innerHTML = `
  <div class="page-enter">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div>
        <h2 class="page-title">📅 课程表</h2>
        <p class="page-sub">每周课表管理</p>
      </div>
      <button class="btn btn-primary btn-sm" id="addCourseBtn">➕ 添加课程</button>
    </div>

    <div style="overflow-x:auto">
      <div class="schedule-grid" id="scheduleGrid" style="min-width:600px"></div>
    </div>

    <div style="margin-top:16px;display:flex;gap:8px;font-size:12px;color:var(--text-light);flex-wrap:wrap">
      <span>💡 点击空格添加课程，点击已有课程编辑</span>
    </div>
  </div>`;

  const grid = container.querySelector('#scheduleGrid');
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const timeSlots = ['08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
  let schedules = [];

  function renderGrid() {
    let html = '<div class="schedule-header"></div>';
    days.forEach(d => { html += `<div class="schedule-header">${d}</div>`; });

    timeSlots.forEach((time, ti) => {
      html += `<div class="schedule-time">${time}</div>`;
      for (let di = 0; di < 7; di++) {
        const item = schedules.find(s => s.day_of_week === di && s.time_slot === time);
        if (item) {
          html += `<div class="schedule-cell" style="background:${item.color}22;border:1px solid ${item.color}" data-id="${item.id}">
            <div class="name" style="color:${item.color}">${esc(item.course_name)}</div>
            ${item.location ? `<div class="loc">${esc(item.location)}</div>` : ''}
          </div>`;
        } else {
          html += `<button class="schedule-add-btn" data-day="${di}" data-time="${time}">+</button>`;
        }
      }
    });
    grid.innerHTML = html;

    // Events
    grid.querySelectorAll('.schedule-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = parseInt(btn.dataset.day);
        const time = btn.dataset.time;
        showCourseForm(null, day, time);
      });
    });

    grid.querySelectorAll('.schedule-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const id = parseInt(cell.dataset.id);
        const item = schedules.find(s => s.id === id);
        if (item) showCourseForm(item);
      });
    });
  }

  function showCourseForm(item, newDay, newTime) {
    const isNew = !item;
    const modal = openModal(`
      <div class="modal-header">
        <h3>${isNew ? '添加课程' : '编辑课程'}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="form-group">
        <label>课程名称</label>
        <input type="text" class="form-input" id="courseName" value="${isNew ? '' : esc(item.course_name)}" placeholder="课程名称">
      </div>
      <div class="form-group">
        <label>星期</label>
        <select class="form-input" id="courseDay">
          ${days.map((d, i) => `<option value="${i}" ${isNew && i === newDay ? 'selected' : !isNew && item.day_of_week === i ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>时间段</label>
        <select class="form-input" id="courseTime">
          ${timeSlots.map(t => `<option value="${t}" ${isNew && t === newTime ? 'selected' : !isNew && item.time_slot === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>地点（可选）</label>
        <input type="text" class="form-input" id="courseLoc" value="${isNew ? '' : esc(item.location || '')}" placeholder="教室/地点">
      </div>
      <div class="form-group">
        <label>颜色</label>
        <input type="color" class="form-input" id="courseColor" value="${isNew ? '#165DFF' : item.color || '#165DFF'}" style="height:40px;padding:4px">
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        ${!isNew ? `<button class="btn btn-sm btn-danger" onclick="(async()=>{await API.deleteSchedule(${item.id});loadSchedules();this.closest('.modal-overlay').remove();showToast('已删除','info')})()">删除</button>` : ''}
        <button class="btn btn-sm btn-primary" id="saveCourseBtn">${isNew ? '添加' : '保存'}</button>
      </div>
    `);

    modal.querySelector('#saveCourseBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#courseName').value.trim();
      const day = parseInt(modal.querySelector('#courseDay').value);
      const time = modal.querySelector('#courseTime').value;
      const loc = modal.querySelector('#courseLoc').value.trim();
      const color = modal.querySelector('#courseColor').value;
      if (!name) { showToast('课程名称不能为空', 'error'); return; }
      try {
        if (isNew) {
          await API.addSchedule(day, time, name, loc, color);
        } else {
          await API.updateSchedule(item.id, { day_of_week: day, time_slot: time, course_name: name, location: loc, color });
        }
        closeModal(modal);
        loadSchedules();
        showToast(isNew ? '已添加 ✅' : '已保存 ✅', 'success');
      } catch(e) { showToast('操作失败', 'error'); }
    });
  }

  async function loadSchedules() {
    try {
      schedules = await API.getSchedules();
      renderGrid();
    } catch(e) { showToast('加载课程表失败', 'error'); }
  }

  container.querySelector('#addCourseBtn').addEventListener('click', () => {
    showCourseForm(null, 0, '08:00');
  });

  loadSchedules();
}
