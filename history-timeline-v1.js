(() => {
  function fmtShort(date){
    try{return new Intl.DateTimeFormat('es',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(date+'T12:00:00'))}catch{return date}
  }
  function currentMeetingCard(){
    const m=meeting();
    if(!m || m.status==='completed') return '';
    const ds=(m.agenda||[]).map(id=>(state.deliverables||[]).find(d=>d.id===id)).filter(Boolean);
    const asks=(state.decisions||[]).filter(d=>d.meetingId===m.id&&d.status==='planned');
    return `<a class="history-current-card" href="#next"><div><span class="timeline-kicker">PRÓXIMO 1:1</span><b>${fmtDate(m.date)}</b><p>${ds.length} entregables en agenda · ${asks.length} decisiones previstas</p></div><i>›</i></a>`;
  }

  const previousHistoryPage=historyPage;
  historyPage=function(){
    if(route().id) return previousHistoryPage();
    const snaps=[...(state.snapshots||[])].sort((a,b)=>b.date.localeCompare(a.date));
    const current=currentMeetingCard();
    const closed=snaps.length?`<div class="timeline-stack">${snaps.map((s,i)=>`<a class="timeline-row ${i===0?'latest':''}" href="#history/${s.meetingId}"><div class="timeline-marker"><span></span></div><div class="timeline-card"><div class="timeline-card-head"><span>${fmtShort(s.date)}</span>${i===0?'<em>Último cerrado</em>':''}</div><b>1:1 con ${esc(s.manager||'Lucas')}</b><p>${esc(s.summary||'Sin resumen registrado.')}</p><small>${s.deliverables.length} entregables · ${s.decisions.length} preguntas · ${s.carryOver.length} arrastrados</small></div></a>`).join('')}</div>`:'<div class="blank">Todavía no hay reuniones cerradas.</div>';
    return `<section class="app-page"><div class="simple-head"><h1>Histórico</h1><p class="subtle">Una línea temporal de tus 1:1. Cada reunión cerrada queda congelada y no cambia cuando evolucionan los temas vivos.</p></div>${current}<div class="section-head"><h2>Reuniones cerradas</h2></div>${closed}</section>`;
  };

  const previousHistoryDetail=historyPage;
  historyPage=function(){
    const id=route().id;
    if(!id){
      const snaps=[...(state.snapshots||[])].sort((a,b)=>b.date.localeCompare(a.date));
      const current=currentMeetingCard();
      const closed=snaps.length?`<div class="timeline-stack">${snaps.map((s,i)=>`<a class="timeline-row ${i===0?'latest':''}" href="#history/${s.meetingId}"><div class="timeline-marker"><span></span></div><div class="timeline-card"><div class="timeline-card-head"><span>${fmtShort(s.date)}</span>${i===0?'<em>Último cerrado</em>':''}</div><b>1:1 con ${esc(s.manager||'Lucas')}</b><p>${esc(s.summary||'Sin resumen registrado.')}</p><small>${s.deliverables.length} entregables · ${s.decisions.length} preguntas · ${s.carryOver.length} arrastrados</small></div></a>`).join('')}</div>`:'<div class="blank">Todavía no hay reuniones cerradas.</div>';
      return `<section class="app-page"><div class="simple-head"><h1>Histórico</h1><p class="subtle">Una línea temporal de tus 1:1. Cada reunión cerrada queda congelada y no cambia cuando evolucionan los temas vivos.</p></div>${current}<div class="section-head"><h2>Reuniones cerradas</h2></div>${closed}</section>`;
    }
    const detail=previousHistoryDetail();
    return detail.replace('<a class="back" href="#history">‹ Histórico</a>','<div class="history-detail-nav"><a class="back" href="#history">‹ Histórico</a><a class="back next-link" href="#next">Próximo 1:1 ›</a></div>');
  };
  render();
})();
