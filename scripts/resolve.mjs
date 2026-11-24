// Node resolve hook: the repo imports extensionless ('./outline'), which
// Vite resolves and node does not. Retry every failure with '.js', '.jsx',
// then '/index.js'. Register with:  node --import ./scripts/resolve.mjs <script>
// (module.registerHooks: synchronous, in-thread; needs node ≥ 22.15)
import { registerHooks } from 'node:module';

registerHooks({
  resolve(spec, ctx, next) {
    try {
      return next(spec, ctx);
    } catch (e) {
      if (!spec.startsWith('.') && !spec.startsWith('/')) throw e;
      for (const suffix of ['.js', '.jsx', '/index.js']) {
        try { return next(spec + suffix, ctx); } catch { /* try the next */ }
      }
      throw e;
    }
  },
});
