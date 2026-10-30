import { ZELOX_TAG_PRODUCT_URL } from "@/lib/hardware/zelox-tag-product-url";

export const LANDING_SHOP_HREF = ZELOX_TAG_PRODUCT_URL;
export const LANDING_LOGIN_HREF = "/login";

export const landingBrand = {
  wordmark: "ZELOX TAG",
  name: "ZeloxTag",
  claim: "ZeloxTag – Dein Auto. Deine Story.",
} as const;

export const landingNav = {
  links: [
    { href: "#problem", label: "Das Problem" },
    { href: "#hardware", label: "V4A-Hardware" },
    { href: "#system", label: "2-Schichten-System" },
    { href: "#live-preview", label: "Live-Vorschau" },
    { href: "#faq", label: "FAQ" },
  ],
  shopCta: "Tag sichern →",
  loginCta: "App-Login",
  menuOpenLabel: "Navigation öffnen",
  menuCloseLabel: "Navigation schließen",
} as const;

export const landingHero = {
  badge: "DIGITAL VEHICLE HISTORY • MADE IN GERMANY",
  headline: "Dein Auto hat eine Geschichte. Verankere sie in Edelstahl.",
  subhead:
    "Schluss mit verblassten Rechnungen im Handschuhfach und billigen Scheiben-Stickern. ZeloxTag verbindet ein lasergraviertes V4A-Typenschild am Schlossträger mit einer digitalen Fahrzeugakte – für lückenlosen Werterhalt und Car-Meets.",
  primaryCta: "Interaktive Vorschau testen",
  primaryHref: "#live-preview",
  secondaryCta: "Hardware entdecken",
  secondaryHref: "#hardware",
} as const;

export const landingHeroShowcase = {
  tagImageSrc: "/brand/zelox-tag-hero-cutout.png",
  tagImageAlt:
    "ZeloxTag V4A-Edelstahl-Typenschild mit Laser-QR-Code und Schriftzug Digital Vehicle History",
  tagEyebrow: "V4A · 1.4404",
  tagTitle: "Laser-Typenschild",
  tagMeta: "45 × 50 × 0,6 mm",
  tagSerial: "ZLX-8F3A9B2C",
  phoneEyebrow: "Scan → Browser",
  phoneTitle: "Öffentliches Cockpit",
  specPills: [
    "1.4404 V4A",
    "Punkt-Matrix",
    "3M™ High-Temp",
    "EU-Server",
  ],
} as const;

export const landingProblem = {
  id: "problem",
  headline:
    "Du steckst 20.000 € und hunderte Stunden in dein Projekt. Aber beim Verkauf zählt nur, was du belegen kannst.",
  cards: [
    {
      kicker: "01",
      title: "Das Handschuhfach-Chaos",
      body: "Thermopapier-Rechnungen verblassen nach 18 Monaten. Beim Verkauf oder vor dem Gutachter fehlt genau der Beleg, der tausende Euro wert ist.",
    },
    {
      kicker: "02",
      title: "Die Selbstschrauber-Falle",
      body: "Wer alle 10.000 km selbst Öl und Verschleißteile wechselt, pflegt sein Auto besser als jedes Longlife-Scheckheft – hat aber oft keinen strukturierten Nachweis.",
    },
    {
      kicker: "03",
      title: "Die App- & Sticker-Hürde",
      body: "Niemand klebt sich bunte Plastik-QR-Aufkleber auf die Seitenscheibe eines sauberen OEM+ Fahrzeugs. Und niemand auf einem Treffen lädt erst eine 100-MB-App herunter, um deine Specs zu sehen.",
    },
  ],
} as const;

