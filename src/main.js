import './styles.css'
import './matters.css'

import { createApiClient } from './api.js'

const api = createApiClient()

const demoAppointments = [
  { id: 'LG-0716-082', patientId: 'LG-001', patient: '案卷 C082 · 上海某公司', department: '合同纠纷', doctor: '林律师', scheduledAt: '今天 09:30', status: '待立案' },
  { id: 'LG-0716-079', patientId: 'LG-001', patient: '案卷 C079 · 李某', department: '劳动争议', doctor: '沈律师', scheduledAt: '今天 14:00', status: '待办理' },
  { id: 'LG-0715-031', patientId: 'LG-001', patient: '案卷 C031 · 星河科技', department: '知识产权', doctor: '赵律师', scheduledAt: '07/23 10:30', status: '已结案' },
]

const demoFollowups = [
  { id: 'LG-0716-014', patientId: 'LG-001', patient: '案卷 C082', summary: '证据清单与举证期限', dueAt: '今天 18:00', status: '待完成' },
  { id: 'LG-0715-006', patientId: 'LG-001', patient: '案卷 C079', summary: '庭审材料校对', dueAt: '明天 10:00', status: '待完成' },
]

const demoMatters = [
  { id: 'LF-0720-003', subjectAlias: '演示案卷-003', caseType: '知识产权', priority: '高', deadline: '2026-07-23', assignee: '赵律师', status: '待结案', documents: [{ name: '证据目录.pdf', kind: 'evidence', checksum: 'sha256:demo-003' }], tasks: [{ title: '结案文书复核', assignee: '赵律师', status: '待处理' }], events: [{ action: '创建案件', actor: '系统', createdAt: '2026-07-16 09:00', toStatus: '待委托' }, { action: '归档文档', actor: '赵律师', createdAt: '2026-07-16 14:20' }] },
  { id: 'LF-0720-002', subjectAlias: '演示案卷-002', caseType: '劳动争议', priority: '中', deadline: '2026-07-22', assignee: '沈律师', status: '协同中', documents: [], tasks: [{ title: '证据清单核验', assignee: '沈律师', status: '待处理' }], events: [] },
  { id: 'LF-0720-004', subjectAlias: '演示案卷-004', caseType: '合同审查', priority: '低', deadline: '2026-07-24', assignee: '', status: '待委托', documents: [], tasks: [], events: [] },
]

let appointments = [...demoAppointments]
let followups = [...demoFollowups]
let matters = [...demoMatters]
const matterEventsById = new Map(matters.map((item) => [item.id, item.events || []]))
let dataSource = '演示数据'
const busyActions = new Set()

const app = document.querySelector('#app')

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function statusClass(status) {
  if (status === '已完成') return 'green'
  if (status === '待办理' || status === '办理中') return 'indigo'
  if (status === '已立案') return 'blue'
  if (status === '已撤案') return 'muted'
  return 'coral'
}

