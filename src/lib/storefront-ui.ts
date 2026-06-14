import type { AppLocale } from "@/lib/localized-text";

/** Static storefront chrome (nav labels, common UI) when CMS stores English-only strings. */
const NAV_LABELS: Record<string, Record<AppLocale, string>> = {
  Home: { en: "Home", hi: "होम", gu: "હોમ" },
  Products: { en: "Products", hi: "उत्पाद", gu: "ઉત્પાદનો" },
  Categories: { en: "Categories", hi: "श्रेणियाँ", gu: "શ્રેણીઓ" },
  "Categories (all)": {
    en: "Categories (all)",
    hi: "सभी श्रेणियाँ",
    gu: "બધી શ્રેણીઓ",
  },
  Collections: { en: "Collections", hi: "संग्रह", gu: "સંગ્રહ" },
  Process: { en: "Process", hi: "प्रक्रिया", gu: "પ્રક્રિયા" },
  Blog: { en: "Blog", hi: "ब्लॉग", gu: "બ્લોગ" },
  About: { en: "About", hi: "हमारे बारे में", gu: "અમારા વિશે" },
  Contact: { en: "Contact", hi: "संपर्क", gu: "સંપર્ક" },
  FAQs: {
    en: "FAQs",
    hi: "अक्सर पूछे जाने वाले प्रश्न",
    gu: "વારંવાર પૂછાતા પ્રશ્નો",
  },
  Inquiry: { en: "Inquiry", hi: "पूछताछ", gu: "પૂછપરછ" },
  Login: { en: "Login", hi: "लॉगिन", gu: "લોગિન" },
  Register: { en: "Register", hi: "रजिस्टर", gu: "નોંધણી" },
};

export function translateStorefrontNav(
  label: string,
  locale: AppLocale,
): string {
  if (locale === "en") return label;
  return NAV_LABELS[label]?.[locale] ?? label;
}

export const LANGUAGE_OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
];

const COLLECTION_COPY: Record<
  string,
  Record<AppLocale, { title: string; description: string }>
> = {
  ajrakh: {
    en: {
      title: "Ajrakh Collection",
      description:
        "Indigo resist and Ajrakh-inspired prints for shirts and kurtas.",
    },
    hi: {
      title: "अजरख संग्रह",
      description: "शर्ट और कुर्ता के लिए इंडिगो रेसिस्ट और अजरख प्रिंट।",
    },
    gu: {
      title: "અજરખ સંગ્રહ",
      description: "શર્ટ અને કુર્તા માટે ઇન્ડિગો રેઝિસ્ટ અને અજરખ પ્રિન્ટ.",
    },
  },
  mashru: {
    en: {
      title: "Mashru Collection",
      description:
        "Silk-cotton mashru blends with a soft sheen for premium retail.",
    },
    hi: {
      title: "मशरू संग्रह",
      description: "प्रीमियम रिटेल के लिए सिल्क-कॉटन मशरू ब्लेंड।",
    },
    gu: {
      title: "મશરૂ સંગ્રહ",
      description: "પ્રીમિયમ રિટેલ માટે સિલ્ક-કોટન મશરૂ બ્લેન્ડ.",
    },
  },
  "block-print": {
    en: {
      title: "Block Print Collection",
      description:
        "Hand-block and studio block prints across shirts and kurtas.",
    },
    hi: {
      title: "ब्लॉक प्रिंट संग्रह",
      description: "शर्ट और कुर्ता पर हाथ और स्टूडियो ब्लॉक प्रिंट।",
    },
    gu: {
      title: "બ્લોક પ્રિન્ટ સંગ્રહ",
      description: "શર્ટ અને કુર્તા પર હાથ અને સ્ટુડિયો બ્લોક પ્રિન્ટ.",
    },
  },
};

export function translateCollection(slug: string, locale: AppLocale) {
  const copy = COLLECTION_COPY[slug]?.[locale] ?? COLLECTION_COPY[slug]?.en;
  return copy ?? { title: slug, description: "" };
}

