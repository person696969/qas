
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const scoutingAreas = [
    {
        id: 'woods',
        name: 'Nearby Woods',
        difficulty: 'Easy',
        cost: 20,
        level: 1,
        discoveries: [
            { name: 'Hidden Cave', rarity: 'common', value: 50, emoji: '🕳️' },
            { name: 'Old Campsite', rarity: 'common', value: 30, emoji: '🏕️' },
            { name: 'Berry Grove', rarity: 'common', value: 25, emoji: '🫐' }
        ],
        emoji: '🌲',
        color: 0x228B22,
        description: 'Dense woodland perfect for beginner scouts'
    },
    {
        id: 'trails',
        name: 'Mountain Trails',
        difficulty: 'Medium',
        cost: 50,
        level: 3,
        discoveries: [
            { name: 'Ancient Shrine', rarity: 'uncommon', value: 120, emoji: '⛩️' },
            { name: 'Crystal Outcrop', rarity: 'uncommon', value: 100, emoji: '💎' },
            { name: 'Eagle\'s Nest', rarity: 'uncommon', value: 80, emoji: '🦅' }
        ],
        emoji: '⛰️',
        color: 0x8B7355,
        description: 'Treacherous mountain paths with valuable discoveries'
    },
    {
        id: 'marshlands',
        name: 'Misty Marshlands',
        difficulty: 'Hard',
        cost: 100,
        level: 6,
        discoveries: [
            { name: 'Sunken Ruins', rarity: 'rare', value: 250, emoji: '🏛️' },
            { name: 'Will-o\'-wisp Grove', rarity: 'rare', value: 200, emoji: '👻' },
            { name: 'Forgotten Temple', rarity: 'rare', value: 300, emoji: '🏯' }
        ],
        emoji: '🌫️',
        color: 0x696969,
        description: 'Mysterious wetlands shrouded in ancient secrets'
    },
    {
        id: 'territories',
        name: 'Uncharted Territories',
        difficulty: 'Extreme',
        cost: 200,
        level: 10,
        discoveries: [
            { name: 'Lost Civilization', rarity: 'legendary', value: 500, emoji: '🏺' },
            { name: 'Dragon Lair', rarity: 'legendary', value: 750, emoji: '🐉' },
            { name: 'Portal Nexus', rarity: 'legendary', value: 1000, emoji: '🌀' }
        ],
        emoji: '🗺️',
        color: 0x8B008B,
        description: 'Uncharted realms where legends are born'
    }
];

