type Props = {
  shareUrl: string;
  /** Brand Instagram (CMS or default); opens in new tab like Facebook share. */
  instagramUrl: string;
};

export function BlogShareBar({ shareUrl, instagramUrl }: Props) {
  const encU = encodeURIComponent(shareUrl);
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encU}`;
  const ig = instagramUrl.trim() || "https://www.instagram.com/";

  return (
    <ul className="tf-social-icon style-1 sarjan-blog-share-icons">
      <li>
        <a
          href={facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="social-facebook"
          aria-label="Share on Facebook"
        >
          <i className="icon icon-fb" />
        </a>
      </li>
      <li>
        <a
          href={ig}
          target="_blank"
          rel="noopener noreferrer"
          className="social-instagram"
          aria-label="Sarjan Textiles on Instagram"
        >
          <i className="icon icon-instagram" />
        </a>
      </li>
    </ul>
  );
}
