import Link from "next/link";
import { Fragment } from "react";

export function PageTitle({ title, crumbs }: { title: string; crumbs: string[] }) {
  return (
    <div className="page-title" style={{ backgroundImage: "url(/template/storefront/images/section/page-title.jpg)" }}>
      <div className="container">
        <h3 className="heading text-center">{title}</h3>
        <ul className="breadcrumbs d-flex align-items-center justify-content-center">
          {crumbs.map((crumb, index) => (
            <Fragment key={`${crumb}-${index}`}>
              <li>{index === 0 ? <Link className="link" href="/">{crumb}</Link> : crumb}</li>
              {index < crumbs.length - 1 ? <li><i className="icon-arrRight" /></li> : null}
            </Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}
