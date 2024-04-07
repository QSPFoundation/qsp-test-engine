import { test } from "vitest"

import { TestClient } from "../src"

test("IncLib", async() => {
  const testClient = await TestClient.start("tests/mocks", "game.qsps")
  await TestClient.select(testClient, "start")
  await TestClient.mainEqual(testClient, "Hello world\r\n")
})
