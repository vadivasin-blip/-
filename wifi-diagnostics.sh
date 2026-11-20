#!/usr/bin/env bash
# Диагностика Wi-Fi: ищет, что тормозит сеть (macOS / Linux).
# Только читает и измеряет — ничего не меняет ни на компьютере, ни на роутере.
# Запуск:  bash wifi-diagnostics.sh
# Отчёт сохраняется в wifi-report-<дата>.txt рядом со скриптом.

REPORT="$(cd "$(dirname "$0")" && pwd)/wifi-report-$(date +%Y%m%d-%H%M%S).txt"
exec > >(tee "$REPORT") 2>&1

OS="$(uname -s)"
PROBLEMS=()
problem() { PROBLEMS+=("$1"); }
hdr() { printf '\n=== %s ===\n' "$1"; }
fcmp() { awk "BEGIN{exit !($1)}"; }   # сравнение дробных чисел: fcmp "1.5 > 1"

# --- ping: печатает "loss avg jitter" (jitter = stddev/mdev) ---
ping_stats() {
  local host=$1 count=${2:-20} out loss rtt
  out=$(ping -c "$count" -i 0.2 "$host" 2>/dev/null)
  loss=$(grep -oE '[0-9.]+% packet loss' <<<"$out" | grep -oE '^[0-9.]+')
  rtt=$(grep -E 'min/avg/max' <<<"$out" | awk -F'= ' '{print $2}' | awk -F'/' '{print $2, $4+0}')
  [ -z "$loss" ] && loss=100
  [ -z "$rtt" ] && rtt="0 0"
  echo "$loss $rtt"
}

echo "Диагностика Wi-Fi — $(date)"
echo "Система: $OS"

# ---------- 1. Шлюз (роутер) ----------
hdr "Роутер"
if [ "$OS" = Darwin ]; then
  GW=$(route -n get default 2>/dev/null | awk '/gateway/{print $2}')
  WIF=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $2; exit}')
else
  GW=$(ip route 2>/dev/null | awk '/^default/{print $3; exit}')
  WIF=$(iw dev 2>/dev/null | awk '/Interface/{print $2; exit}')
fi
echo "Адрес роутера: ${GW:-не найден}"
echo "Wi-Fi интерфейс: ${WIF:-не найден}"
if [ -n "$GW" ]; then
  HTTP=$(curl -s -m 3 -o /dev/null -D - "http://$GW/" 2>/dev/null)
  SERVER=$(grep -i '^server:' <<<"$HTTP" | cut -d' ' -f2- | tr -d '\r')
  TITLE=$(curl -s -m 3 "http://$GW/" 2>/dev/null | grep -oiE '<title>[^<]*' | head -1 | sed -E 's/<[tT][iI][tT][lL][eE]>//')
  echo "Веб-интерфейс: http://$GW/  ${SERVER:+(сервер: $SERVER)} ${TITLE:+— «$TITLE»}"
fi

# ---------- 2. Параметры радиоканала ----------
hdr "Wi-Fi соединение"
RSSI="" NOISE="" CH="" BAND="" WIDTH="" RATE="" PHY="" NEIGH_SAME=0 NEIGH_TOTAL=0
if [ "$OS" = Darwin ]; then
  SP=$(system_profiler SPAirPortDataType 2>/dev/null)
  CUR=$(awk '/Current Network Information:/{f=1;next} /Other Local Wi-Fi Networks:/{f=0} f' <<<"$SP" | head -20)
  OTHER=$(awk '/Other Local Wi-Fi Networks:/{f=1;next} f' <<<"$SP")
  read -r RSSI NOISE < <(grep -m1 'Signal / Noise' <<<"$CUR" | grep -oE '\-[0-9]+' | tr '\n' ' ')
  CHLINE=$(grep -m1 'Channel:' <<<"$CUR")
  CH=$(grep -oE '[0-9]+' <<<"${CHLINE#*:}" | head -1)
  WIDTH=$(grep -oE '[0-9]+MHz' <<<"$CHLINE" | head -1 | tr -d 'MHz')
  BAND=$(grep -oE '2GHz|5GHz|6GHz' <<<"$CHLINE" | head -1)
  RATE=$(grep -m1 'Transmit Rate' <<<"$CUR" | grep -oE '[0-9]+')
  PHY=$(grep -m1 'PHY Mode' <<<"$CUR" | awk -F': ' '{print $2}')
  NEIGH_CH=$(grep 'Channel:' <<<"$OTHER" | awk -F': ' '{print $2}' | grep -oE '^[0-9]+')
