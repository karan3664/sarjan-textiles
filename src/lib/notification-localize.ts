import type { AppLocale } from "@/lib/localized-text";

type NotificationLike = {
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
};

const TEMPLATES: Record<
  string,
  Record<AppLocale, { title: string; body: string }>
> = {
  "order.placed": {
    en: { title: "Order placed", body: "Order {{orderId}} received." },
    hi: { title: "ऑर्डर दर्ज", body: "ऑर्डर {{orderId}} प्राप्त हुआ।" },
    gu: { title: "ઓર્ડર નોંધાયો", body: "ઓર્ડર {{orderId}} મળ્યો." },
  },
  "order.approved": {
    en: { title: "Order approved", body: "Order {{orderId}} is approved." },
    hi: { title: "ऑर्डर स्वीकृत", body: "ऑर्डर {{orderId}} स्वीकृत है।" },
    gu: { title: "ઓર્ડર મંજૂર", body: "ઓર્ડર {{orderId}} મંજૂર છે." },
  },
  "order.dispatched": {
    en: { title: "Order dispatched", body: "Order {{orderId}} is on the way." },
    hi: { title: "ऑर्डर भेजा गया", body: "ऑर्डर {{orderId}} रास्ते में है।" },
    gu: { title: "ઓર્ડર મોકલાયો", body: "ઓર્ડર {{orderId}} માર્ગમાં છે." },
  },
  offer: {
    en: { title: "New offer", body: "Check out our latest wholesale offer." },
    hi: { title: "नया ऑफर", body: "हमारा नवीनतम थोक ऑफर देखें।" },
    gu: { title: "નવું ઑફર", body: "અમારું નવીનતમ થોક ઑફર જુઓ." },
  },
  collection: {
    en: { title: "New collection", body: "Explore our latest collection." },
    hi: { title: "नया संग्रह", body: "हमारा नवीनतम संग्रह देखें।" },
    gu: { title: "નવું સંગ્રહ", body: "અમારું નવીનતમ સંગ્રહ જુઓ." },
  },
  arrival: {
    en: { title: "New arrival", body: "Fresh styles just landed." },
    hi: { title: "नया आगमन", body: "नए डिज़ाइन उपलब्ध हैं।" },
    gu: { title: "નવું આગમન", body: "નવા ડિઝાઇન ઉપલબ્ધ છે." },
  },
  payment: {
    en: {
      title: "Payment update",
      body: "There is an update on your payment.",
    },
    hi: { title: "भुगतान अपडेट", body: "आपके भुगतान पर अपडेट है।" },
    gu: { title: "ચુકવણી અપડેટ", body: "તમારી ચુકવણી પર અપડેટ છે." },
  },
};

function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? "",
  );
}

function detectOrderTemplate(title: string) {
  if (/placed|received/i.test(title)) return "order.placed";
  if (/approved/i.test(title)) return "order.approved";
  if (/dispatch/i.test(title)) return "order.dispatched";
  return "order.placed";
}

export function localizeNotificationRecord(
  item: NotificationLike,
  locale: AppLocale,
): NotificationLike {
  if (locale === "en") return item;

  const orderId = item.data?.orderId ?? item.data?.id ?? "";
  let key = item.type;
  if (item.type === "order" || item.type === "dispatch") {
    key = detectOrderTemplate(item.title);
  }

  const template = TEMPLATES[key]?.[locale];
  if (!template) {
    return item;
  }

  return {
    ...item,
    title: interpolate(template.title, { orderId }),
    body: interpolate(template.body, { orderId }),
  };
}
