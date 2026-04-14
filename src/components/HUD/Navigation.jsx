import { useSoundEngine } from '../../hooks/useSoundEngine';
import { ScrambleText } from './ScrambleText';
import './Navigation.css';

const NAV_ITEMS = [
  { id: 'home', label: 'HOME', icon: '◆' },
  { id: 'about', label: 'PILOT DATA', icon: '◆' },
  { id: 'sorties', label: 'SORTIES', icon: '◆' },
  { id: 'comms', label: 'COMMS', icon: '◆' },
];

export function Navigation({ activeSection, onNavigate }) {
  const sound = useSoundEngine();

  const handleClick = (id) => {
    sound.pip();
    onNavigate(id);
  };

  return (
    <nav className="hud-nav" id="main-navigation">
      <div className="hud-nav__header">
        <span className="hud-nav__bracket">[</span>
        <span className="hud-nav__title"><ScrambleText text="TACTICAL_NAV" /></span>
        <span className="hud-nav__bracket">]</span>
      </div>
      <ul className="hud-nav__list">
        {NAV_ITEMS.map((item, index) => (
          <li key={item.id} className="hud-nav__item">
            <button
              className={`hud-nav__link ${activeSection === item.id ? 'hud-nav__link--active' : ''}`}
              onClick={() => handleClick(item.id)}
              data-clickable
            >
              <span className="hud-nav__text"><ScrambleText text={item.label} delay={index * 100} duration={400} /></span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
