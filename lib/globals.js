import chalk from 'chalk';

export const print = (...args) => {
    console.log(chalk.yellow(`[${new Date().toLocaleTimeString()}]`), ...args);
}
