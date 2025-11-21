import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  // 【关键】如果你的 GitHub 仓库名是 civ-game，这里就填 /civ-game/
  // 必须前后都有斜杠
  base: '/civ-game/', 
})