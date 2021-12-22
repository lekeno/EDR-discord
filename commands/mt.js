const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mt")
    .setDescription("Find material traders near a given star system.")
    .addStringOption(option =>
      option
        .setName("system")
        .setDescription("The star system of interest.")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("sc")
        .setDescription("The maximal supercruise distance (default: 1500).")
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.client.edrbot.preflight(interaction)) {
      await interaction.reply("Nope.");
      return;
    }

    let system = interaction.options.getString("system");
    let scDistance = interaction.options.getInteger("sc") || 1500;

    await interaction.client.edrbot.searchMT(system, scDistance, interaction);
  }
};
