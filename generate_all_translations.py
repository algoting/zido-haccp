import json

fr = json.load(open("locales-fr.json"))
en = json.load(open("locales-en.json"))
th = json.load(open("locales-th.json", "r", encoding="utf-8"))
si = json.load(open("locales-si.json", "r", encoding="utf-8"))
bn = json.load(open("locales-bn.json", "r", encoding="utf-8"))

print("Loaded base languages.")
