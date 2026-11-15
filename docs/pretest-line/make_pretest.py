# 折線圖前測：產生 20 份 HTML（一般版）與 answers.csv。版面沿用表面積前測（docs/pretest-surface/）。
# 依網站第 28 版的單元 0～6：四年級做第 1～7 題（讀圖），五年級再做第 8～10 題（畫圖、波浪線、用圖說話）。
# 數字刻意小：表格的數都在 20 以內（身高、存錢除外），一格是 1、2、10。
# 用法：python3 docs/pretest-line/make_pretest.py  →  docs/pretest-line/pretest-versions/pretest-01～20.html、answers.csv
# 轉 PDF：node docs/pretest-line/make-pdfs.mjs（學生卷隱藏教師區，答案卷隱藏題目）
import csv, html, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'pretest-versions')
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()
INK = 'var(--ink)'
WEEK = ['一', '二', '三', '四', '五', '六', '日']
MONTHS = [f'{m}月' for m in range(1, 13)]


def f(x):
    return f'{x:.1f}'


def text(x, y, s, size=14, anchor='middle', weight=None, fill=INK):
    w = f' font-weight="{weight}"' if weight else ''
    return f'<text x="{f(x)}" y="{f(y)}" text-anchor="{anchor}" font-size="{size}" fill="{fill}"{w}>{html.escape(str(s))}</text>'


def line(a, b, color=INK, width=2, dash=False):
    d = ' stroke-dasharray="6 4"' if dash else ''
    return f'<line x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}" stroke="{color}" stroke-width="{width}"{d}/>'


def svg(w, h, label, body):
    return f'<svg viewBox="0 0 {int(w)} {int(h)}" width="{int(w)}" height="{int(h)}" role="img" aria-label="{html.escape(label)}">{"".join(body)}</svg>'


def chart(title, xs, xname, yname, unit, series, step, rows, every=1, ymin=0, brk=False, blank=False, yname_blank=False, colw=56):
    """折線圖（或空白方格）。series：[(名稱, 數值, 'a'|'b')]；a 實線圓點，b 虛線方點。every：每幾格寫一次刻度的數。"""
    L, T, rowh = 64, 44, (22 if rows <= 10 else 16)
    G = 22 if brk else 0                     # 波浪線的空間
    n = len(xs)
    y0 = T + rows * rowh                     # 最下面一條格線（ymin）
    ax = y0 + G                              # 橫軸
    W, H = L + colw * n + 50, ax + 46 + (26 if len(series) > 1 else 0)
    X = lambda i: L + colw * (i + 0.5)
    Y = lambda v: y0 - (v - ymin) / step * rowh
    body = [text(L + colw * n / 2 + (60 if yname_blank else 0), 18, title, 16, weight='700')]
    for k in range(rows + 1):
        major = k % every == 0
        body.append(line((L, y0 - k * rowh), (L + colw * n, y0 - k * rowh), color='var(--grid)' if not major else '#8fa3ba', width=1))
        if major:
            body.append(text(L - 8, y0 - k * rowh + 5, ymin + k * step, 13, anchor='end'))
    for i in range(n):
        body.append(line((X(i), T), (X(i), y0), color='var(--grid)', width=1))
        body.append(text(X(i), ax + 20, xs[i], 13))
    body.append(line((L, T - 6), (L, ax)))
    body.append(line((L, ax), (L + colw * n + 12, ax)))
    if brk:   # 縱軸上的波浪線，最下面寫 0
        zz = f'M{L} {ax} L{L} {ax - 4} L{L - 6} {ax - 8} L{L + 6} {ax - 13} L{L - 6} {ax - 18} L{L} {y0}'
        body.append(f'<path d="{zz}" fill="#fff" stroke="{INK}" stroke-width="2"/>')
        body.append(text(L - 8, ax + 5, 0, 13, anchor='end'))
    body.append(text(L + colw * n + 14, ax + 38, xname, 13, anchor='end'))
    if yname_blank:
        body.append(text(10, T - 22, '縱軸：＿＿＿＿（　　）', 13, anchor='start'))
    else:
        body.append(text(10, T - 22, f'{yname}（{unit}）', 13, anchor='start'))
    if not blank:
        for name, v, sty in series:
            pts = [(X(i), Y(y)) for i, y in enumerate(v)]
            body.append(f'<polyline points="{" ".join(f"{f(x)},{f(y)}" for x, y in pts)}" fill="none" stroke="{INK}" stroke-width="2.2"{" stroke-dasharray=\"7 4\"" if sty == "b" else ""}/>')
            for x, y in pts:
                body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="5" fill="{INK}"/>' if sty == 'a' else f'<rect x="{f(x - 5)}" y="{f(y - 5)}" width="10" height="10" fill="#fff" stroke="{INK}" stroke-width="2"/>')
        if len(series) > 1:
            ly = H - 12
            lx = L
            for name, v, sty in series:
                body.append(line((lx, ly - 5), (lx + 30, ly - 5), width=2.2, dash=sty == 'b'))
                body.append(f'<circle cx="{f(lx + 15)}" cy="{f(ly - 5)}" r="5" fill="{INK}"/>' if sty == 'a' else f'<rect x="{f(lx + 10)}" y="{f(ly - 10)}" width="10" height="10" fill="#fff" stroke="{INK}" stroke-width="2"/>')
                body.append(text(lx + 38, ly, name, 14, anchor='start'))
                lx += 130
    label = f'折線圖「{title}」' if not blank else f'畫折線圖用的方格，縱軸一格是 {step}'
    return svg(W, H, label, body)


