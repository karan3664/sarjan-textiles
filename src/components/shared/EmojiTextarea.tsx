"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="sarjan-emoji-picker-loading">Loading emojis…</div>
  ),
});

const PICKER_WIDTH = 352;
const PICKER_HEIGHT = 420;
/** Ignore outside-close until the opening click/pointer cycle finishes (dev Strict Mode). */
const PICKER_OPEN_GUARD_MS = 250;

type EmojiTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> & {
  className?: string;
  textareaClassName?: string;
  showEmojiPicker?: boolean;
};

export function EmojiTextarea({
  className = "",
  textareaClassName = "",
  showEmojiPicker = true,
  value,
  onChange,
  ...rest
}: EmojiTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const pickerPortalRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openingGuardRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStyle, setPickerStyle] = useState<CSSProperties>({});
  const [pickerSize, setPickerSize] = useState({
    width: PICKER_WIDTH,
    height: PICKER_HEIGHT,
  });
  const pickerId = useId();

  const positionPicker = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(PICKER_WIDTH, window.innerWidth - 16);
    const height = Math.min(PICKER_HEIGHT, window.innerHeight - 16);
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8,
    );
    const topAbove = rect.top - height - 10;
    const top =
      topAbove >= 8
        ? topAbove
        : Math.min(rect.bottom + 10, window.innerHeight - height - 8);
    setPickerSize({ width, height });
    setPickerStyle({
      position: "fixed",
      left,
      top,
      width,
      height,
      zIndex: 10050,
    });
  }, []);

  const setValueAndNotify = useCallback(
    (next: string, cursorAt?: number) => {
      const el = textareaRef.current;
      if (!el) return;

      if (value !== undefined && onChange) {
        const synthetic = {
          target: { ...el, value: next },
          currentTarget: { ...el, value: next },
        } as ChangeEvent<HTMLTextAreaElement>;
        onChange(synthetic);
      } else {
        el.value = next;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }

      requestAnimationFrame(() => {
        el.focus();
        const pos = cursorAt ?? next.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [value, onChange],
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const current =
        value !== undefined && value !== null ? String(value) : el.value;
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const next = current.slice(0, start) + emoji + current.slice(end);
      setValueAndNotify(next, start + emoji.length);
    },
    [value, setValueAndNotify],
  );

  const onEmojiClick = useCallback(
    (data: EmojiClickData) => {
      insertEmoji(data.emoji);
    },
    [insertEmoji],
  );

  const togglePicker = useCallback(() => {
    setPickerOpen((open) => {
      if (!open) {
        openingGuardRef.current = true;
        positionPicker();
        window.setTimeout(() => {
          openingGuardRef.current = false;
        }, PICKER_OPEN_GUARD_MS);
      }
      return !open;
    });
  }, [positionPicker]);

  useEffect(() => {
    if (!pickerOpen) return;
    positionPicker();
    const onResize = () => positionPicker();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [pickerOpen, positionPicker]);

  useEffect(() => {
    if (!pickerOpen) return;

    const isInsidePicker = (node: Node) =>
      pickerPortalRef.current?.contains(node) ||
      triggerRef.current?.contains(node);

    const close = () => setPickerOpen(false);

    const onPointerDown = (event: PointerEvent) => {
      if (openingGuardRef.current) return;
      const target = event.target as Node;
      if (isInsidePicker(target)) return;
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    // Defer so the same click that opened the picker does not close it immediately
    const attachId = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("keydown", onKeyDown);
    }, PICKER_OPEN_GUARD_MS);

    return () => {
      window.clearTimeout(attachId);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

  const mergedTextareaClass = [
    "sarjan-emoji-text",
    "sarjan-emoji-field-input",
    textareaClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const pickerNode =
    pickerOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className="sarjan-emoji-picker-backdrop"
              aria-label="Close emoji picker"
              tabIndex={-1}
              onClick={() => setPickerOpen(false)}
            />
            <div
              ref={pickerPortalRef}
              id={pickerId}
              className="sarjan-emoji-picker-portal"
              style={pickerStyle}
              role="dialog"
              aria-label="Emoji picker"
            >
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme={Theme.LIGHT}
                searchPlaceholder="Search emoji"
                width={pickerSize.width}
                height={pickerSize.height}
                lazyLoadEmojis={false}
                previewConfig={{ showPreview: true }}
                skinTonesDisabled={false}
              />
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={`sarjan-emoji-field ${className}`.trim()}>
      <textarea
        {...rest}
        ref={textareaRef}
        className={mergedTextareaClass}
        value={value}
        onChange={onChange}
        lang="en"
        spellCheck
      />
      {showEmojiPicker ? (
        <div className="sarjan-emoji-field-toolbar" ref={toolbarRef}>
          <button
            ref={triggerRef}
            type="button"
            className="sarjan-emoji-trigger"
            aria-expanded={pickerOpen}
            aria-controls={pickerId}
            aria-label="Open emoji picker"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              togglePicker();
            }}
          >
            <span className="sarjan-emoji-trigger-icon" aria-hidden>
              😊
            </span>
          </button>
        </div>
      ) : null}
      {pickerNode}
    </div>
  );
}
