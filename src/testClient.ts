import { expect, assert } from "vitest"
import { QspListItem } from "@qsp/wasm-engine"
import { UnionCase } from "@fering-org/functional-helper"

import { PromiseExt } from "./promiseExt"
import { QspAPIExt } from "./qspAPIExt"
import { GameServer } from "./gameServer"
import { GameClient, TimeUpdatedValue } from "./gameClient"

export type TestClient = {
  server: GameServer
  client: GameClient
  lastSelectedTime: Date
}

export type StartingLocation =
  | UnionCase<"None">
  | UnionCase<"Default">
  | UnionCase<"Custom", string>

export namespace StartingLocation {
  export function mkNone() : StartingLocation {
    return UnionCase.mkEmptyUnionCase("None")
  }

  export function mkDefault() : StartingLocation {
    return UnionCase.mkEmptyUnionCase("Default")
  }

  export function mkCustom(location: string) : StartingLocation {
    return UnionCase.mkUnionCase("Custom", location)
  }
}

export namespace TestClient {
  export async function start(
    basePath: string,
    initGameFileName: string,
    startingLocation: StartingLocation = StartingLocation.mkDefault()
  ): Promise<TestClient> {
    const api = await QspAPIExt.init()
    const gameServer = GameServer.create(api, basePath)
    const d = new Date()
    const gameClient = GameClient.create(d)
    GameClient.bindToServer(gameClient, gameServer)
    await GameServer.openGame(gameServer, initGameFileName, true)
    switch (startingLocation.case) {
      case "Default":
        gameServer.api.restartGame()
        break
      case "None":
        break
      case "Custom":
        gameServer.api.execLoc(startingLocation.fields)
        break
    }
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

  export async function hasObject(testClient: TestClient, object: string) {
    const $objects = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getObjects
    )
    const index = $objects.value.findIndex(obj => obj.name === object)
    if (index < 0) {
      const objectNames = $objects.value.map(x => `* ${x.name}`).join("\n")
      assert.fail(`Not found "${object}" in:\n${objectNames}`)
    }
  }

  export async function notHasObject(testClient: TestClient, object: string) {
    const $objects = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getObjects
    )
    const index = $objects.value.findIndex(obj => obj.name === object)
    if (!(index < 0)) {
      const objectNames = $objects.value.map(x => `* ${x.name}`).join("\n")
      assert.fail(`Found "${object}" in:\n${objectNames}`)
    }
  }

  export async function actionsEqual(testClient: TestClient, expectedObjects: QspListItem []) {
    const currentMain = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getActions
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
    if (res < 0) {
      const actionStrings = actions.value.map(x => `* ${x.name}`).join("\n")
      assert.fail(`Not found "${action}" in:\n${actionStrings}`)
    }
    testClient.server.api.selectAction(res)
    testClient.server.api.execSelectedAction()
  }

  export async function selectMenu(testClient: TestClient, menu: string) {
    const $menus = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getMenu,
    )
    const selectedIndex = $menus.value.actions.findIndex(
      currentMenu => currentMenu.name === menu
    )
    if (selectedIndex < 0) {
      const menuStrings = $menus.value.actions.map(x => `* ${x.name}`).join("\n")
      assert.fail(`Not found "${menu}" in:\n${menuStrings}`)
    }
    $menus.value.select(selectedIndex)
  }

  export async function hasAction(testClient: TestClient, action: string) {
    const $actions = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getActions
    )
    const index = $actions.value.findIndex(obj => obj.name === action)
    if (index < 0) {
      const actionNames = $actions.value.map(x => `* ${x.name}`).join("\n")
      assert.fail(`Not found "${action}" in:\n${actionNames}`)
    }
  }

  export async function notHasAction(testClient: TestClient, action: string) {
    const $actions = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getActions
    )
    const index = $actions.value.findIndex(obj => obj.name === action)
    if (!(index < 0)) {
      const actionNames = $actions.value.map(x => `* ${x.name}`).join("\n")
      assert.fail(`Found "${action}" in:\n${actionNames}`)
    }
  }

  export async function selectObject(testClient: TestClient, object: string) {
    const objects = await getNewValue(
      testClient.lastSelectedTime,
      testClient.client.actions.getObjects
    )
    const res = objects.value.findIndex(
      currentObject => currentObject.name === object
    )
    if (res < 0) {
      const objectNames = objects.value.map(x => `* ${x.name}`).join("\n")
      assert.fail(`Not found "${object}" in:\n${objectNames}`)
    }
    testClient.server.api.selectObject(res)
  }
}
