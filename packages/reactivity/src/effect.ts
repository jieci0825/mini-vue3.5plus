export let activeSub: ReactiveEffect | undefined = undefined

export class ReactiveEffect {
    fn: Function
    constructor(fn: Function) {
        this.fn = fn
    }

    run() {
        // 在将当前的 effect 赋值给 activeSub 之前，先将前一个 activeSub 保存起来
        const prev = activeSub

        activeSub = this

        try {
            return this.fn()
        } finally {
            // 恢复之前的 activeSub
            activeSub = prev
        }
    }

    scheduler() {
        this.run()
    }

    notify() {
        this.scheduler()
    }
}

type EffectFunction = {
    (): any
    effect?: ReactiveEffect
}

export function effect(
    fn: Function,
    options: any = {
        scheduler: undefined
    }
) {
    const _effect = new ReactiveEffect(fn)

    Object.assign(_effect, options)

    _effect.run()

    const runner: EffectFunction = _effect.run.bind(_effect)

    runner.effect = _effect

    return runner
}
