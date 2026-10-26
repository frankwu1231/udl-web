'use strict';
// 圖形繪製。只負責畫圖；狀態由 seven.js 決定後傳入 opts。
(() => {
  const names = { rectangle: '長方形', square: '正方形', triangle: '三角形', parallelogram: '平行四邊形' };
  const BASE = '#0b7a43', HEIGHT = '#c2410c', EDGE = '#244b85';

  // opts:
  //  frame        0 原圖｜1 拿出/剪開｜2 拼好
  //  showBase     顯示底（或長）的長度
  //  showHeight   顯示高（或寬）的長度
  //  lines        {A:'height',B:'side',C:'dash'} 找高時的候選線（只標字母）
  //  selected     已選的候選線字母
  //  pulse        'inside'｜'base'｜'height'｜'both'｜'piece'  第二層提示時閃爍
  //  baseClickable 找底時可點底邊
  //  replay       數字，改變時重新播放動畫
  //  dragFrom     [x,y] 拖曳放開的位置，動畫從這裡開始
  function diagram(t, d, opts = {}) {
    const { frame = 0, showBase = false, showHeight = false, lines = null, selected = '', pulse = '', baseClickable = false, replay = 0, dragFrom = null, gridLines = false } = opts;
    const [b, h, s] = d;
    const rect = t === 'rectangle' || t === 'square';
    const u = Math.min(42, 390 / (b + Math.abs(s)), 178 / h);
    const ox = 80 + Math.max(0, -s) * u, y = 245, top = y - h * u;
    const A = [ox, y], B = [ox + b * u, y], C = [ox + s * u, top], D = [ox + (b + s) * u, top], P = [C[0], y];
    const pts = a => a.map(p => p.map(n => Math.round(n * 10) / 10).join(',')).join(' ');
    const poly = (points, fill = '#a9c7ff', extra = '') => `<polygon points="${pts(points)}" fill="${fill}" stroke="${EDGE}" stroke-width="2.5" stroke-linejoin="round" ${extra}/>`;
    const line = (p, q, color, width, extra = '') => `<path d="M${pts([p])}L${pts([q])}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" ${extra}/>`;
    const label = (x, yy, text, anchor = 'middle', cls = '') => `<text class="lbl ${cls}" x="${Math.round(x)}" y="${Math.round(yy)}" text-anchor="${anchor}">${text}</text>`;

    let minX = Math.min(A[0], C[0]), maxX = Math.max(B[0], D[0]);
    let body = '';
    const insidePulse = pulse === 'inside' ? 'class="pulse-fill"' : '';

    if (rect) {
      body += poly([A, B, [B[0], top], [ox, top]], '#a9c7ff', insidePulse);
    } else if (t === 'triangle') {
      body += poly([A, B, C], '#a9c7ff', insidePulse);
      if (frame > 0) {
        const tx = (Math.max(B[0], C[0]) - Math.min(A[0], C[0])) + 36;   // 第二片先放在右邊
        const M = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];
        const from = dragFrom || [tx, 0];
        const piecePulse = pulse === 'piece' ? ' pulse-piece' : '';
        if (frame === 1) {
          body += `<g class="drag-piece${piecePulse}" data-drag="triangle" data-tx="${tx}" transform="translate(${tx},0)">${poly([A, B, C], '#ffd077', 'opacity=".92"')}</g>`;
          maxX = Math.max(maxX, Math.max(B[0], C[0]) + tx);
        } else {
          body += `<g class="transform-piece rotate-piece" data-replay="${replay}" style="--pivot:${M[0]}px ${M[1]}px;--fx:${from[0]}px;--fy:${from[1]}px">${poly([A, B, C], '#ffd077', 'opacity=".92"')}</g>`;
          maxX = Math.max(maxX, B[0] + C[0] - A[0], Math.max(B[0], C[0]) + tx);
        }
      }
    } else {
      if (frame === 0) body += poly([A, B, D, C], '#a9c7ff', insidePulse);
      else {
        const from = dragFrom ? dragFrom[0] : 0;
        body += poly([A, B, D, C], 'none', 'class="ghost"');
        body += poly([C, D, B, P]);
        if (frame === 1) body += `<g class="drag-piece${pulse === 'piece' ? ' pulse-piece' : ''}" data-drag="parallelogram" data-tx="${b * u}">${poly([A, C, P], '#ffd077')}</g>` + line(C, P, HEIGHT, 3, 'stroke-dasharray="7 5"');
        else body += `<g class="transform-piece slide-piece" data-replay="${replay}" style="--move:${b * u}px;--fx:${from}px">${poly([A, C, P], '#ffd077')}</g>`;
      }
    }

    // 底（或長方形下緣）：綠色加粗
    const baseCls = (pulse === 'base' || pulse === 'both') ? 'pulse-line' : '';
    if (!rect) {
      const shift = t === 'parallelogram' && frame === 2 ? s * u : 0;
      body += line([A[0] + shift, y], [B[0] + shift, y], BASE, 6, `class="base-line ${baseCls}"`);
      if (baseClickable) body += `<path d="M${pts([A])}L${pts([B])}" stroke="transparent" stroke-width="34" class="base-hit" data-base="1" role="button" aria-label="點底邊看長度"/>`;
      if (showBase) body += label((A[0] + B[0]) / 2 + shift, y + (lines ? 72 : 38), `底 ${b} 公分`, 'middle', 'lbl-base');
      if (pulse === 'base' || pulse === 'both') body += arrow((A[0] + B[0]) / 2 + shift, y + 62, 'up', BASE);
    } else {
      if (pulse === 'base' || pulse === 'both') body += line([A[0], top], [B[0], top], BASE, 6, 'class="pulse-line"');
      if (showBase) body += label((A[0] + B[0]) / 2, top - 16, `${b} 公分`, 'middle', 'lbl-base');
      if (pulse === 'height' || pulse === 'both') body += line([A[0], top], A, HEIGHT, 6, 'class="pulse-line"');
      if (showHeight) body += label(ox - 14, (top + y) / 2 + 7, `${h} 公分`, 'end', 'lbl-height');
    }

    // 高與候選線
    if (!rect) {
      const hCls = (pulse === 'height' || pulse === 'both') ? 'pulse-line' : '';
      const m = hCls ? 20 : 14, mark = `<path d="M${P[0]} ${y - m}h${P[0] >= B[0] - 1 ? -m : m}v${m}" fill="${hCls ? '#ffd07780' : 'none'}" stroke="${HEIGHT}" stroke-width="${hCls ? 4 : 3}" class="right-mark ${hCls}"/>`;
      if (s < 0 || s > b) body += line(P, s < 0 ? A : B, '#526b89', 2, 'stroke-dasharray="5 5"');   // 外部高的底延長線
      if (lines) {
        const Q = dashFoot(A, B, P, u);
        const geo = {
          height: [C, P, HEIGHT, 'stroke-dasharray="8 6"'],
          side: t === 'triangle' ? (s === b ? [A, C, '#2157da', ''] : [C, B, '#2157da', '']) : (s === 0 ? [C, D, '#2157da', ''] : [A, C, '#2157da', '']),
          dash: [C, Q, '#7c3aed', 'stroke-dasharray="8 6"']
        };
        for (const [letter, kind] of Object.entries(lines)) {
          const [p, q, color, dash] = geo[kind];
          const sel = selected === letter ? ' selected-line' : '';
          body += line(p, q, color, 4, `${dash} class="cand${sel}" data-line="${letter}"`);
          body += `<path d="M${pts([p])}L${pts([q])}" stroke="transparent" stroke-width="30" data-line-hit="${letter}" role="button" aria-label="${letter} 線"/>`;
          const foot = Math.abs(p[1] - y) < 1 ? p : Math.abs(q[1] - y) < 1 ? q : null;   // 碰到底的那一端
          const tx = foot ? foot[0] : (p[0] + q[0]) / 2, ty = foot ? y + 28 : Math.min(p[1], q[1]) - 22;
          body += `<g class="line-tag${sel}" data-line-hit="${letter}"><circle cx="${Math.round(tx)}" cy="${Math.round(ty)}" r="16"/>${label(tx, ty + 7, letter, 'middle', 'tag')}</g>`;
        }
        body += mark;
      } else if (showHeight || frame > 0 || pulse === 'height' || pulse === 'both') {
        body += line(C, P, HEIGHT, 4, `stroke-dasharray="8 6" class="height-line ${hCls}"`) + mark;
      } else {
        body += line(C, P, HEIGHT, 3, 'stroke-dasharray="8 6" class="height-line"') + mark;
      }
      if (showHeight) body += label(P[0] + (C[0] < (A[0] + B[0]) / 2 ? 10 : -10), (top + y) / 2 + 7, `高 ${h} 公分`, C[0] < (A[0] + B[0]) / 2 ? 'start' : 'end', 'lbl-height');
      if ((pulse === 'height' || pulse === 'both') && !lines) body += arrow(P[0] - 14, top + (y - top) * 0.7, 'right', HEIGHT);
    }

    if (gridLines) {   // 1 公分方格線，畫在圖形下面
      let g = '';
      const x0 = Math.min(A[0], C[0]) - u, x1 = Math.max(maxX, B[0]) + u;
      for (let x = A[0] - Math.ceil((A[0] - x0) / u) * u; x <= x1; x += u) g += `M${Math.round(x)} ${Math.round(top - 4)}V${y}`;
      for (let yy = y; yy >= top - 1; yy -= u) g += `M${Math.round(x0)} ${Math.round(yy)}H${Math.round(x1)}`;
      body = `<path d="${g}" stroke="#7d93b5" stroke-width="1" opacity=".55" fill="none"/>` + body;
    }
    const vbX = minX - 70, vbW = maxX - minX + 140, vbY = top - 50, vbH = h * u + 110;
    const aria = `${names[t]}${showBase ? (rect ? `，長 ${b} 公分` : `，底 ${b} 公分`) : ''}${showHeight ? (rect ? `，寬 ${h} 公分` : `，高 ${h} 公分`) : ''}${frame === 2 ? '，拼好了' : ''}`;
    return `<svg class="geometry-svg" viewBox="${Math.round(vbX)} ${Math.round(vbY)} ${Math.round(vbW)} ${Math.round(vbH)}" role="img" aria-label="${aria}">${body}</svg>`;
  }

  // 找高時的干擾線：從頂點斜斜畫到底上（不是直角）
  function dashFoot(A, B, P, u) {
    const len = B[0] - A[0];
    if (P[0] < A[0] + 0.5 * u || P[0] > B[0] - 0.5 * u) return [P[0] < A[0] + 0.5 * u ? A[0] + len * 0.5 : B[0] - len * 0.5, A[1]];   // 外部高：放在底的中間
    let x = P[0] + Math.max(1.5 * u, len * 0.35);
    if (x > B[0] - 0.5 * u) x = P[0] - Math.max(1.5 * u, len * 0.35);
    x = Math.min(Math.max(x, A[0] + 0.5 * u), B[0] - 0.5 * u);
    return [x, A[1]];
  }

  function arrow(x, y, dir, color) {
    const path = dir === 'up' ? `M${x} ${y + 26}V${y}m-10 12l10 -12l10 12` : `M${x - 26} ${y}H${x}m-12 -10l12 10l-12 10`;
    return `<path class="hint-arrow" d="${path}" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  window.sevenDiagram = diagram;
})();
