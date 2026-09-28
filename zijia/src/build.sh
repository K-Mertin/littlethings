#!/bin/sh
cd "$(dirname "$0")"
{ cat shell_head.html; echo '<script>'; cat story.js; echo; cat icons.js; echo; cat engine.js; echo '</script>'; } > game.html
{ printf '<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n'; cat game.html; printf '\n</html>\n'; } > index.html
