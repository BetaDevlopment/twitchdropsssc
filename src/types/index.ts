export interface TwitchDrop {
  id: string;
  campaignId: string;
  campaignName: string;
  gameName: string;
  dropName: string;
  dropImage: string;
  claimed: boolean;
  claimedAt?: Date;
  requiredMinutes: number;
  earnedMinutes: number;
  streamerName: string;
}

export interface TwitchCampaign {
  id: string;
  name: string;
  game: string;
  gameImage: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
  drops: CampaignDrop[];
}

export interface CampaignDrop {
  id: string;
  name: string;
  image: string;
  requiredMinutes: number;
  benefitEdges: BenefitEdge[];
}

export interface BenefitEdge {
  benefit: {
    id: string;
    name: string;
    imageAssetURL: string;
  };
}

export interface StreamerInfo {
  username: string;
  displayName: string;
  isLive: boolean;
  viewerCount: number;
  game: string;
  campaignIds: string[];
  url: string;
}

export interface RaidEvent {
  fromStreamer: string;
  toStreamer: string;
  timestamp: Date;
  originalTab: string;
  raidTab?: string;
}

export interface DropProgress {
  dropId: string;
  campaignId: string;
  currentMinutes: number;
  requiredMinutes: number;
  streamerName: string;
  startedAt: Date;
}

export interface AppConfig {
  twitchUsername: string;
  twitchPassword?: string;
  autoClaimDrops: boolean;
  followRaids: boolean;
  closeRaidTabAfterDrop: boolean;
  selectedCampaigns: string[];
  checkInterval: number;
}

export interface DropHistoryEntry {
  id: number;
  dropId: string;
  campaignId: string;
  campaignName: string;
  gameName: string;
  dropName: string;
  dropImage: string;
  streamerName: string;
  claimedAt: Date;
  minutesWatched: number;
}
