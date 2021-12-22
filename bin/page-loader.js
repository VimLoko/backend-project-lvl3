#!/usr/bin/env node
import program from 'commander';
import loadPage from '../src/index.js';

program
  .version('1.0.0')
  .option('-o, --output [path]', 'output dir', process.cwd())
  .arguments('<url>')
  .description('Page loader utility')
  .action((pageUrl, options) => {
    loadPage(pageUrl, options.output)
      .then((outputDir) => console.log(`${outputDir}`))
      .catch(({ message }) => {
        console.error(message);
        process.exit(1);
      });
  })
  .parse(process.argv);
