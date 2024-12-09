import { describe, expect, it, test } from "vitest"

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
  it("none", async () => {
    const testClient = await TestClient.start("tests/mocks", "startingLocation.qsps", StartingLocation.mkNone())
    testClient.server.api.execCode("'none'")
    await TestClient.mainEqual(testClient, "none\r\n")
  })
  it("custom a location", async () => {
    const testClient = await TestClient.start("tests/mocks", "startingLocation.qsps", StartingLocation.mkCustom("a"))
    await TestClient.mainEqual(testClient, "this is a location\r\n")
  })
  it("custom b location", async () => {
    const testClient = await TestClient.start("tests/mocks", "startingLocation.qsps", StartingLocation.mkCustom("b"))
    await TestClient.mainEqual(testClient, "this is b location\r\n")
  })
})
