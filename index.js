require('dotenv').config();
const { Client, GatewayIntentBits, Collection, AttachmentBuilder } = require('discord.js');
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

client.once('ready', () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
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
                if (interaction.customId === 'tier_btn_finish') {
                    const session = sessionManager.get(interaction.message.id);
                    if (!session) {
                        return interaction.reply({ content: 'Session expired or not found.', ephemeral: true });
                    }

                    if (interaction.user.id !== session.ownerId) {
                        return interaction.reply({ content: 'Only the session owner can finish this tier list.', ephemeral: true });
                    }

                    // Remove components
                    await interaction.update({
                        content: 'Tier List Finalized!',
                        components: []
                    });

                    sessionManager.delete(interaction.message.id);
                } else {
                    // Tier selection buttons (S, A, B, C, D)
                    const session = sessionManager.get(interaction.message.id);
                    if (!session) {
                        return interaction.reply({ content: 'Session expired or not found.', ephemeral: true });
                    }

                    if (interaction.user.id !== session.ownerId) {
                        return interaction.reply({ content: 'Only the session owner can edit this tier list.', ephemeral: true });
                    }

                    if (!session.selectedUser) {
                        return interaction.reply({ content: 'Please select a user first!', ephemeral: true });
                    }

                    const tier = interaction.customId.split('_')[2]; // S, A, B, C, D
                    const user = session.selectedUser;

                    // Remove user from other tiers
                    for (const t in session.tierData) {
                        session.tierData[t] = session.tierData[t].filter(u => u.id !== user.id);
                    }

                    // Add to new tier
                    session.tierData[tier].push(user);

                    // Redraw
                    await interaction.deferUpdate();
                    const imageBuffer = await drawTierList(session.tierData);
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
