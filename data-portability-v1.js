(() => {
  const BACKUP_VERSION = 1;

  function safeName() {
    const stamp = new Date().toISOString().slice(0, 10);
    return `weekly-1on1-lucas-backup-${stamp}.json`;
  }

  function exportBackup() {
    const payload = {
      app: 'weekly-1on1-lucas',
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function validState(candidate) {
    return candidate && typeof candidate === 'object' &&
      Array.isArray(candidate.meetings) &&
      Array.isArray(candidate.topics) &&
      Array.isArray(candidate.deliverables) &&
      Array.isArray(candidate.decisions);
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const candidate = parsed?.state || parsed;
        if (!validState(candidate)) throw new Error('Formato de backup no reconocido');
        state = candidate;
        save();
        location.hash = '#home';
        render();
        alert('Backup importado correctamente.');
      } catch (error) {
        alert(`No se pudo importar el backup: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  function installControls() {
    const reset = document.querySelector('#reset-data');
    if (!reset || document.querySelector('#data-portability')) return;
    const wrap = document.createElement('div');
    wrap.id = 'data-portability';
    wrap.className = 'data-portability';
    wrap.innerHTML = `
      <button type="button" data-export-backup>Exportar backup</button>
      <button type="button" data-import-backup>Importar backup</button>
      <input type="file" accept="application/json,.json" data-import-file hidden>
    `;
    reset.parentNode.insertBefore(wrap, reset);
    wrap.querySelector('[data-export-backup]').onclick = exportBackup;
    const input = wrap.querySelector('[data-import-file]');
    wrap.querySelector('[data-import-backup]').onclick = () => input.click();
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) importBackup(file);
      input.value = '';
    };
  }

  const previousRender = render;
  render = function () {
    previousRender();
    installControls();
  };

  render();
})();
