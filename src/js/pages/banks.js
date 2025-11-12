// Banks page script
window.addEventListener('DOMContentLoaded', () => {
  if (window.app && window.app.ui) {
    window.app.ui.wireModalCloseButtons();
    document.addEventListener('dataLoaded', () => {
      window.app.ui.renderBanks();
    });
  }
});
