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

test.skip('hyperscript: unicode selectors', function (t) {
  // is(h('.⛄').outerHTML, '<div class="⛄"></div>')
  is(h('span#⛄').outerHTML, '<span id="⛄"></span>')
})
