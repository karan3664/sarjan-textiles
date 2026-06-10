import type {
  BotCartLine,
  BotCategoryPreview,
  BotOrderPreview,
  BotProductPreview,
} from "@/lib/order-bot/types";
import { StorefrontProductImage } from "./StorefrontProductImage";
import { STOREFRONT_IMAGE_SIZES } from "@/lib/storefront-image";

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function BotThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="sarjan-order-bot-thumb" aria-hidden>
      {src ? (
        <StorefrontProductImage
          src={src}
          alt={alt}
          width={64}
          height={80}
          sizes={STOREFRONT_IMAGE_SIZES.botThumb}
        />
      ) : (
        <span className="sarjan-order-bot-thumb__placeholder">ST</span>
      )}
    </div>
  );
}

export function OrderBotProductCards({
  products,
}: {
  products: BotProductPreview[];
}) {
  if (!products.length) return null;
  return (
    <div className="sarjan-order-bot-cards sarjan-order-bot-cards--products">
      {products.map((product) => (
        <a
          key={`${product.slug}-${product.index}`}
          href={`/products/${product.slug}`}
          className="sarjan-order-bot-card sarjan-order-bot-card--product"
        >
          <BotThumb src={product.imageUrl} alt={product.name} />
          <div className="sarjan-order-bot-card__body">
            <strong className="sarjan-order-bot-card__title">
              {product.index}. {product.name}
            </strong>
            <span className="sarjan-order-bot-card__meta">
              {product.category} · {formatInr(product.setPrice)}/set
              {product.moq ? ` · MOQ ${product.moq}` : ""}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

export function OrderBotCategoryCards({
  categories,
}: {
  categories: BotCategoryPreview[];
}) {
  if (!categories.length) return null;
  return (
    <div className="sarjan-order-bot-cards sarjan-order-bot-cards--categories">
      {categories.map((category) => (
        <a
          key={`${category.kind}-${category.slug}`}
          href={category.href ?? `/categories/${category.slug}`}
          className="sarjan-order-bot-card sarjan-order-bot-card--category"
        >
          <BotThumb src={category.imageUrl} alt={category.name} />
          <div className="sarjan-order-bot-card__body">
            <strong className="sarjan-order-bot-card__title">
              {category.name}
            </strong>
            <span className="sarjan-order-bot-card__meta">
              {category.kind === "collection"
                ? "Collection"
                : `${category.count} products`}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

export function OrderBotCartCards({
  cart,
  cartTotal,
}: {
  cart: BotCartLine[];
  cartTotal?: number;
}) {
  if (!cart.length) return null;
  const total =
    cartTotal ?? cart.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0);
  return (
    <div className="sarjan-order-bot-cards sarjan-order-bot-cards--cart">
      {cart.map((line, index) => (
        <a
          key={`${line.slug}-${line.color}-${index}`}
          href={`/products/${line.slug}`}
          className="sarjan-order-bot-card sarjan-order-bot-card--cart"
        >
          <BotThumb src={line.imageUrl} alt={line.name} />
          <div className="sarjan-order-bot-card__body">
            <strong className="sarjan-order-bot-card__title">
              {line.name}
            </strong>
            <span className="sarjan-order-bot-card__meta">
              {line.setQuantity} set{line.setQuantity === 1 ? "" : "s"} ·{" "}
              {line.color}
              {line.lineTotal ? ` · ${formatInr(line.lineTotal)}` : ""}
            </span>
          </div>
        </a>
      ))}
      {total > 0 ? (
        <p className="sarjan-order-bot-cards__total mb_0">
          Estimated total: <strong>{formatInr(total)}</strong>
        </p>
      ) : null}
    </div>
  );
}

export function OrderBotOrderCards({ orders }: { orders: BotOrderPreview[] }) {
  if (!orders.length) return null;
  return (
    <div className="sarjan-order-bot-cards sarjan-order-bot-cards--orders">
      {orders.map((order) => (
        <div key={order.id} className="sarjan-order-bot-order-block">
          <div className="sarjan-order-bot-order-block__head">
            <strong>{order.id}</strong>
            <span className="sarjan-order-bot-card__meta">
              {order.status} · {formatInr(order.subtotal)}
            </span>
          </div>
          {order.items.length ? (
            <div className="sarjan-order-bot-order-block__items">
              {order.items.map((item, index) => (
                <a
                  key={`${order.id}-${item.slug}-${index}`}
                  href={`/products/${item.slug}`}
                  className="sarjan-order-bot-card sarjan-order-bot-card--order-line"
                >
                  <BotThumb src={item.imageUrl} alt={item.name} />
                  <div className="sarjan-order-bot-card__body">
                    <strong className="sarjan-order-bot-card__title">
                      {item.name}
                    </strong>
                    <span className="sarjan-order-bot-card__meta">
                      {item.setQuantity} set
                      {item.setQuantity === 1 ? "" : "s"}
                      {item.color ? ` · ${item.color}` : ""}
                      {item.lineTotal ? ` · ${formatInr(item.lineTotal)}` : ""}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
