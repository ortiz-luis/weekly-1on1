(() => {
  const previousBind = bind;
  bind = function () {
    previousBind();
    const closeButton = document.querySelector('[data-close-meeting]');
    if (!closeButton) return;

    closeButton.onclick = () => {
      const current = meeting();
      const area = document.querySelector('#meeting-summary');
      if (!current || current.status === 'completed') return;

      const outcomes = {};
      document.querySelectorAll('[data-outcome-deliverable]').forEach(select => {
        outcomes[select.dataset.outcomeDeliverable] = select.value;
      });

      const result = WeeklyCore.closeMeeting(
        state,
        current.id,
        area ? area.value : current.summary,
        outcomes
      );
      if (!result.ok) return;
      save();
      location.hash = `#history/${current.id}`;
      render();
    };
  };

  render();
})();
