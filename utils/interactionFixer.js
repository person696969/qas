
const { EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.js');

/**
 * Universal Interaction Fixer
 * Handles all interaction types with comprehensive error recovery
 */
class InteractionFixer {
    constructor() {
        this.activeInteractions = new Map();
        this.handlerCache = new Map();
    }

    /**
     * Fix any interaction with universal error handling
     * @param {Object} interaction - Discord interaction
     * @param {Function} handler - Handler function
     */
    async fixInteraction(interaction, handler) {
        if (!interaction || !handler) {
            console.error('InteractionFixer: Missing interaction or handler');
            return false;
        }

        const interactionId = interaction.id;
        const startTime = Date.now();

        try {
            // Track active interaction
            this.activeInteractions.set(interactionId, {
                type: this.getInteractionType(interaction),
                userId: interaction.user?.id,
                startTime
            });

            // Validate interaction
            const validation = this.validateInteraction(interaction);
            if (!validation.valid) {
                await this.sendErrorResponse(interaction, 'Validation Error', validation.errors.join('\n'));
                return false;
            }

            // Execute handler with timeout
            const result = await Promise.race([
                handler(interaction),
                this.createTimeout(15000) // 15 second timeout
            ]);

            return result !== 'TIMEOUT';

        } catch (error) {
            console.error(`InteractionFixer error for ${interactionId}:`, error);
            await this.handleInteractionError(interaction, error);
            return false;
        } finally {
            // Cleanup
            this.activeInteractions.delete(interactionId);
        }
    }

    /**
     * Get interaction type string
     * @param {Object} interaction - Discord interaction
     * @returns {String} - Interaction type
     */
    getInteractionType(interaction) {
        if (interaction.isChatInputCommand?.()) return 'slash';
        if (interaction.isButton?.()) return 'button';
        if (interaction.isStringSelectMenu?.()) return 'selectMenu';
        if (interaction.isModalSubmit?.()) return 'modal';
        if (interaction.isAutocomplete?.()) return 'autocomplete';
        return 'unknown';
    }

    /**
     * Validate interaction with comprehensive checks
     * @param {Object} interaction - Discord interaction
     * @returns {Object} - Validation result
     */
    validateInteraction(interaction) {
        const result = {
            valid: true,
            errors: []
        };

        if (!interaction.user?.id) {
            result.valid = false;
            result.errors.push('Missing user ID');
        }

        if (!interaction.isRepliable?.()) {
            result.valid = false;
            result.errors.push('Interaction not repliable');
        }

        // Check if interaction is expired
        const age = Date.now() - (interaction.createdTimestamp || Date.now());
        if (age > 15 * 60 * 1000) { // 15 minutes
            result.valid = false;
            result.errors.push('Interaction expired');
        }

        return result;
    }

    /**
     * Safe reply with multiple fallback methods
     * @param {Object} interaction - Discord interaction
     * @param {Object} options - Reply options
     * @param {Boolean} ephemeral - Whether reply should be ephemeral
     */
    async safeReply(interaction, options, ephemeral = true) {
        if (!interaction || !options) {
            console.error('SafeReply: Missing interaction or options');
            return false;
        }

        try {
            // Prepare options with proper flags
            const replyOptions = { ...options };
            if (ephemeral && !replyOptions.flags) {
                replyOptions.flags = MessageFlags.Ephemeral;
            }
            delete replyOptions.ephemeral; // Remove deprecated property

            // Determine reply method
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(replyOptions);
            } else if (interaction.deferred && !interaction.replied) {
                delete replyOptions.flags; // Can't use flags in editReply
                await interaction.editReply(replyOptions);
            } else {
                replyOptions.flags = MessageFlags.Ephemeral;
                await interaction.followUp(replyOptions);
            }

            return true;

        } catch (error) {
            console.error('SafeReply error:', error);
            return await this.fallbackReply(interaction, options);
        }
    }

    /**
     * Fallback reply method using channel
     * @param {Object} interaction - Discord interaction
     * @param {Object} options - Reply options
     */
    async fallbackReply(interaction, options) {
        try {
            if (!interaction.channel) {
                console.error('No channel available for fallback reply');
                return false;
            }

            const channelOptions = { ...options };
            delete channelOptions.flags;
            delete channelOptions.ephemeral;

            await interaction.channel.send(channelOptions);
            return true;

        } catch (error) {
            console.error('Fallback reply failed:', error);
            return false;
        }
    }

    /**
     * Handle interaction errors with comprehensive response
     * @param {Object} interaction - Discord interaction
     * @param {Error} error - Error object
     */
    async handleInteractionError(interaction, error) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config?.embedColors?.error || '#FF0000')
            .setTitle('⚠️ Interaction Error')
            .setDescription('An error occurred while processing your interaction.')
            .addFields([
                { name: 'Error Type', value: error?.name || 'Unknown', inline: true },
                { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
            ])
            .setFooter({ text: 'Please try again. If this persists, contact support.' });

        await this.safeReply(interaction, { embeds: [errorEmbed] }, true);
    }

    /**
     * Send error response with proper formatting
     * @param {Object} interaction - Discord interaction
     * @param {String} title - Error title
     * @param {String} description - Error description
     */
    async sendErrorResponse(interaction, title, description) {
        const embed = new EmbedBuilder()
            .setColor(config?.embedColors?.error || '#FF0000')
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setTimestamp();

        await this.safeReply(interaction, { embeds: [embed] }, true);
    }

    /**
     * Create timeout promise
     * @param {Number} ms - Timeout in milliseconds
     */
    createTimeout(ms) {
        return new Promise(resolve => {
            setTimeout(() => resolve('TIMEOUT'), ms);
        });
    }

    /**
     * Get active interaction count
     */
    getActiveCount() {
        return this.activeInteractions.size;
    }

    /**
     * Clean up expired interactions
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 15 * 60 * 1000; // 15 minutes

        for (const [id, data] of this.activeInteractions.entries()) {
            if (now - data.startTime > maxAge) {
                this.activeInteractions.delete(id);
            }
        }
    }
}

// Create singleton instance
const interactionFixer = new InteractionFixer();

// Auto cleanup every 5 minutes
setInterval(() => interactionFixer.cleanup(), 5 * 60 * 1000);

module.exports = {
    InteractionFixer,
    interactionFixer,
    
    // Convenience methods
    async fixInteraction(interaction, handler) {
        return await interactionFixer.fixInteraction(interaction, handler);
    },
    
    async safeReply(interaction, options, ephemeral = true) {
        return await interactionFixer.safeReply(interaction, options, ephemeral);
    },
    
    async handleError(interaction, error) {
        return await interactionFixer.handleInteractionError(interaction, error);
    }
};
