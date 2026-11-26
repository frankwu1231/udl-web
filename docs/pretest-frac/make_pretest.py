# 分數前測：產生 20 份 HTML（一般版）與 answers.csv。版面沿用時間概念前測（docs/pretest-time/）。
# 依網站第 33 版的單元 0～11：二、三年級做第 1～4 題（單元 0～3），四年級做第 1～8 題（再加單元 4～7），
# 五、六年級做第 1～11 題（再加單元 8～10）；第 12 題「分數小幫手」（單元 11）各年級都做，也可留到教學後當類化探測。
# 分母範圍照網站（docs/frac 大綱、第33版_Codex測試說明.md 第二節）：二、三年級分母 2～8、結果不超過 2；四年級異分母限倍數、數線分母 ≤5、分小數互換限分母 2、5、10；五年級一般通分。
# 圖（長條、圓、數線）用 SVG 畫在卷上；人名、店名都是虛構的。
# 用法：python3 docs/pretest-frac/make_pretest.py  →  docs/pretest-frac/pretest-versions/pretest-01～20.html、answers.csv
# 注音版：python3 docs/pretest-frac/make_zhuyin.py；轉 PDF：node docs/pretest-frac/make-pdfs.mjs [輸出資料夾] [zhuyin]
import html, math, os, random
from fractions import Fraction as Fr

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'pretest-versions')
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()


def F(a, b, w=0):   # 卷上的直式分數
    return (f'<span class="fr-w">{w}</span>' if w else '') + f'<span class="fr"><span>{a}</span><span>{b}</span></span>'


def T(x):   # 答案欄的文字：3/4、1又1/2、2
    x = Fr(x)
    if x.denominator == 1: return str(x.numerator)
    w, r = divmod(x.numerator, x.denominator)
    return f'{w}又{r}/{x.denominator}' if w else f'{r}/{x.denominator}'


def bar(den, k, label, cuts=None, w=300):
    H, xs = 44, cuts or [j / den for j in range(den + 1)]
    g = ''.join(f'<rect x="{4 + xs[j] * w:.1f}" y="4" width="{(xs[j + 1] - xs[j]) * w:.1f}" height="{H}" fill="{"#9fbde0" if j < k else "#fff"}" stroke="#1d2b44" stroke-width="2"/>' for j in range(len(xs) - 1))
    return f'<figure class="fig-sub"><svg viewBox="0 0 {w + 8} {H + 8}" width="{w + 8}" height="{H + 8}" role="img" aria-label="長條">{g}</svg><figcaption>{label}</figcaption></figure>'


def pie(den, k, label, angles=None):
    R, g, a = 60, '', angles or [j / den for j in range(den + 1)]
    for j in range(len(a) - 1):
        t0, t1 = a[j] * 2 * math.pi, a[j + 1] * 2 * math.pi
        x0, y0, x1, y1 = R * math.sin(t0), -R * math.cos(t0), R * math.sin(t1), -R * math.cos(t1)
        big = 1 if t1 - t0 > math.pi else 0
        g += f'<path d="M0 0L{x0:.1f} {y0:.1f}A{R} {R} 0 {big} 1 {x1:.1f} {y1:.1f}Z" fill="{"#9fbde0" if j < k else "#fff"}" stroke="#1d2b44" stroke-width="2"/>'
    return f'<figure class="fig-sub"><svg viewBox="-66 -66 132 132" width="132" height="132" role="img" aria-label="圓">{g}</svg><figcaption>{label}</figcaption></figure>'


