type Lens =
    (| {kind: "prop", name: string | number}
    | {kind: "index", value: number}
    | {kind: "option"}
    | {kind: "disc", name: string})[]


type Narrow<T, N> = T extends { kind: N } ? T : never;
type NarrowOption<T> = T extends null ? never : T
type Events = {subscribers: any[], children: any, discriminants: any}
type Match<T, U> = [T] extends [{kind: string}] ? {[P in T["kind"]]: (v: Stayt<T & {kind: P}>) => U} : never
type MapFn<T, U> = [keyof T & number] extends [never] ? never : (v: Stayt<T[keyof T & number]>, i: number) => U

export class Stayt<T>{
    data: any
    events: Events
    lens: Lens
    constructor(data: T, clone?: boolean, events?: any, lens?: Lens){
        this.data = clone ? data : [data]
        this.events = events ? events : {subscribers: [], children: {}, discriminants: {}}
        this.lens = lens ? lens : []
        this.prop = this.prop.bind(this)
        this.option = this.option.bind(this)
        this.if = this.if.bind(this)
        this.disc = this.disc.bind(this)
        this.match = this.match.bind(this)
        this.index = this.index.bind(this)
        this.map = this.map.bind(this)
        this.get = this.get.bind(this)
        this.maybeGet = this.maybeGet.bind(this)
        this.modify = this.modify.bind(this)
        this.subscribe = this.subscribe.bind(this)
        this.unsubscribe = this.unsubscribe.bind(this)
    }

    prop<U extends keyof T & (string | number)>(prop: U): Stayt<T[U]>{
        return _prop(prop)(this as any)
    }

    option(): Stayt<NarrowOption<T>>{
        return _option(this)
    }

    if<U>(f: (state: Stayt<NarrowOption<T>>) => U){
        const value = this.get()
        if(value === null)
            return null
        else
            return f(this.option())
    }

    disc<U extends T[keyof T & "kind"] & string >(disc: U): Stayt<Narrow<T, U>>{
        return _disc(disc)(this as Stayt<any>)
    }

    match<U>(fns: Match<T, U>): U{
        return (fns as any)[(this as any as Stayt<{kind: string}>).get().kind](this)
    }

    index(value: number): Stayt<T[keyof T & number]>{
        return _index(value)(this)
    }

    map<U>(f: MapFn<T, U>): U[]{
        return (this as any as Stayt<any[]>).get().map((_, i) =>
            f((this as any as Stayt<any[]>).index(i), i)
        )
    }

    get(): T{
        return _get(this)
    }

    maybeGet(): {success: T} | null{
        return _maybeGet(this)
    }

    modify(f: (s: T) => T){
        _modify(this, f)
    }

    subscribe(f: (s: T) => unknown){
        _subscribe(this, f)
    }

    unsubscribe(f: (s: T) => unknown){
        _unsubscribe(this, f)
    }
}

const narrowEvents = (events: Events, lens: Lens) => {
    let temp: Events = events;
    lens.forEach(f => {
        if(f.kind === "prop")
            temp = temp.children[f.name]
        else if(f.kind === "index")
            temp = temp.children[f.value]
        else if(f.kind === "disc")
            temp = temp.discriminants[f.name]
    })
    return temp
}

const propMap = new WeakMap()
const _prop = <T extends string | number>(prop: T) => <U>(state: Stayt<{[P in T]: U}>) => {
    let cached = propMap.get(state)
    if(cached === undefined){
        cached = {}
        propMap.set(state, cached)
    }
    else{
        const cached2 = cached[prop]
        if(cached2)
            return cached2 as Stayt<U>
    }
    const events = narrowEvents(state.events, state.lens)
    if(events.children[prop] === undefined)
        events.children[prop] = {subscribers: [], children: {}, discriminants: {}}
    const newStayt: Stayt<U> = new Stayt(
        state.data,
        true,
        state.events,
        state.lens.concat({kind: "prop", name: prop})
    )
    cached[prop] = newStayt
    return newStayt
}

const optionMap = new WeakMap()
const _option = <T>(state: Stayt<T>) => {
    const cached = optionMap.get(state)
    if(cached){
        return cached as Stayt<NarrowOption<T>>
    }
    const newStayt: Stayt<NarrowOption<T>> = new Stayt(
        state.data,
        true,
        state.events,
        state.lens.concat({kind: "option"})
     )
    optionMap.set(state, newStayt)
    return newStayt
}

