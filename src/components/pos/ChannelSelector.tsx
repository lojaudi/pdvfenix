import { Monitor, Users, Truck } from "lucide-react";

type OrderChannel = "balcao" | "garcom" | "delivery";

interface ChannelSelectorProps {
  selected: OrderChannel;
  onSelect: (channel: OrderChannel) => void;
  hiddenChannels?: OrderChannel[];
}

const channels: { id: OrderChannel; label: string; icon: typeof Monitor }[] = [
  { id: "balcao", label: "Balcão", icon: Monitor },
  { id: "garcom", label: "Garçom", icon: Users },
  { id: "delivery", label: "Delivery", icon: Truck },
];

export function ChannelSelector({ selected, onSelect, hiddenChannels = [] }: ChannelSelectorProps) {
  const visibleChannels = channels.filter((ch) => !hiddenChannels.includes(ch.id));

  return (
    <div className="flex gap-1 bg-secondary/50 rounded-xl p-1" role="tablist" aria-label="Canal de venda">
      {visibleChannels.map((ch) => (
        <button
          key={ch.id}
          onClick={() => onSelect(ch.id)}
          role="tab"
          aria-selected={selected === ch.id}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all min-h-[40px] focus-visible:ring-2 focus-visible:ring-ring ${
            selected === ch.id
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={`Canal ${ch.label}`}
        >
          <ch.icon className="w-4 h-4" aria-hidden="true" />
          <span className="hidden xs:inline sm:inline">{ch.label}</span>
        </button>
      ))}
    </div>
  );
}
