(() => {
  const deepClone = value => JSON.parse(JSON.stringify(value));

  function plusSeven(dateString) {
    const d = new Date(dateString + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  function buildSnapshot(current, outcomes) {
    const agendaIds = Array.isArray(current.agenda) ? current.agenda : [];
    const deliverables = agendaIds
      .map(id => (state.deliverables || []).find(d => d.id === id))
      .filter(Boolean)
      .map(d => {
        const copy = deepClone(d);
        copy.meetingOutcome = outcomes[d.id] || 'carry';
        return copy;
      });
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
      current.outcomes = current.outcomes || {};

      document.querySelectorAll('[data-outcome-deliverable]').forEach(select => {
        current.outcomes[select.dataset.outcomeDeliverable] = select.value;
      });

      const outcomes = {};
      for (const id of current.agenda || []) {
        const d = (state.deliverables || []).find(x => x.id === id);
        if (!d) continue;
        const outcome = current.outcomes[id] || 'carry';
        outcomes[id] = outcome;
        if (outcome === 'reviewed') d.maturity = 'shown-reviewed';
        if (outcome === 'drop') d.maturity = 'archived-superseded';
      }

      const snapshot = buildSnapshot(current, outcomes);
      const carry = (current.agenda || [])
        .map(id => (state.deliverables || []).find(d => d.id === id))
        .filter(Boolean)
        .filter(d => outcomes[d.id] === 'carry');
      snapshot.carryOver = carry.map(d => ({
        id: d.id,
        title: d.title,
        maturity: d.maturity,
        readiness: readinessOf(d)
      }));

      state.snapshots = (state.snapshots || []).filter(s => s.meetingId !== current.id);
      state.snapshots.push(snapshot);
      current.status = 'completed';

      for (const decision of state.decisions || []) {
        if (decision.meetingId === current.id && decision.status === 'planned') decision.status = 'reviewed';
      }

      const nextId = plusSeven(current.date);
      for (const d of carry) d.targetMeetingId = nextId;

      let next = (state.meetings || []).find(m => m.id === nextId);
      if (!next) {
        next = {id: nextId, date: nextId, manager: 'Lucas', status: 'preparing', agenda: [], summary: '', followUps: [], outcomes: {}};
        state.meetings.push(next);
      }
      next.agenda = carry.map(d => d.id);
      next.outcomes = {};

      state.history = state.history || [];
      state.history.unshift({title: `1:1 con Lucas — ${current.date}`, note: current.summary || 'Reunión cerrada sin resumen.'});
      save();
      location.hash = `#history/${current.id}`;
      render();
    };
  };

  render();
})();
