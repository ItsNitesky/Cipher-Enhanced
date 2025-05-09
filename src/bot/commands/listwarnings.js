const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const pool = require('../../database/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listwarnings')
        .setDescription('List all available warning templates')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        try {
            // Fetch all warning templates
            const [templates] = await pool.execute(
                'SELECT id, title, description FROM warning_templates ORDER BY id'
            );

            if (templates.length === 0) {
                return interaction.reply({
                    content: 'No warning templates found.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Warning Templates')
                .setDescription('Here are all available warning templates:')
                .setTimestamp();

            // Add each template as a field
            templates.forEach(template => {
                embed.addFields({
                    name: `ID: ${template.id} - ${template.title}`,
                    value: template.description
                });
            });

            await interaction.reply({ embeds: [embed] });
            logger.info(`Warning templates listed by ${interaction.user.tag}`);
        } catch (error) {
            logger.error('Error listing warning templates:', error);
            await interaction.reply({ 
                content: 'There was an error while fetching the warning templates!', 
                ephemeral: true 
            });
        }
    },
}; 