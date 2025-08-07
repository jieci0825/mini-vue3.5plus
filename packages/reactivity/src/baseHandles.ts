import { hasChange, isObject } from '@my-vue/shared'
import { isRef } from './ref'
import { track, trigger } from './dep'
import { reactive } from './reactive'

export const mutableHandlers: ProxyHandler<object> = {
    get(target, key, receiver) {
        track(target, key)

        const result = Reflect.get(target, key, receiver)

        if (isRef(result)) {
            return result.value
        }

        if (isObject(result)) {
            return reactive(result)
        }

        return result
    },

    set(target, key, newValue, receiver) {
        // @ts-ignore
        const oldValue = target[key]

        const result = Reflect.set(target, key, newValue, receiver)

        // 如果旧值是一个 ref，并且新值不是一个 ref，那么需要同步
        if (isRef(oldValue) && !isRef(newValue)) {
            oldValue.value = newValue
            return result
        }

        if (hasChange(newValue, oldValue)) {
            trigger(target, key)
        }

        return result
    }
}
