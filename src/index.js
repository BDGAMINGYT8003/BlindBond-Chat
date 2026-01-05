require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { startTasks } = require('./utils/backgroundTasks');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
// Ensure commands directory exists
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Global Error Handler
process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

async function deployCommands() {
    if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
        console.log("Skipping command deployment: Missing DISCORD_TOKEN or CLIENT_ID.");
        return;
    }

    const commands = [];
    client.commands.forEach(command => {
        commands.push(command.data.toJSON());
    });

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
}

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    await deployCommands();
    startTasks(client);
});

// If we are in a test environment or don't have a token, we might not want to login immediately
if (process.env.DISCORD_TOKEN) {
    client.login(process.env.DISCORD_TOKEN);
} else {
    console.log("No DISCORD_TOKEN found in .env, skipping login (for testing purposes).");
}

module.exports = client;
