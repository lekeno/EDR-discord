const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Dump some internal stats (server-side)"),
  async execute(interaction) {
    if (!interaction.client.edrbot.preflight(interaction)) {
      await interaction.reply("Nope.");
      return;
    }
    
    if (interaction.user.id != process.env.OWNER_UID) {
      await interaction.reply("Nope.");
      return;
    }

    if (interaction.channelId != process.env.ADMIN_CHANNEL_ID) {
      await interaction.reply("Nope.");
      return;
    }
    
    if (interaction.guildId != process.env.ADMIN_GUILD_ID) {
      await interaction.reply("Nope.");
      return;
    }

    await interaction.client.edrbot.stats();
  }
};