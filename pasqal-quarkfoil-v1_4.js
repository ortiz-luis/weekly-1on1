(()=>{
const KEY='weekly-1on1-pasqal-quarkfoil-v1.4';
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
let source={name:'',text:''};
try{source=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
let imageFiles=[];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function save(){try{localStorage.setItem(KEY,JSON.stringify({name:source.name||'',text:source.text||''}))}catch{}}
function readText(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('No se pudo leer el Markdown'));r.readAsText(file)})}
function download(name,text){const b=new Blob([text],{type:'text/markdown;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},200)}
function ensureFrontMatter(text){let src=(text||starter).trim();if(!src.startsWith('---\n'))return `---\ntitle: PASQAL deck\nshort-title: PASQAL deck\nauthor: Luis Ortiz\naspect-ratio: 16:9\ntheme: scientific-light\nassets:\n  figures: figures\ndefaults:\n  footer: PASQAL · CONFIDENTIAL\n---\n\n${src}\n`;const end=src.indexOf('\n---',4);if(end<0)return src;let fm=src.slice(4,end).trim();const body=src.slice(end+4).trimStart();if(!/^aspect-ratio:/m.test(fm))fm+='\naspect-ratio: 16:9';if(!/^theme:/m.test(fm))fm+='\ntheme: scientific-light';if(!/^short-title:/m.test(fm)){const t=(fm.match(/^title:\s*(.+)$/m)||[])[1]||'PASQAL deck';fm+=`\nshort-title: ${t}`}if(!/^assets:/m.test(fm))fm+='\nassets:\n  figures: figures';else if(!/^\s+figures:/m.test(fm))fm=fm.replace(/^assets:\s*$/m,'assets:\n  figures: figures');if(!/^defaults:/m.test(fm))fm+='\ndefaults:\n  footer: PASQAL · CONFIDENTIAL';else if(!/^\s+footer:/m.test(fm))fm=fm.replace(/^defaults:\s*$/m,'defaults:\n  footer: PASQAL · CONFIDENTIAL');return `---\n${fm}\n---\n\n${body}`}
function normalizeImages(text){let out=text;for(const f of imageFiles){const n=f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');out=out.replace(new RegExp(`\\]\\((?:\\./)?${n}\\)`,'g'),`](${`figures/${f.name}`})`)}return out}
function referencedImages(text){const arr=[];const rx=/!\[[^\]]*\]\(([^\s\)]+)(?:\s+[^\)]*)?\)/g;let m;while((m=rx.exec(text)))arr.push(m[1].replace(/^\.\//,''));return arr}
function firstTitle(text){const body=text.replace(/^---[\s\S]*?---\s*/,'');const m=body.match(/^#{1,2}\s+(.+?)(?:\s+\{.*\})?$/m);return m?m[1].replace(/[\*_]/g,''):'PASQAL Quarkfoil deck'}
function hasPasqalIds(text){return /\{[^}]*#pasqal-[^}\s]+/.test(text)}
function addDefaultPasqalIds(text){if(hasPasqalIds(text))return text;let slide=0;return text.replace(/^(#{1,2})\s+([^\n{]+?)(?:\s+\{([^}]*)\})?\s*$/gm,(whole,hash,title,attrs='')=>{slide++;const clean=title.trim();let id=`pasqal-content-${slide}`;let extra='';if(slide===1){id='pasqal-front';extra='.layout-front footer="none"'}else if(/^agenda$/i.test(clean)){id='pasqal-agenda';extra='.layout-1'}else if(/^(thank you|merci|gracias)$/i.test(clean)){id='pasqal-closing';extra='.layout-1 footer="none"'}else if(/decision|next step|siguiente paso/i.test(clean)){id=`pasqal-dark-${slide}`;extra='.layout-1'}else if(/reference|référence|referencia/i.test(clean)){id=`pasqal-references-${slide}`;extra='.layout-1'}else{extra=/layout-/.test(attrs)?'':'.layout-1'}const kept=attrs.replace(/#\S+/g,'').trim();return `${hash} ${clean} {#${id} ${extra} ${kept}}`.replace(/\s+}/,' }').replace(/\s{2,}/g,' ')})}
function page(){const current=source.text||starter;return `<section class="app-page quarkfoil-builder"><div class="simple-head"><h1>PASQAL Quarkfoil Builder</h1><p class="subtle">Flujo mínimo real: un <code>deck.md</code> + todas las imágenes en una sola selección. Sin Quarto.</p></div><div class="qf-card"><div class="qf-banner"><b>Template por defecto: PASQAL Golden para Quarkfoil</b><span>El Markdown contiene el contenido. Geometría, tipografía, logos, colores y PDF están hardcoded en el fork PASQAL de Quarkfoil.</span></div><div class="qf-grid"><div class="qf-step"><strong>1 · deck.md</strong><p>Edita el template o carga un deck Quarkfoil existente. Las slides se separan con <code>---</code>.</p><input class="qf-input" id="qf-md" type="file" accept=".md,text/markdown,text/plain"><label class="qf-pick" for="qf-md">Cargar deck.md</label><span id="qf-md-meta" class="qf-meta">${esc(source.name||'Usando template PASQAL')}</span></div><div class="qf-step"><strong>2 · Imágenes</strong><p>Selecciona todas las figuras de una vez. El Builder normaliza sus rutas a <code>figures/archivo</code>.</p><input class="qf-input" id="qf-images" type="file" accept="image/*" multiple><label class="qf-pick" for="qf-images">Añadir imágenes</label><span id="qf-img-meta" class="qf-meta">Sin imágenes seleccionadas</span><div id="qf-files" class="qf-files"></div></div></div><div id="qf-status" class="qf-status">Listo para visualizar un deck PASQAL.</div><div class="qf-actions"><button class="primary" id="qf-generate">Preparar deck.md</button><button id="qf-template">Descargar template PASQAL</button><button id="qf-copy">Copiar Markdown</button></div><div class="qf-preview"><div class="qf-top"></div><div class="qf-content"><h3>${esc(firstTitle(current))}</h3><p>Preview rápida del contenido. La visualización final usa el renderer PASQAL nativo del fork de Quarkfoil.</p></div><div class="qf-footer">PASQAL · CONFIDENTIAL</div></div><div class="qf-note">Proyecto esperado: <code>deck.md</code> + carpeta <code>figures/</code>. El Builder añade automáticamente los IDs PASQAL cuando faltan.</div></div></section>`}
function generated(){return addDefaultPasqalIds(normalizeImages(ensureFrontMatter(source.text||starter)))}
function status(kind,text){const el=document.getElementById('qf-status');if(el){el.className=`qf-status ${kind||''}`;el.textContent=text}}
function bind(){const md=document.getElementById('qf-md');if(md)md.onchange=async()=>{const f=md.files?.[0];if(!f)return;try{source={name:f.name,text:await readText(f)};save();document.getElementById('qf-md-meta').textContent=f.name;status('ok','Markdown cargado. El Builder añadirá la estructura PASQAL que falte.')}catch(e){status('error',e.message)}};const imgs=document.getElementById('qf-images');if(imgs)imgs.onchange=()=>{imageFiles=[...(imgs.files||[])];document.getElementById('qf-img-meta').textContent=imageFiles.length?`${imageFiles.length} imagen${imageFiles.length===1?'':'es'} seleccionada${imageFiles.length===1?'':'s'}`:'Sin imágenes seleccionadas';document.getElementById('qf-files').innerHTML=imageFiles.map(f=>`<div>${esc(f.name)}</div>`).join('')};const t=document.getElementById('qf-template');if(t)t.onclick=()=>download('pasqal-quarkfoil-template.md',starter);const g=document.getElementById('qf-generate');if(g)g.onclick=()=>{try{const text=generated();const refs=referencedImages(text).filter(x=>x.startsWith('figures/'));const selected=new Set(imageFiles.map(f=>`figures/${f.name}`));const missing=refs.filter(r=>!selected.has(r));download('deck.md',text);status('ok',missing.length?`deck.md preparado. Ojo: ${missing.length} figura(s) referenciada(s) no fueron seleccionadas en esta sesión.`:'Listo: deck.md preparado para el Quarkfoil PASQAL nativo.')}catch(e){status('error',`Error: ${e.message||e}`)}};const cp=document.getElementById('qf-copy');if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(generated());cp.textContent='Copiado ✓';setTimeout(()=>cp.textContent='Copiar Markdown',1200)}catch(e){status('error','No se pudo copiar al portapapeles.')}}}
const prev=render;render=function(){if(route().page==='builder'){renderNav();$('#main').innerHTML=page();bind();return}prev()};window.addEventListener('hashchange',()=>{if(route().page==='builder')setTimeout(()=>render(),0)});if(route().page==='builder')render();
})();