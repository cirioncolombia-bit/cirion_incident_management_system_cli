export interface CurrentUser {
  id: number;
  firstName: string;
  secondName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  email: string;
  fullName: string;
  areaId: number;
  areaName: string | null;
  userType: number | null;
  isExternal: boolean;
  eaimId: number | null;
  eaimName: string | null;
  eaimIsActive: boolean;
  roles: { id: number; name: string; description: string }[];
  permissions: string[];
  isActive: boolean;
  createAt: string;
  createdBy: number;
  updatedAt: string | null;
  updatedBy: number | null;
  lastLoginAt: string | null;
  isLocked: boolean | null;
  failedLoginAttempts: number | null;
  lockedUntil: string | null;
}
export interface OwnProfileWrite {
  firstName: string;
  secondName: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  areaId: number;
}
