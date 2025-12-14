# Quick Start Guide

## Installation

```bash
# 1. Install all dependencies
npm install

# 2. Install Playwright browsers (required for automation)
npx playwright install chromium

# 3. If you get security vulnerabilities, you can fix them (optional)
npm audit fix
```

## Running the Application

### Option 1: Simple Development Mode (Recommended for First Run)

```bash
npm run dev:simple
```

This will:
- Build the TypeScript files
- Launch the Electron app with the GUI

### Option 2: Full Development Mode (with Hot Reload)

```bash
npm run dev
```

This will:
- Build and watch TypeScript files for changes
- Start Vite development server for the UI
- Launch Electron

### Option 3: Production Mode

```bash
# Build everything first
npm run build

# Then run
npm start
```

## Troubleshooting

### Error: "Cannot find module dist/main/index.js"

**Solution:** You need to build the TypeScript files first:

```bash
npm run build:main
```

Then run:

```bash
npm start
```

### Error: "Module was compiled against a different Node.js version"

This happens with **better-sqlite3** (native module) when it's compiled for Node.js but you're using Electron.

**Solution:** Rebuild native modules for Electron:

```bash
npm install electron-rebuild --save-dev
npm run rebuild
```

Or automatically (already configured in package.json):

```bash
npm install
# This will automatically rebuild after install via postinstall script
```

### Error: "Unable to load preload script"

**Solution:** This has been fixed in the latest version. Pull the latest changes:

```bash
git pull origin claude/twitch-auto-drop-raids-eDxLL
npm run build:main
npm start
```

### Error: Missing dependencies

**Solution:** Install the new dependencies:

```bash
npm install wait-on concurrently electron-rebuild --save-dev
```

### Security Vulnerabilities Warning

The npm audit warnings are about development dependencies and are generally safe to ignore. However, if you want to fix them:

```bash
npm audit fix
```

Or to force fix (may cause breaking changes):

```bash
npm audit fix --force
```

## First Time Setup

1. Install dependencies: `npm install`
2. Build the project: `npm run build:main`
3. Run the app: `npm run dev:simple`
4. In the app:
   - Go to **Settings**
   - Enter your Twitch username and password
   - Click **Login to Twitch**
   - Go to **Campaigns** and select campaigns you want
   - Go to **Dashboard** and click **Start Farming**

## Project Structure

```
twitchdropsssc/
├── src/                    # Source TypeScript files
│   ├── main/              # Electron main process
│   ├── renderer/          # UI (HTML/CSS/JS)
│   ├── automation/        # Drop farming logic
│   ├── api/               # Twitch API
│   └── database/          # SQLite database
├── dist/                   # Compiled JavaScript (auto-generated)
│   └── main/              # Compiled main process
├── package.json
└── tsconfig.json
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build:main` | Compile TypeScript to JavaScript |
| `npm run dev:simple` | Run app in simple dev mode |
| `npm run dev` | Run app with hot reload |
| `npm start` | Run built app |
| `npm run build` | Build for production |

## Notes

- The app will create a `drops.db` SQLite database in your user data folder
- Settings are stored locally using electron-store
- The first run will download Playwright browsers (may take a few minutes)
