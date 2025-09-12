import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Book, FileText, Search, ChevronRight, Terminal } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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
        
        const response = await fetch("/api/docs/markdown");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation: ${response.status}`);
        }
        
        const content = await response.text();
        setMarkdownContent(content);
        
        const headers = extractHeaders(content);
        setTableOfContents(headers);
        
      } catch (err) {
        console.error("Error fetching API documentation:", err);
        setError(err instanceof Error ? err.message : "Failed to load documentation");
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-2 text-green-400 font-mono">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Pure Black Python IDE Theme */
        .api-docs-python {
          background: #000000;
          color: #ffffff;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
          line-height: 1.6;
        }
        
        .api-docs-python pre {
          background: #0d1117 !important;
          border: 1px solid #21262d;
          border-radius: 6px;
          padding: 16px;
          color: #ffffff !important;
          overflow-x: auto;
          margin: 16px 0;
        }
        
        .api-docs-python code {
          background: #21262d !important;
          color: #79c0ff !important;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
          font-size: 14px;
        }
        
        .api-docs-python pre code {
          background: transparent !important;
          color: #ffffff !important;
          padding: 0;
        }
        
        .api-docs-python h1 {
          color: #f85149;
          border-bottom: 2px solid #21262d;
          padding-bottom: 8px;
          margin: 32px 0 16px 0;
          font-weight: bold;
        }
        
        .api-docs-python h2 {
          color: #7dd3fc;
          border-left: 4px solid #58a6ff;
          padding-left: 12px;
          margin: 24px 0 16px 0;
          font-weight: bold;
        }
        
        .api-docs-python h3 {
          color: #a5f3fc;
          margin: 20px 0 12px 0;
          font-weight: bold;
        }
        
        .api-docs-python h4 {
          color: #fbbf24;
          margin: 16px 0 8px 0;
          font-weight: bold;
        }
        
        .api-docs-python strong {
          color: #ff7b72;
          font-weight: bold;
        }
        
        .api-docs-python ul {
          list-style: none;
          padding-left: 0;
        }
        
        .api-docs-python ul li {
          color: #ffffff;
          margin: 6px 0;
          padding-left: 20px;
          position: relative;
        }
        
        .api-docs-python ul li::before {
          content: '•';
          color: #58a6ff;
          position: absolute;
          left: 0;
        }
        
        .api-docs-python p {
          line-height: 1.7;
          margin: 12px 0;
          color: #ffffff;
        }
        
        .api-docs-python blockquote {
          background: #0d1117;
          border-left: 4px solid #58a6ff;
          padding: 12px 16px;
          margin: 16px 0;
          border-radius: 0 4px 4px 0;
          color: #7dd3fc;
        }
        
        .api-docs-python hr {
          border: 1px solid #21262d;
          margin: 24px 0;
        }
        
        .api-docs-python table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
          border: 1px solid #21262d;
        }
        
        .api-docs-python th {
          background: #0d1117;
          border: 1px solid #21262d;
          padding: 12px;
          text-align: left;
          color: #7dd3fc;
          font-weight: bold;
        }
        
        .api-docs-python td {
          border: 1px solid #21262d;
          padding: 12px;
          color: #ffffff;
        }
        
        /* JSON syntax highlighting */
        .api-docs-python .hljs-string {
          color: #a5f3fc;
        }
        
        .api-docs-python .hljs-number {
          color: #79c0ff;
        }
        
        .api-docs-python .hljs-literal {
          color: #ff7b72;
        }
        
        .api-docs-python .hljs-attr {
          color: #fbbf24;
        }
        
        /* Python syntax highlighting */
        .python-keyword {
          color: #ff7b72;
        }
        
        .python-string {
          color: #a5f3fc;
        }
        
        .python-comment {
          color: #8b949e;
        }
        
        .python-function {
          color: #d2a8ff;
        }
        
        .python-class {
          color: #7dd3fc;
        }
      `}</style>
      
      <div className="min-h-screen bg-black api-docs-python">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Terminal Header */}
          <div className="mb-8 bg-[#0d1117] border border-[#21262d] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-[#ff5f56] rounded-full"></div>
                  <div className="w-3 h-3 bg-[#ffbd2e] rounded-full"></div>
                  <div className="w-3 h-3 bg-[#27ca3f] rounded-full"></div>
                </div>
                <span className="text-[#8b949e] font-mono text-sm">~/data_lake_explorer/api_docs.py</span>
              </div>
              <div className="flex items-center space-x-2">
                <Terminal size={16} className="text-[#58a6ff]" />
                <span className="text-[#58a6ff] font-mono text-sm">Python 3.11.0</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-[#58a6ff] rounded-lg flex items-center justify-center">
                <Book className="text-black" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#f85149] font-mono">
                  <span className="python-keyword">class</span> APIDocumentation:
                </h1>
                <p className="text-[#8b949e] font-mono text-sm mt-1">
                  <span className="python-comment"># Complete reference for the Data Lake Explorer API</span>
                </p>
              </div>
            </div>

            {/* Python-style search */}
            <div className="relative max-w-md">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#58a6ff]">
                <Search size={16} />
              </div>
              <Input
                type="text"
                placeholder="search_docs(query='endpoint_name')"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0d1117] border-[#21262d] text-white font-mono text-sm focus:border-[#58a6ff] placeholder:text-[#8b949e]"
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-[#0d1117] border border-[#f85149] rounded-lg p-4">
              <div className="flex items-center space-x-2 text-[#f85149]">
                <FileText size={16} />
                <span className="font-mono font-bold">
                  <span className="python-keyword">raise</span> DocumentationError<span className="text-white">(</span>
                </span>
              </div>
              <p className="text-[#a5f3fc] mt-2 font-mono text-sm ml-6">
                <span className="python-string">"{error}"</span>
                <span className="text-white">)</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Python-style Table of Contents */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 bg-[#0d1117] border border-[#21262d] rounded-lg">
                <div className="bg-[#161b22] border-b border-[#21262d] p-4">
                  <div className="text-[#7dd3fc] font-mono font-bold text-sm">
                    <span className="python-keyword">class</span> <span className="python-class">TableOfContents</span>:
                  </div>
                </div>
                <div className="p-4">
                  <ScrollArea className="h-96">
                    <nav className="space-y-1 font-mono text-sm">
                      {filteredToc.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => scrollToSection(item.id)}
                          className={`w-full text-left py-2 px-3 rounded hover:bg-[#161b22] transition-colors focus:outline-none focus:ring-1 focus:ring-[#58a6ff] ${
                            item.level === 1 ? 'text-[#f85149] font-bold' : 
                            item.level === 2 ? 'pl-6 text-[#7dd3fc]' :
                            item.level === 3 ? 'pl-9 text-[#a5f3fc] text-sm' : 'pl-12 text-white text-xs'
                          }`}
                          title={`Navigate to ${item.title}`}
                        >
                          <span className="python-keyword">
                            {item.level === 1 ? 'class' : 
                             item.level === 2 ? 'def' : 
                             item.level === 3 ? '    def' : '        #'}
                          </span>
                          <span className="ml-2">
                            {item.title.replace(/^(GET|POST|PUT|DELETE)\s*/, '')}
                            {item.level > 1 && item.level < 4 ? '()' : ''}
                          </span>
                          {item.title.match(/^(GET|POST|PUT|DELETE)/) && (
                            <span className="ml-2 text-[#79c0ff] text-xs">
                              # {item.title.match(/^(GET|POST|PUT|DELETE)/)?.[1]}
                            </span>
                          )}
                        </button>
                      ))}
                    </nav>
                  </ScrollArea>
                </div>
              </div>
            </div>

            {/* Python-style Documentation Content */}
            <div className="lg:col-span-3">
              <div className="bg-[#0d1117] border border-[#21262d] rounded-lg">
                <div className="bg-[#161b22] border-b border-[#21262d] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText size={16} className="text-[#7dd3fc]" />
                      <span className="text-white font-mono text-sm">api_documentation.py</span>
                    </div>
                    <div className="text-[#8b949e] font-mono text-xs">
                      <span className="python-comment">
                        # APIs: {tableOfContents.filter(item => 
                          item.title.includes('GET') || 
                          item.title.includes('POST') || 
                          item.title.includes('PUT') || 
                          item.title.includes('DELETE')
                        ).length}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <ErrorBoundary>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children, ...props }) => (
                          <h1 
                            {...props} 
                            id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                            className="scroll-mt-8"
                          >
                            <span className="python-keyword">class</span> {children}:
                          </h1>
                        ),
                        h2: ({ children, ...props }) => (
                          <h2 
                            {...props}
                            id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                            className="scroll-mt-8"
                          >
                            <span className="python-keyword">def</span> {children}():
                          </h2>
                        ),
                        h3: ({ children, ...props }) => (
                          <h3 
                            {...props}
                            id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                            className="scroll-mt-8"
                          >
                            <span className="python-comment"># </span>{children}
                          </h3>
                        ),
                        h4: ({ children, ...props }) => (
                          <h4 
                            {...props}
                            id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                            className="scroll-mt-8"
                          >
                            <span className="python-keyword">
                              {String(children).includes('GET') ? 'GET' :
                               String(children).includes('POST') ? 'POST' :
                               String(children).includes('PUT') ? 'PUT' :
                               String(children).includes('DELETE') ? 'DELETE' : '##'}
                            </span> {String(children).replace(/^(GET|POST|PUT|DELETE)\s*/, '')}
                          </h4>
                        ),
                        code: ({ inline, children, ...props }: any) => {
                          if (inline) {
                            return <code {...props}>{children}</code>;
                          }
                          return <code {...props}>{children}</code>;
                        },
                        pre: ({ children, ...props }: any) => (
                          <pre {...props}>{children}</pre>
                        ),
                        ul: ({ children, ...props }) => (
                          <ul {...props}>{children}</ul>
                        ),
                        li: ({ children, ...props }) => (
                          <li {...props}>{children}</li>
                        ),
                        p: ({ children, ...props }) => (
                          <p {...props}>{children}</p>
                        ),
                        strong: ({ children, ...props }) => (
                          <strong {...props}>{children}</strong>
                        ),
                        blockquote: ({ children, ...props }) => (
                          <blockquote {...props}>
                            <span className="python-comment"># </span>{children}
                          </blockquote>
                        ),
                        table: ({ children, ...props }) => (
                          <div className="overflow-x-auto my-4">
                            <table {...props}>{children}</table>
                          </div>
                        ),
                        th: ({ children, ...props }) => (
                          <th {...props}>{children}</th>
                        ),
                        td: ({ children, ...props }) => (
                          <td {...props}>{children}</td>
                        ),
                        hr: ({ ...props }) => (
                          <hr {...props} />
                        ),
                      }}
                    >
                      {filteredContent}
                    </ReactMarkdown>
                  </ErrorBoundary>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}