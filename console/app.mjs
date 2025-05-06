#!/usr/bin/env node
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import figlet from 'figlet';
import fs from 'fs';
import url from 'url';

import logger from './core/logger.mjs';

process.env.TZ = 'UTC';

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const taskPath = path.resolve(__dirname, 'tasks/');
const tasksDir = fs.readdirSync(taskPath).filter((pt) => pt[0] !== '.');

const tasks = {};
for (const taskName of tasksDir) {
    const module = await import(`${taskPath}/${taskName}`);
    tasks[taskName.replace('.mjs', '')] =  module.default || module;
}

const args = yargs()
    .command('$0 [options]', 'Run tasks.', (parse) => {
        parse.usage('Usage: ./$0 [options...]');

        for (const taskName in tasks) {
            parse.option(taskName, {
                describe: `Runs ${taskName}`,
                type: 'boolean',
                default: false
            });
        }
    }).parse(hideBin(process.argv));

const app = {
    debug: args.debug
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

