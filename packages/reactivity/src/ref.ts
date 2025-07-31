import { activeSub } from './effect'

enum ReactiveEnum {
    IS_REF = '__v_isRef'
}

/**
 * Ref 的实现类
 */
class RefImpl {
    private _value: any;
    [ReactiveEnum.IS_REF]: boolean = true
    subs: any = null
    constructor(value: any) {
        this._value = value
    }

    get value() {
        console.log('get value')
        if (activeSub) {
            this.subs = activeSub
        }
        return this._value
    }

    set value(newValue) {
        console.log('set value')
        this._value = newValue
        this.subs && this.subs()
    }
}

export function ref(value: any) {
    return new RefImpl(value)
}

export function isRef(r: any) {
    return !!(r && r[ReactiveEnum.IS_REF])
}
