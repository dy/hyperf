import t, {is, ok, not} from 'tst'
import v from 'value-ref'
import h from '../src/index.js'
// import h from './libs/h21.js'
import { tick, frame, idle, time } from 'wait-please'
import observable from './libs/observable.js'
// import { v as iv } from 'ironjs'
import Observable from './libs/zen-observable.js'
import {animationFrame} from './libs/sub-things.js'


t('html: fast simple case', async t => {
  let el = h`<div class=${'hello'} a><h1 id=${'hello'}>Hello</h1><p id=p>${'Hello World'}!</p></div>`
  is(el.outerHTMLClean, `<div class="hello" a=""><h1 id="hello">Hello</h1><p id="p">${'Hello World'}!</p></div>`)
})

t('html: direct attribute case', async t => {
  let el = h`<div a=0 b=${1}/>`
  is(el.outerHTMLClean, `<div a="0" b="1"></div>`, 'simple attr')
})

t('html: multifield attr case', t => {
  let el = h`<div a=a${'b'}c${'d'} class="a ${'b'} c"/>`
  is(el.outerHTMLClean, `<div a="abcd" class="a b c"></div>`, 'multifield')
})

t('html: observable attr', t => {
  // observable name
  let a = v('a'), el
  // let el = h`<div ${a}/>`
  // is(el.outerHTMLClean, `<div a=""></div>`, 'observable name')

  // observable value
  const val = v(0)
  el = h`<div a=${val}></div>`
  is(el.outerHTMLClean, `<div a="0"></div>`, 'observable value')

  val.value = (1)
  is(el.outerHTMLClean, `<div a="1"></div>`, 'changed observable value')

  val.value = (null)
  is(el.outerHTMLClean, `<div></div>`, 'null value')

  val[Symbol.dispose]()
  is(el.outerHTMLClean, `<div></div>`, 'disposed')
})


t('html: observable attr autocleanup', async t => {
  // observable value
  let arr=[], val = {
    subscribe(fn){ fn(0); this.set=fn; return {unsubscribe:()=>arr.push('end')} }
  }

  let el = h`<div a=${val}></div>`
  is(el.outerHTMLClean, `<div a="0"></div>`)

  val.set(1)
  is(el.outerHTMLClean, `<div a="1"></div>`)

  val = null
  is(arr, [])

  if (globalThis.gc) {
    await time(50)
    globalThis.gc()
    await time(50)

    is(arr, ['end'])
  }
})

t('html: single attribute on mounted node', async t => {
  const a = v(0)
  let div = document.createElement('div')

  h`<${div} a=${a}></>`

  // is(el, div)
  is(div.outerHTMLClean, `<div a="0"></div>`)
  await tick(28)
  is(div.outerHTMLClean, `<div a="0"></div>`)

  a.value = 1
  await tick(24)
  is(div.outerHTMLClean, `<div a="1"></div>`)
  a.value = null
  await tick(24)
  is(div.outerHTMLClean, `<div></div>`)
})

t('html: creation perf case', t => {
  for (let i = 0; i < 2; i++) {
    h`<a>a<b><c>${i}</c></b></a>`
  }
  is(h`<a>a<b><c>${0}</c></b></a>`.outerHTMLClean, `<a>a<b><c>0</c></b></a>`)
  is(h`<a>a<b><c>${1}</c></b></a>`.outerHTMLClean, `<a>a<b><c>1</c></b></a>`)
})

t('html: observable text content', async t => {
  const a = v(0)

  let el = h`<div>${ a }</div>`

  is(el.outerHTMLClean, `<div>0</div>`)
  await tick(8)
  is(el.outerHTMLClean, `<div>0</div>`)

  a.value = (1)
  await tick(8)
  is(el.outerHTMLClean, `<div>1</div>`)

  a.value = (undefined)
  await tick(8)
  is(el.outerHTMLClean, `<div></div>`)
})

t('html: child node', async t => {
  const text = v(0)
  const a = h`<a>${ text }</a>`
  const b = h`<b>${ a }</b>`

  is(b.outerHTMLClean, `<b><a>0</a></b>`)
  is(b.firstChild, a, 'b > a')

  text.value = (1)
  await tick(8)
  is(a.outerHTMLClean, `<a>1</a>`)
  is(b.outerHTMLClean, `<b><a>1</a></b>`)
})

