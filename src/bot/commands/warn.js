const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const pool = require('../../database/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a warning to a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('warning_id')
                .setDescription('The ID of the warning template to use')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Additional notes for this warning')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const warningId = interaction.options.getInteger('warning_id');
            const notes = interaction.options.getString('notes') || null;
            const moderatorId = interaction.user.id;

            await pool.execute(
                'INSERT INTO users (id, username, discriminator, avatar) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE username = ?, discriminator = ?, avatar = ?',
                [targetUser.id, targetUser.username, targetUser.discriminator, targetUser.avatarURL(), 
                 targetUser.username, targetUser.discriminator, targetUser.avatarURL()]
            );

            await pool.execute(
                'INSERT INTO users (id, username, discriminator, avatar) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE username = ?, discriminator = ?, avatar = ?',
                [moderatorId, interaction.user.username, interaction.user.discriminator, interaction.user.avatarURL(),
                 interaction.user.username, interaction.user.discriminator, interaction.user.avatarURL()]
            );

            const [templates] = await pool.execute(
                'SELECT title, description FROM warning_templates WHERE id = ?',
                [warningId]
            );

            if (templates.length === 0) {
                return interaction.reply({
                    content: 'Invalid warning template ID. Use /listwarnings to see available templates.',
                    ephemeral: true
                });
            }

            const template = templates[0];

            await pool.execute(
                'INSERT INTO user_warnings (user_id, template_id, issued_by, notes) VALUES (?, ?, ?, ?)',
                [targetUser.id, warningId, moderatorId, notes]
            );


            // Embeds Section
            
            const moderatorEmbed = new EmbedBuilder()
                .setAuthor({
                    name: interaction.user.tag,
                    iconURL: "https://i.imgur.com/HwsaWNp.png"
                })
                .setTitle(`${interaction.user.tag} has issued a warning to ${targetUser.tag}`)
                .addFields(
                    {
                        name: "Warning Name",
                        value: template.title,
                        inline: false
                    },
                    {
                        name: "Warning Description",
                        value: template.description,
                        inline: false
                    },
                    {
                        name: "Additional Notes",
                        value: notes || "No additional notes provided",
                        inline: false
                    }
                )
                .setColor("#6e00f5")
                .setFooter({
                    text: "Warning system powered by Cipher",
                    iconURL: "https://i.imgur.com/HwsaWNp.png"
                })
                .setTimestamp();

            const userEmbed = new EmbedBuilder()
                .setAuthor({
                    name: "Voids Within",
                    iconURL: "https://i.imgur.com/HwsaWNp.png"
                })
                .setTitle("You have Received a Warning")
                .setDescription("A member of the Moderation Team within the Voids Within Discord Server has issued you a warning due to your conduct within our server. Please review the information regarding this warning below. Further disregard of our community's rules will result in a removal from our Discord Server.")
                .addFields(
                    {
                        name: "Warning Name",
                        value: template.title,
                        inline: false
                    },
                    {
                        name: "Warning Description",
                        value: template.description,
                        inline: false
                    }
                )
                .setColor("#6e00f5")
                .setFooter({
                    text: "Warning system powered by Cipher",
                    iconURL: "https://i.imgur.com/HwsaWNp.png"
                })
                .setTimestamp();

            if (notes) {
                userEmbed.addFields({
                    name: "Additional Notes",
                    value: notes,
                    inline: false
                });
            }

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('acknowledge_warning')
                        .setLabel('Acknowledge')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('question_warning')
                        .setLabel('I don\'t understand')
                        .setStyle(ButtonStyle.Danger)
                );

            try {
                const message = await targetUser.send({ 
                    embeds: [userEmbed],
                    components: [buttons]
                });

                const collector = message.createMessageComponentCollector({ 
                    time: 24 * 60 * 60 * 1000 // 24 hours
                });

                collector.on('collect', async (i) => {
                    if (i.user.id !== targetUser.id) {
                        await i.reply({ 
                            content: 'This button is not for you.', 
                            ephemeral: true 
                        });
                        return;
                    }

                    const moderatorChannel = interaction.client.channels.cache.get(process.env.MODERATOR_CHANNEL);
                    if (!moderatorChannel) {
                        logger.error('Moderator channel not found');
                        return;
                    }

                    if (i.customId === 'acknowledge_warning') {
                        const acknowledgeEmbed = new EmbedBuilder()
                            .setAuthor({
                                name: "Voids Within",
                                iconURL: "https://i.imgur.com/HwsaWNp.png"
                            })
                            .setTitle(`${targetUser.tag} has acknowledged their warning.`)
                            .setDescription(`${targetUser.tag} has seen their warning that was issued and has acknowledged it. No further action is required by a Moderator.`)
                            .addFields(
                                {
                                    name: "Warning Name",
                                    value: template.title,
                                    inline: false
                                },
                                {
                                    name: "Warning Description",
                                    value: template.description,
                                    inline: false
                                }
                            )
                            .setColor("#00f56a")
                            .setFooter({
                                text: "Warning system powered by Cipher",
                                iconURL: "https://i.imgur.com/HwsaWNp.png"
                            })
                            .setTimestamp();

                        if (notes) {
                            acknowledgeEmbed.addFields({
                                name: "Additional Notes",
                                value: notes,
                                inline: false
                            });
                        }

                        await moderatorChannel.send({ embeds: [acknowledgeEmbed] });
                        await i.reply({ 
                            content: 'Thank you for acknowledging the warning.', 
                            ephemeral: true 
                        });
                    } else if (i.customId === 'question_warning') {
                        const questionEmbed = new EmbedBuilder()
                            .setAuthor({
                                name: "Voids Within",
                                iconURL: "https://i.imgur.com/HwsaWNp.png"
                            })
                            .setTitle(`${targetUser.tag} has a question about their Warning.`)
                            .setDescription(`${targetUser.tag} has seen their warning that was issued and is requesting a Moderator reach out to them to explain the warning further.`)
                            .addFields(
                                {
                                    name: "Warning Name",
                                    value: template.title,
                                    inline: false
                                },
                                {
                                    name: "Warning Description",
                                    value: template.description,
                                    inline: false
                                },
                                {
                                    name: "Issued By",
                                    value: interaction.user.tag,
                                    inline: false
                                }
                            )
                            .setColor("#f58f00")
                            .setFooter({
                                text: "Warning system powered by Cipher",
                                iconURL: "https://i.imgur.com/HwsaWNp.png"
                            })
                            .setTimestamp();

                        if (notes) {
                            questionEmbed.addFields({
                                name: "Additional Notes",
                                value: notes,
                                inline: false
                            });
                        }

                        await moderatorChannel.send({ embeds: [questionEmbed] });
                        await i.reply({ 
                            content: 'A moderator will reach out to you shortly to explain the warning.', 
                            ephemeral: true 
                        });
                    }


                    buttons.components.forEach(button => button.setDisabled(true));
                    await message.edit({ components: [buttons] });
                });

                collector.on('end', async () => {
                    buttons.components.forEach(button => button.setDisabled(true));
                    await message.edit({ components: [buttons] }).catch(() => {});
                });

            } catch (error) {
                logger.warn(`Could not send warning DM to ${targetUser.tag}: ${error.message}`);
            }

            await interaction.reply({ embeds: [moderatorEmbed] });
            logger.info(`Warning issued to ${targetUser.tag} by ${interaction.user.tag} - Template ID: ${warningId}`);
        } catch (error) {
            logger.error('Error issuing warning:', error);
            await interaction.reply({ 
                content: 'There was an error while issuing the warning!', 
                ephemeral: true 
            });
        }
    },
}; 