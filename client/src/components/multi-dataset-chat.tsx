import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Database,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { apiRequest } from "@/lib/queryClient";
import type { Dataset } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  chart?: any;
  hasFileAccess?: boolean;
}

interface MultiDatasetChatProps {
  datasets: Dataset[];
  isOpen: boolean;
  onClose: () => void;
  currentFolder?: string | null;
}

export function MultiDatasetChat({ datasets, isOpen, onClose, currentFolder = null }: MultiDatasetChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const focusTrapRef = useFocusTrap({ 
    isActive: isOpen, 
    restoreFocus: true, 
    autoFocus: true 
  }) as React.RefObject<HTMLDivElement>;

  useKeyboardNavigation({
    onEscape: onClose,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && datasets.length > 0) {
      // Add initial message about the selected datasets
      const initialMessage: Message = {
        id: "initial",
        role: "assistant",
        content: `I'm ready to help you analyze ${datasets.length} selected datasets:\n\n${datasets.map(d => `• **${d.name}** (${d.source})`).join('\n')}\n\nWhat would you like to know about these datasets?`,
        timestamp: new Date(),
        hasFileAccess: true,
      };
      setMessages([initialMessage]);
    }
  }, [isOpen, datasets]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/datasets/batch-chat", {
        message,
        datasetIds: datasets.map(d => d.id),
        conversationHistory: messages.slice(1), // Exclude initial message
        enableVisualization: true
      });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant", 
        content: data.response,
        timestamp: new Date(),
        chart: data.chart,
        hasFileAccess: data.hasFileAccess || false,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    chatMutation.mutate(inputMessage.trim());
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderChart = (chart: any) => {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            boxWidth: 12,
            padding: 10,
            font: {
              size: 11,
            },
          },
        },
        title: {
          display: !!chart.title,
          text: chart.title || "",
          font: {
            size: 14,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 10,
            },
            maxRotation: 45,
          },
        },
        y: {
          ticks: {
            font: {
              size: 10,
            },
          },
        },
      },
      ...chart.options,
    };

    switch (chart.type) {
      case "bar":
        return <Bar data={chart.data} options={commonOptions} />;
      case "pie":
        return <Pie data={chart.data} options={commonOptions} />;
      case "line":
        return <Line data={chart.data} options={commonOptions} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-chat-title"
      aria-describedby="multi-chat-description"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={focusTrapRef}
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-6xl h-[95vh] sm:h-[90vh] max-h-[900px] modal-content animate-fade-in overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border container-safe">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="multi-chat-title" className="text-lg font-semibold text-foreground truncate">
                Multi-Dataset Analysis
              </h2>
              <p id="multi-chat-description" className="text-sm text-muted-foreground truncate">
                Analyzing {datasets.length} selected datasets
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="touch-target"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4 pb-6">
              {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-[80%] overflow-safe">
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 text-break ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="text-sm leading-6 mb-2 last:mb-0">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="text-sm list-disc list-inside mb-2 space-y-1">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="text-sm list-decimal list-inside mb-2 space-y-1">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-6">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">{children}</strong>
                            ),
                            code: ({ children }) => (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto mb-2">
                                {children}
                              </pre>
                            ),
                            h1: ({ children }) => (
                              <h1 className="text-lg font-bold mb-2">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-base font-bold mb-1">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-bold mb-1">
                                {children}
                              </h3>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                        {message.chart && (
                          <div className="mt-4 p-4 bg-card border border-border rounded-lg chart-container">
                            <div className="h-64 w-full chart-responsive">
                              {renderChart(message.chart)}
                            </div>
                          </div>
                        )}

                        {message.hasFileAccess && (
                          <div className="mt-2 flex items-center space-x-1 text-xs text-green-600">
                            <BarChart3 className="h-3 w-3" />
                            <span>Analysis includes actual file data from {datasets.length} datasets</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-break">
                        {message.content}
                      </p>
                    )}
                    <p
                      className={`text-xs mt-2 ${
                        message.role === "user"
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-[80%] overflow-safe">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3 text-break">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span className="text-sm text-muted-foreground">Analyzing datasets...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 container-safe">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask about your ${datasets.length} selected datasets...`}
              className="flex-1"
              disabled={isLoading}
              aria-label="Chat message input"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              className="touch-target"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}