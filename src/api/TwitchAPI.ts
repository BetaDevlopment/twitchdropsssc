import axios, { AxiosInstance } from 'axios';
import { TwitchCampaign, StreamerInfo } from '../types';

export class TwitchAPI {
  private client: AxiosInstance;
  private gqlClient: AxiosInstance;
  private clientId: string = 'kimne78kx3ncx6brgo4mv6wki5h1ko'; // Public Twitch client ID

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.twitch.tv/helix',
      headers: {
        'Client-ID': this.clientId
      }
    });

    this.gqlClient = axios.create({
      baseURL: 'https://gql.twitch.tv/gql',
      headers: {
        'Client-ID': this.clientId,
        'Content-Type': 'application/json'
      }
    });
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    this.gqlClient.defaults.headers.common['Authorization'] = `OAuth ${token}`;
  }

  async getDropCampaigns(): Promise<TwitchCampaign[]> {
    try {
      const query = `
        query {
          currentUser {
            dropCampaigns {
              id
              name
              game {
                displayName
                boxArtURL
              }
              startAt
              endAt
              status
              timeBasedDrops {
                id
                name
                requiredMinutesWatched
                benefitEdges {
                  benefit {
                    id
                    name
                    imageAssetURL
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.gqlClient.post('', {
        query,
        variables: {}
      });

      const campaigns = response.data.data.currentUser?.dropCampaigns || [];

      return campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        game: campaign.game?.displayName || 'Unknown',
        gameImage: campaign.game?.boxArtURL || '',
        startDate: new Date(campaign.startAt),
        endDate: new Date(campaign.endAt),
        active: campaign.status === 'ACTIVE',
        drops: campaign.timeBasedDrops || []
      }));
    } catch (error) {
      console.error('Error fetching drop campaigns:', error);
      return [];
    }
  }

  async getStreamersForGame(gameName: string, limit: number = 20): Promise<StreamerInfo[]> {
    try {
      const query = `
        query($gameName: String!, $limit: Int!) {
          game(name: $gameName) {
            streams(first: $limit, options: { sort: VIEWER_COUNT, recommendationsContext: { platform: "web" } }) {
              edges {
                node {
                  broadcaster {
                    login
                    displayName
                  }
                  viewersCount
                  game {
                    displayName
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.gqlClient.post('', {
        query,
        variables: { gameName, limit }
      });

      const streams = response.data.data.game?.streams?.edges || [];

      return streams.map((edge: any) => ({
        username: edge.node.broadcaster.login,
        displayName: edge.node.broadcaster.displayName,
        isLive: true,
        viewerCount: edge.node.viewersCount,
        game: edge.node.game.displayName,
        campaignIds: [],
        url: `https://www.twitch.tv/${edge.node.broadcaster.login}`
      }));
    } catch (error) {
      console.error('Error fetching streamers:', error);
      return [];
    }
  }

  async getDropsEnabledStreams(campaignId?: string): Promise<StreamerInfo[]> {
    try {
      const query = `
        query($limit: Int!) {
          currentUser {
            dropCampaigns {
              id
              name
              game {
                displayName
              }
            }
          }
          streams: directoriesWithTags(first: $limit, tags: ["drops-enabled"]) {
            edges {
              node {
                ... on Game {
                  displayName
                  streams(first: 20, options: { sort: VIEWER_COUNT }) {
                    edges {
                      node {
                        broadcaster {
                          login
                          displayName
                        }
                        viewersCount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.gqlClient.post('', {
        query,
        variables: { limit: 10 }
      });

      const streamers: StreamerInfo[] = [];
      const directories = response.data.data.streams?.edges || [];

      for (const dir of directories) {
        const game = dir.node;
        const streams = game.streams?.edges || [];

        for (const stream of streams) {
          streamers.push({
            username: stream.node.broadcaster.login,
            displayName: stream.node.broadcaster.displayName,
            isLive: true,
            viewerCount: stream.node.viewersCount,
            game: game.displayName,
            campaignIds: [],
            url: `https://www.twitch.tv/${stream.node.broadcaster.login}`
          });
        }
      }

      return streamers;
    } catch (error) {
      console.error('Error fetching drops-enabled streams:', error);
      return [];
    }
  }

  async getUserDropProgress(): Promise<any> {
    try {
      const query = `
        query {
          currentUser {
            inventory {
              dropCampaignsInProgress {
                id
                timeBasedDrops {
                  id
                  requiredMinutesWatched
                  self {
                    currentMinutesWatched
                    hasPreconditionsMet
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.gqlClient.post('', {
        query,
        variables: {}
      });

      return response.data.data.currentUser?.inventory?.dropCampaignsInProgress || [];
    } catch (error) {
      console.error('Error fetching drop progress:', error);
      return [];
    }
  }
}
