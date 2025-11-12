// Transactions page script
window.addEventListener('DOMContentLoaded', () => {
  if (window.app && window.app.ui) {
    window.app.ui.wireModalCloseButtons();
    document.addEventListener('dataLoaded', () => {
      window.app.ui.updateCategorySelects();
      window.app.ui.updateMethodSelects();
      window.app.ui.updateBankSelects();
      window.app.ui.renderTransactions();
    });
  }
});
