import { createContext, useContext, useState, useCallback } from 'react';
import { getTranslation } from '../data/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isSeedMode, setIsSeedMode] = useState(false);
  const [isCorrupting, setIsCorrupting] = useState(false);

  const toggleLanguage = useCallback(() => {
    // Trigger SEED Mode flash
    setIsSeedMode(true);
    setIsCorrupting(true);

    // Brief crimson accent shift
    document.documentElement.style.setProperty('--color-gold', '#ff1744');
    document.documentElement.style.setProperty('--color-gold-rgb', '255, 23, 68');

    setTimeout(() => {
      setLanguage(prev => prev === 'en' ? 'ja' : 'en');
    }, 400);

    setTimeout(() => {
      setIsCorrupting(false);
    }, 800);

    setTimeout(() => {
      setIsSeedMode(false);
      // Restore gold
      document.documentElement.style.setProperty('--color-gold', '#d4af37');
      document.documentElement.style.setProperty('--color-gold-rgb', '212, 175, 55');
    }, 1200);
  }, []);

  const t = useCallback((key) => {
    return getTranslation(key, language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{
      language,
      toggleLanguage,
      t,
      isSeedMode,
      isCorrupting,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