t('html: mixed static content', async t => {
  const foo = h`<foo></foo>`
  const bar = `bar`
  const baz = h`<baz/>`

  const a = h`<a> ${foo} ${bar} ${baz} </a>`

  is(a.outerHTMLClean, `<a> <foo></foo> bar <baz></baz> </a>`)
})

t('html: dynamic list', async t => {
  const foo = h`<foo></foo>`
  const bar = `bar`
  const baz = h`<baz/>`
  const content = v([foo, bar, baz])

  const a = h`<a>${ content }</a>`
  is(a.outerHTMLClean, `<a><foo></foo>bar<baz></baz></a>`)
  await tick(8)
  is(a.outerHTMLClean, `<a><foo></foo>bar<baz></baz></a>`)

  content.value = [...content.value, h`qux`]
  console.log('---update')
  await tick(8)
  is(a.outerHTMLClean, `<a><foo></foo>bar<baz></baz>qux</a>`)

  content.value = [...content.value.slice(1)]
  await tick(8)
  is(a.outerHTMLClean, `<a>bar<baz></baz>qux</a>`, 'shift')

  content.value = []
  await tick(8)
  is(a.outerHTMLClean, `<a></a>`)
})

t('html: 2-level fragment', async t => {
  let w = h`<x> <y> </y> </x>`
  is(w.outerHTMLClean, `<x> <y> </y> </x>`)
  await tick(28)
  is(w.outerHTMLClean, `<x> <y> </y> </x>`)
})

t('html: 2-level attribs', async t => {
  let x = v(0)
  let el = h`<a><b x=${x}/></a>`
  is(el.outerHTMLClean, `<a><b x="0"></b></a>`)
})

t('html: mount to another element', async t => {
  const a = document.createElement('a')
  const c = v(0)
  const b = h`<${a}>${ c }</>`

  is(a, b)
  is(a.outerHTMLClean, `<a>0</a>`)
  await tick(8)
  is(b.outerHTMLClean, `<a>0</a>`)
})

t('html: simple hydrate', async t => {
  let a = document.createElement('a')
  a.innerHTML = 'foo '
  let el = h`<${a}>foo <bar><baz class="qux"/></bar></>`
  is(el.outerHTMLClean, `<a>foo <bar><baz class="qux"></baz></bar></a>`)
  is(el.firstChild, a.firstChild)
})

t('html: simple hydrate with insertion', async t => {
  let a = document.createElement('a')
  a.innerHTML = 'foo '
  let el = h`<${a}>foo <bar>${ h`<baz class="qux"/>` }</bar></>`
  is(el.outerHTMLClean, `<a>foo <bar><baz class="qux"></baz></bar></a>`)
  is(el.firstChild, a.firstChild)
})

t('html: function renders external component', async t => {
  let el = h`<a>foo <${bar}/></a><b/>`
  function bar () {
    return h`<bar/><baz/>`
  }
  is(el.outerHTMLClean, `<><a>foo <bar></bar><baz></baz></a><b></b></>`)
  // is(el[1].outerHTMLClean, `<b></b>`)
})

t('html: rerendering with props: must persist', async t => {
  let el = document.createElement('x')
  let div = document.createElement('div')

  h`<${el}>${div}<x/></>`
  is(el.firstChild, div)
  is(el.childNodes.length, 2, 'children number')

  h`<${el}><${div}/><x/></>`
  is(el.firstChild, div)
  is(el.childNodes.length, 2)

  h`<${el}><${div}/><x/></>`
  is(el.firstChild, div)
  is(el.childNodes.length, 2)

  h`<${el}><div/><x/></>`
  // FIXME: this is being cloned by preact
  // is(el.firstChild, div)
  is(el.childNodes.length, 2)

  h`<${el}><div class="foo" items=${[]}/><x/></>`
  // is(el.firstChild, div)
  is(el.childNodes.length, 2)
  is(el.firstChild.className, 'foo')
  is(el.firstChild.items, [])
})

t('html: must not lose attributes', async t => {
  let a = h`<tr colspan=2/>`
  is(a.getAttribute('colspan'), "2")
})

