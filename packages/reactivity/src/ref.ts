import { hasChange, isObject } from '@my-vue/shared'
import { activeSub } from './effect'
import { Dependency, link, Link, propagate } from './system'
import { reactive } from './reactive'

export enum ReactiveEnum {
    IS_REF = '__v_isRef'
}

/**
 * Ref 的实现类
 */
export class RefImpl {
    private _value: any;
    [ReactiveEnum.IS_REF]: boolean = true
    subs: Link | undefined // 订阅者的头结点
    subsTail: Link | undefined // 订阅者的尾结点

    constructor(value: any) {
        this._value = isObject(value) ? reactive(value) : value
    }

    get value() {
        trackRef(this)
        return this._value
    }

    set value(newValue) {
        // 值更新完成之后，触发依赖
        newValue = isObject(newValue) ? reactive(newValue) : newValue

        if (hasChange(this._value, newValue)) {
            triggerRef(this)
        }

        this._value = newValue
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
export function trackRef(dep: Dependency) {
    if (activeSub) {
        link(dep, activeSub)
    }
}
/**
 * 触发 ref 相关的 effect 重新执行
 */
export function triggerRef(dep: Dependency) {
    if (dep.subs) {
        propagate(dep)
    }
}
