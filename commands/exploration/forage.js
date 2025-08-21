
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const foragingSpots = [
    {
        id: 'meadow',
        name: 'Peaceful Meadow',
        energy: 10,
        level: 1,
        items: [
            { name: 'Healing Herbs', rarity: 'common', value: 15, chance: 40, emoji: '🌿' },
            { name: 'Wild Berries', rarity: 'common', value: 8, chance: 50, emoji: '🫐' },
            { name: 'Flower Petals', rarity: 'common', value: 5, chance: 30, emoji: '🌸' }
        ],
        rarity: 'Common',
        emoji: '🌸',
        color: 0x98FB98,
        description: 'A serene meadow filled with common herbs and flowers'
    },
    {
        id: 'woodland',
        name: 'Dense Woodland',
        energy: 20,
        level: 3,
        items: [
            { name: 'Rare Mushrooms', rarity: 'uncommon', value: 35, chance: 25, emoji: '🍄' },
            { name: 'Ancient Bark', rarity: 'uncommon', value: 40, chance: 20, emoji: '🌳' },
            { name: 'Medicinal Roots', rarity: 'uncommon', value: 30, chance: 30, emoji: '🌱' }
        ],
        rarity: 'Uncommon',
        emoji: '🌲',
        color: 0x228B22,
        description: 'A mysterious forest with valuable botanical treasures'
    },
    {
        id: 'grove',
        name: 'Mystic Grove',
        energy: 30,
        level: 6,
        items: [
            { name: 'Magic Moss', rarity: 'rare', value: 80, chance: 15, emoji: '✨' },
            { name: 'Fairy Dust', rarity: 'rare', value: 120, chance: 10, emoji: '🧚' },
            { name: 'Enchanted Berries', rarity: 'rare', value: 100, chance: 12, emoji: '🔮' }
        ],
        rarity: 'Rare',
        emoji: '✨',
        color: 0x9370DB,
        description: 'An enchanted grove where magic permeates nature'
    },
    {
        id: 'garden',
        name: 'Sacred Garden',
        energy: 50,
        level: 10,
        items: [
            { name: 'Divine Herbs', rarity: 'legendary', value: 200, chance: 8, emoji: '🌟' },
            { name: 'Phoenix Feathers', rarity: 'legendary', value: 300, chance: 5, emoji: '🔥' },
            { name: 'Celestial Fruit', rarity: 'legendary', value: 250, chance: 6, emoji: '🍎' }
        ],
        rarity: 'Legendary',
        emoji: '🌺',
        color: 0xFFD700,
        description: 'A divine sanctuary with the rarest botanical wonders'
    }
];

