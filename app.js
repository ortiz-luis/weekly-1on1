const STORAGE_KEY = 'weekly-1on1-lucas-v0';

function genericSeed() {
  const d = new Date();
  const delta = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + delta);
  const id = d.toISOString().slice(0, 10);
  return {
    schemaVersion: WeeklyCore.CURRENT_SCHEMA_VERSION,
    meetings: [{id, date:id, manager:'Lucas', status:'preparing', agenda:[], summary:'', followUps:[], outcomes:{}}],
    topics: [],
    deliverables: [],
    decisions: [],
    history: [],
    snapshots: []
  };
}

const seed = WeeklyCore.normalizeAndMigrateState(window.WEEKLY_PRIVATE_SEED || genericSeed(), genericSeed());
const clone = x => JSON.parse(JSON.stringify(x));
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return WeeklyCore.normalizeAndMigrateState(raw ? JSON.parse(raw) : seed, seed);
  } catch {
    return clone(seed);
  }
}
let state = load();
let deliverableFilter = 'all';
const $ = q => document.querySelector(q);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nav = [['home','⌂','Inicio'],['next','◎','Próximo 1:1'],['topics','◉','Temas'],['deliverables','▢','Entregables'],['history','↺','Histórico']];

function save() {
  state = WeeklyCore.normalizeAndMigrateState(state, seed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function route() {
  const [page='home', id] = location.hash.replace(/^#/, '').split('/');
  return {page:page || 'home', id};
}
function renderNav() {
  const p = route().page;
  const h = nav.map(([id,ic,l]) => `<a class="nav-link ${p===id?'active':''}" href="#${id}"><span>${ic}</span><span>${l}</span></a>`).join('');
  $('#desktop-nav').innerHTML = h;
  $('#mobile-nav').innerHTML = h;
}
function meeting() {
  return state.meetings.find(m => m.status !== 'completed') || state.meetings[0];
}
function maturityLabel(x) {
  return {'work-in-progress':'En preparación',candidate:'Candidato','ready-to-show':'Listo para mostrar','shown-reviewed':'Mostrado / revisado','archived-superseded':'Archivado'}[x] || x;
}
function typeLabel(x) {
  return {presentation:'Presentación',dashboard:'Dashboard','one-pager':'One-pager',pdf:'PDF',demo:'Demo',report:'Informe'}[x] || x;
}
function selectionLabel(x) {
  return {active:'Activo','waiting-for-evidence':'Esperando evidencia',closed:'Cerrado'}[x] || x;
}
function readinessOf(d) {
  return Number.isFinite(d.readiness) ? Math.max(0, Math.min(100, d.readiness)) : (d.maturity === 'ready-to-show' ? 90 : d.maturity === 'candidate' ? 65 : 35);
}
function readinessMarkup(d) {
  const p = readinessOf(d);
  return `<div class="readiness"><div class="readiness-track"><div class="readiness-fill" style="width:${p}%"></div></div><small>${p}% listo</small></div>`;
}
function fmtDate(d) {
  return new Intl.DateTimeFormat('es', {weekday:'long',day:'numeric',month:'long'}).format(new Date(d + 'T12:00:00'));
}
function selectedDeliverables(m) {
  return (m?.agenda || []).map(id => state.deliverables.find(d => d.id === id)).filter(Boolean);
}
function listDeliverables(list) {
  return `<div class="app-list">${list.map(d => `<a class="app-row" href="#deliverables/${d.id}"><div><b>${esc(d.title)}</b><span>${typeLabel(d.type)} · ${maturityLabel(d.maturity)}</span>${readinessMarkup(d)}</div><div class="row-end"><span class="mini-state ${d.maturity==='ready-to-show'?'ready':'preparing'}">${maturityLabel(d.maturity)}</span><i>›</i></div></a>`).join('')}</div>`;
}
function homePage() {
  const m = meeting();
  const target = selectedDeliverables(m);
  const ready = target.filter(d => d.maturity === 'ready-to-show');
  const cooking = target.filter(d => ['candidate','work-in-progress'].includes(d.maturity));
  const asks = state.decisions.filter(d => d.meetingId === m.id && d.status === 'planned');
  const avg = Math.round(target.reduce((a,d) => a + readinessOf(d), 0) / Math.max(1, target.length));
  return `<section class="app-page home-screen"><div class="simple-head"><h1>1:1 con Lucas</h1><p class="subtle">Llegar con pocos objetos maduros y preguntas claras, no con una lista de todo lo trabajado.</p></div><div class="app-status"><span>${avg>=80?'✓':'○'}</span><strong>Preparando ${fmtDate(m.date)} · ${avg}% global</strong></div><div class="metric-grid"><a class="metric-card" href="#deliverables"><b>${ready.length}</b><span>Listos para mostrar</span></a><a class="metric-card" href="#next"><b>${asks.length}</b><span>Decisiones para Lucas</span></a></div><div class="section-head"><h2>Listo para el próximo 1:1</h2></div>${ready.length?listDeliverables(ready):'<div class="blank">Todavía no hay entregables listos.</div>'}<div class="section-head"><h2>Todavía en preparación</h2></div>${cooking.length?listDeliverables(cooking):'<div class="blank">Nada pendiente para esta reunión.</div>'}<div class="section-head"><h2>Necesito de Lucas</h2></div>${asks.map(a=>`<div class="wide-card"><span class="spark">?</span><b>${esc(a.question)}</b><span></span></div>`).join('')}<div class="section-head"><h2>No invertir tiempo antes del próximo 1:1 en</h2></div><div class="quiet-list">${target.filter(d=>d.overworkWarning).map(d=>`<div class="quiet-item">${esc(d.overworkWarning)}</div>`).join('')}</div><div class="home-note"><b>Definición de listo:</b> se entiende en pocos minutos, tiene objetivo explícito y termina en una pregunta o decisión.</div></section>`;
}
function nextPage() {
  const m = meeting();
  const ordered = selectedDeliverables(m);
  const plan = ordered.length ? ordered.map((d,i) => `<div class="plan-row"><span>${i+1}</span><div><b>${esc(d.title)}</b><small>${esc(d.reviewAsk || d.objective || 'Cerrar el siguiente paso.')}</small></div></div>`).join('') : '<div class="blank compact-blank">No hay entregables seleccionados para este 1:1.</div>';
  const decisions = state.decisions.filter(x => x.meetingId === m.id && x.status === 'planned');
  return `<section class="app-page"><div class="simple-head"><h1>Próximo 1:1</h1><p class="subtle">${fmtDate(m.date)}</p></div><div class="section-head"><h2>Guion sugerido</h2></div><div class="meeting-plan">${plan}</div><div class="section-head"><h2>Orden de entregables</h2></div>${ordered.length?listDeliverables(ordered):'<div class="blank">No hay entregables seleccionados.</div>'}<div class="section-head"><h2>Qué queremos de Lucas</h2></div>${decisions.length?decisions.map(x=>`<div class="wide-card"><span class="spark">?</span><b>${esc(x.question)}</b><span></span></div>`).join(''):'<div class="blank compact-blank">No hay decisiones registradas.</div>'}</section>`;
}
function topicsPage() {
  return `<section class="app-page"><div class="simple-head"><h1>Temas</h1><p class="subtle">Un tema puede avanzar mucho sin tener todavía un objeto maduro para mostrar.</p></div><div class="app-list">${state.topics.map(t=>`<a class="app-row" href="#topics/${t.id}"><div><b>${esc(t.title)}</b><span>${esc(t.latestUpdate)}</span></div><i>›</i></a>`).join('')}</div></section>`;
}
function topicPage(id) {
  const t = state.topics.find(x => x.id === id);
  if (!t) return missing();
  const ds = state.deliverables.filter(d => d.topicId === id);
  return `<section class="app-page"><a class="back" href="#topics">‹ Temas</a><div class="detail-title"><h1>${esc(t.title)}</h1><span>${esc(t.latestUpdate)}</span></div><div class="fact-strip"><div><span>Próxima acción</span><b>${esc(t.nextAction)}</b></div><div><span>Need from Lucas</span><b>${esc(t.needFromLucas || '—')}</b></div></div><div class="section-head"><h2>Entregables relacionados</h2></div>${ds.length?listDeliverables(ds):'<div class="blank">Todavía no hay un entregable asociado.</div>'}</section>`;
}
function deliverablesPage() {
  const order = ['ready-to-show','candidate','work-in-progress','shown-reviewed','archived-superseded'];
  let list = [...state.deliverables].sort((a,b) => order.indexOf(a.maturity) - order.indexOf(b.maturity));
  if (deliverableFilter === 'ready') list = list.filter(d => d.maturity === 'ready-to-show');
  if (deliverableFilter === 'candidate') list = list.filter(d => ['candidate','work-in-progress'].includes(d.maturity));
  if (deliverableFilter === 'reviewed') list = list.filter(d => d.maturity === 'shown-reviewed');
  if (deliverableFilter === 'waiting') list = list.filter(d => d.selectionState === WeeklyCore.WAITING);
  const chips = [['all','Todos'],['ready','Listos'],['candidate','Candidatos'],['waiting','Esperando evidencia'],['reviewed','Revisados']];
  return `<section class="app-page"><div class="simple-head"><h1>Entregables</h1><p class="subtle">Crear un objeto no lo añade automáticamente al próximo 1:1.</p></div><div class="chip-row">${chips.map(([k,l])=>`<button class="chip ${deliverableFilter===k?'active':''}" data-filter="${k}">${l}</button>`).join('')}</div>${list.length?listDeliverables(list):'<div class="blank">No hay entregables en este estado.</div>'}</section>`;
}
function maturityAction(d) {
  if (d.maturity === 'work-in-progress') return ['candidate','Promover a candidato'];
  if (d.maturity === 'candidate') return ['ready-to-show','Marcar listo para mostrar'];
  return null;
}
function deliverablePage(id) {
  const d = state.deliverables.find(x => x.id === id);
  if (!d) return missing();
  const t = state.topics.find(x => x.id === d.topicId);
  const m = meeting();
  const action = maturityAction(d);
  const selected = WeeklyCore.selectedForMeeting(state, d, m);
  const safeLink = WeeklyCore.safeExternalUrl(d.link);
  const targetLabel = selected ? m.date.slice(5) : '—';
  const selectionAction = selected ? `<button class="wide-action secondary-action" data-deselect="${d.id}">Sacar de este 1:1</button>` : `<button class="wide-action" data-select="${d.id}">Añadir al próximo 1:1</button>`;
  const waitingAction = d.selectionState === WeeklyCore.WAITING ? `<button class="wide-action secondary-action" data-reactivate="${d.id}">Reactivar</button>` : `<button class="wide-action secondary-action" data-wait="${d.id}">Esperando evidencia</button>`;
  return `<section class="app-page"><a class="back" href="#deliverables">‹ Entregables</a><div class="detail-title"><h1>${esc(d.title)}</h1><span>${typeLabel(d.type)} · ${esc(d.version)}</span>${readinessMarkup(d)}</div><div class="state-counters"><div class="ok"><span>Madurez</span><b>${d.maturity==='ready-to-show'?'✓':'○'}</b></div><div><span>Faltan</span><b>${d.missingDependencies.length}</b></div><div><span>1:1</span><b>${esc(targetLabel)}</b></div></div><div class="fact-strip"><div><span>Objetivo</span><b>${esc(d.objective || '—')}</b></div><div><span>Review ask</span><b>${esc(d.reviewAsk || '—')}</b></div><div><span>Por qué ahora</span><b>${esc(d.whyNow || '—')}</b></div><div><span>Selección</span><b>${esc(selectionLabel(d.selectionState))}</b></div></div><button class="wide-action secondary-action" data-edit-deliverable="${d.id}">Editar criterios</button>${selectionAction}${waitingAction}${d.maturity!=='archived-superseded'?`<button class="wide-action secondary-action" data-archive="${d.id}">Archivar / superseded</button>`:''}<div class="section-head"><h2>Qué falta</h2></div>${d.missingDependencies.length?`<div class="compact-list">${d.missingDependencies.map((x,i)=>`<button class="compact-item" data-dep="${i}" data-id="${d.id}"><i>○</i><b>${esc(x)}</b><span>Completar</span></button>`).join('')}</div>`:'<div class="done-card">No hay dependencias pendientes.</div>'}${d.overworkWarning?`<div class="section-head"><h2>No invertir tiempo ahora en</h2></div><div class="quiet-item">${esc(d.overworkWarning)}</div>`:''}${action?`<button class="wide-action" data-maturity="${action[0]}" data-id="${d.id}">${action[1]}</button>`:''}${safeLink?`<a class="wide-action secondary-action" href="${esc(safeLink)}" target="_blank" rel="noreferrer">Abrir entregable</a>`:''}<div class="section-head"><h2>Tema</h2></div>${t?`<a class="app-row" href="#topics/${t.id}"><div><b>${esc(t.title)}</b><span>${esc(t.latestUpdate)}</span></div><i>›</i></a>`:'<div class="blank">Tema no disponible.</div>'}</section>`;
}
function historyPage() {
  return `<section class="app-page"><div class="simple-head"><h1>Histórico</h1></div>${state.history.length?`<div class="app-list">${state.history.map(h=>`<div class="app-row"><div><b>${esc(h.title)}</b><span>${esc(h.note || '')}</span></div></div>`).join('')}</div>`:'<div class="blank">El histórico se llenará después del primer 1:1 registrado.</div>'}</section>`;
}
function missing() {
  return '<section class="app-page"><h1>No encontrado</h1></section>';
}
function gateMessage(result) {
  return `No se puede completar todavía: ${(result.missing || []).join(', ')}.`;
}
function bind() {
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {deliverableFilter = b.dataset.filter; render();});
  document.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => {
    const d = state.deliverables.find(x => x.id === b.dataset.id);
    if (!d) return;
    d.missingDependencies.splice(Number(b.dataset.dep), 1);
    d.readiness = Math.min(100, readinessOf(d) + 10);
    save(); render();
  });
  document.querySelectorAll('[data-maturity]').forEach(b => b.onclick = () => {
    const result = WeeklyCore.promoteDeliverable(state, b.dataset.id, b.dataset.maturity, meeting());
    if (!result.ok) return alert(gateMessage(result));
    save(); render();
  });
  document.querySelectorAll('[data-select]').forEach(b => b.onclick = () => {
    const result = WeeklyCore.selectDeliverableForMeeting(state, b.dataset.select, meeting().id);
    if (!result.ok) return alert(gateMessage(result));
    save(); render();
  });
  document.querySelectorAll('[data-deselect]').forEach(b => b.onclick = () => {
    WeeklyCore.deselectDeliverableFromMeeting(state, b.dataset.deselect, meeting().id);
    save(); render();
  });
  document.querySelectorAll('[data-wait]').forEach(b => b.onclick = () => {
    WeeklyCore.setSelectionState(state, b.dataset.wait, WeeklyCore.WAITING);
    save(); render();
  });
  document.querySelectorAll('[data-reactivate]').forEach(b => b.onclick = () => {
    WeeklyCore.setSelectionState(state, b.dataset.reactivate, WeeklyCore.ACTIVE);
    save(); render();
  });
  document.querySelectorAll('[data-archive]').forEach(b => b.onclick = () => {
    WeeklyCore.setSelectionState(state, b.dataset.archive, WeeklyCore.CLOSED);
    save(); render();
  });
}
function render() {
  renderNav();
  const r = route();
  const html = r.page === 'next' ? nextPage() : r.page === 'topics' && r.id ? topicPage(r.id) : r.page === 'topics' ? topicsPage() : r.page === 'deliverables' && r.id ? deliverablePage(r.id) : r.page === 'deliverables' ? deliverablesPage() : r.page === 'history' ? historyPage() : homePage();
  $('#main').innerHTML = html;
  bind();
}
window.addEventListener('hashchange', render);
$('#reset-data').onclick = () => {localStorage.removeItem(STORAGE_KEY); state = clone(seed); render();};
save();
render();
