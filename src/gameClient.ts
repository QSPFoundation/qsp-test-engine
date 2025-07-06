import { QspErrorData, QspListItem } from "@qsp/wasm-engine"
import immutableUpdate from "immutability-helper"
import xoid, { Actions, Atom } from "xoid"
import { GameServer } from "./gameServer"

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

export type MenuArgs = {
  actions: QspListItem[],
  select: (index: number) => void,
}

export namespace MenuArgs {
  export function create(
    actions?: QspListItem[],
    select?: (index: number) => void
  ): MenuArgs {
    return {
      actions: actions || [],
      select: select || ((index: number) => {}),
    }
  }
}

export type GameClientState = {
  main: TimeUpdatedValue<string>
  actions: TimeUpdatedValue<QspListItem[]>
  objects: TimeUpdatedValue<QspListItem[]>
  menus: TimeUpdatedValue<MenuArgs>
  error?: TimeUpdatedValue<QspErrorData>
}

export namespace GameClientState {
  export function create(dateTime: Date) : GameClientState {
    return {
      main: TimeUpdatedValue.create(dateTime, ""),
      actions: TimeUpdatedValue.create(dateTime, []),
      objects: TimeUpdatedValue.create(dateTime, []),
      menus: TimeUpdatedValue.create(dateTime, MenuArgs.create()),
      error: undefined
    }
  }
}

export type GameClient = Atom<GameClientState> & Actions<{
  setMain: (text: string) => void,
  getMain: () => TimeUpdatedValue<string>,
  setActions: (actions: QspListItem[]) => void,
  getActions: () => TimeUpdatedValue<QspListItem[]>,
  setObjects: (actions: QspListItem[]) => void,
  getObjects: () => TimeUpdatedValue<QspListItem[]>,
  setMenu: (args: MenuArgs) => void,
  getMenu: () => TimeUpdatedValue<MenuArgs>,
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
        setObjects: (objects: QspListItem[]) => {
          atom.focus("objects").set(
            TimeUpdatedValue.create(new Date, objects)
          )
        },
        getObjects: () : TimeUpdatedValue<QspListItem[]> =>
          atom.value.objects,
        setMenu: (menus: MenuArgs) => {
          atom.focus("menus").set(
            TimeUpdatedValue.create(new Date, menus)
          )
        },
        getMenu: () : TimeUpdatedValue<MenuArgs> =>
          atom.value.menus,
      })
    )
  }

  export function bindToServer($gameClient: GameClient, server: GameServer) {
    const api = server.api

    api.on("open_game", async (path, isNewGame, onOpened) => {
      await GameServer.openGame(server, path, isNewGame)
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

    api.on("menu", (items, select) => {
      $gameClient.actions.setMenu(
        MenuArgs.create(items, select)
      )
    })

    api.on("version", (type, onVersion) => {
      onVersion(api.version())
    })

    api.on("objects_changed", (objects) => {
      $gameClient.actions.setObjects(objects)
    })
  }
}
