import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../../packages/react/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: react } = await import(require.resolve('@vitejs/plugin-react'));
const { workspaceAliases } = await import(
  new URL('../../packages/react/aliases.ts', import.meta.url).href
);
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../../', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      ...workspaceAliases,
      {
        find: '@fontsource/roboto',
        replacement: fileURLToPath(
          new URL('../../packages/react/node_modules/@fontsource/roboto', import.meta.url),
        ),
      },
      {
        find: 'react',
        replacement: fileURLToPath(
          new URL('../../packages/react/node_modules/react', import.meta.url),
        ),
      },
      {
        find: 'react-dom',
        replacement: fileURLToPath(
          new URL('../../packages/react/node_modules/react-dom', import.meta.url),
        ),
      },
    ],
  },
  server: { host: '127.0.0.1', port: 6007, strictPort: true },
});
await server.listen();
console.log('README artwork: http://localhost:6007/docs/brand/');
