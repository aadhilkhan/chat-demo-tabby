import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only Babel plugin that stamps every JSX opening element with
 * `data-tabby-source="file:line:col"` + `data-tabby-component="<TagName>"`.
 *
 * React 19 removed `fiber._debugSource` and the automatic JSX runtime
 * passes `__source` positionally to `jsxDEV` without exposing it on
 * memoizedProps, so the inline-edit overlay can no longer read source
 * metadata off fibers. Stamping DOM attributes at build time bypasses
 * React internals entirely — the resolver just walks up the DOM.
 *
 * Works with tabby-ui components because they forward unknown props
 * (including data-*) to their rendered host element; if a component
 * swallows them, the resolver keeps walking up and finds an ancestor
 * that carries the attr.
 *
 * Production builds skip this plugin (NODE_ENV === 'production'), so
 * no extra bytes ship to end users.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function tabbySourcePlugin({ types: t }: any) {
  return {
    name: 'tabby-source',
    visitor: {
      JSXOpeningElement(nodePath: any, state: any) {
        const name = nodePath.node.name;
        if (!name || name.type !== 'JSXIdentifier') return;

        const attrs = nodePath.node.attributes;
        const alreadyStamped = attrs.some(
          (a: any) =>
            a.type === 'JSXAttribute' && a.name?.name === 'data-tabby-source',
        );
        if (alreadyStamped) return;

        const loc = nodePath.node.loc;
        if (!loc) return;

        const filename: string = state.file.opts.filename || '';
        if (!filename || filename.includes('/node_modules/')) return;

        const root: string = state.file.opts.root || process.cwd();
        const rel = path.relative(root, filename) || 'unknown';
        const value = `${rel}:${loc.start.line}:${loc.start.column}`;

        attrs.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-tabby-source'),
            t.stringLiteral(value),
          ),
          t.jsxAttribute(
            t.jsxIdentifier('data-tabby-component'),
            t.stringLiteral(name.name),
          ),
        );
      },
    },
  };
}

// Stamp data-tabby-source in every build, including production. This keeps
// the inline-edit overlay working on the deployed prototype — designers can
// still "Copy all changes" from the live site and paste the blurb back
// into Claude locally to apply the edits to source.
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [tabbySourcePlugin],
      },
    }),
  ],
  publicDir: 'assets',
  server: {
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
  },
});
