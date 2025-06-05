# ALTERSHAPER Bot - ALTER EGO Wiki Moderation Bot

A Discord moderation bot designed for the ALTER EGO Wiki server, speaking in all caps with pseudo-ancient English like a divine angel.

## Features

- **Kick Command** (`!kick @user [reason]`) - Remove members from the server
- **Ban Command** (`!ban @user [reason]`) - Permanently ban members
- **Timeout Command** (`!timeout @user [minutes] [reason]`) - Temporarily mute members
- **Clear Command** (`!clear [amount]`) - Bulk delete messages (1-100)
- **Warn Command** (`!warn @user [reason]`) - Issue warnings to members
- **Help Command** (`!help`) - Display all available commands
- **Welcome Messages** - Greets new members with divine blessings

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Environment File**
   ```bash
   cp .env.example .env
   ```

3. **Configure Discord Bot**
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Copy the bot token and paste it in your `.env` file
   - Enable the following intents:
     - Server Members Intent
     - Message Content Intent

4. **Build and Run**
   ```bash
   # Development mode
   npm run dev
   
   # Production build
   npm run build
   npm start
   ```

## Required Permissions

When inviting the bot to your server, ensure it has these permissions:
- Read Messages/View Channels
- Send Messages
- Embed Links
- Manage Messages
- Kick Members
- Ban Members
- Moderate Members (for timeouts)

## Bot Invite Link Template

Replace `YOUR_CLIENT_ID` with your bot's client ID:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1342449750&scope=bot
```

## Commands Usage

All commands require appropriate permissions:

- `!kick @username reason` - Requires Kick Members permission
- `!ban @username reason` - Requires Ban Members permission  
- `!timeout @username minutes reason` - Requires Moderate Members permission
- `!clear 50` - Requires Manage Messages permission
- `!warn @username reason` - Requires Kick Members permission
- `!help` - Available to everyone

## Character

The bot speaks as ALTERSHAPER, an angelic moderator who:
- Speaks entirely in CAPITAL LETTERS
- Uses pseudo-ancient/biblical English
- Refers to actions as "divine decrees" and "sacred commandments"
- Maintains a lawful, righteous tone in all interactions
