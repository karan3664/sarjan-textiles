import type { Product } from "@/data/mock";
import {
  inferGarmentColorLabelsFromImages,
  inferImageColorLabelsForProduct,
  isGenericMultiPhotoProduct,
} from "@/lib/garment-color-from-image";
import {
  productGallerySlots,
  type ProductGallerySlot,
  uniqueRealProductImages,
} from "@/lib/product-colors";

/** PDP gallery slots — prefers photo-detected colors when local files exist. */
export async function resolveProductGallerySlots(
  product: Pick<
    Product,
    "images" | "colors" | "imageAlt" | "variants" | "sku" | "slug" | "category"
  >,
): Promise<ProductGallerySlot[]> {
  const images = uniqueRealProductImages(product.images);

  const inferred = await inferImageColorLabelsForProduct(product);
  if (inferred?.length && inferred.length === images.length) {
    return inferred.map((color, index) => ({
      color,
      image: images[index],
    }));
  }

  if (isGenericMultiPhotoProduct(product)) {
    const fromImages = await inferGarmentColorLabelsFromImages(product);
    if (fromImages?.length === images.length) {
      return fromImages.map((color, index) => ({
        color,
        image: images[index],
      }));
    }
  }

  return productGallerySlots(product);
}

/** Product copy with colors relabeled to match gallery slot order on PDP. */
export async function productForDetailGallery(
  product: Product,
): Promise<Product> {
  const slots = await resolveProductGallerySlots(product);
  if (!slots.length) return product;

  const nextColors = slots.map((slot) => slot.color);
  const sameOrder =
    nextColors.length === product.colors.length &&
    nextColors.every(
      (color, index) =>
        color.trim().toLowerCase() ===
        String(product.colors[index] ?? "")
          .trim()
          .toLowerCase(),
    );

  if (sameOrder) return product;

  return {
    ...product,
    colors: nextColors,
  };
}
