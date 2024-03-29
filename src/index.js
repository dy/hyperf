import htm from 'htm'
import sube, { observable } from 'sube'
import swap from 'swapdom'
import { prop as attr } from 'element-props'

export const _static = Symbol()

// configure swapper
// FIXME: modifying prev key can also make it faster
// FIXME: avoid insert, replace: do that before
swap.same = (a, b) => a === b || (a?.data != null && a.data === b?.data)
swap.insert = (a, b, parent) => b != null && parent.insertBefore(b?.nodeType ? b : doc.createTextNode(b), a)
swap.replace = (from, to, parent) => !to ? from.replace() : to.nodeType ? parent.replaceChild(to, from) :
  from.nodeType === TEXT ? from.data = to : from.replaceWith(to)


const TEXT = 3, ELEM = 1, ATTR = 2, COMM = 8, FRAG = 11, COMP = 6
const isPrimitive = value => value !== Object(value);

const cache = new WeakSet,
  ctx = { _init: false },
  doc = document,
  h = hyperscript.bind(ctx)

function flat(children) {
  let out = [], i = 0, item
  for (; i < children.length;)
    if ((item = children[i++]) != null)
      // .values is common for NodeList / Array indicator (.forEach is used by rxjs, iterator is by string)
      if (item.values) for (item of item) out.push(item)
      else out.push(item)
  return out
}

export default function html(statics) {
  if (!Array.isArray(statics)) return h(...arguments)

  // HTM caches nodes that don't have attr or children fields
  // eg. <a><b>${1}</b></a> - won't cache `a`,`b`, but <a>${1}<b/></a> - will cache `b`
  // for that purpose we first build template with blank fields, marking all fields as tpl
  // NOTE: static nodes caching is bound to htm.this (h) function, so can't substitute it
  // NOTE: we can't use first non-cached call result, because it serves as source for further cloning static nodes
  let result, count = 1
  if (!cache.has(statics)) count++, cache.add(statics)
  while (count--) {
    ctx._init = count ? true : false
    // init render may setup observables, which is undesirable - so we skip attributes
    result = htm.apply(h, count ? [statics] : arguments)
  }

  return Array.isArray(result) ? h(doc.createDocumentFragment(), null, ...result) :
    result?.[_static] ? result.cloneNode(true) :
      result?.nodeType ? result : isPrimitive(result) ? doc.createTextNode(result ?? '') : result
}

function hyperscript(tag, props, ...children) {
  let { _init } = this

  if (typeof tag === 'string') {
    tag = tag ? doc.createElement(tag) : doc.createDocumentFragment()

    // shortcut for faster creation, static nodes are really simple
    if (_init) {
      tag[_static] = true
      for (let name in props) attr(tag, name, props[name])
        ; (tag.nodeName === 'TEMPLATE' ? tag.content : tag).append(...flat(children))
      return null, tag
    }
  }
  // _init call is irrelevant for dynamic nodes
  else if (_init) return null
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
  let subs = [], i, l, child, name, value, s, v, match

  for (name in props) {
    value = props[name]
    // classname can contain these casted literals
    if (typeof value === 'string' && name.startsWith('class')) value = value.replace(/\b(false|null|undefined)\b/g, '')

    // primitive is more probable also less expensive than observable check
    if (observable(value)) sube(value, v => attr(tag, name, v))
    else if (typeof value !== 'string' && name === 'style') {
      for (s in value) {
        if (observable(v = value[s])) sube(v, v => tag.style.setProperty(s, v))
        else if (match = v.match(/(.*)\W+!important\W*$/)) tag.style.setProperty(s, match[1], 'important')
        else tag.style.setProperty(s, v)
      }
    }
    else attr(tag, name, value)
  }

  if (children.length) {
    children = flat(children)

    // detect observables in children
    for (i = 0, l = children.length; i < l; i++) {
      if (child = children[i])
        // static nodes (cached by HTM) must be cloned, because h is not called for them more than once
        if (child[_static]) children[i] = child.cloneNode(true)
        else if (observable(child)) subs[i] = child, children[i] = doc.createTextNode('')
    }

    // append shortcut
    if (!tag.childNodes.length) (tag.nodeName === 'TEMPLATE' ? tag.content : tag).append(...children)
    else swap(tag, tag.childNodes, children)

    if (subs.length) subs.forEach((sub, i) => sube(sub, child => (
      children[i] = child,

      // NOTE: in some cases fragment is a child of another fragment, we ignore that case
      swap(tag, tag.childNodes, flat(children))
    )))
  }
  else tag.innerHTML = ''

  return null, tag
}
