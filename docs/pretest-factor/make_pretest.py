# 因數與倍數前測：產生 20 份 HTML（一般版）與 answers.csv。版面沿用折線圖前測（docs/pretest-line/）。
# 依網站第 31 版的單元 0～7：五年級做第 1～7 題（單元 0～5），六年級做全部（再加第 8～10 題：質數、短除、約分通分）。
# 數字刻意小：五年級題的數都在 24 以內（公倍數答案 24 以內），六年級題在 50 以內，所有答案都在 100 以內。
# 用法：python3 docs/pretest-factor/make_pretest.py  →  docs/pretest-factor/pretest-versions/pretest-01～20.html、answers.csv
# 注音版：python3 docs/pretest-factor/make_zhuyin.py；轉 PDF：node docs/pretest-factor/make-pdfs.mjs [輸出資料夾] [zhuyin]
import html, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'pretest-versions')
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()


def factors(n):
    return [d for d in range(1, n + 1) if n % d == 0]


def gcd(a, b):
    return math.gcd(a, b)


def lcm(a, b):
    return a * b // math.gcd(a, b)


def is_prime(n):
    return n > 1 and all(n % d for d in range(2, int(n ** .5) + 1))


def pf(n):
    out, d = [], 2
    while n > 1:
        while n % d == 0:
            out.append(d); n //= d
        d += 1
    return out


def sub(no, q, opts=None):
    ch = f'<span class="choices">{"".join(f"<span>{html.escape(o)}</span>" for o in opts)}</span>' if opts else ''
    return f'<li><span class="sub-no">({no})</span><span class="sub-q">{q}{ch}</span><span class="ans">答：<span class="blank"></span></span></li>'


def item(no, tag, units, stem, subs):
    t = '<span class="tag tag-calc">計算</span>' if tag == '算' else '<span class="tag tag-app">判斷</span>'
    lis = ''.join(sub(i + 1, *s) if isinstance(s, tuple) else sub(i + 1, s) for i, s in enumerate(subs))
    return (f'<section class="item">\n  <header class="item-head"><span class="no">{no}</span>{t}<span class="unit-tag">{units}</span></header>\n'
            f'  <p class="stem">{stem}</p>\n  <ol class="subs">{lis}</ol>\n</section>')


