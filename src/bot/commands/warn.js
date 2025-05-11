const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
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
        .addStringOption(option =>
            option.setName('comments')
                .setDescription('The comments for this warning')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('severity')
                .setDescription('The severity level of this warning')
                .setRequired(true)
                .addChoices(
                    { name: 'Low - Minor infraction', value: 'low' },
                    { name: 'Medium - Moderate infraction', value: 'medium' },
                    { name: 'High - Serious infraction', value: 'high' }
                )),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const comments = interaction.options.getString('comments');
            const severity = interaction.options.getString('severity');
            const moderatorId = interaction.user.id;

            // Get warning templates
            const [templates] = await pool.execute('SELECT id, title, description FROM warning_templates');
            
            if (templates.length === 0) {
                return interaction.reply({
                    content: 'No warning templates found. Please create some templates first.',
                    ephemeral: true
                });
            }

            // Create select menu for warning templates
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('warning_template')
                .setPlaceholder('Select a warning template')
                .addOptions(templates.map(template => ({
                    label: template.title.length > 100 ? template.title.substring(0, 97) + '...' : template.title,
                    description: template.description.length > 100 ? template.description.substring(0, 97) + '...' : template.description,
                    value: template.id.toString()
                })));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Send initial message with template selection
            const response = await interaction.reply({
                content: `Please select a warning template for ${targetUser.tag}`,
                components: [row],
                ephemeral: true
            });

            // Collect template selection
            const filter = i => i.user.id === interaction.user.id;
            const collector = response.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId === 'warning_template') {
                        const templateId = parseInt(i.values[0]);
                        const selectedTemplate = templates.find(t => t.id === templateId);

                        if (!selectedTemplate) {
                            await i.reply({
                                content: 'Error: Selected template not found. Please try again.',
                                ephemeral: true
                            });
                            return;
                        }

                        // Create confirmation embed
                        const confirmEmbed = new EmbedBuilder()
                            .setTitle('Warning Confirmation')
                            .setDescription(`Please confirm the warning details for ${targetUser.tag}`)
                            .addFields(
                                { name: 'Template', value: selectedTemplate.title, inline: true },
                                { name: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
                                { name: 'Comments', value: comments, inline: false }
                            )
                            .setColor(severity === 'high' ? '#ff0000' : severity === 'medium' ? '#ffa500' : '#ffff00')
                            .setTimestamp();

                        // Create confirmation buttons
                        const confirmButtons = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('confirm_warning')
                                    .setLabel('Confirm')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId('cancel_warning')
                                    .setLabel('Cancel')
                                    .setStyle(ButtonStyle.Danger)
                            );

                        await i.update({
                            content: null,
                            embeds: [confirmEmbed],
                            components: [confirmButtons]
                        });

                        // Handle confirmation
                        const confirmCollector = i.message.createMessageComponentCollector({ filter, time: 60000 });

                        confirmCollector.on('collect', async (j) => {
                            try {
                                if (j.customId === 'confirm_warning') {
                                    await processWarning(interaction, targetUser, selectedTemplate, comments, severity, moderatorId);
                                    await j.update({
                                        content: 'Warning has been issued successfully.',
                                        embeds: [],
                                        components: []
                                    });
                                } else {
                                    await j.update({
                                        content: 'Warning cancelled.',
                                        embeds: [],
                                        components: []
                                    });
                                }
                            } catch (error) {
                                logger.error('Error in confirmation handler:', error);
                                await j.update({
                                    content: 'There was an error processing your confirmation. Please try the command again.',
                                    embeds: [],
                                    components: []
                                });
                            }
                        });
                    }
                } catch (error) {
                    logger.error('Error in template selection handler:', error);
                    await i.reply({
                        content: 'There was an error processing your selection. Please try the command again.',
                        ephemeral: true
                    });
                }
            });

            collector.on('end', async () => {
                try {
                    await response.edit({
                        content: 'Warning command timed out. Please try again.',
                        components: []
                    });
                } catch (error) {
                    logger.error('Error in collector end handler:', error);
                }
            });
        } catch (error) {
            logger.error('Error in warn command:', error);
            await interaction.reply({
                content: 'There was an error while processing the warning!',
                ephemeral: true
            });
        }
    },
};

async function processWarning(interaction, targetUser, template, comments, severity, moderatorId) {
    try {
        // Update user information
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

        // Record the warning
        await pool.execute(
            'INSERT INTO user_warnings (user_id, template_id, issued_by, notes, severity) VALUES (?, ?, ?, ?, ?)',
            [targetUser.id, template.id, moderatorId, comments, severity]
        );

        // Create embeds
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
                    name: "Severity Level",
                    value: severity.charAt(0).toUpperCase() + severity.slice(1),
                    inline: false
                },
                {
                    name: "Additional Notes",
                    value: comments || "No additional notes provided",
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
                },
                {
                    name: "Severity Level",
                    value: severity.charAt(0).toUpperCase() + severity.slice(1),
                    inline: false
                }
            )
            .setColor("#6e00f5")
            .setFooter({
                text: "Warning system powered by Cipher",
                iconURL: "https://i.imgur.com/HwsaWNp.png"
            })
            .setTimestamp();

        if (comments) {
            userEmbed.addFields({
                name: "Additional Notes",
                value: comments,
                inline: false
            });
        }

        // Create action buttons
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

        // Send DM to user
        try {
            const message = await targetUser.send({ 
                embeds: [userEmbed],
                components: [buttons]
            });

            // Set up button collector
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
                            },
                            {
                                name: "Severity Level",
                                value: severity.charAt(0).toUpperCase() + severity.slice(1),
                                inline: false
                            }
                        )
                        .setColor("#00f56a")
                        .setFooter({
                            text: "Warning system powered by Cipher",
                            iconURL: "https://i.imgur.com/HwsaWNp.png"
                        })
                        .setTimestamp();

                    if (comments) {
                        acknowledgeEmbed.addFields({
                            name: "Additional Notes",
                            value: comments,
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
                                name: "Severity Level",
                                value: severity.charAt(0).toUpperCase() + severity.slice(1),
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

                    if (comments) {
                        questionEmbed.addFields({
                            name: "Additional Notes",
                            value: comments,
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

        // Send confirmation to moderator
        await interaction.followUp({ embeds: [moderatorEmbed] });
        logger.info(`Warning issued to ${targetUser.tag} by ${interaction.user.tag} - Template: ${template.title}, Severity: ${severity}`);

    } catch (error) {
        logger.error('Error processing warning:', error);
        throw error;
    }
} 