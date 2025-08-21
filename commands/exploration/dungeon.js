
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const DUNGEONS = {
    crypt: {
        name: 'Haunted Crypt',
        emoji: '🏚️',
        description: 'Ancient burial grounds filled with restless spirits',
        minLevel: 5,
        stages: 3,
        boss: 'Ancient Lich',
        difficulty: 'Medium',
        staminaCost: 30,
        entryFee: 100,
        loot: {
            common: [
                { name: 'Bone Dust', value: 15, emoji: '🦴' },
                { name: 'Spectral Essence', value: 25, emoji: '👻' },
                { name: 'Old Coin', value: 10, emoji: '🪙' }
            ],
            rare: [
                { name: 'Soul Gem', value: 150, emoji: '💎' },
                { name: 'Cursed Artifact', value: 200, emoji: '🔮' },
                { name: 'Spirit Crystal', value: 180, emoji: '💠' }
            ],
            epic: [
                { name: 'Lich Staff', value: 800, emoji: '🧙‍♂️' },
                { name: 'Necromancer\'s Tome', value: 1000, emoji: '📚' }
            ]
        },
        enemies: ['Skeleton Warrior', 'Ghost', 'Zombie', 'Ancient Lich'],
        theme: '#800080'
    },
    lair: {
        name: 'Dragon\'s Lair',
        emoji: '🐉',
        description: 'Scorching caverns where dragons hoard their treasure',
        minLevel: 15,
        stages: 4,
        boss: 'Elder Dragon',
        difficulty: 'Hard',
        staminaCost: 50,
        entryFee: 250,
        loot: {
            common: [
                { name: 'Dragon Scales', value: 40, emoji: '🐲' },
                { name: 'Burning Ember', value: 30, emoji: '🔥' },
                { name: 'Molten Rock', value: 20, emoji: '🪨' }
            ],
            rare: [
                { name: 'Dragon Tooth', value: 300, emoji: '🦷' },
                { name: 'Fire Crystal', value: 400, emoji: '💎' },
                { name: 'Dragon Claw', value: 350, emoji: '🔥' }
            ],
            epic: [
                { name: 'Dragon Heart', value: 2000, emoji: '❤️' },
                { name: 'Legendary Scale Mail', value: 1500, emoji: '🛡️' }
            ]
        },
        enemies: ['Fire Imp', 'Dragon Whelp', 'Flame Guardian', 'Elder Dragon'],
        theme: '#FF4500'
    },
    temple: {
        name: 'Ancient Temple',
        emoji: '🏛️',
        description: 'Sacred halls protecting divine treasures',
        minLevel: 10,
        stages: 3,
        boss: 'Guardian Golem',
        difficulty: 'Medium',
        staminaCost: 40,
        entryFee: 150,
        loot: {
            common: [
                { name: 'Sacred Relic', value: 35, emoji: '🏺' },
                { name: 'Ancient Scroll', value: 45, emoji: '📜' },
                { name: 'Temple Stone', value: 25, emoji: '🪨' }
            ],
            rare: [
                { name: 'Blessed Gem', value: 250, emoji: '💎' },
                { name: 'Holy Water', value: 200, emoji: '💧' },
                { name: 'Divine Symbol', value: 300, emoji: '✨' }
            ],
            epic: [
                { name: 'Divine Artifact', value: 1200, emoji: '⭐' },
                { name: 'Celestial Armor', value: 1000, emoji: '🛡️' }
            ]
        },
        enemies: ['Temple Guard', 'Stone Sentinel', 'Holy Spirit', 'Guardian Golem'],
        theme: '#FFD700'
    },
    cavern: {
        name: 'Crystal Cavern',
        emoji: '💎',
        description: 'Mystical caves where crystals sing with power',
        minLevel: 8,
        stages: 3,
        boss: 'Crystal Behemoth',
        difficulty: 'Medium',
        staminaCost: 35,
        entryFee: 120,
        loot: {
            common: [
                { name: 'Crystal Shard', value: 30, emoji: '🔷' },
                { name: 'Luminous Dust', value: 20, emoji: '✨' },
                { name: 'Cave Mineral', value: 15, emoji: '🪨' }
            ],
            rare: [
                { name: 'Perfect Crystal', value: 280, emoji: '💎' },
                { name: 'Resonating Gem', value: 220, emoji: '🔮' },
                { name: 'Prism Stone', value: 260, emoji: '🌈' }
            ],
            epic: [
                { name: 'Crystal Core', value: 1500, emoji: '💠' },
                { name: 'Harmony Crystal', value: 1300, emoji: '🎵' }
            ]
        },
        enemies: ['Crystal Spider', 'Gem Elemental', 'Cave Troll', 'Crystal Behemoth'],
        theme: '#00CED1'
    },
    abyss: {
        name: 'Void Abyss',
        emoji: '🕳️',
        description: 'Bottomless pit where reality bends and breaks',
        minLevel: 20,
        stages: 5,
        boss: 'Void Lord',
        difficulty: 'Legendary',
        staminaCost: 75,
        entryFee: 500,
        loot: {
            common: [
                { name: 'Void Fragment', value: 60, emoji: '🌑' },
                { name: 'Dark Matter', value: 80, emoji: '⚫' },
                { name: 'Shadow Essence', value: 70, emoji: '🌫️' }
            ],
            rare: [
                { name: 'Abyssal Crystal', value: 500, emoji: '💜' },
                { name: 'Void Stone', value: 600, emoji: '🖤' },
                { name: 'Reality Shard', value: 750, emoji: '🔮' }
            ],
            epic: [
                { name: 'Void Crown', value: 3000, emoji: '👑' },
                { name: 'Abyssal Weapon', value: 2500, emoji: '⚔️' },
                { name: 'Cosmic Orb', value: 4000, emoji: '🌌' }
            ]
        },
        enemies: ['Shadow Wraith', 'Void Spawn', 'Nightmare Entity', 'Reality Ripper', 'Void Lord'],
        theme: '#2F004F'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('🏰 Explore dangerous dungeons for rare loot and epic adventures')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enter')
                .setDescription('Enter a dungeon')
                .addStringOption(option =>
                    option.setName('dungeon')
                        .setDescription('Which dungeon to enter')
                        .setRequired(true)
                        .addChoices(
                            { name: '🏚️ Haunted Crypt (Level 5+)', value: 'crypt' },
                            { name: '🐉 Dragon\'s Lair (Level 15+)', value: 'lair' },
                            { name: '🏛️ Ancient Temple (Level 10+)', value: 'temple' },
                            { name: '💎 Crystal Cavern (Level 8+)', value: 'cavern' },
                            { name: '🕳️ Void Abyss (Level 20+)', value: 'abyss' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all available dungeons'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your dungeon progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('loot')
                .setDescription('View your dungeon treasures')),

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

            // Initialize dungeon data
            if (!player.dungeons) {
                player.dungeons = {
                    completed: {},
                    active: null,
                    totalRuns: 0,
                    loot: {},
                    lastRun: 0,
                    highestLevel: 0,
                    achievements: []
                };
            }

            if (subcommand === 'enter') {
                const dungeonType = interaction.options.getString('dungeon');
                await this.enterDungeon(interaction, player, dungeonType);
            } else if (subcommand === 'list') {
                await this.listDungeons(interaction, player);
            } else if (subcommand === 'status') {
                await this.showStatus(interaction, player);
            } else if (subcommand === 'loot') {
                await this.showLoot(interaction, player);
            }

        } catch (error) {
            console.error('Error in dungeon command:', error);
            await interaction.editReply({
                content: '❌ An error occurred in the dungeon system.',
                ephemeral: true
            });
        }
    },

    async listDungeons(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#800080')
            .setTitle('🏰 Dungeon Registry')
            .setDescription('╔═══════════════════════════════════════╗\n║        **DUNGEON DIRECTORY**          ║\n╚═══════════════════════════════════════╝')
            .addFields(
                { name: '👤 Explorer Level', value: `**Level ${player.level || 1}**`, inline: true },
                { name: '⚡ Current Stamina', value: `**${player.stamina || 100}/100**`, inline: true },
                { name: '🏆 Dungeons Cleared', value: `**${Object.keys(player.dungeons.completed).length}/5**`, inline: true }
            );

        Object.entries(DUNGEONS).forEach(([key, dungeon]) => {
            const canEnter = (player.level || 1) >= dungeon.minLevel;
            const hasStamina = (player.stamina || 100) >= dungeon.staminaCost;
            const completions = player.dungeons.completed[key] || 0;
            
            let status = '';
            if (!canEnter) status = '🔒 Level Required';
            else if (!hasStamina) status = '⚡ Need Stamina';
            else status = '✅ Available';

            const difficultyColors = {
                'Easy': '🟢',
                'Medium': '🟡',
                'Hard': '🔴',
                'Legendary': '🟣'
            };

            embed.addFields({
                name: `${dungeon.emoji} ${dungeon.name}`,
                value: [
                    `**Description:** ${dungeon.description}`,
                    `**Difficulty:** ${difficultyColors[dungeon.difficulty]} ${dungeon.difficulty}`,
                    `**Requirements:** Level ${dungeon.minLevel} • ${dungeon.staminaCost} Stamina • ${dungeon.entryFee} coins`,
                    `**Stages:** ${dungeon.stages} • **Boss:** ${dungeon.boss}`,
                    `**Times Completed:** ${completions}`,
                    `**Status:** ${status}`
                ].join('\n'),
                inline: false
            });
        });

        const dungeonSelect = new StringSelectMenuBuilder()
            .setCustomId('dungeon_select')
            .setPlaceholder('🎯 Select a dungeon to enter')
            .addOptions(
                Object.entries(DUNGEONS).map(([key, dungeon]) => ({
                    label: `${dungeon.name} (Level ${dungeon.minLevel}+)`,
                    value: key,
                    description: `${dungeon.difficulty} • ${dungeon.stages} stages • ${dungeon.staminaCost} stamina`,
                    emoji: dungeon.emoji
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dungeon_prepare')
                    .setLabel('Preparation Guide')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('dungeon_leaderboard')
                    .setLabel('Dungeon Leaderboard')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('dungeon_shop')
                    .setLabel('Dungeon Shop')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛒')
            );

        const selectRow = new ActionRowBuilder().addComponents(dungeonSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    async enterDungeon(interaction, player, dungeonType) {
        const dungeon = DUNGEONS[dungeonType];
        if (!dungeon) {
            await interaction.editReply({
                content: '❌ Invalid dungeon selected.',
                ephemeral: true
            });
            return;
        }

        // Check requirements
        const currentTime = Date.now();
        const dungeonCooldown = 60 * 60 * 1000; // 1 hour cooldown

        if (currentTime - (player.dungeons.lastRun || 0) < dungeonCooldown) {
            const remainingTime = Math.ceil((dungeonCooldown - (currentTime - player.dungeons.lastRun)) / 60000);
            await interaction.editReply({
                content: `⏳ You must rest for **${remainingTime} minutes** before entering another dungeon.`,
                ephemeral: true
            });
            return;
        }

        if ((player.level || 1) < dungeon.minLevel) {
            await interaction.editReply({
                content: `❌ You need to be **level ${dungeon.minLevel}** to enter ${dungeon.name}! Current level: **${player.level || 1}**`,
                ephemeral: true
            });
            return;
        }

        if ((player.stamina || 100) < dungeon.staminaCost) {
            await interaction.editReply({
                content: `❌ You need **${dungeon.staminaCost} stamina** to enter ${dungeon.name}! Current: **${player.stamina || 100}**`,
                ephemeral: true
            });
            return;
        }

        if ((player.coins || 0) < dungeon.entryFee) {
            await interaction.editReply({
                content: `❌ Entry fee required: **${dungeon.entryFee} coins**! You have **${player.coins || 0}** coins.`,
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(dungeon.theme)
            .setTitle(`${dungeon.emoji} Entering ${dungeon.name}`)
            .setDescription(`**${dungeon.description}**\n\nYou stand before the entrance, feeling the ominous energy within...`)
            .addFields(
                { name: '⚔️ Difficulty', value: dungeon.difficulty, inline: true },
                { name: '🏰 Stages', value: dungeon.stages.toString(), inline: true },
                { name: '👹 Final Boss', value: dungeon.boss, inline: true },
                { name: '⚡ Stamina Cost', value: dungeon.staminaCost.toString(), inline: true },
                { name: '💰 Entry Fee', value: `${dungeon.entryFee} coins`, inline: true },
                { name: '🎲 Success Rate', value: `${this.calculateSuccessRate(player, dungeon)}%`, inline: true }
            )
            .addFields({
                name: '⚠️ Warning',
                value: 'Dungeons are dangerous! Failure may result in loss of items and stamina.',
                inline: false
            });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`dungeon_confirm_${dungeonType}`)
                    .setLabel('Enter Dungeon')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('dungeon_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚪'),
                new ButtonBuilder()
                    .setCustomId('dungeon_prepare_gear')
                    .setLabel('Check Gear')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎒')
            );

        const response = await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });

        // Set up button collector
        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

            if (confirmation.customId === `dungeon_confirm_${dungeonType}`) {
                await this.runDungeon(confirmation, player, dungeon, dungeonType);
            } else if (confirmation.customId === 'dungeon_prepare_gear') {
                await this.showGearCheck(confirmation, player, dungeon);
            } else {
                await confirmation.update({
                    content: '❌ Dungeon entry cancelled. You retreat to safety.',
                    embeds: [],
                    components: []
                });
            }
        } catch (e) {
            await interaction.editReply({
                content: '❌ Dungeon entry request expired.',
                embeds: [],
                components: []
            });
        }
    },

    async runDungeon(interaction, player, dungeon, dungeonType) {
        // Deduct costs
        player.stamina = (player.stamina || 100) - dungeon.staminaCost;
        player.coins = (player.coins || 0) - dungeon.entryFee;
        player.dungeons.lastRun = Date.now();
        player.dungeons.totalRuns++;

        const results = this.simulateDungeonRun(player, dungeon);
        
        // Update player data based on results
        if (results.success) {
            // Add completions
            player.dungeons.completed[dungeonType] = (player.dungeons.completed[dungeonType] || 0) + 1;
            
            // Add loot to inventory
            if (!player.inventory) player.inventory = {};
            results.loot.forEach(item => {
                player.inventory[item.name] = (player.inventory[item.name] || 0) + 1;
            });
            
            // Add coins and experience
            player.coins += results.coinsEarned;
            player.experience = (player.experience || 0) + results.expEarned;
            
            // Check for level up
            const newLevel = Math.floor(player.experience / 100) + 1;
            if (newLevel > (player.level || 1)) {
                player.level = newLevel;
                player.dungeons.highestLevel = Math.max(player.dungeons.highestLevel, newLevel);
            }
        } else {
            // Failure penalties
            player.stamina = Math.max(0, player.stamina - 10);
        }

        await db.updatePlayer(interaction.user.id, player);

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(results.success ? '#00FF00' : '#FF0000')
            .setTitle(`${dungeon.emoji} ${dungeon.name} - ${results.success ? 'Victory!' : 'Defeat...'}`)
            .setDescription(results.success ? 
                '🎉 **DUNGEON CLEARED!** You have successfully conquered the dungeon!' :
                '💀 **DEFEAT!** The dungeon proved too challenging this time...')
            .addFields(
                { name: '🏰 Stages Cleared', value: `${results.stagesCleared}/${dungeon.stages}`, inline: true },
                { name: '👹 Enemies Defeated', value: results.enemiesDefeated.toString(), inline: true },
                { name: '❤️ Health Remaining', value: `${Math.max(0, results.finalHealth)}%`, inline: true }
            );

        if (results.success) {
            embed.addFields(
                { name: '💰 Coins Earned', value: results.coinsEarned.toString(), inline: true },
                { name: '🎯 Experience Gained', value: results.expEarned.toString(), inline: true },
                { name: '🎁 Items Found', value: results.loot.length.toString(), inline: true }
            );

            if (results.loot.length > 0) {
                const lootText = results.loot.map(item => `${item.emoji} ${item.name}`).join('\n');
                embed.addFields({ name: '🏆 Treasure Acquired', value: lootText, inline: false });
            }
        }

        // Add stage-by-stage breakdown
        embed.addFields({
            name: '📖 Adventure Log',
            value: results.stageResults.join('\n'),
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dungeon_try_again')
                    .setLabel('Enter Another Dungeon')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏰'),
                new ButtonBuilder()
                    .setCustomId('dungeon_view_loot')
                    .setLabel('View All Loot')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setCustomId('dungeon_status')
                    .setLabel('Dungeon Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.update({
            embeds: [embed],
            components: [buttons]
        });
    },

    simulateDungeonRun(player, dungeon) {
        const playerPower = this.calculatePlayerPower(player);
        const dungeonPower = dungeon.minLevel * 10 + dungeon.stages * 5;
        
        let health = 100;
        let stagesCleared = 0;
        let enemiesDefeated = 0;
        let loot = [];
        let coinsEarned = 0;
        let expEarned = 0;
        const stageResults = [];

        for (let stage = 1; stage <= dungeon.stages; stage++) {
            const stageSuccess = Math.random() < (playerPower / (dungeonPower + stage * 10));
            const stageDamage = Math.floor(Math.random() * 30) + 10;
            
            if (stageSuccess) {
                stagesCleared++;
                enemiesDefeated += Math.floor(Math.random() * 3) + 1;
                health -= stageDamage;
                
                // Generate loot for successful stage
                const lootRoll = Math.random();
                let stageItem = null;
                
                if (lootRoll > 0.95 && dungeon.loot.epic.length > 0) {
                    stageItem = dungeon.loot.epic[Math.floor(Math.random() * dungeon.loot.epic.length)];
                } else if (lootRoll > 0.7 && dungeon.loot.rare.length > 0) {
                    stageItem = dungeon.loot.rare[Math.floor(Math.random() * dungeon.loot.rare.length)];
                } else if (dungeon.loot.common.length > 0) {
                    stageItem = dungeon.loot.common[Math.floor(Math.random() * dungeon.loot.common.length)];
                }
                
                if (stageItem) {
                    loot.push(stageItem);
                    coinsEarned += stageItem.value;
                }
                
                expEarned += 25 * stage;
                stageResults.push(`**Stage ${stage}:** ✅ Cleared! Found ${stageItem ? stageItem.emoji + ' ' + stageItem.name : 'nothing special'}`);
            } else {
                health -= stageDamage * 2;
                stageResults.push(`**Stage ${stage}:** ❌ Failed! Took heavy damage.`);
                break;
            }
            
            if (health <= 0) {
                stageResults.push(`**Health:** 💀 You were defeated!`);
                break;
            }
        }

        return {
            success: stagesCleared === dungeon.stages && health > 0,
            stagesCleared,
            enemiesDefeated,
            finalHealth: health,
            loot,
            coinsEarned,
            expEarned,
            stageResults
        };
    },

    calculatePlayerPower(player) {
        let power = (player.level || 1) * 10;
        power += (player.experience || 0) / 10;
        power += (player.coins || 0) / 100;
        
        // Equipment bonuses (simplified)
        if (player.inventory && Object.keys(player.inventory).length > 5) {
            power += 20; // Well-equipped bonus
        }
        
        return power;
    },

    calculateSuccessRate(player, dungeon) {
        const playerPower = this.calculatePlayerPower(player);
        const dungeonPower = dungeon.minLevel * 10 + dungeon.stages * 15;
        return Math.min(95, Math.max(5, Math.floor((playerPower / dungeonPower) * 100)));
    },

    async showStatus(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#800080')
            .setTitle('🏰 Dungeon Explorer Status')
            .setDescription('**Your dungeon exploration progress and achievements**')
            .addFields(
                { name: '🎯 Total Runs', value: player.dungeons.totalRuns.toString(), inline: true },
                { name: '🏆 Dungeons Completed', value: Object.keys(player.dungeons.completed).length.toString(), inline: true },
                { name: '⭐ Highest Level Reached', value: player.dungeons.highestLevel.toString(), inline: true }
            );

        // Individual dungeon completion status
        Object.entries(DUNGEONS).forEach(([key, dungeon]) => {
            const completions = player.dungeons.completed[key] || 0;
            const canAccess = (player.level || 1) >= dungeon.minLevel;
            
            embed.addFields({
                name: `${dungeon.emoji} ${dungeon.name}`,
                value: `**Status:** ${canAccess ? '✅ Unlocked' : '🔒 Locked'}\n**Completions:** ${completions} times\n**Difficulty:** ${dungeon.difficulty}`,
                inline: true
            });
        });

        await interaction.editReply({ embeds: [embed] });
    },

    async showLoot(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💎 Dungeon Treasure Collection')
            .setDescription('**Rare artifacts and treasures found in your adventures**');

        if (!player.inventory || Object.keys(player.inventory).length === 0) {
            embed.addFields({
                name: '📦 No Treasures Yet',
                value: 'You haven\'t found any dungeon loot yet! Enter some dungeons to start collecting.',
                inline: false
            });
        } else {
            const lootByRarity = { common: [], rare: [], epic: [] };
            
            // Categorize loot (simplified - in a real bot you'd track rarity)
            Object.entries(player.inventory).forEach(([itemName, quantity]) => {
                if (quantity > 0) {
                    // Simple rarity detection based on item name
                    if (itemName.includes('Crystal') || itemName.includes('Heart') || itemName.includes('Crown')) {
                        lootByRarity.epic.push(`${itemName}: ${quantity}`);
                    } else if (itemName.includes('Gem') || itemName.includes('Artifact') || itemName.includes('Staff')) {
                        lootByRarity.rare.push(`${itemName}: ${quantity}`);
                    } else {
                        lootByRarity.common.push(`${itemName}: ${quantity}`);
                    }
                }
            });

            if (lootByRarity.epic.length > 0) {
                embed.addFields({
                    name: '🌟 Epic Treasures',
                    value: lootByRarity.epic.join('\n') || 'None',
                    inline: false
                });
            }
            
            if (lootByRarity.rare.length > 0) {
                embed.addFields({
                    name: '💠 Rare Items',
                    value: lootByRarity.rare.join('\n') || 'None',
                    inline: false
                });
            }
            
            if (lootByRarity.common.length > 0) {
                embed.addFields({
                    name: '📦 Common Finds',
                    value: lootByRarity.common.slice(0, 10).join('\n') + (lootByRarity.common.length > 10 ? '\n...and more!' : ''),
                    inline: false
                });
            }
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
