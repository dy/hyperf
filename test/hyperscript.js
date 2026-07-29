import h from '../src/index.js'
import test, { is, ok } from '../node_modules/tst/tst.js'
import v from '../node_modules/value-ref/value-ref.min.js'
import o from './libs/observable.js'

test('hyperscript: simple', function (t) {
  is(h('h1').outerHTML, '<h1></h1>')
  is(h('h1', null, 'hello world').outerHTML, '<h1>hello world</h1>')
})

test('hyperscript: nested', function (t) {
  is(h('div', null,
    h('h1', null, 'Title'),
    h('p', null, 'Paragraph')
  ).outerHTML, '<div><h1>Title</h1><p>Paragraph</p></div>')
})

test('hyperscript: arrays for nesting is ok', function (t) {
  is(h('div', null,
    [h('h1', null, 'Title'), h('p', null, 'Paragraph')]
  ).outerHTML, '<div><h1>Title</h1><p>Paragraph</p></div>')
})

test('hyperscript: can use namespace in name', function (t) {
  is(h('myns:mytag').outerHTML, '<myns:mytag></myns:mytag>');
})

test.skip('hyperscript: can use id selector', function (t) {
  is(h('div#frame').outerHTML, '<div id="frame"></div>')
})

test.skip('hyperscript: can use class selector', function (t) {
  is(h('div.panel').outerHTML, '<div class="panel"></div>')
})

test.skip('hyperscript: can default element types', function (t) {
  is(h('.panel').outerHTML, '<div class="panel"></div>')
  is(h('#frame').outerHTML, '<div id="frame"></div>')
})

test('hyperscript: can set properties', function (t) {
  var a = h('a', { href: 'http://google.com' })
  is(a.href, 'http://google.com/')
  var checkbox = h('input', { name: 'yes', type: 'checkbox' })
  is(checkbox.outerHTML, '<input name="yes" type="checkbox">')
})

test('hyperscript: registers event handlers', function (t) {
  h('p', null, 'Paragraph') // pre-cache
  let log = []
  var onClick = () => { log.push('click') }
  var p = h('p', { onclick: onClick }, 'something')
  p.click(p)
  is(log, ['click'])
})

test('hyperscript: sets styles', function (t) {
  var div = h('div', { style: { 'color': 'red' } })
  is(div.style.color, 'red')
})

test('hyperscript: sets styles as text', function (t) {
  var div = h('div', { style: 'color: red' })
  is(div.style.color, 'red')
})

test('hyperscript: sets data attributes', function (t) {
  var div = h('div', { 'data-value': 5 })
  is(div.getAttribute('data-value'), '5') // failing for IE9
})

test('hyperscript: boolean, number, date, regex get to-string\'ed', function (t) {
  var e = h('p', null, true, false, 4, new Date('Mon Jan 15 2001'), /hello/)
  ok(e.outerHTML.match(/<p>truefalse4Mon Jan 15.+2001.*\/hello\/<\/p>/))
})

test('hyperscript: observable content', function (t) {
  var title = o()
  title('Welcome to HyperScript!')
  var h1 = h('h1', null, title)
  is(h1.outerHTML, '<h1>Welcome to HyperScript!</h1>')
  title('Leave, creep!')
  is(h1.outerHTML, '<h1>Leave, creep!</h1>')
})

test('hyperscript: observable property', function (t) {
  var checked = o()
  checked(true)
  var checkbox = h('input', { type: 'checkbox', checked: checked })
  is(checkbox.checked, true)
  checked(false)
  is(checkbox.checked, false)
})

test('hyperscript: observable style', function (t) {
  var color = o()
  color('red')
  var div = h('div', { style: { 'color': color } })
  is(div.style.color, 'red')
  color('blue')
  is(div.style.color, 'blue')
})

test('hyperscript: two observable props update independently', function (t) {
  var p = o(), q = o()
  p(1), q(2)
  var e = h('x', { p: p, q: q })
  is(e.outerHTML, '<x p="1" q="2"></x>')
  p(10)
  is(e.outerHTML, '<x p="10" q="2"></x>')
  q(20)
  is(e.outerHTML, '<x p="10" q="20"></x>')
})

test('hyperscript: two observable styles update independently', function (t) {
  var color = o(), weight = o()
  color('red'), weight('bold')
  var e = h('div', { style: { color: color, 'font-weight': weight } })
  color('blue')
  is(e.style.color, 'blue')
  is(e.style.fontWeight, 'bold')
})

test('hyperscript: numeric style values', function (t) {
  var e = h('a', { style: { opacity: 0.5 } })
  is(e.style.opacity, '0.5')
})

test('hyperscript: string class passes through untouched', function (t) {
  is(h('a', { class: 'is-null my-false-btn x false' }).getAttribute('class'), 'is-null my-false-btn x false')
})

test('hyperscript: array class joins', function (t) {
  is(h('a', { class: ['a', 'b'] }).getAttribute('class'), 'a b')
})

test('hyperscript: observable child swaps between text and element', function (t) {
  var val = o()
  val('m')
  var e = h('a', null, val)
  is(e.outerHTML, '<a>m</a>')
  val(h('b', null, 'el'))
  is(e.outerHTML, '<a><b>el</b></a>')
  val('back')
  is(e.outerHTML, '<a>back</a>')
  val(null)
  is(e.textContent, '')
})

test('hyperscript: observable child updates keep siblings', function (t) {
  var val = o()
  val(0)
  var e = h('a', null, val, h('b', null, 'x'), 'tail')
  is(e.outerHTML, '<a>0<b>x</b>tail</a>')
  val(1)
  is(e.outerHTML, '<a>1<b>x</b>tail</a>')
})

test.skip('hyperscript: unicode selectors', function (t) {
  // is(h('.⛄').outerHTML, '<div class="⛄"></div>')
  is(h('span#⛄').outerHTML, '<span id="⛄"></span>')
})
