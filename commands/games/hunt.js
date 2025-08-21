
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const HUNT_DIFFICULTIES = {
    easy: {
        name: 'Novice Explorer',
        emoji: '🟢',
        clues: 3,
        timeLimit: 600000, // 10 minutes
        hints: 3,
        baseReward: 150,
        xpReward: 25,
        description: 'Perfect for beginners with helpful hints'
    },
    medium: {
        name: 'Seasoned Adventurer', 
        emoji: '🟡',
        clues: 5,
        timeLimit: 900000, // 15 minutes
        hints: 2,
        baseReward: 300,
        xpReward: 50,
        description: 'Moderate challenge with fewer hints'
    },
    hard: {
        name: 'Expert Treasure Hunter',
        emoji: '🔴',
        clues: 7,
        timeLimit: 1200000, // 20 minutes
        hints: 1,
        baseReward: 600,
        xpReward: 100,
        description: 'Difficult hunt for experienced players'
    },
    expert: {
        name: 'Legendary Explorer',
        emoji: '⚫',
        clues: 10,
        timeLimit: 1800000, // 30 minutes
        hints: 0,
        baseReward: 1200,
        xpReward: 200,
        description: 'Ultimate challenge with no hints!'
    }
};

const HUNT_THEMES = {
    pirate: {
        name: '🏴‍☠️ Pirate Treasure',
        description: 'Follow the trail of ancient pirates',
        multiplier: 1.2,
        locations: ['Mysterious Cave', 'Abandoned Ship', 'Desert Island', 'Hidden Cove']
    },
    ancient: {
        name: '🏛️ Ancient Ruins',
        description: 'Explore lost civilizations',
        multiplier: 1.3,
        locations: ['Temple Ruins', 'Underground Chamber', 'Sacred Grove', 'Forgotten Library']
    },
    mystical: {
        name: '🔮 Mystical Quest',
        description: 'Seek magical artifacts',
        multiplier: 1.5,
        locations: ['Enchanted Forest', 'Crystal Cavern', 'Wizard Tower', 'Magical Portal']
    },
    dragon: {
        name: '🐉 Dragon Hoard',
        description: 'Raid the dragon\'s treasure',
        multiplier: 2.0,
        locations: ['Dragon Lair', 'Volcanic Cave', 'Mountain Peak', 'Ancient Nest']
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('🗺️ Embark on an epic treasure hunting adventure!')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose your hunt difficulty')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 Novice Explorer (Easy)', value: 'easy' },
                    { name: '🟡 Seasoned Adventurer (Medium)', value: 'medium' },
                    { name: '🔴 Expert Hunter (Hard)', value: 'hard' },
                    { name: '⚫ Legendary Explorer (Expert)', value: 'expert' }
                ))
        .addStringOption(option =>
            option.setName('theme')
                .setDescription('Choose hunt theme')
                .setRequired(false)
                .addChoices(
                    { name: '🏴‍☠️ Pirate Treasure (+20%)', value: 'pirate' },
                    { name: '🏛️ Ancient Ruins (+30%)', value: 'ancient' },
                    { name: '🔮 Mystical Quest (+50%)', value: 'mystical' },
                    { name: '🐉 Dragon Hoard (+100%)', value: 'dragon' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const difficulty = interaction.options?.getString('difficulty');
        const theme = interaction.options?.getString('theme');
        
        // Initialize active hunts if needed
        interaction.client.activeHunts = interaction.client.activeHunts || new Map();
        
        // Check if user has an active hunt
        if (interaction.client.activeHunts.has(userId)) {
            return this.showActiveHunt(interaction, userId);
        }
        
        if (!difficulty || !theme) {
            return this.showHuntSetup(interaction);
        }

        return this.startHunt(interaction, difficulty, theme);
    },

    async showActiveHunt(interaction, userId) {
        const hunt = interaction.client.activeHunts.get(userId);
        const difficulty = HUNT_DIFFICULTIES[hunt.difficulty];
        const theme = HUNT_THEMES[hunt.theme];
        
        const timeLeft = Math.max(0, hunt.expires - Date.now());
        const timeLeftMinutes = Math.floor(timeLeft / 60000);
        const timeLeftSeconds = Math.floor((timeLeft % 60000) / 1000);

        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle(`${theme.name} - Active Hunt`)
            .setDescription(`**${difficulty.name}** difficulty hunt in progress!`)
            .addFields(
                { name: '🗺️ Current Location', value: hunt.currentLocation || 'Starting Point', inline: true },
                { name: '🎯 Progress', value: `${hunt.cluesFound}/${difficulty.clues} clues found`, inline: true },
                { name: '⏰ Time Left', value: `${timeLeftMinutes}:${timeLeftSeconds.toString().padStart(2, '0')}`, inline: true },
                { name: '🧩 Current Clue', value: hunt.currentClue || '*No active clue*', inline: false },
                { name: '💡 Hints Available', value: `${hunt.hintsRemaining}/${difficulty.hints}`, inline: true },
                { name: '💰 Potential Reward', value: `${Math.floor(difficulty.baseReward * theme.multiplier)} coins`, inline: true }
            )
            .setFooter({ text: 'Use /solve <answer> to submit answers!' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hunt_hint')
                    .setLabel(`💡 Get Hint (${hunt.hintsRemaining} left)`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(hunt.hintsRemaining === 0),
                new ButtonBuilder()
                    .setCustomId('hunt_skip_clue')
                    .setLabel('⏭️ Skip Clue (100 coins)')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('hunt_abandon')
                    .setLabel('🚪 Abandon Hunt')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('hunt_map')
                    .setLabel('🗺️ View Map')
                    .setStyle(ButtonStyle.Success)
            );

        return interaction.reply({ embeds: [embed], components: [buttons] });
    },

    async showHuntSetup(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🗺️ Treasure Hunt Setup')
            .setDescription('**Configure your treasure hunting adventure!**\n\nChoose your difficulty and theme to begin.')
            .addFields(
                { name: '⚡ Quick Start', value: 'Select options below or use command parameters', inline: false }
            )
            .setThumbnail('https://cdn.discordapp.com/emojis/treasure_map.png');

        // Difficulty selector
        const difficultySelect = new StringSelectMenuBuilder()
            .setCustomId('hunt_difficulty_select')
            .setPlaceholder('🎯 Choose Hunt Difficulty...')
            .addOptions(
                Object.entries(HUNT_DIFFICULTIES).map(([key, diff]) => ({
                    label: `${diff.emoji} ${diff.name}`,
                    description: `${diff.clues} clues • ${diff.baseReward} coins • ${diff.description}`,
                    value: key,
                    emoji: diff.emoji
                }))
            );

        // Theme selector
        const themeSelect = new StringSelectMenuBuilder()
            .setCustomId('hunt_theme_select')
            .setPlaceholder('🎨 Choose Hunt Theme...')
            .addOptions(
                Object.entries(HUNT_THEMES).map(([key, theme]) => ({
                    label: theme.name,
                    description: `${theme.description} • ${Math.floor((theme.multiplier - 1) * 100)}% bonus`,
                    value: key
                }))
            );

        const row1 = new ActionRowBuilder().addComponents(difficultySelect);
        const row2 = new ActionRowBuilder().addComponents(themeSelect);

        // Quick start buttons
        const quickButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hunt_quick_easy')
                    .setLabel('🟢 Quick Easy Hunt')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('hunt_quick_medium')
                    .setLabel('🟡 Quick Medium Hunt')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('hunt_random')
                    .setLabel('🎲 Surprise Me!')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Store setup data temporarily
        interaction.client.huntSetups = interaction.client.huntSetups || new Map();
        interaction.client.huntSetups.set(interaction.user.id, {
            difficulty: null,
            theme: null,
            messageId: null
        });

        const message = await interaction.reply({ embeds: [embed], components: [row1, row2, quickButtons] });
        
        // Update setup data with message ID
        const setupData = interaction.client.huntSetups.get(interaction.user.id);
        setupData.messageId = message.id;
        interaction.client.huntSetups.set(interaction.user.id, setupData);

        return message;
    },

    async startHunt(interaction, difficulty, theme) {
        const difficultyData = HUNT_DIFFICULTIES[difficulty];
        const themeData = HUNT_THEMES[theme];
        const userId = interaction.user.id;

        // Get player data
        const player = await db.getPlayer(userId);
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Profile Required')
                .setDescription('You need a game profile to go treasure hunting!')
                .setFooter({ text: 'Use /daily to create your profile!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Generate hunt clues
        const clues = this.generateClues(difficulty, theme, difficultyData.clues);
        const firstClue = clues[0];

        // Create hunt data
        const huntData = {
            difficulty,
            theme,
            startTime: Date.now(),
            expires: Date.now() + difficultyData.timeLimit,
            cluesFound: 0,
            totalClues: difficultyData.clues,
            currentClue: firstClue.question,
            currentAnswer: firstClue.answer.toLowerCase(),
            remainingClues: clues.slice(1),
            hintsRemaining: difficultyData.hints,
            currentLocation: themeData.locations[0],
            attempts: 0,
            maxAttempts: 5
        };

        // Store active hunt
        interaction.client.activeHunts.set(userId, huntData);

        const reward = Math.floor(difficultyData.baseReward * themeData.multiplier);

        const embed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setTitle(`${themeData.name} - Hunt Begins!`)
            .setDescription(`**${difficultyData.name}** adventure has started!`)
            .addFields(
                { name: '📍 Starting Location', value: themeData.locations[0], inline: true },
                { name: '🎯 Objective', value: `Find ${difficultyData.clues} clues`, inline: true },
                { name: '💰 Potential Reward', value: `${reward} coins + ${difficultyData.xpReward} XP`, inline: true },
                { name: '🧩 First Clue', value: `*"${firstClue.question}"*`, inline: false },
                { name: '💡 Hints Available', value: `${difficultyData.hints}`, inline: true },
                { name: '⏰ Time Limit', value: `${Math.floor(difficultyData.timeLimit / 60000)} minutes`, inline: true }
            )
            .setFooter({ text: 'Use /solve <answer> to submit your answers!' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hunt_hint')
                    .setLabel(`💡 Get Hint (${difficultyData.hints} available)`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('hunt_map')
                    .setLabel('🗺️ View Map')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('hunt_inventory')
                    .setLabel('🎒 Check Equipment')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Set up auto-expiration
        setTimeout(() => {
            if (interaction.client.activeHunts.has(userId)) {
                interaction.client.activeHunts.delete(userId);
                interaction.followUp({
                    content: '⏰ Your treasure hunt has expired! The trail has gone cold...',
                    ephemeral: true
                });
            }
        }, difficultyData.timeLimit);

        return interaction.reply({ embeds: [embed], components: [buttons] });
    },

    generateClues(difficulty, theme, count) {
        const clueTemplates = {
            pirate: [
                { question: "Where the sun meets the sea, X marks the spot. Count the paces from the old oak tree.", answer: "shore" },
                { question: "In the captain's quarters, behind the map of stars, lies the next piece.", answer: "cabin" },
                { question: "The parrot speaks of treasures buried where bones rest eternal.", answer: "graveyard" },
                { question: "Follow the creek that sings to the cave that echoes.", answer: "cave" },
                { question: "The final treasure awaits where the lighthouse keeper sleeps.", answer: "lighthouse" }
            ],
            ancient: [
                { question: "In the chamber of forgotten kings, symbols point to hidden wisdom.", answer: "temple" },
                { question: "Where stone guardians watch over sacred texts.", answer: "library" },
                { question: "The altar of the sun god holds more than prayers.", answer: "altar" },
                { question: "Descend where the ancients stored their worldly goods.", answer: "vault" },
                { question: "The final secret lies beneath the constellation stone.", answer: "observatory" }
            ],
            mystical: [
                { question: "Where moonbeams touch the crystal pool, magic flows strongest.", answer: "spring" },
                { question: "The wise owl hoots thrice at the tree of eternal seasons.", answer: "oak" },
                { question: "In the circle where druids once danced, power still lingers.", answer: "circle" },
                { question: "The tower that touches clouds holds arcane knowledge.", answer: "tower" },
                { question: "Beyond the mirror that shows other realms.", answer: "portal" }
            ],
            dragon: [
                { question: "In the lair where flames never die, gold glitters in shadows.", answer: "lair" },
                { question: "The mountain that breathes fire holds ancient hoards.", answer: "volcano" },
                { question: "Where dragon eggs once nested, treasures now rest.", answer: "nest" },
                { question: "The peak where the great wyrm rested overlooks all.", answer: "summit" },
                { question: "In the heart of the mountain, the greatest treasure waits.", answer: "core" }
            ]
        };

        const themeClues = clueTemplates[theme] || clueTemplates.pirate;
        
        // Shuffle and take the required number of clues
        const shuffled = [...themeClues].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
};
