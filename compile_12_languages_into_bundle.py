import json
import re

fr = json.load(open("locales-fr.json", "r", encoding="utf-8"))
en = json.load(open("locales-en.json", "r", encoding="utf-8"))
th = json.load(open("locales-th.json", "r", encoding="utf-8"))
si = json.load(open("locales-si.json", "r", encoding="utf-8"))
bn = json.load(open("locales-bn.json", "r", encoding="utf-8"))

from trans_core import CORE_TRANSLATIONS
from trans_modules import MODULE_TRANSLATIONS

LANGUAGES = [
    {"code": "fr", "label": "Français", "flag": "🇫🇷", "locale": "fr-FR"},
    {"code": "en", "label": "English", "flag": "🇬🇧", "locale": "en-GB"},
    {"code": "ar", "label": "العربية", "flag": "🇸🇦", "locale": "ar-SA"},
    {"code": "es", "label": "Español", "flag": "🇪🇸", "locale": "es-ES"},
    {"code": "it", "label": "Italiano", "flag": "🇮🇹", "locale": "it-IT"},
    {"code": "de", "label": "Deutsch", "flag": "🇩🇪", "locale": "de-DE"},
    {"code": "si", "label": "සිංහල", "flag": "🇱🇰", "locale": "si-LK"},
    {"code": "bn", "label": "বাংলা", "flag": "🇧🇩", "locale": "bn-BD"},
    {"code": "ta", "label": "தமிழ்", "flag": "🇮🇳", "locale": "ta-IN"},
    {"code": "hi", "label": "हिन्दी", "flag": "🇮🇳", "locale": "hi-IN"},
    {"code": "th", "label": "ภาษาไทย", "flag": "🇹🇭", "locale": "th-TH"},
    {"code": "zh", "label": "中文", "flag": "🇨🇳", "locale": "zh-CN"}
]

def build_language_dict(lang_code):
    if lang_code == "fr":
        return fr
    if lang_code == "en":
        return en

    base_existing = {}
    if lang_code == "th":
        base_existing = th
    elif lang_code == "si":
        base_existing = si
    elif lang_code == "bn":
        base_existing = bn

    res = {}
    for domain, domain_content in fr.items():
        res[domain] = {}
        if isinstance(domain_content, dict):
            for k, val in domain_content.items():
                # Check CORE_TRANSLATIONS
                if domain in CORE_TRANSLATIONS and lang_code in CORE_TRANSLATIONS[domain] and k in CORE_TRANSLATIONS[domain][lang_code]:
                    res[domain][k] = CORE_TRANSLATIONS[domain][lang_code][k]
                # Check MODULE_TRANSLATIONS
                elif domain in MODULE_TRANSLATIONS and lang_code in MODULE_TRANSLATIONS[domain] and k in MODULE_TRANSLATIONS[domain][lang_code]:
                    res[domain][k] = MODULE_TRANSLATIONS[domain][lang_code][k]
                # Check base_existing
                elif domain in base_existing and isinstance(base_existing[domain], dict) and k in base_existing[domain]:
                    res[domain][k] = base_existing[domain][k]
                # Fallback to English, then French
                elif domain in en and isinstance(en[domain], dict) and k in en[domain]:
                    res[domain][k] = en[domain][k]
                else:
                    res[domain][k] = val
        else:
            res[domain] = domain_content
    return res

all_locales = {}
for l in LANGUAGES:
    code = l["code"]
    all_locales[code] = build_language_dict(code)
    print(f"Compiled {code} ({l['label']}): {len(all_locales[code])} domains")

with open("all_locales_12.json", "w", encoding="utf-8") as f:
    json.dump(all_locales, f, ensure_ascii=False, indent=2)

print("Generated all_locales_12.json successfully!")
