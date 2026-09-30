// version v1.0
/* Optional maintainer task; the checked-in bundle is all the app needs. */
'use strict';
const { join, dirname, resolve } = require('node:path');
const { copyFileSync } = require('node:fs');
const esbuild = require('esbuild');
const three = require('three');
if (three.REVISION !== '180') throw new Error('Use three@0.180.0 to reproduce the vendored bundle.');
const root = resolve(__dirname, '..');
esbuild.buildSync({
  entryPoints: [join(root, 'vendor/three-entry.mjs')],
  bundle: true, minify: true, format: 'iife', globalName: 'TramThree',
  outfile: join(root, 'vendor/three-r180.min.js'), target: ['es2020'], legalComments: 'eof',
  nodePaths: process.env.NODE_PATH ? [process.env.NODE_PATH] : [],
  banner: { js: '/*! Three.js r180 (0.180.0) — MIT license: see vendor/THREE-LICENSE.txt */' },
});
copyFileSync(join(dirname(require.resolve('three')), '../LICENSE'), join(root, 'vendor/THREE-LICENSE.txt'));
console.log('Built vendor/three-r180.min.js (Three.js 0.180.0, MIT).');
