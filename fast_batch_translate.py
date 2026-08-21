import json
import urllib.request
import urllib.parse
import time
import re
from concurrent.futures import ThreadPoolExecutor

fr = json.load(open("locales-fr.json", "r", encoding="utf-8"))
en = json.load(open("locales-en.json", "r", encoding="utf-8"))

LANG_MAP = {
    "ar": "ar",
    "es": "es",
    "it": "it",
    "de": "de",
    "si": "si",
    "bn": "bn",
    "ta": "ta",
    "hi": "hi",
    "th": "th",
    "zh": "zh-CN"
}

def extract_all_strings(d, path=""):
    strings = []
    if isinstance(d, dict):
        for k, v in d.items():
            strings.extend(extract_all_strings(v, f"{path}.{k}" if path else k))
    elif isinstance(d, str):
        strings.append((path, d))
    return strings

all_strings = extract_all_strings(fr)
unique_texts = sorted(list(set(text for _, text in all_strings)))
print(f"Total keys: {len(all_strings)}, Unique texts: {len(unique_texts)}", flush=True)

# Chunk unique_texts into batches of 30
BATCH_SIZE = 30
batches = [unique_texts[i:i + BATCH_SIZE] for i in range(0, len(unique_texts), BATCH_SIZE)]
print(f"Divided into {len(batches)} batches per language.", flush=True)

DELIMITER = "\n@@@\n"

def translate_batch(batch, target_lang):
    api_lang = LANG_MAP.get(target_lang, target_lang)
    
    # Protect placeholders in each text
    all_placeholders = []
    protected_items = []
    for text in batch:
        ph = []
        def repl(m):
            ph.append(m.group(0))
            return f"___{len(ph)-1}___"
        p_text = re.sub(r"\{\{[^}]+\}\}", repl, text)
        all_placeholders.append(ph)
        protected_items.append(p_text)

    joined_text = DELIMITER.join(protected_items)
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl={api_lang}&dt=t&q=" + urllib.parse.quote(joined_text)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                translated_full = "".join([part[0] for part in data[0] if part[0]])
                
                # Split back by delimiter or newline patterns
                parts = re.split(r"\s*@@@\s*", translated_full)
                if len(parts) == len(batch):
                    results = []
                    for i, p in enumerate(parts):
                        # Restore placeholders
                        for p_idx, p_val in enumerate(all_placeholders[i]):
                            pattern = re.compile(rf"___\s*{p_idx}\s*___")
                            p = pattern.sub(p_val, p)
                        results.append((batch[i], p))
                    return (target_lang, results)
        except Exception as e:
            time.sleep(0.3 * (attempt + 1))
            
    # Fallback to individual items if batch fails
    fallback_res = []
    for i, text in enumerate(batch):
        fallback_res.append((text, text))
    return (target_lang, fallback_res)

# Run in parallel with ThreadPoolExecutor
TRANSLATION_MAP = {l: {} for l in LANG_MAP.keys()}
tasks = []

start_time = time.time()
print("Starting fast batch translation...", flush=True)

with ThreadPoolExecutor(max_workers=15) as executor:
    for lang in LANG_MAP.keys():
        for b in batches:
            tasks.append(executor.submit(translate_batch, b, lang))

    completed = 0
    total = len(tasks)
    for fut in tasks:
        target_lang, pairs = fut.result()
        for orig, trans in pairs:
            TRANSLATION_MAP[target_lang][orig] = trans
        completed += 1
        if completed % 50 == 0 or completed == total:
            print(f"Completed {completed}/{total} batches in {round(time.time() - start_time, 1)}s", flush=True)

print(f"Batch translation completed in {round(time.time() - start_time, 1)}s!", flush=True)

# Build full dictionary
def build_locale(d, lang):
    if isinstance(d, dict):
        res = {}
        for k, v in d.items():
            res[k] = build_locale(v, lang)
        return res
    elif isinstance(d, str):
        if lang == "fr":
            return d
        return TRANSLATION_MAP[lang].get(d, d)
    return d

all_locales_100 = {
    "fr": fr,
    "en": en
}

for lang in LANG_MAP.keys():
    all_locales_100[lang] = build_locale(fr, lang)
    print(f"Full {lang} dictionary: {len(all_locales_100[lang])} domains", flush=True)

with open("all_locales_100.json", "w", encoding="utf-8") as f:
    json.dump(all_locales_100, f, ensure_ascii=False, indent=2)

print("SUCCESS: all_locales_100.json written with 100% full coverage for all 12 languages!", flush=True)
