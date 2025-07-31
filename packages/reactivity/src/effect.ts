export let activeSub: any

export function effect(fn: Function) {
    activeSub = fn
    fn()
    activeSub = null
}
