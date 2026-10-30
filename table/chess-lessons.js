// 西洋棋教室課程資料＋共用小工具（chess-learn.html 與 tools/chess-lessons-check.mjs 共用）
// 盤面寫法（pos）：
//   'start'                → 開局擺法
//   含 '/' 的字串          → FEN
//   'Ke1 Qd4 ke8 pd5'      → 棋子清單：大寫白、小寫黑，後面接格子；另外可用 side:'b'、castle:'KQkq'、ep:'d6'
// 步驟種類（t）：
//   text     講解（marks:['e4'] 標記格子、arrows:[['e2','e4']] 畫箭頭）
//   tap      點一個格子（ans:['e4']）
//   targets  點出某顆棋子所有能走的格子（sq:'d4'，由規則自動算出答案）
//   move     走一步（goal 見 chlGoalOk）
//   mate     n 步內將死（n:1/2，黑方由電腦防守）
//   line     跟著走一段棋譜（moves:['e2e4','e7e5',…]，白方由玩家走、黑方自動）
const CHL = [
  { ch: '第一章　棋子怎麼走', lessons: [
    { id: 'board', name: '認識棋盤', sub: '64 格、座標、開局擺法', steps: [
      { t: 'text', pos: 'Ke1 ke8', h: '西洋棋盤有 <b>8×8 = 64 個格子</b>，深色、淺色交錯。棋子放在<b>格子裡面</b>。<br>擺棋盤時記得：<b>右下角一定是淺色格</b>（口訣「右手白」）。' },
      { t: 'text', pos: 'Ke1 ke8', marks: ['a1', 'h1', 'a8', 'h8'], h: '每一格都有名字：直的 8 條叫做 <b>a～h 行</b>，橫的 8 條叫做 <b>1～8 列</b>。<br>例如左下角是 <b>a1</b>、右上角是 <b>h8</b>。棋盤邊上有小字可以對照。' },
      { t: 'tap', pos: 'Ke1 ke8', ans: ['e4'], q: '點一點 <b>e4</b> 這一格。', ok: '對了！先找 e 那一行，再往上數到第 4 列。' },
      { t: 'tap', pos: 'Ke1 ke8', ans: ['c6'], q: '再來一題：點一點 <b>c6</b>。', ok: '沒錯！' },
      { t: 'text', pos: 'start', h: '這是開局的擺法：白方在下面、黑方在上面，<b>白方先走</b>。<br>最前面一排是<b>士兵</b>；後排從邊邊往中間是<b>城堡、騎士、主教</b>，中間是<b>皇后</b>和<b>國王</b>。' },
      { t: 'tap', pos: 'start', ans: ['d1'], q: '口訣「<b>皇后站自己的顏色</b>」：白后站在白（淺色）格。點一點<b>白方的皇后</b>。', ok: '對！白后在 d1，國王在它旁邊的 e1。' },
      { t: 'tap', pos: 'start', ans: ['e8'], q: '把對方的國王「將死」就贏了。點一點<b>黑方的國王</b>。', ok: '沒錯，黑王在 e8。' },
    ] },
    { id: 'rook', name: '城堡', sub: '直線、橫線走到底', steps: [
      { t: 'text', pos: 'Kh1 Rd4 kh8', arrows: [['d4', 'd8'], ['d4', 'a4']], h: '<b>城堡</b>（也叫車）可以<b>直走或橫走，想走幾格都可以</b>，但不能跳過其他棋子。' },
      { t: 'targets', pos: 'Kh1 Rd4 kh8', sq: 'd4', q: '點出城堡可以走到的<b>所有</b>格子。', ok: '上下左右一路到底，一共 14 格！' },
      { t: 'text', pos: 'Kh1 Rd4 Pd6 nb4 kh8', marks: ['d6', 'b4'], h: '前面有<b>自己的棋子</b>就只能停在它前一格；遇到<b>對方的棋子</b>可以把它吃掉（站到它的格子上），但不能再往後走。' },
      { t: 'targets', pos: 'Kh1 Rd4 Pd6 nb4 kh8', sq: 'd4', q: '有棋子擋路了。點出城堡現在可以走的所有格子。', ok: '往上被自己的兵擋住，往左可以吃掉騎士。' },
      { t: 'move', pos: 'Kh1 Ra2 kh8 nf2', goal: 'capture', sq: 'f2', q: '用城堡<b>吃掉黑騎士</b>。', ok: '橫著衝過去，吃掉了！' },
    ] },
    { id: 'bishop', name: '主教', sub: '斜線走到底', steps: [
      { t: 'text', pos: 'Kh1 Bd4 ka8', arrows: [['d4', 'g7'], ['d4', 'a1']], h: '<b>主教</b>（也叫象）走<b>斜線，想走幾格都可以</b>。<br>所以主教<b>永遠待在同一種顏色的格子</b>上：開局兩個主教一個走淺色格、一個走深色格。' },
      { t: 'targets', pos: 'Kh1 Bd4 ka8', sq: 'd4', q: '點出主教可以走到的所有格子。', ok: '四條斜線一路到底，一共 13 格，而且全都是同一種顏色！' },
      { t: 'targets', pos: 'Kh1 Bc1 Pd2 kh8 pf4', sq: 'c1', q: '主教前面有自己的兵。點出它現在可以走的格子。', ok: '往右上被兵擋住，只剩往左上那條，一共 2 格。' },
      { t: 'move', pos: 'Kh1 Bb2 kh8 rf6', goal: 'capture', sq: 'f6', q: '用主教<b>吃掉黑城堡</b>。', ok: '漂亮！主教從遠遠的地方斜斜吃掉城堡。' },
    ] },
    { id: 'queen', name: '皇后', sub: '最強的棋子', steps: [
      { t: 'text', pos: 'Kh2 Qd4 ka8', h: '<b>皇后</b>＝城堡＋主教：<b>直、橫、斜</b>八個方向都能走到底。她是最強的棋子，要好好保護。' },
      { t: 'targets', pos: 'Kh2 Qd4 ka8', sq: 'd4', q: '點出皇后可以走到的所有格子。', ok: '一共 27 格！難怪皇后最厲害。' },
      { t: 'move', pos: 'Kh1 Qd1 kh8 rd7 pa4', goal: 'capture', sq: 'd7', q: '皇后可以吃兵也可以吃城堡。<b>吃價值比較高的那一個</b>。', ok: '吃城堡賺比較多！下一課會教每顆棋子值幾分。' },
    ] },
    { id: 'king', name: '國王', sub: '每次走一格、不能走進危險', steps: [
      { t: 'text', pos: 'Kd4 kh8', h: '<b>國王</b>每次只能走<b>一格</b>，八個方向都可以。國王不能被吃掉，所以它<b>不能走到會被對方吃的格子</b>。' },
      { t: 'targets', pos: 'Kd4 kh8', sq: 'd4', q: '點出國王可以走的所有格子。', ok: '周圍一圈，一共 8 格。' },
      { t: 'targets', pos: 'Kd4 kh8 rc8', sq: 'd4', q: '黑城堡守住 c 這一行。點出國王現在可以走的格子。', ok: 'c3、c4、c5 會被城堡吃，所以只剩 5 格。' },
      { t: 'text', pos: 'Ke4 ke6', marks: ['d5', 'e5', 'f5'], h: '兩個國王<b>不能靠在一起</b>：中間那一排兩邊都走不進去，因為走進去就會碰到對方國王。' },
    ] },
    { id: 'knight', name: '騎士', sub: '走 L 形、可以跳過棋子', steps: [
      { t: 'text', pos: 'Kh1 Nd4 kh8', arrows: [['d4', 'e6'], ['d4', 'b5']], h: '<b>騎士</b>（也叫馬）走 <b>L 形</b>：一個方向走兩格，再轉彎走一格。<br>騎士是唯一可以<b>跳過其他棋子</b>的棋子！' },
      { t: 'targets', pos: 'Kh1 Nd4 kh8', sq: 'd4', q: '點出騎士可以跳到的所有格子。', ok: '一共 8 格，像一個圓圈。' },
      { t: 'targets', pos: 'Kh1 Na1 kh8', sq: 'a1', q: '騎士在角落時呢？', ok: '只剩 2 格。所以有句話說「騎士在邊邊很可憐」，要往中間跳。' },
      { t: 'targets', pos: 'Kh1 Ng1 Pf2 Pg2 Ph2 Pe2 kh8', sq: 'g1', q: '騎士被自己的兵圍住了，點出它能跳到的格子。', ok: '騎士直接跳過兵！開局時騎士常常第一個出來就是這個原因。' },
    ] },
    { id: 'pawn', name: '士兵', sub: '往前走、斜著吃', steps: [
      { t: 'text', pos: 'Ke1 Pe2 ke8', arrows: [['e2', 'e4']], h: '<b>士兵</b>只能<b>往前走一格</b>，不能後退。<br>還在起點（第 2 列）的士兵，第一步可以選擇<b>一次走兩格</b>。' },
      { t: 'targets', pos: 'Ke1 Pe2 ke8', sq: 'e2', q: '點出這個士兵可以走的所有格子。', ok: '第一步可以走一格或兩格。' },
      { t: 'text', pos: 'Ke1 Pd4 ke8 pc5 pd5 pe5', marks: ['c5', 'e5'], h: '士兵很特別：<b>走路往前，吃東西卻是斜前方一格</b>。正前方有棋子擋住就走不動了。' },
      { t: 'targets', pos: 'Ke1 Pd4 ke8 pc5 pd5 pe5', sq: 'd4', q: '前面被擋住了。點出士兵現在可以走的格子。', ok: '不能往前，但可以斜斜吃掉 c5 或 e5。' },
      { t: 'move', pos: 'Ke1 Pe4 ke8 nd5 pe5', goal: 'capture', sq: 'd5', q: '用士兵<b>吃掉黑騎士</b>。', ok: '斜吃！士兵換騎士，大賺。' },
    ] },
    { id: 'value', name: '吃子和棋子價值', sub: '誰比較值錢', steps: [
      { t: 'text', pos: 'Ke1 Qd1 Ra1 Bc1 Nb1 Pa2 ke8', h: '下棋的時候，先記住每顆棋子大約值幾分：<ul><li>士兵 <b>1</b></li><li>騎士、主教 <b>3</b></li><li>城堡 <b>5</b></li><li>皇后 <b>9</b></li></ul>國王是無價的，被將死就輸了。' },
      { t: 'move', pos: 'Kh1 Qd4 ka8 pb6 rd7 ng4', goal: 'capture', sq: 'd7', q: '皇后可以吃三顆子。選<b>分數最高、又不會被吃回來</b>的那一顆。', ok: '城堡 5 分最值錢，而且沒有人保護它！' },
      { t: 'move', pos: 'Kh1 Ra1 kh8 pa7 qa5 rb8', goal: 'capture', sq: 'a5', q: '城堡前面有皇后，<b>吃掉她</b>！', ok: '用 5 分的城堡吃 9 分的皇后，就算被吃回來也賺。' },
    ] },
  ] },
  { ch: '第二章　特殊規則', lessons: [
    { id: 'castle', name: '入堡', sub: '國王躲進城堡', steps: [
      { t: 'text', pos: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1']], h: '<b>入堡</b>是國王和城堡一起走的特別走法：<b>國王往城堡那邊走兩格，城堡跳到國王的另一邊</b>。<br>入堡後國王躲到角落比較安全，城堡也跑到中間來幫忙。' },
      { t: 'move', pos: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', goal: 'castle', sq: 'g1', q: '往右邊（王翼）<b>入堡</b>：把國王往右拖兩格到 <b>g1</b>。', ok: '城堡自動跳到 f1，國王安全了！' },
      { t: 'text', pos: '4k3/8/8/8/2b5/8/8/R3K2R w KQ - 0 1', marks: ['f1'], h: '入堡有條件：<ul><li>國王和那個城堡<b>都還沒動過</b></li><li>中間<b>沒有棋子</b></li><li>國王<b>正在被將軍</b>時不行</li><li>國王<b>經過或到達</b>的格子不能被對方攻擊</li></ul>這裡黑主教守住 f1，所以右邊不能入堡。' },
      { t: 'targets', pos: '4k3/8/8/8/2b5/8/8/R3K2R w KQ - 0 1', sq: 'e1', q: '點出國王現在可以走的所有格子（包括入堡）。', ok: '右邊不能入堡，但左邊（后翼）可以入堡到 c1！e2、f1 被主教守住。' },
    ] },
    { id: 'ep', name: '吃過路兵', sub: '剛走兩格的兵也能吃', steps: [
      { t: 'text', pos: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', arrows: [['d7', 'd5']], marks: ['d6'], h: '黑兵剛剛從 d7 一口氣走兩格到 d5，停在白兵旁邊。<br>這時白兵可以<b>當它只走了一格</b>，斜斜吃到 <b>d6</b>，把 d5 的兵吃掉。這叫<b>吃過路兵</b>。' },
      { t: 'targets', pos: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', sq: 'e5', q: '點出 e5 白兵可以走的所有格子。', ok: '往前一格 e6，或吃過路兵到 d6。' },
      { t: 'move', pos: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', goal: 'ep', q: '<b>吃過路兵</b>！', ok: 'd5 的黑兵不見了！注意：吃過路兵只能在對方剛走完兩格的<b>下一步</b>，過了就不行。' },
    ] },
    { id: 'promo', name: '升變', sub: '士兵走到底變身', steps: [
      { t: 'text', pos: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', arrows: [['b7', 'b8']], h: '士兵一路走到對方的底線（白兵到第 8 列），就可以<b>升變</b>：變成皇后、城堡、主教或騎士（不能變國王）。<br>通常都變成最強的<b>皇后</b>。' },
      { t: 'move', pos: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', goal: 'promo', q: '把士兵走到底線<b>升變</b>！', ok: '變成皇后了！（這裡會自動選皇后。）' },
      { t: 'mate', pos: 'k7/2P5/1K6/8/8/8/8/8 w - - 0 1', n: 1, q: '用升變<b>一步將死</b>黑王。', ok: '新皇后一出現就將死！' },
    ] },
  ] },
  { ch: '第三章　將軍與勝負', lessons: [
    { id: 'check', name: '將軍', sub: '下一步就能吃王', steps: [
      { t: 'text', pos: '4k3/8/8/8/8/8/8/4K2R w - - 0 1', arrows: [['h1', 'h8']], h: '走一步之後，下一步就可以吃掉對方國王，這叫<b>將軍</b>。被將軍的一方<b>一定要馬上解決</b>，不能不管。' },
      { t: 'move', pos: '4k3/8/8/8/8/8/8/4K2R w - - 0 1', goal: 'check', q: '用城堡<b>將軍</b>！', ok: '將軍！城堡沿著第 8 列對準黑王。' },
      { t: 'move', pos: '4k3/8/8/1N6/8/8/8/4K3 w - - 0 1', goal: 'check', q: '用騎士<b>將軍</b>。', ok: '騎士的將軍不能用擋的，很厲害。' },
    ] },
    { id: 'escape', name: '解將三招', sub: '吃掉、擋住、逃走', steps: [
      { t: 'text', pos: '4k3/8/8/8/8/8/3q4/3RK3 w - - 0 1', h: '被將軍時有三種解法：<ul><li><b>吃</b>：把將軍的棋子吃掉</li><li><b>擋</b>：拿一顆棋子擋在中間</li><li><b>逃</b>：國王走到安全的格子</li></ul>' },
      { t: 'move', pos: '4k3/8/8/8/8/8/3q4/3RK3 w - - 0 1', goal: 'capture', sq: 'd2', q: '黑后在將軍！用<b>吃</b>的解將。', ok: '直接把皇后吃掉，最划算！' },
      { t: 'move', pos: '4k3/4r3/8/8/8/8/3B4/4K3 w - - 0 1', goal: 'block', q: '黑城堡從上面將軍。這次用<b>擋</b>的。', ok: '主教擋在中間，國王安全了。' },
      { t: 'move', pos: '4k3/8/8/8/8/5n2/8/4K3 w - - 0 1', goal: 'king', any: true, q: '騎士將軍不能擋，也吃不到。只好讓國王<b>逃</b>走——小心，有一格騎士也碰得到！', ok: '國王走到騎士碰不到的格子就安全了（d2 也在騎士的攻擊範圍裡）。' },
    ] },
    { id: 'mate', name: '將死', sub: '怎麼贏一盤棋', steps: [
      { t: 'text', pos: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', h: '被將軍而且<b>三招都沒辦法解</b>，就是<b>將死</b>，那一方輸了。<br>這裡黑王被自己的兵擋住，只要城堡衝到底線……' },
      { t: 'mate', pos: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', n: 1, q: '一步<b>將死</b>黑王。', ok: '將死！這叫「底線殺」，第四章還會再練。' },
      { t: 'mate', pos: 'k7/8/1K6/8/8/8/8/6Q1 w - - 0 1', n: 1, q: '用皇后一步將死。', ok: '國王和皇后合作，黑王無路可逃。' },
    ] },
    { id: 'draw', name: '逼和與和棋', sub: '沒有輸贏的時候', steps: [
      { t: 'text', pos: 'k7/8/1Q6/8/8/8/8/K7 b - - 0 1', h: '輪到黑方，黑王<b>沒有被將軍</b>，可是<b>一步都不能走</b>，這叫<b>逼和</b>，算平手！<br>快贏的時候要特別小心，不要不小心逼和。' },
      { t: 'mate', pos: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', n: 1, q: '一步<b>將死</b>，小心不要變成逼和！', ok: '將死！如果走 Qc7 就會變成逼和，白白浪費一盤贏棋。' },
      { t: 'text', pos: 'Ke1 Bc1 ke8', h: '其他和棋的情況：<ul><li><b>子力不足</b>：例如只剩國王對國王、或國王＋一個主教，誰都將不死</li><li>同一個局面<b>重複出現三次</b></li><li>連續 <b>50 回合</b>沒有吃子、也沒有走士兵</li><li>雙方<b>同意和棋</b></li></ul>' },
    ] },
  ] },
  { ch: '第四章　基本殺法', lessons: [
    { id: 'qk', name: '后王殺單王', sub: '把國王趕到邊邊', steps: [
      { t: 'text', pos: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', h: '只剩一個皇后也能贏：<b>用皇后一步步把黑王趕到邊邊</b>，再讓自己的<b>國王走過去幫忙</b>，最後皇后將死。<br>小心：皇后不要靠太近，不然會被吃掉，也要小心逼和。' },
      { t: 'mate', pos: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', n: 1, q: '一步將死。', ok: '國王守住 g7、h7，皇后封住第 8 列。' },
      { t: 'mate', pos: '8/8/8/8/8/1K6/3Q4/k7 w - - 0 1', n: 1, q: '再一題，一步將死。', ok: '漂亮！' },
      { t: 'mate', pos: '5k2/8/3K4/8/8/6Q1/8/8 w - - 0 1', n: 2, q: '兩步將死（黑王會想辦法逃）。', ok: '先把國王關起來，再將死！' },
    ] },
    { id: 'rr', name: '雙車殺', sub: '像爬樓梯一樣', steps: [
      { t: 'text', pos: '8/3R4/1K6/8/R7/8/8/4k3 w - - 0 1', h: '兩個城堡輪流前進，<b>一個封住一排，另一個將軍</b>，像爬樓梯一樣把國王逼到底線，叫做<b>梯子殺</b>。' },
      { t: 'mate', pos: '6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1', n: 1, q: '一步將死。', ok: 'a7 的城堡封住第 7 列，另一個城堡在第 8 列將軍。' },
      { t: 'mate', pos: '8/3R4/1K6/8/R7/8/8/4k3 w - - 0 1', n: 2, q: '兩步將死。', ok: '一個封、一個將，完成梯子殺！' },
    ] },
    { id: 'back', name: '底線殺', sub: '國王被自己的兵關住', steps: [
      { t: 'text', pos: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', h: '入堡後國王前面有三個兵保護，可是如果<b>底線沒有人防守</b>，對方城堡或皇后衝到底線就將死了。' },
      { t: 'mate', pos: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', n: 1, q: '一步將死。', ok: '底線殺！' },
      { t: 'mate', pos: 'r5k1/5ppp/8/8/8/8/4RPPP/4R1K1 w - - 0 1', n: 2, q: '黑城堡守著底線。想辦法兩步將死。', ok: '先犧牲一個城堡把守衛引開，第二個城堡將死！' },
    ] },
    { id: 'smother', name: '悶殺', sub: '騎士的絕招', steps: [
      { t: 'text', pos: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', h: '國王被<b>自己的棋子團團圍住</b>，這時只要騎士跳過來將軍，誰都擋不了，叫做<b>悶殺</b>。' },
      { t: 'mate', pos: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', n: 1, q: '用騎士一步將死。', ok: '悶殺！黑王被自己的城堡和兵悶死了。' },
      { t: 'mate', pos: 'kr6/pp6/8/1N6/8/8/8/6K1 w - - 0 1', n: 1, q: '換一邊，再一題。', ok: '一樣的悶殺！' },
    ] },
  ] },
  { ch: '第五章　戰術', lessons: [
    { id: 'fork', name: '雙重攻擊', sub: '一次攻擊兩個', steps: [
      { t: 'text', pos: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', arrows: [['b5', 'c7']], h: '一顆棋子<b>同時攻擊兩個目標</b>，對方只能救一個，叫<b>雙重攻擊</b>。騎士最會這招，又叫「騎士叉」。' },
      { t: 'move', pos: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', goal: 'exact', ans: ['b5c7'], q: '用騎士同時攻擊<b>國王和城堡</b>。', ok: '將軍又攻擊城堡！黑王只能逃，城堡就是你的了。' },
      { t: 'move', pos: '4k3/8/8/2n1b3/8/3P4/8/4K3 w - - 0 1', goal: 'exact', ans: ['d3d4'], q: '士兵也能雙重攻擊！找一步同時攻擊<b>騎士和主教</b>。', ok: 'd4 的士兵兩邊各咬一口！' },
    ] },
    { id: 'pin', name: '牽制', sub: '後面有更重要的', steps: [
      { t: 'text', pos: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1', arrows: [['b5', 'e8']], h: '主教對著黑騎士，騎士後面是國王。騎士<b>一動，國王就被將軍</b>，所以它不能動，這叫<b>牽制</b>。' },
      { t: 'move', pos: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', goal: 'exact', ans: ['f1b5'], q: '用主教<b>牽制</b>黑騎士。', ok: '騎士被釘住了！' },
      { t: 'move', pos: '4k3/4n3/8/8/8/8/8/R5K1 w - - 0 1', goal: 'exact', ans: ['a1e1'], q: '城堡也能牽制：讓黑騎士<b>被釘在國王前面</b>。', ok: '城堡、騎士、國王排成一直線，騎士動不了了！' },
    ] },
    { id: 'skewer', name: '串擊', sub: '先打大的，再吃後面的', steps: [
      { t: 'text', pos: 'q3k3/8/8/8/8/8/8/4K2R w - - 0 1', h: '<b>串擊</b>跟牽制相反：攻擊<b>前面比較重要</b>的棋子，它逃走之後，就能吃到<b>後面</b>的棋子。' },
      { t: 'move', pos: 'q3k3/8/8/8/8/8/8/4K2R w - - 0 1', goal: 'exact', ans: ['h1h8'], q: '找一步<b>串擊</b>：將軍，讓國王讓開後吃掉皇后。', ok: '將軍！國王一走開，城堡就吃掉後面的皇后。' },
    ] },
    { id: 'disc', name: '閃擊', sub: '讓開路，後面的出手', steps: [
      { t: 'text', pos: '4k3/8/8/1q6/4N3/8/8/4R1K1 w - - 0 1', arrows: [['e1', 'e8']], h: '城堡被自己的騎士擋住。騎士<b>一跳開</b>，城堡就將軍了，這叫<b>閃擊</b>。如果騎士跳開時順便攻擊別的東西，對方就慘了！' },
      { t: 'move', pos: '4k3/8/8/1q6/4N3/8/8/4R1K1 w - - 0 1', goal: 'exact', ans: ['e4c3', 'e4d6'], q: '騎士跳開讓城堡將軍，同時<b>攻擊黑皇后</b>。', ok: '黑方要先處理將軍，皇后就救不回來了！' },
    ] },
  ] },
  { ch: '第六章　開局入門', lessons: [
    { id: 'open', name: '開局四原則', sub: '中心、出子、入堡、皇后別急', steps: [
      { t: 'text', pos: 'start', marks: ['d4', 'e4', 'd5', 'e5'], h: '開局要記住四件事：<ul><li><b>控制中心</b>：中間這四格最重要</li><li><b>快點出子</b>：騎士、主教先出來</li><li><b>早點入堡</b>：讓國王安全</li><li><b>皇后別太早出來</b>：她會被小兵小馬追著跑，浪費時間</li></ul>' },
      { t: 'move', pos: 'start', goal: 'exact', ans: ['e2e4', 'd2d4'], q: '第一步，走一步<b>佔住中心</b>的士兵。', ok: '好棋！中間的士兵往前，也讓主教和皇后有路出來。' },
    ] },
    { id: 'italian', name: '義大利開局', sub: '跟著走一次', steps: [
      { t: 'text', pos: 'start', h: '<b>義大利開局</b>是很適合初學者的開局：佔中心、出騎士、主教瞄準黑方最弱的 f7、然後入堡。' },
      { t: 'line', pos: 'start', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1', 'g8f6'], notes: ['e4：佔中心。', 'Nf3：騎士出來，順便攻擊 e5 的兵。', 'Bc4：主教瞄準 f7。', '入堡：把國王拖到 g1。'], q: '跟著走走看，黑方會自動回應。', ok: '這就是義大利開局！四步之內：佔中心、出兩個子、入堡，全做到了。' },
      { t: 'text', pos: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 6 5', h: '恭喜你學完西洋棋教室！<br>現在可以：<ul><li>到「<b>西洋棋</b>」跟電腦下一盤（先從入門開始）</li><li>到「<b>西洋棋殺棋</b>」練習一步、兩步殺</li></ul>' },
    ] },
  ] },
];

// ---------------- 共用小工具 ----------------
// 格子 'e4' ↔ 0x88 編號
function chlSq(a) { return (a.charCodeAt(1) - 49) * 16 + (a.charCodeAt(0) - 97); }
function chlName(sq) { return String.fromCharCode(97 + (sq & 7)) + ((sq >> 4) + 1); }
// 把步驟的 pos 轉成 chess-logic.js 的 init() 物件
function chlParse(st, fenFn) {
  const s = st.pos;
  if (s === 'start') return fenFn('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  if (s.includes('/')) return fenFn(s);
  const board = new Array(64).fill(0);
  for (const t of s.trim().split(/\s+/)) {
    const ty = 'pnbrqk'.indexOf(t[0].toLowerCase()) + 1, black = t[0] === t[0].toLowerCase();
    const sq = chlSq(t.slice(1)); board[(sq >> 4) * 8 + (sq & 7)] = ty + (black ? 8 : 0);
  }
  let castle = 0; const c = st.castle || '';
  if (c.includes('K')) castle |= 1; if (c.includes('Q')) castle |= 2; if (c.includes('k')) castle |= 4; if (c.includes('q')) castle |= 8;
  return { board, side: st.side === 'b' ? 1 : 0, castle, ep: st.ep ? chlSq(st.ep) : -1, half: 0 };
}
const chlFrom = m => m & 127, chlTo = m => (m >> 7) & 127, chlPr = m => m >> 14;
const chlUci = m => chlName(chlFrom(m)) + chlName(chlTo(m)) + (chlPr(m) ? ' nbrq'[chlPr(m) - 1] || '' : '');
// move 題的目標判斷。X 已經 init 成走之前的局面（輪到走的那一方）。
function chlGoalOk(X, st, m) {
  const f = chlFrom(m), to = chlTo(m), p = X.board[f], t = p & 7, cap = X.board[to];
  const isEp = t === X.P && (f & 7) !== (to & 7) && !cap;
  const side = X.side;
  switch (st.goal) {
    case 'to': return to === chlSq(st.sq) && (!st.from || f === chlSq(st.from));
    case 'capture': return to === chlSq(st.sq) && (!!cap || isEp);
    case 'castle': return t === X.K && Math.abs((to & 7) - (f & 7)) === 2 && (!st.sq || to === chlSq(st.sq));
    case 'ep': return isEp;
    case 'promo': return t === X.P && ((to >> 4) === 7 || (to >> 4) === 0);
    case 'king': return t === X.K;
    case 'block': {
      if (t === X.K || cap) return false;
      X.make(m); const ok = !X.inCheck(side); X.unmake(); return ok;
    }
    case 'check': { X.make(m); const c = X.inCheck(side ^ 1); X.unmake(); return c; }
    case 'exact': return st.ans.some(u => u.slice(0, 4) === chlUci(m).slice(0, 4));
  }
  return true;
}
if (typeof module !== 'undefined') module.exports = { CHL, chlSq, chlName, chlParse, chlGoalOk, chlUci };
