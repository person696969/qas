const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const riddles = {
    easy: [
        { question: "I have keys but no locks. I have space but no room. You can enter but not go outside. What am I?", answer: "keyboard", reward: 100 },
        { question: "What has hands but cannot clap?", answer: "clock", reward: 120 },
        { question: "I'm tall when I'm young, and short when I'm old. What am I?", answer: "candle", reward: 110 },
        { question: "What goes up but never comes down?", answer: "age", reward: 90 },
        { question: "What has a face and two hands but no arms or legs?", answer: "clock", reward: 105 }
    ],
    medium: [
        { question: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?", answer: "echo", reward: 250 },
        { question: "I'm not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?", answer: "fire", reward: 280 },
        { question: "The more you take away from me, the bigger I become. What am I?", answer: "hole", reward: 260 },
        { question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", answer: "map", reward: 240 },
        { question: "I'm always hungry and must always be fed. The finger I touch will soon turn red. What am I?", answer: "fire", reward: 270 }
    ],
    hard: [
        { question: "I am taken from a mine and shut in a wooden case, from which I am never released. What am I?", answer: "pencil", reward: 500 },
        { question: "I have a golden head, a golden tail, but no golden body. What am I?", answer: "coin", reward: 520 },
        { question: "I'm light as a feather, yet the strongest person can't hold me for five minutes. What am I?", answer: "breath", reward: 480 },
        { question: "I disappear every time you say my name. What am I?", answer: "silence", reward: 460 },
        { question: "I have branches, but no fruit, trunk, or leaves. What am I?", answer: "bank", reward: 540 }
    ],
    expert: [
        { question: "I am not a season, yet I bring rain. I am not a bird, yet I have wings. I am not alive, yet I breathe. What am I?", answer: "cloud", reward: 1000 },
        { question: "I have no beginning, middle, or end, yet I hold all of time. What am I?", answer: "eternity", reward: 1200 },
        { question: "I'm invisible but can be seen, silent but can be heard, weightless but can be felt. What am I?", answer: "wind", reward: 1100 },
        { question: "I am the beginning of everything, the end of everywhere. I'm the beginning of eternity, the end of time and space. What am I?", answer: "e", reward: 1500 },
        { question: "I'm always in front of you but can't be seen. What am I?", answer: "future", reward: 1300 }
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('🏴‍☠️ Start an epic treasure hunt adventure!')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose your adventure difficulty')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 Easy (100-120 coins)', value: 'easy' },
                    { name: '🟡 Medium (240-280 coins)', value: 'medium' },
                    { name: '🔴 Hard (460-540 coins)', value: 'hard' },
                    { name: '⚫ Expert (1000-1500 coins)', value: 'expert' }
                )),
    
    async execute(interaction) {
        const difficulty = interaction.options?.getString('difficulty') || 'easy';
        const userId = interaction.user.id;
        
        // Check if user has an active hunt
        if (interaction.client.activeHunts.has(userId)) {
            const currentHunt = interaction.client.activeHunts.get(userId);
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.warning)
                .setTitle('🏴‍☠️ Active Treasure Hunt')
                .setDescription('You already have an active treasure hunt! Complete it first.')
                .addFields([
                    { name: '🎯 Current Riddle', value: currentHunt.question, inline: false },
                    { name: '💰 Potential Reward', value: `${currentHunt.reward} coins`, inline: true },
                    { name: '🏆 Difficulty', value: currentHunt.difficulty.toUpperCase(), inline: true }
                ])
                .setFooter({ text: 'Use /solve <answer> to submit your answer!' });
                
            return interaction.reply({ embeds: [embed] });
        }
        
        // Get random riddle from selected difficulty
        const riddlePool = riddles[difficulty];
        const selectedRiddle = riddlePool[Math.floor(Math.random() * riddlePool.length)];
        
        // Store active hunt
        interaction.client.activeHunts.set(userId, {
            question: selectedRiddle.question,
            answer: selectedRiddle.answer.toLowerCase(),
            reward: selectedRiddle.reward,
            difficulty: difficulty,
            startTime: Date.now(),
            attempts: 0,
            maxAttempts: difficulty === 'expert' ? 2 : difficulty === 'hard' ? 3 : 5
        });
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.treasure)
            .setTitle(`🗺️ ${difficulty.toUpperCase()} Treasure Hunt Started!`)
            .setDescription('**A mysterious riddle blocks your path...**')
            .addFields([
                { name: '🧩 Riddle', value: `*"${selectedRiddle.question}"*`, inline: false },
                { name: '💰 Reward', value: `${selectedRiddle.reward} coins`, inline: true },
                { name: '⏰ Time Limit', value: '10 minutes', inline: true },
                { name: '🎯 Attempts Left', value: `${5 - (difficulty === 'expert' ? 3 : difficulty === 'hard' ? 2 : 0)}`, inline: true }
            ])
            .setFooter({ text: 'Use /solve <answer> to submit your answer or /hint for a clue!' })
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hunt_hint')
                    .setLabel('💡 Get Hint (50 coins)')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('hunt_skip')
                    .setLabel('⏭️ Skip Riddle (100 coins)')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('hunt_abandon')
                    .setLabel('🚪 Abandon Hunt')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
        
        // Set hunt expiration timer
        setTimeout(() => {
            if (interaction.client.activeHunts.has(userId)) {
                interaction.client.activeHunts.delete(userId);
                interaction.followUp({ 
                    content: '⏰ Your treasure hunt has expired! Start a new one with `/hunt`.',
                    ephemeral: true 
                });
            }
        }, 600000); // 10 minutes

        // Set up button collector
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 });

        collector.on('collect', async buttonInteraction => {
            try {
                if (!interaction.client.activeHunts.has(userId)) {
                    await buttonInteraction.reply({ 
                        content: '❌ No active hunt found!', 
                        ephemeral: true 
                    });
                    return;
                }

                const currentHunt = interaction.client.activeHunts.get(userId);

                if (buttonInteraction.customId === 'hunt_hint') {
                    const player = await db.getPlayer(userId);
                    if (player.coins < 50) {
                        await buttonInteraction.reply({
                            content: '❌ You need 50 coins for a hint!',
                            ephemeral: true
                        });
                        return;
                    }

                    player.coins -= 50;
                    await db.updatePlayer(userId, player);

                    const hints = {
                        keyboard: 'Think about what you use to type...',
                        clock: 'It shows time and has moving parts...',
                        candle: 'It gets shorter as it gets older...',
                        age: 'Something that only increases, never decreases...',
                        echo: 'You hear it in mountains and empty halls...',
                        fire: 'It needs oxygen to survive...',
                        hole: 'The more you remove, the larger it becomes...',
                        map: 'It shows places but isn\'t real...',
                        pencil: 'Made from graphite, encased in wood...',
                        coin: 'Round, valuable, used for trade...',
                        breath: 'Essential for life, but invisible...',
                        silence: 'The absence of sound...',
                        bank: 'Not a tree, but has branches...',
                        cloud: 'Floats in sky, brings rain...',
                        eternity: 'Time without beginning or end...',
                        wind: 'You feel it but cannot see it...',
                        e: 'The first letter of "everything"...',
                        future: 'Always ahead, never reached...'
                    };

                    const hint = hints[currentHunt.answer] || 'Think carefully about the words used...';

                    const hintEmbed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('💡 Treasure Hunt Hint')
                        .setDescription(`**Hint:** *${hint}*`)
                        .addFields(
                            { name: '💰 Cost', value: '50 coins deducted', inline: true },
                            { name: '🎯 Attempts Left', value: `${currentHunt.maxAttempts - currentHunt.attempts}`, inline: true }
                        )
                        .setFooter({ text: 'Use /solve <answer> to submit your answer!' });

                    await buttonInteraction.update({ embeds: [hintEmbed], components: [] });

                } else if (buttonInteraction.customId === 'hunt_skip') {
                    const player = await db.getPlayer(userId);
                    if (player.coins < 100) {
                        await buttonInteraction.reply({
                            content: '❌ You need 100 coins to skip!',
                            ephemeral: true
                        });
                        return;
                    }

                    player.coins -= 100;
                    await db.updatePlayer(userId, player);
                    interaction.client.activeHunts.delete(userId);

                    const skipEmbed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('⏭️ Riddle Skipped')
                        .setDescription('You decided to skip this riddle and continue your treasure hunt!')
                        .addFields(
                            { name: '💡 Answer', value: `*"${currentHunt.answer}"*`, inline: true },
                            { name: '💰 Cost', value: '100 coins', inline: true },
                            { name: '🎯 Next Step', value: 'Start a new hunt!', inline: true }
                        )
                        .setFooter({ text: 'Use /hunt to begin another treasure hunt!' });

                    await buttonInteraction.update({ embeds: [skipEmbed], components: [] });

                } else if (buttonInteraction.customId === 'hunt_abandon') {
                    interaction.client.activeHunts.delete(userId);

                    const abandonEmbed = new EmbedBuilder()
                        .setColor('#E74C3C')
                        .setTitle('🚪 Hunt Abandoned')
                        .setDescription('You decided to abandon this treasure hunt.')
                        .addFields({
                            name: '💡 **The Answer**',
                            value: `*"${currentHunt.answer}"*\n\nBetter luck next time!`,
                            inline: false
                        })
                        .setFooter({ text: 'Use /hunt to start a new adventure!' });

                    await buttonInteraction.update({ embeds: [abandonEmbed], components: [] });
                }

            } catch (error) {
                console.error('Error in hunt button interaction:', error);
                await buttonInteraction.reply({
                    content: '❌ An error occurred while processing your action.',
                    ephemeral: true
                });
            }
        });

        collector.on('end', collected => {
            console.log(`Hunt button collector ended for ${userId}. Collected ${collected.size} interactions.`);
        });
    }
};