
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const MINING_LOCATIONS = {
    copper_mine: {
        name: '🟤 Copper Mine',
        description: 'A beginner-friendly mine with abundant copper deposits',
        level_required: 1,
        energy_cost: 10,
        color: 0xB87333,
        rewards: {
            copper_ore: { chance: 70, amount: [1, 3], value: 10 },
            iron_ore: { chance: 20, amount: [1, 2], value: 25 },
            gems: { chance: 5, amount: [1, 1], value: 50 },
            coins: { chance: 80, amount: [25, 75] }
        }
    },
    iron_mine: {
        name: '⚪ Iron Mine',
        description: 'Deeper tunnels yield better metals but require more skill',
        level_required: 5,
        energy_cost: 15,
        color: 0x708090,
        rewards: {
            iron_ore: { chance: 60, amount: [2, 4], value: 25 },
            silver_ore: { chance: 30, amount: [1, 2], value: 50 },
            precious_gems: { chance: 10, amount: [1, 1], value: 100 },
            coins: { chance: 85, amount: [50, 150] }
        }
    },
    gold_mine: {
        name: '🟡 Gold Mine',
        description: 'Treacherous depths hide the most valuable treasures',
        level_required: 10,
        energy_cost: 25,
        color: 0xFFD700,
        rewards: {
            gold_ore: { chance: 40, amount: [1, 3], value: 75 },
            platinum_ore: { chance: 15, amount: [1, 1], value: 150 },
            rare_crystals: { chance: 8, amount: [1, 1], value: 200 },
            ancient_artifact: { chance: 3, amount: [1, 1], value: 500 },
            coins: { chance: 90, amount: [100, 300] }
        }
    },
    crystal_cavern: {
        name: '💎 Crystal Cavern',
        description: 'Mystical caves filled with magical crystals and dangers',
        level_required: 15,
        energy_cost: 30,
        color: 0x9370DB,
        rewards: {
            magic_crystal: { chance: 50, amount: [1, 2], value: 100 },
            enchanted_gem: { chance: 25, amount: [1, 1], value: 250 },
            dragon_scale: { chance: 5, amount: [1, 1], value: 500 },
            legendary_ore: { chance: 2, amount: [1, 1], value: 1000 },
            coins: { chance: 95, amount: [200, 500] }
        }
    }
};

