const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("who")
    .setDescription("Show a commander's profile.")
    .addStringOption(option =>
      option
        .setName("cmdr")
        .setDescription("The name of the cmdr to lookup (exact match).")
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.client.edrbot.preflight(interaction)) {
      await interaction.reply("Nope.");
      return;
    }

    let cmdr = interaction.options.getString("cmdr");
    let uid = interaction.member ? interaction.member.id : 0;
    let attachmentAllowed = true; // granted via slash commands
    await interaction.client.edrbot.who(
      cmdr,
      interaction,
      uid,
      attachmentAllowed
    );
  }
};