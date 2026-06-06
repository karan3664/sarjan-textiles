"use client";

import { useState } from "react";
import type { CmsSiteSettings, CmsSnapshot } from "@/lib/cms-store";
import { AdminAuthBannersEditor } from "@/components/admin/AdminAuthBannersEditor";
import { putAdminCms } from "@/lib/admin-cms-fetch";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminSiteSettingsClient({
  initialSiteSettings,
}: {
  initialSiteSettings: CmsSiteSettings;
}) {
  const [cms, setCms] = useState<CmsSnapshot>(
    () =>
      ({
        siteSettings: initialSiteSettings,
      }) as CmsSnapshot,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  const setSettings = (key: keyof CmsSiteSettings, value: string | number) => {
    setSaveState("idle");
    setCms((current) => ({
      ...current,
      siteSettings: { ...current.siteSettings, [key]: value },
    }));
  };

  const saveSettings = async () => {
    setSaveState("saving");
    setSaveError("");
    try {
      const data = await putAdminCms<{ siteSettings: CmsSiteSettings }>({
        siteSettings: cms.siteSettings,
      });
      if (data.siteSettings) {
        setCms((current) => ({
          ...current,
          siteSettings: data.siteSettings!,
        }));
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Save failed");
      setSaveState("error");
    }
  };

  const settings = cms.siteSettings;

  return (
    <>
      <AdminAuthBannersEditor
        cms={cms}
        onChange={setCms}
        onSave={saveSettings}
        saveState={saveState}
      />

      <div className="wg-box" id="settings">
        <div className="flex items-center justify-between mb-24">
          <div>
            <h5>Global Store Settings</h5>
            <p className="body-text text-secondary mt-8 mb-0">
              Logo, contact details, footer text, and social links used across
              the website and app.
            </p>
          </div>
          <button
            type="button"
            className="tf-button style-1"
            onClick={saveSettings}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? "Saving..." : "Save Settings"}
          </button>
        </div>
        <div className="cols gap22">
          <fieldset>
            <div className="body-title mb-10">Logo</div>
            <input
              value={settings.logo}
              onChange={(event) => setSettings("logo", event.target.value)}
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Email</div>
            <input
              value={settings.email}
              onChange={(event) => setSettings("email", event.target.value)}
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Orders Email</div>
            <input
              value={settings.ordersEmail}
              onChange={(event) =>
                setSettings("ordersEmail", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Phone</div>
            <input
              value={settings.phone}
              onChange={(event) => setSettings("phone", event.target.value)}
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Address</div>
            <input
              value={settings.address}
              onChange={(event) => setSettings("address", event.target.value)}
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Directions (Google Maps URL)</div>
            <input
              value={settings.directionsUrl ?? ""}
              onChange={(event) =>
                setSettings("directionsUrl", event.target.value)
              }
              placeholder="https://www.google.com/maps/dir/..."
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Open Time Weekday</div>
            <input
              value={settings.openTimeWeekday}
              onChange={(event) =>
                setSettings("openTimeWeekday", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Open Time Sunday</div>
            <input
              value={settings.openTimeSunday}
              onChange={(event) =>
                setSettings("openTimeSunday", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Credit Days</div>
            <input
              type="number"
              value={settings.creditTermDays}
              onChange={(event) =>
                setSettings("creditTermDays", Number(event.target.value))
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Footer Note</div>
            <input
              value={settings.footerNote}
              onChange={(event) =>
                setSettings("footerNote", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Footer Info Heading</div>
            <input
              value={settings.footerInfoHeading ?? ""}
              onChange={(event) =>
                setSettings("footerInfoHeading", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Footer Customer Heading</div>
            <input
              value={settings.footerCustomerHeading ?? ""}
              onChange={(event) =>
                setSettings("footerCustomerHeading", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Footer Newsletter Heading</div>
            <input
              value={settings.footerNewsletterHeading ?? ""}
              onChange={(event) =>
                setSettings("footerNewsletterHeading", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Footer Newsletter Text</div>
            <input
              value={settings.footerNewsletterText ?? ""}
              onChange={(event) =>
                setSettings("footerNewsletterText", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Footer Credit</div>
            <input
              value={settings.footerCredit ?? ""}
              onChange={(event) =>
                setSettings("footerCredit", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Facebook URL</div>
            <input
              value={settings.facebookUrl ?? ""}
              onChange={(event) =>
                setSettings("facebookUrl", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Instagram URL</div>
            <input
              value={settings.instagramUrl ?? ""}
              onChange={(event) =>
                setSettings("instagramUrl", event.target.value)
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">LinkedIn URL</div>
            <input
              value={settings.linkedinUrl ?? ""}
              onChange={(event) =>
                setSettings("linkedinUrl", event.target.value)
              }
            />
          </fieldset>
        </div>
        <div
          className={`body-text mt-20 ${saveState === "error" ? "text-danger" : saveState === "saved" ? "text-success" : ""}`}
        >
          {saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved. Storefront now reads updated settings."
              : saveState === "error"
                ? saveError || "Save failed."
                : "Ready."}
        </div>
      </div>
    </>
  );
}
