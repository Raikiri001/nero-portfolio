import './ScanlineOverlay.css';

export function ScanlineOverlay() {
  return (
    <div className="scanline-overlay" aria-hidden="true">
      <div className="scanline-overlay__lines" />
      <div className="scanline-overlay__sweep" />
      <div className="scanline-overlay__chromatic" />
    </div>
  );
}
