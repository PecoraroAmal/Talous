// Charts page script
let chartsInstance = null;

class Charts {
  constructor() {
    this.categoryChart = null;
    this.paymentChart = null;
    this.balanceChart = null;
    this.dataLoaded = false;
  }

  init() {
    console.log('Charts.init() called');
    const catCtx = document.getElementById('category-chart')?.getContext('2d');
    const payCtx = document.getElementById('payment-chart')?.getContext('2d');
    const balCtx = document.getElementById('balance-chart')?.getContext('2d');

    console.log('Canvas contexts:', { catCtx: !!catCtx, payCtx: !!payCtx, balCtx: !!balCtx });

    if (catCtx) {
      this.categoryChart = new Chart(catCtx, {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${percentage}%`;
                }
              }
            }
          }
        }
      });
    }
    if (payCtx) {
      this.paymentChart = new Chart(payCtx, {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${percentage}%`;
                }
              }
            }
          }
        }
      });
    }
    if (balCtx) {
      this.balanceChart = new Chart(balCtx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { type: 'time', time: { unit: 'month' } },
            y: { beginAtZero: false, ticks: { callback: value => '€' + value } }
          }
        }
      });
    }

    // Se i dati sono già disponibili, aggiorna subito
    if (window.app && window.app.data) {
      console.log('Data already available, updating charts');
      this.updateCharts(window.app.data);
    } else {
      console.log('Data not available yet, will wait for dataLoaded event');
    }
  }

  updateCharts(data) {
    console.log('updateCharts called with data:', data ? 'data present' : 'no data');
    if (!data || !data.transactions) {
      console.log('No transactions data available');
      return;
    }
    console.log('Transactions count:', data.transactions.length);

    this.updateCategory(data);
    this.updatePayment(data);
    this.updateBalance(data);
  }

  generateColors(n) {
    const out = [];
    const step = 255 / (n + 1);
    for (let i = 0; i < n; i++) {
      const g = Math.floor(step * (i + 1));
      out.push(`rgb(${g}, ${g}, ${g})`);
    }
    return out;
  }

  updateCategory(data) {
    if (!this.categoryChart) return;
    const expenses = data.transactions.filter(t => t.type === 'expense');
    console.log('Category chart - expenses count:', expenses.length);
    const totals = {};
    expenses.forEach(t => { totals[t.category] = (totals[t.category] || 0) + (t.amount || 0); });
    const labels = Object.keys(totals);
    const values = Object.values(totals);
    console.log('Category chart - labels:', labels, 'values:', values);
    this.categoryChart.data.labels = labels;
    this.categoryChart.data.datasets[0].data = values;
    const coloursMap = data.categoryColours || {};
    this.categoryChart.data.datasets[0].backgroundColor = labels.map(l => coloursMap[l] || '#888');
    this.categoryChart.update();
  }

  updatePayment(data) {
    if (!this.paymentChart) return;
    const expenses = data.transactions.filter(t => t.type === 'expense');
    console.log('Payment chart - expenses count:', expenses.length);
    const totals = {};
    expenses.forEach(t => { totals[t.paymentMethod || ''] = (totals[t.paymentMethod || ''] || 0) + (t.amount || 0); });
    const labels = Object.keys(totals);
    const values = Object.values(totals);
    console.log('Payment chart - labels:', labels, 'values:', values);
    this.paymentChart.data.labels = labels;
    this.paymentChart.data.datasets[0].data = values;
    const coloursMap = data.methodColours || {};
    this.paymentChart.data.datasets[0].backgroundColor = labels.map(l => coloursMap[l] || '#aaa');
    this.paymentChart.update();
  }

  updateBalance(data) {
    if (!this.balanceChart) return;
    const sorted = [...data.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log('Balance chart - sorted transactions count:', sorted.length);
    let bal = 0;
    const pts = sorted.map(t => {
      if (t.type === 'income') bal += (t.amount || 0);
      else if (t.type === 'expense') bal -= (t.amount || 0); // transfers ignored
      return { x: t.date, y: bal };
    });
    console.log('Balance chart - points count:', pts.length);
    this.balanceChart.data.labels = pts.map(p => p.x);
    this.balanceChart.data.datasets = [{
      label: 'Balance', data: pts, borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.08)', fill: true, tension: 0.25
    }];
    this.balanceChart.update();
  }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing charts in 100ms');
  // Aspetta che tutti gli script siano caricati
  setTimeout(() => {
    if (!chartsInstance) {
      chartsInstance = new Charts();
      chartsInstance.init();
    }
  }, 100);
});

// Aggiorna quando i dati sono caricati
document.addEventListener('dataLoaded', () => {
  console.log('dataLoaded event received');
  if (chartsInstance && window.app && window.app.data) {
    console.log('Updating charts with loaded data');
    chartsInstance.updateCharts(window.app.data);
  } else {
    console.log('Charts instance or data not ready:', {
      chartsInstance: !!chartsInstance,
      windowApp: !!window.app,
      appData: !!(window.app && window.app.data)
    });
  }
});

// Retry mechanism in case dataLoaded event was missed
setTimeout(() => {
  if (chartsInstance && window.app && window.app.data && !chartsInstance.dataLoaded) {
    console.log('Retrying charts update after 1 second');
    chartsInstance.updateCharts(window.app.data);
  }
}, 1000);
