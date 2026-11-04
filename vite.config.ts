import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri가 devUrl(5173)로 접속하므로 다른 포트로 밀려나지 않게 한다.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Rust 빌드 산출물(src-tauri/target)까지 감시하면 빌드 중 잠긴 파일 때문에 EBUSY 오류가 쏟아진다.
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
