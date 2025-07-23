import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Book, FileText, Search, ChevronRight } from "lucide-react";
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
      const level = match[1].length;
      const title = match[2].trim();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Book className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📘 API Documentation</h1>
            <p className="text-gray-600">Complete reference for the Data Lake Explorer API</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            type="text"
            placeholder="Search documentation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

        {error && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-yellow-800">
                <FileText size={16} />
                <span className="font-medium">Documentation Note</span>
              </div>
              <p className="text-yellow-700 mt-2">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-900">
                  Table of Contents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <nav className="space-y-2">
                    {filteredToc.map((item, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full justify-start text-left h-auto py-2 px-3 ${
                          item.level === 1 ? 'font-medium' : 
                          item.level === 2 ? 'pl-6 text-sm' :
                          item.level === 3 ? 'pl-9 text-xs' : 'pl-12 text-xs'
                        }`}
                      >
                        <ChevronRight size={12} className="mr-2 flex-shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Button>
                    ))}
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Documentation Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children, ...props }) => (
                        <h1 
                          {...props} 
                          id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                          className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4"
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children, ...props }) => (
                        <h2 
                          {...props}
                          id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                          className="text-2xl font-semibold text-gray-800 mt-8 mb-4"
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children, ...props }) => (
                        <h3 
                          {...props}
                          id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                          className="text-xl font-medium text-gray-700 mt-6 mb-3"
                        >
                          {children}
                        </h3>
                      ),
                      h4: ({ children, ...props }) => (
                        <h4 
                          {...props}
                          id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                          className="text-lg font-medium text-gray-600 mt-4 mb-2"
                        >
                          {children}
                        </h4>
                      ),
                      code: ({ children, className, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                              {children}
                            </code>
                          );
                        }
                        return (
                          <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => <>{children}</>,
                      table: ({ children, ...props }) => (
                        <div className="overflow-x-auto my-6">
                          <table className="min-w-full divide-y divide-gray-200" {...props}>
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children, ...props }) => (
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props}>
                          {children}
                        </th>
                      ),
                      td: ({ children, ...props }) => (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200" {...props}>
                          {children}
                        </td>
                      ),
                      blockquote: ({ children, ...props }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-6 bg-blue-50 text-blue-900" {...props}>
                          {children}
                        </blockquote>
                      ),
                      ul: ({ children, ...props }) => (
                        <ul className="list-disc list-inside space-y-2 my-4" {...props}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children, ...props }) => (
                        <ol className="list-decimal list-inside space-y-2 my-4" {...props}>
                          {children}
                        </ol>
                      ),
                      li: ({ children, ...props }) => (
                        <li className="text-gray-700" {...props}>
                          {children}
                        </li>
                      ),
                      a: ({ children, ...props }) => (
                        <a className="text-blue-600 hover:text-blue-800 underline" {...props}>
                          {children}
                        </a>
                      ),
                      hr: ({ ...props }) => (
                        <Separator className="my-8" {...props} />
                      )
                    }}
                  >
                    {filteredContent}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}