// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import {terser} from "rollup-plugin-terser";
import path from "path";

import pkg from './package.json';

//
// Commons Settings
//
const input = 'src/index.ts';

const plugins = [
  resolve(),
  commonjs(),
  typescript()
];

const moduleName = "MutationSummary";
const format = "umd";

export default [{
  input,
  plugins,
  output: [
    {
      name: moduleName,
      file: pkg.browser,
      format,
      sourcemap: true
    }
  ]
}, {
  input,
  plugins: [...plugins, terser()],
  output: [
    {
      name: moduleName,
      file: `${path.dirname(pkg.browser)}/${path.basename(pkg.browser, ".js")}.min.js`,
      format,
      sourcemap: true
    }
  ]
}];