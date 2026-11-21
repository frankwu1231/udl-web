# 錢幣與購物前測：產生 20 份 HTML（一般版）與 answers.csv。版面沿用整數前測（docs/pretest-int/）。
# 依網站第 36 版的單元 0～9，每個單元一題、每題 3 小題：
#   一年級做第 1～3 題和第 5、6 題（單元 0、1、2、4、5，100 元以內），二年級做第 1 題和第 4～7 題（單元 0、3～6）；
#   第 8～10 題「想要與需要、存錢與存提款、錢錢小管家」（理財，單元 7～9）各年級都做，也可留到教學後當類化探測。
# 數字範圍照課綱與網站（第36版_Codex測試說明.md 第二節）：一年級錢幣 1、5、10、50、100 元，100 元以內；
#   二年級加 500、1000 元，估算到整百；找錢的減法只退位一次；沒有 20、200、2000 元。
# 錢幣、紙鈔用簡化的 SVG 畫在卷上（不是真的錢幣照片）；人名、店名都是虛構的，情境和網站的活動不同。
# 用法：python3 docs/pretest-money/make_pretest.py  →  docs/pretest-money/pretest-versions/pretest-01～20.html、answers.csv
# 注音版：python3 docs/pretest-money/make_zhuyin.py；轉 PDF：node docs/pretest-money/make-pdfs.mjs [輸出資料夾] [zhuyin]
import html, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'pretest-versions')
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()
NAMES = ['小華', '小美', '小安', '小明', '小芬', '小宇', '小玲', '小志']


def dots(k, r):   # k 個點，散在 5×5 的格子裡（不重疊），給學生點數
    cells = r.sample(range(25), k)
    g = ''.join(f'<circle cx="{24 + (c % 5) * 44 + r.uniform(-7, 7):.1f}" cy="{24 + (c // 5) * 36 + r.uniform(-5, 5):.1f}" r="11" fill="#9fbde0" stroke="#1d2b44" stroke-width="2"/>' for c in cells)
    return f'<figure class="fig-sub"><svg viewBox="0 0 224 186" width="224" height="186" role="img" aria-label="一些圓點">{g}</svg><figcaption>數一數，有幾個點？</figcaption></figure>'


COIN = {1: (15, '#d9d9d9'), 5: (17, '#e8d38a'), 10: (19, '#e3b27a'), 50: (22, '#f0d060')}


def money(c, cap):   # c = {面額: 個數}，由大到小排成一列一列；紙鈔畫長方形、硬幣畫圓
    x, y, rows, g, W = 10, 10, [], [], 0
    for d in sorted(c, reverse=True):
        for _ in range(c[d]):
            if d >= 100:
                w, h = 78, 40
                g.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="#cfe6c4" stroke="#1d2b44" stroke-width="2"/><text x="{x + w / 2}" y="{y + 26}" text-anchor="middle" font-size="16" font-weight="700">{d} 元</text>')
            else:
                rr, col = COIN[d]; w = h = rr * 2
                g.append(f'<circle cx="{x + rr}" cy="{y + rr}" r="{rr}" fill="{col}" stroke="#1d2b44" stroke-width="2"/><text x="{x + rr}" y="{y + rr + 5}" text-anchor="middle" font-size="{14 if d < 10 else 13}" font-weight="700">{d}</text>')
            x += w + 8
            W = max(W, x)
            if x > 330: x, y = 10, y + 52
        x, y = 10, y + 52   # 換一種錢就換一列
    H = y + 4
    return f'<figure class="fig-sub"><svg viewBox="0 0 {W + 6} {H}" width="{W + 6}" height="{H}" role="img" aria-label="{cap}">{"".join(g)}</svg><figcaption>{cap}</figcaption></figure>'


def sub(no, q, opts=None):
    ch = f'<span class="choices">{"".join(f"<span>{o}</span>" for o in opts)}</span>' if opts else ''
    return f'<li><span class="sub-no">({no})</span><span class="sub-q">{q}{ch}</span><span class="ans">答：<span class="blank"></span></span></li>'


