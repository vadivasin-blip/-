// Необязательная VMP-подпись (castLabs EVS) — нужна, если Spotify откажется проигрывать
// во встроенном плеере на Windows. Включается переменной окружения EVS_SIGN=1.
// Подготовка: pip install castlabs-evs && python -m castlabs_evs.account signup
const { execSync } = require('node:child_process');

exports.default = async function vmpSign(context) {
  if (process.env.EVS_SIGN !== '1') return;
  const dir = context.appOutDir;
  console.log(`  • VMP-подпись ${dir}`);
  execSync(`python -m castlabs_evs.vmp sign-pkg "${dir}"`, { stdio: 'inherit' });
};
