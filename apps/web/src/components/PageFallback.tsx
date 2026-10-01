import { Spinner } from './Spinner';

export function PageFallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center text-slate-500">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
