const FIELD = '\ue000', QUOTES = '\ue001';

const CACHE = new WeakMap();

function htm(statics) {
  let tree = CACHE.get(statics);
  if (!tree) CACHE.set(statics, tree = parse(statics));
  let nodes = tree.map(node => build(this, node, arguments));
  return nodes.length < 2 ? nodes[0] : nodes
}

// instantiate cached node with actual field values: numbers are field indices, strings are literals
const build = (h, node, args) => {
  if (typeof node === 'number') return args[node]
  if (typeof node !== 'object') return node
  let props = null;
  if (node.p) {
    props = {};
    for (let e of node.p)
      e.length < 2 ? Object.assign(props, args[e[0]]) : props[part(e[0], args)] = part(e[1], args);
  }
  return h(part(node.t, args), props, ...node.c.map(c => build(h, c, args)))
};

// multi-part value joins to a string (nullish/false fields turn empty), single field stays raw
const part = (v, args) => typeof v === 'number' ? args[v] :
  Array.isArray(v) ? v.map(x => (x = typeof x === 'number' ? args[x] : x, x == null || x === false ? '' : x)).join('') : v;

// parse statics into a reusable tree
const parse = (statics) => {
  let prev = 0, current = [null], field = 0, args, name, value, quotes = [], quote = 0, last, level = 0, pre = false;

  const evaluate = (str, parts = [], raw) => {
    let i = 0;
    str = (!raw && str === QUOTES ?
      quotes[quote++].slice(1, -1) :
      str.replace(/\ue001/g, m => quotes[quote++]));

    if (!str) return str
    str.replace(/\ue000/g, (match, idx) => {
      if (idx) parts.push(str.slice(i, idx));
      i = idx + 1;
      return parts.push(++field)
    });
    if (i < str.length) parts.push(str.slice(i));
    return parts.length > 1 ? parts : parts[0]
  };

  // close level
  const up = () => {
    args = current, current = args[0], last = args[1];
    current.push({ t: last, p: args[2], c: args.slice(3) });
    if (pre === level--) pre = false; // reset <pre>
  };

  let str = statics.join(FIELD);
  if (str.indexOf('<!') >= 0) str = str
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<!\[CDATA\[[^]*\]\]>/g, '');
  str = str.replace(/('|")[^\1]*?\1/g, match => (quotes.push(match), QUOTES));

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
            if (typeof tag === 'string') { tag = tag.toLowerCase(); while (CLOSE[current[1] + tag]) up(); }
            current = [current, tag, null];
            level++;
            if (!pre && PRE[tag]) pre = level;
            if (EMPTY[tag]) close = tag;
          }
          // attr=...
          else if (part) {
            let props = current[2] || (current[2] = []);
            if (part.slice(0, 3) === '...') props.push([++field]);
            else {
              [name, value] = part.split('=');
              props.push([evaluate(name), value ? evaluate(value) : true]);
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
    if (!pre) text = text.replace(/\s*\n\s*/g, '').replace(/\s+/g, ' ');

    if (text) evaluate((last = 0, text), current, true);
  });

  if (current[0] && CLOSE[current[1]]) up();

  if (level) err(`Unclosed \`${current[1]}\`.`);

  return current.slice(1)
};

const err = (msg) => { throw SyntaxError(msg) };

// self-closing elements
const EMPTY = htm.empty = {};

// optional closing elements
const CLOSE = htm.close = {};

// preformatted text elements
const PRE = htm.pre = {};

// https://github.com/wooorm/html-void-elements/blob/main/index.js
'area base basefont bgsound br col command embed frame hr image img input keygen link meta param source track wbr ! !doctype ? ?xml'.split(' ').map(v => htm.empty[v] = true);

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

// configure swapper
swap.same = (a, b) => a === b || (a?.data != null && a.data === b?.data);
swap.insert = (a, b, parent) => b != null && parent.insertBefore(b?.nodeType ? b : doc.createTextNode(b), a);
swap.replace = (from, to, parent) => to == null ? from.remove() : to.nodeType ? parent.replaceChild(to, from) :
  from.nodeType === TEXT ? from.data = to : from.replaceWith(to);


const TEXT = 3, ELEM = 1, FRAG = 11;
const isPrimitive = value => value !== Object(value);

const doc = document, _ch = Symbol();

// subscribe with element-bound lifetime: closure refs the element only weakly,
// so an unreferenced detached tree is collected and the sub self-disposes on next emit
const watch = (el, target, update) => {
  let ref = new WeakRef(el), unsub = sube(target, v => {
    let el = ref.deref();
    el ? update(el, v) : unsub?.();
  });
};

function flat(children) {
  let out = [], i = 0, item;
  for (; i < children.length;)
    if ((item = children[i++]) != null)
      // .values is common for NodeList / Array indicator (.forEach is used by rxjs, iterator is by string)
      if (item.values) for (item of item) out.push(item);
      else out.push(item);
  return out
}

const cache = new WeakMap;

function html(statics) {
  if (!Array.isArray(statics)) return h(...arguments)

  // no fields - fully static template: build once, clone
  if (statics.length === 1) {
    let node = cache.get(statics);
    if (!node) cache.set(statics, node = toNode(htm.call(h, statics)));
    return node.cloneNode(true)
  }

  return toNode(htm.apply(h, arguments))
}

const toNode = result => Array.isArray(result) ? h(doc.createDocumentFragment(), null, ...result) :
  result?.nodeType ? result : isPrimitive(result) ? doc.createTextNode(result ?? '') : result;

function h(tag, props, ...children) {
  if (typeof tag === 'string') tag = tag ? doc.createElement(tag) : doc.createDocumentFragment();
  else if (typeof tag === 'function') {
    tag = tag({ children, ...props });

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
    let value = props[name];
    // primitive is more probable also less expensive than observable check
    if (observable(value)) watch(tag, value, (el, v) => prop(el, name, v));
    else if (typeof value !== 'string' && name === 'style') {
      for (let s in value) {
        let v = value[s], match;
        if (observable(v)) watch(tag, v, (el, v) => el.style.setProperty(s, v));
        else if (typeof v === 'string' && (match = v.match(/(.*)\W+!important\W*$/))) tag.style.setProperty(s, match[1], 'important');
        else tag.style.setProperty(s, v);
      }
    }
    else prop(tag, name, value);
  }

  if (children.length) {
    children = flat(children);

    // detect observables in children
    let subs;
    for (let i = 0, l = children.length, child; i < l; i++)
      if ((child = children[i]) && observable(child)) (subs ||= []).push([child, i]), children[i] = doc.createTextNode('');

    // append shortcut
    if (!tag.childNodes.length) (tag.nodeName === 'TEMPLATE' ? tag.content : tag).append(...children);
    else swap(tag, tag.childNodes, children);

    if (subs) {
      // children state lives on the element, not in closures - see watch
      tag[_ch] = children;
      for (let [sub, i] of subs) watch(tag, sub, (el, child) => {
        let children = el[_ch], cur = children[i];
        // primitive into a live text node: no diffing
        if (isPrimitive(child) && cur?.nodeType === TEXT && cur.parentNode) cur.data = child ?? '';

        // NOTE: in some cases fragment is a child of another fragment, we ignore that case
        else children[i] = child, swap(el, el.childNodes, flat(children));
      });
    }
  }
  else tag.innerHTML = '';

  return tag
}

export { html as default };
