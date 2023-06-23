import Bot from './lib/bot.js';
import {print} from './lib/globals.js';

const args = process.argv.slice(2);

if (args.length < 1) {
    print(`Usage: node index.js <email>`);
    process.exit(1);
}

const email = args[0];

new Bot(
    email
).join();
