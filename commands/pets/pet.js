
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database.js');

const PET_TYPES = {
    wolf: {
        name: '🐺 Wolf',
        rarity: 'common',
        base_stats: { attack: 15, defense: 10, agility: 20, loyalty: 5 },
        abilities: ['pack_hunt', 'intimidate'],
        food_type: 'meat',
        description: 'Loyal canine companion with fierce hunting instincts',
        color: '#8B4513',
        emoji: '🐺'
    },
    dragon: {
        name: '🐲 Dragon',
        rarity: 'legendary',
        base_stats: { attack: 35, defense: 30, agility: 25, loyalty: 10 },
        abilities: ['fire_breath', 'fly', 'treasure_sense'],
        food_type: 'premium_meat',
        description: 'Majestic winged beast with immense power',
        color: '#FF4500',
        emoji: '🐲'
    },
    phoenix: {
        name: '🔥 Phoenix',
        rarity: 'mythic',
        base_stats: { attack: 25, defense: 20, agility: 40, loyalty: 15 },
        abilities: ['rebirth', 'healing_aura', 'fire_immunity'],
        food_type: 'magical_essence',
        description: 'Immortal firebird that rises from its own ashes',
        color: '#FF6347',
        emoji: '🔥'
    },
    griffin: {
        name: '🦅 Griffin',
        rarity: 'rare',
        base_stats: { attack: 28, defense: 22, agility: 35, loyalty: 12 },
        abilities: ['aerial_strike', 'keen_sight', 'wind_mastery'],
        food_type: 'mixed_diet',
        description: 'Noble creature with the body of a lion and wings of an eagle',
        color: '#DAA520',
        emoji: '🦅'
    },
    unicorn: {
        name: '🦄 Unicorn',
        rarity: 'rare',
        base_stats: { attack: 20, defense: 25, agility: 30, loyalty: 20 },
        abilities: ['healing_magic', 'purify', 'horn_charge'],
        food_type: 'magical_herbs',
        description: 'Pure-hearted creature with powerful healing magic',
        color: '#FFB6C1',
        emoji: '🦄'
    },
    cat: {
        name: '🐱 Cat',
        rarity: 'common',
        base_stats: { attack: 8, defense: 6, agility: 25, loyalty: 8 },
        abilities: ['stealth', 'lucky_find'],
        food_type: 'fish',
        description: 'Agile feline companion with mysterious ways',
        color: '#708090',
        emoji: '🐱'
    },
    owl: {
        name: '🦉 Owl',
        rarity: 'uncommon',
        base_stats: { attack: 12, defense: 8, agility: 22, loyalty: 10 },
        abilities: ['night_vision', 'wisdom_boost', 'silent_flight'],
        food_type: 'small_creatures',
        description: 'Wise nocturnal bird that enhances learning',
        color: '#8B7355',
        emoji: '🦉'
    }
};

const PET_FOODS = {
    meat: { name: '🥩 Raw Meat', cost: 25, hunger_restore: 20, emoji: '🥩' },
    premium_meat: { name: '🥩 Premium Meat', cost: 75, hunger_restore: 50, emoji: '🥩' },
    fish: { name: '🐟 Fresh Fish', cost: 15, hunger_restore: 15, emoji: '🐟' },
    magical_essence: { name: '✨ Magical Essence', cost: 200, hunger_restore: 80, emoji: '✨' },
    mixed_diet: { name: '🥘 Mixed Diet', cost: 40, hunger_restore: 30, emoji: '🥘' },
    magical_herbs: { name: '🌿 Magical Herbs', cost: 60, hunger_restore: 35, emoji: '🌿' },
    small_creatures: { name: '🐭 Small Creatures', cost: 20, hunger_restore: 18, emoji: '🐭' }
};

