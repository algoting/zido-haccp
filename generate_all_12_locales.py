import json
import os

fr = json.load(open("locales-fr.json", "r", encoding="utf-8"))
en = json.load(open("locales-en.json", "r", encoding="utf-8"))
th = json.load(open("locales-th.json", "r", encoding="utf-8"))
si = json.load(open("locales-si.json", "r", encoding="utf-8"))
bn = json.load(open("locales-bn.json", "r", encoding="utf-8"))

def recursive_fill(base, target, translator_dict=None):
    if isinstance(base, dict):
        res = {}
        for k, v in base.items():
            t_val = target.get(k) if isinstance(target, dict) else None
            if t_val is not None:
                res[k] = recursive_fill(v, t_val, translator_dict)
            else:
                # Use translator dictionary if available, else English or base
                if translator_dict and k in translator_dict:
                    res[k] = translator_dict[k]
                elif isinstance(v, dict):
                    res[k] = recursive_fill(v, {}, translator_dict)
                else:
                    res[k] = v
        return res
    return target if target is not None else base

print("Recursive fill helper ready.")
