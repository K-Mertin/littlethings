# 字甲戰線 像素圖示（16×16，Q版）
# rows：左半 8 格，自動鏡像成 16 格；over：{(y,x):顏色代號} 在鏡像後覆蓋（全寬座標）
# 顏色代號：k 外框、H 頭盔、F 臉、E 眼、w 眼睛高光、B 腮紅、m 嘴、b/c 身體
TWO=["........","........","....kkkk","...kHHHH","..kHHHHH","..kHHHHH",".kHFFFFF",".kHFwEFF",".kHFEEFF",".kHFEEFF",".kHBBFFm","..kHFFFF","...kkkkk","....kbbc","...kbbbb","...kk.kk"]
MONO=TWO[:7]+[".kHFFFEE",".kHFFFEE",".kHFFFEE",".kHBBFFF"]+TWO[11:]
BOX=["........","........","..kkkkkk","..kHHHHH","..kHHHHH","..kHHHHH",".kHFFFFF"]+TWO[7:]

def sym(d,y,x,c): d[(y,x)]=c; d[(y,15-x)]=c
def eyes_left_hi(d): d[(7,10)]='w'; d[(7,11)]='E'          # 兩眼高光都在左上
def mono_hi(d): d[(7,6)]='w'
def wings(d,c='s'):
    for y in range(5,9): sym(d,y,0,c)
    sym(d,4,0,'k'); sym(d,9,0,'k')
def horns(d,c):
    for y,x in [(0,3),(1,3),(1,4),(2,4)]: sym(d,y,x,c)
def cannon(d,both=False):
    for y in range(0,10):
        for x,c in ((0,'k'),(1,'g')):
            d[(y,x)]=c if y else 'k'
            if both: d[(y,15-x)]=c if y else 'k'
def halo(d,c='h'):
    for x in range(5,11): d[(0,x)]=c
    d[(1,4)]=c; d[(1,11)]=c
def shield(d):
    for y in range(9,16):
        for x in range(0,6):
            d[(y,x)]='k' if y in (9,15) or x in (0,5) else 'g'
    for y,x in [(11,2),(11,3),(12,2),(12,3)]: d[(y,x)]='y'
def mk(name,pilot,pal,rows=TWO,extra=None,hi='two'):
    d={}
    if hi=='two': eyes_left_hi(d)
    elif hi=='mono': mono_hi(d)
    if extra: extra(d)
    base=dict(k='#1a1a24',B='#ff8fa8',m='#8a3048',w='#ffffff')
    return dict(name=name,pilot=pilot,pal={**base,**pal},rows=rows,over=d)

S={}
# ---------- 我方 ----------
def x_gang(d):
    for y,x in [(0,2),(1,3),(1,4),(2,4),(2,5)]: sym(d,y,x,'y')
    for y in (2,3): d[(y,7)]='r'; d[(y,8)]='r'
S['gang']=mk('剛鐵號','雷隼',dict(H='#3a7be0',F='#eef3fa',E='#1b2a4a',b='#3a7be0',c='#e0463c',y='#f3c43b',r='#e0463c'),extra=x_gang)
S['feng']=mk('疾風號','夏蓮',dict(H='#3fbf7f',F='#effaf4',E='#15402c',b='#3fbf7f',c='#fff27a',s='#a8f0c8'),extra=lambda d:wings(d))
def x_lei(d):
    for y,x in [(6,4),(6,5),(10,4),(10,5),(7,3),(8,3),(9,3),(7,6),(8,6),(9,6)]: d[(y,x)]='r'
    d[(0,11)]='k'; d[(1,11)]='g'; d[(2,11)]='g'
S['lei']=mk('遠雷號','冬木',dict(H='#7b8a4a',F='#eef0e4',E='#2a2a18',b='#7b8a4a',c='#4f5a2e',r='#f3c43b',g='#9aa3ad'),extra=x_lei)
S['yu']=mk('天使號','小晴',dict(H='#f28cb8',F='#fff6fa',E='#6a2a50',b='#ffffff',c='#f28cb8',h='#ffe27a'),extra=lambda d:halo(d))
def x_tetsu(d): d[(3,7)]='y'; d[(3,8)]='y'; sym(d,7,1,'g'); sym(d,8,1,'g')
S['tetsu']=mk('岩山號','鐵山',dict(H='#e0892f',F='#fbf1e6',E='#3a2410',b='#9a5518',c='#e0892f',y='#fff27a',g='#8f8a84'),rows=BOX,extra=x_tetsu)
def x_lena(d):
    d[(0,7)]='f'; d[(0,8)]='f'
    for x in (6,7,8,9): d[(1,x)]='f'
    d[(2,7)]='y'; d[(2,8)]='y'