export const landingArchitecture = {
  id: "system",
  previewId: "live-preview",
  headline: "Ein Scan. Zwei Welten. Volle Kontrolle über deine Privatsphäre.",
  lead:
    "Fremde auf Treffen sehen nur das, worauf du stolz bist. Sensible Daten – Preise, Gutachten, VIN – sehen nur du, oder ein potenzieller Käufer mit Einmallink.",
  publicTab: "Öffentlicher Showcase (Car-Meets)",
  vaultTab: "Privater Tresor (Werterhalt & Historie)",
  publicStatus:
    "Öffentlich einsehbar im Browser (0,4 Sek. Ladezeit, kein App-Zwang)",
  vaultStatus:
    "Verschlüsselt • Nur mit Besitzer-Login oder per Einmallink für Käufer/Gutachter sichtbar",
} as const;

export const landingDemoVehicle = {
  title: "BMW 530d F11",
  subtitle: "OEM+ Build · 2016",
  instagram: "@nordschleife.daily",
  specs: [
    { label: "Leistung", value: "313 PS" },
    { label: "Drehmoment", value: "680 Nm" },
    { label: "Fahrwerk", value: "ST XA" },
    { label: "Getriebe", value: "xHP Stage 3" },
  ],
  mods: [
    "ST XA Gewindefahrwerk",
    "xHP Stage 3 Flash",
    "BBS CH-R 20\" 8,5 / 9,5j",
    "Wagner Evo 2 Ladeluftkühler",
  ],
} as const;

export const landingDemoVault = {
  investmentLabel: "Dokumentierte Investitionen",
  investmentValue: "24.580,00 €",
  searchPlaceholder: "Teilenummer suchen…",
  searchQuery: "11427637783",
  entries: [
    {
      date: "18.03.2026",
      title: "Ölwechsel + Mann Filterkit",
      amount: "186,40 €",
      kind: "Rechnung",
    },
    {
      date: "02.11.2025",
      title: "ST XA Coilover · ABE hinterlegt",
      amount: "1.890,00 €",
      kind: "ABE",
    },
    {
      date: "14.08.2025",
      title: "xHP Stage 3 · Prüfstand 313 PS",
      amount: "890,00 €",
      kind: "PDF",
    },
    {
      date: "22.04.2025",
      title: "TÜV §19 mit Anbaubestätigung",
      amount: "148,00 €",
      kind: "TÜV",
    },
  ],
} as const;

export const landingHardware = {
  id: "hardware",
  headline: "Gebaut für den Motorraum. Nicht für die Bastelbude.",
  tiles: [
    {
      size: "large" as const,
      kicker: "Werkstoff",
      title: "1.4404 V4A-Edelstahl.",
      body: "0,6 mm feingelaserter Chirurgen- und Industriestahl. Komplett säure-, salz- und rostfrei. Verwindungssteif, aber leicht genug, um bei Motorvibrationen niemals abzuscheren.",
    },
    {
      size: "regular" as const,
      kicker: "Gravur",
      title: "Punkt-Matrix-Lasergravur.",
      body: "Kein oberflächlicher Druck, der bei Kaltreiniger ausbleicht, sondern tief in das Metall eingebrannte Kontraste im Motorsport-Design.",
    },
    {
      size: "regular" as const,
      kicker: "Montage",
      title: "3M™ Hochleistungs-Träger.",
      body: "Hält extremen Temperaturschwankungen im Motorraum, Frost und Hochdruckreinigern dauerhaft stand.",
    },
    {
      size: "regular" as const,
      kicker: "Eigentum",
      title: "1-Klick Besitzer-Übergabe.",
      body: "Du verkaufst das Auto? Der Tag bleibt am Schlossträger. Die komplette digitale Akte übergibst du digital an den neuen Eigentümer.",
    },
  ],
} as const;

export const landingHowItWorks = {
  id: "how-it-works",
  headline: "Drei Schritte. Kein Werkzeug.",
  steps: [
    {
      index: "01",
      title: "Am Schlossträger oder Türfalz anbringen",
      body: "Stelle entfetten, 10 Sekunden fest andrücken.",
    },
    {
      index: "02",
      title: "Mit der Smartphone-Kamera aktivieren",
      body: "Ohne App-Installation direkt im Browser verknüpfen.",
    },
    {
      index: "03",
      title: "Historie & Umbauten aufbauen",
      body: "Rechnungen abfotografieren, Teilenummern & Specs sichern.",
    },
  ],
} as const;