const COMMON_UI: Record<string, Record<AppLocale, string>> = {
  home: { en: "Home", hi: "होम", gu: "હોમ" },
  homepage: { en: "Home", hi: "होम", gu: "હોમ" },
  searchPlaceholder: {
    en: "Search products…",
    hi: "उत्पाद खोजें…",
    gu: "ઉત્પાદનો શોધો…",
  },
  login: { en: "Login", hi: "लॉगिन", gu: "લોગિન" },
  register: { en: "Register", hi: "रजिस्टर", gu: "નોંધણી" },
  addToCart: {
    en: "Add to cart",
    hi: "कार्ट में जोड़ें",
    gu: "કાર્ટમાં ઉમેરો",
  },
  outOfStock: { en: "Out of stock", hi: "स्टॉक खत्म", gu: "સ્ટોક ખતમ" },
  dealEndsIn: { en: "Deal ends in", hi: "डील समाप्त", gu: "ડીલ સમાપ્ત" },
  noBlogs: {
    en: "No blog posts published yet.",
    hi: "अभी कोई ब्लॉग प्रकाशित नहीं।",
    gu: "હજી સુધી કોઈ બ્લોગ પ્રકાશિત નથી.",
  },
  cartSyncFailed: {
    en: "Cart saved locally. Sync will retry when you're back online.",
    hi: "कार्ट स्थानीय रूप से सहेजा गया। ऑनलाइन होने पर सिंक होगा।",
    gu: "કાર્ટ સ્થાનિક રીતે સાચવ્યો. ઑનલાઇન થતાં સિંક થશે.",
  },
  cartLoadFailed: {
    en: "Couldn't load product details. Pull to refresh or try again.",
    hi: "उत्पाद विवरण लोड नहीं हो सके। पुनः प्रयास करें।",
    gu: "ઉત્પાદન વિગતો લોડ થઈ નહીં. ફરી પ્રયાસ કરો.",
  },
  shoppingCart: { en: "Shopping Cart", hi: "शॉपिंग कार्ट", gu: "શોપિંગ કાર્ટ" },
  checkout: { en: "Checkout", hi: "चेकआउट", gu: "ચેકઆઉટ" },
  orderSummary: {
    en: "Order Summary",
    hi: "ऑर्डर सारांश",
    gu: "ઓર્ડર સારાંશ",
  },
  proceedToCheckout: {
    en: "Proceed To Checkout",
    hi: "चेकआउट पर जाएं",
    gu: "ચેકઆઉટ પર જાઓ",
  },
  browseProducts: {
    en: "Browse Products",
    hi: "उत्पाद देखें",
    gu: "ઉત્પાદનો જુઓ",
  },
  yourCartEmpty: {
    en: "Your cart is empty",
    hi: "आपकी कार्ट खाली है",
    gu: "તમારી કાર્ટ ખાલી છે",
  },
  loadingCart: {
    en: "Loading cart...",
    hi: "कार्ट लोड हो रही है...",
    gu: "કાર્ટ લોડ થઈ રહી છે...",
  },
  loadingCheckout: {
    en: "Loading checkout...",
    hi: "चेकआउट लोड हो रहा है...",
    gu: "ચેકઆઉટ લોડ થઈ રહ્યું છે...",
  },
  products: { en: "Products", hi: "उत्पाद", gu: "ઉત્પાદનો" },
  price: { en: "Price", hi: "कीमत", gu: "કિંમત" },
  quantity: { en: "Quantity", hi: "मात्रा", gu: "જથ્થો" },
  totalPrice: { en: "Total Price", hi: "कुल कीमत", gu: "કુલ કિંમત" },
  subtotal: { en: "Subtotal", hi: "उप-योग", gu: "ઉપ-યોગ" },
  total: { en: "Total", hi: "कुल", gu: "કુલ" },
  gst: { en: "GST", hi: "GST", gu: "GST" },
  termsAgree: {
    en: "I agree with the",
    hi: "मैं सहमत हूँ",
    gu: "હું સહમત છું",
  },
  orContinueShopping: {
    en: "Or continue shopping",
    hi: "या खरीदारी जारी रखें",
    gu: "અથવા ખરીદી ચાલુ રાખો",
  },
  signUp: { en: "Sign Up", hi: "साइन अप", gu: "સાઇન અપ" },
  orderConfirmation: {
    en: "Order Confirmation",
    hi: "ऑर्डर पुष्टि",
    gu: "ઓર્ડર પુષ્ટિ",
  },
  submitOrder: {
    en: "Submit Order Request",
    hi: "ऑर्डर अनुरोध जमा करें",
    gu: "ઓર્ડર વિનંતી સબમિટ કરો",
  },
  guestCheckoutTitle: {
    en: "Guest checkout strategy",
    hi: "गेस्ट चेकआउट",
    gu: "ગેસ્ટ ચેકઆઉટ",
  },
  guestCheckoutBody: {
    en: "Browse and build a cart without logging in. To submit a B2B order request you need an approved client login (GST, credit, and dispatch data are tied to your account). Start with a wholesale inquiry or register for approval.",
    hi: "लॉगिन के बिना कार्ट बनाएं। B2B ऑर्डर के लिए स्वीकृत क्लाइंट लॉगिन आवश्यक है। पूछताछ या पंजीकरण से शुरू करें।",
    gu: "લોગિન વગર કાર્ટ બનાવો. B2B ઓર્ડર માટે મંજૂર ક્લાયન્ટ લોગિન જરૂરી છે. પૂછપરછ અથવા નોંધણીથી શરૂ કરો.",
  },
  nextSteps: { en: "Next steps:", hi: "अगले कदम:", gu: "આગળના પગલાં:" },
  sendInquiry: { en: "Send inquiry", hi: "पूछताछ भेजें", gu: "પૂછપરછ મોકલો" },
  refundPolicy: {
    en: "Refund policy",
    hi: "रिफंड नीति",
    gu: "રિફંડ નીતિ",
  },
  shippingPolicy: {
    en: "Shipping policy",
    hi: "शिपिंग नीति",
    gu: "શિપિંગ નીતિ",
  },
  alreadyHaveAccount: {
    en: "Already have an account?",
    hi: "पहले से खाता है?",
    gu: "પહેલેથી એકાઉન્ટ છે?",
  },
  loginHere: { en: "Login here", hi: "यहाँ लॉगिन करें", gu: "અહીં લોગિન કરો" },
  information: { en: "Information", hi: "जानकारी", gu: "માહિતી" },
  companyName: {
    en: "Company Name*",
    hi: "कंपनी का नाम*",
    gu: "કંપનીનું નામ*",
  },
  contactPerson: {
    en: "Contact Person*",
    hi: "संपर्क व्यक्ति*",
    gu: "સંપર્ક વ્યક્તિ*",
  },
  emailAddress: {
    en: "Email address*",
    hi: "ईमेल पता*",
    gu: "ઈમેલ સરનામું*",
  },
  phoneNumber: {
    en: "Phone Number*",
    hi: "फ़ोन नंबर*",
    gu: "ફોન નંબર*",
  },
  chooseCountry: {
    en: "Choose Country/Region",
    hi: "देश/क्षेत्र चुनें",
    gu: "દેશ/પ્રદેશ પસંદ કરો",
  },
  india: { en: "India", hi: "भारत", gu: "ભારત" },
  streetAddress: {
    en: "Street, address...",
    hi: "सड़क, पता...",
    gu: "શેરી, સરનામું...",
  },
  postalCode: { en: "Postal Code*", hi: "पिन कोड*", gu: "પિન કોડ*" },
  writeNote: {
    en: "Write note...",
    hi: "नोट लिखें...",
    gu: "નોંધ લખો...",
  },
  shoppingCartLink: {
    en: "Shopping Cart",
    hi: "शॉपिंग कार्ट",
    gu: "શોપિંગ કાર્ટ",
  },
  loginRequired: {
    en: "Login required before order submit.",
    hi: "ऑर्डर जमा करने से पहले लॉगिन आवश्यक है।",
    gu: "ઓર્ડર સબમિટ કરતા પહેલાં લોગિન જરૂરી છે.",
  },
  orderSaved: {
    en: "Order request saved",
    hi: "ऑर्डर अनुरोध सहेजा गया",
    gu: "ઓર્ડર વિનંતી સાચવી",
  },
  orderFailed: { en: "Order failed", hi: "ऑर्डर विफल", gu: "ઓર્ડર નિષ્ફળ" },
  getDirection: {
    en: "GET DIRECTION",
    hi: "दिशा प्राप्त करें",
    gu: "દિશા મેળવો",
  },
  policies: { en: "Policies", hi: "नीतियाँ", gu: "નીતિઓ" },
  privacyPolicy: {
    en: "Privacy policy",
    hi: "गोपनीयता नीति",
    gu: "ગોપનીયતા નીતિ",
  },
  termsOfUse: {
    en: "Terms of use",
    hi: "उपयोग की शर्तें",
    gu: "ઉપયોગની શરતો",
  },
  siteMap: { en: "Site map", hi: "साइट मैप", gu: "સાઇટ મેપ" },
  clientLogin: {
    en: "Client Login",
    hi: "क्लाइंट लॉगिन",
    gu: "ક્લાયન્ટ લોગિન",
  },
  clientRegistration: {
    en: "Client Registration",
    hi: "क्लाइंट पंजीकरण",
    gu: "ક્લાયન્ટ નોંધણી",
  },
  downloadAndroidApp: {
    en: "Download Android App",
    hi: "Android ऐप डाउनलोड करें",
    gu: "Android એપ ડાઉનલોડ કરો",
  },
  orderCart: { en: "Order Cart", hi: "ऑर्डर कार्ट", gu: "ઓર્ડર કાર્ટ" },
  myWishlist: {
    en: "My Wishlist",
    hi: "मेरी विशलिस्ट",
    gu: "મારી વિશલિસ્ટ",
  },
  orderFeedback: {
    en: "Order Feedback",
    hi: "ऑर्डर फीडबैक",
    gu: "ઓર્ડર ફીડબેક",
  },
  allRightsReserved: {
    en: "All Rights Reserved.",
    hi: "सर्वाधिकार सुरक्षित।",
    gu: "સર્વાધિકાર સુરક્ષિત.",
  },
  menFilter: { en: "Men", hi: "पुरुष", gu: "પુરુષ" },
  womenFilter: { en: "Women", hi: "महिला", gu: "મહિલા" },
  aboutOurStore: {
    en: "About Our Store",
    hi: "हमारे स्टोर के बारे में",
    gu: "અમારા સ્ટોર વિશે",
  },
  introduction: { en: "Introduction", hi: "परिचय", gu: "પરિચય" },
  history: {
    en: "Our History and Legacy",
    hi: "हमारा इतिहास और विरासत",
    gu: "અમારો ઇતિહાસ અને વારસો",
  },
  mission: { en: "Mission", hi: "मिशन", gu: "મિશન" },
  infrastructure: {
    en: "Infrastructure",
    hi: "अवसंरचना",
    gu: "ઇન્ફ્રાસ્ટ્રક્ચર",
  },
  phone: { en: "Phone:", hi: "फ़ोन:", gu: "ફોન:" },
  email: { en: "Email:", hi: "ईमेल:", gu: "ઈમેલ:" },
  address: { en: "Address:", hi: "पता:", gu: "સરનામું:" },
  getDirections: {
    en: "Get directions",
    hi: "दिशा प्राप्त करें",
    gu: "દિશા મેળવો",
  },
  social: { en: "Social", hi: "सोशल", gu: "સોશિયલ" },
  openTime: { en: "Open Time:", hi: "खुलने का समय:", gu: "ખુલવાનો સમય:" },
  getInTouch: {
    en: "Get In Touch",
    hi: "संपर्क में रहें",
    gu: "સંપર્કમાં રહો",
  },
  contactTeam: {
    en: "Contact Team",
    hi: "टीम से संपर्क करें",
    gu: "ટીમનો સંપર્ક કરો",
  },
  pincodeRequired: {
    en: "Postal code is required.",
    hi: "पिन कोड आवश्यक है।",
    gu: "પિન કોડ જરૂરી છે.",
  },
  pincodeSelectStateCity: {
    en: "Select state and city before validating PIN code.",
    hi: "PIN कोड सत्यापित करने से पहले राज्य और शहर चुनें।",
    gu: "પિન કોડ ચકાસતા પહેલાં રાજ્ય અને શહેર પસંદ કરો.",
  },
  pincodeVerifyFailed: {
    en: "Could not verify PIN code. Try again.",
    hi: "PIN कोड सत्यापित नहीं हो सका। पुनः प्रयास करें।",
    gu: "પિન કોડ ચકાસી શકાયો નહીં. ફરી પ્રયાસ કરો.",
  },
  pincodeChecking: {
    en: "Checking PIN code against India Post…",
    hi: "India Post के साथ PIN कोड जाँच हो रही है…",
    gu: "India Post સામે પિન કોડ તપાસ થઈ રહ્યો છે…",
  },
  fullSet: { en: "Full set", hi: "पूरा सेट", gu: "પૂરો સેટ" },
  setLabel: { en: "Set", hi: "सेट", gu: "સેટ" },
  decreaseQty: {
    en: "Decrease set quantity",
    hi: "सेट मात्रा घटाएं",
    gu: "સેટ જથ્થો ઘટાડો",
  },
  increaseQty: {
    en: "Increase set quantity",
    hi: "सेट मात्रा बढ़ाएं",
    gu: "સેટ જથ્થો વધારો",
  },
  removeItem: { en: "Remove", hi: "हटाएं", gu: "દૂર કરો" },
  addProductsEmpty: {
    en: "Add products to create an order request.",
    hi: "ऑर्डर अनुरोध के लिए उत्पाद जोड़ें।",
    gu: "ઓર્ડર વિનંતી માટે ઉત્પાદનો ઉમેરો.",
  },
  cartLoadError: {
    en: "Couldn't load product details. Your cart items are shown with last known data — refresh to retry.",
    hi: "उत्पाद विवरण लोड नहीं हो सके। अंतिम ज्ञात डेटा दिखाया जा रहा है — रिफ्रेश करें।",
    gu: "ઉત્પાદન વિગતો લોડ થઈ નહીં. છેલ્લી જાણી ડેટા દર્શાવે છે — રિફ્રેશ કરો.",
  },
};

