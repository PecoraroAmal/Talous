// charts.js - Chart.js integrations

export class Charts {
  constructor() {
    this.categoryChart = null;
    this.paymentChart = null;
    this.balanceChart = null;
    this.init();
  }

  init() {
    const catCtx = document.getElementById('category-chart')?.getContext('2d');
    const payCtx = document.getElementById('payment-chart')?.getContext('2d');
    const balCtx = document.getElementById('balance-chart')?.getContext('2d');

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
          scales: { x: { type: 'time', time: { unit: 'month' } }, y: { beginAtZero: false, ticks: { callback: value => '€' + value } } }
        }
      });
    }
  }

  updateCharts(data) {
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
    const totals = {};
    expenses.forEach(t => { totals[t.category] = (totals[t.category] || 0) + (t.amount || 0); });
    const labels = Object.keys(totals);
    const values = Object.values(totals);
    this.categoryChart.data.labels = labels;
    this.categoryChart.data.datasets[0].data = values;
    const coloursMap = data.categoryColours || {};
    this.categoryChart.data.datasets[0].backgroundColor = labels.map(l => coloursMap[l] || '#888');
    this.categoryChart.update();
  }

  updatePayment(data) {
    if (!this.paymentChart) return;
    const expenses = data.transactions.filter(t => t.type === 'expense');
    const totals = {};
    expenses.forEach(t => { totals[t.paymentMethod || ''] = (totals[t.paymentMethod || ''] || 0) + (t.amount || 0); });
    const labels = Object.keys(totals);
    const values = Object.values(totals);
    this.paymentChart.data.labels = labels;
    this.paymentChart.data.datasets[0].data = values;
    const coloursMap = data.methodColours || {};
    this.paymentChart.data.datasets[0].backgroundColor = labels.map(l => coloursMap[l] || '#aaa');
    this.paymentChart.update();
  }

  updateBalance(data) {
    if (!this.balanceChart) return;
    const sorted = [...data.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let bal = 0;
    const pts = sorted.map(t => {
      if (t.type === 'income') bal += (t.amount || 0);
      else if (t.type === 'expense') bal -= (t.amount || 0); // transfers ignored
      return { x: t.date, y: bal };
    });
    this.balanceChart.data.labels = pts.map(p => p.x);
    this.balanceChart.data.datasets = [{
      label: 'Balance', data: pts, borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.08)', fill: true, tension: 0.25
    }];
    this.balanceChart.update();
  }
}
