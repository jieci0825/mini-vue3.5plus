import { Link } from './system'

export let activeSub: ReactiveEffect | undefined = undefined

export class ReactiveEffect {
    fn: Function
    deps: Link | undefined
    depsTail: Link | undefined
    constructor(fn: Function) {
        this.fn = fn
    }

    run() {
        // 为了后续可以复用，而不创建新的 link 节点，所以每次执行前都把 depsTail 置空为 undefined
        //  - 起到的是一个标记的作用
        //  - 即如果 deps 和 depsTail 都为 undefined，则说明当前 effect 没有依赖，是第一次执行
        //  - 如果 deps 存在但是 depsTail 为 undefined，则说明不是第一次执行了
        this.depsTail = undefined

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

export function effect(fn: Function, options: any = {}) {
    const _effect = new ReactiveEffect(fn)

    Object.assign(_effect, options)

    _effect.run()

    const runner: EffectFunction = _effect.run.bind(_effect)

    runner.effect = _effect

    return runner
}
