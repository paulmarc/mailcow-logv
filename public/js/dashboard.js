// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  const rangeSelect     = document.getElementById('rangeSelect');
  const hostsList       = document.getElementById('hostsList');
  const sendersList     = document.getElementById('sendersList');
  const recipientsList  = document.getElementById('recipientsList');
  const totalReceived   = document.getElementById('totalReceived');
  const totalSent       = document.getElementById('totalSent');
  const spinner         = document.getElementById('spinnerOverlay');
  const canvas          = document.getElementById('hourlyChart');

  if (!canvas) {
    console.error('Canvas element #hourlyChart not found');
    return;
  }
  const ctx = canvas.getContext('2d');
  let hourlyChart;

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
          x: {
            display: true,
            title: { display: true, text: 'Time' }
          },
          y: {
            display: true,
            title: { display: true, text: 'Messages' },
            beginAtZero: true
          }
        }
      }
    });
  }

  function renderList(listElem, items, key) {
    listElem.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      const text = document.createElement('span');
      text.textContent = item[key];
      const badge = document.createElement('span');
      badge.className = 'badge bg-primary rounded-pill';
      badge.textContent = item.count;
      li.append(text, badge);
      listElem.appendChild(li);
    });
  }

  async function loadReport(range) {
    spinner.style.display = 'flex';
    try {
      const res = await fetch(`/api/report/${range}`);
      if (!res.ok) {
        console.error('API error', res.status);
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        alert(`Failed to load data: ${res.status}`);
        return;
      }

      const data = await res.json();
      console.log('REPORT DATA:', data);

      const labels = data.hourly.map(h => h.period);
      const recData = data.hourly.map(h => h.received);
      const sentData = data.hourly.map(h => h.sent);
      initChart(labels, recData, sentData);

      renderList(hostsList, data.hosts, 'host');
      renderList(sendersList, data.senders, 'sender');
      renderList(recipientsList, data.recipients, 'recipient');

      totalReceived.textContent = data.totals.received != null ? data.totals.received : 0;
      totalSent.textContent     = data.totals.sent     != null ? data.totals.sent     : 0;
    } catch (err) {
      console.error('Error loading report:', err);
      alert('Error loading report; see console.');
    } finally {
      spinner.style.display = 'none';
    }
  }

  loadReport(rangeSelect.value);
  rangeSelect.addEventListener('change', () => loadReport(rangeSelect.value));
});
