"use client"

import React from 'react'

interface MarkdownRendererProps {
    content: string
    className?: string
}

/**
 * Professional markdown renderer for chat messages
 * Handles: bold, italic, lists, headers, links, and code blocks
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const renderMarkdown = (text: string): React.ReactNode[] => {
        const elements: React.ReactNode[] = []
        const lines = text.split('\n')
        let inCodeBlock = false
        let codeBlockContent: string[] = []
        let codeBlockLang = ''
        let listStack: { type: 'ul' | 'ol', items: React.ReactNode[] }[] = []

        const flushList = () => {
            if (listStack.length > 0) {
                const list = listStack.pop()!
                const ListTag = list.type === 'ul' ? 'ul' : 'ol'
                elements.push(
                    <ListTag key={`list-${elements.length}`} className={`my-4 space-y-2 ${list.type === 'ul' ? 'list-none' : 'list-decimal list-inside'}`}>
                        {list.items}
                    </ListTag>
                )
            }
        }

        lines.forEach((line, lineIndex) => {
            // Handle code blocks
            if (line.startsWith('```')) {
                flushList()
                if (inCodeBlock) {
                    elements.push(
                        <div key={`code-${lineIndex}`} className="my-4 rounded-xl overflow-hidden border border-border/40">
                            {codeBlockLang && (
                                <div className="px-4 py-2 bg-surface/80 border-b border-border/40 text-xs text-muted-foreground font-medium">
                                    {codeBlockLang}
                                </div>
                            )}
                            <pre className="bg-[#0d1117] p-4 overflow-x-auto">
                                <code className="text-[13px] text-foreground/90 font-mono leading-relaxed">
                                    {codeBlockContent.join('\n')}
                                </code>
                            </pre>
                        </div>
                    )
                    codeBlockContent = []
                    codeBlockLang = ''
                    inCodeBlock = false
                } else {
                    inCodeBlock = true
                    codeBlockLang = line.slice(3).trim()
                }
                return
            }

            if (inCodeBlock) {
                codeBlockContent.push(line)
                return
            }

            // Handle headers
            if (line.startsWith('### ')) {
                flushList()
                elements.push(
                    <h3 key={lineIndex} className="text-base font-semibold text-foreground mt-6 mb-3 tracking-tight">
                        {parseInlineFormatting(line.slice(4))}
                    </h3>
                )
                return
            }
            if (line.startsWith('## ')) {
                flushList()
                elements.push(
                    <h2 key={lineIndex} className="text-lg font-semibold text-foreground mt-6 mb-3 tracking-tight">
                        {parseInlineFormatting(line.slice(3))}
                    </h2>
                )
                return
            }
            if (line.startsWith('# ')) {
                flushList()
                elements.push(
                    <h1 key={lineIndex} className="text-xl font-bold text-foreground mt-6 mb-4 tracking-tight">
                        {parseInlineFormatting(line.slice(2))}
                    </h1>
                )
                return
            }

            // Handle bullet lists
            if (line.match(/^[\*\-]\s+/)) {
                const content = line.replace(/^[\*\-]\s+/, '')
                if (listStack.length === 0 || listStack[listStack.length - 1].type !== 'ul') {
                    flushList()
                    listStack.push({ type: 'ul', items: [] })
                }
                listStack[listStack.length - 1].items.push(
                    <li key={`li-${lineIndex}`} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
                        <span className="text-accent mt-1.5 text-xs">●</span>
                        <span className="flex-1">{parseInlineFormatting(content)}</span>
                    </li>
                )
                return
            }

            // Handle numbered lists
            if (line.match(/^\d+\.\s+/)) {
                const match = line.match(/^(\d+)\.\s+(.*)/)
                if (match) {
                    if (listStack.length === 0 || listStack[listStack.length - 1].type !== 'ol') {
                        flushList()
                        listStack.push({ type: 'ol', items: [] })
                    }
                    listStack[listStack.length - 1].items.push(
                        <li key={`li-${lineIndex}`} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
                            <span className="text-accent font-semibold min-w-[1.5rem]">{match[1]}.</span>
                            <span className="flex-1">{parseInlineFormatting(match[2])}</span>
                        </li>
                    )
                }
                return
            }

            // Not a list item, flush any pending list
            flushList()

            // Handle horizontal rule
            if (line.match(/^---+$/)) {
                elements.push(<hr key={lineIndex} className="my-6 border-border/30" />)
                return
            }

            // Handle blockquote
            if (line.startsWith('> ')) {
                elements.push(
                    <blockquote key={lineIndex} className="my-4 pl-4 py-2 border-l-2 border-accent/50 bg-accent/5 rounded-r-lg text-[15px] text-foreground/80 italic">
                        {parseInlineFormatting(line.slice(2))}
                    </blockquote>
                )
                return
            }

            // Handle empty lines
            if (line.trim() === '') {
                elements.push(<div key={lineIndex} className="h-3" />)
                return
            }

            // Regular paragraph
            elements.push(
                <p key={lineIndex} className="my-3 text-[15px] leading-[1.75] text-foreground/90">
                    {parseInlineFormatting(line)}
                </p>
            )
        })

        // Flush any remaining list
        flushList()

        return elements
    }

    const parseInlineFormatting = (text: string): React.ReactNode => {
        const parts: React.ReactNode[] = []
        let remaining = text
        let keyIndex = 0

        while (remaining.length > 0) {
            // Bold with ** or __
            const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/) || remaining.match(/^(.*?)__(.+?)__(.*)$/)
            if (boldMatch) {
                if (boldMatch[1]) {
                    parts.push(<span key={keyIndex++}>{parseInlineFormatting(boldMatch[1])}</span>)
                }
                parts.push(
                    <strong key={keyIndex++} className="font-semibold text-foreground">
                        {boldMatch[2]}
                    </strong>
                )
                remaining = boldMatch[3]
                continue
            }

            // Italic with * or _
            const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/) || remaining.match(/^(.*?)_(.+?)_(.*)$/)
            if (italicMatch && !remaining.match(/^\d/)) {
                if (italicMatch[1]) {
                    parts.push(<span key={keyIndex++}>{parseInlineFormatting(italicMatch[1])}</span>)
                }
                parts.push(
                    <em key={keyIndex++} className="italic text-foreground/80">
                        {italicMatch[2]}
                    </em>
                )
                remaining = italicMatch[3]
                continue
            }

            // Inline code with `
            const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/)
            if (codeMatch) {
                if (codeMatch[1]) {
                    parts.push(<span key={keyIndex++}>{codeMatch[1]}</span>)
                }
                parts.push(
                    <code key={keyIndex++} className="bg-accent/10 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-accent">
                        {codeMatch[2]}
                    </code>
                )
                remaining = codeMatch[3]
                continue
            }

            // Link with [text](url)
            const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)$/)
            if (linkMatch) {
                if (linkMatch[1]) {
                    parts.push(<span key={keyIndex++}>{linkMatch[1]}</span>)
                }
                parts.push(
                    <a
                        key={keyIndex++}
                        href={linkMatch[3]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent-strong transition-colors underline underline-offset-2 decoration-accent/30 hover:decoration-accent"
                    >
                        {linkMatch[2]}
                    </a>
                )
                remaining = linkMatch[4]
                continue
            }

            // No more formatting found
            parts.push(<span key={keyIndex++}>{remaining}</span>)
            break
        }

        return parts.length === 1 ? parts[0] : <>{parts}</>
    }

    return (
        <div className={`leading-relaxed ${className}`}>
            {renderMarkdown(content)}
        </div>
    )
}
