import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // 🟢 PWA 플러그인 임포트

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 🟢 PWA 설정 추가
    VitePWA({
      registerType: 'autoUpdate', // 서비스 워커 자동 업데이트
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'], // 캐싱할 정적 자산
      manifest: {
        name: 'Fire-Sight: 소방시설관리사',
        short_name: 'FireSight',
        description: '소방시설관리사 2차 실기 완벽 대비 앱',
        theme_color: '#0f172a', // 앱 테마 색상 (Dark Slate)
        background_color: '#0f172a', // 실행 시 배경색
        display: 'standalone', // 🟢 핵심: 아이패드에서 주소창 없이 일반 앱처럼 실행됨
        orientation: 'any', // 화면 회전 허용
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // 안드로이드 아이콘 최적화용
          }
        ]
      },
      // 개발 환경에서도 PWA 작동 여부를 확인하고 싶다면 아래 주석 해제
      // devOptions: { enabled: true }
    })
  ],

  // 🔴 기존 Gemini 프록시 설정 그대로 유지
  server: {
    proxy: {
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        secure: false,
      },
    },
  },
})