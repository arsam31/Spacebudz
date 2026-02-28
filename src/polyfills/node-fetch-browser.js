// Browser polyfill for node-fetch — just use the native fetch API
export default globalThis.fetch;
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
