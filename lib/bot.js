import mineflayer from 'mineflayer';
import { mineflayer as mineflayerViewer } from 'prismarine-viewer';
import {print} from "./globals.js";
import chalk from 'chalk';
import { EventEmitter } from 'node:events';
import * as wordlist from './wordlist.js';

export default class Bot {
    bot;
    connected;

    username;
    password;
    authentication = 'microsoft';

    needsToJoinLobby = true;

    wordsToGuess = [];
    wordsAlreadyGuessed = [];
    lastGuess = Date.now();
    startGuessing = false

    eventEmitter = new EventEmitter();

    say(text) {
        if (!this.connected) return;
        this.bot.chat(text);
    }

    run(command) {
        if (!this.connected) return;
        this.bot.chat('/' + command);
    }

    join() {
        if (this.connected) return;
        const {
            username
        } = this;

        this.bot = mineflayer.createBot({
            host: 'mc.hypixel.net',
            port: 25565,
            version: '1.8.9',

            username,
            auth: 'microsoft',
        });

        const {bot} = this;
        bot.once('spawn', async () => {
            const port = Math.round(Math.random() * (3000 - 2000) + 2000);
            mineflayerViewer(bot, {
                port: port, firstPerson: true
            });

            this.eventEmitter.emit('spawn', port);

            await new Promise((resolve) => setTimeout(resolve, 5000));
            if (this.needsToJoinLobby)
                this.run('play build_battle_guess_the_build')
        })

        bot.once('login', () => {
            print('Logged in successfully as', bot.username);

            this.connected = true;
            this.eventEmitter.emit('login');
        })

        bot.on('login', async () => {
            print(chalk.gray('[DEBUG] World changed'));

            // move forward for a few seconds to not get marked as afk
            bot.setControlState('forward', true);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            bot.setControlState('forward', false);
        })

        bot.on('message', (json, _type) => {
            const completeMessage = json.toString().trim();
            if (!completeMessage) return;
            print(chalk.blue('[CHAT]'), completeMessage);

            if (completeMessage === 'To leave Build Battle, type /lobby') {
                this.needsToJoinLobby = false;
            }

            this.eventEmitter.emit('message', completeMessage);
        })

        bot.on('actionBar', (bar) => {
            const barMessage = bar.toString().trim();
            if (!barMessage) return;

            this.eventEmitter.emit('actionbar', barMessage);
            print(chalk.blue('[ACTION BAR]'), barMessage);

            if (barMessage.includes('The theme is ')) {
                const hint = barMessage.replace('The theme is ', '');
                if (!hint.includes('_')) {
                    this.startGuessing = false;
                    return;
                }

                if (!this.startGuessing) {
                    this.wordsAlreadyGuessed = [];
                    this.wordsToGuess = [];
                }
                this.startGuessing = true;

                const matchingWords = wordlist.find(hint);
                this.wordsToGuess = matchingWords.filter(word => !this.wordsAlreadyGuessed.includes(word));
            }

            if (this.lastGuess + 100 + (3 * 1000) < Date.now()) {
                if (!this.startGuessing) return;
                const word = this.wordsToGuess.shift();
                if (!word) return;
                this.wordsAlreadyGuessed.push(word);

                print(chalk.yellowBright('[GUESSING]'), word, `(${this.wordsToGuess.length} left)`);

                this.say(word.toLowerCase());
                this.lastGuess = Date.now();
            }
        })

        bot.on('kicked', (reason) => {
            this.connected = false;
            print('Kicked for', reason.toString().trim());
        })

        bot.on('error', (error) => {
            this.connected = false;
            console.error(error);
        })

        bot.on('end', () => {
            this.connected = false;
            print('Disconnected');

            this.bot = null;
        });

        return this.eventEmitter;
    }

    constructor(username) {
        this.username = username;
    }
}
