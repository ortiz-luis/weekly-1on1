(() => {
  const deepClone = value => JSON.parse(JSON.stringify(value));

  function ensureHistoricalSnapshots() {
    if (!Array.isArray(state.snapshots)) state.snapshots = [];
    for (const m of state.meetings || []) {
      if (m.status !== 'completed' || state.snapshots.some(s => s.meetingId === m.id)) continue;
      const agendaIds = Array.isArray(m.agenda) ? m.agenda : [];
      const deliverables = agendaIds
        .map(id => (state.deliverables || []).find(d => d.id === id))
        .filter(Boolean)
        .map(deepClone);
      const decisions = (state.decisions || []).filter(d => d.meetingId === m.id).map(deepClone);
      const topicIds = new Set([...deliverables.map(d => d.topicId), ...decisions.map(d => d.topicId)]);
      const topics = (state.topics || []).filter(t => topicIds.has(t.id)).map(deepClone);
      state.snapshots.push({
        meetingId: m.id,
        date: m.date,
        manager: m.manager || 'Lucas',
        summary: m.summary || '',
        closedAt: null,
        agendaIds: deepClone(agendaIds),
        deliverables,
        decisions,
        topics,
        carryOver: []
      });
    }
  }
  ensureHistoricalSnapshots();
  save();

  function topicTitle(snapshot, topicId) {
    return snapshot.topics.find(t => t.id === topicId)?.title || 'Tema';
  }

  function historyListPage() {
    const snapshots = [...(state.snapshots || [])].sort((a, b) => b.date.localeCompare(a.date));
    return `<section class="app-page"><div class="simple-head"><h1>Histórico</h1><p class="subtle">Cada reunión queda congelada tal como estaba al cerrarla. Los cambios posteriores no modifican este registro.</p></div>${snapshots.length ? `<div class="history-snapshot-list">${snapshots.map(s => `<a class="history-snapshot-card" href="#history/${s.meetingId}"><div><span class="history-date">${fmtDate(s.date)}</span><b>1:1 con ${esc(s.manager || 'Lucas')}</b><p>${esc(s.summary || 'Sin resumen registrado.')}</p><small>${s.deliverables.length} entregables · ${s.decisions.length} preguntas · ${s.carryOver.length} arrastrados</small></div><i>›</i></a>`).join('')}</div>` : '<div class="blank">Todavía no hay reuniones cerradas.</div>'}</section>`;
  }

  function historyDetailPage(id) {
    const s = (state.snapshots || []).find(x => x.meetingId === id);
    if (!s) return `<section class="app-page"><a class="back" href="#history">‹ Histórico</a><h1>No encontrado</h1></section>`;
    const shown = s.deliverables.filter(d => d.maturity === 'shown-reviewed');
    const other = s.deliverables.filter(d => d.maturity !== 'shown-reviewed');
    return `<section class="app-page history-detail"><a class="back" href="#history">‹ Histórico</a><div class="simple-head"><h1>1:1 — ${fmtDate(s.date)}</h1><p class="subtle">Snapshot cerrado. Este contenido ya no cambia.</p></div>
      <div class="history-summary-box"><span>Qué dijo Lucas / qué quedó acordado</span><p>${esc(s.summary || 'Sin resumen registrado.')}</p></div>
      <div class="section-head"><h2>Entregables de esa reunión</h2></div>
      <div class="history-snapshot-list">${[...shown, ...other].map(d => `<div class="history-deliverable-card"><div><b>${esc(d.title)}</b><span>${esc(topicTitle(s, d.topicId))} · ${esc(typeLabel(d.type))}</span><small>${esc(maturityLabel(d.maturity))} · ${Number.isFinite(d.readiness) ? d.readiness : '—'}% listo</small>${d.objective ? `<p>${esc(d.objective)}</p>` : ''}${d.reviewAsk ? `<div class="history-ask">Pregunta asociada: ${esc(d.reviewAsk)}</div>` : ''}</div></div>`).join('')}</div>
      <div class="section-head"><h2>Preguntas / decisiones para Lucas</h2></div>
      ${s.decisions.length ? `<div class="history-snapshot-list">${s.decisions.map(d => `<div class="history-decision-card"><span>?</span><div><b>${esc(d.question)}</b><small>${esc(topicTitle(s, d.topicId))}</small></div></div>`).join('')}</div>` : '<div class="blank compact-blank">No había preguntas registradas.</div>'}
      <div class="section-head"><h2>Arrastrado a la semana siguiente</h2></div>
      ${s.carryOver.length ? `<div class="history-snapshot-list">${s.carryOver.map(x => `<div class="history-carry-card"><b>${esc(x.title)}</b><span>${esc(maturityLabel(x.maturity))}</span></div>`).join('')}</div>` : '<div class="done-card">Nada quedó pendiente para arrastrar.</div>'}
    </section>`;
  }

  historyPage = function () {
    const id = route().id;
    return id ? historyDetailPage(id) : historyListPage();
  };

  render();
})();
