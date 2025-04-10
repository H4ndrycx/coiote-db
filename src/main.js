#!/usr/bin/env node

const fs = require('fs');
const QueryRunner = require('./query-runner');
const logger = require('./logger');

const debug = process.env.DEBUG;

const _info = logger.info;
logger.info = (...args) => {
    if (!debug) { return; }
    _info(...args);
};

const _error = logger.error;
logger.error = (...args) => {
    if (!debug) { return; }
    _error(...args);
};

async function processInput(queryLines, width) {
    try {
        logger.info(`Processing ${queryLines.length} lines of input`);
        const queryRunner = new QueryRunner(queryLines, width);

        const results = await queryRunner.results();

        console.log(results.join('\n'));
        process.exit(0);
    } catch (error) {
        logger.error('Error processing input:', error.message);
        process.exit(1);
    }
}

async function main() {
    logger.info('Starting script...');

    const width = process.stdout.columns || 80;

    let stdinData = '';
    let stdinTimeout;

    if (process.argv.length >= 3) {
        logger.info(`Trying to use file: ${process.argv[2]}`);
        const filePath = process.argv[2];

        try {
            if (!fs.existsSync(filePath)) {
                logger.error(`Error: File '${filePath}' does not exist`);
                process.exit(1);
            }

            const fileContent = fs.readFileSync(filePath, 'utf8');
            const queryLines = fileContent.split('\n');
            await processInput(queryLines, width);
            return;
        } catch (error) {
            logger.error(`Error reading file: ${error.message}`);
            process.exit(1);
        }
    }

    logger.info('Checking for piped input...');

    try {
        stdinTimeout = setTimeout(() => {
            console.log('No input detected. Usage:');
            console.log('./main.js <file_path>');
            console.log('cat file.sql | ./main.js');
            process.exit(0);
        }, 100);

        process.stdin.on('data', (chunk) => {
            stdinData += chunk;
            if (stdinTimeout) {
                clearTimeout(stdinTimeout);
                stdinTimeout = null;
            }
        });

        process.stdin.on('end', async () => {
            if (stdinTimeout) {
                clearTimeout(stdinTimeout);
            }

            if (stdinData) {
                logger.info(`Read ${stdinData.length} characters from stdin`);
                const queryLines = stdinData.split('\n');
                await processInput(queryLines, width);
            } else {
                logger.error('No input received');
                process.exit(1);
            }
        });

        process.stdin.resume();
    } catch (error) {
        logger.error(`Error with stdin: ${error.message}`);
        process.exit(1);
    }
}

main();
