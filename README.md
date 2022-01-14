# hyperf

> Hypertext fragments builder.

#### _`` el = h`...content` ``_

Create hypertext fragment via tagged literal with [htm](https://github.com/htm) syntax support.
Allows reactive fields: _Promise_, _Async Iterable_, any [Observable](https://github.com/tc39/proposal-observable), [RXjs](https://rxjs-dev.firebaseapp.com/guide/overview), any [observ\*](https://github.com/Raynos/observ) etc., see [sube](https://github.com/spectjs/sube).

```jsx
import h from './hyperf.js'
import v from './vref.js'

const text = v('foo') // reactive value (== vue3 ref)
const a = h`<a>${ text }</a>` // <a>foo</a>
text.value = 'bar' // <a>bar</a>

const frag = h`<x ...${{x: 1}}>1</x><y>2</y>`  // htm syntax
h`<${a}>${ frag }</a>` // <a><x x="1">1</x><y>2</y></a>

a[Symbol.dispose]() // destroy observers

/* jsx h */
const a2 = <a>{ rxSubject } or { asyncIterable } or { promise }</a>

h(a, a2) // render/update
```

## Refs

[lit-html](https://ghub.io/lit-html), [htm](https://ghub.io/htm), [htl](https://ghub.io/htl), [hyperscript](https://ghub.io/hyperscript), [incremental-dom](https://ghub.io/incremental-dom), [snabbdom](https://ghub.io/snabbdom), [nanomorph](https://ghub.io/nanomorph), [uhtml](https://ghub.io/uhtml) and others.

<p align="center">ॐ</p>
