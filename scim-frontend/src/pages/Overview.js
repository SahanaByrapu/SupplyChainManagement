import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, seedData } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Package, 
  Users, 
  ClipboardList, 
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Database
} from 'lucide-react';

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [stockLevels, setStockLevels] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, stockRes, alertsRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getStockLevels(),
        dashboardApi.getAlerts()
      ]);
      setStats(statsRes.data);
      setStockLevels(stockRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedData();
      toast.success('Sample data loaded successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to seed data');
    } finally {
      setSeeding(false);
    }
  };

  const kpis = stats ? [
    { 
      title: 'Total Items', 
      value: stats.inventory.total_items, 
      icon: Package, 
      color: 'text-primary',
      link: '/dashboard/inventory'
    },
    { 
      title: 'Inventory Value', 
      value: `$${stats.inventory.total_value.toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-emerald-400',
      link: '/dashboard/inventory'
    },
    { 
      title: 'Suppliers', 
      value: stats.suppliers.total_suppliers, 
      icon: Users, 
      color: 'text-accent',
      link: '/dashboard/suppliers'
    },
    { 
      title: 'Active Orders', 
      value: stats.orders.total_orders, 
      icon: ClipboardList, 
      color: 'text-purple-400',
      link: '/dashboard/orders'
    },
  ] : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-sm p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          <p className="text-xs text-muted-foreground">
            Quantity: <span className="text-primary font-mono">{payload[0].value.toLocaleString()}</span>
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
    <div className="space-y-6 animate-fade-in" data-testid="overview-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Dashboard Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time supply chain metrics and alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={fetchData}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSeedData}
            disabled={seeding}
            data-testid="seed-data-btn"
          >
            <Database className="w-4 h-4 mr-2" />
            {seeding ? 'Loading...' : 'Load Sample Data'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Link to={kpi.link} key={index}>
            <Card className="kpi-card hover:border-primary/50 transition-all cursor-pointer" data-testid={`kpi-${kpi.title.toLowerCase().replace(' ', '-')}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="data-label">{kpi.title}</p>
                    <p className="kpi-value mt-1">{kpi.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-sm bg-secondary flex items-center justify-center ${kpi.color}`}>
                    <kpi.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stock Levels Chart */}
        <Card className="lg:col-span-2" data-testid="stock-levels-chart">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Stock Levels by Category
              </CardTitle>
              <Link to="/dashboard/inventory">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stockLevels.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stockLevels} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="category" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="quantity" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No inventory data available. Load sample data to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card data-testid="alerts-panel">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Alerts
              </CardTitle>
              <span className="text-xs px-2 py-1 rounded-sm bg-amber-500/20 text-amber-400">
                {alerts.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[280px] overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.slice(0, 5).map((alert, index) => (
                <div 
                  key={index}
                  className={`alert-card ${alert.severity === 'critical' ? 'critical' : 'warning'}`}
                  data-testid={`alert-${index}`}
                >
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                    alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                  }`} />
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No alerts at this time
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-red-500/10 border-red-500/30" data-testid="low-stock-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {stats.inventory.low_stock_count}
                  </p>
                  <p className="text-xs text-red-300">Low Stock Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/30" data-testid="backorders-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-amber-500/20 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {stats.orders.backorders}
                  </p>
                  <p className="text-xs text-amber-300">Backorders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/30" data-testid="sla-compliance-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {stats.suppliers.avg_sla_compliance}%
                  </p>
                  <p className="text-xs text-emerald-300">Avg SLA Compliance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Overview;
