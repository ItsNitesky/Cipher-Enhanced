const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const pool = require('../../database/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings issued to a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check warnings for')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');

            // Fetch all warnings for the user
            const [warnings] = await pool.execute(
                `SELECT uw.id, uw.issued_at, uw.notes, 
                        wt.title, wt.description,
                        u.username as issued_by
                 FROM user_warnings uw
                 JOIN warning_templates wt ON uw.template_id = wt.id
                 JOIN users u ON uw.issued_by = u.id
                 WHERE uw.user_id = ?
                 ORDER BY uw.issued_at DESC`,
                [targetUser.id]
            );

            if (warnings.length === 0) {
                return interaction.reply({
                    content: `${targetUser.tag} has no warnings.`,
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle(`Warnings for ${targetUser.tag}`)
                .setDescription(`Total Warnings: ${warnings.length}`)
                .setTimestamp();

            // Add each warning as a field
            warnings.forEach(warning => {
                const date = new Date(warning.issued_at).toLocaleString();
                embed.addFields({
                    name: `Warning #${warning.id} - ${warning.title} (${date})`,
                    value: `Description: ${warning.description}\nNotes: ${warning.notes}\nIssued by: ${warning.issued_by}`
                });
            });

            await interaction.reply({ embeds: [embed] });
            logger.info(`Warnings checked for ${targetUser.tag} by ${interaction.user.tag}`);
        } catch (error) {
            logger.error('Error fetching user warnings:', error);
            await interaction.reply({ 
                content: 'There was an error while fetching the warnings!', 
                ephemeral: true 
            });
        }
    },
}; 