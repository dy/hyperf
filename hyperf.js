const FIELD = '\ue000', QUOTES = '\ue001';

function htm (statics) {
  let h = this, prev = 0, current = [null], field = 0, args, name, value, quotes = [], quote = 0, last, level = 0, pre = false;

  const evaluate = (str, parts = [], raw) => {
    let i = 0;
    str = (!raw && str === QUOTES ?
      quotes[quote++].slice(1,-1) :
      str.replace(/\ue001/g, m => quotes[quote++]));

    if (!str) return str
    str.replace(/\ue000/g, (match, idx) => {
      if (idx) parts.push(str.slice(i, idx));
      i = idx + 1;
      return parts.push(arguments[++field])
    });
    if (i < str.length) parts.push(str.slice(i));
    return parts.length > 1 ? parts : parts[0]
  };

  // close level
  const up = () => {
    // console.log('-level', current);
    [current, last, ...args] = current;
    current.push(h(last, ...args));
    if (pre === level--) pre = false; // reset <pre>
  };

  let str = statics
    .join(FIELD)
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<!\[CDATA\[[^]*\]\]>/g, '')
    .replace(/('|")[^\1]*?\1/g, match => (quotes.push(match), QUOTES));

    // ...>text<... sequence
  str.replace(/(?:^|>)((?:[^<]|<[^\w\ue000\/?!>])*)(?:$|<)/g, (match, text, idx, str) => {
    let tag, close;

    if (idx) {
      str.slice(prev, idx)
        // <abc/> → <abc />
        .replace(/(\S)\/$/, '$1 /')
        .split(/\s+/)
        .map((part, i) => {
          // </tag>, </> .../>
          if (part[0] === '/') {
            part = part.slice(1);
            // ignore duplicate empty closers </input>
            if (EMPTY[part]) return
            // ignore pairing self-closing tags
            close = tag || part || 1;
            // skip </input>
          }
          // <tag
          else if (!i) {
            tag = evaluate(part);
            // <p>abc<p>def, <tr><td>x<tr>
            if (typeof tag === 'string') { tag = tag.toLowerCase(); while (CLOSE[current[1]+tag]) up(); }
            current = [current, tag, null];
            level++;
            if (!pre && PRE[tag]) pre = level;
            // console.log('+level', tag)
            if (EMPTY[tag]) close = tag;
          }
          // attr=...
          else if (part) {
            let props = current[2] || (current[2] = {});
            if (part.slice(0, 3) === '...') {
              Object.assign(props, arguments[++field]);
            }
            else {
              [name, value] = part.split('=');
              Array.isArray(value = props[evaluate(name)] = value ? evaluate(value) : true) &&
              // if prop value is array - make sure it serializes as string without csv
              (value.toString = value.join.bind(value, ''));
            }
          }
        });
    }

    if (close) {
      if (!current[0]) err(`Wrong close tag \`${close}\``);
      up();
      // if last child is optionally closable - close it too
      while (last !== close && CLOSE[last]) up();
    }
    prev = idx + match.length;

    // fix text indentation
    if (!pre) text = text.replace(/\s*\n\s*/g,'').replace(/\s+/g, ' ');

    if (text) evaluate((last = 0, text), current, true);
  });

  if (current[0] && CLOSE[current[1]]) up();

  if (level) err(`Unclosed \`${current[1]}\`.`);

  return current.length < 3 ? current[1] : (current.shift(), current)
}

const err = (msg) => { throw SyntaxError(msg) };

// self-closing elements
const EMPTY = htm.empty = {};

// optional closing elements
const CLOSE = htm.close = {};

// preformatted text elements
const PRE = htm.pre = {};

'area base br col command embed hr img input keygen link meta param source track wbr ! !doctype ? ?xml'.split(' ').map(v => htm.empty[v] = true);

// https://html.spec.whatwg.org/multipage/syntax.html#optional-tags
// closed by the corresponding tag or end of parent content
let close = {
  'li': '',
  'dt': 'dd',
  'dd': 'dt',
  'p': 'address article aside blockquote details div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol pre section table',
  'rt': 'rp',
  'rp': 'rt',
  'optgroup': '',
  'option': 'optgroup',
  'caption': 'tbody thead tfoot tr colgroup',
  'colgroup': 'thead tbody tfoot tr caption',
  'thead': 'tbody tfoot caption',
  'tbody': 'tfoot caption',
  'tfoot': 'caption',
  'tr': 'tbody tfoot',
  'td': 'th tr',
  'th': 'td tr tbody',
};
for (let tag in close) {
  for (let closer of [...close[tag].split(' '), tag])
    htm.close[tag] = htm.close[tag + closer] = true;
}

'pre textarea'.split(' ').map(v => htm.pre[v] = true);

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
const prop = (el, k, v) => {
  // onClick → onclick, someProp -> some-prop
  if (k.startsWith('on')) k = k.toLowerCase();

  if (el[k] !== v) {
    // avoid readonly props https://jsperf.com/element-own-props-set/1
    // ignoring that: it's too heavy, same time it's fine to throw error for users to avoid setting form
    // let desc; if (!(k in el.constructor.prototype) || !(desc = Object.getOwnPropertyDescriptor(el.constructor.prototype, k)) || desc.set)
    el[k] = v;
  }

  if (v == null || v === false) el.removeAttribute(k);
  else if (typeof v !== 'function') {
    v = v === true ? '' :
    (typeof v === 'number' || typeof v === 'string') ? v :
    (k === 'class') ? (Array.isArray(v) ? v.map(v=>v?.trim()) : Object.entries(v).map(([k,v])=>v?k:'')).filter(Boolean).join(' ') :
    (k === 'style') ? Object.entries(v).map(([k,v]) => `${k}: ${v}`).join(';') : v.toString?.()||'';

    // workaround to set @-attributes
    if (k[0]==='@') {
      tmp.innerHTML=`<x ${dashcase(k)}/>`;
      let attr = tmp.firstChild.attributes[0];
      tmp.firstChild.removeAttributeNode(attr);
      attr.value = v;
      el.setAttributeNode(attr);
    }
    else el.setAttribute(dashcase(k), v);
  }
};

const tmp = document.createElement('div');

function dashcase(str) {
	return str.replace(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g, (match) => '-' + match.toLowerCase());
}

const _static = Symbol(), _items = Symbol();

// configure swapper
// FIXME: make same-key morph for faster updates
// FIXME: modifying prev key can also make it faster
// SOURCE: src/diff-inflate.js
// FIXME: avoid insert, replace: do that before
swap.same = (a, b) => a === b || a?.data != null && (a?.data === b?.data);
swap.insert = (a, b, parent) => parent.insertBefore(b?.nodeType ? b : new Text(b), a);
swap.replace = (from, to, parent) => to?.nodeType ? parent.replaceChild(to, from) :
    from.nodeType === TEXT ? from.data = to : from.replaceWith(to);


const TEXT = 3;

const cache = new WeakSet,
      ctx = {init:false},
      doc=document,
      h = hyperscript.bind(ctx);

function flat (children) {
  let out = [], i = 0, item;
  for (; i < children.length;)
    if ((item = children[i++]) != null)
      // .values is common for NodeList / Array indicator (.forEach is used by rxjs, iterator is by string)
      if (item.values) for (item of item) out.push(item);
      else if (!observable(item)) out.push(item);
  return out
}

function html (statics) {
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
    tag = tag ? doc.createElement(tag) : doc.createDocumentFragment();

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

    return h(doc.createDocumentFragment(), null, ...tag)
  }

  // apply props
  let subs = [], i, child, name, value, s, v, match;

  for (name in props) {
    value = props[name];
    // classname can contain these casted literals
    if (typeof value === 'string' && name.startsWith('class')) value = value.replace(/\b(false|null|undefined)\b/g,'');

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

    // NOTE: in some cases fragment is a child of another fragment, we ignore that case
    swap(tag, tag.childNodes, flat(children))
  )));

  return tag
}

export { _items, _static, html as default };
