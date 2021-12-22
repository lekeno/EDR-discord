const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("access")
    .setDescription("Give or remove access to advanced features.")
    .addStringOption(option =>
      option
        .setName("action")
        .setDescription("The action to take")
        .setRequired(true)
        .addChoice("block", "block")
        .addChoice("allow", "allow")
    )
    .addStringOption(option =>
      option
        .setName("entity")
        .setDescription("What to take action on")
        .setRequired(true)
        .addChoice("user", "user")
        .addChoice("guild", "guild")
    )
    .addStringOption(option =>
      option
        .setName("id")
        .setDescription("Guild / User id")
        .setRequired(true)
    ),
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

    let action = interaction.options.getString("action");
    let entity = interaction.options.getString("entity");
    let id = interaction.options.getString("id");

    if (entity === "user") {
      await interaction.client.edrbot.aclUser(action, id, interaction);
    } else if (entity === "guild") {
      await interaction.client.edrbot.aclGuild(action, id, interaction);
    }
  }
};
