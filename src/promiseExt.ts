export namespace PromiseExt {
  export function wait(ms: number) {
    return new Promise((resolveOuter) => {
      resolveOuter(
        new Promise((resolveInner) => {
          setTimeout(resolveInner, ms)
        }),
      )
    })
  }
}
