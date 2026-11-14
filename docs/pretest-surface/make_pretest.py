# 表面積前測：產生 20 份 HTML（一般版）與 answers.csv。版面沿用面積前測（docs/pretest-area/pretest-01.html）。
# 用法：python3 docs/pretest-surface/make_pretest.py  →  docs/pretest-surface/pretest-versions/pretest-01～20.html、answers.csv
# 轉 PDF：node docs/pretest-surface/make-pdfs.mjs（學生卷隱藏教師區，答案卷隱藏題目）
import csv, html, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'pretest-versions')
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()
CM2 = '平方公分'
INK = 'var(--ink)'


def f(x):
    return f'{x:.1f}'


def text(x, y, s, size=15, anchor='middle', weight=None):
    w = f' font-weight="{weight}"' if weight else ''
    return f'<text x="{f(x)}" y="{f(y)}" text-anchor="{anchor}" font-size="{size}" fill="{INK}"{w}>{html.escape(str(s))}</text>'


def poly(pts, fill, dash=False, width=2):
    d = ' stroke-dasharray="6 4"' if dash else ''
    return f'<polygon points="{" ".join(f"{f(x)},{f(y)}" for x, y in pts)}" fill="{fill}" stroke="{INK}" stroke-width="{width}"{d}/>'


def line(a, b, dash=False, color=INK, width=2):
    d = ' stroke-dasharray="6 4"' if dash else ''
    return f'<line x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}" stroke="{color}" stroke-width="{width}"{d}/>'


def svg(w, h, label, body):
    return f'<svg viewBox="0 0 {int(w)} {int(h)}" width="{int(w)}" height="{int(h)}" role="img" aria-label="{html.escape(label)}">{"".join(body)}</svg>'


def cuboid(l, w, h, s=None, labels=True, names=False, lid=True, grid=False, aria=''):
    """斜投影長方體：前面是長 × 高，往右上方退後的是寬。"""
    s = s or min(26, 230 / (l + w * 0.6), 150 / (h + w * 0.4))
    dx, dy = w * s * 0.6, w * s * 0.4
    L, H = l * s, h * s
    x0, y0 = 62, (30 if not lid else 14) + dy
    A, B, C, D = (x0, y0 + H), (x0 + L, y0 + H), (x0 + L, y0), (x0, y0)
    sh = lambda p: (p[0] + dx, p[1] - dy)
    A2, B2, C2, D2 = sh(A), sh(B), sh(C), sh(D)
    body = [poly([A, B, C, D], 'var(--fill)'),
            poly([D, C, C2, D2], '#ffffff' if not lid else '#eaf2fa', dash=not lid),
            poly([B, B2, C2, C], '#c6d9ee')]
    if grid:  # 小方塊的格線
        n = l
        for i in range(1, n):
            t = i / n
            body.append(line((A[0] + L * t, A[1]), (D[0] + L * t, D[1]), width=1))
            body.append(line((A[0], A[1] - H * t), (B[0], B[1] - H * t), width=1))
            body.append(line((D[0] + L * t, D[1]), (D2[0] + L * t, D2[1]), width=1))
            body.append(line((D[0] + dx * t, D[1] - dy * t), (C[0] + dx * t, C[1] - dy * t), width=1))
            body.append(line((B[0] + dx * t, B[1] - dy * t), (C[0] + dx * t, C[1] - dy * t), width=1))
            body.append(line((B[0], B[1] - H * t), (B2[0], B2[1] - H * t), width=1))
    for a, b in [(A, A2), (A2, B2), (A2, D2)]:
        body.append(line(a, b, dash=True, color='var(--muted)', width=1.5))
    if labels:
        body.append(text((A[0] + B[0]) / 2, A[1] + 22, f'{l} 公分'))
        body.append(text(A[0] - 8, (A[1] + D[1]) / 2 + 5, f'{h} 公分', anchor='end'))
        body.append(text((B[0] + B2[0]) / 2 + 10, (B[1] + B2[1]) / 2 + 16, f'{w} 公分', anchor='start'))
    if names:
        body.append(text((A[0] + C[0]) / 2, (A[1] + C[1]) / 2 + 6, '前面', 16))
        body.append(text((D[0] + C2[0]) / 2, (D[1] + C2[1]) / 2 + 5, '上面', 14))
        body.append(text((B[0] + C2[0]) / 2, (B[1] + C2[1]) / 2 + 5, '右邊', 14))
    if not lid:
        body.append(text((D2[0] + C2[0]) / 2, D2[1] - 6, '（上面沒有蓋子）', 13))
    W = B2[0] + (90 if labels else 20)
    Hh = A[1] + (34 if labels else 12)
    return svg(W, Hh, aria, body)


