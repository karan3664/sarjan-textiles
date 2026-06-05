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
  contactUs: { en: "Contact Us", hi: "संपर्क करें", gu: "અમારો સંપર્ક કરો" },
  aboutOurStore: {
    en: "About Our Store",
    hi: "हमारे स्टोर के बारे में",
    gu: "અમારા સ્ટોર વિશે",
  },
  introduction: { en: "Introduction", hi: "परिचय", gu: "પરિચય" },
  history: { en: "History", hi: "इतिहास", gu: "ઇતિહાસ" },
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

const FAQ_ITEMS: Array<Record<AppLocale, [string, string]>> = [
  {
    en: [
      "How do I get my account approved?",
      "Submit GST and business details during registration. Our team reviews within 1–2 business days.",
    ],
    hi: [
      "मेरा खाता कैसे स्वीकृत होगा?",
      "पंजीकरण के दौरान GST और व्यवसाय विवरण जमा करें। हमारी टीम 1–2 कार्य दिवसों में समीक्षा करती है।",
    ],
    gu: [
      "મારું એકાઉન્ટ કેવી રીતે મંજૂર થશે?",
      "નોંધણી દરમિયાન GST અને વ્યવસાય વિગતો સબમિટ કરો. અમારી ટીમ 1–2 કાર્ય દિવસમાં સમીક્ષા કરે છે.",
    ],
  },
  {
    en: [
      "What is MOQ?",
      "Minimum Order Quantity — the smallest number of sets you can order. Shown on every product.",
    ],
    hi: [
      "MOQ क्या है?",
      "न्यूनतम ऑर्डर मात्रा — आप कितने सेट ऑर्डर कर सकते हैं। हर उत्पाद पर दिखता है।",
    ],
    gu: [
      "MOQ શું છે?",
      "ન્યૂનતમ ઓર્ડર જથ્થો — તમે કેટલા સેટ ઓર્ડર કરી શકો. દરેક ઉત્પાદન પર દર્શાવેલ.",
    ],
  },
  {
    en: [
      "How do I track my order?",
      "Open Orders in your account or use Track Order with your order ID.",
    ],
    hi: [
      "ऑर्डर कैसे ट्रैक करूं?",
      "अपने खाते में Orders खोलें या ऑर्डर ID से Track Order का उपयोग करें।",
    ],
    gu: [
      "ઓર્ડર કેવી રીતે ટ્રેક કરું?",
      "તમારા એકાઉન્ટમાં Orders ખોલો અથવા ઓર્ડર ID સાથે Track Order વાપરો.",
    ],
  },
  {
    en: [
      "What payment methods are supported?",
      "Online payment, bank transfer, and credit orders for approved accounts.",
    ],
    hi: [
      "कौन से भुगतान तरीके हैं?",
      "ऑनलाइन भुगतान, बैंक ट्रांसफर, और स्वीकृत खातों के लिए क्रेडिड ऑर्डर।",
    ],
    gu: [
      "કયા ચુકવણીના માધ્યમો છે?",
      "ઑનલાઇન ચુકવણી, બેંક ટ્રાન્સફર, અને મંજૂર એકાઉન્ટ માટે ક્રેડિટ ઓર્ડર.",
    ],
  },
  {
    en: [
      "Can clients order single pieces?",
      "No. Sarjan B2B uses set-wise ordering by size run and color.",
    ],
    hi: [
      "क्या एक-एक पीस ऑर्डर कर सकते हैं?",
      "नहीं। Sarjan B2B साइज रन और रंग के अनुसार सेट में ऑर्डर लेता है।",
    ],
    gu: [
      "શું એક-એક પીસ ઓર્ડર કરી શકાય?",
      "ના. Sarjan B2B સાઇઝ રન અને રંગ પ્રમાણે સેટમાં ઓર્ડર લે છે.",
    ],
  },
  {
    en: [
      "Can ERP sync later?",
      "Yes. Order and invoice data are structured for Tally/AWS migration later.",
    ],
    hi: [
      "क्या ERP बाद में जुड़ सकता है?",
      "हाँ। ऑर्डर और इnvoice डेटा Tally/AWS के लिए तैयार है।",
    ],
    gu: [
      "શું ERP પછી જોડાઈ શકે?",
      "હા. ઓર્ડર અને ઇન્વૉઇસ ડેટા Tally/AWS માટે તૈયાર છે.",
    ],
  },
];

export function faqItemsForLocale(locale: AppLocale): Array<[string, string]> {
  return FAQ_ITEMS.map((item) => item[locale] ?? item.en);
}