const tools = {
    basic_basket: { name: 'Wicker Basket', efficiency: 1.0, capacity: 10 },
    sturdy_sack: { name: 'Sturdy Sack', efficiency: 1.2, capacity: 15 },
    magical_pouch: { name: 'Magical Pouch', efficiency: 1.5, capacity: 25 },
    ethereal_container: { name: 'Ethereal Container', efficiency: 2.0, capacity: 50 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forage')
        .setDescription('🌿 Forage for herbs, berries, and natural materials')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose a foraging location')
                .setRequired(false)
                .addChoices(
                    { name: '🌸 Peaceful Meadow (Level 1+)', value: 'meadow' },
                    { name: '🌲 Dense Woodland (Level 3+)', value: 'woodland' },
                    { name: '✨ Mystic Grove (Level 6+)', value: 'grove' },
                    { name: '🌺 Sacred Garden (Level 10+)', value: 'garden' }
                ))
        .addIntegerOption(option =>
            option.setName('sessions')
                .setDescription('Number of foraging sessions')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(5)),
    
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const location = interaction.options.getString('location');
            const sessions = interaction.options.getInteger('sessions') || 1;

            let userData = await db.getPlayer(userId);
            if (!userData) {
                userData = {
                    inventory: { coins: 100, items: [] },
                    foraging: { level: 1, experience: 0, energy: 100, tools: ['basic_basket'], equipped: 'basic_basket' },
                    cooldowns: {}
                };
                await db.setPlayer(userId, userData);
            }

            // Initialize foraging data
            if (!userData.foraging) {
                userData.foraging = {
                    level: 1,
                    experience: 0,
                    energy: 100,
                    tools: ['basic_basket'],
                    equipped: 'basic_basket',
                    lastEnergyRegen: Date.now(),
                    totalItems: 0,
                    rareFinds: 0
                };
            }

            // Regenerate energy
            this.regenerateEnergy(userData);

            if (!location) {
                await this.showForagingMenu(interaction, userData);
                return;
            }

            const spot = foragingSpots.find(s => s.id === location);
            if (!spot) {
                await interaction.reply({ content: '❌ Invalid location selected!', ephemeral: true });
                return;
            }

            // Check requirements
            if (userData.foraging.level < spot.level) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('🚫 Location Locked')
                    .setDescription(`You need foraging level **${spot.level}** to access ${spot.name}!`)
                    .addFields(
                        { name: '🎯 Your Level', value: `${userData.foraging.level}`, inline: true },
                        { name: '📈 Required Level', value: `${spot.level}`, inline: true },
                        { name: '💡 Tip', value: 'Forage at easier locations to gain experience!', inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const totalEnergyCost = spot.energy * sessions;
            if (userData.foraging.energy < totalEnergyCost) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('⚡ Insufficient Energy')
                    .setDescription(`You need **${totalEnergyCost}** energy but only have **${userData.foraging.energy}**!`)
                    .addFields(
                        { name: '⏰ Energy Regeneration', value: '1 energy every 5 minutes', inline: true },
                        { name: '🍯 Energy Items', value: 'Use energy potions to restore instantly!', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            await interaction.deferReply();

            // Perform foraging
            const results = this.performForaging(userData, spot, sessions);

            // Update user data
            userData.foraging.energy -= totalEnergyCost;
            userData.foraging.experience += results.experience;
            userData.foraging.totalItems += results.items.length;
            userData.foraging.rareFinds += results.rareItems;
            userData.inventory.coins += results.totalValue;

            // Add items to inventory
            if (!userData.inventory.items) userData.inventory.items = [];
            results.items.forEach(item => {
                userData.inventory.items.push({
                    id: item.name.toLowerCase().replace(/\s+/g, '_'),
                    name: item.name,
                    category: 'foraged',
                    value: item.value,
                    rarity: item.rarity,
                    emoji: item.emoji,
                    foragedAt: Date.now(),
                    location: location
                });
            });

            // Check for level up
            const newLevel = Math.floor(userData.foraging.experience / 150) + 1;
            const leveledUp = newLevel > userData.foraging.level;
            if (leveledUp) {
                userData.foraging.level = newLevel;
            }

            await db.setPlayer(userId, userData);

            // Create results embed
            const embed = new EmbedBuilder()
                .setColor(results.rareItems > 0 ? '#FFD700' : spot.color)
                .setTitle(`🌿 Foraging Results: ${spot.name}`)
                .setDescription(`**${sessions} foraging session${sessions > 1 ? 's' : ''} completed**\n${results.specialEvent ? `✨ ${results.specialEvent}` : ''}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '📊 Session Summary',
                        value: `📍 **Location:** ${spot.name}\n🔄 **Sessions:** ${sessions}\n⚡ **Energy Used:** ${totalEnergyCost}\n🎯 **Level:** ${userData.foraging.level}${leveledUp ? ' 🎉 **LEVEL UP!**' : ''}`,
                        inline: true
                    },
                    {
                        name: '🎒 Items Collected',
                        value: `📦 **Total Items:** ${results.items.length}\n💎 **Rare Finds:** ${results.rareItems}\n💰 **Total Value:** ${results.totalValue} coins\n⭐ **Best Find:** ${results.bestValue} coins`,
                        inline: true
                    },
                    {
                        name: '📈 Progress',
                        value: `🎯 **XP Gained:** +${results.experience}\n📊 **Total XP:** ${userData.foraging.experience}\n🏆 **Total Items:** ${userData.foraging.totalItems}\n💎 **Rare Finds:** ${userData.foraging.rareFinds}`,
                        inline: true
                    }
                );

            // Add detailed item breakdown
            if (results.items.length > 0) {
                const itemsByRarity = this.groupItemsByRarity(results.items);
                let itemText = '';

                Object.entries(itemsByRarity).forEach(([rarity, items]) => {
                    const rarityEmoji = this.getRarityEmoji(rarity);
                    itemText += `${rarityEmoji} **${rarity.toUpperCase()}** (${items.length})\n`;
                    items.forEach(item => {
                        itemText += `   ${item.emoji} ${item.name} *(${item.value} coins)*\n`;
                    });
                    itemText += '\n';
                });

                embed.addFields({
                    name: '🌱 Items Found',
                    value: itemText || 'No items found this time!',
                    inline: false
                });
            }

            // Action buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('forage_again')
                        .setLabel('🌿 Forage Again')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(userData.foraging.energy < spot.energy),
                    new ButtonBuilder()
                        .setCustomId('foraging_stats')
                        .setLabel('📊 View Stats')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('craft_items')
                        .setLabel('🔨 Craft Items')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(results.items.length === 0),
                    new ButtonBuilder()
                        .setCustomId('sell_items')
                        .setLabel('💰 Sell Items')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(results.totalValue === 0)
                );

            await interaction.editReply({ embeds: [embed], components: [buttons] });

        } catch (error) {
            console.error('Foraging command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while foraging. Please try again.',
                ephemeral: true
            });
        }
    },

    async showForagingMenu(interaction, userData) {
        const embed = new EmbedBuilder()
            .setColor('#228B22')
            .setTitle('🌿 Nature\'s Bounty Foraging Center')
            .setDescription('╔═══════════════════════════════════════╗\n║         **FORAGING HEADQUARTERS**          ║\n╚═══════════════════════════════════════╝')
            .setThumbnail('https://cdn.discordapp.com/emojis/🌿.png')
            .addFields(
                {
                    name: '🎯 **Foraging Stats**',
                    value: `**Level:** ${userData.foraging.level}\n**Experience:** ${userData.foraging.experience}\n**Energy:** ${userData.foraging.energy}/100 ⚡\n**Tool:** ${tools[userData.foraging.equipped]?.name || 'Basic Basket'}`,
                    inline: true
                },
                {
                    name: '🏆 **Achievements**',
                    value: `**Total Items:** ${userData.foraging.totalItems || 0}\n**Rare Finds:** ${userData.foraging.rareFinds || 0}\n**Locations Unlocked:** ${this.getUnlockedLocations(userData.foraging.level)}/4\n**Master Forager:** ${userData.foraging.level >= 15 ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '💼 **Equipment**',
                    value: `**Current Tool:** ${tools[userData.foraging.equipped]?.name}\n**Efficiency:** ${tools[userData.foraging.equipped]?.efficiency}x\n**Capacity:** ${tools[userData.foraging.equipped]?.capacity} items\n**Upgrades:** Available`,
                    inline: true
                }
            );

        // Add location information
        let locationsText = '';
        foragingSpots.forEach(spot => {
            const canAccess = userData.foraging.level >= spot.level;
            const energyAffordable = userData.foraging.energy >= spot.energy;
            const status = canAccess ? (energyAffordable ? '✅' : '⚡') : '🔒';
            
            locationsText += `${status} ${spot.emoji} **${spot.name}** *(Level ${spot.level}+)*\n`;
            locationsText += `   Energy: ${spot.energy} • Rarity: ${spot.rarity}\n`;
            locationsText += `   ${spot.description}\n\n`;
        });

        embed.addFields({
            name: '🗺️ **Available Locations**',
            value: locationsText,
            inline: false
        });

        const locationSelect = new StringSelectMenuBuilder()
            .setCustomId('foraging_location')
            .setPlaceholder('🎯 Select a foraging location')
            .addOptions(
                foragingSpots.map(spot => ({
                    label: spot.name,
                    value: spot.id,
                    description: `Level ${spot.level}+ • Energy: ${spot.energy} • ${spot.rarity}`,
                    emoji: spot.emoji
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('foraging_equipment')
                    .setLabel('Manage Equipment')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎒'),
                new ButtonBuilder()
                    .setCustomId('foraging_recipes')
                    .setLabel('Crafting Recipes')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📜'),
                new ButtonBuilder()
                    .setCustomId('energy_potions')
                    .setLabel('Energy Potions')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🍯')
            );

        const selectRow = new ActionRowBuilder().addComponents(locationSelect);

        await interaction.reply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    performForaging(userData, spot, sessions) {
        const tool = tools[userData.foraging.equipped] || tools.basic_basket;
        const results = {
            items: [],
            totalValue: 0,
            experience: sessions * 20,
            rareItems: 0,
            bestValue: 0
        };

        for (let session = 0; session < sessions; session++) {
            for (const item of spot.items) {
                const chance = item.chance * tool.efficiency;
                if (Math.random() * 100 < chance) {
                    results.items.push(item);
                    results.totalValue += item.value;
                    results.bestValue = Math.max(results.bestValue, item.value);
                    
                    if (['rare', 'legendary'].includes(item.rarity)) {
                        results.rareItems++;
                        results.experience += 15;
                    }
                }
            }
        }

        // Special events
        if (Math.random() < 0.12) {
            const events = [
                'You discover a hidden grove with extra resources!',
                'A nature spirit blesses your foraging efforts!',
                'Perfect weather conditions boost your efficiency!',
                'You find traces of a rare botanical specimen!',
                'Ancient druidic knowledge guides your gathering!'
            ];
            results.specialEvent = events[Math.floor(Math.random() * events.length)];
            results.experience += 25;
        }

        return results;
    },

    regenerateEnergy(userData) {
        const now = Date.now();
        const timePassed = now - (userData.foraging.lastEnergyRegen || now);
        const energyToRegen = Math.floor(timePassed / (5 * 60 * 1000)); // 1 energy per 5 minutes
        
        userData.foraging.energy = Math.min(100, userData.foraging.energy + energyToRegen);
        userData.foraging.lastEnergyRegen = now;
    },

    groupItemsByRarity(items) {
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.rarity]) grouped[item.rarity] = [];
            grouped[item.rarity].push(item);
        });
        return grouped;
    },

    getRarityEmoji(rarity) {
        const emojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            legendary: '🟣'
        };
        return emojis[rarity] || '⚪';
    },

    getUnlockedLocations(level) {
        return foragingSpots.filter(spot => level >= spot.level).length;
    }
};
