// Embedding Probe (M1d): measures in-browser embedding speed inside the host webview.
// Same measurements as the probe page in docs/ux-overhaul/memory/m1d-on-device.md section 12.1.
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js';
const MODELS = [
    ['Snowflake/snowflake-arctic-embed-xs|q8|query', 'arctic-embed-xs q8 (23 MB, 384d)'],
    ['Xenova/all-MiniLM-L6-v2|q8|', 'all-MiniLM-L6-v2 q8 (23 MB, 384d)'],
    ['Xenova/bge-small-en-v1.5|q8|query', 'bge-small-en-v1.5 q8 (34 MB, 384d)'],
    ['Xenova/gte-small|q8|', 'gte-small q8 (34 MB, 384d)'],
];
const MEMORIES = [
    'Mara hid the brass key under the third floorboard of the lighthouse before the storm.',
    'Tomas is allergic to cats and avoids the harbor warehouse where the strays live.',
    'The council meets on the first night of every month in the old salt exchange.',
    'Ilsa lied about her age; she is thirty-four and told everyone twenty-eight.',
    'The ferry to Karsk stopped running after the bridge collapsed in the spring.',
    'Ren promised to repay the debt to the baker by the autumn festival.',
];
const QUERIES = [
    ['Where did Mara put the key?', 0], ['Why does Tomas stay away from the warehouse?', 1],
    ['When does the council gather?', 2], ['How old is Ilsa really?', 3],
    ['Can we still take a boat to Karsk?', 4], ['What does Ren owe the baker?', 5],
];
const BASE = 'The harbor town woke slowly. Mara counted the coins twice while Tomas argued with the ferryman about the broken bridge and the council vote. ';
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * p))]; };

function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    Object.assign(n, attrs);
    n.append(...kids);
    return n;
}

