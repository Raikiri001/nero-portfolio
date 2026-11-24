import { useRef } from 'react';
import { HangarCorridor } from './HangarCorridor';
import { PROJECTS_ARRAY } from '../../data/siteData';

const params = new URLSearchParams(window.location.search);

export function DebugHangar() {
  const frac = useRef(parseFloat(params.get('f') || '0'));
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05070b' }}>
      <HangarCorridor bayCount={PROJECTS_ARRAY.length}
        scrollFractionRef={frac} onProject={() => {}} />
    </div>
  );
}
