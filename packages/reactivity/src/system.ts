import type { ReactiveEffect } from './effect'
import type { RefImpl } from './ref'

// 依赖实例
//  - 即当前 ref/reactive/... 的订阅者是哪个 effect
export interface Dep {
    // 订阅者链表的头结点
    subs: Link | undefined
    // 订阅者链接的尾节点
    subsTail: Link | undefined
}

// 订阅者实例
//  -  即当前 effect 的依赖项是哪个 ref/reactive/...
export interface Sub {
    deps: Link | undefined
    depsTail: Link | undefined
}

export interface Link {
    // 订阅者(即effect)-双向
    sub: Sub
    nextSub: Link | undefined
    prevSub: Link | undefined
    // 依赖实例(如ref reactive)-单向
    dep: Dep
    nextDep: Dep | undefined
}

/**
 * 将 effect 函数添加到 ref 的订阅者中
 * @param dep ref 实例
 * @param sub effect 函数
 */
export function link(dep: RefImpl, sub: ReactiveEffect) {
    /* // 在此处进行检测，如果 dep(ref/reactive...) 已经和 sub(effect) 存在关联关系了，则不在创建新的 link
    const currentDeps = sub.depsTail
    // 如果当前 sub(effect) 的尾部依赖为空，且头部依赖存在，则表示当前 sub(effect) 已经和 dep(ref/reactive...) 存在关联关系了
    // Tips: 在 effect 的执行 fn 前，会将 sub.depsTail 置为空，来作为标志
    if (currentDeps === undefined && sub.deps) {
        // 检测当前 sub(effect) 的头部依赖是否为 dep(ref/reactive...)
        if (sub.deps.dep === dep) {
            // 如果存在，则直接返回，且恢复 sub.depsTail 的值
            sub.depsTail = sub.deps
            return
        }
    } */

    const nextDep = sub.depsTail === undefined ? sub.deps : sub.depsTail.nextDep
    // @ts-ignore
    if (nextDep && nextDep.dep === dep) {
        // @ts-ignore
        sub.depsTail = nextDep
        return
    }

    // 构建一个新的链接节点
    const newLink: Link = {
        sub,
        nextSub: undefined,
        prevSub: undefined,
        dep: dep,
        nextDep: undefined
    }

    // 检测是否存在尾节点
    if (!dep.subsTail) {
        // 1. 不存在在则加入头结点，且头尾节点相同
        dep.subs = newLink
        dep.subsTail = newLink
    } else {
        // 2. 如果有尾节点，则在当前 ref 的尾部节点进行添加
        //  - 即将当前old尾部节点作为新节点的上一个节点，新节点作为当前old尾部节点的下一个节点
        dep.subsTail.nextSub = newLink
        newLink.prevSub = dep.subsTail
        // 并且将当前新节点作为ref中的新的尾节点
        dep.subsTail = newLink
    }

    // 如果 sub(effect) 的头部和尾部依赖都是空，则表示是第一次需要建立关联关系
    if (!sub.depsTail) {
        sub.deps = newLink
        sub.depsTail = newLink
    } else {
        // @ts-ignore
        sub.depsTail.nextDep = newLink
        sub.depsTail = newLink
    }
}

/**
 * 传播依赖-即执行
 * @param dep ref 实例
 */
export function propagate(dep: RefImpl) {
    // 最开始先提取头结点
    let link = dep.subs
    // 创建一个队列，用于待执行的 effect
    const queueEffect: ReactiveEffect[] = []
    // 遍历订阅者-直到最后一个尾节点
    while (link) {
        queueEffect.push(link.sub as ReactiveEffect)
        // 将当前节点指向下一个节点
        link = link.nextSub
    }
    // 遍历执行 effect
    queueEffect.forEach(effect => effect.notify())
}
