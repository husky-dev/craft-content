const esbuild = require('esbuild');
const package = require('./package.json');

const cwd = process.cwd();
const srcPath = `${cwd}/src`;
const distPath = `${cwd}/dist`;

// Utils

const log = {
  trace: (...args) => console.log('[*]:', ...args),
  debug: (...args) => console.log('[-]:', ...args),
  info: (...args) => console.log('[+]:', ...args),
  err: (...args) => console.error(...args),
};

// Main

const run = async () => {
  log.info('bundle js');
  await esbuild.build({
    platform: 'node',
    target: 'node16',
    entryPoints: [`${srcPath}/index.ts`],
    outfile: `${distPath}/index.js`,
    bundle: true,
    sourcemap: false,
    minify: true,
    banner: {
      'js': '#!/usr/bin/env node',
    },
    define: {
      VERSION: JSON.stringify(package.version),
      DESCRIPTION: JSON.stringify(package.description),
    },
  });
  log.info('bundle js done');
}

run().catch(err => {
  log.err(err);
  process.exit(1);
});