def make(n):
    r = random.Random(20261117 * 100 + n)
    A, items = [], []   # A：(小題, 答案, 單元, 概念與常見錯誤)
    # 1 乘法表（單元 0）
    while True:
        a, b, c, d = (r.randint(2, 9) for _ in range(4))
        if a * b <= 24 and c * d <= 24 and a != b and c != d and (a, b) != (c, d): break
    items.append(item(1, '算', '單元 0', '在 □ 裡填上數字。', [f'{a} × □ ＝ {a * b}', f'□ × {d} ＝ {c * d}']))
    A += [('1(1)', str(b), '0', f'想 {a} 的乘法；寫 {a * b - a} 或 {a * b + a} 表示乘法表記錯'),
          ('1(2)', str(c), '0', f'□ 在前面也一樣，想 {d} 的乘法')]
    # 2 平分有沒有剩（單元 0）
    k = r.randint(3, 5)
    while True:
        t = r.randint(2 * k + 1, 23)
        if t % k: break
    items.append(item(2, '算', '單元 0', f'有 {t} 顆糖，平分給 {k} 個人，每個人分到一樣多。', ['每個人分到幾顆？', '還剩下幾顆？']))
    A += [('2(1)', f'{t // k} 顆', '0', f'{t} ÷ {k} ＝ {t // k} 餘 {t % k}'),
          ('2(2)', f'{t % k} 顆', '0', '餘數要比人數少；寫 0 表示以為剛好分完（remainderOK 的前備）')]
    # 3 因數（單元 1）
    n3 = r.choice([12, 16, 18, 20, 24])
    yes = r.choice([x for x in factors(n3) if 2 < x < n3])
    no = r.choice([x for x in range(3, 10) if n3 % x])
    ask = [(yes, '是'), (no, '不是')]; r.shuffle(ask)
    items.append(item(3, '算', '單元 1', f'{n3} 個方塊要排成長方形，每一排一樣多。',
                      [f'寫出 {n3} 的全部因數。', (f'{ask[0][0]} 是不是 {n3} 的因數？', ['是', '不是']), (f'{ask[1][0]} 是不是 {n3} 的因數？', ['是', '不是'])]))
    A += [('3(1)', '、'.join(map(str, factors(n3))), '1', '全部寫對才給分；漏 1 或自己（miss1Self）、漏成對的（missPair）'),
          ('3(2)', ask[0][1], '1', f'{n3} ÷ {ask[0][0]} 有沒有剩'), ('3(3)', ask[1][1], '1', f'{n3} ÷ {ask[1][0]} 有沒有剩；除了有剩卻答「是」（remainderOK）')]
    # 4 倍數（單元 2）
    a4 = r.randint(3, 6)
    m_yes = a4 * r.randint(3, 24 // a4)
    while True:
        m_no = r.randint(a4 + 1, 24)
        if m_no % a4: break
    items.append(item(4, '算', '單元 2', f'青蛙從 0 開始，每次跳 {a4} 格。',
                      [f'寫出 {a4} 的前 4 個倍數。', (f'{m_yes} 是不是 {a4} 的倍數？', ['是', '不是']), (f'{m_no} 是不是 {a4} 的倍數？', ['是', '不是']),
                       (f'{a4} 的倍數寫得完嗎？', ['寫得完', '寫不完'])]))
    A += [('4(1)', '、'.join(str(a4 * i) for i in range(1, 5)), '2', f'從 {a4} 開始；寫成 {a4} 的因數表示因數和倍數講反（swapFM）'),
          ('4(2)', '是', '2', f'{m_yes} ÷ {a4} 沒有剩'), ('4(3)', '不是', '2', f'{m_no} ÷ {a4} 有剩（remainderOK）'),
          ('4(4)', '寫不完', '2', '可以一直加下去（multFinite）')]
    # 5 公因數（單元 3）
    x5, y5 = r.choice([(12, 18), (8, 12), (12, 16), (16, 24), (10, 15), (18, 24), (9, 12)])
    g5 = gcd(x5, y5)
    thing = r.choice([('糖果', '顆', '餅乾', '塊'), ('鉛筆', '枝', '橡皮擦', '個'), ('紅花', '朵', '白花', '朵')])
    items.append(item(5, '算', '單元 3', f'有 {thing[0]} {x5} {thing[1]}、{thing[2]} {y5} {thing[3]}，要平分裝成袋，每一袋的{thing[0]}一樣多、{thing[2]}也一樣多，全部分完。',
                      [f'寫出 {x5} 和 {y5} 的全部公因數。', '最多可以裝成幾袋？', f'這時每一袋有幾{thing[1]}{thing[0]}？']))
    A += [('5(1)', '、'.join(map(str, [d for d in factors(x5) if y5 % d == 0])), '3', '兩個數的因數都有的數；全部寫對才給分'),
          ('5(2)', f'{g5} 袋', '3', f'最大公因數 {g5}；寫成最小公倍數 {lcm(x5, y5)} 表示弄混（gcdLcmSwap），寫成較小的公因數（pickWrongEnd）'),
          ('5(3)', f'{x5 // g5} {thing[1]}', '3', f'{x5} ÷ {g5}')]
    # 6 公倍數（單元 4）
    x6, y6 = r.choice([(2, 3), (3, 4), (4, 6), (2, 5), (3, 5), (6, 8), (4, 10), (3, 6)])
    l6 = lcm(x6, y6)
    ctx6 = r.choice([('紅燈每', '秒亮一次，綠燈每', '秒亮一次。兩個燈剛剛一起亮。', '秒', '最少再過幾秒，兩個燈又會一起亮？'),
                     ('甲公車每', '分鐘來一班，乙公車每', '分鐘來一班。兩班車剛剛一起到站。', '分鐘', '最少再過幾分鐘，兩班車又會一起到站？')])
    items.append(item(6, '算', '單元 4', f'{ctx6[0]} {x6} {ctx6[1]} {y6} {ctx6[2]}',
                      [f'寫出 {x6} 和 {y6} 在 {2 * l6} 以內的公倍數。', ctx6[4]]))
    A += [('6(1)', f'{l6}、{2 * l6}', '4', '兩個數的倍數都有的數；只寫一個不給分'),
          ('6(2)', f'{l6} {ctx6[3]}', '4', f'最小公倍數 {l6}；寫 {x6 * y6} 表示直接相乘（lcmProduct，兩數不互質時才錯），寫成公因數表示弄混（gcdLcmSwap）')]
    # 7 分清楚（單元 5）
    qs = [('有 12 個蘋果和 18 個橘子，要平分給小朋友，全部分完，最多可以分給幾個人？', '最大公因數'),
          ('小明每 4 天去一次圖書館，小華每 6 天去一次。今天兩人一起去，最少再過幾天又會一起去？', '最小公倍數'),
          ('有一張長 24 公分、寬 18 公分的紙，要剪成一樣大的正方形，沒有剩，正方形的邊最長是幾公分？', '最大公因數'),
          ('用長 6 公分、寬 4 公分的卡片排成一個正方形，正方形的邊最短是幾公分？', '最小公倍數')]
    r.shuffle(qs)
    pick = [qs[0]] + [next(q for q in qs[1:] if q[1] != qs[0][1])]
    items.append(item(7, '判斷', '單元 5', '下面的題目要找「最大公因數」還是「最小公倍數」？只要選，不用算。',
                      [(q, ['最大公因數', '最小公倍數']) for q, _ in pick]))
    A += [(f'7({i + 1})', ans, '5', '平分、全部分完、最多 → 最大公因數；再一起、一樣長、最少 → 最小公倍數（gcdLcmSwap）') for i, (q, ans) in enumerate(pick)]
    # 8 質數、2 3 5 判別（單元 6）
    while True:
        cand = r.sample(range(2, 30), 4)
        if sum(is_prime(c) for c in cand) == 1 and 1 not in cand and any(c % 2 and not is_prime(c) for c in cand): break
    cand.sort()
    n8 = r.choice([x for x in range(30, 50) if x % 3 == 0 and x % 2 == 1 and x % 5])
    items.append(item(8, '判斷', '單元 6', '回答下面的問題。',
                      [('下面哪一個是質數？', [str(c) for c in cand]), (f'1 是質數嗎？', ['是', '不是']),
                       (f'{n8} 是 3 的倍數嗎？（提示：把每一位的數加起來）', ['是', '不是'])]))
    A += [('8(1)', str(next(c for c in cand if is_prime(c))), '6', '因數只有 1 和自己；選了奇數的合數（oddIsPrime）'),
          ('8(2)', '不是', '6', '1 的因數只有 1 一個，不是質數也不是合數（oneIsPrime）'),
          ('8(3)', '是', '6', f'{" ＋ ".join(str(n8))} ＝ {sum(map(int, str(n8)))}，是 3 的倍數')]
    # 9 短除分解（單元 6）
    n9 = r.choice([12, 18, 20, 24, 28, 30, 36, 40, 42, 45])
    p9 = pf(n9)
    items.append(item(9, '算', '單元 6', f'用短除法，把 {n9} 分解成質數相乘。',
                      [f'{n9} 先除以哪一個質數？（選最小的）', f'寫出 {n9} 的質因數分解：{n9} ＝ ＿＿＿＿']))
    A += [('9(1)', str(p9[0]), '6', '從最小的質數 2 開始試'),
          ('9(2)', ' × '.join(map(str, p9)), '6', '每一個都要是質數；寫成合數相乘（例如 4 × 3）表示還沒除到底（noStop）')]
    # 10 短除找最大公因數、最小公倍數、約分（單元 7）
    a10, b10 = r.choice([(8, 12), (6, 9), (12, 18), (10, 15), (12, 16), (9, 12), (8, 20), (14, 21), (10, 25)])
    g10, l10 = gcd(a10, b10), lcm(a10, b10)
    items.append(item(10, '算', '單元 7', f'用短除法回答。',
                      [f'{a10} 和 {b10} 的最大公因數是多少？', f'{a10} 和 {b10} 的最小公倍數是多少？', f'把 {a10}/{b10} 約分成最簡分數。']))
    A += [('10(1)', str(g10), '7', '左邊的除數相乘'), ('10(2)', str(l10), '7', f'左邊和下面的數全部相乘；寫 {a10 * b10} 表示直接相乘（lcmProduct）'),
          ('10(3)', f'{a10 // g10}/{b10 // g10}', '7', f'分子分母都除以最大公因數 {g10}；只約一次沒到最簡不給分')]
    return items, A


UNITS = [('0 準備好了嗎（乘法、平分）', ['1(1)', '1(2)', '2(1)', '2(2)']),
         ('1 因數', ['3(1)', '3(2)', '3(3)']),
         ('2 倍數', ['4(1)', '4(2)', '4(3)', '4(4)']),
         ('3 公因數', ['5(1)', '5(2)', '5(3)']),
         ('4 公倍數', ['6(1)', '6(2)']),
         ('5 分清楚', ['7(1)', '7(2)']),
         ('6 質數與質因數分解（六年級）', ['8(1)', '8(2)', '8(3)', '9(1)', '9(2)']),
         ('7 短除與約分通分（六年級）', ['10(1)', '10(2)', '10(3)'])]


def page(n, items, A):
    num = f'{n:02d}'
    rows = ''.join(f'<tr><td class="num">{q}</td><td>{html.escape(a)}</td><td class="num">{u}</td><td>{html.escape(c)}</td></tr>' for q, a, u, c in A)
    urows = ''.join(f'<tr><td>{name}</td><td>{"、".join(qs)}</td><td class="num">{len(qs)}</td><td class="num">{math.ceil(len(qs) * 0.8) - 1} 分以下</td><td class="score"></td></tr>' for name, qs in UNITS)
    total = len(A)
    g5 = sum(len(qs) for name, qs in UNITS[:6])
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>因數與倍數前測 卷號 {num}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>{CSS}
@media print {{ .teacher {{ display: block; }} .teacher > * + * {{ margin-top: 14px; }} .teacher h3 {{ break-after: avoid; }} tr {{ break-inside: avoid; }} th {{ white-space: nowrap; }} }}</style></head><body><div class="wrap"><main class="sheet" id="v{num}">
  <header class="sheet-head">
    <div class="serial">卷號 <b>{num}</b></div>
    <h1>因數與倍數前測</h1>
    <div class="meta"><span>學生代號<i></i></span><span>日期<i></i></span><span>施測者<i></i></span></div>
    <p class="note">一共 10 題，每個小題 1 分，共 {total} 分。五年級做第 1～7 題（{g5} 分），六年級做全部。老師可以把每一句題目唸給學生聽。有單位的答案要寫單位。可以寫算式，不限時間。</p>
  </header>
  {"".join(items)}
  <section class="teacher">
    <h2>教師用：卷號 {num} 的答案與計分</h2>
    <h3>計分規則</h3>
    <ul>
      <li>每個小題 1 分。有單位的題目，數字和單位都對才給分；選擇的題目寫字或打勾都可以。</li>
      <li>「寫出全部因數」「全部公因數」「公倍數」的題目，全部寫對、沒有多寫才給分；順序不拘。</li>
      <li>五年級只做第 1～7 題（單元 0～5），滿分 {g5} 分；六年級做全部，滿分 {total} 分。</li>
    </ul>
    <h3>答案</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>小題</th><th>答案</th><th>單元</th><th>測的概念、常見錯誤（括號是網站的觀察代碼）</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
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
            items, A = make(n)
            assert [q for _, qs in UNITS for q in qs] == [q for q, *_ in A], n
            open(os.path.join(OUT, f'pretest-{n:02d}.html'), 'w', encoding='utf-8').write(page(n, items, A))
            for q, a, _, _ in A:
                fh.write(f'{n:02d},{q},"{a}"\n')
    print('wrote 20 HTML files and answers.csv to', OUT)
