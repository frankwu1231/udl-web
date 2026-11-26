# 面積探測卷（單一受試重複施測用）：產生 20 份等值 HTML（一般版）與 answers.csv。
# 範圍：網站面積教材單元 1～3（面積是什麼、周長和面積、長方形和正方形）。依 2026-11-17 篩選結果
# （D01、D02、D04、D05）設計：10 題，每題只問一件事，約 10～15 分鐘；數字和單位分開計分，共 20 分。
# 每份卷的題型、順序、難度相同，只換數字和情境，所以可以輪流用來做基線、介入、維持的探測。
# 用法：python3 docs/probe-area/make_probe.py → docs/probe-area/probe-versions/probe-01～20.html、answers.csv
# 注音版：python3 docs/probe-area/make_zhuyin.py；轉 PDF：node docs/probe-area/make-pdfs.mjs [輸出資料夾] [zhuyin]
import html, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'probe-versions')
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()
C = 28   # 方格一格的像素
INK, GRID, FILL = '#1f2328', '#b9c7d6', '#dbe8f5'


def ok_rect(a, b):   # 面積和周長的數字不能一樣，否則看不出學生用的是哪一個
    return a != b and a * b != 2 * (a + b)


def grid_svg(cols, rows, cells=None, poly=None, inner=False, label=''):
    """方格紙。cells：要塗色的格子 (x, y)；poly：要塗色的多邊形（格點座標）。"""
    w, h = cols * C, rows * C
    p = [f'<rect x="0" y="0" width="{w}" height="{h}" fill="#fff"/>']
    if cells:
        p += [f'<rect x="{x * C}" y="{y * C}" width="{C}" height="{C}" fill="{FILL}"/>' for x, y in cells]
    if poly:
        pts = ' '.join(f'{x * C},{y * C}' for x, y in poly)
        p.append(f'<polygon points="{pts}" fill="{FILL}"/>')
    p += [f'<line x1="{x * C}" y1="0" x2="{x * C}" y2="{h}" stroke="{GRID}" stroke-width="1"/>' for x in range(cols + 1)]
    p += [f'<line x1="0" y1="{y * C}" x2="{w}" y2="{y * C}" stroke="{GRID}" stroke-width="1"/>' for y in range(rows + 1)]
    if cells:   # 外框：只畫相鄰格子不是塗色格的邊
        s = set(cells)
        for x, y in cells:
            for dx, dy, x1, y1, x2, y2 in [(0, -1, x, y, x + 1, y), (0, 1, x, y + 1, x + 1, y + 1), (-1, 0, x, y, x, y + 1), (1, 0, x + 1, y, x + 1, y + 1)]:
                if (x + dx, y + dy) not in s:
                    p.append(f'<line x1="{x1 * C}" y1="{y1 * C}" x2="{x2 * C}" y2="{y2 * C}" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>')
    if poly:
        pts = ' '.join(f'{x * C},{y * C}' for x, y in poly)
        p.append(f'<polygon points="{pts}" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
    cap = f'<figcaption>{label}</figcaption>' if label else ''
    return f'<figure class="fig-sub"><svg viewBox="-2 -2 {w + 4} {h + 4}" width="{w + 4}" height="{h + 4}" role="img" aria-label="方格紙">{"".join(p)}</svg>{cap}</figure>'


def rect_svg(a, b, unit, inner=False, square=False):
    """標好邊長的長方形；inner=True 時畫出 1 單位的格線（不在方格紙上）。"""
    s = 26 if max(a, b) <= 7 else 22
    w, h = a * s, b * s
    L, T = 70, 14
    p = [f'<rect x="{L}" y="{T}" width="{w}" height="{h}" fill="{FILL}" stroke="{INK}" stroke-width="2.5"/>']
    if inner:
        p += [f'<line x1="{L + i * s}" y1="{T}" x2="{L + i * s}" y2="{T + h}" stroke="{INK}" stroke-width="1" stroke-dasharray="3 3"/>' for i in range(1, a)]
        p += [f'<line x1="{L}" y1="{T + j * s}" x2="{L + w}" y2="{T + j * s}" stroke="{INK}" stroke-width="1" stroke-dasharray="3 3"/>' for j in range(1, b)]
    p.append(f'<text x="{L + w / 2}" y="{T + h + 26}" text-anchor="middle" font-size="17">{a} {unit}</text>')
    p.append(f'<text x="{L - 8}" y="{T + h / 2 + 6}" text-anchor="end" font-size="17">{b} {unit}</text>')
    return f'<svg viewBox="0 0 {L + w + 20} {T + h + 36}" width="{L + w + 20}" height="{T + h + 36}" role="img" aria-label="{"正方形" if square else "長方形"}">{"".join(p)}</svg>'


def item(no, units, stem, q, fig=''):
    f = f'\n  <div class="fig">{fig}</div>' if fig else ''
    return (f'<section class="item">\n  <header class="item-head"><span class="no">{no}</span><span class="unit-tag">{units}</span></header>\n'
            f'  <p class="stem">{stem}</p>{f}\n  <ol class="subs"><li class="one"><span class="sub-q">{q}</span><span class="ans">答：<span class="blank"></span></span></li></ol>\n</section>')


def rect_pair(r, alo, ahi, blo, bhi, used):   # 長在 alo～ahi、寬在 blo～bhi，控制各卷難度相近
    while True:
        a, b = r.randint(alo, ahi), r.randint(blo, bhi)
        if ok_rect(a, b) and (a, b) not in used:
            used.add((a, b))
            return a, b


def make(n):
    r = random.Random(20261120 * 100 + n)
    used, items, A = set(), [], []   # A：(題, 數字答案, 單位答案, 單元, 常見錯誤)

    # 1 方格紙上的長方形，數格子（1-2 鋪方格）
    a, b = rect_pair(r, 4, 6, 3, 4, used)
    items.append(item(1, '單元 1　數格子', '方格紙上一小格是 1 平方公分。', '塗色長方形的面積是多少？',
                      grid_svg(a + 2, b + 2, cells=[(x + 1, y + 1) for x in range(a) for y in range(b)])))
    A.append((1, a * b, '平方公分', '1-2', f'數邊上的格子得 {2 * (a + b)} 是周長；漏數或重數'))

    # 2 方格紙上的 L 形，數格子（1-2、3-4）
    while True:
        a2, b2, ca, cb = r.randint(4, 6), r.randint(3, 4), r.randint(1, 3), r.randint(1, 2)
        if ca < a2 - 1 and cb < b2:
            break
    cells = [(x + 1, y + 1) for x in range(a2) for y in range(b2) if not (x >= a2 - ca and y < cb)]
    if r.random() < .5:   # 左右翻轉，讓缺角的位置每份不同
        cells = [(a2 + 1 - x, y) for x, y in cells]
    items.append(item(2, '單元 1　數格子', '方格紙上一小格是 1 平方公分。', '塗色圖形的面積是多少？',
                      grid_svg(a2 + 2, b2 + 2, cells=cells)))
    A.append((2, len(cells), '平方公分', '1-2、3-4', '只數外圈；寫成長乘寬沒有扣掉缺角'))

    # 3 方格紙上有半格的圖形（1-4 整格加半格）
    a3, b3 = r.choice([(4, 3), (5, 3), (4, 4), (5, 4)])
    poly = [(2, 1), (a3, 1), (a3 + 1, 2), (a3 + 1, b3), (a3, b3 + 1), (2, b3 + 1), (1, b3), (1, 2)]   # 四個角各切掉半格
    items.append(item(3, '單元 1　整格和半格', '方格紙上一小格是 1 平方公分。兩個半格合起來算 1 格。', '塗色圖形的面積是多少？',
                      grid_svg(a3 + 2, b3 + 2, poly=poly)))
    A.append((3, a3 * b3 - 2, '平方公分', '1-4', f'只數整格得 {a3 * b3 - 4}；半格當 1 格得 {a3 * b3}'))

    # 4 方格紙上長方形的周長（2-1）
    a4, b4 = rect_pair(r, 4, 6, 2, 3, used)
    items.append(item(4, '單元 2　周長', '方格紙上一小格的邊長是 1 公分。', '塗色長方形的周長是多少？',
                      grid_svg(a4 + 2, b4 + 2, cells=[(x + 1, y + 1) for x in range(a4) for y in range(b4)])))
    A.append((4, 2 * (a4 + b4), '公分', '2-1', f'數格子得 {a4 * b4} 是面積；只算兩邊得 {a4 + b4}'))

    # 5 長方形畫出格線、標邊長，求面積（3-1，從數格子銜接到長×寬）
    a5, b5 = rect_pair(r, 5, 7, 3, 4, used)
    items.append(item(5, '單元 3　長方形面積', f'長方形的長是 {a5} 公分，寬是 {b5} 公分。虛線把它分成 1 平方公分的小格。', '長方形的面積是多少？',
                      rect_svg(a5, b5, '公分', inner=True)))
    A.append((5, a5 * b5, '平方公分', '3-1', f'長加寬得 {a5 + b5}；周長 {2 * (a5 + b5)}'))

    # 6 長方形只標邊長，求面積（3-1）
    a6, b6 = rect_pair(r, 6, 9, 3, 5, used)
    items.append(item(6, '單元 3　長方形面積', f'長方形的長是 {a6} 公分，寬是 {b6} 公分。', '長方形的面積是多少？', rect_svg(a6, b6, '公分')))
    A.append((6, a6 * b6, '平方公分', '3-1', f'長加寬得 {a6 + b6}；周長 {2 * (a6 + b6)}'))

    # 7 長方形只標邊長，求周長（2-1）
    a7, b7 = rect_pair(r, 6, 9, 3, 5, used)
    items.append(item(7, '單元 2　周長', f'長方形的長是 {a7} 公分，寬是 {b7} 公分。', '長方形的周長是多少？', rect_svg(a7, b7, '公分')))
    A.append((7, 2 * (a7 + b7), '公分', '2-1', f'只算兩邊得 {a7 + b7}；長乘寬得 {a7 * b7} 是面積'))

    # 8 正方形只標邊長，求面積（3-1）
    s8 = r.choice([5, 6, 7, 8])
    items.append(item(8, '單元 3　正方形面積', f'正方形的邊長是 {s8} 公分。', '正方形的面積是多少？', rect_svg(s8, s8, '公分', square=True)))
    A.append((8, s8 * s8, '平方公分', '3-1', f'邊長加兩次得 {2 * s8}；周長 {4 * s8}'))

    # 9 生活題：鋪滿（2-2 要算面積還是周長、3-5 平方公尺）
    ctx9 = r.choice([('教室後面有一塊長方形的布告欄', '公尺', '要貼滿色紙，色紙要貼多大的面積？'),
                     ('小美有一張長方形的娃娃桌', '公分', '要鋪滿桌墊，桌墊的面積是多少？'),
                     ('學校有一塊長方形的菜園', '公尺', '要鋪滿土，鋪土的面積是多少？'),
                     ('房間裡有一塊長方形的地板', '公尺', '要鋪滿地墊，地墊的面積是多少？')])
    a9, b9 = rect_pair(r, 5, 8, 3, 5, used)
    items.append(item(9, '單元 2、3　生活題', f'{ctx9[0]}，長 {a9} {ctx9[1]}，寬 {b9} {ctx9[1]}。', ctx9[2]))
    A.append((9, a9 * b9, '平方' + ctx9[1], '2-2、3-5', f'算成周長 {2 * (a9 + b9)}；單位寫成{ctx9[1]}'))

    # 10 生活題：圍一圈（2-2 要算面積還是周長）
    ctx10 = r.choice([('學校有一塊長方形的花圃', '公尺', '四周要圍一圈籬笆，籬笆要多長？'),
                      ('小明有一個長方形的相框', '公分', '四邊要貼一圈彩色膠帶，膠帶要多長？'),
                      ('公園有一塊長方形的草地', '公尺', '四周要圍一圈繩子，繩子要多長？'),
                      ('老師有一張長方形的海報', '公分', '四邊要貼一圈花邊，花邊要多長？')])
    a10, b10 = rect_pair(r, 5, 9, 3, 5, used)
    items.append(item(10, '單元 2　生活題', f'{ctx10[0]}，長 {a10} {ctx10[1]}，寬 {b10} {ctx10[1]}。', ctx10[2]))
    A.append((10, 2 * (a10 + b10), ctx10[1], '2-2', f'算成面積 {a10 * b10}；只算兩邊得 {a10 + b10}'))
    return items, A


def page(n, items, A):
    num = f'{n:02d}'
    rows = ''.join(f'<tr><td class="num">{q}</td><td class="num">{d}</td><td>{u}</td><td class="num">{lv}</td><td>{html.escape(e)}</td>'
                   f'<td class="score"></td><td class="score"></td><td class="score"></td></tr>' for q, d, u, lv, e in A)
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>面積探測卷 卷號 {num}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>{CSS}
.subs li.one {{ grid-template-columns: 1fr; }}
.subs li.one .ans {{ grid-column: 1; }}
.item {{ gap: 8px; padding-bottom: 16px; }}
.sheet {{ gap: 18px; }}
.fig {{ gap: 12px 28px; }}
.fig svg text {{ font-family: var(--font-q); fill: var(--ink); }}
.codes td:first-child {{ white-space: nowrap; font-weight: 500; }}
@media print {{ .sheet {{ display: grid !important; grid-template-columns: 1fr 1fr; gap: 10px 28px; }} .sheet-head, .teacher {{ grid-column: 1 / -1; }}
  .item {{ padding-bottom: 10px; gap: 6px; }} .stem, .subs li {{ font-size: 17px; line-height: 1.6; }} .ans {{ font-size: 17px; }} .fig svg {{ max-height: 150px; width: auto; }} }}
@media print {{ .teacher {{ display: block; }} .teacher > * + * {{ margin-top: 14px; }} .teacher h3 {{ break-after: avoid; }} tr {{ break-inside: avoid; }} th {{ white-space: nowrap; }} .item {{ break-inside: avoid; }} }}</style></head><body><div class="wrap"><main class="sheet" id="v{num}">
  <header class="sheet-head">
    <div class="serial">卷號 <b>{num}</b></div>
    <h1>面積小測驗</h1>
    <div class="meta"><span>學生代號<i></i></span><span>日期<i></i></span><span>施測者<i></i></span></div>
    <p class="note">一共 10 題。老師可以把題目唸給學生聽。答案要寫數字和單位。可以在圖上畫線、寫算式，也可以看九九乘法表。</p>
  </header>
  {"".join(items)}
  <section class="teacher">
    <h2>教師用：卷號 {num} 的答案與紀錄</h2>
    <h3>施測方式</h3>
    <ul>
      <li>每次上課開頭施測，約 10～15 分鐘，不限時間但請記下用了幾分鐘。可以唸題，不可以提示算法、單位或「這題是面積還是周長」。</li>
      <li>20 個卷號題型、順序、難度都一樣，只換數字和情境。依卷號輪流使用，同一位學生連續幾次不要用同一個卷號。</li>
      <li>施測完給固定的小增強（例如貼紙），增強「有寫完」，不增強「寫對」。</li>
    </ul>
    <h3>計分規則（滿分 20 分）</h3>
    <ul>
      <li><b>數字分</b>：每題數字對得 1 分，不管單位對不對，共 10 分。</li>
      <li><b>單位分</b>：每題單位對得 1 分，不管數字對不對，共 10 分。面積寫「平方公分／平方公尺」，周長寫「公分／公尺」。寫「格」「面積」「公分」當面積單位都不給分。</li>
      <li>單位分看的是學生知不知道這題問的是面積還是周長，所以和數字分分開記。</li>
    </ul>
    <h3>答案與紀錄</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>題</th><th>數字</th><th>單位</th><th>網站活動</th><th>常見錯誤</th><th>數字分</th><th>單位分</th><th>錯誤代碼</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
    <h3>錯誤代碼（寫在「錯誤代碼」欄，可寫多個）</h3>
    <div class="table-wrap"><table class="codes"><tbody>
      <tr><td>P</td><td>面積題用周長算，或周長題用面積算</td></tr>
      <tr><td>H</td><td>只把兩個邊長相加（例如長 + 寬）</td></tr>
      <tr><td>A</td><td>把題目上看到的數字全部加起來</td></tr>
      <tr><td>C</td><td>數格子數錯（漏數、重數、半格沒有合起來）</td></tr>
      <tr><td>X</td><td>方法對，計算錯</td></tr>
      <tr><td>B</td><td>空白或寫「不會」</td></tr>
    </tbody></table></div>
    <h3>本次合計</h3>
    <div class="table-wrap"><table><tbody>
      <tr><th>階段</th><td>□ 基線　□ 介入　□ 維持　□ 類化</td><th>第幾次</th><td class="score"></td></tr>
      <tr><th>數字分（/10）</th><td class="score"></td><th>單位分（/10）</th><td class="score"></td></tr>
      <tr><th>總分（/20）</th><td class="score"></td><th>用了幾分鐘</th><td class="score"></td></tr>
    </tbody></table></div>
  </section>
</main></div></body></html>
'''


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'answers.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
        fh.write('卷號,題,數字,單位\n')
        for n in range(1, 21):
            items, A = make(n)
            assert [q for q, *_ in A] == list(range(1, 11)), n
            assert all(d <= 81 for _, d, *_ in A), (n, A)
            open(os.path.join(OUT, f'probe-{n:02d}.html'), 'w', encoding='utf-8').write(page(n, items, A))
            for q, d, u, _, _ in A:
                fh.write(f'{n:02d},{q},{d},{u}\n')
    print('wrote 20 HTML files and answers.csv to', OUT)
