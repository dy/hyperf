import htm from 'xhtm'
import sube, { observable } from 'sube'
import swap from 'swapdom'
import { prop as attr } from 'element-props'

// configure swapper
swap.same = (a, b) => a === b || (a?.data != null && a.data === b?.data)
swap.insert = (a, b, parent) => b != null && parent.insertBefore(b?.nodeType ? b : doc.createTextNode(b), a)
swap.replace = (from, to, parent) => to == null ? from.remove() : to.nodeType ? parent.replaceChild(to, from) :
  from.nodeType === TEXT ? from.data = to : from.replaceWith(to)


const TEXT = 3, ELEM = 1, FRAG = 11
const isPrimitive = value => value !== Object(value)

const doc = document, _ch = Symbol()

// subscribe with element-bound lifetime: closure refs the element only weakly,
// so an unreferenced detached tree is collected and the sub self-disposes on next emit
const watch = (el, target, update) => {
  let ref = new WeakRef(el), unsub = sube(target, v => {
    let el = ref.deref()
    el ? update(el, v) : unsub?.()
  })
}

function flat(children) {
  let out = [], i = 0, item
  for (; i < children.length;)
    if ((item = children[i++]) != null)
      // .values is common for NodeList / Array indicator (.forEach is used by rxjs, iterator is by string)
      if (item.values) for (item of item) out.push(item)
      else out.push(item)
  return out
}

const cache = new WeakMap

export default function html(statics) {
  if (!Array.isArray(statics)) return h(...arguments)

  // no fields - fully static template: build once, clone
  if (statics.length === 1) {
    let node = cache.get(statics)
    if (!node) cache.set(statics, node = toNode(htm.call(h, statics)))
    return node.cloneNode(true)
  }

  return toNode(htm.apply(h, arguments))
}

const toNode = result => Array.isArray(result) ? h(doc.createDocumentFragment(), null, ...result) :
  result?.nodeType ? result : isPrimitive(result) ? doc.createTextNode(result ?? '') : result

function h(tag, props, ...children) {
  if (typeof tag === 'string') tag = tag ? doc.createElement(tag) : doc.createDocumentFragment()
  else if (typeof tag === 'function') {
    tag = tag({ children, ...props })

    if (!tag) return

    // directly element
    if (tag.nodeType === TEXT || tag.nodeType === ELEM || tag.nodeType === FRAG) return tag

    // we unwrap single-node children
    if (!Array.isArray(tag)) {
      if (observable(tag)) return tag
      return h(doc.createDocumentFragment(), null, tag)
    }

    // run result via hyperf
    return h(doc.createDocumentFragment(), null, ...tag)
  }

  // apply props
  for (let name in props) {
    let value = props[name]
    // primitive is more probable also less expensive than observable check
    if (observable(value)) watch(tag, value, (el, v) => attr(el, name, v))
    else if (typeof value !== 'string' && name === 'style') {
      for (let s in value) {
        let v = value[s], match
        if (observable(v)) watch(tag, v, (el, v) => el.style.setProperty(s, v))
        else if (typeof v === 'string' && (match = v.match(/(.*)\W+!important\W*$/))) tag.style.setProperty(s, match[1], 'important')
        else tag.style.setProperty(s, v)
      }
    }
    else attr(tag, name, value)
  }

  if (children.length) {
    children = flat(children)

    // detect observables in children
    let subs
    for (let i = 0, l = children.length, child; i < l; i++)
      if ((child = children[i]) && observable(child)) (subs ||= []).push([child, i]), children[i] = doc.createTextNode('')

    // append shortcut
    if (!tag.childNodes.length) (tag.nodeName === 'TEMPLATE' ? tag.content : tag).append(...children)
    else swap(tag, tag.childNodes, children)

    if (subs) {
      // children state lives on the element, not in closures - see watch
      tag[_ch] = children
      for (let [sub, i] of subs) watch(tag, sub, (el, child) => {
        let children = el[_ch], cur = children[i]
        // primitive into a live text node: no diffing
        if (isPrimitive(child) && cur?.nodeType === TEXT && cur.parentNode) cur.data = child ?? ''

        // NOTE: in some cases fragment is a child of another fragment, we ignore that case
        else children[i] = child, swap(el, el.childNodes, flat(children))
      })
    }
  }
  else tag.innerHTML = ''

  return tag
}
