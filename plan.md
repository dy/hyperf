# plan

* [x] make better use of diffing algo: it's underused now https://github.com/spectjs/spect/issues/262, https://github.com/spectjs/spect/issues/233
  * primitive emits into a live text slot set `.data` directly, O(1); diffing reserved for node/array emits

* [x] ~~docs: rxjs https://github.com/spectjs/spect/issues/208~~

* [x] swap htm for xhtm: real HTML syntax, no static-caching workarounds (`_static`/`_init` deleted); cost +0.5k gzip
  * xhtm 1.8.0 joins multi-part attrs to string (falsy fields turn empty), no parts-array handling needed here

* [x] make use of element-props instead of attr

* [x] get rid of primitive checker

* [x] make sure main points to src/index always, not bundle: needed for external bundling

* [x] make tests use remote deps as peer-deps, reduce number of dev dep libs

* [x] name: hyperf
  * examples
    . hypertext tagged markup
    . hypertext literal
    . hyperscript
    . hyps
    . reactive
  * hyperfragment.js? hyperfrag.js?
  * hyperf.js?
    + hyperfunction
    + hyperfragment
    + very similar to printf (print formatted string)
      + even signature is similar printf(strin, f1, f2, ...)
    + hi perf
  * hypf.js?
  * domfrag.js?
  * fragm.js?
  * frage.js?
  * hypd
  * hyel (hyper element)

* [x] live fragments https://github.com/dy/hyperf/issues/1
  * slot updates anchor to own marker text node, not the parent: reactivity survives fragment insertion; top-level only, nested fragments stay unsupported

* [x] Dispose strategy
  * unfortunately signals require disposing effects when element is detached from DOM
  * solved zero-API: subs hold element via WeakRef, state lives on the element (`_ch` expando); unreferenced detached tree is GC'd, next emit self-unsubscribes; observable side covered by sube's FinalizationRegistry
