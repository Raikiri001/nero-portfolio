// Node resolve hook: the repo imports extensionless ('./outline'), which
// Vite resolves and node does not. Retry every failure with '.js', then
// '/index.js'. Register with:  node --import ./scripts/resolve.mjs <script>
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./resolve-hook.mjs', pathToFileURL('./scripts/'));
