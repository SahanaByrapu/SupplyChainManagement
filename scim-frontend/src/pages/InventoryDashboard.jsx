import { useState, useEffect } from 'react';
import { inventoryApi, dashboardApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Package, Plus, RefreshCw, AlertTriangle, Search, Edit2, Trash2, 
  Warehouse as WarehouseIcon, DollarSign 
} from 'lucide-react';

const InventoryDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    quantity: 0,
    min_stock: 10,
    max_stock: 1000,
    unit_price: 0,
    warehouse: '',
    location: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, whRes, alertsRes] = await Promise.all([
        inventoryApi.getAll(),
        dashboardApi.getWarehouseStats(),
        dashboardApi.getAlerts()
      ]);
      setInventory(invRes.data);
      setWarehouseStats(whRes.data);
      setAlerts(alertsRes.data.filter(a => a.type === 'low_stock'));
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      category: '',
      quantity: 0,
      min_stock: 10,
      max_stock: 1000,
      unit_price: 0,
      warehouse: '',
      location: ''
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await inventoryApi.update(editingItem.id, formData);
        toast.success('Item updated successfully');
      } else {
        await inventoryApi.create(formData);
        toast.success('Item created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      unit_price: item.unit_price,
      warehouse: item.warehouse,
      location: item.location || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await inventoryApi.delete(id);
      toast.success('Item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (item) => {
    if (item.quantity === 0) return { label: 'Out of Stock', class: 'error' };
    if (item.quantity <= item.min_stock) return { label: 'Low Stock', class: 'warning' };
    if (item.quantity >= item.max_stock * 0.9) return { label: 'Overstocked', class: 'info' };
    return { label: 'In Stock', class: 'success' };
  };

  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const lowStockCount = inventory.filter(item => item.quantity <= item.min_stock).length;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-sm p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          <p className="text-xs text-muted-foreground">
            Items: <span className="text-primary font-mono">{payload[0].payload.items}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Value: <span className="text-emerald-400 font-mono">${payload[0].payload.value.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="inventory-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Inventory Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage stock levels across all warehouses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData} data-testid="refresh-inventory-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="add-inventory-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                      data-testid="inventory-sku-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      data-testid="inventory-category-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="inventory-name-input"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      required
                      data-testid="inventory-quantity-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Stock</Label>
                    <Input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                      data-testid="inventory-min-stock-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Stock</Label>
                    <Input
                      type="number"
                      value={formData.max_stock}
                      onChange={(e) => setFormData({ ...formData, max_stock: parseInt(e.target.value) || 0 })}
                      data-testid="inventory-max-stock-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                      required
                      data-testid="inventory-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warehouse</Label>
                    <Input
                      value={formData.warehouse}
                      onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                      required
                      placeholder="Warehouse A"
                      data-testid="inventory-warehouse-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="A-12-3"
                    data-testid="inventory-location-input"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="inventory-submit-btn">
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card" data-testid="kpi-total-items">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Total Items</p>
                <p className="kpi-value mt-1">{inventory.length}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-primary/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-total-value">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Total Value</p>
                <p className="kpi-value mt-1">${totalValue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-warehouses">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Warehouses</p>
                <p className="kpi-value mt-1">{warehouseStats.length}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-accent/20 flex items-center justify-center">
                <WarehouseIcon className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card bg-red-500/10 border-red-500/30" data-testid="kpi-low-stock">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Low Stock Alerts</p>
                <p className="kpi-value mt-1 text-red-400">{lowStockCount}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Warehouse Chart */}
        <Card className="lg:col-span-2" data-testid="warehouse-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Warehouse Stock Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warehouseStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={warehouseStats} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="warehouse" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={80} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No warehouse data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card data-testid="inventory-alerts">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Reorder Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.slice(0, 6).map((alert, index) => (
                <div 
                  key={index}
                  className={`alert-card ${alert.severity === 'critical' ? 'critical' : 'warning'}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.sku}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                All items stocked adequately
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card data-testid="inventory-table-card">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Inventory Items
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="inventory-search-input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <TableRow key={item.id} data-testid={`inventory-row-${item.id}`}>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>{item.warehouse}</TableCell>
                        <TableCell>
                          <span className={`status-badge ${status.class}`}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleEdit(item)}
                              data-testid={`edit-inventory-${item.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                              data-testid={`delete-inventory-${item.id}`}
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No items match your search' : 'No inventory items. Add some items to get started.'}
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

export default InventoryDashboard;
