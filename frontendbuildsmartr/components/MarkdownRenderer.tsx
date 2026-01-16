"use client"

import React from 'react'

interface MarkdownRendererProps {
    content: string
    className?: string
}

/**
 * Simple markdown renderer for chat messages
 * Handles: bold, italic, lists, headers, links, and code blocks
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const renderMarkdown = (text: string): React.ReactNode[] => {
        const elements: React.ReactNode[] = []
        const lines = text.split('\n')
        let inCodeBlock = false
        let codeBlockContent: string[] = []
        let codeBlockLang = ''

        lines.forEach((line, lineIndex) => {
            // Handle code blocks
            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    // End code block
                    elements.push(
                        <pre key={`code-${lineIndex}`} className="bg-[#1a1b1e] rounded-lg p-3 my-2 overflow-x-auto">
                            <code className="text-xs text-green-400 font-mono">
                                {codeBlockContent.join('\n')}
                            </code>
                        </pre>
                    )
                    codeBlockContent = []
                    inCodeBlock = false
                } else {
                    // Start code block
                    inCodeBlock = true
                    codeBlockLang = line.slice(3)
                }
                return
            }

            if (inCodeBlock) {
                codeBlockContent.push(line)
                return
            }

            // Handle headers
            if (line.startsWith('### ')) {
                elements.push(
                    <h3 key={lineIndex} className="text-base font-semibold text-foreground mt-3 mb-1">
                        {parseInlineFormatting(line.slice(4))}
                    </h3>
                )
                return
            }
            if (line.startsWith('## ')) {
                elements.push(
                    <h2 key={lineIndex} className="text-lg font-semibold text-foreground mt-3 mb-1">
                        {parseInlineFormatting(line.slice(3))}
                    </h2>
                )
                return
            }
            if (line.startsWith('# ')) {
                elements.push(
                    <h1 key={lineIndex} className="text-xl font-bold text-foreground mt-3 mb-2">
                        {parseInlineFormatting(line.slice(2))}
                    </h1>
                )
                return
            }

            // Handle bullet lists
            if (line.match(/^[\*\-]\s+/)) {
                const content = line.replace(/^[\*\-]\s+/, '')
                elements.push(
                    <div key={lineIndex} className="flex gap-2 ml-2 my-0.5">
                        <span className="text-accent mt-1">•</span>
                        <span>{parseInlineFormatting(content)}</span>
                    </div>
                )
                return
            }

            // Handle numbered lists
            if (line.match(/^\d+\.\s+/)) {
                const match = line.match(/^(\d+)\.\s+(.*)/)
                if (match) {
                    elements.push(
                        <div key={lineIndex} className="flex gap-2 ml-2 my-0.5">
                            <span className="text-accent font-medium min-w-[1.5rem]">{match[1]}.</span>
                            <span>{parseInlineFormatting(match[2])}</span>
                        </div>
                    )
                }
                return
            }

            // Handle horizontal rule
            if (line.match(/^---+$/)) {
                elements.push(<hr key={lineIndex} className="my-3 border-border/50" />)
                return
            }

            // Handle empty lines
            if (line.trim() === '') {
                elements.push(<div key={lineIndex} className="h-2" />)
                return
            }

            // Regular paragraph
            elements.push(
                <p key={lineIndex} className="my-1">
                    {parseInlineFormatting(line)}
                </p>
            )
        })

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
                    <em key={keyIndex++} className="italic">
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
                    <code key={keyIndex++} className="bg-[#1a1b1e] px-1.5 py-0.5 rounded text-xs font-mono text-accent">
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
                        className="text-accent hover:underline"
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
        <div className={`text-sm leading-relaxed ${className}`}>
            {renderMarkdown(content)}
        </div>
    )
}