S['lena']=mk('緋紅號','蕾娜',dict(H='#c8323c',F='#eef1f5',E='#4a1018',b='#c8323c',c='#f3c43b',f='#ff7b6b',y='#f3c43b'),extra=x_lena)
def x_rei(d): d[(10,7)]='F'; d[(10,8)]='F'
S['rei']=mk('零號','零',dict(H='#4a3a7a',F='#3a3448',E='#ff4a5a',B='#7a3a6a',b='#2a2438',c='#7a4fd6'),extra=x_rei)

# ---------- 敵方 ----------
EMP=dict(H='#c8483e',F='#2a1414',E='#ffcf3a',B='#7a3040',b='#7a2622',c='#e0a93a',g='#9aa0a8',y='#e0a93a',o='#f0e6d8')
FED=dict(H='#8fa3b8',F='#1c2a36',E='#6ff08a',B='#3a5a6a',b='#5a6b80',c='#dfe7ee',a='#bfe0ff',g='#9aa0a8',r='#ff4a4a')
VOID=dict(H='#3a2e5a',F='#0e0b16',E='#e05aff',B='#4a2a5a',b='#2a1e4a',c='#7a4fd6',s='#9a7ae0')
nomouth=lambda d:(d.__setitem__((10,7),'F'),d.__setitem__((10,8),'F'))
def combo(*fs):
    def f(d):
        for g in fs: g(d)
    return f
S['bing']=mk('量產機','帝國軍',EMP,rows=MONO,hi='mono',extra=nomouth)
S['jing']=mk('帝國精銳機','帝國軍',{**EMP,'H':'#e0503e'},rows=MONO,hi='mono',extra=combo(nomouth,lambda d:horns(d,'o')))
def crest(d):
    for x in (5,6,7,8,9,10): d[(1,x)]='y'
    for x in (5,7,8,10): d[(0,x)]='y'
S['wei']=mk('赤環近衛機','帝國軍',{**EMP,'H':'#9a2230','E':'#6ff0ff','y':'#f3c43b','c':'#f3c43b'},rows=MONO,hi='mono',extra=combo(nomouth,crest))
S['pao']=mk('砲擊機','帝國軍',{**EMP,'H':'#b8683e'},rows=MONO,hi='mono',extra=combo(nomouth,lambda d:cannon(d)))
S['zhong']=mk('帝國重砲機','帝國軍',{**EMP,'H':'#8a5030'},rows=MONO,hi='mono',extra=combo(nomouth,lambda d:cannon(d,True)))
S['yi']=mk('飛翼機','帝國軍',{**EMP,'s':'#ffb0a0'},rows=MONO,hi='mono',extra=combo(nomouth,lambda d:wings(d)))
S['dun']=mk('重盾機','帝國軍',{**EMP,'H':'#a84a3a'},rows=MONO,hi='mono',extra=combo(nomouth,shield))
def plume(c):
    def f(d):
        d[(0,7)]=c; d[(0,8)]=c
        for x in (6,7,8,9): d[(1,x)]=c
    return f
S['qi']=mk('帝國騎士機','帝國軍',{**EMP,'H':'#8a2a30','F':'#d8dde3','E':'#4a1018','B':'#ff8fa8','f':'#d0d6de'},extra=combo(nomouth,plume('f')))
S['lian']=mk('聯合量產機','聯合軍',FED,extra=nomouth)
S['lian2']=mk('聯合精銳機','聯合軍',{**FED,'H':'#6f8fb8','E':'#6ff0ff'},extra=combo(nomouth,lambda d:(sym(d,0,5,'a'),sym(d,1,5,'a'))))
S['te']=mk('聯合特務機','聯合軍',{**FED,'H':'#3a4252','F':'#10141c','E':'#ff4a4a','b':'#262c38'},extra=combo(nomouth,lambda d:[sym(d,5,x,'r') for x in (3,4,5,6,7)]))
S['jia']=mk('聯合重裝機','聯合軍',{**FED,'H':'#7a8a9a'},rows=BOX,extra=combo(nomouth,lambda d:(sym(d,7,1,'g'),sym(d,8,1,'g'))))
S['ying']=mk('無銘影機','無銘者',VOID,extra=combo(nomouth,lambda d:wings(d)))
S['ye']=mk('無銘夜影','無銘者',{**VOID,'H':'#1e1830','E':'#ffffff','s':'#c050ff'},extra=combo(nomouth,lambda d:wings(d),lambda d:horns(d,'s')))
S['xu']=mk('無銘巨像','無銘者',{**VOID,'H':'#2a2438'},rows=BOX,hi='mono',extra=combo(nomouth,lambda d:[d.__setitem__((y,x),'E') for y in (7,8,9) for x in (6,7,8,9)],mono_hi,lambda d:horns(d,'s')))
# ---------- 頭目與 NPC ----------
def big_horns(d):
    for y,x in [(0,1),(1,1),(1,2),(2,2),(2,3),(3,3)]: sym(d,y,x,'y')
