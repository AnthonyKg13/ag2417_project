import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  build: {
    sourcemap: true,
  },
  server: {
    host: true,
    port: 3015
    //hmr:{
    //  port: 5174
    //}
  }
})