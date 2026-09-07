(() => {
  const MIGRATION_KEY = 'weekly-1on1-lucas-real-state-v1.1-applied';
  if (localStorage.getItem(MIGRATION_KEY)) return;

  // Historical V1.1 marker only. Never replace a user's existing browser state
  // with the repository seed during a normal upgrade. app.js already loads the
  // seed for a genuinely empty browser. Persist the loaded state only when no
  // usable stored state exists.
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    save();
  } else {
    try {
      JSON.parse(existing);
    } catch {
      save();
    }
  }

  localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
})();
