import './ScanlineOverlay.css';

export function ScanlineOverlay() {
  return (
    <div className="scanline-overlay" aria-hidden="true">
      <div className="scanline-lines" />
      <div className="scanline-sweep" />
      <div className="chromatic-layer" />
    </div>
  );
}
