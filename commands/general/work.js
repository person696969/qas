
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const jobs = [
    { 
        id: 'miner', 
        name: 'Mine Supervisor', 
        pay: { min: 150, max: 250 }, 
        emoji: '⛏️', 
        requirements: { mining: 5 },
        description: 'Oversee mining operations and gem extraction',
        skills: ['mining', 'leadership'],
        dangers: ['Cave-ins', 'Gas leaks', 'Underground creatures']
    },
    { 
        id: 'fisherman', 
        name: 'Professional Fisher', 
        pay: { min: 120, max: 200 }, 
        emoji: '🎣', 
        requirements: { fishing: 3 },
        description: 'Catch rare fish and manage fishing operations',
        skills: ['fishing', 'patience'],
        dangers: ['Storms', 'Sea monsters', 'Equipment failure']
    },
    { 
        id: 'guard', 
        name: 'City Guard', 
        pay: { min: 100, max: 180 }, 
        emoji: '🛡️', 
        requirements: { level: 5 },
        description: 'Protect the city and maintain order',
        skills: ['combat', 'vigilance'],
        dangers: ['Criminal activity', 'Monster attacks', 'Civil unrest']
    },
    { 
        id: 'merchant', 
        name: 'Traveling Merchant', 
        pay: { min: 80, max: 160 }, 
        emoji: '🛒', 
        requirements: { level: 3 },
        description: 'Trade goods across different cities and regions',
        skills: ['negotiation', 'travel'],
        dangers: ['Bandits', 'Bad weather', 'Market crashes']
    },
    { 
        id: 'scribe', 
        name: 'Guild Scribe', 
        pay: { min: 90, max: 140 }, 
        emoji: '📜', 
        requirements: {},
        description: 'Record important documents and maintain records',
        skills: ['writing', 'organization'],
        dangers: ['Paper cuts', 'Eye strain', 'Ink stains']
    },
    { 
        id: 'blacksmith', 
        name: 'Blacksmith Assistant', 
        pay: { min: 110, max: 190 }, 
        emoji: '🔨', 
        requirements: { crafting: 3 },
        description: 'Forge weapons and tools for adventurers',
        skills: ['crafting', 'strength'],
        dangers: ['Burns', 'Heavy lifting', 'Metal fumes']
    },
    { 
        id: 'explorer', 
        name: 'Map Maker', 
        pay: { min: 130, max: 220 }, 
        emoji: '🗺️', 
        requirements: { level: 8 },
        description: 'Explore uncharted territories and create maps',
        skills: ['exploration', 'cartography'],
        dangers: ['Getting lost', 'Wild animals', 'Harsh terrain']
    },
    { 
        id: 'tavern', 
        name: 'Tavern Keeper', 
        pay: { min: 70, max: 130 }, 
        emoji: '🍺', 
        requirements: {},
        description: 'Serve drinks and manage tavern operations',
        skills: ['hospitality', 'multitasking'],
        dangers: ['Drunk patrons', 'Broken bottles', 'Late nights']
    },
    { 
        id: 'hunter', 
        name: 'Monster Hunter', 
        pay: { min: 200, max: 350 }, 
        emoji: '⚔️', 
        requirements: { level: 10, battles: 5 },
        description: 'Hunt dangerous monsters threatening settlements',
        skills: ['combat', 'tracking'],
        dangers: ['Deadly monsters', 'Poison', 'Remote locations']
    },
    { 
        id: 'mage', 
        name: 'Court Mage', 
        pay: { min: 180, max: 300 }, 
        emoji: '🔮', 
        requirements: { magic: 5 },
        description: 'Provide magical services to nobles and royalty',
        skills: ['magic', 'etiquette'],
        dangers: ['Magical backlash', 'Political intrigue', 'Cursed artifacts']
    },
    { 
        id: 'alchemist', 
        name: 'Royal Alchemist', 
        pay: { min: 220, max: 380 }, 
        emoji: '⚗️', 
        requirements: { alchemy: 7, level: 12 },
        description: 'Create potions and elixirs for the kingdom',
        skills: ['alchemy', 'research'],
        dangers: ['Explosions', 'Toxic fumes', 'Unstable experiments']
    },
    { 
        id: 'diplomat', 
        name: 'Royal Diplomat', 
        pay: { min: 250, max: 400 }, 
        emoji: '👑', 
        requirements: { level: 15, charisma: 8 },
        description: 'Negotiate treaties and maintain international relations',
        skills: ['diplomacy', 'languages'],
        dangers: ['Assassination attempts', 'Political scandals', 'International incidents']
    }
];

