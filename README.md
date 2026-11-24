# Dev Probes

A small SillyTavern and TauriTavern extension holding measurement probes for Roleplay Instructions development. It installs alongside other extensions and makes no changes to chats or settings.

## Install

Extensions, Install extension, URL `https://github.com/htleffew/st-dev-probes`. Then open the Extensions panel and expand **Dev Probes**.

## Probes

### Embedding speed (M1d)

Measures in-browser sentence-embedding speed inside the host's webview with transformers.js 4.3.2 (loaded from jsDelivr on first use; needs network).

1. Press **1. Check environment**, then **Copy output**, and send the text.
2. Choose a model and **wasm**, press **2. Run benchmark**, then **Copy output**, and send the text. Repeat for each model, then once with **webgpu** if the environment check shows `navigator.gpu: true`.

The thresholds and the rest of the plan are in `docs/ux-overhaul/memory/m1d-on-device.md` section 12 of the agentos-harness repository, branch roleplay-instructions-v10.

### Small model speed (M1j)

Measures small generative models over WebGPU: adapter limits, download plus load time, time to first token, decode tokens per second, and accuracy on 22 hand-labelled Hale decision items (6 speaks-for-you, 6 scene, 4 house rule, 4 tension, 2 attention, from the Jeved Director preset's own questions). Each answer is constrained to the allowed labels by the prompt and parsed from the reply; an unparseable reply counts as wrong. The output ends with two pass or fail lines: 18 of 22 or more correct, and 10 or more decode tokens per second. The plan is in `docs/ux-overhaul/memory/m1j-model-sources.md` section 7.

1. Open the **Small model speed (M1j)** part of the Dev Probes drawer, choose a model, and press **Run model**. Keep the screen on and the app in front; the first run downloads the model over Wi-Fi.
2. When the output ends with `RUN DONE` or `FAILED`, press **Copy output** and send the text. Press **Run model** again with the same model for the warm load time (the second figure is the one to record).
3. Run the models in this order: WebLLM SmolLM2-360M, transformers.js Gemma 3 270M, WebLLM Qwen3-0.6B, LiteRT-LM Gemma 4 E2B, then WebLLM Gemma 4 E2B. The last one is expected to print `FAILED: refused before download` when the adapter reports under 192 MiB (the phone reports 128 MiB), without downloading 3.4 GB; that line is the result. WebLLM 0.2.89 does not refuse on its own at load time (it only warns and starts downloading), so the probe checks the limit first. Tick **Try anyway** only to see what the runtime does with the full download, which may crash the tab. The two other transformers.js entries (SmolLM2-360M, Qwen3-0.6B) are extra comparisons.

Libraries are loaded as ES modules from jsDelivr at pinned versions: transformers.js 4.3.2, `@mlc-ai/web-llm` 0.2.89 and `@litert-lm/core` 0.19.0. Models come from Hugging Face, and WebLLM also downloads each model's compiled `.wasm` from GitHub. Nothing else is sent anywhere: no prompts, answers or output leave the page. The LiteRT-LM entry downloads a 2 GB file with no progress shown, so expect a long wait on first run. Run one model at a time; each run releases its model when it ends.

### Phone probes (B16)

Five short checks of how the host behaves on the phone, at the bottom of the Dev Probes drawer. Each has its own output box and **Copy output** button; one runs at a time. None sends a message for you, changes your settings or chat, or makes a network call beyond SillyTavern's own theme and settings routes, and every test item is removed when the probe ends, also on error.

1. **Streaming.** Press **Start**, then send any message and let the reply finish. It records which SillyTavern events fire (`STREAM_TOKEN_RECEIVED`, `MESSAGE_UPDATED` and others), their counts and timing, and whether streaming is on in your settings. Run it once with Streaming on and once with it off (AI Response Configuration).
2. **Message menu.** Open a chat with a reply, press **Start**, tap the three dots (...) on a reply, then tap the flask icon added to the end of that menu. It records whether the menu opened by touch and whether the tap reached the test entry, then removes the entry.
3. **Theme save.** Press **Start**; no other taps. It saves a throwaway theme named `dev-probes-test` through the real Save button, checks the list and the server, deletes it, and selects your theme again.
4. **Fixed surfaces.** Press **Start**, tap the message box when told (keyboard opens), then close the keyboard when told. It places a bar, a bottom sheet and a popover (each also in a top-anchored form) and records their positions against `visualViewport` with the keyboard closed and open.
5. **Widths.** Fold the phone and press **Measure folded**, unfold it and press **Measure unfolded**, then **Copy output**. It records `innerWidth`, `visualViewport`, `devicePixelRatio` and screen size.

### Route probes (MB8)

Two checks that settle routes for background judgment calls. Neither reads, prints or stores a key value.

1. **d3:4b reach.** Check the desktop address, press **Start**, then **Copy output**. It posts one small question to `d3:4b` at `/v1/systemone` straight from the page and again through SillyTavern's CORS proxy, and prints the status of each or the browser's error. It loads `d3:4b` on the desktop, which unloads `gemma4:12b` until the next chat call.
2. **Jev key handling.** Press **Start**, then **Copy output**. It reports whether an OpenRouter key is saved in SillyTavern's secrets (presence only), whether `settings.json` holds anything shaped like a key (true or false only), and the answer and time of one judgment through SillyTavern's own OpenRouter connection for `typesafe/jev-router` and for `typesafe/jev-1.13`. The key stays on SillyTavern's side for both.

### Generation hook (MB6)

Checks whether an extension's generate interceptor can leave chat messages out of the request this host sends. Open a chat with at least two messages after the greeting, press **Start**, then send any message. For that one request the probe takes the oldest message after the greeting out of the request's copy of the chat and puts a marker line in its place, then reads the final prompt. The output ends with a `RESULT:` line. Your chat and settings are not changed.
