(() => {
  const CURRENT_SCHEMA_VERSION = 2;
  const ACTIVE = 'active';
  const WAITING = 'waiting-for-evidence';
  const CLOSED = 'closed';
  const MATURITIES = new Set(['work-in-progress','candidate','ready-to-show','shown-reviewed','archived-superseded']);

  const deepClone = value => JSON.parse(JSON.stringify(value));
  const text = value => typeof value === 'string' ? value : '';
  const uniqueStrings = values => [...new Set((Array.isArray(values) ? values : []).filter(x => typeof x === 'string' && x))];

  function validShape(candidate) {
    return candidate && typeof candidate === 'object' &&
      Array.isArray(candidate.meetings) &&
      Array.isArray(candidate.topics) &&
      Array.isArray(candidate.deliverables) &&
      Array.isArray(candidate.decisions);
  }

  function normalizeAndMigrateState(candidate, fallbackSeed) {
    const source = validShape(candidate) ? candidate : fallbackSeed;
    const out = deepClone(validShape(source) ? source : {
      meetings: [], topics: [], deliverables: [], decisions: [], history: [], snapshots: []
    });

    out.schemaVersion = CURRENT_SCHEMA_VERSION;
    out.meetings = Array.isArray(out.meetings) ? out.meetings : [];
    out.topics = Array.isArray(out.topics) ? out.topics : [];
    out.deliverables = Array.isArray(out.deliverables) ? out.deliverables : [];
    out.decisions = Array.isArray(out.decisions) ? out.decisions : [];
    out.history = Array.isArray(out.history) ? out.history : [];
    out.snapshots = Array.isArray(out.snapshots) ? out.snapshots : [];

    for (const m of out.meetings) {
      m.id = text(m.id);
      m.date = text(m.date || m.id);
      m.manager = text(m.manager) || 'Lucas';
      m.status = m.status === 'completed' ? 'completed' : 'preparing';
      m.agenda = uniqueStrings(m.agenda);
      m.summary = text(m.summary);
      m.followUps = Array.isArray(m.followUps) ? m.followUps : [];
      m.outcomes = m.outcomes && typeof m.outcomes === 'object' && !Array.isArray(m.outcomes) ? m.outcomes : {};
    }

    for (const t of out.topics) {
      t.id = text(t.id);
      t.title = text(t.title);
      t.status = text(t.status) || 'active';
      t.latestUpdate = text(t.latestUpdate);
      t.nextAction = text(t.nextAction);
      t.needFromLucas = text(t.needFromLucas);
    }

    for (const d of out.deliverables) {
      d.id = text(d.id);
      d.topicId = text(d.topicId);
      d.title = text(d.title);
      d.type = text(d.type) || 'one-pager';
      d.maturity = MATURITIES.has(d.maturity) ? d.maturity : 'work-in-progress';
      d.readiness = Number.isFinite(d.readiness) ? Math.max(0, Math.min(100, d.readiness)) : 35;
      d.version = text(d.version) || 'v0.1';
      d.targetMeetingId = typeof d.targetMeetingId === 'string' && d.targetMeetingId ? d.targetMeetingId : null;
      d.objective = text(d.objective);
      d.reviewAsk = text(d.reviewAsk);
      d.whyNow = text(d.whyNow);
      d.missingDependencies = uniqueStrings(d.missingDependencies);
      d.link = safeExternalUrl(d.link);
      d.overworkWarning = text(d.overworkWarning);
      if (![ACTIVE, WAITING, CLOSED].includes(d.selectionState)) {
        d.selectionState = d.maturity === 'archived-superseded' ? CLOSED : ACTIVE;
      }
      if (d.selectionState === CLOSED && d.maturity !== 'archived-superseded') {
        d.maturity = 'archived-superseded';
      }
    }

    for (const q of out.decisions) {
      q.id = text(q.id);
      q.topicId = text(q.topicId);
      q.meetingId = text(q.meetingId);
      q.question = text(q.question);
      q.status = text(q.status) || 'planned';
    }

    const deliverableIds = new Set(out.deliverables.map(d => d.id));
    for (const m of out.meetings) m.agenda = m.agenda.filter(id => deliverableIds.has(id));
    return out;
  }

  function safeExternalUrl(value) {
    const raw = text(value).trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function selectedForMeeting(state, deliverable, meeting) {
    return Boolean(deliverable && meeting && deliverable.targetMeetingId === meeting.id && (meeting.agenda || []).includes(deliverable.id));
  }

  function selectionGate(deliverable) {
    const missing = [];
    if (!text(deliverable?.objective).trim()) missing.push('objetivo');
    if (!text(deliverable?.reviewAsk).trim()) missing.push('pregunta / acción esperada de Lucas');
    if (!text(deliverable?.whyNow).trim()) missing.push('por qué ahora');
    if (deliverable?.selectionState === WAITING) missing.push('está esperando evidencia');
    if (deliverable?.selectionState === CLOSED || deliverable?.maturity === 'archived-superseded') missing.push('está archivado');
    return {ok: missing.length === 0, missing};
  }

  function readyGate(state, deliverable, meeting) {
    const base = selectionGate(deliverable);
    const missing = [...base.missing];
    if (!selectedForMeeting(state, deliverable, meeting)) missing.push('no está seleccionado para este 1:1');
    if ((deliverable?.missingDependencies || []).length) missing.push('quedan dependencias pendientes');
    return {ok: missing.length === 0, missing};
  }

  function selectDeliverableForMeeting(state, deliverableId, meetingId) {
    const d = (state.deliverables || []).find(x => x.id === deliverableId);
    const m = (state.meetings || []).find(x => x.id === meetingId);
    if (!d || !m || m.status === 'completed') return {ok:false, missing:['meeting o entregable no disponible']};
    const gate = selectionGate(d);
    if (!gate.ok) return gate;
    for (const other of state.meetings || []) other.agenda = (other.agenda || []).filter(id => id !== d.id);
    d.targetMeetingId = m.id;
    d.selectionState = ACTIVE;
    if (!m.agenda.includes(d.id)) m.agenda.push(d.id);
    return {ok:true, missing:[]};
  }

  function deselectDeliverableFromMeeting(state, deliverableId, meetingId) {
    const d = (state.deliverables || []).find(x => x.id === deliverableId);
    const m = (state.meetings || []).find(x => x.id === meetingId);
    if (!d || !m) return false;
    m.agenda = (m.agenda || []).filter(id => id !== d.id);
    if (d.targetMeetingId === m.id) d.targetMeetingId = null;
    return true;
  }

  function setSelectionState(state, deliverableId, nextState) {
    const d = (state.deliverables || []).find(x => x.id === deliverableId);
    if (!d || ![ACTIVE, WAITING, CLOSED].includes(nextState)) return false;
    d.selectionState = nextState;
    if (nextState !== ACTIVE) {
      for (const m of state.meetings || []) m.agenda = (m.agenda || []).filter(id => id !== d.id);
      d.targetMeetingId = null;
    }
    if (nextState === CLOSED) d.maturity = 'archived-superseded';
    return true;
  }

  function promoteDeliverable(state, deliverableId, nextMaturity, meeting) {
    const d = (state.deliverables || []).find(x => x.id === deliverableId);
    if (!d) return {ok:false, missing:['entregable no disponible']};
    if (nextMaturity === 'candidate' && d.maturity === 'work-in-progress') {
      d.maturity = 'candidate';
      d.readiness = Math.max(65, d.readiness || 0);
      return {ok:true, missing:[]};
    }
    if (nextMaturity === 'ready-to-show' && d.maturity === 'candidate') {
      const gate = readyGate(state, d, meeting);
      if (!gate.ok) return gate;
      d.maturity = 'ready-to-show';
      d.readiness = Math.max(90, d.readiness || 0);
      return {ok:true, missing:[]};
    }
    return {ok:false, missing:['transición de madurez no permitida']};
  }

  function plusSeven(dateString) {
    const d = new Date(dateString + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  function closeMeeting(state, meetingId, summary, explicitOutcomes = {}) {
    const current = (state.meetings || []).find(m => m.id === meetingId);
    if (!current || current.status === 'completed') return {ok:false};
    current.summary = text(summary).trim();
    current.outcomes = current.outcomes && typeof current.outcomes === 'object' ? current.outcomes : {};
    const outcomes = {};

    for (const id of current.agenda || []) {
      const d = (state.deliverables || []).find(x => x.id === id);
      if (!d) continue;
      const outcome = explicitOutcomes[id] || current.outcomes[id] || 'carry';
      outcomes[id] = ['carry','reviewed','drop'].includes(outcome) ? outcome : 'carry';
      current.outcomes[id] = outcomes[id];
      if (outcomes[id] === 'reviewed') {
        d.maturity = 'shown-reviewed';
        d.readiness = 100;
        d.targetMeetingId = null;
      }
      if (outcomes[id] === 'drop') {
        d.maturity = 'archived-superseded';
        d.selectionState = CLOSED;
        d.targetMeetingId = null;
      }
    }

    const agendaIds = [...(current.agenda || [])];
    const snapshotDeliverables = agendaIds
      .map(id => (state.deliverables || []).find(d => d.id === id))
      .filter(Boolean)
      .map(d => ({...deepClone(d), meetingOutcome: outcomes[d.id] || 'carry'}));
    const snapshotDecisions = (state.decisions || []).filter(d => d.meetingId === current.id).map(deepClone);
    const topicIds = new Set([...snapshotDeliverables.map(d => d.topicId), ...snapshotDecisions.map(d => d.topicId)]);
    const snapshotTopics = (state.topics || []).filter(t => topicIds.has(t.id)).map(deepClone);

    const carry = agendaIds
      .map(id => (state.deliverables || []).find(d => d.id === id))
      .filter(Boolean)
      .filter(d => (outcomes[d.id] || 'carry') === 'carry');

    const snapshot = {
      meetingId: current.id,
      date: current.date,
      manager: current.manager || 'Lucas',
      summary: current.summary,
      closedAt: new Date().toISOString(),
      agendaIds: deepClone(agendaIds),
      deliverables: snapshotDeliverables,
      decisions: snapshotDecisions,
      topics: snapshotTopics,
      carryOver: carry.map(d => ({id:d.id,title:d.title,maturity:d.maturity,readiness:d.readiness}))
    };

    state.snapshots = (state.snapshots || []).filter(s => s.meetingId !== current.id);
    state.snapshots.push(snapshot);
    current.status = 'completed';
    for (const decision of state.decisions || []) {
      if (decision.meetingId === current.id && decision.status === 'planned') decision.status = 'reviewed';
    }

    const nextId = plusSeven(current.date);
    for (const d of carry) {
      d.targetMeetingId = nextId;
      d.selectionState = ACTIVE;
    }
    let next = (state.meetings || []).find(m => m.id === nextId);
    if (!next) {
      next = {id:nextId,date:nextId,manager:'Lucas',status:'preparing',agenda:[],summary:'',followUps:[],outcomes:{}};
      state.meetings.push(next);
    }
    next.agenda = carry.map(d => d.id);
    next.outcomes = {};

    state.history = state.history || [];
    state.history.unshift({title:`1:1 con Lucas — ${current.date}`,note:current.summary || 'Reunión cerrada sin resumen.'});
    return {ok:true, nextMeetingId:nextId, snapshot};
  }

  window.WeeklyCore = {
    CURRENT_SCHEMA_VERSION,
    ACTIVE,
    WAITING,
    CLOSED,
    validShape,
    normalizeAndMigrateState,
    safeExternalUrl,
    selectedForMeeting,
    selectionGate,
    readyGate,
    selectDeliverableForMeeting,
    deselectDeliverableFromMeeting,
    setSelectionState,
    promoteDeliverable,
    closeMeeting
  };
})();
