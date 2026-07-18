import { defineConfig } from 'vitest/config'

// Config isolada dos plugins do app (React/Tailwind/PWA): os testes cobrem
// lógica pura de domínio e rodam em ambiente Node.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
