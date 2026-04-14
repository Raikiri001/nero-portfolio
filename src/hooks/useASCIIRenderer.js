import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to render ASCII art strings line-by-line with a terminal feel.
 * @param {string[]} asciiLines - Array of ASCII art lines
 * @param {object} options - { speed: ms per line, autoStart: bool }
 */
export function useASCIIRenderer(asciiLines, options = {}) {
  const { speed = 30, autoStart = false } = options;
  const [visibleLines, setVisibleLines] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    indexRef.current = 0;
    setVisibleLines([]);
    setIsComplete(false);
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (!asciiLines || asciiLines.length === 0) return;
    reset();
    setIsRunning(true);

    const renderNext = () => {
      if (indexRef.current >= asciiLines.length) {
        setIsComplete(true);
        setIsRunning(false);
        return;
      }

      setVisibleLines(prev => [...prev, asciiLines[indexRef.current]]);
      indexRef.current++;
      timerRef.current = setTimeout(renderNext, speed);
    };

    timerRef.current = setTimeout(renderNext, speed);
  }, [asciiLines, speed, reset]);

  useEffect(() => {
    if (autoStart) start();
    return () => clearTimeout(timerRef.current);
  }, [autoStart, start]);

  return { lines: visibleLines, isComplete, isRunning, start, reset };
}
