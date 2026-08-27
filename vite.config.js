import { defineConfig } from 'vite';

// GitHub Pages serves project sites from /<repo>/, so assets need that prefix.
// Override with BASE_PATH=/ for a custom domain or a user/org page.
const base = process.env.BASE_PATH ?? '/BeforeTheFloods/';

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
