import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// Custom components for react-markdown to make links, emails, and phone numbers clickable
const markdownComponents: Partial<Components> = {
  a: ({ node, href, children, ...props }: any) => {
    // If it's already a link in markdown, use it as is
    if (href) {
      return (
        <a
          href={href}
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }
    return <a {...props}>{children}</a>;
  },
  p: ({ node, children, ...props }: any) => {
    // Process text to make emails and phone numbers clickable
    const processText = (text: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      
      // Combined regex to match emails and phone numbers
      const combinedRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)|(\+?\d{1,4}[\s-]?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4})/g;
      let match;
      
      while ((match = combinedRegex.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        
        // Check if it's an email or phone
        if (match[1]) {
          // Email
          parts.push(
            <a
              key={`email-${match.index}`}
              href={`mailto:${match[1]}`}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {match[1]}
            </a>
          );
        } else if (match[2]) {
          // Phone number
          const phoneNumber = match[2].replace(/\s/g, '');
          parts.push(
            <a
              key={`phone-${match.index}`}
              href={`tel:${phoneNumber}`}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {match[2]}
            </a>
          );
        }
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return parts.length > 0 ? parts : [text];
    };

    // Check if this paragraph contains a bold label followed by a value (contact info format)
    const childrenArray = React.Children.toArray(children);
    const hasBoldLabel = childrenArray.some((child: any) => {
      if (React.isValidElement(child) && child.type === 'strong') {
        return true;
      }
      if (typeof child === 'string') {
        // Check for pattern like **Label:** value
        return /^\*\*[^*]+\*\*:\s*/.test(child);
      }
      return false;
    });

    // If it's a contact info line (has bold label), format it as a div (not p)
    if (hasBoldLabel) {
      const processedChildren = React.Children.map(children, (child, index) => {
        if (typeof child === 'string') {
          return <React.Fragment key={index}>{processText(child)}</React.Fragment>;
        }
        return child;
      });

      // Return a div instead of p tag for contact info - simple block element
      return (
        <div className="text-foreground mb-2 block">
          {processedChildren}
        </div>
      );
    }

    // Process children recursively for regular paragraphs
    const processedChildren = React.Children.map(children, (child, index) => {
      if (typeof child === 'string') {
        return <React.Fragment key={index}>{processText(child)}</React.Fragment>;
      }
      return child;
    });

    return <p className="text-foreground mb-3" {...props}>{processedChildren}</p>;
  },
  h1: ({ node, children, ...props }: any) => (
    <h1 className="text-3xl font-bold mb-6 text-foreground" {...props}>{children}</h1>
  ),
  h2: ({ node, children, ...props }: any) => (
    <h2 className="text-xl font-semibold mb-3 mt-6 text-foreground" {...props}>{children}</h2>
  ),
  h3: ({ node, children, ...props }: any) => (
    <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground" {...props}>{children}</h3>
  ),
  ul: ({ node, children, ...props }: any) => (
    <ul className="list-disc list-inside mt-2 text-foreground space-y-1 ml-4" {...props}>{children}</ul>
  ),
  ol: ({ node, children, ...props }: any) => (
    <ol className="list-decimal list-inside mt-2 text-foreground space-y-1 ml-4" {...props}>{children}</ol>
  ),
  li: ({ node, children, ...props }: any) => (
    <li className="mb-1 text-foreground" {...props}>{children}</li>
  ),
  strong: ({ node, children, ...props }: any) => (
    <strong className="font-semibold text-foreground" {...props}>{children}</strong>
  ),
  hr: ({ node, ...props }: any) => (
    <hr className="my-8 border-border" {...props} />
  ),
  table: ({ node, children, ...props }: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-border" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ node, children, ...props }: any) => (
    <thead className="bg-muted" {...props}>{children}</thead>
  ),
  tbody: ({ node, children, ...props }: any) => (
    <tbody className="bg-card" {...props}>{children}</tbody>
  ),
  tr: ({ node, children, ...props }: any) => (
    <tr className="border-b border-border" {...props}>{children}</tr>
  ),
  th: ({ node, children, ...props }: any) => (
    <th className="border border-border px-4 py-2 text-left font-semibold text-foreground" {...props}>{children}</th>
  ),
  td: ({ node, children, ...props }: any) => (
    <td className="border border-border px-4 py-2 text-foreground" {...props}>{children}</td>
  ),
};

export default function CookiesPage() {
  // Read the markdown file
  const markdownPath = join(process.cwd(), 'docs', 'cookies.md');
  let markdownContent = '';
  
  try {
    markdownContent = readFileSync(markdownPath, 'utf-8');
  } catch (error) {
    console.error('Error reading cookies.md:', error);
    markdownContent = '# Cookie Policy\n\nError loading cookie policy.';
  }

  const MarkdownComponent = ReactMarkdown as any;

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-sm p-8 border border-border">
        <MarkdownComponent
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {markdownContent}
        </MarkdownComponent>
        
        <div className="mt-8 pt-6 border-t border-border">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            🎉 Let's plan your perfect date
          </Link>
        </div>
      </div>
    </div>
  );
}
