import { ModaveFooter } from "./ModaveFooter";
import { ModaveHeader } from "./ModaveHeader";
import { ModaveModals } from "./ModaveModals";
import { CompareDrawer } from "./CompareDrawer";
import { TemplateScripts } from "./TemplateScripts";

export function ModaveShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <button id="scroll-top" aria-label="Scroll to top">
        <svg
          width="24"
          height="25"
          viewBox="0 0 24 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 11.9175L12 2.91748L21 11.9175H16.5V20.1675C16.5 20.3664 16.421 20.5572 16.2803 20.6978C16.1397 20.8385 15.9489 20.9175 15.75 20.9175H8.25C8.05109 20.9175 7.86032 20.8385 7.71967 20.6978C7.57902 20.5572 7.5 20.3664 7.5 20.1675V11.9175H3Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="preload preload-container">
        <div className="preload-logo">
          <div className="spinner" />
        </div>
      </div>
      <div id="wrapper">
        <ModaveHeader />
        {children}
        <ModaveFooter />
        <CompareDrawer />
        <TemplateScripts />
      </div>
      <ModaveModals />
    </>
  );
}