const workEvents = {
    positive: [
        { description: 'You impressed your supervisor with excellent work and earned a bonus!', bonus: 50, rarity: 0.2 },
        { description: 'A wealthy customer was pleased with your service and tipped generously.', bonus: 75, rarity: 0.15 },
        { description: 'You discovered a more efficient way to do your job.', bonus: 40, rarity: 0.25 },
        { description: 'You helped a coworker with a difficult task and were rewarded.', bonus: 30, rarity: 0.3 },
        { description: 'You worked overtime to complete an urgent project.', bonus: 60, rarity: 0.18 },
        { description: 'Your dedication caught the attention of higher management.', bonus: 100, rarity: 0.1 },
        { description: 'You found a valuable item while working and got to keep it!', bonus: 80, rarity: 0.12 }
    ],
    neutral: [
        { description: 'A routine day at work. You completed all your tasks efficiently.', bonus: 0, rarity: 0.4 },
        { description: 'Standard workday with no major incidents.', bonus: 5, rarity: 0.3 },
        { description: 'You met all your quotas and requirements.', bonus: 10, rarity: 0.3 }
    ],
    negative: [
        { description: 'Equipment malfunction caused delays, reducing your pay.', bonus: -20, rarity: 0.15 },
        { description: 'Bad weather made working conditions difficult.', bonus: -15, rarity: 0.2 },
        { description: 'A customer complaint resulted in a small pay deduction.', bonus: -10, rarity: 0.25 },
        { description: 'You made a minor mistake that cost some time.', bonus: -5, rarity: 0.4 }
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('💼 Work various jobs to earn coins and gain experience!')
        .addStringOption(option =>
            option.setName('job')
                .setDescription('Choose specific job to work')
                .setRequired(false)
                .addChoices(
                    ...jobs.map(job => ({ 
                        name: `${job.emoji} ${job.name}`, 
                        value: job.id 
                    }))
                ))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Choose work duration')
                .addChoices(
                    { name: '⚡ Quick Shift (1 hour)', value: 'quick' },
                    { name: '📅 Standard Shift (4 hours)', value: 'standard' },
                    { name: '🌙 Extended Shift (8 hours)', value: 'extended' }
                )),
    
    async execute(interaction) {
        const requestedJob = interaction.options?.getString('job');
        const duration = interaction.options?.getString('duration') || 'standard';
        const userId = interaction.user.id;
        
        try {
            const userData = await db.getPlayer(userId);
            
            // Check cooldown
            const lastWork = userData.cooldowns?.work || 0;
            const cooldownTime = this.getCooldownTime(duration);
            const timeSinceLastWork = Date.now() - lastWork;
            
            if (timeSinceLastWork < cooldownTime) {
                await this.showCooldownMessage(interaction, cooldownTime - timeSinceLastWork);
                return;
            }
            
            if (!requestedJob) {
                await this.showJobBoard(interaction, userData);
            } else {
                await this.workJob(interaction, requestedJob, duration, userData);
            }
        } catch (error) {
            console.error('Work command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your work request.',
                ephemeral: true
            });
        }
    },
    
    async showJobBoard(interaction, userData) {
        const availableJobs = this.getAvailableJobs(userData);
        const lockedJobs = jobs.filter(job => !this.meetsRequirements(userData, job));
        
        const embed = new EmbedBuilder()
            .setColor('#4A90E2')
            .setTitle('💼 Adventurer Employment Board')
            .setDescription('**Seek honest work and earn your keep!**\nChoose from various employment opportunities based on your skills and experience.')
            .setThumbnail('https://cdn.discordapp.com/emojis/💼.png')
            .addFields([
                {
                    name: '👤 Your Qualifications',
                    value: `**Level:** ${userData.level || 1}\n**Mining:** ${userData.skills?.mining || 1}\n**Fishing:** ${userData.skills?.fishing || 1}\n**Crafting:** ${userData.skills?.crafting || 1}\n**Magic:** ${userData.skills?.magic || 1}\n**Charisma:** ${userData.skills?.charisma || 1}`,
                    inline: true
                },
                {
                    name: '💰 Employment Info',
                    value: `**Current Balance:** ${userData.coins?.toLocaleString() || 0} coins\n**Jobs Completed:** ${userData.statistics?.jobsDone || 0}\n**Career Level:** ${this.getCareerLevel(userData)}\n**Work Reputation:** ${this.getWorkReputation(userData)}`,
                    inline: true
                },
                {
                    name: '🎁 Employment Benefits',
                    value: `**Hourly Pay:** Based on job\n**Experience:** Skill progression\n**Bonuses:** Performance rewards\n**Insurance:** Job safety coverage\n**Vacation:** Paid time off`,
                    inline: true
                }
            ]);
            
        // Add available jobs
        if (availableJobs.length > 0) {
            const jobList = availableJobs.map(job => {
                const bonus = this.getJobBonus(userData, job);
                const basePay = `${job.pay.min}-${job.pay.max}`;
                const totalPay = bonus > 0 ? `${job.pay.min + bonus}-${job.pay.max + bonus}` : basePay;
                const reputation = this.getJobReputation(userData, job.id);
                return `${job.emoji} **${job.name}**\n` +
                       `   💰 ${totalPay} coins${bonus > 0 ? ` (+${bonus} bonus)` : ''}\n` +
                       `   📋 *${job.description}*\n` +
                       `   ⭐ Reputation: ${reputation}\n`;
            }).join('\n');
            
            embed.addFields([
                { name: '✅ Available Positions', value: jobList, inline: false }
            ]);
        }
        
        // Add locked jobs (limited to prevent embed being too long)
        if (lockedJobs.length > 0) {
            const lockedList = lockedJobs.slice(0, 4).map(job => {
                const reqs = Object.entries(job.requirements).map(([skill, level]) => 
                    `${skill} ${level}`
                ).join(', ');
                return `${job.emoji} **${job.name}** 🔒\n   Requirements: ${reqs || 'None'}`;
            }).join('\n\n');
            
            embed.addFields([
                { name: '🔒 Locked Positions (Level Up to Unlock)', value: lockedList, inline: false }
            ]);
        }
        
        const jobSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`work_job_${interaction.user.id}`)
                    .setPlaceholder('💼 Select a job to work')
                    .addOptions(
                        availableJobs.map(job => ({
                            label: job.name,
                            description: `${job.pay.min}-${job.pay.max} coins • ${job.description.substring(0, 50)}...`,
                            value: job.id,
                            emoji: job.emoji
                        }))
                    )
            );

        const durationSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`work_duration_${interaction.user.id}`)
                    .setPlaceholder('⏰ Choose work duration')
                    .addOptions([
                        {
                            label: 'Quick Shift',
                            description: '1 hour cooldown • 1x pay • Fast results',
                            value: 'quick',
                            emoji: '⚡'
                        },
                        {
                            label: 'Standard Shift',
                            description: '4 hour cooldown • 1.5x pay • Balanced approach',
                            value: 'standard',
                            emoji: '📅'
                        },
                        {
                            label: 'Extended Shift',
                            description: '8 hour cooldown • 2x pay • Maximum earnings',
                            value: 'extended',
                            emoji: '🌙'
                        }
                    ])
            );
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`work_quick_${interaction.user.id}`)
                    .setLabel('⚡ Quick Work')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(availableJobs.length === 0),
                new ButtonBuilder()
                    .setCustomId(`work_best_pay_${interaction.user.id}`)
                    .setLabel('💰 Best Paying Job')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(availableJobs.length === 0),
                new ButtonBuilder()
                    .setCustomId(`work_history_${interaction.user.id}`)
                    .setLabel('📊 Work History')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`work_training_${interaction.user.id}`)
                    .setLabel('📚 Skills Training')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [buttons];
        if (availableJobs.length > 0) {
            components.unshift(jobSelect, durationSelect);
        }

        await interaction.reply({ embeds: [embed], components });
    },
    
    async workJob(interaction, jobId, duration = 'standard', userData) {
        const job = jobs.find(j => j.id === jobId);
        
        if (!job) {
            return interaction.reply({
                content: '❌ Job not found!',
                ephemeral: true
            });
        }
        
        if (!this.meetsRequirements(userData, job)) {
            const reqs = Object.entries(job.requirements).map(([skill, level]) => 
                `${skill} level ${level}`
            ).join(', ');
            return interaction.reply({
                content: `❌ You don't meet the requirements for ${job.name}!\n**Required:** ${reqs}`,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // Show work in progress
        const workingEmbed = new EmbedBuilder()
            .setColor('#FF9800')
            .setTitle(`${job.emoji} Working as ${job.name}...`)
            .setDescription(`🔄 You begin your ${duration} shift...\n\n*${job.description}*`)
            .addFields([
                { name: '💼 Position', value: job.name, inline: true },
                { name: '⏰ Duration', value: this.getDurationName(duration), inline: true },
                { name: '🎯 Status', value: 'Working...', inline: true },
                { name: '⚠️ Job Hazards', value: job.dangers.join('\n'), inline: false }
            ])
            .setFooter({ text: 'Work in progress... Please wait!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [workingEmbed] });

        // Simulate work duration with progress updates
        const workDuration = this.getWorkDuration(duration);
        
        setTimeout(async () => {
            await this.sendWorkProgress(interaction, job, 33);
        }, workDuration * 0.33);

        setTimeout(async () => {
            await this.sendWorkProgress(interaction, job, 66);
        }, workDuration * 0.66);

        setTimeout(async () => {
            await this.completeWork(interaction, job, duration, userData);
        }, workDuration);
    },

    async sendWorkProgress(interaction, job, progress) {
        const progressMessages = {
            33: 'Getting into the rhythm of work...',
            66: 'Making good progress on your tasks...'
        };

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`${job.emoji} ${job.name} - ${progress}% Complete`)
            .setDescription(progressMessages[progress])
            .addFields([
                { name: '📊 Progress', value: `${'█'.repeat(Math.floor(progress/10))}${'░'.repeat(10-Math.floor(progress/10))} ${progress}%`, inline: false }
            ]);

        await interaction.editReply({ embeds: [embed] });
    },

    async completeWork(interaction, job, duration, userData) {
        // Calculate earnings
        const basePay = Math.floor(Math.random() * (job.pay.max - job.pay.min + 1)) + job.pay.min;
        const durationMultiplier = this.getDurationMultiplier(duration);
        const bonus = this.getJobBonus(userData, job);
        const workEvent = this.generateWorkEvent(job, userData);
        
        const totalPay = Math.floor((basePay + bonus) * durationMultiplier) + workEvent.bonus;
        const finalPay = Math.max(0, totalPay); // Ensure non-negative
        
        // Calculate experience gains
        const jobExperience = this.getJobExperience(job, duration);
        const skillExperience = this.getSkillExperience(job, duration);
        
        // Update user data
        const updatedData = {
            coins: userData.coins + finalPay,
            experience: userData.experience + jobExperience,
            cooldowns: {
                ...userData.cooldowns,
                work: Date.now()
            },
            statistics: {
                ...userData.statistics,
                jobsDone: (userData.statistics?.jobsDone || 0) + 1,
                totalEarned: (userData.statistics?.totalEarned || 0) + finalPay,
                workTime: (userData.statistics?.workTime || 0) + this.getDurationHours(duration),
                [`${job.id}Jobs`]: (userData.statistics?.[`${job.id}Jobs`] || 0) + 1
            },
            skills: {
                ...userData.skills,
                ...skillExperience
            }
        };
        
        await db.updatePlayer(interaction.user.id, updatedData);
        
        // Check for achievements
        const achievements = this.checkWorkAchievements(updatedData.statistics, job);
        
        // Create result embed
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle(`${job.emoji} Work Complete: ${job.name}`)
            .setDescription(`**Shift completed successfully!**\n\n${workEvent.description}`)
            .addFields([
                { name: '💰 Base Pay', value: `${basePay} coins`, inline: true },
                { name: '🎯 Duration Bonus', value: `${((durationMultiplier - 1) * 100).toFixed(0)}%`, inline: true },
                { name: '⭐ Skill Bonus', value: `+${bonus} coins`, inline: true },
                { name: '🎲 Event Bonus', value: `${workEvent.bonus >= 0 ? '+' : ''}${workEvent.bonus} coins`, inline: true },
                { name: '🎉 Total Earned', value: `**${finalPay.toLocaleString()} coins**`, inline: true },
                { name: '💳 New Balance', value: `${updatedData.coins.toLocaleString()} coins`, inline: true },
                { name: '⚡ Experience Gained', value: `+${jobExperience} general XP`, inline: true },
                { name: '📊 Jobs Completed', value: `${updatedData.statistics.jobsDone}`, inline: true },
                { name: '🕒 Work Duration', value: this.getDurationName(duration), inline: true }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        // Add skill experience details
        const skillGains = Object.entries(skillExperience).map(([skill, exp]) => 
            `+${exp} ${skill} XP`
        ).join('\n');
        
        if (skillGains) {
            embed.addFields([
                { name: '🎯 Skill Experience', value: skillGains, inline: false }
            ]);
        }
        
        // Add achievements if any
        if (achievements.length > 0) {
            embed.addFields([
                { name: '🏆 Achievements Unlocked!', value: achievements.join('\n'), inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`work_again_${interaction.user.id}`)
                    .setLabel('💼 Work Again')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`work_board_${interaction.user.id}`)
                    .setLabel('📋 Job Board')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`work_stats_${interaction.user.id}`)
                    .setLabel('📊 Work Stats')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`shop_visit_${interaction.user.id}`)
                    .setLabel('🛒 Spend Earnings')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showCooldownMessage(interaction, timeLeft) {
        const hours = Math.floor(timeLeft / 3600000);
        const minutes = Math.floor((timeLeft % 3600000) / 60000);
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('⏰ Still Recovering from Last Job')
            .setDescription('You\'re still tired from your previous work shift!')
            .addFields([
                { name: '⏰ Time Remaining', value: `${hours}h ${minutes}m`, inline: true },
                { name: '😴 Status', value: 'Resting', inline: true },
                { name: '💡 Tip', value: 'Use this time to explore or train!', inline: true },
                {
                    name: '🎯 While You Wait',
                    value: '• Check out the treasure hunts (`/treasure`)\n• Solve some riddles (`/riddle`)\n• Train your skills (`/train`)\n• Explore dungeons (`/dungeon`)',
                    inline: false
                }
            ])
            .setFooter({ text: 'Rest is important for productivity!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Helper functions
    getCooldownTime(duration) {
        const cooldowns = {
            quick: 3600000,    // 1 hour
            standard: 14400000, // 4 hours
            extended: 28800000  // 8 hours
        };
        return cooldowns[duration] || cooldowns.standard;
    },

    getWorkDuration(duration) {
        const durations = {
            quick: 2000,    // 2 seconds for demo
            standard: 4000, // 4 seconds for demo
            extended: 6000  // 6 seconds for demo
        };
        return durations[duration] || durations.standard;
    },

    getDurationMultiplier(duration) {
        const multipliers = { quick: 1, standard: 1.5, extended: 2 };
        return multipliers[duration] || 1.5;
    },

    getDurationName(duration) {
        const names = { quick: 'Quick Shift (1 hour)', standard: 'Standard Shift (4 hours)', extended: 'Extended Shift (8 hours)' };
        return names[duration] || 'Standard Shift';
    },

    getDurationHours(duration) {
        const hours = { quick: 1, standard: 4, extended: 8 };
        return hours[duration] || 4;
    },
    
    getAvailableJobs(userData) {
        return jobs.filter(job => this.meetsRequirements(userData, job));
    },
    
    meetsRequirements(userData, job) {
        for (const [skill, required] of Object.entries(job.requirements)) {
            let userLevel = 1;
            
            if (skill === 'level') {
                userLevel = userData.level || 1;
            } else if (skill === 'battles') {
                userLevel = userData.statistics?.battlesWon || 0;
            } else {
                userLevel = userData.skills?.[skill] || 1;
            }
            
            if (userLevel < required) return false;
        }
        return true;
    },
    
    getJobBonus(userData, job) {
        let bonus = 0;
        
        // Experience-based bonuses
        const jobsDone = userData.statistics?.jobsDone || 0;
        if (jobsDone >= 100) bonus += 50;
        else if (jobsDone >= 50) bonus += 30;
        else if (jobsDone >= 20) bonus += 20;
        else if (jobsDone >= 10) bonus += 10;
        
        // Job-specific skill bonuses
        const jobSkills = job.skills || [];
        jobSkills.forEach(skill => {
            const skillLevel = userData.skills?.[skill] || 1;
            if (skillLevel > 5) bonus += skillLevel * 2;
        });
        
        // Reputation bonus
        const jobCount = userData.statistics?.[`${job.id}Jobs`] || 0;
        if (jobCount >= 20) bonus += 25;
        else if (jobCount >= 10) bonus += 15;
        else if (jobCount >= 5) bonus += 10;
        
        return bonus;
    },

    getJobExperience(job, duration) {
        const base = { quick: 5, standard: 10, extended: 20 };
        const jobMultiplier = { easy: 1, medium: 1.2, hard: 1.5, expert: 2 };
        return Math.floor(base[duration] * (jobMultiplier[job.difficulty] || 1));
    },

    getSkillExperience(job, duration) {
        const experience = {};
        const baseExp = { quick: 3, standard: 8, extended: 15 };
        const exp = baseExp[duration];

        if (job.skills) {
            job.skills.forEach(skill => {
                experience[skill] = (experience[skill] || 0) + exp;
            });
        }

        return experience;
    },
    
    generateWorkEvent(job, userData) {
        const jobsDone = userData.statistics?.jobsDone || 0;
        const jobReputation = userData.statistics?.[`${job.id}Jobs`] || 0;
        
        // Higher chance of good events for experienced workers
        const goodEventChance = Math.min(0.4 + (jobsDone * 0.005) + (jobReputation * 0.01), 0.8);
        const badEventChance = Math.max(0.15 - (jobsDone * 0.002), 0.05);
        
        const random = Math.random();
        
        if (random < goodEventChance) {
            const events = workEvents.positive.filter(event => Math.random() < event.rarity);
            return events[Math.floor(Math.random() * events.length)] || workEvents.neutral[0];
        } else if (random < goodEventChance + badEventChance) {
            const events = workEvents.negative.filter(event => Math.random() < event.rarity);
            return events[Math.floor(Math.random() * events.length)] || workEvents.neutral[0];
        } else {
            return workEvents.neutral[Math.floor(Math.random() * workEvents.neutral.length)];
        }
    },

    checkWorkAchievements(stats, job) {
        const achievements = [];
        
        if (stats.jobsDone === 1) achievements.push('🏆 First Day at Work');
        if (stats.jobsDone === 10) achievements.push('💼 Dedicated Worker');
        if (stats.jobsDone === 50) achievements.push('🎯 Career Professional');
        if (stats.jobsDone === 100) achievements.push('👑 Master Employee');
        
        const jobCount = stats[`${job.id}Jobs`] || 0;
        if (jobCount === 5) achievements.push(`🏅 ${job.name} Specialist`);
        if (jobCount === 20) achievements.push(`⭐ Master ${job.name}`);
        
        if (stats.totalEarned >= 50000) achievements.push('💰 Wealthy Worker');
        if (stats.workTime >= 100) achievements.push('⏰ Time Investment');
        
        return achievements;
    },

    getCareerLevel(userData) {
        const jobsDone = userData.statistics?.jobsDone || 0;
        if (jobsDone >= 100) return 'Expert';
        if (jobsDone >= 50) return 'Professional';
        if (jobsDone >= 20) return 'Experienced';
        if (jobsDone >= 10) return 'Competent';
        if (jobsDone >= 5) return 'Novice';
        return 'Beginner';
    },

    getWorkReputation(userData) {
        const totalEarned = userData.statistics?.totalEarned || 0;
        if (totalEarned >= 100000) return 'Legendary';
        if (totalEarned >= 50000) return 'Excellent';
        if (totalEarned >= 25000) return 'Very Good';
        if (totalEarned >= 10000) return 'Good';
        if (totalEarned >= 5000) return 'Fair';
        return 'New';
    },

    getJobReputation(userData, jobId) {
        const jobCount = userData.statistics?.[`${jobId}Jobs`] || 0;
        if (jobCount >= 20) return 'Master';
        if (jobCount >= 10) return 'Expert';
        if (jobCount >= 5) return 'Experienced';
        if (jobCount >= 1) return 'Novice';
        return 'New';
    }
};
