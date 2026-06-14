import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the app from /<repo-name>/, so assets need that base.
// Local dev (npm run dev) is unaffected — `base` only applies to the build output.
export default defineConfig({
  plugins: [react()],
  base: '/aisha-wellness-app/',
})
