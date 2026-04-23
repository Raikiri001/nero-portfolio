import './Navigation.css';

const NAV_ITEMS = [
  { id: 'home', label: 'HOME', icon: '◆' },
  { id: 'about', label: 'PILOT DATA', icon: '◆' },
  { id: 'sorties', label: 'SORTIES', icon: '◆' },
  { id: 'comms', label: 'COMMS', icon: '◆' },
];

export function Navigation({ activeSection, onNavigate }) {
  const handleClick = (id) => {
    onNavigate(id);
  };

  return (
    <nav className="hud-nav" id="main-navigation">
      <div className="hud-nav__header">
        <span className="hud-nav__bracket">[</span>
        <span className="hud-nav__title">NERO GARCIA - PORTFOLIO</span>
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
              <span className="hud-nav__index">0{index + 1}</span>
              <span className="hud-nav__text">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
