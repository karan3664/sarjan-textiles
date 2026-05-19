"use client";

import type { AdminRole } from "@/lib/admin-token";

type RoleModule = { key: string; label: string; roles: AdminRole[] };

const roles: AdminRole[] = [
  "super_admin",
  "admin",
  "sales",
  "dispatch",
  "accounts",
  "content",
];

function roleLabel(role: AdminRole) {
  return role
    .replace("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function AdminRolesClient({
  modules,
  access,
}: {
  modules: RoleModule[];
  access: Record<AdminRole, string[]>;
}) {
  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-products-kpi-grid">
        {roles.map((role) => (
          <div className="sarjan-home-kpi-card" key={role}>
            <div className="sarjan-home-kpi-icon">
              <i className="icon-users" />
            </div>
            <div>
              <div className="body-text text-secondary">{roleLabel(role)}</div>
              <h5>
                {modules.filter((item) => item.roles.includes(role)).length}{" "}
                modules
              </h5>
            </div>
          </div>
        ))}
      </div>
      <div className="wg-box sarjan-report-box">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Role Permission Matrix</h5>
            <div className="body-text text-secondary">
              Admin routes and APIs are protected by this role matrix. Super
              Admin has full system access.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            RBAC Active
          </div>
        </div>
        <div className="wg-table sarjan-role-table">
          <table>
            <thead>
              <tr>
                <th className="text-title">Module</th>
                {roles.map((role) => (
                  <th className="text-title" key={role}>
                    {roleLabel(role)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr className="tf-table-item item-row" key={module.key}>
                  <td>
                    <div className="text-title">{module.label}</div>
                  </td>
                  {roles.map((role) => (
                    <td key={role}>
                      <span
                        className={`box-status text-button ${module.roles.includes(role) ? "type-completed" : "type-inactive"}`}
                      >
                        {module.roles.includes(role) ? "Allowed" : "Blocked"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="wg-box sarjan-report-box">
        <div className="box-top mb-20">
          <h5>Protected Route Prefixes</h5>
        </div>
        <div className="sarjan-role-prefix-grid">
          {roles.map((role) => (
            <div className="sarjan-role-prefix-card" key={role}>
              <h6>{roleLabel(role)}</h6>
              {(access[role] ?? []).map((prefix) => (
                <span key={prefix}>{prefix}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
