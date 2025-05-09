const { ActivityType } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        logger.info(`Ready! Logged in as ${client.user.tag}`);
        
        // Set bot status
        client.user.setPresence({
            activities: [{ 
                name: 'Community Challenges', 
                type: ActivityType.Watching 
            }],
            status: 'online'
        });
    },
}; 