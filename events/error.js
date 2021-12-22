module.exports = {
	name: 'error',
	once: false,
	execute(msg) {
		console.error(`[Error] ${msg}`);
	},
};