def item(no, tag, units, stem, subs, fig=''):
    t = '<span class="tag tag-calc">計算</span>' if tag == '算' else '<span class="tag tag-app">判斷</span>'
    lis = ''.join(sub(i + 1, *s) if isinstance(s, tuple) else sub(i + 1, s) for i, s in enumerate(subs))
    f = f'\n  <div class="fig">{fig}</div>' if fig else ''
    return (f'<section class="item">\n  <header class="item-head"><span class="no">{no}</span>{t}<span class="unit-tag">{units}</span></header>\n'
            f'  <p class="stem">{stem}</p>{f}\n  <ol class="subs">{lis}</ol>\n</section>')


def borrows(a, b):   # 減法退位次數
    n, c = 0, 0
    while a:
        d = a % 10 - c - b % 10
        c = 1 if d < 0 else 0
        n += c; a //= 10; b //= 10
    return n


def greedy(n, den=(50, 10, 5, 1)):
    out = {}
    for d in den:
        out[d], n = n // d, n % d
    return out


def say(c):
    return '、'.join(f'{k} {"張" if d >= 100 else "個"} {d} 元' for d, k in sorted(c.items(), reverse=True) if k)


NEED = ['鞋帶斷了，明天要上體育課。買一條新鞋帶', '水壺破了一個洞，每天上學都要帶水。買一個新水壺', '橡皮擦用完了，明天要寫功課。買一個橡皮擦', '冬天到了，手套太小戴不下。買一雙新手套']
WANT = ['家裡已經有三顆球，又看到一顆新的球', '看到同學的卡通鉛筆盒很好看，自己的鉛筆盒還能用', '已經吃飽了，看到冰淇淋還想吃', '夜市的套圈圈攤位有大獎品']


