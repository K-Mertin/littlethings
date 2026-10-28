// 銘甲戰記 — 啟動（所有模組載入後才執行）
fitMap();
renderLegend();
if(typeof startMapLoop==='function') startMapLoop();
titleScreen();
