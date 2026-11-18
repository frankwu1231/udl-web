# 因數與倍數前測注音版：把一般版 HTML（pretest-versions/）加上注音，寫到 pretest-zhuyin/。
# 讀音表：先用網站 public/zhuyin.js 的 CHARS 與 WORDS（第 28 版已校過「數」「長」「卡住」等破音字），
# 再用表面積前測 Codex 人工標注的字（zhuyin-surface-chars.json）覆蓋，最後加上本卷才有的詞 EXTRA_WORDS。
# 只在標題、學生代號、日期、題幹、小題、選項與「答」加注音；說明、圖中文字、表格與教師區不加。
# 用法：python3 docs/pretest-factor/make_pretest.py 之後執行 python3 docs/pretest-factor/make_zhuyin.py
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC, OUT = os.path.join(HERE, 'pretest-versions'), os.path.join(HERE, 'pretest-zhuyin')
SURF = json.load(open(os.path.join(HERE, 'zhuyin-surface-chars.json'), encoding='utf-8'))
CSS = SURF['css']
JS = open(os.path.join(ROOT, 'public', 'zhuyin.js'), encoding='utf-8').read()

# 本卷才有、網站讀音表沒有的破音詞
EXTRA_WORDS = {'數一數': 'ㄕㄨˇ,ㄧ,ㄕㄨˇ'}
# 本卷才有、網站和表面積卷都沒有的字
EXTRA_CHARS = ('華ㄏㄨㄚˊ 蛙ㄨㄚ 館ㄍㄨㄢˇ 乙ㄧˇ 甲ㄐㄧㄚˇ 枝ㄓ')
TONES = 'ˊˇˋ'


def markup(z):   # 'ㄕㄨˋ' → 直排注音的標記，格式和表面積注音卷相同
    neutral = z.startswith('˙')
    z = z.lstrip('˙')
    tone = z[-1] if z and z[-1] in TONES else ''
    if tone: z = z[:-1]
    col = ('<z-b class="zn">˙</z-b>' if neutral else '') + ''.join(f'<z-b>{c}</z-b>' for c in z)
    return f'<z-col>{col}</z-col>' + (f'<z-b class="zt">{tone}</z-b>' if tone else '')


chars_src = ''.join(re.findall(r"'([^']*)'", JS.split('const CHARS =')[1].split(';')[0]))
CHARS = {e[0]: markup(e[1:]) for e in chars_src.split(' ') if len(e) > 1}
CHARS.update(SURF['chars'])
CHARS.update({e[0]: markup(e[1:]) for e in EXTRA_CHARS.split()})
words_src = JS.split('const WORDS = {')[1].split('};')[0]
WORDS = {w: [markup(z) for z in zs.split(',')] for w, zs in re.findall(r"'([^']+)':\s*'([^']+)'", words_src)}
WORDS.update({w: [markup(z) for z in zs.split(',')] for w, zs in EXTRA_WORDS.items()})
CJK = re.compile(r'[一-鿿]')
missing = set()


def ruby(c, rt):
    return f'<ruby class="zy">{c}<rt>{rt}</rt></ruby>'


def annotate_text(s):   # 和網站一樣：先找 3 字詞、再找 2 字詞，其餘逐字
    out, i = [], 0
    while i < len(s):
        w = next((s[i:i + n] for n in (3, 2) if s[i:i + n] in WORDS), None)
        if w:
            out += [ruby(c, rt) for c, rt in zip(w, WORDS[w])]
            i += len(w)
            continue
        c = s[i]
        if CJK.match(c):
            if c not in CHARS:
                missing.add(c)
            out.append(ruby(c, CHARS.get(c, '')))
        else:
            out.append(c)
        i += 1
    return ''.join(out)


SKIP = {'施測者'}   # 給老師填的欄位不加注音


def annotate_html(fragment):   # 只改標籤外的文字
    return ''.join(p if p.startswith('<') or p in SKIP else annotate_text(p) for p in re.split(r'(<[^>]+>)', fragment))


PATTERNS = [r'(<h1>)(.*?)(</h1>)', r'(<div class="meta">)(.*?)(</div>)', r'(<p class="stem">)(.*?)(</p>)',
            r'(<span class="sub-q">)(.*?)(</span>(?:<span class="ans">|</li>))', r'(<span class="ans">)(答)(：)']


def convert(html):
    html = html.replace('<title>因數與倍數前測 卷號', '<title>因數與倍數前測注音版 卷號')
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
        sys.exit('讀音表缺這些字，請先補上 EXTRA_WORDS 或 zhuyin-surface-chars.json：' + ''.join(sorted(missing)))
    print('wrote 20 zhuyin HTML files to', OUT)
