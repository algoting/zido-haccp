import json
import re

fr = json.load(open("locales-fr.json", "r", encoding="utf-8"))
en = json.load(open("locales-en.json", "r", encoding="utf-8"))
th = json.load(open("locales-th.json", "r", encoding="utf-8"))
si = json.load(open("locales-si.json", "r", encoding="utf-8"))
bn = json.load(open("locales-bn.json", "r", encoding="utf-8"))

# Language definitions
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

print("Building translations engine for all 12 languages...")
