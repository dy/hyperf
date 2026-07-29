// node -r ./test/register.cjs bench/index.js
// jsdom numbers are not browser numbers, but relative overhead vs raw DOM in the
// same jsdom is a fair proxy for library-layer cost.
import h from '../src/index.js'
import v from 'value-ref'

const N = 10000

const bench = (name, fn, n = N) => {
  fn(0) // warmup / jit
  const t0 = performance.now()
  for (let i = 1; i < n; i++) fn(i)
  const dt = performance.now() - t0
  console.log(`${name.padEnd(28)} ${(dt / n * 1000).toFixed(2).padStart(8)} µs/op`)
}

console.log('--- create static ---')
bench('hyperf', () => h`<a>a<b><c>c</c></b></a>`)
bench('raw dom', () => {
  let a = document.createElement('a'), b = document.createElement('b'), c = document.createElement('c')
  c.textContent = 'c'; b.append(c); a.append('a', b)
  return a
})
bench('innerHTML', () => {
  const d = document.createElement('div')
  d.innerHTML = '<a>a<b><c>c</c></b></a>'
  return d.firstChild
})

console.log('--- create with 1 field ---')
bench('hyperf', i => h`<a>a<b><c>${i}</c></b></a>`)
bench('raw dom', i => {
  let a = document.createElement('a'), b = document.createElement('b'), c = document.createElement('c')
  c.textContent = i; b.append(c); a.append('a', b)
  return a
})

console.log('--- create with prop field ---')
bench('hyperf', i => h`<a x=${i} class="x y">a</a>`)
bench('raw dom', i => {
  let a = document.createElement('a')
  a.setAttribute('x', i); a.className = 'x y'; a.append('a')
  return a
})

console.log('--- update text (reactive) ---')
{
  const val = v(0)
  const el = h`<a>${val}<b>static</b><c>static</c></a>`
  bench('hyperf 3 children', i => val.value = i)
}
{
  const val = v(0)
  const kids = Array.from({ length: 50 }, (_, i) => `<b>${i}</b>`).join('')
  const el = h([`<a>`, `${kids}</a>`], val)
  bench('hyperf 50 siblings', i => val.value = i)
}
{
  const t = document.createTextNode('0')
  const el = document.createElement('a')
  el.append(t, document.createElement('b'), document.createElement('c'))
  bench('raw dom .data=', i => t.data = i)
}

console.log('--- update prop (reactive) ---')
{
  const val = v(0)
  const el = h`<a x=${val}>a</a>`
  bench('hyperf', i => val.value = i)
  const a = document.createElement('a')
  bench('raw setAttribute', i => a.setAttribute('x', i))
}
