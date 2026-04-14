import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { skills } from '../../../data/projects';
import './NihongoSync.css';

export function NihongoSync() {
  const { t } = useLanguage();
  const { nihongo } = skills;
  const [currentKanji, setCurrentKanji] = useState(0);
  const [scrollingKanji, setScrollingKanji] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Rotate through kanji
    intervalRef.current = setInterval(() => {
      setCurrentKanji(prev => (prev + 1) % nihongo.kanji.length);
      setScrollingKanji(prev => {
        const next = nihongo.kanji[Math.floor(Math.random() * nihongo.kanji.length)];
        return [...prev.slice(-6), next];
      });
    }, 1500);
    return () => clearInterval(intervalRef.current);
  }, [nihongo.kanji]);

  // SVG circular gauge
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (nihongo.syncRate / 100) * circumference;

  return (
    <div className="nihongo-sync panel">
      <div className="panel__header">{t('nihongo_sync')}</div>

      <div className="nihongo-sync__content">
        {/* Circular Gauge */}
        <div className="sync-gauge">
          <svg viewBox="0 0 130 130" className="sync-gauge__svg">
            {/* Outer track marks */}
            {[...Array(24)].map((_, i) => {
              const angle = (i / 24) * 360;
              const rad = (angle * Math.PI) / 180;
              const x1 = 65 + Math.cos(rad) * 60;
              const y1 = 65 + Math.sin(rad) * 60;
              const x2 = 65 + Math.cos(rad) * 63;
              const y2 = 65 + Math.sin(rad) * 63;
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(0, 242, 255, 0.2)" strokeWidth="1" />
              );
            })}

            {/* Background circle */}
            <circle cx="65" cy="65" r={radius}
              fill="none" stroke="rgba(0, 242, 255, 0.1)" strokeWidth="4" />

            {/* Progress arc */}
            <circle cx="65" cy="65" r={radius}
              fill="none" stroke="url(#syncGradient)" strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 65 65)"
              className="sync-gauge__progress" />

            <defs>
              <linearGradient id="syncGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f2ff" />
                <stop offset="100%" stopColor="#d4af37" />
              </linearGradient>
            </defs>

            {/* Center text */}
            <text x="65" y="58" textAnchor="middle" className="sync-gauge__rate">
              {nihongo.syncRate}%
            </text>
            <text x="65" y="72" textAnchor="middle" className="sync-gauge__label">
              {t('sync_rate')}
            </text>
          </svg>
        </div>

        {/* Info */}
        <div className="nihongo-info">
          <div className="nihongo-info__unit">
            {nihongo.unit} — {nihongo.status}
          </div>

          {/* Current Kanji */}
          <div className="kanji-display">
            <span className="kanji-display__char">{nihongo.kanji[currentKanji].char}</span>
            <div className="kanji-display__details">
              <span className="kanji-display__meaning">{nihongo.kanji[currentKanji].meaning}</span>
              <span className="kanji-display__reading">{nihongo.kanji[currentKanji].reading}</span>
            </div>
          </div>

          {/* Scrolling kanji terminal */}
          <div className="kanji-terminal">
            {scrollingKanji.map((k, i) => (
              <div key={i} className="kanji-terminal__line">
                <span className="kanji-terminal__char">{k.char}</span>
                <span className="kanji-terminal__reading">{k.reading}</span>
                <span className="kanji-terminal__meaning">{k.meaning}</span>
              </div>
            ))}
            <span className="neural-cursor">█</span>
          </div>
        </div>
      </div>
    </div>
  );
}
