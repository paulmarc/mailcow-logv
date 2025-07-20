// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  const rangeSelect       = document.getElementById('rangeSelect');
  const hostsList         = document.getElementById('hostsList');
  const sendersList       = document.getElementById('sendersList');
  const recipientsList    = document.getElementById('recipientsList');
  const spinner           = document.getElementById('spinnerOverlay');
  const canvas            = document.getElementById('hourlyChart');
  const exportHostsBtn    = document.getElementById('exportHostsBtn');
  const exportContactsBtn = document.getElementById('exportContactsBtn');
  let currentData         = null;

  // Sanity‐check button presence
  if (!exportHostsBtn)   console.warn('exportHostsBtn not found');
  if (!exportContactsBtn)console.warn('exportContactsBtn not found');

  if (!canvas) {
    console.error('Canvas element #hourlyChart not found');
    return;
  }
  const ctx = canvas.getContext('2d');
  let hourlyChart = null;

  function initChart(labels = [], rec = [], sent = []) {
    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Received', data: rec, fill: false, tension: 0.1 },
        { label: 'Sent',     data: sent, fill: false, tension: 0.1 }
      ]},
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
      const span = document.createElement('span');
      span.textContent = item[key];
      const badge = document.createElement('span');
      badge.className = 'badge bg-primary rounded-pill';
      badge.textContent = item.count;
      li.append(span, badge);
      container.appendChild(li);
    });
  }

  function downloadCSV(rows, filename) {
    const csvContent = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportHostsCSV(e) {
    e.preventDefault();
    if (!currentData || !currentData.hosts) return alert('No host data to export');
    const rows = [['Host/Domain','Count']];
    currentData.hosts.forEach(h => rows.push([h.host, h.count]));
    downloadCSV(rows, 'hosts_domains.csv');
  }

  function exportContactsCSV(e) {
    e.preventDefault();
    if (!currentData) return alert('No sender/recipient data to export');
    const rows = [['Type','Address','Count']];
    currentData.senders.forEach(s => rows.push(['Sender', s.sender, s.count]));
    currentData.recipients.forEach(r => rows.push(['Recipient', r.recipient, r.count]));
    downloadCSV(rows, 'senders_recipients.csv');
  }

  async function loadReport(range) {
    spinner.classList.add('active');
    try {
      const res = await fetch(`/api/report/${range}`);
      if (!res.ok) {
        if (res.status === 401) return window.location = '/login';
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      currentData = data;

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
      alert('Failed to load data; check console.');
    } finally {
      spinner.classList.remove('active');
    }
  }

  // Attach handlers if buttons exist
  if (exportHostsBtn)    exportHostsBtn.addEventListener('click', exportHostsCSV);
  if (exportContactsBtn) exportContactsBtn.addEventListener('click', exportContactsCSV);

  // Initial load & change handler
  loadReport(rangeSelect.value);
  rangeSelect.addEventListener('change', () => loadReport(rangeSelect.value));
});
