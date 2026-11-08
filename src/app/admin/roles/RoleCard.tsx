"use client";

import { useState } from "react";
import { Button, CardShell, Tag } from "@/components/ui";
import { deleteRole, renameRole, togglePermission } from "./actions";

interface Permission {
  id: string;
  key: string;
  label: string;
}

interface RolePermission {
  permissionId: string;
  permission: Permission;
}

interface RoleCardProps {
  id: string;
  name: string;
  isSystem: boolean;
  userCount: number;
  rolePermissions: RolePermission[];
  allPermissions: Permission[];
}

export function RoleCard({
  id,
  name,
  isSystem,
  userCount,
  rolePermissions,
  allPermissions,
}: RoleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const permKeys = new Set(rolePermissions.map((rp) => rp.permission.key));

  return (
    <CardShell tone="cream" className="flex flex-col gap-4">
      {/* Header — clickable for editable roles, static for system roles */}
      {isSystem ? (
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-body text-lg font-bold">{name}</h3>
          <Tag tone="ink">System</Tag>
          <Tag tone="lavender">{userCount} user{userCount === 1 ? "" : "s"}</Tag>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex flex-wrap items-center gap-3 cursor-pointer text-left font-body transition-opacity hover:opacity-80"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} role "${name}"`}
        >
          <h3 className="font-body text-lg font-bold">{name}</h3>
          <Tag tone="lavender">{userCount} user{userCount === 1 ? "" : "s"}</Tag>
          <span className="font-body text-xs text-ink opacity-50 ml-auto">
            {expanded ? "▾ Click to collapse" : "▸ Click to expand"}
          </span>
        </button>
      )}

      {/* Expandable rename/delete — only for editable roles, only when expanded */}
      {!isSystem && expanded && (
        <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink/20 pt-3">
          <form action={renameRole} className="flex items-center gap-1">
            <input type="hidden" name="roleId" value={id} />
            <input
              type="text"
              name="newName"
              defaultValue={name}
              className="border-[3px] border-ink bg-cream px-2 py-1 font-body text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
            />
            <Button type="submit" variant="alt">
              Rename
            </Button>
          </form>
          <form action={deleteRole}>
            <input type="hidden" name="roleId" value={id} />
            <Button type="submit" variant="alt">
              Delete
            </Button>
          </form>
        </div>
      )}

      {/* Permission toggles — always visible */}
      <div className="flex flex-wrap gap-3">
        {allPermissions.map((perm) => {
          const isOn = permKeys.has(perm.key);
          return (
            <form key={perm.id} action={togglePermission}>
              <input type="hidden" name="roleId" value={id} />
              <input type="hidden" name="permissionId" value={perm.id} />
              <Button
                type="submit"
                variant={isOn ? "primary" : "alt"}
                className="text-xs"
              >
                {perm.label}
              </Button>
            </form>
          );
        })}
      </div>
    </CardShell>
  );
}