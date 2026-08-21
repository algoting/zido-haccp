import json

LANGS = ["ar", "es", "it", "de", "si", "bn", "ta", "hi", "th", "zh"]

CORE_TRANSLATIONS = {
    "nav": {
        "ar": {
            "dashboard": "لوحة القيادة", "tasks": "المهام", "tasksTodo": "قيد الانتظار", "tasksDone": "المهام المنجزة",
            "temperature": "درجات الحرارة", "equipment": "المعدات", "equipmentList": "قائمة المعدات", "configuration": "الإعدادات",
            "cleaning": "النظافة والتطهير", "cleaningPlan": "خطة اليوم", "cleaningConfig": "إعدادات النظافة", "oil": "مراقبة الزيوت",
            "tempTracking": "تتبع الحرارة", "incidents": "الحوادث والإنذارات", "pms": "خطة التحكم الصحي", "traceability": "التتبع الصحي",
            "traceabilityProducts": "المنتجات المستلمة", "preparations": "تحضيرات الوصفات", "dlc": "تواريخ الصلاحية", "dlcBatches": "الدفعات المحضرة",
            "dlcConfig": "إعدادات الصلاحية", "reception": "استلام البضائع", "receptions": "سجل الاستلام", "suppliers": "الموردون",
            "exports": "تصدير السجلات", "notifications": "الإشعارات", "support": "الدعم الفني", "settings": "الإعدادات"
        },
        "es": {
            "dashboard": "Panel de control", "tasks": "Tareas", "tasksTodo": "Por hacer", "tasksDone": "Tareas completadas",
            "temperature": "Temperaturas", "equipment": "Equipos", "equipmentList": "Lista de equipos", "configuration": "Configuración",
            "cleaning": "Limpieza", "cleaningPlan": "Plan del día", "cleaningConfig": "Configuración de limpieza", "oil": "Control de aceite",
            "tempTracking": "Seguimiento de temperatura", "incidents": "Incidentes", "pms": "Plan de Control Sanitario", "traceability": "Trazabilidad",
            "traceabilityProducts": "Productos recibidos", "preparations": "Preparaciones de recetas", "dlc": "Fechas de caducidad", "dlcBatches": "Lotes preparados",
            "dlcConfig": "Configuración de caducidad", "reception": "Recepción de mercancía", "receptions": "Recepciones", "suppliers": "Proveedores",
            "exports": "Exportaciones", "notifications": "Notificaciones", "support": "Soporte", "settings": "Configuración"
        },
        "it": {
            "dashboard": "Cruscotto", "tasks": "Compiti", "tasksTodo": "Da fare", "tasksDone": "Compiti completati",
            "temperature": "Temperature", "equipment": "Attrezzature", "equipmentList": "Elenco attrezzature", "configuration": "Configurazione",
            "cleaning": "Pulizia", "cleaningPlan": "Piano del giorno", "cleaningConfig": "Configurazione pulizia", "oil": "Gestione olio",
            "tempTracking": "Monitoraggio temperatura", "incidents": "Incidenti", "pms": "Piano di Autocontrollo", "traceability": "Tracciabilità",
            "traceabilityProducts": "Prodotti ricevuti", "preparations": "Preparazioni ricette", "dlc": "Date di scadenza", "dlcBatches": "Lotti preparati",
            "dlcConfig": "Configurazione scadenze", "reception": "Ricezione merce", "receptions": "Ricezioni", "suppliers": "Fornitori",
            "exports": "Esportazioni", "notifications": "Notifiche", "support": "Supporto", "settings": "Impostazioni"
        },
        "de": {
            "dashboard": "Dashboard", "tasks": "Aufgaben", "tasksTodo": "Zu erledigen", "tasksDone": "Erledigte Aufgaben",
            "temperature": "Temperaturen", "equipment": "Geräte", "equipmentList": "Geräteliste", "configuration": "Konfiguration",
            "cleaning": "Reinigung", "cleaningPlan": "Tagesplan", "cleaningConfig": "Reinigungskonfiguration", "oil": "Ölmanagement",
            "tempTracking": "Temperaturverfolgung", "incidents": "Vorfälle", "pms": "Hygienekonzept (PMS)", "traceability": "Rückverfolgbarkeit",
            "traceabilityProducts": "Empfangene Produkte", "preparations": "Rezeptzubereitungen", "dlc": "Verbrauchsdaten (MHD)", "dlcBatches": "Vorbereitete Chargen",
            "dlcConfig": "MHD-Konfiguration", "reception": "Wareneingang", "receptions": "Lieferungen", "suppliers": "Lieferanten",
            "exports": "Exporte", "notifications": "Benachrichtigungen", "support": "Support", "settings": "Einstellungen"
        },
        "ta": {
            "dashboard": "டாஷ்போர்டு", "tasks": "பணிகள்", "tasksTodo": "செய்ய வேண்டியவை", "tasksDone": "முடிந்த பணிகள்",
            "temperature": "வெப்பநிலைகள்", "equipment": "உபகரணங்கள்", "equipmentList": "உபகரண பட்டியல்", "configuration": "கட்டமைப்பு",
            "cleaning": "சுத்தம் செய்தல்", "cleaningPlan": "இன்றைய திட்டம்", "cleaningConfig": "சுத்தம் கட்டமைப்பு", "oil": "எண்ணெய் மேலாண்மை",
            "tempTracking": "வெப்பநிலை கண்காணிப்பு", "incidents": "சம்பவங்கள்", "pms": "சுகாதார கட்டுப்பாடு", "traceability": "கண்காணிப்பு",
            "traceabilityProducts": "பெறப்பட்ட பொருட்கள்", "preparations": "தயாரிப்புகள்", "dlc": "காலாவதி தேதி", "dlcBatches": "தயாரிக்கப்பட்டவை",
            "dlcConfig": "காலாவதி கட்டமைப்பு", "reception": "பொருட்கள் பெறுதல்", "receptions": "பெறுதல்கள்", "suppliers": "வழங்குநர்கள்",
            "exports": "ஏற்றுமதிகள்", "notifications": "அறிவிப்புகள்", "support": "ஆதரவு", "settings": "அமைப்புகள்"
        },
        "hi": {
            "dashboard": "डैशबोर्ड", "tasks": "कार्य", "tasksTodo": "करने योग्य", "tasksDone": "पूर्ण कार्य",
            "temperature": "तापमान", "equipment": "उपकरण", "equipmentList": "उपकरण सूची", "configuration": "विन्यास",
            "cleaning": "सफाई", "cleaningPlan": "आज की योजना", "cleaningConfig": "सफाई विन्यास", "oil": "तेल प्रबंधन",
            "tempTracking": "तापमान ट्रैकिंग", "incidents": "घटनाएं", "pms": "स्वच्छता नियंत्रण योजना", "traceability": "अनुरेखणीयता",
            "traceabilityProducts": "प्राप्त उत्पाद", "preparations": "व्यंजन तैयारी", "dlc": "समाप्ति तिथि", "dlcBatches": "तैयार बैच",
            "dlcConfig": "समाप्ति विन्यास", "reception": "माल प्राप्ति", "receptions": "प्राप्तियां", "suppliers": "आपूर्तिकर्ता",
            "exports": "निर्यात", "notifications": "सूचनाएं", "support": "सहायता", "settings": "सेटिंग्स"
        },
        "zh": {
            "dashboard": "控制台", "tasks": "任务", "tasksTodo": "待办任务", "tasksDone": "已完成任务",
            "temperature": "温度监控", "equipment": "设备管理", "equipmentList": "设备列表", "configuration": "配置",
            "cleaning": "清洁消毒", "cleaningPlan": "今日计划", "cleaningConfig": "清洁配置", "oil": "煎炸油管理",
            "tempTracking": "温度追踪", "incidents": "异常事件", "pms": "卫生控制计划", "traceability": "可追溯性",
            "traceabilityProducts": "已接收产品", "preparations": "配方预制", "dlc": "保质期管理", "dlcBatches": "预制批次",
            "dlcConfig": "保质期配置", "reception": "收货检验", "receptions": "收货记录", "suppliers": "供应商",
            "exports": "报告导出", "notifications": "系统通知", "support": "技术支持", "settings": "系统设置"
        }
    },
    "roles": {
        "ar": {"OWNER": "مالك", "AUDITOR": "مدقق صحي", "MANAGER": "مدير", "EMPLOYEE": "موظف", "STAFF": "فريق العمل", "PLATFORM_ADMIN": "مسؤول النظام", "member": "عضو"},
        "es": {"OWNER": "Propietario", "AUDITOR": "Auditor", "MANAGER": "Gerente", "EMPLOYEE": "Empleado", "STAFF": "Personal", "PLATFORM_ADMIN": "Administrador", "member": "Miembro"},
        "it": {"OWNER": "Proprietario", "AUDITOR": "Ispettore", "MANAGER": "Manager", "EMPLOYEE": "Dipendente", "STAFF": "Personale", "PLATFORM_ADMIN": "Amministratore", "member": "Membro"},
        "de": {"OWNER": "Inhaber", "AUDITOR": "Auditor", "MANAGER": "Manager", "EMPLOYEE": "Mitarbeiter", "STAFF": "Personal", "PLATFORM_ADMIN": "Administrator", "member": "Mitglied"},
        "ta": {"OWNER": "உரிமையாளர்", "AUDITOR": "ஆய்வாளர்", "MANAGER": "மேலாளர்", "EMPLOYEE": "பணியாளர்", "STAFF": "ஊழியர்கள்", "PLATFORM_ADMIN": "நிர்வாகி", "member": "உறுப்பினர்"},
        "hi": {"OWNER": "मालिक", "AUDITOR": "लेखा परीक्षक", "MANAGER": "प्रबंधक", "EMPLOYEE": "कर्मचारी", "STAFF": "स्टाफ", "PLATFORM_ADMIN": "प्रशासक", "member": "सदस्य"},
        "zh": {"OWNER": "业主", "AUDITOR": "审核员", "MANAGER": "经理", "EMPLOYEE": "员工", "STAFF": "工作人员", "PLATFORM_ADMIN": "系统管理员", "member": "成员"}
    },
    "common": {
        "ar": {
            "save": "حفظ التعديلات", "saving": "⏳ جاري الحفظ...", "cancel": "✕ إلغاء", "edit": "✏️ تعديل", "delete": "🗑️ حذف",
            "create": "➕ إنشاء", "creating": "جاري الإنشاء...", "loading": "جاري التحميل...", "error": "خطأ", "success": "تم بنجاح",
            "close": "✕ إغلاق", "add": "➕ إضافة", "submit": "إرسال", "user": "مستخدم", "confirm": "✅ تأكيد",
            "back": "← رجوع", "next": "التالي", "search": "🔍 بحث", "filter": "⚡ تصفية", "all": "الكل",
            "none": "لا شيء", "yes": "نعم", "no": "لا", "days": "أيام", "hours": "ساعات", "minutes": "دقائق",
            "copyright": "© 2026 ZIDO HACCP. جميع الحقوق محفوظة.", "appName": "ZIDO HACCP", "errorOccurred": "حدث خطأ",
            "technicalDetails": "تفاصيل تقنية", "backHome": "العودة للرئيسية"
        },
        "es": {
            "save": "Guardar cambios", "saving": "⏳ Guardando...", "cancel": "✕ Cancelar", "edit": "✏️ Editar", "delete": "🗑️ Eliminar",
            "create": "➕ Crear", "creating": "Creando...", "loading": "Cargando...", "error": "Error", "success": "Éxito",
            "close": "✕ Cerrar", "add": "➕ Añadir", "submit": "Enviar", "user": "Usuario", "confirm": "✅ Confirmar",
            "back": "← Volver", "next": "Siguiente", "search": "🔍 Buscar", "filter": "⚡ Filtrar", "all": "Todos",
            "none": "Ninguno", "yes": "Sí", "no": "No", "days": "días", "hours": "horas", "minutes": "minutos",
            "copyright": "© 2026 ZIDO HACCP. Todos los derechos reservados.", "appName": "ZIDO HACCP", "errorOccurred": "Ha ocurrido un error",
            "technicalDetails": "Detalles técnicos", "backHome": "Volver al inicio"
        },
        "it": {
            "save": "Salva modifiche", "saving": "⏳ Salvataggio...", "cancel": "✕ Annulla", "edit": "✏️ Modifica", "delete": "🗑️ Elimina",
            "create": "➕ Crea", "creating": "Creazione...", "loading": "Caricamento...", "error": "Errore", "success": "Operazione riuscita",
            "close": "✕ Chiudi", "add": "➕ Aggiungi", "submit": "Invia", "user": "Utente", "confirm": "✅ Conferma",
            "back": "← Indietro", "next": "Avanti", "search": "🔍 Cerca", "filter": "⚡ Filtra", "all": "Tutti",
            "none": "Nessuno", "yes": "Sì", "no": "No", "days": "giorni", "hours": "ore", "minutes": "minuti",
            "copyright": "© 2026 ZIDO HACCP. Tutti i diritti riservati.", "appName": "ZIDO HACCP", "errorOccurred": "Si è verificato un errore",
            "technicalDetails": "Dettagli tecnici", "backHome": "Torna alla home"
        },
        "de": {
            "save": "Änderungen speichern", "saving": "⏳ Speichern...", "cancel": "✕ Abbrechen", "edit": "✏️ Bearbeiten", "delete": "🗑️ Löschen",
            "create": "➕ Erstellen", "creating": "Erstelle...", "loading": "Laden...", "error": "Fehler", "success": "Erfolgreich",
            "close": "✕ Schließen", "add": "➕ Hinzufügen", "submit": "Absenden", "user": "Benutzer", "confirm": "✅ Bestätigen",
            "back": "← Zurück", "next": "Weiter", "search": "🔍 Suchen", "filter": "⚡ Filtern", "all": "Alle",
            "none": "Keine", "yes": "Ja", "no": "Nein", "days": "Tage", "hours": "Stunden", "minutes": "Minuten",
            "copyright": "© 2026 ZIDO HACCP. Alle Rechte vorbehalten.", "appName": "ZIDO HACCP", "errorOccurred": "Ein Fehler ist aufgetreten",
            "technicalDetails": "Technische Details", "backHome": "Zurück zur Startseite"
        },
        "ta": {
            "save": "சேமிக்கவும்", "saving": "⏳ சேமிக்கிறது...", "cancel": "✕ ரத்து", "edit": "✏️ திருத்து", "delete": "🗑️ நீக்கு",
            "create": "➕ உருவாக்கு", "creating": "உருவாக்குகிறது...", "loading": "ஏற்றுகிறது...", "error": "பிழை", "success": "வெற்றி",
            "close": "✕ மூடு", "add": "➕ சேர்", "submit": "சமர்ப்பி", "user": "பயனர்", "confirm": "✅ உறுதிசெய்",
            "back": "← பின்செல்", "next": "அடுத்து", "search": "🔍 தேடு", "filter": "⚡ வடிகட்டு", "all": "அனைத்தும்",
            "none": "எதுவுமில்லை", "yes": "ஆம்", "no": "இல்லை", "days": "நாட்கள்", "hours": "மணிநேரம்", "minutes": "நிமிடங்கள்",
            "copyright": "© 2026 ZIDO HACCP. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.", "appName": "ZIDO HACCP", "errorOccurred": "பிழை ஏற்பட்டது",
            "technicalDetails": "தொழில்நுட்ப விவரங்கள்", "backHome": "முகப்புக்குத் திரும்பு"
        },
        "hi": {
            "save": "परिवर्तन सहेजें", "saving": "⏳ सहेजा जा रहा है...", "cancel": "✕ रद्द करें", "edit": "✏️ संपादित करें", "delete": "🗑️ हटाएं",
            "create": "➕ बनाएं", "creating": "बनाया जा रहा है...", "loading": "लोड हो रहा है...", "error": "त्रुटि", "success": "सफलता",
            "close": "✕ बंद करें", "add": "➕ जोड़ें", "submit": "जमा करें", "user": "उपयोगकर्ता", "confirm": "✅ पुष्टि करें",
            "back": "← वापस", "next": "आगे", "search": "🔍 खोजें", "filter": "⚡ फ़िल्टर", "all": "सभी",
            "none": "कोई नहीं", "yes": "हाँ", "no": "नहीं", "days": "दिन", "hours": "घंटे", "minutes": "मिनट",
            "copyright": "© 2026 ZIDO HACCP. सर्वाधिकार सुरक्षित।", "appName": "ZIDO HACCP", "errorOccurred": "एक त्रुटि हुई",
            "technicalDetails": "तकनीकी विवरण", "backHome": "होम पर वापस जाएं"
        },
        "zh": {
            "save": "保存修改", "saving": "⏳ 正在保存...", "cancel": "✕ 取消", "edit": "✏️ 编辑", "delete": "🗑️ 删除",
            "create": "➕ 创建", "creating": "正在创建...", "loading": "正在加载...", "error": "错误", "success": "操作成功",
            "close": "✕ 关闭", "add": "➕ 添加", "submit": "提交", "user": "用户", "confirm": "✅ 确认",
            "back": "← 返回", "next": "下一步", "search": "🔍 搜索", "filter": "⚡ 筛选", "all": "全部",
            "none": "无", "yes": "是", "no": "否", "days": "天", "hours": "小时", "minutes": "分钟",
            "copyright": "© 2026 ZIDO HACCP. 保留所有权利。", "appName": "ZIDO HACCP", "errorOccurred": "发生错误",
            "technicalDetails": "技术详情", "backHome": "返回首页"
        }
    },
    "header": {
        "ar": {"greeting": "مرحباً، {{name}}", "logout": "تسجيل الخروج", "notifications": "الإشعارات", "loggedOut": "تم تسجيل الخروج", "language": "اللغة"},
        "es": {"greeting": "Hola, {{name}}", "logout": "Cerrar sesión", "notifications": "Notificaciones", "loggedOut": "Sesión cerrada con éxito", "language": "Idioma"},
        "it": {"greeting": "Ciao, {{name}}", "logout": "Disconnetti", "notifications": "Notifiche", "loggedOut": "Disconnessione riuscita", "language": "Lingua"},
        "de": {"greeting": "Hallo, {{name}}", "logout": "Abmelden", "notifications": "Benachrichtigungen", "loggedOut": "Erfolgreich abgemeldet", "language": "Sprache"},
        "ta": {"greeting": "வணக்கம், {{name}}", "logout": "வெளியேறு", "notifications": "அறிவிப்புகள்", "loggedOut": "வெற்றிகரமாக வெளியேறியது", "language": "மொழி"},
        "hi": {"greeting": "नमस्ते, {{name}}", "logout": "लॉग आउट", "notifications": "सूचनाएं", "loggedOut": "सफलतापूर्वक लॉग आउट किया गया", "language": "भाषा"},
        "zh": {"greeting": "您好，{{name}}", "logout": "退出登录", "notifications": "系统通知", "loggedOut": "已成功退出登录", "language": "语言选择"}
    },
    "language": {
        "ar": {"select": "اللغة", "fr": "Français", "en": "English", "ar": "العربية", "es": "Español", "it": "Italiano", "de": "Deutsch", "si": "සිංහල", "bn": "বাংলা", "ta": "தமிழ்", "hi": "हिन्दी", "th": "ภาษาไทย", "zh": "中文"},
        "es": {"select": "Idioma", "fr": "Français", "en": "English", "ar": "العربية", "es": "Español", "it": "Italiano", "de": "Deutsch", "si": "සිංහල", "bn": "বাংলা", "ta": "தமிழ்", "hi": "हिन्दी", "th": "ภาษาไทย", "zh": "中文"},
        "it": {"select": "Lingua", "fr": "Français", "en": "English", "ar": "العربية", "es": "Español", "it": "Italiano", "de": "Deutsch", "si": "සිංහල", "bn": "বাংলা", "ta": "தமிழ்", "hi": "हिन्दी", "th": "ภาษาไทย", "zh": "中文"},
        "de": {"select": "Sprache", "fr": "Français", "en": "English", "ar": "العربية", "es": "Español", "it": "Italiano", "de": "Deutsch", "si": "සිංහල", "bn": "বাংলা", "ta": "தமிழ்", "hi": "हिन्दी", "th": "ภาษาไทย", "zh": "中文"},
        "ta": {"select": "மொழி", "fr": "Français", "en": "English", "ar": "العربية", "es": "Español", "it": "Italiano", "de": "Deutsch", "si": "සිංහල", "bn": "বাংলা", "ta": "தமிழ்", "hi": "हिन्दी", "th": "ภาษาไทย", "zh": "中文"},
        "hi": {"select": "भाषा", "fr": "Français", "en": "English", "ar": "العربية", "es": "Español", "it": "Italiano", "de": "Deutsch", "si": "සිංහල", "bn": "বাংলা", "ta": "தமிழ்", "hi": "हिन्दी", "th": "ภาษาไทย", "zh": "中文"},
        "zh": {"select": "语言", "fr": "Français", "en": "English", "ar": "العربية", "es": "Español", "it": "Italiano", "de": "Deutsch", "si": "සිංහල", "bn": "বাংলা", "ta": "தமிழ்", "hi": "हिन्दी", "th": "ภาษาไทย", "zh": "中文"}
    },
    "staffDashboard": {
        "ar": {"question": "ماذا تريد أن تفعل؟", "subtitle": "اختر مهمة للبدء", "temperatures": "درجات الحرارة", "cleaning": "النظافة والتطهير", "reception": "استلام البضائع", "preparations": "تحضيرات الوصفات", "traceability": "التتبع الصحي", "oil": "مراقبة الزيوت", "incidents": "الحوادث", "tasks": "المهام", "tempTracking": "تتبع الحرارة"},
        "es": {"question": "¿Qué desea hacer?", "subtitle": "Seleccione una tarea para comenzar", "temperatures": "Temperaturas", "cleaning": "Limpieza", "reception": "Recepción de mercancía", "preparations": "Preparaciones de recetas", "traceability": "Trazabilidad", "oil": "Aceite", "incidents": "Incidentes", "tasks": "Tareas", "tempTracking": "Seguimiento de temperatura"},
        "it": {"question": "Cosa vuoi fare?", "subtitle": "Seleziona un compito per iniziare", "temperatures": "Temperature", "cleaning": "Pulizia", "reception": "Ricezione merce", "preparations": "Preparazioni ricette", "traceability": "Tracciabilità", "oil": "Olio", "incidents": "Incidenti", "tasks": "Compiti", "tempTracking": "Monitoraggio temperatura"},
        "de": {"question": "Was möchten Sie tun?", "subtitle": "Wählen Sie eine Aufgabe zum Starten", "temperatures": "Temperaturen", "cleaning": "Reinigung", "reception": "Wareneingang", "preparations": "Rezeptzubereitungen", "traceability": "Rückverfolgbarkeit", "oil": "Öl", "incidents": "Vorfälle", "tasks": "Aufgaben", "tempTracking": "Temperaturverfolgung"},
        "ta": {"question": "நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?", "subtitle": "தொடங்க ஒரு பணியைத் தேர்ந்தெடுக்கவும்", "temperatures": "வெப்பநிலைகள்", "cleaning": "சுத்தம்", "reception": "பொருட்கள் பெறுதல்", "preparations": "தயாரிப்புகள்", "traceability": "கண்காணிப்பு", "oil": "எண்ணெய்", "incidents": "சம்பவங்கள்", "tasks": "பணிகள்", "tempTracking": "வெப்பநிலை பதிவு"},
        "hi": {"question": "आप क्या करना चाहते हैं?", "subtitle": "शुरू करने के लिए एक कार्य चुनें", "temperatures": "तापमान", "cleaning": "सफाई", "reception": "माल प्राप्ति", "preparations": "व्यंजन तैयारी", "traceability": "अनुरेखणीयता", "oil": "तेल", "incidents": "घटनाएं", "tasks": "कार्य", "tempTracking": "तापमान ट्रैकिंग"},
        "zh": {"question": "您想进行什么操作？", "subtitle": "请选择一项任务开始记录", "temperatures": "温度记录", "cleaning": "清洁检查", "reception": "收货验货", "preparations": "预制菜品", "traceability": "卫生追溯", "oil": "煎炸油检测", "incidents": "异常申报", "tasks": "日常任务", "tempTracking": "温度追踪"}
    }
}
print("Core translations loaded successfully.")
