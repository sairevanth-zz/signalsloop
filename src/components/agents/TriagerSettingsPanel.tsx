'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, UserPlus, Trash2, Save, X, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface PMAssignment {
  id?: string
  pm_name: string
  pm_email: string
  product_areas: string[]
  priority_threshold: number
  customer_segments: string[]
  auto_assign_enabled: boolean
  auto_merge_enabled: boolean
  auto_merge_confidence_threshold: number
  notify_on_assignment: boolean
  notify_on_merge: boolean
  daily_digest_enabled: boolean
}

export function TriagerSettingsPanel({ projectId }: { projectId: string }) {
  const [pmAssignments, setPmAssignments] = useState<PMAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPM, setShowAddPM] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState<PMAssignment>({
    pm_name: '',
    pm_email: '',
    product_areas: [],
    priority_threshold: 2,
    customer_segments: [],
    auto_assign_enabled: true,
    auto_merge_enabled: false,
    auto_merge_confidence_threshold: 0.85,
    notify_on_assignment: true,
    notify_on_merge: true,
    daily_digest_enabled: true
  })

  const [newProductArea, setNewProductArea] = useState('')

  useEffect(() => {
    fetchPMAssignments()
  }, [projectId])

  async function fetchPMAssignments() {
    try {
      const res = await fetch(`/api/agents/triager/configure?projectId=${projectId}`)
      const data = await res.json()
      setPmAssignments(data.pmAssignments || [])
    } catch (error) {
      toast.error('Failed to load PM assignments')
    } finally {
      setLoading(false)
    }
  }

  async function savePMAssignment() {
    if (!formData.pm_name || !formData.pm_email) {
      toast.error('PM name and email are required')
      return
    }

    try {
      const res = await fetch('/api/agents/triager/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          id: editingId,
          ...formData
        })
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      toast.success(editingId ? 'PM assignment updated' : 'PM assignment created')
      await fetchPMAssignments()
      resetForm()
    } catch (error) {
      toast.error('Failed to save PM assignment')
    }
  }

  async function deletePMAssignment(id: string) {
    if (!confirm('Are you sure you want to delete this PM assignment?')) {
      return
    }

    try {
      const res = await fetch(`/api/agents/triager/configure?id=${id}&projectId=${projectId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      toast.success('PM assignment deleted')
      await fetchPMAssignments()
    } catch (error) {
      toast.error('Failed to delete PM assignment')
    }
  }

  function editPMAssignment(pm: any) {
    setFormData({
      pm_name: pm.pm_name,
      pm_email: pm.pm_email,
      product_areas: pm.product_areas || [],
      priority_threshold: pm.priority_threshold || 2,
      customer_segments: pm.customer_segments || [],
      auto_assign_enabled: pm.auto_assign_enabled ?? true,
      auto_merge_enabled: pm.auto_merge_enabled ?? false,
      auto_merge_confidence_threshold: pm.auto_merge_confidence_threshold || 0.85,
      notify_on_assignment: pm.notify_on_assignment ?? true,
      notify_on_merge: pm.notify_on_merge ?? true,
      daily_digest_enabled: pm.daily_digest_enabled ?? true
    })
    setEditingId(pm.id)
    setShowAddPM(true)
  }

  function resetForm() {
    setFormData({
      pm_name: '',
      pm_email: '',
      product_areas: [],
      priority_threshold: 2,
      customer_segments: [],
      auto_assign_enabled: true,
      auto_merge_enabled: false,
      auto_merge_confidence_threshold: 0.85,
      notify_on_assignment: true,
      notify_on_merge: true,
      daily_digest_enabled: true
    })
    setEditingId(null)
    setShowAddPM(false)
    setNewProductArea('')
  }

  function addProductArea() {
    if (newProductArea && !formData.product_areas.includes(newProductArea)) {
      setFormData({
        ...formData,
        product_areas: [...formData.product_areas, newProductArea]
      })
      setNewProductArea('')
    }
  }

  function removeProductArea(area: string) {
    setFormData({
      ...formData,
      product_areas: formData.product_areas.filter(a => a !== area)
    })
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Triager Agent Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure automatic feedback triage, PM assignment, and duplicate merging
          </p>
        </div>
        {!showAddPM && (
          <Button onClick={() => setShowAddPM(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add PM Rule
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddPM && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit PM Assignment Rule' : 'Add PM Assignment Rule'}
            </CardTitle>
            <CardDescription>
              Define rules for automatically assigning feedback to product managers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pm_name">PM Name *</Label>
                <Input
                  id="pm_name"
                  value={formData.pm_name}
                  onChange={(e) => setFormData({ ...formData, pm_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="pm_email">PM Email *</Label>
                <Input
                  id="pm_email"
                  value={formData.pm_email}
                  onChange={(e) => setFormData({ ...formData, pm_email: e.target.value })}
                  placeholder="john@company.com"
                  type="email"
                />
              </div>
            </div>

            {/* Product Areas */}
            <div>
              <Label>Product Areas / Themes</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Assign feedback matching these themes/categories
              </p>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newProductArea}
                  onChange={(e) => setNewProductArea(e.target.value)}
                  placeholder="e.g., Mobile, API, Billing"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addProductArea()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addProductArea}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.product_areas.map((area) => (
                  <Badge key={area} variant="secondary" className="pl-3 pr-1">
                    {area}
                    <button
                      onClick={() => removeProductArea(area)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {formData.product_areas.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No filters (all product areas)
                  </span>
                )}
              </div>
            </div>

            {/* Priority Threshold */}
            <div>
              <Label htmlFor="priority_threshold">Priority Threshold</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Only assign feedback with priority at or above this level
              </p>
              <select
                id="priority_threshold"
                value={formData.priority_threshold}
                onChange={(e) => setFormData({ ...formData, priority_threshold: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-md"
              >
                <option value={1}>P1 (High) and above</option>
                <option value={2}>P2 (Medium) and above</option>
                <option value={3}>P3 (Low) and above (all)</option>
              </select>
            </div>

            {/* Auto-assign Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <Label>Auto-assign Enabled</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign matching feedback to this PM
                </p>
              </div>
              <Switch
                checked={formData.auto_assign_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, auto_assign_enabled: checked })
                }
              />
            </div>

            {/* Auto-merge Settings */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-merge Duplicates</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically merge highly similar feedback
                  </p>
                </div>
                <Switch
                  checked={formData.auto_merge_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_merge_enabled: checked })
                  }
                />
              </div>

              {formData.auto_merge_enabled && (
                <div>
                  <Label htmlFor="merge_threshold">
                    Confidence Threshold: {(formData.auto_merge_confidence_threshold * 100).toFixed(0)}%
                  </Label>
                  <input
                    id="merge_threshold"
                    type="range"
                    min="70"
                    max="95"
                    step="5"
                    value={formData.auto_merge_confidence_threshold * 100}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        auto_merge_confidence_threshold: parseInt(e.target.value) / 100
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only merge feedback with similarity above this threshold
                  </p>
                </div>
              )}
            </div>

            {/* Notification Settings */}
            <div className="space-y-2">
              <Label>Notifications</Label>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Notify on new assignment</span>
                <Switch
                  checked={formData.notify_on_assignment}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notify_on_assignment: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Notify on merge</span>
                <Switch
                  checked={formData.notify_on_merge}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notify_on_merge: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Daily digest email</span>
                <Switch
                  checked={formData.daily_digest_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, daily_digest_enabled: checked })
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={savePMAssignment} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update' : 'Create'} Rule
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PM Assignment Rules List */}
      {pmAssignments.length === 0 && !showAddPM ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No PM assignment rules yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first rule to enable automatic feedback triaging
            </p>
            <Button onClick={() => setShowAddPM(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pmAssignments.map((pm) => (
            <Card key={pm.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {pm.pm_name}
                      {pm.auto_assign_enabled && (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{pm.pm_email}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editPMAssignment(pm)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePMAssignment(pm.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Product Areas</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {pm.product_areas && pm.product_areas.length > 0 ? (
                      pm.product_areas.map((area) => (
                        <Badge key={area} variant="secondary">
                          {area}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">All areas</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <p className="font-medium">
                      P{pm.priority_threshold} and higher
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Auto-merge</Label>
                    <p className="font-medium">
                      {pm.auto_merge_enabled ? (
                        <span className="text-green-600">
                          ≥{(pm.auto_merge_confidence_threshold * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Notifications</Label>
                    <p className="font-medium">
                      {pm.notify_on_assignment || pm.notify_on_merge || pm.daily_digest_enabled
                        ? 'Enabled'
                        : 'Disabled'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