def numline(den, k, mx=2):
    L, u, y = 30, 160, 40
    W = 2 * L + mx * u
    g = [f'<path d="M{L - 10} {y}H{W - L + 14}" stroke="#1d2b44" stroke-width="2"/><path d="M{W - L + 14} {y}l-8 -5v10z" fill="#1d2b44"/>']
    for j in range(mx * den + 1):
        x, major = L + j * u / den, j % den == 0
        g.append(f'<path d="M{x:.1f} {y - (12 if major else 7)}V{y + (12 if major else 7)}" stroke="#1d2b44" stroke-width="{3 if major else 1.5}"/>')
        if major: g.append(f'<text x="{x:.1f}" y="{y + 32}" text-anchor="middle" font-size="16" font-weight="700">{j // den}</text>')
    x = L + k * u / den
    g.append(f'<path d="M{x:.1f} {y - 34}V{y - 16}" stroke="#c2410c" stroke-width="3"/><path d="M{x:.1f} {y - 12}l-6 -9h12z" fill="#c2410c"/>')
    return f'<figure class="fig-sub"><svg viewBox="0 0 {W + 6} {y + 44}" width="{W + 6}" height="{y + 44}" role="img" aria-label="數線">{"".join(g)}</svg><figcaption>箭頭指的位置</figcaption></figure>'


def unequal(n, r):
    while True:
        c = sorted([0, 1] + [j / n + (r.random() - .5) * .7 / n for j in range(1, n)])
        w = [c[j + 1] - c[j] for j in range(n)]
        if min(w) > .45 / n and max(w) - min(w) > .3 / n: return c


def sub(no, q, opts=None):
    ch = f'<span class="choices">{"".join(f"<span>{o}</span>" for o in opts)}</span>' if opts else ''
    return f'<li><span class="sub-no">({no})</span><span class="sub-q">{q}{ch}</span><span class="ans">答：<span class="blank"></span></span></li>'


def item(no, tag, units, stem, subs, fig=''):
    t = '<span class="tag tag-calc">計算</span>' if tag == '算' else '<span class="tag tag-app">判斷</span>'
    lis = ''.join(sub(i + 1, *s) if isinstance(s, tuple) else sub(i + 1, s) for i, s in enumerate(subs))
    f = f'\n  <div class="fig">{fig}</div>' if fig else ''
    return (f'<section class="item">\n  <header class="item-head"><span class="no">{no}</span>{t}<span class="unit-tag">{units}</span></header>\n'
            f'  <p class="stem">{stem}</p>{f}\n  <ol class="subs">{lis}</ol>\n</section>')


