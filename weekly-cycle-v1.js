(() => {
  const originalNextPage = nextPage;
  nextPage = function () {
    const m = meeting();
    const base = originalNextPage();
    if (!m || m.status === 'completed') return base;
    const extra = `<div class="section-head"><h2>Después del 1:1</h2></div>
      <div class="meeting-close-card">
        <label for="meeting-summary"><b>Qué dijo Lucas / qué quedó acordado</b><span>Guarda solamente decisiones, cambios de prioridad, owners y próximos pasos.</span></label>
        <textarea id="meeting-summary" placeholder="Ej.: dirección confirmada; owner del siguiente paso acordado; punto pendiente de evidencia.">${esc(m.summary || '')}</textarea>
        <button class="wide-action secondary-action" data-save-meeting-notes>Guardar notas</button>
        <button class="wide-action" data-close-meeting>Cerrar este 1:1 y preparar la semana siguiente</button>
      </div>`;
    return base.replace('</section>', extra + '</section>');
  };

  const originalBind = bind;
  bind = function () {
    originalBind();
    const saveButton = document.querySelector('[data-save-meeting-notes]');
    if (saveButton) saveButton.onclick = () => {
      const m = meeting();
      const area = document.querySelector('#meeting-summary');
      if (!m || !area) return;
      m.summary = area.value.trim();
      save();
      saveButton.textContent = 'Notas guardadas';
      setTimeout(() => { if (document.body.contains(saveButton)) saveButton.textContent = 'Guardar notas'; }, 1000);
    };
  };

  render();
})();
