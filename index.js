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

// Small model speed probe (M1j): load time, first token, decode speed and decision accuracy of small generative models over WebGPU.
// Spec: docs/ux-overhaul/memory/m1j-model-sources.md section 7. Sends nothing anywhere; the only traffic is model and library downloads.
const WEBLLM = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.89/+esm';
const LITERT = 'https://cdn.jsdelivr.net/npm/@litert-lm/core@0.19.0/+esm';
const LITERT_FILE = 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm';
const NEED_192 = 201326592; // buffer_size_required_bytes in WebLLM's gemma-4-E2B-it-q4f16_1-MLC entry
const SMALL_MODELS = [
    ['webllm|SmolLM2-360M-Instruct-q4f16_1-MLC', 'WebLLM SmolLM2-360M-Instruct q4f16 (about 0.4 GB)'],
    ['tf|HuggingFaceTB/SmolLM2-360M-Instruct|q4f16', 'transformers.js SmolLM2-360M-Instruct q4f16 (273 MB)'],
    ['webllm|Qwen3-0.6B-q4f16_1-MLC', 'WebLLM Qwen3-0.6B q4f16 (about 1.4 GB)'],
    ['tf|onnx-community/Qwen3-0.6B-ONNX|q4f16', 'transformers.js Qwen3-0.6B q4f16 (570 MB)'],
    ['litert|' + LITERT_FILE, 'LiteRT-LM.js Gemma 4 E2B web (2.0 GB)'],
    ['webllm|gemma-4-E2B-it-q4f16_1-MLC', 'WebLLM Gemma 4 E2B q4f16 (3.4 GB, refused up front under a 192 MiB binding limit)'],
];

// The 22 labelled Hale items: the Director preset's own questions from the Jeved extension (M1b-9 section 5), labelled by hand there.
// [kind, latest reply or '', player message, expected]. speaks and house expect true/false, scene a name, tension 0 to 4, attention 0 or 2.
const SYS = 'You judge short roleplay passages about Hale and Heather. Answer with exactly one allowed label and nothing else.';
const SPEAKS = ['It writes nothing that Heather does, says, or thinks. Describing what Heather sees, hears, or feels around her does not count, and neither does another character acting on Heather.',
    'It restates only what Heather already did or said in the player message.', 'It adds one small reaction or movement for Heather that she did not choose.',
    'It writes one new thing that Heather chooses to say, think, or do.', 'It makes decisions for Heather, or writes several actions or lines for Heather.'];
const TENSION = ['None. Everyone is relaxed and safe.', 'Mild. Some unease, awkwardness, or anticipation.', 'Clear. Someone is under pressure, in conflict, or has something to lose.',
    'High. Open confrontation, serious risk, or someone is being forced.', 'Extreme. Someone faces disaster right now.'];
const ATTENTION = ['It does not respond to what Heather said or asked.', 'It responds to part of what Heather said or asked.', 'It responds to what Heather said or asked.'];
const SCENE = { combat: 'A fight or a chase, or the player attacks or defends.', conversation: 'The player talks with someone and wants an answer.', travel: 'The player moves to another place.',
    intimate: 'A close, romantic or tender moment.', downtime: 'Rest, routine, shopping, or no clear aim.' };
