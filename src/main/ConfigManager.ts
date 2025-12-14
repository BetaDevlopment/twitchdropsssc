import Store from 'electron-store';
import { AppConfig } from '../types';

export class ConfigManager {
  private store: Store<AppConfig>;
  private defaultConfig: AppConfig = {
    twitchUsername: '',
    twitchPassword: '',
    autoClaimDrops: true,
    followRaids: true,
    closeRaidTabAfterDrop: true,
    selectedCampaigns: [],
    checkInterval: 60000 // 1 minute
  };

  constructor() {
    this.store = new Store<AppConfig>({
      defaults: this.defaultConfig,
      name: 'twitch-drops-config'
    });
  }

  getConfig(): AppConfig {
    return this.store.store;
  }

  updateConfig(updates: Partial<AppConfig>): AppConfig {
    const currentConfig = this.getConfig();
    const newConfig = { ...currentConfig, ...updates };
    this.store.store = newConfig;
    return newConfig;
  }

  setUsername(username: string): void {
    this.store.set('twitchUsername', username);
  }

  setPassword(password: string): void {
    this.store.set('twitchPassword', password);
  }

  getUsername(): string {
    return this.store.get('twitchUsername', '');
  }

  getPassword(): string {
    return this.store.get('twitchPassword', '');
  }

  toggleAutoClaimDrops(): boolean {
    const current = this.store.get('autoClaimDrops', true);
    this.store.set('autoClaimDrops', !current);
    return !current;
  }

  toggleFollowRaids(): boolean {
    const current = this.store.get('followRaids', true);
    this.store.set('followRaids', !current);
    return !current;
  }

  addSelectedCampaign(campaignId: string): void {
    const selected = this.store.get('selectedCampaigns', []);
    if (!selected.includes(campaignId)) {
      selected.push(campaignId);
      this.store.set('selectedCampaigns', selected);
    }
  }

  removeSelectedCampaign(campaignId: string): void {
    const selected = this.store.get('selectedCampaigns', []);
    const filtered = selected.filter(id => id !== campaignId);
    this.store.set('selectedCampaigns', filtered);
  }

  clearSelectedCampaigns(): void {
    this.store.set('selectedCampaigns', []);
  }

  reset(): void {
    this.store.clear();
  }
}