def make(n):
    r = random.Random(20261119 * 100 + 33 * 1000 + n)
    A, items = [], []   # A：(小題, 答案, 單元, 概念與常見錯誤)
    # 1 一樣大嗎（單元 0）
    n1, n2 = r.choice([3, 4]), r.choice([2, 4])
    eq1, eq2 = r.choice(['甲', '乙']), r.choice(['丙', '丁'])
    ua = unequal(n1, r)
    f1 = (bar(n1, 0, '甲') + bar(n1, 0, '乙', ua)) if eq1 == '甲' else (bar(n1, 0, '甲', ua) + bar(n1, 0, '乙'))
    angs = [0, .5 + .12, 1] if n2 == 2 else [0, .18, .5, .82, 1]
    f2 = (pie(n2, 0, '丙') + pie(n2, 0, '丁', angs)) if eq2 == '丙' else (pie(n2, 0, '丙', angs) + pie(n2, 0, '丁'))
    items.append(item(1, '判斷', '單元 0', '每一塊都一樣大，才是「平分」。', [(f'甲、乙兩條吐司都切成 {n1} 塊，哪一條是平分？', ['甲', '乙']), (f'丙、丁兩個蛋糕都切成 {n2} 塊，哪一個是平分？', ['丙', '丁'])], f1 + f2))
    A += [('1(1)', eq1, '0', '每一塊一樣大才是平分；只數塊數不看大小表示還沒有平分的概念（unequalOK）'), ('1(2)', eq2, '0', '同上；圓形也要每一塊一樣大')]
    # 2 幾分之一（單元 1）
    d2 = r.choice([3, 4, 6]); fo = r.choice([1, 2])
    items.append(item(2, '算', '單元 1', '回答下面的問題。', [f'塗色的 1 塊，是一整條的幾分之一？', f'一張長方形色紙對摺 {fo} 次再打開，一格是整張的幾分之一？', ('一個蛋糕的「一半」，是幾分之一？', [F(1, 2), F(1, 3), F(1, 4)])], bar(d2, 1, '')))
    A += [('2(1)', f'1/{d2}', '1', f'全部平分成 {d2} 份，1 份是 1/{d2}；寫 1/{d2 - 1} 表示分母寫成沒塗色的份數（partToPart）'),
          ('2(2)', f'1/{2 ** fo}', '1', '每摺一次格子變 2 倍，不是每次多 2 格'), ('2(3)', '1/2', '1', '一半就是平分成 2 份的 1 份')]
    # 3 幾分之幾（單元 2）
    d3 = r.choice([5, 6, 8]); k3 = r.randint(2, d3 - 2); d4 = r.choice([5, 7, 9]); k4 = r.randint(2, d4 - 1)
    items.append(item(3, '算', '單元 2', '看圖回答。', ['塗色的部分是一個圓的幾分之幾？', f'{F(k4, d4)} 是幾個 {F(1, d4)}？', '圓上還要再塗幾分之幾，才是一整個？'], pie(d3, k3, '')))
    A += [('3(1)', f'{k3}/{d3}', '2', f'分母寫全部 {d3} 份、分子寫塗色 {k3} 份；寫成 {d3}/{k3} 表示分子分母放反（numDenSwap），寫 {k3}/{d3 - k3} 表示部分比部分（partToPart）'),
          ('3(2)', f'{k4} 個', '2', '分子是幾，就是幾個幾分之一'), ('3(3)', f'{d3 - k3}/{d3}', '2', f'一整個是 {d3}/{d3}，還差 {d3 - k3} 份')]
    # 4 同分母比大小與加減（單元 3）
    d5 = r.choice([5, 6, 7, 8]); a5, c5 = r.sample(range(1, d5), 2)
    d6 = r.choice([5, 7, 9]); a6 = r.randint(1, d6 - 2); b6 = r.choice([x for x in range(1, d6) if x != d6 - a6])
    d7 = r.choice([4, 6, 8]); a7 = r.randint(1, d7 - 1)
    items.append(item(4, '算', '單元 3', '比一比、算一算。', [(f'{F(a5, d5)} 和 {F(c5, d5)}，哪一個比較大？', [F(a5, d5), F(c5, d5), '一樣大']), f'{F(a6, d6)} ＋ {F(b6, d6)} ＝ □', f'1 － {F(a7, d7)} ＝ □']))
    A += [('4(1)', f'{max(a5, c5)}/{d5}', '3', '分母一樣，分子大的比較大'),
          ('4(2)', T(Fr(a6 + b6, d6)) + (f'（或 {a6 + b6}/{d6}）' if a6 + b6 > d6 else ''), '3', f'分母不變，分子相加；寫 {a6 + b6}/{2 * d6} 表示分母也相加（addDen）'),
          ('4(3)', f'{d7 - a7}/{d7}', '3', f'1 ＝ {d7}/{d7}，再減 {a7}/{d7}')]
    # 5 真分數、假分數、帶分數（單元 4）
    d8 = r.choice([3, 4, 5]); w8 = r.randint(1, 3); r8 = r.randint(1, d8 - 1); im = w8 * d8 + r8
    d9 = r.choice([4, 6, 8]); w9 = r.randint(1, 2); r9 = r.randint(1, d9 - 1)
    q5 = r.choice([(F(d8, d8), '假分數'), (F(r8, d8), '真分數'), (F(im, d8), '假分數')])
    items.append(item(5, '算', '單元 4', '真分數、假分數和帶分數。', [f'{F(im, d8)} 寫成帶分數是多少？', f'{F(r9, d9, w9)} 寫成假分數是多少？', (f'{q5[0]} 是真分數還是假分數？', ['真分數', '假分數'])]))
    A += [('5(1)', f'{w8}又{r8}/{d8}', '4', f'{im} 裡面有 {w8} 個 {d8}，還剩 {r8}（mixedConvert）'),
          ('5(2)', f'{w9 * d9 + r9}/{d9}', '4', f'{w9} ＝ {w9 * d9}/{d9}，再加 {r9}/{d9}；寫 {w9 + r9}/{d9} 表示整數直接加到分子（mixedConvert）'), ('5(3)', q5[1], '4', '分子比分母小是真分數；分子等於或大於分母是假分數')]
    # 6 同分母加減與整數倍（單元 5）
    d10 = r.choice([4, 5, 6]); w10, a10 = r.randint(1, 2), r.randint(1, d10 - 2); b10 = r.randint(1, d10 - a10 - 1) if d10 - a10 > 1 else 1
    d11 = r.choice([5, 7]); w11, a11 = r.randint(2, 3), r.randint(1, d11 - 2); b11 = r.randint(a11 + 1, d11 - 1)
    d12 = r.choice([3, 4, 5]); a12 = r.randint(1, d12 - 1); k12 = r.randint(3, 5)
    items.append(item(6, '算', '單元 5', '算算看。', [f'{F(a10, d10, w10)} ＋ {F(b10, d10, 1)} ＝ □', f'{F(a11, d11, w11)} － {F(b11, d11)} ＝ □', f'小華每天喝 {F(a12, d12)} 瓶牛奶，{k12} 天一共喝了幾瓶？']))
    A += [('6(1)', T(Fr(w10 * d10 + a10, d10) + Fr(d10 + b10, d10)), '5', '整數加整數、分數加分數'),
          ('6(2)', T(Fr(w11 * d11 + a11, d11) - Fr(b11, d11)), '5', f'分子 {a11} 不夠減 {b11}，要拿 1 個整數換成 {d11}/{d11}（borrowWhole）'),
          ('6(3)', T(Fr(a12 * k12, d12)) + ' 瓶' + (f'（或 {a12 * k12}/{d12} 瓶）' if a12 * k12 > d12 and (a12 * k12) % d12 else ''), '5', f'{k12} 個 {a12}/{d12}，分子 × {k12}、分母不變；分母也乘表示整數倍算錯')]
    # 7 等值分數（單元 6）
    b13, m13 = r.choice([2, 3, 4]), r.choice([2, 3]); a13 = r.randint(1, b13 - 1)
    b14, m14 = r.choice([3, 4, 5]), 2; a14 = r.randint(1, b14 - 1)
    b15, m15 = r.choice([2, 3, 4]), 2; a15 = r.randint(1, b15 - 1); c15 = r.choice([x for x in range(1, b15 * m15) if x != a15 * m15])
    items.append(item(7, '算', '單元 6', '一樣大的分數。', [f'{F(a13, b13)} ＝ {F("□", b13 * m13)}，□ 是多少？', f'{F(a14, b14)} ＝ {F(a14 * m14, "□")}，□ 是多少？', (f'{F(a15, b15)} 和 {F(c15, b15 * m15)}，哪一個比較大？', [F(a15, b15), F(c15, b15 * m15), '一樣大'])]))
    big = f'{a15}/{b15}' if a15 * m15 > c15 else f'{c15}/{b15 * m15}'
    A += [('7(1)', str(a13 * m13), '6', f'分母乘 {m13}，分子也要乘 {m13}；寫 {a13 + b13 * m13 - b13} 表示加同一個數（equivAdd）'), ('7(2)', str(b14 * m14), '6', '分子乘 2，分母也乘 2（equivAdd）'),
          ('7(3)', big, '6', f'先把 {a15}/{b15} 換成分母 {b15 * m15}；以為分母大的就大表示 bigDenBig')]
    # 8 數線、分數和小數（單元 7）
    d16 = r.choice([3, 4, 5]); k16 = r.choice([x for x in range(1, 2 * d16) if x % d16])
    t17 = r.choice([1, 3, 7, 9]); h18 = r.choice([(Fr(1, 2), '0.5'), (Fr(1, 5), '0.2'), (Fr(3, 5), '0.6'), (Fr(4, 5), '0.8')])
    items.append(item(8, '算', '單元 7', '看數線回答；分數和小數。', ['箭頭指的是多少？寫成分數。', f'{F(t17, 10)} 寫成小數是多少？', f'{h18[1]} 寫成分數是多少？'], numline(d16, k16)))
    A += [('8(1)', T(Fr(k16, d16)) + (f'（或 {k16}/{d16}）' if k16 > d16 else ''), '7', f'0 到 1 分成 {d16} 段，數「段」不數刻度線；寫成 {k16}/{d16 + 1} 表示數了刻度線（countTicks）'),
          ('8(2)', f'0.{t17}', '7', f'{t17} 個 0.1；寫 0.0{t17} 或 {t17}.0 表示小數點位置錯（fracDecDigit）'),
          ('8(3)', f'{T(h18[0])}（或 {int(float(h18[1]) * 10)}/10）', '7', '一位小數是十分之幾，可以再約分')]
    # 9 擴分、約分、異分母加減（單元 8）
    b19, m19 = r.choice([3, 4, 5]), r.choice([2, 3]); a19 = r.choice([x for x in range(1, b19) if math.gcd(x, b19) == 1])
    p20 = r.choice([(2, 3), (3, 4), (2, 5), (4, 6), (3, 5)]); a20 = r.randint(1, p20[0] - 1); c20 = r.randint(1, p20[1] - 1)
    while Fr(a20, p20[0]) + Fr(c20, p20[1]) >= 1 and r.random() < .7: c20 = r.randint(1, p20[1] - 1)
    p21 = r.choice([(4, 6), (6, 8), (4, 10), (6, 9)]); a21 = r.choice([x for x in range(1, p21[0]) if math.gcd(x, p21[0]) == 1]); c21 = r.choice([x for x in range(1, p21[1]) if Fr(x, p21[1]) < Fr(a21, p21[0])])
    items.append(item(9, '算', '單元 8', '約分與異分母加減。答案要約成最簡分數。', [f'把 {F(a19 * m19, b19 * m19)} 約成最簡分數。', f'{F(a20, p20[0])} ＋ {F(c20, p20[1])} ＝ □', f'{F(a21, p21[0])} － {F(c21, p21[1])} ＝ □']))
    A += [('9(1)', f'{a19}/{b19}', '8', f'分子分母同除以 {m19}；沒有除到最簡記 notSimplest'),
          ('9(2)', T(Fr(a20, p20[0]) + Fr(c20, p20[1])), '8', f'先通分；寫 {a20 + c20}/{p20[0] + p20[1]} 表示分子分母各自相加（addAcross）'),
          ('9(3)', T(Fr(a21, p21[0]) - Fr(c21, p21[1])), '8', f'公分母用 {p21[0] * p21[1] // math.gcd(*p21)}，分母直接相乘也可以但要約分（denProduct、notSimplest）')]
    # 10 分數乘法（單元 9）
    b22 = r.choice([3, 4, 5]); a22 = r.randint(1, b22 - 1); n22 = b22 * r.randint(2, 4)
    a23, b23, c23, d23 = r.choice([(2, 3, 3, 4), (1, 2, 4, 5), (3, 4, 2, 5), (2, 5, 1, 3), (3, 5, 5, 6)])
    n24 = r.randint(4, 9); fr24 = r.choice([(2, 3), (3, 4), (4, 5), (5, 4), (3, 2)])
    items.append(item(10, '算', '單元 9', '分數乘法。答案要約成最簡分數。', [f'{n22} 顆糖的 {F(a22, b22)} 是幾顆？', f'{F(a23, b23)} × {F(c23, d23)} ＝ □', (f'{n24} × {F(*fr24)} 的答案，比 {n24} 大還是比 {n24} 小？', [f'比 {n24} 大', f'比 {n24} 小'])]))
    A += [('10(1)', f'{n22 * a22 // b22} 顆', '9', f'先分成 {b22} 份，一份 {n22 // b22} 顆，再拿 {a22} 份'),
          ('10(2)', T(Fr(a23 * c23, b23 * d23)), '9', '分子乘分子、分母乘分母，再約分'),
          ('10(3)', f'比 {n24} 大' if fr24[0] > fr24[1] else f'比 {n24} 小', '9', '乘以比 1 大的數，答案變大；乘以比 1 小的數，答案變小；以為乘法一定變大記 multBigger')]
    # 11 整數相除、分數除法（單元 10）
    p25 = r.choice([(2, 3), (3, 4), (3, 5), (4, 5), (5, 6)])
    n26, d26 = r.randint(2, 4), r.choice([2, 3, 4])
    a27, b27, c27, d27 = r.choice([(3, 4, 3, 8), (2, 3, 1, 6), (4, 5, 2, 5), (1, 2, 1, 6), (3, 5, 3, 10)])
    items.append(item(11, '算', '單元 10', '分數除法。答案要約成最簡分數。', [f'{p25[0]} 個披薩平分給 {p25[1]} 個人，每人分到幾個披薩？寫成分數。', f'{n26} ÷ {F(1, d26)} ＝ □', f'{F(a27, b27)} ÷ {F(c27, d27)} ＝ □']))
    A += [('11(1)', f'{p25[0]}/{p25[1]} 個', '10', f'{p25[0]} ÷ {p25[1]} ＝ {p25[0]}/{p25[1]}；寫成 {p25[1]}/{p25[0]} 表示被除數、除數放反'),
          ('11(2)', str(n26 * d26), '10', f'{n26} 裡面有幾個 1/{d26}；寫 {n26}/{d26} 表示乘除弄反（divFlipWrong）'),
          ('11(3)', T(Fr(a27, b27) / Fr(c27, d27)), '10', '乘以除數的倒數；顛倒成被除數的倒數記 divFlipWrong')]
    # 12 分數小幫手（單元 11）
    s28 = r.choice([6, 8]); p28 = r.choice([x for x in [2, 3, 4] if s28 % x == 0])
    serv = r.choice([2, 3])
    t30 = r.choice([4, 5]); k30 = r.randint(1, t30 - 2)
    items.append(item(12, '判斷', '單元 11', '分數小幫手：生活裡的分數。', [f'1 個披薩切成 {s28} 片，{p28} 個人平分。每人分到幾片？是幾分之幾個披薩？',
                      f'做 1 份鬆餅要 {F(1, 2)} 杯牛奶。要做 {serv} 份，要幾杯牛奶？', f'1 瓶果汁平分成 {t30} 杯，已經喝了 {k30} 杯。瓶子裡還剩幾分之幾瓶？']))
    A += [('12(1)', f'{s28 // p28} 片，{T(Fr(1, p28))} 個（或 {s28 // p28}/{s28} 個）', '11', '整體是 1 個披薩；兩個空格都對才給分（wrongWhole）'),
          ('12(2)', T(Fr(serv, 2)) + ' 杯' + (f'（或 {serv}/2 杯）' if serv % 2 else ''), '11', f'{serv} 個 1/2 杯，食譜加倍'),
          ('12(3)', f'{t30 - k30}/{t30} 瓶', '11', f'整瓶是 {t30}/{t30}；寫 {k30}/{t30} 表示答成喝掉的部分')]
    return items, A