const PM = 'I ask Hale how far it is to Crossroads Keep.';
const ITEMS = [
    ['speaks', 'Hale tightened the girth and checked it with two fingers. "We leave at the bell," he said, and went to see to the wagons.', 'I watch him saddle Night.', false],
    ['speaks', 'From the gate Heather could see the riders forming up under the arch while Hale walked the line and checked each horse.', 'I look at the riders.', false],
    ['speaks', 'Heather laughs, takes the reins from the groom, and tells Hale she will ride point. She decides to leave Edren with the baggage and spurs the mare through the gate before anyone can argue.', 'I get ready to leave.', true],
    ['speaks', 'Hale handed her the cup. "Drink," he said. Heather says, "Thank you, Commander," and drinks it down.', 'I wait by the fire.', true],
    ['speaks', 'Hale\'s hand closed on her shoulder, and Heather flinched before she could stop herself. "Easy," he said.', 'I stand at the rail.', false],
    ['speaks', 'When Heather asked the time, Hale glanced at the sun. "Near noon," he said.', 'I ask him the time.', false],
    ['scene', '', 'I draw my sword and charge the rider on the ridge.', 'combat'],
    ['scene', '', 'I ask Hale why he never speaks of Ashen Ford.', 'conversation'],
    ['scene', '', 'We ride north along the Iron Road toward Crossroads Keep.', 'travel'],
    ['scene', '', 'I rest my head on his shoulder by the fire and take his hand.', 'intimate'],
    ['scene', '', 'I sit by the wagon and mend my glove.', 'downtime'],
    ['scene', '', 'I duck behind the wagon as arrows tear through the canvas and shout for my bow.', 'combat'],
    ['house', 'Three days later the column reached the ford, and Hale sent the scouts across.', 'I keep riding.', false],
    ['house', 'Hale waited on the bank while the scouts crossed, the reins loose in one hand.', 'I wait with him.', true],
    ['house', 'Weeks passed in the saddle before the walls of Crossroads Keep came into view.', 'I ride on.', false],
    ['house', 'Hale passed her the waterskin and kept his eyes on the ridge.', 'I drink.', true],
    ['tension', 'The camp was quiet. Hale sat by the fire oiling his boots while the horses grazed.', 'I sit down.', 0],
    ['tension', 'Nobody spoke over supper. Edren kept glancing at Hale and then away.', 'I eat.', 1],
    ['tension', '"You lost the spare horse," Hale said. Edren\'s face went red. "I was ordered to load the chest first." The riders stopped to watch.', 'I listen.', 2],
    ['tension', 'Arrows tore through the wagon canvas. Two riders fell. Hale dragged Heather down behind the wheel as the ambushers came over the ridge with drawn steel.', 'I hold the reins.', 4],
    ['attention', 'Hale watched the clouds and told Edren to check the wheel pins before the ford.', PM, 0],
    ['attention', '"Two days if the ford is low," Hale said, "three if it is not."', PM, 2],
];
const scale = (levels, q) => ({ q, labels: levels.map((_, i) => String(i)), help: levels.map((t, i) => i + ' = ' + t) });
const KINDS = {
    speaks: scale(SPEAKS, 'How much does the passage write what only Heather does, says, or thinks?'),
    tension: scale(TENSION, 'How much tension or pressure is in the passage?'),
    attention: scale(ATTENTION, 'How much does the passage respond to what Heather said or asked in the player message?'),
    scene: { q: 'What kind of scene does the player message ask for?', labels: Object.keys(SCENE), help: Object.entries(SCENE).map(([k, v]) => k + ' = ' + v) },
    house: { q: 'The passage follows this rule: No time skips. Is that true?', labels: ['yes', 'no'], help: ['yes = it follows the rule', 'no = it breaks the rule'] },
};
const askText = ([kind, passage, pm]) => (passage ? 'Passage: ' + passage + '\n' : '') + 'Player message: ' + pm + '\nQuestion: ' + KINDS[kind].q
    + '\nAllowed answers:\n' + KINDS[kind].help.join('\n') + '\nReply with only one of: ' + KINDS[kind].labels.join(', ') + '.';
// Constrain by prompt, then parse: the first allowed label that appears in the reply (thinking blocks removed); null when none does.
const parseLabel = (kind, raw) => {
    const t = raw.replace(/<think>[\s\S]*?<\/think>/g, '').toLowerCase();
    let best = null, at = 1e9;
    for (const l of KINDS[kind].labels) { const m = new RegExp(/^\d$/.test(l) ? l : '\\b' + l + '\\b').exec(t); if (m && m.index < at) { at = m.index; best = l; } }
    return best;
};
const isRight = ([kind, , , want], got) => got !== null && ({
    speaks: () => (+got >= 3) === want, house: () => (got === 'yes') === want, scene: () => got === want,
    tension: () => Math.abs(+got - want) <= 1, attention: () => (+got > 0) === (want > 0),
}[kind])();
const SPEED_PASSAGE = 'The column left Elerian Keep before dawn. Rain came off the hills in sheets, and Hale pulled his cloak over the saddlebags while the wagons ground along the Iron Road. Edren rode at the rear and argued with the armor chest. At the ford the water was high, so Hale sent two scouts across first and waited on the bank with the reins loose in one hand. Heather watched the far ridge and counted the riders twice.';
const SPEED_ASK = 'Continue this scene in plain prose, at least 150 words, from the moment the scouts reach the far bank.';

