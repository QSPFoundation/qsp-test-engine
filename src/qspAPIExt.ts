import { initQspEngine, QspAPI } from "@qsp/wasm-engine"
// @ts-expect-error supported in new node version
import wasmUrl from "@qsp/wasm-engine/qsp-engine.wasm?url"
import { readFile } from "node:fs/promises"

export namespace QspAPIExt {
  export async function init(): Promise<QspAPI> {
    const wasm = await readFile("." + wasmUrl)
    const api = await initQspEngine(wasm)
    return api
  }
}