def prism(k, h):
    """直角三角形底面的三角柱：兩股 3k、4k，斜邊 5k，柱高 h。三角形在前面，往右上方退後的是柱高。"""
    s = min(22, 150 / (4 * k + h * 0.6))
    a, b = 3 * k * s, 4 * k * s
    dx, dy = h * s * 0.6, h * s * 0.4
    x0, y0 = 62, 14 + dy
    P1, P2, P3 = (x0, y0 + a), (x0 + b, y0 + a), (x0, y0)
    sh = lambda p: (p[0] + dx, p[1] - dy)
    Q1, Q2, Q3 = sh(P1), sh(P2), sh(P3)
    body = [poly([P3, P2, Q2, Q3], '#c6d9ee'), poly([P1, P2, P3], 'var(--fill)')]
    for p, q in [(P1, Q1), (Q1, Q2), (Q1, Q3)]:
        body.append(line(p, q, dash=True, color='var(--muted)', width=1.5))
    m = 10
    body.append(f'<polyline points="{f(P1[0])},{f(P1[1] - m)} {f(P1[0] + m)},{f(P1[1] - m)} {f(P1[0] + m)},{f(P1[1])}" fill="none" stroke="{INK}" stroke-width="1.5"/>')
    body.append(text((P1[0] + P2[0]) / 2, P1[1] + 22, f'{4 * k} 公分'))
    body.append(text(P1[0] - 8, (P1[1] + P3[1]) / 2 + 5, f'{3 * k} 公分', anchor='end'))
    body.append(text((P2[0] + Q2[0]) / 2 + 10, (P2[1] + Q2[1]) / 2 + 16, f'{h} 公分', anchor='start'))
    return svg(Q2[0] + 90, P1[1] + 34, f'三角柱：底面是直角三角形，兩邊 {3 * k}、{4 * k} 公分，斜邊 {5 * k} 公分，柱高 {h} 公分', body)


CIRCLED = '①②③④⑤⑥'


def net_svg(l, w, h, names):
    """方格紙上的長方體展開圖（十字形）。names：每個面的編號。"""
    c = 18
    faces = {'top': (w, 0, l, w), 'front': (w, w, l, h), 'left': (0, w, w, h), 'right': (w + l, w, w, h),
             'bottom': (w, w + h, l, w), 'back': (w, 2 * w + h, l, h)}
    cols, rows = 2 * w + l + 2, 2 * w + 2 * h + 2
    body = []
    for i in range(cols + 1):
        body.append(line((i * c, 0), (i * c, rows * c), color='var(--grid)', width=1))
    for j in range(rows + 1):
        body.append(line((0, j * c), (cols * c, j * c), color='var(--grid)', width=1))
    for key, (x, y, fw, fh) in faces.items():
        X, Y = (x + 1) * c, (y + 1) * c
        body.append(f'<rect x="{X}" y="{Y}" width="{fw * c}" height="{fh * c}" fill="var(--fill)" fill-opacity=".75" stroke="{INK}" stroke-width="2"/>')
        body.append(text(X + fw * c / 2, Y + fh * c / 2 + 7, names[key], 20, weight='700'))
    return svg(cols * c, rows * c, '方格紙上的長方體展開圖，六個面標上 ① 到 ⑥', body)


