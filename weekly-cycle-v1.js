(() => {
  function nextMeetingId(dateString) {
    const d = new Date(dateString + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0,10);
  }

  function ensureMeetingFields() {
    for (const m of state.meetings || []) {
      if (typeof m.summary !== 'string') m.summary = '';
      if (!Array.isArray(m.followUps)) m.followUps = [];
    }
  }
  ensureMeetingFields();

  const originalNextPage = nextPage;
  nextPage = function () {
    const m = meeting();
    const base = originalNextPage();
    if (!m || m.status === 'completed') return base;
    const extra = `<div class="section-head"><h2>Después del 1:1</h2></div>
      <div class="meeting-close-card">
        <label for="meeting-summary"><b>Qué dijo Lucas / qué quedó acordado</b><span>Guarda solamente decisiones, cambios de prioridad, owners y próximos pasos.</span></label>
        <textarea id="meeting-summary" placeholder="Ej.: validar tema principal con el owner técnico antes de ir a el equipo interlocutor; Segundo tema aprobado como dirección...">${esc(m.summary || '')}</textarea>
        <button class="wide-action secondary-action" data-save-meeting-notes>Guardar notas</button>
        <button class="wide-action" data-close-meeting>Cerrar este 1:1 y preparar la semana siguiente</button>
      </div>`;
    return base.replace('</section>', extra + '</section>');
  };

  const originalHistoryPage = historyPage;
  historyPage = function () {
    const completed = (state.meetings || []).filter(m => m.status === 'completed').sort((a,b) => b.date.localeCompare(a.date));
    if (!completed.length) return originalHistoryPage();
    return `<section class="app-page"><div class="simple-head"><h1>Histórico</h1><p class="subtle">Qué se mostró, qué decidió Lucas y qué pasó a la semana siguiente.</p></div><div class="app-list">${completed.map(m => `<div class="history-card"><div class="history-date">${fmtDate(m.date)}</div><b>1:1 con Lucas</b><p>${esc(m.summary || 'Sin resumen registrado.')}</p><small>${(m.agenda || []).length} entregables en agenda</small></div>`).join('')}</div></section>`;
  };

  const originalBind = bind;
  bind = function () {
    originalBind();
    const saveButton = document.querySelector('[data-save-meeting-notes]');
    if (saveButton) saveButton.onclick = () => {
      const m = meeting();
      const area = document.querySelector('#meeting-summary');
      if (!m || !area) return;
      m.summary = area.value.trim();
      save();
      saveButton.textContent = 'Notas guardadas';
      setTimeout(() => { if (document.body.contains(saveButton)) saveButton.textContent = 'Guardar notas'; }, 1000);
    };
    const closeButton = document.querySelector('[data-close-meeting]');
    if (closeButton) closeButton.onclick = () => {
      const current = meeting();
      const area = document.querySelector('#meeting-summary');
      if (!current) return;
      current.summary = area ? area.value.trim() : (current.summary || '');
      current.status = 'completed';
      for (const d of state.decisions || []) if (d.meetingId === current.id && d.status === 'planned') d.status = 'reviewed';

      const nextId = nextMeetingId(current.date);
      const carry = (state.deliverables || []).filter(d => d.targetMeetingId === current.id && !['shown-reviewed','archived-superseded'].includes(d.maturity));
      for (const d of carry) d.targetMeetingId = nextId;
      const existingNext = (state.meetings || []).find(m => m.id === nextId);
      if (!existingNext) state.meetings.push({id:nextId,date:nextId,manager:'Lucas',status:'preparing',agenda:carry.map(d => d.id),summary:'',followUps:[]});
      state.history = state.history || [];
      state.history.unshift({title:`1:1 con Lucas — ${current.date}`,note:current.summary || 'Reunión cerrada sin resumen.'});
      save();
      location.hash = '#home';
      render();
    };
  };

  render();
})();
