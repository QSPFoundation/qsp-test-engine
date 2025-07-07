import { describe, expect, it, test } from "vitest"
import { platform } from "node:os"

import { StartingLocation, TestClient } from "../src"

describe("Action select", () => {
  it("select exists action", async () => {
    const testClient = await TestClient.start("tests/mocks", "actions.qsps")
    await TestClient.select(testClient, "First action")
    await TestClient.mainEqual(testClient, "You click on the first action\r\n")
  })
  it("select not exists action", async () => {
    const testClient = await TestClient.start("tests/mocks", "actions.qsps")
    await expect(() => TestClient.select(testClient, "Non-existent action"))
      .rejects
      .toThrowError([
        "Not found \"Non-existent action\" in:",
        "* First action",
        "* Second action",
        "* Third action",
      ].join("\n"))
  })
})

describe("Actions equals", () => {
  it("empty", async () => {
    const testClient = await TestClient.start("tests/mocks", "actions.qsps", StartingLocation.mkCustom("startEmptyActions"))
    // fix(actionsEqual): the function does not respond if you run the game without actions
    await TestClient.actionsEqual(testClient, [
      { name: "start", image: ""},
    ])
    await TestClient.select(testClient, "start")
    await TestClient.actionsEqual(testClient, [])
  })
  it("Three actions", async () => {
    const testClient = await TestClient.start("tests/mocks", "actions.qsps")
    await TestClient.actionsEqual(testClient, [
      { name: "First action", image: ""},
      { name: "Second action", image: ""},
      { name: "Third action", image: ""},
    ])
  })
})

describe("Has action", () => {
  it("not has exists action", async () => {
    const testClient = await TestClient.start("tests/mocks", "actions.qsps")
    await expect(() => TestClient.hasAction(testClient, "Not exists action"))
      .rejects
      .toThrowError([
        "Not found \"Not exists action\" in:",
        "* First action",
        "* Second action",
        "* Third action",
      ].join("\n"))
  })
  it("has exists action", async () => {
    const testClient = await TestClient.start("tests/mocks", "actions.qsps")
    await TestClient.hasAction(testClient, "Second action")
  })
})

describe("Not has action", () => {
  it("not has exists action", async () => {
    const testClient = await TestClient.start("tests/mocks", "actions.qsps")
    await TestClient.notHasAction(testClient, "Not exists action")
  })
  it("has exists action", async () => {
    const testClient = await TestClient.start("tests/mocks", "actions.qsps")
    await expect(() => TestClient.notHasAction(testClient, "Second action"))
      .rejects
      .toThrowError([
        "Found \"Second action\" in:",
        "* First action",
        "* Second action",
        "* Third action",
      ].join("\n"))
  })
})

test("IncLib", async () => {
  const testClient = await TestClient.start("tests/mocks", "game.qsps")
  await TestClient.select(testClient, "start")
  await TestClient.mainEqual(testClient, "Hello world\r\n")
})

test("Objects equals", async () => {
  const testClient = await TestClient.start("tests/mocks", "addObjects.qsps")
  await TestClient.objectsEqual(testClient, [
    { name: "Sword", image: "" },
    { name: "Shield", image: "" },
    { name: "Potion", image: "" },
  ])
  await TestClient.select(testClient, "Fight")
  await TestClient.objectsEqual(testClient, [
    { name: "Sword", image: "" },
  ])
  await TestClient.mainEqual(testClient, "End of fight\r\n")
})

describe("Has object", () => {
  it("not has exists object", async () => {
    const testClient = await TestClient.start("tests/mocks", "addObjects.qsps")
    await expect(() => TestClient.hasObject(testClient, "Not exists object"))
      .rejects
      .toThrowError([
        "Not found \"Not exists object\" in:",
        "* Sword",
        "* Shield",
        "* Potion",
      ].join("\n"))
  })
  it("has exists object", async () => {
    const testClient = await TestClient.start("tests/mocks", "addObjects.qsps")
    await TestClient.hasObject(testClient, "Sword")
  })
})

describe("Not has object", () => {
  it("not has exists object", async () => {
    const testClient = await TestClient.start("tests/mocks", "addObjects.qsps")
    await TestClient.notHasObject(testClient, "Bow")
  })
  it("has exists object", async () => {
    const testClient = await TestClient.start("tests/mocks", "addObjects.qsps")
    await expect(() => TestClient.notHasObject(testClient, "Sword"))
      .rejects
      .toThrowError([
        "Found \"Sword\" in:",
        "* Sword",
        "* Shield",
        "* Potion",
      ].join("\n"))
  })
})

