'use strict';

const request = require('request-promise');

module.exports = {
    lookup: async function (cmdr_name) {
        var cmdr_profile_payload = {
            "header": {
                "appName": process.env.APP_NAME,
                "appVersion": process.env.VERSION,
                "isDeveloped": false,
                "APIkey": process.env.INARA_API_KEY,
                "commanderName": cmdr_name
            },
            "events": [{
                "eventName": "getCommanderProfile",
                "eventTimestamp": new Date().toISOString(),
                "eventData": {
                    "searchName": cmdr_name
                }
            }]
        };

        var options = {
            url: process.env.INARA_API_URL,
            method: 'POST',
            json: true,
            body: cmdr_profile_payload,
            resolveWithFullResponse: true
        };

        var inaraLup = request(options).then(response => {
            let adjustedResponse = {"body": {}, "statusCode": response.statusCode};
            if (response.body["header"] && response.body["header"]["eventStatus"] == 400) {
                return {"body": {}, "statusCode": 400};
            }

            if (!response.body["events"] || !response.body["events"][0] || response.body["events"][0]["eventStatus"] == 204 || !response.body["events"][0]["eventData"] || !response.body["events"][0]["eventData"]) {
                return {"body": {}, "statusCode": 404};
            }
            let jsonResponse = response.body["events"][0]["eventData"];
            adjustedResponse.body["name"] = jsonResponse["userName"];
            adjustedResponse.body["inaraId"] = jsonResponse["userID"];
            adjustedResponse.body["inaraName"] = jsonResponse["userName"];
            adjustedResponse.body["inaraAllegiance"] = jsonResponse["preferredAllegianceName"];
            adjustedResponse.body["inaraPowerplay"] = jsonResponse["preferredPowerName"];
            adjustedResponse.body["inaraRole"] = jsonResponse["preferredGameRole"];
            adjustedResponse.body["inaraAvatar"] = jsonResponse["avatarImageURL"];
            adjustedResponse.body["inaraURL"] = jsonResponse["inaraURL"];
            if (jsonResponse["commanderWing"]) {
                adjustedResponse.body["squadronId"] = jsonResponse["commanderWing"]["wingID"];
                adjustedResponse.body["squadronName"] = jsonResponse["commanderWing"]["wingName"];
                adjustedResponse.body["squadronRank"] = jsonResponse["commanderWing"]["wingMemberRank"];
                adjustedResponse.body["squadronURL"] = jsonResponse["commanderWing"]["inaraURL"];
            }
            return adjustedResponse;
        });
        
        return inaraLup;
    }
}