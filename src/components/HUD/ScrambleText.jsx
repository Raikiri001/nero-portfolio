import { useState, useEffect } from 'react';
import './ScrambleText.css';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()_+{}:"<>?/';

function ScrambleChar({ targetChar, delay }) {
  const [char, setChar] = useState(CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (targetChar === ' ' || targetChar === '\n') {
      setSettled(true);
      return;
    }

    let interval;
    let count = 0;
    const TOTAL_SCRAMBLES = 20;

    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        if (count >= TOTAL_SCRAMBLES) {
          clearInterval(interval);
          setChar(targetChar);
          setSettled(true);
        } else {
          setChar(CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]);
          count++;
        }
      }, 30);
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(interval);
    };
  }, [targetChar, delay]);

  if (targetChar === ' ') {
    return <span>&nbsp;</span>;
  }
  
  if (targetChar === '\n') {
    return <br />;
  }

  return (
    <span className={`scramble-char ${settled ? 'settled' : 'scrambling'}`}>
      {settled ? targetChar : char}
    </span>
  );
}

export function ScrambleText({ text, duration = 600, delay = 0, className = '' }) {
  // Safe parsing just in case text is undefined or a number
  const safeText = String(text || '');
  return (
    <span className={`scramble-wrapper ${className}`}>
      {safeText.split(' ').map((word, wordIndex, array) => (
        <span key={wordIndex} className="scramble-word" style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}>
          {word.split('').map((char, charIndex) => (
            <ScrambleChar 
              key={charIndex} 
              targetChar={char} 
              delay={delay + (wordIndex * 200 + charIndex * 80)} 
            />
          ))}
          {wordIndex < array.length - 1 && <span className="scramble-space">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}
