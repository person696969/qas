
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spellcraft')
        .setDescription('✨ Create and discover magical spells')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Craft a new spell')
                .addStringOption(option =>
                    option.setName('element')
                        .setDescription('Base element for the spell')
                        .setRequired(true)
                        .addChoices(
                            { name: '🔥 Fire', value: 'fire' },
                            { name: '❄️ Ice', value: 'ice' },
                            { name: '⚡ Lightning', value: 'lightning' },
                            { name: '🌿 Nature', value: 'nature' },
                            { name: '🌑 Shadow', value: 'shadow' },
                            { name: '🔮 Arcane', value: 'arcane' },
                            { name: '💀 Necromancy', value: 'necromancy' },
                            { name: '🌟 Divine', value: 'divine' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('study')
                .setDescription('Study your spellbook'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('enhance')
                .setDescription('Enhance an existing spell')
                .addStringOption(option =>
                    option.setName('spell_id')
                        .setDescription('ID of the spell to enhance')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('research')
                .setDescription('Research new magical discoveries')
                .addIntegerOption(option =>
                    option.setName('hours')
                        .setDescription('Research duration (1-24 hours)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(24)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('combine')
                .setDescription('Combine two spells to create a hybrid')
                .addStringOption(option =>
                    option.setName('spell1_id')
                        .setDescription('First spell ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('spell2_id')
                        .setDescription('Second spell ID')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                return await interaction.editReply({
                    embeds: [this.createErrorEmbed('❌ Profile Required', 'You need to create a profile first! Use `/profile` to get started.')],
                    ephemeral: true
                });
            }

            // Initialize spellcraft data
            if (!player.spellcraft) {
                player.spellcraft = {
                    spells: [],
                    materials: {},
                    experience: 0,
                    level: 1,
                    lastCraft: 0,
                    lastResearch: 0,
                    discoveries: [],
                    researching: null,
                    specialization: null,
                    achievements: []
                };
            }

            const elements = {
                fire: {
                    name: 'Fire',
                    emoji: '🔥',
                    color: '#FF4500',
                    materials: ['phoenix_feather', 'volcanic_ash', 'dragon_scale', 'flame_essence'],
                    effects: ['burn', 'melt', 'explosion', 'ignite', 'immolate']
                },
                ice: {
                    name: 'Ice',
                    emoji: '❄️',
                    color: '#87CEEB',
                    materials: ['frost_crystal', 'northern_wind', 'glacier_shard', 'ice_essence'],
                    effects: ['freeze', 'chill', 'blizzard', 'shatter', 'frostbite']
                },
                lightning: {
                    name: 'Lightning',
                    emoji: '⚡',
                    color: '#FFD700',
                    materials: ['storm_essence', 'conductive_crystal', 'thunder_stone', 'static_orb'],
                    effects: ['shock', 'paralyze', 'chain', 'overload', 'storm']
                },
                nature: {
                    name: 'Nature',
                    emoji: '🌿',
                    color: '#228B22',
                    materials: ['ancient_seed', 'living_wood', 'vital_essence', 'earth_stone'],
                    effects: ['grow', 'heal', 'entangle', 'regenerate', 'bloom']
                },
                shadow: {
                    name: 'Shadow',
                    emoji: '🌑',
                    color: '#4B0082',
                    materials: ['void_shard', 'dark_essence', 'nightmare_dust', 'shadow_silk'],
                    effects: ['blind', 'drain', 'possess', 'corrupt', 'vanish']
                },
                arcane: {
                    name: 'Arcane',
                    emoji: '🔮',
                    color: '#9932CC',
                    materials: ['mana_crystal', 'arcane_dust', 'mystic_orb', 'pure_essence'],
                    effects: ['dispel', 'teleport', 'shield', 'amplify', 'reality_warp']
                },
                necromancy: {
                    name: 'Necromancy',
                    emoji: '💀',
                    color: '#8B008B',
                    materials: ['bone_powder', 'soul_gem', 'death_essence', 'spectral_cloth'],
                    effects: ['animate', 'decay', 'soul_drain', 'curse', 'resurrect']
                },
                divine: {
                    name: 'Divine',
                    emoji: '🌟',
                    color: '#FFD700',
                    materials: ['blessed_water', 'holy_symbol', 'divine_essence', 'angel_feather'],
                    effects: ['purify', 'bless', 'smite', 'sanctuary', 'miracle']
                }
            };

            switch (subcommand) {
                case 'create':
                    await this.handleCreate(interaction, player, elements);
                    break;
                case 'study':
                    await this.handleStudy(interaction, player, elements);
                    break;
                case 'enhance':
                    await this.handleEnhance(interaction, player, elements);
                    break;
                case 'research':
                    await this.handleResearch(interaction, player);
                    break;
                case 'combine':
                    await this.handleCombine(interaction, player, elements);
                    break;
            }

        } catch (error) {
            console.error('Error in spellcraft command:', error);
            await interaction.editReply({
                embeds: [this.createErrorEmbed('🚫 Magical Interference', 'The magical energies are unstable right now. Please try again in a moment.')],
                ephemeral: true
            });
        }
    },

    async handleCreate(interaction, player, elements) {
        const element = interaction.options.getString('element');
        const currentTime = Date.now();
        const craftCooldown = 1800000; // 30 minutes

        // Check cooldown
        if (currentTime - player.spellcraft.lastCraft < craftCooldown) {
            const remainingTime = Math.ceil((craftCooldown - (currentTime - player.spellcraft.lastCraft)) / 60000);
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('⏳ Magical Exhaustion', `You need to rest for ${remainingTime} more minutes before crafting another spell.\n\n💡 *Tip: Use this time to gather materials or study your spellbook!*`)],
                ephemeral: true
            });
        }

        // Check stamina
        if (!player.stamina || player.stamina < 40) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('😴 Insufficient Energy', 'You need 40 stamina to craft a spell!\n\n💡 *Rest or use stamina potions to restore energy.*')],
                ephemeral: true
            });
        }

        const elementData = elements[element];
        const requiredMaterials = elementData.materials.slice(0, 3);
        const missingMaterials = requiredMaterials.filter(material => 
            !player.inventory?.materials?.[material] || 
            player.inventory.materials[material] < 1
        );

        if (missingMaterials.length > 0) {
            return await interaction.editReply({
                embeds: [this.createMaterialsEmbed(elementData, requiredMaterials, missingMaterials)],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(elementData.color)
            .setTitle(`✨ ${elementData.emoji} Spell Crafting Laboratory`)
            .setDescription(`╔══════════════════════════════════════╗\n║        **${elementData.name} Magic Creation**       ║\n╚══════════════════════════════════════╝\n\n🎯 *Channel the essence of ${elementData.name.toLowerCase()} into a powerful spell*`)
            .addFields(
                { 
                    name: '🧪 Required Materials', 
                    value: requiredMaterials.map(m => `• ${m.replace('_', ' ')}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '⚡ Energy Cost', 
                    value: '`40 Stamina`', 
                    inline: true 
                },
                { 
                    name: '🎲 Success Factors', 
                    value: `**Level:** ${player.spellcraft.level}\n**Experience:** ${player.spellcraft.experience}\n**Specialization:** ${player.spellcraft.specialization || 'None'}`, 
                    inline: true 
                },
                { 
                    name: `🌟 Potential ${elementData.name} Effects`, 
                    value: elementData.effects.map(e => `• ${e.charAt(0).toUpperCase() + e.slice(1)}`).join('\n'), 
                    inline: false 
                }
            )
            .setFooter({ text: '💎 Higher level increases success rate and spell quality' })
            .setTimestamp();

        const craftButton = new ButtonBuilder()
            .setCustomId(`spell_craft_${element}`)
            .setLabel('Begin Spellcrafting')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✨');

        const advancedButton = new ButtonBuilder()
            .setCustomId(`spell_advanced_${element}`)
            .setLabel('Advanced Crafting')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔮');

        const cancelButton = new ButtonBuilder()
            .setCustomId('spell_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const row = new ActionRowBuilder()
            .addComponents(craftButton, advancedButton, cancelButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        await this.setupSpellcraftCollector(interaction, player, element, elementData, requiredMaterials);
    },

    async handleStudy(interaction, player, elements) {
        if (!player.spellcraft.spells || player.spellcraft.spells.length === 0) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('📚 Empty Spellbook', 'Your spellbook is empty! Try crafting some spells first.\n\n💡 *Use `/spellcraft create` to begin your magical journey.*')],
                ephemeral: true
            });
        }

        const level = player.spellcraft.level || 1;
        const experience = player.spellcraft.experience || 0;
        const nextLevelExp = level * 100;
        const progressPercent = Math.round((experience % 100) / 100 * 20);
        const progressBar = '█'.repeat(progressPercent) + '░'.repeat(20 - progressPercent);

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📚 Arcane Spellbook')
            .setDescription(`╔══════════════════════════════════════╗\n║        **Magical Knowledge Archive**        ║\n╚══════════════════════════════════════╝\n\n🎯 *Your collection of mystical spells and discoveries*`)
            .addFields(
                { 
                    name: '🌟 Arcane Mastery', 
                    value: `**Level:** ${level}\n**Experience:** ${experience}/${nextLevelExp}\n**Progress:** \`${progressBar}\` ${experience % 100}/100`, 
                    inline: true 
                },
                { 
                    name: '📊 Collection Stats', 
                    value: `**Total Spells:** ${player.spellcraft.spells.length}\n**Discoveries:** ${player.spellcraft.discoveries.length}\n**Specialization:** ${player.spellcraft.specialization || 'None'}`, 
                    inline: true 
                },
                { 
                    name: '🏆 Achievements', 
                    value: player.spellcraft.achievements?.length > 0 ? 
                        player.spellcraft.achievements.slice(0, 3).join('\n') : 
                        'No achievements yet', 
                    inline: true 
                }
            );

        // Group spells by element
        const spellsByElement = {};
        Object.keys(elements).forEach(element => {
            spellsByElement[element] = player.spellcraft.spells.filter(spell => spell.element === element);
        });

        Object.entries(spellsByElement).forEach(([element, spells]) => {
            if (spells.length > 0) {
                const elementData = elements[element];
                const spellList = spells.slice(0, 3).map(spell => 
                    `${this.getQualityEmoji(spell.quality)} **${spell.name}**\n` +
                    `├ Power: ${spell.power} | Effects: ${spell.effects.slice(0, 2).join(', ')}\n` +
                    `└ Created: <t:${Math.floor(spell.created / 1000)}:R>`
                ).join('\n\n');

                embed.addFields({
                    name: `${elementData.emoji} ${elementData.name} Spells (${spells.length})`,
                    value: spellList + (spells.length > 3 ? `\n\n*+${spells.length - 3} more spells*` : ''),
                    inline: false
                });
            }
        });

        if (player.spellcraft.discoveries.length > 0) {
            embed.addFields({
                name: '🌟 Magical Discoveries',
                value: player.spellcraft.discoveries.slice(0, 5).map(d => `• ${d}`).join('\n'),
                inline: false
            });
        }

        const spellSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('spellbook_select')
            .setPlaceholder('🔍 Select a spell to examine in detail...')
            .addOptions(
                player.spellcraft.spells.slice(0, 25).map(spell => ({
                    label: spell.name,
                    value: spell.id,
                    description: `${spell.element} | Power: ${spell.power} | ${spell.quality}`,
                    emoji: elements[spell.element].emoji
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spellbook_organize')
                    .setLabel('Organize Spells')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('spellbook_statistics')
                    .setLabel('Detailed Stats')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('spellbook_export')
                    .setLabel('Export Spellbook')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📤')
            );

        const components = [new ActionRowBuilder().addComponents(spellSelectMenu), buttons];

        await interaction.editReply({ embeds: [embed], components });
    },

    async handleEnhance(interaction, player, elements) {
        const spellId = interaction.options.getString('spell_id');
        const spellIndex = player.spellcraft.spells.findIndex(s => s.id === spellId);

        if (spellIndex === -1) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('🔍 Spell Not Found', 'This spell doesn\'t exist in your spellbook!\n\n💡 *Use `/spellcraft study` to view your available spells.*')],
                ephemeral: true
            });
        }

        const spell = player.spellcraft.spells[spellIndex];
        const elementData = elements[spell.element];
        const baseCost = 100;
        const enhanceCost = Math.floor(baseCost * Math.pow(1.3, spell.power / 5));

        if ((player.gold || 0) < enhanceCost) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('💰 Insufficient Funds', `You need ${enhanceCost} gold to enhance this spell!\n\n💡 *Try treasure hunting or completing quests to earn gold.*`)],
                ephemeral: true
            });
        }

        if (!player.stamina || player.stamina < 30) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('😴 Insufficient Energy', 'You need 30 stamina to enhance a spell!')],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(elementData.color)
            .setTitle(`🔮 ${elementData.emoji} Spell Enhancement Chamber`)
            .setDescription(`╔══════════════════════════════════════╗\n║        **Magical Amplification**        ║\n╚══════════════════════════════════════╝\n\n✨ *Enhance the power of your spell with ancient techniques*`)
            .addFields(
                { 
                    name: '📜 Spell Details', 
                    value: `**Name:** ${spell.name}\n**Element:** ${elementData.emoji} ${elementData.name}\n**Current Power:** ${spell.power}\n**Quality:** ${this.getQualityEmoji(spell.quality)} ${spell.quality}`, 
                    inline: true 
                },
                { 
                    name: '💎 Enhancement Cost', 
                    value: `**Gold:** ${enhanceCost}\n**Stamina:** 30\n**Success Rate:** ${this.calculateEnhanceSuccessRate(player, spell)}%`, 
                    inline: true 
                },
                { 
                    name: '🎯 Potential Outcomes', 
                    value: `**Minor:** +1-2 Power\n**Good:** +3-4 Power\n**Great:** +5-7 Power\n**Perfect:** +8-10 Power + Effect`, 
                    inline: true 
                },
                { 
                    name: '⚡ Current Effects', 
                    value: spell.effects.map(e => `• ${e.charAt(0).toUpperCase() + e.slice(1)}`).join('\n'), 
                    inline: false 
                }
            )
            .setFooter({ text: '⚠️ Enhancement has a small chance of failure' })
            .setTimestamp();

        const enhanceButton = new ButtonBuilder()
            .setCustomId(`spell_enhance_${spell.id}`)
            .setLabel('Enhance Spell')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔮');

        const safeEnhanceButton = new ButtonBuilder()
            .setCustomId(`spell_safe_enhance_${spell.id}`)
            .setLabel('Safe Enhancement')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛡️');

        const cancelButton = new ButtonBuilder()
            .setCustomId('enhance_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const row = new ActionRowBuilder()
            .addComponents(enhanceButton, safeEnhanceButton, cancelButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        await this.setupEnhanceCollector(interaction, player, spell, enhanceCost, elementData);
    },

    async handleResearch(interaction, player) {
        const hours = interaction.options.getInteger('hours') || 1;
        const currentTime = Date.now();
        const researchCooldown = 3600000; // 1 hour

        if (player.spellcraft.researching) {
            const remainingTime = Math.max(0, player.spellcraft.researching.completionTime - currentTime);
            if (remainingTime > 0) {
                const remainingHours = Math.ceil(remainingTime / 3600000);
                return await interaction.editReply({
                    embeds: [this.createErrorEmbed('🔬 Research in Progress', `You're already researching! It will complete in ${remainingHours} hour(s).\n\n💡 *Check back later to discover your findings.*`)],
                    ephemeral: true
                });
            }
        }

        if (currentTime - (player.spellcraft.lastResearch || 0) < researchCooldown) {
            const remainingTime = Math.ceil((researchCooldown - (currentTime - player.spellcraft.lastResearch)) / 60000);
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('📚 Mental Fatigue', `You need ${remainingTime} more minutes before starting new research.`)],
                ephemeral: true
            });
        }

        const researchCost = hours * 50;
        if ((player.gold || 0) < researchCost) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('💰 Research Funding Required', `You need ${researchCost} gold for ${hours} hour(s) of research.`)],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#6A5ACD')
            .setTitle('🔬 Arcane Research Laboratory')
            .setDescription(`╔══════════════════════════════════════╗\n║        **Magical Investigation**        ║\n╚══════════════════════════════════════╝\n\n🎯 *Delve into the mysteries of magic and unlock new secrets*`)
            .addFields(
                { 
                    name: '⏰ Research Duration', 
                    value: `${hours} hour(s)`, 
                    inline: true 
                },
                { 
                    name: '💰 Research Cost', 
                    value: `${researchCost} gold`, 
                    inline: true 
                },
                { 
                    name: '🎲 Success Factors', 
                    value: `**Level:** ${player.spellcraft.level}\n**Experience:** ${player.spellcraft.experience}\n**Discoveries:** ${player.spellcraft.discoveries.length}`, 
                    inline: true 
                },
                { 
                    name: '🌟 Potential Discoveries', 
                    value: `• New spell recipes\n• Rare magical materials\n• Ancient techniques\n• Elemental secrets\n• Mystical knowledge`, 
                    inline: false 
                }
            )
            .setFooter({ text: '💎 Longer research increases chances of rare discoveries' })
            .setTimestamp();

        const startButton = new ButtonBuilder()
            .setCustomId(`research_start_${hours}`)
            .setLabel('Begin Research')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔬');

        const focusButton = new ButtonBuilder()
            .setCustomId(`research_focus_${hours}`)
            .setLabel('Focused Research')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎯');

        const cancelButton = new ButtonBuilder()
            .setCustomId('research_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const row = new ActionRowBuilder()
            .addComponents(startButton, focusButton, cancelButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },

    async handleCombine(interaction, player, elements) {
        const spell1Id = interaction.options.getString('spell1_id');
        const spell2Id = interaction.options.getString('spell2_id');

        const spell1 = player.spellcraft.spells.find(s => s.id === spell1Id);
        const spell2 = player.spellcraft.spells.find(s => s.id === spell2Id);

        if (!spell1 || !spell2) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('🔍 Spell Not Found', 'One or both spells don\'t exist in your spellbook!')],
                ephemeral: true
            });
        }

        if (spell1.id === spell2.id) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('⚠️ Invalid Combination', 'You cannot combine a spell with itself!')],
                ephemeral: true
            });
        }

        const combineCost = Math.floor((spell1.power + spell2.power) * 10);
        if ((player.gold || 0) < combineCost) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('💰 Insufficient Funds', `You need ${combineCost} gold to combine these spells!`)],
                ephemeral: true
            });
        }

        const element1Data = elements[spell1.element];
        const element2Data = elements[spell2.element];

        const embed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle('⚗️ Spell Fusion Laboratory')
            .setDescription(`╔══════════════════════════════════════╗\n║        **Magical Synthesis**        ║\n╚══════════════════════════════════════╝\n\n🌟 *Combine two spells to create something entirely new*`)
            .addFields(
                { 
                    name: `${element1Data.emoji} First Spell`, 
                    value: `**${spell1.name}**\nPower: ${spell1.power}\nEffects: ${spell1.effects.join(', ')}`, 
                    inline: true 
                },
                { 
                    name: `${element2Data.emoji} Second Spell`, 
                    value: `**${spell2.name}**\nPower: ${spell2.power}\nEffects: ${spell2.effects.join(', ')}`, 
                    inline: true 
                },
                { 
                    name: '💎 Fusion Cost', 
                    value: `**Gold:** ${combineCost}\n**Risk:** Medium\n**Success Rate:** ${this.calculateCombineSuccessRate(spell1, spell2)}%`, 
                    inline: true 
                },
                { 
                    name: '🎯 Potential Results', 
                    value: `• Hybrid spell with combined effects\n• Enhanced power from both sources\n• Unique elemental combinations\n• Rare spell variants`, 
                    inline: false 
                }
            )
            .setFooter({ text: '⚠️ Both original spells will be consumed in the fusion process' })
            .setTimestamp();

        const combineButton = new ButtonBuilder()
            .setCustomId(`spell_combine_${spell1.id}_${spell2.id}`)
            .setLabel('Fuse Spells')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚗️');

        const cancelButton = new ButtonBuilder()
            .setCustomId('combine_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const row = new ActionRowBuilder()
            .addComponents(combineButton, cancelButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },

    // Utility Functions
    createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    },

    createMaterialsEmbed(elementData, required, missing) {
        return new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`❌ Missing ${elementData.emoji} Materials`)
            .setDescription(`╔══════════════════════════════════════╗\n║        **Material Requirements**        ║\n╚══════════════════════════════════════╝`)
            .addFields(
                { 
                    name: '✅ Required Materials', 
                    value: required.map(m => `• ${m.replace('_', ' ')}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '❌ Missing Materials', 
                    value: missing.map(m => `• ${m.replace('_', ' ')}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '💡 How to Obtain', 
                    value: '• Explore dungeons and caves\n• Trade with merchants\n• Complete quests\n• Use alchemy transmutation', 
                    inline: false 
                }
            );
    },

    getQualityEmoji(quality) {
        const emojis = {
            'common': '⚪',
            'uncommon': '🟢',
            'rare': '🔵',
            'epic': '🟣',
            'legendary': '🟠',
            'masterwork': '🔴'
        };
        return emojis[quality] || '⚪';
    },

    calculateEnhanceSuccessRate(player, spell) {
        let baseRate = 60;
        baseRate += Math.min(player.spellcraft.level * 2, 20);
        baseRate += Math.min(player.spellcraft.experience / 50, 15);
        if (player.spellcraft.specialization) baseRate += 10;
        baseRate -= Math.max(0, spell.power - 20);
        return Math.max(30, Math.min(95, baseRate));
    },

    calculateCombineSuccessRate(spell1, spell2) {
        let baseRate = 40;
        if (spell1.element === spell2.element) baseRate += 20;
        const avgPower = (spell1.power + spell2.power) / 2;
        baseRate -= Math.max(0, avgPower - 15);
        return Math.max(20, Math.min(80, baseRate));
    },

    async setupSpellcraftCollector(interaction, player, element, elementData, requiredMaterials) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.customId === 'spell_cancel') {
                await i.editReply({
                    embeds: [this.createErrorEmbed('❌ Cancelled', 'Spell crafting cancelled.')],
                    components: []
                });
                return;
            }

            if (i.customId.startsWith('spell_craft_') || i.customId.startsWith('spell_advanced_')) {
                const isAdvanced = i.customId.startsWith('spell_advanced_');
                await this.processSpellCraft(i, player, element, elementData, requiredMaterials, isAdvanced);
            }
        });

        collector.on('end', () => {
            // Collector cleanup handled automatically
        });
    },

    async setupEnhanceCollector(interaction, player, spell, enhanceCost, elementData) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.customId === 'enhance_cancel') {
                await i.editReply({
                    embeds: [this.createErrorEmbed('❌ Cancelled', 'Enhancement cancelled.')],
                    components: []
                });
                return;
            }

            if (i.customId.startsWith('spell_enhance_') || i.customId.startsWith('spell_safe_enhance_')) {
                const isSafe = i.customId.startsWith('spell_safe_enhance_');
                await this.processEnhancement(i, player, spell, enhanceCost, elementData, isSafe);
            }
        });
    },

    async processSpellCraft(interaction, player, element, elementData, requiredMaterials, isAdvanced) {
        const currentTime = Date.now();
        
        // Consume resources
        player.stamina -= 40;
        player.spellcraft.lastCraft = currentTime;

        requiredMaterials.forEach(material => {
            if (!player.inventory.materials) player.inventory.materials = {};
            player.inventory.materials[material] = (player.inventory.materials[material] || 0) - 1;
        });

        // Calculate success and results
        let successRate = Math.random();
        if (isAdvanced) {
            // Advanced crafting costs more but has better success rates
            player.gold = (player.gold || 0) - 200;
            successRate += 0.2;
        }

        let spellQuality, effects, experienceGain, powerRange;

        if (successRate > 0.95) {
            spellQuality = 'legendary';
            effects = [...elementData.effects];
            experienceGain = 300;
            powerRange = [25, 35];
        } else if (successRate > 0.85) {
            spellQuality = 'epic';
            effects = elementData.effects.slice(0, 4);
            experienceGain = 200;
            powerRange = [20, 30];
        } else if (successRate > 0.7) {
            spellQuality = 'rare';
            effects = elementData.effects.slice(0, 3);
            experienceGain = 150;
            powerRange = [15, 25];
        } else if (successRate > 0.4) {
            spellQuality = 'uncommon';
            effects = elementData.effects.slice(0, 2);
            experienceGain = 100;
            powerRange = [10, 20];
        } else {
            spellQuality = 'common';
            effects = [elementData.effects[0]];
            experienceGain = 50;
            powerRange = [5, 15];
        }

        const newSpell = {
            id: `${element}_${Date.now()}`,
            name: this.generateSpellName(element, spellQuality),
            element: element,
            quality: spellQuality,
            effects: effects,
            power: Math.floor(Math.random() * (powerRange[1] - powerRange[0] + 1)) + powerRange[0] + Math.floor(player.spellcraft.experience / 100),
            created: currentTime,
            crafted_by: interaction.user.id
        };

        player.spellcraft.spells.push(newSpell);
        player.spellcraft.experience += experienceGain;
        
        // Level up check
        const newLevel = Math.floor(player.spellcraft.experience / 100) + 1;
        const leveledUp = newLevel > player.spellcraft.level;
        if (leveledUp) {
            player.spellcraft.level = newLevel;
        }

        await db.updatePlayer(interaction.user.id, player);

        const successEmbed = new EmbedBuilder()
            .setColor(elementData.color)
            .setTitle(`✨ ${elementData.emoji} Spell Successfully Created!`)
            .setDescription(`╔══════════════════════════════════════╗\n║        **${newSpell.name}**        ║\n╚══════════════════════════════════════╝\n\n🎊 *Your magical creation is complete!*`)
            .addFields(
                { name: '💎 Quality', value: `${this.getQualityEmoji(spellQuality)} ${spellQuality.toUpperCase()}`, inline: true },
                { name: '⚡ Power', value: newSpell.power.toString(), inline: true },
                { name: '🎯 Effects', value: effects.map(e => `• ${e.charAt(0).toUpperCase() + e.slice(1)}`).join('\n'), inline: true },
                { name: '📚 Experience Gained', value: `+${experienceGain} XP`, inline: false }
            );

        if (leveledUp) {
            successEmbed.addFields({
                name: '🎉 Level Up!',
                value: `You've reached **Level ${newLevel}**!\nNew abilities and bonuses unlocked!`,
                inline: false
            });
        }

        await interaction.editReply({
            embeds: [successEmbed],
            components: []
        });
    },

    async processEnhancement(interaction, player, spell, enhanceCost, elementData, isSafe) {
        player.gold -= enhanceCost;
        player.stamina -= 30;

        let enhanceSuccess = Math.random();
        if (isSafe) {
            enhanceSuccess += 0.3; // Safe enhancement has better odds
            player.gold -= Math.floor(enhanceCost * 0.5); // But costs more
        }

        let result;
        const spellIndex = player.spellcraft.spells.findIndex(s => s.id === spell.id);

        if (enhanceSuccess > 0.95) {
            // Perfect enhancement
            player.spellcraft.spells[spellIndex].power += Math.floor(Math.random() * 3) + 8;
            if (!player.spellcraft.spells[spellIndex].effects.includes(elementData.effects[elementData.effects.length - 1])) {
                player.spellcraft.spells[spellIndex].effects.push(elementData.effects[elementData.effects.length - 1]);
            }
            result = {
                status: 'perfect',
                message: '🌟 **PERFECT ENHANCEMENT!**\nMassive power increase and new ultimate effect added!'
            };
        } else if (enhanceSuccess > 0.8) {
            // Great enhancement
            player.spellcraft.spells[spellIndex].power += Math.floor(Math.random() * 3) + 5;
            result = {
                status: 'great',
                message: '🔥 **GREAT SUCCESS!**\nSignificant power boost achieved!'
            };
        } else if (enhanceSuccess > 0.5) {
            // Good enhancement
            player.spellcraft.spells[spellIndex].power += Math.floor(Math.random() * 2) + 3;
            result = {
                status: 'good',
                message: '✨ **SUCCESS!**\nPower increased noticeably!'
            };
        } else if (enhanceSuccess > 0.2) {
            // Minor enhancement
            player.spellcraft.spells[spellIndex].power += Math.floor(Math.random() * 2) + 1;
            result = {
                status: 'minor',
                message: '⚡ **Minor Success**\nSlight power improvement achieved.'
            };
        } else {
            // Failure
            result = {
                status: 'fail',
                message: '💥 **Enhancement Failed**\nThe spell remains unchanged, but you learned from the experience.'
            };
            player.spellcraft.experience += 25; // Consolation experience
        }

        await db.updatePlayer(interaction.user.id, player);

        const colors = {
            perfect: '#FFD700',
            great: '#FF69B4',
            good: '#00FF00',
            minor: '#FFFF00',
            fail: '#FF0000'
        };

        const resultEmbed = new EmbedBuilder()
            .setColor(colors[result.status])
            .setTitle('🔮 Enhancement Results')
            .setDescription(result.message)
            .addFields(
                { name: '📜 Spell', value: player.spellcraft.spells[spellIndex].name, inline: true },
                { name: '⚡ New Power', value: player.spellcraft.spells[spellIndex].power.toString(), inline: true },
                { name: '🎯 Effects', value: player.spellcraft.spells[spellIndex].effects.map(e => `• ${e.charAt(0).toUpperCase() + e.slice(1)}`).join('\n'), inline: false }
            )
            .setTimestamp();

        await interaction.editReply({
            embeds: [resultEmbed],
            components: []
        });
    },

    generateSpellName(element, quality) {
        const prefixes = {
            fire: ['Blazing', 'Infernal', 'Phoenix', 'Dragon\'s', 'Volcanic', 'Ember', 'Flame'],
            ice: ['Frozen', 'Arctic', 'Glacial', 'Winter\'s', 'Frost', 'Crystal', 'Icicle'],
            lightning: ['Thunder', 'Storm', 'Lightning', 'Static', 'Tempest', 'Electric', 'Bolt'],
            nature: ['Verdant', 'Primal', 'Wild', 'Ancient', 'Living', 'Grove', 'Thorn'],
            shadow: ['Dark', 'Void', 'Nightmare', 'Shadow', 'Twilight', 'Umbral', 'Shade'],
            arcane: ['Mystic', 'Arcane', 'Ethereal', 'Cosmic', 'Astral', 'Celestial', 'Pure'],
            necromancy: ['Death', 'Soul', 'Bone', 'Spectral', 'Undead', 'Grave', 'Corpse'],
            divine: ['Holy', 'Divine', 'Sacred', 'Blessed', 'Celestial', 'Angel', 'Light']
        };

        const suffixes = {
            common: ['Spark', 'Touch', 'Whisper', 'Gleam', 'Hint'],
            uncommon: ['Bolt', 'Strike', 'Blast', 'Wave', 'Surge'],
            rare: ['Storm', 'Fury', 'Rage', 'Might', 'Force'],
            epic: ['Eruption', 'Tempest', 'Cataclysm', 'Maelstrom', 'Vortex'],
            legendary: ['Apocalypse', 'Devastation', 'Armageddon', 'Extinction', 'Genesis'],
            masterwork: ['Omnipotence', 'Transcendence', 'Absolutum', 'Infinitas', 'Eternus']
        };

        const prefix = prefixes[element][Math.floor(Math.random() * prefixes[element].length)];
        const suffix = suffixes[quality][Math.floor(Math.random() * suffixes[quality].length)];

        return `${prefix} ${suffix}`;
    }
};
