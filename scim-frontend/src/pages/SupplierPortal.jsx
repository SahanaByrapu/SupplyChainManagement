import { useState, useEffect } from 'react';
import { supplierApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  Users, Plus, RefreshCw, AlertTriangle, Search, Edit2, Trash2, 
  Shield, CheckCircle, Star, TrendingUp
} from 'lucide-react';

const SupplierPortal = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    country: '',
    risk_score: 0,
    sla_compliance: 100,
    on_time_delivery: 100,
    quality_rating: 5
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      country: '',
      risk_score: 0,
      sla_compliance: 100,
      on_time_delivery: 100,
      quality_rating: 5
    });
    setEditingSupplier(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await supplierApi.update(editingSupplier.id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await supplierApi.create(formData);
        toast.success('Supplier added successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_email: supplier.contact_email,
      contact_phone: supplier.contact_phone,
      address: supplier.address,
      country: supplier.country,
      risk_score: supplier.risk_score,
      sla_compliance: supplier.sla_compliance,
      on_time_delivery: supplier.on_time_delivery,
      quality_rating: supplier.quality_rating
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await supplierApi.delete(id);
      toast.success('Supplier deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskLevel = (score) => {
    if (score >= 70) return { label: 'High Risk', class: 'error', color: 'text-red-400' };
    if (score >= 40) return { label: 'Medium Risk', class: 'warning', color: 'text-amber-400' };
    return { label: 'Low Risk', class: 'success', color: 'text-emerald-400' };
  };

  const avgSLA = suppliers.length > 0 
    ? (suppliers.reduce((sum, s) => sum + s.sla_compliance, 0) / suppliers.length).toFixed(1) 
    : 0;
  const avgDelivery = suppliers.length > 0 
    ? (suppliers.reduce((sum, s) => sum + s.on_time_delivery, 0) / suppliers.length).toFixed(1) 
    : 0;
  const highRiskCount = suppliers.filter(s => s.risk_score >= 70).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="supplier-portal">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Supplier Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor supplier risk, SLA compliance, and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData} data-testid="refresh-suppliers-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="add-supplier-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="supplier-name-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      required
                      data-testid="supplier-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      required
                      data-testid="supplier-phone-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                      data-testid="supplier-address-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                      data-testid="supplier-country-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Risk Score (0-100)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.risk_score}
                      onChange={(e) => setFormData({ ...formData, risk_score: parseFloat(e.target.value) || 0 })}
                      data-testid="supplier-risk-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SLA Compliance (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.sla_compliance}
                      onChange={(e) => setFormData({ ...formData, sla_compliance: parseFloat(e.target.value) || 0 })}
                      data-testid="supplier-sla-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>On-Time Delivery (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.on_time_delivery}
                      onChange={(e) => setFormData({ ...formData, on_time_delivery: parseFloat(e.target.value) || 0 })}
                      data-testid="supplier-delivery-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quality Rating (1-5)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={formData.quality_rating}
                      onChange={(e) => setFormData({ ...formData, quality_rating: parseFloat(e.target.value) || 5 })}
                      data-testid="supplier-quality-input"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="supplier-submit-btn">
                    {editingSupplier ? 'Update' : 'Add Supplier'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card" data-testid="kpi-total-suppliers">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Total Suppliers</p>
                <p className="kpi-value mt-1">{suppliers.length}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-avg-sla">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Avg SLA Compliance</p>
                <p className="kpi-value mt-1">{avgSLA}%</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-avg-delivery">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">On-Time Delivery</p>
                <p className="kpi-value mt-1">{avgDelivery}%</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card bg-red-500/10 border-red-500/30" data-testid="kpi-high-risk">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">High Risk Suppliers</p>
                <p className="kpi-value mt-1 text-red-400">{highRiskCount}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-red-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card data-testid="suppliers-table-card">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Supplier Performance
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="supplier-search-input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>SLA Compliance</TableHead>
                  <TableHead>On-Time Delivery</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((supplier) => {
                    const risk = getRiskLevel(supplier.risk_score);
                    return (
                      <TableRow key={supplier.id} data-testid={`supplier-row-${supplier.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{supplier.name}</p>
                            <p className="text-xs text-muted-foreground">{supplier.contact_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{supplier.country}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm ${risk.color}`}>
                              {supplier.risk_score}
                            </span>
                            <span className={`status-badge ${risk.class}`}>
                              {risk.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono">{supplier.sla_compliance}%</span>
                            </div>
                            <Progress 
                              value={supplier.sla_compliance} 
                              className="h-1.5"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono">{supplier.on_time_delivery}%</span>
                            </div>
                            <Progress 
                              value={supplier.on_time_delivery} 
                              className="h-1.5"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="font-mono text-sm">{supplier.quality_rating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleEdit(supplier)}
                              data-testid={`edit-supplier-${supplier.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(supplier.id)}
                              data-testid={`delete-supplier-${supplier.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No suppliers match your search' : 'No suppliers found. Add some to get started.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierPortal;
