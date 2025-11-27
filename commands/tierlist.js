const { SlashCommandBuilder, ActionRowBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { drawTierList } = require('../utils/tierListCanvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tierlist')
        .setDescription('Start a new Tier List session'),
    async execute(interaction) {
        await interaction.deferReply();

        // Initial empty state
        const tierData = {
            S: [], A: [], B: [], C: [], D: []
        };

        // Draw initial image
        const imageBuffer = await drawTierList(tierData);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'tierlist.png' });

        // Components
        const userSelect = new UserSelectMenuBuilder()
            .setCustomId('tier_select_user')
            .setPlaceholder('Select a user to rank')
            .setMinValues(1)
            .setMaxValues(1);

        const row1 = new ActionRowBuilder().addComponents(userSelect);

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tier_btn_S').setLabel('S').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('tier_btn_A').setLabel('A').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tier_btn_B').setLabel('B').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tier_btn_C').setLabel('C').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tier_btn_D').setLabel('D').setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tier_btn_finish').setLabel('Finish').setStyle(ButtonStyle.Success)
        );

        // Send message
        const message = await interaction.editReply({
            content: 'Select a user and then click a Tier button!',
            files: [attachment],
            components: [row1, row2, row3]
        });

        // Initialize session state (we need a way to store this globally or handle it in the interaction event)
        // For now, we will rely on the interaction handler to reconstruct or fetch state.
        // Since we don't have a database, we'll use a global Map in index.js or a singleton.
        // For this prototype, let's assume we can't easily share state without a singleton.
        // We will implement a simple state manager in the next step.

        // Store initial state
        const { sessionManager } = require('../utils/sessionManager');
        sessionManager.set(message.id, {
            tierData,
            selectedUser: null,
            ownerId: interaction.user.id
        });
    },
};
