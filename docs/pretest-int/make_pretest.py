# 整數四則運算前測：產生 20 份 HTML（一般版）與 answers.csv。版面沿用分數前測（docs/pretest-frac/）。
# 依網站第 35 版的單元 0～11，每個單元一題、每題 3 小題：
#   一年級做第 1～2 題（單元 0～1），二、三年級做第 1～7 題和第 9 題（單元 0～6、8），四年級做第 1～10 題（單元 0～9），五年級做全部；
#   第 12 題「算數小幫手」（單元 11）各年級都做，也可留到教學後當類化探測。
# 數字範圍照課綱與網站（第35版_Codex測試說明.md 第二節）：二年級加法最多二次進位、減法一次退位；二年級分裝平分不用「除」字；
#   兩步驟題不併式；四年級乘數、除數不超過三位；併式只用整數；不做 a－(b－c)、a÷(b÷c) 去括號。
# 點點、座位圖用 SVG 畫在卷上；人名、店名都是虛構的。
# 用法：python3 docs/pretest-int/make_pretest.py  →  docs/pretest-int/pretest-versions/pretest-01～20.html、answers.csv
# 注音版：python3 docs/pretest-int/make_zhuyin.py；轉 PDF：node docs/pretest-int/make-pdfs.mjs [輸出資料夾] [zhuyin]
import html, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'pretest-versions')
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()
NAMES = ['小華', '小美', '小安', '小明', '小芬', '小宇', '小玲', '小志']


def dots(k, r):   # k 個點，散在 5×5 的格子裡（不重疊），給學生點數
    cells = r.sample(range(25), k)
    g = ''.join(f'<circle cx="{24 + (c % 5) * 44 + r.uniform(-7, 7):.1f}" cy="{24 + (c // 5) * 36 + r.uniform(-5, 5):.1f}" r="11" fill="#9fbde0" stroke="#1d2b44" stroke-width="2"/>' for c in cells)
    return f'<figure class="fig-sub"><svg viewBox="0 0 224 186" width="224" height="186" role="img" aria-label="一些圓點">{g}</svg><figcaption>數一數，有幾個點？</figcaption></figure>'


def seats(rows, cols):   # 教室座位：rows 排、每排 cols 個
    W, H = 20 + cols * 42, 20 + rows * 36
    g = ''.join(f'<rect x="{12 + c * 42}" y="{12 + rr * 36}" width="30" height="24" rx="4" fill="#bfe0b4" stroke="#1d2b44" stroke-width="2"/>' for rr in range(rows) for c in range(cols))
    return f'<figure class="fig-sub"><svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="座位圖">{g}</svg><figcaption>教室的座位</figcaption></figure>'


def sub(no, q, opts=None):
    ch = f'<span class="choices">{"".join(f"<span>{o}</span>" for o in opts)}</span>' if opts else ''
    return f'<li><span class="sub-no">({no})</span><span class="sub-q">{q}{ch}</span><span class="ans">答：<span class="blank"></span></span></li>'


def item(no, tag, units, stem, subs, fig=''):
    t = '<span class="tag tag-calc">計算</span>' if tag == '算' else '<span class="tag tag-app">判斷</span>'
    lis = ''.join(sub(i + 1, *s) if isinstance(s, tuple) else sub(i + 1, s) for i, s in enumerate(subs))
    f = f'\n  <div class="fig">{fig}</div>' if fig else ''
    return (f'<section class="item">\n  <header class="item-head"><span class="no">{no}</span>{t}<span class="unit-tag">{units}</span></header>\n'
            f'  <p class="stem">{stem}</p>{f}\n  <ol class="subs">{lis}</ol>\n</section>')


def digits(x):
    return [int(c) for c in str(x)]


def carries(a, b):   # 加法進位次數
    n, c = 0, 0
    while a or b:
        s = a % 10 + b % 10 + c
        c = 1 if s >= 10 else 0
        n += c; a //= 10; b //= 10
    return n


def borrows(a, b):   # 減法退位次數
    n, c = 0, 0
    while a:
        d = a % 10 - c - b % 10
        c = 1 if d < 0 else 0
        n += c; a //= 10; b //= 10
    return n


