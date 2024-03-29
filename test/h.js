import t, { is, ok, any } from '../node_modules/tst/tst.js'
import v from '../node_modules/value-ref/value-ref.js'
import h from '../src/index.js'
// import h, { default as sh } from './libs/h21.js'
// import h, { default as sh } from './libs/h-compact.js'
// import h, { default as sh } from './libs/h-vm.js'
import { tick, frame, idle, time } from '../node_modules/wait-please/index.js'
import observable from './libs/observable.js'



t('h: single attribute', async t => {
  const a = v(0)

  let el = h('div', { a })

  is(el.outerHTML, `<div a="0"></div>`)
  await tick(28)
  is(el.outerHTML, `<div a="0"></div>`)

  a.value = (1)
  await tick(24)
  is(el.outerHTML, `<div a="1"></div>`)

  a.value = (undefined)

  // a[Symbol.dispose](null)
  await tick(24)
  is(el.outerHTML, `<div></div>`)
})

t('h: single attribute on mounted node', async t => {
  const a = v(0)
  let div = document.createElement('div')

  let el = h(div, { a })

  is(el, div)
  is(el.outerHTML, `<div a="0"></div>`)
  await tick(28)
  is(el.outerHTML, `<div a="0"></div>`)

  a.value = (1)
  // FIXME: why so big delay?
  await tick(24)
  is(el.outerHTML, `<div a="1"></div>`)

  a.value = (undefined)
  // a[Symbol.dispose]()
  await tick(24)
  is(el.outerHTML, `<div></div>`)
})

t('h: text content', async t => {
  const a = v(0)

  let el = h('div', {}, a)

  is(el.outerHTML, `<div>0</div>`)
  await tick(8)
  is(el.outerHTML, `<div>0</div>`)

  a.value = (1)
  await tick(8)
  is(el.outerHTML, `<div>1</div>`)

  a.value = (undefined)
  // a[Symbol.dispose]()
  await tick(8)
  is(el.outerHTML, `<div></div>`)
})

t('h: child node', async t => {
  const text = v(0)
  const a = h('a', null, text)
  const b = h('b', null, a)

  is(b.outerHTML, `<b><a>0</a></b>`)

  text.value = (1)
  await tick(8)
  is(b.outerHTML, `<b><a>1</a></b>`)
})

t('h: fragments / text', async t => {
  let a = h(document.createDocumentFragment(), null, `foo`, [`bar`])
  is(a.textContent, 'foobar')
  // let el2 = h(null, null, `foo`, [`bar`])
  // is(el2.textContent, 'foobar')
})

t('h: mixed static content', async t => {
  const foo = h('foo')
  const bar = `bar`
  const baz = h('baz')

  const a = h('a', null, ' ', foo, ' ', bar, ' ', baz, ' ')

  is(a.outerHTML, `<a> <foo></foo> bar <baz></baz> </a>`)
  await tick(28)
  is(a.outerHTML, `<a> <foo></foo> bar <baz></baz> </a>`)
})

t('h: dynamic list', async t => {
  const foo = h('foo')
  const bar = `bar`
  const baz = h('baz')
  const content = v()
  content.value = ([foo, bar, baz])

  const a = h('a', null, content)
  is(a.outerHTML, `<a><foo></foo>bar<baz></baz></a>`)
  await tick(8)
  is(a.outerHTML, `<a><foo></foo>bar<baz></baz></a>`)

  // content.push(`qux`)
  content.value = ([...content.value, `qux`])
  await tick(8)
  is(a.outerHTML, `<a><foo></foo>bar<baz></baz>qux</a>`)

  content.value = [...content.value.slice(1)]
  await tick(8)
  is(a.outerHTML, `<a>bar<baz></baz>qux</a>`)

  content.value = []
  await tick(8)
  is(a.outerHTML, `<a></a>`)

  content.value = [...content.value, 'x']
  is(a.outerHTML, `<a>x</a>`)
})

t('h: 2-level fragment', async t => {
  let w = h('x', null, ' ', h('y', null, ' '), ' ')
  is(w.outerHTML, `<x> <y> </y> </x>`)
  await tick(28)
  is(w.outerHTML, `<x> <y> </y> </x>`)
})

t('h: mount to another element', async t => {
  const a = h('a')
  const c = v(0)
  const b = h(a, null, c)

  is(a, b)
  is(b.outerHTML, `<a>0</a>`)
  await tick(8)
  is(b.outerHTML, `<a>0</a>`)
})

t('h: render new children to mounted element', async t => {
  let a = document.createElement('a')
  let el = h(a, null, 'foo ', h('bar', null, h('baz', { class: 'qux' })))
  is(el.outerHTML, `<a>foo <bar><baz class="qux"></baz></bar></a>`)
})

