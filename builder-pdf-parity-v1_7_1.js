(()=>{
  const READY_TEXT='Quarkfoil PASQAL listo';
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function setStatus(kind,text){
    const el=document.getElementById('qf-status');
    if(!el)return;
    el.className=`qf-status ${kind||''}`;
    el.textContent=text;
  }

  async function waitForPreviewWindow(getPopup,timeoutMs=30000){
    const started=Date.now();
    while(Date.now()-started<timeoutMs){
      const popup=getPopup();
      if(popup){
        if(popup.closed)throw new Error('La pestaña de preview se cerró antes de imprimir.');
        try{
          const status=popup.document.getElementById('qf-local-status');
          if(status?.textContent?.includes(READY_TEXT))return popup;
        }catch{}
      }
      await sleep(60);
    }
    throw new Error('El preview no terminó de renderizar a tiempo.');
  }

  document.addEventListener('click',async event=>{
    const button=event.target?.closest?.('#qf-pdf');
    if(!button||button.dataset.parityBusy==='1')return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const previewButton=document.getElementById('qf-preview');
    if(!previewButton){
      setStatus('error','No se encontró el preview del Builder.');
      return;
    }

    button.dataset.parityBusy='1';
    button.disabled=true;
    setStatus('busy','Preparando PDF desde el mismo render del preview…');

    const originalOpen=window.open;
    let popup=null;
    window.open=function(...args){
      popup=originalOpen.apply(this,args);
      return popup;
    };

    try{
      previewButton.click();
      const started=Date.now();
      while(!popup&&Date.now()-started<10000)await sleep(25);
      window.open=originalOpen;
      if(!popup)throw new Error('El navegador bloqueó la pestaña de preview.');

      popup=await waitForPreviewWindow(()=>popup);

      try{
        const style=popup.document.createElement('style');
        style.dataset.qfPdfParity='v1.7.1';
        style.textContent='@media print{aside.notes,.speaker-notes,[data-speaker-notes]{display:none!important}}';
        popup.document.head.appendChild(style);
        popup.document.documentElement.dataset.qfPdfParity='ready';
      }catch{}

      setStatus('ok','PDF listo desde el mismo render del preview.');
      popup.focus();
      popup.print();
    }catch(error){
      window.open=originalOpen;
      setStatus('error',`Error PDF: ${error.message||error}`);
    }finally{
      button.disabled=false;
      delete button.dataset.parityBusy;
    }
  },true);
})();
