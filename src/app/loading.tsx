import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
    </div>
  );
}
