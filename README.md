# hyperf [![test](https://github.com/spectjs/hyperf/actions/workflows/test.yml/badge.svg)](https://github.com/spectjs/hyperf/actions/workflows/test.yml) [![npm version](https://img.shields.io/npm/v/hyperf)](http://npmjs.org/hyperf)

> Hypertext fragments builder with reactivity. (Printf for HTM).

#### _``const el = h`...content` ``_

Create hypertext fragment via tagged literal with [htm](https://github.com/htm) syntax support.<br/>
Allows reactive fields: _Promise_, _AsyncIterable_, _Observable_ etc., see [sube](https://github.com/spectjs/sube).

```js
import h from './hyperf.js'
import v from './value-ref.js'

const text = v('foo') // reactive value

const a = h`<a>${ text }</a>`
// <a>foo</a>

text.value = 'bar'
// <a>bar</a>

const frag = h`<x ...${{x: 1}}>1</x><y>2</y>`

h`<${a}>${ frag }</a>` // update node
// <a><x x="1">1</x><y>2</y></a>

// to unsubscribe, just clean up refs to params
text = null
```

### JSX

To use _hyperf_ as JSX, just provide directive for your builder (webpack or esbuild):

```jsx
import h from 'hyperf' /* jsx h */

const a1 = <a>...</a>
const a2 = <a>{ rxSubject } or { asyncIterable } or { promise }</a>

h(a, a2) // render/update
```

## Limitation

* Fragments cannot include observables ([#1](https://github.com/spectjs/hyperf/issues/1)), like `<>{ rxSubject } or { asyncIterable } or { promise }</>`. For that purpose use shallow nodes `<div>{ rxSubject } or { asyncIterable } or { promise }</div>`

## Refs

[lit-html](https://ghub.io/lit-html), [htm](https://ghub.io/htm), [htl](https://ghub.io/htl), [hyperscript](https://ghub.io/hyperscript), [incremental-dom](https://ghub.io/incremental-dom), [snabbdom](https://ghub.io/snabbdom), [nanomorph](https://ghub.io/nanomorph), [uhtml](https://ghub.io/uhtml) and others.

<p align="center">ॐ</p>
