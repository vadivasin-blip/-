#!/usr/bin/env node
// Описание релиза из CHANGELOG.md: раздел нужной версии + постоянная подсказка по установке.
// node scripts/release-notes.cjs 1.3.1   → печатает текст;   --list → все версии из CHANGELOG
const fs = require('fs');
const path = require('path');
const md = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const sections = {};
let cur = null;
for (const line of md.split('\n')) {
  const m = line.match(/^## (\d+\.\d+\.\d+)\s*$/);
  if (m) { cur = m[1]; sections[cur] = []; continue; }
  if (cur) sections[cur].push(line);
}
if (process.argv[2] === '--list') { console.log(Object.keys(sections).join('\n')); process.exit(0); }
const v = process.argv[2];
if (!sections[v]) { console.error(`В CHANGELOG.md нет раздела ## ${v}`); process.exit(1); }
const body = sections[v].join('\n').trim();
// --plain: только список изменений (для окна обновления внутри Grain)
if (process.argv.includes('--plain')) { console.log(body); process.exit(0); }
console.log(`## Что нового\n\n${body}\n\n---\n\n**Grain-Setup.exe** — установщик, **Grain-portable.exe** — запуск без установки.\nВеб-версия: https://vadivasin-blip.github.io/-/\nПервый запуск: нужен Spotify Premium и свой Client ID — инструкция на экране входа.`);