def make(n):
    r = random.Random(20261119 * 100 + 35 * 1000 + n)
    A, items = [], []   # A：(小題, 答案, 單元, 概念與常見錯誤)
    who = r.sample(NAMES, 4)
    # 1 準備好了嗎（單元 0）
    k1 = r.randint(12, 19); t2, o2 = r.choice([(a, b) for a in range(3, 9) for b in range(1, 10) if a != b]); t3, o3 = r.choice([(a, b) for a in range(2, 10) for b in range(1, 10) if a != b])
    items.append(item(1, '算', '單元 0', '數一數、換一換。', ['圖上一共有幾個點？', f'{t2} 個十和 {o2} 個一，合起來是多少？', f'{t3 * 10 + o3} 是幾個十和幾個一？'], dots(k1, r)))
    A += [('1(1)', f'{k1} 個', '0', '一個一個點數，數過的做記號；少數記 countShort、多數（重複數）記 countOver'),
          ('1(2)', str(t2 * 10 + o2), '0', f'寫成 {o2 * 10 + t2} 表示十位和個位寫反（placeSwap）'),
          ('1(3)', f'{t3} 個十和 {o3} 個一', '0', '兩個空格都對才給分；寫反記 placeSwap')]
    # 2 加加減減是什麼（單元 1，一年級，20 以內）
    a4 = r.randint(6, 12); b4 = r.randint(3, 20 - a4)
    a5 = r.randint(7, 15); b5 = a5 if r.random() < .25 else r.randint(2, a5 - 2)
    a6 = r.randint(11, 18); b6 = r.randint(4, a6 - 3)
    items.append(item(2, '判斷', '單元 1', '讀一讀，算算看。', [f'公車上有 {a4} 人，到了下一站又上來 {b4} 人。現在車上有幾人？',
                      f'盤子裡有 {a5} 塊餅乾，{who[0]}吃掉 {b5} 塊。還剩幾塊？', f'{who[1]}有 {a6} 張貼紙，{who[2]}有 {b6} 張。{who[1]}比{who[2]}多幾張？']))
    A += [('2(1)', f'{a4 + b4} 人', '1', '添加型：原來的加上又上來的'),
          ('2(2)', f'{a5 - b5} 塊', '1', '拿走型' + ('；全部吃掉剩 0 塊，空著不寫或寫「沒有」要問清楚' if a5 == b5 else '') + f'；寫 {a5 + b5} 表示選錯運算（opWrong）'),
          ('2(3)', f'{a6 - b6} 張', '1', f'比較型：多幾張用減的；寫 {a6 + b6} 表示看到「多」就用加（opWrong）')]
    # 3 加減直式（單元 2）
    while True:
        a7, b7 = r.randint(120, 780), r.randint(14, 89)
        if carries(a7, b7) == 1 and (a7 + b7) % 10 and a7 + b7 < 1000: break
    while True:
        a8, b8 = r.randint(320, 980), r.randint(110, 690)
        if a8 > b8 and borrows(a8, b8) == 1 and a8 % 10 < b8 % 10: break
    h9, o9 = r.randint(4, 9), r.randint(0, 6)
    b9 = r.randint(110, h9 * 100 - 10)
    while b9 % 10 <= o9 or (b9 // 10) % 10 == 0: b9 = r.randint(110, h9 * 100 - 10)
    a9 = h9 * 100 + o9
    items.append(item(3, '算', '單元 2', '算算看。可以寫直式。', [f'{a7} ＋ {b7} ＝ □', f'{a8} － {b8} ＝ □', f'{a9} － {b9} ＝ □']))
    wrong8 = int(''.join(str(abs(x - y)) for x, y in zip(digits(a8), digits(b8))))
    A += [('3(1)', str(a7 + b7), '2', f'滿十要進位；寫 {a7 + b7 - 10 ** next(i for i in range(4) if (a7 // 10 ** i) % 10 + (b7 // 10 ** i) % 10 >= 10) * 10} 表示進位忘了加（noCarry）；個位沒有對個位記 placeMisalign'),
          ('3(2)', str(a8 - b8), '2', f'個位不夠減，向十位借 1 個十；寫 {wrong8} 表示倒過來用大的減小的（subSmallFromBig），寫 {a8 - b8 + 10} 表示被借的那一位忘了減 1（noBorrowDec）'),
          ('3(3)', str(a9 - b9), '2', '十位是 0，要先從百位借，再換到十位（三年級）；常見錯誤 noBorrowDec、subSmallFromBig')]
    # 4 加減應用題（單元 3，未知數）
    a10 = r.randint(14, 38); c10 = a10 + r.randint(9, 27)
    b11, c11 = r.randint(15, 45), r.randint(12, 48)
    h12 = r.randint(118, 142); d12 = r.randint(6, 15)
    items.append(item(4, '判斷', '單元 3', '先想想：要找的是全部，還是其中一部分？', [f'{who[3]}原本有 {a10} 張卡片，{who[0]}又送他一些，現在有 {c10} 張。{who[0]}送了幾張？',
                      f'媽媽的錢包用掉 {b11} 元，還剩 {c11} 元。錢包裡原來有多少元？', f'哥哥身高 {h12} 公分，弟弟比哥哥矮 {d12} 公分。弟弟身高幾公分？']))
    A += [('4(1)', f'{c10 - a10} 張', '3', f'加數未知：全部減掉原本的；看到「又」就寫 {a10 + c10} 記 keyword'),
          ('4(2)', f'{b11 + c11} 元', '3', f'被減數未知：用掉的加剩下的；看到「用掉」就減，寫 {abs(c11 - b11)} 記 keyword'),
          ('4(3)', f'{h12 - d12} 公分', '3', f'比較型：矮就用減的；寫 {h12 + d12} 記 opWrong')]
    # 5 乘法與九九（單元 4）
    e13, n13 = r.choice([6, 8, 10]), r.randint(3, 7)
    m14, k14 = r.randint(3, 9), r.randint(3, 6)
    rr15, cc15 = r.choice([(a, b) for a in (3, 4, 5) for b in (4, 5, 6) if a != b])
    items.append(item(5, '算', '單元 4', '乘法。', [f'一盒雞蛋有 {e13} 顆，{n13} 盒一共有幾顆？', f'{m14} 的 {k14} 倍是多少？', '座位排成一排一排，一共有幾個座位？'], seats(rr15, cc15)))
    A += [('5(1)', f'{e13 * n13} 顆', '4', f'{n13} 個 {e13}；寫 {e13 + n13} 表示用加的（eqSum）'),
          ('5(2)', str(m14 * k14), '4', f'{k14} 個 {m14}；寫 {m14 + k14} 記 eqSum'),
          ('5(3)', f'{rr15 * cc15} 個', '4', f'{rr15} 排、每排 {cc15} 個，{rr15}×{cc15} 或 {cc15}×{rr15} 都可以；一個一個數也算對（記下來用什麼方法）')]
    # 6 分一分（單元 5）
    p16, b16 = r.choice([3, 4, 5]), r.randint(3, 6)
    s17, q17 = r.choice([3, 4, 5, 6]), r.randint(3, 6)
    d18, q18 = r.randint(3, 9), r.randint(3, 9); r18 = r.randint(1, d18 - 1)
    items.append(item(6, '算', '單元 5', '分一分。', [f'有 {p16 * b16} 顆糖，每袋裝 {p16} 顆，可以裝滿幾袋？', f'{s17 * q17} 塊餅乾，平分給 {s17} 個人，每人分到幾塊？', f'{d18 * q18 + r18} ÷ {d18} ＝ □ 餘 □']))
    A += [('6(1)', f'{b16} 袋', '5', f'分裝：{p16} 個一袋地裝，或想 {p16} × □ ＝ {p16 * b16}（二年級不寫除式）'),
          ('6(2)', f'{q17} 塊', '5', f'平分：每人一次一塊地分，或想 {s17} × □ ＝ {s17 * q17}；寫 {s17 * q17 - s17} 等表示用減的（opWrong）'),
          ('6(3)', f'{q18} 餘 {r18}', '5', f'商和餘數都對才給分；餘數要比除數 {d18} 小，寫 {q18 - 1} 餘 {r18 + d18} 記 remBig（三年級）')]
    # 7 乘除一位數直式（單元 6，三年級）
    h19, o19, k19 = r.randint(1, 4), r.randint(2, 9), r.randint(3, 9)
    d20 = r.randint(2, 4); q20 = r.randint(1, 9 // d20) * 100 + r.randint(1, 9)
    d21, q21 = r.randint(3, 8), r.randint(12, 40); r21 = r.randint(1, d21 - 1)
    items.append(item(7, '算', '單元 6', '算算看。可以寫直式。', [f'{h19 * 100 + o19} × {k19} ＝ □', f'{q20 * d20} ÷ {d20} ＝ □', f'一個數除以 {d21}，商是 {q21}，餘數是 {r21}。這個數是多少？']))
    A += [('7(1)', str((h19 * 100 + o19) * k19), '6', '個位乘完要進位到十位，十位是 0 也要加上進位的數（noCarry）'),
          ('7(2)', str(q20), '6', f'十位不夠分要商 0；寫成 {q20 // 100}{q20 % 10} 表示商中間的 0 漏寫（zeroQuotient）'),
          ('7(3)', str(d21 * q21 + r21), '6', f'驗算：除數 × 商 ＋ 餘數 ＝ 被除數，{d21} × {q21} ＋ {r21}；忘了加餘數記 skipStep')]
    # 8 多位數乘除直式（單元 7，四年級）
    a22 = r.randint(120, 480); b22 = r.choice([x for x in range(12, 40) if x % 10])
    while True:
        d23 = r.choice([x for x in range(21, 75) if 1 <= x % 10 <= 4]); q23 = r.randint(5, 9); r23 = r.randint(1, d23 - 1); n23 = d23 * q23 + r23
        if n23 // (d23 // 10 * 10) > q23 and n23 < 1000: break
    d24 = r.randint(21, 45); q24 = r.randint(11, 29); r24 = r.randint(1, d24 - 1)
    while d24 * q24 + r24 >= 1000: q24 -= 1
    items.append(item(8, '算', '單元 7', '算算看。可以寫直式。', [f'{a22} × {b22} ＝ □', f'{n23} ÷ {d23} ＝ □ 餘 □', f'{d24 * q24 + r24} ÷ {d24} ＝ □ 餘 □']))
    A += [('8(1)', str(a22 * b22), '7', f'乘十位的那一列要往左一格；寫 {a22 * (b22 // 10) + a22 * (b22 % 10)} 表示第二列沒有往左（noShift）'),
          ('8(2)', f'{q23} 餘 {r23}', '7', f'把 {d23} 看成 {d23 // 10 * 10} 估商，先估 {n23 // (d23 // 10 * 10)} 會太大，要調小（estTooBig）；商和餘數都對才給分'),
          ('8(3)', f'{q24} 餘 {r24}', '7', f'商是二位數，從十位開始商（startWrong）；餘數要比 {d24} 小（remBig）；商和餘數都對才給分')]
    # 9 兩步驟應用題（單元 8，不併式）
    k25, p25, q25 = r.randint(2, 5), r.randint(5, 9), r.randint(18, 35)
    bx26, bo26, e26 = r.randint(2, 4), r.randint(3, 5), r.choice([4, 6, 8])
    x27, n27, c27 = r.choice([(x, n, c) for x in (12, 15, 18, 24) for n in (3, 4, 5, 6) for c in (4, 5, 6, 8) if x * n % c == 0 and c != n and x * n // c > 6])
    items.append(item(9, '判斷', '單元 8', '兩個步驟的問題。可以分兩次算。', [f'一枝鉛筆 {p25} 元，{who[1]}買 {k25} 枝，再買一本 {q25} 元的筆記本。一共要付多少元？',
                      f'一箱有 {bo26} 盒，一盒有 {e26} 個布丁。{bx26} 箱一共有幾個布丁？', f'一箱果汁有 {x27} 瓶，學校買了 {n27} 箱，平分給 {c27} 個班。每班分到幾瓶？']))
    A += [('9(1)', f'{k25 * p25 + q25} 元', '8', f'先算鉛筆 {k25}×{p25}，再加筆記本（二年級）；只算出 {k25 * p25} 記 skipStep'),
          ('9(2)', f'{bx26 * bo26 * e26} 個', '8', f'先算一箱幾個（{bo26}×{e26}），再乘 {bx26} 箱（三年級）；只算一步記 skipStep'),
          ('9(3)', f'{x27 * n27 // c27} 瓶', '8', f'先算一共 {x27 * n27} 瓶，再平分給 {c27} 班（四年級）；只算出 {x27 * n27} 記 skipStep')]
    # 10 併式與四則混合（單元 9，四年級）
    a28, b28, c28 = r.randint(12, 40), r.randint(3, 9), r.randint(3, 9)
    if r.random() < .5:
        a29, b29, c29 = r.randint(40, 90), r.randint(12, 35), r.randint(3, 6)
        q29, v29, w29 = f'（{a29} － {b29}）× {c29} ＝ □', (a29 - b29) * c29, f'括號先算；先算 {b29}×{c29} 表示沒有照括號先算的順序（leftToRight）'
    else:
        c29 = r.randint(3, 8); b29 = c29 * r.randint(4, 12); a29 = r.randint(b29 // c29 + 20, 99)
        q29, v29, w29 = f'{a29} － {b29} ÷ {c29} ＝ □', a29 - b29 // c29, f'先除後減；先算 {a29}－{b29} 再除表示由左往右算（leftToRight）'
    k30 = r.randint(3, 19); f30 = r.choice([(25, 4), (4, 25), (125, 8), (5, 2)])
    items.append(item(10, '算', '單元 9', '四則混合計算。注意先算哪一個。', [f'{a28} ＋ {b28} × {c28} ＝ □', q29, f'{f30[0]} × {k30} × {f30[1]} ＝ □（想一想，怎麼算比較快？）']))
    A += [('10(1)', str(a28 + b28 * c28), '9', f'先乘後加；寫 {(a28 + b28) * c28} 表示由左往右算（leftToRight）'),
          ('10(2)', str(v29), '9', w29),
          ('10(3)', str(f30[0] * k30 * f30[1]), '9', f'先算 {f30[0]}×{f30[1]}＝{f30[0] * f30[1]} 再乘 {k30} 比較快；答案對就給分，教師可記錄有沒有換順序')]
    # 11 三步驟、平均、分配律（單元 10，五年級）
    while True:
        n31, p31, m31, s31 = r.randint(2, 4), r.choice(range(35, 70, 5)), r.randint(2, 4), r.choice(range(15, 35, 5))
        pay31 = 500 if n31 * p31 + m31 * s31 < 480 else 1000
        if n31 != m31: break
    days = [r.randint(40, 90) for _ in range(4)]; days.append(r.randint(40, 90))
    while sum(days) % 5: days[-1] += 1
    k33, b33 = r.randint(3, 9), r.choice([99, 101, 98])
    items.append(item(11, '判斷', '單元 10', '三個步驟、平均與簡便算法。', [f'園遊會一盤炒麵 {p31} 元、一杯飲料 {s31} 元。買 {n31} 盤炒麵和 {m31} 杯飲料，付 {pay31} 元，要找回多少元？',
                      f'{who[2]}這星期五天跳繩的次數是 {"、".join(map(str, days))} 下。平均每天跳幾下？', f'{b33} × {k33} ＝ □（想一想，怎麼算比較快？）']))
    A += [('11(1)', f'{pay31 - n31 * p31 - m31 * s31} 元', '10', f'三步驟：{n31}×{p31}、{m31}×{s31}、{pay31}－兩個的和；只算到一共 {n31 * p31 + m31 * s31} 元記 skipStep'),
          ('11(2)', f'{sum(days) // 5} 下', '10', f'五天合起來 {sum(days)} 下，再平分成 5 天；只寫總和記 avgNoDivide'),
          ('11(3)', str(b33 * k33), '10', f'{b33} 看成 100 {"－" if b33 < 100 else "＋"} {abs(100 - b33)}，兩個數都要乘 {k33}；寫 {100 * k33 + (b33 - 100)} 表示只乘了一個（distribMiss）')]
    # 12 算數小幫手（單元 11）
    m34 = r.choice([30, 40, 50, 60]); p34 = r.randint(12, m34 - 15); diff = r.choice([-1, 1]) * r.randint(2, 6); q34 = m34 + diff - p34
    p35 = r.choice([x for x in range(23, 89) if x % 10])
    k36 = r.randint(6, 9); n36 = r.choice([x for x in range(22, 41) if x % k36])
    items.append(item(12, '判斷', '單元 11', '算數小幫手：生活裡的整數。', [(f'{who[3]}帶了 {m34} 元，想買 {p34} 元的麵包和 {q34} 元的牛奶。錢夠不夠？', ['夠', '不夠']),
                      f'用 100 元買一本 {p35} 元的故事書，要找回多少元？', f'全班 {n36} 人去校外教學，一台車最多坐 {k36} 人。至少要幾台車？']))
    A += [('12(1)', '夠' if diff < 0 else '不夠', '11', f'麵包加牛奶一共 {p34 + q34} 元，和 {m34} 元比；判斷錯記 compareWrong'),
          ('12(2)', f'{100 - p35} 元', '11', f'100－{p35}，十位、個位都是 0，要從百位一路退位；倒過來用大的減小的記 subSmallFromBig，忘了減 1 記 noBorrowDec'),
          ('12(3)', f'{-(-n36 // k36)} 台', '11', f'{n36}÷{k36}＝{n36 // k36} 餘 {n36 % k36}，剩下的 {n36 % k36} 人也要坐車，要多一台；寫 {n36 // k36} 記 roundDown')]
    return items, A


UNITS = [('0 準備好了嗎（點數與位值）', ['1(1)', '1(2)', '1(3)']),
         ('1 加加減減是什麼（一年級）', ['2(1)', '2(2)', '2(3)']),
         ('2 加減直式（二、三年級）', ['3(1)', '3(2)', '3(3)']),
         ('3 加減應用題（二年級）', ['4(1)', '4(2)', '4(3)']),
         ('4 乘法與九九（二年級）', ['5(1)', '5(2)', '5(3)']),
         ('5 分一分：分裝、平分與除法（二、三年級）', ['6(1)', '6(2)', '6(3)']),
         ('6 乘除一位數直式（三年級）', ['7(1)', '7(2)', '7(3)']),
         ('7 多位數乘除直式（四年級）', ['8(1)', '8(2)', '8(3)']),
         ('8 兩步驟應用題（二到四年級）', ['9(1)', '9(2)', '9(3)']),
         ('9 併式與四則混合計算（四年級）', ['10(1)', '10(2)', '10(3)']),
         ('10 三步驟、平均與分配律（五年級）', ['11(1)', '11(2)', '11(3)']),
         ('11 算數小幫手', ['12(1)', '12(2)', '12(3)'])]


def page(n, items, A):
    num = f'{n:02d}'
    rows = ''.join(f'<tr><td class="num">{q}</td><td>{html.escape(a)}</td><td class="num">{u}</td><td>{html.escape(c)}</td></tr>' for q, a, u, c in A)
    urows = ''.join(f'<tr><td>{name}</td><td>{"、".join(qs)}</td><td class="num">{len(qs)}</td><td class="num">{math.ceil(len(qs) * 0.8) - 1} 分以下</td><td class="score"></td></tr>' for name, qs in UNITS)
    pts = lambda us: sum(len(UNITS[u][1]) for u in us)
    life = len(UNITS[-1][1])
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>整數四則運算前測 卷號 {num}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"><style>{CSS}
@media print {{ .teacher {{ display: block; }} .teacher > * + * {{ margin-top: 14px; }} .teacher h3 {{ break-after: avoid; }} tr {{ break-inside: avoid; }} th {{ white-space: nowrap; }} .item {{ break-inside: avoid; }} }}</style></head><body><div class="wrap"><main class="sheet" id="v{num}">
  <header class="sheet-head">
    <div class="serial">卷號 <b>{num}</b></div>
    <h1>整數四則運算前測</h1>
    <div class="meta"><span>學生代號<i></i></span><span>日期<i></i></span><span>施測者<i></i></span></div>
    <p class="note">一共 12 題，每個小題 1 分。一年級做第 1～2 題和第 12 題，二、三年級做第 1～7 題、第 9 題和第 12 題，四年級做第 1～10 題和第 12 題，五年級做全部。老師可以把每一句題目唸給學生聽。有單位的答案要寫單位。可以寫算式、直式、畫圖，不限時間。</p>
  </header>
  {"".join(items)}
  <section class="teacher">
    <h2>教師用：卷號 {num} 的答案與計分</h2>
    <h3>計分規則</h3>
    <ul>
      <li>每個小題 1 分。有單位的題目，數字和單位都對才給分；選擇的題目寫字或打勾都可以。「□ 餘 □」和第 1(3) 題兩個空格都對才給分。</li>
      <li>算式、直式和畫圖都可以；用點數、連加等比較慢的方法算出正確答案也給分，但請在卷上記下用什麼方法，選單元時可以參考。</li>
      <li>一年級做第 1～2 題（{pts([0, 1])} 分）和第 12 題（{life} 分）；二、三年級做第 1～7 題和第 9 題（{pts([0, 1, 2, 3, 4, 5, 6, 8])} 分）和第 12 題；四年級做第 1～10 題（{pts(range(10))} 分）和第 12 題；五年級做全部（{len(A)} 分）。二年級學生第 6(3)、7、9(2)、9(3) 題是三、四年級的內容，不會可以空著。第 12 題「算數小幫手」也可以留到教學後當類化探測。</li>
    </ul>
    <h3>答案</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>小題</th><th>答案</th><th>單元</th><th>測的概念、常見錯誤（括號是網站的觀察代碼）</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
    <h3>各單元得分與篩選</h3>
    <p>答對率未達 80% 的單元算「還沒學會」。依單元順序，選最前面 3 個還沒學會的單元進行教學；少於 3 個的學生不列入。單元 0 還沒學會的學生，網站上先做 0-1、0-2。網站路徑：一年級用「一年級版」，單元 1～3 用「加減版」，單元 4～7 用「乘除版」，單元 3、8～10 用「應用題版」，單元 11 用「算數小幫手」；也可以在「全部」裡只勾選要教的單元。</p>
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
