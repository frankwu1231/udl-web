# 時間概念前測：產生 20 份 HTML（一般版）與 answers.csv。版面沿用因數與倍數前測（docs/pretest-factor/）。
# 依網站第 32 版的單元 0～9：一、二年級做第 1～5 題（單元 0～4，報時），三、四年級做全部（再加第 6～10 題：換算、經過時間、時間小管家）。
# 時鐘圖用 SVG 畫在卷上；公車站、商店都是虛構的。
# 用法：python3 docs/pretest-time/make_pretest.py  →  docs/pretest-time/pretest-versions/pretest-01～20.html、answers.csv
# 注音版：python3 docs/pretest-time/make_zhuyin.py；轉 PDF：node docs/pretest-time/make-pdfs.mjs [輸出資料夾] [zhuyin]
import html, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'pretest-versions')
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()
WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
BIG = [1, 3, 5, 7, 8, 10, 12]


def hm(h, m):   # 12 時制的說法：8 時、8 時 5 分
    return f'{h} 時' + (f' {m} 分' if m else '')


def dg(t):   # 分鐘數 → 7:05
    return f'{t // 60}:{t % 60:02d}'


def clock(h, m, label):
    R, parts = 70, [f'<circle r="70" fill="#fff" stroke="#1d2b44" stroke-width="3"/>']
    for k in range(60):
        a = math.radians(k * 6); r1 = R - (10 if k % 5 == 0 else 5)
        parts.append(f'<line x1="{math.sin(a) * r1:.1f}" y1="{-math.cos(a) * r1:.1f}" x2="{math.sin(a) * (R - 2):.1f}" y2="{-math.cos(a) * (R - 2):.1f}" stroke="#1d2b44" stroke-width="{2 if k % 5 == 0 else 1}"/>')
    for k in range(1, 13):
        a = math.radians(k * 30)
        parts.append(f'<text x="{math.sin(a) * 47:.1f}" y="{-math.cos(a) * 47 + 5.5:.1f}" text-anchor="middle" font-size="15" font-weight="700" fill="#1d2b44">{k}</text>')
    ha, ma = math.radians(((h % 12) + m / 60) * 30), math.radians(m * 6)
    parts.append(f'<line x1="0" y1="0" x2="{math.sin(ha) * 36:.1f}" y2="{-math.cos(ha) * 36:.1f}" stroke="#1d2b44" stroke-width="7" stroke-linecap="round"/>')
    parts.append(f'<line x1="0" y1="0" x2="{math.sin(ma) * 60:.1f}" y2="{-math.cos(ma) * 60:.1f}" stroke="#1d2b44" stroke-width="3" stroke-linecap="round"/>')
    parts.append('<circle r="5" fill="#1d2b44"/>')
    return f'<figure class="fig-sub"><svg viewBox="-76 -76 152 152" width="150" height="150" role="img" aria-label="時鐘">{"".join(parts)}</svg><figcaption>{label}</figcaption></figure>'


def sub(no, q, opts=None):
    ch = f'<span class="choices">{"".join(f"<span>{html.escape(o)}</span>" for o in opts)}</span>' if opts else ''
    return f'<li><span class="sub-no">({no})</span><span class="sub-q">{q}{ch}</span><span class="ans">答：<span class="blank"></span></span></li>'


def item(no, tag, units, stem, subs, fig=''):
    t = '<span class="tag tag-calc">計算</span>' if tag == '算' else '<span class="tag tag-app">判斷</span>'
    lis = ''.join(sub(i + 1, *s) if isinstance(s, tuple) else sub(i + 1, s) for i, s in enumerate(subs))
    f = f'\n  <div class="fig">{fig}</div>' if fig else ''
    return (f'<section class="item">\n  <header class="item-head"><span class="no">{no}</span>{t}<span class="unit-tag">{units}</span></header>\n'
            f'  <p class="stem">{stem}</p>{f}\n  <ol class="subs">{lis}</ol>\n</section>')


