import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DropManager } from '../automation/DropManager';
import { ConfigManager } from './ConfigManager';
import { TwitchCampaign, DropHistoryEntry } from '../types';

let mainWindow: BrowserWindow | null = null;
let dropManager: DropManager | null = null;
let configManager: ConfigManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
      // No preload needed with nodeIntegration
    },
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hidden',
    frame: false
  });

  // Load the UI
  // Always load from src/renderer for development
  const rendererPath = path.join(app.getAppPath(), 'src', 'renderer', 'index.html');
  mainWindow.loadFile(rendererPath);

  // Open dev tools for debugging
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
  // Initialize
  ipcMain.handle('app:initialize', async () => {
    try {
      const config = configManager.getConfig();
      dropManager = new DropManager(config);
      await dropManager.initialize();

      // Setup drop manager event handlers
      dropManager.on('dropClaimed', (drop) => {
        mainWindow?.webContents.send('drop:claimed', drop);
      });

      dropManager.on('raidDetected', (raid) => {
        mainWindow?.webContents.send('raid:detected', raid);
      });

      dropManager.on('streamStarted', (data) => {
        mainWindow?.webContents.send('stream:started', data);
      });

      dropManager.on('campaignsLoaded', (campaigns) => {
        mainWindow?.webContents.send('campaigns:loaded', campaigns);
      });

      dropManager.on('2faRequired', () => {
        mainWindow?.webContents.send('2fa:required');
      });

      dropManager.on('allTimeDropsSynced', (count) => {
        mainWindow?.webContents.send('allTimeDrops:synced', count);
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Login
  ipcMain.handle('app:login', async (event, username: string, password: string) => {
    if (!dropManager) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      configManager.setUsername(username);
      configManager.setPassword(password);

      const success = await dropManager.login(username, password);
      return { success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Load campaigns
  ipcMain.handle('app:loadCampaigns', async () => {
    if (!dropManager) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const campaigns = await dropManager.loadCampaigns();
      return { success: true, campaigns };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Start watching
  ipcMain.handle('app:startWatching', async (event, campaignId?: string) => {
    if (!dropManager) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      await dropManager.startWatching(campaignId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Stop watching
  ipcMain.handle('app:stopWatching', async () => {
    if (!dropManager) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      await dropManager.stopWatching();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get drop history
  ipcMain.handle('app:getDropHistory', async (event, limit?: number) => {
    if (!dropManager) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const history = dropManager.getDropHistory(limit);
      return { success: true, history };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get total drops
  ipcMain.handle('app:getTotalDrops', async () => {
    if (!dropManager) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const total = dropManager.getTotalDropsClaimed();
      return { success: true, total };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get active campaigns
  ipcMain.handle('app:getActiveCampaigns', async () => {
    if (!dropManager) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const campaigns = dropManager.getActiveCampaigns();
      return { success: true, campaigns };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get config
  ipcMain.handle('app:getConfig', async () => {
    try {
      const config = configManager.getConfig();
      return { success: true, config };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Update config
  ipcMain.handle('app:updateConfig', async (event, updates) => {
    try {
      const newConfig = configManager.updateConfig(updates);
      if (dropManager) {
        dropManager.updateConfig(newConfig);
      }
      return { success: true, config: newConfig };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Select campaign
  ipcMain.handle('app:selectCampaign', async (event, campaignId: string) => {
    try {
      configManager.addSelectedCampaign(campaignId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Deselect campaign
  ipcMain.handle('app:deselectCampaign', async (event, campaignId: string) => {
    try {
      configManager.removeSelectedCampaign(campaignId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Sync all-time drops from Twitch
  ipcMain.handle('app:syncAllTimeDrops', async () => {
    if (!dropManager) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const count = await dropManager.syncAllTimeDrops();
      return { success: true, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Window controls
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });
}

app.whenReady().then(() => {
  configManager = new ConfigManager();
  createWindow();
  setupIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (dropManager) {
      dropManager.cleanup();
    }
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (dropManager) {
    await dropManager.cleanup();
  }
});
