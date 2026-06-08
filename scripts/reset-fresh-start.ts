/**
 * Build empty CMS JSON for a fresh admin data-entry start.
 * Keeps real site settings (address, phone, logo) — clears products, orders data lives in other tables.
 *
 * Usage:
 *   npx tsx scripts/reset-fresh-start.ts --print          # preview JSON
 *   npx tsx scripts/reset-fresh-start.ts --local          # reset local JSON files + uploads
 *   npx tsx scripts/reset-fresh-start.ts --sql > reset.sql # SQL for live Postgres
 */
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { defaultCmsSnapshot } from "../src/lib/cms-store";
import { defaultHomeBannerSlide } from "../src/lib/home-banners";

function buildFreshCmsSnapshot() {
  const now = new Date().toISOString();
  return {
    ...defaultCmsSnapshot,
    products: [],
    productFilters: [],
    categoryMaster: [],
    blogs: [],
    testimonials: [],
    clientPricing: [],
    inventoryLogs: [],
    auditLogs: [],
    home: {
      ...defaultCmsSnapshot.home,
      banners: [defaultHomeBannerSlide("banner-1")],
      hero: {
        ...defaultCmsSnapshot.home.hero,
        eyebrow: "",
        title: "",
        description: "",
        images: [defaultCmsSnapshot.home.hero.image],
        videoEnabled: false,
        videoUrls: [],
      },
      categories: defaultCmsSnapshot.home.categories.map((item) => ({
        ...item,
        name: "",
        image: "/sarjan-assets/banner-textiles-studio.webp",
      })),
      marqueeTop: [],
      marqueeBottom: [],
      highlights: [],
    },
    mobileApp: defaultCmsSnapshot.mobileApp
      ? {
          ...defaultCmsSnapshot.mobileApp,
          homeSections: (defaultCmsSnapshot.mobileApp.homeSections ?? []).map(
            (section) =>
              section.type === "promoBanners"
                ? { ...section, enabled: false, banners: [] }
                : section,
          ),
        }
      : defaultCmsSnapshot.mobileApp,
    updatedAt: now,
  };
}

const emptyDb = {
  clients: [],
  orders: [],
  carts: {},
  resetRequests: [],
  feedbacks: [],
};

async function resetLocal() {
  const root = process.cwd();
  const dataDir = path.join(root, "data");
  await mkdir(dataDir, { recursive: true });

  const fresh = buildFreshCmsSnapshot();
  await writeFile(
    path.join(dataDir, "cms-db.json"),
    `${JSON.stringify(fresh, null, 2)}\n`,
  );
  await writeFile(
    path.join(dataDir, "local-db.json"),
    `${JSON.stringify(emptyDb, null, 2)}\n`,
  );

  for (const file of [
    "blog-comments.json",
    "admin-profile-overrides.json",
    "admin-notifications-state.json",
  ]) {
    try {
      await rm(path.join(dataDir, file));
    } catch {
      // optional files
    }
  }

  try {
    await rm(path.join(dataDir, "backups"), { recursive: true, force: true });
  } catch {
    // no backups yet
  }

  const uploadsDir = path.join(root, "public", "uploads", "cms");
  await mkdir(uploadsDir, { recursive: true });
  const entries = await import("fs/promises").then((fs) =>
    fs.readdir(uploadsDir),
  );
  for (const entry of entries) {
    if (entry === ".gitkeep") continue;
    await rm(path.join(uploadsDir, entry), { recursive: true, force: true });
  }

  console.log("Local reset done:");
  console.log("  - data/cms-db.json (empty catalog + blank home)");
  console.log("  - data/local-db.json (no clients/orders)");
  console.log("  - public/uploads/cms/* cleared");
  console.log("Restart: npm run dev");
}

function buildPostgresSql() {
  const fresh = JSON.stringify(buildFreshCmsSnapshot()).replace(/'/g, "''");
  return `-- Sarjan Textiles — wipe demo transactional data, empty CMS catalog.
-- BACKUP FIRST. Run inside Postgres container:
--   docker exec -i CONTAINER_NAME psql -U postgres -d sarjan_textiles < reset-fresh.sql

begin;

truncate table
  client_notifications,
  device_tokens,
  client_saved_lists,
  client_carts,
  password_reset_requests,
  blog_comments,
  orders,
  client_pricing,
  client_discounts,
  product_special_prices,
  product_category_master,
  analytics_events,
  audit_logs,
  feedbacks,
  newsletter_subscribers,
  newsletter_campaigns,
  admin_notification_state,
  admin_profile_overrides,
  app_backups,
  clients
restart identity cascade;

insert into cms_snapshots (id, data, updated_at)
values (1, '${fresh}'::jsonb, now())
on conflict (id) do update
  set data = excluded.data,
      updated_at = excluded.updated_at;

commit;

select 'clients' as tbl, count(*)::text from clients
union all select 'orders', count(*)::text from orders
union all select 'cms_products', jsonb_array_length(data->'products')::text from cms_snapshots where id = 1;
`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--local")) {
    await resetLocal();
    return;
  }
  if (args.has("--sql")) {
    process.stdout.write(buildPostgresSql());
    return;
  }
  console.log(JSON.stringify(buildFreshCmsSnapshot(), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
