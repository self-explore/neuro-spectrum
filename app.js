/* ============================================================
   神经多样性光谱 · 逻辑层
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let idx = 0;
let answers = new Array(ND_QS.length).fill(null);
let cur = null;

/* ---------------- 分页 ---------------- */
function showPage(name) {
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'pg-' + name));
  window.scrollTo(0, 0);
}

/* ---------------- 渲染题目 ---------------- */
function renderQ() {
  const q = ND_QS[idx];
  // 每个选项带原始档位（0-3），展示顺序固定打乱
  const opts = ndShuffle([0, 1, 2, 3], idx + 3).map(lvl => ({ lvl, t: q.o[lvl] }));

  $('#q-idx').textContent = String(idx + 1).padStart(2, '0');
  $('#q-total').textContent = '/ ' + ND_QS.length;
  $('#q-bar').style.width = (idx / ND_QS.length * 100) + '%';
  $('#q-text').textContent = q.q;
  $('#q-opts').innerHTML = opts.map((o, i) => {
    const on = answers[idx] === o.lvl ? ' on' : '';
    return `<button class="opt${on}" data-lvl="${o.lvl}">
      <span class="ok">${'ABCD'[i]}</span>
      <span class="ot">${o.t}</span>
    </button>`;
  }).join('');

  $$('#q-opts .opt').forEach(b => {
    b.addEventListener('click', () => pick(Number(b.dataset.lvl)));
  });
  $('#btn-back').style.visibility = idx === 0 ? 'hidden' : 'visible';
}

function pick(lvl) {
  answers[idx] = lvl;
  $$('#q-opts .opt').forEach(b => b.classList.toggle('on', Number(b.dataset.lvl) === lvl));
  setTimeout(() => {
    if (idx < ND_QS.length - 1) { idx++; renderQ(); }
    else finish();
  }, 180);
}

function finish() {
  showPage('loading');
  const steps = ['读取你的作答轨迹', '测算七维大脑光谱', '比对你的光谱形状', '生成你的运作说明'];
  steps.forEach((t, i) => {
    setTimeout(() => {
      const el = $('#ld-step');
      if (el) el.textContent = t;
      $$('.ld-dot').forEach((d, j) => d.classList.toggle('on', j <= i));
    }, i * 620);
  });
  setTimeout(() => { cur = compute(); renderResult(); showPage('result'); }, steps.length * 620 + 320);
}

/* ---------------- 计算 ---------------- */
function compute() {
  const vals = {};
  ND_DIMS.forEach(d => {
    const lvls = [];
    ND_QS.forEach((q, i) => { if (q.d === d.k && answers[i] !== null) lvls.push(answers[i]); });
    const sum = lvls.reduce((a, b) => a + b, 0);
    vals[d.k] = lvls.length ? Math.round(sum / (lvls.length * 3) * 100) : 50;
  });
  return assemble(vals);
}

function assemble(vals) {
  const dims = ND_DIMS.map(d => ({ ...d, val: vals[d.k], tier: ndTier(vals[d.k]) }));
  const ranked = [...dims].sort((a, b) => b.val - a.val);
  const top = ranked[0];
  const typeKey = ndPickType(dims);
  const type = ND_TYPE_MAP[typeKey];
  const barnum = buildBarnum(dims, ranked, type);
  return { dims, ranked, top, type, barnum };
}

/* ---------------- 巴纳姆板块：说中你的那几句话 ---------------- */
function buildBarnum(dims, ranked, type) {
  const items = [];
  const top = ranked[0];
  const seed = dims.reduce((a, d) => a + d.val * 7 + d.k.charCodeAt(0), 0);

  // 1) 数据证据句
  if (top.val >= 55) {
    items.push(`七个维度里，你的「${top.label}」读数最高（${top.val}）——${ND_DATA_TAIL[top.k]}`);
  } else {
    items.push(`你的光谱整体落在中段，最高的一项「${top.label}」也有 ${top.val}——大面积均衡，本身就是少数派。`);
  }

  // 2-4) 类型专属句 ×3（确定性抽取，同一作答结果稳定）
  ndShuffle(type.barnum, seed).slice(0, 3).forEach(s => items.push(s));

  // 5-6) 档位共性句 ×2
  const hiN = dims.filter(d => d.val >= 70).length;
  const pool = hiN >= 3 ? ND_TIER_POOL.hi : ND_TIER_POOL.mid;
  ndShuffle(pool, seed + 11).slice(0, 2).forEach(s => items.push(s));

  return items;
}