def cube_net_svg(cells, cap):
    c = 24
    cols = max(x for x, _ in cells) + 1
    rows = max(y for _, y in cells) + 1
    body = [f'<rect x="{x * c + 2}" y="{y * c + 2}" width="{c}" height="{c}" fill="var(--fill)" stroke="{INK}" stroke-width="2"/>' for x, y in cells]
    return f'<figure class="fig-sub">{svg(cols * c + 4, rows * c + 4, "由 6 個正方形組成的圖形 " + cap, body)}<figcaption>{cap}</figcaption></figure>'


def good_net(r):  # 1-4-1：中間一排 4 個，上、下各接 1 個，一定可以摺成正方體
    a, b = r.randrange(4), r.randrange(4)
    return [(a, 0), (0, 1), (1, 1), (2, 1), (3, 1), (b, 2)]


BAD_NETS = [
    [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1)],          # 2 × 3 長方形
    [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (1, 1)],          # 一排 5 個
    [(0, 0), (1, 0), (0, 1), (1, 1), (2, 1), (3, 1)],          # 有田字（2 × 2）
    [(1, 0), (0, 1), (1, 1), (2, 1), (3, 1), (4, 1)],          # 一排 5 個（另一種）
]

FACE_ZH = {'top': '上面', 'bottom': '下面', 'front': '前面', 'back': '後面', 'left': '左邊', 'right': '右邊'}
OPP = {'top': 'bottom', 'bottom': 'top', 'front': 'back', 'back': 'front', 'left': 'right', 'right': 'left'}


def sub(no, q):
    return f'<li><span class="sub-no">({no})</span><span class="sub-q">{q}</span><span class="ans">答：<span class="blank"></span></span></li>'


def item(no, tag, units, stem, fig, subs):
    t = '<span class="tag tag-calc">計算題</span>' if tag == '計' else '<span class="tag tag-app">應用題</span>'
    figh = f'<div class="fig">{fig}</div>' if fig else ''
    lis = ''.join(sub(i + 1, q) for i, q in enumerate(subs))
    return (f'<section class="item">\n  <header class="item-head"><span class="no">{no}</span>{t}<span class="unit-tag">{units}</span></header>\n'
            f'  <p class="stem">{stem}</p>\n  {figh}\n  <ol class="subs">{lis}</ol>\n</section>')


def distinct(r, ranges):
    while True:
        v = [r.randint(*rg) for rg in ranges]
        if len(set(v)) == len(v):
            return v


