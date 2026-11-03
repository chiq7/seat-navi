// Next aliases this compile-time marker on the server. Use its bundled empty
// server module for the opt-in Node integration test, without mocking the SDK.
import { register, createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require=createRequire(import.meta.url);
const marker=pathToFileURL(require.resolve("next/dist/compiled/server-only/empty.js")).href;
register(import.meta.url);
export async function resolve(specifier,context,nextResolve){
 if(specifier==="server-only")return {url:marker,shortCircuit:true};
 return nextResolve(specifier,context);
}