t('html: fragments', async t => {
  let el = h`<foo/><bar/>`
  is(el.outerHTMLClean, `<><foo></foo><bar></bar></>`)

  // let el2 = h`<>foo</>`
  // is(el2.textContent, 'foo')

  let el3 = h`foo`
  is(el3.textContent, 'foo')
})

t('html: templates', async t => {
  let el = h`<template><div>1</div></template>`
  is(el.content.innerHTML, `<div>1</div>`)
  is(el.childNodes.length, 0)
})

t('html: reinsert self content', async t => {
  let el = document.createElement('div')
  el.innerHTML = 'a <b>c <d>e <f></f> g</d> h</b> i'

  let childNodes = [...el.childNodes]

  h`<${el}>${ childNodes }</>`

  is(el.outerHTMLClean, `<div>a <b>c <d>e <f></f> g</d> h</b> i</div>`)

  await tick(28)
  is(el.outerHTMLClean, `<div>a <b>c <d>e <f></f> g</d> h</b> i</div>`)
})

t('html: wrapping', async t => {
  let root = document.createElement('div')
  root.innerHTML = '<foo/>'
  let foo = root.firstChild
  foo.x = 1

  let wrapped = h`<div><${foo} class="foo"><bar/></></div>`

  is(wrapped.outerHTMLClean, '<div><foo class="foo"><bar></bar></foo></div>')
  is(wrapped.firstChild, foo)
  is(wrapped.firstChild.x, 1)
})

t('html: wrapping with children', async t => {
  let root = document.createElement('div')
  root.innerHTML = '<foo><bar></bar><baz></baz></foo>'
  let foo = root.firstChild
  foo.x = 1

  let wrapped = h`<div><${foo} class=foo>${ [...foo.childNodes] }</></div>`

  is(wrapped.outerHTMLClean, '<div><foo class="foo"><bar></bar><baz></baz></foo></div>')
  is(wrapped.firstChild, foo)
  is(wrapped.firstChild.x, 1)
})

t('html: select case', async t => {
  let w = h`<select><option value="a"></option></select>`
  await tick(8)
  is(w.outerHTMLClean, `<select><option value="a"></option></select>`)
})

t('html: promises', async t => {
  let p = new Promise(ok => setTimeout(async () => {
    ok('123')
    await tick(8)
    is(el.outerHTMLClean, '<div>123</div>')
    el.remove()
  }, 50))

  let el = document.createElement('div')
  document.body.appendChild(el)

  h`<${el}>${p}</>`
  is(el.outerHTMLClean, '<div></div>')

  return p
})

t('html: render to fragment', async t => {
  let frag = document.createDocumentFragment()
  let el = h`<${frag}>1</>`
  // is(frag, el)
  is(el.outerHTMLClean, '<>1</>')
  is(frag.outerHTMLClean, '<>1</>')
})

t('html: observable', async t => {
  let v = observable(1)

  let el = h`<div x=1>${v}</div>`

  await tick(8)
  is(el.outerHTMLClean, `<div x="1">1</div>`)
})

t.skip('html: generator', async t => {
  let el = h`<div>${ function* ({}) {
    yield 1
    yield 2
  }}</div>`
  await Promise.resolve().then()
  is(el.outerHTMLClean, `<div>1</div>`)
  await Promise.resolve().then()
  is(el.outerHTMLClean, `<div>2</div>`)
  // await Promise.resolve().then()
  // is(el.outerHTMLClean, `<div>3</div>`)
})

t('html: async generator', async t => {
  let el = h`<div>${(async function* () {
    await tick(10)
    yield 1
    await tick(10)
    yield 2
    await tick(10)
  })()}</div>`
  is(el.outerHTMLClean, `<div></div>`)
  await tick(20)
  is(el.outerHTMLClean, `<div>1</div>`)
  await tick(28)
  is(el.outerHTMLClean, `<div>2</div>`)
})

t('html: put data directly to props', async t => {
  let x = {}
  let el = h`<div x=${x}/>`
  is(el.x, x)
})

