import type { UserRole } from "@/types";

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  admin: "/",
  management: "/",
  staff: "/pos",
  operator: "/orders",
};

const STAFF_ROUTE_PREFIXES = ["/pos", "/customers", "/calculator", "/reports"];
const OPERATOR_ROUTE_PREFIXES = ["/orders"];
type LegacyRole = "owner" | "kasir";
type RuntimeRole = UserRole | LegacyRole | string | null | undefined;

export const normalizeRole = (role: RuntimeRole): UserRole | null => {
  if (!role) return null;
  if (role === "owner") return "management";
  if (role === "kasir") return "staff";
  if (role === "admin" || role === "management" || role === "staff" || role === "operator") return role;
  return null;
};

const normalizePath = (path: string): string => {
  if (!path) return "/";
  const trimmed = path.trim();
  if (trimmed === "/") return "/";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const matchesRoutePrefix = (pathname: string, prefix: string): boolean => {
  const normalizedPath = normalizePath(pathname);
  const normalizedPrefix = normalizePath(prefix);
  return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
};

export const canAccessRoute = (role: RuntimeRole, pathname: string): boolean => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;
  if (normalizedRole === "admin" || normalizedRole === "management") return true;
  if (normalizedRole === "staff") return STAFF_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix));
  return OPERATOR_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix));
};

export const canMutateMasterData = (role: RuntimeRole): boolean => normalizeRole(role) === "admin";
export const canCreateOrder = (role: RuntimeRole): boolean => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "staff";
};
export const canUpdateOrderStatus = (role: RuntimeRole): boolean => normalizeRole(role) === "admin";
export const canManageExpenses = (role: RuntimeRole): boolean => normalizeRole(role) === "admin";
export const canManageCustomers = (role: RuntimeRole): boolean => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "staff";
};
export const isGlobalReadOnlyRole = (role: RuntimeRole): boolean => normalizeRole(role) === "management";
export const isOrdersReadOnlyRole = (role: RuntimeRole): boolean => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "management" || normalizedRole === "operator";
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  management: "Management",
  staff: "Staff",
  operator: "Operator",
};

export const getRoleHomePath = (role: RuntimeRole): string => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? ROLE_HOME_PATH[normalizedRole] : "/login";
};

export const getRoleLabel = (role: RuntimeRole): string => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? ROLE_LABELS[normalizedRole] : "-";
};
