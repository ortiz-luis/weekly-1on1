(() => {
  const deepClone = value => JSON.parse(JSON.stringify(value));

  function ensureSnapshots() {
    if (!Array.isArray(state.snapshots)) state.snapshots = [];
    for (const m of state.meetings || []) {
      if (m.status === 'completed' && !state.snapshots.some(s => s.meetingId === m.id)) {
        const agendaIds = Array.isArray(m.agenda) ? m.agenda : [];
        const deliverables = (state.deliverables || []).filter(d => agendaIds.includes(d.id)).map(deepClone);
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
  }
  ensureSnapshots();
  save();

  function snapshotFor(current) {
    const agendaIds = Array.isArray(current.agenda) ? current.agenda : [];
    const deliverables = (state.deliverables || []).filter(d => agendaIds.includes(d.id)).map(deepClone);
    const decisions = (state.decisions || []).filter(d => d.meetingId === current.id).map(deepClone);
    const topicIds = new Set([...deliverables.map(d => d.topicId), ...decisions.map(d => d.topicId)]);
    const topics = (state.topics || []).filter(t => topicIds.has(t.id)).map(deepClone);
    return {
      meetingId: current.id,
      date: current.date,
      manager: current.manager || 'Lucas',
      summary: current.summary || '',
      closedAt: new Date().toISOString(),
      agendaIds: deepClone(agendaIds),
      deliverables,
      decisions,
      topics,
      carryOver: []
    };
  }

  function plusSeven(dateString) {
    const d = new Date(dateString + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  function topicTitle(snapshot, topicId) {
    return snapshot.topics.find(t => t.id === topicId)?.title || 'Tema';
  }

  function maturityText(value) {
    return maturityLabel(value);
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
      <div class="history-snapshot-list">${[...shown, ...other].map(d => `<div class="history-deliverable-card"><div><b>${esc(d.title)}</b><span>${esc(topicTitle(s, d.topicId))} · ${esc(typeLabel(d.type))}</span><small>${esc(maturityText(d.maturity))} · ${Number.isFinite(d.readiness) ? d.readiness : '—'}% listo</small>${d.objective ? `<p>${esc(d.objective)}</p>` : ''}${d.reviewAsk ? `<div class="history-ask">Pregunta asociada: ${esc(d.reviewAsk)}</div>` : ''}</div></div>`).join('')}</div>
      <div class="section-head"><h2>Preguntas / decisiones para Lucas</h2></div>
      ${s.decisions.length ? `<div class="history-snapshot-list">${s.decisions.map(d => `<div class="history-decision-card"><span>?</span><div><b>${esc(d.question)}</b><small>${esc(topicTitle(s, d.topicId))}</small></div></div>`).join('')}</div>` : '<div class="blank compact-blank">No había preguntas registradas.</div>'}
      <div class="section-head"><h2>Arrastrado a la semana siguiente</h2></div>
      ${s.carryOver.length ? `<div class="history-snapshot-list">${s.carryOver.map(x => `<div class="history-carry-card"><b>${esc(x.title)}</b><span>${esc(maturityText(x.maturity))}</span></div>`).join('')}</div>` : '<div class="done-card">Nada quedó pendiente para arrastrar.</div>'}
    </section>`;
  }

  historyPage = function () {
    const id = route().id;
    return id ? historyDetailPage(id) : historyListPage();
  };

  const previousBind = bind;
  bind = function () {
    previousBind();
    const closeButton = document.querySelector('[data-close-meeting]');
    if (!closeButton) return;
    closeButton.onclick = () => {
      const current = meeting();
      const area = document.querySelector('#meeting-summary');
      if (!current || current.status === 'completed') return;
      current.summary = area ? area.value.trim() : (current.summary || '');

      const snap = snapshotFor(current);
      const nextId = plusSeven(current.date);
      const carry = (state.deliverables || []).filter(d => d.targetMeetingId === current.id && !['shown-reviewed', 'archived-superseded'].includes(d.maturity));
      snap.carryOver = carry.map(d => ({id:d.id,title:d.title,maturity:d.maturity,readiness:readinessOf(d)}));

      state.snapshots = (state.snapshots || []).filter(s => s.meetingId !== current.id);
      state.snapshots.push(snap);

      current.status = 'completed';
      for (const decision of state.decisions || []) {
        if (decision.meetingId === current.id && decision.status === 'planned') decision.status = 'reviewed';
      }

      for (const d of carry) d.targetMeetingId = nextId;
      let next = (state.meetings || []).find(m => m.id === nextId);
      if (!next) {
        next = {id:nextId,date:nextId,manager:'Lucas',status:'preparing',agenda:[],summary:'',followUps:[]};
        state.meetings.push(next);
      }
      next.agenda = carry.map(d => d.id);

      state.history = state.history || [];
      state.history.unshift({title:`1:1 con Lucas — ${current.date}`,note:current.summary || 'Reunión cerrada sin resumen.'});
      save();
      location.hash = `#history/${current.id}`;
      render();
    };
  };

  render();
})();
