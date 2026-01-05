const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function generateAnonId() {
    return uuidv4();
}

function isValidUUID(id) {
    return uuidValidate(id);
}

// Colors
const COLORS = {
    INFO: 0x3498DB,      // Blue
    SUCCESS: 0x2ECC71,   // Green
    ERROR: 0xE74C3C,     // Red
    WARNING: 0xF1C40F,   // Yellow
    MATCH: 0x9B59B6,     // Purple
    DARK: 0x2C3E50       // Dark
};

// Icons for standardizing headers
const ICONS = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    MATCH: '🎉',
    BLOCK: '🛡️',
    SEARCH: '🔍'
};

/**
 * Creates a standardized Embed
 * @param {string} title
 * @param {string} description
 * @param {number} color
 * @param {string} [footer]
 * @returns {EmbedBuilder}
 */
function createEmbed(title, description, color = COLORS.INFO, footer = null) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    if (footer) {
        embed.setFooter({ text: footer });
    } else {
        embed.setFooter({ text: 'BlindBond • Anonymous Chat' });
    }

    return embed;
}

function createErrorEmbed(description) {
    return createEmbed(`${ICONS.ERROR} Error`, description, COLORS.ERROR);
}

function createSuccessEmbed(title, description) {
    return createEmbed(`${ICONS.SUCCESS} ${title}`, description, COLORS.SUCCESS);
}

function createInfoEmbed(title, description) {
    return createEmbed(`${ICONS.INFO} ${title}`, description, COLORS.INFO);
}

module.exports = {
    generateAnonId,
    isValidUUID,
    createEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createInfoEmbed,
    COLORS,
    ICONS
};