export const landingCommunity = {
  id: "community",
  headline: "Im Einsatz auf der Straße und der Nordschleife.",
  quotes: [
    {
      vehicle: "BMW F11 530d",
      quote:
        "Auf Treffen reicht ein Scan. Specs, Fahrwerk, Mapping – ohne dass ich irgendwem die Garage öffne.",
      context: "Car-Meet",
    },
    {
      vehicle: "Porsche 997 Carrera",
      quote:
        "Der Gutachter hat die ABEs und Rechnungen am Tablet durchgeblättert. Kein Ordner, kein Suchen in der Cloud.",
      context: "Wertgutachten",
    },
    {
      vehicle: "Golf 7 GTI Tracktool",
      quote:
        "Beim Verkauf wollte der Käufer die Historie. Einmallink, 20 Minuten später war der Preis nicht mehr verhandelbar.",
      context: "Verkauf",
    },
    {
      vehicle: "BMW E36 328i",
      quote:
        "Ölwechsel alle 8.000 km, selbst gemacht. Jetzt steht das in einer Timeline, die auch der nächste Besitzer versteht.",
      context: "Selbstschrauber",
    },
  ],
} as const;

export const landingFaq = {
  id: "faq",
  headline: "Technische Fragen.",
  items: [
    {
      question: "Wo liegen die Daten – und wer sieht was?",
      answer:
        "Die Akte liegt auf EU-Servern. Das öffentliche Profil zeigt nur Specs, Umbauten und Medien, die du freigibst. Rechnungen, Beträge und Gutachten bleiben im privaten Tresor.",
    },
    {
      question: "Was sieht die Polizei bei einer Kontrolle?",
      answer:
        "Einen Scan des Tags öffnet das öffentliche Profil – Make, Model, freigegebene Umbauten. Keine VIN, keine Rechnungen, keine Halterdaten. Sensible Dokumente bleiben hinter Login oder Einmallink.",
    },
    {
      question: "Hält der Tag Motorwäsche und Hochdruckreiniger aus?",
      answer:
        "Ja. 1.4404 V4A ist säure- und salzbeständig. Die Lasergravur sitzt im Metall, nicht als Druck darauf. Der 3M™-Träger ist für Motorraum-Temperaturen und Frost ausgelegt.",
    },
    {
      question: "Welche Abmessungen hat das Schild?",
      answer:
        "45 × 50 × 0,6 mm. Klein genug für Schlossträger oder Türfalz, steif genug, dass es bei Vibrationen nicht wellt oder absichert.",
    },
    {
      question: "Was passiert beim Fahrzeugwechsel?",
      answer:
        "Der Tag bleibt am Fahrzeug. Du übergibst die digitale Akte per 1-Klick an den neuen Eigentümer. Dein Login trennt sich vom Twin, die Historie bleibt am Auto.",
    },
  ],
} as const;

export const landingCta = {
  headline: "Bereit, deinem Build ein Gedächtnis zu geben?",
  subhead:
    "Jeder ZeloxTag kommt mit lebenslangem Fahrzeug-Profil und 30-Tage-Motorraum-Garantie.",
  button: "Jetzt ZeloxTag sichern →",
} as const;

export const landingFooter = {
  legal: [
    { href: "/impressum", label: "Impressum" },
    { href: "/datenschutz", label: "Datenschutz" },
    { href: "/agb", label: "AGB" },
  ],
} as const;

export type LandingNavLink = (typeof landingNav.links)[number];
export type LandingProblemCard = (typeof landingProblem.cards)[number];
export type LandingHardwareTile = (typeof landingHardware.tiles)[number];
export type LandingStep = (typeof landingHowItWorks.steps)[number];
export type LandingQuote = (typeof landingCommunity.quotes)[number];
export type LandingFaqItem = (typeof landingFaq.items)[number];
