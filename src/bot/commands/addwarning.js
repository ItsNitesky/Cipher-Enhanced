const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const pool = require('../../database/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addwarning')
        .setDescription('Add a new warning template to the database')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        try {

            const modal = new ModalBuilder()
                .setCustomId('add_warning_modal')
                .setTitle('Add Warning Template');


            const titleInput = new TextInputBuilder()
                .setCustomId('warning_title')
                .setLabel('Warning Title')
                .setPlaceholder('Enter a clear, concise title for this warning')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);


            const descriptionInput = new TextInputBuilder()
                .setCustomId('warning_description')
                .setLabel('Warning Description')
                .setPlaceholder('Enter a detailed description of the warning and its consequences')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);


            const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
            const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);

            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);

            const filter = i => i.customId === 'add_warning_modal';
            try {
                const submission = await interaction.awaitModalSubmit({ filter, time: 300000 }); // 5 minutes timeout

                const title = submission.fields.getTextInputValue('warning_title');
                const description = submission.fields.getTextInputValue('warning_description');
                const userId = submission.user.id;
                const username = submission.user.username;
                const discriminator = submission.user.discriminator;
                const avatar = submission.user.avatarURL();

                await pool.execute(
                    'INSERT INTO users (id, username, discriminator, avatar) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE username = ?, discriminator = ?, avatar = ?',
                    [userId, username, discriminator, avatar, username, discriminator, avatar]
                );

                const [result] = await pool.execute(
                    'INSERT INTO warning_templates (title, description, created_by) VALUES (?, ?, ?)',
                    [title, description, userId]
                );

                const previewEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: submission.user.tag,
                        iconURL: "https://i.imgur.com/HwsaWNp.png"
                    })
                    .setTitle("Warning Template Added")
                    .setDescription("Here's a preview of your new warning template:")
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
                        iconURL: "https://i.imgur.com/HwsaWNp.png"
                    })
                    .setTimestamp();

                await submission.reply({ embeds: [previewEmbed] });
                logger.info(`Warning template added by ${submission.user.tag} - ID: ${result.insertId}`);
            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    logger.warn('Modal submission timed out');
                    await interaction.followUp({ 
                        content: 'The warning template creation timed out. Please try again.', 
                        ephemeral: true 
                    });
                    return;
                }
                throw error;
            }
        } catch (error) {
            logger.error('Error adding warning template:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'There was an error while adding the warning template!', 
                    ephemeral: true 
                });
            } else {
                await interaction.followUp({ 
                    content: 'There was an error while adding the warning template!', 
                    ephemeral: true 
                });
            }
        }
    },
}; 