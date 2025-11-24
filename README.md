# Quantum Matrix

Jogo match‑3 sci‑fi construído com `TypeScript`, `Vite` e `Pixi.js`. Troque peças, crie combinações e acione especiais com efeitos visuais e sonoros.

## Stack
- Motor gráfico: `pixi.js` (`src/board.ts`, `src/particles.ts`, `src/sound.ts`)
- Build/dev: `vite` (`vite.config.ts`)
- Linguagem: `TypeScript` (`tsconfig.json`)

## Desenvolvimento
- Instalar dependências: `npm ci`
- Rodar em dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Build: `npm run build`

## Deploy
- Script: `npm run deploy` (executa `bash deploy/deploy.sh`)
- Padrão: publica `dist/` via `scp` para `debian@fbmac.net:/home/debian/quantum-matrix/`
- Variáveis:
  - `REMOTE_DIR`: sobrescreve diretório remoto. Ex.: `REMOTE_DIR=/var/www/quantum-matrix npm run deploy`

## Estrutura
- `index.html`: container do jogo, inclui `src/main.ts`, metas e favicons
- `public/`: favicons e assets estáticos copiados para `dist/`
- `assets/images/`: sprites de peças e fundo
- `src/assets.ts`: registro e carregamento de assets
- `src/main.ts`: boot, layout, i18n simples e HUD de pontuação
- `src/board.ts`: lógica principal de grid, match, especiais e efeitos
- `src/particles.ts`: sistema de partículas (burst, spark, ring, trilhas)
- `src/sound.ts`: efeitos sonoros; desbloqueio de `AudioContext` por interação do usuário
- `deploy/`: script de deploy e unidade systemd

## Observações
- Favicons: gerados por `tools/gen-favicon.js` e servidos via `public/` (`index.html:34`, `index.html:41`).
- `vite preview` serve a build estática em produção; para Nginx/Apache, basta apontar o root para `dist/` e omitir o service.
- Portas/host podem ser ajustados em `deploy/systemd/quantum-matrix.service`.
