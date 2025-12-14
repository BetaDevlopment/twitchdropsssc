import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { EventEmitter } from 'events';
import { RaidEvent, TwitchDrop } from '../types';

export class BrowserAutomation extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private mainPage: Page | null = null;
  private raidPages: Map<string, Page> = new Map();
  private isAuthenticated: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    try {
      // Try to launch with system Chrome first
      console.log('Trying to launch with system Chrome...');
      this.browser = await chromium.launch({
        channel: 'chrome', // Use system Chrome
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
      console.log('Successfully launched with system Chrome!');
    } catch (error) {
      // Fallback to Chromium if Chrome not found
      console.log('Chrome not found, using Chromium instead...');
      this.browser = await chromium.launch({
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
      console.log('Using Chromium browser');
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    this.mainPage = await this.context.newPage();

    // Prevent browser from closing accidentally
    this.browser.on('disconnected', () => {
      console.log('Browser disconnected!');
    });

    // Listen for new pages (potential raids)
    this.context.on('page', async (page) => {
      console.log('New page detected:', await page.title());
    });

    this.emit('initialized');
  }

  async login(username: string, password: string): Promise<boolean> {
    if (!this.mainPage) {
      throw new Error('Browser not initialized');
    }

    try {
      console.log('Navigating to Twitch login page...');
      await this.mainPage.goto('https://www.twitch.tv/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await this.mainPage.waitForTimeout(3000);

      console.log('Filling login form...');
      // Wait for input fields to be available
      await this.mainPage.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
      await this.mainPage.fill('input[autocomplete="username"]', username);
      await this.mainPage.fill('input[autocomplete="current-password"]', password);

      console.log('Submitting login...');
      await this.mainPage.click('button[type="submit"]');
      await this.mainPage.waitForTimeout(4000);

      // Check if 2FA is required
      const has2FA = await this.mainPage.$('input[autocomplete="one-time-code"]').catch(() => null);

      if (has2FA) {
        console.log('2FA detected - waiting for user to enter code...');
        this.emit('2faRequired');

        // Wait for user to manually enter 2FA code (up to 5 minutes)
        // The browser window is visible so they can enter it
        try {
          await this.mainPage.waitForNavigation({
            timeout: 300000,
            waitUntil: 'domcontentloaded'
          });
          console.log('2FA completed');
        } catch (timeoutError) {
          console.log('2FA timeout - user did not complete authentication');
          return false;
        }
      }

      // Wait a bit for navigation to complete
      await this.mainPage.waitForTimeout(3000);

      // Check if login was successful
      const currentUrl = this.mainPage.url();
      console.log('Current URL after login:', currentUrl);

      if (!currentUrl.includes('/login')) {
        this.isAuthenticated = true;
        this.emit('authenticated');
        console.log('Login successful!');
        return true;
      }

      console.log('Login failed - still on login page');
      return false;
    } catch (error: any) {
      console.error('Login error:', error.message);
      return false;
    }
  }

  async watchStream(streamerName: string, isPrimary: boolean = true): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not initialized');
    }

    const page = isPrimary ? this.mainPage! : await this.context.newPage();
    await page.goto(`https://www.twitch.tv/${streamerName}`);
    await page.waitForTimeout(3000);

    // Close mature content warning if present
    try {
      await page.click('button[data-a-target="player-overlay-mature-accept"]', { timeout: 2000 });
    } catch {
      // No mature warning
    }

    // Mute the stream
    try {
      await page.click('button[aria-label="Mute (m)"]', { timeout: 2000 });
    } catch {
      // Already muted or button not found
    }

    // Set quality to lowest
    try {
      await page.click('button[data-a-target="player-settings-button"]', { timeout: 2000 });
      await page.waitForTimeout(500);
      await page.click('button[data-a-target="player-settings-menu-item-quality"]', { timeout: 2000 });
      await page.waitForTimeout(500);

      // Click the lowest quality option (usually last in the list)
      const qualityOptions = await page.$$('input[data-a-target="tw-radio"]');
      if (qualityOptions.length > 0) {
        await qualityOptions[qualityOptions.length - 1].click();
      }
    } catch (error) {
      console.log('Could not set quality:', error);
    }

    if (isPrimary) {
      this.startRaidDetection(page, streamerName);
    }

    this.emit('streamStarted', { streamer: streamerName, isPrimary });
    return page;
  }

  private async startRaidDetection(page: Page, streamerName: string): Promise<void> {
    // Monitor for raid notifications
    setInterval(async () => {
      try {
        const raidNotification = await page.$('[data-test-selector="raid-banner"]');
        if (raidNotification) {
          const raidedStreamer = await this.extractRaidedStreamer(page);
          if (raidedStreamer) {
            this.emit('raidDetected', {
              fromStreamer: streamerName,
              toStreamer: raidedStreamer,
              timestamp: new Date()
            } as RaidEvent);

            // Open raided streamer in new tab
            const raidPage = await this.watchStream(raidedStreamer, false);
            this.raidPages.set(raidedStreamer, raidPage);
          }
        }
      } catch (error) {
        // Raid detection error, continue monitoring
      }
    }, 5000);
  }

  private async extractRaidedStreamer(page: Page): Promise<string | null> {
    try {
      const raidText = await page.$eval('[data-test-selector="raid-banner"]', el => el.textContent);
      const match = raidText?.match(/(?:raiding|joining)\s+(\w+)/i);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  async checkForDrops(page: Page): Promise<TwitchDrop[]> {
    try {
      // Click on drops button if available
      const dropsButton = await page.$('button[aria-label="Drops and Rewards"]');
      if (!dropsButton) {
        return [];
      }

      await dropsButton.click();
      await page.waitForTimeout(1000);

      // Check for claimable drops
      const claimButtons = await page.$$('button:has-text("Claim")');
      const drops: TwitchDrop[] = [];

      for (const button of claimButtons) {
        // Extract drop information
        const dropInfo = await this.extractDropInfo(page, button);
        if (dropInfo) {
          drops.push(dropInfo);
        }
      }

      return drops;
    } catch (error) {
      console.error('Error checking for drops:', error);
      return [];
    }
  }

  private async extractDropInfo(page: Page, claimButton: any): Promise<TwitchDrop | null> {
    try {
      const parent = await claimButton.evaluateHandle((el: any) => el.closest('[data-test-selector="drop-card"]'));

      const dropName = await page.evaluate((el: any) => {
        return el.querySelector('h6')?.textContent || 'Unknown Drop';
      }, parent);

      return {
        id: `drop-${Date.now()}`,
        campaignId: 'unknown',
        campaignName: 'Unknown Campaign',
        gameName: 'Unknown Game',
        dropName,
        dropImage: '',
        claimed: false,
        requiredMinutes: 0,
        earnedMinutes: 0,
        streamerName: ''
      };
    } catch {
      return null;
    }
  }

  async claimDrop(page: Page, drop: TwitchDrop): Promise<boolean> {
    try {
      const claimButtons = await page.$$('button:has-text("Claim")');

      for (const button of claimButtons) {
        await button.click();
        await page.waitForTimeout(2000);

        this.emit('dropClaimed', drop);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error claiming drop:', error);
      return false;
    }
  }

  async closeRaidTab(streamerName: string): Promise<void> {
    const page = this.raidPages.get(streamerName);
    if (page) {
      await page.close();
      this.raidPages.delete(streamerName);
      this.emit('raidTabClosed', streamerName);
    }
  }

  startAutoDropCheck(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      if (this.mainPage) {
        const drops = await this.checkForDrops(this.mainPage);

        for (const drop of drops) {
          await this.claimDrop(this.mainPage, drop);
        }
      }

      // Check raid pages too
      for (const [streamer, page] of this.raidPages.entries()) {
        const drops = await this.checkForDrops(page);

        for (const drop of drops) {
          const claimed = await this.claimDrop(page, drop);
          if (claimed) {
            // Close raid tab after claiming
            await this.closeRaidTab(streamer);
          }
        }
      }
    }, intervalMs);
  }

  stopAutoDropCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async getDropProgress(page: Page): Promise<any> {
    try {
      // Navigate to drops inventory
      await page.goto('https://www.twitch.tv/drops/inventory');
      await page.waitForTimeout(3000);

      // Extract progress information
      const progressElements = await page.$$('[data-test-selector="progress-bar"]');
      const progress = [];

      for (const element of progressElements) {
        const progressText = await element.textContent();
        progress.push(progressText);
      }

      return progress;
    } catch (error) {
      console.error('Error getting drop progress:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    this.stopAutoDropCheck();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.mainPage = null;
    }
  }

  isReady(): boolean {
    return this.browser !== null && this.isAuthenticated;
  }
}