function displayTime(value) {
  const text = String(value ?? '')
  if (!text.includes('T')) return text
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function appointmentAction(status) {
  switch (status) {
    case '待立案': return { action: 'checkin', label: '提交立案' }
    case '已立案': return { action: 'waiting', label: '进入办理' }
    case '待办理': return { action: 'serving', label: '开始办理' }
    case '办理中': return { action: 'complete-appointment', label: '提交结案' }
    default: return null
  }
}

function renderAppointment(appointment) {
  const action = appointmentAction(appointment.status)
  const actionButton = action
    ? `<button class="visit-action" data-action="${action.action}" data-id="${escapeHtml(appointment.id)}">${action.label}　→</button>`
    : `<span class="visit-note">${appointment.status === '已完成' ? '服务已完成' : '案件已取消'}</span>`

  return `<article class="visit">
    <div class="visit-top"><span class="tag ${statusClass(appointment.status)}">${escapeHtml(appointment.status)}</span><span>${escapeHtml(displayTime(appointment.scheduledAt))}</span></div>
    <h4>${escapeHtml(appointment.department)}</h4>
    <p>${escapeHtml(appointment.doctor)} · 上海静安联合法务</p>
    ${actionButton}
  </article>`
}

function renderFollowup(followup) {
  const completed = followup.status === '已完成'
  return `<article class="reminder ${completed ? 'done' : 'warm'}">
    <span>${completed ? '✓' : '!'}</span>
    <div><strong>${escapeHtml(followup.summary)}</strong><p>${escapeHtml(followup.dueAt)} · ${completed ? '已完成' : '待完成'}</p></div>
    ${completed ? '<b class="done-mark">已完成</b>' : `<button data-action="complete-followup" data-id="${escapeHtml(followup.id)}">完成</button>`}
  </article>`
}

function renderMatter(matter) {
  const events = matterEventsById.get(matter.id) || matter.events || []
  const action = matter.status === '待结案' ? `<button class="visit-action" data-action="close-matter" data-id="${escapeHtml(matter.id)}">提交结案摘要　→</button>` : matter.status === '待委托' ? `<button class="visit-action" data-action="assign-matter" data-id="${escapeHtml(matter.id)}">领取协同任务　→</button>` : `<button class="visit-action" data-action="add-matter-file" data-id="${escapeHtml(matter.id)}">上传文档元数据　→</button>`
  return `<article class="matter-card"><div class="visit-top"><span class="tag ${statusClass(matter.status)}">${escapeHtml(matter.status)}</span><span>截止日期 ${escapeHtml(matter.deadline)}</span></div><h4>${escapeHtml(matter.subjectAlias)}</h4><p>${escapeHtml(matter.caseType)} · ${escapeHtml(matter.priority)}优先级 · ${escapeHtml(matter.assignee || '待分配')}</p><div class="matter-card__meta"><span>${(matter.tasks || []).length} 个任务</span><span>${(matter.documents || []).length} 份文档</span></div>${(matter.tasks || []).map((task) => `<div class="matter-task-mini"><b>✓</b><span>${escapeHtml(task.title)} · ${escapeHtml(task.assignee)}</span></div>`).join('')}${(matter.documents || []).map((doc) => `<div class="matter-doc-mini"><b>▧</b><span>${escapeHtml(doc.name)} · ${escapeHtml(doc.checksum)}</span></div>`).join('')}${events.slice(-2).map((event) => `<div class="matter-event-mini"><i></i><span>${escapeHtml(event.action)} · ${escapeHtml(event.actor)} · ${escapeHtml(event.createdAt)}</span></div>`).join('')}${action}</article>`
}

function render() {
  app.innerHTML = `<main class="app">
    <header>
      <div><p>LEGALFLOW / 2026</p><h1>把案件交给<br><b>值得信赖的律师</b></h1></div>
      <div class="header-side"><span class="source-badge">${dataSource}</span><span class="avatar">许</span></div>
    </header>
    <section class="hero"><span>案件工作台</span><h2>今天也要稳步推进</h2><p>立案 · 办理 · 合规<br>每一步都有清晰提醒</p><div class="sun">✚</div></section>
    <section class="quick">
      <button data-action="create-appointment"><b>＋</b><span>新建案件</span></button>
      <button data-action="refresh"><b>◷</b><span>刷新案件队列</span></button>
      <button data-action="create-followup"><b>♡</b><span>新建合规</span></button>
    </section>
    <div class="section-head"><h3>我的案件 <small>${appointments.length} 条</small></h3><a data-action="refresh">同步 →</a></div>
    <section class="visits">${appointments.length ? appointments.map(renderAppointment).join('') : '<div class="empty">暂时没有案件，点击上方新建一条</div>'}</section>
    <div class="section-head"><h3>合规任务 <small class="coral">${followups.filter((item) => item.status !== '已完成').length} 条待办</small></h3><a data-action="refresh">查看 →</a></div>
    <section class="reminders">${followups.length ? followups.slice(0, 3).map(renderFollowup).join('') : '<div class="empty">暂无合规任务</div>'}</section>
    <div class="section-head"><h3>案件协同 <small>${matters.length} 个</small></h3><a data-action="refresh">同步 →</a></div>
    <section class="matters-mobile">${matters.length ? matters.map(renderMatter).join('') : '<div class="empty">暂无案件协同</div>'}</section>
    <nav><button class="active">⌂<small>首页</small></button><button data-action="create-appointment">＋<small>案件</small></button><button data-action="refresh">◷<small>办理</small></button><button data-action="create-followup">♡<small>我的</small></button></nav>
    <div class="toast" hidden></div>
  </main>`
  bindActions()
}

function showToast(message) {
  const toast = document.querySelector('.toast')
  if (!toast) return
  toast.textContent = message
  toast.hidden = false
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => { toast.hidden = true }, 2200)
}

function updateAppointment(id, updater) {
  appointments = appointments.map((item) => item.id === id ? updater(item) : item)
}

function updateFollowup(id, updater) {
  followups = followups.map((item) => item.id === id ? updater(item) : item)
}

function localAppointment() {
  return {
    id: `LG-DEMO-${Date.now().toString().slice(-6)}`,
    patientId: 'LG-001', patient: '案卷 C001 · 演示企业', department: '合同纠纷', doctor: '林律师',
    scheduledAt: '明天 09:30', status: '待立案',
  }
}

function localFollowup() {
  return {
    id: `LG-TASK-${Date.now().toString().slice(-6)}`,
    patientId: 'LG-001', patient: '案卷 C001 · 演示企业', summary: '证据清单与举证期限', dueAt: '明天 18:00', status: '待完成',
  }
}

