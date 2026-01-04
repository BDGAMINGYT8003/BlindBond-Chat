const { v4: uuidv4 } = require('uuid');
const { EmbedBuilder } = require('discord.js');

function generateAnonId() {
    return uuidv4();
}

function createEmbed(title, description, color = 0x0099FF) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

// Colors
const COLORS = {
    INFO: 0x3498DB,
    SUCCESS: 0x2ECC71,
    ERROR: 0xE74C3C,
    WARNING: 0xF1C40F,
    MATCH: 0x9B59B6
};

module.exports = {
    generateAnonId,
    createEmbed,
    COLORS
};
