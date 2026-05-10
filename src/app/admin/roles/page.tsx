import { AdminRolesClient } from "@/components/admin/AdminRolesClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { roleAccess, roleModules } from "@/lib/admin-token";

export const dynamic = "force-dynamic";

export default function AdminRolesPage() {
  return (
    <AdminTemplateChrome active="roles" title="Roles & Permissions">
      <AdminRolesClient modules={roleModules} access={roleAccess} />
    </AdminTemplateChrome>
  );
}
