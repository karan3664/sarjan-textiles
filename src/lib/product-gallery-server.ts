import type { Product } from "@/data/mock";
import { inferGarmentColorLabelsFromImages } from "@/lib/garment-color-from-image";
import {
  productGallerySlots,
  type ProductGallerySlot,
  uniqueRealProductImages,
} from "@/lib/product-colors";

/** PDP gallery slots — color labels come from garment photos, not CMS/sheet colors. */
export async function resolveProductGallerySlots(
  product: Pick<
    Product,
    "images" | "colors" | "imageAlt" | "variants" | "sku" | "slug" | "category"
  >,
): Promise<ProductGallerySlot[]> {
  const images = uniqueRealProductImages(product.images);
  if (!images.length) {
    return productGallerySlots(product);
  }

  const fromPhotos = await inferGarmentColorLabelsFromImages(product);
  if (fromPhotos?.length === images.length) {
    return fromPhotos.map((color, index) => ({
      color,
      image: images[index],
    }));
  }

  return productGallerySlots(product);
}

/** @deprecated Display colors come from gallery slots — CMS colors stay for stock/cart. */
export async function productForDetailGallery(
  product: Product,
): Promise<Product> {
  return product;
}
