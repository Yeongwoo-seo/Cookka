export enum UserRole {
  Admin = 'admin',
  Member = 'member',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: Date;
}

export interface BusinessInfo {
  businessName: string;
  address?: string;
  phone?: string;
  defaultPricing: Record<string, number>;
}

export interface Team {
  id: string;
  name: string;
  members: User[];
  businessInfo: BusinessInfo;
  createdAt: Date;
}

export const roleLabels: Record<UserRole, string> = {
  [UserRole.Admin]: '관리자',
  [UserRole.Member]: '팀원',
};
