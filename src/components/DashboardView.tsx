import { Order } from '../types';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Percent, 
  AlertTriangle,
  Flame,
  Truck,
  ShieldCheck,
  Calendar,
  Gem
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { getExpandedEntries, getTodayDateStr } from '../utils';

interface DashboardViewProps {
  orders: Order[];
  onNavigateToOrders: (filters?: any) => void;
}

export default function DashboardView({ orders, onNavigateToOrders }: DashboardViewProps) {
  const TODAY_STR = getTodayDateStr();
  const today = new Date(TODAY_STR);

  const expandedEntries = getExpandedEntries(orders);

  // --- KPI CALCULATIONS ---
  const totalOrders = expandedEntries.length;
  const openOrders = expandedEntries.filter(o => o.balanceQuantity > 0).length;
  const completedOrders = expandedEntries.filter(o => o.balanceQuantity === 0).length;
  const urgentOrders = expandedEntries.filter(o => o.urgent).length;

  // Past Due Orders: Expected Shipping Date < Today and Balance > 0
  const pastDueOrders = expandedEntries.filter(o => {
    if (o.balanceQuantity === 0) return false;
    const expected = new Date(o.expectedShippingDate);
    return expected < today;
  });

  // Due This Week: Expected Shipping Date is within 7 days from today, Balance > 0
  const dueThisWeekOrders = expandedEntries.filter(o => {
    if (o.balanceQuantity === 0) return false;
    const expected = new Date(o.expectedShippingDate);
    const diffTime = expected.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Due Next Week: Expected Shipping Date is within 8-14 days from today, Balance > 0
  const dueNextWeekOrders = expandedEntries.filter(o => {
    if (o.balanceQuantity === 0) return false;
    const expected = new Date(o.expectedShippingDate);
    const diffTime = expected.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 7 && diffDays <= 14;
  });

  // Total Completed Items & Total Ordered Items for Production Completed %
  const totalOrderedQuantity = expandedEntries.reduce((acc, o) => acc + o.orderQuantity, 0);
  const totalCompletedQuantity = expandedEntries.reduce((acc, o) => acc + o.itemsCompleted, 0);
  const totalProductionPercentage = totalOrderedQuantity > 0 
    ? Math.round((totalCompletedQuantity / totalOrderedQuantity) * 100) 
    : 0;

  // Average Completion %: Average of individual entries' completion percentages
  const avgCompletionPercentage = totalOrders > 0
    ? Math.round(expandedEntries.reduce((acc, o) => acc + o.productionPercentage, 0) / totalOrders)
    : 0;

  // Orders Ready to Ship: Completed Packing Stage but Shipping not finished (Balance is also 0, or Stage = Shipping)
  const readyToShipOrders = expandedEntries.filter(o => {
    return o.balanceQuantity === 0 || o.currentStage === 'Packing' || o.currentStage === 'Shipping';
  });

  // Orders Waiting for QC: QC stage is "In Progress" or Setting is "Completed"
  const waitingForQCOrders = expandedEntries.filter(o => {
    if (o.balanceQuantity === 0) return false;
    const isQcInProgress = o.stages.QC && o.stages.QC.status === 'In Progress';
    const isSettingFinished = o.stages.Setting && o.stages.Setting.status === 'Completed' && (!o.stages.QC || o.stages.QC.status === 'Not Started');
    return isQcInProgress || isSettingFinished;
  });

  // Due Today
  const dueTodayOrders = expandedEntries.filter(o => {
    if (o.balanceQuantity === 0) return false;
    return o.expectedShippingDate === TODAY_STR;
  });

  // --- CHARTS DATA MAPPING ---

  // 1. Client-wise orders
  const clientMap: Record<string, { name: string; ordersCount: number; itemsCount: number }> = {};
  expandedEntries.forEach(o => {
    const code = o.clientCode || "Unknown";
    if (!clientMap[code]) {
      clientMap[code] = { name: code, ordersCount: 0, itemsCount: 0 };
    }
    clientMap[code].ordersCount += 1;
    clientMap[code].itemsCount += o.orderQuantity;
  });
  const clientChartData = Object.values(clientMap);

  // 2. Metal Type Distribution
  const metalMap: Record<string, number> = {};
  expandedEntries.forEach(o => {
    const metal = o.metalType || "18K White Gold";
    metalMap[metal] = (metalMap[metal] || 0) + 1;
  });
  const COLORS = ['#2563eb', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  const metalChartData = Object.keys(metalMap).map(key => ({
    name: key,
    value: metalMap[key]
  }));

  // 3. Stage-wise orders
  const stageMap: Record<string, number> = {
    'CAD': 0, 'Casting': 0, 'Filing': 0, 'Selection': 0, 'Setting': 0, 'QC': 0, 'Packing': 0, 'Shipping': 0, 'None': 0
  };
  expandedEntries.forEach(o => {
    if (o.balanceQuantity === 0) {
      stageMap['Shipping'] = (stageMap['Shipping'] || 0) + 1;
    } else {
      const stage = o.currentStage || 'None';
      stageMap[stage] = (stageMap[stage] || 0) + 1;
    }
  });
  const stageChartData = Object.keys(stageMap).map(key => ({
    stage: key,
    orders: stageMap[key]
  }));

  // 4. Monthly Orders (We will parse order dates to group by month name)
  const monthMap: Record<string, { month: string; orders: number; completed: number }> = {};
  // Create an ordering list of months in 2026
  const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Seed months to look full
  monthsOrder.forEach(m => {
    monthMap[m] = { month: m, orders: 0, completed: 0 };
  });

  expandedEntries.forEach(o => {
    if (!o.orderDate) return;
    const dateObj = new Date(o.orderDate);
    const monthIndex = dateObj.getMonth();
    const monthName = monthsOrder[monthIndex];
    if (monthMap[monthName]) {
      monthMap[monthName].orders += 1;
      if (o.balanceQuantity === 0) {
        monthMap[monthName].completed += 1;
      }
    }
  });
  // Filter only months that have order data or adjacent months to current July 2026
  const monthlyChartData = monthsOrder.slice(4, 8).map(m => monthMap[m]); // May, Jun, Jul, Aug

  // 5. Urgent vs Normal
  const urgentChartData = [
    { name: 'Urgent', value: urgentOrders },
    { name: 'Standard', value: totalOrders - urgentOrders }
  ];
  const URGENT_COLORS = ['#ef4444', '#3b82f6'];

  // 6. Completed vs Pending
  const compPendingChartData = [
    { name: 'Completed', value: completedOrders },
    { name: 'In Production', value: openOrders }
  ];
  const COMP_COLORS = ['#10b981', '#f59e0b'];

  return (
    <div className="space-y-8 p-6 overflow-y-auto h-screen w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Enterprise Control Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time workshop production tracking, client order balances, and delivery statistics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4 text-blue-600" />
          ERP SYSTEM TIME: <span className="text-gray-900 dark:text-white font-mono">{TODAY_STR}</span>
        </div>
      </div>

      {/* SYSTEM NOTIFICATIONS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Past Due Alert */}
        <button 
          onClick={() => onNavigateToOrders({ status: 'Past Due' })}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition hover:scale-[1.01] cursor-pointer ${
            pastDueOrders.length > 0 
              ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-400' 
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-extrabold uppercase tracking-widest">Past Due Orders</span>
            <AlertCircle className={`w-5 h-5 ${pastDueOrders.length > 0 ? 'text-red-500 animate-bounce' : 'text-gray-400'}`} />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black">{pastDueOrders.length}</span>
            <p className="text-[10px] font-semibold mt-1">Requires Immediate Action</p>
          </div>
        </button>

        {/* Due Today Alert */}
        <button 
          onClick={() => onNavigateToOrders({ shippingDate: TODAY_STR })}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition hover:scale-[1.01] cursor-pointer ${
            dueTodayOrders.length > 0 
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-400' 
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-extrabold uppercase tracking-widest">Due Today</span>
            <Clock className={`w-5 h-5 ${dueTodayOrders.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black">{dueTodayOrders.length}</span>
            <p className="text-[10px] font-semibold mt-1">Due for shipping today</p>
          </div>
        </button>

        {/* Next 7 Days Alert */}
        <button 
          onClick={() => onNavigateToOrders({ status: 'Due Soon' })}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition hover:scale-[1.01] cursor-pointer ${
            dueThisWeekOrders.length > 0 
              ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-400' 
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-extrabold uppercase tracking-widest">Due in 7 Days</span>
            <Calendar className={`w-5 h-5 ${dueThisWeekOrders.length > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black">{dueThisWeekOrders.length}</span>
            <p className="text-[10px] font-semibold mt-1">Weekly Delivery Schedule</p>
          </div>
        </button>

        {/* Waiting for QC */}
        <button 
          onClick={() => onNavigateToOrders({ stage: 'QC' })}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition hover:scale-[1.01] cursor-pointer ${
            waitingForQCOrders.length > 0 
              ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-400' 
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-extrabold uppercase tracking-widest">Waiting for QC</span>
            <ShieldCheck className={`w-5 h-5 ${waitingForQCOrders.length > 0 ? 'text-purple-500' : 'text-gray-400'}`} />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black">{waitingForQCOrders.length}</span>
            <p className="text-[10px] font-semibold mt-1">Quality Inspection Stage</p>
          </div>
        </button>

        {/* Ready for Shipping */}
        <button 
          onClick={() => onNavigateToOrders({ stage: 'Shipping' })}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition hover:scale-[1.01] cursor-pointer ${
            readyToShipOrders.length > 0 
              ? 'bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/40 text-green-700 dark:text-green-400' 
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-extrabold uppercase tracking-widest">Ready to Ship</span>
            <Truck className={`w-5 h-5 ${readyToShipOrders.length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black">{readyToShipOrders.length}</span>
            <p className="text-[10px] font-semibold mt-1">Packed or Shipping phase</p>
          </div>
        </button>

        {/* Urgent Orders Card */}
        <button 
          onClick={() => onNavigateToOrders({ urgent: 'Yes' })}
          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition hover:scale-[1.01] cursor-pointer ${
            urgentOrders > 0 
              ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/40 text-orange-700 dark:text-orange-400' 
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-extrabold uppercase tracking-widest">Urgent Orders</span>
            <Flame className={`w-5 h-5 ${urgentOrders > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black">{urgentOrders}</span>
            <p className="text-[10px] font-semibold mt-1">Flagged Urgent Orders</p>
          </div>
        </button>
      </div>

      {/* MAIN ERP PERFORMANCE WIDGETS (KPI GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Active Pipeline */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Active Pipeline</span>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">{openOrders} / {totalOrders}</h3>
            <p className="text-[11px] text-gray-500">Active vs Total catalogued</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Gem className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Completed Orders */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Completed Orders</span>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">{completedOrders}</h3>
            <p className="text-[11px] text-gray-500">All balances cleared to zero</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Production completed Qty */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Production Output %</span>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">{totalProductionPercentage}%</h3>
            <p className="text-[11px] text-gray-500">{totalCompletedQuantity} of {totalOrderedQuantity} items finished</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Avg Completion Rate */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Avg Order Completion</span>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">{avgCompletionPercentage}%</h3>
            <p className="text-[11px] text-gray-500">Average progress across all entries</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Chart 1: Monthly Production Trend (Line/Area) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-8">
          <div className="mb-4">
            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Manufacturing Pipeline Trends</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Orders received versus successfully completed orders by month.</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-800" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend verticalAlign="top" height={36}/>
                <Area type="monotone" name="New Orders" dataKey="orders" stroke="#2563eb" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
                <Area type="monotone" name="Shipped / Complete" dataKey="completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Urgent vs Normal & Completed Distribution (Pies) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Priority & Completion Breakdown</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Distribution of urgency flags and production states.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 my-4 flex-1 items-center">
            {/* Urgent Pie */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Urgency Priority</span>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={urgentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {urgentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={URGENT_COLORS[index % URGENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-2 text-[10px] font-bold">
                <span className="text-red-500">Urgent ({urgentOrders})</span>
                <span className="text-blue-500">Std ({totalOrders - urgentOrders})</span>
              </div>
            </div>

            {/* Completed Pie */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Delivery State</span>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={compPendingChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {compPendingChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COMP_COLORS[index % COMP_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-2 text-[10px] font-bold">
                <span className="text-green-500">Done ({completedOrders})</span>
                <span className="text-yellow-600">Active ({openOrders})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Chart 3: Stage-wise order count (Bar) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-6">
          <div className="mb-4">
            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Orders by Active Production Stage</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Real-time load balancing across work centers.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-800" />
                <XAxis dataKey="stage" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="orders" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  {stageChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Client-wise distribution */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-6">
          <div className="mb-4">
            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Client Load Distribution</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Analysis of order counts and product quantities per client code.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-800" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend verticalAlign="top" height={36}/>
                <Bar name="Active Orders Count" dataKey="ordersCount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="Total Ordered Items" dataKey="itemsCount" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 5: Metal Type Distribution (Pie list) */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="mb-4">
          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Metal Type Allocation</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Precious metals allocation breakdown across active production.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metalChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {metalChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {metalChartData.map((item, idx) => (
              <div key={item.name} className="p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.name}</span>
                <span className="text-lg font-black mt-1 text-gray-800 dark:text-white">{item.value} Orders</span>
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ 
                      width: `${(item.value / totalOrders) * 100}%`,
                      backgroundColor: COLORS[idx % COLORS.length]
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
