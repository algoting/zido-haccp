import json
import urllib.request
import urllib.parse
import time
import re
import concurrent.futures

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

# Cache for all translations
CACHE = {}

def protect_placeholders(text):
    # Replace {{...}} with ___N___
    placeholders = []
    def repl(m):
        placeholders.append(m.group(0))
        return f"___{len(placeholders)-1}___"
    protected = re.sub(r"\{\{[^}]+\}\}", repl, text)
    return protected, placeholders

def restore_placeholders(text, placeholders):
    for i, p in enumerate(placeholders):
        # Match ___i___ with possible spaces
        pattern = re.compile(rf"___\s*{i}\s*___")
        text = pattern.sub(p, text)
    return text

def translate_one(text, target_lang):
    if not text or not isinstance(text, str):
        return text
    key = (text, target_lang)
    if key in CACHE:
        return CACHE[key]
    
    # Check if text is just symbols or numbers
    if text.strip() in ["-", "+", "✕", "✏️", "🗑️", "➕", "📷", "🖨️", "°C", "%", "PMS", "HACCP", "DLC"]:
        CACHE[key] = text
        return text

    protected_text, placeholders = protect_placeholders(text)
    api_lang = LANG_MAP.get(target_lang, target_lang)
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl={api_lang}&dt=t&q=" + urllib.parse.quote(protected_text)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                translated = "".join([part[0] for part in data[0] if part[0]])
                restored = restore_placeholders(translated, placeholders)
                CACHE[key] = restored
                return restored
        except Exception as e:
            time.sleep(0.3 * (attempt + 1))
    
    # Fallback to English if translation fails
    CACHE[key] = text
    return text

def translate_dict(d, target_lang):
    if isinstance(d, dict):
        res = {}
        for k, v in d.items():
            res[k] = translate_dict(v, target_lang)
        return res
    elif isinstance(d, str):
        return translate_one(d, target_lang)
    elif isinstance(d, list):
        return [translate_dict(item, target_lang) for item in d]
    return d

print("Translation engine script initialized.")
