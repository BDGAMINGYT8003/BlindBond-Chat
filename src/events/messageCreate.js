const { Events, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages and non-DM messages
        if (message.author.bot || message.channel.type !== ChannelType.DM) return;

        // If message starts with /, it's a command (handled by interactionCreate usually, but legacy commands or typing errors might leak)
        // We will just ignore it if it looks like a command to prevent leakage, but let interaction handlers deal with actual commands if they were chat input commands.
        // However, standard slash commands are interactions, not messages.
        // If the user types a message starting with /, we should block it to be safe as per requirements.
        if (message.content.startsWith('/')) {
            return message.reply({ content: "Commands must be used via the slash command menu. Messages starting with '/' are blocked for safety.", ephemeral: true });
        }

        const userId = message.author.id;

        // Check for active session
        const session = await db.get(
            "SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1",
            [userId, userId]
        );

        if (!session) {
            // No active session.
            // We could reply with help or just ignore.
            // Usually good to reply if they seem confused.
            // But let's avoid spamming them if they just say "hi" to the bot.
            return;
        }

        // Determine Partner
        const isUserA = session.user_a_id === userId;
        const partnerId = isUserA ? session.user_b_id : session.user_a_id;
        const senderAnonId = isUserA ? session.user_a_anon_id : session.user_b_anon_id;

        // Check if user is banned (safety check)
        const userStatus = await db.get("SELECT is_banned FROM users WHERE discord_id = ?", [userId]);
        if (userStatus && userStatus.is_banned) {
            return message.reply("You are banned and cannot send messages.");
        }

        // Content Filter
        const filteredContent = await filterContent(message, userId);
        if (filteredContent === null) {
            // Message blocked and warning handled inside filterContent
            return;
        }

        // Construct Embed
        const embed = createEmbed("Anonymous User", filteredContent, COLORS.INFO);

        // Attachments
        const files = [];
        let hasMedia = false;
        if (message.attachments.size > 0) {
            hasMedia = true;
            // Map attachments to proper objects (name + url)
            // Discord.js 'files' option can take attachment objects directly or URL.
            // Requirement: "download and re-upload" implies not just passing URL.
            // However, passing the attachment object usually re-uploads it if passed as a file stream or buffer.
            // Using `attachment.url` sends a link. Using `{ attachment: url, name: name }` tells DJS to upload.
            message.attachments.forEach(attachment => {
                files.push({ attachment: attachment.url, name: `anon_${attachment.name}` });
            });
        }

        // Stickers
        if (message.stickers.size > 0) {
            const stickerNames = message.stickers.map(s => `[Sticker: ${s.name}]`).join(' ');
            embed.setDescription(`${filteredContent}\n\n${stickerNames}`);
        }

        if (hasMedia) {
             embed.setFooter({ text: "Media attached" });
        }

        try {
            const partner = await message.client.users.fetch(partnerId);
            await partner.send({ embeds: [embed], files: files });

            // Confirmation
            await message.react('✅');

            // Update Last Activity
            await db.run("UPDATE sessions SET last_activity = ? WHERE session_id = ?", [Date.now(), session.session_id]);

        } catch (err) {
            console.error("Failed to relay message", err);
            // Don't reply if the bot itself is blocked or error is trivial
            try { await message.reply("Failed to deliver message. The partner may have closed their DMs."); } catch(e) {}
        }
    },
};

async function filterContent(message, userId) {
    const content = message.content;
    // Simple filter
    const badWords = ['sh*t', 'poop'];
    const severeWords = ['hate', 'kill'];

    // Check severe
    for (const word of severeWords) {
        if (content.toLowerCase().includes(word)) {
            // Strike System
            await handleStrike(userId, message);
            return null;
        }
    }

    // Replace soft bad words
    let filtered = content;
    for (const word of badWords) {
        const regex = new RegExp(word.replace('*', '\\*'), "gi");
        filtered = filtered.replace(regex, "****");
    }

    return filtered;
}

async function handleStrike(userId, message) {
    const user = await db.get("SELECT warnings FROM users WHERE discord_id = ?", [userId]);
    let warnings = user.warnings + 1;

    await db.run("UPDATE users SET warnings = ? WHERE discord_id = ?", [warnings, userId]);

    let msg = "Your message was blocked due to severe inappropriate content.";

    if (warnings === 1) {
        msg += "\n**Warning 1/3:** Please follow the rules.";
    } else if (warnings === 2) {
        msg += "\n**Warning 2/3:** Next violation will result in a permanent ban. You are temporarily banned for 24 hours.";
        const banExp = Date.now() + (24 * 60 * 60 * 1000);
        await db.run("UPDATE users SET is_banned = 1, ban_expiration = ? WHERE discord_id = ?", [banExp, userId]);
        // Ideally we should end current chat too
        // Check active session
        const session = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1", [userId, userId]);
        if (session) {
             await db.run("UPDATE sessions SET is_active = 0 WHERE session_id = ?", [session.session_id]);
             // Notify partner
             const partnerId = session.user_a_id === userId ? session.user_b_id : session.user_a_id;
             try {
                const partner = await message.client.users.fetch(partnerId);
                await partner.send({ embeds: [createEmbed("Chat Ended", "Your partner was banned for safety violations.", COLORS.ERROR)] });
             } catch (e) {}
        }
    } else if (warnings >= 3) {
        msg += "\n**Warning 3/3:** You have been permanently banned.";
        await db.run("UPDATE users SET is_banned = 1, ban_expiration = NULL WHERE discord_id = ?", [userId]); // NULL = Perm

         const session = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1", [userId, userId]);
        if (session) {
             await db.run("UPDATE sessions SET is_active = 0 WHERE session_id = ?", [session.session_id]);
             // Notify partner
             const partnerId = session.user_a_id === userId ? session.user_b_id : session.user_a_id;
             try {
                const partner = await message.client.users.fetch(partnerId);
                await partner.send({ embeds: [createEmbed("Chat Ended", "Your partner was banned for safety violations.", COLORS.ERROR)] });
             } catch (e) {}
        }
    }

    await message.reply({ content: msg, ephemeral: true });
}
