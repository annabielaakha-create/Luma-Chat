import React from 'react';
import { Sparkles } from 'lucide-react';

interface ModelSelectorProps {
  selectedModelId?: string;
  onSelectModel?: (modelId: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ disabled = false }) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#F2F0ED] border border-[#383838] bg-[#292929] select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-[#DA4B2A]" />
      <Sparkles className="w-3.5 h-3.5 text-[#DA4B2A]" />
      <span>LUMA 1.0</span>
      <span className="text-[10px] text-[#A5A29F] ml-0.5">· Unified</span>
    </div>
  );
};
