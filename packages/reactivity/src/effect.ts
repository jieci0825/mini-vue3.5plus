export let activeSub: ReactiveEffect | undefined = undefined

const effectStack: ReactiveEffect[] = []

export class ReactiveEffect {
    fn: Function
    constructor(fn: Function) {
        this.fn = fn
    }
    run() {
        activeSub = this

        // 为了解决effect嵌套问题，需要将effect放入栈中
        effectStack.push(this)

        try {
            return this.fn()
        } finally {
            // 执行完成之后，删除当前effect
            effectStack.pop()
            // 删除完成之后，如果存在effectStack，则将activeSub指向最后一个effect，不存在则指向undefined
            activeSub = effectStack.length
                ? effectStack[effectStack.length - 1]
                : undefined
        }
    }
}

export function effect(fn: Function) {
    const _effect = new ReactiveEffect(fn)
    _effect.run()
}
