#!/bin/sh
cd "$(dirname "$0")"
{ cat shell_head.html; echo '<script>'; cat story.js; echo; cat icons.js; echo; cat gfx.js; echo; cat quotes.js; echo; cat bgm.js; echo; cat world.js; echo; cat engine.js; echo; cat side.js; echo; cat boot.js; echo '</script>'; } > game.html
{ printf '<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><script src="/offline/offline.js" data-game="zijia" defer></script>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n'; cat game.html; printf '\n</html>\n'; } > index.html
