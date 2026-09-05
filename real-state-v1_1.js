(() => {
  const MIGRATION_KEY = 'weekly-1on1-lucas-real-state-v1.1-applied';
  if (localStorage.getItem(MIGRATION_KEY)) return;
  state = clone(seed);
  save();
  localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
})();
