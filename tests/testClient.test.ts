import { describe, it, test } from "vitest"

import { StartingLocation, TestClient } from "../src"

test("IncLib", async() => {
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

test("Objects select", async () => {
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
