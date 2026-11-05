import React from 'react';
import { PenTool, FileText, Code2, Compass } from 'lucide-react';
import { LumaLogo } from '../ui/LumaLogo';

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
  onOpenDocumentUpload?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onSelectPrompt,
  onOpenDocumentUpload
}) => {
  const cards = [
    {
      title: 'Build an interactive app',
      description: 'Generate live interactive HTML, games, tools, or dashboard artifacts',
      prompt: 'Create an interactive HTML artifact: build a modern productivity dashboard with task tracker, Pomodoro timer, and live stats.',
      icon: Code2
    },
    {
      title: 'Analyze a document',
      description: 'Extract insights, synthesize takeaways, or query contracts and notes',
      action: onOpenDocumentUpload,
      prompt: 'Please analyze this attached document and provide the key findings, risks, and next steps.',
      icon: FileText
    },
    {
      title: 'Write something',
      description: 'Draft an article, pitch, executive brief, or memo with clear structure',
      prompt: 'Help me draft an executive summary and strategic plan for a modern software product.',
      icon: PenTool
    },
    {
      title: 'Explore an idea',
      description: 'Stress-test hypotheses, brainstorm angles, or break down complex topics',
      prompt: 'Let us explore the future architecture of autonomous agent workspaces and real-time collaboration.',
      icon: Compass
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto text-center animate-in fade-in duration-300">
      <div className="mb-6 flex justify-center">
        <LumaLogo size="lg" showWordmark={true} showCreator={true} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F2F0ED] mb-2">
        What would you like to work on today?
      </h1>
      <p className="text-sm text-[#A5A29F] max-w-lg mb-8 leading-relaxed">
        Think, create, explore, and get things done with LUMA.
      </p>

      {/* Suggested Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => {
                if (card.action) card.action();
                else onSelectPrompt(card.prompt);
              }}
              className="p-4 rounded-xl border border-[#383838] transition-all hover:border-[#DA4B2A] hover:bg-[#292929] group flex flex-col justify-between"
              style={{ backgroundColor: '#242424' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-[#DA4B2A] group-hover:scale-105 transition-transform" />
                <span className="text-sm font-semibold text-[#F2F0ED] group-hover:text-white">
                  {card.title}
                </span>
              </div>
              <p className="text-xs text-[#A5A29F] leading-relaxed">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