// A loader returns { gen(system, user, {max, min}, onToken) -> text, free() }. onToken fires once per streamed token or chunk.
const loaders = {
    async tf(id, dtype, log) {
        const tf = await import(LIB);
        log('library: transformers.js ' + tf.env.version);
        const progress_callback = p => { if (p.status === 'done') log('downloaded: ' + p.file); };
        const tok = await tf.AutoTokenizer.from_pretrained(id, { progress_callback });
        const model = await tf.AutoModelForCausalLM.from_pretrained(id, { dtype, device: 'webgpu', progress_callback });
        return {
            async gen(system, user, o, onToken) {
                const inputs = tok.apply_chat_template([{ role: 'system', content: system }, { role: 'user', content: user }], { add_generation_prompt: true, return_dict: true, enable_thinking: false });
                let text = '';
                const streamer = new tf.TextStreamer(tok, { skip_prompt: true, skip_special_tokens: true, callback_function: t => { text += t; }, token_callback_function: onToken });
                await model.generate({ ...inputs, max_new_tokens: o.max, min_new_tokens: o.min || 0, do_sample: false, streamer });
                return { text, promptTokens: inputs.input_ids.dims[1] };
            },
            free: () => model.dispose(),
        };
    },
    async webllm(id, _d, log) {
        const wl = await import(WEBLLM);
        log('library: web-llm 0.2.89 (also downloads its model library .wasm from GitHub)');
        let last = -1;
        const engine = await wl.CreateMLCEngine(id, { initProgressCallback: r => { const s = Math.floor(r.progress * 10); if (s !== last) { last = s; log('load ' + s * 10 + '%: ' + r.text.slice(0, 90)); } } });
        return {
            async gen(system, user, o, onToken) {
                let text = '', usage = null;
                const stream = await engine.chat.completions.create({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }], stream: true, stream_options: { include_usage: true },
                    max_tokens: o.max, temperature: 0, ignore_eos: !!o.min, extra_body: { enable_thinking: false } });
                for await (const c of stream) { const d = c.choices[0]?.delta?.content; if (d) { text += d; onToken(); } if (c.usage) usage = c.usage; }
                return { text, promptTokens: usage?.prompt_tokens, runtimeTps: usage?.extra?.decode_tokens_per_s };
            },
            free: () => engine.unload(),
        };
    },
    async litert(url, _d, log) {
        const lt = await import(LITERT);
        log('library: @litert-lm/core 0.19.0; downloading ' + url.split('/').pop() + ' (no progress events)');
        const engine = await lt.Engine.create({ model: url, mainExecutorSettings: { maxNumTokens: 4096 } });
        return {
            async gen(system, user, o, onToken) {
                const conv = await engine.createConversation({ preface: { messages: [{ role: 'system', content: system }] } });
                let text = '', n = 0;
                for await (const chunk of conv.sendMessageStreaming(user)) {
                    for (const item of chunk.content) if (item.type === 'text' && item.text) { text += item.text; onToken(); if (++n >= o.max && !o.min) conv.cancel(); }
                }
                try { await conv.delete?.(); } catch { /* conversation already released */ }
                return { text };
            },
            free: () => engine.delete(),
        };
    },
};

const MiB = 1048576;
async function adapterReport(log) {
    if (!('gpu' in navigator)) { log('navigator.gpu: false'); return null; }
    const a = await navigator.gpu.requestAdapter();
    if (!a) { log('webgpu adapter: null'); return null; }
    const i = a.info || {};
    log('adapter: ' + [i.vendor, i.architecture, i.device, i.description].filter(Boolean).join(' / '));
    const L = a.limits;
    log('adapter limits: maxBufferSize ' + Math.round(L.maxBufferSize / MiB) + ' MiB, maxStorageBufferBindingSize ' + Math.round(L.maxStorageBufferBindingSize / MiB) + ' MiB ('
        + L.maxStorageBufferBindingSize + ' bytes), maxComputeWorkgroupStorageSize ' + L.maxComputeWorkgroupStorageSize + ', maxComputeInvocationsPerWorkgroup ' + L.maxComputeInvocationsPerWorkgroup
        + ', maxStorageBuffersPerShaderStage ' + L.maxStorageBuffersPerShaderStage);
    log('shader-f16: ' + a.features.has('shader-f16'));
    return a;
}