t('html: rerender real dom', async t => {
  let virt = h`<div/>`
  let el = document.createElement('div')
  el.innerHTML = '<div></div>'
  let real = el.firstElementChild

  h`<${el}>${real}</>`
  is(el.outerHTMLClean, '<div><div></div></div>')
  is(el.firstElementChild, real)

  h`<${el}>${virt}</>`
  await tick(8)
  is(el.outerHTMLClean, '<div><div></div></div>')
  is(el.firstElementChild, virt)

  h`<${el}>${virt}</>`
  is(el.outerHTMLClean, '<div><div></div></div>')
  is(el.firstElementChild, virt)

  h`<${el}>${real}</>`
  is(el.outerHTMLClean, '<div><div></div></div>')
  is(el.firstElementChild, real)

  h`<${el}>${virt}</>`
  is(el.outerHTMLClean, '<div><div></div></div>')
  is(el.firstElementChild, virt)
})

t('html: preserve rendering target classes/ids/attribs', t => {
  let el = document.createElement('div')
  el.setAttribute('x', 1)
  el.classList.add('x')
  el.id = 'x'
  el.x = '1'

  h`<${el} id="y" class="x z w" w=2/>`

  is(el.outerHTMLClean, `<div x="1" class="x z w" id="y" w="2"></div>`)
  is(el.x, '1')
  is(el.w, '2')
})

t('html: does not duplicate classes for container', t => {
  let el = document.createElement('div')
  el.classList.add('x')
  h`<${el} class=x/>`
  is(el.outerHTMLClean, '<div class="x"></div>')
})

t('html: component static props', async t => {
  let log = []
  let el = h`<div><${C} id="x" class="y z"/></>`

  function C (props) {
    log.push(props.id, props.class)
  }

  is(log, ['x', 'y z'])
})

t('html: classes must recognize false props', t => {
  let el = h`<div class="${false} ${null} ${undefined} ${'foo'} ${false}"/>`
  is(el.outerHTMLClean, `<div class="   foo "></div>`)
})

t('html: preserves hidden attribute / parent', t => {
  let el = document.createElement('div')
  el.innerHTML = '<div hidden></div>'

  let elr = h`<${el.firstChild} class="foo"/>`

  is(elr.outerHTMLClean, '<div hidden="" class="foo"></div>')
  is(el.innerHTML, '<div hidden="" class="foo"></div>')
})

t('html: falsey prev attrs', t => {
  let el = h`<div hidden=${true}/>`
  is(el.hidden, true)
  h`<${el} hidden=${false}/>`
  is(el.hidden, false)
})

t('html: initial content should be morphed/hydrated', t => {
  let el = document.createElement('div')
  el.innerHTML = '<foo></foo><bar></bar>'
  let foo = el.firstChild
  let bar = el.lastChild

  const res = h`<${el}><foo/><bar/></>`

  is(res, el)
  is(el.childNodes.length, 2)
  // is(el.firstChild, foo)
  // is(el.lastChild, bar)

  let foo1 = h`<foo/>`
  h`<${el}>${foo1}<bar/></>`

  // notEqual(el.firstChild, foo)
  // is(el.firstChild, foo1)
  is(el.firstChild, foo1)
  // is(el.lastChild, bar)
})

t('html: newline nodes should have space in between, but not around', t => {
  let el = h` ${'a'} ${'b'} `
  is(el.textContent, ' a b ')
})

t('html: direct component rerendering should keep children', async t => {
  let el = h`<div><${fn}/></div>`
  let abc = el.firstChild

  is(el.outerHTMLClean, '<div><abc></abc></div>')

  h`<${el}><${fn} class="foo"/></>`
  is(el.outerHTMLClean, '<div><abc class="foo"></abc></div>')
  // let abc1 = el.firstChild
  // is(abc1, abc)

  function fn ({children, ...props}) {return h`<abc ...${props}/>` }
})

t('html: functional components create element', t => {
  let log = []
  let el = h`<${el => {
    let e = document.createElement('a')
    log.push(e)
    return e
  }}/>`
  is(log, [el])
})

