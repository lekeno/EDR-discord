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
        this.cacheHitRate = {"total": 0, "hits": 0};
        this.throttle = new throttler();
        
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
            this.servedDiscords[guild.name] = {"msgs": 0, "cmds": 0, "ignored": 0, "id": guild.id, "ownerID": guild.ownerID};
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
            this.servedDiscords[guild.name] = {"msgs": 0, "cmds": 0, "ignored": 0, "id": guild.id, "ownerID": guild.ownerID};
        };
    }

    join(guild) {
        if (!checkGuild(guild)) return;
        if (!guild || !guild.name) return;    
        
        if (acl.blockedGuild(guild.id)) {
            // Leaving blocked guilds
            console.log(`Blocked guild: {$guild.id}`);
            guild.leave().then(g => console.log(`Left the guild ${g}`)).catch(console.error);  
            return;
        }
      
        this.servedDiscords[guild.name] = {"msgs": 0, "cmds": 0, "ignored": 0, "id": guild.id, "ownerID": guild.ownerID};
      
        if (! acl.authorizedGuild(guild.id)) {
            audit.newguild(guild);
            return;
        }
    }

    stats() {
        let stats = `EDR Discord Bot - stats:\n# of servers: ${Object.keys(this.servedDiscords).length}\n`;
        
        if (this.cacheHitRate["total"] > 0) {
            stats += `Cache: ${this.cacheHitRate["hits"]/this.cacheHitRate["total"]} (#= ${this.cacheHitRate["total"]})\n`;
        }
        
        for (var server in this.servedDiscords) {
            let needsaudit = acl.authorizedGuild(this.servedDiscords[server]['id']) ? "" : "[AUDIT?]";
            stats += ` - ${server}: ${JSON.stringify(this.servedDiscords[server])}${needsaudit}}\n`;
        }
        console.log(stats);
    }
  
    async who(cmdrname, channel, uid, attachmentAllowed) {
        channel.startTyping();
        let cached = this.cache.get(cmdrname);
        this.cacheHitRate["total"] += 1;
        if (cached && (uid != process.env.OWNER_UID)) {
            let delta = Date.now() - cached["timestamp"];
            if (delta < 1000*60*60*24) {
                this.cacheHitRate["hits"] += 1;
                profile.handleEDRResponse(cached["response"], cached["date"], channel, attachmentAllowed);
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
            if (this.throttle.shouldHoldOff()) {
                channel.send("Comms jammed.\nPlease retry in a while.");
                channel.stopTyping(); 
                return;
            } else {
                response = await inara.lookup(cmdrname);            
                if (response["statusCode"] == 400 || response["statusCode"] == 408) {
                    this.throttle.backoff();
                    channel.send("Comms jammed.\nPlease retry in a few minutes.");
                    channel.stopTyping(); 
                    return;
                } else {
                    this.throttle.clear();
                }
                
            }
        }  
        
        let dated = new Date();
        if (profile.handleEDRResponse(response, dated, channel, attachmentAllowed)) {
            this.cache.set(cmdrname, {"date": dated, "response": response, "timestamp": Date.now()});
            caching.write(process.env.CMDRS_CACHE, this.cache);
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
        embed.addField("**Support EDR & Inara**", ` - Lavian Brandy for EDR: via [Patreon](${process.env.EDR_PATREON_URL}) or [Paypal](${process.env.EDR_PAYPAL_URL})\n - Azure Milk for Inara: via [Paypal](${process.env.INARA_DONATION_URL})\n\n`, false);
        embed.addField("**EDR Services**", ` - [Join](${process.env.EDR_DISCORD_JOIN_URL}) EDR's official [community](${process.env.EDR_DISCORD_URL}) discord server.\n - Install [EDR](${process.env.EDR_PLUGIN_URL}) to get in-game insights and send intel.\n - [Invite](${process.env.EDR_DISCORD_INVITE_BOT_URL}) this [bot](${process.env.EDR_DISCORD_BOT_URL}) to your own discord server.`, false);
        
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
        embed.addField("**Support EDR & EDSM**", `Install [EDR](${process.env.EDR_INSTALL}) to get the same info in-game and send intel.\n\nToken of appreciation\nLavian Brandy for EDR: via [Patreon](${process.env.EDR_PATREON_URL}) or [Paypal](${process.env.EDR_PAYPAL_URL})\n[Hutton mugs for EDSM](${process.env.EDSM_DONATION_URL})`);

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
        let uid = message.author ? message.author.id : 0;
        let uname = message.author ? message.author.username : 0;

        if (this.servedDiscords[guildname]) {
            this.servedDiscords[guildname]["msgs"] += 1;
        } else {
            this.servedDiscords[guildname] = {"msgs": 1, "cmds": 0, "ignored": 0, "id": guildid};
        }

        if (message.author.bot) return;

        let prefix = (guildid != process.env.GUILD_WITH_CONFLICTING_BOT) ? "!" : ":";

        if (!uid || !message.content || message.content.length < 2 || !message.content.startsWith(prefix)) {
          return; // no author id, no message, too short for a command, not prefixed with command character
        }
  
        var args = message.content.substring(1).split(/ +/);
        if (!args) return;
        var cmd = args[0];
        args = args.splice(1);
        
        let cmdlist = [ "uptime", "ping", "help", "version", "stats", "who", "w", "if", "distance", "d", "matTraders", "matTrader", "mat", "traders", "mt", process.env.ACL_COMMAND];
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
      
      
        if (jokes.isItAprilFoolDay() && utils.randomIntExcl(100) > 60) {
            if (jokes.gotOne("aprilfool", cmd)) {
              var joke = jokes.randomIfAny("aprilfool", cmd)
              console.log(`Sent joke: ${joke}`);
                channel.send(joke);         
                return;
            }
        }

        switch(cmd) {
            case 'uptime':
                this.uptime(channel);
                break;
            
            case 'ping':
                this.ping(channel);
                break;
            
            case 'help':
                this.help(channel, prefix);
                break;
            
            case 'version':
                this.version(channel);
                break;
            
            case 'stats':
               if (uid != process.env.OWNER_UID) return;    
                this.stats();
                break;

            case process.env.ACL_COMMAND:
                if (uid != process.env.OWNER_UID) return;  
                if (message.channel.id != process.env.ADMIN_CHANNEL_ID) return;
                if (message.guild.id != process.env.ADMIN_GUILD_ID) return;

                if (args.length < 2) {
                    return;
                }

                let action = args[0];
                let entity = args[1];
                let id = args[2];
                let result = false;

                if (action == "allow") {
                    if (entity == "guild") {
                        result = acl.authorizeGuild(id);
                    }
                } else if (action == "block") {
                    if (entity == "guild") {
                        result = acl.blockGuild(id);
                    } else if (entity == "user") {
                        result = acl.blockUser(id);
                    }
                }

                if (result) {
                    channel.send("Done!");
                } else {
                    channel.send("Nope!");
                }
                break;
            
            case 'who':
            case 'w':
                if (! acl.authorizedGuild(guildid)) {
                    audit.newguild(message.guild);
                    channel.send(`Thanks for your interest in EDR. You should get access to all the features shortly, i.e. up to a week or so. Ping @LeKeno#8484 if needed.\nIn the meantime, for performance and privacy reasons, please set a role on the EDR bot to restrict it to a dedicated channel.`);
                    return;
                }

                if (args.length == 0) {
                    channel.send(`Usage: \`${prefix}w cmdr_name\``);          
                    return;
                }

                let cmdrname = args.join(' ').toLowerCase();
                if (utils.unexpectedCmdrName(cmdrname)) return;
                let attachmentAllowed = channel.permissionsFor(message.guild.me).has("ATTACH_FILES");
                this.who(cmdrname, channel, uid, attachmentAllowed);
                break;
            
            case 'matTraders':
            case 'matTrader':
            case 'mat':
            case 'traders':
            case 'mt':
                if (args.length == 0) {
                    channel.send(`Usage: \`${prefix}${cmd} system_name\` or \`${prefix}${cmd} system_name < 5000\` to specify the maximal supercruise distance`);          
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
                    channel.send(`Usage: \`${prefix}${cmd} system_name\` or \`${prefix}${cmd} system_name < 5000\` to specify the maximal supercruise distance`);          
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
                    channel.send(`Usage: \`${prefix}!distance system_name\` or \`${prefix}d start_system > destination_system\``);          
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

    help (channel, prefix) {
        let message = `Commands:\n\
- **${prefix}help** to show help information, e.g. list of supported commands\n\
- **${prefix}w cmdrname** or **${prefix}who cmdrname** to show a profile of cmdrname based on information from EDR and Inara.\n\
- **${prefix}distance Lave** or **${prefix}d Wyrd > Lave** to get the distance between systems, e.g. Sol to Lave or Wyrd to Lave.\n\
- **${prefix}matTraders Lave** or **${prefix}mt Wyrd < 2500** to get the closest material traders near Lave preferably within 2500 LS of the nav beacon.\n\
- **${prefix}if Lave** to show nearby Interstellar Factors near Lave.\n\
- **${prefix}version** to show EDR Discord Bot's version and changelog.\n\
- **${prefix}ping** to confirm that the bot is online.\n\
- **${prefix}uptime** to show how long the bot has been running uninterrupted.\n\n\
Contact @LeKeno#8484 if you have any questions, feedback or in need of troubleshooting.\n\n\
**PSA**: for performance and privacy reasons, please set a role on the EDR bot to restrict it to a dedicated channel.`;
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
        if (src == false || src == undefined) {
            channel.send(`System ${srcSys} is unknown to EDSM. Please check the spelling.`);
            return;
        }
    
        let dst = await this.galaxy.system(dstSys);   
        if (dst == false || dst == undefined) {
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
        embed.addField("**Support EDR & Inara**", ` - Lavian Brandy for EDR: via [Patreon](${process.env.EDR_PATREON_URL}) or [Paypal](${process.env.EDR_PAYPAL_URL})\n - Azure Milk for Inara: via [Paypal](${process.env.INARA_DONATION_URL})\n\n`, false);
        embed.addField("**EDR Services**", ` - [Join](${process.env.EDR_DISCORD_JOIN_URL}) EDR's official [community](${process.env.EDR_DISCORD_URL}) discord server.\n - Install [EDR](${process.env.EDR_PLUGIN_URL}) to get in-game insights and send intel.\n - [Invite](${process.env.EDR_DISCORD_INVITE_BOT_URL}) this [bot](${process.env.EDR_DISCORD_BOT_URL}) to your own discord server.`, false);

        channel.send(`Distance info for ${utils.sanitize(srcSys)} to ${utils.sanitize(dstSys)}`, {embed});
    }
}

function checkGuild(guild) {
    if (!guild || !guild.id) return false;

    if (acl.blockedGuild(guild.id)) {
        // Leaving blocked guilds
        guild.leave().then(g => console.log(`Left the guild ${g}`)).catch(console.error);  
        return false;
    }

    if (acl.blockedUser(guild.ownerID)) {
        // Leaving guilds owned by blocked users
        guild.leave().then(g => console.log(`Left the guild ${g} which is owned by a blocked user.`)).catch(console.error);  
        return false;
    }

    return true;
}