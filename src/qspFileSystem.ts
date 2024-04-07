import { UnionCase, Option, Result } from "@fering-org/functional-helper"
import xoid, { Atom, Actions } from "xoid"
import immutableUpdate from "immutability-helper"
import { readFile } from "fs"
import { resolve } from "path"

export type QspFileType = "Source" | "Binary"

export namespace QspFileType {
  export function ofFileName(fileName: string): QspFileType {
    if (fileName.includes(".qsps")) {
      return "Source"
    } else {
      return "Binary"
    }
  }
}

export type QspFileState =
  | UnionCase<"HasNotStartedYet">
  | UnionCase<"Loading">
  | UnionCase<"Resolved", Result<ArrayBuffer, string>>

export namespace QspFileState {
  export const hasNotStartedYet: QspFileState = UnionCase.mkEmptyUnionCase("HasNotStartedYet")

  export const loading: QspFileState = UnionCase.mkEmptyUnionCase("Loading")

  export const resolved = (result: Result<ArrayBuffer, string>): QspFileState => {
    return UnionCase.mkUnionCase("Resolved", result)
  }
}

export type QspFile = Atom<{
  fileName: string
  type: QspFileType
  state: QspFileState
}>

export namespace QspFile {
  export function create(fileName: string): QspFile {
    return xoid({
      fileName: fileName,
      type: QspFileType.ofFileName(fileName),
      state: QspFileState.hasNotStartedYet,
    })
  }
}

export type QspFileSystemState = Atom<{
  basePath: string
  files: Map<string, QspFile>
}> & Actions<{
  setFile: (qspFile: QspFile) => void
  updateFile: (fileName: string, updating: ((QspFile: Option<QspFile>) => QspFile)) => void
  getFile: (fileName: string) => Option<QspFile>
}>

export namespace QspFileSystemState {
  export function create(basePath: string) : QspFileSystemState {
    return xoid(
      {
        basePath: basePath,
        files: new Map(),
      },
      $atom => ({
        setFile: (qspFile) => {
          $atom.focus("files").update(map => {
            return immutableUpdate(map, {
              $add: [[qspFile.focus("fileName").value, qspFile]]
            })
          })
        },
        updateFile: (fileName, updating) => {
          $atom.focus("files").update(map => {
            return immutableUpdate(map, {
              $add: [[fileName, updating(map.get(fileName))]]
            })
          })
        },
        getFile: (fileName) => {
          return $atom.focus("files").value.get(fileName)
        },
      })
    )
  }
}

export type QspFileSystem = QspFileSystemState

export namespace QspFileSystem {
  export function create(basePath: string): QspFileSystem {
    return QspFileSystemState.create(basePath)
  }

  export function get($fileSystem: QspFileSystem, fileName: string): QspFile {
    const load = ($file: QspFile) => {
      const $fileState = $file.focus("state")

      const loadingState: QspFileState = QspFileState.loading
      $fileState.set(loadingState)

      readFile(
        resolve($fileSystem.value.basePath, $file.value.fileName),
        (err, data) => {
          const result: Result<ArrayBuffer, string> = err ? Result.mkError(err.message) : Result.mkOk(data)
          const resolvedState: QspFileState = QspFileState.resolved(result)
          $fileState.set(resolvedState)
        }
      )

      return $file
    }

    const $file = $fileSystem.actions.getFile(fileName)
    if ($file) {
      const $fileState = $file.focus("state")
      const fileState = $fileState.value

      switch (fileState.case) {
        case "HasNotStartedYet": {
          return load($file)
        }
        case "Loading": {
          return $file
        }
        case "Resolved": {
          return $file
        }
      }
    } else {
      const $file = QspFile.create(fileName)
      $fileSystem.actions.setFile($file)
      return load($file)
    }
  }
}
