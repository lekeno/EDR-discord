"use strict";
const acl = require("./acl");
const inara = require("./inara");
const LRU = require("lru-cache");
const profile = require("./edrprofile");
const galaxy = require("./galaxy");
const systems = require("./systems");
const caching = require("./caching");
const utils = require("./utils");
const request = require("request-promise");
const discord = require("discord.js");
const jokes = require("./jokes");
const statioport = require("./station");
const edsmurls = require("./edsmurls");
const audit = require("./audit");
const throttler = require("./throttler");

module.exports = class EDRBot {
  constructor(guilds) {
    this.born = Date.now();
    this.cacheHitRate = { total: 0, hits: 0 };
    this.throttle = new throttler();

    this.cache = new LRU({
      max: parseInt(process.env.CACHE_MAX_ITEMS),
      maxAge: parseInt(process.env.CACHE_MAX_AGE)
    });
    try {
      caching.read(process.env.CMDRS_CACHE, this.cache);
    } catch (error) {
      console.error(error);
    }

    this.galaxy = new galaxy();
    this.systems = new systems();

    this.servedDiscords = {};

    if (!guilds) return;

    for (var [key, guild] of guilds.cache) {
      if (!checkGuild(guild)) continue;
      if (!guild || !guild.name) continue;
      this.servedDiscords[guild.name] = {
        msgs: 0,
        cmds: 0,
        ignored: 0,
        id: guild.id,
        ownerID: guild.ownerId
      };
    }
  }

  init(guilds) {
    this.born = Date.now();
    this.cacheHitRate = { total: 0, hits: 0 };

    this.servedDiscords = {};

    if (!guilds) return;

    if (!guilds.cache) return;
    for (var [key, guild] of guilds.cache) {
      console.log(guild.name);
      if (!checkGuild(guild)) continue;
      if (!guild || !guild.name) continue;
      this.servedDiscords[guild.name] = {
        msgs: 0,
        cmds: 0,
        ignored: 0,
        id: guild.id,
        ownerID: guild.ownerId
      };
      if (!acl.authorizedGuild(guild.id)) {
        audit.newguild(guild);
      }
    }
  }

  join(guild) {
    if (!checkGuild(guild)) return;
    if (!guild || !guild.name) return;

    if (acl.blockedGuild(guild.id)) {
      // Leaving blocked guilds
      console.log(`Blocked guild: {$guild.id}`);
      guild
        .leave()
        .then(g => console.log(`Left the guild ${g}`))
        .catch(console.error);
      return;
    }

    this.servedDiscords[guild.name] = {
      msgs: 0,
      cmds: 0,
      ignored: 0,
      id: guild.id,
      ownerID: guild.ownerID
    };

    if (!acl.authorizedGuild(guild.id)) {
      audit.newguild(guild);
      return;
    }
  }

  async who(cmdrname, interaction, uid, attachmentAllowed) {
    if (!acl.authorizedGuild(interaction.guildid)) {
      audit.newguild(interaction.guild);
      await interaction.reply(
        "Thanks for your interest in EDR. You should get access to all the features shortly, i.e. up to a week or so. Ping @LeKeno#8484 if needed."
      );
      return;
    }
    await interaction.deferReply();

    if (utils.unexpectedCmdrName(cmdrname)) {
      interaction.editReply(":brown_square: :snake: invalid cmdr name?");
      return;
    }

    let cached = this.cache.get(cmdrname);
    this.cacheHitRate["total"] += 1;
    if (cached && uid != process.env.OWNER_UID) {
      let delta = Date.now() - cached["timestamp"];
      if (delta < 1000 * 60 * 60 * 24) {
        this.cacheHitRate["hits"] += 1;
        await profile.handleEDRResponse(
          cached["response"],
          cached["date"],
          interaction,
          attachmentAllowed
        );
        return;
      }
    }

    var options = {
      url: process.env.EDR_PROFILE_ENDPOINT + encodeURIComponent(cmdrname),
      method: "GET",
      json: true,
      resolveWithFullResponse: true,
      headers: {
        Authorization: `${process.env.AUTH_PREFIX} ${process.env.EDR_API_KEY}`
      },
      simple: false
    };

    let response = await request(options);
    if (response.statusCode == 404) {
      if (this.throttle.shouldHoldOff()) {
        await interaction.editReply("Comms jammed.\nPlease retry in a while.");
        return;
      } else {
        response = await inara.lookup(cmdrname);
        if (response["statusCode"] == 400 || response["statusCode"] == 408) {
          this.throttle.backoff();
          await interaction.editReply(
            "Comms jammed.\nPlease retry in a few minutes."
          );
          return;
        } else {
          this.throttle.clear();
        }
      }
    }

    let dated = new Date();
    if (
      await profile.handleEDRResponse(
        response,
        dated,
        interaction,
        attachmentAllowed
      )
    ) {
      this.cache.set(cmdrname, {
        date: dated,
        response: response,
        timestamp: Date.now()
      });
      caching.write(process.env.CMDRS_CACHE, this.cache);
    }
  }

  async searchMT(poi, scDistance, interaction) {
    if (utils.unexpectedSystemName(poi)) {
      await interaction.reply(":green_square: :snake: aka that went wrong.");
      return;
    }

    if (utils.unexpectedSCDistance(scDistance)) {
      await interaction.reply(
        ":yellow_square: :snake: aka something else went wrong."
      );
      return;
    }

    if (jokes.gotOne(poi, "mt")) {
      await interaction.reply(jokes.randomIfAny(poi, "mt"));
      return;
    }
    let radius = 40;
    await interaction.deferReply();
    let traders = await this.galaxy.materialTraders(poi, radius, scDistance);

    if (!traders) {
      await interaction.editReply(
        ":orange_square::snake: aka something went wrong :("
      );
      return;
    }

    const embed = new discord.MessageEmbed();
    embed.setColor("#777777");
    embed.setTimestamp(new Date());
    embed.setFooter("Info provided by ED Recon", process.env.EDR_ICON);

    embed.setTitle(`Material traders nearby ${utils.sanitize(poi)}`);
    embed.setAuthor(
      "EDR",
      "https://lekeno.github.io/favicon-16x16.png",
      "https://edrecon.com"
    );
    let description = "";
    // TODO this is a mess... (almost everything is identical, very inefficient/inelegant approach here)
    if (traders["raw"]) {
      let trader = traders["raw"];
      if (trader["distance"] > 0) {
        description += `Raw materials: ${edsmurls.system(
          trader["id"],
          trader["name"]
        )}, ${utils.prettyDistance(
          trader["distance"]
        )} LY\n - ${edsmurls.station(
          trader["id"],
          trader["name"],
          trader["station"]["id"],
          trader["station"]["name"]
        )}\n - ${utils.sanitize(trader["station"]["type"])}\n - ${Math.round(
          trader["station"]["distanceToArrival"]
        )} ls.\n\n`;
      } else {
        description += `Raw materials: ${edsmurls.system(
          trader["id"],
          trader["name"]
        )}\n - ${edsmurls.station(
          trader["id"],
          trader["name"],
          trader["station"]["id"],
          trader["station"]["name"]
        )}\n - ${utils.sanitize(trader["station"]["type"])}\n - ${Math.round(
          trader["station"]["distanceToArrival"]
        )} ls.\n\n`;
      }
    }

    if (traders["manufactured"]) {
      let trader = traders["manufactured"];
      if (trader["distance"] > 0) {
        description += `Manufactured materials: ${edsmurls.system(
          trader["id"],
          trader["name"]
        )}, ${utils.prettyDistance(
          trader["distance"]
        )} LY\n - ${edsmurls.station(
          trader["id"],
          trader["name"],
          trader["station"]["id"],
          trader["station"]["name"]
        )}\n - ${utils.sanitize(trader["station"]["type"])}\n - ${Math.round(
          trader["station"]["distanceToArrival"]
        )} ls.\n\n`;
      } else {
        description += `Manufactured materials: ${edsmurls.system(
          trader["id"],
          trader["name"]
        )}\n - ${edsmurls.station(
          trader["id"],
          trader["name"],
          trader["station"]["id"],
          trader["station"]["name"]
        )}\n - ${utils.sanitize(trader["station"]["type"])}\n - ${Math.round(
          trader["station"]["distanceToArrival"]
        )} ls.\n\n`;
      }
    }

    if (traders["encoded"]) {
      let trader = traders["encoded"];
      if (trader["distance"] > 0) {
        description += `Encoded data: ${edsmurls.system(
          trader["id"],
          trader["name"]
        )}, ${utils.prettyDistance(
          trader["distance"]
        )} LY\n - ${edsmurls.station(
          trader["id"],
          trader["name"],
          trader["station"]["id"],
          trader["station"]["name"]
        )}\n - ${utils.sanitize(trader["station"]["type"])}\n - ${Math.round(
          trader["station"]["distanceToArrival"]
        )} ls.\n\n`;
      } else {
        description += `Encoded data: ${edsmurls.system(
          trader["id"],
          trader["name"]
        )}\n - ${edsmurls.station(
          trader["id"],
          trader["name"],
          trader["station"]["id"],
          trader["station"]["name"]
        )}\n - ${utils.sanitize(trader["station"]["type"])}\n - ${Math.round(
          trader["station"]["distanceToArrival"]
        )} ls.\n\n`;
      }
    }

    if (description != "") {
      embed.setDescription(description);
      embed.addField("\u200b", "\u200b");
      embed.addField(
        "*Caveats*",
        "Permit locked systems are ignored.\n\nMaterial traders are unavailable at stations which are:\n - damaged\n - being repaired\n - under lockdown\n - controlled by a criminal faction"
      );
    } else {
      embed.setDescription(
        `No material trading within a radius of ${radius} LY`
      );
    }

    embed.addField("\u200b", "\u200b");
    embed.addField(
      "**Support EDR & Inara**",
      ` - Lavian Brandy for EDR: via [Patreon](${process.env.EDR_PATREON_URL}) or [Paypal](${process.env.EDR_PAYPAL_URL})\n - Azure Milk for Inara: via [Paypal](${process.env.INARA_DONATION_URL})\n\n`,
      false
    );
    embed.addField(
      "**EDR Services**",
      ` - [Join](${process.env.EDR_DISCORD_JOIN_URL}) EDR's official [community](${process.env.EDR_DISCORD_URL}) discord server.\n - Install [EDR](${process.env.EDR_PLUGIN_URL}) to get in-game insights and send intel.\n - [Invite](${process.env.EDR_DISCORD_INVITE_BOT_URL}) this [bot](${process.env.EDR_DISCORD_BOT_URL}) to your own discord server.`,
      false
    );

    await interaction.editReply({
      content: `Material trading within ${radius} LY of ${utils.sanitize(
        poi
      )} (aiming for supercruise ≤ ${scDistance} LS)`,
      embeds: [embed]
    });
  }

  async searchIF(poi, scDistance, interaction) {
    if (utils.unexpectedSystemName(poi)) {
      await interaction.reply(":green_square: :snake: aka that went wrong.");
      return;
    }

    if (utils.unexpectedSCDistance(scDistance)) {
      await interaction.reply(
        ":yellow_square: :snake: aka something else went wrong."
      );
      return;
    }

    if (jokes.gotOne(poi, "mt")) {
      await interaction.reply(jokes.randomIfAny(poi, "mt"));
      return;
    }

    let radius = 40;
    await interaction.deferReply();
    let ifactors = await this.galaxy.interstellarFactors(
      poi,
      radius,
      scDistance
    );
    if (!ifactors) {
      await interaction.editReply(
        ":orange_square::snake: aka something went wrong :("
      );
      return;
    }

    const embed = new discord.MessageEmbed();
    embed.setColor("#777777");
    embed.setTimestamp(new Date());
    embed.setFooter("Info provided by ED Recon", process.env.EDR_ICON);

    embed.setTitle(`Interstellar Factors nearby ${poi}`);
    embed.setAuthor("EDR", process.env.EDR_SMALL_ICON, process.env.EDR_URL);
    let description = "";
    if (ifactors["overall"] && ifactors["overall"]["distance"] > 0) {
      let overallIF = ifactors["overall"];
      description += `${edsmurls.system(
        overallIF["id"],
        overallIF["name"]
      )}, ${utils.prettyDistance(
        overallIF["distance"]
      )} LY\n - ${edsmurls.station(
        overallIF["id"],
        overallIF["name"],
        overallIF["station"]["id"],
        overallIF["station"]["name"]
      )}\n - ${overallIF["station"]["type"]}\n - ${Math.round(
        overallIF["station"]["distanceToArrival"]
      )} ls.\n\n`;
    } else {
      let overallIF = ifactors["overall"];
      description += `${edsmurls.system(
        overallIF["id"],
        overallIF["name"]
      )}\n - ${edsmurls.station(
        overallIF["id"],
        overallIF["name"],
        overallIF["station"]["id"],
        overallIF["station"]["name"]
      )}\n - ${overallIF["station"]["type"]}\n - ${Math.round(
        overallIF["station"]["distanceToArrival"]
      )} ls.\n\n`;
    }

    let sta = new statioport(ifactors["overall"]["station"]);
    if (
      (!ifactors["overall"] || !sta.hasLargeLandingPads()) &&
      (ifactors["withLargeLandingPads"] &&
        ifactors["withLargeLandingPads"]["station"])
    ) {
      if (ifactors["withLargeLandingPads"]["distance"] > 0) {
        let overallIF = ifactors["withLargeLandingPads"];
        description += `${edsmurls.system(
          overallIF["id"],
          overallIF["name"]
        )}, ${utils.prettyDistance(
          overallIF["distance"]
        )} LY\n - ${edsmurls.station(
          overallIF["id"],
          overallIF["name"],
          overallIF["station"]["id"],
          overallIF["station"]["name"]
        )}\n - ${overallIF["station"]["type"]}\n - ${Math.round(
          overallIF["station"]["distanceToArrival"]
        )} ls.\n\n`;
      } else {
        let overallIF = ifactors["withLargeLandingPads"];
        description += `${edsmurls.system(
          overallIF["id"],
          overallIF["name"]
        )}\n - ${edsmurls.station(
          overallIF["id"],
          overallIF["name"],
          overallIF["station"]["id"],
          overallIF["station"]["name"]
        )}\n - ${overallIF["station"]["type"]}\n - ${Math.round(
          overallIF["station"]["distanceToArrival"]
        )} ls.\n\n`;
      }
    }

    if (description != "") {
      embed.setDescription(description);
      embed.addField("\u200b", "\u200b");
    } else {
      embed.setDescription(
        `No interstellar factors within a radius of ${radius} LY`
      );
    }

    embed.addField("\u200b", "\u200b");
    embed.addField(
      "**Support EDR & EDSM**",
      `Install [EDR](${process.env.EDR_INSTALL}) to get the same info in-game and send intel.\n\nToken of appreciation\nLavian Brandy for EDR: via [Patreon](${process.env.EDR_PATREON_URL}) or [Paypal](${process.env.EDR_PAYPAL_URL})\n[Hutton mugs for EDSM](${process.env.EDSM_DONATION_URL})`
    );

    await interaction.editReply({
      content: `Interstellar Factors within ${radius} LY of ${utils.sanitize(
        poi
      )} (aiming for supercruise ≤ ${scDistance} LS)`,
      embeds: [embed]
    });
  }

  async aclUser(action, id, interaction) {
    let result = false;

    if (action === "allow") {
      result = true;
    } else if (action === "block") {
      result = acl.blockUser(id);
    }

    if (result) {
      await interaction.reply("Done!");
    } else {
      await interaction.reply("Nope!");
    }
  }

  async aclGuild(action, id, interaction) {
    let result = false;

    if (action === "allow") {
      result = acl.authorizeGuild(id);
    } else if (action === "block") {
      result = acl.blockGuild(id);
    }

    if (result) {
      await interaction.reply("Done!");
    } else {
      await interaction.reply("Nope!");
    }
  }

  async preflight(interaction) {
    if (!interaction.isCommand()) {
      console.log(`Not a command from ${interaction}`);
      return false;
    }

    if (!interaction.inGuild()) {
      console.log("Interaction without a guild");
      return false;
    }

    let guildid = interaction.guild.id;
    if (!guildid) {
      console.log("guild without a guildid");
      return false;
    }

    if (acl.blockedGuild(guildid)) {
      // Leaving blocked guilds
      interaction.guild
        .leave()
        .then(g => console.log(`Left the guild ${g}`))
        .catch(console.error);
      return false;
    }

    let guildname = interaction.guild ? interaction.guild.name : "N/A";
    if (guildname == "N/A") {
      console.log("message not from a guild");
      return false; // Not from a guild
    }
    let uid = interaction.user ? interaction.user.id : 0;

    if (this.servedDiscords[guildname]) {
      this.servedDiscords[guildname]["msgs"] += 1;
    } else {
      this.servedDiscords[guildname] = {
        msgs: 1,
        cmds: 0,
        ignored: 0,
        id: guildid
      };
    }

    if (interaction.user.bot) return false;

    let cmd = interaction.commandName;
    if (this.servedDiscords[guildname]) {
      this.servedDiscords[guildname]["cmds"] += 1;
    } else {
      this.servedDiscords[guildname] = {
        msgs: 1,
        cmds: 1,
        ignored: 0,
        id: guildid
      };
    }

    if (acl.blockedUser(uid)) {
      this.servedDiscords[guildname]["ignored"] += 1;
      return false; // ignore
    }

    if (jokes.isItAprilFoolDay() && utils.randomIntExcl(100) > 60) {
      if (jokes.gotOne("aprilfool", cmd)) {
        var joke = jokes.randomIfAny("aprilfool", cmd);
        console.log(`Sent joke: ${joke}`);
        await interaction.reply(joke);
        return false;
      }
    }
    return true;
  }

  async version(interaction) {
    let message = `EDR Discord Bot - version: ${process.env.VERSION}\n\
New feature(s): ${process.env.NEW_FEATURES}\n\n\
Setup guide: https://lekeno.github.io/How_to_setup_ED_Recon_-_Discord_bot_-_v2.0.pdf.`;

    await interaction.reply(message);
  }

  async help(interaction) {
    let message = `Contact @LeKeno#8484 if you have any questions, feedback or if you need troubleshooting help.\n\n\
Setup guide: https://lekeno.github.io/How_to_setup_ED_Recon_-_Discord_bot_-_v2.0.pdf.`;
    await interaction.reply(message);
  }

  async uptime(interaction) {
    let d100 = Math.random() * 100;
    if (d100 > 95) {
      await interaction.reply(":purple_circle::snake:");
    } else if (d100 >= 90) {
      await interaction.reply("Grinding since 3304!");
    } else {
      await interaction.reply(
        `Up and running since ${utils.compactTimelapse(this.born)}`
      );
    }
  }

  async stats(interaction) {
    let stats = `EDR Discord Bot - stats:\n# of servers: ${
      Object.keys(this.servedDiscords).length
    }\n`;

    if (this.cacheHitRate["total"] > 0) {
      stats += `Cache: ${this.cacheHitRate["hits"] /
        this.cacheHitRate["total"]} (#= ${this.cacheHitRate["total"]})\n`;
    }

    for (var server in this.servedDiscords) {
      let needsaudit = acl.authorizedGuild(this.servedDiscords[server]["id"])
        ? ""
        : "[AUDIT?]";
      stats += ` - ${server}: ${JSON.stringify(
        this.servedDiscords[server]
      )}${needsaudit}}\n`;
    }
    console.log(stats);
    await interaction.reply("Done.");
  }

  async distance(srcSys, dstSys, interaction) {
    let src = await this.galaxy.system(srcSys);
    if (src == false || src == undefined) {
      await interaction.reply(
        `System ${srcSys} is unknown to EDSM. Please check the spelling.`
      );
    }

    let dst = await this.galaxy.system(dstSys);
    if (dst == false || dst == undefined) {
      await interaction.reply(
        `System ${dstSys} is unknown to EDSM. Please check the spelling.`
      );
    }

    let distance = utils.distance(src["coords"], dst["coords"]);
    let prettyDist = utils.prettyDistance(distance);
    let urls = [
      `${process.env.EDSM_SYSTEM_PREFIX}${src["id"]}/name/${encodeURIComponent(
        src["name"]
      )}`,
      `${process.env.EDSM_SYSTEM_PREFIX}${dst["id"]}/name/${encodeURIComponent(
        dst["name"]
      )}`
    ];

    const embed = new discord.MessageEmbed();
    embed.setColor("#777777");
    embed.setTimestamp(new Date());
    embed.setFooter("Info provided by ED Recon", process.env.EDR_ICON);

    embed.setTitle(`System ${dst["name"]} on EDSM`);
    embed.setAuthor("EDSM", process.env.EDSM_ICON, process.env.EDSM_URL);
    embed.setURL(urls[1]);
    embed.setDescription(
      `${prettyDist} ly between ${src["name"]} and ${dst["name"]}`
    );

    embed.addField("\u200b", "\u200b");
    let transferTime = utils.transferTime(distance);
    let taxiTime = utils.taxiTime(distance);
    let snailTime = utils.snailTime(distance);
    let eta = `Transfer time: ≃${utils.prettyDuration(
      transferTime
    )}\nTaxi time (50 LY): ≃${utils.prettyDuration(
      taxiTime
    )}\nSnail time (15 LY): ≃${utils.prettyDuration(snailTime)}`;

    let sta = await this.systems.stations(dstSys);

    if (sta && sta.length > 0) {
      let closest = this.systems.closestStation(sta, null);
      if (
        closest["overall"] &&
        closest["withShipyard"] &&
        (closest["overall"]["name"] == closest["withShipyard"]["name"] ||
          closest["withShipyard"]["distanceToArrival"] <=
            closest["overall"]["distanceToArrival"])
      ) {
        closest = closest["overall"];
        let toStation = `Closest station with a shipyard: ${edsmurls.station(
          dst["id"],
          dst["name"],
          closest["id"],
          closest["name"]
        )}\n - ${utils.sanitize(closest["type"])}\n - ${Math.round(
          closest["distanceToArrival"]
        )} ls from entry point`;
        eta += "\n\n" + toStation;
      } else if (closest["overall"] && closest["withShipyard"]) {
        let toStation = `Closest station: ${edsmurls.station(
          dst["id"],
          dst["name"],
          closest["overall"]["id"],
          closest["overall"]["name"]
        )}\n - ${utils.sanitize(closest["overall"]["type"])}\n - ${Math.round(
          closest["overall"]["distanceToArrival"]
        )} ls from entry point`;
        toStation += `\n\nClosest station with a shipyard: ${edsmurls.station(
          dst["id"],
          dst["name"],
          closest["withShipyard"]["id"],
          closest["withShipyard"]["name"]
        )}\n - ${utils.sanitize(
          closest["withShipyard"]["type"]
        )}\n - ${Math.round(
          closest["withShipyard"]["distanceToArrival"]
        )} ls from entry point`;
        eta += "\n\n" + toStation;
      } else {
        closest = closest["overall"];
        let toStation = `Closest station (no shipyard): ${edsmurls.station(
          dst["id"],
          dst["name"],
          closest["id"],
          closest["name"]
        )}\n - ${utils.sanitize(closest["type"])}\n - ${Math.round(
          closest["distanceToArrival"]
        )} ls from entry point`;
        eta += "\n\n" + toStation;
      }
    } else {
      let toStation = `No known station in that system.`;
      eta += "\n\n" + toStation;
    }

    embed.addField("**EDR Flight Plan**", eta);
    embed.addField("\u200b", "\u200b");
    embed.addField(
      "**Support EDR & Inara**",
      ` - Lavian Brandy for EDR: via [Patreon](${process.env.EDR_PATREON_URL}) or [Paypal](${process.env.EDR_PAYPAL_URL})\n - Azure Milk for Inara: via [Paypal](${process.env.INARA_DONATION_URL})\n\n`,
      false
    );
    embed.addField(
      "**EDR Services**",
      ` - [Join](${process.env.EDR_DISCORD_JOIN_URL}) EDR's official [community](${process.env.EDR_DISCORD_URL}) discord server.\n - Install [EDR](${process.env.EDR_PLUGIN_URL}) to get in-game insights and send intel.\n - [Invite](${process.env.EDR_DISCORD_INVITE_BOT_URL}) this [bot](${process.env.EDR_DISCORD_BOT_URL}) to your own discord server.`,
      false
    );

    await interaction.reply({
      content: `Distance info for ${utils.sanitize(srcSys)} to ${utils.sanitize(
        dstSys
      )}`,
      embeds: [embed]
    });
  }
};

function checkGuild(guild) {
  if (!guild || !guild.id) return false;

  if (acl.blockedGuild(guild.id)) {
    // Leaving blocked guilds
    guild
      .leave()
      .then(g => console.log(`Left the guild ${g}`))
      .catch(console.error);
    return false;
  }

  if (acl.blockedUser(guild.ownerId)) {
    // Leaving guilds owned by blocked users
    guild
      .leave()
      .then(g =>
        console.log(`Left the guild ${g} which is owned by a blocked user.`)
      )
      .catch(console.error);
    return false;
  }

  return true;
}
