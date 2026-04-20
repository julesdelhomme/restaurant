export const PREDEFINED_LANGUAGE_OPTIONS_EXTENDED = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "ro", label: "Română" },
  { code: "el", label: "Ελληνικά" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文（普通话）" },
  { code: "ko", label: "한국어" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
] as const;

export type SmartCallOptionKeyExtended =
  | "help_question"
  | "ask_bill"
  | "need_water"
  | "need_bread"
  | "clear_table"
  | "report_problem"
  | "request_order";

export const SMART_CALL_I18N_EXTENDED: Record<
  string,
  {
    title: string;
    subtitle: string;
    cancel: string;
    sending: string;
    sent: string;
    options: Record<SmartCallOptionKeyExtended, string>;
  }
> = {
  fr: {
    title: "Besoin du serveur",
    subtitle: "Choisissez votre demande",
    cancel: "Fermer",
    sending: "Envoi...",
    sent: "Demande envoyée !",
    options: {
      help_question: "Aide / Question",
      ask_bill: "Demander l'addition",
      need_water: "Besoin d'une carafe d'eau",
      need_bread: "Besoin de pain",
      clear_table: "Demander à débarrasser",
      report_problem: "Signaler un problème",
      request_order: "Demander à commander",
    },
  },
  en: {
    title: "Need your server",
    subtitle: "Choose your request",
    cancel: "Close",
    sending: "Sending...",
    sent: "Request sent!",
    options: {
      help_question: "Help / Question",
      ask_bill: "Ask for the bill",
      need_water: "Need a carafe of water",
      need_bread: "Need bread",
      clear_table: "Clear the table",
      report_problem: "Report a problem",
      request_order: "Ready to order",
    },
  },
  es: {
    title: "Necesita al camarero",
    subtitle: "Seleccione su solicitud",
    cancel: "Cerrar",
    sending: "Envío...",
    sent: "Solicitud enviada",
    options: {
      help_question: "Ayuda / Pregunta",
      ask_bill: "Pedir la cuenta",
      need_water: "Necesito una jarra de agua",
      need_bread: "Necesito pan",
      clear_table: "Pedir que retiren la mesa",
      report_problem: "Reportar un problema",
      request_order: "Listo para pedir",
    },
  },
  de: {
    title: "Service anfordern",
    subtitle: "Bitte Anfrage wählen",
    cancel: "Schließen",
    sending: "Wird gesendet...",
    sent: "Anfrage gesendet",
    options: {
      help_question: "Hilfe / Frage",
      ask_bill: "Rechnung bitte",
      need_water: "Wasserkaraffe benötigt",
      need_bread: "Brot benötigt",
      clear_table: "Abräumen bitte",
      report_problem: "Problem melden",
      request_order: "Bestellen bitte",
    },
  },
  it: {
    title: "Hai bisogno del cameriere",
    subtitle: "Scegli la richiesta",
    cancel: "Chiudi",
    sending: "Invio...",
    sent: "Richiesta inviata",
    options: {
      help_question: "Aiuto / Domanda",
      ask_bill: "Chiedere il conto",
      need_water: "Richiedere una caraffa d'acqua",
      need_bread: "Richiedere pane",
      clear_table: "Chiedere di sparecchiare",
      report_problem: "Segnalare un problema",
      request_order: "Ordinare",
    },
  },
  pt: {
    title: "Precisa do garçom",
    subtitle: "Escolha seu pedido",
    cancel: "Fechar",
    sending: "Enviando...",
    sent: "Pedido enviado",
    options: {
      help_question: "Ajuda / Pergunta",
      ask_bill: "Pedir a conta",
      need_water: "Preciso de uma jarra de água",
      need_bread: "Preciso de pão",
      clear_table: "Pedir para limpar a mesa",
      report_problem: "Relatar um problema",
      request_order: "Pedir",
    },
  },
  nl: {
    title: "Hulp van de bediening",
    subtitle: "Kies uw verzoek",
    cancel: "Sluiten",
    sending: "Verzenden...",
    sent: "Verzoek verzonden",
    options: {
      help_question: "Hulp / Vraag",
      ask_bill: "Rekening vragen",
      need_water: "Karaf water nodig",
      need_bread: "Brood nodig",
      clear_table: "Afruimen vragen",
      report_problem: "Probleem melden",
      request_order: "Bestellen",
    },
  },
  pl: {
    title: "Potrzebujesz obsługi",
    subtitle: "Wybierz prośbę",
    cancel: "Zamknij",
    sending: "Wysyłanie...",
    sent: "Prośba wysłana",
    options: {
      help_question: "Pomoc / Pytanie",
      ask_bill: "Proszę o rachunek",
      need_water: "Proszę o karafkę wody",
      need_bread: "Proszę o pieczywo",
      clear_table: "Proszę posprzątać stół",
      report_problem: "Zgłoś problem",
      request_order: "Prośba o zamówienie",
    },
  },
  ro: {
    title: "Aveți nevoie de ospătar",
    subtitle: "Alegeți solicitarea",
    cancel: "Închide",
    sending: "Se trimite...",
    sent: "Cerere trimisă",
    options: {
      help_question: "Ajutor / Întrebare",
      ask_bill: "Cer nota de plată",
      need_water: "Am nevoie de o carafă cu apă",
      need_bread: "Am nevoie de pâine",
      clear_table: "Vă rog să debarasați",
      report_problem: "Semnalează o problemă",
      request_order: "Gata de comandă",
    },
  },
  el: {
    title: "Χρειάζεστε σερβιτόρο",
    subtitle: "Επιλέξτε αίτημα",
    cancel: "Κλείσιμο",
    sending: "Αποστολή...",
    sent: "Το αίτημα στάλθηκε",
    options: {
      help_question: "Βοήθεια / Ερώτηση",
      ask_bill: "Ζητώ τον λογαριασμό",
      need_water: "Χρειάζομαι καράφα νερό",
      need_bread: "Χρειάζομαι ψωμί",
      clear_table: "Ζητώ μάζεμα τραπεζιού",
      report_problem: "Αναφορά προβλήματος",
      request_order: "Παραγγελία",
    },
  },
  ja: {
    title: "スタッフを呼ぶ",
    subtitle: "ご用件を選択してください",
    cancel: "閉じる",
    sending: "送信中...",
    sent: "送信しました",
    options: {
      help_question: "質問・ヘルプ",
      ask_bill: "お会計をお願いする",
      need_water: "水差しをお願いする",
      need_bread: "パンをお願いする",
      clear_table: "下げてもらう",
      report_problem: "問題を伝える",
      request_order: "注文をお願いします",
    },
  },
  zh: {
    title: "需要服务员",
    subtitle: "请选择您的需求",
    cancel: "关闭",
    sending: "发送中...",
    sent: "请求已发送",
    options: {
      help_question: "帮助 / 提问",
      ask_bill: "请求买单",
      need_water: "需要一壶水",
      need_bread: "需要面包",
      clear_table: "请求收桌",
      report_problem: "反馈问题",
      request_order: "我准备好点餐了",
    },
  },
  ko: {
    title: "직원을 불러주세요",
    subtitle: "요청 사항을 선택하세요",
    cancel: "닫기",
    sending: "전송 중...",
    sent: "요청이 전송되었습니다",
    options: {
      help_question: "도움 / 질문",
      ask_bill: "계산서 요청",
      need_water: "물병(카라페) 요청",
      need_bread: "빵 요청",
      clear_table: "테이블 정리 요청",
      report_problem: "문제 신고",
      request_order: "주문할게요",
    },
  },
  ru: {
    title: "Позвать официанта",
    subtitle: "Выберите запрос",
    cancel: "Закрыть",
    sending: "Отправка...",
    sent: "Запрос отправлен",
    options: {
      help_question: "Помощь / Вопрос",
      ask_bill: "Попросить счёт",
      need_water: "Нужен графин воды",
      need_bread: "Нужен хлеб",
      clear_table: "Попросить убрать со стола",
      report_problem: "Сообщить о проблеме",
      request_order: "Попросить сделать заказ",
    },
  },
  tr: {
    title: "Garson çağır",
    subtitle: "Lütfen talebinizi seçin",
    cancel: "Kapat",
    sending: "Gönderiliyor...",
    sent: "Talep gönderildi",
    options: {
      help_question: "Yardım / Soru",
      ask_bill: "Hesabı iste",
      need_water: "Bir sürahi su istiyorum",
      need_bread: "Ekmek istiyorum",
      clear_table: "Masanın toplanmasını iste",
      report_problem: "Bir sorun bildir",
      request_order: "Sipariş vermek istiyorum",
    },
  },
  ar: {
    title: "طلب النادل",
    subtitle: "اختر طلبك",
    cancel: "إغلاق",
    sending: "جارٍ الإرسال...",
    sent: "تم إرسال الطلب",
    options: {
      help_question: "مساعدة / سؤال",
      ask_bill: "طلب الفاتورة",
      need_water: "طلب إبريق ماء",
      need_bread: "طلب خبز",
      clear_table: "طلب تنظيف الطاولة",
      report_problem: "الإبلاغ عن مشكلة",
      request_order: "طلب الطعام",
    },
  },
};

export const DEFAULT_ALLERGEN_TRANSLATIONS_EXTENDED: Record<string, Record<string, string>> = {
  gluten: { fr: "Gluten", en: "Gluten", es: "Gluten", de: "Gluten", pt: "Glúten", it: "Glutine", nl: "Gluten", pl: "Gluten", ja: "グルテン", zh: "麸质", ru: "Глютен", ar: "الغلوتين" },
  lactose: { fr: "Lactose", en: "Lactose", es: "Lactosa", de: "Laktose", pt: "Lactose", it: "Lattosio", nl: "Lactose", pl: "Laktoza", ja: "乳糖", zh: "乳糖", ru: "Лактоза", ar: "اللاكتوز" },
  arachides: { fr: "Arachides", en: "Peanuts", es: "Cacahuetes", de: "Erdnüsse", pt: "Amendoins", it: "Arachidi", nl: "Pinda's", pl: "Orzeszki ziemne", ja: "ピーナッツ", zh: "花生", ru: "Арахис", ar: "الفول السوداني" },
  oeufs: { fr: "Œufs", en: "Eggs", es: "Huevos", de: "Eier", pt: "Ovos", it: "Uova", nl: "Eieren", pl: "Jaja", ja: "卵", zh: "鸡蛋", ru: "Яйца", ar: "البيض" },
  lait: { fr: "Lait", en: "Milk", es: "Leche", de: "Milch", pt: "Leite", it: "Latte", nl: "Melk", pl: "Mleko", ja: "牛乳", zh: "牛奶", ru: "Молоко", ar: "الحليب" },
  poisson: { fr: "Poisson", en: "Fish", es: "Pescado", de: "Fisch", pt: "Peixe", it: "Pesce", nl: "Vis", pl: "Ryby", ja: "魚", zh: "鱼类", ru: "Рыба", ar: "السمك" },
  fruits_de_mer: { fr: "Fruits de mer", en: "Seafood", es: "Mariscos", de: "Meeresfrüchte", pt: "Frutos do mar", it: "Frutti di mare", nl: "Zeevruchten", pl: "Owoce morza", ja: "シーフード", zh: "海鲜", ru: "Морепродукты", ar: "المأكولات البحرية" },
  soja: { fr: "Soja", en: "Soy", es: "Soja", de: "Soja", pt: "Soja", it: "Soia", nl: "Soja", pl: "Soja", ja: "大豆", zh: "大豆", ru: "Соя", ar: "الصويا" },
  sesame: { fr: "Sésame", en: "Sesame", es: "Sésamo", de: "Sesam", pt: "Gergelim", it: "Sesamo", nl: "Sesam", pl: "Sezam", ja: "ごま", zh: "芝麻", ru: "Кунжут", ar: "السمسم" },
  moutarde: { fr: "Moutarde", en: "Mustard", es: "Mostaza", de: "Senf", pt: "Mostarda", it: "Senape", nl: "Mosterd", pl: "Gorczyca", ja: "マスタード", zh: "芥末", ru: "Горчица", ar: "الخردل" },
  celeri: { fr: "Céleri", en: "Celery", es: "Apio", de: "Sellerie", pt: "Aipo", it: "Sedano", nl: "Selderij", pl: "Seler", ja: "セロリ", zh: "芹菜", ru: "Сельдерей", ar: "الكرفس" },
};

const EXTRA_ALLERGEN_TRANSLATIONS_RO_EL_KO: Record<string, { ro: string; el: string; ko: string }> = {
  gluten: { ro: "Gluten", el: "Γλουτένη", ko: "글루텐" },
  lactose: { ro: "Lactoză", el: "Λακτόζη", ko: "유당" },
  arachides: { ro: "Arahide", el: "Αράπικα φιστίκια", ko: "땅콩" },
  oeufs: { ro: "Ouă", el: "Αυγά", ko: "달걀" },
  lait: { ro: "Lapte", el: "Γάλα", ko: "우유" },
  poisson: { ro: "Pește", el: "Ψάρι", ko: "생선" },
  fruits_de_mer: { ro: "Fructe de mare", el: "Θαλασσινά", ko: "해산물" },
  soja: { ro: "Soia", el: "Σόγια", ko: "대두" },
  sesame: { ro: "Susan", el: "Σουσάμι", ko: "참깨" },
  moutarde: { ro: "Muștar", el: "Μουστάρδα", ko: "겨자" },
  celeri: { ro: "Țelină", el: "Σέλερι", ko: "셀러리" },
};

Object.entries(EXTRA_ALLERGEN_TRANSLATIONS_RO_EL_KO).forEach(([key, translations]) => {
  if (!DEFAULT_ALLERGEN_TRANSLATIONS_EXTENDED[key]) return;
  DEFAULT_ALLERGEN_TRANSLATIONS_EXTENDED[key] = {
    ...DEFAULT_ALLERGEN_TRANSLATIONS_EXTENDED[key],
    ...translations,
  };
});