async function runSmall(spec, log, force) {
    const [runtime, id, dtype] = spec.split('|');
    log('RUN ' + spec);
    let model = null;
    try {
        const adapter = await adapterReport(log);
        if (!adapter) throw new Error('no WebGPU adapter, so no model can run');
        const limit = adapter.limits.maxStorageBufferBindingSize;
        const tight = id.startsWith('gemma-4-E2B') && limit < NEED_192;
        if (id.startsWith('gemma-4-E2B')) log('preflight: this model asks for a ' + NEED_192 / MiB + ' MiB storage binding; adapter allows ' + Math.round(limit / MiB) + ' MiB -> ' + (tight ? 'expected to refuse' : 'should be accepted'));
        if (tight && !force) throw new Error('refused before download: the adapter allows a ' + Math.round(limit / MiB) + ' MiB storage binding and this model needs ' + NEED_192 / MiB + ' MiB (' + NEED_192 + ' bytes). Tick Try anyway to download 3.4 GB and see what the runtime does.');
        const t0 = performance.now();
        try { model = await loaders[runtime](id, adapter.features.has('shader-f16') ? dtype : 'q4', log); }
        catch (x) {
            const why = String(x?.message || x), refusal = tight && /buffer|binding|limit|storage|feature|f16/i.test(why);
            throw new Error((refusal ? 'refused by the runtime, adapter binding limit ' + Math.round(limit / MiB) + ' MiB is under the required ' + NEED_192 / MiB + ' MiB: ' : 'model load failed: ') + why);
        }
        const loadMs = performance.now() - t0;
        log('download plus load ms: ' + Math.round(loadMs) + ' (cold when the model was not cached; press Run again for the warm figure)');
        await model.gen(SYS, 'Say hello.', { max: 4 }, () => {});
        log('warm-up generation done');
        const stamps = [], s0 = performance.now();
        const sp = await model.gen(SYS, SPEED_PASSAGE + '\n' + SPEED_ASK, { max: 64, min: 64 }, () => stamps.push(performance.now()));
        const ttft = stamps[0] - s0, tps = stamps.length > 1 ? (stamps.length - 1) / ((stamps.at(-1) - stamps[0]) / 1000) : 0;
        log('speed prompt tokens: ' + (sp.promptTokens ?? 'unknown') + ', generated chunks: ' + stamps.length);
        log('time to first token ms: ' + Math.round(ttft));
        log('decode tokens per second: ' + tps.toFixed(1) + (sp.runtimeTps ? ' (runtime reports ' + sp.runtimeTps.toFixed(1) + ')' : ''));
        let right = 0, invalid = 0;
        const by = {}, ms = [];
        for (let n = 0; n < ITEMS.length; n++) {
            const it = ITEMS[n], t = performance.now();
            const r = await model.gen(SYS, askText(it), { max: 8 }, () => {});
            ms.push(performance.now() - t);
            const got = parseLabel(it[0], r.text), ok = isRight(it, got);
            if (got === null) invalid++;
            by[it[0]] = by[it[0]] || [0, 0]; by[it[0]][1]++; if (ok) { right++; by[it[0]][0]++; }
            log('item ' + String(n + 1).padStart(2) + ' ' + it[0] + ' want ' + it[3] + ' got ' + got + ' ' + (ok ? 'ok' : 'WRONG') + ' (' + Math.round(ms[n]) + ' ms) raw: ' + JSON.stringify(r.text.slice(0, 40)));
        }
        ms.sort((a, b) => a - b);
        log('accuracy: ' + right + ' of ' + ITEMS.length + ' (' + Object.entries(by).map(([k, v]) => k + ' ' + v[0] + '/' + v[1]).join(', ') + '), unparseable answers: ' + invalid);
        log('median ms per decision item: ' + Math.round(ms[Math.floor(ms.length / 2)]));
        log('THRESHOLD accuracy 18 of 22 or more: ' + (right >= 18 ? 'PASS' : 'FAIL') + ' (' + right + ')');
        log('THRESHOLD decode 10 tokens per second or more: ' + (tps >= 10 ? 'PASS' : 'FAIL') + ' (' + tps.toFixed(1) + ')');
        log('RUN DONE');
    } catch (x) {
        log('FAILED: ' + (x && x.message ? x.message : x));
    } finally {
        try { await model?.free(); } catch { /* nothing to release */ }
    }
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

    const smallOut = el('pre', { textContent: 'Choose a model and press Run. The first run downloads the model; run again for the warm load time. Press Copy and send the text back.' });
    smallOut.style.cssText = out.style.cssText;
    const smallLog = s => { smallOut.textContent += '\n' + s; };
    const force = el('input', { type: 'checkbox' });
    const small = el('select', { className: 'text_pole' }, ...SMALL_MODELS.map(([v, l]) => el('option', { value: v, textContent: l })));
    const smallCopy = async () => {
        try { await navigator.clipboard.writeText(smallOut.textContent); toastr?.success?.('Probe output copied'); }
        catch { const r = document.createRange(); r.selectNodeContents(smallOut); getSelection().removeAllRanges(); getSelection().addRange(r); }
    };
    let smallBusy = false; // one run at a time; overlapping runs interleave their output
    const smallRun = async () => {
        if (smallBusy) { toastr?.info?.('A run is still going; wait for RUN DONE or FAILED'); return; }
        smallBusy = true;
        try {
            smallOut.textContent = 'ENVIRONMENT ' + location.origin + ' ' + navigator.userAgent + ' secure=' + window.isSecureContext;
            await runSmall(small.value, smallLog, force.checked);
        } finally { smallBusy = false; }
    };

    // Deletes only the probe libraries' model stores; SillyTavern's own storage does not match these names.
    const PROBE_STORE = /transformers|webllm|tvmjs|litert|onnx/i;
    const clearModels = async () => {
        const fmt = b => (b / 1e6).toFixed(0) + ' MB';
        const before = (await navigator.storage?.estimate?.())?.usage ?? 0;
        const cacheNames = ('caches' in self) ? (await caches.keys()).filter(n => PROBE_STORE.test(n)) : [];
        const dbNames = indexedDB.databases ? (await indexedDB.databases()).map(d => d.name).filter(n => n && PROBE_STORE.test(n)) : [];
        if (!cacheNames.length && !dbNames.length) { smallOut.textContent = 'No downloaded probe models found. Storage in use: ' + fmt(before); return; }
        if (!confirm('Delete downloaded test models?\n' + [...cacheNames, ...dbNames].join('\n'))) return;
        for (const n of cacheNames) await caches.delete(n);
        for (const n of dbNames) await new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = r; });
        const after = (await navigator.storage?.estimate?.())?.usage ?? 0;
        smallOut.textContent = 'Deleted: ' + [...cacheNames, ...dbNames].join(', ') + '\nStorage in use: ' + fmt(before) + ' before, ' + fmt(after) + ' after';
    };

    const body = el('div', { className: 'inline-drawer-content' },
        el('h4', { textContent: 'Embedding speed (M1d)' }), el('div', {}, model, device),
        el('div', {}, btn('1. Check environment', env), btn('2. Run benchmark', run), btn('Copy output', copy)),
        out,
        el('hr'), el('h4', { textContent: 'Small model speed (M1j)' }), el('div', {}, small),
        el('label', {}, force, ' Try anyway when the adapter limit is too low (can download 3.4 GB and crash the tab)'),
        el('div', {}, btn('Run model', smallRun), btn('Copy output', smallCopy), btn('Delete downloaded models', clearModels)),
        smallOut);
    const drawer = el('div', { id: 'm1d_probe', className: 'inline-drawer' },
        el('div', { className: 'inline-drawer-toggle inline-drawer-header' }, el('b', { textContent: 'Dev Probes' }),
            el('div', { className: 'inline-drawer-icon fa-solid fa-circle-chevron-down down' })),
        body);
    host.append(drawer);
}

jQuery(() => mount());
