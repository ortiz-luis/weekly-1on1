(()=>{
  const isBuilder=()=>location.hash.replace(/^#/,'').split('/')[0]==='builder';
  window.addEventListener('hashchange',()=>{
    if(!isBuilder()) return;
    queueMicrotask(()=>render());
  });
  if(isBuilder()) queueMicrotask(()=>render());
})();