t('h: simple hydrate', async t => {
  let a = document.createElement('a')
  a.innerHTML = 'foo '
  let el = h(a, null, 'foo ', h('bar', null, h('baz', { class: 'qux' })))
  is(el.outerHTML, `<a>foo <bar><baz class="qux"></baz></bar></a>`)
})

t('h: function renders external component', async t => {
  let el = h('a', null, 'foo ', h(bar))

  function bar() {
    return [h('bar'), h('baz')]
  }
  is(el.outerHTML, `<a>foo <bar></bar><baz></baz></a>`)
})

t('h: rerendering with props: must persist', async t => {
  let el = document.createElement('root')
  let div = document.createElement('div')

  h(el, null, div, h('x'))
  is(el.firstChild, div)
  is(el.childNodes.length, 2)

  h(el, null, h(div), h('x'))
  is(el.firstChild, div)
  is(el.childNodes.length, 2)

  h(el, null, h(div), h('x'))
  is(el.firstChild, div)
  is(el.childNodes.length, 2)

  h(el, null, h('div'), h('x'))
  // is(el.firstChild, div)
  is(el.childNodes.length, 2)
  document.body.appendChild(h(el, null, h('div', { class: 'foo', items: [] }), h('x')))
  // is(el.firstChild, div)
  is(el.childNodes.length, 2)
  is(el.firstChild.className, 'foo')
  is(el.firstChild.items, [])
})

t('h: should not lose attributes', async t => {
  let a = h('tr', { colspan: 2 })
  is(a.getAttribute('colspan'), "2")
})

t('h: reinsert self content', async t => {
  let el = document.createElement('div')
  el.innerHTML = 'a <b>c <d>e <f></f> g</d> h</b> i'

  let childNodes = [...el.childNodes]

  h(el, null, childNodes)

  is(el.outerHTML, `<div>a <b>c <d>e <f></f> g</d> h</b> i</div>`)

  await tick(28)
  is(el.outerHTML, `<div>a <b>c <d>e <f></f> g</d> h</b> i</div>`)
})

t.todo('h: changeable tag preserves/remounts children', async t => {
  let tag = state('a')
  let frag = h('', null, h(tag))
  is(frag.outerHTML, '<><a></a></>')
  await tick(8)
  is(frag.outerHTML, '<><a></a></>')
  tag('b')
  is(frag.outerHTML, '<><a></a></>')
  await tick(8)
  is(frag.outerHTML, '<><b></b></>')
  tag(null)
  await tick(8)
  is(frag.outerHTML, '<></>')
})

t('h: wrapping', async t => {
  let root = document.createElement('div')
  root.innerHTML = '<foo/>'
  let foo = root.firstChild
  foo.x = 1

  let wrapped = h('div', null, h(foo, { class: 'foo' }, h('bar')))

  is(wrapped.outerHTML, '<div><foo class="foo"><bar></bar></foo></div>')
  is(wrapped.firstChild, foo)
  is(wrapped.firstChild.x, 1)
})

t('h: wrapping with children', async t => {
  let root = document.createElement('div')
  root.innerHTML = '<foo><bar></bar><baz></baz></foo>'
  let foo = root.firstChild
  foo.x = 1

  let wrapped = h('div', null, h(foo, { class: 'foo' }, ...foo.childNodes))

  is(wrapped.outerHTML, '<div><foo class="foo"><bar></bar><baz></baz></foo></div>')
  is(wrapped.firstChild, foo)
  is(wrapped.firstChild.x, 1)
})

t('h: input case', async t => {
  let el = h(document.createDocumentFragment(''), null, h('input'))
  is(el.outerHTML, `<><input></>`)
})

t('h: select case', async t => {
  const select = h('select', null, ' ', h('option', { value: 'a' }), ' ')
  let w = h(document.createDocumentFragment(), null, ' ', select, ' ')
  await tick(8)
  is(w.outerHTML, `<> <select> <option value="a"></option> </select> </>`)
})

t('h: promises', async t => {
  let p = new Promise(ok => setTimeout(async () => {
    ok('123')
    await tick(8)
    is(el.outerHTML, '<div>123</div>')
    el.remove()
  }, 50))

  let el = document.createElement('div')
  document.body.appendChild(el)

  h(el, null, p)
  is(el.outerHTML, '<div></div>')

  return p
})

t('h: render to fragment', async t => {
  let frag = document.createDocumentFragment()
  let el = h(frag, null, 1)
  is(frag, el)
  is(el.outerHTML, '<>1</>')
  is(frag.outerHTML, '<>1</>')
})

t('h: observable', async t => {
  let v = observable(1)

  let el = h('div', { x: 1 }, v)

  await tick(8)
  is(el.outerHTML, `<div x="1">1</div>`)
})

