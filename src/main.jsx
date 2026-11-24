// index.css FIRST: it holds the design tokens and the shared primitives
// (.hud-panel, .bevel, .section-header). Component CSS loads after it and so
// wins ties — that is what lets a component refine a primitive.
import './index.css';
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ?debug=… verification routes (see CLAUDE.md "Verifying 3D changes").
// DEV ONLY: `import.meta.env.DEV` is false in a production build, so these
// branches — and the chunks they would load — are removed entirely. The
// overlay route also needs the reference photographs, which never ship.
const DEBUG_ROUTES = import.meta.env.DEV ? {
  hangar: lazy(() => import('./game/hangar/DebugHangar').then((m) => ({ default: m.DebugHangar }))),
  roster: lazy(() => import('./game/mech/DebugRoster').then((m) => ({ default: m.DebugRoster }))),
  overlay: lazy(() => import('./game/mech/DebugOverlay').then((m) => ({ default: m.DebugOverlay }))),
} : {};

const debug = new URLSearchParams(window.location.search).get('debug');
const DebugRoute = DEBUG_ROUTES[debug];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {DebugRoute ? (
      <Suspense fallback={null}>
        <DebugRoute />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
