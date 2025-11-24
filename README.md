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
- Comando: `npm run deploy` (executa `node deploy/deploy.js`)
- Padrão: publica `dist/` via `scp` para `debian@fbmac.net:/home/debian/quantum-matrix/`
- Variáveis de ambiente:
  - `REMOTE`: usuário/host remoto. Ex.: `REMOTE=debian@fbmac.net npm run deploy`
  - `REMOTE_DIR`: diretório remoto. Ex.: `REMOTE_DIR=/var/www/quantum-matrix npm run deploy`
  - `SSH_BIN`/`SCP_BIN`: caminho explícito dos binários em Windows (opcional). Ex.: `SCP_BIN="C:\\Windows\\System32\\OpenSSH\\scp.exe"`
- Windows: requer OpenSSH Client no PATH (ou Git for Windows). Se ausente, o script tenta fallback via WSL.

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
- Imagens: `src/assets.ts` usa `new URL(..., import.meta.url).href` para incluir PNGs na build; os arquivos ficam em `dist/assets/`.
- Sons: gerados por síntese via Web Audio API; não há arquivos de áudio no deploy.
- Serviço: `vite preview` serve a build estática; para Nginx/Apache, aponte o root para `dist/` e omita o service. Portas/host configuráveis em `deploy/systemd/quantum-matrix.service`.