/* ---------------- 雷达图（七轴） ---------------- */
function radarSVG(dims) {
  const cx = 200, cy = 172, R = 100, N = dims.length;
  const ang = i => (-90 + i * 360 / N) * Math.PI / 180;
  let s = `<svg viewBox="0 0 400 350" class="radar" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#B5543B" stop-opacity=".20"/>
    <stop offset="100%" stop-color="#E9A35C" stop-opacity=".10"/></linearGradient></defs>`;

  [0.25, 0.5, 0.75, 1].forEach(rr => {
    const p = [];
    for (let i = 0; i < N; i++) {
      const a = ang(i);
      p.push((cx + R * rr * Math.cos(a)).toFixed(1) + ',' + (cy + R * rr * Math.sin(a)).toFixed(1));
    }
    s += `<polygon points="${p.join(' ')}" fill="none" stroke="#E0D8C4" stroke-width="1"/>`;
  });
  for (let i = 0; i < N; i++) {
    const a = ang(i);
    s += `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(a)).toFixed(1)}" y2="${(cy + R * Math.sin(a)).toFixed(1)}" stroke="#E0D8C4" stroke-width="1"/>`;
  }

  const pts = [];
  dims.forEach((d, i) => {
    const rr = Math.max(0.16, Math.min(1, d.val / 100));
    const a = ang(i);
    pts.push((cx + R * rr * Math.cos(a)).toFixed(1) + ',' + (cy + R * rr * Math.sin(a)).toFixed(1));
  });
  s += `<polygon points="${pts.join(' ')}" fill="url(#rg)" stroke="#B5543B" stroke-width="1.8" stroke-linejoin="round"/>`;
  dims.forEach((d, i) => {
    const rr = Math.max(0.16, Math.min(1, d.val / 100));
    const a = ang(i);
    s += `<circle cx="${(cx + R * rr * Math.cos(a)).toFixed(1)}" cy="${(cy + R * rr * Math.sin(a)).toFixed(1)}" r="3.4" fill="${d.color}"/>`;
  });
  dims.forEach((d, i) => {
    const a = ang(i);
    const lx = cx + (R + 30) * Math.cos(a), ly = cy + (R + 26) * Math.sin(a);
    s += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="13" font-weight="600" fill="#4A443A">${d.label}</text>`;
  });
  s += '</svg>';
  return s;
}

/* ---------------- 结果页 ---------------- */
const TIER_LABEL = { lo: '低位', mid: '中位', hi: '高位', top: '很高' };

function renderResult() {
  const r = cur;
  const t = r.type;

  const html = `
  <div class="hero fade-enter">
    <div class="hero-eyebrow">你 的 大 脑 运 作 方 式</div>
    <div class="hero-name">${t.n}</div>
    <div class="hero-nick">${t.nick}</div>
    <div class="hero-tags">${t.tags.map(x => `<span class="tg">${x}</span>`).join('')}</div>
    <div class="hero-line">${t.golden}</div>
    <div class="hero-role">七个维度里，最亮的是「${r.top.label}」——读数 ${r.top.val}</div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你是${t.n}</div>
    <div class="card"><p class="para">${t.core}</p></div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>说中你的那几句话</div>
    <div class="card">
      ${r.barnum.map(s => `<div class="bnum-row"><span class="bnum-q">“</span><p class="para">${s}</p></div>`).join('')}
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你的七维大脑光谱</div>
    <div class="card">
      ${radarSVG(r.dims)}
      <p class="note">读数描述的是倾向，不是能力，也不分好坏。光谱的形状比任何单点读数都重要。</p>
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>逐维读你</div>
    <div class="card">
      ${r.ranked.map(d => `
        <div class="dim-row">
          <div class="dim-head"><span class="dim-name">${d.label}</span><span class="dim-val">${d.val}<em class="tier-chip t-${d.tier}">${TIER_LABEL[d.tier]}</em></span></div>
          <div class="dim-bar"><i style="width:${d.val}%;background:${d.color}"></i></div>
          <p class="dim-txt">${ND_DIM_TEXT[d.k][d.tier === 'top' ? 'hi' : d.tier]}</p>
          <p class="dim-tip"><b>小支点</b>${ND_DIM_TIP[d.k][d.tier === 'top' ? 'hi' : d.tier]}</p>
        </div>`).join('')}
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>让你省电的环境</div>
    <div class="card">
      <div class="ls-label good">给你充电的</div>
      ${t.good.map(x => `<div class="env-row good"><b>✓</b><span>${x}</span></div>`).join('')}
      <div class="ls-label warn">在偷偷扣电的</div>
      ${t.bad.map(x => `<div class="env-row warn"><b>⚠</b><span>${x}</span></div>`).join('')}
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>给你的三条建议</div>
    <div class="card">
      ${t.advice.map((x, i) => `<div class="adv"><b>${i + 1}</b><span>${x}</span></div>`).join('')}
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>温柔的提醒</div>
    <div class="card">
      <p class="para">${ND_CARE}</p>
    </div>
  </div>

  <div class="share-box fade-enter">
    <div class="sb-title">分享这句话</div>
    <div class="sb-text">《神经多样性光谱》里，我是「${t.n}」——${t.nick}。<br>最亮的维度：「${r.top.label}」 ${r.top.val}。<br>${t.golden}</div>
    <div class="sb-tip">截图保存，发给那个和你频道不同频的人</div>
    <div class="sb-btns">
      <button class="btn-main" id="btn-poster">保存结果图</button>
      <button class="btn-ghost" id="btn-again">重新测一次</button>
    </div>
  </div>

  <div class="disc fade-enter">
    本测试为自我观察向的娱乐内容，所有读数描述的是倾向与偏好，不能作为医学结论，也不用于任何形式的评判。<br>
    如果你希望进一步了解自己，请咨询医院精神科或心理科的老师。<br>
    全程在本地完成，不收集、不上传你的任何信息。
  </div>
  `;

  $('#result-scroll').innerHTML = html;

  const blocks = $$('#result-scroll .fade-enter');
  blocks.forEach((b, i) => { b.style.animationDelay = (0.06 + i * 0.045).toFixed(2) + 's'; });

  $('#btn-again').addEventListener('click', reset);
  $('#btn-poster').addEventListener('click', makePoster);
}

/* ---------------- 海报 ---------------- */
function makePoster() {
  const r = cur, t = r.type;
  const W = 1080, H = 1440;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#F7F3E8');
  g.addColorStop(1, '#F1EDDF');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  const rg = x.createRadialGradient(W * 0.78, H * 0.2, 0, W * 0.78, H * 0.2, 620);
  rg.addColorStop(0, 'rgba(181,84,59,.07)');
  rg.addColorStop(1, 'rgba(181,84,59,0)');
  x.fillStyle = rg; x.fillRect(0, 0, W, H);

  x.fillStyle = 'rgba(35,32,26,.5)';
  x.font = '400 26px "PingFang SC","Microsoft YaHei",sans-serif';
  x.textAlign = 'center';
  x.fillText('你 的 大 脑 运 作 方 式', W / 2, 200);

  x.fillStyle = '#23201A';
  x.font = '700 120px "Songti SC","STSong",serif';
  x.fillText(t.n, W / 2, 350);

  x.fillStyle = '#B5543B';
  x.font = '600 38px "PingFang SC","Microsoft YaHei",sans-serif';
  x.fillText(t.nick, W / 2, 418);

  // 三条最高维度
  const top3 = r.ranked.slice(0, 3);
  let by = 520;
  top3.forEach(d => {
    x.textAlign = 'left';
    x.fillStyle = '#4A443A';
    x.font = '400 30px "PingFang SC",sans-serif';
    x.fillText(d.label, 190, by);
    x.fillStyle = 'rgba(35,32,26,.10)';
    x.fillRect(310, by - 24, 560, 30);
    x.fillStyle = d.color;
    x.fillRect(310, by - 24, 560 * d.val / 100, 30);
    x.fillStyle = '#4A443A';
    x.fillText(String(d.val), 310 + 560 * d.val / 100 + 18, by);
    by += 110;
  });

  // 台词
  x.textAlign = 'center';
  x.fillStyle = '#4A443A';
  x.font = '400 40px "Songti SC","STSong",serif';
  wrapText(x, t.golden, W / 2, 960, W - 200, 60);

  // 标签
  let tx = W / 2 - (t.tags.length * 190) / 2;
  t.tags.forEach(s => {
    x.strokeStyle = 'rgba(181,84,59,.55)';
    x.lineWidth = 2;
    roundRect(x, tx, 1080, 170, 56, 28);
    x.stroke();
    x.fillStyle = '#4A443A';
    x.font = '400 26px "PingFang SC",sans-serif';
    x.fillText(s, tx + 85, 1117);
    tx += 190;
  });

  x.fillStyle = 'rgba(35,32,26,.45)';
  x.font = '400 26px "PingFang SC",sans-serif';
  x.fillText('神经多样性光谱 · 42 题', W / 2, 1260);
  x.font = '400 22px "PingFang SC",sans-serif';
  x.fillText('自我观察向内容，读数是倾向描述，不作为医学结论', W / 2, 1305);
  x.fillStyle = 'rgba(181,84,59,.5)';
  x.fillRect(W / 2 - 40, 1360, 80, 2);

  const a = document.createElement('a');
  a.download = `神经多样性光谱-${t.n}.png`;
  a.href = c.toDataURL('image/png');
  a.click();
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const chars = text.split('');
  let line = '', lines = [];
  chars.forEach(ch => {
    if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
    else line += ch;
  });
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lh));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- 重置 ---------------- */
function reset() {
  idx = 0;
  answers = new Array(ND_QS.length).fill(null);
  cur = null;
  showPage('cover');
}

/* ---------------- 预览（_test.html 调试用） ---------------- */
function previewRender(modeKey, m) {
  const base = m === 'hi' ? 52 : m === 'lo' ? 35 : 45;
  const vals = {};
  ND_DIMS.forEach(d => { vals[d.k] = base; });
  // 类型键 → 主维度键
  const DIM_OF_TYPE = { deepdive: 'hyp', radar: 'drift', slowburn: 'init', flash: 'imp', solo: 'soc', rhythm: 'rout' };
  if (modeKey === 'wildcard') { vals.drift = 78; vals.imp = 74; vals.sen = 72; vals.hyp = 76; }
  else if (modeKey === 'antenna') { vals.sen = 80; vals.soc = 75; }
  else if (modeKey === 'balanced') { ND_DIMS.forEach(d => { vals[d.k] = 48; }); }
  else if (DIM_OF_TYPE[modeKey]) vals[DIM_OF_TYPE[modeKey]] = 86;
  cur = assemble(vals);
  renderResult();
  showPage('result');
}

/* ---------------- 启动 ---------------- */
function boot() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('mode');
  if (mode) { previewRender(mode, q.get('m') || 'hi'); return; }
  $('#q-total-all').textContent = ND_QS.length;
  $('#btn-start').addEventListener('click', () => { showPage('quiz'); renderQ(); });
  $('#btn-back').addEventListener('click', () => { if (idx > 0) { idx--; renderQ(); } });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
