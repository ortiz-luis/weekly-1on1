(()=>{
  const QUARKFOIL_COMMIT='8bed44d3619bb1a4e6ce3b8dd2b17925830ca7b3';
  const QUARKFOIL_BASE=`https://cdn.jsdelivr.net/gh/ortiz-luis/quarkfoil@${QUARKFOIL_COMMIT}/app`;
  const READY_TEXT='Quarkfoil PASQAL listo';
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function setStatus(kind,text){
    const el=document.getElementById('qf-status');
    if(!el)return;
    el.className=`qf-status ${kind||''}`;
    el.textContent=text;
  }

  function htmlText(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  function jsData(value){
    return JSON.stringify(value)
      .replaceAll('<','\\u003c')
      .replaceAll('>','\\u003e')
      .replaceAll('&','\\u0026');
  }

  async function waitFor(fn,timeoutMs=30000){
    const started=Date.now();
    while(Date.now()-started<timeoutMs){
      try{
        const value=fn();
        if(value)return value;
      }catch{}
      await sleep(60);
    }
    throw new Error('Timeout esperando el render de Quarkfoil.');
  }

  function openPreviewInto(popup){
    const preview=document.getElementById('qf-preview');
    if(!preview)throw new Error('No encuentro el botón Visualizar.');
    return new Promise((resolve,reject)=>{
      const originalOpen=window.open;
      let restored=false;
      let timer=null;
      const restore=()=>{
        if(restored)return;
        restored=true;
        window.open=originalOpen;
        if(timer)clearTimeout(timer);
      };
      window.open=(url)=>{
        try{
          popup.location.href=url;
          restore();
          resolve(popup);
          return popup;
        }catch(error){
          restore();
          reject(error);
          return null;
        }
      };
      preview.click();
      timer=setTimeout(()=>{
        restore();
        reject(new Error('El preview no abrió su documento a tiempo.'));
      },12000);
    });
  }

  function cloneRenderedSlides(previewWindow){
    const source=previewWindow.document.querySelector('.reveal .slides');
    if(!source)throw new Error('No encontré el DOM renderizado de las slides.');
    const clone=source.cloneNode(true);
    clone.querySelectorAll('aside.notes,.speaker-notes,[data-speaker-notes]').forEach(node=>node.remove());
    clone.querySelectorAll('section').forEach(section=>{
      section.classList.remove('present','past','future');
      section.removeAttribute('hidden');
      section.removeAttribute('aria-hidden');
      section.style.removeProperty('display');
      section.style.removeProperty('position');
      section.style.removeProperty('top');
      section.style.removeProperty('left');
      section.style.removeProperty('transform');
    });
    return clone.innerHTML;
  }

  function printDocumentHtml(title,slidesHtml){
    const base=QUARKFOIL_BASE;
    return `<!doctype html>
<html lang="en" data-qf-vector-pdf="v1.7.2">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${htmlText(title||'PASQAL presentation')}</title>
  <link rel="stylesheet" href="${base}/vendor/reveal/reveal.css">
  <link rel="stylesheet" href="${base}/vendor/katex/katex.min.css">
  <link rel="stylesheet" href="${base}/styles/layout.css">
  <link rel="stylesheet" href="${base}/styles/themes.css">
  <link rel="stylesheet" href="${base}/styles/player.css">
  <style>
    html,body{margin:0;background:#fff}
    #qf-vector-status{position:fixed;z-index:9999;left:18px;bottom:18px;padding:8px 11px;border-radius:9px;background:rgba(15,30,35,.9);color:#fff;font:12px system-ui}
    @media print{#qf-vector-status{display:none!important}}
  </style>
</head>
<body>
  <main class="reveal" aria-label="Presentation"><div id="slides" class="slides"></div></main>
  <div id="qf-vector-status">Preparando PDF vectorial…</div>
  <script src="${base}/vendor/reveal/reveal.js"><\/script>
  <script id="qf-rendered-slides" type="application/json">${jsData(slidesHtml)}<\/script>
  <script>
    (async()=>{
      const status=document.getElementById('qf-vector-status');
      const slidesHtml=JSON.parse(document.getElementById('qf-rendered-slides').textContent);
      document.getElementById('slides').innerHTML=slidesHtml;
      const reveal=new Reveal(document.querySelector('.reveal'),{
        view:'print',
        controls:false,
        progress:false,
        hash:false,
        history:false,
        keyboard:false,
        touch:false,
        overview:false,
        center:false,
        transition:'none',
        width:1280,
        height:720,
        margin:0,
        minScale:0.1,
        maxScale:3,
        pdfMaxPagesPerSlide:1,
        pdfSeparateFragments:false
      });
      await reveal.initialize();
      if(document.fonts?.ready)await document.fonts.ready;
      const pending=[...document.images].filter(image=>!image.complete);
      await Promise.all(pending.map(image=>new Promise(resolve=>{
        image.addEventListener('load',resolve,{once:true});
        image.addEventListener('error',resolve,{once:true});
      })));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      if(!document.documentElement.classList.contains('reveal-print'))throw new Error('Reveal no entró en reveal-print.');
      if(!document.documentElement.classList.contains('print-pdf'))throw new Error('Reveal no entró en print-pdf.');
      document.documentElement.dataset.qfPdfReady='true';
      status.textContent='PDF vectorial listo. Abriendo impresión…';
      setTimeout(()=>window.print(),350);
    })().catch(error=>{
      document.documentElement.dataset.qfPdfError=String(error?.message||error);
      const status=document.getElementById('qf-vector-status');
      if(status)status.textContent='Error PDF: '+String(error?.message||error);
    });
  <\/script>
</body>
</html>`;
  }

  async function vectorPdf(popup){
    setStatus('busy','Preparando PDF vectorial con la vista print real de Quarkfoil/Reveal…');
    const previewWindow=await openPreviewInto(popup);
    await waitFor(()=>previewWindow.document?.getElementById('qf-local-status')?.textContent?.includes(READY_TEXT));
    const slidesHtml=cloneRenderedSlides(previewWindow);
    const title=previewWindow.document.title||'PASQAL presentation';
    popup.document.open();
    popup.document.write(printDocumentHtml(title,slidesHtml));
    popup.document.close();
    await waitFor(()=>popup.document?.documentElement?.dataset?.qfPdfReady==='true'||popup.document?.documentElement?.dataset?.qfPdfError);
    const error=popup.document.documentElement.dataset.qfPdfError;
    if(error)throw new Error(error);
    setStatus('ok','PDF vectorial listo desde el mismo DOM del preview. Usa “Guardar como PDF”.');
  }

  function install(){
    const button=document.getElementById('qf-pdf');
    if(!button||button.dataset.vectorPdfV172)return;
    button.dataset.vectorPdfV172='1';
    button.addEventListener('click',async event=>{
      if(button.dataset.vectorPdfBusy==='1')return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const popup=window.open('about:blank','_blank');
      if(!popup){
        setStatus('error','El navegador bloqueó la pestaña PDF.');
        return;
      }
      button.dataset.vectorPdfBusy='1';
      button.disabled=true;
      try{
        await vectorPdf(popup);
      }catch(error){
        try{if(!popup.closed)popup.document.body.innerHTML=`<pre style="padding:20px;font:14px system-ui">${htmlText(error?.message||error)}</pre>`}catch{}
        setStatus('error',`Error PDF vectorial: ${error?.message||error}`);
      }finally{
        button.disabled=false;
        delete button.dataset.vectorPdfBusy;
      }
    },true);
  }

  new MutationObserver(install).observe(document.documentElement,{subtree:true,childList:true});
  install();
})();
