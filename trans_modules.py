import json

MODULE_TRANSLATIONS = {
    "temperature": {
        "ar": {
            "title": "درجات الحرارة", "subtitle": "تسجيل ومراقبة درجات حرارة المعدات وغرف التبريد",
            "record": "➕ تسجيل قياس", "history": "سجل القياسات", "alerts": "تنبيهات الحرارة",
            "sensor": "المستشعر", "temp": "درجة الحرارة", "min": "الحد الأدنى", "max": "الحد الأقصى",
            "status": "الحالة", "conform": "مطابق للمعايير", "nonConform": "غير مطابق (إنذار)",
            "date": "التاريخ والوقت", "operator": "المسؤول", "comment": "ملاحظات", "save": "حفظ القياس"
        },
        "es": {
            "title": "Temperaturas", "subtitle": "Registro y control de temperaturas de equipos y cámaras frigoríficas",
            "record": "➕ Registrar lectura", "history": "Historial de lecturas", "alerts": "Alertas de temperatura",
            "sensor": "Sonda", "temp": "Temperatura", "min": "Mínimo", "max": "Máximo",
            "status": "Estado", "conform": "Conforme", "nonConform": "No conforme (Alerta)",
            "date": "Fecha y hora", "operator": "Responsable", "comment": "Observaciones", "save": "Guardar lectura"
        },
        "it": {
            "title": "Temperature", "subtitle": "Registrazione e controllo delle temperature di attrezzature e celle",
            "record": "➕ Registra misura", "history": "Cronologia misure", "alerts": "Allarmi temperatura",
            "sensor": "Sonda", "temp": "Temperatura", "min": "Minimo", "max": "Massimo",
            "status": "Stato", "conform": "Conforme", "nonConform": "Non conforme (Allarme)",
            "date": "Data e ora", "operator": "Responsabile", "comment": "Note", "save": "Salva misura"
        },
        "de": {
            "title": "Temperaturen", "subtitle": "Erfassung und Überwachung der Temperaturen von Geräten und Kühlräumen",
            "record": "➕ Messung erfassen", "history": "Messverlauf", "alerts": "Temperaturalarme",
            "sensor": "Fühler", "temp": "Temperatur", "min": "Min", "max": "Max",
            "status": "Status", "conform": "Konform", "nonConform": "Nicht konform (Alarm)",
            "date": "Datum & Uhrzeit", "operator": "Verantwortlicher", "comment": "Bemerkung", "save": "Messung speichern"
        },
        "ta": {
            "title": "வெப்பநிலைகள்", "subtitle": "உபகரணங்கள் மற்றும் குளிர்சாதன அறைகளின் வெப்பநிலையைக் கண்காணித்தல்",
            "record": "➕ வெப்பநிலையை பதிவு செய்", "history": "பதிவு வரலாறு", "alerts": "வெப்பநிலை எச்சரிக்கைகள்",
            "sensor": "சென்சார்", "temp": "வெப்பநிலை", "min": "குறைந்தபட்சம்", "max": "அதிகபட்சம்",
            "status": "நிலை", "conform": "சரியானது", "nonConform": "விதிமீறல் (எச்சரிக்கை)",
            "date": "தேதி & நேரம்", "operator": "பொறுப்பாளர்", "comment": "குறிப்புகள்", "save": "பதிவைச் சேமிக்கவும்"
        },
        "hi": {
            "title": "तापमान", "subtitle": "उपकरणों और कोल्ड रूम के तापमान की निगरानी और रिकॉर्डिंग",
            "record": "➕ रीडिंग दर्ज करें", "history": "माप इतिहास", "alerts": "तापमान अलर्ट",
            "sensor": "सेंसर", "temp": "तापमान", "min": "न्यूनतम", "max": "अधिकतम",
            "status": "स्थिति", "conform": "अनुरूप", "nonConform": "गैर-अनुरूप (अलर्ट)",
            "date": "दिनांक और समय", "operator": "जिम्मेदार", "comment": "टिप्पणी", "save": "रीडिंग सहेजें"
        },
        "zh": {
            "title": "温度监控", "subtitle": "记录和监控冷藏冷冻设备及冷库温度",
            "record": "➕ 录入温度", "history": "测温历史记录", "alerts": "温度异常预警",
            "sensor": "探针/传感器", "temp": "温度", "min": "最低温", "max": "最高温",
            "status": "状态", "conform": "温度达标", "nonConform": "温度异常（警报）",
            "date": "记录时间", "operator": "记录人", "comment": "备注说明", "save": "保存记录"
        }
    },
    "cleaning": {
        "ar": {
            "title": "النظافة والتطهير", "subtitle": "خطة النظافة الصحية وسجل التعقيم اليومي والأسبوعي",
            "daily": "يومي", "weekly": "أسبوعي", "tasks": "المهام", "addSector": "➕ إضافة قطاع",
            "addSubSector": "➕ إضافة منطقة فرعية", "addEquipment": "➕ إضافة جهاز", "addTask": "➕ إضافة مهمة",
            "done": "تم التنفيذ", "pending": "قيد الانتظار", "validatePlan": "اعتماد خطة اليوم", "completed": "مكتمل"
        },
        "es": {
            "title": "Limpieza y Desinfección", "subtitle": "Plan de limpieza y registro de desinfección diaria y semanal",
            "daily": "Diario", "weekly": "Semanal", "tasks": "Tareas", "addSector": "➕ Añadir sector",
            "addSubSector": "➕ Añadir subsector", "addEquipment": "➕ Añadir equipo", "addTask": "➕ Añadir tarea",
            "done": "Realizado", "pending": "Pendiente", "validatePlan": "Validar plan del día", "completed": "Completado"
        },
        "it": {
            "title": "Pulizia e Sanificazione", "subtitle": "Piano di pulizia e registro delle sanificazioni giornaliere e settimanali",
            "daily": "Giornaliero", "weekly": "Settimanale", "tasks": "Compiti", "addSector": "➕ Aggiungi settore",
            "addSubSector": "➕ Aggiungi sottosettore", "addEquipment": "➕ Aggiungi attrezzatura", "addTask": "➕ Aggiungi compito",
            "done": "Eseguito", "pending": "In attesa", "validatePlan": "Valida piano del giorno", "completed": "Completato"
        },
        "de": {
            "title": "Reinigung & Desinfektion", "subtitle": "Reinigungsplan und Nachweis täglicher und wöchentlicher Desinfektionen",
            "daily": "Täglich", "weekly": "Wöchentlich", "tasks": "Aufgaben", "addSector": "➕ Bereich hinzufügen",
            "addSubSector": "➕ Unterbereich hinzufügen", "addEquipment": "➕ Gerät hinzufügen", "addTask": "➕ Aufgabe hinzufügen",
            "done": "Erledigt", "pending": "Ausstehend", "validatePlan": "Tagesplan bestätigen", "completed": "Abgeschlossen"
        },
        "ta": {
            "title": "சுத்தம் மற்றும் கிருமிநாசினி", "subtitle": "தினசரி மற்றும் வாராந்திர சுத்தம் திட்டம் மற்றும் பதிவு",
            "daily": "தினசரி", "weekly": "வாராந்திர", "tasks": "பணிகள்", "addSector": "➕ பகுதி சேர்க்க",
            "addSubSector": "➕ துணை பகுதி சேர்க்க", "addEquipment": "➕ உபகரணம் சேர்க்க", "addTask": "➕ பணி சேர்க்க",
            "done": "முடிந்தது", "pending": "நிலுவையில்", "validatePlan": "திட்டத்தை உறுதிப்படுத்து", "completed": "முழுமையானது"
        },
        "hi": {
            "title": "सफाई और कीटाणुशोधन", "subtitle": "दैनिक और साप्ताहिक सफाई योजना और स्वच्छता रिकॉर्ड",
            "daily": "दैनिक", "weekly": "साप्ताहिक", "tasks": "कार्य", "addSector": "➕ क्षेत्र जोड़ें",
            "addSubSector": "➕ उप-क्षेत्र जोड़ें", "addEquipment": "➕ उपकरण जोड़ें", "addTask": "➕ कार्य जोड़ें",
            "done": "पूर्ण", "pending": "लंबित", "validatePlan": "आज की योजना सत्यापित करें", "completed": "संपन्न"
        },
        "zh": {
            "title": "清洁与消毒", "subtitle": "卫生清洁计划与每日/每周消毒执行记录",
            "daily": "每日任务", "weekly": "每周任务", "tasks": "任务项", "addSector": "➕ 添加区域",
            "addSubSector": "➕ 添加子区域", "addEquipment": "➕ 添加设备", "addTask": "➕ 添加清洁任务",
            "done": "已完成", "pending": "待执行", "validatePlan": "确认并提交今日计划", "completed": "已全部完成"
        }
    },
    "reception": {
        "ar": {
            "title": "استلام البضائع", "subtitle": "مراقبة درجات الحرارة وسلامة الشحنات ومطابقة الفواتير",
            "add": "➕ استلام جديد", "supplier": "المورد", "category": "الفئة", "temp": "درجة الحرارة المستلمة",
            "packageOk": "التغليف سليم", "orderNo": "رقم الطلبية", "invoiceNo": "رقم الفاتورة", "photo": "صورة الشحنة",
            "frais": "طازج", "sec": "جاف", "surgele": "مجمد", "submit": "تسجيل الاستلام", "history": "سجل الاستلام"
        },
        "es": {
            "title": "Recepción de Mercancías", "subtitle": "Control de temperatura, integridad del embalaje y albaranes",
            "add": "➕ Nueva recepción", "supplier": "Proveedor", "category": "Categoría", "temp": "Temperatura al recibir",
            "packageOk": "Embalaje correcto", "orderNo": "Nº de pedido", "invoiceNo": "Nº de factura", "photo": "Foto del albarán/producto",
            "frais": "Fresco", "sec": "Seco", "surgele": "Congelado", "submit": "Registrar recepción", "history": "Historial de recepciones"
        },
        "it": {
            "title": "Ricezione Merci", "subtitle": "Controllo temperatura, conformità imballi e bolle di consegna",
            "add": "➕ Nuova ricezione", "supplier": "Fornitore", "category": "Categoria", "temp": "Temperatura alla consegna",
            "packageOk": "Imballo integro", "orderNo": "N. ordine", "invoiceNo": "N. fattura", "photo": "Foto bolla/merce",
            "frais": "Fresco", "sec": "Secco", "surgele": "Surgelato", "submit": "Registra ricezione", "history": "Cronologia ricezioni"
        },
        "de": {
            "title": "Wareneingangskontrolle", "subtitle": "Temperaturprüfung, Verpackungszustand und Lieferscheinabgleich",
            "add": "➕ Neuer Wareneingang", "supplier": "Lieferant", "category": "Kategorie", "temp": "Eingangstemperatur",
            "packageOk": "Verpackung unversehrt", "orderNo": "Bestellnummer", "invoiceNo": "Rechnungsnummer", "photo": "Foto Lieferschein/Ware",
            "frais": "Frischware", "sec": "Trockenware", "surgele": "Tiefkühlware", "submit": "Wareneingang buchen", "history": "Wareneingangshistorie"
        },
        "ta": {
            "title": "பொருட்கள் பெறுதல்", "subtitle": "வெப்பநிலை, பேக்கேஜிங் மற்றும் இன்வாய்ஸ் சரிபார்ப்பு",
            "add": "➕ புதிய வரவேற்பு", "supplier": "வழங்குநர்", "category": "வகை", "temp": "பெறப்பட்ட வெப்பநிலை",
            "packageOk": "பேக்கேஜிங் சரியானது", "orderNo": "ஆர்டர் எண்", "invoiceNo": "விலைப்பட்டியல் எண்", "photo": "புகைப்படம்",
            "frais": "புதியது", "sec": "உலர்", "surgele": "உறைந்தது", "submit": "பதிவு செய்", "history": "வரலாறு"
        },
        "hi": {
            "title": "माल प्राप्ति नियंत्रण", "subtitle": "आगमन तापमान, पैकेजिंग स्थिति और चालान सत्यापन",
            "add": "➕ नई प्राप्ति", "supplier": "आपूर्तिकर्ता", "category": "श्रेणी", "temp": "प्राप्ति तापमान",
            "packageOk": "पैकेजिंग ठीक है", "orderNo": "ऑर्डर संख्या", "invoiceNo": "चालान संख्या", "photo": "फोटो",
            "frais": "ताजा", "sec": "सूखा", "surgele": "जमा हुआ", "submit": "प्राप्ति दर्ज करें", "history": "प्राप्ति इतिहास"
        },
        "zh": {
            "title": "收货验货管理", "subtitle": "食材到货温度检验、包装完整性检查与单据留存",
            "add": "➕ 新增到货验收", "supplier": "供应商", "category": "食材类别", "temp": "实测到货温度",
            "packageOk": "包装完好无损", "orderNo": "采购单号", "invoiceNo": "发票/送货单号", "photo": "留样/单据照片",
            "frais": "生鲜冷藏", "sec": "常温干货", "surgele": "冷冻食材", "submit": "保存验货记录", "history": "历史收货档案"
        }
    },
    "oil": {
        "ar": {
            "title": "مراقبة زيوت القلي", "subtitle": "قياس المركبات القطبية (TPM %) وجداول تغيير الزيت",
            "addCheck": "➕ تسجيل فحص الزيت", "station": "المقلاة", "polarity": "النسبة القطبية (TPM %)",
            "quality": "جودة الزيت", "oilChanged": "تم تغيير الزيت بالكامل", "good": "مطابق وسليم (< 24%)", "bad": "يجب تغييره فوراً (≥ 24%)"
        },
        "es": {
            "title": "Control de Aceites de Fritura", "subtitle": "Medición de compuestos polares (TPM %) y cambios de aceite",
            "addCheck": "➕ Registrar control de aceite", "station": "Freidora", "polarity": "Compuestos polares (TPM %)",
            "quality": "Calidad del aceite", "oilChanged": "Aceite renovado completamente", "good": "Apto para consumo (< 24%)", "bad": "Desechar inmediatamente (≥ 24%)"
        },
        "it": {
            "title": "Controllo Olii di Frittura", "subtitle": "Misurazione sostanze polari (TPM %) e registro ricambi olio",
            "addCheck": "➕ Registra controllo olio", "station": "Friggitrice", "polarity": "Sostanze polari (TPM %)",
            "quality": "Qualità dell'olio", "oilChanged": "Olio sostituito completamente", "good": "Conforme (< 24%)", "bad": "Da sostituire subito (≥ 24%)"
        },
        "de": {
            "title": "Frittierölkontrolle", "subtitle": "Messung polarer Anteile (TPM %) und Dokumentation des Ölwechsels",
            "addCheck": "➕ Ölkontrolle erfassen", "station": "Fritteuse", "polarity": "Polare Anteile (TPM %)",
            "quality": "Ölqualität", "oilChanged": "Öl komplett gewechselt", "good": "Einwandfrei (< 24%)", "bad": "Sofort wechseln (≥ 24%)"
        },
        "ta": {
            "title": "எண்ணெய் மேலாண்மை", "subtitle": "எண்ணெய் தரம் மற்றும் மாற்றுதல் பதிவு",
            "addCheck": "➕ எண்ணெய் சோதனை பதிவு", "station": "வறுக்கும் கருவி", "polarity": "துருவ சதவீதம் (TPM %)",
            "quality": "எண்ணெய் தரம்", "oilChanged": "எண்ணெய் மாற்றப்பட்டது", "good": "நல்லது (< 24%)", "bad": "உடனே மாற்றவும் (≥ 24%)"
        },
        "hi": {
            "title": "तलने के तेल का नियंत्रण", "subtitle": "ध्रुवीय यौगिक (TPM %) माप और तेल परिवर्तन रिकॉर्ड",
            "addCheck": "➕ तेल जांच दर्ज करें", "station": "डीप फ्रायर", "polarity": "ध्रुवीयता (TPM %)",
            "quality": "तेल की गुणवत्ता", "oilChanged": "तेल पूरी तरह बदला गया", "good": "उपयोग योग्य (< 24%)", "bad": "तुरंत बदलें (≥ 24%)"
        },
        "zh": {
            "title": "煎炸食用油管理", "subtitle": "极性组分（TPM %）检测与废油更换台账",
            "addCheck": "➕ 录入油品检测", "station": "炸锅编号", "polarity": "极性组分比例 (TPM %)",
            "quality": "油品质量状态", "oilChanged": "已完成全量换油", "good": "油品良好 (< 24%)", "bad": "超标需立即更换 (≥ 24%)"
        }
    },
    "dlc": {
        "ar": {
            "title": "تواريخ الصلاحية والتغليف", "subtitle": "حساب الصلاحية الثانوية وطباعة الملصقات الصحية",
            "addPreparation": "➕ تحضير وصفة جديدة", "product": "المنتج", "category": "الفئة",
            "shelfLife": "فترة الصلاحية", "dlc": "تاريخ انتهاء الصلاحية (DLC)", "quantity": "الكمية", "print": "🖨️ طباعة ملصق",
            "destroy": "إتلاف وتخلص", "valid": "صالح للاستخدام", "expired": "منتهي الصلاحية"
        },
        "es": {
            "title": "Fechas de Caducidad y DLC", "subtitle": "Cálculo de vida útil secundaria e impresión de etiquetas",
            "addPreparation": "➕ Nueva preparación de receta", "product": "Producto", "category": "Categoría",
            "shelfLife": "Vida útil", "dlc": "Fecha de caducidad (DLC)", "quantity": "Cantidad", "print": "🖨️ Imprimir etiqueta",
            "destroy": "Desechar", "valid": "Válido", "expired": "Caducado"
        },
        "it": {
            "title": "Date di Scadenza e DLC", "subtitle": "Calcolo durata secondaria e stampa etichette HACCP",
            "addPreparation": "➕ Nuova preparazione ricetta", "product": "Prodotto", "category": "Categoria",
            "shelfLife": "Durata di conservazione", "dlc": "Data limite di consumo (DLC)", "quantity": "Quantità", "print": "🖨️ Stampa etichetta",
            "destroy": "Smaltisci", "valid": "Valido", "expired": "Scaduto"
        },
        "de": {
            "title": "Verbrauchsdaten & Etikettierung", "subtitle": "Berechnung der Sekundärhaltbarkeit und Etikettendruck",
            "addPreparation": "➕ Neue Rezeptzubereitung", "product": "Produkt", "category": "Kategorie",
            "shelfLife": "Haltbarkeitsdauer", "dlc": "Verbrauchsdatum (MHD/DLC)", "quantity": "Menge", "print": "🖨️ Etikett drucken",
            "destroy": "Entsorgen", "valid": "Haltbar", "expired": "Abgelaufen"
        },
        "ta": {
            "title": "காலாவதி தேதி மற்றும் லேபிள்கள்", "subtitle": "பயன்பாட்டு காலம் மற்றும் லேபிள் அச்சிடுதல்",
            "addPreparation": "➕ புதிய தயாரிப்பு", "product": "தயாரிப்பு", "category": "வகை",
            "shelfLife": "பயன்பாட்டு காலம்", "dlc": "காலாவதி தேதி (DLC)", "quantity": "அளவு", "print": "🖨️ லேபிள் அச்சிடு",
            "destroy": "அகற்று", "valid": "பயன்படுத்தலாம்", "expired": "காலாவதியானது"
        },
        "hi": {
            "title": "समाप्ति तिथियां और लेबल", "subtitle": "द्वितीयक शैल्फ जीवन गणना और खाद्य लेबल प्रिंटिंग",
            "addPreparation": "➕ नई रेसिपी तैयारी", "product": "उत्पाद", "category": "श्रेणी",
            "shelfLife": "उपयोग अवधि", "dlc": "उपभोग तिथि (DLC)", "quantity": "मात्रा", "print": "🖨️ लेबल प्रिंट करें",
            "destroy": "नष्ट करें", "valid": "वैध", "expired": "समाप्त"
        },
        "zh": {
            "title": "食品保质期与标签管理", "subtitle": "开封/预制二次保质期自动计算与HACCP食品标签打印",
            "addPreparation": "➕ 新增预制菜品", "product": "产品名称", "category": "品类",
            "shelfLife": "安全保质期限", "dlc": "消费截止日期（DLC）", "quantity": "数量/规格", "print": "🖨️ 打印食品标签",
            "destroy": "报废销毁", "valid": "保质期内有效", "expired": "已过期禁止使用"
        }
    }
}
print("Module translations loaded successfully.")