const scoutingEquipment = {
    basic_compass: { name: 'Basic Compass', efficiency: 1.0, success_bonus: 0 },
    enhanced_map: { name: 'Enhanced Map', efficiency: 1.2, success_bonus: 5 },
    mystical_lens: { name: 'Mystical Lens', efficiency: 1.5, success_bonus: 10 },
    divine_pathfinder: { name: 'Divine Pathfinder', efficiency: 2.0, success_bonus: 20 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scout')
        .setDescription('🔍 Scout ahead to discover new treasure locations and hidden secrets')
        .addStringOption(option =>
            option.setName('area')
                .setDescription('Choose an area to scout')
                .setRequired(false)
                .addChoices(
                    { name: '🌲 Nearby Woods (Easy)', value: 'woods' },
                    { name: '⛰️ Mountain Trails (Medium)', value: 'trails' },
                    { name: '🌫️ Misty Marshlands (Hard)', value: 'marshlands' },
                    { name: '🗺️ Uncharted Territories (Extreme)', value: 'territories' }
                ))
        .addIntegerOption(option =>
            option.setName('expeditions')
                .setDescription('Number of scouting expeditions')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(3)),
    
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const area = interaction.options.getString('area');
            const expeditions = interaction.options.getInteger('expeditions') || 1;

            let userData = await db.getPlayer(userId);
            if (!userData) {
                userData = {
                    inventory: { coins: 100, items: [] },
                    scouting: {
                        level: 1,
                        experience: 0,
                        discoveries: [],
                        equipment: 'basic_compass',
                        total_scouts: 0,
                        rare_discoveries: 0,
                        successful_expeditions: 0
                    },
                    cooldowns: {}
                };
                await db.setPlayer(userId, userData);
            }

            // Initialize scouting data
            if (!userData.scouting) {
                userData.scouting = {
                    level: 1,
                    experience: 0,
                    discoveries: [],
                    equipment: 'basic_compass',
                    total_scouts: 0,
                    rare_discoveries: 0,
                    successful_expeditions: 0
                };
            }

            if (!area) {
                await this.showScoutingMenu(interaction, userData);
                return;
            }

            // Check cooldown
            const lastScout = userData.cooldowns?.scouting || 0;
            const cooldownTime = 60000; // 1 minute
            const timeSinceLastScout = Date.now() - lastScout;
            
            if (timeSinceLastScout < cooldownTime) {
                const timeLeft = Math.ceil((cooldownTime - timeSinceLastScout) / 1000);
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('⏰ Scouting Cooldown')
                    .setDescription(`You need to wait **${timeLeft} seconds** before scouting again!`)
                    .addFields({ name: '💡 Tip', value: 'Use this time to plan your next expedition!' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const scoutArea = scoutingAreas.find(a => a.id === area);
            if (!scoutArea) {
                await interaction.reply({ content: '❌ Invalid area selected!', ephemeral: true });
                return;
            }

            // Check requirements
            const scoutingLevel = userData.scouting?.level || 1;
            if (scoutingLevel < scoutArea.level) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('🚫 Area Locked')
                    .setDescription(`You need scouting level **${scoutArea.level}** to scout ${scoutArea.name}!`)
                    .addFields(
                        { name: '🎯 Your Level', value: `${scoutingLevel}`, inline: true },
                        { name: '📈 Required Level', value: `${scoutArea.level}`, inline: true },
                        { name: '💡 Tip', value: 'Scout easier areas to gain experience!', inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const totalCost = scoutArea.cost * expeditions;
            if ((userData.inventory?.coins || 0) < totalCost) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('💸 Insufficient Funds')
                    .setDescription(`You need **${totalCost}** coins but only have **${userData.inventory?.coins || 0}**!`)
                    .addFields(
                        { name: '💰 Cost per Expedition', value: `${scoutArea.cost} coins`, inline: true },
                        { name: '🔄 Total Expeditions', value: `${expeditions}`, inline: true },
                        { name: '💡 Tip', value: 'Work or hunt to earn more coins!', inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            await interaction.deferReply();

            // Perform scouting
            const results = this.performScouting(userData, scoutArea, expeditions);

            // Update user data
            userData.inventory.coins -= totalCost;
            userData.scouting.experience += results.experience;
            userData.scouting.total_scouts += expeditions;
            userData.scouting.successful_expeditions += results.successful;
            userData.scouting.rare_discoveries += results.rareDiscoveries;
            userData.cooldowns.scouting = Date.now();

            // Add discoveries to collection
            results.discoveries.forEach(discovery => {
                if (!userData.scouting.discoveries.find(d => d.name === discovery.name)) {
                    userData.scouting.discoveries.push({
                        ...discovery,
                        discoveredAt: Date.now(),
                        area: area
                    });
                }
            });

            // Check for level up
            const newLevel = Math.floor(userData.scouting.experience / 200) + 1;
            const leveledUp = newLevel > scoutingLevel;
            if (leveledUp) {
                userData.scouting.level = newLevel;
            }

            await db.setPlayer(userId, userData);

            // Create results embed
            const embed = new EmbedBuilder()
                .setColor(results.rareDiscoveries > 0 ? '#FFD700' : scoutArea.color)
                .setTitle(`🔍 Scouting Results: ${scoutArea.name}`)
                .setDescription(`**${expeditions} expedition${expeditions > 1 ? 's' : ''} completed**\n${results.specialEvent ? `✨ ${results.specialEvent}` : ''}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '📊 **Expedition Summary**',
                        value: `📍 **Area:** ${scoutArea.name}\n🔄 **Expeditions:** ${expeditions}\n💰 **Cost:** ${totalCost} coins\n🎯 **Level:** ${userData.scouting.level}${leveledUp ? ' 🎉 **LEVEL UP!**' : ''}`,
                        inline: true
                    },
                    {
                        name: '🗺️ **Discoveries Made**',
                        value: `🔍 **New Discoveries:** ${results.discoveries.length}\n💎 **Rare Finds:** ${results.rareDiscoveries}\n✅ **Successful:** ${results.successful}/${expeditions}\n🌟 **Best Find:** ${results.bestValue} value`,
                        inline: true
                    },
                    {
                        name: '📈 **Progress & Stats**',
                        value: `🎯 **XP Gained:** +${results.experience}\n📊 **Total XP:** ${userData.scouting.experience}\n🏆 **Total Scouts:** ${userData.scouting.total_scouts}\n💎 **Rare Discoveries:** ${userData.scouting.rare_discoveries}`,
                        inline: true
                    }
                );

            // Add detailed discoveries
            if (results.discoveries.length > 0) {
                const discoveryText = results.discoveries.map(discovery => 
                    `${discovery.emoji} **${discovery.name}** *(${discovery.rarity} - ${discovery.value} value)*`
                ).join('\n');

                embed.addFields({
                    name: '🏛️ **New Discoveries**',
                    value: discoveryText,
                    inline: false
                });
            }

            if (leveledUp) {
                embed.addFields({
                    name: '🎉 **LEVEL UP!**',
                    value: `Congratulations! You reached **Scouting Level ${userData.scouting.level}**!\n🔓 New areas and equipment may be available!`,
                    inline: false
                });
            }

            // Enhanced action buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('scout_again')
                        .setLabel('🔍 Scout Again')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(userData.inventory.coins < scoutArea.cost),
                    new ButtonBuilder()
                        .setCustomId('view_discoveries')
                        .setLabel('🗺️ View Discoveries')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('scout_equipment')
                        .setLabel('⚙️ Manage Equipment')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('explore_discoveries')
                        .setLabel('🗺️ Explore Finds')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(results.discoveries.length === 0)
                );

            await interaction.editReply({ embeds: [embed], components: [buttons] });

        } catch (error) {
            console.error('Scouting command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while scouting. Please try again.',
                ephemeral: true
            });
        }
    },

    async showScoutingMenu(interaction, userData) {
        const embed = new EmbedBuilder()
            .setColor('#228B22')
            .setTitle('🔍 Scouting Operations Center')
            .setDescription('╔═══════════════════════════════════════╗\n║        **EXPLORATION HEADQUARTERS**        ║\n╚═══════════════════════════════════════╝')
            .setThumbnail('https://cdn.discordapp.com/emojis/🔍.png')
            .addFields(
                {
                    name: '🎯 **Scouting Stats**',
                    value: `**Level:** ${userData.scouting.level}\n**Experience:** ${userData.scouting.experience}\n**Equipment:** ${scoutingEquipment[userData.scouting.equipment]?.name || 'Basic Compass'}\n**Discoveries:** ${userData.scouting.discoveries?.length || 0}`,
                    inline: true
                },
                {
                    name: '🏆 **Achievements**',
                    value: `**Total Scouts:** ${userData.scouting.total_scouts || 0}\n**Rare Discoveries:** ${userData.scouting.rare_discoveries || 0}\n**Success Rate:** ${this.getSuccessRate(userData)}%\n**Master Scout:** ${userData.scouting.level >= 15 ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '💰 **Resources**',
                    value: `**Available Coins:** ${userData.inventory?.coins || 0}\n**Equipment Bonus:** ${scoutingEquipment[userData.scouting.equipment]?.success_bonus || 0}%\n**Daily Scouts:** ${userData.scouting.daily_scouts || 0}/10`,
                    inline: true
                }
            );

        // Add area information
        let areasText = '';
        scoutingAreas.forEach(area => {
            const canAccess = userData.scouting.level >= area.level;
            const canAfford = (userData.inventory?.coins || 0) >= area.cost;
            const status = canAccess ? (canAfford ? '✅' : '💰') : '🔒';
            
            areasText += `${status} ${area.emoji} **${area.name}** *(${area.difficulty})*\n`;
            areasText += `   Level ${area.level}+ • Cost: ${area.cost} coins\n`;
            areasText += `   ${area.description}\n\n`;
        });

        embed.addFields({
            name: '🗺️ **Available Areas**',
            value: areasText,
            inline: false
        });

        const areaSelect = new StringSelectMenuBuilder()
            .setCustomId('scouting_area')
            .setPlaceholder('🎯 Select a scouting area')
            .addOptions(
                scoutingAreas.map(area => ({
                    label: area.name,
                    value: area.id,
                    description: `${area.difficulty} • Level ${area.level}+ • ${area.cost} coins`,
                    emoji: area.emoji
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('scouting_equipment')
                    .setLabel('Manage Equipment')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('discovery_map')
                    .setLabel('Discovery Map')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🗺️'),
                new ButtonBuilder()
                    .setCustomId('scouting_guide')
                    .setLabel('Scouting Guide')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📖')
            );

        const selectRow = new ActionRowBuilder().addComponents(areaSelect);

        await interaction.reply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    performScouting(userData, area, expeditions) {
        const equipment = scoutingEquipment[userData.scouting.equipment] || scoutingEquipment.basic_compass;
        const results = {
            discoveries: [],
            experience: expeditions * 25,
            successful: 0,
            rareDiscoveries: 0,
            bestValue: 0
        };

        for (let exp = 0; exp < expeditions; exp++) {
            const successChance = 70 + equipment.success_bonus + (userData.scouting.level * 2);
            
            if (Math.random() * 100 < successChance) {
                results.successful++;
                
                // Try to discover something
                const discovery = area.discoveries[Math.floor(Math.random() * area.discoveries.length)];
                const discoveryChance = this.getDiscoveryChance(discovery.rarity) * equipment.efficiency;
                
                if (Math.random() * 100 < discoveryChance) {
                    results.discoveries.push(discovery);
                    results.bestValue = Math.max(results.bestValue, discovery.value);
                    
                    if (['rare', 'legendary'].includes(discovery.rarity)) {
                        results.rareDiscoveries++;
                        results.experience += 30;
                    }
                }
            }
        }

        // Special scouting events
        if (Math.random() < 0.12) {
            const events = [
                'Your keen eyes spot hidden paths others have missed!',
                'Ancient maps guide you to long-lost locations!',
                'Weather conditions provide perfect visibility!',
                'Local wildlife leads you to secret areas!',
                'Your intuition uncovers remarkable discoveries!'
            ];
            results.specialEvent = events[Math.floor(Math.random() * events.length)];
            results.experience += 25;
        }

        return results;
    },

    getDiscoveryChance(rarity) {
        const chances = {
            common: 60,
            uncommon: 35,
            rare: 15,
            legendary: 5
        };
        return chances[rarity] || 50;
    },

    getSuccessRate(userData) {
        const total = userData.scouting.total_scouts || 1;
        const successful = userData.scouting.successful_expeditions || 0;
        return Math.round((successful / total) * 100);
    }
};
