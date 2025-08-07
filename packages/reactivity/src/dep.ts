import { activeSub } from './effect'
import { link, Link, propagate } from './system'

const targetMap = new WeakMap()

export function track(target: object, key: string | symbol) {
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

export function trigger(target: object, key: string | symbol) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return

    const deps = depsMap.get(key)
    if (!deps) return

    propagate(deps)
}

export class Dep {
    // 订阅者链表的头结点
    subs: Link | undefined
    // 订阅者链接的尾节点
    subsTail: Link | undefined

    constructor() {}
}
