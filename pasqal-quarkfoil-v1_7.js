(()=>{
const STORE_KEY='weekly-1on1-pasqal-quarkfoil-v1.7';
const QUARKFOIL_COMMIT='8bed44d3619bb1a4e6ce3b8dd2b17925830ca7b3';
const QUARKFOIL_BASE=`https://cdn.jsdelivr.net/gh/ortiz-luis/quarkfoil@${QUARKFOIL_COMMIT}/app`;
const starter=`---
title: PASQAL 1:1 deck
short-title: PASQAL 1:1 deck
author: Luis Ortiz
aspect-ratio: 16:9
theme: scientific-light
assets:
  figures: figures
defaults:
  footer: PASQAL · CONFIDENTIAL
---

# Título de la presentación {#pasqal-front .layout-front footer="none"}

::: core
## *Subtítulo / mensaje principal*

**Luis Ortiz**

1:1 con Lucas
:::

---

## Agenda {#pasqal-agenda .layout-1}

::: core
1. Contexto y objetivo
2. Evidencia principal
3. Decisión / siguiente paso
:::

---

## Dónde estamos {#pasqal-content-1 .layout-1}

::: core
### Mensaje principal

- Hecho confirmado
- Punto todavía por validar
- Qué cambió desde el último 1:1
:::

---

## Evidencia {#pasqal-focus-1 .layout-1-1 columns="43 57"}

::: left
### Qué demuestra

- Resultado principal
- Implicación concreta
- Qué sigue abierto
:::

::: right
![](figures/figure-1.png){fit=contain focus="50 50"}
:::

---

## 1 {#pasqal-section-1 .layout-1 footer="none"}

::: core
1
:::

::: overlay {#pasqal-section-title type="markdown" x="6.875" y="50.15" w="58" h="18" z="30" locked="true" color="#FFFFFF" font-size="2.06"}
Decisión
:::

---

## Decisión / siguiente paso {#pasqal-dark-1 .layout-1}

::: core
*Qué debemos cerrar ahora*

- Decisión o validación de Lucas
- Owner del siguiente paso
- Próximo handoff

### Takeaway
El siguiente paso queda explícito, con owner y criterio de cierre.
:::

---

## Thank you {#pasqal-closing .layout-1 footer="none"}

::: core
Questions?
:::
`;
let saved={name:'',text:'',topicId:''};
try{saved={...saved,...JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}}catch{}
let source={name:saved.name||'',text:saved.text||starter,topicId:saved.topicId||''};
let imageFiles=[];
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify({name:source.name||'',text:source.text||'',topicId:source.topicId||''}))}catch{}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function jsData(value){return JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026')}
function readText(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('No se pudo leer el Markdown'));r.readAsText(file)})}
function fileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error(`No se pudo leer ${file.name}`));r.readAsDataURL(file)})}
function download(name,text,type='text/markdown;charset=utf-8'){const b=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},250)}
function ensureFrontMatter(text){let src=(text||starter).trim();if(!src.startsWith('---\n'))return `---\ntitle: PASQAL deck\nshort-title: PASQAL deck\nauthor: Luis Ortiz\naspect-ratio: 16:9\ntheme: scientific-light\nassets:\n  figures: figures\ndefaults:\n  footer: PASQAL · CONFIDENTIAL\n---\n\n${src}\n`;const end=src.indexOf('\n---',4);if(end<0)return src;let fm=src.slice(4,end).trim();const body=src.slice(end+4).trimStart();if(!/^aspect-ratio:/m.test(fm))fm+='\naspect-ratio: 16:9';if(!/^theme:/m.test(fm))fm+='\ntheme: scientific-light';if(!/^short-title:/m.test(fm)){const t=(fm.match(/^title:\s*(.+)$/m)||[])[1]||'PASQAL deck';fm+=`\nshort-title: ${t}`}if(!/^assets:/m.test(fm))fm+='\nassets:\n  figures: figures';else if(!/^\s+figures:/m.test(fm))fm=fm.replace(/^assets:\s*$/m,'assets:\n  figures: figures');if(!/^defaults:/m.test(fm))fm+='\ndefaults:\n  footer: PASQAL · CONFIDENTIAL';else if(!/^\s+footer:/m.test(fm))fm=fm.replace(/^defaults:\s*$/m,'defaults:\n  footer: PASQAL · CONFIDENTIAL');return `---\n${fm}\n---\n\n${body}`}
function normalizeImages(text){let out=text;for(const f of imageFiles){const n=f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');out=out.replace(new RegExp(`\\]\\((?:\\./)?${n}\\)`,'g'),`](${`figures/${f.name}`})`)}return out}
function hasPasqalIds(text){return /\{[^}]*#pasqal-[^}\s]+/.test(text)}
function addDefaultPasqalIds(text){if(hasPasqalIds(text))return text;let slide=0;return text.replace(/^(#{1,2})\s+([^\n{]+?)(?:\s+\{([^}]*)\})?\s*$/gm,(whole,hash,title,attrs='')=>{slide++;const clean=title.trim();let id=`pasqal-content-${slide}`;let extra='';if(slide===1){id='pasqal-front';extra='.layout-front footer="none"'}else if(/^agenda$/i.test(clean)){id='pasqal-agenda';extra='.layout-1'}else if(/^(thank you|merci|gracias)$/i.test(clean)){id='pasqal-closing';extra='.layout-1 footer="none"'}else if(/decision|next step|siguiente paso/i.test(clean)){id=`pasqal-dark-${slide}`;extra='.layout-1'}else if(/reference|référence|referencia/i.test(clean)){id=`pasqal-references-${slide}`;extra='.layout-1'}else{extra=/layout-/.test(attrs)?'':'.layout-1'}const kept=attrs.replace(/#\S+/g,'').trim();return `${hash} ${clean} {#${id} ${extra} ${kept}}`.replace(/\s+}/,' }').replace(/\s{2,}/g,' ')})}
function generated(){return addDefaultPasqalIds(normalizeImages(ensureFrontMatter(source.text||starter)))}
function referencedImages(text){const arr=[];const rx=/!\[[^\]]*\]\(([^\s\)]+)(?:\s+[^\)]*)?\)/g;let m;while((m=rx.exec(text)))arr.push(m[1].replace(/^\.\//,''));return arr}
async function assetMap(){const map={};for(const f of imageFiles){const data=await fileData(f);map[f.name]=data;map[`figures/${f.name}`]=data;map[`./figures/${f.name}`]=data}return map}
function titleFromDeck(text){const body=text.replace(/^---[\s\S]*?---\s*/,'');const m=body.match(/^#{1,2}\s+(.+?)(?:\s+\{.*\})?$/m);return m?m[1].replace(/[\*_]/g,''):'PASQAL deck'}
function status(kind,text){const el=document.getElementById('qf-status');if(el){el.className=`qf-status ${kind||''}`;el.textContent=text}}
function topicOptions(){return ['<option value="">Sin ligar a tema</option>',...(state?.topics||[]).map(t=>`<option value="${esc(t.id)}" ${source.topicId===t.id?'selected':''}>${esc(t.title)}</option>`)].join('')}
function page(){return `<section class="app-page quarkfoil-builder"><div class="simple-head"><h1>PASQAL Quarkfoil Builder</h1><p class="subtle">Flujo final: <code>deck.md</code> + imágenes → Quarkfoil PASQAL real → preview o PDF.</p></div><div class="qf-card"><div class="qf-banner"><b>Template PASQAL Golden congelado</b><span>El contenido entra por Markdown e imágenes. Geometría, logos, colores, footer y familias de slides viven en el fork de Quarkfoil, no en tus inputs.</span></div><div class="qf-grid"><div class="qf-step"><strong>1 · Markdown</strong><p>Carga un <code>deck.md</code> o edita directamente el texto. El Builder añade IDs PASQAL cuando faltan.</p><input class="qf-input" id="qf-md" type="file" accept=".md,text/markdown,text/plain"><label class="qf-pick" for="qf-md">Cargar deck.md</label><span id="qf-md-meta" class="qf-meta">${esc(source.name||'Template PASQAL')}</span></div><div class="qf-step"><strong>2 · Imágenes</strong><p>Selecciona las figuras referenciadas en el Markdown. Se usan localmente en memoria y no se publican.</p><input class="qf-input" id="qf-images" type="file" accept="image/*" multiple><label class="qf-pick" for="qf-images">Añadir imágenes</label><span id="qf-img-meta" class="qf-meta">Sin imágenes seleccionadas</span><div id="qf-files" class="qf-files"></div></div></div><div style="margin-top:14px"><label style="display:grid;gap:7px;font-weight:700">Editar Markdown<textarea id="qf-editor" spellcheck="false" style="min-height:320px;width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:14px;padding:14px;font:13px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical">${esc(source.text||starter)}</textarea></label></div><div style="margin-top:14px"><label style="display:grid;gap:7px;font-weight:700">Vincular a tema<select id="qf-topic" style="min-height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;background:#fff">${topicOptions()}</select></label></div><div id="qf-status" class="qf-status">Listo. Preview y PDF usan el renderer real del fork PASQAL.</div><div class="qf-actions"><button class="primary" id="qf-preview">Visualizar</button><button class="accent" id="qf-pdf">Generar PDF</button><button id="qf-download">Descargar deck.md</button><button id="qf-template">Template</button><button id="qf-copy">Copiar</button></div><div class="qf-contract"><div><b>Inputs</b><span>deck.md + imágenes</span></div><div><b>Hardcoded</b><span>PASQAL theme, geometría, logos, chevrons, tipografía, footer y layouts</span></div><div><b>Output</b><span>Preview Quarkfoil real + PDF 16:9</span></div></div><div class="qf-note">Las figuras se mantienen en tu navegador. El Markdown descargado conserva rutas <code>figures/...</code>. El PDF se obtiene con el diálogo nativo de impresión del navegador.</div><div class="qf-version">Quarkfoil PASQAL fijado en ${QUARKFOIL_COMMIT.slice(0,8)}</div></div></section>`}
function viewerHtml(deck,assets,mode){const d=jsData(deck),a=jsData(assets),base=jsData(QUARKFOIL_BASE),m=jsData(mode);return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titleFromDeck(deck))}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.2.1/dist/reveal.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css"><link rel="stylesheet" href="${QUARKFOIL_BASE}/styles/layout.css"><link rel="stylesheet" href="${QUARKFOIL_BASE}/styles/themes.css"><link rel="stylesheet" href="${QUARKFOIL_BASE}/styles/player.css"><style>body{margin:0;background:#111}#qf-local-print{position:fixed;z-index:9999;right:18px;top:18px;border:0;border-radius:10px;padding:11px 15px;background:#173035;color:#fff;font:600 14px system-ui;cursor:pointer}#qf-local-status{position:fixed;z-index:9998;left:18px;bottom:18px;padding:8px 11px;border-radius:9px;background:rgba(15,30,35,.88);color:#fff;font:12px system-ui}@media print{@page{size:13.333333in 7.5in;margin:0}html,body{width:auto!important;height:auto!important;margin:0!important;background:#fff!important;overflow:visible!important}#qf-local-print,#qf-local-status{display:none!important}.reveal{width:auto!important;height:auto!important;overflow:visible!important}.reveal .slides{position:static!important;width:auto!important;height:auto!important;transform:none!important;inset:auto!important}.reveal .slides>section{display:block!important;position:relative!important;width:1280px!important;height:720px!important;transform:none!important;left:auto!important;top:auto!important;margin:0!important;page-break-after:always!important;break-after:page!important}.reveal .slides>section:last-child{page-break-after:auto!important}.controls,.progress,.slide-number{display:none!important}}</style></head><body><button id="qf-local-print">PDF / Imprimir</button><main class="reveal"><div id="slides" class="slides"></div></main><div id="qf-local-status">Cargando Quarkfoil PASQAL…</div><script src="https://cdn.jsdelivr.net/npm/reveal.js@5.2.1/dist/reveal.js"><\/script><script src="https://cdn.jsdelivr.net/npm/reveal.js@5.2.1/plugin/notes/notes.js"><\/script><script src="https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js"><\/script><script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"><\/script><script src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"><\/script><script src="https://cdn.jsdelivr.net/npm/bibtex-parse-js@0.0.24/bibtexParse.js"><\/script><script id="qf-deck" type="application/json">${d}<\/script><script id="qf-assets" type="application/json">${a}<\/script><script type="module">const BASE=${base},MODE=${m};const deckSource=JSON.parse(document.getElementById('qf-deck').textContent),assets=JSON.parse(document.getElementById('qf-assets').textContent);const [{parseDeck},{renderDeck},{prepareBibliography},{applyPasqalRuntime},{waitForRenderAssets}]=await Promise.all([import(BASE+'/modules/parser.js'),import(BASE+'/modules/render.js'),import(BASE+'/modules/bibliography.js'),import(BASE+'/modules/pasqal-runtime.js'),import(BASE+'/modules/print.js')]);const deck=parseDeck(deckSource);const errors=deck.diagnostics.filter(x=>x.level==='error');if(errors.length)throw new Error(errors.map(x=>x.message).join('; '));const resolver=p=>{const s=String(p),clean=s.startsWith('./')?s.slice(2):s;return assets[p]||assets[clean]||p};renderDeck(deck,document.getElementById('slides'),resolver,prepareBibliography('',deck,{}),{includeTrashed:false});applyPasqalRuntime(document);if(MODE==='preview'){const reveal=new Reveal(document.querySelector('.reveal'),{controls:true,progress:true,hash:false,history:false,center:false,transition:'none',width:1280,height:720,margin:0,minScale:.1,maxScale:3,pdfMaxPagesPerSlide:1,pdfSeparateFragments:false,plugins:window.RevealNotes?[window.RevealNotes]:[]});await reveal.initialize()}await waitForRenderAssets();document.getElementById('qf-local-status').textContent='Quarkfoil PASQAL listo';document.getElementById('qf-local-print').onclick=async()=>{await waitForRenderAssets();window.print()};if(MODE==='pdf'){document.getElementById('qf-local-status').textContent='Abriendo diálogo PDF…';setTimeout(()=>window.print(),300)}<\/script></body></html>`}
async function openReal(mode){try{status('busy',mode==='pdf'?'Preparando PDF con Quarkfoil real…':'Preparando preview con Quarkfoil real…');const deck=generated();const refs=referencedImages(deck).filter(x=>x.startsWith('figures/'));const selected=new Set(imageFiles.map(f=>`figures/${f.name}`));const missing=refs.filter(r=>!selected.has(r));if(missing.length){status('error',`Faltan ${missing.length} imagen(es): ${missing.slice(0,3).join(', ')}${missing.length>3?'…':''}`);return}const assets=await assetMap();const html=viewerHtml(deck,assets,mode);const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);const w=window.open(url,'_blank');if(!w){URL.revokeObjectURL(url);throw new Error('El navegador bloqueó la nueva pestaña.')}setTimeout(()=>URL.revokeObjectURL(url),120000);status('ok',mode==='pdf'?'PDF preparado en una pestaña nueva. Usa “Guardar como PDF”.':'Preview abierto con el renderer real de Quarkfoil.')}catch(e){status('error',`Error: ${e.message||e}`)}}
function saveEditor(){const ed=document.getElementById('qf-editor');if(ed)source.text=ed.value;const t=document.getElementById('qf-topic');if(t)source.topicId=t.value;persist()}
function bind(){const ed=document.getElementById('qf-editor');if(ed)ed.oninput=()=>{source.text=ed.value;persist()};const topic=document.getElementById('qf-topic');if(topic)topic.onchange=()=>{source.topicId=topic.value;persist()};const md=document.getElementById('qf-md');if(md)md.onchange=async()=>{const f=md.files?.[0];if(!f)return;try{source.name=f.name;source.text=await readText(f);persist();document.getElementById('qf-md-meta').textContent=f.name;document.getElementById('qf-editor').value=source.text;status('ok','Markdown cargado.')}catch(e){status('error',e.message)}};const imgs=document.getElementById('qf-images');if(imgs)imgs.onchange=()=>{imageFiles=[...(imgs.files||[])];document.getElementById('qf-img-meta').textContent=imageFiles.length?`${imageFiles.length} imagen${imageFiles.length===1?'':'es'} seleccionada${imageFiles.length===1?'':'s'}`:'Sin imágenes seleccionadas';document.getElementById('qf-files').innerHTML=imageFiles.map(f=>`<div>${esc(f.name)}</div>`).join('')};document.getElementById('qf-preview').onclick=()=>{saveEditor();openReal('preview')};document.getElementById('qf-pdf').onclick=()=>{saveEditor();openReal('pdf')};document.getElementById('qf-download').onclick=()=>{saveEditor();download('deck.md',generated())};document.getElementById('qf-template').onclick=()=>download('pasqal-quarkfoil-template.md',starter);document.getElementById('qf-copy').onclick=async e=>{saveEditor();try{await navigator.clipboard.writeText(generated());e.currentTarget.textContent='Copiado ✓';setTimeout(()=>e.currentTarget.textContent='Copiar',1200)}catch{status('error','No se pudo copiar al portapapeles.')}}}
function ensureNav(){try{if(Array.isArray(nav)&&!nav.some(x=>x[0]==='builder'))nav.splice(Math.max(0,nav.length-1),0,['builder','✦','Builder'])}catch{}}
ensureNav();
const previousRender=render;render=function(){if(route().page==='builder'){renderNav();$('#main').innerHTML=page();bind();return}previousRender();const r=route();if(r.page==='deliverables'&&r.id){const d=state.deliverables.find(x=>x.id===r.id);if(d?.type==='presentation'&&!document.getElementById('open-builder')){const b=document.createElement('button');b.id='open-builder';b.className='wide-action secondary-action';b.textContent='Abrir en Builder PASQAL';b.onclick=()=>{source.topicId=d.topicId||'';source.name='';source.text=starter.replace('Título de la presentación',d.title||'Título').replace('Subtítulo / mensaje principal',d.objective||'Mensaje principal');persist();location.hash='#builder'};$('#main')?.querySelector('.app-page')?.appendChild(b)}}};
window.addEventListener('hashchange',()=>{if(route().page==='builder')setTimeout(()=>render(),0)});if(route().page==='builder')render();
})();