async function refreshFromApi() {
  const results = await Promise.allSettled([
    api.listAppointments({ page: 1, pageSize: 20 }),
    api.listFollowups({ page: 1, pageSize: 20 }),
    api.listMatters({ page: 1, pageSize: 20 }),
  ])
  let synced = 0
  const appointmentsResult = results[0]
  if (appointmentsResult.status === 'fulfilled' && Array.isArray(appointmentsResult.value?.list)) {
    appointments = appointmentsResult.value.list
    synced += 1
  }
  const followupsResult = results[1]
  if (followupsResult.status === 'fulfilled' && Array.isArray(followupsResult.value?.list)) {
    followups = followupsResult.value.list
    synced += 1
  }
  const mattersResult = results[2]
  if (mattersResult.status === 'fulfilled' && Array.isArray(mattersResult.value?.list)) {
    matters = mattersResult.value.list
    for (const matter of matters) { if (!matterEventsById.has(matter.id)) matterEventsById.set(matter.id, matter.events || []) }
    synced += 1
  }
  dataSource = synced ? '接口数据' : '演示数据'
  render()
  showToast(synced ? '已同步最新案件与合规' : '服务暂不可用，继续使用演示数据')
}

async function refreshMatterEvents(id) {
  try { const response = await api.listMatterEvents(id); matterEventsById.set(id, response?.list || []); const matter = matters.find((item) => item.id === id); if (matter) matter.events = response?.list || []; render() } catch { /* 保留演示时间线 */ }
}

async function matterAction(id, action) {
  const matter = matters.find((item) => item.id === id); if (!matter) return
  try {
    if (action === 'assign-matter') { const result = await api.assignMatter(id, { assignee: '林律师', actor: '当事人端' }); matters = matters.map((item) => item.id === id ? { ...item, ...result.matter, tasks: result.task ? [result.task] : item.tasks } : item) }
    if (action === 'add-matter-file') { await api.addMatterFile(id, { name: '协同记录.pdf', kind: 'collaboration', checksum: `sha256:${id}` }); const detail = await api.getMatter(id); matters = matters.map((item) => item.id === id ? detail : item) }
    if (action === 'close-matter') { const result = await api.closeMatter(id, { result: '结案摘要已确认', actor: '当事人端' }); matters = matters.map((item) => item.id === id ? { ...item, ...result.matter } : item) }
    dataSource = '接口数据'; await refreshMatterEvents(id); showToast('案件协同已更新')
  } catch { showToast('接口暂不可用，请稍后重试') }
}

async function createAppointment() {
  const input = {
    patientId: 'LG-001', patient: '案卷 C001 · 演示企业', department: '合同纠纷', doctor: '林律师',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
  try {
    const created = await api.createAppointment(input)
    appointments = [created, ...appointments]
    dataSource = '接口数据'
    render()
    showToast('案件已提交，等待法务确认')
  } catch {
    appointments = [localAppointment(), ...appointments]
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已保留演示案件')
  }
}

async function createFollowup() {
  const input = { patientId: 'LG-001', patient: '案卷 C001 · 演示企业', summary: '证据清单与举证期限', dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
  try {
    const created = await api.createFollowup(input)
    followups = [created, ...followups]
    dataSource = '接口数据'
    render()
    showToast('合规任务已创建')
  } catch {
    followups = [localFollowup(), ...followups]
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已保留演示合规')
  }
}

async function transitionAppointment(id, action) {
  const current = appointments.find((item) => item.id === id)
  if (!current) return
  const statusByAction = { waiting: '待办理', serving: '办理中', 'complete-appointment': '已结案' }
  try {
    const updated = action === 'checkin'
      ? await api.checkinAppointment(id)
      : await api.updateAppointmentStatus(id, statusByAction[action], '当事人端')
    updateAppointment(id, () => updated)
    dataSource = '接口数据'
    render()
    showToast(action === 'checkin' ? '立案成功，已进入办理队列' : `状态已更新为${updated.status}`)
  } catch {
    const fallbackStatus = action === 'checkin' ? '已立案' : statusByAction[action]
    updateAppointment(id, (item) => ({ ...item, status: fallbackStatus }))
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已在演示数据中推进')
  }
}

async function completeFollowup(id) {
  try {
    const updated = await api.completeFollowup(id)
    updateFollowup(id, () => updated)
    dataSource = '接口数据'
    render()
    showToast('合规已完成，感谢你的反馈')
  } catch {
    updateFollowup(id, (item) => ({ ...item, status: '已完成' }))
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已在演示数据中标记完成')
  }
}

async function handleAction(action, id) {
  const key = `${action}:${id ?? ''}`
  if (busyActions.has(key)) return
  busyActions.add(key)
  const button = [...document.querySelectorAll('[data-action]')].find((item) => item.dataset.action === action && (id === undefined || item.dataset.id === id))
  if (button) { button.disabled = true; button.dataset.busy = 'true'; button.textContent = '处理中…' }
  try {
    if (action === 'refresh') await refreshFromApi()
    if (action === 'create-appointment') await createAppointment()
    if (action === 'create-followup') await createFollowup()
    if (['checkin', 'waiting', 'serving', 'complete-appointment'].includes(action)) await transitionAppointment(id, action)
    if (action === 'complete-followup') await completeFollowup(id)
    if (['assign-matter', 'add-matter-file', 'close-matter'].includes(action)) await matterAction(id, action)
  } finally {
    busyActions.delete(key)
  }
}

function bindActions() {
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', () => handleAction(element.dataset.action, element.dataset.id))
  })
}

render()
void refreshFromApi()
