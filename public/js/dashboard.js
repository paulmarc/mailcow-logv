document.addEventListener('DOMContentLoaded', () => {
  const rangeSelect = document.getElementById('rangeSelect');
  const hostsList = document.getElementById('hostsList');
  const sendersList = document.getElementById('sendersList');
  const recipientsList = document.getElementById('recipientsList');
  const totalReceived = document.getElementById('totalReceived');
  const totalSent = document.getElementById('totalSent');
  const ctx = document.getElementById('hourlyChart').getContext('2d');
  let hourlyChart;

  // Initialize Chart.js
  function initChart(labels = [], dataReceived = [], dataSent = []) {
    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Received',
            data: dataReceived,
            fill: false,
            tension: 0.1
          },
          {
            label: 'Sent',
            data: dataSent,
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { display: true, title: { display: true, text: 'Hour Range' } },
          y: { display: true, title: { display: true, text: 'Messages' }, beginAtZero: true }
        }
      }
    });
  }

  // Render lists
  function renderList(listElem, items, key) {
    listElem.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.textContent = item[key];
      const badge = document.createElement('span');
      badge.className = 'badge bg-primary rounded-pill';
      badge.textContent = item.count;
      li.appendChild(badge);
      listElem.appendChild(li);
    });
  }

  // Fetch and render report
  async function loadReport(range) {
    try {
      const res = await fetch(`/api/report/${range}`);
      if (res.status === 401) {
        // not logged in → kick back to the login page
        return window.location.href = '/login';
      }
      const data = await res.json();
      console.log('REPORT DATA:', data);

      // Chart data
      const labels = data.hourly.map(h => h.period);
      const rec = data.hourly.map(h => h.received);
      const sent = data.hourly.map(h => h.sent);
      initChart(labels, rec, sent);

      // Lists and totals
      renderList(hostsList, data.hosts, 'host');
      renderList(sendersList, data.senders, 'sender');
      renderList(recipientsList, data.recipients, 'recipient');
      totalReceived.textContent = data.totals.received || 0;
      totalSent.textContent = data.totals.sent || 0;
    } catch (err) {
      console.error('Error loading report:', err);
    }
  }

  // Initial load
  loadReport(rangeSelect.value);

  // Change handler
  rangeSelect.addEventListener('change', () => loadReport(rangeSelect.value));
});