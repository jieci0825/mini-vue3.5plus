import { isObject } from '@my-vue/shared'
import { link, Link, propagate } from './system'
import { activeSub } from './effect'

export function reactive(target: object) {
    return createReactiveObject(target)
}

const targetMap = new WeakMap()

function createReactiveObject(target: object) {
    if (!isObject(target)) {
        return target
    }

    const proxy = new Proxy(target, {
        get(target, key, receiver) {
            track(target, key)
            return Reflect.get(target, key, receiver)
        },

        set(target, key, value, receiver) {
            const result = Reflect.set(target, key, value, receiver)
            trigger(target, key)
            return result
        }
    })

    return proxy
}

function track(target: object, key: string | symbol) {
    if (!activeSub) return

    let depsMap = targetMap.get(target)
    if (!depsMap) {
        depsMap = new Map()
        targetMap.set(target, depsMap)
    }

    let deps = depsMap.get(key)
    if (!deps) {
        deps = new Dep()
        depsMap.set(key, deps)
    }

    link(deps, activeSub)
}

function trigger(target: object, key: string | symbol) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return

    const deps = depsMap.get(key)
    if (!deps) return

    propagate(deps)
}

class Dep {
    // 订阅者链表的头结点
    subs: Link | undefined
    // 订阅者链接的尾节点
    subsTail: Link | undefined

    constructor() {}
}
