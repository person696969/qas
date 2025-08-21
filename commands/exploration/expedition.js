
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const LOCATIONS = {
    peaks: {
        name: 'Frozen Peaks',
        emoji: '🏔️',
        description: 'Treacherous mountain peaks covered in eternal ice',
        loot: [
            { name: 'Ice Crystal', emoji: '❄️', value: 50, rarity: 'common' },
            { name: 'Frost Gem', emoji: '💎', value: 200, rarity: 'rare' },
            { name: 'Yeti Fur', emoji: '🐻', value: 150, rarity: 'uncommon' },
            { name: 'Ancient Scroll', emoji: '📜', value: 300, rarity: 'rare' },
            { name: 'Glacial Crown', emoji: '👑', value: 1000, rarity: 'legendary' }
        ],
        danger: 4,
        minLevel: 8,
        environment: 'Cold',
        specialEvents: ['Avalanche', 'Yeti Encounter', 'Hidden Cave'],
        theme: '#B0E0E6'
    },
    desert: {
        name: 'Desert Ruins',
        emoji: '🏜️',
        description: 'Ancient civilization ruins buried in shifting sands',
        loot: [
            { name: 'Sand Crystal', emoji: '🟤', value: 40, rarity: 'common' },
            { name: 'Ancient Coin', emoji: '🪙', value: 80, rarity: 'common' },
            { name: 'Desert Rose', emoji: '🌹', value: 120, rarity: 'uncommon' },
            { name: 'Lost Artifact', emoji: '🏺', value: 250, rarity: 'rare' },
            { name: 'Pharaoh\'s Treasure', emoji: '💰', value: 800, rarity: 'legendary' }
        ],
        danger: 2,
        minLevel: 3,
        environment: 'Hot',
        specialEvents: ['Sandstorm', 'Oasis Discovery', 'Tomb Entrance'],
        theme: '#DEB887'
    },
    volcano: {
        name: 'Volcanic Islands',
        emoji: '🌋',
        description: 'Active volcanic archipelago with molten treasures',
        loot: [
            { name: 'Fire Crystal', emoji: '🔥', value: 80, rarity: 'common' },
            { name: 'Dragon Scale', emoji: '🐲', value: 180, rarity: 'uncommon' },
            { name: 'Obsidian', emoji: '⚫', value: 100, rarity: 'uncommon' },
            { name: 'Magma Core', emoji: '🌋', value: 400, rarity: 'rare' },
            { name: 'Phoenix Feather', emoji: '🦅', value: 1200, rarity: 'legendary' }
        ],
        danger: 5,
        minLevel: 12,
        environment: 'Volcanic',
        specialEvents: ['Eruption', 'Dragon Sighting', 'Lava Flow'],
        theme: '#FF4500'
    },
    forest: {
        name: 'Ancient Forest',
        emoji: '🌲',
        description: 'Mystical woodland where nature holds ancient secrets',
        loot: [
            { name: 'Spirit Essence', emoji: '✨', value: 60, rarity: 'common' },
            { name: 'Sacred Wood', emoji: '🪵', value: 90, rarity: 'common' },
            { name: 'Mystic Herb', emoji: '🌿', value: 130, rarity: 'uncommon' },
            { name: 'Forest Gem', emoji: '🟢', value: 220, rarity: 'rare' },
            { name: 'World Tree Seed', emoji: '🌱', value: 900, rarity: 'legendary' }
        ],
        danger: 1,
        minLevel: 1,
        environment: 'Temperate',
        specialEvents: ['Fairy Ring', 'Ancient Guardian', 'Hidden Grove'],
        theme: '#228B22'
    },
    ocean: {
        name: 'Deep Ocean',
        emoji: '🌊',
        description: 'Mysterious depths hiding underwater civilizations',
        loot: [
            { name: 'Sea Pearl', emoji: '🦪', value: 70, rarity: 'common' },
            { name: 'Coral Fragment', emoji: '🪸', value: 50, rarity: 'common' },
            { name: 'Siren\'s Scale', emoji: '🧜‍♀️', value: 160, rarity: 'uncommon' },
            { name: 'Atlantis Relic', emoji: '🔱', value: 350, rarity: 'rare' },
            { name: 'Kraken\'s Eye', emoji: '👁️', value: 1500, rarity: 'legendary' }
        ],
        danger: 3,
        minLevel: 6,
        environment: 'Aquatic',
        specialEvents: ['Whirlpool', 'Sea Monster', 'Sunken Ship'],
        theme: '#006994'
    },
    void: {
        name: 'Void Realm',
        emoji: '🕳️',
        description: 'Dimension beyond reality where chaos reigns supreme',
        loot: [
            { name: 'Void Fragment', emoji: '🌑', value: 100, rarity: 'uncommon' },
            { name: 'Reality Shard', emoji: '🔮', value: 200, rarity: 'rare' },
            { name: 'Chaos Crystal', emoji: '💜', value: 300, rarity: 'rare' },
            { name: 'Void Lord\'s Crown', emoji: '👑', value: 800, rarity: 'epic' },
            { name: 'Primordial Essence', emoji: '⭐', value: 2000, rarity: 'mythical' }
        ],
        danger: 6,
        minLevel: 20,
        environment: 'Void',
        specialEvents: ['Reality Rift', 'Void Storm', 'Dimensional Guardian'],
        theme: '#2F004F'
    }
};

