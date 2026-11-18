import { createRoot } from 'react-dom/client';
import '@fontsource-variable/onest';
import '@fontsource-variable/unbounded';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles.css';
import { App } from './App';
import { TrayFlyout } from './components/TrayFlyout';

// ?flyout — мини-панель у значка в трее (отдельное маленькое окно)
const flyout = new URLSearchParams(location.search).has('flyout');
createRoot(document.getElementById('root')!).render(flyout ? <TrayFlyout /> : <App />);
