'use client'

import { useMemo, useState } from 'react'
import { Product } from '@/lib/types'

interface TreeNode {
  label: string
  path: string        // full path, e.g. "Dental Supplies > Burs > Diamond Burs"
  count: number
  children: TreeNode[]
}

export function deriveProductBreadcrumb(p: Product): string {
  return p.breadcrumb?.trim() || p.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function buildTree(products: Product[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  products.forEach(p => {
    const parts = deriveProductBreadcrumb(p).split('>').map(s => s.trim()).filter(Boolean)
    if (!parts.length) return

    parts.forEach((part, depth) => {
      const path = parts.slice(0, depth + 1).join(' > ')

      if (!nodeMap.has(path)) {
        const node: TreeNode = { label: part, path, count: 0, children: [] }
        nodeMap.set(path, node)
        if (depth === 0) {
          roots.push(node)
        } else {
          const parentPath = parts.slice(0, depth).join(' > ')
          nodeMap.get(parentPath)?.children.push(node)
        }
      }

      nodeMap.get(path)!.count++
    })
  })

  return roots.sort((a, b) => a.label.localeCompare(b.label))
}

interface TreeNodeProps {
  node: TreeNode
  selected: string
  onSelect: (path: string) => void
  depth: number
}

function TreeItem({ node, selected, onSelect, depth }: TreeNodeProps) {
  const isSelected = selected === node.path || selected.startsWith(node.path + ' > ')
  const hasChildren = node.children.length > 0
  const [open, setOpen] = useState(isSelected || depth === 0)

  // Clicking the row selects and always expands; the arrow alone toggles collapse
  const handleRowClick = () => {
    onSelect(node.path)
    if (hasChildren) setOpen(true)
  }

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(o => !o)
  }

  return (
    <div>
      <button
        onClick={handleRowClick}
        className={`w-full flex items-center justify-between gap-1 py-1.5 px-2 rounded-lg text-left transition-colors ${
          selected === node.path
            ? 'bg-primary text-white'
            : isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-surface text-slate'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="font-body text-sm flex-1 leading-snug">{node.label}</span>
        <span className={`font-body text-xs flex-shrink-0 ${selected === node.path ? 'text-white/70' : 'text-slate-muted'}`}>
          {node.count}
        </span>
        {hasChildren && (
          <span
            role="button"
            onClick={handleChevronClick}
            className={`w-4 h-4 flex-shrink-0 flex items-center justify-center rounded hover:bg-black/10 transition-colors ${selected === node.path ? 'text-white/70' : 'text-slate-muted'}`}
          >
            <svg
              className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </button>
      {hasChildren && open && (
        <div>
          {node.children.sort((a, b) => a.label.localeCompare(b.label)).map(child => (
            <TreeItem key={child.path} node={child} selected={selected} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  products: Product[]
  selected: string
  onSelect: (path: string) => void
}

export default function CategoryTree({ products, selected, onSelect }: Props) {
  const tree = useMemo(() => buildTree(products), [products])

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onSelect('')}
        className={`w-full flex items-center justify-between gap-1 py-1.5 px-2 rounded-lg text-left transition-colors ${
          selected === '' ? 'bg-primary text-white' : 'hover:bg-surface text-slate'
        }`}
      >
        <span className="font-body text-sm">All Categories</span>
        <span className={`font-body text-xs ${selected === '' ? 'text-white/70' : 'text-slate-muted'}`}>
          {products.length}
        </span>
      </button>
      {tree.map(node => (
        <TreeItem key={node.path} node={node} selected={selected} onSelect={onSelect} depth={0} />
      ))}
    </div>
  )
}
