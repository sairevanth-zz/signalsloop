'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Network, TrendingUp, AlertCircle, Target } from 'lucide-react'
import { toast } from 'sonner'

interface CorrelationNode {
  id: string
  type: string
  description: string
}

interface CorrelationEdge {
  id: string
  source: string
  target: string
  correlation_type: string
  score: number
  confidence: 'low' | 'medium' | 'high'
}

interface CorrelationNetwork {
  nodes: CorrelationNode[]
  edges: CorrelationEdge[]
}

const TYPE_COLORS: Record<string, string> = {
  feedback: 'bg-blue-500',
  competitor: 'bg-red-500',
  roadmap: 'bg-green-500',
  theme: 'bg-purple-500',
  sentiment: 'bg-yellow-500'
}

const TYPE_ICONS: Record<string, any> = {
  feedback: AlertCircle,
  competitor: TrendingUp,
  roadmap: Target,
  theme: Network,
  sentiment: TrendingUp
}

export function SignalCorrelationView({ projectId }: { projectId: string }) {
  const [network, setNetwork] = useState<CorrelationNetwork>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [selectedNode, setSelectedNode] = useState<CorrelationNode | null>(null)

  useEffect(() => {
    fetchNetwork()
  }, [projectId])

  async function fetchNetwork() {
    try {
      const res = await fetch(`/api/correlations/network?projectId=${projectId}`)
      const data = await res.json()
      setNetwork(data.network || { nodes: [], edges: [] })
    } catch (error) {
      console.error('Failed to fetch correlation network:', error)
    } finally {
      setLoading(false)
    }
  }

  async function detectCorrelations() {
    setDetecting(true)
    try {
      const res = await fetch('/api/correlations/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })

      if (!res.ok) {
        throw new Error('Failed to detect correlations')
      }

      const data = await res.json()
      setNetwork(data.network || { nodes: [], edges: [] })
      toast.success('Correlations detected successfully')
    } catch (error) {
      toast.error('Failed to detect correlations')
    } finally {
      setDetecting(false)
    }
  }

  const nodesByType = network.nodes.reduce((acc, node) => {
    if (!acc[node.type]) acc[node.type] = []
    acc[node.type].push(node)
    return acc
  }, {} as Record<string, CorrelationNode[]>)

  const getNodeConnections = (nodeId: string) => {
    return network.edges.filter(e => e.source === nodeId || e.target === nodeId)
  }

  if (loading) {
    return (
      <Card className="col-span-2 border-slate-700 bg-slate-900">
        <CardContent className="py-12 text-center">
          <p className="text-slate-400">Loading correlations...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2 border-slate-700 bg-slate-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Network className="w-5 h-5 text-blue-400" />
              Signal Correlations
            </CardTitle>
            <CardDescription className="text-slate-400">
              Connections between feedback, competitors, and roadmap
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNetwork}
              disabled={detecting}
              className="border-slate-600 hover:bg-slate-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${detecting ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={detectCorrelations}
              disabled={detecting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {detecting ? 'Detecting...' : 'Detect Correlations'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {network.edges.length === 0 ? (
          <div className="text-center py-12">
            <Network className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-medium mb-2 text-white">No correlations detected yet</h3>
            <p className="text-slate-400 mb-4">
              Run correlation detection to discover relationships between signals
            </p>
            <Button onClick={detectCorrelations} disabled={detecting} className="bg-blue-600 hover:bg-blue-700">
              {detecting ? 'Detecting...' : 'Run Detection'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-2xl font-bold text-white">{network.nodes.length}</p>
                <p className="text-xs text-slate-400">Signals</p>
              </div>
              <div className="text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-2xl font-bold text-white">{network.edges.length}</p>
                <p className="text-xs text-slate-400">Correlations</p>
              </div>
              <div className="text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-2xl font-bold text-white">
                  {network.edges.filter(e => e.confidence === 'high').length}
                </p>
                <p className="text-xs text-slate-400">High Confidence</p>
              </div>
              <div className="text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-2xl font-bold text-white">
                  {(network.edges.reduce((sum, e) => sum + e.score, 0) / network.edges.length * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-slate-400">Avg. Strength</p>
              </div>
            </div>

            {/* Node Groups */}
            <div className="space-y-4">
              {Object.entries(nodesByType).map(([type, nodes]) => {
                const Icon = TYPE_ICONS[type] || Network
                const color = TYPE_COLORS[type] || 'bg-gray-500'

                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      <h4 className="font-medium capitalize text-white">{type}</h4>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">{nodes.length}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {nodes.map(node => {
                        const connections = getNodeConnections(node.id)
                        return (
                          <button
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            className={`p-3 border border-slate-700 rounded-lg text-left hover:bg-slate-800 transition-colors ${selectedNode?.id === node.id ? 'border-blue-500 bg-slate-800' : ''
                              }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium truncate text-white">{node.description}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {connections.length} connection{connections.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected Node Details */}
            {selectedNode && (
              <div className="border-t border-slate-700 pt-4">
                <h4 className="font-medium mb-3 text-white">Connections for: {selectedNode.description}</h4>
                <div className="space-y-2">
                  {getNodeConnections(selectedNode.id).map(edge => {
                    const isSource = edge.source === selectedNode.id
                    const connectedNodeId = isSource ? edge.target : edge.source
                    const connectedNode = network.nodes.find(n => n.id === connectedNodeId)

                    if (!connectedNode) return null

                    return (
                      <div
                        key={edge.id}
                        className="p-3 bg-slate-800 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300">
                              {isSource ? '→' : '←'}
                            </span>
                            <span className="text-sm font-medium text-white">{connectedNode.description}</span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                              {(edge.score * 100).toFixed(0)}% match
                            </Badge>
                            <Badge
                              variant={
                                edge.confidence === 'high'
                                  ? 'default'
                                  : edge.confidence === 'medium'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className="text-xs"
                            >
                              {edge.confidence}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 capitalize">
                          {edge.correlation_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
