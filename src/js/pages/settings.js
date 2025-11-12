// Settings page script
window.addEventListener('DOMContentLoaded', () => {
  if (window.app && window.app.ui) {
    window.app.ui.wireModalCloseButtons();
    document.addEventListener('dataLoaded', () => {
      window.app.ui.renderSettings();
    });
  }

  // Handle footer buttons
  document.getElementById('btn-privacy').addEventListener('click', () => {
    document.getElementById('privacy-modal').showModal();
  });
  document.getElementById('btn-how').addEventListener('click', () => {
    document.getElementById('how-modal').showModal();
  });
});