function mount() {
    const host = document.querySelector('#extensions_settings2') || document.querySelector('#extensions_settings');
    if (!host || document.querySelector('#m1d_probe')) return;
    const out = el('pre', { id: 'm1d_probe_out', textContent: 'Press 1, then 2 for each model. Press Copy and send the text back.' });
    out.style.cssText = 'white-space:pre-wrap;word-break:break-word;max-height:50vh;overflow:auto;font-size:12px;';
    const log = s => { out.textContent += '\n' + s; };
    const reset = s => { out.textContent = s; };
    const model = el('select', { className: 'text_pole' }, ...MODELS.map(([v, l]) => el('option', { value: v, textContent: l })));
    const device = el('select', { className: 'text_pole' }, el('option', { value: 'wasm', textContent: 'wasm (CPU)' }), el('option', { value: 'webgpu', textContent: 'webgpu' }));
    const btn = (label, fn) => { const b = el('button', { className: 'menu_button', textContent: label }); b.onclick = fn; return b; };

    const env = async () => {
        reset('ENVIRONMENT');
        log('host: ' + location.origin);
        log('userAgent: ' + navigator.userAgent);
        log('isSecureContext: ' + window.isSecureContext);
        log('crossOriginIsolated: ' + window.crossOriginIsolated);
        log('SharedArrayBuffer: ' + typeof SharedArrayBuffer);
        log('hardwareConcurrency: ' + navigator.hardwareConcurrency);
        log('deviceMemory (GB, capped): ' + navigator.deviceMemory);
        log('Cache API (caches): ' + ('caches' in self));
        log('IndexedDB: ' + ('indexedDB' in self));
        try { const e = await navigator.storage.estimate(); log('storage quota MB: ' + Math.round(e.quota / 1e6) + ', usage MB: ' + Math.round(e.usage / 1e6)); } catch (x) { log('storage.estimate failed: ' + x); }
        log('navigator.gpu: ' + ('gpu' in navigator));
        if ('gpu' in navigator) {
            try {
                const a = await navigator.gpu.requestAdapter();
                if (!a) log('webgpu adapter: null');
                else {
                    log('webgpu maxBufferSize MB: ' + Math.round(a.limits.maxBufferSize / 1e6));
                    log('webgpu maxStorageBufferBindingSize MB: ' + Math.round(a.limits.maxStorageBufferBindingSize / 1e6));
                    log('webgpu shader-f16: ' + a.features.has('shader-f16'));
                }
            } catch (x) { log('webgpu adapter error: ' + x); }
        }
        log('ENV DONE');
    };

    const run = async () => {
        const [name, dtype, prefixKind] = model.value.split('|');
        reset('RUN ' + name + ' dtype=' + dtype + ' device=' + device.value);
        try {
            const t0 = performance.now();
            const tf = await import(LIB);
            log('library import ms: ' + Math.round(performance.now() - t0));
            log('library version: ' + tf.env.version);
            const t1 = performance.now();
            const pipe = await tf.pipeline('feature-extraction', name, { dtype, device: device.value,
                progress_callback: p => { if (p.status === 'done') log('downloaded: ' + p.file); } });
            log('model load ms (download plus init): ' + Math.round(performance.now() - t1));
            const qp = prefixKind === 'query' ? 'Represent this sentence for searching relevant passages: ' : '';
            const embed = async (arr, isQuery) => (await pipe(arr.map(t => (isQuery ? qp : '') + t), { pooling: 'mean', normalize: true })).tolist();
            const chunk = n => { let s = ''; while (s.split(' ').length < n) s += BASE; return s.trim(); };
            const c120 = chunk(95);
            log('probe chunk tokens: ' + pipe.tokenizer(c120).input_ids.size);
            await embed([c120], false);
            const single = [];
            for (let i = 0; i < 12; i++) { const s = performance.now(); await embed([c120 + ' ' + i], false); single.push(performance.now() - s); }
            log('single chunk ms: median ' + Math.round(median(single)) + ', p95 ' + Math.round(pct(single, 0.95)));
            const sb = performance.now(); await embed(Array.from({ length: 8 }, (_, i) => c120 + ' ' + i), false); const bms = performance.now() - sb;
            log('batch of 8 ms: ' + Math.round(bms) + ' (' + Math.round(bms / 8) + ' per chunk)');
            const sl = performance.now(); await embed([chunk(380)], false); log('long chunk (about 500 tokens) ms: ' + Math.round(performance.now() - sl));
            const D = await embed(MEMORIES, false);
            let hits = 0;
            for (const [q, want] of QUERIES) {
                const v = (await embed([q], true))[0];
                let best = -1, bi = -1;
                D.forEach((d, i) => { let s = 0; for (let k = 0; k < d.length; k++) s += d[k] * v[k]; if (s > best) { best = s; bi = i; } });
                if (bi === want) hits++;
            }
            log('retrieval top-1: ' + hits + ' of ' + QUERIES.length);
            log('embedding dimension: ' + D[0].length);
            if (performance.memory) log('JS heap MB (excludes WASM and GPU memory): ' + Math.round(performance.memory.usedJSHeapSize / 1e6));
            log('RUN DONE');
        } catch (x) {
            log('FAILED: ' + (x && x.message ? x.message : x));
        }
    };

    const copy = async () => {
        try { await navigator.clipboard.writeText(out.textContent); toastr?.success?.('Probe output copied'); }
        catch { const r = document.createRange(); r.selectNodeContents(out); getSelection().removeAllRanges(); getSelection().addRange(r); }
    };

    const body = el('div', { className: 'inline-drawer-content' },
        el('h4', { textContent: 'Embedding speed (M1d)' }), el('div', {}, model, device),
        el('div', {}, btn('1. Check environment', env), btn('2. Run benchmark', run), btn('Copy output', copy)),
        out);
    const drawer = el('div', { id: 'm1d_probe', className: 'inline-drawer' },
        el('div', { className: 'inline-drawer-toggle inline-drawer-header' }, el('b', { textContent: 'Dev Probes' }),
            el('div', { className: 'inline-drawer-icon fa-solid fa-circle-chevron-down down' })),
        body);
    host.append(drawer);
}

jQuery(() => mount());