t('html: must update text content', async t => {
  const foo = h`foo`
  const bar = h`bar`

  let el = h`<div/>`

  h`<${el}>${ foo }</>`
  is(el.textContent, 'foo')
  is(foo.textContent, 'foo')
  is(bar.textContent, 'bar')
  h`<${el}>${ bar }</>`
  is(el.textContent, 'bar')
  is(foo.textContent, 'foo')
  is(bar.textContent, 'bar')
  h`<${el}>${ foo }</>`
  is(el.textContent, 'foo')
  is(foo.textContent, 'foo')
  is(bar.textContent, 'bar')
  h`<${el}>${ bar }</>`
  is(el.textContent, 'bar')
  is(foo.textContent, 'foo')
  is(bar.textContent, 'bar')
})

t('html: must not morph inserted nodes', async t => {
  const foo = h`<p>foo</p>`
  const bar = h`<p>bar</p>`

  let el = h`<div/>`

  h`<${el}>${foo}</>`
  is(el.firstChild, foo, 'keep child')
  is(el.innerHTML, '<p>foo</p>')
  is(foo.outerHTMLClean, '<p>foo</p>')
  is(bar.outerHTMLClean, '<p>bar</p>')
  h`<${el}>${bar}</>`
  is(el.firstChild, bar, 'keep child')
  is(el.innerHTML, '<p>bar</p>')
  is(foo.outerHTMLClean, '<p>foo</p>')
  is(bar.outerHTMLClean, '<p>bar</p>')
  h`<${el}>${foo}</>`
  is(el.innerHTML, '<p>foo</p>')
  is(foo.outerHTMLClean, '<p>foo</p>')
  is(bar.outerHTMLClean, '<p>bar</p>')
  h`<${el}>${bar}</>`
  is(el.innerHTML, '<p>bar</p>')
  is(foo.outerHTMLClean, '<p>foo</p>')
  is(bar.outerHTMLClean, '<p>bar</p>')
})

t('html: update own children', t => {
  let el = h`<div>123</div>`
  h`<${el}>${ el.childNodes }</>`
  is(el.outerHTMLClean, '<div>123</div>')
})

t('html: [legacy] prop', async t => {
  let obj = v(({ x: 1 }))
  let el = h`<div>${ v.from(obj, obj => obj.x) }</div>`

  is(el.outerHTMLClean, '<div>1</div>')

  obj.value = ({x: 2})
  await tick(8)
  is(el.outerHTMLClean, '<div>2</div>')
})

t('html: direct value', async t => {
  let x = h`${1}`
  is(x.nodeType, 3)
})

t('html: insert nodes list', t => {
  let el = document.createElement('div')
  el.innerHTML = '|bar <baz></baz>|'

  let orig = [...el.childNodes]

  h`<${el}><div class="prepended" /> foo ${ el.childNodes } qux <div class="appended" /></>`
  is(el.innerHTML, `<div class="prepended"></div> foo |bar <baz></baz>| qux <div class="appended"></div>`)

  h`<${el}>foo ${ orig } qux</>`
  is(el.innerHTML, `foo |bar <baz></baz>| qux`)

  h`<${el}><div class="prepended" /> foo ${ orig } qux <div class="appended" /></>`
  is(el.innerHTML, `<div class="prepended"></div> foo |bar <baz></baz>| qux <div class="appended"></div>`)
})

t('html: update preserves parent', t => {
  // prepend icons to buttons
  let b = document.body.appendChild(document.createElement('b'))

  h`<${b}><i>${ 1 }</i></>`
  is(b.parentNode, document.body, 'persists parent')
  document.body.removeChild(b)
})

t('html: handle collections', t => {
  // prepend icons to buttons
  let b = document.body.appendChild(document.createElement('button'))
  b.innerHTML = 'Click <span>-</span>'
  b.setAttribute('icon', 'phone_in_talk')
  let content = b.childNodes

  h`<${b}><i class="material-icons">${ b.getAttribute('icon') }</i> ${ content }</>`
  is(b.innerHTML, '<i class="material-icons">phone_in_talk</i> Click <span>-</span>')
  document.body.removeChild(b)
})

t('html: insert self/array of nodes', t => {
  let el = document.createElement('div')
  let a1 = document.createElement('a')
  let a2 = document.createElement('a')
  a1.id = 'x'
  a2.id = 'y'
  h`<${el}>${[ a1, a2 ]}</>`
  is(el.innerHTML, `<a id="x"></a><a id="y"></a>`)
})