def angry(d): d[(7,4)]='F'; d[(7,5)]='E'; d[(7,10)]='E'; d[(7,11)]='F'; d[(6,4)]='k'; d[(6,11)]='k'
S['general']=mk('赤環將機','霍岡將軍',dict(H='#b02a32',F='#2a1010',E='#ffb03a',B='#7a3040',b='#5a1418',c='#f3c43b',y='#f3c43b'),extra=combo(nomouth,big_horns,angry))
def halberd(d):
    for y in range(0,15): d[(y,0)]='g'
    d[(1,1)]='g'; d[(2,1)]='g'; d[(1,2)]='g'
S['greg']=mk('斷戟號','葛雷格將軍',dict(H='#7a2a2a',F='#2a1010',E='#ffd23a',B='#7a3040',b='#401010',c='#c8a040',g='#b8bec6'),extra=combo(nomouth,halberd,angry))
S['cmdr']=mk('聯合司令機','艾德司令',dict(H='#e6ebf2',F='#23355c',E='#6ff08a',B='#4a5a8a',b='#23355c',c='#f3c43b',a='#e6ebf2'),extra=combo(nomouth,lambda d:(sym(d,0,3,'a'),sym(d,1,4,'a'))))
def crown(d):
    for x in (5,7,8,10): d[(0,x)]='y'
    for x in range(5,11): d[(1,x)]='y'
    d[(1,7)]='r'; d[(1,8)]='r'
S['emperor']=mk('皇機','貝恩皇帝',dict(H='#f4f1e8',F='#fffaf0',E='#2a4a8a',b='#b02a32',c='#f3c43b',y='#f3c43b',r='#d63b3b'),extra=crown)
def skull(d):
    d[(10,6)]='k'; d[(10,7)]='F'; d[(10,8)]='F'; d[(10,9)]='k'
    for y,x in [(0,4),(1,4),(1,5)]: sym(d,y,x,'v')
S['wuking']=mk('始源虛甲','無銘王',dict(H='#15121e',F='#ecebf5',E='#05040a',w='#c070ff',B='#c8b8e8',b='#15121e',c='#6a3fd0',v='#6a3fd0'),extra=skull)
S['yuanwu']=mk('原初之無','原初之無',dict(H='#f6f4ee',F='#ffffff',E='#08070c',w='#f3c43b',B='#f0d8d8',b='#e8e4dc',c='#f3c43b',h='#f3c43b'),rows=MONO,hi='mono',extra=combo(nomouth,lambda d:halo(d)))
STONE=["........","....kkkk","...kgggg","...kgcgg","...kgggg","...kgggg","...kgggg","...kgEgg","...kgEgg","...kBggg","...kgggg","...kgcgg","...kgggg","..kkkkkk",".kGGGGGG","kkkkkkkk"]
S['stone']=mk('原字碑','原字碑',dict(g='#9aa0a8',G='#5f656c',c='#6ff0ff',E='#1a1a24'),rows=STONE,hi=None)
S['op']=mk('通信士','通信士',dict(H='#5a3a28',F='#f6d2b0',E='#2a1a14',b='#3a5a8a',c='#e8eef5',g='#4a4f58'),extra=lambda d:(sym(d,7,1,'g'),sym(d,8,1,'g'),d.__setitem__((6,1),'g'),d.__setitem__((5,1),'g'),d.__setitem__((11,3),'g')))
S['miner']=mk('礦工','礦工',dict(H='#f3c43b',F='#f6d2b0',E='#2a1a14',b='#d9822b',c='#6a4a30',l='#ffffff',A='#c89a20'),extra=lambda d:(d.__setitem__((3,7),'l'),d.__setitem__((3,8),'l'),[sym(d,6,x,'A') for x in range(1,8)]))

ALIAS={'soldier':'bing','fed':'lian','knight':'qi','shadow':'ying','hogan':'general','ed':'cmdr','bein':'emperor','wuming':'wuking'}

def grid(sp):
    g=[]
    for r in sp['rows']:
        assert len(r)==8,(sp['name'],r)
        g.append(list(r+r[::-1]))
    for (y,x),v in sp.get('over',{}).items(): g[y][x]=v
    return g
