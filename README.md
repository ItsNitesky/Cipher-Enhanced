# Cipher Bot v2.0

A modern Discord bot for community management, challenges, and moderation for the Voids Within Discord Server.

## Features

- Community Challenge Management
  - Create and manage community challenges
  - Submission handling and voting system
  - Challenge notifications and reminders
- Moderation Tools
  - Warning system with predefined templates
  - User moderation history
  - Automated moderation actions
- Web Dashboard
  - Challenge management interface
  - Moderation tools and user profiles
  - Custom embed message creator
  - FAQ management system

## Tech Stack

- Node.js
- Discord.js v14
- Express.js
- MySQL
- Passport.js for authentication

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   GUILD_ID=your_discord_server_id
   MYSQL_HOST=localhost
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=cipher_bot
   SESSION_SECRET=your_session_secret
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── bot/              # Discord bot related code
│   ├── commands/     # Slash commands
│   ├── events/       # Discord event handlers
│   └── utils/        # Bot utilities
├── web/              # Web dashboard related code
│   ├── routes/       # Express routes
│   ├── views/        # Frontend templates
│   └── middleware/   # Express middleware
├── database/         # Database models and migrations
├── config/           # Configuration files
└── utils/            # Shared utilities
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
6. Message me on Discord if you've done this. User: itsbrant

## License

This project is licensed under the MIT License - see the LICENSE file for details. (Doesn't exist yet <3) 