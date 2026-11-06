// Points localStorage/sessionStorage at jsdom's, over Node's own globals.
const dom = (globalThis as {jsdom?: {window: Window}}).jsdom;
if (dom) {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, {configurable: true, value: dom.window[name]});
  }
}
