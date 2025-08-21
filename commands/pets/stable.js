
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const STABLE_SERVICES = {
    boarding: {
        name: '🏠 Pet Boarding',
        description: 'Safe housing for your pets',
        dailyCost: 50,
        benefits: ['Automatic feeding', 'Health monitoring', 'Happiness maintenance']
    },
    training: {
        name: '🎯 Professional Training',
        description: 'Expert trainers for skill development',
        sessionCost: 200,
        benefits: ['Stat improvements', 'New abilities', 'Behavioral training']
    },
    grooming: {
        name: '✨ Pet Grooming',
        description: 'Beauty and health services',
        serviceCost: 100,
        benefits: ['Happiness boost', 'Health improvement', 'Appearance enhancement']
    },
    medical: {
        name: '🏥 Veterinary Care',
        description: 'Complete medical services',
        treatmentCost: 300,
        benefits: ['Health restoration', 'Disease prevention', 'Emergency care']
    },
    breeding: {
        name: '💕 Pet Breeding',
        description: 'Professional breeding services',
        breedingCost: 1000,
        benefits: ['Create offspring', 'Combine traits', 'Rare genetics']
    }
};

const PREMIUM_PETS = {
    celestial_wolf: {
        name: '🌟 Celestial Wolf',
        cost: 10000,
        rarity: 'mythic',
        abilities: ['star_howl', 'cosmic_step', 'lunar_blessing'],
        description: 'A mystical wolf blessed by starlight',
        emoji: '🌟'
    },
    void_cat: {
        name: '🌌 Void Cat',
        cost: 8500,
        rarity: 'legendary',
        abilities: ['shadow_walk', 'void_leap', 'darkness_cloak'],
        description: 'A feline that exists between dimensions',
        emoji: '🌌'
    },
    crystal_phoenix: {
        name: '💎 Crystal Phoenix',
        cost: 15000,
        rarity: 'mythic',
        abilities: ['crystal_rebirth', 'gem_fire', 'prismatic_wings'],
        description: 'A phoenix with crystalline feathers',
        emoji: '💎'
    },
    storm_griffin: {
        name: '⛈️ Storm Griffin',
        cost: 12000,
        rarity: 'legendary',
        abilities: ['thunder_strike', 'wind_mastery', 'lightning_dive'],
        description: 'A griffin that commands the storms',
        emoji: '⛈️'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stable')
        .setDescription('🐾 Professional pet management and premium services')
        .addSubcommand(subcommand =>
            subcommand
                .setName('services')
                .setDescription('View available stable services'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('board')
                .setDescription('Board your pets for care'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('premium')
                .setDescription('Browse premium pet collection'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('breeding')
                .setDescription('Pet breeding services'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('training')
                .setDescription('Professional pet training'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('medical')
                .setDescription('Veterinary services')),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let player = await db.getPlayer(userId) || {};
            
            if (!player.pets) {
                player.pets = { owned: {}, active_pet: null, stable_services: {} };
            }
            
            if (!player.inventory) {
                player.inventory = { coins: 100 };
            }

            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'services':
                    await this.showStableServices(interaction, player);
                    break;
                case 'board':
                    await this.petBoardingMenu(interaction, player);
                    break;
                case 'premium':
                    await this.premiumPetShop(interaction, player);
                    break;
                case 'breeding':
                    await this.breedingServices(interaction, player);
                    break;
                case 'training':
                    await this.trainingServices(interaction, player);
                    break;
                case 'medical':
                    await this.medicalServices(interaction, player);
                    break;
                default:
                    await this.showStableServices(interaction, player);
            }
            
        } catch (error) {
            console.error('Stable command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred at the stable. Please try again.',
                ephemeral: true
            });
        }
    },

    async showStableServices(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🏰 Royal Pet Stable')
            .setDescription('╔═══════════════════════════════════════╗\n║        **PREMIUM PET SERVICES**       ║\n╚═══════════════════════════════════════╝\n\n*Professional care for your beloved companions*')
            .setThumbnail('https://cdn.discordapp.com/emojis/🐾.png')
            .addFields(
                {
                    name: '💰 **Your Resources**',
                    value: `💰 Coins: **${(player.inventory?.coins || 0).toLocaleString()}**\n🐾 Pets Owned: **${Object.keys(player.pets?.owned || {}).length}**\n📊 Stable Level: **${player.pets?.stable_level || 1}**`,
                    inline: true
                },
                {
                    name: '🎯 **Active Services**',
                    value: this.getActiveServices(player) || 'No active services',
                    inline: true
                }
            );

        // Add service descriptions
        Object.entries(STABLE_SERVICES).forEach(([key, service]) => {
            embed.addFields({
                name: `${service.name}`,
                value: `📝 ${service.description}\n💰 Cost: ${service.dailyCost || service.sessionCost || service.serviceCost || service.treatmentCost || service.breedingCost} coins\n🎁 Benefits: ${service.benefits.join(', ')}`,
                inline: true
            });
        });

        const serviceSelect = new StringSelectMenuBuilder()
            .setCustomId('stable_service_select')
            .setPlaceholder('🎯 Select a service to use')
            .addOptions([
                {
                    label: 'Pet Boarding',
                    value: 'boarding',
                    description: 'Daily care and maintenance for your pets',
                    emoji: '🏠'
                },
                {
                    label: 'Professional Training',
                    value: 'training',
                    description: 'Improve your pets combat and utility skills',
                    emoji: '🎯'
                },
                {
                    label: 'Pet Grooming',
                    value: 'grooming',
                    description: 'Beauty treatments and happiness boosts',
                    emoji: '✨'
                },
                {
                    label: 'Veterinary Care',
                    value: 'medical',
                    description: 'Health checkups and medical treatments',
                    emoji: '🏥'
                },
                {
                    label: 'Pet Breeding',
                    value: 'breeding',
                    description: 'Create new generations of companions',
                    emoji: '💕'
                }
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('stable_premium_shop')
                    .setLabel('Premium Pets')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⭐'),
                new ButtonBuilder()
                    .setCustomId('stable_upgrade')
                    .setLabel('Upgrade Stable')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔧'),
                new ButtonBuilder()
                    .setCustomId('stable_history')
                    .setLabel('Service History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('stable_membership')
                    .setLabel('Premium Membership')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👑')
            );

        const components = [new ActionRowBuilder().addComponents(serviceSelect), buttons];

        await interaction.editReply({
            embeds: [embed],
            components
        });
    },

    async petBoardingMenu(interaction, player) {
        if (Object.keys(player.pets?.owned || {}).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets to board at the stable!',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#654321')
            .setTitle('🏠 Pet Boarding Services')
            .setDescription('╔═══════════════════════════════════════╗\n║          **BOARDING SERVICES**        ║\n╚═══════════════════════════════════════╝')
            .addFields(
                {
                    name: '🎯 **Boarding Plans**',
                    value: '**Daily Care** - 50 coins/day\n• Automatic feeding\n• Health monitoring\n• Exercise and play\n\n**Premium Care** - 100 coins/day\n• All daily care benefits\n• Grooming services\n• Training sessions\n• Medical checkups',
                    inline: false
                },
                {
                    name: '📊 **Your Pets**',
                    value: Object.entries(player.pets.owned)
                        .map(([id, pet]) => `${this.getPetEmoji(pet.type)} **${pet.name}** (Level ${pet.level})`)
                        .join('\n') || 'No pets available',
                    inline: true
                },
                {
                    name: '💰 **Costs**',
                    value: `**Daily:** ${50 * Object.keys(player.pets.owned).length} coins\n**Premium:** ${100 * Object.keys(player.pets.owned).length} coins\n**Your Balance:** ${(player.inventory?.coins || 0).toLocaleString()} coins`,
                    inline: true
                }
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('board_daily_care')
                    .setLabel('Daily Care Plan')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏠'),
                new ButtonBuilder()
                    .setCustomId('board_premium_care')
                    .setLabel('Premium Care Plan')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👑'),
                new ButtonBuilder()
                    .setCustomId('board_custom_plan')
                    .setLabel('Custom Plan')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎛️')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async premiumPetShop(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Premium Pet Collection')
            .setDescription('╔═══════════════════════════════════════╗\n║       **EXCLUSIVE COMPANIONS**        ║\n╚═══════════════════════════════════════╝\n\n*Rare and legendary creatures available for adoption*')
            .setThumbnail('https://cdn.discordapp.com/emojis/⭐.png')
            .addFields({
                name: '💰 **Your Balance**',
                value: `${(player.inventory?.coins || 0).toLocaleString()} coins`,
                inline: true
            });

        // Add premium pets
        Object.entries(PREMIUM_PETS).forEach(([key, pet]) => {
            const owned = player.pets?.owned && Object.values(player.pets.owned).some(p => p.type === key);
            const status = owned ? '✅ **OWNED**' : `💰 **${pet.cost.toLocaleString()} coins**`;
            
            embed.addFields({
                name: `${pet.emoji} **${pet.name}**`,
                value: `${pet.description}\n\n**Rarity:** ${this.getRarityDisplay(pet.rarity)}\n**Special Abilities:** ${pet.abilities.join(', ')}\n**Price:** ${status}`,
                inline: true
            });
        });

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('premium_pet_adopt')
            .setPlaceholder('⭐ Select a premium pet to adopt')
            .addOptions(
                Object.entries(PREMIUM_PETS)
                    .filter(([key, _]) => !player.pets?.owned || !Object.values(player.pets.owned).some(p => p.type === key))
                    .map(([key, pet]) => ({
                        label: pet.name,
                        value: key,
                        description: `${pet.cost.toLocaleString()} coins | ${pet.rarity}`,
                        emoji: pet.emoji
                    }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('premium_pet_info')
                    .setLabel('Detailed Information')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('premium_rewards')
                    .setLabel('Loyalty Rewards')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('premium_financing')
                    .setLabel('Payment Plans')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💳')
            );

        const components = petSelect.options.length > 0 ? 
            [new ActionRowBuilder().addComponents(petSelect), buttons] : [buttons];

        await interaction.editReply({
            embeds: [embed],
            components
        });
    },

    async breedingServices(interaction, player) {
        const ownedPets = Object.values(player.pets?.owned || {});
        
        if (ownedPets.length < 2) {
            await interaction.editReply({
                content: '❌ You need at least 2 pets to use breeding services!',
                ephemeral: true
            });
            return;
        }

        const breedablePets = ownedPets.filter(pet => 
            pet.level >= 5 && pet.happiness >= 70 && !pet.breeding_cooldown
        );

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('💕 Pet Breeding Services')
            .setDescription('╔═══════════════════════════════════════╗\n║         **BREEDING PROGRAM**          ║\n╚═══════════════════════════════════════╝')
            .addFields(
                {
                    name: '📋 **Breeding Requirements**',
                    value: '• Both pets must be level 5+\n• Happiness above 70%\n• No recent breeding\n• 1000 coins breeding fee',
                    inline: true
                },
                {
                    name: '🎲 **Offspring Possibilities**',
                    value: '• Inherit traits from both parents\n• Chance for rare mutations\n• Enhanced stats potential\n• Unique ability combinations',
                    inline: true
                },
                {
                    name: '📊 **Available Breeders**',
                    value: `${breedablePets.length} of ${ownedPets.length} pets ready`,
                    inline: true
                }
            );

        if (breedablePets.length >= 2) {
            const parent1Select = new StringSelectMenuBuilder()
                .setCustomId('breeding_parent1')
                .setPlaceholder('👨 Select first parent')
                .addOptions(
                    breedablePets.map((pet, index) => ({
                        label: pet.name,
                        value: `parent1_${index}`,
                        description: `Level ${pet.level} | ${pet.type} | ${pet.happiness}% happy`,
                        emoji: this.getPetEmoji(pet.type)
                    }))
                );

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('breeding_genetics_guide')
                        .setLabel('Genetics Guide')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🧬'),
                    new ButtonBuilder()
                        .setCustomId('breeding_history')
                        .setLabel('Breeding History')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📜')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(parent1Select), buttons]
            });
        } else {
            embed.addFields({
                name: '⚠️ **Status**',
                value: 'Not enough pets meet breeding requirements. Focus on training and caring for your current pets!',
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });
        }
    },

    async trainingServices(interaction, player) {
        if (Object.keys(player.pets?.owned || {}).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets to train!',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🎯 Professional Training Academy')
            .setDescription('╔═══════════════════════════════════════╗\n║        **TRAINING PROGRAMS**          ║\n╚═══════════════════════════════════════╝')
            .addFields(
                {
                    name: '💪 **Training Programs**',
                    value: '**Combat Training** - 200 coins\n• +5 Attack/Defense\n• Learn combat abilities\n• Battle experience\n\n**Agility Training** - 150 coins\n• +3 Speed/Agility\n• Movement abilities\n• Evasion training\n\n**Intelligence Training** - 180 coins\n• +4 Intelligence\n• Problem solving\n• Special abilities',
                    inline: false
                },
                {
                    name: '🏆 **Advanced Programs**',
                    value: '**Elite Bootcamp** - 500 coins\n• All stats +3\n• Unlock rare abilities\n• Master trainer sessions\n\n**Specialized Training** - 300 coins\n• Focus on pet\'s natural strengths\n• Type-specific abilities\n• Personality development',
                    inline: false
                }
            );

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('training_pet_select')
            .setPlaceholder('🎯 Select a pet for training')
            .addOptions(
                Object.entries(player.pets.owned).map(([id, pet]) => ({
                    label: pet.name,
                    value: id,
                    description: `Level ${pet.level} | ${pet.type} | Energy: ${pet.energy || 100}%`,
                    emoji: this.getPetEmoji(pet.type)
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('training_schedule')
                    .setLabel('Training Schedule')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📅'),
                new ButtonBuilder()
                    .setCustomId('training_results')
                    .setLabel('Training Results')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('group_training')
                    .setLabel('Group Training')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(petSelect), buttons]
        });
    },

    async medicalServices(interaction, player) {
        if (Object.keys(player.pets?.owned || {}).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets that need medical care!',
                ephemeral: true
            });
            return;
        }

        const pets = Object.values(player.pets.owned);
        const sickPets = pets.filter(pet => pet.health < 80 || pet.happiness < 50);
        const healthyPets = pets.filter(pet => pet.health >= 80 && pet.happiness >= 50);

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('🏥 Veterinary Medical Center')
            .setDescription('╔═══════════════════════════════════════╗\n║         **MEDICAL SERVICES**          ║\n╚═══════════════════════════════════════╝')
            .addFields(
                {
                    name: '🩺 **Available Treatments**',
                    value: '**Health Checkup** - 100 coins\n• Full health assessment\n• Preventive care\n• Health report\n\n**Emergency Care** - 300 coins\n• Critical health restoration\n• Immediate treatment\n• Recovery monitoring\n\n**Wellness Package** - 250 coins\n• Health + happiness boost\n• Nutritional consultation\n• Fitness assessment',
                    inline: false
                },
                {
                    name: '📊 **Health Summary**',
                    value: `🟢 **Healthy Pets:** ${healthyPets.length}\n🟡 **Needs Attention:** ${sickPets.length}\n💊 **Under Treatment:** ${this.getPetsUnderTreatment(player)}`,
                    inline: true
                },
                {
                    name: '💰 **Insurance Plans**',
                    value: '**Basic Plan** - 50 coins/month\n• 50% off treatments\n• Free checkups\n\n**Premium Plan** - 100 coins/month\n• 75% off treatments\n• Emergency coverage\n• Specialist consultations',
                    inline: true
                }
            );

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('medical_pet_select')
            .setPlaceholder('🏥 Select a pet for medical care')
            .addOptions(
                pets.map((pet, index) => {
                    const healthStatus = pet.health >= 80 ? '🟢' : pet.health >= 50 ? '🟡' : '🔴';
                    return {
                        label: pet.name,
                        value: `medical_${index}`,
                        description: `${healthStatus} Health: ${pet.health || 100}% | Happiness: ${pet.happiness}%`,
                        emoji: this.getPetEmoji(pet.type)
                    };
                })
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('medical_insurance')
                    .setLabel('Insurance Plans')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('emergency_care')
                    .setLabel('Emergency Care')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚨'),
                new ButtonBuilder()
                    .setCustomId('wellness_program')
                    .setLabel('Wellness Program')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💚')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(petSelect), buttons]
        });
    },

    getActiveServices(player) {
        const services = player.pets?.stable_services || {};
        const active = Object.entries(services)
            .filter(([_, service]) => service.active)
            .map(([name, service]) => `${name}: ${service.duration} days remaining`);
        
        return active.length > 0 ? active.join('\n') : null;
    },

    getPetEmoji(type) {
        const emojis = {
            wolf: '🐺',
            cat: '🐱',
            owl: '🦉',
            unicorn: '🦄',
            griffin: '🦅',
            dragon: '🐲',
            phoenix: '🔥',
            celestial_wolf: '🌟',
            void_cat: '🌌',
            crystal_phoenix: '💎',
            storm_griffin: '⛈️'
        };
        return emojis[type] || '🐾';
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

    getPetsUnderTreatment(player) {
        const services = player.pets?.stable_services || {};
        return Object.values(services).filter(service => 
            service.type === 'medical' && service.active
        ).length;
    }
};
