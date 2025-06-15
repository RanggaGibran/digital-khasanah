// Type definitions for wasm-loader.js
declare module './wasm-loader.js' {
  function initWasm(): Promise<any>;
  export default initWasm;
}

// Also support import without .js extension for compatibility
declare module './wasm-loader' {
  function initWasm(): Promise<any>;
  export default initWasm;
}
