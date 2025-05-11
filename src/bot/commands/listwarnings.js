const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const pool = require('../../database/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listwarnings')
        .setDescription('List all available warning templates')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        try {
            const [templates] = await pool.execute(
                'SELECT id, title, description FROM warning_templates ORDER BY id'
            );

            if (templates.length === 0) {
                return interaction.reply({
                    content: 'No warning templates found.',
                    ephemeral: true
                });
            }

            const templatesPerPage = 5;
            const pages = [];
            for (let i = 0; i < templates.length; i += templatesPerPage) {
                const pageTemplates = templates.slice(i, i + templatesPerPage);
                const embed = new EmbedBuilder()
                    .setColor(0x6e00f5)
                    .setTitle('Warning Templates')
                    .setDescription(`Page ${Math.floor(i / templatesPerPage) + 1} of ${Math.ceil(templates.length / templatesPerPage)}`)
                    .setFooter({
                        text: "Warning system powered by Cipher",
                        iconURL: "https://i.imgur.com/HwsaWNp.png"
                    })
                    .setTimestamp();

                pageTemplates.forEach(template => {
                    embed.addFields({
                        name: `ID: ${template.id} - ${template.title}`,
                        value: template.description.length > 1024 ? template.description.substring(0, 1021) + '...' : template.description
                    });
                });

                pages.push(embed);
            }

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pages.length === 1)
                );

            const response = await interaction.reply({
                embeds: [pages[0]],
                components: pages.length > 1 ? [buttons] : [],
                ephemeral: true
            });

            if (pages.length === 1) return;

            const filter = i => i.user.id === interaction.user.id;
            const collector = response.createMessageComponentCollector({ filter, time: 60000 });

            let currentPage = 0;

            collector.on('collect', async (i) => {
                if (i.customId === 'prev') {
                    currentPage--;
                } else if (i.customId === 'next') {
                    currentPage++;
                }

                buttons.components[0].setDisabled(currentPage === 0);
                buttons.components[1].setDisabled(currentPage === pages.length - 1);

                await i.update({
                    embeds: [pages[currentPage]],
                    components: [buttons]
                });
            });

            collector.on('end', async () => {
                try {
                    await interaction.editReply({
                        components: []
                    });
                } catch (error) {
                    logger.error('Error removing components after timeout:', error);
                }
            });

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