export function translateStorefrontUi(key: string, locale: AppLocale): string {
  if (locale === "en") {
    return COMMON_UI[key]?.en ?? key;
  }
  return COMMON_UI[key]?.[locale] ?? COMMON_UI[key]?.en ?? key;
}

export type StorefrontCommerceLabels = Record<string, string>;

export function getStorefrontCommerceLabels(
  locale: AppLocale,
): StorefrontCommerceLabels {
  const labels: StorefrontCommerceLabels = {};
  for (const key of Object.keys(COMMON_UI)) {
    labels[key] = translateStorefrontUi(key, locale);
  }
  return labels;
}

const FAQ_PAIR = (
  en: [string, string],
): Record<AppLocale, [string, string]> => ({
  en,
  hi: en,
  gu: en,
});

export type PageFaqKey =
  | "home"
  | "about"
  | "essence-of-craft"
  | "categories"
  | "simplifying-craft-manufacturing"
  | "contact"
  | "all";

const HOMEPAGE_FAQS: Array<Record<AppLocale, [string, string]>> = [
  FAQ_PAIR([
    "What does Sarjan Textiles do?",
    "Sarjan Textiles is a craft-based garment manufacturer, wholesale supplier, and private label apparel partner specializing in Ajrakh, Bandhani, Batik, handicraft-based apparel, menswear, modern womenswear, and fusion wear for brands, retailers, boutiques, and fashion businesses.",
  ]),
  FAQ_PAIR([
    "Are you manufacturers or wholesalers?",
    "We are both manufacturers and wholesale suppliers. We offer end-to-end apparel solutions including sourcing, product development, garment manufacturing, finishing, private label production, and wholesale supply.",
  ]),
  FAQ_PAIR([
    "What types of apparel do you manufacture?",
    "We manufacture menswear, modern womenswear, fusion wear, ethnic-inspired contemporary apparel, and craft-based garments using traditional Indian textile techniques and handcrafted processes.",
  ]),
  FAQ_PAIR([
    "Do you work with traditional Indian crafts?",
    "Yes. We work with Ajrakh, Bandhani, Batik, handcrafted textiles, artisan-led techniques, and other traditional Indian crafts while adapting them for modern fashion and retail markets.",
  ]),
  FAQ_PAIR([
    "Do you provide private label manufacturing?",
    "Yes. We offer private label and white label garment manufacturing services for fashion brands, boutiques, retailers, and startups.",
  ]),
  FAQ_PAIR([
    "Do you support sustainable fashion?",
    "We focus on craftsmanship, artisan collaboration, responsible production practices, durable garments, and preserving traditional textile heritage through thoughtful manufacturing.",
  ]),
];