def make(n):
    r = random.Random(20261114 * 100 + n)
    A = []  # (小題, 答案, 單元, 概念與常見錯誤)
    items = []

    # 1 認識面（單元 1）
    l1, w1, h1 = distinct(r, [(5, 7), (2, 3), (3, 4)])
    ask = r.choice(['top', 'front', 'right'])
    items.append(item(1, '計', '單元 1', '下面是一個長方體。', cuboid(l1, w1, h1, labels=False, names=True, aria='長方體，標出前面、上面、右邊'),
                      ['長方體一共有幾個面？', f'哪一個面和「{FACE_ZH[ask]}」一樣大？', '長方體的面，可以分成幾組一樣大的面？']))
    A += [('1(1)', '6 個面', '1', '寫 3 表示只數看得到的面'), ('1(2)', FACE_ZH[OPP[ask]], '1', '對面一樣大'),
          ('1(3)', '3 組', '1', '每一組是兩個對面')]

    # 2 包住外面：表面積是什麼（單元 1）
    a2 = r.randint(2, 4)
    items.append(item(2, '計', '單元 1', f'用小方塊堆成一個大正方體，每一邊有 {a2} 個小方塊。小方塊的一個面是 1 平方公分。把大正方體外面的每一個面都塗上顏色。',
                      cuboid(a2, a2, a2, s=min(40, 130 / a2), labels=False, grid=True, aria=f'小方塊堆成的大正方體，每一邊 {a2} 個'),
                      ['大正方體的一個面，塗到顏色的部分是多少平方公分？', '大正方體外面全部塗到顏色的部分，一共是多少平方公分？']))
    A += [('2(1)', f'{a2 * a2} {CM2}', '1', '一個面的面積'),
          ('2(2)', f'{6 * a2 * a2} {CM2}', '1', f'表面積是 6 個面合起來；寫 {3 * a2 * a2} 表示只算看得到的 3 個面' + (f'，寫 {a2 ** 3} 表示算成小方塊個數（體積）' if a2 ** 3 != 3 * a2 * a2 else '（也可能是算成小方塊個數）'))]

    # 3 展開圖與對面（單元 2）
    l3 = r.randint(4, 6)
    w3, h3 = r.sample([2, 3], 2)
    keys = ['top', 'front', 'left', 'right', 'bottom', 'back']
    nums = list(CIRCLED)
    r.shuffle(nums)
    names = dict(zip(keys, nums))
    k1 = next(k for k in keys if names[k] == '①')
    area = {'top': l3 * w3, 'bottom': l3 * w3, 'front': l3 * h3, 'back': l3 * h3, 'left': w3 * h3, 'right': w3 * h3}
    s3 = 2 * (l3 * w3 + l3 * h3 + w3 * h3)
    items.append(item(3, '計', '單元 2', '這是一個長方體盒子打開後的展開圖。方格紙上一小格的邊長是 1 公分。', net_svg(l3, w3, h3, names),
                      ['摺回盒子以後，① 的對面是哪一個面？', '① 的面積是多少？', '整個展開圖的面積是多少？']))
    A += [('3(1)', names[OPP[k1]], '2', '在展開圖上找對面：中間隔一個面的是對面'),
          ('3(2)', f'{area[k1]} {CM2}', '2', '數格子或長 × 寬'),
          ('3(3)', f'{s3} {CM2}', '2', '展開圖的面積就是表面積')]

    # 4 哪一個能摺成正方體（單元 2）
    nets = [('good', good_net(r))] + [('bad', b) for b in r.sample(BAD_NETS, 2)]
    r.shuffle(nets)
    caps = 'ABC'
    ans4 = caps[[t for t, _ in nets].index('good')]
    items.append(item(4, '計', '單元 2', '下面三個圖形都由 6 個一樣大的正方形組成。', ''.join(cube_net_svg(c, caps[i]) for i, (_, c) in enumerate(nets)),
                      ['哪一個圖形可以摺成正方體？寫出代號。']))
    A += [('4', ans4, '2', '正方體的展開圖：不能有田字（2 × 2），一排不能超過 4 個')]

    # 5 長方體的表面積（單元 3）
    while True:
        l5, w5, h5 = distinct(r, [(5, 9), (2, 4), (3, 6)])
        if 2 * (l5 * w5 + l5 * h5 + w5 * h5) != l5 * w5 * h5: break
    s5 = 2 * (l5 * w5 + l5 * h5 + w5 * h5)
    items.append(item(5, '計', '單元 3', f'長方體的長 {l5} 公分、寬 {w5} 公分、高 {h5} 公分。', cuboid(l5, w5, h5, aria=f'長方體，長 {l5}、寬 {w5}、高 {h5} 公分'),
                      ['上面的面積是多少？', '前面的面積是多少？', '右邊的面積是多少？', '這個長方體的表面積是多少？']))
    A += [('5(1)', f'{l5 * w5} {CM2}', '3', '長 × 寬'), ('5(2)', f'{l5 * h5} {CM2}', '3', '長 × 高'),
          ('5(3)', f'{w5 * h5} {CM2}', '3', '寬 × 高'),
          ('5(4)', f'{s5} {CM2}', '3', f'三種面各 2 個；寫 {s5 // 2} 表示忘了 × 2，寫 {l5 * w5 * h5} 表示算成體積')]

    # 6 正方體的表面積（單元 3）
    a6 = r.choice([x for x in range(3, 10) if x not in (a2, 6)])
    items.append(item(6, '計', '單元 3', f'正方體的邊長是 {a6} 公分。', cuboid(a6, a6, a6, s=min(22, 120 / a6), aria=f'正方體，邊長 {a6} 公分'),
                      ['一個面的面積是多少？', '這個正方體的表面積是多少？']))
    A += [('6(1)', f'{a6 * a6} {CM2}', '3', '邊長 × 邊長'),
          ('6(2)', f'{6 * a6 * a6} {CM2}', '3', f'6 個面一樣大；寫 {4 * a6 * a6} 表示只算 4 個面，寫 {a6 ** 3} 表示算成體積')]

    # 7 知道表面積，找一個面（單元 3）
    a7 = r.choice([x for x in range(2, 7) if x not in (a6, a2)])
    items.append(item(7, '計', '單元 3', f'一個正方體的表面積是 {6 * a7 * a7} 平方公分。', '',
                      ['一個面的面積是多少？', '正方體的邊長是多少？']))
    A += [('7(1)', f'{a7 * a7} {CM2}', '3', '表面積 ÷ 6；除以 4 表示以為正方體只有 4 個面'),
          ('7(2)', f'{a7} 公分', '3', '哪個數乘自己等於一個面的面積；單位是公分')]

    # 8 沒有蓋子的盒子（單元 4）
    l8, w8, h8 = distinct(r, [(4, 8), (2, 5), (2, 5)])
    s8 = l8 * w8 + 2 * (l8 * h8 + w8 * h8)
    items.append(item(8, '應', '單元 4', f'用紙板做一個沒有蓋子的長方體盒子，長 {l8} 公分、寬 {w8} 公分、高 {h8} 公分。',
                      cuboid(l8, w8, h8, lid=False, aria=f'沒有蓋子的長方體盒子，長 {l8}、寬 {w8}、高 {h8} 公分'),
                      ['這個盒子有幾個面？', '做這個盒子，一共要用多少平方公分的紙板？']))
    A += [('8(1)', '5 個面', '4', '少了上面'),
          ('8(2)', f'{s8} {CM2}', '4', f'寫 {s8 + l8 * w8} 表示把蓋子也算進去')]

    # 9 包裝紙還是小方塊：表面積或體積（單元 3、4）
    while True:
        l9, w9, h9 = distinct(r, [(4, 6), (2, 3), (2, 5)])
        if 2 * (l9 * w9 + l9 * h9 + w9 * h9) != l9 * w9 * h9: break
    s9 = 2 * (l9 * w9 + l9 * h9 + w9 * h9)
    v9 = l9 * w9 * h9
    items.append(item(9, '應', '單元 3、4', f'一個長方體禮物盒，長 {l9} 公分、寬 {w9} 公分、高 {h9} 公分。', '',
                      ['用包裝紙把盒子外面剛好包住（紙不重疊），要用多少平方公分的包裝紙？', '盒子裡面可以放幾個 1 立方公分的小方塊？']))
    A += [('9(1)', f'{s9} {CM2}', '4', f'包住外面要算表面積；寫 {v9} 表示算成體積'),
          ('9(2)', f'{v9} 個（或 {v9} 立方公分）', '3', f'放進裡面要算體積；寫 {s9} 表示算成表面積')]

    # 10 三角柱（單元 5，六年級）
    k10 = r.choice([1, 2])
    h10 = r.randint(3, 8) if k10 == 1 else r.randint(2, 5)
    base = 6 * k10 * k10
    side = 12 * k10 * h10
    items.append(item(10, '計', '單元 5（六年級）', f'三角柱的底面是直角三角形，三條邊是 {3 * k10} 公分、{4 * k10} 公分、{5 * k10} 公分。柱高 {h10} 公分。', prism(k10, h10),
                      ['一個底面的面積是多少？', '三個側面的面積合起來是多少？', '這個三角柱的表面積是多少？']))
    A += [('10(1)', f'{base} {CM2}', '5', f'三角形要 ÷ 2；寫 {base * 2} 表示忘了 ÷ 2，乘了斜邊 {5 * k10} 也不對'),
          ('10(2)', f'{side} {CM2}', '5', f'側面打開是一個大長方形：底面一圈 {12 * k10} 公分 × 柱高 {h10} 公分'),
          ('10(3)', f'{2 * base + side} {CM2}', '5', f'兩個底面 + 側面；寫 {base + side} 表示少算一個底面')]
    return items, A


