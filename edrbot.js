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

module.exports = class EDRBot {
    constructor(guilds) {
        this.born = Date.now();
        this.cacheHitRate = {"total": 0, "hits": 0};
        
        this.cache = new LRU({max: parseInt(process.env.CACHE_MAX_ITEMS), maxAge: parseInt(process.env.CACHE_MAX_AGE)});
        try {
            caching.read(process.env.CMDRS_CACHE, this.cache);
        } catch (error) {
            console.error(error);
        }

        this.galaxy = new galaxy();
        this.systems = new systems();
        
        this.servedDiscords = {};
       
        if (!guilds) return;
        for (var [key, guild] of guilds) {
            if (!checkGuild(guild)) continue;
            if (!guild || !guild.name) continue;
            this.servedDiscords[guild.name] = {"msgs": 0, "cmds": 0, "ignored": 0, "id": guild.id};
        };
    }

    init(guilds) {
        this.born = Date.now();
        this.cacheHitRate = {"total": 0, "hits": 0};
        
        this.servedDiscords = {};
       
        if (!guilds) return;
        for (var [key, guild] of guilds) {
            if (!checkGuild(guild)) continue;
            if (!guild || !guild.name) continue;
            this.servedDiscords[guild.name] = {"msgs": 0, "cmds": 0, "ignored": 0, "id": guild.id};
        };
    }

    join(guild) {
        if (!checkGuild(guild)) return;
        if (!guild || !guild.name) return;    
        this.servedDiscords[guild.name] = {"msgs": 0, "cmds": 0, "ignored": 0, "id": guild.id};
        
        if (! acl.authorizedGuild(guild.id)) {
            audit.newguild(guild);
            return;
        }
    }

    stats() {
        let stats = `EDR Discord Bot - stats:\n`;
        
        if (this.cacheHitRate["total"] > 0) {
            stats += `Cache: ${this.cacheHitRate["hits"]/this.cacheHitRate["total"]} (#= ${this.cacheHitRate["total"]})\n`;
        }
        
        for (var server in this.servedDiscords) {
            stats += ` - ${server}: ${JSON.stringify(this.servedDiscords[server])}\n`;
        }
        console.log(stats);
    }

    async who(cmdrname, channel, uid) {
        channel.startTyping();
        let cached = this.cache.get(cmdrname);
        this.cacheHitRate["total"] += 1;
        if (cached && (uid != process.env.OWNER_UID)) {
            let delta = Date.now() - cached["timestamp"];
            if (delta < 1000*60*60*24) {
                this.cacheHitRate["hits"] += 1;
                profile.handleEDRResponse(cached["response"], cached["date"], channel);
                channel.stopTyping();
                return;
            }
        }
            
        var options = {
            url: process.env.EDR_PROFILE_ENDPOINT + encodeURIComponent(cmdrname),
            method: 'GET',
            json: true,
            resolveWithFullResponse: true,
            headers: {
                "Authorization": `${process.env.AUTH_PREFIX} ${process.env.EDR_API_KEY}`
            },
            simple: false
        };

        let response = await request(options);
        
        if (response.statusCode == 404) {
            response = await inara.lookup(cmdrname);
        }
        let dated = new Date();
        if (profile.handleEDRResponse(response, dated, channel)) {
            this.cache.set(cmdrname, {"date": dated, "response": response, "timestamp": Date.now()});
            caching.write(process.env.CMDR_CACHE, this.cache);
        }
        channel.stopTyping();
    }

    async searchMT(poi, scDistance, channel) {
        let radius = 40;
        channel.startTyping();
        let traders = await this.galaxy.materialTraders(poi, radius, scDistance);

        if (!traders) {
            // TODO send something
            channel.stopTyping();
            return;
        }
        
        const embed = new discord.RichEmbed();
        embed.setColor("#777777");
        embed.setTimestamp(new Date());
        embed.setFooter("Info provided by ED Recon", process.env.EDR_ICON);

        embed.setTitle(`Material traders nearby ${utils.sanitize(poi)}`);
        embed.setAuthor("EDR", "https://lekeno.github.io/favicon-16x16.png", "https://edrecon.com");
        let description = "";
        // TODO this is a mess... (almost everything is identical, very inefficient/inelegant approach here)
        if (traders['raw']) {
            let trader = traders['raw'];
            if (trader['distance'] > 0) {
                description += `Raw materials: ${edsmurls.system(trader['id'], trader['name'])}, ${utils.prettyDistance(trader['distance'])} LY\n - ${edsmurls.station(trader['id'], trader['name'], trader['station']['id'], trader['station']['name'])}\n - ${utils.sanitize(trader['station']['type'])}\n - ${Math.round(trader['station']['distanceToArrival'])} ls.\n\n`; 
            } else {
                description += `Raw materials: ${edsmurls.system(trader['id'], trader['name'])}\n - ${edsmurls.station(trader['id'], trader['name'], trader['station']['id'], trader['station']['name'])}\n - ${utils.sanitize(trader['station']['type'])}\n - ${Math.round(trader['station']['distanceToArrival'])} ls.\n\n`; 
            }
        }

        if (traders['manufactured']) {
            let trader = traders['manufactured'];
            if (trader['distance'] > 0) {
                description += `Manufactured materials: ${edsmurls.system(trader['id'], trader['name'])}, ${utils.prettyDistance(trader['distance'])} LY\n - ${edsmurls.station(trader['id'], trader['name'], trader['station']['id'], trader['station']['name'])}\n - ${utils.sanitize(trader['station']['type'])}\n - ${Math.round(trader['station']['distanceToArrival'])} ls.\n\n`; 
            } else {
                description += `Manufactured materials: ${edsmurls.system(trader['id'], trader['name'])}\n - ${edsmurls.station(trader['id'], trader['name'], trader['station']['id'], trader['station']['name'])}\n - ${utils.sanitize(trader['station']['type'])}\n - ${Math.round(trader['station']['distanceToArrival'])} ls.\n\n`; 
            }
        }
        
        if (traders['encoded']) {
            let trader = traders['encoded'];
            if (trader['distance'] > 0) {
                description += `Encoded data: ${edsmurls.system(trader['id'], trader['name'])}, ${utils.prettyDistance(trader['distance'])} LY\n - ${edsmurls.station(trader['id'], trader['name'], trader['station']['id'], trader['station']['name'])}\n - ${utils.sanitize(trader['station']['type'])}\n - ${Math.round(trader['station']['distanceToArrival'])} ls.\n\n`; 
            } else {
                description += `Encoded data: ${edsmurls.system(trader['id'], trader['name'])}\n - ${edsmurls.station(trader['id'], trader['name'], trader['station']['id'], trader['station']['name'])}\n - ${utils.sanitize(trader['station']['type'])}\n - ${Math.round(trader['station']['distanceToArrival'])} ls.\n\n`; 
            }
        }

        if (description != "") {
            embed.setDescription(description);
            embed.addBlankField();
            embed.addField("*Caveats*", "Permit locked systems are ignored.\n\nMaterial traders are unavailable at stations which are:\n - damaged\n - being repaired\n - under lockdown\n - controlled by a criminal faction");
        } else {
            embed.setDescription(`No material trading within a radius of ${radius} LY`);
        }

        embed.addBlankField();
        embed.addField("**Support EDR & EDSM**", `Install [EDR](${process.env.EDR_PLUGIN_URL}) to get the same info in-game and send intel.\n[Invite](${process.env.EDR_DISCORD_URL}) this bot to your own discord server.\n\nToken of appreciation\n[Lavian Brandy for EDR](${process.env.EDR_DONATION_URL})\n[Hutton mugs for EDSM](${process.env.EDSM_DONATION_URL})`);
        
        channel.send(`Material trading within ${radius} LY of ${utils.sanitize(poi)} (aiming for supercruise ≤ ${scDistance} LS)`, {embed});
        channel.stopTyping();
    }

    async searchIF(poi, scDistance, channel) {
        let radius = 40;
        channel.startTyping();
        let ifactors = await this.galaxy.interstellarFactors(poi, radius, scDistance);
        if (!ifactors) {
            // TODO send something
            channel.stopTyping();
            return;
        }
        
        const embed = new discord.RichEmbed();
        embed.setColor("#777777");
        embed.setTimestamp(new Date());
        embed.setFooter("Info provided by ED Recon", process.env.EDR_ICON);

        embed.setTitle(`Interstellar Factors nearby ${poi}`);
        embed.setAuthor("EDR", process.env.EDR_SMALL_ICON, process.env.EDR_URL);
        let description = "";
        if (ifactors['overall'] && ifactors['overall']['distance'] > 0) {
            let overallIF = ifactors['overall'];
            description += `${edsmurls.system(overallIF["id"], overallIF["name"])}, ${utils.prettyDistance(overallIF['distance'])} LY\n - ${edsmurls.station(overallIF["id"], overallIF["name"], overallIF['station']["id"], overallIF['station']['name'])}\n - ${overallIF['station']['type']}\n - ${Math.round(overallIF['station']['distanceToArrival'])} ls.\n\n`; 
        } else {
            let overallIF = ifactors['overall'];
            description += `${edsmurls.system(overallIF["id"], overallIF["name"])}\n - ${edsmurls.station(overallIF["id"], overallIF["name"], overallIF['station']["id"], overallIF['station']['name'])}\n - ${overallIF['station']['type']}\n - ${Math.round(overallIF['station']['distanceToArrival'])} ls.\n\n`; 
        }
        
        let sta = new statioport(ifactors['overall']['station']);
        if ((!ifactors['overall'] || !sta.hasLargeLandingPads()) && (ifactors['withLargeLandingPads'] && ifactors['withLargeLandingPads']['station'])) {
            if (ifactors['withLargeLandingPads']['distance'] > 0) {
                let overallIF = ifactors['withLargeLandingPads'];
                description += `${edsmurls.system(overallIF['id'], overallIF['name'])}, ${utils.prettyDistance(overallIF['distance'])} LY\n - ${edsmurls.station(overallIF['id'], overallIF['name'], overallIF['station']['id'], overallIF['station']['name'])}\n - ${overallIF['station']['type']}\n - ${Math.round(overallIF['station']['distanceToArrival'])} ls.\n\n`; 
            } else {
                let overallIF = ifactors['withLargeLandingPads'];
                description += `${edsmurls.system(overallIF['id'], overallIF['name'])}\n - ${edsmurls.station(overallIF['id'], overallIF['name'], overallIF['station']['id'], overallIF['station']['name'])}\n - ${overallIF['station']['type']}\n - ${Math.round(overallIF['station']['distanceToArrival'])} ls.\n\n`; 
            }
        }

        if (description != "") {
            embed.setDescription(description);
            embed.addBlankField();
        } else {
            embed.setDescription(`No interstellar factors within a radius of ${radius} LY`);
        }

        embed.addBlankField();
        embed.addField("**Support EDR & EDSM**", `Install [EDR](${process.env.EDR_INSTALL}) to get the same info in-game and send intel.\n\nToken of appreciation\n[Lavian Brandy for EDR](${process.env.EDR_DONATION_URL})\n[Hutton mugs for EDSM](${process.env.EDSM_DONATION_URL})`);

        channel.send(`Interstellar Factors within ${radius} LY of ${utils.sanitize(poi)} (aiming for supercruise ≤ ${scDistance} LS)`, {embed});
        channel.stopTyping();
    }

    process(message) {
        if (!message.guild) return;

        let guildid = message.guild.id;
        if (!guildid) return;

        if (acl.blockedGuild(guildid)) {
            // Leaving blocked guilds
            message.guild.leave().then(g => console.log(`Left the guild ${g}`)).catch(console.error);  
            return;
        }

        let guildname = message.guild ? message.guild.name : "N/A"; 
        if (guildname == "N/A") return; // Not from a guild

        if (this.servedDiscords[guildname]) {
            this.servedDiscords[guildname]["msgs"] += 1;
        } else {
            this.servedDiscords[guildname] = {"msgs": 1, "cmds": 0, "ignored": 0, "id": guildid};
        }

        if (message.author.bot) return;

        let uid = message.author ? message.author.id : 0;
        if (!uid || !message.content || message.content.length < 2 || !message.content.startsWith('!')) {
            return; // no author id, no message, too short for a command, not prefixed with command character
        }

        var args = message.content.substring(1).split(/ +/);
        if (!args) return;
        var cmd = args[0];
        args = args.splice(1);
        
        let cmdlist = [ "uptime", "ping", "help", "version", "stats", "who", "w", "if", "distance", "d", "matTraders", "matTrader", "mat", "traders", "mt" ];
        if (!cmdlist.includes(cmd)) {
            return; // not a recognized command
        }

        if (this.servedDiscords[guildname]) {
            this.servedDiscords[guildname]["cmds"] += 1;
        } else {
            this.servedDiscords[guildname] = {"msgs": 1, "cmds": 1, "ignored": 0, "id": guildid};
        }
        
        if (acl.blockedUser(uid)) {
            this.servedDiscords[guildname]["ignored"] += 1;
            return; // ignore
        }

        var channel = message.channel;
        if (!channel) return;
        
        switch(cmd) {
            case 'uptime':
                this.uptime(channel);
                break;
            
            case 'ping':
                this.ping(channel);
                break;
            
            case 'help':
                this.help(channel);
                break;
            
            case 'version':
                this.version(channel);
                break;
            
            case 'stats':
               if (uid != process.env.OWNER_UID) return;    
                this.stats();
                break;
            
            case 'who':
            case 'w':
                if (! acl.authorizedGuild(guildid)) {
                    audit.newguild(message.guild);
                    channel.send(`Thanks for your interest in EDR. You should get access to all the features shortly, i.e. 1~2 day(s). Ping @LeKeno#8484 if needed.\nIn the meantime, for performance and privacy reasons, please set a role on the EDR bot to restrict it to a dedicated channel.`);
                    return;
                }

                if (args.length == 0) {
                    channel.send("Usage: `!w cmdr_name`");          
                    return;
                }

                let cmdrname = args.join(' ').toLowerCase();
                if (utils.unexpectedCmdrName(cmdrname)) return;
                this.who(cmdrname, channel, uid);
                break;
            
            case 'matTraders':
            case 'matTrader':
            case 'mat':
            case 'traders':
            case 'mt':
                if (args.length == 0) {
                    channel.send(`Usage: \`!${cmd} system_name\` or \`!${cmd} system_name < 5000\` to specify the maximal supercruise distance`);          
                    return;
                }
                let params = args.join(' ').split(" < ");
                let poi = params[0];
                if (utils.unexpectedSystemName(poi)) return;
                let scDistance = params[1] || 1500;
                if (utils.unexpectedSCDistance(scDistance)) return;
                
                if (jokes.gotOne(poi, 'mt')) {
                    channel.send(jokes.randomIfAny(poi, 'mt'));          
                    return;
                }
                
                this.searchMT(poi, scDistance, channel);
                break;

            case 'if':
                if (args.length == 0) {
                    channel.send(`Usage: \`!${cmd} system_name\` or \`!${cmd} system_name < 5000\` to specify the maximal supercruise distance`);          
                    return;
                }
                let parameters = args.join(' ').split(" < ");
                let poi2 = parameters[0];
                if (utils.unexpectedSystemName(poi2)) return;

                let scDistance2 = parameters[1] || 1500;
                if (utils.unexpectedSCDistance(scDistance2)) return;
                
                if (jokes.gotOne(poi2, 'if')) {
                    channel.send(jokes.randomIfAny(poi, 'mt'));          
                    return;
                }
                
                this.searchIF(poi2, scDistance2, channel);
                break;
            
            case 'distance':
            case 'd':
                if (args.length == 0) {
                    channel.send("Usage: `!distance system_name` or `!d start_system > destination_system`");          
                    return;
                }
                let systems = args.join(' ').split(" > ");
                let srcSys = systems[1] ? systems[0] : 'Sol';
                let dstSys = systems[1] ? systems[1] : systems[0];
                if (utils.unexpectedSystemName(srcSys) || utils.unexpectedSystemName(dstSys)) return;

                if (srcSys == dstSys) {
                    channel.send(jokes.randomIfAny("src==dst", "d"));          
                    return;
                }
            
                if (jokes.gotOne(dstSys, "d-dst")) {
                channel.send(jokes.randomIfAny(dstSys, "d-dst"));          
                return;
                }
            
                if (jokes.gotOne(dstSys, "d-src")) {
                channel.send(jokes.randomIfAny(dstSys, "d-src"));          
                return;
                }

                this.distance(srcSys, dstSys, channel);
            break;
        }
    }

    uptime(channel) {
        if (Math.random() * 100 >= 90) {
            channel.send(`Grinding since 3304`);
        } else {
            channel.send(`Up and running since ${utils.compactTimelapse(this.born)}`);
        }
    }

    ping(channel) {
        if (Math.random() * 100 >= 90) {
            channel.send(":ping_pong:");
        } else {
            channel.send("pong!");
        }
    }

    help (channel) {
        let message = "Commands:\n\
- **!help** to show help information, e.g. list of supported commands\n\
- **!w cmdrname** or **!who cmdrname** to show a profile of cmdrname based on information from EDR and Inara.\n\
- **!distance Lave** or **!d Wyrd > Lave** to get the distance between systems, e.g. Sol to Lave or Wyrd to Lave.\n\
- **!matTraders Lave** or **!mt Wyrd < 2500** to get the closest material traders near Lave preferably within 2500 LS of the nav beacon.\n\
- **!if Lave** to show nearby Interstellar Factors near Lave.\n\
- **!version** to show EDR Discord Bot's version and changelog.\n\
- **!ping** to confirm that the bot is online.\n\
- **!uptime** to show how long the bot has been running uninterrupted.\n\n\
Contact @LeKeno#8484 if you have any questions, feedback or in need of troubleshooting.\n\n\
**PSA**: for performance and privacy reasons, please set a role on the EDR bot to restrict it to a dedicated channel.";
        channel.send(message);
    }

    version (channel) {
        let message = `EDR Discord Bot - version: ${process.env.VERSION}\n\
New feature(s): ${process.env.NEW_FEATURES}\n\n\
**PSA**: for performance and privacy reasons, please set a role on the EDR bot to restrict it to a dedicated channel.`;
        channel.send(message);
    }

    async distance(srcSys, dstSys, channel) {
        let src = await this.galaxy.system(srcSys);
        if (src == false) {
            channel.send(`System ${srcSys} is unknown to EDSM. Please check the spelling.`);
            return;
        }
    
        let dst = await this.galaxy.system(dstSys);   
        if (dst == false) {
            channel.send(`System ${dstSys} is unknown to EDSM. Please check the spelling.`);
            return;
        }

        let distance = utils.distance(src['coords'], dst['coords']);
        let prettyDist = utils.prettyDistance(distance);
        let urls = [`${process.env.EDSM_SYSTEM_PREFIX}${src['id']}/name/${encodeURIComponent(src['name'])}`,
                    `${process.env.EDSM_SYSTEM_PREFIX}${dst['id']}/name/${encodeURIComponent(dst['name'])}`];
        
        const embed = new discord.RichEmbed();
        embed.setColor("#777777");
        embed.setTimestamp(new Date());
        embed.setFooter("Info provided by ED Recon", process.env.EDR_ICON);

        embed.setTitle(`System ${dst['name']} on EDSM`);
        embed.setAuthor("EDSM", process.env.EDSM_ICON, process.env.EDSM_URL);
        embed.setURL(urls[1]);
        embed.setDescription(`${prettyDist} ly between ${src["name"]} and ${dst["name"]}`);
        
        embed.addBlankField();
        let transferTime = utils.transferTime(distance);
        let taxiTime = utils.taxiTime(distance);
        let snailTime = utils.snailTime(distance);
        let eta = `Transfer time: ≃${utils.prettyDuration(transferTime)}\nTaxi time (50 LY): ≃${utils.prettyDuration(taxiTime)}\nSnail time (15 LY): ≃${utils.prettyDuration(snailTime)}`;

        let sta = await this.systems.stations(dstSys);

        if (sta && sta.length > 0) {
            let closest = this.systems.closestStation(sta, null);
            if (closest['overall'] && closest['withShipyard'] && (closest['overall']['name'] == closest['withShipyard']['name'] || (closest['withShipyard']['distanceToArrival'] <= closest['overall']['distanceToArrival']))) { 
                closest = closest['overall'];
                let toStation = `Closest station with a shipyard: ${edsmurls.station(dst['id'], dst['name'], closest['id'], closest['name'])}\n - ${utils.sanitize(closest['type'])}\n - ${Math.round(closest['distanceToArrival'])} ls from entry point`;
                eta += "\n\n" + toStation;
            } else if (closest['overall'] && closest['withShipyard']) {
                let toStation = `Closest station: ${edsmurls.station(dst['id'], dst['name'], closest['overall']['id'], closest['overall']['name'])}\n - ${utils.sanitize(closest['overall']['type'])}\n - ${Math.round(closest['overall']['distanceToArrival'])} ls from entry point`;
                toStation += `\n\nClosest station with a shipyard: ${edsmurls.station(dst['id'], dst['name'], closest['withShipyard']['id'], closest['withShipyard']['name'])}\n - ${utils.sanitize(closest['withShipyard']['type'])}\n - ${Math.round(closest['withShipyard']['distanceToArrival'])} ls from entry point`;
                eta += "\n\n" + toStation;
            } else {
                closest = closest['overall'];
                let toStation = `Closest station (no shipyard): ${edsmurls.station(dst['id'], dst['name'], closest['id'], closest['name'])}\n - ${utils.sanitize(closest['type'])}\n - ${Math.round(closest['distanceToArrival'])} ls from entry point`;
                eta += "\n\n" + toStation;
            }
        } else {
            let toStation = `No known station in that system.`;
            eta += "\n\n" + toStation;
        }

        embed.addField("**EDR Flight Plan**", eta);
        embed.addBlankField();
        embed.addField("**Support EDR & EDSM**", `Install [EDR](${process.env.EDR_PLUGIN_URL}) to get the same info in-game and send intel.\n[Invite](${process.env.EDR_DISCORD_URL}) this bot to your own discord server.\n\nToken of appreciation\n[Lavian Brandy for EDR](${process.env.EDR_DONATION_URL})\n[Hutton mugs for EDSM](${process.env.EDSM_DONATION_URL})`);

        channel.send(`Distance info for ${utils.sanitize(srcSys)} to ${utils.sanitize(dstSys)}`, {embed});
    }
}

function checkGuild(guild) {
    if (!guild || !guild.id) return false;

    if (acl.blockedGuild(guild)) {
        // Leaving blocked guilds
        guild.leave().then(g => console.log(`Left the guild ${g}`)).catch(console.error);  
        return false;
    }

    return true;
}