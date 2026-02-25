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
    <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
      {visibleChannels.map((ch) => (
        <button
          key={ch.id}
          onClick={() => onSelect(ch.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            selected === ch.id
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ch.icon className="w-4 h-4" />
          {ch.label}
        </button>
      ))}
    </div>
  );
}
