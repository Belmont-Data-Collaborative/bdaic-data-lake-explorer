import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, X, Bot, User, Loader2, Download, MessageCircle, Database, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { apiRequest } from "@/lib/queryClient";
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
import type { Dataset } from "@shared/schema";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
);

interface ChartData {
  type: "bar" | "pie" | "line";
  data: any;
  options?: any;
  title?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  chart?: ChartData;
  hasFileAccess?: boolean;
  sampleInfo?: {
    strategy: string;
    sampleSize: number;
    representativeness: number;
    dataQuality: any;
  };
}

interface DatasetChatProps {
  dataset: Dataset;
  isOpen: boolean;
  onClose: () => void;
}

export function DatasetChat({ dataset, isOpen, onClose }: DatasetChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Focus management
  const focusTrapRef = useFocusTrap({ isActive: isOpen }) as React.RefObject<HTMLDivElement>;
  
  // Keyboard navigation
  useKeyboardNavigation({
    onEscape: onClose,
    enabled: isOpen,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message when chat opens
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Hello! I'm your AI data analyst for the "${dataset.name}" dataset

What would you like to explore?`,
        timestamp: new Date(),
        hasFileAccess: true,
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, dataset.name, messages.length]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest(
        "POST",
        `/api/datasets/${dataset.id}/chat`,
        {
          message,
          conversationHistory: messages.slice(-10), // Send last 10 messages for context
          enableVisualization: true, // Request chart data if applicable
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        chart: data.chart, // Include chart data if provided
        hasFileAccess: data.hasFileAccess,
        sampleInfo: data.sampleInfo, // Include intelligent sampling information
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    },
    onError: (error: any) => {
      toast({
        title: "Chat error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    chatMutation.mutate(inputValue.trim());
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderChart = (chart: ChartData) => {
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

  const downloadData = async () => {
    try {
      const response = await apiRequest(
        "GET",
        `/api/datasets/${dataset.id}/download`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${dataset.name}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Download started",
        description: "Dataset download has been initiated.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download dataset. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
      aria-describedby="chat-description"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={focusTrapRef}
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl modal-content animate-fade-in overflow-safe flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border container-safe">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageCircle className="text-primary-foreground" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="chat-title" className="font-semibold text-foreground text-ellipsis">
                AI Chat: {dataset.name}
              </h2>
              <p id="chat-description" className="text-sm text-muted-foreground text-ellipsis">
                Ask questions about this dataset
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadData}
              aria-label="Download dataset sample"
              className="touch-target focus-ring"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              aria-label="Close AI chat dialog"
              className="touch-target focus-ring"
            >
              <X size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 max-h-[60vh]">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex items-start space-x-3 max-w-[85%] sm:max-w-[80%] overflow-safe ${
                    message.role === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User size={16} />
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-3 overflow-safe text-break ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic">{children}</em>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-4 mb-2">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-4 mb-2">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="mb-1">{children}</li>
                            ),
                            code: ({ children }) => (
                              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                {children}
                              </code>
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
                        {/* Intelligent Sampling Information */}
                        {message.sampleInfo && message.sampleInfo.strategy !== 'error' && (
                          <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <Database className="h-3 w-3" />
                              <span className="font-medium">Data Analysis Details</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">Strategy:</span>
                                <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                                  {message.sampleInfo.strategy.charAt(0).toUpperCase() + message.sampleInfo.strategy.slice(1)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Sample Size:</span>
                                <span className="ml-2 font-medium">{message.sampleInfo.sampleSize.toLocaleString()} rows</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Accuracy:</span>
                                <span className="ml-2 font-medium">{(message.sampleInfo.representativeness * 100).toFixed(1)}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Quality:</span>
                                <span className="ml-2 font-medium">{(message.sampleInfo.dataQuality.completeness * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {message.hasFileAccess && (
                          <div className="mt-2 flex items-center space-x-1 text-xs text-green-600">
                            <BarChart3 className="h-3 w-3" />
                            <span>Analysis includes actual file data</span>
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
                      <Loader2 className="animate-spin flex-shrink-0" size={16} />
                      <span className="text-sm text-foreground">
                        AI is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border container-safe">
          <div className="flex space-x-3 gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about this dataset..."
              className="flex-1 min-w-0"
              disabled={isLoading}
              aria-label="Ask a question about this dataset"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 sm:px-6 flex-shrink-0 touch-target"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-break">
            Press Enter to send • The AI has context about this dataset's
            structure and metadata
          </p>
        </div>
      </div>
    </div>
  );
}
