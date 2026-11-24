export async function resolve(spec, ctx, next) {
  try {
    return await next(spec, ctx);
  } catch (e) {
    if (!spec.startsWith('.') && !spec.startsWith('/')) throw e;
    for (const suffix of ['.js', '.jsx', '/index.js']) {
      try { return await next(spec + suffix, ctx); } catch { /* try the next */ }
    }
    throw e;
  }
}
