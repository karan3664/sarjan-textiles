import type { AuthBannerAsset, AuthBanners } from "@/lib/auth-banner-types";

export const DEFAULT_AUTH_BANNER_ALT =
  "Sarjan Textiles wholesale kurtas and hand-block printed fabrics";

const DEFAULT_WEBP = "/sarjan-assets/register-wholesale-studio.webp";
const DEFAULT_AVIF = "/sarjan-assets/register-wholesale-studio.avif";
const DEFAULT_BLUR =
  "data:image/jpeg;base64,/9j/2wBDABQUFBQVFBcZGRcfIh4iHy4rJycrLkYyNjI2MkZqQk5CQk5Cal5yXVZdcl6phXZ2hanDpJukw+zT0+z/////////2wBDARQUFBQVFBcZGRcfIh4iHy4rJycrLkYyNjI2MkZqQk5CQk5Cal5yXVZdcl6phXZ2hanDpJukw+zT0+z/////////wgARCAAFAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUG/8QAFAEBAAAAAAAAAAAAAAAAAAAAAv/aAAwDAQACEAMQAAAAp5AD/8QAHRAAAQMFAQAAAAAAAAAAAAAAAQACAwUREhMhgf/aAAgBAQABPwCrSO14eoyOuelf/8QAFREBAQAAAAAAAAAAAAAAAAAAAAH/2gAIAQIBAT8Aj//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//Z";

export const defaultAuthBannerAsset: AuthBannerAsset = {
  webp: DEFAULT_WEBP,
  avif: DEFAULT_AVIF,
  blurDataURL: DEFAULT_BLUR,
  width: 1024,
  height: 480,
  alt: DEFAULT_AUTH_BANNER_ALT,
};

export const defaultAuthBanners: AuthBanners = {
  login: defaultAuthBannerAsset,
  register: defaultAuthBannerAsset,
  forgot: defaultAuthBannerAsset,
};
