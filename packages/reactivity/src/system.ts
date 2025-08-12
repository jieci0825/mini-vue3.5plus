import { ComputedRefImpl } from './computed'
import type { ReactiveEffect } from './effect'

// * linkPool 也是个链表
let linkPool: Link | undefined = undefined

// 依赖实例
//  - 即当前 ref/reactive/... 的订阅者是哪个 effect
export interface Dependency {
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
    tracking: boolean
}

export interface Link {
    // 订阅者(即effect)-双向
    sub: Sub
    nextSub: Link | undefined
    prevSub: Link | undefined
    // 依赖实例(如ref reactive)-单向
    dep: Dependency
    nextDep: Dependency | undefined
}

/**
 * 将 effect 函数添加到 ref 的订阅者中
 * @param dep ref 实例
 * @param sub effect 函数
 */
export function link(dep: Dependency, sub: Sub) {
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

    // 为什么取的是 sub.depsTail.nextDep
    //  - sub.depsTail.nextDep 实际存储的就是一个 Link 节点
    //  - sub.deps 也是一个 Link 节点
    //  - 如果 sub.depsTail 如果是 undefined 的情况：
    //      1. 且如果此时如果 sub.deps 是无值的，则表示是初始化的依赖收集，需要创建新的 Link 节点，则不会进入下面的 if 判断，也就是不会进入复用节点的逻辑，而是走后续的创建新 Link 节点及其给当前 effect 实例绑定和新创建的 Link 节点的关联关系
    //      2. 如果此时 sub.deps 是有值的则表示已经初始化收集依赖完成了，且是修改一个依赖项的值之后，重新触发的 effect 作用域中第一个依赖项，所以此时 sub.deps 存在值，但是 sub.depsTail 是 undefined。 那么就表示只能通过 sub.deps 来和当前 dep(ref/reactive...) 进行比对，来查看是不是同一个 ref。如果是同一个，就因为初始化阶段已经收集过了就不需要再收集了。 而完成复用之后就不需要重新新的 link 了。所以直接退出即可。但是要注意此时还需要把 sub.depsTail 恢复为 sub.deps，因为存在这个 effect 中里面不止用到一个 dep(ref/reactive...) 的情况。 因为每个 dep 都会有一个 link 被保存。如果不恢复，那么后续的其他 dep(ref/reactive...) dep 在这里二次执行 effect 对比中，就一直是和 link1 对比。 那么就无法正确的复用。
    //  - 如果 sub.depsTail 不是 undefined 的情况：
    //      1. 那么就表示已经不是第一个 dep 的对比了，而是后续的 dep 的对比，所以此时需要通过 sub.depsTail.nextDep 来进行对比。
    // * 因此此处能够实现复用 link 节点的本质是，通过link创建双向链表结构，作为初始依赖，而后续则通过单项链接的结构中按照顺序对比，来实现相同的 def 情况来不创建新的 link 节点，从而实现复用。
    // * 而这也就是为什么在执行 effect 之前，需要给 sub.depsTail 赋值为 undefined，这样才不会导致对比 effect 中第一个 dep 的时候，是和当前 effect 中最后一个 dep 进行对比，从而无法正确比对，导致无法复用 link 节点。
    const nextDep = (
        sub.depsTail === undefined ? sub.deps : sub.depsTail.nextDep
    ) as Link | undefined
    if (nextDep && nextDep.dep === dep) {
        sub.depsTail = nextDep
        return
    }

    let newLink: Link
    if (linkPool) {
        // 如果存在复用节点，则将复用节点从 linkPool 中取出
        newLink = linkPool
        // 取用之后，将 linkPool 充值为指向的下一个节点，保证后续复用的顺序正确
        linkPool = linkPool.nextDep as Link | undefined
        newLink.nextDep = nextDep as unknown as Dependency
        newLink.sub = sub
        newLink.dep = dep
    } else {
        // 构建一个新的链接节点
        newLink = {
            sub,
            nextSub: undefined,
            prevSub: undefined,
            dep: dep,
            // 为了解决分支切换导致的遗留依赖问题，在前面没有复用成功的时候，需要将这个没有复用成功的 link 节点设置为 nextDep
            nextDep: nextDep as unknown as Dependency
        }
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
        sub.depsTail.nextDep = newLink as unknown as Dependency
        sub.depsTail = newLink
    }
}

function processComputedUpdate(sub: ComputedRefImpl) {
    sub.update()
    propagate(sub.subs!)
}

/**
 * 传播依赖-即执行
 * @param dep ref 实例
 */
export function propagate(subs: Link) {
    // 最开始先提取头结点
    let link = subs
    // 创建一个队列，用于待执行的 effect
    const queueEffect: ReactiveEffect[] = []
    // 遍历订阅者-直到最后一个尾节点
    while (link) {
        const sub = link.sub
        if (!sub.tracking) {
            // 如果 sub 存在 update 属性，则表示是一个 computed 数据，需要单独处理
            if ('update' in sub) {
                processComputedUpdate(sub as ComputedRefImpl)
            } else {
                // 等于 false 表示 effect 已经执行完成了，此时重新触发式安全的。不会导致无限递归循环
                queueEffect.push(sub as ReactiveEffect)
            }
        }
        // 将当前节点指向下一个节点
        link = link.nextSub!
    }
    // 遍历执行 effect
    queueEffect.forEach(effect => effect.notify())
}

/**
 * 执行清除依赖关系
 */
export function clearTracking(link: Link) {
    while (link) {
        const { sub, prevSub, nextSub, dep, nextDep } = link
        /**
         * - 如果 prevSub 有，则表示当前节点存在上一个节点，我们需要做的就是把当前节点的上一个节点的 nextSub 指向当前节点的下一个节点
         * - 如果没有 prevSub，则说明当前节点是头结点，我们需要做的就是当前 dep(ref/reactive...) 的 subs(头节点) 指向其下一个节点
         */
        if (prevSub) {
            prevSub.nextSub = nextSub
            link.nextDep = undefined
        } else {
            dep.subs = nextSub
        }

        /**
         * - 如果 nextSub 有，则根据上一步的思路做一个相反的行为
         */
        if (nextSub) {
            nextSub.prevSub = prevSub
            link.prevSub = undefined
        } else {
            dep.subsTail = prevSub
        }

        // @ts-ignore
        link.dep = link.sub = undefined
        // 将之前 linkPool 的值赋值给当前 link.nextDep
        link.nextDep = linkPool as any
        // 然后将当前 link 赋值给 linkPool 保持最新的，将这些删除的 link 节点保存起来，以便后续复用
        linkPool = link

        // 继续遍历下一个节点
        link = nextDep as unknown as Link
    }
}
