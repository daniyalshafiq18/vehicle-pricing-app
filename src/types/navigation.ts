import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface RouteConfig {
  path: string;
  element: React.ComponentType;
  protected?: boolean;
  children?: RouteConfig[];
}
