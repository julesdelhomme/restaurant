export type LegalTranslationEntry = {
  checkoutCheckbox: string;
  checkoutSubmit: string;
  legalTitle: string;
  privacyTitle: string;
  legalText: string;
  privacyText: string;
};

export const legalTranslations: Record<string, LegalTranslationEntry> = {
  fr: {
    checkoutCheckbox: "J'accepte les CGU et je m'engage a regler le total de ma commande.",
    checkoutSubmit: "Commande avec obligation de paiement",
    legalTitle: "Mentions Legales",
    privacyTitle: "Politique de Confidentialite",
    legalText:
      "L'application Elemdho est editee par Jules Delhomme, domicilie au 18 rue des primeveres, 67600 Muttersholtz, France. Contact : julesdelhomme67@gmail.com. Hebergement : interface hebergee par Vercel Inc. (San Francisco, USA) et base de donnees hebergee par Supabase Inc. (San Francisco, USA). Cette application est un outil de facilitation de commande pour les restaurants.",
    privacyText:
      "Elemdho collecte uniquement les donnees necessaires au bon traitement de votre commande (numero de table, contenu de la commande). Ces donnees sont destinees exclusivement au personnel du restaurant pour la realisation du service. Aucune donnee n'est revendue a des tiers. Conformement au RGPD, vous disposez d'un droit d'acces et de suppression de vos donnees en contactant l'editeur.",
  },
  en: {
    checkoutCheckbox: "I accept the T&Cs and commit to pay the total of my order.",
    checkoutSubmit: "Order with obligation to pay",
    legalTitle: "Legal Notice",
    privacyTitle: "Privacy Policy",
    legalText:
      "The Elemdho application is published by Jules Delhomme, 18 rue des primeveres, 67600 Muttersholtz, France. Contact: julesdelhomme67@gmail.com. Hosting: interface hosted by Vercel Inc. (San Francisco, USA) and database hosted by Supabase Inc. (San Francisco, USA). This application is an ordering facilitation tool for restaurants.",
    privacyText:
      "Elemdho collects only the data necessary to process your order (table number, order content). This data is intended exclusively for restaurant staff to provide service. No data is sold to third parties. Under GDPR, you have the right to access and delete your data by contacting the publisher.",
  },
  pt: {
    checkoutCheckbox: "Aceito os T&C e comprometo-me a pagar o total do meu pedido.",
    checkoutSubmit: "Pedido com obrigacao de pagamento",
    legalTitle: "Aviso Legal",
    privacyTitle: "Politica de Privacidade",
    legalText:
      "A aplicacao Elemdho e editada por Jules Delhomme, 18 rue des primeveres, 67600 Muttersholtz, Franca. Contacto: julesdelhomme67@gmail.com. Hospedagem: interface hospedada pela Vercel Inc. (San Francisco, USA) e base de dados hospedada pela Supabase Inc. (San Francisco, USA). Esta aplicacao e uma ferramenta de facilitacao de pedidos para restaurantes.",
    privacyText:
      "A Elemdho recolhe apenas os dados necessarios para o correto processamento do seu pedido (numero da mesa, conteudo do pedido). Estes dados destinam-se exclusivamente a equipa do restaurante para a realizacao do servico. Nenhum dado e vendido a terceiros. De acordo com o RGPD, tem direito de acesso e eliminacao dos seus dados ao contactar o editor.",
  },
  es: {
    checkoutCheckbox: "Acepto los TyC y me comprometo a pagar el total de mi pedido.",
    checkoutSubmit: "Pedido con obligacion de pago",
    legalTitle: "Aviso Legal",
    privacyTitle: "Politica de Privacidad",
    legalText:
      "La aplicacion Elemdho es editada por Jules Delhomme, 18 rue des primeveres, 67600 Muttersholtz, Francia. Contacto: julesdelhomme67@gmail.com. Alojamiento: interfaz alojada por Vercel Inc. (San Francisco, USA) y base de datos alojada por Supabase Inc. (San Francisco, USA). Esta aplicacion es una herramienta para facilitar pedidos en restaurantes.",
    privacyText:
      "Elemdho recopila unicamente los datos necesarios para procesar su pedido (numero de mesa, contenido del pedido). Estos datos se destinan exclusivamente al personal del restaurante para realizar el servicio. Ningun dato se vende a terceros. Conforme al RGPD, usted dispone del derecho de acceso y supresion de sus datos contactando al editor.",
  },
  de: {
    checkoutCheckbox: "Ich akzeptiere die AGB und verpflichte mich zur Zahlung.",
    checkoutSubmit: "Zahlungspflichtig bestellen",
    legalTitle: "Impressum",
    privacyTitle: "Datenschutzerklarung",
    legalText:
      "Die Elemdho-Anwendung wird von Jules Delhomme herausgegeben, 18 rue des primeveres, 67600 Muttersholtz, Frankreich. Kontakt: julesdelhomme67@gmail.com. Hosting: Benutzeroberflaeche bei Vercel Inc. (San Francisco, USA) und Datenbank bei Supabase Inc. (San Francisco, USA). Diese Anwendung ist ein Bestellhilfetool fuer Restaurants.",
    privacyText:
      "Elemdho erhebt nur die Daten, die fuer die Bearbeitung Ihrer Bestellung notwendig sind (Tischnummer, Bestellinhalt). Diese Daten sind ausschliesslich fuer das Restaurantpersonal zur Serviceabwicklung bestimmt. Es werden keine Daten an Dritte verkauft. Gemaess DSGVO haben Sie ein Recht auf Auskunft und Loeschung Ihrer Daten durch Kontaktaufnahme mit dem Herausgeber.",
  },
  it: {
    checkoutCheckbox: "Accetto i T&C e mi impegno a pagare il totale del mio ordine.",
    checkoutSubmit: "Ordine con obbligo di pagamento",
    legalTitle: "Note Legali",
    privacyTitle: "Informativa Privacy",
    legalText:
      "L'applicazione Elemdho e pubblicata da Jules Delhomme, 18 rue des primeveres, 67600 Muttersholtz, Francia. Contatto: julesdelhomme67@gmail.com. Hosting: interfaccia ospitata da Vercel Inc. (San Francisco, USA) e database ospitato da Supabase Inc. (San Francisco, USA). Questa applicazione e uno strumento di facilitazione ordini per ristoranti.",
    privacyText:
      "Elemdho raccoglie solo i dati necessari al corretto trattamento del vostro ordine (numero tavolo, contenuto dell'ordine). Tali dati sono destinati esclusivamente al personale del ristorante per l'esecuzione del servizio. Nessun dato viene rivenduto a terzi. Ai sensi del GDPR, avete diritto di accesso e cancellazione dei vostri dati contattando l'editore.",
  },
  nl: {
    checkoutCheckbox: "Ik accepteer de AV en verbind me tot betaling van mijn bestelling.",
    checkoutSubmit: "Bestelling met betalingsverplichting",
    legalTitle: "Juridische Vermelding",
    privacyTitle: "Privacybeleid",
    legalText:
      "De Elemdho-applicatie wordt uitgegeven door Jules Delhomme, 18 rue des primeveres, 67600 Muttersholtz, Frankrijk. Contact: julesdelhomme67@gmail.com. Hosting: interface gehost door Vercel Inc. (San Francisco, USA) en database gehost door Supabase Inc. (San Francisco, USA). Deze applicatie is een hulpmiddel voor restaurantbestellingen.",
    privacyText:
      "Elemdho verzamelt alleen gegevens die nodig zijn voor de correcte verwerking van uw bestelling (tafelnummer, inhoud van de bestelling). Deze gegevens zijn uitsluitend bestemd voor restaurantpersoneel om de service uit te voeren. Er worden geen gegevens doorverkocht aan derden. Volgens de AVG heeft u recht op inzage en verwijdering van uw gegevens door contact op te nemen met de uitgever.",
  },
  pl: {
    checkoutCheckbox: "Akceptuje Regulamin i zobowiazuje sie do zaplaty za zamowienie.",
    checkoutSubmit: "Zamowienie z obowiazkiem zaplaty",
    legalTitle: "Informacje Prawne",
    privacyTitle: "Polityka Prywatnosci",
    legalText:
      "Aplikacja Elemdho jest wydawana przez Jules Delhomme, 18 rue des primeveres, 67600 Muttersholtz, Francja. Kontakt: julesdelhomme67@gmail.com. Hosting: interfejs hostowany przez Vercel Inc. (San Francisco, USA), a baza danych przez Supabase Inc. (San Francisco, USA). Aplikacja ulatwia skladanie zamowien w restauracjach.",
    privacyText:
      "Elemdho zbiera tylko dane niezbedne do prawidlowej realizacji zamowienia (numer stolika, tresc zamowienia). Dane sa przeznaczone wylacznie dla personelu restauracji w celu realizacji uslugi. Zadnych danych nie odsprzedaje sie podmiotom trzecim. Zgodnie z RODO przysluguje Panstwu prawo dostepu i usuniecia danych po kontakcie z wydawca.",
  },
  ro: {
    checkoutCheckbox: "Accept T&C si ma angajez sa platesc totalul comenzii mele.",
    checkoutSubmit: "Comanda cu obligatie de plata",
    legalTitle: "Mentiuni Legale",
    privacyTitle: "Politica de Confidentialitate",
    legalText:
      "Aplicatia Elemdho este editata de Jules Delhomme, 18 rue des primeveres, 67600 Muttersholtz, Franta. Contact: julesdelhomme67@gmail.com. Gazduire: interfata este gazduita de Vercel Inc. (San Francisco, USA), iar baza de date de Supabase Inc. (San Francisco, USA). Aceasta aplicatie este un instrument de facilitare a comenzilor pentru restaurante.",
    privacyText:
      "Elemdho colecteaza doar datele necesare pentru procesarea corecta a comenzii dvs. (numarul mesei, continutul comenzii). Aceste date sunt destinate exclusiv personalului restaurantului pentru realizarea serviciului. Nicio data nu este vanduta tertilor. Conform RGPD, aveti drept de acces si stergere a datelor prin contactarea editorului.",
  },
  el: {
    checkoutCheckbox: "Αποδέχομαι τους Όρους και δεσμεύομαι να πληρώσω το σύνολο.",
    checkoutSubmit: "Παραγγελία με υποχρέωση πληρωμής",
    legalTitle: "Νομικές Πληροφορίες",
    privacyTitle: "Πολιτική Απορρήτου",
    legalText:
      "Η εφαρμογή Elemdho εκδίδεται από τον Jules Delhomme, 18 rue des primeveres, 67600 Muttersholtz, Γαλλία. Επικοινωνία: julesdelhomme67@gmail.com. Φιλοξενία: διεπαφή στη Vercel Inc. (San Francisco, USA) και βάση δεδομένων στη Supabase Inc. (San Francisco, USA). Η εφαρμογή είναι εργαλείο διευκόλυνσης παραγγελιών για εστιατόρια.",
    privacyText:
      "Η Elemdho συλλέγει μόνο τα δεδομένα που είναι απαραίτητα για τη σωστή επεξεργασία της παραγγελίας σας (αριθμός τραπεζιού, περιεχόμενο παραγγελίας). Τα δεδομένα προορίζονται αποκλειστικά για το προσωπικό του εστιατορίου. Δεν πωλείται κανένα δεδομένο σε τρίτους. Σύμφωνα με τον GDPR, έχετε δικαίωμα πρόσβασης και διαγραφής των δεδομένων σας επικοινωνώντας με τον εκδότη.",
  },
  ja: {
    checkoutCheckbox: "利用規約に同意し、注文合計額の支払いを約束します。",
    checkoutSubmit: "支払い義務のある注文",
    legalTitle: "法的情報",
    privacyTitle: "プライバシーポリシー",
    legalText:
      "Elemdhoアプリは Jules Delhomme（18 rue des primeveres, 67600 Muttersholtz, France）が運営しています。連絡先: julesdelhomme67@gmail.com。ホスティング: インターフェースはVercel Inc.（San Francisco, USA）、データベースはSupabase Inc.（San Francisco, USA）。本アプリはレストラン注文を円滑にするためのツールです。",
    privacyText:
      "Elemdhoは注文処理に必要なデータ（テーブル番号、注文内容）のみを収集します。これらのデータはサービス提供のためにレストランスタッフのみが利用します。第三者への販売は行いません。GDPRに基づき、利用者はデータへのアクセスおよび削除を請求できます。",
  },
  zh: {
    checkoutCheckbox: "我接受条款和条件，并承诺支付订单总额。",
    checkoutSubmit: "有支付义务的订单",
    legalTitle: "法律声明",
    privacyTitle: "隐私政策",
    legalText:
      "Elemdho 应用由 Jules Delhomme 运营，地址：18 rue des primeveres, 67600 Muttersholtz, France。联系方式：julesdelhomme67@gmail.com。托管：前端由 Vercel Inc.（San Francisco, USA）托管，数据库由 Supabase Inc.（San Francisco, USA）托管。本应用用于帮助餐厅处理点单。",
    privacyText:
      "Elemdho 仅收集处理订单所必需的数据（桌号、订单内容）。这些数据仅供餐厅工作人员完成服务使用，不会出售给第三方。根据 GDPR，您有权访问和删除您的数据，请联系发布者。",
  },
  ko: {
    checkoutCheckbox: "이용 약관에 동의하며 주문 총액을 결제할 것을 약속합니다.",
    checkoutSubmit: "결제 의무가 있는 주문",
    legalTitle: "법적 고지",
    privacyTitle: "개인정보 처리방침",
    legalText:
      "Elemdho 애플리케이션의 발행자는 Jules Delhomme이며 주소는 18 rue des primeveres, 67600 Muttersholtz, France 입니다. 연락처: julesdelhomme67@gmail.com. 호스팅: 인터페이스는 Vercel Inc. (San Francisco, USA), 데이터베이스는 Supabase Inc. (San Francisco, USA). 본 앱은 레스토랑 주문을 돕는 도구입니다.",
    privacyText:
      "Elemdho는 주문 처리를 위해 필요한 데이터(테이블 번호, 주문 내용)만 수집합니다. 이 데이터는 서비스 수행을 위해 레스토랑 직원에게만 제공됩니다. 어떠한 데이터도 제3자에게 판매되지 않습니다. GDPR에 따라 이용자는 데이터 열람 및 삭제를 요청할 권리가 있습니다.",
  },
  ru: {
    checkoutCheckbox: "Я принимаю Условия и обязуюсь оплатить полную сумму заказа.",
    checkoutSubmit: "Заказ с обязательством оплаты",
    legalTitle: "Правовая информация",
    privacyTitle: "Политика конфиденциальности",
    legalText:
      "Приложение Elemdho издается Jules Delhomme, адрес: 18 rue des primeveres, 67600 Muttersholtz, France. Контакт: julesdelhomme67@gmail.com. Хостинг: интерфейс размещен на Vercel Inc. (San Francisco, USA), база данных на Supabase Inc. (San Francisco, USA). Приложение является инструментом для упрощения заказов в ресторанах.",
    privacyText:
      "Elemdho собирает только данные, необходимые для обработки заказа (номер стола, содержимое заказа). Эти данные предназначены исключительно для персонала ресторана. Данные не продаются третьим лицам. В соответствии с GDPR вы имеете право на доступ и удаление своих данных, связавшись с издателем.",
  },
  ar: {
    checkoutCheckbox: "أوافق على الشروط وألتزم بدفع إجمالي الطلب عند الخروج.",
    checkoutSubmit: "طلب مع الالتزام بالدفع",
    legalTitle: "الإشعارات القانونية",
    privacyTitle: "سياسة الخصوصية",
    legalText:
      "تطبيق Elemdho يصدره Jules Delhomme، العنوان: 18 rue des primeveres, 67600 Muttersholtz, France. التواصل: julesdelhomme67@gmail.com. الاستضافة: الواجهة لدى Vercel Inc. (San Francisco, USA) وقاعدة البيانات لدى Supabase Inc. (San Francisco, USA). هذا التطبيق أداة لتسهيل طلبات المطاعم.",
    privacyText:
      "تجمع Elemdho فقط البيانات اللازمة لمعالجة الطلب (رقم الطاولة ومحتوى الطلب). هذه البيانات مخصصة حصراً لموظفي المطعم لتنفيذ الخدمة. لا يتم بيع أي بيانات لأطراف ثالثة. وفقاً للائحة GDPR، يحق لكم الوصول إلى بياناتكم وطلب حذفها عبر التواصل مع الناشر.",
  },
};
