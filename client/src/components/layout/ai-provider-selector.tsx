import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AIProvider } from "@/lib/ai-client";

interface AIProviderSelectorProps {
  currentProvider?: AIProvider;
  onProviderChange?: (provider: AIProvider) => void;
  disabled?: boolean;
}

interface ProviderInfo {
  key: AIProvider;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'disabled' | 'error';
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'medium' | 'low';
}

const PROVIDERS: ProviderInfo[] = [
  {
    key: 'gemini',
    name: 'Gemini 3 Pro',
    description: 'Google Gemini 3 Pro Preview',
    icon: 'fab fa-google',
    status: 'active',
    speed: 'medium',
    quality: 'high'
  },
  {
    key: 'kimiki2',
    name: 'Kimi K2',
    description: 'Moonshotai Kimi-K2 on Groq',
    icon: 'fas fa-robot',
    status: 'active',
    speed: 'fast',
    quality: 'high'
  }
];

export function AIProviderSelector({ currentProvider = 'gemini', onProviderChange, disabled = false }: AIProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const currentProviderInfo = PROVIDERS.find(p => p.key === currentProvider) || PROVIDERS[0];
  const availableProviders = PROVIDERS.filter(p => p.status === 'active');

  const handleProviderChange = (provider: AIProvider) => {
    setIsOpen(false);
    onProviderChange?.(provider);
    
    // Save preference to localStorage
    localStorage.setItem('ai-provider-preference', provider);
    
    // Inform user of the change
    console.log(`AI Provider changed to: ${provider}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="ml-2 bg-green-100 text-green-800">Active</Badge>;
      case 'disabled':
        return <Badge variant="secondary" className="ml-2">Disabled</Badge>;
      case 'error':
        return <Badge variant="destructive" className="ml-2">Error</Badge>;
      default:
        return null;
    }
  };

  const getSpeedBadge = (speed: string) => {
    switch (speed) {
      case 'fast':
        return <Badge variant="outline" className="ml-2 border-green-500 text-green-700">Fast</Badge>;
      case 'medium':
        return <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-700">Medium</Badge>;
      case 'slow':
        return <Badge variant="outline" className="ml-2 border-red-500 text-red-700">Slow</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="ai-provider-trigger"
          >
            <i className={`${currentProviderInfo.icon} mr-2`}></i>
            {currentProviderInfo.name}
            <i className="fas fa-chevron-down ml-2 text-xs"></i>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80" align="end">
          <DropdownMenuLabel>
            <div className="flex items-center justify-between">
              <span>AI Provider</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs"
              >
                <i className="fas fa-question-circle mr-1"></i>
                Help
              </Button>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {showHelp && (
            <>
              <div className="px-2 py-2 text-xs text-muted-foreground bg-muted rounded-md mx-2 mb-2">
                <p className="mb-1"><strong>Select your AI model:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Gemini 3 Pro: Best for creative writing and reasoning</li>
                  <li>Kimi K2: Fast responses with high quality</li>
                </ul>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          
          {availableProviders.map((provider) => (
            <DropdownMenuItem
              key={provider.key}
              onClick={() => handleProviderChange(provider.key)}
              className={`flex items-center justify-between ${provider.key === currentProvider ? 'bg-accent font-medium' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <i className={`${provider.icon} text-lg`}></i>
                <div>
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-xs text-muted-foreground">{provider.description}</div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                {getSpeedBadge(provider.speed)}
                {getStatusBadge(provider.status)}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-2 text-xs text-muted-foreground">
            <p className="mb-1"><i className="fas fa-info-circle mr-1"></i>Current setting:</p>
            <div className="bg-muted rounded-md p-2">
              <div className="flex items-center space-x-2">
                <i className={`${currentProviderInfo.icon}`}></i>
                <div>
                  <div className="font-medium">{currentProviderInfo.name}</div>
                  <div className="text-xs">{currentProviderInfo.description}</div>
                </div>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export type { AIProvider };
