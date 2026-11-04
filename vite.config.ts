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
  build: {
    // 데스크톱 앱이라 번들을 로컬 디스크에서 읽는다. Three.js가 든 메인 청크(약 900KB)는 문제가 되지 않는다.
    chunkSizeWarningLimit: 1200,
  },
})
