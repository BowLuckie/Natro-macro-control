const { Command } = require("reconlx");
const ee = require('../../settings/embed.json')
let config;
try {
    config = require('../../settings/config.local.json');
} catch (e) {
    config = require('../../settings/config.json');
}

module.exports = new Command({
    // options
    name: '',
    description: ``,
    userPermissions: [],
    category : "",
    // command start
    run: async ({ client, interaction, args }) => {
        // Code
    }
})