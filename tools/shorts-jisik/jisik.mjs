// 전기지식 채널 쇼츠 생성기 (노랑 강조 + 전용 글씨체)
// 사용법: node jisik.mjs <spec.json> <출력폴더> [--font A|B|C] [--audio 음성.mp3] [--no-video]
// 마크업: {y:글자} = 노랑 강조 (검정 배경에선 노랑 글씨, 크림 패널에선 노랑 형광펜)
//        **글자** 도 노랑으로 처리한다 (예전 빨강 spec을 그대로 넣어도 노랑이 되도록)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');

const argv = process.argv.slice(2);
const [specPath, outDir] = argv;
if (!specPath || !outDir) { console.error('usage: node jisik.mjs <spec.json> <outdir> [--font A|B|C] [--audio f] [--no-video]'); process.exit(1); }
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const FONTS = {  // [제목, 본문]
  A: ["'Black Han Sans'", "'Do Hyeon'"],
  B: ["'Black Han Sans'", "'Jua'"],
  C: ["'Do Hyeon'", "'Nanum Gothic'"],
};
const font = FONTS[opt('--font', spec.font ?? 'A')];
const audio = opt('--audio', null);
const fps = 30;
mkdirSync(outDir, { recursive: true });

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const markup = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="y">$1</span>')
  .replace(/\{[yr]:(.+?)\}/g, '<span class="y">$1</span>').replace(/\n/g, '<br>');

const gap = spec.scene_gap ?? 3.2;
const tTitle = spec.top.map((_, i) => 0.15 + 0.4 * i);
const tPanel = tTitle.at(-1) + 0.6;
const tScene = spec.scenes.map((_, i) => tPanel + 0.4 + gap * i);
let duration = Math.max(tScene.at(-1) + (spec.last_hold ?? 3.5), spec.duration ?? 0);
if (audio) {
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(spawnSync('ffmpeg', ['-hide_banner', '-i', audio], { encoding: 'utf8' }).stderr);
  duration = Math.max(duration, m[1] * 3600 + m[2] * 60 + Number(m[3]) + 0.3);
}
const swap = (i, el) => {
  const a = [`pop .45s cubic-bezier(.2,.8,.2,1) ${tScene[i].toFixed(2)}s both`];
  if (i < tScene.length - 1) a.push(`fadeout .25s ease-in ${(tScene[i + 1] - 0.2).toFixed(2)}s forwards`);
  return `<div class="${el}" style="animation:${a.join(',')}">`;
};
const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'template.html'), 'utf8')
  .replace('__TITLE_FONT__', font[0]).replace('__BODY_FONT__', font[1])
  .replace('__TOP__', spec.top.map((l, i) => `<div style="animation:pop .45s cubic-bezier(.2,.8,.2,1) ${tTitle[i].toFixed(2)}s both">${markup(l)}</div>`).join(''))
  .replaceAll('__PANEL_T__', tPanel.toFixed(2))
  .replace('__SCENES__', spec.scenes.map((s, i) => `${swap(i, 'scene')}<div>${markup(s.text)}</div></div>`).join(''))
  .replace('__SUBS__', spec.scenes.map((s, i) => `${swap(i, 'sub')}<span>${markup(s.sub ?? '')}</span></div>`).join(''))
  .replace('__BRAND__', esc(spec.brand ?? '전기지식'));
writeFileSync(join(outDir, 'page.html'), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
const seek = t => page.evaluate(ms => document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; }), t * 1000);

// 장면마다 정지 화면 1장 + 썸네일(첫 장면)
for (let i = 0; i < tScene.length; i++) { await seek(tScene[i] + 1.0); await page.screenshot({ path: join(outDir, `scene${i + 1}.png`) }); }
await seek(tScene[0] + 1.0); await page.screenshot({ path: join(outDir, 'thumbnail.png') });

if (!argv.includes('--no-video')) {
  const active = await page.evaluate(() => document.getAnimations().map(a => { const t = a.effect.getComputedTiming(); return [t.delay / 1000, (t.delay + t.activeDuration) / 1000]; }));
  const moving = t => active.some(([s, e]) => t >= s - 0.001 && t <= e + 1 / 60);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (audio) args.push('-i', audio, '-c:a', 'aac', '-b:a', '192k');
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', duration.toFixed(2), '-movflags', '+faststart', join(outDir, 'shorts.mp4'));
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, no) => ff.on('close', c => (c === 0 ? ok() : no(new Error('ffmpeg ' + c)))));
  let last = null;
  for (let f = 0; f < Math.ceil(duration * fps); f++) {
    const t = f / fps;
    if (!last || moving(t)) { await seek(t); last = await page.screenshot({ type: 'png' }); }
    if (!ff.stdin.write(last)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await done;
}
await browser.close();
console.log(JSON.stringify({ out: resolve(outDir), duration: +duration.toFixed(2), scenes: tScene.map(t => +t.toFixed(2)) }));