def number_line(unit, cells, every, arrow):
    """數線：0 到 cells × unit，每一格是 unit，只在 0 和每 every 格寫數；arrow 是箭頭指的格數。"""
    x0, u, y = 30, min(34, 460 / cells), 50
    body = [line((x0 - 10, y), (x0 + cells * u + 16, y))]
    for k in range(cells + 1):
        lab = k % every == 0
        body.append(line((x0 + k * u, y - (10 if lab else 7)), (x0 + k * u, y + (10 if lab else 7)), width=2 if lab else 1.5))
        if lab:
            body.append(text(x0 + k * u, y + 30, k * unit, 15))
    ax = x0 + arrow * u
    body.append(f'<path d="M{f(ax)} {y - 14} L{f(ax - 7)} {y - 28} L{f(ax + 7)} {y - 28} Z" fill="{INK}"/>')
    body.append(line((ax, y - 28), (ax, y - 44), width=3))
    return svg(x0 + cells * u + 40, y + 42, f'數線，0 到 {cells * unit}，箭頭指著一個沒有寫數的刻度', body)


def dtable(caption, head, rowname, vals):
    return (f'<table class="dtable"><caption>{html.escape(caption)}</caption><thead><tr><th>{html.escape(head[0])}</th>'
            + ''.join(f'<th>{html.escape(h)}</th>' for h in head[1]) + f'</tr></thead><tbody><tr><th>{html.escape(rowname)}</th>'
            + ''.join(f'<td>{v}</td>' for v in vals) + '</tr></tbody></table>')


def sub(no, q, kind='blank', opts=None):
    if kind == 'draw':
        return f'<li><span class="sub-no">({no})</span><span class="sub-q">{q}</span></li>'
    ch = f'<span class="choices">{"".join(f"<span>{html.escape(o)}</span>" for o in opts)}</span>' if opts else ''
    return f'<li><span class="sub-no">({no})</span><span class="sub-q">{q}{ch}</span><span class="ans">答：<span class="blank"></span></span></li>'


def item(no, tag, units, stem, fig, subs):
    t = '<span class="tag tag-calc">讀圖</span>' if tag == '讀' else '<span class="tag tag-app">畫圖</span>' if tag == '畫' else '<span class="tag tag-app">判斷</span>'
    figh = f'<div class="fig">{fig}</div>' if fig else ''
    lis = ''.join(sub(i + 1, *s) if isinstance(s, tuple) else sub(i + 1, s) for i, s in enumerate(subs))
    return (f'<section class="item">\n  <header class="item-head"><span class="no">{no}</span>{t}<span class="unit-tag">{units}</span></header>\n'
            f'  <p class="stem">{stem}</p>\n  {figh}\n  <ol class="subs">{lis}</ol>\n</section>')


def uniq_max(v):
    return v.count(max(v)) == 1