const ABOUT_FAQS: Array<Record<AppLocale, [string, string]>> = [
  FAQ_PAIR([
    "What makes Sarjan Textiles different from other garment manufacturers?",
    "Sarjan Textiles combines generations of textile knowledge, artisan networks, design understanding, garment manufacturing expertise, and wholesale capabilities under one roof.",
  ]),
  FAQ_PAIR([
    "Where is Sarjan Textiles based?",
    "Sarjan Textiles is based in Bhuj, Gujarat, a region globally recognized for its rich textile heritage, handicrafts, Ajrakh printing, Bandhani, and artisan traditions.",
  ]),
  FAQ_PAIR([
    "Do you work directly with artisans?",
    "Yes. We work closely with artisan communities and skilled craftspeople to preserve traditional techniques while developing contemporary garments.",
  ]),
  FAQ_PAIR([
    "Is Sarjan Textiles a family business?",
    "Our roots are deeply connected to a generational textile business, while our apparel manufacturing division brings a modern approach to craft-based garment production.",
  ]),
];

const ESSENCE_FAQS: Array<Record<AppLocale, [string, string]>> = [
  FAQ_PAIR([
    "What crafts do you specialize in?",
    "We specialize in Ajrakh, Bandhani, Batik, handcrafted textiles, heritage-inspired techniques, and artisan-led craft development.",
  ]),
  FAQ_PAIR([
    "What is Ajrakh?",
    "Ajrakh is a traditional hand block printing craft known for its intricate patterns, natural dye processes, and deep cultural heritage, particularly associated with Kutch, Gujarat.",
  ]),
  FAQ_PAIR([
    "What is Bandhani?",
    "Bandhani is a traditional tie-dye textile craft created through intricate hand-tied resist dyeing techniques that produce distinctive patterns and textures.",
  ]),
  FAQ_PAIR([
    "What is Batik?",
    "Batik is a wax-resist dyeing technique used to create detailed patterns and artistic textile surfaces.",
  ]),
  FAQ_PAIR([
    "Why are handicrafts important in modern fashion?",
    "Handicrafts preserve cultural heritage, support artisan communities, create unique products, and bring authenticity and craftsmanship into contemporary apparel.",
  ]),
];

