const endpoint = require("../endpoint");

module.exports = {
	name: 'rateLimit',
	once: false,
	async execute(info) {
    var message = `Rate limit hit: ${info.method} on path ${info.path}, route: ${info.path} with ${info.timeDifference ? info.timeDifference : info.timeout ? info.timeout: 'Unknown timeout '}`;
    endpoint.send(message, process.env.AUDIT_ENDPOINT);
    console.log(message);
  },
};