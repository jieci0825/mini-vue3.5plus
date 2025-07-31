import type { RefImpl } from './ref'

export interface Link {
    // 保存 effect
    sub: Function
    nextSub: Link | undefined
    prevSub: Link | undefined
}

/**
 * 将 effect 函数添加到 ref 的订阅者中
 * @param dep ref 实例
 * @param sub effect 函数
 */
export function link(dep: RefImpl, sub: Function) {
    // 构建一个新的链接节点
    const newLink: Link = {
        sub,
        nextSub: undefined,
        prevSub: undefined
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
}

/**
 * 传播依赖-即执行
 * @param dep ref 实例
 */
export function propagate(dep: RefImpl) {
    // 最开始先提取头结点
    let link = dep.subs
    // 创建一个队列，用于待执行的 effect
    const queueEffect: Function[] = []
    // 遍历订阅者-直到最后一个尾节点
    while (link) {
        queueEffect.push(link.sub)
        // 将当前节点指向下一个节点
        link = link.nextSub
    }
    // 遍历执行 effect
    queueEffect.forEach(effect => effect())
}
