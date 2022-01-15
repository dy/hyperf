import htm from '../node_modules/htm/dist/htm.mjs'
import sube, { observable } from '../node_modules/sube/sube.js'
import swap from '../node_modules/swapdom/swap-inflate.js'

export const _teardown = Symbol(), _static = Symbol()

Symbol.dispose||=Symbol('dispose')

// configure swapper
// FIXME: make same-key morph for faster updates
// FIXME: modifying prev key can also make it faster
// SOURCE: src/diff-inflate.js
// FIXME: avoid insert, replace: do that before
swap.same = (a, b) => a === b || a?.data != null && a?.data === b?.data
swap.insert = (a, b, parent) => parent.insertBefore(b?.nodeType ? b : new Text(b), a)
swap.replace = (from, to, parent) => to?.nodeType ? parent.replaceChild(to, from) :
    from.nodeType === TEXT ? from.data = to : from.replaceWith(to)

// DOM
const TEXT = 3, ELEM = 1, ATTR = 2, COMM = 8, FRAG = 11, COMP = 6

const cache = new WeakSet,
      ctx = {init:false},
      doc=document

export const h = hyperscript.bind(ctx)

export default function (statics) {
  if (!Array.isArray(statics)) return h(...arguments)

  // HTM caches nodes that don't have attr or children fields
  // eg. <a><b>${1}</b></a> - won't cache `a`,`b`, but <a>${1}<b/></a> - will cache `b`
  // for that purpose we first build template with blank fields, marking all fields as tpl
  // NOTE: static nodes caching is bound to htm.this (h) function, so can't substitute it
  // NOTE: we can't use first non-cached call result, because it serves as source for further cloning static nodes
  let result, count = 1
  if (!cache.has(statics)) count++, cache.add(statics)
  while (count--) {
    ctx.init = count ? true : false
    // init render may setup observables, which is undesirable - so we skip attributes
    result = htm.apply(h, count ? [statics] : arguments)
  }

  return Array.isArray(result) ? h(doc.createDocumentFragment(), null, ...result) :
        result?.[_static] ? result.cloneNode(true) :
        result?.nodeType ? result :
        new Text(result ?? '')
}

function hyperscript(tag, props, ...children) {
  const {init} = this

  if (typeof tag === 'string') {
    // hyperscript-compat
    if (/#|\./.test(tag)) {
      let id, cls
      [tag, id] = tag.split('#')
      if (id) [id, ...cls] = id.split('.')
      else [tag, ...cls] = tag.split('.')
      if (id || cls.length) {
        props ||= {}
        if (id) props.id = id
        if (cls.length) props.class = cls
      }
    }
    tag = doc.createElement(tag)

    // shortcut for faster creation, static nodes are really simple
    if (init) {
      tag[_static] = true
      for (let name in props) attr(tag, name, props[name])
      tag.append(...flat(children))
      return tag
    }
  }
  // init call is irrelevant for dynamic nodes
  else if (init) return
  else if (typeof tag === 'function') {
    tag = tag({children, ...props})
    // FIXME: is there a more elegant way?
    if (Array.isArray(tag)) {
      let frag = doc.createDocumentFragment()
      frag.append(...tag)
      tag = frag
    }
    // component is completed - no need to post-swap children/props
    return tag
  }
  // clean up previous observables
  else if (tag[Symbol.dispose]) tag[Symbol.dispose]()

  // apply props
  let teardown = [], subs, i, child
  for (let name in props) {
    let value = props[name]
    // classname can contain these casted literals
    if (typeof value === 'string') value = value.replace(/\b(false|null|undefined)\b/g,'')

    // primitive is more probable also less expensive than observable check
    if (primitive(value)) attr(tag, name, value)
    else if (observable(value)) teardown.push(sube(value, v => attr(tag, name, v)))
    else if (name === 'style') {
      for (let s in value) {
        let v = value[s]
        if(observable(v)) teardown.push(sube(v, v => tag.style.setProperty(s, v)))
        else {
          let match = v.match(/(.*)\W+!important\W*$/);
          if (match) tag.style.setProperty(s, match[1], 'important')
          else tag.style.setProperty(s, v)
        }
      }
    }
    else attr(tag, name, value)
  }

  // detect observables
  for (i = 0; i < children.length; i++)
    if (child = children[i]) {
      // static nodes (cached by HTM) must be cloned, because h is not called for them more than once
      if (child[_static]) (children[i] = child.cloneNode(true))
      else if (observable(child)) (subs || (subs = []))[i] = child, child = new Text
    }

  // append shortcut
  if (!tag.childNodes.length) tag.append(...flat(children))
  else swap(tag, tag.childNodes, flat(children))

  if (subs) teardown.push(...subs.map((sub, i) => sube(sub, child => (
    children[i] = child,
    swap(tag, tag.childNodes, flat(children))
  ))))

  if (teardown.length) tag[_teardown] = teardown
  tag[Symbol.dispose] = dispose

  return tag
}

function dispose () {if (this[_teardown]) for (let fn of this[_teardown]) fn.call?fn():fn.unsubscribe(); this[_teardown] = null }

const flat = (children) => {
  let out = [], i = 0, item
  for (; i < children.length;) {
    if ((item = children[i++]) != null) {
      if (primitive(item) || item.nodeType) out.push(item)
      else if (item[Symbol.iterator]) for (item of item) out.push(item)
    }
  }
  return out
},

// FIXME: just check !val || typeof val !== 'object'
primitive = (val) =>
  !val ||
  typeof val === 'string' ||
  typeof val === 'boolean' ||
  typeof val === 'number' ||
  (typeof val === 'object' ? (val instanceof RegExp || val instanceof Date) :
  typeof val !== 'function'),

// excerpt from element-props
// FIXME: use element-props
attr = (el, k, v, desc) => (
  el[k] !== v &&
  // avoid readonly props https://jsperf.com/element-own-props-set/1
  (!(k in el.constructor.prototype) || !(desc = Object.getOwnPropertyDescriptor(el.constructor.prototype, k)) || desc.set) &&
    (el[k] = v),
  v === false || v == null ? el.removeAttribute(k) :
  typeof v !== 'function' && el.setAttribute(k,
    v === true ? '' :
    typeof v === 'number' || typeof v === 'string' ? v :
    k === 'class' && Array.isArray(v) ? v.filter(Boolean).join(' ') :
    k === 'style' && v.constructor === Object ?
      (k=v,v=Object.values(v),Object.keys(k).map((k,i) => `${k}: ${v[i]};`).join(' ')) :
    ''
  )
)