t.todo('legacy html: re-rendering inner nodes shouldn\'t trigger mount callback', async t => {
  let log = []
  let $a = h`<div.a><div.b use=${fn}/></>`
  document.body.appendChild($a[0])

  function fn ({ mount }) {
    log.push(0)
    mount(() => {
      log.push(1)
      return () => log.push(2)
    })
  }

  await $a
  is(log, [0, 1])

  $a.h``
  await $a
  is(log, [0, 1, 2])

  $a.h`<div.b use=${fn}/>`
  await $a
  is(log, [0, 1, 2, 0, 1])

  $a.h``
  await $a
  is(log, [0, 1, 2, 0, 1, 2])
})

t.todo('html: nested fragments', t => {
  let el = h`<><a>a</a><b><>b<c/></></b></>`
  is(el.outerHTMLClean, '<><a>a</a><b>b<c></c></b></>')
})

t('html: null-like insertions', t => {
  let a = h`<a>foo ${ null } ${ undefined } ${ false } ${0}</a>`

  is(a.innerHTML, 'foo   false 0')

  let b = h`${ null } ${ undefined } ${ false } ${0}`
  is(b.textContent, '  false 0')
  let c = h``
  is(c.textContent, '')
})

t('html: component siblings', t => {
  let a = h`<x/> ${1}`
  is(a.outerHTMLClean, `<><x></x> 1</>`)
})

t('html: non-observables create flat string', t => {
  let b = h`1 ${2} <${() => 3}/> ${[4, ' ', h`5 ${6}`]}`
  is(b.textContent, `1 2 3 4 5 6`)

  let c = h`1 ${v(2)} 3`
  is(c.textContent, `1 2 3`)
})

t('html: recursion case', t => {
  let el = h`${ [h`<${fn} x=1/>`] }`

  function fn ({x}) {
    return h`x: ${x}`
  }

  is(el.textContent, `x: 1`)
})

t('html: 50+ elements shouldnt invoke recursion', t => {
  let data = Array(100).fill({x:1})

  let el = h`${ data.map(item => h`<${fn} ...${item}/>`) }`

  function fn ({x}) {
    return h`x: ${x}`
  }

  is(el.childNodes[0].textContent, 'x: ')
  ok(el.childNodes.length >= 100, 'many els created')
})

t.skip('html: iron support', t => {
  const noun = iv('world')
  const message = iv(() => `Hello ${noun.v}`)

  let el = h`<x>${v(message)}</x>`
  is(el.outerHTMLClean, `<x>Hello world</x>`)

  noun.v = 'Iron'
  is(el.outerHTMLClean, `<x>Hello Iron</x>`)
})

t('html: empty children should clean up content', t => {
  let a = h`<div><a/><a/></div>`
  is(a.childNodes.length, 2)
  h`<${a}></>`
  is(a.childNodes.length, 0)
})

t('html: caching fields', async t => {
  let a = h`<a x=1 z=${3} ...${{_: 5}}>a${ 6 }b${ 7 }c</a>`
  is(a.outerHTMLClean, `<a x="1" z="3" _="5">a6b7c</a>`)
})

t('html: a#b.c', async t => {
  let el = h`<a#b><c.d/></a><a/>`
  is(el.outerHTMLClean, `<><a id="b"><c class="d"></c></a><a></a></>`)
})

t('html: dynamic data case', async t => {
  let table = document.createElement('table'), data = v([])
  h`<${table}>${ v.from(data, data => data.map(item => h`<tr><td>${ item }</td></tr>`)) }</>`
  is(table.innerHTML, '')

  console.log('---update')
  data.value = ([1])
  is(table.innerHTML, '<tr><td>1</td></tr>')
})

t('html: fields order', async t => {
  is(h`<b> b${2}b <c>c${3}c</c> b${4}b </b>`.outerHTMLClean, `<b> b2b <c>c3c</c> b4b </b>`)
})

t('html: accepts rxjs directly', async t => {
  const foo = new Observable(subscriber => {
    subscriber.next(42);
    setTimeout(()=>subscriber.next(54), 1080)
  });

  let el = h`<div>${ foo }</div>`
  // document.body.appendChild(el)
  await frame(2)
  is(el.outerHTMLClean, `<div>42</div>`)
  // el[Symbol.dispose]()
})