const CATEGORY_FAQS: Array<Record<AppLocale, [string, string]>> = [
  FAQ_PAIR([
    "What products does Sarjan Textiles manufacture?",
    "We manufacture Ajrakh shirts, Ajrakh kurtas, Bandhani apparel, Batik garments, craft-based menswear, contemporary womenswear, fusion wear, co-ord sets, kaftans, dresses, and private label collections.",
  ]),
  FAQ_PAIR([
    "Do you manufacture custom designs?",
    "Yes. We develop custom collections according to brand requirements, design concepts, fabric preferences, and market positioning.",
  ]),
  FAQ_PAIR([
    "Can retailers buy wholesale?",
    "Yes. We supply wholesale apparel collections to boutiques, retailers, multi-brand stores, and fashion businesses.",
  ]),
  FAQ_PAIR([
    "Do you manufacture sustainable clothing?",
    "We develop sustainable clothing solutions using artisan techniques, handcrafted textiles, natural processes where applicable, and long-lasting garment construction.",
  ]),
];

const MANUFACTURING_FAQS: Array<Record<AppLocale, [string, string]>> = [
  FAQ_PAIR([
    "Do you provide end-to-end garment manufacturing?",
    "Yes. We handle sourcing, craft development, sampling, pattern making, production, finishing, quality control, and wholesale supply.",
  ]),
  FAQ_PAIR([
    "Can I manufacture my own clothing brand with Sarjan Textiles?",
    "Yes. We provide private label and white label garment manufacturing services for emerging and established brands.",
  ]),
  FAQ_PAIR([
    "Do you provide sampling services?",
    "Yes. We assist clients with sample development before bulk production.",
  ]),
  FAQ_PAIR([
    "What is your production capability?",
    "At Sarjan Textiles, our integrated manufacturing system and artisan network enable us to manage both small-scale development and larger production requirements.",
  ]),
  FAQ_PAIR([
    "Do I need separate vendors for fabric, stitching, and finishing?",
    "No. At Sarjan Textiles, we provide a complete solution under one roof, reducing complexity and improving consistency.",
  ]),
];

