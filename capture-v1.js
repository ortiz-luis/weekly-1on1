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
  function field(label,name,placeholder='',required=false){return `<label class="capture-field"><span>${esc(label)}</span><input name="${name}" placeholder="${esc(placeholder)}" ${required?'required':''}></label>`}
  function area(label,name,placeholder=''){return `<label class="capture-field"><span>${esc(label)}</span><textarea name="${name}" placeholder="${esc(placeholder)}"></textarea></label>`}
  function topicOptions(){return (state.topics||[]).map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('')}
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
    if(addTopic)addTopic.onclick=()=>showModal('Nuevo tema',`${field('Nombre','title','Ej.: Tema nuevo',true)}${area('Último avance','latestUpdate','Qué cambió o qué sabemos ahora')}${area('Próxima acción','nextAction','Qué tiene que ocurrir después')}${area('Necesito de Lucas','needFromLucas','Solo si hay una decisión o validación concreta')}`,d=>state.topics.push({id:uid('topic',d.title),title:d.title.trim(),status:'active',latestUpdate:d.latestUpdate.trim(),nextAction:d.nextAction.trim(),needFromLucas:d.needFromLucas.trim()}));
    const addDeliverable=document.querySelector('[data-add-deliverable]');
    if(addDeliverable)addDeliverable.onclick=()=>showModal('Nuevo entregable',`${field('Título','title','Ej.: tema principal mapping — 3 slides',true)}${selectField('Tema','topicId',topicOptions())}${selectField('Tipo','type','<option value="presentation">Presentación</option><option value="one-pager">One-pager</option><option value="dashboard">Dashboard</option><option value="report">Informe</option><option value="pdf">PDF</option><option value="demo">Demo</option>')}${area('Objetivo','objective','Qué debe entender o decidir Lucas')}${area('Pregunta / review ask','reviewAsk','Qué quieres obtener al mostrarlo')}${area('Qué falta','missing','Una dependencia por línea')}${field('Link','link','https://...')}`,d=>{const m=meeting();state.deliverables.push({id:uid('deliverable',d.title),topicId:d.topicId,title:d.title.trim(),type:d.type,maturity:'work-in-progress',readiness:35,version:'v0.1',targetMeetingId:m.id,objective:d.objective.trim(),missingDependencies:d.missing.split('\n').map(x=>x.trim()).filter(Boolean),reviewAsk:d.reviewAsk.trim(),link:d.link.trim(),overworkWarning:''});if(!m.agenda.includes(state.deliverables.at(-1).id))m.agenda.push(state.deliverables.at(-1).id)});
    const addDecision=document.querySelector('[data-add-decision]');
    if(addDecision)addDecision.onclick=()=>showModal('Nueva pregunta para Lucas',`${selectField('Tema','topicId',topicOptions())}${area('Pregunta','question','Formula una decisión o validación concreta')}`,d=>{if(!d.question.trim())return;const m=meeting();state.decisions.push({id:uid('decision',d.question),topicId:d.topicId,meetingId:m.id,question:d.question.trim(),status:'planned'})});
  };
  render();
})();