t.skip('h: generator', async t => {
  let el = html`<div>${function* ({ }) {
    yield 1
    yield 2
  }}</div>`
  await Promise.resolve().then()
  is(el.outerHTML, `<div>1</div>`)
  await Promise.resolve().then()
  is(el.outerHTML, `<div>2</div>`)
  // await Promise.resolve().then()
  // is(el.outerHTML, `<div>3</div>`)
})

t('h: async generator', async t => {
  let el = h('div', null, (async function* () {
    await tick(4)
    yield 1
    await tick(4)
    yield 2
    await tick(4)
  })())
  await tick(12)
  is(el.outerHTML, `<div>1</div>`)
  await tick(28)
  is(el.outerHTML, `<div>2</div>`)
})

t('h: put data directly to props', async t => {
  let x = {}
  let el = h('div', { x })
  is(el.x, x)
})

t('h: rerender real dom', async t => {
  let virt = h('div')
  let el = document.createElement('div')
  el.innerHTML = '<div></div>'
  let real = el.firstElementChild

  h(el, null, real)
  is(el.outerHTML, '<div><div></div></div>')
  is(el.firstElementChild, real)

  h(el, null, virt)
  // await tick(8)
  is(el.outerHTML, '<div><div></div></div>')
  is(el.firstElementChild, virt)

  h(el, null, virt)
  is(el.outerHTML, '<div><div></div></div>')
  is(el.firstElementChild, virt)

  h(el, null, real)
  is(el.outerHTML, '<div><div></div></div>')
  is(el.firstElementChild, real)

  h(el, null, virt)
  is(el.outerHTML, '<div><div></div></div>')
  is(el.firstElementChild, virt)
})

t('h: preserve rendering target classes/ids/attribs', t => {
  let el = document.createElement('div')
  el.setAttribute('x', 1)
  el.classList.add('x')
  el.id = 'x'
  el.x = '1'

  h(el, { id: 'y', class: 'x z w', w: 2 })

  is(el.outerHTML, `<div x="1" class="x z w" id="y" w="2"></div>`)
  is(el.x, '1')
  is(el.w, 2)
})

t('h: does not duplicate classes for container', t => {
  let el = document.createElement('div')
  el.classList.add('x')
  h(el, { class: 'x' })
  is(el.outerHTML, '<div class="x"></div>')
})

t('h: component props', async t => {
  let log = []
  let el = h(C, { id: 'x', class: 'y z' })

  function C(props) {
    log.push(props.id, props.class)
  }

  is(log, ['x', 'y z'])
})

t.skip('h: observable in class', t => {
  // NOTE: class terms require group observable - too comples for single use-case
  let bar = v('')
  let el = h('div', { class: [false, null, undefined, 'foo', bar] })
  is(el.outerHTML, `<div class="foo "></div>`)
  bar('bar')
  is(el.outerHTML, `<div class="foo bar"></div>`)
})

t('h: falsey prev attrs', t => {
  let el = h(`div`, { hidden: true })
  is(el.hidden, true)
  h(el, { hidden: false })
  is(el.hidden, false)
})

t('h: functional components create element', t => {
  let log = []
  let frag = h(el => {
    let e = document.createElement('a')
    log.push(e)
    return e
  })
  console.log(frag)
  is(frag, log[0])
})

t('h: must not morph inserted nodes', async t => {
  const foo = h('p', null, 'foo')
  const bar = h('p', null, 'bar')

  let el = h('div')

  h(el, null, foo)
  is(el.firstChild, foo, 'keep child')
  is(el.innerHTML, '<p>foo</p>')
  is(foo.outerHTML, '<p>foo</p>')
  is(bar.outerHTML, '<p>bar</p>')
  h(el, null, bar)
  is(el.firstChild, bar, 'keep child')
  is(el.innerHTML, '<p>bar</p>')
  is(foo.outerHTML, '<p>foo</p>')
  is(bar.outerHTML, '<p>bar</p>')
  h(el, null, foo)
  is(el.innerHTML, '<p>foo</p>')
  is(foo.outerHTML, '<p>foo</p>')
  is(bar.outerHTML, '<p>bar</p>')
  h(el, null, bar)
  is(el.innerHTML, '<p>bar</p>')
  is(foo.outerHTML, '<p>foo</p>')
  is(bar.outerHTML, '<p>bar</p>')
})

t('h: update own children', t => {
  let el = h('div', null, 123)
  h(el, null, [...el.childNodes])
  is(el.outerHTML, '<div>123</div>')
  h(el, null, el.childNodes)
  is(el.outerHTML, '<div>123</div>')
  h(el, null, ...el.childNodes)
  is(el.outerHTML, '<div>123</div>')
})

t('h: observable prop child', async t => {
  let obj = v()
  obj.value = ({ x: 1 })
  let el = h('div', null, v.from(obj, obj => obj.x))

  is(el.outerHTML, '<div>1</div>')

  obj.value = ({ x: 2 })
  await tick(8)
  is(el.outerHTML, '<div>2</div>')
})

