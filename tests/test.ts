import {Stayt, mirror} from '../src/index'

type Data = {object: {kind: "array", array: number[]} | {kind: "tuple", tuple: [string, number]}}

{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const val = state.prop("object").disc("array").prop("array").index(0)

    test('Test get through discriminated union and props', () => expect(val.get()).toBe(5))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const mirr: Stayt<{nested: Data}> = new Stayt({nested: {object: {kind: "array", array: [5]}}})
    mirror(state, mirr.prop("nested"))
    const val = state.prop("object").disc("array").prop("array").index(0)
    val.modify(_ => 6)

    test('Test mirror', () => expect(mirr.prop("nested").prop("object").disc("array").prop("array").index(0).get()).toBe(6))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const mirr: Stayt<{nested: Data}> = new Stayt({nested: {object: {kind: "array", array: [5]}}})
    const handle = mirror(state, mirr.prop("nested"))
    const val = state.prop("object").disc("array").prop("array").index(0)
    state.unsubscribe(handle)
    val.modify(_ => 6)

    test('Test mirror unsubscribe', () => expect(mirr.prop("nested").prop("object").disc("array").prop("array").index(0).get()).toBe(5))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const array = state.prop("object").disc("array").prop("array").index(0)
    array.modify(n => n + 1)

    test('Test modify through discriminated union and props', () => expect(array.get()).toBe(6))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const array = state.prop("object").disc("array").prop("array").index(0)
    let x = array.get()
    array.subscribe(n => x = n)
    array.modify(n => n + 1)
    array.modify(n => n + 1)

    test('Test subscribe', () => expect(x).toBe(7))
}
{
    const state: Stayt<number | null> = new Stayt(5)
    let x = false
    let y = false
    const f = n => {x = n}
    state.subscribeNull(f)
    state.subscribeNull(n => y = n)
    state.modify(n => n + 1)
    state.unsubscribeNull(f)
    state.modify(n => null)

    test('Test subscribeNull', () => expect([x, y]).toStrictEqual([false, true]))
}
{
    const state: Stayt<{x: number | null}> = new Stayt({x: 5})
    const num = state.prop("x")
    let x = false
    let y = false
    const f = n => {x = n}
    num.subscribeNull(f)
    num.subscribeNull(n => y = n)
    state.modify(obj => ({x: obj.x + 1}))
    num.unsubscribeNull(f)
    state.modify(n => ({x: null}))

    test('Test subscribeNull', () => expect([x, y]).toStrictEqual([false, true]))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const array = state.prop("object").disc("array").prop("array").index(0)
    let x = array.get()
    let y = x
    const fn = (n: number) => x = n
    array.subscribe(n => y = n)
    array.subscribe(fn)
    array.modify(n => n + 1)
    array.unsubscribe(fn)
    array.modify(n => n + 1)

    test('Test unsubscribe', () => expect([x, y]).toStrictEqual([6, 7]))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const array = state.prop("object").disc("array").prop("array").index(0)
    const array2 = state.prop("object").disc("array").prop("array").index(0)

    test('Test state cache', () => expect(array).toBe(array2))
}
{
    const state: Stayt<{option: string | null}> = new Stayt({option: "object"})
    const option = state.prop("option").if(v =>
        v.get()
    )

    test('Test if', () => expect(option).toBe("object"))
}
{
    const state: Stayt<{option: string | null}> = new Stayt({option: null})
    const option = state.prop("option").if(v =>
        v.get()
    )

    test('Test if', () => expect(option).toBe(null))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const n = state.prop("object").match({
        "array": x => x.get().array[0],
        "tuple": x => x.get().tuple[1]
    })

    test('Test match', () => expect(n).toBe(5))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "tuple", tuple: ["object", 5]}})
    const n = state.prop("object").match({
        "array": x => x.get().array[0],
        "tuple": x => x.get().tuple[1],
    })

    test('Test match', () => expect(n).toBe(5))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "array", array: [5]}})
    const n = state.prop("object").match({
        "array": x => x.prop("array") as Stayt<(number | string)[]>,
        "tuple": x => x.prop("tuple"),
    }).map(x => x.get().toString())

    test('Test map', () => expect(n).toStrictEqual(["5"]))
}
{
    const state: Stayt<Data> = new Stayt({object: {kind: "tuple", tuple: ["abc", 5]}})
    const n = state.prop("object").match({
        "array": x => x.prop("array") as Stayt<(number | string)[]>,
        "tuple": x => x.prop("tuple"),
    }).map(x => x.get().toString())

    test('Test map', () => expect(n).toStrictEqual(["abc", "5"]))
}
{
    const state = new Stayt({num: 1, str: "abc", bool: true as boolean})
    const num = state.prop("num")
    const str = state.prop("str")
    const bool = state.prop("bool")
    let x = num.get()
    let y = str.get()
    let z = bool.get()
    num.subscribe(v => x = v)
    str.subscribe(v => y = v)
    bool.subscribe(v => z = v)
    state.modify(_ => ({num: 5, str: "", bool: false}))
    test('Test downstream subscribe', () => expect([x, y, z]).toStrictEqual([5, "", false]))
}
{
    const state = new Stayt({num: 1, object: {bool: true as boolean, str: "abc"}})
    const num = state.prop("num")
    const str = state.prop("object").prop("str")
    const bool = state.prop("object").prop("bool")
    let x = num.get()
    let y = str.get()
    let z = bool.get()
    let set = false
    num.subscribe(v => x = v)
    str.subscribe(v => {y = v; set = true})
    bool.subscribe(v => z = v)
    state.modify(_ => ({num: 5, object: {str: "abc", bool: false}}))
    test('Test downstream subscribe', () => expect([x, y, z, set]).toStrictEqual([5, "abc", false, false]))
}
{
    type Test = {tu: {kind: "number", value: number} | {kind: "string", value: string}}
    const state: Stayt<Test> = new Stayt({tu: {kind: "number", value: 2}})
    const tu = state.prop("tu")
    const str = tu.disc("string").prop("value")
    const num = tu.disc("number").prop("value")
    const either = tu.prop("value")
    let x = str.maybeGet()?.success
    let y = num.get()
    let z = either.get()
    str.subscribe(v => x = v)
    num.subscribe(v => y = v)
    either.subscribe(v => z = v)
    tu.modify(_ => ({kind: "string", value: "abc"}))
    test('Test discriminant subscribes', () => expect([x, y, z]).toStrictEqual(["abc", 2, "abc"]))
}
{
    type Test = {tu: {kind: "number", value: number} | {kind: "string", value: string}}
    const state: Stayt<Test> = new Stayt({tu: {kind: "number", value: 2}})
    const tu = state.prop("tu")
    const str = tu.disc("string").prop("value")
    const num = tu.disc("number").prop("value")
    const either = tu.prop("value")
    let x = str.maybeGet()?.success
    let y = num.get()
    let z = either.get()
    str.subscribe(v => x = v)
    num.subscribe(v => y = v)
    either.subscribe(v => z = v)
    const m = tu.modify
    m(_ => ({kind: "string", value: "abc"}))
    test('Test bind', () => expect([x, y, z]).toStrictEqual(["abc", 2, "abc"]))
}