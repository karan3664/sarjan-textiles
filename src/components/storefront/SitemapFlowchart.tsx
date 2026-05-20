"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { SitemapTreeMeta, SitemapTreeNode } from "@/lib/sitemap-tree";

/** Groups larger than this start collapsed; smaller ones start open. */
const AUTO_COLLAPSE_AT = 6;

type Props = {
  tree: SitemapTreeNode;
  meta: SitemapTreeMeta;
  baseUrl: string;
};

function sectionClass(section?: string): string {
  switch (section) {
    case "home":
      return "sarjan-sitemap-node--home";
    case "main":
      return "sarjan-sitemap-node--main";
    case "catalog":
      return "sarjan-sitemap-node--catalog";
    case "products":
      return "sarjan-sitemap-node--product";
    case "blog":
      return "sarjan-sitemap-node--blog";
    case "custom":
      return "sarjan-sitemap-node--custom";
    case "group":
      return "sarjan-sitemap-node--group";
    default:
      return "sarjan-sitemap-node--default";
  }
}

function formatPriority(p?: number): string | null {
  if (p == null) return null;
  return p.toFixed(p === 1 ? 0 : 1);
}

function initialExpanded(
  childCount: number,
  defaultExpanded?: boolean,
): boolean {
  if (defaultExpanded !== undefined) return defaultExpanded;
  return childCount <= AUTO_COLLAPSE_AT;
}

function NodeCard({
  node,
  baseUrl,
  isRoot,
  compact,
  childCount,
  expanded,
  onToggle,
}: {
  node: SitemapTreeNode;
  baseUrl: string;
  isRoot?: boolean;
  compact?: boolean;
  childCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const href = node.path.startsWith("http")
    ? node.path
    : `${baseUrl}${node.path.startsWith("/") ? node.path : `/${node.path}`}`;
  const priority = formatPriority(node.priority);

  return (
    <div
      className={`sarjan-sitemap-node ${sectionClass(node.section)}${isRoot ? " sarjan-sitemap-node--root" : ""}${compact ? " sarjan-sitemap-node--compact" : ""}${expanded ? " sarjan-sitemap-node--expanded" : " sarjan-sitemap-node--collapsed"}`}
    >
      <h3 className="sarjan-sitemap-node__title">{node.label}</h3>
      {!compact && (
        <>
          <Link href={node.path} className="sarjan-sitemap-node__url">
            {node.path}
          </Link>
          {(priority || node.changeFrequency) && (
            <div className="sarjan-sitemap-node__meta">
              {priority && (
                <span className="sarjan-sitemap-pill sarjan-sitemap-pill--priority">
                  priority {priority}
                </span>
              )}
              {node.changeFrequency && (
                <span className="sarjan-sitemap-pill sarjan-sitemap-pill--freq">
                  {node.changeFrequency}
                </span>
              )}
            </div>
          )}
          <a
            href={href}
            className="sarjan-sitemap-node__open"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open ↗
          </a>
        </>
      )}
      {compact && node.path && (
        <p className="sarjan-sitemap-node__path-hint">{node.path}</p>
      )}
      <button
        type="button"
        className="sarjan-sitemap-toggle"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        aria-expanded={expanded}
        aria-controls={`sitemap-branch-${node.id}`}
      >
        <span className="sarjan-sitemap-toggle__icon" aria-hidden>
          {expanded ? "−" : "+"}
        </span>
        {expanded ? `Collapse (${childCount})` : `Expand (${childCount})`}
      </button>
    </div>
  );
}

function TreeBranch({
  node,
  baseUrl,
  depth = 0,
  defaultExpanded,
}: {
  node: SitemapTreeNode;
  baseUrl: string;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const children = node.children ?? [];
  const isGroup = node.section === "group" && children.length > 0;
  const [expanded, setExpanded] = useState(() =>
    initialExpanded(children.length, defaultExpanded),
  );

  const toggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const showChildren = expanded && children.length > 0;

  if (children.length === 0) {
    return (
      <li className="sarjan-sitemap-branch sarjan-sitemap-branch--leaf">
        <div className="sarjan-sitemap-branch__node">
          <div
            className={`sarjan-sitemap-node ${sectionClass(node.section)}${depth === 0 ? " sarjan-sitemap-node--root" : ""}`}
          >
            <h3 className="sarjan-sitemap-node__title">{node.label}</h3>
            <Link href={node.path} className="sarjan-sitemap-node__url">
              {node.path}
            </Link>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`sarjan-sitemap-branch sarjan-sitemap-branch--parent${depth === 0 ? " sarjan-sitemap-branch--root" : ""}${isGroup ? " sarjan-sitemap-branch--group" : ""}${showChildren ? " sarjan-sitemap-branch--open" : " sarjan-sitemap-branch--closed"}`}
    >
      <div className="sarjan-sitemap-branch__node">
        <NodeCard
          node={node}
          baseUrl={baseUrl}
          isRoot={depth === 0}
          compact={isGroup && depth > 0}
          childCount={children.length}
          expanded={expanded}
          onToggle={toggle}
        />
      </div>
      {showChildren ? (
        <ul
          id={`sitemap-branch-${node.id}`}
          className={`sarjan-sitemap-children${children.length === 1 ? " sarjan-sitemap-children--single" : ""}`}
        >
          {children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              baseUrl={baseUrl}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function SitemapFlowchart({ tree, meta, baseUrl }: Props) {
  const generated = new Date(meta.generatedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section className="flat-spacing sarjan-sitemap-page">
      <div className="container">
        <div className="sarjan-sitemap-header">
          <p className="sarjan-sitemap-eyebrow">Site structure</p>
          <h1 className="sarjan-sitemap-title">Visual sitemap</h1>
          <p className="sarjan-sitemap-lead">
            All public pages in a flowchart for planning and QA.
          </p>
          <div className="sarjan-sitemap-stats">
            <span>
              <strong>{meta.totalUrls}</strong> URLs
            </span>
            <span>Updated {generated}</span>
            <a
              href={meta.xmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sarjan-sitemap-xml-btn"
            >
              sitemap.xml ↗
            </a>
          </div>
          <div className="sarjan-sitemap-legend" aria-label="Section colors">
            <span className="sarjan-sitemap-legend__item sarjan-sitemap-legend__item--home">
              Home
            </span>
            <span className="sarjan-sitemap-legend__item sarjan-sitemap-legend__item--main">
              Main
            </span>
            <span className="sarjan-sitemap-legend__item sarjan-sitemap-legend__item--catalog">
              Catalog
            </span>
            <span className="sarjan-sitemap-legend__item sarjan-sitemap-legend__item--product">
              Products
            </span>
            <span className="sarjan-sitemap-legend__item sarjan-sitemap-legend__item--blog">
              Blog
            </span>
          </div>
        </div>

        <div className="sarjan-sitemap-canvas">
          <ul className="sarjan-sitemap-tree">
            <TreeBranch node={tree} baseUrl={baseUrl} defaultExpanded />
          </ul>
        </div>
      </div>
    </section>
  );
}
