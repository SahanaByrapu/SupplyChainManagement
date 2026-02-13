import { useState, useEffect } from 'react';
import { orderApi, supplierApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  ClipboardList, Plus, RefreshCw, Search, Edit2, Trash2, 
  Package, Clock, AlertTriangle, CheckCircle, Truck, XCircle
} from 'lucide-react';
import { format } from 'date-fns';

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({
    order_number: '',
    supplier_id: '',
    supplier_name: '',
    items: [{ sku: '', name: '', quantity: 1, unit_price: 0 }],
    total_amount: 0,
    status: 'pending',
    expected_delivery: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes] = await Promise.all([
        orderApi.getAll(),
        supplierApi.getAll()
      ]);
      setOrders(ordersRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      order_number: '',
      supplier_id: '',
      supplier_name: '',
      items: [{ sku: '', name: '', quantity: 1, unit_price: 0 }],
      total_amount: 0,
      status: 'pending',
      expected_delivery: '',
      notes: ''
    });
    setEditingOrder(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
      const submitData = {
        ...formData,
        supplier_name: selectedSupplier?.name || formData.supplier_name,
        expected_delivery: formData.expected_delivery ? new Date(formData.expected_delivery).toISOString() : null,
        total_amount: formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      };

      if (editingOrder) {
        await orderApi.update(editingOrder.id, {
          status: formData.status,
          expected_delivery: submitData.expected_delivery,
          notes: formData.notes
        });
        toast.success('Order updated successfully');
      } else {
        await orderApi.create(submitData);
        toast.success('Order created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      order_number: order.order_number,
      supplier_id: order.supplier_id,
      supplier_name: order.supplier_name,
      items: order.items,
      total_amount: order.total_amount,
      status: order.status,
      expected_delivery: order.expected_delivery ? format(new Date(order.expected_delivery), "yyyy-MM-dd'T'HH:mm") : '',
      notes: order.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await orderApi.delete(id);
      toast.success('Order deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderApi.update(orderId, { status: newStatus });
      toast.success('Order status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { sku: '', name: '', quantity: 1, unit_price: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const backorders = orders.filter(o => o.status === 'backorder');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const shippedOrders = orders.filter(o => o.status === 'shipped');

  const getStatusConfig = (status) => {
    switch (status) {
      case 'delivered':
        return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Delivered' };
      case 'shipped':
        return { icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Shipped' };
      case 'confirmed':
        return { icon: Package, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Confirmed' };
      case 'pending':
        return { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-500/20', label: 'Pending' };
      case 'backorder':
        return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Backorder' };
      case 'cancelled':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelled' };
      default:
        return { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-500/20', label: status };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="order-tracking">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Order Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor purchase orders and manage backorders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData} data-testid="refresh-orders-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="add-order-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {editingOrder ? 'Update Order Status' : 'Create Purchase Order'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingOrder && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Order Number</Label>
                        <Input
                          value={formData.order_number}
                          onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                          required
                          placeholder="PO-2024-001"
                          data-testid="order-number-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select 
                          value={formData.supplier_id} 
                          onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                        >
                          <SelectTrigger data-testid="order-supplier-select">
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Items</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                          <Plus className="w-4 h-4 mr-1" /> Add Item
                        </Button>
                      </div>
                      {formData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3">
                            <Input
                              placeholder="SKU"
                              value={item.sku}
                              onChange={(e) => updateItem(index, 'sku', e.target.value)}
                              data-testid={`order-item-sku-${index}`}
                            />
                          </div>
                          <div className="col-span-4">
                            <Input
                              placeholder="Product name"
                              value={item.name}
                              onChange={(e) => updateItem(index, 'name', e.target.value)}
                              data-testid={`order-item-name-${index}`}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              data-testid={`order-item-qty-${index}`}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              data-testid={`order-item-price-${index}`}
                            />
                          </div>
                          <div className="col-span-1">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeItem(index)}
                              disabled={formData.items.length === 1}
                            >
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger data-testid="order-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="backorder">Backorder</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Delivery</Label>
                    <Input
                      type="datetime-local"
                      value={formData.expected_delivery}
                      onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                      data-testid="order-delivery-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    data-testid="order-notes-input"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="order-submit-btn">
                    {editingOrder ? 'Update' : 'Create Order'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card" data-testid="kpi-total-orders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Total Orders</p>
                <p className="kpi-value mt-1">{orders.length}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-primary/20 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-pending-orders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Pending</p>
                <p className="kpi-value mt-1">{pendingOrders.length}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-zinc-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-shipped-orders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">In Transit</p>
                <p className="kpi-value mt-1">{shippedOrders.length}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-blue-500/20 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card bg-amber-500/10 border-amber-500/30" data-testid="kpi-backorders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Backorders</p>
                <p className="kpi-value mt-1 text-amber-400">{backorders.length}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backorders Alert */}
      {backorders.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30" data-testid="backorders-alert">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Backorders Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backorders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-card rounded-sm border border-border/60">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">${order.total_amount.toLocaleString()}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-amber-400 hover:text-amber-300"
                      onClick={() => handleEdit(order)}
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card data-testid="orders-table-card">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              All Orders
            </CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="status-filter-select">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="backorder">Backorder</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="order-search-input"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>{order.supplier_name}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${order.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.expected_delivery 
                            ? format(new Date(order.expected_delivery), 'MMM dd, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleEdit(order)}
                              data-testid={`edit-order-${order.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(order.id)}
                              data-testid={`delete-order-${order.id}`}
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
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No orders match your filters' 
                        : 'No orders found. Create one to get started.'}
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

export default OrderTracking;
