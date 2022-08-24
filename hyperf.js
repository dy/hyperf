var n=function(t,s,r,e){var u;s[0]=0;for(var h=1;h<s.length;h++){var p=s[h++],a=s[h]?(s[0]|=p?1:2,r[s[h++]]):s[++h];3===p?e[0]=a:4===p?e[1]=Object.assign(e[1]||{},a):5===p?(e[1]=e[1]||{})[s[++h]]=a:6===p?e[1][s[++h]]+=a+"":p?(u=t.apply(a,n(t,a,r,["",null])),e.push(u),a[0]?s[0]|=2:(s[h-2]=0,s[h]=u)):e.push(a);}return e},t=new Map;function htm(s){var r=t.get(this);return r||(r=new Map,t.set(this,r)),(r=n(this,r.get(s)||(r.set(s,r=function(n){for(var t,s,r=1,e="",u="",h=[0],p=function(n){1===r&&(n||(e=e.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?h.push(0,n,e):3===r&&(n||e)?(h.push(3,n,e),r=2):2===r&&"..."===e&&n?h.push(4,n,0):2===r&&e&&!n?h.push(5,0,!0,e):r>=5&&((e||!n&&5===r)&&(h.push(r,0,e,s),r=6),n&&(h.push(r,n,0,s),r=6)),e="";},a=0;a<n.length;a++){a&&(1===r&&p(),p(a));for(var l=0;l<n[a].length;l++)t=n[a][l],1===r?"<"===t?(p(),h=[h],r=3):e+=t:4===r?"--"===e&&">"===t?(r=1,e=""):e=t+e[0]:u?t===u?u="":e+=t:'"'===t||"'"===t?u=t:">"===t?(p(),r=1):r&&("="===t?(r=5,s=e,e=""):"/"===t&&(r<5||">"===n[a][l+1])?(p(),3===r&&(h=h[0]),r=h,(h=h[0]).push(2,0,r),r=0):" "===t||"\t"===t||"\n"===t||"\r"===t?(p(),r=2):e+=t),3===r&&"!--"===e&&(r=4,h=h[0]);}return p(),h}(s)),r),arguments,[])).length>1?r:r[0]}

// lil subscriby (v-less)
Symbol.observable||=Symbol('observable');

// is target observable
const observable = arg => arg && !!(
  arg[Symbol.observable] || arg[Symbol.asyncIterator] ||
  arg.call && arg.set ||
  arg.subscribe || arg.then
  // || arg.mutation && arg._state != null
);

// cleanup subscriptions
// ref: https://v8.dev/features/weak-references
// FIXME: maybe there's smarter way to unsubscribe in weakref, like, wrapping target in weakref?
const registry = new FinalizationRegistry(unsub => unsub.call?.()),

// this thingy must lose target out of context to let gc hit
unsubr = sub => sub && (() => sub.unsubscribe?.());

var sube = (target, next, error, complete, stop, unsub) => target && (
  unsub = unsubr((target[Symbol.observable]?.() || target).subscribe?.( next, error, complete )) ||
  target.set && target.call?.(stop, next) || // observ
  (
    target.then?.(v => (!stop && next(v), complete?.()), error) ||
    (async v => {
      try {
        // FIXME: possible drawback: it will catch error happened in next, not only in iterator
        for await (v of target) { if (stop) return; next(v); }
        complete?.();
      } catch (err) { error?.(err); }
    })()
  ) && (_ => stop=1),

  // register autocleanup
  registry.register(target, unsub),
  unsub
);

// inflate version of differ, ~260b
// + no sets / maps used
// + prepend/append/remove/clear short paths
// + a can be live childNodes/HTMLCollection

const swap = (parent, a, b, end = null) => {
  let i = 0, cur, next, bi, n = b.length, m = a.length, { remove, same, insert, replace } = swap;

  // skip head/tail
  while (i < n && i < m && same(a[i], b[i])) i++;
  while (i < n && i < m && same(b[n-1], a[m-1])) end = b[--m, --n];

  // append/prepend/trim shortcuts
  if (i == m) while (i < n) insert(end, b[i++], parent);
  // FIXME: can't use shortcut for childNodes as input
  // if (i == n) while (i < m) parent.removeChild(a[i++])

  else {
    cur = a[i];

    while (i < n) {
      bi = b[i++], next = cur ? cur.nextSibling : end;

      // skip
      if (same(cur, bi)) cur = next;

      // swap / replace
      else if (i < n && same(b[i], next)) (replace(cur, bi, parent), cur = next);

      // insert
      else insert(cur, bi, parent);
    }

    // remove tail
    while (!same(cur, end)) (next = cur.nextSibling, remove(cur, parent), cur = next);
  }

  return b
};

swap.same = (a,b) => a == b;
swap.replace = (a,b, parent) => parent.replaceChild(b, a);
swap.insert = (a,b, parent) => parent.insertBefore(b, a);
swap.remove = (a, parent) => parent.removeChild(a);

// auto-parse pkg in 2 lines (no object/array detection)
const prop = (el, k, v, desc) => (
  k = k.slice(0,2)==='on' ? k.toLowerCase() : k, // onClick → onclick
  // avoid readonly props https://jsperf.com/element-own-props-set/1
  el[k] !== v && (
    !(k in el.constructor.prototype) || !(desc = Object.getOwnPropertyDescriptor(el.constructor.prototype, k)) || desc.set
  ) && (el[k] = v),
  v === false || v == null ? el.removeAttribute(k) :
  typeof v !== 'function' && el.setAttribute(k,
    v === true ? '' :
    typeof v === 'number' || typeof v === 'string' ? v :
    k === 'class' && Array.isArray(v) ? v.filter(Boolean).join(' ') :
    k === 'style' && v.constructor === Object ? (
      k=v, v=Object.values(v), Object.keys(k).map((k,i) => `${k}: ${v[i]};`).join(' ')
    ) : ''
  )
);

const _static = Symbol();

// configure swapper
// FIXME: make same-key morph for faster updates
// FIXME: modifying prev key can also make it faster
// SOURCE: src/diff-inflate.js
// FIXME: avoid insert, replace: do that before
swap.same = (a, b) => a === b || a?.data != null && a?.data === b?.data;
swap.insert = (a, b, parent) => parent.insertBefore(b?.nodeType ? b : new Text(b), a);
swap.replace = (from, to, parent) => to?.nodeType ? parent.replaceChild(to, from) :
    from.nodeType === TEXT ? from.data = to : from.replaceWith(to);


const TEXT = 3;

const cache = new WeakSet,
      ctx = {init:false},
      doc=document,
      h = hyperscript.bind(ctx),
      flat = (children) => {
        let out = [], i = 0, item;
        for (; i < children.length;)
          if ((item = children[i++]) != null)
            // .values is common for NodeList / Array indicator (.forEach is used by rxjs, iterator is by string)
            if (item.values) for (item of item) out.push(item);
            else if (!observable(item)) out.push(item);
        return out
      };

function index (statics) {
  if (!Array.isArray(statics)) return h(...arguments)

  // HTM caches nodes that don't have attr or children fields
  // eg. <a><b>${1}</b></a> - won't cache `a`,`b`, but <a>${1}<b/></a> - will cache `b`
  // for that purpose we first build template with blank fields, marking all fields as tpl
  // NOTE: static nodes caching is bound to htm.this (h) function, so can't substitute it
  // NOTE: we can't use first non-cached call result, because it serves as source for further cloning static nodes
  let result, count = 1;
  if (!cache.has(statics)) count++, cache.add(statics);
  while (count--) {
    ctx.init = count ? true : false;
    // init render may setup observables, which is undesirable - so we skip attributes
    result = htm.apply(h, count ? [statics] : arguments);
  }

  return Array.isArray(result) ? h(doc.createDocumentFragment(), null, ...result) :
        result?.[_static] ? result.cloneNode(true) :
        result?.nodeType ? result :
        new Text(result ?? '')
}

function hyperscript(tag, props, ...children) {
  let {init} = this;

  if (typeof tag === 'string') {
    // hyperscript-compat
    if (/#|\./.test(tag)) {
      let id, cls;
      [tag, id] = tag.split('#');
      if (id) [id, ...cls] = id.split('.');
      else [tag, ...cls] = tag.split('.');
      if (id || cls.length) {
        props ||= {};
        if (id) props.id = id;
        if (cls.length) props.class = cls;
      }
    }
    tag = doc.createElement(tag);

    // shortcut for faster creation, static nodes are really simple
    if (init) {
      tag[_static] = true;
      for (let name in props) prop(tag, name, props[name])
      ;(tag.nodeName === 'TEMPLATE' ? tag.content : tag).append(...flat(children));
      return tag
    }
  }
  // init call is irrelevant for dynamic nodes
  else if (init) return
  else if (typeof tag === 'function') {
    tag = tag({children, ...props});

    // we unwrap single-node children
    if (!Array.isArray(tag)) tag = [tag];

    // FIXME: there's likely a room for optimizing subscription to component results, but how
    if (tag.length > 1) {
      let frag = doc.createDocumentFragment();
      frag.append(...tag.map((node, text) => observable(node) ? (text = new Text(), sube(node, v => text.data=v), text) : node));
      return frag
    }

    [tag] = tag;
    // observable case - just make dynamic node
    if (observable(tag)) {
      let node = new Text();
      sube(tag, value => (node.data = value));
      return node
    }

    // component is complete - no need to post-swap children/props
    return tag
  }

  // apply props
  let subs = [], i, child, name, value, s, v, match;
  for (name in props) {
    value = props[name];
    // classname can contain these casted literals
    if (typeof value === 'string') value = value.replace(/\b(false|null|undefined)\b/g,'');

    // primitive is more probable also less expensive than observable check
    if (observable(value)) sube(value, v => prop(tag, name, v));
    else if (typeof value !== 'string' && name === 'style') {
      for (s in value) {
        if (observable(v=value[s])) sube(v, v => tag.style.setProperty(s, v));
        else if (match = v.match(/(.*)\W+!important\W*$/)) tag.style.setProperty(s, match[1], 'important');
        else tag.style.setProperty(s, v);
      }
    }
    else prop(tag, name, value);
  }

  // detect observables in children
  for (i = 0; i < children.length; i++)
    if (child = children[i])
      // static nodes (cached by HTM) must be cloned, because h is not called for them more than once
      if (child[_static]) children[i] = child.cloneNode(true);
      else if (observable(child)) subs[i] = child, child = new Text;

  // append shortcut
  if (!tag.childNodes.length) (tag.nodeName === 'TEMPLATE' ? tag.content : tag).append(...flat(children));
  else swap(tag, tag.childNodes, flat(children));

  if (subs.length) subs.forEach((sub, i) => sube(sub, child => (
    children[i] = child,
    swap(tag, tag.childNodes, flat(children))
  )));

  return tag
}

export { _static, index as default };
