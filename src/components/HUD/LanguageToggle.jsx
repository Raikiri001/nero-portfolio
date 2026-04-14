import { useLanguage } from '../../hooks/useLanguage';
import { useSoundEngine } from '../../hooks/useSoundEngine';
import './LanguageToggle.css';

export function LanguageToggle() {
  const { language, toggleLanguage, isSeedMode } = useLanguage();
  const sound = useSoundEngine();

  const handleToggle = () => {
    sound.beam();
    toggleLanguage();
  };

  return (
    <>
      {/* SEED Mode Flash Overlay */}
      {isSeedMode && (
        <div className="seed-flash-overlay" />
      )}

      <button
        className="lang-toggle"
        onClick={handleToggle}
        data-clickable
        aria-label="Toggle Language"
      >
        <div className="lang-toggle__hex">
          <div className="lang-toggle__inner">
            <span className="lang-toggle__label">LANG</span>
            <span className="lang-toggle__value">{language === 'en' ? 'EN' : 'JA'}</span>
          </div>
        </div>
        <span className="lang-toggle__sublabel">SYNC</span>
      </button>
    </>
  );
}
