import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download, X } from "lucide-react";
import { useState } from "react";

interface Props {
  appName?: string;
}

export function InstallAppBanner({ appName = "Garçom" }: Props) {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary/95 backdrop-blur-sm text-primary-foreground rounded-2xl p-4 shadow-2xl shadow-primary/30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Instalar App {appName}</p>
          <p className="text-xs opacity-80">Acesse direto da tela inicial</p>
        </div>
        <button
          onClick={async () => {
            await promptInstall();
          }}
          className="px-4 py-2 bg-primary-foreground text-primary font-bold text-xs rounded-xl hover:opacity-90 transition shrink-0"
        >
          Instalar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 opacity-60 hover:opacity-100 transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
