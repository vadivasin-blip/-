import { Snow } from '../components/winter/Snow';
import { Vinyl, Tonearm } from '../components/Vinyl';
import { Logo } from '../components/TopBar';
import { I } from '../components/icons';

const GITHUB = 'https://github.com/vadivasin-blip/-';
const DOWNLOAD = 'https://github.com/vadivasin-blip/-/releases/latest/download/Grain-Setup.exe';
const RELEASES = 'https://github.com/vadivasin-blip/-/releases';
const asset = (f: string) => `${import.meta.env.BASE_URL}landing/${f}`;

const SIDE_A = [
  { n: 'A1', title: 'Проигрыватель вместо списка', img: 'deck.webp', tall: true,
    text: 'Слева всегда стоит вертушка. Обложка трека — яблоко пластинки, пластинка крутится только пока играет музыка, а тонарм по ходу песни движется к центру. Перематывать — по кольцу вокруг пластинки, громкость — поворотной ручкой.' },
  { n: 'A2', title: 'Полка с конвертами', img: 'shelf.webp',
    text: 'Плейлисты и альбомы стоят на полке конвертами: наведите — и пластинка выезжает наружу. Исполнители — пластинки с фотографией прямо на виниле.' },
  { n: 'A3', title: 'Треклист как на обороте', img: 'album.webp',
    text: 'Списки треков оформлены как оборот конверта: точки до длительности, у альбомов — стороны A и B и нумерация A1, B2. Фильтр, сортировка, управление с клавиатуры.' },
  { n: 'A4', title: 'Текст загорается по словам', img: 'lyrics.webp',
    text: 'Синхронный текст песни заливается слово за словом, в такт голосу. Если текст спешит — кнопка «Подогнать» выставит сдвиг сама и запомнит его для трека.' },
];

const SIDE_B = [
  { n: 'B1', title: 'Новогодняя тема', img: 'winter.webp',
    text: 'Снег, который замирает на паузе, гирлянда с бегущими огнями, сугроб растёт, пока вы слушаете. Отсчёт до Нового года и салют в полночь.' },
  { n: 'B2', title: 'Трей и мини-плеер', img: 'tray.webp',
    text: 'Клик по значку в трее — мини-панель с пластинкой и кнопками. Правый клик — всё управление, таймер сна и тема. Мини-плеер висит поверх окон.' },
  { n: 'B3', title: 'Поиск и команды — Ctrl K', img: 'palette.webp',
    text: 'Одно поле на всё: треки, исполнители, альбомы, ваши плейлисты и команды. Enter — играть, Shift+Enter — в очередь.' },
  { n: 'B4', title: 'Итоги', img: 'stats.webp',
    text: 'Топ исполнителей и треков за месяц, полгода и всё время, жанры и десятилетия, история прослушиваний.' },
];

const EXTRA = [
  { icon: <I.check size={18} />, title: 'Обновление в один клик', text: 'Grain сам находит новую версию и ставит её по кнопке — без похода на GitHub.' },
  { icon: <I.device size={18} />, title: 'Любое устройство Spotify', text: 'Играет прямо в Grain или управляет Spotify на телефоне, колонке, другом компьютере.' },
  { icon: <I.moon size={18} />, title: 'Таймер сна', text: 'Остановит музыку через 15–90 минут или в конце трека.' },
  { icon: <I.keyboard size={18} />, title: 'Клавиатура везде', text: 'Пробел, стрелки, медиаклавиши и глобальные сочетания Ctrl+Alt.' },
];

