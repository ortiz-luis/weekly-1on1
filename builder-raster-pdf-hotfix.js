(()=>{
const H2C='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
const JSPDF='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function load(win,src,test){if(test())return Promise.resolve();return new Promise((resolve,reject)=>{const s=win.document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`No se pudo cargar ${src}`));win.document.head.appendChild(s)})}
async function waitFor(fn,timeout=20000){const t=Date.now();while(Date.now()-t<timeout){try{const v=fn();if(v)return v}catch{}await sleep(80)}throw new Error('Timeout esperando el preview')}
async function openPreviewAndGetWindow(){const preview=document.getElementById('qf-preview');if(!preview)throw new Error('No encuentro el botón Visualizar');let resolveOpen,rejectOpen;const opened=new Promise((res,rej)=>{resolveOpen=res;rejectOpen=rej});const original=window.open;let restored=false;const restore=()=>{if(!restored){window.open=original;restored=true}};window.open=(...args)=>{const w=original.apply(window,args);restore();if(w)resolveOpen(w);else rejectOpen(new Error('El navegador bloqueó la pestaña de preview'));return w};preview.click();setTimeout(()=>{restore();rejectOpen(new Error('No se abrió el preview'))},12000);return opened}
function nextSlide(win){const btn=win.document.querySelector('.navigate-right:not([disabled])');if(btn){btn.click();return true}win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',bubbles:true}));return true}
async function rasterPdf(){const status=document.getElementById('qf-status');const setStatus=(kind,text)=>{if(status){status.className=`qf-status ${kind||''}`;status.textContent=text}};setStatus('busy','PDF de emergencia: capturando el preview tal como se ve…');const win=await openPreviewAndGetWindow();await waitFor(()=>win.document?.getElementById('qf-local-status')?.textContent.includes('Quarkfoil PASQAL listo'));
await load(win,H2C,()=>Boolean(win.html2canvas));
await load(win,JSPDF,()=>Boolean(win.jspdf?.jsPDF));
const slides=[...win.document.querySelectorAll('.scientific-slide[data-slide-id^="pasqal-"]')];if(!slides.length)throw new Error('No encontré slides renderizadas');
const {jsPDF}=win.jspdf;const pdf=new jsPDF({orientation:'landscape',unit:'pt',format:[960,540],compress:true});
for(let i=0;i<slides.length;i++){
  await sleep(120);
  const current=win.document.querySelector('.scientific-slide.present')||slides[i];
  const canvas=await win.html2canvas(current,{backgroundColor:null,scale:1.6,useCORS:true,logging:false,width:1280,height:720,windowWidth:1280,windowHeight:720});
  const png=canvas.toDataURL('image/png');
  if(i)pdf.addPage([960,540],'landscape');
  pdf.addImage(png,'PNG',0,0,960,540,undefined,'FAST');
  setStatus('busy',`PDF de emergencia: slide ${i+1}/${slides.length}`);
  if(i<slides.length-1){nextSlide(win);await sleep(160)}
}
const title=(win.document.title||'presentation').replace(/[\\/:*?"<>|]+/g,'-').trim()||'presentation';pdf.save(`${title}.pdf`);setStatus('ok','PDF generado desde capturas del preview.');
}
function install(){const btn=document.getElementById('qf-pdf');if(!btn||btn.dataset.rasterPdfHotfix)return;btn.dataset.rasterPdfHotfix='1';btn.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();try{await rasterPdf()}catch(err){const s=document.getElementById('qf-status');if(s){s.className='qf-status error';s.textContent=`Error PDF emergencia: ${err.message||err}`}}},true)}
new MutationObserver(install).observe(document.documentElement,{subtree:true,childList:true});install();
})();
