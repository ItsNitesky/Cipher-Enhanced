const logger = require('../../utils/logger');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.toLowerCase().includes('sleep token')) {
            try {
                await message.reply('Worship.');
                logger.debug(`Responded to Sleep Token mention from ${message.author.tag}`);
            } catch (error) {
                logger.error('Error responding to Sleep Token mention:', error);
            }
        }
    },
}; 