const PET_ACTIVITIES = {
    hunt: { 
        name: '🏹 Hunting', 
        duration: 1800000, 
        rewards: ['meat', 'fur', 'coins'],
        emoji: '🏹',
        description: 'Hunt for food and materials'
    },
    explore: { 
        name: '🗺️ Exploring', 
        duration: 2700000, 
        rewards: ['herbs', 'gems', 'experience'],
        emoji: '🗺️',
        description: 'Discover new territories'
    },
    guard: { 
        name: '🛡️ Guarding', 
        duration: 3600000, 
        rewards: ['security_bonus', 'loyalty'],
        emoji: '🛡️',
        description: 'Protect your base'
    },
    train: { 
        name: '💪 Training', 
        duration: 1200000, 
        rewards: ['experience', 'stat_boost'],
        emoji: '💪',
        description: 'Improve combat abilities'
    },
    rest: { 
        name: '😴 Resting', 
        duration: 600000, 
        rewards: ['energy_restore', 'happiness'],
        emoji: '😴',
        description: 'Recover energy and mood'
    },
    play: {
        name: '🎾 Playing',
        duration: 900000,
        rewards: ['happiness', 'loyalty'],
        emoji: '🎾',
        description: 'Have fun and bond'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('🐾 Manage your loyal animal companions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('adopt')
                .setDescription('Adopt a new pet')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of pet to adopt')
                        .setRequired(true)
                        .addChoices(
                            { name: '🐺 Wolf', value: 'wolf' },
                            { name: '🐱 Cat', value: 'cat' },
                            { name: '🦉 Owl', value: 'owl' },
                            { name: '🦄 Unicorn', value: 'unicorn' },
                            { name: '🦅 Griffin', value: 'griffin' },
                            { name: '🐲 Dragon', value: 'dragon' },
                            { name: '🔥 Phoenix', value: 'phoenix' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View your pets status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('feed')
                .setDescription('Feed your pet'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('activity')
                .setDescription('Send pet on an activity'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('Rename your pet'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('battle')
                .setDescription('Battle with your pet')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let player = await db.getPlayer(userId) || {};
            
            // Initialize pet data
            if (!player.pets) {
                player.pets = {
                    owned: {},
                    active_pet: null,
                    total_adopted: 0,
                    care_level: 1,
                    pet_food: {},
                    achievements: []
                };
            }

            // Initialize inventory if not exists
            if (!player.inventory) {
                player.inventory = { coins: 100, items: [], materials: {} };
            }

            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'adopt':
                    await this.adoptPet(interaction, player);
                    break;
                case 'status':
                    await this.showPetStatus(interaction, player);
                    break;
                case 'feed':
                    await this.feedPetMenu(interaction, player);
                    break;
                case 'activity':
                    await this.petActivityMenu(interaction, player);
                    break;
                case 'rename':
                    await this.renamePetMenu(interaction, player);
                    break;
                case 'battle':
                    await this.petBattleMenu(interaction, player);
                    break;
                default:
                    await this.showPetStatus(interaction, player);
            }
            
        } catch (error) {
            console.error('Pet command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing pets. Please try again.',
                ephemeral: true
            });
        }
    },

    async adoptPet(interaction, player) {
        const petType = interaction.options.getString('type');
        const petInfo = PET_TYPES[petType];
        
        if (!petInfo) {
            await interaction.editReply({
                content: '❌ Invalid pet type selected.',
                ephemeral: true
            });
            return;
        }

        const adoptionCost = this.getAdoptionCost(petInfo.rarity);
        if ((player.inventory?.coins || 0) < adoptionCost) {
            await interaction.editReply({
                content: `❌ You need **${adoptionCost.toLocaleString()}** coins to adopt a ${petInfo.name}. You have **${(player.inventory?.coins || 0).toLocaleString()}** coins.`,
                ephemeral: true
            });
            return;
        }

        const maxPets = Math.floor(player.pets.care_level / 2) + 3;
        if (Object.keys(player.pets.owned).length >= maxPets) {
            await interaction.editReply({
                content: `❌ You can only have **${maxPets}** pets at your current care level (**${player.pets.care_level}**).`,
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(petInfo.color)
            .setTitle('🏪 Pet Adoption Center')
            .setDescription(`╔══════════════════════════════════════╗\n║         **ADOPT A COMPANION**         ║\n╚══════════════════════════════════════╝`)
            .setThumbnail('https://cdn.discordapp.com/emojis/🐾.png')
            .addFields(
                {
                    name: `${petInfo.emoji} **${petInfo.name}**`,
                    value: `${petInfo.description}\n\n**Rarity:** ${this.getRarityDisplay(petInfo.rarity)}\n**Cost:** 💰 ${adoptionCost.toLocaleString()} coins`,
                    inline: false
                },
                {
                    name: '📊 **Base Statistics**',
                    value: `⚔️ **Attack:** ${petInfo.base_stats.attack}\n🛡️ **Defense:** ${petInfo.base_stats.defense}\n⚡ **Agility:** ${petInfo.base_stats.agility}\n❤️ **Loyalty:** ${petInfo.base_stats.loyalty}`,
                    inline: true
                },
                {
                    name: '🎯 **Special Abilities**',
                    value: petInfo.abilities.map(ability => `• ${this.formatAbilityName(ability)}`).join('\n'),
                    inline: true
                },
                {
                    name: '🍽️ **Dietary Needs**',
                    value: `Prefers: ${PET_FOODS[petInfo.food_type]?.name || 'Unknown'}`,
                    inline: true
                }
            )
            .setFooter({ text: `💰 Your Balance: ${(player.inventory?.coins || 0).toLocaleString()} coins` })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`adopt_confirm_${petType}`)
                    .setLabel(`Adopt ${petInfo.name}`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(petInfo.emoji),
                new ButtonBuilder()
                    .setCustomId('adopt_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('pet_shop_browse')
                    .setLabel('Browse Other Pets')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏪')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async showPetStatus(interaction, player) {
        if (Object.keys(player.pets.owned).length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🐾 Pet Sanctuary')
                .setDescription('🏚️ **Your sanctuary is empty!**\n\nVisit the adoption center to find your first companion!')
                .addFields({
                    name: '🎯 **Getting Started**',
                    value: '• Use `/pet adopt` to find companions\n• Different pets have unique abilities\n• Care for them to unlock their potential',
                    inline: false
                })
                .setFooter({ text: 'Start your pet journey today!' });

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('pet_adoption_center')
                        .setLabel('Visit Adoption Center')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏪'),
                    new ButtonBuilder()
                        .setCustomId('pet_guide')
                        .setLabel('Pet Care Guide')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📚')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [buttons]
            });
            return;
        }

        this.updatePetStates(player);

        const embed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle('🐾 Pet Sanctuary Management')
            .setDescription('╔═══════════════════════════════════════╗\n║           **PET SANCTUARY**           ║\n╚═══════════════════════════════════════╝')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                {
                    name: '👑 **Sanctuary Statistics**',
                    value: `**Care Level:** ${player.pets.care_level}\n**Total Adopted:** ${player.pets.total_adopted}\n**Max Capacity:** ${Math.floor(player.pets.care_level / 2) + 3}\n**Active Pet:** ${player.pets.active_pet ? player.pets.owned[player.pets.active_pet]?.name : 'None'}`,
                    inline: true
                },
                {
                    name: '🏆 **Achievements**',
                    value: `**Collections:** ${Object.keys(player.pets.owned).length}\n**Completed Activities:** ${this.getTotalActivities(player)}\n**Happiness Average:** ${this.getAverageHappiness(player)}%`,
                    inline: true
                }
            );

        let petIndex = 1;
        for (const [petId, pet] of Object.entries(player.pets.owned)) {
            const isActive = player.pets.active_pet === petId;
            const petType = PET_TYPES[pet.type];
            
            let statusText = `**Level:** ${pet.level} | **Happiness:** ${this.getHappinessEmoji(pet.happiness)} ${pet.happiness}%\n`;
            statusText += `**Hunger:** ${this.getHungerEmoji(pet.hunger)} ${pet.hunger}/100 | **Energy:** ${this.getEnergyEmoji(pet.energy)} ${pet.energy}/100\n`;
            
            if (pet.activity) {
                const remaining = Math.max(0, pet.activity.end_time - Date.now());
                const remainingMinutes = Math.ceil(remaining / 60000);
                statusText += `🔄 **${PET_ACTIVITIES[pet.activity.type]?.name || pet.activity.type}** (${remainingMinutes}m left)`;
            } else {
                statusText += '💤 **Idle** - Ready for new adventures';
            }

            embed.addFields({
                name: `${isActive ? '👑' : petType.emoji} **${pet.name}** ${petType.name}`,
                value: statusText,
                inline: true
            });

            if (petIndex % 2 === 0) {
                embed.addFields({ name: '\u200B', value: '\u200B', inline: true });
            }
            petIndex++;
        }

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('pet_detailed_view')
            .setPlaceholder('🔍 Select a pet for detailed management')
            .addOptions(
                Object.entries(player.pets.owned).map(([petId, pet]) => ({
                    label: pet.name,
                    value: petId,
                    description: `${PET_TYPES[pet.type].name} | Level ${pet.level} | ${pet.happiness}% Happy`,
                    emoji: PET_TYPES[pet.type].emoji
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_feeding_center')
                    .setLabel('Feeding Center')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🍽️'),
                new ButtonBuilder()
                    .setCustomId('pet_activity_center')
                    .setLabel('Activity Center')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎮'),
                new ButtonBuilder()
                    .setCustomId('pet_training_ground')
                    .setLabel('Training Ground')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏟️'),
                new ButtonBuilder()
                    .setCustomId('pet_adoption_center')
                    .setLabel('Adopt More')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪')
            );

        const selectRow = new ActionRowBuilder().addComponents(petSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    async feedPetMenu(interaction, player) {
        if (Object.keys(player.pets.owned).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets to feed! Use `/pet adopt` to get your first companion.',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF8C42')
            .setTitle('🍽️ Pet Feeding Center')
            .setDescription('╔═══════════════════════════════════════╗\n║          **FEEDING CENTER**           ║\n╚═══════════════════════════════════════╝')
            .addFields({
                name: '🥗 **Available Foods**',
                value: Object.entries(PET_FOODS)
                    .map(([key, food]) => `${food.emoji} **${food.name}**\n💰 ${food.cost} coins | 🍽️ +${food.hunger_restore} hunger`)
                    .join('\n\n'),
                inline: false
            });

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('feed_pet_select')
            .setPlaceholder('🐾 Select a pet to feed')
            .addOptions(
                Object.entries(player.pets.owned).map(([petId, pet]) => ({
                    label: pet.name,
                    value: petId,
                    description: `Hunger: ${pet.hunger}/100 | Prefers: ${PET_FOODS[PET_TYPES[pet.type].food_type]?.name}`,
                    emoji: PET_TYPES[pet.type].emoji
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('feed_all_pets')
                    .setLabel('Feed All Pets')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🍽️'),
                new ButtonBuilder()
                    .setCustomId('pet_food_shop')
                    .setLabel('Buy Food')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛒')
            );

        const selectRow = new ActionRowBuilder().addComponents(petSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    async petActivityMenu(interaction, player) {
        if (Object.keys(player.pets.owned).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets to send on activities!',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#6A4C93')
            .setTitle('🎮 Pet Activity Center')
            .setDescription('╔═══════════════════════════════════════╗\n║         **ACTIVITY CENTER**          ║\n╚═══════════════════════════════════════╝')
            .addFields({
                name: '🎯 **Available Activities**',
                value: Object.entries(PET_ACTIVITIES)
                    .map(([key, activity]) => `${activity.emoji} **${activity.name}**\n⏱️ ${Math.floor(activity.duration / 60000)}min | 🎁 ${activity.rewards.join(', ')}\n📝 ${activity.description}`)
                    .join('\n\n'),
                inline: false
            });

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('activity_pet_select')
            .setPlaceholder('🐾 Select a pet for activities')
            .addOptions(
                Object.entries(player.pets.owned)
                    .filter(([_, pet]) => !pet.activity)
                    .map(([petId, pet]) => ({
                        label: pet.name,
                        value: petId,
                        description: `Energy: ${pet.energy}/100 | Ready for adventure!`,
                        emoji: PET_TYPES[pet.type].emoji
                    }))
            );

        if (petSelect.options.length === 0) {
            embed.addFields({
                name: '⏳ **Status**',
                value: 'All your pets are currently busy with activities!',
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('check_activity_rewards')
                    .setLabel('Check Rewards')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('activity_history')
                    .setLabel('Activity History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );

        const components = petSelect.options.length > 0 ? 
            [new ActionRowBuilder().addComponents(petSelect), buttons] : [buttons];

        await interaction.editReply({
            embeds: [embed],
            components
        });
    },

    async renamePetMenu(interaction, player) {
        if (Object.keys(player.pets.owned).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets to rename!',
                ephemeral: true
            });
            return;
        }

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('rename_pet_select')
            .setPlaceholder('🏷️ Select a pet to rename')
            .addOptions(
                Object.entries(player.pets.owned).map(([petId, pet]) => ({
                    label: pet.name,
                    value: petId,
                    description: `${PET_TYPES[pet.type].name} | Level ${pet.level}`,
                    emoji: PET_TYPES[pet.type].emoji
                }))
            );

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🏷️ Pet Naming Service')
            .setDescription('Choose a pet to give them a new name that reflects their personality!')
            .addFields({
                name: '📝 **Naming Rules**',
                value: '• Names must be 2-20 characters\n• No offensive content\n• Be creative and have fun!',
                inline: false
            });

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(petSelect)]
        });
    },

    async petBattleMenu(interaction, player) {
        if (Object.keys(player.pets.owned).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets for battle!',
                ephemeral: true
            });
            return;
        }

        const battleReadyPets = Object.entries(player.pets.owned)
            .filter(([_, pet]) => pet.energy >= 30 && pet.happiness >= 50);

        if (battleReadyPets.length === 0) {
            await interaction.editReply({
                content: '❌ No pets are ready for battle! Pets need at least 30 energy and 50% happiness.',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('⚔️ Pet Battle Arena')
            .setDescription('╔═══════════════════════════════════════╗\n║          **BATTLE ARENA**             ║\n╚═══════════════════════════════════════╝')
            .addFields(
                {
                    name: '🎯 **Battle Types**',
                    value: '🥊 **Training Battle** - Safe practice\n⚔️ **Arena Combat** - Competitive fights\n🏆 **Championship** - Elite tournaments',
                    inline: true
                },
                {
                    name: '💰 **Rewards**',
                    value: '🪙 Coins and experience\n🏅 Battle achievements\n📈 Skill improvements',
                    inline: true
                }
            );

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('battle_pet_select')
            .setPlaceholder('⚔️ Select your champion')
            .addOptions(
                battleReadyPets.map(([petId, pet]) => ({
                    label: pet.name,
                    value: petId,
                    description: `Level ${pet.level} | Attack: ${pet.stats?.attack || PET_TYPES[pet.type].base_stats.attack}`,
                    emoji: PET_TYPES[pet.type].emoji
                }))
            );

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(petSelect)]
        });
    },

    createPet(type, petInfo) {
        const statVariance = 0.2;
        const randomizedStats = {};
        
        Object.entries(petInfo.base_stats).forEach(([stat, value]) => {
            const variance = (Math.random() - 0.5) * 2 * statVariance;
            randomizedStats[stat] = Math.max(1, Math.floor(value * (1 + variance)));
        });

        return {
            type: type,
            name: this.generatePetName(type),
            level: 1,
            experience: 0,
            stats: randomizedStats,
            happiness: 75,
            hunger: 80,
            energy: 100,
            adopted_at: Date.now(),
            activity: null,
            last_fed: Date.now(),
            last_activity: null,
            battle_stats: {
                wins: 0,
                losses: 0,
                total_battles: 0
            },
            personality: this.generatePersonality(),
            achievements: []
        };
    },

    generatePetName(type) {
        const names = {
            wolf: ['Luna', 'Shadow', 'Storm', 'Frost', 'Alpha', 'Scout', 'Hunter', 'Blaze'],
            cat: ['Whiskers', 'Mittens', 'Shadow', 'Luna', 'Tiger', 'Smokey', 'Felix', 'Mango'],
            owl: ['Hoot', 'Wisdom', 'Athena', 'Nocturne', 'Echo', 'Sage', 'Archimedes', 'Minerva'],
            unicorn: ['Stardust', 'Moonbeam', 'Aurora', 'Celeste', 'Seraph', 'Purity', 'Cosmos', 'Ethereal'],
            griffin: ['Majesty', 'Skywing', 'Goldcrest', 'Tempest', 'Valor', 'Aerie', 'Noble', 'Soar'],
            dragon: ['Blaze', 'Ember', 'Scales', 'Wyrm', 'Inferno', 'Draco', 'Crimson', 'Obsidian'],
            phoenix: ['Flame', 'Rebirth', 'Ashes', 'Eternal', 'Fireborn', 'Rising', 'Solar', 'Ignitus']
        };
        
        const nameList = names[type] || ['Companion'];
        return nameList[Math.floor(Math.random() * nameList.length)];
    },

    generatePersonality() {
        const traits = ['playful', 'loyal', 'brave', 'curious', 'gentle', 'fierce', 'wise', 'mischievous'];
        return traits[Math.floor(Math.random() * traits.length)];
    },

    getAdoptionCost(rarity) {
        const costs = {
            common: 500,
            uncommon: 1500,
            rare: 5000,
            legendary: 15000,
            mythic: 50000
        };
        return costs[rarity] || 1000;
    },

    getRarityDisplay(rarity) {
        const displays = {
            common: '⚪ Common',
            uncommon: '🟢 Uncommon',
            rare: '🔵 Rare',
            legendary: '🟣 Legendary',
            mythic: '🟠 Mythic'
        };
        return displays[rarity] || rarity;
    },

    formatAbilityName(ability) {
        return ability.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    },

    getHappinessEmoji(happiness) {
        if (happiness >= 90) return '😄';
        if (happiness >= 70) return '😊';
        if (happiness >= 50) return '😐';
        if (happiness >= 30) return '😕';
        return '😢';
    },

    getHungerEmoji(hunger) {
        if (hunger >= 80) return '🟢';
        if (hunger >= 50) return '🟡';
        if (hunger >= 20) return '🟠';
        return '🔴';
    },

    getEnergyEmoji(energy) {
        if (energy >= 80) return '⚡';
        if (energy >= 50) return '🔋';
        if (energy >= 20) return '🪫';
        return '💤';
    },

    getTotalActivities(player) {
        return Object.values(player.pets.owned)
            .reduce((total, pet) => total + (pet.activities_completed || 0), 0);
    },

    getAverageHappiness(player) {
        const pets = Object.values(player.pets.owned);
        if (pets.length === 0) return 0;
        return Math.round(pets.reduce((sum, pet) => sum + pet.happiness, 0) / pets.length);
    },

    updatePetStates(player) {
        const now = Date.now();
        
        Object.values(player.pets.owned).forEach(pet => {
            const hoursSinceLastFed = (now - pet.last_fed) / (1000 * 60 * 60);
            pet.hunger = Math.max(0, pet.hunger - Math.floor(hoursSinceLastFed));
            
            if (pet.hunger < 20) {
                pet.happiness = Math.max(0, pet.happiness - 1);
            } else if (pet.hunger > 80) {
                pet.happiness = Math.min(100, pet.happiness + 1);
            }
            
            if (pet.activity && now >= pet.activity.end_time) {
                this.completeActivity(pet);
            }
        });
    },

    completeActivity(pet) {
        const activity = PET_ACTIVITIES[pet.activity.type];
        
        pet.experience += 25;
        pet.energy = Math.max(0, pet.energy - 20);
        pet.last_activity = Date.now();
        pet.activities_completed = (pet.activities_completed || 0) + 1;
        pet.activity = null;
        
        const newLevel = Math.floor(pet.experience / 100) + 1;
        if (newLevel > pet.level) {
            pet.level = newLevel;
            Object.keys(pet.stats).forEach(stat => {
                pet.stats[stat] += Math.floor(Math.random() * 3) + 1;
            });
        }
    }
};
