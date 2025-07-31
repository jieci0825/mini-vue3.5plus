import { activeSub } from './effect'

enum ReactiveEnum {
    IS_REF = '__v_isRef'
}

interface Link {
    // 保存 effect
    sub: Function
    nextSub: Link | undefined
    prevSub: Link | undefined
}

/**
 * Ref 的实现类
 */
class RefImpl {
    private _value: any;
    [ReactiveEnum.IS_REF]: boolean = true
    subs: Link | undefined // 订阅者的头结点
    subsTail: Link | undefined // 订阅者的尾结点
    constructor(value: any) {
        this._value = value
    }

    get value() {
        if (activeSub) {
            trackRef(this)
        }
        return this._value
    }

    set value(newValue) {
        // 值更新完成之后，触发依赖
        this._value = newValue

        if (this.subs) {
            triggerRef(this)
        }
    }
}

export function ref(value: any) {
    return new RefImpl(value)
}

export function isRef(r: any) {
    return !!(r && r[ReactiveEnum.IS_REF])
}

/**
 * 收集依赖
 */
export function trackRef(dep: RefImpl) {
    if (activeSub) {
        // 构建一个新的链接节点
        const newLink: Link = {
            sub: activeSub,
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
}

export function triggerRef(dep: RefImpl) {
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
