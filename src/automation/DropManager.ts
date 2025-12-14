import { EventEmitter } from 'events';
import { BrowserAutomation } from './BrowserAutomation';
import { TwitchAPI } from '../api/TwitchAPI';
import { DropDatabase } from '../database/DropDatabase';
import { AppConfig, TwitchCampaign, StreamerInfo, TwitchDrop } from '../types';

export class DropManager extends EventEmitter {
  private browser: BrowserAutomation;
  private api: TwitchAPI;
  private db: DropDatabase;
  private config: AppConfig;
  private activeCampaigns: TwitchCampaign[] = [];
  private currentStreamer: string | null = null;
  private isRunning: boolean = false;

  constructor(config: AppConfig) {
    super();
    this.config = config;
    this.browser = new BrowserAutomation();
    this.api = new TwitchAPI();
    this.db = new DropDatabase();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.browser.on('raidDetected', async (raid) => {
      console.log(`Raid detected: ${raid.fromStreamer} -> ${raid.toStreamer}`);
      this.emit('raidDetected', raid);

      if (this.config.followRaids) {
        // Browser automation already opened the raid tab
        console.log(`Following raid to ${raid.toStreamer}`);
      }
    });

    this.browser.on('dropClaimed', async (drop: TwitchDrop) => {
      console.log(`Drop claimed: ${drop.dropName}`);
      this.db.addDropToHistory(drop);
      this.emit('dropClaimed', drop);

      // If this was from a raid tab, close it
      if (this.config.closeRaidTabAfterDrop && drop.streamerName !== this.currentStreamer) {
        await this.browser.closeRaidTab(drop.streamerName);
      }
    });

    this.browser.on('streamStarted', (data) => {
      console.log(`Started watching: ${data.streamer}`);
      this.emit('streamStarted', data);
    });

    this.browser.on('raidTabClosed', (streamer) => {
      console.log(`Closed raid tab for: ${streamer}`);
      this.emit('raidTabClosed', streamer);
    });
  }

  async initialize(): Promise<void> {
    console.log('Initializing Drop Manager...');
    await this.browser.initialize();
    this.emit('initialized');
  }

  async login(username: string, password: string): Promise<boolean> {
    console.log('Logging in to Twitch...');
    const success = await this.browser.login(username, password);

    if (success) {
      // After login, we would need to extract the auth token
      // For now, we'll skip this as it requires more complex token extraction
      console.log('Login successful');
      this.emit('loggedIn');
    } else {
      console.log('Login failed');
      this.emit('loginFailed');
    }

    return success;
  }

  async loadCampaigns(): Promise<TwitchCampaign[]> {
    console.log('Loading available campaigns...');
    this.activeCampaigns = await this.api.getDropCampaigns();
    this.emit('campaignsLoaded', this.activeCampaigns);
    return this.activeCampaigns;
  }

  async startWatching(campaignId?: string): Promise<void> {
    if (this.isRunning) {
      console.log('Already watching streams');
      return;
    }

    this.isRunning = true;
    console.log('Starting automated drop farming...');

    let selectedCampaigns = this.activeCampaigns;

    if (campaignId) {
      selectedCampaigns = this.activeCampaigns.filter(c => c.id === campaignId);
    } else if (this.config.selectedCampaigns.length > 0) {
      selectedCampaigns = this.activeCampaigns.filter(c =>
        this.config.selectedCampaigns.includes(c.id)
      );
    }

    if (selectedCampaigns.length === 0) {
      console.log('No campaigns selected');
      this.isRunning = false;
      return;
    }

    // Start with the first campaign
    const campaign = selectedCampaigns[0];
    const streamer = await this.findBestStreamer(campaign);

    if (streamer) {
      this.currentStreamer = streamer.username;
      await this.browser.watchStream(streamer.username, true);

      // Start automatic drop checking
      this.browser.startAutoDropCheck(this.config.checkInterval);

      this.emit('watchingStarted', {
        campaign: campaign.name,
        streamer: streamer.username
      });
    } else {
      console.log('No suitable streamer found');
      this.isRunning = false;
    }
  }

  async findBestStreamer(campaign: TwitchCampaign): Promise<StreamerInfo | null> {
    console.log(`Finding best streamer for ${campaign.name}...`);

    // Get streamers for the campaign's game
    const streamers = await this.api.getStreamersForGame(campaign.game, 20);

    if (streamers.length === 0) {
      // Try drops-enabled streams
      const dropsStreamers = await this.api.getDropsEnabledStreams(campaign.id);
      return dropsStreamers.length > 0 ? dropsStreamers[0] : null;
    }

    // Sort by viewer count and return the top one
    streamers.sort((a, b) => b.viewerCount - a.viewerCount);
    return streamers[0];
  }

  async stopWatching(): Promise<void> {
    console.log('Stopping automated drop farming...');
    this.isRunning = false;
    this.browser.stopAutoDropCheck();
    this.currentStreamer = null;
    this.emit('watchingStopped');
  }

  async switchToStreamer(streamerName: string): Promise<void> {
    console.log(`Switching to streamer: ${streamerName}`);
    this.currentStreamer = streamerName;
    await this.browser.watchStream(streamerName, true);
    this.emit('streamerSwitched', streamerName);
  }

  getDropHistory(limit?: number) {
    return this.db.getDropHistory(limit);
  }

  getDropHistoryByGame(gameName: string) {
    return this.db.getDropHistoryByGame(gameName);
  }

  getTotalDropsClaimed(): number {
    return this.db.getTotalDropsClaimed();
  }

  getActiveCampaigns(): TwitchCampaign[] {
    return this.activeCampaigns;
  }

  async getDropProgress() {
    return await this.api.getUserDropProgress();
  }

  updateConfig(newConfig: Partial<AppConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  async cleanup(): Promise<void> {
    await this.stopWatching();
    await this.browser.close();
    this.db.close();
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
