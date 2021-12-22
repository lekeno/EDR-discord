const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("distance")
    .setDescription(
      "Distance between Sol and another star system, or between two star systems."
    )
    .addStringOption(option =>
      option
        .setName("system")
        .setDescription("The star system of interest.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("ref")
        .setDescription("The star system of reference (default: Sol).")
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.client.edrbot.preflight(interaction)) {
      await interaction.reply("Nope.");
      return;
    }

    let sys1 = interaction.options.getString("system");
    let sys2 = interaction.options.getString("ref") || "Sol";
    await interaction.client.edrbot.distance(sys1, sys2, interaction);
  }
};