const CONTACT_FAQS: Array<Record<AppLocale, [string, string]>> = [
  FAQ_PAIR([
    "Who can work with Sarjan Textiles?",
    "Fashion brands, retailers, boutiques, wholesalers, exporters, private labels, startups, and sourcing agencies - all can work with Sarjan Textiles.",
  ]),
  FAQ_PAIR([
    "Do you export internationally?",
    "Currently, we do limited exports to some countries.",
  ]),
  FAQ_PAIR([
    "How can I start manufacturing with Sarjan Textiles?",
    "Simply contact our team with your requirements, product ideas, or sourcing needs. We will guide you through development and production.",
  ]),
  FAQ_PAIR([
    "Can I request a wholesale catalog?",
    "Yes. Contact us to receive our latest wholesale collections and product offerings.",
  ]),
];

const PAGE_FAQS: Record<
  PageFaqKey,
  Array<Record<AppLocale, [string, string]>>
> = {
  home: HOMEPAGE_FAQS,
  about: ABOUT_FAQS,
  "essence-of-craft": ESSENCE_FAQS,
  categories: CATEGORY_FAQS,
  "simplifying-craft-manufacturing": MANUFACTURING_FAQS,
  contact: CONTACT_FAQS,
  all: [
    ...HOMEPAGE_FAQS,
    ...ABOUT_FAQS,
    ...ESSENCE_FAQS,
    ...CATEGORY_FAQS,
    ...MANUFACTURING_FAQS,
    ...CONTACT_FAQS,
  ],
};

export function faqItemsForPage(
  page: PageFaqKey,
  locale: AppLocale,
): Array<[string, string]> {
  return (PAGE_FAQS[page] ?? []).map((item) => item[locale] ?? item.en);
}

export function faqItemsForLocale(locale: AppLocale): Array<[string, string]> {
  return faqItemsForPage("all", locale);
}
