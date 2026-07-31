import { useCallback, useRef, useState } from 'react';
import { CombatScene } from './combat/CombatScene';
import { CombatHUD } from './combat/CombatHUD';
import { pickRandomBoss } from '../data/bossRoster';
import './combat/Combat.css';

function emptyHud() {
  return { bossScreen: null, beams: [], lockProgress: 0, locked: false };
}

// Top-level combat page: owns the boss roll and the retry/return lifecycle
// around CombatScene (the R3F sim) + CombatHUD (the DOM overlay). Neither
// child manages navigation itself — `onReturn` is the only way out, wired
// by App.jsx to clear its combat session and drop back to the hangar.
export function Combat({ gundamId, initialBoss, onReturn }) {
  const [bossDef, setBossDef] = useState(() => initialBoss || pickRandomBoss());
  const [runKey, setRunKey] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [result, setResult] = useState(null);
  const hudRef = useRef(emptyHud());

  // Fired ~900ms after the sim freezes (see CombatScene) — this is what
  // actually reveals the result panel, kept separate from the continuous
  // HP/lock snapshot so the finishing blow gets a beat on a still frame
  // before the modal appears.
  const handleExit = useCallback((finalResult) => {
    setResult(finalResult);
  }, []);

  const handleRetry = useCallback(() => {
    setBossDef((prev) => pickRandomBoss(prev?.id));
    setSnapshot(null);
    setResult(null);
    hudRef.current = emptyHud();
    setRunKey((k) => k + 1);
  }, []);

  const handleReturn = useCallback(() => {
    onReturn?.();
  }, [onReturn]);

  return (
    <div className="combat-page">
      <CombatScene
        key={runKey}
        gundamId={gundamId}
        bossDef={bossDef}
        onExit={handleExit}
        hudRef={hudRef}
        onSnapshot={setSnapshot}
      />
      <CombatHUD
        hudRef={hudRef}
        snapshot={snapshot}
        bossName={bossDef.name}
        result={result}
        onRetry={handleRetry}
        onReturn={handleReturn}
      />
    </div>
  );
}
