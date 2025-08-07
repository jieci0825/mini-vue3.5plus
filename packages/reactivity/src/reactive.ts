import { isObject } from '@my-vue/shared'
import { mutableHandlers } from './baseHandles'

export function reactive(target: object) {
    return createReactiveObject(target)
}

const reactiveMap = new WeakMap()
const reactiveSet = new WeakSet()

function createReactiveObject(target: object) {
    if (!isObject(target)) {
        return target
    }

    if (reactiveSet.has(target)) {
        return target
    }

    const existingProxy = reactiveMap.get(target)
    if (existingProxy) {
        return existingProxy
    }

    const proxy = new Proxy(target, mutableHandlers)

    reactiveMap.set(target, proxy)

    reactiveSet.add(proxy)

    return proxy
}

export function isReactive(target: any) {
    return reactiveSet.has(target)
}
