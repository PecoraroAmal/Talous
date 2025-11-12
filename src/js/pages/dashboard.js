// Dashboard page script
// Bootstraps the app and ensures dashboard render is fresh.
window.addEventListener('DOMContentLoaded', () => {
  // App is bootstrapped by app.js; ensure dashboard is rendered
  if (window.app && window.app.ui) {
    window.app.ui.wireModalCloseButtons();
    window.app.ui.renderDashboard();
  }
});
