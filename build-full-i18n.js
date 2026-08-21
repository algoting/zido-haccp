
const fs = require("fs");

const fr = JSON.parse(fs.readFileSync("locales-fr.json", "utf8"));
const en = JSON.parse(fs.readFileSync("locales-en.json", "utf8"));

// Languages list
const languages = [
  { code: "fr", label: "Français", flag: "🇫🇷", locale: "fr-FR" },
  { code: "en", label: "English", flag: "🇬🇧", locale: "en-GB" },
  { code: "ar", label: "العربية", flag: "🇸🇦", locale: "ar-SA", dir: "rtl" },
  { code: "es", label: "Español", flag: "🇪🇸", locale: "es-ES" },
  { code: "it", label: "Italiano", flag: "🇮🇹", locale: "it-IT" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", locale: "de-DE" },
  { code: "si", label: "සිංහල", flag: "🇱🇰", locale: "si-LK" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩", locale: "bn-BD" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳", locale: "ta-IN" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳", locale: "hi-IN" },
  { code: "th", label: "ภาษาไทย", flag: "🇹🇭", locale: "th-TH" },
  { code: "zh", label: "中文", flag: "🇨🇳", locale: "zh-CN" }
];

console.log("Languages configured:", languages.length);
