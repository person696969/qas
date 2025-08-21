
const config = require('../config');

class RobustErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 10;
        this.errorLog = [];
    }

    async handleCommandError(error, interaction, commandName) {
        this.errorCount++;
        const errorInfo = {
            timestamp: new Date().toISOString(),
            command: commandName,
            error: error.message,
            stack: error.stack,
            userId: interaction.user?.id,
            guildId: interaction.guild?.id
        };
        
        this.errorLog.push(errorInfo);
        console.error(`❌ [${commandName}] Error:`, error);

        // Enhanced error response for treasure hunting theme
        const errorMessages = {
            database: '🗄️ **Treasure Vault Error**\nOur treasure database is experiencing issues. Please try again in a moment!',
            permission: '🚫 **Access Denied**\nYou need proper permissions to access this treasure hunting feature!',
            cooldown: '⏰ **Adventure Cooldown**\nYou need to rest before your next treasure hunting expedition!',
            validation: '📝 **Invalid Input**\nPlease check your treasure hunting command parameters and try again!',
            network: '🌐 **Connection Lost**\nLost connection to the treasure hunting servers. Retrying...',
            generic: '⚠️ **Treasure Hunt Error**\nSomething went wrong during your adventure. Our treasure masters have been notified!'
        };

        let errorMessage = errorMessages.generic;
        
        if (error.message.includes('database') || error.message.includes('sqlite')) {
            errorMessage = errorMessages.database;
        } else if (error.message.includes('permission')) {
            errorMessage = errorMessages.permission;
        } else if (error.message.includes('cooldown')) {
            errorMessage = errorMessages.cooldown;
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
            errorMessage = errorMessages.validation;
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            errorMessage = errorMessages.network;
        }

        try {
            const embed = {
                color: parseInt(config.colors.error.replace('#', ''), 16),
                title: '🚨 Adventure Interrupted',
                description: errorMessage,
                fields: [
                    {
                        name: '🎯 Command',
                        value: `\`/${commandName}\``,
                        inline: true
                    },
                    {
                        name: '🕐 Time',
                        value: new Date().toLocaleTimeString(),
                        inline: true
                    },
                    {
                        name: '💡 Suggestion',
                        value: 'Try using `/help` for command assistance or `/status` to check bot health.',
                        inline: false
                    }
                ],
                footer: {
                    text: 'Treasure Hunt Bot Error Handler',
                    icon_url: interaction.client?.user?.displayAvatarURL()
                },
                timestamp: new Date().toISOString()
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (replyError) {
            console.error('❌ Failed to send error response:', replyError);
        }

        // Auto-restart if too many errors
        if (this.errorCount >= this.maxErrors && config.errorHandling?.enableAutoRestart) {
            console.error(`🚨 Too many errors (${this.errorCount}). Initiating restart...`);
            this.initiateRestart();
        }
    }

    async handleInteractionError(error, interaction) {
        console.error('❌ Interaction Error:', error);
        
        const errorEmbed = {
            color: parseInt(config.colors.error.replace('#', ''), 16),
            title: '🔧 Interaction Error',
            description: '**Something went wrong with your treasure hunting interaction!**\n\n' +
                        'This might be a temporary issue. Please try again in a moment.',
            fields: [
                {
                    name: '🎯 What happened?',
                    value: 'The bot encountered an unexpected error while processing your interaction.',
                    inline: false
                },
                {
                    name: '💡 What can you do?',
                    value: '• Wait a moment and try again\n• Use `/help` for command assistance\n• Contact an administrator if the issue persists',
                    inline: false
                }
            ],
            footer: {
                text: 'Treasure Hunt Bot • Error ID: ' + Date.now().toString(36),
                icon_url: interaction.client?.user?.displayAvatarURL()
            },
            timestamp: new Date().toISOString()
        };

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (replyError) {
            console.error('❌ Failed to send interaction error response:', replyError);
        }
    }

    getErrorStats() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorLog.slice(-5),
            errorRate: this.errorCount / (Date.now() - this.startTime || 1) * 1000 * 60, // errors per minute
            isHealthy: this.errorCount < this.maxErrors
        };
    }

    initiateRestart() {
        console.log('🔄 Initiating bot restart due to excessive errors...');
        setTimeout(() => {
            process.exit(1); // Exit with error code to trigger restart
        }, 5000);
    }

    reset() {
        this.errorCount = 0;
        this.errorLog = [];
        console.log('✅ Error handler reset - Clean slate!');
    }
}

module.exports = new RobustErrorHandler();