UNITS = [('1 認識立體的面', ['1(1)', '1(2)', '1(3)', '2(1)', '2(2)'], 3),
         ('2 展開圖', ['3(1)', '3(2)', '3(3)', '4'], 3),
         ('3 長方體和正方體的表面積', ['5(1)', '5(2)', '5(3)', '5(4)', '6(1)', '6(2)', '7(1)', '7(2)', '9(2)'], 7),
         ('4 用在生活', ['8(1)', '8(2)', '9(1)'], 2),
         ('5 柱體的表面積（六年級）', ['10(1)', '10(2)', '10(3)'], 2)]


def page(n, items, A):
    num = f'{n:02d}'
    rows = ''.join(f'<tr><td class="num">{q}</td><td>{html.escape(a)}</td><td class="num">{u}</td><td>{html.escape(c)}</td></tr>' for q, a, u, c in A)
    urows = ''.join(f'<tr><td>{name}</td><td>{"、".join(qs)}</td><td class="num">{len(qs)}</td><td class="num">{cut} 分以下</td><td class="score"></td></tr>' for name, qs, cut in UNITS)
    total = len(A)
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>表面積前測 卷號 {num}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>{CSS}
@media print {{ .teacher {{ display: block; }} .teacher > * + * {{ margin-top: 14px; }} .teacher h3 {{ break-after: avoid; }} tr {{ break-inside: avoid; }} th {{ white-space: nowrap; }} }}</style></head><body><div class="wrap"><main class="sheet" id="v{num}">
  <header class="sheet-head">
    <div class="serial">卷號 <b>{num}</b></div>
    <h1>表面積前測</h1>
    <div class="meta"><span>學生代號<i></i></span><span>日期<i></i></span><span>施測者<i></i></span></div>
    <p class="note">一共 10 題，每個小題 1 分，共 {total} 分。老師可以把每一句題目唸給學生聽。每一題都要寫單位。不限時間，可以用計算紙。</p>
  </header>
  {"".join(items)}
  <section class="teacher">
    <h2>教師用：卷號 {num} 的答案與計分</h2>
    <h3>計分規則</h3>
    <ul>
      <li>每個小題 1 分。數字和單位都對才給分（面的名稱、代號、「幾個面」「幾組」照寫就算對）。</li>
      <li>後面的小題，如果方法對、只是用了前面算錯的數字，照樣給分（例如 5(4) 用了算錯的 5(1) 去算，算法對就給分）。</li>
      <li>五年級學生可以不做第 10 題（三角柱），只算單元 1～4，滿分 {total - 3} 分。</li>
    </ul>
    <h3>答案</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>小題</th><th>答案</th><th>單元</th><th>測的概念、常見錯誤</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
    <h3>各單元得分與篩選</h3>
    <p>答對率未達 80% 的單元算「還沒學會」。依單元順序，選最前面 3 個還沒學會的單元進行教學；少於 3 個的學生不列入。</p>
    <div class="table-wrap"><table>
      <thead><tr><th>單元</th><th>計分小題</th><th>滿分</th><th>還沒學會</th><th>得分</th></tr></thead>
      <tbody>{urows}</tbody>
    </table></div>
  </section>
</main></div></body></html>
'''


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'answers.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
        wr = csv.writer(fh, quoting=csv.QUOTE_NONNUMERIC)
        fh.write('卷號,小題,答案\n')
        for n in range(1, 21):
            items, A = make(n)
            open(os.path.join(OUT, f'pretest-{n:02d}.html'), 'w', encoding='utf-8').write(page(n, items, A))
            for q, a, _, _ in A:
                fh.write(f'{n:02d},{q},"{a}"\n')
    print('wrote 20 HTML files and answers.csv to', OUT)
