"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors border-b-2 ${
        isActive
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
      }`}
    >
      {children}
    </Link>
  );
}

export function DashboardNav() {
  return (
    <div className="flex space-x-8">
      <NavLink href="/dashboard">Overview</NavLink>
      <NavLink href="/dashboard/agents">Agents</NavLink>
      <NavLink href="/dashboard/repos">Repositories</NavLink>
      <NavLink href="/dashboard/reviews">Reviews</NavLink>
      <NavLink href="/dashboard/analytics">Analytics</NavLink>
    </div>
  );
}

