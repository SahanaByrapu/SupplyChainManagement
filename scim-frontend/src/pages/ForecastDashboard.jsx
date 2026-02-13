import { useState, useEffect } from 'react';
import { forecastApi, dashboardApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart, Bar
} from 'recharts';
import { 
  TrendingUp, Plus, RefreshCw, Activity, Target, Percent
} from 'lucide-react';

const ForecastDashboard = () => {
  const [forecasts, setForecasts] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [formData, setFormData] = useState({
    sku: '',
    product_name: '',
    warehouse: '',
    period: '',
    predicted_demand: 0,
    actual_demand: null,
    confidence: 0.85
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [forecastRes, warehouseRes] = await Promise.all([
        forecastApi.getAll(),
        dashboardApi.getWarehouseStats()
      ]);
      setForecasts(forecastRes.data);
      setWarehouseStats(warehouseRes.data);
    } catch (error) {
      toast.error('Failed to load forecast data');
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
      product_name: '',
      warehouse: '',
      period: '',
      predicted_demand: 0,
      actual_demand: null,
      confidence: 0.85
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        actual_demand: formData.actual_demand || null
      };
      await forecastApi.create(submitData);
      toast.success('Forecast added successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add forecast');
    }
  };

  // Process forecast data for chart
  const uniqueProducts = [...new Set(forecasts.map(f => f.sku))];
  
  const getChartData = () => {
    const filteredForecasts = selectedProduct === 'all' 
      ? forecasts 
      : forecasts.filter(f => f.sku === selectedProduct);
    
    // Group by period
    const periodMap = {};
    filteredForecasts.forEach(f => {
      if (!periodMap[f.period]) {
        periodMap[f.period] = { period: f.period, predicted: 0, actual: 0, count: 0 };
      }
      periodMap[f.period].predicted += f.predicted_demand;
      if (f.actual_demand) {
        periodMap[f.period].actual += f.actual_demand;
      }
      periodMap[f.period].count += 1;
    });

    return Object.values(periodMap).sort((a, b) => a.period.localeCompare(b.period));
  };

  const chartData = getChartData();

  // Calculate accuracy
  const forecastsWithActual = forecasts.filter(f => f.actual_demand !== null);
  const avgAccuracy = forecastsWithActual.length > 0
    ? forecastsWithActual.reduce((sum, f) => {
        const accuracy = 100 - Math.abs((f.predicted_demand - f.actual_demand) / f.actual_demand * 100);
        return sum + Math.max(0, accuracy);
      }, 0) / forecastsWithActual.length
    : 0;

  const avgConfidence = forecasts.length > 0
    ? (forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length * 100).toFixed(1)
    : 0;

  const totalPredicted = forecasts.reduce((sum, f) => sum + f.predicted_demand, 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-sm p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: <span className="font-mono">{entry.value?.toLocaleString() || 'N/A'}</span>
            </p>
          ))}
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
    <div className="space-y-6 animate-fade-in" data-testid="forecast-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Forecast Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Demand forecasting and warehouse trend analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData} data-testid="refresh-forecast-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="add-forecast-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Forecast
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Add Demand Forecast
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
                      placeholder="SKU-001"
                      data-testid="forecast-sku-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period</Label>
                    <Input
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                      required
                      placeholder="2024-01"
                      data-testid="forecast-period-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    required
                    data-testid="forecast-product-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <Input
                    value={formData.warehouse}
                    onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                    required
                    placeholder="Warehouse A"
                    data-testid="forecast-warehouse-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Predicted Demand</Label>
                    <Input
                      type="number"
                      value={formData.predicted_demand}
                      onChange={(e) => setFormData({ ...formData, predicted_demand: parseInt(e.target.value) || 0 })}
                      required
                      data-testid="forecast-predicted-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Actual Demand (optional)</Label>
                    <Input
                      type="number"
                      value={formData.actual_demand || ''}
                      onChange={(e) => setFormData({ ...formData, actual_demand: e.target.value ? parseInt(e.target.value) : null })}
                      data-testid="forecast-actual-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confidence (0-1)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.confidence}
                    onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) || 0.85 })}
                    data-testid="forecast-confidence-input"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="forecast-submit-btn">
                    Add Forecast
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card" data-testid="kpi-total-forecasts">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Total Forecasts</p>
                <p className="kpi-value mt-1">{forecasts.length}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-primary/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-total-predicted">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Total Predicted</p>
                <p className="kpi-value mt-1">{totalPredicted.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-accuracy">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Forecast Accuracy</p>
                <p className="kpi-value mt-1">{avgAccuracy.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-emerald-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card" data-testid="kpi-confidence">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Avg Confidence</p>
                <p className="kpi-value mt-1">{avgConfidence}%</p>
              </div>
              <div className="w-12 h-12 rounded-sm bg-purple-500/20 flex items-center justify-center">
                <Percent className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demand Forecast Chart */}
      <Card data-testid="demand-forecast-chart">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Demand Forecast Trend
            </CardTitle>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-48" data-testid="product-filter-select">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {uniqueProducts.map(sku => (
                  <SelectItem key={sku} value={sku}>{sku}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="period" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted Demand"
                  fill="hsl(var(--accent))"
                  fillOpacity={0.2}
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Demand"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              No forecast data available. Load sample data from the Overview page.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warehouse Trends */}
      <Card data-testid="warehouse-trends-chart">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Warehouse Stock Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warehouseStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={warehouseStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="warehouse" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="quantity"
                  name="Stock Quantity"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              No warehouse data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForecastDashboard;
