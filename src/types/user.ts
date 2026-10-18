export type UserRole = "admin" | "user";

export interface UserRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  username: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name: string;
  phone?: string;
  national_code?: string;
  role: UserRole;
  is_verified?: boolean;
  avatar?: string;
}

export type AuthUserData = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  avatar?: string | null;
} | null;
