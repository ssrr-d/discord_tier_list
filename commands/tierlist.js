```javascript
const { SlashCommandBuilder, ActionRowBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { drawTierList } = require('../utils/tierListCanvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tierlist')
        .setDescription('Start a new Tier List session')
        .addStringOption(option => 
            option.setName('tiers')
                .setDescription('Comma separated tier names (e.g. S,A,B,C,D)')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        // Parse tiers
        const tiersInput = interaction.options.getString('tiers');
        const tierLabels = tiersInput ? tiersInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : ['S', 'A', 'B', 'C', 'D'];

        if (tierLabels.length === 0 || tierLabels.length > 10) {
             return interaction.editReply({ content: 'Please provide between 1 and 10 tier names.' });
        }

        // Initial empty state
        const tierData = {};
        tierLabels.forEach(label => tierData[label] = []);

        // Draw initial image
        const imageBuffer = await drawTierList(tierData, tierLabels);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'tierlist.png' });

        // Components
        const userSelect = new UserSelectMenuBuilder()
            .setCustomId('tier_select_user')
            .setPlaceholder('Select a user to rank')
            .setMinValues(1)
            .setMaxValues(1);

        const row1 = new ActionRowBuilder().addComponents(userSelect);

        // Dynamic Buttons
        const buttonRows = [];
        let currentRow = new ActionRowBuilder();
        
        tierLabels.forEach((label, index) => {
            if (currentRow.components.length >= 5) {
                buttonRows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`tier_btn_${ index } `) // Use index to reference label
                    .setLabel(label.substring(0, 80)) // Discord limit
                    .setStyle(ButtonStyle.Primary)
            );
        });
        buttonRows.push(currentRow);

        // Add Finish button to a new row if needed, or append to last if space exists
        let finishRow;
        if (buttonRows[buttonRows.length - 1].components.length < 5) {
            finishRow = buttonRows[buttonRows.length - 1];
        } else {
            finishRow = new ActionRowBuilder();
            buttonRows.push(finishRow);
        }
        
        finishRow.addComponents(
            new ButtonBuilder().setCustomId('tier_btn_finish').setLabel('Finish').setStyle(ButtonStyle.Success)
        );

        // Send message
        const message = await interaction.editReply({
            content: 'Select a user and then click a Tier button!',
            files: [attachment],
            components: [row1, ...buttonRows]
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
            tierLabels, // Store labels to map back from index
            selectedUser: null,
            ownerId: interaction.user.id
        });
    },
};
```
