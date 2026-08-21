import json

fr = json.load(open("locales-fr.json", "r", encoding="utf-8"))
en = json.load(open("locales-en.json", "r", encoding="utf-8"))
th = json.load(open("locales-th.json", "r", encoding="utf-8"))
si = json.load(open("locales-si.json", "r", encoding="utf-8"))
bn = json.load(open("locales-bn.json", "r", encoding="utf-8"))

# Load trans_core
from trans_core import CORE_TRANSLATIONS

LANGUAGES = ["fr", "en", "ar", "es", "it", "de", "si", "bn", "ta", "hi", "th", "zh"]

# Build full dictionary structure
all_locales = {}
for lang in LANGUAGES:
    all_locales[lang] = {}

print("Initialized all 12 language dictionaries.")
