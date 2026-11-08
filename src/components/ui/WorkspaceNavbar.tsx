import { getViewer, hasPermission } from "@/lib/access";
import { AppHeader } from "./AppHeader";

export async function WorkspaceNavbar() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return null;
  }

  const canManage = await hasPermission(viewer.user, "manage_users");

  return (
    <AppHeader
      userRole={viewer.user.role.name}
      userName={viewer.name ?? viewer.email}
      canManage={canManage}
    />
  );
}
