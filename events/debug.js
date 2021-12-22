module.exports = {
	name: 'debug',
	once: false,
	execute(msg) {
		console.log(`[Debug] ${msg}`);
	},
};