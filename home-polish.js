homePage=function(){
  const m=meeting();
  const target=state.deliverables.filter(d=>d.targetMeetingId===m.id);
  const ready=target.filter(d=>d.maturity==='ready-to-show');
  const cooking=target.filter(d=>['candidate','work-in-progress'].includes(d.maturity));
  const asks=state.decisions.filter(d=>d.meetingId===m.id&&d.status==='planned');
  const avg=Math.round(target.reduce((a,d)=>a+readinessOf(d),0)/Math.max(1,target.length));
  return `<section class="app-page home-screen">
    <div class="simple-head">
      <h1>1:1 con Lucas</h1>
      <p class="subtle">Llegar con pocos objetos maduros y preguntas claras, no con una lista de todo lo trabajado.</p>
    </div>
    <div class="app-status home-date-status"><span>◎</span><strong>Preparando ${fmtDate(m.date)}</strong></div>
    <div class="metric-grid">
      <a class="metric-card" href="#deliverables"><b>${ready.length}</b><span>Listos para mostrar</span></a>
      <a class="metric-card" href="#next"><b>${asks.length}</b><span>Decisiones para Lucas</span></a>
    </div>
    <div class="readiness-summary">Preparación estimada del conjunto: <b>${avg}%</b> <span>· indicador orientativo, no objetivo</span></div>
    <div class="section-head"><h2>Listo para el próximo 1:1</h2></div>
    ${ready.length?listDeliverables(ready):'<div class="blank">Todavía no hay entregables listos.</div>'}
    <div class="section-head needs-lucas-head"><h2>Necesito de Lucas</h2></div>
    ${asks.map(a=>`<a class="wide-card decision-card" href="#next"><span class="spark">?</span><b>${esc(a.question)}</b><span>›</span></a>`).join('')}
    <div class="section-head"><h2>Todavía en preparación</h2></div>
    ${cooking.length?listDeliverables(cooking):'<div class="blank">Nada pendiente para esta reunión.</div>'}
    <div class="section-head"><h2>No invertir tiempo antes del lunes en</h2></div>
    <div class="quiet-list">${target.filter(d=>d.overworkWarning).map(d=>`<div class="quiet-item">${esc(d.overworkWarning)}</div>`).join('')}</div>
    <div class="home-note"><b>Definición de listo:</b> se entiende en pocos minutos, tiene un objetivo explícito y termina en una pregunta o decisión.</div>
  </section>`;
};
render();
