import { test } from "vitest"

import { TestClient } from "../src"

test("IncLib", async() => {
  const testClient = await TestClient.start("tests/mocks", "game.qsps")
  await TestClient.select(testClient, "start")
  await TestClient.mainEqual(testClient, "Hello world\r\n")
})

test("Objects", async () => {
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