def make(n):
    r = random.Random(20261115 * 100 + n)
    A = []   # (小題, 答案, 單元, 概念與常見錯誤)
    items = []

    # 1 表格找資料（單元 0）
    ctx1 = r.choice([('小華每天喝水的杯數', '杯數', '杯', '喝了幾杯'), ('小美每天看書的頁數', '頁數', '頁', '看了幾頁')])
    while True:
        v1 = [r.randint(2, 9) for _ in range(5)]
        if uniq_max(v1) and len(set(v1)) >= 4: break
    d1 = r.randrange(5)
    while d1 == v1.index(max(v1)) or any(0 <= k < 5 and v1[k] == v1[d1] for k in (d1 - 1, d1 + 1)): d1 = r.randrange(5)
    items.append(item(1, '讀', '單元 0', f'下面是「{ctx1[0]}」的表格。', dtable(ctx1[0], ('星期', WEEK[:5]), f'{ctx1[1]}（{ctx1[2]}）', v1),
                      [f'星期{WEEK[d1]}{ctx1[3]}？', f'哪一天的{ctx1[1]}最多？']))
    A += [('1(1)', f'{v1[d1]} {ctx1[2]}', '0', '對準星期那一欄往下找；寫成隔壁那天的數表示對錯欄（misalign）'),
          ('1(2)', f'星期{WEEK[v1.index(max(v1))]}', '0', f'找最大的數 {max(v1)}，再往上看是哪一天；寫 {max(v1)} 表示答成數值不是時間')]

    # 2 一格是多少（單元 0）
    u2 = r.choice([2, 5])
    arrow = r.choice([k for k in range(1, 10) if k % 5])
    items.append(item(2, '讀', '單元 0', '下面的數線，每一小格一樣長。', number_line(u2, 10, 5, arrow),
                      ['一小格是多少？', '箭頭指的數是多少？']))
    A += [('2(1)', f'{u2}', '0', f'0 到 {5 * u2} 中間有 5 格，{5 * u2} ÷ 5；寫 1 表示把一格當 1，寫 {5 * u2} 表示寫成兩個寫了數的刻度差'),
          ('2(2)', f'{arrow * u2}', '0', f'從 0 數 {arrow} 格，每格 {u2}；寫 {arrow} 表示一格當 1（scaleAsOne），寫 {arrow + 1} 表示數刻度線不是數格子（countTicks）')]

    # 3 折線圖的零件、表格和點（單元 1）
    while True:
        v3 = [r.randint(1, 8) for _ in range(5)]
        if all(v3[i] != v3[i + 1] for i in range(4)): break
    d3 = r.randrange(5)
    items.append(item(3, '讀', '單元 1', '下面是「小明每天跳繩的次數」的折線圖。縱軸的單位是「十下」，1 表示跳了 10 下。',
                      chart('小明每天跳繩的次數', [f'星期{w}' for w in WEEK[:5]], '星期', '次數', '十下', [('小明', v3, 'a')], 1, 9),
                      ['下面的橫軸，記錄的是什麼？', '左邊的縱軸，單位是什麼？', f'星期{WEEK[d3]}的點，表示那天跳了幾個「十下」？']))
    A += [('3(1)', '星期（時間）', '1', '橫軸寫時間；寫「次數」表示橫軸、縱軸對調'),
          ('3(2)', '十下', '1', '單位寫在縱軸名稱後面的括號'),
          ('3(3)', f'{v3[d3]} 個十下（{v3[d3] * 10} 下）', '1', '一筆資料就是一個點；寫成「幾下」也算對')]

    # 4 讀出數值（單元 2）：一格是 2 或 10，一個點在兩條格線中間
    c4 = r.choice([('豆芽每個月的高度', '高度', '公分', 2), ('小華每個月存的錢', '金額', '元', 10)])
    title4, yname4, unit4, st4 = c4
    m0 = r.randint(0, 6)
    xs4 = MONTHS[m0:m0 + 6]
    while True:
        v4 = [r.randint(1, 9) * st4 for _ in range(6)]
        half = r.randrange(6)
        v4[half] += st4 // 2
        rd = r.choice([i for i in range(6) if i != half])
        rv = r.choice([i for i in range(6) if i not in (half, rd)])
        if v4.count(v4[rv]) == 1 and all(v4[i] != v4[i + 1] for i in range(5)) and max(v4) <= 9 * st4: break
    items.append(item(4, '讀', '單元 2', f'下面是「{title4}」的折線圖。', chart(title4, xs4, '月份', yname4, unit4, [(title4, v4, 'a')], st4, 10, every=2),
                      [f'{xs4[rd]}是多少{unit4}？', f'哪一個月是 {v4[rv]} {unit4}？', f'{xs4[half]}是多少{unit4}？']))
    A += [('4(1)', f'{v4[rd]} {unit4}', '2', f'先看一格是 {st4}，再從點往左對到縱軸；寫 {v4[rd] // st4} 表示一格當 1（scaleAsOne）'),
          ('4(2)', xs4[rv], '2', '反過來找：從縱軸的數往右找到點，再往下看月份'),
          ('4(3)', f'{v4[half]} {unit4}', '2', f'點在兩條格線正中間，是下面的數加半格（{st4 // 2}）')]

    # 5 看出變化（單元 3）：增加最多的一段，不是走到最高點的那一段
    while True:
        v5 = [r.randint(2, 15) for _ in range(6)]
        d = [v5[i + 1] - v5[i] for i in range(5)]
        if not all(x != 0 for x in d) or not uniq_max(v5): continue
        big = d.index(max(d))
        if d.count(max(d)) == 1 and max(d) >= 3 and big + 1 != v5.index(max(v5)) and v5.index(max(v5)) > 0 and d[v5.index(max(v5)) - 1] > 0:
            ask = r.choice([i for i in range(5) if i != big])
            break
    days5 = [f'星期{w}' for w in WEEK[:6]]
    trend = '變多' if d[ask] > 0 else '變少'
    items.append(item(5, '讀', '單元 3', '下面是「一週每天的最高氣溫」的折線圖（星期一到星期六）。',
                      chart('一週每天的最高氣溫', days5, '星期', '氣溫', '度', [('氣溫', v5, 'a')], 1, 16, every=2, colw=52),
                      [(f'從{days5[ask]}到{days5[ask + 1]}，氣溫是變多、變少，還是一樣？', 'blank', ['變多', '變少', '一樣']),
                       '哪兩天之間，氣溫增加得最多？', '那兩天之間增加了幾度？']))
    A += [('5(1)', trend, '3', '線往上是變多，往下是變少'),
          ('5(2)', f'{days5[big]}到{days5[big + 1]}', '3', f'找往上最陡的一段；答到{days5[v5.index(max(v5)) - 1]}到{days5[v5.index(max(v5))]}表示把「最高」當成「增加最多」（highVsChange）'),
          ('5(3)', f'{max(d)} 度', '3', '後面的數減前面的數')]

    # 6 兩條線比一比（單元 3）
    while True:
        a6 = [r.randint(2, 9) for _ in range(5)]
        b6 = [r.randint(2, 9) for _ in range(5)]
        t6 = r.randrange(5)
        if abs(a6[t6] - b6[t6]) >= 2 and all(a6[i] != b6[i] for i in range(5)): break
    items.append(item(6, '讀', '單元 3', '甲、乙兩株豆苗，每天量一次高度。先看圖下面的圖例，分清楚哪一條線是哪一株。',
                      chart('兩株豆苗的高度', [f'第 {i + 1} 天' for i in range(5)], '天', '高度', '公分', [('甲株', a6, 'a'), ('乙株', b6, 'b')], 1, 10, every=2),
                      [f'第 {t6 + 1} 天，甲株和乙株相差幾公分？']))
    A += [('6', f'{abs(a6[t6] - b6[t6])} 公分', '3', f'先看圖例，讀同一天兩個點（甲 {a6[t6]}、乙 {b6[t6]}），大的減小的；寫 {a6[t6] + b6[t6]} 表示加起來')]

    # 7 選對圖（單元 4）
    ordered = ['一年每個月的雨量', '小狗每個月的體重', '一天裡每個小時的氣溫', '小華每個月存的錢']
    cat = ['全班最喜歡的水果', '各班的人數', '全班最喜歡的運動', '每種顏色的筆有幾枝']
    pair = [('折線圖', r.choice(ordered)), ('長條圖', r.choice(cat))]
    r.shuffle(pair)
    items.append(item(7, '判', '單元 4', '要把下面的資料畫成圖。用長條圖還是折線圖比較好？',
                      '', [(f'「{pair[0][1]}」', 'blank', ['長條圖', '折線圖']), (f'「{pair[1][1]}」', 'blank', ['長條圖', '折線圖'])]))
    A += [(f'7({i + 1})', k, '4', '有時間順序、要看變化，用折線圖；沒有順序、一樣一樣比多少，用長條圖（選錯記 wrongChart）') for i, (k, _) in enumerate(pair)]

    # 8 畫折線圖（單元 5，五年級）：一格是 2，有一天是 0
    while True:
        v8 = [r.randint(0, 8) * 2 for _ in range(5)]
        if v8.count(0) == 1 and all(v8[i] != v8[i + 1] for i in range(4)) and max(v8) >= 10: break
    days8 = [f'星期{w}' for w in WEEK[:5]]
    items.append(item(8, '畫', '單元 5（五年級）', '下面是「一週每天的雨量」。請照表格，在方格上畫折線圖。縱軸一格是 2 公釐。',
                      dtable('一週每天的雨量', ('星期', WEEK[:5]), '雨量（公釐）', v8) + chart('一週每天的雨量', days8, '星期', '雨量', '公釐', [], 2, 9, every=1, blank=True, yname_blank=True),
                      [('把每一天的雨量描成一個點。', 'draw'), ('照時間的順序，把點連成線。', 'draw'), ('在縱軸旁邊寫上名稱和單位。', 'draw')]))
    A += [('8(1)', '五個點都描對：' + '、'.join(f'{d[2:]} {v}' for d, v in zip(days8, v8)), '5', '0 也要描在最下面（漏描記 zeroMissing）；位置差一格記 misalign'),
          ('8(2)', '從星期一照順序連到星期五', '5', '跳著連或沒有連，記 orderJump'),
          ('8(3)', '雨量（公釐）', '5', '名稱和單位都寫才給分')]
    key8 = chart('一週每天的雨量', days8, '星期', '雨量', '公釐', [('雨量', v8, 'a')], 2, 9, every=1)

    # 9 波浪線省略（單元 5，五年級）
    while True:
        v9 = sorted(r.sample(range(131, 146), 5))
        if v9[-1] - v9[0] >= 6: break
    mm = ['3月', '4月', '5月', '6月', '7月']
    items.append(item(9, '判', '單元 5（五年級）', '小傑每個月量一次身高，要畫成折線圖。', dtable('小傑每個月的身高', ('月份', mm), '身高（公分）', v9),
                      [('縱軸如果從 0 開始畫，點都會擠在最上面。縱軸最下面從哪一個數開始比較好？', 'blank', ['0', '130', '140']),
                       '0 到那個數中間省略了，縱軸上要畫什麼記號？']))
    A += [('9(1)', '130', '5', f'要比最小的數 {v9[0]} 小、又最接近；選 140 會畫不到 {v9[0]}，選 0 表示不知道可以省略'),
          ('9(2)', '波浪線（〰）', '5', '畫出波浪線的樣子也算對')]

    # 10 用圖說話（單元 6，五年級）
    while True:
        v10 = [r.randint(2, 9) for _ in range(5)]
        if uniq_max(v10) and v10[0] != v10[4] and all(v10[i] != v10[i + 1] for i in range(4)): break
    mx = v10.index(max(v10))
    opts = [('see', f'星期{WEEK[mx]}的點最高，喝了 {max(v10)} 杯'), ('future', f'下星期的星期{WEEK[mx]}，一定也喝最多'), ('feel', '我覺得每天喝的都一樣')]
    r.shuffle(opts)
    letters = 'ABC'
    items.append(item(10, '讀', '單元 6（五年級）', '下面是「小華每天喝水的杯數」的折線圖。',
                      chart('小華每天喝水的杯數', [f'星期{w}' for w in WEEK[:5]], '星期', '杯數', '杯', [('小華', v10, 'a')], 1, 10, every=2),
                      [('哪一句是從圖上看得到的？寫出代號。', 'blank', [f'{letters[i]}. {t}' for i, (_, t) in enumerate(opts)]),
                       ('星期五和星期一比，喝的水是變多還是變少？', 'blank', ['變多', '變少'])]))
    A += [('10(1)', letters[[k for k, _ in opts].index('see')], '6', '根據要是圖上看得到的；選「一定也」記 overPredict'),
          ('10(2)', '變多' if v10[4] > v10[0] else '變少', '6', '比第一個點和最後一個點的高低')]
    return items, A, key8