t('html: subscribable-things', async t => {
  let el = document.body.appendChild(h`<div>${animationFrame()}</div>`)
  setTimeout(() => {
    // el[Symbol.dispose]()
  }, 1080)
})

t('html: should not delete element own attribs', t => {
  let div = document.createElement('div')
  div.id = 'a'
  is(h`<${div}/>`.outerHTML, `<div id="a"></div>`)
})

t.skip('html: element should be observable', async t => {
  // NOTE: Observable support is dropped - no much use
  let a = v(1)
  let el = h`<a>${a}</a>`
  let log = []
  v(el)(el => log.push(el.textContent))
  a(2)
  is(log, ['1', '2'])
})
t.skip('html: class components', async t => {
  // doesn't seem like registering web-component is spect's concern
})

t('html: a#b.c etc.', t => {
  is(h`<b#c.d></b>`.outerHTML, `<b id="c" class="d"></b>`)
  is(h`<b#c></b>`.outerHTML, `<b id="c"></b>`)
  is(h`<b.d></b>`.outerHTML, `<b class="d"></b>`)
  is(h`<b.d.e></b>`.outerHTML, `<b class="d e"></b>`)
  is(h`<b#c.d.e></b>`.outerHTML, `<b id="c" class="d e"></b>`)
})

t('html: multiple attr fields', async t => {
  let a = h`<a x=1 y=2 z=${3} w=${4} ...${{_: 5}}>a${ 6 }b${ 7 }c</a>`
  is(a.outerHTMLClean, `<a x="1" y="2" z="3" w="4" _="5">a6b7c</a>`)
})

t('html: non-tr > td elements must persist', async t => {
  let el = document.createElement('tr')
  h`<${el}><td>${1}</td></>`
  is(el.outerHTMLClean, `<tr><td>1</td></tr>`)
})

t('html: tr is ok', async t => {
  is(h`<tr><td>${1}</td></tr>`.tagName, 'TR')
})

t('html: read-only props', async t => {
  let f = h`<form id="x"><button form="x"/></form>`
  is(f.firstChild.getAttribute('form'), 'x')
})

t('html: same-stack call creates new element', t => {
  let c = () => h`<a></a>`
  not(c(), c())

  console.log('---')
  let c2 = () => h`<a>${1}</a><b/>`
  not(c2(), c2())
})

t('html: various-stack htm caching', t => {
  let c1 = () => h`<a>${1}<b/></a>`
  not(c1(), c1())
  let c2 = () => h`<${'x'}/>`
  not(c2(), c2())
  let c3 = () => h`<${'x'}/>`
  not(c3(), c3())
  let c4 = () => h`<${document.createElement('x')}/>`
  not(c4(), c4())
  let c5 = () => h`<x x=${'x'}/>`
  not(c5(), c5())
  let c6 = () => h`<x/>`
  not(c6(), c6())
})

t('html: clildnodes as entry', t => {
  let a = h`<a>123</a>`
  let b = h`<x>${a.childNodes}</x>`
  is(b.outerHTML, `<x>123</x>`)
})

t.todo('html: onClick and onclick - both should work', t => {
  let log = []
  let x = h`<x onClick=${e => log.push('x')}/>`
  let y = h`<y onclick=${e => log.push('y')}/>`
  x.click()
  y.click()
  is(log, ['x','y'])
})

t.todo('html: render to selector', async t=> {
  let x = document.createElement('x')
  x.id = x
  document.body.appendChild(x)
  h`<#x>1</>`

  is(x.textContent, '1')
})

t.todo('html: element exposes internal id refs', async t=> {
  h`<x#x><y#y/></x><w#childNodes/><z#z/>`

  is(x.x, x.firstChild)
  is(x.y, x.firstChild.firstChild)
  is(x.z, x.lastChild)
  is(x.childNodes.length, 3)
})

t('html: set template fields', async t => {
  let el = h`<div x={{x}} onclick="{{ inc() }}"></div>`
  is(el.attributes.x.value, "{{x}}")
  is(el.attributes.onclick.value, "{{ inc() }}")
})
