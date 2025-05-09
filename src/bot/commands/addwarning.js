const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const pool = require('../../database/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addwarning')
        .setDescription('Add a new warning template to the database')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the warning')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('The description of the warning')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const userId = interaction.user.id;
            const username = interaction.user.username;
            const discriminator = interaction.user.discriminator;
            const avatar = interaction.user.avatarURL();

            // First, ensure the user exists in the database
            await pool.execute(
                'INSERT INTO users (id, username, discriminator, avatar) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE username = ?, discriminator = ?, avatar = ?',
                [userId, username, discriminator, avatar, username, discriminator, avatar]
            );

            // Now insert the warning template
            const [result] = await pool.execute(
                'INSERT INTO warning_templates (title, description, created_by) VALUES (?, ?, ?)',
                [title, description, userId]
            );

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: interaction.user.tag,
                    iconURL: "https://i.imgur.com/HwsaWNp.png"
                })
                .setTitle("Warning Template Added")
                .setDescription(`${interaction.user.tag} has created a new pre-defined warning. ID: ${result.insertId}`)
                .addFields(
                    {
                        name: "Warning Name",
                        value: title,
                        inline: false
                    },
                    {
                        name: "Warning Description",
                        value: description,
                        inline: false
                    },
                    {
                        name: "Warning ID",
                        value: result.insertId.toString(),
                        inline: false
                    }
                )
                .setColor("#6e00f5")
                .setFooter({
                    text: "Warning system powered by Cipher",
                    iconURL: "https://slate.dan.onl/slate.png"
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            logger.info(`Warning template added by ${interaction.user.tag} - ID: ${result.insertId}`);
        } catch (error) {
            logger.error('Error adding warning template:', error);
            await interaction.reply({ 
                content: 'There was an error while adding the warning template!', 
                ephemeral: true 
            });
        }
    },
}; 