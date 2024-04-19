import { expect } from "vitest"
import { initQspEngine, QspAPI, QspErrorData, QspListItem } from "@qsp/wasm-engine"
// @ts-expect-error supported in new node version
import wasmUrl from "@qsp/wasm-engine/qsp-engine.wasm?url"
import { readQsps, writeQsp } from "@qsp/converters"
import { readFile } from "node:fs/promises"
import immutableUpdate from "immutability-helper"
import xoid, { Actions, Atom } from "xoid"
import { Result, UnionCase } from "@fering-org/functional-helper"

import { QspFileSystem } from "./qspFileSystem"

export namespace PromiseExt {
  export function wait(ms: number) {
    return new Promise((resolveOuter) => {
      resolveOuter(
        new Promise((resolveInner) => {
          setTimeout(resolveInner, ms)
        }),
      )
    })
  }
}

namespace QspAPI {
  export async function init(): Promise<QspAPI> {
    const wasm = await readFile("." + wasmUrl)
    const api = await initQspEngine(wasm)
    return api
  }
}

export type TimeUpdatedValue<Value> = {
  updated: Date
  value: Value
}
export namespace TimeUpdatedValue {
  export function create<Value>(
    updated: Date,
    value: Value,
  ) : TimeUpdatedValue<Value> {
    return { updated, value }
  }

  export function update<Value>(
    value: TimeUpdatedValue<Value>,
    updating: (old: Value) => Value
  ) : TimeUpdatedValue<Value> {
    return immutableUpdate(value, {
      value: { $apply: updating },
      updated: { $set: new Date() }
    })
  }
}

export type GameClientState = {
  main: TimeUpdatedValue<string>
  actions: TimeUpdatedValue<QspListItem[]>
  error?: TimeUpdatedValue<QspErrorData>
}

export namespace GameClientState {
  export function create(dateTime: Date) : GameClientState {
    return {
      main: TimeUpdatedValue.create(dateTime, ""),
      actions: TimeUpdatedValue.create(dateTime, []),
      error: undefined
    }
  }
}

export type GameClient = Atom<GameClientState> & Actions<{
  setMain: (text: string) => void,
  getMain: () => TimeUpdatedValue<string>,
  setActions: (actions: QspListItem[]) => void,
  getActions: () => TimeUpdatedValue<QspListItem[]>,
}>

export namespace GameClient {
  export function create(dateTime: Date) : GameClient {
    return xoid(
      GameClientState.create(dateTime),
      atom => ({
        setMain: (text: string) => {
          atom.focus("main").set(
            TimeUpdatedValue.create(new Date, text)
          )
        },
        getMain: () : TimeUpdatedValue<string> =>
          atom.value.main,
        setActions: (actions: QspListItem[]) => {
          atom.focus("actions").set(
            TimeUpdatedValue.create(new Date, actions)
          )
        },
        getActions: () : TimeUpdatedValue<QspListItem[]> =>
          atom.value.actions,
      })
    )
  }
}

export type QspFileData =
  | UnionCase<"Binary", ArrayBuffer>
  | UnionCase<"Source", string>

export namespace QspFileData {
  export function mkBinary(buffer: ArrayBuffer): QspFileData {
    return UnionCase.mkUnionCase("Binary", buffer)
  }

  export function mkSource(source: string): QspFileData {
    return UnionCase.mkUnionCase("Source", source)
  }

  export function reduce<U>(
    fileData: QspFileData,
    folderSource: (source: string) => U,
    folderBinary: (binary: ArrayBuffer) => U,
  ) : U {
    switch (fileData.case) {
      case "Source":
        return folderSource(fileData.fields)
      case "Binary":
        return folderBinary(fileData.fields)
    }
  }
}

export type QspFile = {
  fileName: string
  data: QspFileData
}

export namespace QspFile {
  export function mkSource(fileName: string, source: string): QspFile {
    return {
      fileName: fileName,
      data: QspFileData.mkSource(source),
    }
  }

  export function mkBinary(fileName: string, binary: ArrayBuffer): QspFile {
    return {
      fileName: fileName,
      data: QspFileData.mkBinary(binary),
    }
  }
}

export type GameServer = {
  api: QspAPI
  $fileSystem: QspFileSystem
}

export namespace GameServer {
  export function create(api: QspAPI, basePath: string) : GameServer {
    return {
      api: api,
      $fileSystem: QspFileSystem.create(basePath)
    }
  }

  export async function openGame(server: GameServer, path: string, isNewGame: boolean) {
    const $fileSystem = server.$fileSystem

    const $file = QspFileSystem.get($fileSystem, path)
    const file = $file.value
    const $fileState = $file.focus("state")
    const fileState = $fileState.value

    const result = await new Promise<Result<ArrayBuffer, string>>((resolve, reject) => {
      if (fileState.case === "Resolved") {
        resolve(fileState.fields)
      } else {
        const unsub = $fileState.subscribe(fileState => {
          if (fileState.case === "Resolved") {
            unsub()
            resolve(fileState.fields)
          }
        })
      }
    })

    const qspFile: QspFile = (() => {
      if (result[0] === "Ok") {
        if (file.type === "Source") {
          return QspFile.mkSource(file.fileName, result[1].toString())
        } else {
          return QspFile.mkBinary(file.fileName, result[1])
        }
      } else {
        throw new Error(result[1])
      }
    })()

    const binary = QspFileData.reduce(
      qspFile.data,
      source => writeQsp(readQsps(source)),
      binary => binary,
    )

    server.api.openGame(binary, isNewGame)
  }

  export async function start(server: GameServer, $gameClient: GameClient, initGameFileName: string) {
    const api = server.api

    api.on("open_game", async (path, isNewGame, onOpened) => {
      await openGame(server, path, isNewGame)
      onOpened()
    })

    api.on("close_file", (path, onReady) => {
      onReady()
    })

    api.on("main_changed", text => {
      $gameClient.actions.setMain(text)
    })

    api.on("actions_changed", actions => {
      $gameClient.actions.setActions(actions)
    })

    api.on("version", (type, onVersion) => {
      onVersion(api.version())
    })

    await openGame(server, initGameFileName, true)
    api.restartGame()
  }
}

export type TestClient = {
  server: GameServer
  client: GameClient
  lastSelectedTime: Date
}

export namespace TestClient {
  export async function start(basePath: string, initGameFileName: string): Promise<TestClient> {
    const api = await QspAPI.init()
    const gameServer = GameServer.create(api, basePath)
    const d = new Date()
    const gameClient = GameClient.create(d)
    await GameServer.start(gameServer, gameClient, initGameFileName)
    return {
      server: gameServer,
      client: gameClient,
      lastSelectedTime: d
    }
  }

  export function getNewValue<Value>(
    lastSelectedTime: Date,
    get: () => TimeUpdatedValue<Value>
  ) : Promise<TimeUpdatedValue<Value>> {
    async function loop(): Promise<TimeUpdatedValue<Value>> {
      const result = get()
      if (lastSelectedTime < result.updated) {
        return result
      } else {
        await PromiseExt.wait(50)
        return loop()
      }
    }
    return loop()
  }

  export async function mainEqual(testClient: TestClient, expectedString: string) {
    const currentMain = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getMain
    )
    expect(currentMain.value).toBe(expectedString)
  }

  export async function select(testClient: TestClient, action: string) {
    const actions = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getActions
    )
    const res = actions.value.findIndex(
      currentAction => currentAction.name === action
    )
    expect(res, `Not found "${action}"`).not.toBe(-1)
    testClient.server.api.selectAction(res)
    testClient.server.api.execSelectedAction()
  }
}
