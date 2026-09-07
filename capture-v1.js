(() => {
  function slug(s){return String(s||'item').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'item'}
  function uid(prefix,title){return `${prefix}-${slug(title)}-${Date.now().toString(36)}`}
  function showModal(title,body,onSave){
    let overlay=document.querySelector('#capture-overlay');
    if(overlay)overlay.remove();
    overlay=document.createElement('div');overlay.id='capture-overlay';overlay.className='capture-overlay';
    overlay.innerHTML=`<div class="capture-modal"><button class="capture-close" type="button">×</button><h2>${esc(title)}</h2><form id="capture-form">${body}<div class="capture-actions"><button type="button" class="wide-action secondary-action capture-cancel">Cancelar</button><button type="submit" class="wide-action">Guardar</button></div></form></div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.capture-close').onclick=close;overlay.querySelector('.capture-cancel').onclick=close;
    overlay.onclick=e=>{if(e.target===overlay)close()};
    overlay.querySelector('#capture-form').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget).entries());onSave(data);close();save();render()};
  }
  function field(label,name,placeholder='',required=false,value=''){return `<label class="capture-field"><span>${esc(label)}</span><input name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required?'required':''}></label>`}
  function area(label,name,placeholder='',value=''){return `<label class="capture-field"><span>${esc(label)}</span><textarea name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`}
  function topicOptions(selected=''){return (state.topics||[]).map(t=>`<option value="${t.id}" ${t.id===selected?'selected':''}>${esc(t.title)}</option>`).join('')}
  function selectField(label,name,options){return `<label class="capture-field"><span>${esc(label)}</span><select name="${name}">${options}</select></label>`}

  const originalTopicsPage=topicsPage;
  topicsPage=function(){return originalTopicsPage().replace('<div class="simple-head"><h1>Temas</h1>','<div class="simple-head page-head-row"><div><h1>Temas</h1></div><button class="round-add" type="button" data-add-topic>+</button>')};

  const originalDeliverablesPage=deliverablesPage;
  deliverablesPage=function(){return originalDeliverablesPage().replace('<div class="simple-head"><h1>Entregables</h1>','<div class="simple-head page-head-row"><div><h1>Entregables</h1></div><button class="round-add" type="button" data-add-deliverable>+</button>')};

  const originalNextPage=nextPage;
  nextPage=function(){return originalNextPage().replace('<div class="section-head"><h2>Qué queremos de Lucas</h2></div>','<div class="section-head"><h2>Qué queremos de Lucas</h2><button class="mini-add" type="button" data-add-decision>+ pregunta</button></div>')};

  const originalBind=bind;
  bind=function(){
    originalBind();
    const addTopic=document.querySelector('[data-add-topic]');
    if(addTopic)addTopic.onclick=()=>showModal('Nuevo tema',`${field('Nombre','title','Ej.: tema de trabajo',true)}${area('Último avance','latestUpdate','Qué cambió o qué sabemos ahora')}${area('Próxima acción','nextAction','Qué tiene que ocurrir después')}${area('Necesito de Lucas','needFromLucas','Solo si hay una decisión o validación concreta')}`,d=>state.topics.push({id:uid('topic',d.title),title:d.title.trim(),status:'active',latestUpdate:d.latestUpdate.trim(),nextAction:d.nextAction.trim(),needFromLucas:d.needFromLucas.trim()}));

    const addDeliverable=document.querySelector('[data-add-deliverable]');
    if(addDeliverable)addDeliverable.onclick=()=>showModal('Nuevo entregable',`${field('Título','title','Ej.: nota de decisión — 1 página',true)}${selectField('Tema','topicId',topicOptions())}${selectField('Tipo','type','<option value="presentation">Presentación</option><option value="one-pager">One-pager</option><option value="dashboard">Dashboard</option><option value="report">Informe</option><option value="pdf">PDF</option><option value="demo">Demo</option>')}${area('Objetivo','objective','Qué debe entender o decidir Lucas')}${area('Pregunta / review ask','reviewAsk','Qué quieres obtener al mostrarlo')}${area('Por qué ahora','whyNow','Por qué merece tiempo en el próximo 1:1')}${area('Qué falta','missing','Una dependencia por línea')}${field('Link','link','https://...')}`,d=>{
      state.deliverables.push({
        id:uid('deliverable',d.title),topicId:d.topicId,title:d.title.trim(),type:d.type,
        maturity:'work-in-progress',readiness:35,version:'v0.1',targetMeetingId:null,
        objective:d.objective.trim(),reviewAsk:d.reviewAsk.trim(),whyNow:d.whyNow.trim(),selectionState:WeeklyCore.ACTIVE,
        missingDependencies:d.missing.split('\n').map(x=>x.trim()).filter(Boolean),link:WeeklyCore.safeExternalUrl(d.link),overworkWarning:''
      });
    });

    document.querySelectorAll('[data-edit-deliverable]').forEach(button=>button.onclick=()=>{
      const d=state.deliverables.find(x=>x.id===button.dataset.editDeliverable);
      if(!d)return;
      showModal('Editar criterios',`${field('Título','title','',true,d.title)}${selectField('Tema','topicId',topicOptions(d.topicId))}${area('Objetivo','objective','Qué debe entender o decidir Lucas',d.objective)}${area('Pregunta / review ask','reviewAsk','Qué quieres obtener al mostrarlo',d.reviewAsk)}${area('Por qué ahora','whyNow','Por qué merece tiempo en el próximo 1:1',d.whyNow)}${area('Qué falta','missing','Una dependencia por línea',(d.missingDependencies||[]).join('\n'))}${field('Link','link','https://...',false,d.link||'')}`,form=>{
        d.title=form.title.trim();d.topicId=form.topicId;d.objective=form.objective.trim();d.reviewAsk=form.reviewAsk.trim();d.whyNow=form.whyNow.trim();
        d.missingDependencies=form.missing.split('\n').map(x=>x.trim()).filter(Boolean);d.link=WeeklyCore.safeExternalUrl(form.link);
      });
    });

    const addDecision=document.querySelector('[data-add-decision]');
    if(addDecision)addDecision.onclick=()=>showModal('Nueva pregunta para Lucas',`${selectField('Tema','topicId',topicOptions())}${area('Pregunta','question','Formula una decisión o validación concreta')}`,d=>{if(!d.question.trim())return;const m=meeting();state.decisions.push({id:uid('decision',d.question),topicId:d.topicId,meetingId:m.id,question:d.question.trim(),status:'planned'})});
  };
  render();
})();
