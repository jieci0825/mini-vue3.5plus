export function isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object'
}

export function isFunction(value: any): value is Function {
    return typeof value === 'function'
}

export function isString(value: any): value is string {
    return typeof value === 'string'
}

export function isNumber(value: any): value is number {
    return typeof value === 'number'
}

export function isBoolean(value: any): value is boolean {
    return typeof value === 'boolean'
}

export function isSymbol(value: any): value is symbol {
    return typeof value === 'symbol'
}
