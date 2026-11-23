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
