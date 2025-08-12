import { clearTracking, Link, Sub } from './system'

export let activeSub: Sub | undefined = undefined

export function setActiveSub(sub: Sub | undefined) {
    activeSub = sub
}

export class ReactiveEffect {
    fn: Function
    deps: Link | undefined
    depsTail: Link | undefined
    tracking: boolean = false

    constructor(fn: Function) {
        this.fn = fn
    }

    run() {
        // 为了后续可以复用，而不创建新的 link 节点，所以每次执行前都把 depsTail 置空为 undefined
        //  - 起到的是一个标记的作用
        //  - 即如果 deps 和 depsTail 都为 undefined，则说明当前 effect 没有依赖，是第一次执行
        //  - 如果 deps 存在但是 depsTail 为 undefined，则说明不是第一次执行了
        // this.depsTail = undefined
        startTrack(this)

        // 在将当前的 effect 赋值给 activeSub 之前，先将前一个 activeSub 保存起来
        const prev = activeSub

        setActiveSub(this)

        try {
            return this.fn()
        } finally {
            // 正常来说 depsTail 的 nextDep 是 undefined，如果存在就表示分支切换时，有需需要废弃的依赖，需要清除掉
            endTrack(this)

            // 恢复之前的 activeSub
            setActiveSub(prev)
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

/**
 * 开始追踪依赖
 */
export function startTrack(sub: Sub) {
    sub.tracking = true
    sub.depsTail = undefined
}

/**
 * 结束追踪依赖
 * @description 移除在新的 effect 函数执行时，不需要的旧依赖
 */
export function endTrack(sub: Sub) {
    sub.tracking = false
    const depsTail = sub.depsTail

    /**
     * * 清除 dep 则是清除对应的 link 节点
     * 情况一：depsTail 有且 nextDep 存在，则说明有需要废弃的依赖，需要清除掉
     * 情况二：依赖追踪完成之后 depsTail 为 undefined
     *  - 比如：
     *      1. count 一开始是 0，会执行 effect。
     *      2. 再次改变 name，此时 count 已经大于 0，则执行 effect 时，就不会在走到依赖 name 的地方，此时虽然因为重新执行 depsTail 还是 undefined，但是头结点是存在的，则会清除头结点(此处就是 name 依赖)。
     *      3. 然后因为 name 已经被清理，name 后续在改变，就不会再次触发 effect。
     * let count = 0;
     * effect(() => {
     *     if(count > 0) return;
     *     count++;
     *
     *     console.log(name.value)
     * })
     */
    if (depsTail) {
        if (depsTail.nextDep) {
            // console.log('移除依赖', depsTail.nextDep)
            clearTracking(depsTail.nextDep as unknown as Link)
            depsTail.nextDep = undefined
        }
    } else if (sub.deps) {
        // console.log('移除头节点依赖', sub.deps)
        clearTracking(sub.deps)
        sub.deps = undefined
    }
}
