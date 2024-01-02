# hyperf [![test](https://github.com/spectjs/hyperf/actions/workflows/test.yml/badge.svg)](https://github.com/spectjs/hyperf/actions/workflows/test.yml) [![npm version](https://img.shields.io/npm/v/hyperf)](http://npmjs.org/hyperf) [![size](https://img.shields.io/bundlephobia/minzip/hyperf?label=size)](https://bundlephobia.com/result?p=hyperf)

> Fast & tiny elements / fragments builder with reactivity support.

#### _``const el = h`<div foo=${foo}>${bar}</div>` ``_

Create an element (or document fragment) via [htm](https://github.com/developit/htm) tagged literal.<br/>
Fields allow static values, async _Promise_, _Thenable_ or reactives _AsyncIterable_, _Observable_, _Signal_, see [sube](https://github.com/spectjs/sube).

```js
import h from './hyperf.js'
import { signal } from '@preact/signals'

const text = signal('foo')

const a = h`<a>${ text }</a>`
// <a>foo</a>

text.value = 'bar'
// <a>bar</a>

const frag = h`<x ...${{x: 1}}>1</x><y>2</y>`

a.append(frag)
// <a><x x="1">1</x><y>2</y></a>

text = null // cleanup refs/observables
```

#### _``const el = h(tag, attrs, ...content) ``_

[Hyperscript](https://github.com/hyperhype/hyperscript) syntax support. To enable JSX just provide a directive for your builder (webpack or esbuild):

```jsx
import React from 'hyperf'

const a1 = <a>...</a>
const a2 = <a>Content: { value }</a>

document.querySelector('#container').append(a1, a2)
```

## Refs

[jsx-dom](https://github.com/alex-kinokon/jsx-dom), [lit-html](https://ghub.io/lit-html), [htm](https://ghub.io/htm), [htl](https://ghub.io/htl), [hyperscript](https://ghub.io/hyperscript), [incremental-dom](https://ghub.io/incremental-dom), [snabbdom](https://ghub.io/snabbdom), [nanomorph](https://ghub.io/nanomorph), [uhtml](https://ghub.io/uhtml), [uele](https://github.com/kethan/uele), [bruh](https://github.com/Technical-Source/bruh), [document-persistent-fragment](https://www.npmjs.com/package/document-persistent-fragment), [doma](https://github.com/fregante/doma), [mini-jsx](https://github.com/remcohaszing/mini-jsx) and others.


<p align="center">ॐ</p>