else
  LINK=$(iw dev "$WIF" link 2>/dev/null)
  RSSI=$(grep -oE 'signal: -[0-9]+' <<<"$LINK" | grep -oE '\-[0-9]+')
  FREQ=$(grep -oE 'freq: [0-9.]+' <<<"$LINK" | grep -oE '[0-9]+' | head -1)
  RATE=$(grep -oE 'tx bitrate: [0-9.]+' <<<"$LINK" | grep -oE '[0-9.]+$' | cut -d. -f1)
  WIDTH=$(grep 'tx bitrate' <<<"$LINK" | grep -oE '[0-9]+MHz' | tr -d 'MHz')
  PHY=$(grep 'tx bitrate' <<<"$LINK" | grep -oE 'HE-MCS|VHT-MCS|MCS|EHT-MCS' | head -1)
  NOISE=$(iw dev "$WIF" survey dump 2>/dev/null | awk '/in use/{f=1} f&&/noise/{print $2; exit}')
  if [ -n "$FREQ" ]; then
    if   [ "$FREQ" -lt 3000 ]; then BAND=2GHz; CH=$(( (FREQ-2407)/5 ))
    elif [ "$FREQ" -lt 5925 ]; then BAND=5GHz; CH=$(( (FREQ-5000)/5 ))
    else BAND=6GHz; CH=$(( (FREQ-5950)/5 )); fi
  fi
  command -v nmcli >/dev/null && NEIGH_CH=$(nmcli -t -f CHAN dev wifi list 2>/dev/null)
fi

# Соседние сети на том же (или перекрывающемся для 2.4 ГГц) канале
if [ -n "$CH" ] && [ -n "$NEIGH_CH" ]; then
  NEIGH_TOTAL=$(grep -c . <<<"$NEIGH_CH")
  if [ "$BAND" = 2GHz ]; then
    NEIGH_SAME=$(awk -v c="$CH" '$1<=14 && ($1-c<5 && c-$1<5){n++} END{print n+0}' <<<"$NEIGH_CH")
  else
    NEIGH_SAME=$(awk -v c="$CH" '$1==c{n++} END{print n+0}' <<<"$NEIGH_CH")
  fi
fi

echo "Сигнал (RSSI): ${RSSI:-?} dBm   Шум: ${NOISE:-?} dBm"
echo "Канал: ${CH:-?}  Диапазон: ${BAND:-?}  Ширина: ${WIDTH:-?} МГц  Стандарт: ${PHY:-?}"
echo "Скорость соединения (PHY): ${RATE:-?} Мбит/с"
echo "Видно чужих сетей: $NEIGH_TOTAL, из них на вашем/перекрывающемся канале: $NEIGH_SAME"

if [ -n "$RSSI" ]; then
  if   [ "$RSSI" -lt -75 ]; then problem "Очень слабый сигнал ($RSSI dBm). Подойдите ближе к роутеру, уберите преграды, поднимите роутер выше, либо поставьте mesh/репитер."
  elif [ "$RSSI" -lt -67 ]; then problem "Слабоватый сигнал ($RSSI dBm). Для стабильной работы нужно лучше −65 dBm: переставьте роутер ближе/выше."; fi
fi
if [ -n "$RSSI" ] && [ -n "$NOISE" ]; then
  SNR=$(( RSSI - NOISE ))
  echo "Отношение сигнал/шум (SNR): $SNR dB"
  [ "$SNR" -lt 25 ] && problem "Низкий SNR ($SNR dB) — помехи. Источники: микроволновка, радионяня, Bluetooth, USB 3.0 рядом с роутером, соседние сети."
fi
[ "$BAND" = 2GHz ] && problem "Вы подключены к 2.4 ГГц (канал $CH). Он медленный и забит соседями — подключитесь к 5 ГГц сети (или разделите SSID на 2.4/5 в роутере)."
[ "$BAND" = 2GHz ] && [ -n "$CH" ] && ! [[ "$CH" =~ ^(1|6|11)$ ]] && problem "Канал 2.4 ГГц = $CH. Используйте только 1, 6 или 11 — остальные перекрываются с соседями."
[ "$BAND" = 5GHz ] && [ -n "$WIDTH" ] && [ "$WIDTH" -le 20 ] && problem "Ширина канала 5 ГГц всего ${WIDTH} МГц — поставьте 80 МГц в настройках роутера."
[ "$NEIGH_SAME" -ge 4 ] && problem "На вашем канале ещё $NEIGH_SAME сетей — эфир перегружен. Смените канал в роутере на менее занятый (список каналов соседей — ниже в отчёте)."
[ -n "$RATE" ] && [ "$RATE" -lt 100 ] && problem "Низкая скорость соединения с роутером (${RATE} Мбит/с). Это потолок для любого интернета через Wi-Fi."

if [ -n "$NEIGH_CH" ]; then
  echo "Занятость каналов соседями (канал: кол-во сетей):"
  sort -n <<<"$NEIGH_CH" | uniq -c | awk '{printf "  %s: %s\n", $2, $1}'
