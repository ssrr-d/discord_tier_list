require('dotenv').config();
const { Client, GatewayIntentBits, Collection, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { sessionManager } = require('./utils/sessionManager');
const { drawTierList } = require('./utils/tierListCanvas');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.once('ready', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Fetch all guild members for all guilds
    for (const guild of client.guilds.cache.values()) {
        try {
            await guild.members.fetch();
            console.log(`Fetched ${guild.members.cache.size} members from ${guild.name}`);
        } catch (error) {
            console.error(`Failed to fetch members from ${guild.name}:`, error);
        }
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'edit_tier_names_modal') {
                const session = sessionManager.get(interaction.message.id);
                if (!session) {
                    return interaction.reply({ content: 'Session expired or not found.', ephemeral: true });
                }

                // Get new tier names from modal
                const newNamesInput = interaction.fields.getTextInputValue('tier_names_input');
                const newTierLabels = newNamesInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

                if (newTierLabels.length !== session.tierLabels.length) {
                    return interaction.reply({
                        content: `Tier数が一致しません。現在: ${session.tierLabels.length}個、入力: ${newTierLabels.length}個`,
                        ephemeral: true
                    });
                }

                // Update tier data with new labels
                const newTierData = {};
                session.tierLabels.forEach((oldLabel, index) => {
                    const newLabel = newTierLabels[index];
                    newTierData[newLabel] = session.tierData[oldLabel] || [];
                });

                session.tierData = newTierData;
                session.tierLabels = newTierLabels;

                // Redraw
                await interaction.deferUpdate();
                const imageBuffer = await drawTierList(session.tierData, session.tierLabels);
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'tierlist.png' });

                // Rebuild buttons with new labels
                const buttonRows = [];
                let currentRow = new ActionRowBuilder();

                newTierLabels.forEach((label, index) => {
                    if (currentRow.components.length >= 5) {
                        buttonRows.push(currentRow);
                        currentRow = new ActionRowBuilder();
                    }
                    currentRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`tier_btn_${index}`)
                            .setLabel(label.substring(0, 80))
                            .setStyle(ButtonStyle.Primary)
                    );
                });
                buttonRows.push(currentRow);

                let finishRow;
                if (buttonRows[buttonRows.length - 1].components.length < 5) {
                    finishRow = buttonRows[buttonRows.length - 1];
                } else {
                    finishRow = new ActionRowBuilder();
                    buttonRows.push(finishRow);
                }

                finishRow.addComponents(
                    new ButtonBuilder().setCustomId('tier_btn_edit_names').setLabel('Tier名編集').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('tier_btn_show_unranked').setLabel('未配置メンバー').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('tier_btn_finish').setLabel('Finish').setStyle(ButtonStyle.Success)
                );

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId('tier_select_user')
                    .setPlaceholder('Select a user to rank')
                    .setMinValues(1)
                    .setMaxValues(1);

                const row1 = new ActionRowBuilder().addComponents(userSelect);

                await interaction.editReply({
                    files: [attachment],
                    components: [row1, ...buttonRows]
                });
            }
        } else if (interaction.isUserSelectMenu()) {
            if (interaction.customId === 'tier_select_user') {
                const session = sessionManager.get(interaction.message.id);
                if (!session) {
                    return interaction.reply({ content: 'Session expired or not found.', ephemeral: true });
                }

                if (interaction.user.id !== session.ownerId) {
                    return interaction.reply({ content: 'Only the session owner can edit this tier list.', ephemeral: true });
                }

                const userId = interaction.values[0];
                const member = interaction.guild.members.cache.get(userId);

                if (!member) {
                    return interaction.reply({ content: 'Member not found.', ephemeral: true });
                }

                session.selectedUser = {
                    id: member.id,
                    username: member.user.username,
                    avatarUrl: member.displayAvatarURL({ extension: 'png' })
                };

                // Silently acknowledge
                await interaction.deferUpdate();
            }
        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith('tier_btn_')) {
                if (interaction.customId === 'tier_btn_edit_names') {
                    const session = sessionManager.get(interaction.message.id);
                    if (!session) {
                        return interaction.reply({ content: 'Session expired or not found.', ephemeral: true });
                    }

                    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

                    const modal = new ModalBuilder()
                        .setCustomId('edit_tier_names_modal')
                        .setTitle('Tier名を編集');

                    const tierNamesInput = new TextInputBuilder()
                        .setCustomId('tier_names_input')
                        .setLabel('Tier名（カンマ区切り）')
                        .setStyle(TextInputStyle.Short)
                        .setValue(session.tierLabels.join(', '))
                        .setRequired(true);

                    const row = new ActionRowBuilder().addComponents(tierNamesInput);
                    modal.addComponents(row);

                    await interaction.showModal(modal);
                } else if (interaction.customId === 'tier_btn_show_unranked') {
                    const session = sessionManager.get(interaction.message.id);
                    if (!session) {
                        return interaction.reply({ content: 'Session expired or not found.', ephemeral: true });
                    }

                    // Get all ranked user IDs
                    const rankedUserIds = new Set();
                    for (const tier in session.tierData) {
                        session.tierData[tier].forEach(user => rankedUserIds.add(user.id));
                    }

                    // Use cached guild members
                    const guild = interaction.guild;
                    const allMembers = guild.members.cache.filter(m => !m.user.bot);

                    // Find unranked members
                    const unrankedMembers = allMembers.filter(m => !rankedUserIds.has(m.id));

                    if (unrankedMembers.size === 0) {
                        return interaction.reply({ content: '全員配置済みです！', ephemeral: true });
                    }

                    const unrankedList = unrankedMembers.map(m => `• ${m.user.username}`).join('\n');
                    return interaction.reply({
                        content: `**未配置メンバー (${unrankedMembers.size}人):**\n${unrankedList}`,
                        ephemeral: true
                    });
                } else if (interaction.customId === 'tier_btn_finish') {
                    const session = sessionManager.get(interaction.message.id);
                    if (!session) {
                        return interaction.reply({ content: 'Session expired or not found.', ephemeral: true });
                    }

                    // Remove components
                    await interaction.update({
                        content: 'Tier List Finalized!',
                        components: []
                    });

                    sessionManager.delete(interaction.message.id);
                } else {
                    // Tier selection buttons (tier_btn_INDEX)
                    const session = sessionManager.get(interaction.message.id);
                    if (!session) {
                        return interaction.reply({ content: 'Session expired or not found.', ephemeral: true });
                    }

                    if (!session.selectedUser) {
                        return interaction.reply({ content: 'Please select a user first!', ephemeral: true });
                    }

                    const tierIndex = parseInt(interaction.customId.split('_')[2]);
                    const tierLabel = session.tierLabels[tierIndex];

                    if (!tierLabel) {
                        return interaction.reply({ content: 'Invalid tier.', ephemeral: true });
                    }

                    const user = session.selectedUser;

                    // Remove user from other tiers
                    for (const t in session.tierData) {
                        session.tierData[t] = session.tierData[t].filter(u => u.id !== user.id);
                    }

                    // Add to new tier
                    session.tierData[tierLabel].push(user);

                    // Redraw
                    await interaction.deferUpdate();
                    const imageBuffer = await drawTierList(session.tierData, session.tierLabels);
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'tierlist.png' });

                    await interaction.editReply({
                        files: [attachment]
                    });
                }
            }
        }
    } catch (error) {
        console.error('Interaction Error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred.', ephemeral: true });
        } else {
            await interaction.followUp({ content: 'An error occurred.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
