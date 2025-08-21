
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('💼 Take on various jobs to earn coins and experience!')
        .addStringOption(option =>
            option.setName('job')
                .setDescription('Choose a specific job to work')
                .setRequired(false)
                .addChoices(
                    { name: '⛏️ Mining Operations', value: 'mining' },
                    { name: '🌾 Farm Labor', value: 'farming' },
                    { name: '🛡️ City Guard', value: 'guard' },
                    { name: '📚 Scholar Research', value: 'scholar' },
                    { name: '🎭 Entertainment', value: 'entertainment' },
                    { name: '⚔️ Mercenary Work', value: 'mercenary' }
                ))
        .addBooleanOption(option =>
            option.setName('overtime')
                .setDescription('Work overtime for extra rewards (uses more energy)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const jobType = interaction.options?.getString('job');
            const overtime = interaction.options?.getBoolean('overtime') || false;

            const userId = interaction.user.id;
            let userData = await db.getPlayer(userId);
            
            if (!userData) {
                userData = {
                    coins: 100,
                    inventory: { items: [] },
                    stats: { experience: 0, workCount: 0, lastWork: 0 },
                    energy: { current: 100, max: 100 },
                    skills: { mining: 1, farming: 1, combat: 1, intelligence: 1, charisma: 1, strength: 1 }
                };
                await db.setPlayer(userId, userData);
            }

            // Ensure necessary objects exist
            userData.energy = userData.energy || { current: 100, max: 100 };
            userData.skills = userData.skills || { mining: 1, farming: 1, combat: 1, intelligence: 1, charisma: 1, strength: 1 };
            userData.stats = userData.stats || { experience: 0, workCount: 0, lastWork: 0 };

            // Check cooldown (4 hours)
            const now = Date.now();
            const cooldown = 4 * 60 * 60 * 1000; // 4 hours
            const lastWork = userData.stats.lastWork || 0;

            if (now - lastWork < cooldown) {
                const timeLeft = cooldown - (now - lastWork);
                const hours = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.warning || '#FFA500')
                    .setTitle('⏰ Work Cooldown Active')
                    .setDescription('You need to rest before taking on more work!')
                    .addFields([
                        { name: '⏱️ Time Remaining', value: `${hours}h ${minutes}m`, inline: true },
                        { name: '💰 Current Balance', value: `${userData.coins} coins`, inline: true },
                        { name: '⚡ Energy Level', value: `${userData.energy.current}/${userData.energy.max}`, inline: true }
                    ])
                    .setFooter({ text: 'Use this time to explore, hunt, or manage your inventory!' });

                return await interaction.editReply({ embeds: [embed] });
            }

            if (jobType) {
                await this.performJob(interaction, jobType, overtime, userData);
            } else {
                await this.showJobBoard(interaction, userData);
            }

        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async showJobBoard(interaction, userData) {
        const jobs = this.getAvailableJobs();
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.work || '#3498DB')
            .setTitle('💼 Adventure Job Board')
            .setDescription('**Choose your profession and start earning!**\n*Each job offers unique rewards and skill development opportunities.*')
            .setThumbnail('https://i.imgur.com/jobboard.png')
            .addFields([
                {
                    name: '💰 Your Status',
                    value: `**Balance:** ${userData.coins.toLocaleString()} coins\n**Energy:** ${userData.energy.current}/${userData.energy.max}\n**Jobs Completed:** ${userData.stats.workCount || 0}`,
                    inline: true
                },
                {
                    name: '📊 Skill Levels',
                    value: Object.entries(userData.skills)
                        .map(([skill, level]) => `**${skill.charAt(0).toUpperCase() + skill.slice(1)}:** ${level}`)
                        .slice(0, 3)
                        .join('\n'),
                    inline: true
                },
                {
                    name: '🎯 Work Benefits',
                    value: '• Earn steady income\n• Develop professional skills\n• Unlock new job opportunities\n• Build reputation',
                    inline: true
                }
            ]);

        // Add job listings
        jobs.forEach(job => {
            const requiredSkill = userData.skills[job.skill] || 1;
            const canWork = requiredSkill >= job.minLevel && userData.energy.current >= job.energyCost;
            const status = canWork ? '✅ Available' : 
                requiredSkill < job.minLevel ? `🔒 Need ${job.skill} level ${job.minLevel}` : 
                '⚡ Not enough energy';

            embed.addFields([{
                name: `${job.emoji} ${job.name}`,
                value: `**Pay:** ${job.baseReward} coins\n**Energy:** ${job.energyCost}\n**Skill:** ${job.skill.charAt(0).toUpperCase() + job.skill.slice(1)}\n**Status:** ${status}`,
                inline: true
            }]);
        });

        const jobSelect = new StringSelectMenuBuilder()
            .setCustomId('work_job_select')
            .setPlaceholder('💼 Choose a job to work...')
            .addOptions(jobs.map(job => {
                const canWork = (userData.skills[job.skill] || 1) >= job.minLevel && userData.energy.current >= job.energyCost;
                return {
                    label: job.name,
                    description: `${job.baseReward} coins - ${job.energyCost} energy`,
                    value: `work_${job.id}`,
                    emoji: job.emoji,
                    default: false
                };
            }));

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('work_overtime')
                    .setLabel('⏰ Overtime Shift')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💪'),
                new ButtonBuilder()
                    .setCustomId('work_skills')
                    .setLabel('📊 View Skills')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('work_history')
                    .setLabel('📋 Work History')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('work_rest')
                    .setLabel('😴 Rest & Recover')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.editReply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(jobSelect),
                buttons
            ]
        });
    },

    async performJob(interaction, jobId, overtime, userData) {
        const job = this.getJobById(jobId);
        if (!job) {
            return await interaction.editReply({
                content: '❌ Invalid job selection!',
                ephemeral: true
            });
        }

        const requiredSkill = userData.skills[job.skill] || 1;
        const energyCost = overtime ? job.energyCost * 1.5 : job.energyCost;

        // Check requirements
        if (requiredSkill < job.minLevel) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.error || '#FF0000')
                .setTitle('🔒 Insufficient Skill Level')
                .setDescription(`You need **${job.skill}** level **${job.minLevel}** for this job!`)
                .addFields([
                    { name: 'Your Level', value: `${requiredSkill}`, inline: true },
                    { name: 'Required Level', value: `${job.minLevel}`, inline: true },
                    { name: 'Tip', value: 'Work easier jobs to improve your skills!', inline: false }
                ]);

            return await interaction.editReply({ embeds: [embed] });
        }

        if (userData.energy.current < energyCost) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.error || '#FF0000')
                .setTitle('⚡ Insufficient Energy')
                .setDescription('You\'re too tired to work!')
                .addFields([
                    { name: 'Energy Required', value: `${energyCost}`, inline: true },
                    { name: 'Your Energy', value: `${userData.energy.current}`, inline: true },
                    { name: 'Recovery', value: 'Energy recovers over time or use `/rest`', inline: false }
                ]);

            return await interaction.editReply({ embeds: [embed] });
        }

        // Calculate rewards
        const skillBonus = Math.floor((requiredSkill - job.minLevel) * 0.1 * job.baseReward);
        const overtimeBonus = overtime ? Math.floor(job.baseReward * 0.5) : 0;
        const randomBonus = Math.floor(Math.random() * 50);
        const totalReward = job.baseReward + skillBonus + overtimeBonus + randomBonus;

        const experienceGained = 10 + (overtime ? 5 : 0);
        const skillExpGained = 1 + (overtime ? 1 : 0);

        // Update player data
        userData.coins += totalReward;
        userData.energy.current -= energyCost;
        userData.stats.experience += experienceGained;
        userData.stats.workCount = (userData.stats.workCount || 0) + 1;
        userData.stats.lastWork = Date.now();
        userData.skills[job.skill] += skillExpGained;

        await db.setPlayer(interaction.user.id, userData);

        // Create work result
        const workResult = this.getWorkResult(job, overtime);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle(`${job.emoji} Work Completed Successfully!`)
            .setDescription(`**${job.name}**\n${workResult.description}`)
            .addFields([
                {
                    name: '💰 Earnings Breakdown',
                    value: `Base Pay: ${job.baseReward} coins\n` +
                           `Skill Bonus: ${skillBonus} coins\n` +
                           `${overtime ? `Overtime Bonus: ${overtimeBonus} coins\n` : ''}` +
                           `Performance Bonus: ${randomBonus} coins\n` +
                           `**Total: ${totalReward} coins**`,
                    inline: true
                },
                {
                    name: '📈 Experience Gained',
                    value: `General XP: ${experienceGained}\n${job.skill.charAt(0).toUpperCase() + job.skill.slice(1)} Skill: +${skillExpGained}`,
                    inline: true
                },
                {
                    name: '⚡ Energy Status',
                    value: `Used: ${energyCost}\nRemaining: ${userData.energy.current}/${userData.energy.max}`,
                    inline: true
                },
                {
                    name: '🎯 Work Summary',
                    value: `**New Balance:** ${userData.coins.toLocaleString()} coins\n**Jobs Completed:** ${userData.stats.workCount}\n**${job.skill.charAt(0).toUpperCase() + job.skill.slice(1)} Level:** ${userData.skills[job.skill]}`,
                    inline: false
                }
            ])
            .setFooter({ text: overtime ? 'Overtime work completed! Great dedication!' : 'Regular shift completed successfully!' })
            .setTimestamp();

        // Add special rewards if any
        if (workResult.bonus) {
            embed.addFields([{
                name: '🎁 Special Bonus!',
                value: workResult.bonus,
                inline: false
            }]);
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('work_again')
                    .setLabel('💼 Work Again')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(userData.energy.current < job.energyCost),
                new ButtonBuilder()
                    .setCustomId('work_board')
                    .setLabel('📋 Job Board')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('work_rest')
                    .setLabel('😴 Rest')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    getAvailableJobs() {
        return [
            {
                id: 'mining',
                name: 'Mining Operations',
                emoji: '⛏️',
                description: 'Extract valuable ores from deep mines',
                baseReward: 150,
                energyCost: 20,
                skill: 'mining',
                minLevel: 1
            },
            {
                id: 'farming',
                name: 'Farm Labor',
                emoji: '🌾',
                description: 'Tend crops and livestock',
                baseReward: 100,
                energyCost: 15,
                skill: 'farming',
                minLevel: 1
            },
            {
                id: 'guard',
                name: 'City Guard',
                emoji: '🛡️',
                description: 'Protect the city from threats',
                baseReward: 200,
                energyCost: 25,
                skill: 'combat',
                minLevel: 3
            },
            {
                id: 'scholar',
                name: 'Scholar Research',
                emoji: '📚',
                description: 'Conduct research and study ancient texts',
                baseReward: 180,
                energyCost: 10,
                skill: 'intelligence',
                minLevel: 2
            },
            {
                id: 'entertainment',
                name: 'Entertainment',
                emoji: '🎭',
                description: 'Perform for crowds and earn tips',
                baseReward: 120,
                energyCost: 12,
                skill: 'charisma',
                minLevel: 1
            },
            {
                id: 'mercenary',
                name: 'Mercenary Work',
                emoji: '⚔️',
                description: 'Take on dangerous missions for high pay',
                baseReward: 300,
                energyCost: 35,
                skill: 'combat',
                minLevel: 5
            }
        ];
    },

    getJobById(id) {
        return this.getAvailableJobs().find(job => job.id === id);
    },

    getWorkResult(job, overtime) {
        const results = {
            mining: {
                description: overtime ? 
                    'You worked through the night, extracting rare gemstones from the deepest tunnels!' :
                    'You spent the day mining precious ores and valuable minerals.',
                bonus: overtime ? 'Found a rare crystal! +50 bonus coins' : null
            },
            farming: {
                description: overtime ?
                    'You worked extra hours tending the fields and caring for the animals!' :
                    'You helped with the harvest and took care of the livestock.',
                bonus: overtime ? 'Discovered a perfect crop! +30 bonus coins' : null
            },
            guard: {
                description: overtime ?
                    'You stood watch all night, protecting the city from dangerous creatures!' :
                    'You patrolled the streets and kept the citizens safe.',
                bonus: overtime ? 'Caught a notorious thief! +75 bonus coins' : null
            },
            scholar: {
                description: overtime ?
                    'You spent extra time researching ancient mysteries and deciphering old texts!' :
                    'You studied scrolls and conducted valuable research.',
                bonus: overtime ? 'Made a breakthrough discovery! +60 bonus coins' : null
            },
            entertainment: {
                description: overtime ?
                    'Your extended performance was a huge hit with the audience!' :
                    'You entertained the crowds with your talents.',
                bonus: overtime ? 'Standing ovation! +40 bonus coins' : null
            },
            mercenary: {
                description: overtime ?
                    'You completed an extremely dangerous mission that lasted all night!' :
                    'You successfully completed a high-risk assignment.',
                bonus: overtime ? 'Mission critical success! +100 bonus coins' : null
            }
        };

        return results[job.id] || {
            description: 'You completed your work successfully.',
            bonus: null
        };
    }
};
