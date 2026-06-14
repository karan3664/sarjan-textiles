/**
 * Apply copy from "Website final content.docx" to data/cms-db.json.
 * Preserves paragraph spacing via blank lines (\n\n) in plain-text CMS fields.
 *
 *   npx tsx scripts/apply-website-final-content-doc.ts --apply
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";

const HISTORY = `Today may be the era of handicrafts, but for us, this is a legacy that spans four generations.

Our roots trace back to Tando Allahyar in Sindh Province, where the Khatri community was deeply connected to the art of dyeing. Nearly every family in our locality was engaged in this craft. Similar settlements existed across Sindh, where Khatri families lived and worked together, preserving and advancing their traditional skills.

The knowledge of natural dyes and textile coloration was a gift passed down through generations. Although different communities wore different styles of clothing, dyed and handcrafted fabrics were widely used and highly valued. By the time our family migrated to India after Independence, we carried nearly 50-60 years of experience in the dyeing profession with us, with particular expertise in the art of Ajrakh.

After settling in India, we began our Ajrakh journey in Barmer, Rajasthan. During that period, Ajrakh was widely used by the Jat Muslim communities in the Banni region of Kutch. Recognizing its cultural significance and demand, we brought Ajrakh from Barmer to Kutch and formally started our business there in 1995.

Over time, the popularity of lungis grew significantly. Our family, along with many other communities connected to the textile trade, contributed to the growth of this industry, which expanded on a large scale.

Between 1980 and 2000, the market for Kutchi lungis flourished. During this period, we operated under the name Leelashah Handicraft, serving customers across the region.

Later, from 2015 to 2019, Mr. Lalchand Khatri (Grandfather of Kunaal Khatri, Founder - Sarjan Textiles) established and operated a factory with the name Shri Ramdoot Textiles. During this phase, our bedsheets were supplied not only across Gujarat but also delivered to many other states, expanding our reach and strengthening our presence in the textile industry.

Today, our journey continues through Sarjan Textiles, carrying forward a legacy that has been built over generations. What started as a family tradition in dyeing and textiles has now entered a new phase with a fresh vision and renewed purpose.

At Sarjan Textiles, we are committed to preserving the beauty and authenticity of our craft while adapting it to the needs of today's world. We continue to work with traditional techniques like Ajrakh, but with a focus on creating products that connect with modern lifestyles and markets.

This is a new beginning for us. With the experience and knowledge passed down through our family, we aim to take our crafts and heritage to a global stage. By bringing together traditional craftsmanship and thoughtful innovation, we hope to share the richness of our culture with people across the world while staying true to the roots that define us.`;

const ABOUT_BODY = `Sarjan Textiles was founded with the vision of bringing traditional textile knowledge into contemporary apparel manufacturing. Though our apparel journey began recently, our connection with textiles and crafts has existed across generations.

Over the years, we observed a gap in the market - brands and retailers often had to coordinate with multiple vendors for fabrics, dyeing, printing, stitching, finishing, and production. The process was fragmented, time-consuming, and inconsistent.

Sarjan Textiles was created to simplify this ecosystem.

Today, we work as an integrated craft-based garment manufacturing partner, offering ready stock wholesale collections and everything from sourcing and development to final garment production under one roof.

By combining skilled artisans, modern manufacturing processes, thoughtful design understanding, and scalable production capabilities, we help brands create collections that feel authentic, refined, and commercially relevant.`;

const MISSION = `Our mission is to preserve and elevate India's rich textile and craft heritage by transforming traditional techniques into contemporary apparel for modern markets.

As craft-based garment manufacturers and wholesale suppliers, we aim to make artisan-led fashion more accessible to brands, retailers, boutiques, and businesses by providing seamless end-to-end solutions under one roof. From sourcing and development to manufacturing and finishing, we simplify the journey from concept to finished garment.

We are committed to supporting artisans, promoting thoughtful and responsible production, maintaining exceptional quality, and creating garments that balance craftsmanship, functionality, and scalability.

Through innovation, collaboration, and deep respect for heritage, we strive to build a future where traditional crafts continue to thrive within contemporary fashion while creating value for both artisans and businesses.`;

const CONTACT_BODY = `We collaborate with brands, retailers, boutiques, and private labels looking for reliable craft-based garment manufacturing solutions.

Whether you need custom development, scalable production, white label manufacturing, or complete end-to-end execution, our team works closely with you to simplify the process and deliver garments ready for market.

From sourcing and development to final production, we aim to make apparel manufacturing more seamless, organized, and craft-driven for modern businesses.

Share your buying requirement, category interest, and preferred quantity. The Sarjan team will review your request and guide you through client approval.`;

async function apply() {
  const cmsPath = path.join(process.cwd(), "data", "cms-db.json");
  const cms = JSON.parse(await readFile(cmsPath, "utf8")) as Record<
    string,
    unknown
  >;

  const pages = (cms.pages ?? {}) as Record<string, Record<string, string>>;
  pages.about = {
    ...pages.about,
    title: "About Us",
    body: ABOUT_BODY,
    history: HISTORY,
    mission: MISSION,
  };
  delete pages.about.infrastructure;

  pages.contact = {
    ...pages.contact,
    body: CONTACT_BODY,
  };

  const seoPages = Array.isArray(cms.seoPages)
    ? (cms.seoPages as Array<{ id?: string }>).filter(
        (page) => page.id !== "infrastructure",
      )
    : [];

  const aboutSeo = seoPages.find((page) => page.id === "about") as
    | Record<string, unknown>
    | undefined;
  if (
    aboutSeo?.metaDescription &&
    typeof aboutSeo.metaDescription === "object"
  ) {
    const md = aboutSeo.metaDescription as Record<string, string>;
    const next =
      "Learn about Sarjan Textiles, its craft-based garment manufacturing, company history, mission, and wholesale collections.";
    md.en = next;
    md.hi = next;
    md.gu = next;
  }

  cms.pages = pages;
  cms.seoPages = seoPages;
  cms.updatedAt = new Date().toISOString();

  await writeFile(cmsPath, `${JSON.stringify(cms, null, 2)}\n`, "utf8");
  console.log("Updated cms-db.json:");
  console.log("  - about body, history, mission");
  console.log("  - contact body");
  console.log("  - removed infrastructure SEO page");
}

if (process.argv.includes("--apply")) {
  apply().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  console.log("Run with --apply to patch data/cms-db.json");
}