describe("Objects select", () => {
  it("Use potion", async () => {
    const testClient = await TestClient.start("tests/mocks", "useObjects.qsps")
    await TestClient.objectsEqual(testClient, [
      { name: "Sword", image: "" },
      { name: "Potion", image: "" },
    ])
    await TestClient.selectObject(testClient, "Potion")
    await TestClient.mainEqual(testClient, "Potion is selected\r\n")
    await TestClient.select(testClient, "Drink")
    await TestClient.objectsEqual(testClient, [
      { name: "Sword", image: "" },
    ])
    await TestClient.mainEqual(testClient, "+hp\r\n")
  })
  it("Use not exist object", async () => {
    const testClient = await TestClient.start("tests/mocks", "useObjects.qsps")
    await expect(() => TestClient.selectObject(testClient, "Not exist object"))
      .rejects
      .toThrowError([
        "Not found \"Not exist object\" in:",
        "* Sword",
        "* Potion",
      ].join("\n"))
  })
})

describe("starting location", () => {
  it("implicit default location", async () => {
    const testClient = await TestClient.start("tests/mocks", "startingLocation.qsps")
    await TestClient.mainEqual(testClient, "this is c location\r\n")
  })
  it("explicit default location", async () => {
    const testClient = await TestClient.start("tests/mocks", "startingLocation.qsps", StartingLocation.mkDefault())
    await TestClient.mainEqual(testClient, "this is c location\r\n")
  })
  if (platform() === "win32") { // todo: fix: "Test timed out in 5000ms" in linux
    it("none", async () => {
      const testClient = await TestClient.start("tests/mocks", "startingLocation.qsps", StartingLocation.mkNone())
      testClient.server.api.execCode("'none'")
      await TestClient.mainEqual(testClient, "none\r\n")
    })
  }
  it("custom a location", async () => {
    const testClient = await TestClient.start("tests/mocks", "startingLocation.qsps", StartingLocation.mkCustom("a"))
    await TestClient.mainEqual(testClient, "this is a location\r\n")
  })
  it("custom b location", async () => {
    const testClient = await TestClient.start("tests/mocks", "startingLocation.qsps", StartingLocation.mkCustom("b"))
    await TestClient.mainEqual(testClient, "this is b location\r\n")
  })
})

describe("Menu select", () => {
  it("select exists menu action", async () => {
    const testClient = await TestClient.start("tests/mocks", "menu.qsps")
    await TestClient.selectMenu(testClient, "New game")
    await TestClient.mainEqual(testClient, "New game\r\n")
  })
  it("select 2 exists menu action", async () => {
    const testClient = await TestClient.start("tests/mocks", "menu.qsps")
    await TestClient.selectMenu(testClient, "Load")
    await TestClient.mainEqual(testClient, "Load\r\n")
  })
  it("select not exists action", async () => {
    const testClient = await TestClient.start("tests/mocks", "menu.qsps")
    await expect(() => TestClient.selectMenu(testClient, "Non-existent action"))
      .rejects
      .toThrowError([
        "Not found \"Non-existent action\" in:",
        "* New game",
        "* Load",
      ].join("\n"))
  })
})

describe("Menu has", () => {
  it("has", async () => {
    const testClient = await TestClient.start("tests/mocks", "menu.qsps")
    await TestClient.hasMenu(testClient, "New game")
  })
  it("not has", async () => {
    const testClient = await TestClient.start("tests/mocks", "menu.qsps")
    await expect(() => TestClient.hasMenu(testClient, "Non-existent action"))
      .rejects
      .toThrowError([
        "Not found \"Non-existent action\" in:",
        "* New game",
        "* Load",
      ].join("\n"))
  })
})

describe("Menu not has", () => {
  it("has", async () => {
    const testClient = await TestClient.start("tests/mocks", "menu.qsps")
    await expect(() => TestClient.notHasMenu(testClient, "New game"))
      .rejects
      .toThrowError([
        "Found \"New game\" in:",
        "* New game",
        "* Load",
      ].join("\n"))

  })
  it("not has", async () => {
    const testClient = await TestClient.start("tests/mocks", "menu.qsps")
    await TestClient.notHasMenu(testClient, "Non-existent action")
  })
})
