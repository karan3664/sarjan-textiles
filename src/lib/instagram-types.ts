export type InstagramPost = {
  id: string;
  image: string;
  alt: string;
  href: string;
  timestamp?: string;
  source: "instagram" | "fallback";
};

export type CmsInstagramFeed = {
  posts: InstagramPost[];
  updatedAt: string;
};
