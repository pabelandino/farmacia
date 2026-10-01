import { ReactNode } from 'react';

export function TableWrap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`-mx-1 overflow-x-auto sm:mx-0 ${className}`}>{children}</div>;
}
