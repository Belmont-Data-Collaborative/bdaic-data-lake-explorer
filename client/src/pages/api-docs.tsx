import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Book, FileText, Search, ChevronRight, List } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

export default function ApiDocsPage() {
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);

  useEffect(() => {
    const fetchMarkdownContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try to fetch from the API documentation section of replit.md
        const response = await fetch("/api/docs/markdown");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation: ${response.status}`);
        }
        
        const content = await response.text();
        setMarkdownContent(content);
        
        // Extract table of contents from headers
        const headers = extractHeaders(content);
        setTableOfContents(headers);
        
      } catch (err) {
        console.error("Error fetching markdown content:", err);
        setError(err instanceof Error ? err.message : "Failed to load documentation");
        
        // Fallback: provide a basic API overview
        const fallbackContent = `# 📘 API Documentation

## Overview
This is the API documentation for the Data Lake Explorer application.

**Note**: The full documentation content could not be loaded. Please ensure the markdown file is accessible.

## Available Endpoints

### Authentication
- \`POST /api/auth/login\` - Authenticate with password
- \`GET /api/auth/status\` - Check authentication status

### AWS Configuration  
- \`GET /api/aws-config\` - Get active AWS configuration
- \`POST /api/aws-config\` - Create/update AWS configuration

### Datasets
- \`GET /api/datasets\` - List datasets with pagination
- \`POST /api/datasets/refresh\` - Refresh datasets from S3
- \`GET /api/datasets/:id\` - Get specific dataset

### Statistics
- \`GET /api/stats\` - Get application statistics
- \`GET /api/folders\` - Get folder list

For complete documentation, please check the project files or contact the development team.`;
        
        setMarkdownContent(fallbackContent);
        setTableOfContents(extractHeaders(fallbackContent));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkdownContent();
  }, []);

  const extractHeaders = (content: string): TableOfContentsItem[] => {
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    const headers: TableOfContentsItem[] = [];
    let match;

    while ((match = headerRegex.exec(content)) !== null) {
      const level = match[1]?.length || 1;
      const title = match[2]?.trim() || "";
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      headers.push({
        id,
        title,
        level
      });
    }

    return headers;
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Update URL hash without jumping
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const filteredContent = searchTerm 
    ? markdownContent
        .split('\n')
        .filter(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .join('\n')
    : markdownContent;

  const filteredToc = searchTerm
    ? tableOfContents.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tableOfContents;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Dark IDE Theme Styling */
        .api-docs-content {
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .api-docs-content pre {
          background: #252526 !important;
          border: 1px solid #3e3e42;
          border-radius: 8px;
          padding: 16px;
          color: #d4d4d4 !important;
          overflow-x: auto;
        }
        
        .api-docs-content code {
          background: #3c3c3c !important;
          color: #ce9178 !important;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
        }
        
        .api-docs-content pre code {
          background: transparent !important;
          color: #d4d4d4 !important;
          padding: 0;
        }
        
        .api-docs-content h1 {
          color: #569cd6;
          border-bottom: 2px solid #404040;
          padding-bottom: 8px;
        }
        
        .api-docs-content h2 {
          color: #4ec9b0;
          border-left: 4px solid #007acc;
          padding-left: 12px;
          margin: 24px 0 16px 0;
        }
        
        .api-docs-content h3 {
          color: #dcdcaa;
          margin: 20px 0 12px 0;
        }
        
        .api-docs-content h4 {
          color: #c586c0;
          margin: 16px 0 8px 0;
        }
        
        .api-docs-content strong {
          color: #f44747;
          font-weight: 600;
        }
        
        .api-docs-content ul li::marker {
          color: #569cd6;
        }
        
        .api-docs-content ul li {
          color: #d4d4d4;
          margin: 4px 0;
        }
        
        .api-docs-content p {
          line-height: 1.6;
          margin: 12px 0;
        }
        
        .api-docs-content blockquote {
          background: #2d2d30;
          border-left: 4px solid #007acc;
          padding: 12px 16px;
          margin: 16px 0;
          border-radius: 0 4px 4px 0;
        }
        
        .api-docs-content hr {
          border: 1px solid #404040;
          margin: 24px 0;
        }
        
        /* JSON syntax highlighting */
        .api-docs-content .token.string {
          color: #ce9178;
        }
        
        .api-docs-content .token.number {
          color: #b5cea8;
        }
        
        .api-docs-content .token.boolean {
          color: #569cd6;
        }
        
        .api-docs-content .token.null {
          color: #569cd6;
        }
        
        .api-docs-content .token.property {
          color: #9cdcfe;
        }
        
        .api-docs-content .token.punctuation {
          color: #d4d4d4;
        }
      `}</style>
    <div className="min-h-screen bg-[#1e1e1e] api-docs-content">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with VS Code style */}
        <div className="mb-8 bg-[#252526] border border-[#3e3e42] rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-[#007acc] rounded-lg flex items-center justify-center">
              <Book className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#569cd6] font-mono">🐍 API Documentation</h1>
              <p className="text-[#6a9955] font-mono text-sm mt-1"># Complete reference for the Data Lake Explorer API</p>
            </div>
          </div>

          {/* Search with terminal style */}
          <div className="relative max-w-md">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#569cd6]">
              <Search size={16} />
            </div>
            <Input
              type="text"
              placeholder=">>> search_docs(query='...')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1e1e1e] border-[#3e3e42] text-[#d4d4d4] font-mono text-sm focus:border-[#007acc] placeholder:text-[#6a9955]"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-[#2d2d30] border border-[#f44747] rounded-lg p-4">
            <div className="flex items-center space-x-2 text-[#f44747]">
              <FileText size={16} />
              <span className="font-mono font-medium">⚠️ DocumentationError</span>
            </div>
            <p className="text-[#d4d4d4] mt-2 font-mono text-sm"># {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table of Contents - Terminal Style */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-[#252526] border border-[#3e3e42] rounded-lg shadow-2xl">
              <div className="bg-[#2d2d30] border-b border-[#3e3e42] p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-[#f44747] rounded-full"></div>
                    <div className="w-3 h-3 bg-[#ff9800] rounded-full"></div>
                    <div className="w-3 h-3 bg-[#4caf50] rounded-full"></div>
                  </div>
                  <span className="text-[#d4d4d4] font-mono text-sm">api_explorer.py</span>
                </div>
              </div>
              <div className="p-4">
                <ScrollArea className="h-96">
                  <nav className="space-y-1 font-mono text-sm">
                    {filteredToc.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full text-left py-1 px-2 rounded hover:bg-[#2d2d30] transition-colors focus:outline-none focus:ring-1 focus:ring-[#007acc] ${
                          item.level === 1 ? 'text-[#4ec9b0] font-semibold' : 
                          item.level === 2 ? 'pl-4 text-[#dcdcaa]' :
                          item.level === 3 ? 'pl-6 text-[#9cdcfe] text-xs' : 'pl-8 text-[#d4d4d4] text-xs'
                        }`}
                        title={`Navigate to ${item.title}`}
                      >
                        <span className="text-[#569cd6]">{item.level === 1 ? 'class' : item.level === 2 ? 'def' : '  •'}</span>
                        <span className="ml-2">{item.title.replace(/^(GET|POST|PUT|DELETE)\s*/, '')}</span>
                        {item.title.match(/^(GET|POST|PUT|DELETE)/) && (
                          <span className="ml-1 text-[#ce9178] text-xs">({item.title.match(/^(GET|POST|PUT|DELETE)/)?.[1]})</span>
                        )}
                      </button>
                    ))}
                  </nav>
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Documentation Content */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg border-gray-200">
              <CardContent className="p-8"
                style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
              >
                <div className="prose prose-slate max-w-none">
                  <ErrorBoundary>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                      h1: ({ children, ...props }) => (
                        <h1 
                          {...props} 
                          id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                          className="text-3xl font-bold text-slate-900 mb-6 border-b-2 border-blue-600 pb-4 scroll-mt-8"
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children, ...props }) => (
                        <h2 
                          {...props}
                          id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                          className="text-2xl font-semibold text-slate-800 mt-8 mb-4 border-b border-slate-400 pb-2 scroll-mt-8"
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children, ...props }) => (
                        <h3 
                          {...props}
                          id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                          className="text-xl font-semibold text-slate-700 mt-6 mb-3 scroll-mt-8"
                        >
                          {children}
                        </h3>
                      ),
                      h4: ({ children, ...props }) => (
                        <h4 
                          {...props}
                          id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                          className="text-lg font-semibold text-slate-600 mt-4 mb-2 scroll-mt-8"
                        >
                          {children}
                        </h4>
                      ),
                      code: ({ children, className, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code className="bg-blue-100 px-2 py-1 rounded text-sm font-mono border border-blue-200" style={{ color: '#000000' }} {...props}>
                              {children}
                            </code>
                          );
                        }
                        return (
                          <code className="block text-sm font-mono whitespace-pre" style={{ color: '#000000', backgroundColor: 'transparent' }} {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children, ...props }) => (
                        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4 border border-gray-300" style={{ color: '#000000' }} {...props}>
                          {children}
                        </pre>
                      ),
                      table: ({ children, ...props }) => (
                        <div className="overflow-x-auto my-6 border border-slate-300 rounded-lg">
                          <table className="min-w-full divide-y divide-slate-300" {...props}>
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children, ...props }) => (
                        <th className="px-6 py-3 bg-slate-100 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider" {...props}>
                          {children}
                        </th>
                      ),
                      td: ({ children, ...props }) => (
                        <td className="px-6 py-4 text-sm text-slate-800 border-b border-slate-200" {...props}>
                          {children}
                        </td>
                      ),
                      blockquote: ({ children, ...props }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 py-3 my-6 bg-blue-50 text-slate-800 rounded-r font-medium" {...props}>
                          {children}
                        </blockquote>
                      ),
                      ul: ({ children, ...props }) => (
                        <ul className="list-disc list-inside space-y-2 my-4 ml-4" {...props}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children, ...props }) => (
                        <ol className="list-decimal list-inside space-y-2 my-4 ml-4" {...props}>
                          {children}
                        </ol>
                      ),
                      li: ({ children, ...props }) => (
                        <li className="text-slate-700 leading-relaxed text-base" {...props}>
                          {children}
                        </li>
                      ),
                      a: ({ children, href, ...props }) => (
                        <a 
                          className="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors" 
                          href={href}
                          onClick={(e) => {
                            // Handle internal links to sections
                            if (href && href.startsWith('#')) {
                              e.preventDefault();
                              const id = href.substring(1);
                              scrollToSection(id);
                            }
                          }}
                          {...props}
                        >
                          {children}
                        </a>
                      ),
                      hr: ({ ...props }) => (
                        <Separator className="my-8" {...props} />
                      ),
                      p: ({ children, ...props }) => (
                        <p className="text-slate-700 leading-relaxed my-4 text-base" {...props}>
                          {children}
                        </p>
                      ),
                      strong: ({ children, ...props }) => (
                        <strong className="font-semibold text-slate-900" {...props}>
                          {children}
                        </strong>
                      ),
                      em: ({ children, ...props }) => (
                        <em className="italic text-slate-700" {...props}>
                          {children}
                        </em>
                      )
                      }}
                    >
                      {filteredContent}
                    </ReactMarkdown>
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}