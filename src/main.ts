import { Application, Container, Sprite } from 'pixi.js';
import { loadAssets, textures } from './assets';
import { Board } from './board';
import { Particles } from './particles';
import { Sound } from './sound';

const gameRoot = document.getElementById('game')!;
const app = new Application({ resizeTo: gameRoot, backgroundAlpha: 0, antialias: true });
gameRoot.appendChild(app.view as HTMLCanvasElement);

const sound = new Sound();
const particles = new Particles(app);
app.stage.sortableChildren = true;
const scene = new Container();
scene.sortableChildren = true;
app.stage.addChild(scene);

let bgSprite: Sprite | null = null;
let board: Board | null = null;
let score = 0;
const scoreEl = document.getElementById('score')!;
const scoreLabelEl = document.getElementById('score-label')!;

const i18n: Record<string, Record<string,string>> = {
  en: { score: 'Score' },
  pt: { score: 'Pontuação' },
  es: { score: 'Puntuación' },
  fr: { score: 'Score' },
  de: { score: 'Punktestand' },
  it: { score: 'Punteggio' },
  ru: { score: 'Счёт' },
  ja: { score: 'スコア' },
  ko: { score: '점수' },
  zh: { score: '得分' },
  'zh-TW': { score: '分數' },
  ar: { score: 'النتيجة' },
  hi: { score: 'स्कोर' }
};
function t(key: string) {
  const lang = navigator.language.toLowerCase();
  const base = lang.split('-')[0];
  const dict = i18n[lang] || i18n[base] || i18n.en;
  return dict[key] || i18n.en[key] || key;
}

function addScore(v: number) { score += v; scoreEl.textContent = String(score); }
function shake(intensity: number, time: number) { const start = performance.now(); const r = () => (Math.random()*2-1)*intensity; const tick = () => { const t = performance.now()-start; if (t < time) { app.stage.x = r(); app.stage.y = r(); requestAnimationFrame(tick); } else { app.stage.x = 0; app.stage.y = 0; } }; tick(); }

async function boot() {
  await loadAssets();
  bgSprite = new Sprite(textures.background);
  bgSprite.anchor.set(0.5);
  bgSprite.position.set(app.renderer.width/2, app.renderer.height/2);
  const scaleX = app.renderer.width / bgSprite.texture.width;
  const scaleY = app.renderer.height / bgSprite.texture.height;
  bgSprite.scale.set(Math.max(scaleX, scaleY)); bgSprite.alpha = 0.5;
  scene.addChild(bgSprite);
  board = new Board({ app, scene, particles, sound, addScore, shake });
  await board.init();
  scoreLabelEl.textContent = t('score');
}


let resizeTimer: number | null = null;
function relayout() {
  if (!bgSprite || !board) return;
  const w = gameRoot.clientWidth, h = gameRoot.clientHeight;
  app.renderer.resize(w, h);
  bgSprite.position.set(app.renderer.width/2, app.renderer.height/2);
  const scaleX = app.renderer.width / bgSprite.texture.width;
  const scaleY = app.renderer.height / bgSprite.texture.height;
  bgSprite.scale.set(Math.max(scaleX, scaleY));
  board.layout();
}
function scheduleRelayout() {
  if (resizeTimer !== null) return;
  resizeTimer = window.setTimeout(() => { resizeTimer = null; relayout(); }, 0);
}
window.addEventListener('resize', scheduleRelayout);
window.addEventListener('orientationchange', scheduleRelayout);
document.addEventListener('visibilitychange', scheduleRelayout);
document.addEventListener('fullscreenchange', scheduleRelayout);

boot();
