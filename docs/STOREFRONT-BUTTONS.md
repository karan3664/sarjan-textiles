# Storefront buttons — developer guide

## Standard look

| State   | Background                             | Text            | Border          |
| ------- | -------------------------------------- | --------------- | --------------- |
| Default | White `#ffffff`                        | Black `#181818` | Black `#181818` |
| Hover   | Logo red `#8b1e2d` (`--sarjan-accent`) | White           | Logo red        |

No diagonal skew wipe (Modave `::after` is disabled for CTAs).

## How to add a button (required for new code)

### Option A — React component (preferred)

```tsx
import { SarjanButton } from "@/components/storefront/SarjanButton";
import { TfButtonIcon } from "@/components/storefront/TfButtonIcon";

<SarjanButton href="/products">Browse catalog</SarjanButton>

<SarjanButton type="submit" className="w-100">
  <TfButtonIcon icon="icon-user">Login</TfButtonIcon>
</SarjanButton>
```

### Option B — class helper

```tsx
import { sarjanButtonClass } from "@/lib/sarjan-button";
import { TfButtonIcon, withBtnIcon } from "@/components/storefront/TfButtonIcon";

<Link className={withBtnIcon("w-100")} href="/checkout">
  <TfButtonIcon icon="icon-checkCircle">Proceed to checkout</TfButtonIcon>
</Link>

<button type="submit" className={sarjanButtonClass("w-100")}>
  Save
</button>
```

### Do not use (legacy — inconsistent colors)

- `tf-btn btn-fill` alone (Modave default = black)
- `tf-btn btn-white` / `btn-reset` mix on the same screen
- `btn-line` (gradient text; broken on white)

Existing pages still using `tf-btn btn-fill` are styled globally, but **new code must use `sarjan-btn` via `SarjanButton` / `sarjanButtonClass` / `withBtnIcon`.**

## Change brand color site-wide

Edit CSS variables in `src/app/storefront-buttons.css` (and copy to `public/storefront-buttons.css`):

```css
--sarjan-brand: var(--sarjan-accent, #8b1e2d);
```

Then run:

```bash
cp src/app/storefront-buttons.css public/storefront-buttons.css
```

## AI / Cursor prompt (paste when adding UI)

```
Use Sarjan storefront buttons only:
- Import SarjanButton or sarjanButtonClass / withBtnIcon from @/lib/sarjan-button
- Do not use tf-btn btn-fill or btn-white for primary CTAs
- Default: white pill, black text; hover: brand red #8b1e2d, white text
- See docs/STOREFRONT-BUTTONS.md
```

## Excluded (not CTAs)

Quantity +/-, wishlist/compare circles, filters, close, newsletter icon-only, sold-out disabled blocks.
