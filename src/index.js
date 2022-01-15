import htm from '../node_modules/htm/dist/htm.mjs'
import sube, { observable } from '../node_modules/sube/sube.js'
import swap from '../node_modules/swapdom/swap-inflate.js'
import { prop as attr } from '../node_modules/element-props/element-props.js'

export const _static = Symbol()

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


const TEXT = 3, ELEM = 1, ATTR = 2, COMM = 8, FRAG = 11, COMP = 6

const cache = new WeakSet,
      ctx = {init:false},
      doc=document,
      h = hyperscript.bind(ctx),
      flat = (children) => {
        let out = [], i = 0, item
        for (; i < children.length;)
          if ((item = children[i++]) != null)
            // .values is common for NodeList / Array indicator (.forEach is used by rxjs, iterator is by string)
            if (item.values) for (item of item) out.push(item)
            else if (!observable(item)) out.push(item)
        return out
      }

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
  else tag[Symbol.dispose]?.()

  // apply props
  let unsub = [], subs = [], i, child, name, value, s, v, match
  for (name in props) {
    value = props[name]
    // classname can contain these casted literals
    if (typeof value === 'string') value = value.replace(/\b(false|null|undefined)\b/g,'')

    // primitive is more probable also less expensive than observable check
    if (observable(value)) unsub.push(sube(value, v => attr(tag, name, v)))
    else if (typeof value !== 'string' && name === 'style') {
      for (s in value) {
        if (observable(v=value[s])) unsub.push(sube(v, v => tag.style.setProperty(s, v)))
        else if (match = v.match(/(.*)\W+!important\W*$/)) tag.style.setProperty(s, match[1], 'important')
        else tag.style.setProperty(s, v)
      }
    }
    else attr(tag, name, value)
  }

  // detect observables
  for (i = 0; i < children.length; i++)
    if (child = children[i])
      // static nodes (cached by HTM) must be cloned, because h is not called for them more than once
      if (child[_static]) (children[i] = child.cloneNode(true))
      else if (observable(child)) subs[i] = child, child = new Text


  // append shortcut
  if (!tag.childNodes.length) tag.append(...flat(children))
  else swap(tag, tag.childNodes, flat(children))

  if (subs.length) unsub.push(...subs.map((sub, i) => sube(sub, child => (
    children[i] = child,
    swap(tag, tag.childNodes, flat(children))
  ))))

  if (unsub.length) tag[Symbol.dispose] = () => unsub.map( fn => fn.call ? fn() : fn.unsubscribe() )

  return tag
}