const MINING_TOOLS = {
    rusty_pickaxe: { name: '🔨 Rusty Pickaxe', efficiency: 1.0, durability: 100, price: 0 },
    iron_pickaxe: { name: '⚒️ Iron Pickaxe', efficiency: 1.5, durability: 200, price: 500 },
    steel_pickaxe: { name: '🛠️ Steel Pickaxe', efficiency: 2.0, durability: 300, price: 1500 },
    enchanted_pickaxe: { name: '✨ Enchanted Pickaxe', efficiency: 3.0, durability: 500, price: 5000 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('🏔️ Mine for valuable ores and precious gems')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose a mining location')
                .setRequired(false)
                .addChoices(
                    { name: '🟤 Copper Mine (Level 1+)', value: 'copper_mine' },
                    { name: '⚪ Iron Mine (Level 5+)', value: 'iron_mine' },
                    { name: '🟡 Gold Mine (Level 10+)', value: 'gold_mine' },
                    { name: '💎 Crystal Cavern (Level 15+)', value: 'crystal_cavern' }
                ))
        .addIntegerOption(option =>
            option.setName('expeditions')
                .setDescription('Number of mining expeditions')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(5)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            const location = interaction.options.getString('location');
            const expeditions = interaction.options.getInteger('expeditions') || 1;

            let userData = await db.getPlayer(userId);
            if (!userData) {
                userData = {
                    inventory: { coins: 100, items: [] },
                    mining: {
                        level: 1,
                        experience: 0,
                        energy: 100,
                        tools: ['rusty_pickaxe'],
                        equipped_tool: 'rusty_pickaxe',
                        last_energy_regen: Date.now(),
                        total_mines: 0,
                        rare_finds: 0,
                        daily_ores: 0,
                        daily_gems: 0,
                        daily_coins: 0
                    }
                };
                await db.setPlayer(userId, userData);
            }

            // Initialize mining data if missing
            if (!userData.mining) {
                userData.mining = {
                    level: 1,
                    experience: 0,
                    energy: 100,
                    tools: ['rusty_pickaxe'],
                    equipped_tool: 'rusty_pickaxe',
                    last_energy_regen: Date.now(),
                    total_mines: 0,
                    rare_finds: 0,
                    daily_ores: 0,
                    daily_gems: 0,
                    daily_coins: 0
                };
            }

            // Regenerate energy over time
            this.regenerateEnergy(userData);
            
            if (!location) {
                await this.showMiningMenu(interaction, userData);
                return;
            }

            await this.startMining(interaction, userData, location, expeditions);
            
        } catch (error) {
            console.error('Mining command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while mining. Please try again.',
                ephemeral: true
            });
        }
    },

    async showMiningMenu(interaction, userData) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('⛏️ Mining Operations Center')
            .setDescription('╔═══════════════════════════════════════╗\n║          **MINING HEADQUARTERS**           ║\n╚═══════════════════════════════════════╝')
            .setThumbnail('https://cdn.discordapp.com/emojis/⛏️.png')
            .addFields(
                {
                    name: '📊 **Mining Stats**',
                    value: `**Level:** ${userData.mining.level}\n**Experience:** ${userData.mining.experience}\n**Energy:** ${userData.mining.energy}/100 ⚡\n**Tool:** ${MINING_TOOLS[userData.mining.equipped_tool]?.name || 'None'}`,
                    inline: true
                },
                {
                    name: '🎯 **Today\'s Progress**',
                    value: `**Ores Mined:** ${userData.mining.daily_ores || 0}\n**Gems Found:** ${userData.mining.daily_gems || 0}\n**Coins Earned:** ${userData.mining.daily_coins || 0}💰\n**Expeditions:** ${userData.mining.daily_expeditions || 0}`,
                    inline: true
                },
                {
                    name: '🏆 **Achievements**',
                    value: `**Lifetime Mines:** ${userData.mining.total_mines || 0}\n**Rare Finds:** ${userData.mining.rare_finds || 0}\n**Master Miner:** ${userData.mining.level >= 20 ? '✅' : '❌'}\n**Tool Mastery:** ${this.getToolMastery(userData.mining.level)}`,
                    inline: true
                }
            );

        // Add available locations
        let locationsText = '';
        Object.entries(MINING_LOCATIONS).forEach(([key, location]) => {
            const canAccess = userData.mining.level >= location.level_required;
            const energyAffordable = userData.mining.energy >= location.energy_cost;
            const status = canAccess ? (energyAffordable ? '✅' : '⚡') : '🔒';
            
            locationsText += `${status} ${location.name} *(Level ${location.level_required}+)*\n`;
            locationsText += `   Energy: ${location.energy_cost} • ${location.description}\n\n`;
        });

        embed.addFields({
            name: '🗺️ **Available Locations**',
            value: locationsText,
            inline: false
        });

        const locationSelect = new StringSelectMenuBuilder()
            .setCustomId('mining_location')
            .setPlaceholder('🎯 Select a mining location')
            .addOptions(
                Object.entries(MINING_LOCATIONS).map(([key, location]) => ({
                    label: location.name,
                    value: key,
                    description: `Level ${location.level_required}+ • Energy: ${location.energy_cost}`,
                    emoji: location.name.split(' ')[0]
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mining_tools')
                    .setLabel('Manage Tools')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔧'),
                new ButtonBuilder()
                    .setCustomId('mining_stats')
                    .setLabel('Detailed Stats')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('mining_shop')
                    .setLabel('Mining Shop')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪')
            );

        const selectRow = new ActionRowBuilder().addComponents(locationSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    async startMining(interaction, userData, locationKey, expeditions) {
        const location = MINING_LOCATIONS[locationKey];
        
        if (!location) {
            await interaction.editReply({
                content: '❌ Invalid mining location selected.',
                ephemeral: true
            });
            return;
        }

        // Check requirements
        if (userData.mining.level < location.level_required) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🚫 Location Locked')
                .setDescription(`You need mining level **${location.level_required}** to mine at ${location.name}!`)
                .addFields(
                    { name: '🎯 Your Level', value: `${userData.mining.level}`, inline: true },
                    { name: '📈 Required Level', value: `${location.level_required}`, inline: true },
                    { name: '💡 Tip', value: 'Mine at easier locations to gain experience!', inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const totalEnergyCost = location.energy_cost * expeditions;
        if (userData.mining.energy < totalEnergyCost) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('⚡ Insufficient Energy')
                .setDescription(`You need **${totalEnergyCost}** energy but only have **${userData.mining.energy}**!`)
                .addFields(
                    { name: '⏰ Energy Regeneration', value: '1 energy every 5 minutes', inline: true },
                    { name: '🍖 Energy Items', value: 'Use energy food to restore instantly!', inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Perform mining
        const results = this.performMining(userData, location, expeditions);
        
        // Update user data
        userData.mining.energy -= totalEnergyCost;
        userData.mining.experience += results.experience;
        userData.mining.total_mines = (userData.mining.total_mines || 0) + expeditions;
        userData.mining.daily_ores = (userData.mining.daily_ores || 0) + results.oreCount;
        userData.mining.daily_gems = (userData.mining.daily_gems || 0) + results.gemCount;
        userData.mining.daily_coins = (userData.mining.daily_coins || 0) + results.coins;

        // Check for level up
        const newLevel = Math.floor(userData.mining.experience / 100) + 1;
        const leveledUp = newLevel > userData.mining.level;
        userData.mining.level = newLevel;

        // Save rewards to inventory
        for (const [item, amount] of Object.entries(results.rewards)) {
            if (!userData.inventory) userData.inventory = {};
            userData.inventory[item] = (userData.inventory[item] || 0) + amount;
        }

        userData.inventory.coins = (userData.inventory.coins || 0) + results.coins;
        await db.setPlayer(userId, userData);

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(results.rare_find ? '#FFD700' : location.color)
            .setTitle(`⛏️ Mining Results: ${location.name}`)
            .setDescription(results.rare_find ? 
                '🌟 **RARE FIND!** Your mining expedition yielded exceptional results!' :
                `**${expeditions} expedition${expeditions > 1 ? 's' : ''} completed successfully!**`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '📊 **Expedition Summary**',
                    value: `📍 **Location:** ${location.name}\n🔄 **Expeditions:** ${expeditions}\n⚡ **Energy Used:** ${totalEnergyCost}\n🎯 **Level:** ${userData.mining.level}${leveledUp ? ' 🎉 **LEVEL UP!**' : ''}`,
                    inline: true
                },
                {
                    name: '💎 **Items Found**',
                    value: Object.entries(results.rewards).map(([item, amount]) => 
                        `${this.getItemEmoji(item)} ${item.replace(/_/g, ' ')}: **${amount}**`
                    ).join('\n') || 'Nothing special this time...',
                    inline: true
                },
                {
                    name: '💰 **Rewards & Progress**',
                    value: `💰 **Coins:** +${results.coins}\n📈 **Experience:** +${results.experience}\n⚡ **Energy Remaining:** ${userData.mining.energy}\n🏆 **Total Mines:** ${userData.mining.total_mines}`,
                    inline: true
                }
            );

        if (results.specialEvent) {
            embed.addFields({
                name: '✨ **Special Event**',
                value: results.specialEvent,
                inline: false
            });
        }

        if (leveledUp) {
            embed.addFields({
                name: '🎉 **LEVEL UP!**',
                value: `Congratulations! You reached **Level ${userData.mining.level}**!\n🔓 New locations and tools may be available!`,
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`mine_again_${locationKey}`)
                    .setLabel('⛏️ Mine Again')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(userData.mining.energy < location.energy_cost),
                new ButtonBuilder()
                    .setCustomId('mining_menu')
                    .setLabel('🏠 Mining Menu')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('mining_inventory')
                    .setLabel('🎒 View Inventory')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('sell_ores')
                    .setLabel('💰 Sell Ores')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(Object.keys(results.rewards).length === 0)
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    performMining(userData, location, expeditions) {
        const tool = MINING_TOOLS[userData.mining.equipped_tool] || MINING_TOOLS.rusty_pickaxe;
        const efficiency = tool.efficiency;
        
        let rewards = {};
        let coins = 0;
        let experience = 15 * expeditions;
        let rare_find = false;
        let oreCount = 0;
        let gemCount = 0;

        for (let exp = 0; exp < expeditions; exp++) {
            // Roll for each possible reward
            for (const [item, config] of Object.entries(location.rewards)) {
                const chance = config.chance * efficiency;
                if (Math.random() * 100 < chance) {
                    const amount = Math.floor(Math.random() * (config.amount[1] - config.amount[0] + 1)) + config.amount[0];
                    
                    if (item === 'coins') {
                        coins += Math.floor(amount * efficiency);
                    } else {
                        rewards[item] = (rewards[item] || 0) + amount;
                        
                        // Count ores and gems
                        if (item.includes('ore')) oreCount += amount;
                        if (item.includes('gem') || item.includes('crystal')) gemCount += amount;
                        
                        if (config.chance <= 10) {
                            rare_find = true;
                            userData.mining.rare_finds = (userData.mining.rare_finds || 0) + 1;
                        }
                    }
                }
            }
        }

        // Special mining events
        if (Math.random() < 0.15) {
            const events = [
                'You discover a rich vein of ore running through the rock!',
                'Your pickaxe strikes a hidden chamber filled with crystals!',
                'Ancient dwarven mining techniques guide your work!',
                'A cave-in reveals a previously hidden treasure cache!',
                'Magical resonance amplifies your mining efficiency!'
            ];
            results.specialEvent = events[Math.floor(Math.random() * events.length)];
            experience += 30;
        }

        // Bonus experience for rare finds
        if (rare_find) {
            experience += 25 * expeditions;
        }

        return {
            rewards,
            coins: Math.floor(coins),
            experience: Math.floor(experience * efficiency),
            rare_find,
            oreCount,
            gemCount,
            specialEvent: results.specialEvent
        };
    },

    regenerateEnergy(userData) {
        const now = Date.now();
        const timePassed = now - (userData.mining.last_energy_regen || now);
        const energyToRegen = Math.floor(timePassed / (5 * 60 * 1000)); // 1 energy per 5 minutes
        
        userData.mining.energy = Math.min(100, userData.mining.energy + energyToRegen);
        userData.mining.last_energy_regen = now;
    },

    getItemEmoji(item) {
        const emojiMap = {
            copper_ore: '🟤',
            iron_ore: '⚪',
            gold_ore: '🟡',
            silver_ore: '⚫',
            platinum_ore: '💍',
            gems: '💎',
            precious_gems: '💠',
            rare_crystals: '🔮',
            magic_crystal: '✨',
            enchanted_gem: '🌟',
            dragon_scale: '🐲',
            ancient_artifact: '🏺',
            legendary_ore: '⭐'
        };
        return emojiMap[item] || '📦';
    },

    getToolMastery(level) {
        if (level >= 20) return '⭐ Grandmaster';
        if (level >= 15) return '💎 Expert';
        if (level >= 10) return '🔷 Advanced';
        if (level >= 5) return '🔸 Intermediate';
        return '⚪ Novice';
    }
};
