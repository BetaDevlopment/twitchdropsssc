# Twitch Drops Automation

A fully automatic Twitch drops farming system with intelligent raid handling and campaign management.

## Features

- **🎮 Automatic Drop Farming**: Automatically watch streams and claim drops
- **🔄 Smart Raid Handling**: Automatically follow raids to new streamers
  - Opens raided channels in new tabs
  - Claims drops from raid streams
  - Closes raid tabs and returns to main stream after claiming
- **📊 Campaign Management**: Select and manage multiple drop campaigns
  - View all available campaigns
  - Auto-select best streamer for each campaign
  - Track progress for multiple campaigns
- **📜 Drop History**: Complete history of all claimed drops
  - Filter and search through your drops
  - View drops by game or campaign
  - Track total drops claimed
- **⚙️ Customizable Settings**:
  - Auto-claim drops toggle
  - Follow raids toggle
  - Auto-close raid tabs option
  - Configurable check intervals
- **🎨 Modern UI**: Clean, intuitive interface designed for everyone

## How It Works

1. **Login**: Enter your Twitch credentials
2. **Select Campaigns**: Choose which game campaigns you want to farm
3. **Start Farming**: The bot will:
   - Find the best streamer for your selected campaign
   - Open the stream and start watching
   - Mute and set quality to lowest to save bandwidth
   - Monitor for drops and claim them automatically
   - Detect raids and open raided channels
   - Claim drops from raid streams
   - Close raid tabs after claiming and return to main stream

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the application
npm run build

# Start the built application
npm start
```

## Technology Stack

- **Electron**: Desktop application framework
- **TypeScript**: Type-safe development
- **Playwright**: Browser automation
- **SQLite**: Local drop history storage
- **Twitch API**: Campaign and streamer data

## Configuration

Settings are stored locally and include:

- Twitch account credentials (encrypted)
- Auto-claim drops preference
- Follow raids preference
- Close raid tab after drop preference
- Selected campaigns
- Check interval (default: 60 seconds)

## Requirements

- Node.js 18+
- Twitch account
- Active internet connection

## Safety & Ethics

- Uses official Twitch endpoints
- Respects rate limits
- No abuse or exploitation
- For personal use only

## License

MIT

## Disclaimer

This tool is for educational purposes. Use at your own risk. The developers are not responsible for any account actions taken by Twitch.

## Support

For issues or questions, please open an issue on GitHub.