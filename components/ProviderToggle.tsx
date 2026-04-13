import { FC } from "react";
import type { SearchProvider } from "@/app/page";

type Props = {
  provider: SearchProvider;
  setProvider: (p: SearchProvider) => void;
  disabled?: boolean;
};

const options: { value: SearchProvider; label: string }[] = [
  { value: "exa", label: "Exa" },
  { value: "keenable", label: "Keenable" },
];

const ProviderToggle: FC<Props> = ({ provider, setProvider, disabled }) => {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-[#C2C2C2] bg-white p-1 text-xs"
      role="radiogroup"
      aria-label="Search provider"
    >
      <span className="px-2 font-medium text-[#1B1B16]/60">Search:</span>
      {options.map((opt) => {
        const selected = provider === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => setProvider(opt.value)}
            className={
              "rounded px-2 py-1 transition-colors " +
              (selected
                ? "bg-[#1B1B16] text-white"
                : "text-[#1B1B16] hover:bg-[#EDEDEA] disabled:opacity-50")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default ProviderToggle;