fi

# ---------- 3. Задержки ----------
hdr "Задержки и потери"
if [ -n "$GW" ]; then
  read -r GL GA GJ < <(ping_stats "$GW" 30)
  echo "До роутера ($GW):   потери ${GL}%  среднее ${GA} мс  джиттер ${GJ} мс"
  fcmp "$GL > 0"  && problem "Потери пакетов до самого роутера (${GL}%) — проблема именно в Wi-Fi (сигнал/помехи/перегруз), а не у провайдера."
  fcmp "$GA > 10" && problem "Пинг до роутера ${GA} мс (норма <5 мс по Wi-Fi). Эфир перегружен или слабый сигнал."
  fcmp "$GJ > 5"  && problem "Нестабильный пинг до роутера (джиттер ${GJ} мс) — помехи или соседние сети."
fi
read -r IL IA IJ < <(ping_stats 1.1.1.1 30)
echo "До интернета (1.1.1.1): потери ${IL}%  среднее ${IA} мс  джиттер ${IJ} мс"
fcmp "$IL >= 100" && problem "Нет ответа от 1.1.1.1 — интернета нет или пинг блокируется (тогда пункты про скорость/bufferbloat недостоверны)."
if [ -n "$GW" ] && fcmp "$GL == 0" && fcmp "$GA < 10"; then
  fcmp "$IL > 1"  && problem "Потери в интернете (${IL}%) при чистом Wi-Fi — проблема у провайдера или в кабеле/модеме."
  fcmp "$IA > 60" && problem "Высокий пинг в интернет (${IA} мс) при быстром Wi-Fi — вопрос к провайдеру."
fi

# ---------- 4. DNS ----------
hdr "DNS"
if command -v dig >/dev/null; then
  DNS_T=$(dig +tries=1 +time=3 "rnd$RANDOM.example.com" 2>/dev/null | awk '/Query time/{print $4}')
  echo "Время ответа DNS: ${DNS_T:-?} мс"
  [ -n "$DNS_T" ] && [ "$DNS_T" -gt 100 ] && problem "Медленный DNS (${DNS_T} мс) — сайты долго открываются. Пропишите в роутере DNS 1.1.1.1 / 8.8.8.8 / 77.88.8.8."
else
  echo "dig не установлен — пропускаю."
fi

# ---------- 5. Скорость и bufferbloat ----------
hdr "Скорость и задержка под нагрузкой (bufferbloat), ~15 сек"
URL="https://speed.cloudflare.com/__down?bytes=500000000"
curl -s -o /dev/null --max-time 12 -w '%{speed_download}\n' "$URL" > /tmp/.wifi_speed.$$ 2>/dev/null &
CPID=$!
sleep 2
read -r LL LA LJ < <(ping_stats 1.1.1.1 40)
wait $CPID 2>/dev/null
SPEED=$(awk '{printf "%.0f", $1*8/1000000}' /tmp/.wifi_speed.$$ 2>/dev/null); rm -f /tmp/.wifi_speed.$$
echo "Скорость загрузки: ~${SPEED:-?} Мбит/с"
echo "Пинг под нагрузкой: ${LA} мс (в покое ${IA} мс), потери ${LL}%"
BLOAT=$(awk -v a="$LA" -v b="$IA" 'BEGIN{printf "%.0f", a-b}')
echo "Рост задержки под нагрузкой: +${BLOAT} мс"
if   [ "$BLOAT" -gt 100 ]; then problem "Сильный bufferbloat (+${BLOAT} мс под нагрузкой): когда кто-то качает, у всех тормозит. Включите в роутере SQM / Smart Queue / QoS (cake/fq_codel), ограничив скорость на 5–10% ниже тарифа."
elif [ "$BLOAT" -gt 30 ]; then problem "Умеренный bufferbloat (+${BLOAT} мс). Поможет SQM/QoS в роутере."; fi

# ---------- 6. Устройства в сети ----------
hdr "Устройства в локальной сети"
DEV=$(arp -an 2>/dev/null | grep -vc incomplete)
echo "Видно устройств (ARP-таблица): $DEV"
[ "$DEV" -gt 25 ] && problem "В сети много устройств ($DEV). Проверьте в роутере, кто качает (торренты, обновления, облачные бэкапы, камеры), и нет ли чужих."

# ---------- Итог ----------
hdr "ИТОГ: что тормозит Wi-Fi"
if [ ${#PROBLEMS[@]} -eq 0 ]; then
  echo "Явных проблем не найдено. Если тормоза бывают «иногда» — запустите скрипт в момент тормозов."
else
  i=1; for p in "${PROBLEMS[@]}"; do echo "$i. $p"; i=$((i+1)); done
fi
echo
echo "Отчёт сохранён: $REPORT"