UNITS = [('0 準備好了嗎（平分）', ['1(1)', '1(2)']),
         ('1 平分與幾分之一', ['2(1)', '2(2)', '2(3)']),
         ('2 幾分之幾', ['3(1)', '3(2)', '3(3)']),
         ('3 同分母比大小與加減（三年級）', ['4(1)', '4(2)', '4(3)']),
         ('4 真分數、假分數、帶分數（四年級）', ['5(1)', '5(2)', '5(3)']),
         ('5 同分母加減與整數倍（四年級）', ['6(1)', '6(2)', '6(3)']),
         ('6 等值分數（四年級）', ['7(1)', '7(2)', '7(3)']),
         ('7 數線、分數和小數（四年級）', ['8(1)', '8(2)', '8(3)']),
         ('8 擴分、約分與異分母加減（五年級）', ['9(1)', '9(2)', '9(3)']),
         ('9 分數乘法（五年級）', ['10(1)', '10(2)', '10(3)']),
         ('10 整數相除與分數除法（五、六年級）', ['11(1)', '11(2)', '11(3)']),
         ('11 分數小幫手', ['12(1)', '12(2)', '12(3)'])]


def page(n, items, A):
    num = f'{n:02d}'
    rows = ''.join(f'<tr><td class="num">{q}</td><td>{html.escape(a)}</td><td class="num">{u}</td><td>{html.escape(c)}</td></tr>' for q, a, u, c in A)
    urows = ''.join(f'<tr><td>{name}</td><td>{"、".join(qs)}</td><td class="num">{len(qs)}</td><td class="num">{math.ceil(len(qs) * 0.8) - 1} 分以下</td><td class="score"></td></tr>' for name, qs in UNITS)
    cnt = lambda k: sum(len(qs) for _, qs in UNITS[:k])
    life = len(UNITS[-1][1])
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>分數前測 卷號 {num}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>{CSS}
@media print {{ .teacher {{ display: block; }} .teacher > * + * {{ margin-top: 14px; }} .teacher h3 {{ break-after: avoid; }} tr {{ break-inside: avoid; }} th {{ white-space: nowrap; }} .item {{ break-inside: avoid; }} }}</style></head><body><div class="wrap"><main class="sheet" id="v{num}">
  <header class="sheet-head">
    <div class="serial">卷號 <b>{num}</b></div>
    <h1>分數前測</h1>
    <div class="meta"><span>學生代號<i></i></span><span>日期<i></i></span><span>施測者<i></i></span></div>
    <p class="note">一共 12 題，每個小題 1 分。二、三年級做第 1～4 題和第 12 題，四年級做第 1～8 題和第 12 題，五、六年級做全部。老師可以把每一句題目唸給學生聽。有單位的答案要寫單位。可以寫算式、畫圖，不限時間。</p>
  </header>
  {"".join(items)}
  <section class="teacher">
    <h2>教師用：卷號 {num} 的答案與計分</h2>
    <h3>計分規則</h3>
    <ul>
      <li>每個小題 1 分。有單位的題目，數字和單位都對才給分；選擇的題目寫字或打勾都可以。</li>
      <li>分數答案：一樣大的分數都算對（例如 2/4 和 1/2），除非題目寫「約成最簡分數」；假分數和帶分數都算對。第 12(1) 題兩個空格都對才給分。</li>
      <li>二、三年級做第 1～4 題（{cnt(4)} 分）和第 12 題（{life} 分）；四年級做第 1～8 題（{cnt(8)} 分）和第 12 題；五、六年級做全部（{len(A)} 分）。第 12 題「分數小幫手」也可以留到教學後當類化探測。</li>
    </ul>
    <h3>答案</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>小題</th><th>答案</th><th>單元</th><th>測的概念、常見錯誤（括號是網站的觀察代碼）</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
    <h3>各單元得分與篩選</h3>
    <p>答對率未達 80% 的單元算「還沒學會」。依單元順序，選最前面 3 個還沒學會的單元進行教學；少於 3 個的學生不列入。單元 0 還沒學會的學生，網站上先做 0-1、0-2。網站路徑：二、三年級用「入門版」，四年級用「四年級版」，五、六年級用「五六年級版」，單元 11 用「分數小幫手」。</p>
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
            items, A = make(n)
            assert [q for _, qs in UNITS for q in qs] == [q for q, *_ in A], n
            open(os.path.join(OUT, f'pretest-{n:02d}.html'), 'w', encoding='utf-8').write(page(n, items, A))
            for q, a, _, _ in A:
                fh.write(f'{n:02d},{q},"{a}"\n')
    print('wrote 20 HTML files and answers.csv to', OUT)
