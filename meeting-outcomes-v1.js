(() => {
  function ensureOutcomeState(){
    for(const m of state.meetings||[]){
      if(!m.outcomes || typeof m.outcomes!=='object') m.outcomes={};
    }
  }
  ensureOutcomeState();
  save();

  const previousNextPage=nextPage;
  nextPage=function(){
    const m=meeting();
    const base=previousNextPage();
    if(!m || m.status==='completed') return base;
    const agenda=(m.agenda||[]).map(id=>(state.deliverables||[]).find(d=>d.id===id)).filter(Boolean);
    const rows=agenda.map(d=>{
      const current=m.outcomes?.[d.id] || (d.maturity==='shown-reviewed'?'reviewed':d.maturity==='archived-superseded'?'drop':'carry');
      return `<div class="meeting-outcome-row"><div><b>${esc(d.title)}</b><small>${typeLabel(d.type)} · ${maturityLabel(d.maturity)}</small></div><select data-outcome-deliverable="${d.id}"><option value="carry" ${current==='carry'?'selected':''}>Seguir la semana siguiente</option><option value="reviewed" ${current==='reviewed'?'selected':''}>Mostrado / revisado</option><option value="drop" ${current==='drop'?'selected':''}>Cerrar / sacar de agenda</option></select></div>`;
    }).join('');
    const block=`<div class="section-head"><h2>Resultado de cada entregable</h2></div><p class="outcome-help">Antes de cerrar la reunión, indica qué pasó con cada objeto. Esto determina qué queda congelado y qué se arrastra.</p><div class="meeting-outcomes">${rows||'<div class="blank compact-blank">No hay entregables en agenda.</div>'}</div>`;
    return base.replace('<div class="section-head"><h2>Después del 1:1</h2></div>', block+'<div class="section-head"><h2>Después del 1:1</h2></div>');
  };

  const previousBind=bind;
  bind=function(){
    previousBind();
    const m=meeting();
    document.querySelectorAll('[data-outcome-deliverable]').forEach(select=>{
      select.onchange=()=>{
        if(!m) return;
        m.outcomes=m.outcomes||{};
        m.outcomes[select.dataset.outcomeDeliverable]=select.value;
        save();
      };
    });
    const closeButton=document.querySelector('[data-close-meeting]');
    if(closeButton){
      const priorClose=closeButton.onclick;
      closeButton.onclick=()=>{
        const current=meeting();
        if(!current) return;
        current.outcomes=current.outcomes||{};
        for(const id of current.agenda||[]){
          const d=(state.deliverables||[]).find(x=>x.id===id);
          if(!d) continue;
          const outcome=current.outcomes[id] || (d.maturity==='shown-reviewed'?'reviewed':d.maturity==='archived-superseded'?'drop':'carry');
          if(outcome==='reviewed') d.maturity='shown-reviewed';
          if(outcome==='drop') d.maturity='archived-superseded';
        }
        save();
        if(typeof priorClose==='function') priorClose();
      };
    }
  };

  render();
})();