UNITS = [('0 準備好了嗎（表格、一格是多少）', ['1(1)', '1(2)', '2(1)', '2(2)']),
         ('1 認識折線圖', ['3(1)', '3(2)', '3(3)']),
         ('2 讀出數值', ['4(1)', '4(2)', '4(3)']),
         ('3 看出變化（含兩條線）', ['5(1)', '5(2)', '5(3)', '6']),
         ('4 選對圖', ['7(1)', '7(2)']),
         ('5 畫折線圖（五年級）', ['8(1)', '8(2)', '8(3)', '9(1)', '9(2)']),
         ('6 用圖說話（五年級）', ['10(1)', '10(2)'])]


def page(n, items, A, key8):
    num = f'{n:02d}'
    rows = ''.join(f'<tr><td class="num">{q}</td><td>{html.escape(a)}</td><td class="num">{u}</td><td>{html.escape(c)}</td></tr>' for q, a, u, c in A)
    urows = ''.join(f'<tr><td>{name}</td><td>{"、".join(qs)}</td><td class="num">{len(qs)}</td><td class="num">{math.ceil(len(qs) * 0.8) - 1} 分以下</td><td class="score"></td></tr>' for name, qs in UNITS)
    total = len(A)
    g4 = sum(len(qs) for name, qs in UNITS[:5])
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>折線圖前測 卷號 {num}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>{CSS}
@media print {{ .teacher {{ display: block; }} .teacher > * + * {{ margin-top: 14px; }} .teacher h3 {{ break-after: avoid; }} tr {{ break-inside: avoid; }} th {{ white-space: nowrap; }} }}</style></head><body><div class="wrap"><main class="sheet" id="v{num}">
  <header class="sheet-head">
    <div class="serial">卷號 <b>{num}</b></div>
    <h1>折線圖前測</h1>
    <div class="meta"><span>學生代號<i></i></span><span>日期<i></i></span><span>施測者<i></i></span></div>
    <p class="note">一共 10 題，每個小題 1 分，共 {total} 分。四年級做第 1～7 題（{g4} 分），五年級做全部。老師可以把每一句題目唸給學生聽。有單位的答案要寫單位。不限時間。</p>
  </header>
  {"".join(items)}
  <section class="teacher">
    <h2>教師用：卷號 {num} 的答案與計分</h2>
    <h3>計分規則</h3>
    <ul>
      <li>每個小題 1 分。有單位的題目，數字和單位都對才給分；選擇的題目寫字或打勾都可以。</li>
      <li>第 8 題（畫圖）：(1) 五個點都在對的位置才給分，(2) 從星期一照順序連到星期五，(3) 縱軸寫了名稱和單位。(1) 描錯的點，(2) 照順序連起來仍給分。</li>
      <li>四年級只做第 1～7 題（單元 0～4），滿分 {g4} 分；五年級做全部，滿分 {total} 分。</li>
    </ul>
    <h3>答案</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>小題</th><th>答案</th><th>單元</th><th>測的概念、常見錯誤（括號是網站的觀察代碼）</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
    <h3>第 8 題的正確圖</h3>
    <div class="fig">{key8}</div>
    <h3>各單元得分與篩選</h3>
    <p>答對率未達 80% 的單元算「還沒學會」。依單元順序，選最前面 3 個還沒學會的單元進行教學；少於 3 個的學生不列入。單元 0 還沒學會的學生，網站上先做 0-1、0-2。</p>
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
        fh.write('卷號,小題,答案\n')
        for n in range(1, 21):
            items, A, key8 = make(n)
            open(os.path.join(OUT, f'pretest-{n:02d}.html'), 'w', encoding='utf-8').write(page(n, items, A, key8))
            for q, a, _, _ in A:
                fh.write(f'{n:02d},{q},"{a}"\n')
    print('wrote 20 HTML files and answers.csv to', OUT)
