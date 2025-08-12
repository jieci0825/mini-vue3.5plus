import { isFunction } from '@my-vue/shared'
import { ReactiveEnum } from './ref'
import { Dependency, link, Link, Sub } from './system'
import { activeSub, endTrack, setActiveSub, startTrack } from './effect'

export class ComputedRefImpl implements Dependency, Sub {
    public fn: Function // 计算属性的 getter
    private setter: Function // 计算属性的 setter
    private [ReactiveEnum.IS_REF]: boolean = true
    private _value: any // 保存 getter 的返回值

    // Dependency
    public subs: Link | undefined
    public subsTail: Link | undefined

    // Sub
    public deps: Link | undefined
    public depsTail: Link | undefined
    public tracking: boolean = false

    constructor(getter: Function, setter: Function) {
        this.fn = getter
        this.setter = setter
    }

    get value() {
        this.update()

        if (activeSub) {
            link(this, activeSub) // 收集依赖
        }

        return this._value
    }

    set value(newValue) {
        this.setter(newValue)
    }

    update() {
        startTrack(this)

        // 在将当前的 effect 赋值给 activeSub 之前，先将前一个 activeSub 保存起来
        const prev = activeSub

        setActiveSub(this)

        try {
            this._value = this.fn()
        } finally {
            // 正常来说 depsTail 的 nextDep 是 undefined，如果存在就表示分支切换时，有需需要废弃的依赖，需要清除掉
            endTrack(this)

            // 恢复之前的 activeSub
            setActiveSub(prev)
        }
    }
}

interface ComputedOptions {
    get: Function
    set: Function
}

export function computed(getterOrOptions: Function | ComputedOptions) {
    const { getter, setter } = normalizeOptions(getterOrOptions)

    return new ComputedRefImpl(getter, setter)
}

function emptyFn() {}

// 归一化参数
function normalizeOptions(getterOrOptions: Function | ComputedOptions) {
    if (isFunction(getterOrOptions)) {
        return {
            getter: getterOrOptions,
            setter: () => {
                console.log('只读属性~~')
            }
        }
    }

    return {
        getter: getterOrOptions.get || emptyFn,
        setter: getterOrOptions.set || emptyFn
    }
}
