const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with the bot\'s latency'),
    
    async execute(interaction) {
        try {
            const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);

            await interaction.editReply({
                content: `🏓 Pong!\nBot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms`
            });

            logger.debug(`Ping command executed by ${interaction.user.tag} - Latency: ${latency}ms, API Latency: ${apiLatency}ms`);
        } catch (error) {
            logger.error('Error executing ping command:', error);
            await interaction.reply({ 
                content: 'There was an error while executing this command!', 
                ephemeral: true 
            });
        }
    },
}; 