def make(n):
    r = random.Random(20261117 * 100 + 32 * 1000 + n)
    A, items = [], []   # A：(小題, 答案, 單元, 概念與常見錯誤)
    # 1 五個一數、數到 60（單元 0）
    s = 5 * r.randint(2, 4)   # 最大的數在 55 以內
    t = r.randint(31, 58)
    items.append(item(1, '算', '單元 0', '在 □ 裡填上數字。', [f'{s}、{s + 5}、{s + 10}、□', f'{s + 20}、{s + 25}、□、{s + 35}', f'{t}、{t + 1}、□']))
    A += [('1(1)', str(s + 15), '0', '五個一數；寫成一個一數（+1）表示還不會跳數'), ('1(2)', str(s + 30), '0', '五個一數'),
          ('1(3)', str(t + 2), '0', '一個一數到 60 以內')]
    # 2 一天的時間、昨天今天明天（單元 1）
    what, ans2 = r.choice([('吃早餐', '上午'), ('吃晚餐', '晚上'), ('放學回家', '下午')])
    w = r.randint(0, 6)
    items.append(item(2, '判斷', '單元 1', '回答下面的問題。',
                      [(f'小安{what}的時候，是上午、下午，還是晚上？', ['上午', '下午', '晚上']), (f'今天是{WEEK[w]}，明天是星期幾？', [WEEK[(w + 6) % 7], WEEK[(w + 1) % 7], WEEK[(w + 2) % 7]])]))
    A += [('2(1)', ans2, '1', '一天的時段（period）'), ('2(2)', WEEK[(w + 1) % 7], '1', '明天往後一天；選前一天表示昨天、明天弄反（dayLabel）')]
    # 3 整點、半點（單元 2）
    h1, h2 = r.sample(range(1, 12), 2)
    items.append(item(3, '算', '單元 2', '看時鐘，寫出是幾時或幾時幾分。', ['甲鐘是幾時？', '乙鐘是幾時幾分？'], clock(h1, 0, '甲鐘') + clock(h2, 30, '乙鐘')))
    A += [('3(1)', hm(h1, 0), '2', '長針指 12 是整點，看短針；讀成長針的數字表示時針分針看反（handSwap）'),
          ('3(2)', f'{h2} 時 30 分（{h2} 時半）', '2', f'短針在 {h2} 和 {h2 + 1} 中間，還沒到 {h2 + 1}；寫 {h2 + 1} 時半表示讀成下一時（halfHourHand），寫 {h2} 時 6 分表示把數字 6 當 6 分（minuteAsNumber）')]
    # 4 幾時幾分、經過幾小時（單元 3）
    h3, m3 = r.randint(1, 11), 5 * r.choice([2, 4, 5, 7, 8, 10])
    h4 = r.randint(1, 11)
    while True:
        m4 = r.randint(36, 58)
        if m4 % 5: break
    a5 = r.randint(7, 9); d5 = r.randint(2, 3)
    items.append(item(4, '算', '單元 3', '看時鐘，寫出是幾時幾分。', ['丙鐘是幾時幾分？', '丁鐘是幾時幾分？', f'從上午 {a5} 時到上午 {a5 + d5} 時，經過幾小時？'], clock(h3, m3, '丙鐘') + clock(h4, m4, '丁鐘')))
    A += [('4(1)', hm(h3, m3), '3', f'五個一數；寫 {h3} 時 {m3 // 5} 分表示把數字當分（minuteAsNumber）'),
          ('4(2)', hm(h4, m4), '3', f'五個一數再一格一格數；短針靠近 {h4 % 12 + 1} 但還沒到，寫 {h4 % 12 + 1} 時表示讀成下一時（hourNext）'),
          ('4(3)', f'{d5} 小時', '3', f'短針跳了 {d5} 次；寫 {d5 + 1} 表示數的是經過幾個數字')]
    # 5 日曆（單元 4）
    mo = r.choice(range(3, 13))
    mo2 = r.randint(3, 11); d6 = r.randint(1, 10); w6 = r.randint(0, 6); gap = r.choice([7, 8, 9, 14])
    items.append(item(5, '算', '單元 4', '回答下面的問題。',
                      [f'{mo} 月有幾天？', '1 年有幾個月？', f'{mo2} 月 {d6} 日是{WEEK[w6]}，{mo2} 月 {d6 + gap} 日是星期幾？']))
    A += [('5(1)', f'{31 if mo in BIG else 30} 天', '4', '大月 31 天、小月 30 天（monthDays）'), ('5(2)', '12 個月', '4', '1 年 12 個月'),
          ('5(3)', WEEK[(w6 + gap) % 7], '4', f'差 {gap} 天，每 7 天是同一個星期幾')]
    # 6 時間單位換算（單元 5）
    h7, m7 = r.randint(1, 2), r.choice([10, 15, 20, 25, 40])
    h8, m8 = r.randint(1, 2), r.choice([5, 10, 20, 35, 50])
    items.append(item(6, '算', '單元 5', '在 □ 裡填上數字。', [f'{h7} 小時 {m7} 分 ＝ □ 分', f'{h8 * 60 + m8} 分 ＝ □ 小時 □ 分', '1 分 ＝ □ 秒']))
    A += [('6(1)', str(h7 * 60 + m7), '5', f'1 小時 60 分；寫 {h7 * 100 + m7} 表示當成 100 進位（base100）'),
          ('6(2)', f'{h8} 小時 {m8} 分', '5', f'60 個一組；寫 {(h8 * 60 + m8) // 100} 小時 {(h8 * 60 + m8) % 100} 分表示當成 100 進位（base100）'),
          ('6(3)', '60', '5', '1 分 60 秒')]
    # 7 時刻還是時間量、時分加減（單元 6）
    p = r.choice([('「下課有 10 分鐘」的 10 分鐘', '時間量'), ('「8 時 10 分上課」的 8 時 10 分', '時刻'), ('「跑了 5 分鐘」的 5 分鐘', '時間量'), ('「下午 4 時放學」的 4 時', '時刻')])
    a1, b1, a2, b2 = r.randint(1, 3), r.choice([10, 15, 20]), r.randint(1, 2), r.choice([20, 25, 30])
    items.append(item(7, '算', '單元 6', '回答下面的問題。', [(f'{p[0]}，是時刻還是時間量？', ['時刻', '時間量']), f'{a1} 小時 {b1} 分 ＋ {a2} 小時 {b2} 分 ＝ □ 小時 □ 分']))
    A += [('7(1)', p[1], '6', '「幾時幾分」是時刻，「幾小時幾分鐘」是時間量（pointVsDuration）'),
          ('7(2)', f'{a1 + a2} 小時 {b1 + b2} 分', '6', '時加時、分加分，不進位')]
    # 8 24 時制（單元 7）
    h9, m9 = r.randint(1, 5), r.choice([5, 20, 35, 45])   # 下午 1～5 時（6 時以後算晚上）
    h10, m10 = r.randint(13, 22), r.choice([10, 25, 40, 55])
    p10 = '下午' if h10 < 18 else '晚上'
    items.append(item(8, '算', '單元 7', '12 時制和 24 時制。', [f'下午 {hm(h9, m9)}，用 24 時制是幾時幾分？', f'電子鐘顯示 {h10}:{m10:02d}，是下午或晚上的幾時幾分？']))
    A += [('8(1)', f'{h9 + 12} 時 {m9} 分（{h9 + 12}:{m9:02d}）', '7', '下午的時刻加 12（plus12）'),
          ('8(2)', f'{p10} {hm(h10 - 12, m10)}', '7', '超過 12 就減 12；只寫數字沒寫下午或晚上不給分')]
    # 9 經過時間：跨時、跨午、求結束（單元 8）
    sh, sa, sb = r.randint(8, 10), r.choice([35, 40, 45, 50]), r.choice([10, 15, 20, 25])
    na, nb = r.choice([20, 30, 40]), r.choice([10, 15, 20])
    fh, fa, fm = r.randint(1, 3), r.choice([30, 40, 45]), r.choice([25, 35, 40])
    end = (fh + 1) * 60 + fa + fm
    items.append(item(9, '算', '單元 8', '算算看。',
                      [f'從上午 {hm(sh, sa)}到上午 {hm(sh + 1, sb)}，經過幾分鐘？', f'從上午 11 時 {na} 分到下午 1 時 {nb} 分，經過幾小時幾分？',
                       f'電影從下午 {hm(fh, fa)}開始，演了 1 小時 {fm} 分。下午幾時幾分結束？']))
    d2 = 60 - na + 60 + nb
    A += [('9(1)', f'{60 - sa + sb} 分鐘', '8', f'先跳到 {sh + 1} 時（{60 - sa} 分），再跳 {sb} 分；寫 {100 - sa + sb} 表示 100 進位（base100）'),
          ('9(2)', f'{d2 // 60} 小時 {d2 % 60} 分', '8', '先跳到中午 12 時，再跳到下午；直接用 1 減 11 表示跨午沒有處理（noonCross）'),
          ('9(3)', f'下午 {hm(end // 60, end % 60)}', '8', f'分加分 {fa + fm} 分，滿 60 進 1 小時（base100）')]
    # 10 時間小管家：時刻表、來得及嗎（單元 9）
    stops = r.choice([('學校站', '圖書館站'), ('公園站', '游泳池站'), ('社區站', '體育館站')])
    first, gap2 = 7 * 60 + r.choice([0, 5, 10]), r.choice([20, 25])
    deps = [first + i * gap2 for i in range(4)]
    k = r.randint(1, 2); now = deps[k] - r.choice([5, 10])
    ride = r.choice([15, 20]); kk = r.randint(1, 2); due = deps[kk] + ride + r.choice([5, 10])
    walk = r.choice([15, 20, 25]); left = walk + r.choice([-5, 10]); dueT = 8 * 60; nowT = dueT - left
    table = f'<table class="dtable"><caption>{stops[0]}開往{stops[1]}的公車</caption><thead><tr><th>班次</th>{"".join(f"<th>第 {i + 1} 班</th>" for i in range(4))}</tr></thead><tbody><tr><td>開車</td>{"".join(f"<td>{dg(t)}</td>" for t in deps)}</tr></tbody></table>'
    items.append(item(10, '判斷', '單元 9', f'看公車時刻表回答。坐車到{stops[1]}要 {ride} 分鐘。',
                      [f'現在是 {dg(now)}，下一班車是幾時幾分？', (f'{dg(due)} 以前要到{stops[1]}，最晚要坐哪一班？', [dg(t) for t in deps]),
                       (f'現在是 {hm(nowT // 60, nowT % 60)}，走到學校要 {walk} 分鐘，8 時要到。來得及嗎？', ['來得及', '來不及'])], table))
    A += [('10(1)', hm(deps[k] // 60, deps[k] % 60), '9', '找現在以後的第一班'),
          ('10(2)', dg(deps[kk]), '9', f'開車時刻加 {ride} 分鐘是到站時刻，要在期限以前；選開車時刻剛好在期限以前的班次表示出發和到站弄混（departVsArrive）'),
          ('10(3)', '來得及' if left >= walk else '來不及', '9', f'到 8 時還剩 {left} 分鐘，走路要 {walk} 分鐘')]
    return items, A


UNITS = [('0 準備好了嗎（五個一數、數到 60）', ['1(1)', '1(2)', '1(3)']),
         ('1 一天的時間', ['2(1)', '2(2)']),
         ('2 整點和半點', ['3(1)', '3(2)']),
         ('3 幾時幾分', ['4(1)', '4(2)', '4(3)']),
         ('4 看日曆', ['5(1)', '5(2)', '5(3)']),
         ('5 時間單位和換算（三年級）', ['6(1)', '6(2)', '6(3)']),
         ('6 幾點和多久（三年級）', ['7(1)', '7(2)']),
         ('7 24 時制（四年級）', ['8(1)', '8(2)']),
         ('8 算經過時間（四年級）', ['9(1)', '9(2)', '9(3)']),
         ('9 時間小管家', ['10(1)', '10(2)', '10(3)'])]


def page(n, items, A):
    num = f'{n:02d}'
    rows = ''.join(f'<tr><td class="num">{q}</td><td>{html.escape(a)}</td><td class="num">{u}</td><td>{html.escape(c)}</td></tr>' for q, a, u, c in A)
    urows = ''.join(f'<tr><td>{name}</td><td>{"、".join(qs)}</td><td class="num">{len(qs)}</td><td class="num">{math.ceil(len(qs) * 0.8) - 1} 分以下</td><td class="score"></td></tr>' for name, qs in UNITS)
    total = len(A)
    low = sum(len(qs) for name, qs in UNITS[:5])
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>時間概念前測 卷號 {num}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>{CSS}
@media print {{ .teacher {{ display: block; }} .teacher > * + * {{ margin-top: 14px; }} .teacher h3 {{ break-after: avoid; }} tr {{ break-inside: avoid; }} th {{ white-space: nowrap; }} .item {{ break-inside: avoid; }} }}</style></head><body><div class="wrap"><main class="sheet" id="v{num}">
  <header class="sheet-head">
    <div class="serial">卷號 <b>{num}</b></div>
    <h1>時間概念前測</h1>
    <div class="meta"><span>學生代號<i></i></span><span>日期<i></i></span><span>施測者<i></i></span></div>
    <p class="note">一共 10 題，每個小題 1 分，共 {total} 分。一、二年級做第 1～5 題（{low} 分），三、四年級做全部。老師可以把每一句題目唸給學生聽。有單位的答案要寫單位。可以寫算式，不限時間。</p>
  </header>
  {"".join(items)}
  <section class="teacher">
    <h2>教師用：卷號 {num} 的答案與計分</h2>
    <h3>計分規則</h3>
    <ul>
      <li>每個小題 1 分。有單位的題目，數字和單位都對才給分；選擇的題目寫字或打勾都可以。</li>
      <li>幾時幾分的答案，「時」和「分」都對才給分；寫成電子鐘（例如 8:05）也可以。「幾時半」和「幾時 30 分」都算對。</li>
      <li>一、二年級只做第 1～5 題（單元 0～4），滿分 {low} 分；三、四年級做全部，滿分 {total} 分。</li>
    </ul>
    <h3>答案</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>小題</th><th>答案</th><th>單元</th><th>測的概念、常見錯誤（括號是網站的觀察代碼）</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
    <h3>各單元得分與篩選</h3>
    <p>答對率未達 80% 的單元算「還沒學會」。依單元順序，選最前面 3 個還沒學會的單元進行教學；少於 3 個的學生不列入。單元 0 還沒學會的學生，網站上先做 0-1、0-2。單元 9「時間小管家」也可以留到教學後當類化探測。</p>
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