def make(n):
    r = random.Random(20261120 * 100 + 36 * 1000 + n)
    A, items = [], []   # A：(小題, 答案, 單元, 概念與常見錯誤)
    who = r.sample(NAMES, 4)
    # 1 準備好了嗎（單元 0）
    k1 = r.randint(12, 19); s2 = r.randint(2, 5) * 5; b3 = r.randint(3, 8)
    items.append(item(1, '算', '單元 0', '數一數。', ['圖上一共有幾個點？', f'五個五個數：{s2}、{s2 + 5}、{s2 + 10}、□。□ 是多少？', f'一袋有 10 顆彈珠，{b3} 袋一共有幾顆？'], dots(k1, r)))
    A += [('1(1)', f'{k1} 個', '0', '一個一個點數，數過的做記號；少數、多數（重複數）'),
          ('1(2)', str(s2 + 15), '0', f'五個五個往下數；寫 {s2 + 11} 表示一個一個往下數'),
          ('1(3)', f'{b3 * 10} 顆', '0', f'十個十個數：10、20、30……；寫 {b3 + 10} 表示把袋數和顆數加起來')]
    # 2 認識錢幣（單元 1，一年級，100 元以內）
    while True:
        c4 = {50: r.randint(0, 1), 10: r.randint(2, 4), 5: r.randint(1, 2), 1: r.randint(2, 4)}
        if sum(d * k for d, k in c4.items()) <= 100: break
    t4 = sum(d * k for d, k in c4.items())
    a6, b6 = r.choice([(50, 10), (10, 5), (50, 5), (100, 50), (10, 1)])
    items.append(item(2, '算', '單元 1', f'{who[0]}的撲滿裡有這些錢。', ['圖裡有幾個 10 元？', '一共是幾元？', f'1 {"張" if a6 >= 100 else "個"} {a6} 元，可以換幾個 {b6} 元？'], money(c4, f'{who[0]}撲滿裡的錢')))
    A += [('2(1)', f'{c4[10]} 個', '1', '認面額：看錢上面的數字，不是看大小或顏色（denomConfuse）'),
          ('2(2)', f'{t4} 元', '1', f'先數大的，再接著數小的；寫 {sum(c4.values())} 表示把個數當成錢數（coinsAsMoney），其他錯記 mixCount'),
          ('2(3)', f'{a6 // b6} 個', '1', '換錢以後錢一樣多，只是個數變多；換錯記 tradeWrong')]
    # 3 錢從哪裡來（單元 2，社會、生活）
    items.append(item(3, '判斷', '單元 2', '想一想，圈出正確的答案。', [('還沒有錢的時候，人們怎麼得到需要的東西？', ['用東西換東西', '刷卡', '去便利商店買']),
                      ('用東西換東西，有什麼麻煩？', ['要找到剛好想要你東西的人', '東西會越換越多', '一點也不麻煩']),
                      ('用悠遊卡付車錢，用的是誰的錢？', ['公車公司的錢', '自己先存進卡片的錢', '免費的，不用錢'])]))
    A += [('3(1)', '用東西換東西', '2', '以物易物（錢幣的由來，社會 Ad-Ⅱ-1 間接對應、生活 2-I-2）'),
          ('3(2)', '要找到剛好想要你東西的人', '2', '以物易物要雙方剛好互相需要，所以後來用錢'),
          ('3(3)', '自己先存進卡片的錢', '2', '電子支付用的是自己預先存入（加值）的錢（特生E-sP-3）')]
    # 4 大錢與估算（單元 3，二年級）
    c7 = {1000: r.randint(1, 2), 500: 1, 100: r.randint(1, 4)}
    t7 = sum(d * k for d, k in c7.items())
    while True:
        p8 = r.randint(120, 880)
        if 12 <= p8 % 100 <= 38 or 62 <= p8 % 100 <= 88: break
    while True:
        x9, y9 = r.randint(110, 290), r.randint(110, 290)
        e9 = round(x9 / 100) * 100 + round(y9 / 100) * 100
        ok9 = r.random() < .5
        B9 = e9 if ok9 else e9 - 100
        if all(8 <= v % 100 <= 42 or 58 <= v % 100 <= 92 for v in (x9, y9)) and (x9 + y9 <= B9) == ok9 and B9 >= 300: break
    items.append(item(4, '算', '單元 3', '大錢與估算。', [f'{who[1]}的紅包袋裡有 {say(c7)}。一共是幾元？', f'一個書包 {p8} 元，大約是幾百元？',
                      (f'媽媽帶 {B9} 元，想買 {x9} 元的雨鞋和 {y9} 元的外套。先估一估，錢大約夠不夠？', ['夠', '不夠'])]))
    A += [('4(1)', f'{t7} 元', '3', '先數 1000 元、500 元，再接著數 100 元（N-2-5）；把張數當錢數記 coinsAsMoney'),
          ('4(2)', f'{round(p8 / 100) * 100} 元', '3', '看後面兩位比較接近 0 還是 100，估成整百（N-2-4）；估錯記 estWrong'),
          ('4(3)', '夠' if ok9 else '不夠', '3', f'{x9} 大約 {round(x9 / 100) * 100}、{y9} 大約 {round(y9 / 100) * 100}，合起來大約 {e9} 元，和 {B9} 元比（真的是 {x9 + y9} 元）；判斷錯記 estWrong')]
    # 5 付錢（單元 4）
    while True:
        p10 = r.randint(61, 94)
        if 1 <= p10 % 10 <= 4: break
    g10 = greedy(p10, (50, 10, 1))
    p11 = r.randint(31, 78)
    while p11 % 10 == 0: p11 = r.randint(31, 78)
    while True:
        p12 = r.randint(61, 99)
        if p12 % 5: break
    items.append(item(5, '算', '單元 4', '付錢。用 50 元、10 元、5 元、1 元付錢。', [f'買一盒彩色筆 {p10} 元，要剛好付，先拿 1 個 50 元。還要再拿幾個 10 元、幾個 1 元？（寫：10 元□個、1 元□個）',
                      f'錢包裡只有 10 元硬幣。買一包餅乾 {p11} 元，最少要拿幾個 10 元才夠付？', f'要剛好付 {p12} 元，錢幣最少要用幾個？']))
    A += [('5(1)', f'10 元 {g10[10]} 個、1 元 {g10[1]} 個', '4', '付錢四步：先拿大的、不超過價錢；兩個空格都對才給分；不夠記 payShort、多了記 payOver'),
          ('5(2)', f'{-(-p11 // 10)} 個', '4', f'只有 10 元，要多付一點：{p11} 元要拿到 {-(-p11 // 10) * 10} 元；寫 {p11 // 10} 個表示不夠付（payShort）'),
          ('5(3)', f'{sum(greedy(p12).values())} 個', '4', f'{say(greedy(p12))}；錢對但個數不是最少記 notFewest')]
    # 6 找錢（單元 5）
    p13 = r.randint(21, 46)
    while p13 % 10 == 0: p13 = r.randint(21, 46)
    p14 = r.randint(3, 8) * 10
    while True:
        p15 = r.randint(52, 88)
        if p15 % 5: break
    ch15 = 100 - p15; kind = r.choice(['ok', 'short', 'over']); got15 = ch15 + {'ok': 0, 'short': -5, 'over': 5}[kind]
    items.append(item(6, '算', '單元 5', '找錢。', [f'買一瓶豆漿 {p13} 元，付 50 元。要找幾元？', f'買一把雨傘 {p14} 元，付 100 元。要找幾元？',
                      (f'買一份蛋餅 {p15} 元，付 100 元。店員找回 {say(greedy(got15))}。找得對不對？', ['找對了', '少找了', '多找了'])]))
    A += [('6(1)', f'{50 - p13} 元', '5', f'往上數找錢：{p13} 數到 {-(-p13 // 10) * 10}，再數到 50；數錯記 countUpErr'),
          ('6(2)', f'{100 - p14} 元', '5', f'100－{p14}，或十個十個往上數；寫 {100 + p14} 記 opWrong'),
          ('6(3)', {'ok': '找對了', 'short': '少找了', 'over': '多找了'}[kind], '5', f'應該找 {ch15} 元，店員找了 {got15} 元；少找要有禮貌地告訴店員、多找要還給店員')]
    # 7 去買東西（單元 6，二年級）
    while True:
        c16 = {50: r.randint(1, 2), 10: r.randint(2, 5)}
        w16 = 50 * c16[50] + 10 * c16[10]
        ok16 = r.random() < .5
        p16 = w16 - r.randint(1, 9) if ok16 else w16 + r.randint(1, 9)
        if p16 % 10: break
    while True:
        a17, b17 = r.randint(18, 45), r.randint(18, 45)
        if (a17 + b17) % 10 and a17 + b17 < 95: break
    a18 = r.randint(12, 3 * 10); b18 = r.randint(12, 30)
    while (a18 + b18) % 10 == 0: b18 = r.randint(12, 30)
    items.append(item(7, '判斷', '單元 6', '去買東西。', [(f'錢包裡有 {say(c16)}，想買一個 {p16} 元的盆栽。錢夠不夠？', ['夠', '不夠']),
                      f'買一個 {a17} 元的三明治和一瓶 {b17} 元的果汁。一共多少元？', f'買 {a18} 元的筆和 {b18} 元的膠帶，付 100 元。要找多少元？']))
    A += [('7(1)', '夠' if ok16 else '不夠', '6', f'錢包一共 {w16} 元，和 {p16} 元比；只比個數或判斷錯記 compareWrong'),
          ('7(2)', f'{a17 + b17} 元', '6', '兩樣合起來用加的（N-2-2）'),
          ('7(3)', f'{100 - a18 - b18} 元', '6', f'先算一共 {a18 + b18} 元，再算 100 減一共；只算出 {a18 + b18} 記 skipStep')]
    # 8 想要與需要（單元 7）
    nd, wt = r.choice(NEED), r.choice(WANT)
    if r.random() < .5: q19, a19, q20, a20 = nd, '需要', wt, '想要'
    else: q19, a19, q20, a20 = wt, '想要', nd, '需要'
    B21 = r.choice([80, 100, 120]); l21 = r.randint(45, B21 - 25); w21 = B21 - l21 + r.choice([-1, 1]) * r.randint(3, 12)
    items.append(item(8, '判斷', '單元 7', '想要與需要。', [(f'{q19}，是需要還是想要？', ['需要', '想要']), (f'{q20}，是需要還是想要？', ['需要', '想要']),
                      f'{who[2]}只有 {B21} 元，要先買 {l21} 元的午餐（需要的）。買了午餐，還剩幾元？']))
    A += [('8(1)', a19, '7', '想要需要三問：沒有它會怎樣？現在一定要嗎？錢夠嗎？分錯記 needWant（社會 Db-Ⅱ-1）'),
          ('8(2)', a20, '7', '同一樣東西，情況不同，答案也會不同；分錯記 needWant'),
          ('8(3)', f'{B21 - l21} 元', '7', f'需要的先買；剩下的錢再想想要不要買想要的（本題剩下的錢{"夠" if w21 <= B21 - l21 else "不夠"}買 {w21} 元的東西，可以在教學時延伸）')]
    # 9 存錢與存提款（單元 8）
    d22, k22 = r.choice([5, 10]), r.randint(6, 9)
    b23, s23 = r.randint(3, 8) * 100 + r.choice([0, 50]), r.randint(1, 4) * 100
    b24, w24 = r.randint(9, 15) * 100, r.randint(2, 6) * 100
    items.append(item(9, '算', '單元 8', '存錢與存提款。', [f'{who[3]}每天放 {d22} 元到存錢筒，放了 {k22} 天。存錢筒裡一共有幾元？',
                      f'存摺最後一行的結存是 {b23} 元，今天存入 {s23} 元。新的結存是幾元？', f'存摺最後一行的結存是 {b24} 元，今天提出 {w24} 元。新的結存是幾元？']))
    A += [('9(1)', f'{d22 * k22} 元', '8', f'{d22} 元 {d22} 元地數，或 {k22} 個 {d22}；寫 {d22 + k22} 表示把天數和錢加起來'),
          ('9(2)', f'{b23 + s23} 元', '8', f'存入，錢變多用加的；寫 {b23 - s23} 記 balanceWrong（特生E-sA-2）'),
          ('9(3)', f'{b24 - w24} 元', '8', f'提出，錢變少用減的；寫 {b24 + w24} 記 balanceWrong')]
    # 10 錢錢小管家（單元 9）
    s25 = r.randint(12, 20) * 10; a25 = r.randint(15, 45); g25 = r.choice([20, 50]); c25 = r.randint(10, 30)
    per26 = r.choice([20, 30, 40, 50]); have26 = per26 * r.randint(1, 3); w26 = r.randint(3, 6); price26 = have26 + per26 * w26
    A27 = r.choice([100, 120, 150]); S27 = r.choice([30, 40, 50]); H27 = r.choice([10, 20])
    items.append(item(10, '判斷', '單元 9', '錢錢小管家：記帳、存錢計畫、花存分享。', [f'記帳本：本來有 {s25} 元，買文具花 {a25} 元，阿姨給 {g25} 元，買點心花 {c25} 元。現在有幾元？',
                      f'想買 {price26} 元的跳跳球組，現在有 {have26} 元，每週存 {per26} 元。還要再存幾週才買得起？', f'這個月的零用錢是 {A27} 元，存起來 {S27} 元、分享 {H27} 元，剩下的可以花。可以花幾元？']))
    A += [('10(1)', f'{s25 - a25 + g25 - c25} 元', '9', f'花掉的減、拿到的加，一筆一筆記（特生E-sP-5）；只算到 {s25 - a25} 記 skipStep'),
          ('10(2)', f'{w26} 週', '9', f'還差 {price26 - have26} 元，每週 {per26} 元，一週一週加到夠（或用除的）；有剩下就要再多存一週（roundDown）'),
          ('10(3)', f'{A27 - S27 - H27} 元', '9', f'存起來和分享的都要減掉；只減一樣記 skipStep（社會 Db-Ⅱ-1）')]
    return items, A


