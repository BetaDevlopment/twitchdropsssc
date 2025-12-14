import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { DropHistoryEntry, TwitchDrop } from '../types';

export class DropDatabase {
  private db: Database.Database;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'drops.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS drop_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        drop_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        campaign_name TEXT NOT NULL,
        game_name TEXT NOT NULL,
        drop_name TEXT NOT NULL,
        drop_image TEXT,
        streamer_name TEXT NOT NULL,
        claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        minutes_watched INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS active_progress (
        drop_id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        current_minutes INTEGER DEFAULT 0,
        required_minutes INTEGER NOT NULL,
        streamer_name TEXT NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_drop_history_claimed_at ON drop_history(claimed_at);
      CREATE INDEX IF NOT EXISTS idx_drop_history_campaign_id ON drop_history(campaign_id);
    `);
  }

  addDropToHistory(drop: TwitchDrop): void {
    const stmt = this.db.prepare(`
      INSERT INTO drop_history (drop_id, campaign_id, campaign_name, game_name, drop_name, drop_image, streamer_name, minutes_watched)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      drop.id,
      drop.campaignId,
      drop.campaignName,
      drop.gameName,
      drop.dropName,
      drop.dropImage,
      drop.streamerName,
      drop.requiredMinutes
    );
  }

  getDropHistory(limit: number = 100): DropHistoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM drop_history
      ORDER BY claimed_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      dropId: row.drop_id,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      gameName: row.game_name,
      dropName: row.drop_name,
      dropImage: row.drop_image,
      streamerName: row.streamer_name,
      claimedAt: new Date(row.claimed_at),
      minutesWatched: row.minutes_watched
    }));
  }

  getDropHistoryByGame(gameName: string): DropHistoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM drop_history
      WHERE game_name = ?
      ORDER BY claimed_at DESC
    `);

    const rows = stmt.all(gameName) as any[];
    return rows.map(row => ({
      id: row.id,
      dropId: row.drop_id,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      gameName: row.game_name,
      dropName: row.drop_name,
      dropImage: row.drop_image,
      streamerName: row.streamer_name,
      claimedAt: new Date(row.claimed_at),
      minutesWatched: row.minutes_watched
    }));
  }

  updateProgress(dropId: string, currentMinutes: number): void {
    const stmt = this.db.prepare(`
      UPDATE active_progress
      SET current_minutes = ?, last_updated = CURRENT_TIMESTAMP
      WHERE drop_id = ?
    `);

    stmt.run(currentMinutes, dropId);
  }

  startProgress(dropId: string, campaignId: string, requiredMinutes: number, streamerName: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO active_progress (drop_id, campaign_id, current_minutes, required_minutes, streamer_name)
      VALUES (?, ?, 0, ?, ?)
    `);

    stmt.run(dropId, campaignId, requiredMinutes, streamerName);
  }

  getActiveProgress() {
    const stmt = this.db.prepare(`
      SELECT * FROM active_progress
    `);

    return stmt.all();
  }

  clearProgress(dropId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM active_progress WHERE drop_id = ?
    `);

    stmt.run(dropId);
  }

  getTotalDropsClaimed(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM drop_history
    `);

    const result = stmt.get() as { count: number };
    return result.count;
  }

  close(): void {
    this.db.close();
  }
}
