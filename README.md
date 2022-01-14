# hyperf

> Hypertext fragments builder.

Create hypertext fragments via

#### _`` el = h`...content` ``_

HTML builder with [HTM](https://ghub.io/htm) syntax and reactive fields support: _Promise_, _Async Iterable_, any [Observable](https://github.com/tc39/proposal-observable), [RXjs](https://rxjs-dev.firebaseapp.com/guide/overview), any [observ\*](https://github.com/Raynos/observ) etc.

```jsx
import {h, v} from 'spect'

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
