
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inn')
        .setDescription('Rest at the inn to restore health and mana')
        .addStringOption(option =>
            option
                .setName('room')
                .setDescription('Choose your room type')
                .setRequired(false)
                .addChoices(
                    { name: 'Basic Room (50 coins)', value: 'basic' },
                    { name: 'Comfort Room (100 coins)', value: 'comfort' },
                    { name: 'Luxury Suite (200 coins)', value: 'luxury' }
                )),

    async execute(interaction) {
        try {
            const roomType = interaction.options.getString('room');
            const player = await db.getPlayer(interaction.user.id);

            if (!player) {
                return await interaction.reply({
                    content: '❌ You need to start your adventure first! Use `/profile` to begin.',
                    flags: 64
                });
            }

            if (!roomType) {
                return await this.showInnMenu(interaction, player);
            }

            await this.restAtInn(interaction, player, roomType);

        } catch (error) {
            console.error('Inn command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while visiting the inn.',
                flags: 64
            });
        }
    },

    async showInnMenu(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🏨 The Weary Traveler Inn')
            .setDescription('Welcome to our inn! Choose a room to rest and recover.')
            .addFields([
                { name: '🛏️ Basic Room', value: '50 coins - Restores 50 HP/MP', inline: true },
                { name: '🛏️ Comfort Room', value: '100 coins - Restores 75 HP/MP + buff', inline: true },
                { name: '🛏️ Luxury Suite', value: '200 coins - Full restore + premium buff', inline: true },
                { name: '💰 Your Coins', value: `${player.coins || 0}`, inline: false },
                { name: '❤️ Current Health', value: `${player.health || 100}/${player.maxHealth || 100}`, inline: true },
                { name: '💙 Current Mana', value: `${player.mana || 100}/${player.maxMana || 100}`, inline: true }
            ])
            .setThumbnail('🏨')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('inn_basic')
                    .setLabel('Basic Room (50)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛏️'),
                new ButtonBuilder()
                    .setCustomId('inn_comfort')
                    .setLabel('Comfort Room (100)')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛏️'),
                new ButtonBuilder()
                    .setCustomId('inn_luxury')
                    .setLabel('Luxury Suite (200)')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👑')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async restAtInn(interaction, player, roomType) {
        const roomCosts = {
            basic: { cost: 50, healthRestore: 50, manaRestore: 50, buff: null },
            comfort: { cost: 100, healthRestore: 75, manaRestore: 75, buff: 'comfort' },
            luxury: { cost: 200, healthRestore: 999, manaRestore: 999, buff: 'luxury' }
        };

        const room = roomCosts[roomType];
        if (!room) {
            return await interaction.reply({
                content: '❌ Invalid room type selected.',
                flags: 64
            });
        }

        if (player.coins < room.cost) {
            return await interaction.reply({
                content: `❌ You need ${room.cost} coins to stay in this room! You have ${player.coins} coins.`,
                flags: 64
            });
        }

        // Calculate restored values
        const currentHealth = player.health || 100;
        const currentMana = player.mana || 100;
        const maxHealth = player.maxHealth || 100;
        const maxMana = player.maxMana || 100;

        const newHealth = Math.min(maxHealth, currentHealth + room.healthRestore);
        const newMana = Math.min(maxMana, currentMana + room.manaRestore);

        // Update player data
        const updateData = {
            coins: player.coins - room.cost,
            health: newHealth,
            mana: newMana
        };

        // Add buff if applicable
        if (room.buff) {
            if (!player.buffs) player.buffs = [];
            player.buffs.push({
                type: room.buff,
                expires: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
                value: room.buff === 'luxury' ? 20 : 10
            });
            updateData.buffs = player.buffs;
        }

        await db.updatePlayer(interaction.user.id, updateData);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('😴 Well Rested!')
            .setDescription(`You had a great rest in the ${roomType} room!`)
            .addFields([
                { name: '❤️ Health Restored', value: `${currentHealth} → ${newHealth}`, inline: true },
                { name: '💙 Mana Restored', value: `${currentMana} → ${newMana}`, inline: true },
                { name: '💰 Cost', value: `${room.cost} coins`, inline: true }
            ]);

        if (room.buff) {
            embed.addFields([
                { name: '✨ Buff Received', value: `${room.buff} bonus (2 hours)`, inline: false }
            ]);
        }

        await interaction.reply({ embeds: [embed] });
    }
};