const EXPEDITION_DURATIONS = {
    '2h': { hours: 2, multiplier: 1.0, risk: 0.1 },
    '4h': { hours: 4, multiplier: 1.5, risk: 0.15 },
    '8h': { hours: 8, multiplier: 2.2, risk: 0.2 },
    '12h': { hours: 12, multiplier: 3.0, risk: 0.25 },
    '24h': { hours: 24, multiplier: 4.5, risk: 0.3 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('expedition')
        .setDescription('🗺️ Embark on long expeditions to distant lands for rare treasures')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new expedition')
                .addStringOption(option =>
                    option.setName('destination')
                        .setDescription('Where to explore')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌲 Ancient Forest (Level 1+)', value: 'forest' },
                            { name: '🏜️ Desert Ruins (Level 3+)', value: 'desert' },
                            { name: '🌊 Deep Ocean (Level 6+)', value: 'ocean' },
                            { name: '🏔️ Frozen Peaks (Level 8+)', value: 'peaks' },
                            { name: '🌋 Volcanic Islands (Level 12+)', value: 'volcano' },
                            { name: '🕳️ Void Realm (Level 20+)', value: 'void' }
                        ))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Length of expedition')
                        .setRequired(true)
                        .addChoices(
                            { name: '2 Hours (Low Risk)', value: '2h' },
                            { name: '4 Hours (Medium Risk)', value: '4h' },
                            { name: '8 Hours (High Risk)', value: '8h' },
                            { name: '12 Hours (Very High Risk)', value: '12h' },
                            { name: '24 Hours (Extreme Risk)', value: '24h' }
                        ))
                .addIntegerOption(option =>
                    option.setName('crew')
                        .setDescription('Number of crew members (costs extra but reduces risk)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your current expedition status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('return')
                .setDescription('Return from your expedition early'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all available expedition locations')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            let player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first! Use `/profile` to start.',
                    ephemeral: true
                });
                return;
            }

            // Initialize expedition data
            if (!player.expeditions) {
                player.expeditions = {
                    current: null,
                    completed: 0,
                    totalDistance: 0,
                    discoveries: [],
                    achievements: []
                };
            }

            switch (subcommand) {
                case 'start':
                    await this.startExpedition(interaction, player);
                    break;
                case 'status':
                    await this.showStatus(interaction, player);
                    break;
                case 'return':
                    await this.returnEarly(interaction, player);
                    break;
                case 'list':
                    await this.listLocations(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in expedition command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your expedition.',
                ephemeral: true
            });
        }
    },

    async startExpedition(interaction, player) {
        const destination = interaction.options.getString('destination');
        const duration = interaction.options.getString('duration');
        const crewSize = interaction.options.getInteger('crew') || 0;

        const location = LOCATIONS[destination];
        const expeditionData = EXPEDITION_DURATIONS[duration];

        if (!location || !expeditionData) {
            await interaction.editReply({
                content: '❌ Invalid expedition parameters.',
                ephemeral: true
            });
            return;
        }

        // Check if player is already on expedition
        if (player.expeditions.current) {
            const currentExp = player.expeditions.current;
            const endTime = new Date(currentExp.endTime);
            if (endTime > new Date()) {
                const timeLeft = Math.ceil((endTime - new Date()) / (1000 * 60 * 60));
                await interaction.editReply({
                    content: `❌ You're already on an expedition to **${LOCATIONS[currentExp.destination].name}**! Return in **${timeLeft} hours**.`,
                    ephemeral: true
                });
                return;
            }
        }

        // Check level requirement
        if ((player.level || 1) < location.minLevel) {
            await interaction.editReply({
                content: `❌ You need to be **level ${location.minLevel}** to explore ${location.name}! Current level: **${player.level || 1}**`,
                ephemeral: true
            });
            return;
        }

        // Calculate costs
        const baseCost = 100 + (location.danger * 50) + (expeditionData.hours * 25);
        const crewCost = crewSize * 50;
        const totalCost = baseCost + crewCost;

        if ((player.coins || 0) < totalCost) {
            await interaction.editReply({
                content: `❌ Expedition cost: **${totalCost} coins** (Base: ${baseCost} + Crew: ${crewCost}). You have **${player.coins || 0}** coins.`,
                ephemeral: true
            });
            return;
        }

        // Calculate expected rewards
        const baseRewards = Math.floor(expeditionData.hours * location.danger * expeditionData.multiplier);
        const crewBonus = crewSize * 0.1;
        const expectedLoot = Math.min(Math.floor(baseRewards * (1 + crewBonus)), 8);

        const embed = new EmbedBuilder()
            .setColor(location.theme)
            .setTitle(`${location.emoji} Expedition to ${location.name}`)
            .setDescription(`**${location.description}**\n\nPrepare for a ${expeditionData.hours}-hour journey into the unknown!`)
            .addFields(
                { name: '⏰ Duration', value: `${expeditionData.hours} hours`, inline: true },
                { name: '⚔️ Danger Level', value: '⭐'.repeat(location.danger), inline: true },
                { name: '🌍 Environment', value: location.environment, inline: true },
                { name: '👥 Crew Size', value: crewSize.toString(), inline: true },
                { name: '💰 Total Cost', value: `${totalCost} coins`, inline: true },
                { name: '🎁 Expected Finds', value: `${expectedLoot} items`, inline: true }
            );

        // Show potential loot
        const lootPreview = location.loot.slice(0, 5).map(item => 
            `${item.emoji} ${item.name} (${item.rarity})`
        ).join('\n');
        embed.addFields({ name: '💎 Potential Treasures', value: lootPreview, inline: false });

        // Special events preview
        embed.addFields({
            name: '🎲 Possible Events',
            value: location.specialEvents.join(' • '),
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`expedition_confirm_${destination}_${duration}_${crewSize}`)
                    .setLabel('Begin Expedition')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🗺️'),
                new ButtonBuilder()
                    .setCustomId('expedition_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('expedition_adjust_crew')
                    .setLabel('Adjust Crew')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👥')
            );

        const response = await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });

        // Set up button collector
        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 45000 });

            if (confirmation.customId.startsWith('expedition_confirm_')) {
                const [, , dest, dur, crew] = confirmation.customId.split('_');
                await this.launchExpedition(confirmation, player, dest, dur, parseInt(crew));
            } else if (confirmation.customId === 'expedition_adjust_crew') {
                await this.showCrewAdjustment(confirmation, player, destination, duration);
            } else {
                await confirmation.update({
                    content: '❌ Expedition cancelled. Your supplies remain unused.',
                    embeds: [],
                    components: []
                });
            }
        } catch (e) {
            await interaction.editReply({
                content: '❌ Expedition planning session expired.',
                embeds: [],
                components: []
            });
        }
    },

    async launchExpedition(interaction, player, destination, duration, crewSize) {
        const location = LOCATIONS[destination];
        const expeditionData = EXPEDITION_DURATIONS[duration];
        
        const baseCost = 100 + (location.danger * 50) + (expeditionData.hours * 25);
        const crewCost = crewSize * 50;
        const totalCost = baseCost + crewCost;

        // Deduct costs
        player.coins -= totalCost;

        // Set up expedition
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (expeditionData.hours * 60 * 60 * 1000));

        player.expeditions.current = {
            destination: destination,
            duration: duration,
            crewSize: crewSize,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            status: 'active'
        };

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🚢 Expedition Launched!')
            .setDescription(`Your expedition to **${location.name}** has begun!`)
            .addFields(
                { name: '📍 Destination', value: `${location.emoji} ${location.name}`, inline: true },
                { name: '⏱️ Duration', value: `${expeditionData.hours} hours`, inline: true },
                { name: '👥 Crew', value: `${crewSize} members`, inline: true },
                { name: '💰 Investment', value: `${totalCost} coins`, inline: true },
                { name: '📅 Return Time', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: true },
                { name: '⏰ Time Remaining', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: true }
            )
            .addFields({
                name: '📋 Expedition Log',
                value: `🚢 **${new Date().toLocaleTimeString()}** - Expedition departed for ${location.name}\n👥 **Crew Status:** ${crewSize} members aboard\n⛵ **Weather:** Fair winds and following seas`,
                inline: false
            })
            .setFooter({ text: 'Use /expedition status to check progress during your journey!' })
            .setTimestamp();

        await interaction.update({
            embeds: [embed],
            components: []
        });

        // Schedule completion notification (in a real bot, you'd use a persistent scheduler)
        setTimeout(async () => {
            try {
                const updatedPlayer = await db.getPlayer(interaction.user.id);
                if (updatedPlayer?.expeditions?.current?.destination === destination) {
                    await this.completeExpedition(interaction, updatedPlayer);
                }
            } catch (error) {
                console.error('Error completing expedition:', error);
            }
        }, expeditionData.hours * 60 * 60 * 1000);
    },

    async completeExpedition(interaction, player) {
        const currentExp = player.expeditions.current;
        const location = LOCATIONS[currentExp.destination];
        const expeditionData = EXPEDITION_DURATIONS[currentExp.duration];

        // Simulate expedition results
        const results = this.simulateExpeditionResults(location, expeditionData, currentExp.crewSize);

        // Update player data
        player.expeditions.current = null;
        player.expeditions.completed++;
        player.expeditions.totalDistance += location.danger * expeditionData.hours * 10;

        if (results.success) {
            // Add loot to inventory
            if (!player.inventory) player.inventory = {};
            results.loot.forEach(item => {
                player.inventory[item.name] = (player.inventory[item.name] || 0) + 1;
            });

            // Add coins and experience
            player.coins = (player.coins || 0) + results.coinsEarned;
            player.experience = (player.experience || 0) + results.expEarned;

            // Check for discoveries
            if (results.specialEvent) {
                player.expeditions.discoveries.push({
                    location: currentExp.destination,
                    event: results.specialEvent,
                    timestamp: new Date().toISOString()
                });
            }
        }

        await db.updatePlayer(interaction.user.id, player);

        // Create completion notification
        const embed = new EmbedBuilder()
            .setColor(results.success ? '#00FF00' : '#FFA500')
            .setTitle(`${location.emoji} Expedition Complete!`)
            .setDescription(results.success ? 
                '🎉 **SUCCESS!** Your expedition has returned with treasures!' :
                '⚠️ **PARTIAL SUCCESS** Your expedition faced challenges but returned safely.')
            .addFields(
                { name: '📍 Location', value: `${location.emoji} ${location.name}`, inline: true },
                { name: '⏱️ Duration', value: `${expeditionData.hours} hours`, inline: true },
                { name: '🎯 Success Rate', value: `${Math.floor(results.successRate * 100)}%`, inline: true }
            );

        if (results.success && results.loot.length > 0) {
            const lootText = results.loot.map(item => 
                `${item.emoji} ${item.name} (${item.value} coins)`
            ).join('\n');
            embed.addFields({ name: '🏆 Treasures Found', value: lootText, inline: false });
        }

        embed.addFields(
            { name: '💰 Coins Earned', value: results.coinsEarned.toString(), inline: true },
            { name: '🎯 Experience Gained', value: results.expEarned.toString(), inline: true },
            { name: '🗺️ Distance Traveled', value: `${location.danger * expeditionData.hours * 10} km`, inline: true }
        );

        if (results.specialEvent) {
            embed.addFields({
                name: '⭐ Special Discovery!',
                value: `Your expedition discovered: **${results.specialEvent}**`,
                inline: false
            });
        }

        // Follow up with the user (in a real bot, you'd send a DM or channel message)
        try {
            await interaction.followUp({
                content: `<@${interaction.user.id}> Your expedition has returned!`,
                embeds: [embed]
            });
        } catch (error) {
            console.error('Could not send expedition completion notification:', error);
        }
    },

    simulateExpeditionResults(location, expeditionData, crewSize) {
        const baseSuccessRate = Math.max(0.3, 1 - (location.danger * 0.1) - (expeditionData.risk));
        const crewBonus = crewSize * 0.05;
        const successRate = Math.min(0.95, baseSuccessRate + crewBonus);

        const success = Math.random() < successRate;
        const loot = [];
        let coinsEarned = 0;
        let expEarned = 50 * expeditionData.hours;

        if (success) {
            // Generate loot based on location and duration
            const lootAttempts = Math.floor(expeditionData.hours * (1 + location.danger * 0.2));
            
            for (let i = 0; i < lootAttempts; i++) {
                const lootRoll = Math.random();
                let selectedItem = null;

                if (lootRoll > 0.98) {
                    selectedItem = location.loot.find(item => item.rarity === 'mythical');
                } else if (lootRoll > 0.95) {
                    selectedItem = location.loot.find(item => item.rarity === 'legendary');
                } else if (lootRoll > 0.85) {
                    selectedItem = location.loot.find(item => item.rarity === 'epic');
                } else if (lootRoll > 0.6) {
                    selectedItem = location.loot.find(item => item.rarity === 'rare');
                } else if (lootRoll > 0.3) {
                    selectedItem = location.loot.find(item => item.rarity === 'uncommon');
                } else {
                    selectedItem = location.loot.find(item => item.rarity === 'common');
                }

                if (!selectedItem) {
                    selectedItem = location.loot[Math.floor(Math.random() * location.loot.length)];
                }

                if (selectedItem) {
                    loot.push(selectedItem);
                    coinsEarned += selectedItem.value;
                }
            }

            expEarned += 25 * loot.length;
        } else {
            // Partial failure - still get some rewards
            coinsEarned = Math.floor(expeditionData.hours * 20);
            expEarned = Math.floor(expEarned * 0.5);
        }

        // Check for special events
        let specialEvent = null;
        if (Math.random() < 0.15) { // 15% chance
            specialEvent = location.specialEvents[Math.floor(Math.random() * location.specialEvents.length)];
            expEarned += 50;
        }

        return {
            success,
            successRate,
            loot,
            coinsEarned,
            expEarned,
            specialEvent
        };
    },

    async showStatus(interaction, player) {
        if (!player.expeditions.current) {
            await interaction.editReply({
                content: '🗺️ You are not currently on any expedition. Use `/expedition start` to begin an adventure!',
                ephemeral: true
            });
            return;
        }

        const currentExp = player.expeditions.current;
        const location = LOCATIONS[currentExp.destination];
        const endTime = new Date(currentExp.endTime);
        const timeLeft = endTime - new Date();

        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🗺️ Current Expedition Status')
            .setDescription(`**Expedition to ${location.name}**`)
            .addFields(
                { name: '📍 Destination', value: `${location.emoji} ${location.name}`, inline: true },
                { name: '👥 Crew Size', value: currentExp.crewSize.toString(), inline: true },
                { name: '🌍 Environment', value: location.environment, inline: true },
                { name: '📅 Started', value: `<t:${Math.floor(new Date(currentExp.startTime).getTime() / 1000)}:F>`, inline: true },
                { name: '🏁 Returns', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: true },
                { name: '⏰ Time Remaining', value: timeLeft > 0 ? `<t:${Math.floor(endTime.getTime() / 1000)}:R>` : '✅ **Ready to return!**', inline: true }
            );

        if (timeLeft <= 0) {
            embed.addFields({
                name: '🎉 Expedition Complete!',
                value: 'Your expedition is ready to return! Use `/expedition return` to collect your rewards.',
                inline: false
            });
            embed.setColor('#00FF00');
        } else {
            // Show progress
            const totalTime = new Date(currentExp.endTime) - new Date(currentExp.startTime);
            const elapsed = new Date() - new Date(currentExp.startTime);
            const progress = Math.floor((elapsed / totalTime) * 100);
            
            embed.addFields({
                name: '📊 Progress',
                value: `${this.getProgressBar(progress)} ${progress}%`,
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('expedition_return_early')
                    .setLabel('Return Early')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔙')
                    .setDisabled(timeLeft <= 0),
                new ButtonBuilder()
                    .setCustomId('expedition_detailed_log')
                    .setLabel('Detailed Log')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('expedition_track_location')
                    .setLabel('Track Location')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📡')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async listLocations(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle('🗺️ Expedition Destinations')
            .setDescription('╔═══════════════════════════════════════╗\n║      **EXPLORATION CATALOG**          ║\n╚═══════════════════════════════════════╝')
            .addFields(
                { name: '👤 Explorer Level', value: `**Level ${player.level || 1}**`, inline: true },
                { name: '🗺️ Expeditions Completed', value: `**${player.expeditions.completed}**`, inline: true },
                { name: '📏 Total Distance', value: `**${player.expeditions.totalDistance || 0} km**`, inline: true }
            );

        Object.entries(LOCATIONS).forEach(([key, location]) => {
            const canExplore = (player.level || 1) >= location.minLevel;
            const status = canExplore ? '✅ Unlocked' : `🔒 Level ${location.minLevel} Required`;
            
            embed.addFields({
                name: `${location.emoji} ${location.name}`,
                value: [
                    `**${location.description}**`,
                    `**Environment:** ${location.environment}`,
                    `**Danger Level:** ${'⭐'.repeat(location.danger)}`,
                    `**Min Level:** ${location.minLevel}`,
                    `**Status:** ${status}`
                ].join('\n'),
                inline: false
            });
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('expedition_start_new')
                    .setLabel('Start New Expedition')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🚀'),
                new ButtonBuilder()
                    .setCustomId('expedition_achievements')
                    .setLabel('View Achievements')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('expedition_discoveries')
                    .setLabel('Discovery Log')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📖')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    getProgressBar(progress) {
        const filled = Math.floor(progress / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
};
