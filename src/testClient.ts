import { expect } from "vitest"
import { QspListItem } from "@qsp/wasm-engine"

import { PromiseExt } from "./promiseExt"
import { QspAPIExt } from "./qspAPIExt"
import { GameServer } from "./gameServer"
import { GameClient, TimeUpdatedValue } from "./gameClient"

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
    GameClient.bindToServer(gameClient, gameServer)
    await GameServer.openGame(gameServer, initGameFileName, true)
    gameServer.api.restartGame()
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
