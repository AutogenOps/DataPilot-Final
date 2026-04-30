import { Database } from 'lucide-react';

type DataPilotMarkProps = {
  className?: string;
};

export default function DataPilotMark({ className = '' }: DataPilotMarkProps) {
  return (
    <span
      aria-label="DataPilot"
      className={`inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-accent-warm via-accent-cyan to-accent-azure text-black shadow-[0_0_24px_rgba(255,138,61,0.24)] ${className}`}
    >
      <Database className="h-[62%] w-[62%]" strokeWidth={2.4} />
    </span>
  );
}
