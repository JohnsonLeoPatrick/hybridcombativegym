import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const options = {
  absWorkingDir: root,
  entryPoints: ['src/start-folders/index.jsx'],
  outfile: 'js/generated/start-folders.js',
  bundle: true,
  jsx: 'automatic',
  minify: true,
  format: 'iife',
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'external',
  logLevel: 'info'
};
if (process.argv.includes('--dev')) {
  const context = await esbuild.context(options);
  await context.watch();
  try {
    const { port } = await context.serve({ servedir: root, host: '127.0.0.1', port: Number(process.env.PORT || 3000) });
    console.log('Hybrid Gym: http://localhost:' + port + ' — refresh after editing.');
  } catch (error) {
    await context.dispose();
    console.error('Could not start the server. Stop the previous server with Ctrl+C, then run npm run dev again.');
    process.exitCode = 1;
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await context.dispose(); process.exit(0); });
} else {
  await esbuild.build(options);
}
