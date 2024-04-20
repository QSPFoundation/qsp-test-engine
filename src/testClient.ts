import { expect } from "vitest"
import { QspAPI, QspListItem } from "@qsp/wasm-engine"
import { readQsps, writeQsp } from "@qsp/converters"
import { Result, UnionCase } from "@fering-org/functional-helper"

import { PromiseExt } from "./promiseExt"
import { QspAPIExt } from "./qspAPIExt"
import { QspFileSystem } from "./qspFileSystem"
import { GameClient, TimeUpdatedValue } from "./gameClient"

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

    api.on("objects_changed", (objects) => {
      $gameClient.actions.setObjects(objects)
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
    const api = await QspAPIExt.init()
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

  export async function objectsEqual(testClient: TestClient, expectedObjects: QspListItem[]) {
    const currentMain = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getObjects
    )
    expect(currentMain.value).toStrictEqual(expectedObjects)
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
