import { Result } from "@fering-org/functional-helper"
import { expect, test } from "vitest"

import { QspFileSystem } from "../src"

test("load qsp file", async () => {
  const $fileSystem = QspFileSystem.create("tests/mocks")
  const initGameFileName = "helloWorld.qsps"

  const $file = QspFileSystem.get($fileSystem, initGameFileName)
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

  expect(result[0]).toBe("Ok")
  expect(
    result[1].toString()
  ).toBe([
    "# begin",
    "  'Hello world'",
    "-",
    "",
  ].join("\r\n"))
})
