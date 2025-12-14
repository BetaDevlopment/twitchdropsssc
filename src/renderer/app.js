const { ipcRenderer } = require('electron');

// State
let state = {
  isRunning: false,
  campaigns: [],
  dropHistory: [],
  config: null,
  selectedCampaigns: new Set()
};

// DOM Elements
const pages = {
  dashboard: document.getElementById('dashboard-page'),
  campaigns: document.getElementById('campaigns-page'),
  history: document.getElementById('history-page'),
  settings: document.getElementById('settings-page')
};

const navItems = document.querySelectorAll('.nav-item');
const startBtn = document.getElementById('start-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// Window Controls
document.getElementById('minimize-btn').addEventListener('click', () => {
  ipcRenderer.send('window:minimize');
});

document.getElementById('maximize-btn').addEventListener('click', () => {
  ipcRenderer.send('window:maximize');
});

document.getElementById('close-btn').addEventListener('click', () => {
  ipcRenderer.send('window:close');
});

// Navigation
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetPage = item.getAttribute('data-page');
    switchPage(targetPage);
  });
});

function switchPage(pageName) {
  // Update nav items
  navItems.forEach(item => {
    if (item.getAttribute('data-page') === pageName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update pages
  Object.keys(pages).forEach(page => {
    if (page === pageName) {
      pages[page].classList.add('active');
    } else {
      pages[page].classList.remove('active');
    }
  });

  // Load page-specific data
  if (pageName === 'campaigns') {
    loadCampaigns();
  } else if (pageName === 'history') {
    loadHistory();
  }
}

// Initialize App
async function initializeApp() {
  console.log('Initializing app...');

  const result = await ipcRenderer.invoke('app:initialize');
  if (result.success) {
    console.log('App initialized successfully');
    await loadConfig();
    await loadStats();
  } else {
    console.error('Failed to initialize app:', result.error);
  }
}

async function loadConfig() {
  const result = await ipcRenderer.invoke('app:getConfig');
  if (result.success) {
    state.config = result.config;
    updateSettingsUI();
  }
}

async function loadStats() {
  // Load total drops
  const dropsResult = await ipcRenderer.invoke('app:getTotalDrops');
  if (dropsResult.success) {
    document.getElementById('total-drops').textContent = dropsResult.total;
  }

  // Load active campaigns
  const campaignsResult = await ipcRenderer.invoke('app:getActiveCampaigns');
  if (campaignsResult.success) {
    state.campaigns = campaignsResult.campaigns;
    document.getElementById('active-campaigns').textContent = campaignsResult.campaigns.length;
  }

  // Load recent drops
  await loadRecentDrops();
}

async function loadRecentDrops() {
  const result = await ipcRenderer.invoke('app:getDropHistory', 5);
  if (result.success) {
    state.dropHistory = result.history;
    renderRecentDrops();
  }
}

function renderRecentDrops() {
  const container = document.getElementById('recent-drops');

  if (state.dropHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
        <p>No drops claimed yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.dropHistory.map(drop => `
    <div class="drop-item">
      <img src="${drop.dropImage || 'assets/placeholder.png'}" alt="${drop.dropName}" class="drop-image">
      <div class="drop-info">
        <div class="drop-name">${drop.dropName}</div>
        <div class="drop-meta">${drop.campaignName} • ${drop.streamerName}</div>
      </div>
      <div class="drop-badge">Claimed</div>
    </div>
  `).join('');
}

// Start/Stop Farming
startBtn.addEventListener('click', async () => {
  if (state.isRunning) {
    await stopFarming();
  } else {
    await startFarming();
  }
});

async function startFarming() {
  const result = await ipcRenderer.invoke('app:startWatching');
  if (result.success) {
    state.isRunning = true;
    updateRunningState();
  } else {
    alert('Failed to start farming: ' + result.error);
  }
}

async function stopFarming() {
  const result = await ipcRenderer.invoke('app:stopWatching');
  if (result.success) {
    state.isRunning = false;
    updateRunningState();
  }
}

function updateRunningState() {
  if (state.isRunning) {
    startBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
      Stop Farming
    `;
    startBtn.classList.remove('btn-primary');
    startBtn.classList.add('btn-danger');
    statusDot.classList.add('active');
    statusText.textContent = 'Farming active';
  } else {
    startBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      Start Farming
    `;
    startBtn.classList.add('btn-primary');
    startBtn.classList.remove('btn-danger');
    statusDot.classList.remove('active');
    statusText.textContent = 'Not running';
  }
}

// Campaigns
async function loadCampaigns() {
  const result = await ipcRenderer.invoke('app:loadCampaigns');
  if (result.success) {
    state.campaigns = result.campaigns;
    renderCampaigns();
  }
}

function renderCampaigns() {
  const container = document.getElementById('campaigns-grid');

  if (state.campaigns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No active campaigns available</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.campaigns.map(campaign => {
    const isSelected = state.selectedCampaigns.has(campaign.id);
    const statusClass = campaign.active ? 'active' : 'ended';
    const statusText = campaign.active ? 'Active' : 'Ended';

    return `
      <div class="campaign-card ${isSelected ? 'selected' : ''}" data-campaign-id="${campaign.id}">
        <img src="${campaign.gameImage}" alt="${campaign.game}" class="campaign-image" onerror="this.src='assets/placeholder.png'">
        <div class="campaign-content">
          <div class="campaign-title">${campaign.name}</div>
          <div class="campaign-game">${campaign.game}</div>
          <div class="campaign-footer">
            <div class="campaign-status ${statusClass}">
              <span>●</span> ${statusText}
            </div>
            <span style="font-size: 12px; color: var(--text-secondary);">${campaign.drops.length} drops</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  document.querySelectorAll('.campaign-card').forEach(card => {
    card.addEventListener('click', () => {
      const campaignId = card.getAttribute('data-campaign-id');
      toggleCampaignSelection(campaignId);
    });
  });
}

async function toggleCampaignSelection(campaignId) {
  if (state.selectedCampaigns.has(campaignId)) {
    state.selectedCampaigns.delete(campaignId);
    await ipcRenderer.invoke('app:deselectCampaign', campaignId);
  } else {
    state.selectedCampaigns.add(campaignId);
    await ipcRenderer.invoke('app:selectCampaign', campaignId);
  }
  renderCampaigns();
}

document.getElementById('refresh-campaigns-btn').addEventListener('click', loadCampaigns);

// History
async function loadHistory() {
  const result = await ipcRenderer.invoke('app:getDropHistory', 100);
  if (result.success) {
    state.dropHistory = result.history;
    renderHistory();
  }
}

function renderHistory() {
  const container = document.getElementById('history-list');

  if (state.dropHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No drop history available</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.dropHistory.map(drop => {
    const date = new Date(drop.claimedAt);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    return `
      <div class="drop-item">
        <img src="${drop.dropImage || 'assets/placeholder.png'}" alt="${drop.dropName}" class="drop-image">
        <div class="drop-info">
          <div class="drop-name">${drop.dropName}</div>
          <div class="drop-meta">${drop.campaignName} • ${drop.gameName} • ${drop.streamerName}</div>
          <div class="drop-meta" style="margin-top: 4px; font-size: 12px;">${dateStr}</div>
        </div>
        <div class="drop-badge">Claimed</div>
      </div>
    `;
  }).join('');
}

// Search history
document.getElementById('search-history').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = state.dropHistory.filter(drop =>
    drop.dropName.toLowerCase().includes(query) ||
    drop.campaignName.toLowerCase().includes(query) ||
    drop.gameName.toLowerCase().includes(query)
  );

  renderFilteredHistory(filtered);
});

function renderFilteredHistory(drops) {
  const container = document.getElementById('history-list');

  if (drops.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No matching drops found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = drops.map(drop => {
    const date = new Date(drop.claimedAt);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    return `
      <div class="drop-item">
        <img src="${drop.dropImage || 'assets/placeholder.png'}" alt="${drop.dropName}" class="drop-image">
        <div class="drop-info">
          <div class="drop-name">${drop.dropName}</div>
          <div class="drop-meta">${drop.campaignName} • ${drop.gameName} • ${drop.streamerName}</div>
          <div class="drop-meta" style="margin-top: 4px; font-size: 12px;">${dateStr}</div>
        </div>
        <div class="drop-badge">Claimed</div>
      </div>
    `;
  }).join('');
}

// Settings
function updateSettingsUI() {
  if (!state.config) return;

  document.getElementById('username-input').value = state.config.twitchUsername || '';
  document.getElementById('auto-claim-toggle').checked = state.config.autoClaimDrops;
  document.getElementById('follow-raids-toggle').checked = state.config.followRaids;
  document.getElementById('close-raid-tab-toggle').checked = state.config.closeRaidTabAfterDrop;

  state.config.selectedCampaigns.forEach(id => state.selectedCampaigns.add(id));
}

document.getElementById('login-btn').addEventListener('click', async () => {
  const username = document.getElementById('username-input').value;
  const password = document.getElementById('password-input').value;

  if (!username || !password) {
    alert('Please enter username and password');
    return;
  }

  const result = await ipcRenderer.invoke('app:login', username, password);
  if (result.success) {
    alert('Login successful!');
    document.getElementById('password-input').value = '';
  } else {
    alert('Login failed: ' + result.error);
  }
});

document.getElementById('sync-drops-btn').addEventListener('click', async () => {
  const confirmed = confirm(
    'This will import all drops you have ever claimed from your Twitch account.\n\n' +
    'This may take a minute depending on how many drops you have.\n\n' +
    'Continue?'
  );

  if (!confirmed) return;

  const syncBtn = document.getElementById('sync-drops-btn');
  syncBtn.disabled = true;
  syncBtn.textContent = 'Syncing...';

  const result = await ipcRenderer.invoke('app:syncAllTimeDrops');

  syncBtn.disabled = false;
  syncBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    </svg>
    Sync All-Time Drops
  `;

  if (result.success) {
    alert(`Successfully imported ${result.count} drops from your Twitch account!`);
    loadStats();
    loadRecentDrops();
  } else {
    alert('Failed to sync drops: ' + result.error);
  }
});

// Settings toggles
document.getElementById('auto-claim-toggle').addEventListener('change', async (e) => {
  await ipcRenderer.invoke('app:updateConfig', { autoClaimDrops: e.target.checked });
});

document.getElementById('follow-raids-toggle').addEventListener('change', async (e) => {
  await ipcRenderer.invoke('app:updateConfig', { followRaids: e.target.checked });
});

document.getElementById('close-raid-tab-toggle').addEventListener('change', async (e) => {
  await ipcRenderer.invoke('app:updateConfig', { closeRaidTabAfterDrop: e.target.checked });
});

// IPC Event Listeners
ipcRenderer.on('drop:claimed', (event, drop) => {
  console.log('Drop claimed:', drop);
  loadStats();
  loadRecentDrops();

  // Show notification
  showNotification('Drop Claimed!', drop.dropName);
});

ipcRenderer.on('raid:detected', (event, raid) => {
  console.log('Raid detected:', raid);
  showNotification('Raid Detected!', `${raid.fromStreamer} is raiding ${raid.toStreamer}`);
});

ipcRenderer.on('stream:started', (event, data) => {
  console.log('Stream started:', data);
  updateCurrentActivity(data);
});

ipcRenderer.on('campaigns:loaded', (event, campaigns) => {
  console.log('Campaigns loaded:', campaigns);
  state.campaigns = campaigns;
  document.getElementById('active-campaigns').textContent = campaigns.length;
});

ipcRenderer.on('2fa:required', () => {
  console.log('2FA required');
  alert('Two-Factor Authentication Required!\n\nPlease enter your 2FA code in the Twitch login window that opened.');
  showNotification('2FA Required', 'Please enter your 2FA code in the browser window');
});

ipcRenderer.on('allTimeDrops:synced', (event, count) => {
  console.log(`Synced ${count} all-time drops`);
  alert(`Successfully imported ${count} drops from your Twitch account history!`);
  loadStats();
  loadRecentDrops();
  showNotification('Sync Complete', `Imported ${count} historical drops`);
});

// Update Current Activity
function updateCurrentActivity(data) {
  const container = document.getElementById('current-activity');

  container.innerHTML = `
    <div class="activity-content">
      <img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${data.streamer.toLowerCase()}-320x180.jpg"
           alt="${data.streamer}"
           class="stream-thumbnail"
           onerror="this.src='assets/placeholder.png'">
      <div class="activity-info">
        <h3>Watching ${data.streamer}</h3>
        <div class="activity-meta">
          <span>${data.isPrimary ? 'Main Stream' : 'Raid Stream'}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
      </div>
    </div>
  `;
}

// Notifications
function showNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  }
}

// Request notification permission
if ('Notification' in window) {
  Notification.requestPermission();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});