const discMap = new WeakMap()
const _disc = <T extends string>(disc: T) => <V>(state: Stayt<V & {kind: T}>) => {
    let cached = discMap.get(state)
    if(cached === undefined){
        cached = {}
        discMap.set(state, cached)
    }
    else{
        const cached2 = cached[disc]
        if(cached2)
            return cached2 as Stayt<Narrow<V, T>>
    }
    const events = narrowEvents(state.events, state.lens)
    if(events.discriminants[disc] === undefined)
        events.discriminants[disc] = {subscribers: [], children: {}, discriminants: {}}
    const newStayt: Stayt<Narrow<V, T>> = new Stayt(
        state.data,
        true,
        state.events,
        state.lens.concat({kind: "disc", name: disc})
     )
    cached[disc] = newStayt
    return newStayt
}

const indexMap = new WeakMap()
const _index = (index: number) => <T>(state: Stayt<T>) => {
    let cached = indexMap.get(state)
    if(cached === undefined){
        cached = {}
        indexMap.set(state, cached)
    }
    else{
        const cached2 = cached[index]
        if(cached2)
            return cached2 as Stayt<T[keyof T & number]>
    }
    const events = narrowEvents(state.events, state.lens)
    if(events.children[index] === undefined)
        events.children[index] = {subscribers: [], children: {}, discriminants: {}}
    const newStayt: Stayt<T[keyof T & number]> = new Stayt(
        state.data,
        true,
        state.events,
        state.lens.concat({kind: "index", value: index})
     )
    cached[index] = newStayt
    return newStayt
}

const _get = <T>(state: Stayt<T>) => {
    let temp = state.data[0]
    state.lens.forEach(f => {
        if(f.kind === "prop")
            temp = temp[f.name]
        else if(f.kind === "index")
            temp = temp[f.value]
    })
    return temp as T
}

const _maybeGet = <T>(state: Stayt<T>) => {
    let temp = state.data[0]
    for (const f of state.lens){
        if(f.kind === "prop")
            temp = temp[f.name]
        else if(f.kind === "index")
            temp = temp[f.value]
        else if(f.kind === "option"){
            if(temp === null)
                return null
        }
        else{
            if(f.name !== temp.kind){
                return null
            }
        }
    }
    return {success: temp} as {success: T} | null
}

const _rmodify = <T>(obj: any, lens: Lens, i: number, fn: (s: any) => any ): any =>{
    while(true){
        if(i >= lens.length){
            const old = obj
            const newObj = fn(obj)
            return [newObj, obj !== newObj, old]
        }
        else{
            const f = lens[i]
            if(f.kind === "prop"){
                const [newObj, changed, old] = _rmodify(obj[f.name], lens, i + 1, fn)
                return [{...obj, [f.name]: newObj}, changed, old]
            }
            else if(f.kind === "index"){
                if(f.value < obj.length){
                    const [newObj, changed, old] = _rmodify(obj[f.value], lens, i + 1, fn)
                    return [[...obj.slice(0, f.value), newObj, ...obj.slice(f.value + 1)], changed, old]
                }else
                    return [obj, false]
            }
            else if(f.kind === "option"){
                if(obj === null)
                    return [obj, false]
            }
            else{
                if(obj.kind !== f.name)
                    return [obj, false]
            }
        }
        i++
    }
}

const _modify = <T>(state: Stayt<T>, fn: (s: T) => T) => {
    const [newObj, changed, old] = _rmodify(state.data[0], state.lens, 0, fn)
    if(changed){
        state.data[0] = newObj
        let events = state.events;
        let obj = state.data[0]
        events.subscribers.forEach((s: any) => s(obj))
        state.lens.forEach(f => {
            if(f.kind === "prop"){
                events = events.children[f.name]
                obj = obj[f.name]
                events.subscribers.forEach((s: any) => s(obj))
            }
            else if(f.kind === "index"){
                events = events.children[f.value]
                obj = obj[f.value]
                events.subscribers.forEach((s: any) => s(obj))
            }
            else if(f.kind === "disc"){
                events = events.discriminants[f.name]
                events.subscribers.forEach((s: any) => s(obj))
            }
        })
        if(obj !== undefined)
            notify(narrowEvents(state.events, state.lens), old, obj)
    }
}

const notify = (events: Events, old: any, nw: any) =>{
    for(const key of Object.keys(events.children)){
        if(old && nw){
            const cold = old[key]
            const cnew = nw[key]
            if(cnew !== undefined && cnew !== cold){
                const cevents = events.children[key]
                cevents.subscribers.forEach((s: any) => s(cnew))
                notify(cevents, cold, cnew)
            }
        }
    }
    for(const key of Object.keys(events.discriminants)){
        const cevents = events.discriminants[key]
        if(nw.kind === key)
            notify(cevents, old, nw)
    }
}

const _subscribe = <T>(state: Stayt<T>, f: (s: T) => unknown) =>{
    narrowEvents(state.events, state.lens).subscribers.push(f)
}

const _unsubscribe = <T>(state: Stayt<T>, f: (s: T) => unknown) =>{
    const subs = narrowEvents(state.events, state.lens).subscribers
    subs.splice(subs.findIndex(fn => fn === f), 1)
}