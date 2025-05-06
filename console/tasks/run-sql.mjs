import fs from 'fs';
import QueryRunner from '../core/query-runner.mjs';

async function processInput(params) {
    const { app, queryLines, width } = params;
    try {
        const start = new Date();
        app.logger.debug(`Processing ${queryLines.length} lines of input`);
        const queryRunner = new QueryRunner(queryLines, width);

        const results = await queryRunner.results();

        console.log(results.join('\n'));
        app.logger.debug(`Elapsed time: ${new Date() - start}ms`);
        process.exit(0);
    } catch (error) {
        app.logger.error('Error processing input:', error.message);
        process.exit(1);
    }
}

export default async function runSql(opts = {}, app) {
    app.logger.debug('Starting script...');
    const width = process.stdout.columns || 80;

    let stdinData = '';
    let stdinTimeout;

    if (opts.f) {
        app.logger.debug(`Trying to use file: ${process.argv[2]}`);
        const filePath = opts.f;

        try {
            if (!fs.existsSync(filePath)) {
                app.logger.error(`Error: File '${filePath}' does not exist`);
                process.exit(1);
            }

            const fileContent = fs.readFileSync(filePath, 'utf8');
            const queryLines = fileContent.split('\n');
            await processInput({ queryLines, width, app });
            return;
        } catch (error) {
            app.logger.error(`Error reading file: ${error.message}`);
            process.exit(1);
        }
    }

    app.logger.debug('Checking for piped input...');

    try {
        stdinTimeout = setTimeout(() => {
            console.log('No input detected. Usage:');
            console.log('ctdb <file_path>');
            console.log('cat file.sql | ctdb');
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
                app.logger.debug(`Read ${stdinData.length} characters from stdin`);
                const queryLines = stdinData.split('\n');
                await processInput({ queryLines, width, app });
            } else {
                app.logger.error('No input received');
                process.exit(1);
            }
        });

        process.stdin.resume();
    } catch (error) {
        app.logger.error(`Error with stdin: ${error.message}`);
        process.exit(1);
    }
};
