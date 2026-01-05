# BlindBond Chat Bot

An anonymous matchmaking and chat bot for Discord, running on Node.js and SQLite.

## Environment Variables

To run this bot, you must set up the following environment variables.

**Replit Users:**
Do NOT use a `.env` file. Instead, use the **Replit Secrets** tool (look for the "Lock" icon in the sidebar).

| Variable Name | Description |
| :--- | :--- |
| `DISCORD_TOKEN` | Your Discord Bot Token (from Developer Portal). |
| `CLIENT_ID` | Your Application/Client ID (from Developer Portal). |

## Running the Bot

1.  Set the Secrets as described above.
2.  Run the bot:
    ```bash
    npm install
    npm start
    ```
