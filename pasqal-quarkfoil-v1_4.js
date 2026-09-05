(()=>{
const KEY='weekly-1on1-pasqal-quarkfoil-v1.4';
const starter=`---
title: PASQAL 1:1 deck
author: Luis Ortiz
aspect-ratio: 16:9
theme: scientific-light
assets:
  figures: figures
defaults:
  footer: PASQAL · CONFIDENTIAL
---

# Título de la presentación {.title-slide .layout-front background="#0F1E23" foreground="#E1F6E9" footer="none"}

## *Subtítulo / mensaje principal*

::: core
**Luis Ortiz**

1:1 con Lucas
:::

---

## Dónde estamos {.layout-1 background="#FFFFFF" foreground="#173035"}

::: core
### Mensaje principal

- Hecho confirmado
- Punto todavía por validar
- Qué cambió desde el último 1:1
:::

::: overlay {#pasqal-accent-1 type="shape" shape="rectangle" x="0" y="0" w="100" h="1.2" z="1" locked="true" fill="#00C887" stroke="#00C887"}
:::

---

## Evidencia {.layout-1-1 columns="43 57" background="#FFFFFF" foreground="#173035"}

::: left
### Qué demuestra

- Resultado principal
- Implicación concreta
- Qué sigue abierto
:::

::: right
![](figures/figure-1.png){fit=contain focus="50 50"}
:::

::: overlay {#pasqal-accent-2 type="shape" shape="rectangle" x="0" y="0" w="100" h="1.2" z="1" locked="true" fill="#00C887" stroke="#00C887"}
:::

---

## Decisión / siguiente paso {.layout-1 background="#E1F6E9" foreground="#173035"}

::: core
### Lo que necesito cerrar

- Decisión o validación de Lucas
- Owner del siguiente paso
- Próximo handoff
:::

::: overlay {#pasqal-accent-3 type="shape" shape="rectangle" x="0" y="0" w="100" h="1.2" z="1" locked="true" fill="#00C887" stroke="#00C887"}
:::
`;
let source={name:'',text:''};
try{source=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
let imageFiles=[];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function save(){try{localStorage.setItem(KEY,JSON.stringify({name:source.name||'',text:source.text||''}))}catch{}}
function readText(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('No se pudo leer el Markdown'));r.readAsText(file)})}
function download(name,text){const b=new Blob([text],{type:'text/markdown;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},200)}
function ensureFrontMatter(text){let src=(text||starter).trim();if(!src.startsWith('---\n'))return starter.replace(/---[\s\S]*?---\n/,'')?`---\ntitle: PASQAL deck\nauthor: Luis Ortiz\naspect-ratio: 16:9\ntheme: scientific-light\nassets:\n  figures: figures\ndefaults:\n  footer: PASQAL · CONFIDENTIAL\n---\n\n${src}\n`:src;const end=src.indexOf('\n---',4);if(end<0)return src;let fm=src.slice(4,end).trim();const body=src.slice(end+4).trimStart();if(!/^aspect-ratio:/m.test(fm))fm+='\naspect-ratio: 16:9';if(!/^theme:/m.test(fm))fm+='\ntheme: scientific-light';if(!/^assets:/m.test(fm))fm+='\nassets:\n  figures: figures';else if(!/^\s+figures:/m.test(fm))fm=fm.replace(/^assets:\s*$/m,'assets:\n  figures: figures');if(!/^defaults:/m.test(fm))fm+='\ndefaults:\n  footer: PASQAL · CONFIDENTIAL';else if(!/^\s+footer:/m.test(fm))fm=fm.replace(/^defaults:\s*$/m,'defaults:\n  footer: PASQAL · CONFIDENTIAL');return `---\n${fm}\n---\n\n${body}`}
function normalizeImages(text){let out=text;for(const f of imageFiles){const n=f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');out=out.replace(new RegExp(`\\]\\((?:\\./)?${n}\\)`,'g'),`](${`figures/${f.name}`})`)}return out}
function referencedImages(text){const arr=[];const rx=/!\[[^\]]*\]\(([^\s\)]+)(?:\s+[^\)]*)?\)/g;let m;while((m=rx.exec(text)))arr.push(m[1].replace(/^\.\//,''));return arr}
function firstTitle(text){const body=text.replace(/^---[\s\S]*?---\s*/,'');const m=body.match(/^#{1,2}\s+(.+?)(?:\s+\{.*\})?$/m);return m?m[1].replace(/[\*_]/g,''):'PASQAL Quarkfoil deck'}
function page(){const current=source.text||starter;return `<section class="app-page quarkfoil-builder"><div class="simple-head"><h1>PASQAL Quarkfoil Builder</h1><p class="subtle">Flujo mínimo real: un <code>deck.md</code> + todas las imágenes en una sola selección. Sin Quarto.</p></div><div class="qf-card"><div class="qf-banner"><b>Template por defecto: PASQAL Standard Deck para Quarkfoil</b><span>El Markdown es la fuente de verdad. El template ya trae portada, layouts, colores PASQAL y footer.</span></div><div class="qf-grid"><div class="qf-step"><strong>1 · deck.md</strong><p>Edita el template o carga un deck Quarkfoil existente. Las slides se separan con <code>---</code>.</p><input class="qf-input" id="qf-md" type="file" accept=".md,text/markdown,text/plain"><label class="qf-pick" for="qf-md">Cargar deck.md</label><span id="qf-md-meta" class="qf-meta">${esc(source.name||'Usando template PASQAL')}</span></div><div class="qf-step"><strong>2 · Imágenes</strong><p>Selecciona todas las figuras de una vez. El Builder normaliza sus rutas a <code>figures/archivo</code>.</p><input class="qf-input" id="qf-images" type="file" accept="image/*" multiple><label class="qf-pick" for="qf-images">Añadir imágenes</label><span id="qf-img-meta" class="qf-meta">Sin imágenes seleccionadas</span><div id="qf-files" class="qf-files"></div></div></div><div id="qf-status" class="qf-status">Listo para generar un deck Quarkfoil.</div><div class="qf-actions"><button class="primary" id="qf-generate">Generar deck.md</button><button id="qf-template">Descargar template PASQAL</button><button id="qf-copy">Copiar Markdown</button></div><div class="qf-preview"><div class="qf-top"></div><div class="qf-content"><h3>${esc(firstTitle(current))}</h3><p>Preview simplificado. El render final lo hace Quarkfoil usando layouts y atributos guardados en el Markdown.</p></div><div class="qf-footer">PASQAL · CONFIDENTIAL</div></div><div class="qf-note">Proyecto Quarkfoil esperado: <code>deck.md</code> junto a una carpeta <code>figures/</code>. El propio editor puede importar/gestionar esas figuras.</div></div></section>`}
function generated(){return normalizeImages(ensureFrontMatter(source.text||starter))}
function status(kind,text){const el=document.getElementById('qf-status');if(el){el.className=`qf-status ${kind||''}`;el.textContent=text}}
function bind(){const md=document.getElementById('qf-md');if(md)md.onchange=async()=>{const f=md.files?.[0];if(!f)return;try{source={name:f.name,text:await readText(f)};save();document.getElementById('qf-md-meta').textContent=f.name;status('ok','Markdown cargado. Puedes generar deck.md.')}catch(e){status('error',e.message)}};const imgs=document.getElementById('qf-images');if(imgs)imgs.onchange=()=>{imageFiles=[...(imgs.files||[])];document.getElementById('qf-img-meta').textContent=imageFiles.length?`${imageFiles.length} imagen${imageFiles.length===1?'':'es'} seleccionada${imageFiles.length===1?'':'s'}`:'Sin imágenes seleccionadas';document.getElementById('qf-files').innerHTML=imageFiles.map(f=>`<div>${esc(f.name)}</div>`).join('')};const t=document.getElementById('qf-template');if(t)t.onclick=()=>download('pasqal-quarkfoil-template.md',starter);const g=document.getElementById('qf-generate');if(g)g.onclick=()=>{try{const text=generated();const refs=referencedImages(text).filter(x=>x.startsWith('figures/'));const selected=new Set(imageFiles.map(f=>`figures/${f.name}`));const missing=refs.filter(r=>!selected.has(r));download('deck.md',text);status('ok',missing.length?`deck.md descargado. Ojo: ${missing.length} figura(s) referenciada(s) no fueron seleccionadas en esta sesión.`:'Listo: deck.md descargado para Quarkfoil.')}catch(e){status('error',`Error: ${e.message||e}`)}};const cp=document.getElementById('qf-copy');if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(generated());cp.textContent='Copiado ✓';setTimeout(()=>cp.textContent='Copiar Markdown',1200)}catch(e){status('error','No se pudo copiar al portapapeles.')}}}
const prev=render;render=function(){if(route().page==='builder'){renderNav();$('#main').innerHTML=page();bind();return}prev()};window.addEventListener('hashchange',()=>{if(route().page==='builder')setTimeout(()=>render(),0)});if(route().page==='builder')render();
})();