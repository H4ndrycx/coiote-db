#!/usr/bin/env node
process.env.TZ = 'UTC';
const path = require('path');

const yargs = require('yargs');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs');

const logger = require('./logger');

const taskPath = path.resolve(__dirname, 'tasks/');
const taskDir = fs.readdirSync(taskPath).filter((pt) => pt[0] !== '.');

const tasks = {};
for (const taskName of taskDir) {
    tasks[taskName.replace('.js', '')] = require(`${taskPath}/${taskName}`);
}

const args = yargs
    .command('$0 [options]', 'Run tasks.', (parse) => {
        parse.usage('Usage: ./$0 [options...]');

        for (const taskName in tasks) {
            parse.option(taskName, {
                describe: `Runs ${taskName}`,
                type: 'boolean',
                default: false
            });
        }
    }).argv;

const app = {
    debug: args.debug,
};

logger.debug = (...params) => {
    if (!app.debug) { return; }
    logger.info(...params);
};
app.logger = logger;

(async function cli() {
    for (const key in args) {
        if (!args[key]) { continue; }
        if (key === '_' || key === '$0') { continue; }

        if (tasks[key]) {
            console.log(chalk.yellow(figlet.textSync('CoioteDB')));
            return tasks[key](args, app);
        }
    }

    return tasks['run-sql'](args, app);
}());