export function Landing({ onOpenPlayer }: { onOpenPlayer: () => void }) {
  return (
    <div className="landing">
      <Snow enabled level={1} steady />
      <nav className="ld-nav">
        <a className="ld-brand" href="#top"><Logo size={22} /><span>Grain</span></a>
        <div className="ld-links">
          <a href="#features">Возможности</a>
          <a href="#start">Как начать</a>
          <a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <button className="btn primary" onClick={onOpenPlayer}>Открыть плеер</button>
      </nav>

      <header className="ld-hero" id="top">
        <div className="ld-hero-text">
          <div className="kicker">плеер для Spotify · Windows и браузер</div>
          <h1>Музыка, которую видно</h1>
          <p>Grain превращает вашу библиотеку Spotify в проигрыватель винила: пластинка крутится, тонарм идёт по дорожке, текст песни загорается по словам.</p>
          <div className="ld-cta">
            <a className="btn primary big" href={DOWNLOAD}><I.forward size={16} style={{ rotate: '90deg' }} /> Скачать для Windows</a>
            <button className="btn big" onClick={onOpenPlayer}>Открыть в браузере</button>
            <a className="btn ghost big" href={GITHUB} target="_blank" rel="noreferrer"><GitHubMark /> GitHub</a>
          </div>
          <div className="ld-note">Бесплатно · нужен Spotify Premium · Windows 10/11 или Chrome, Edge, Firefox</div>
        </div>
        <div className="ld-hero-art" aria-hidden>
          <div className="ld-platter" />
          <Vinyl src={asset('cover.webp')} spinning className="ld-vinyl" />
          <div className="ld-arm"><Tonearm angle={14} /></div>
        </div>
      </header>

      <section className="ld-video">
        <video src={asset('promo.mp4')} poster={asset('promo-poster.jpg')} autoPlay muted loop playsInline controls />
      </section>

      <section className="ld-side" id="features">
        <SideHead letter="A" title="Сторона A — слушать" />
        {SIDE_A.map((f, i) => (
          <article key={f.n} className={`ld-row ${i % 2 ? 'flip' : ''}`}>
            <div className="ld-shot"><img src={asset(f.img)} alt={f.title} loading="lazy" className={f.tall ? 'tall' : ''} /></div>
            <div className="ld-copy">
              <span className="ld-num mono">{f.n}</span>
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="ld-side">
        <SideHead letter="B" title="Сторона B — удобство" />
        <div className="ld-grid">
          {SIDE_B.map((f) => (
            <article key={f.n} className="ld-card">
              <div className="ld-card-shot"><img src={asset(f.img)} alt={f.title} loading="lazy" /></div>
              <span className="ld-num mono">{f.n}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
        <div className="ld-extra">
          {EXTRA.map((e) => (
            <div key={e.title} className="ld-extra-item">
              <span className="ld-extra-ic">{e.icon}</span>
              <div><b>{e.title}</b><p>{e.text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="ld-start" id="start">
        <h2>Как начать</h2>
        <ol>
          <li><b>Скачайте Grain</b> для Windows или откройте его прямо в браузере.</li>
          <li><b>Создайте ключ Spotify</b> на developer.spotify.com/dashboard → Create app. Нужен аккаунт Premium.</li>
          <li><b>Впишите адрес возврата</b>, который Grain покажет на экране входа, и отметьте Web API и Web Playback SDK.</li>
          <li><b>Вставьте Client ID</b> в Grain и нажмите «Войти через Spotify». Всё — можно слушать.</li>
        </ol>
        <div className="ld-cta">
          <a className="btn primary big" href={DOWNLOAD}>Скачать для Windows</a>
          <button className="btn big" onClick={onOpenPlayer}>Открыть в браузере</button>
          <button className="btn ghost big" onClick={() => { location.search = '?demo'; }}>Посмотреть демо</button>
        </div>
      </section>

      <footer className="ld-foot">
        <div className="ld-brand"><Logo size={18} /><span>Grain</span></div>
        <div className="ld-foot-links">
          <a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
          <a href={RELEASES} target="_blank" rel="noreferrer">Все версии и что нового</a>
        </div>
        <p>Независимый проект, не связан со Spotify AB. Музыка и данные приходят из вашего аккаунта Spotify через официальный API.</p>
      </footer>
    </div>
  );
}

function SideHead({ letter, title }: { letter: string; title: string }) {
  return <div className="ld-side-head"><span className="side-letter">{letter}</span><span>{title}</span><i /></div>;
}

function GitHubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
