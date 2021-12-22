'use strict';
const discord = require("discord.js"); 
const utils = require("./utils");
const legal = require("./edrlegal");
const presence = require("./edrpresence");
const { createCanvas, Image } = require('canvas');

module.exports = {
    handleEDRResponse: async function (response, date, defInteraction, attachmentAllowed) {
      if (response.statusCode == 404) {
        await defInteraction.editReply("No info on file.\nPlease use the full in-game name.");
        return true;
      }
    
      if (response.statusCode != 200) {
        await defInteraction.editReply("Something went wrong :(");
        console.error(`Something went wrong: (${response.statusCode})`);
        return false;
      }
    
      const embed = new discord.MessageEmbed();
      embed.setTimestamp(date);
      embed.setFooter("Info provided by ED Recon", process.env.EDR_ICON);
    
      if (response.body["inaraId"]) {
          let description = "";
          let inaraName = response.body["inaraName"] || response.body["name"];
          embed.setTitle(`Cmdr ${utils.sanitize(inaraName)} on Inara`);
          embed.setAuthor("Inara", process.env.INARA_ICON, process.env.INARA_URL);
          if (response.body["inaraURL"]) {
            embed.setURL(`${response.body["inaraURL"]}`);
          }
          embed.setThumbnail(response.body["inaraAvatar"]);
    
          if (response.body["squadronName"]) {
              description += `**Wing**: ${utils.sanitize(response.body["squadronRank"])} @ [${utils.sanitize(response.body["squadronName"])}](${utils.sanitize(response.body["squadronURL"])})\n`;
          }
    
          if (response.body["inaraRole"]) {
              description += `**Role**: ${utils.sanitize(response.body["inaraRole"])}\n`;
          }
    
          if (response.body["inaraAllegiance"]) {
              description += `**Allegiance**: ${utils.sanitize(response.body["inaraAllegiance"])}\n`;
          }
    
          if (response.body["inaraPowerplay"]) {
              description += `**Powerplay**: ${utils.sanitize(response.body["inaraPowerplay"])}\n`;
          }
    
          if (description != "") {
              embed.setDescription(description);
          }
      } else {
          embed.setTitle("Not found");
          embed.setAuthor("Inara", process.env.INARA_ICON, process.env.INARA_URL);
          embed.setDescription("Reach out to LeKeno#8484 if you know this commander's Inara profile.");
      }
      embed.addField('\u200b', '\u200b');
    
      if (response.body["karma"] != undefined || response.body["dkarma"] != undefined) {
        let dkarma = response.body["dkarma"];
        let skarma = response.body["karma"];
        let karma = skarma;
        let header = "Static";
        if (skarma == undefined || skarma == 0 || (skarma < 0 && dkarma < skarma)) {
            karma = dkarma;
            header = "Dynamic";
        }
        embed.addField("**EDR Karma**", `${utils.sanitize(header)}: ${utils.sanitize(this.readableKarma(karma))}/${Math.round(karma)}`);
        embed.setColor(this.karmaColor(this.readableKarma(karma)));
      }
    
      if (response.body["alignmentHints"] != undefined) {
          let section = this.alignmentSection(response.body["alignmentHints"]);
          if (section) {
            embed.addField(section["name"], section["value"]);
          }
      }
      
      var canvases = [];
      if (response.body["legalRecords"]) {
        let legalvizu = this.legalsection(response.body["legalRecords"]);
        if (legalvizu && attachmentAllowed) {
          canvases.push(legalvizu);
        } else {
          embed.addField("**EDR Legal**", "EDR can now show graphs of clean/wanted scans and max bounties on a per month basis. This feature requires the 'attach files' permissions.");  
        }
      }

      if (response.body["presenceStats"]) {
        let presencevizu = await this.presencesection(response.body["presenceStats"]);
        if (presencevizu && attachmentAllowed) {
          if (Array.isArray(presencevizu)) {
            canvases.push(...presencevizu);
          }
          else {
            canvases.push(presencevizu);
          }
        } else {
          embed.addField("**EDR Presence**", "EDR can now show graphs of ships a cmdr is most sighted in. This feature requires the 'attach files' permissions.");  
        }
      }

      if (response.body["lastSighting"]  != undefined && response.body["lastSighting"]["system"] != undefined) {
        let section = this.sightedSection(response.body["lastSighting"]);
        embed.addField(section["name"], section["value"]);
      }
    
      if (response.body["patreon"] != undefined) {
          embed.addField('\u200b', '\u200b');
          embed.addField("**EDR Patreon**", utils.sanitize(response.body["patreon"]), true);
      }
      embed.addField('\u200b', '\u200b');
      embed.addField("**Support EDR & Inara**", ` - Lavian Brandy for EDR: via [Patreon](${process.env.EDR_PATREON_URL}) or [Paypal](${process.env.EDR_PAYPAL_URL})\n - Azure Milk for Inara: via [Paypal](${process.env.INARA_DONATION_URL})\n\n`, false);
      embed.addField("**EDR Services**", ` - [Join](${process.env.EDR_DISCORD_JOIN_URL}) EDR's official [community](${process.env.EDR_DISCORD_URL}) discord server.\n - Install [EDR](${process.env.EDR_PLUGIN_URL}) to get in-game insights and send intel.\n - [Invite](${process.env.EDR_DISCORD_INVITE_BOT_URL}) this [bot](${process.env.EDR_DISCORD_BOT_URL}) to your own discord server.`, false);
      
      if (canvases.length) {
        let w = Math.max.apply(Math, canvases.map(function(o) { return o.width; }));
        let h = canvases.reduce(function(a, b) { return a + b.height; }, 0);
        var vizu = createCanvas(w, h);
        var ctx = vizu.getContext('2d');
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(0, 0, vizu.width, vizu.height);
        let dh = 0;
        for (var i in canvases) {
          var img = new Image;
          var canvas = canvases[i];
          img.src = canvas.toBuffer();
          ctx.drawImage(img, 0, dh);
          dh += canvas.height;
        }
        
        const buf = vizu.toBuffer();
        const rngSuffix = Math.round(Math.random() * 100000,0);
        const name = `vizu${rngSuffix}.png`;
        const attachment = new discord.MessageAttachment(buf, name);
        embed.setImage(`attachment://${name}`);
        
        //await new Promise(resolve => setTimeout(resolve, 3000));
        //embed.attachFiles([attachment]);
        await defInteraction.editReply({content: `Intel about ${utils.sanitize(response.body["name"])}`, embeds: [embed], files: [attachment]});
      } else {
        await defInteraction.editReply({content: `Intel about ${utils.sanitize(response.body["name"])}`, embeds: [embed]});
      }
      return true;
    },
  
    legalsection: function (legalRecords) {
      var edrlegal = new legal(legalRecords);
      return edrlegal.visualization();
    },

    presencesection: async function (presenceStats) {
      var edrpresence = new presence(presenceStats);
      return await edrpresence.visualization();
    },

    alignmentSection: function (alignment) {
        let total = alignment["enforcer"] + alignment["neutral"]  + alignment["outlaw"];
        if (total > 0) {
          let enfpct = Math.round(100.0 * alignment["enforcer"] / total);
          let neupct = Math.round(100.0 * alignment["neutral"] / total);
          let outpct = Math.round(100.0 * alignment["outlaw"] / total);
          return {"name": `**EDR User Tags** (${total})`, "value": `\`#outlaw ${outpct}% | #neutral ${neupct}% | #enforcer ${enfpct}%\``};
        }
        return;
    },
    
    bountySection: function (lastBounty) {
      if (lastBounty["value"] <= 0) return;
      if ((Date.now() - lastBounty["timestamp"]) >= 1000*60*60*24*31) return;
      
      return {
        "name": `**EDR Bounty** (${utils.compactTimelapse(lastBounty["timestamp"])})`,
        "value": `${utils.prettyBounty(lastBounty["value"])} cr in ${utils.sanitize(lastBounty["starSystem"])}`
      };
    },
    
    legalSection: function (legalRecords) {
      var lastBountyTimestamp = 0;
      var lastBounty = {};
      var maxBounty = 0;
      var clean = 0;
      var wanted = 0;
      
      for (var key in legalRecords) {
        clean += legalRecords[key]["counters"]["clean"];
        wanted += legalRecords[key]["counters"]["wanted"];
        
        if (legalRecords[key]["bounties"]) {
          if (legalRecords[key]["bounties"]["max"] > maxBounty) {
            maxBounty = legalRecords[key]["bounties"]["max"];
          }
    
          if (legalRecords[key]["bounties"]["last"] && legalRecords[key]["bounties"]["last"]["timestamp"] > lastBountyTimestamp) {
            lastBounty = legalRecords[key]["bounties"]["last"];
            lastBountyTimestamp = legalRecords[key]["bounties"]["last"]["timestamp"];
          }
        }
      }
      
      let sectionValue = `Scans: ${clean} clean / ${wanted} wanted`;
      if (lastBounty["value"]) {
        sectionValue += `\nLast: ${utils.prettyBounty(lastBounty["value"])} cr in ${lastBounty["starSystem"]} ${utils.compactTimelapse(lastBounty["timestamp"])}`;
      }
      
      if (maxBounty) {
        sectionValue += `\nMax: ${utils.prettyBounty(maxBounty)} cr`
      }
      
      return {
        "name": `**EDR Legal Records** (last 4 weeks)`,
        "value": sectionValue
      };
    },
    
    sightedSection: function (lastSighting) {
        let sighting = `${lastSighting["system"]}`;
        if (lastSighting["place"] && lastSighting["place"] != lastSighting["system"]) {
            let place = lastSighting['place'];
            if (place.startsWith(lastSighting['system'])) {
                place = place.slice(lastSighting['system'].length+1, place.length);
            }
            
            sighting +=  ` , ${lastSighting["place"]}`;
        }
      
        if (lastSighting["ship"] && lastSighting["ship"].toLowerCase() != "unknown") {
            sighting +=  ` (${lastSighting["ship"]})`;
        }
       
        return {"name": `**EDR Intel** (${utils.compactTimelapse(lastSighting["timestamp"])})`, "value": utils.sanitize(sighting)};
    },
    
    karmaColor: function (karma) {
        let colorLUT = {"Outlaw++++": 14368588, "Outlaw+++": 14701123, "Outlaw++": 15099450, "Outlaw+": 15497521, "Outlaw": 15895848,
                "Neutral": 8421246, "Ambiguous": 8421246,
                "Lawful": 12971765, "Lawful+": 11001028, "Lawful++": 9030291, "Lawful+++": 7059554, "Lawful++++": 5088817};
        if (karma in colorLUT) {
            return colorLUT[karma];
        }
        return 8421246;
    },
    
    readableKarma: function(karma) {
        if (karma == undefined) {
            return "Unknown";
        }
        const KARMA_LUT = ["Outlaw++++", "Outlaw+++", "Outlaw++", "Outlaw+", "Outlaw", "Ambiguous", "Lawful", "Lawful+", "Lawful++", "Lawful+++", "Lawful++++"];
        let sane_karma = Math.max(Math.min(1000, karma), -1000);
        let i = Math.round((sane_karma + 1000) / 2000.0 * 10,0);
        return KARMA_LUT[i];
    },
}