UNITS = [('0 準備好了嗎（點數）', ['1(1)', '1(2)', '1(3)']),
         ('1 認識錢幣（一年級）', ['2(1)', '2(2)', '2(3)']),
         ('2 錢從哪裡來（社會、生活）', ['3(1)', '3(2)', '3(3)']),
         ('3 大錢與估算（二年級）', ['4(1)', '4(2)', '4(3)']),
         ('4 付錢', ['5(1)', '5(2)', '5(3)']),
         ('5 找錢', ['6(1)', '6(2)', '6(3)']),
         ('6 去買東西', ['7(1)', '7(2)', '7(3)']),
         ('7 想要與需要（社會）', ['8(1)', '8(2)', '8(3)']),
         ('8 存錢與存提款', ['9(1)', '9(2)', '9(3)']),
         ('9 錢錢小管家（生活應用）', ['10(1)', '10(2)', '10(3)'])]


def page(n, items, A):
    num = f'{n:02d}'
    rows = ''.join(f'<tr><td class="num">{q}</td><td>{html.escape(a)}</td><td class="num">{u}</td><td>{html.escape(c)}</td></tr>' for q, a, u, c in A)
    urows = ''.join(f'<tr><td>{name}</td><td>{"、".join(qs)}</td><td class="num">{len(qs)}</td><td class="num">{math.ceil(len(qs) * 0.8) - 1} 分以下</td><td class="score"></td></tr>' for name, qs in UNITS)
    pts = lambda us: sum(len(UNITS[u][1]) for u in us)
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>錢幣與購物前測 卷號 {num}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>{CSS}
@media print {{ .teacher {{ display: block; }} .teacher > * + * {{ margin-top: 14px; }} .teacher h3 {{ break-after: avoid; }} tr {{ break-inside: avoid; }} th {{ white-space: nowrap; }} .item {{ break-inside: avoid; }} }}</style></head><body><div class="wrap"><main class="sheet" id="v{num}">
  <header class="sheet-head">
    <div class="serial">卷號 <b>{num}</b></div>
    <h1>錢幣與購物前測</h1>
    <div class="meta"><span>學生代號<i></i></span><span>日期<i></i></span><span>施測者<i></i></span></div>
    <p class="note">一共 10 題，每個小題 1 分。一年級做第 1～3 題、第 5～6 題和第 8～10 題，二年級做第 1 題和第 4～10 題。老師可以把每一句題目唸給學生聽。有單位的答案要寫單位。可以寫算式、畫圖，也可以用實物錢幣（教具）操作，不限時間。</p>
  </header>
  {"".join(items)}
  <section class="teacher">
    <h2>教師用：卷號 {num} 的答案與計分</h2>
    <h3>計分規則</h3>
    <ul>
      <li>每個小題 1 分。有單位的題目，數字和單位都對才給分；選擇的題目圈選、寫字或打勾都可以。第 5(1) 題兩個空格都對才給分。</li>
      <li>可以用教具錢幣操作、畫圖或寫算式；用一個一個數等比較慢的方法算出正確答案也給分，但請在卷上記下用什麼方法，選單元時可以參考。</li>
      <li>一年級做第 1～3 題和第 5～6 題（{pts([0, 1, 2, 4, 5])} 分），加上第 8～10 題（{pts([7, 8, 9])} 分）；二年級做第 1 題和第 4～7 題（{pts([0, 3, 4, 5, 6])} 分），加上第 8～10 題；第 2、3 題二年級也可以做（{len(A)} 分全做）。一年級學生第 9(2)、9(3)、10(2) 題用到百位、千位的數，不會可以空著。第 8～10 題（理財）也可以留到教學後當類化探測。</li>
    </ul>
    <h3>答案</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>小題</th><th>答案</th><th>單元</th><th>測的概念、常見錯誤（括號是網站的觀察代碼）</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
    <h3>各單元得分與篩選</h3>
    <p>答對率未達 80% 的單元算「還沒學會」。依單元順序，選最前面 3 個還沒學會的單元進行教學；少於 3 個的學生不列入。單元 0 還沒學會的學生，網站上先做 0-1、0-2。網站路徑：一年級用「一年級版」，二年級用「二年級版」，只教付錢、找錢、購物用「購物版」，單元 7～9 用「理財版」；也可以在「全部」裡只勾選要教的單元。</p>
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