t('h: null-like insertions', t => {
  let a = h('a', null, null, undefined, false, 0)

  is(a.innerHTML, 'false0')
})

t('h: hydrate by id with existing content', t => {
  let el = document.createElement('div')
  el.innerHTML = '<a></a><b id="x"><x></x></b>'

  let el2 = h(el, null, h('b', { id: 'x' }))
  is(el2, el)
  is(el2.outerHTML, `<div><b id="x"></b></div>`)
})

t.skip('h: direct children', t => {
  // NOTE: this sugar slows down performance, no much sense
  let el1 = h('x', 1)
  is(el1.outerHTML, '<x>1</x>')

  let el2 = h('x', h('y'))
  is(el2.outerHTML, '<x><y></y></x>')

  let el3 = h('x', 'x')
  is(el3.outerHTML, '<x>x</x>')
})

t('h: array component', t => {
  let el = h(() => [1, 2])
  is(el.textContent, '12')
})

t('h: object props preserve internal observables, only high-levels are handled', async t => {
  let props = { x: v(0), y: v({ x: v(1), toString() { } }) }
  let el = h('x', props)
  any(el.outerHTML, [`<x x="0"></x>`, `<x x="0" y=""></x>`])
  is(el.y, props.y.value)
  is(el.x, props.x.value)
  is(el.y.x.value, 1)
})

t('h: caching attr cases', async t => {
  let a = h('a', { x: 1 }, 'a', 6, 'b', 7, 'c')
  is(a.outerHTML, `<a x="1">a6b7c</a>`)
})

t('h: avoid multiple templates for children', async t => {
  let a1 = h('a', null, 'b', 'c')
  let a2 = h('a', null, 'b', 'c', 'd')
  is(a2.outerHTML, `<a>bcd</a>`)
  // console.log(h.cache)
})

t.skip('h: closing component', t => {
  let el = document.createElement('x')
  h`<${el}>1</${el}>`
})

t.skip('h: keyed', t => {
  // NOTE: delegated to strui/list
  let ul = document.createElement('ul')
  let [a1, b1] = h`<${ul}><li id=1>1</li><li>2</li></>`.childNodes
  let [a2, b2] = h`<${ul}><li id=1>1</li><li>2</li></>`.childNodes
  is(a1, a2)
})

t.todo('h#1: component returns observable;', async t => {
  const Fragment = ({ children }) => children;
  let count = v(0);
  let promise = new Promise(ok => ok());

  // // TODO: orig problem:
  // let X = () => new Promise(ok => setTimeout(()=>ok(h(Fragment, null, "hi")), 1000));

  // setInterval(() => {
  //   count.value = Math.random() * 1000;
  // }, 1000);

  // const App = () =>  h(Fragment, null,
  //   h(Fragment, null, "a"),
  //   h(Fragment, null, "b"),
  //   h(Fragment, null, "c"),
  //   count,
  //   h(X, null)
  // );
  // document.body.append( h(App, null));

  // // component returns observable
  console.log('A')
  const A = () => count;
  let a = h(A, null)
  is(a.textContent, `0`)
  count.value = 1
  await tick(10);
  is(a.textContent, `1`)

  // component returns fragment
  console.log('B')
  const B = () => h(Fragment, null, count);
  let b = h(B, null)
  is(b.textContent, `1`)
  count.value = 2
  await tick(10);
  is(b.textContent, `2`)

  // promise doesn't leak
  console.log('C')
  let c = h(Fragment, null, promise)
  is(c.textContent, '')


  // dynamic fragment
  const D = () => h(Fragment, null, count);
  let d = h(D, null)
  is(d.textContent, `2`)
  let frag = h(Fragment, null, 'a', 'b')
  count.value = frag
  await tick(10);
  is(d.textContent, `ab`)

  count.value = 2
  await tick(10);
  is(d.textContent, `2`)

  count.value = frag
  await tick(10);
  is(d.textContent, `ab`)
})

t.todo('h#1.1: async observables resolving to DOM', async t => {
  // orig case
  //   const Fragment = ({ children }) => children;
  //   const TodoItem = async ({ id }) => {
  //     let api = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
  //     let todo = await api.json();

  //     return (
  //       <li>
  //         <span>{todo.title}</span>
  //         <input type="checkbox" checked={todo.completed} />
  //       </li>
  //     );
  //   };

  //   let X = () => Promise.resolve(<div>hi</div>);

  //   const App = () => (
  //     <main>
  //       <X />
  //       <TodoItem id="1" />
  //     </main>
  //   );

  //   document.body.append(<App />);

  let P = () => Promise.resolve(h('b', null, 1))
  let a = h('a', null, h(P))
  is(a.outerHTML, `<a></a>`)
  await tick(10)
  is(a.outerHTML, `<a><b>1</b></a>`)
})
