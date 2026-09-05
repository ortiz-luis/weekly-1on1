(()=>{
  const topbar=document.querySelector('.topbar');
  const sidebar=document.querySelector('.sidebar');
  if(!topbar||!sidebar) return;
  if(document.querySelector('.mobile-menu-toggle')) return;

  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='mobile-menu-toggle';
  toggle.setAttribute('aria-label','Abrir menú');
  toggle.setAttribute('aria-expanded','false');
  toggle.innerHTML='<span aria-hidden="true">☰</span>';
  topbar.appendChild(toggle);

  const backdrop=document.createElement('button');
  backdrop.type='button';
  backdrop.className='mobile-menu-backdrop';
  backdrop.setAttribute('aria-label','Cerrar menú');
  document.body.appendChild(backdrop);

  const setOpen=(open)=>{
    document.body.classList.toggle('mobile-menu-open',open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
    toggle.innerHTML=open?'<span aria-hidden="true">×</span>':'<span aria-hidden="true">☰</span>';
  };

  toggle.addEventListener('click',()=>setOpen(!document.body.classList.contains('mobile-menu-open')));
  backdrop.addEventListener('click',()=>setOpen(false));
  sidebar.addEventListener('click',(event)=>{if(event.target.closest('.nav-link,.brand')) setOpen(false)});
  window.addEventListener('hashchange',()=>setOpen(false));
  window.addEventListener('resize',()=>{if(window.innerWidth>820) setOpen(false)});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape') setOpen(false)});
})();
