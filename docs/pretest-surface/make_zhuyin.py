# 表面積前測注音版：把一般版 HTML（pretest-versions/）加上注音，寫到 pretest-zhuyin/。
# 讀音表 zhuyin-dict.json 來自 Codex 人工標注的第一版注音卷（臺灣讀音，一、不標本調；長方體的長讀ㄔㄤˊ，積讀ㄐㄧ）。
# 只在標題、學生代號、日期、題幹、小題與「答」加注音；說明、圖中文字與教師區不加。
# 用法：python3 docs/pretest-surface/make_pretest.py 之後執行 python3 docs/pretest-surface/make_zhuyin.py
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, 'pretest-versions'), os.path.join(HERE, 'pretest-zhuyin')
D = json.load(open(os.path.join(HERE, 'zhuyin-dict.json'), encoding='utf-8'))
WORDS = D['words']   # 破音字：詞 → 每個字的 rt
CHARS = D['chars']   # 一般字 → rt
CSS = D['css']
CJK = re.compile(r'[一-鿿]')
missing = set()


def ruby(c, rt):
    return f'<ruby class="zy">{c}<rt>{rt}</rt></ruby>'


def annotate_text(s):
    out, i = [], 0
    while i < len(s):
        for w, rts in WORDS.items():
            if s.startswith(w, i):
                out += [ruby(c, rt) for c, rt in zip(w, rts)]
                i += len(w)
                break
        else:
            c = s[i]
            if CJK.match(c):
                if c not in CHARS:
                    missing.add(c)
                out.append(ruby(c, CHARS.get(c, '')))
            else:
                out.append(c)
            i += 1
    return ''.join(out)


SKIP = {'施測者'}  # 給老師填的欄位不加注音


def annotate_html(fragment):  # 只改標籤外的文字
    return ''.join(p if p.startswith('<') or p in SKIP else annotate_text(p) for p in re.split(r'(<[^>]+>)', fragment))


PATTERNS = [r'(<h1>)(.*?)(</h1>)', r'(<div class="meta">)(.*?)(</div>)', r'(<p class="stem">)(.*?)(</p>)',
            r'(<span class="sub-q">)(.*?)(</span>)', r'(<span class="ans">)(答)(：)']


def convert(html):
    html = html.replace('<title>表面積前測 卷號', '<title>表面積前測注音版 卷號')
    html = html.replace('</style></head>', CSS + '</style></head>', 1)
    for p in PATTERNS:
        html = re.sub(p, lambda m: m.group(1) + annotate_html(m.group(2)) + m.group(3), html)
    return html


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for n in range(1, 21):
        src = open(os.path.join(SRC, f'pretest-{n:02d}.html'), encoding='utf-8').read()
        open(os.path.join(OUT, f'pretest-zhuyin-{n:02d}.html'), 'w', encoding='utf-8').write(convert(src))
    if missing:
        sys.exit('讀音表缺這些字，請先補上 zhuyin-dict.json：' + ''.join(sorted(missing)))
    print('wrote 20 zhuyin HTML files to', OUT)
