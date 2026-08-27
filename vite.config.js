import { defineConfig } from 'vite';

// Deploying to Vercel, which serves from the domain root. Override with
// BASE_PATH=/BeforeTheFloods/ if this ever moves to a GitHub Pages project
// page instead, where assets need that prefix.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // d3 is ~280 kB; keeping it in its own chunk lets the shell paint first.
        manualChunks: { d3: ['d3'] },
      },
    },
  },
  server: { open: true },
});
