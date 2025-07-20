// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  const rangeSelect    = document.getElementById('rangeSelect');
  const hostsList      = document.getElementById('hostsList');
  const sendersList    = document.getElementById('sendersList');
  const recipientsList = document.getElementById('recipientsList');
  const spinner        = document.getElementById('spinnerOverlay');
  const canvas         = document.getElementById('hourlyChart');

  if (!canvas) {
    console.error('Canvas element #hourlyChart not found');
    return;
  }
  const ctx = canvas.getContext('2d');
  let hourlyChart = null;

  function initChart(labels = [], dataReceived = [], dataSent = []) {
    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Received', data: dataReceived, fill: false, tension: 0.1 },
          { label: 'Sent',     data: dataSent,     fill: false, tension: 0.1 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Time' } },
          y: { title: { display: true, text: 'Messages' }, beginAtZero: true }
        }
      }
    });
  }

  function renderList(container, items, key) {
    container.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.textContent = item[key];
      const badge = document.createElement('span');
      badge.className = 'badge bg-primary rounded-pill';
      badge.textContent = item.count;
      li.appendChild(badge);
      container.appendChild(li);
    });
  }

  async function loadReport(range) {
    spinner.classList.add('active');
    try {
      const res = await fetch(`/api/report/${range}`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();

      // Chart
      const labels   = data.hourly.map(h => h.period);
      const recData  = data.hourly.map(h => h.received);
      const sentData = data.hourly.map(h => h.sent);
      initChart(labels, recData, sentData);

      // Lists
      renderList(hostsList,      data.hosts,      'host');
      renderList(sendersList,    data.senders,    'sender');
      renderList(recipientsList, data.recipients, 'recipient');

    } catch (err) {
      console.error('Error loading report:', err);
      alert('Error loading data; check console.');
    } finally {
      spinner.classList.remove('active');
    }
  }

  loadReport(rangeSelect.value);
  rangeSelect.addEventListener('change', () => loadReport(rangeSelect.value));
});
