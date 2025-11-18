import { useState, useEffect, useRef } from 'react';
import { orderAPI, LinksCreatedStats, MonthlyData } from '../services/api';
import { formatPrice } from '../utils/formatPrice';

export default function BusinessInfoPage() {
  // Individual state for each card
  const [linksCreated, setLinksCreated] = useState<LinksCreatedStats | null>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<Record<string, number>>({});
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [yearlyData, setYearlyData] = useState<MonthlyData[]>([]);
  
  // Loading states for each card
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [loadingYearly, setLoadingYearly] = useState(true);
  
  // Errors for each card
  const [errorLinks, setErrorLinks] = useState('');
  const [errorOrders, setErrorOrders] = useState('');
  const [errorIncome, setErrorIncome] = useState('');
  const [errorYearly, setErrorYearly] = useState('');
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(1200);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; revenue: number; orders: number; month: string } | null>(null);

  // Fetch monthly data when month changes
  useEffect(() => {
    fetchLinksCreated();
    fetchOrdersByStatus();
    fetchMonthlyIncome();
  }, [selectedMonth]);

  // Fetch yearly data when year changes or on initial load
  useEffect(() => {
    fetchYearlyData();
  }, [selectedYear]);

  // Validate and correct selected month if it's in the future
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (selectedYear === currentYear && selectedMonth > currentMonth) {
      setSelectedMonth(currentMonth);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const updateChartWidth = () => {
      if (chartContainerRef.current) {
        const containerWidth = chartContainerRef.current.offsetWidth;
        const isMobileView = window.innerWidth < 768;
        setIsMobile(isMobileView);
        // On mobile, use a fixed minimum width to prevent stretching, allow horizontal scroll
        // On desktop, use container width
        if (isMobileView) {
          setChartWidth(Math.max(600, containerWidth)); // Minimum 600px on mobile
        } else {
          setChartWidth(Math.max(800, containerWidth - 32)); // Subtract padding on desktop
        }
      }
    };

    // Update on mount and when yearly data loads
    updateChartWidth();
    const timeoutId = setTimeout(updateChartWidth, 100); // Small delay to ensure container is rendered
    
    window.addEventListener('resize', updateChartWidth);
    return () => {
      window.removeEventListener('resize', updateChartWidth);
      clearTimeout(timeoutId);
    };
  }, [yearlyData]);

  const fetchLinksCreated = async () => {
    setLoadingLinks(true);
    setErrorLinks('');
    try {
      const data = await orderAPI.getLinksCreatedStats(selectedYear, selectedMonth);
      setLinksCreated(data);
    } catch (err: any) {
      setErrorLinks('Failed to load links created');
      console.error('Error fetching links created:', err);
    } finally {
      setLoadingLinks(false);
    }
  };

  const fetchOrdersByStatus = async () => {
    setLoadingOrders(true);
    setErrorOrders('');
    try {
      const data = await orderAPI.getOrdersByStatus(selectedYear, selectedMonth);
      setOrdersByStatus(data);
    } catch (err: any) {
      setErrorOrders('Failed to load orders by status');
      console.error('Error fetching orders by status:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchMonthlyIncome = async () => {
    setLoadingIncome(true);
    setErrorIncome('');
    try {
      const data = await orderAPI.getMonthlyIncome(selectedYear, selectedMonth);
      setMonthlyIncome(data);
    } catch (err: any) {
      setErrorIncome('Failed to load monthly income');
      console.error('Error fetching monthly income:', err);
    } finally {
      setLoadingIncome(false);
    }
  };

  const fetchYearlyData = async () => {
    setLoadingYearly(true);
    setErrorYearly('');
    try {
      const data = await orderAPI.getYearlyData(selectedYear);
      setYearlyData(data);
    } catch (err: any) {
      setErrorYearly('Failed to load yearly data');
      console.error('Error fetching yearly data:', err);
    } finally {
      setLoadingYearly(false);
    }
  };

  const getSelectedMonthName = () => {
    const date = new Date(selectedYear, selectedMonth - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getMonthOptions = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    for (let i = 1; i <= 12; i++) {
      // Don't allow future months
      if (selectedYear === currentYear && i > currentMonth) {
        break;
      }
      const date = new Date(selectedYear, i - 1, 1);
      months.push({ value: i, label: date.toLocaleString('default', { month: 'long' }) });
    }
    return months;
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      EMPTY: 'from-blue-400 to-blue-600',
      PLACED: 'from-yellow-400 to-yellow-600',
      DONE: 'from-green-400 to-green-600',
      EXPIRED: 'from-gray-400 to-gray-600',
      CANCELLED: 'from-red-400 to-red-600',
    };
    return colors[status] || 'from-indigo-400 to-indigo-600';
  };

  const getStatusBgColor = (status: string) => {
    const colors: Record<string, string> = {
      EMPTY: 'bg-gradient-to-br from-blue-400/20 to-blue-600/20',
      PLACED: 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20',
      DONE: 'bg-gradient-to-br from-green-400/20 to-green-600/20',
      EXPIRED: 'bg-gradient-to-br from-gray-400/20 to-gray-600/20',
      CANCELLED: 'bg-gradient-to-br from-red-400/20 to-red-600/20',
    };
    return colors[status] || 'bg-gradient-to-br from-indigo-400/20 to-indigo-600/20';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      EMPTY: 'Empty',
      PLACED: 'Placed',
      DONE: 'Done',
      EXPIRED: 'Expired',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  // Filter yearly data to only show months up to current month if viewing current year
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const filteredYearlyData = selectedYear === currentYear 
    ? yearlyData.filter(data => data.month <= currentMonth)
    : yearlyData;

  // Calculate chart dimensions and scales for yearly data - responsive width
  const chartHeight = 300;
  // Adjust padding for mobile vs desktop - ensure right padding is enough for labels
  const padding = isMobile 
    ? { top: 10, right: 45, bottom: 30, left: 40 }
    : { top: 20, right: 40, bottom: 40, left: 60 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Find max values for scaling
  const maxRevenue = Math.max(...filteredYearlyData.map(d => d.revenue), 1);
  const maxOrders = Math.max(...filteredYearlyData.map(d => d.completedOrders), 1);

  // Generate points for revenue and orders lines
  const dataLength = filteredYearlyData.length;
  const chartPoints = filteredYearlyData.map((data, index) => {
    const x = padding.left + (dataLength > 1 ? (index / (dataLength - 1)) : 0) * graphWidth;
    const revenueY = padding.top + graphHeight - (data.revenue / maxRevenue) * graphHeight;
    const ordersY = padding.top + graphHeight - (data.completedOrders / maxOrders) * graphHeight;
    return { 
      x, 
      revenueY, 
      ordersY, 
      revenue: data.revenue, 
      orders: data.completedOrders, 
      month: data.monthName 
    };
  });

  const revenuePoints = chartPoints.map(p => ({ x: p.x, y: p.revenueY, value: p.revenue, month: p.month }));
  const ordersPoints = chartPoints.map(p => ({ x: p.x, y: p.ordersY, value: p.orders, month: p.month }));

  // Create path strings for the lines
  const revenuePath = revenuePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const ordersPath = ordersPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="backdrop-blur-2xl bg-white/60 border border-white/40 rounded-2xl shadow-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Business Information</h1>
            <p className="text-gray-600 text-sm">Statistics for {getSelectedMonthName()}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="backdrop-blur-xl bg-white/90 border border-gray-300/70 rounded-xl pl-3 pr-8 py-2 text-sm font-medium text-gray-800 shadow-lg hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                {getMonthOptions().map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="backdrop-blur-xl bg-white/90 border border-gray-300/70 rounded-xl pl-3 pr-8 py-2 text-sm font-medium text-gray-800 shadow-lg hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                {getYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column - Links Created */}
        <div className="lg:col-span-1">
          {/* Links Created */}
          <div className="backdrop-blur-2xl bg-gradient-to-br from-indigo-400/30 to-purple-400/30 border border-white/40 rounded-2xl shadow-xl p-4 hover:shadow-2xl transition-all duration-300 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800">Links Created</h2>
              <div className="text-xl">🔗</div>
            </div>
            
            <div className="flex flex-col space-y-2.5 flex-1 min-h-0 overflow-hidden">
              {/* Manager Row */}
              <div className="flex justify-between items-center py-2 px-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <span className="text-sm font-medium text-gray-800">Manager</span>
                <span className="text-lg font-bold text-indigo-700">{linksCreated?.managerLinks ?? 0}</span>
              </div>

              {/* Agents List - Scrollable */}
              {linksCreated && Object.keys(linksCreated.linksPerAgent).length > 0 && (
                <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
                  {Object.values(linksCreated.linksPerAgent)
                    .sort((a, b) => b.linkCount - a.linkCount)
                    .map((agentInfo) => (
                      <div 
                        key={agentInfo.agentId} 
                        className="flex justify-between items-center py-1.5 px-2.5 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
                      >
                        <span className={`text-xs font-medium truncate pr-1.5 flex-1 ${agentInfo.linkCount === 0 ? 'text-gray-900' : 'text-gray-800'}`} title={agentInfo.agentName}>
                          {agentInfo.agentName}
                        </span>
                        <span className={`text-sm font-bold whitespace-nowrap ${agentInfo.linkCount === 0 ? 'text-gray-600' : 'text-purple-700'}`}>
                          {agentInfo.linkCount}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Total Row */}
              <div className="flex justify-between items-center py-2 px-3 bg-white/30 rounded-lg backdrop-blur-sm border border-white/40 mt-auto">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{linksCreated?.total ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Small Cubes, Orders by Status & Chart */}
        <div className="lg:col-span-3 space-y-4">
          {/* Monthly Income & Total Orders */}
          <div className="flex gap-3 flex-wrap justify-center lg:justify-start">
            {/* Monthly Income - Small Cube */}
            <div className="backdrop-blur-2xl bg-gradient-to-br from-green-400/30 to-emerald-400/30 border border-white/40 rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center w-44 h-40 flex-shrink-0">
              <div className="text-4xl mb-2 text-center">💰</div>
              <h2 className="text-base font-semibold text-gray-800 mb-2 text-center">Monthly Income</h2>
              <div className="text-2xl font-bold text-green-700 text-center">
                {loadingIncome ? '...' : formatPrice(monthlyIncome)}
              </div>
            </div>

            {/* Total Orders - Small Cube */}
            <div className="backdrop-blur-2xl bg-gradient-to-br from-pink-400/30 to-rose-400/30 border border-white/40 rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center w-44 h-40 flex-shrink-0">
              <div className="text-4xl mb-2 text-center">📦</div>
              <h2 className="text-base font-semibold text-gray-800 mb-2 text-center">Total Orders</h2>
              <div className="text-2xl font-bold text-pink-700 text-center">
                {Object.values(ordersByStatus).reduce((sum, count) => sum + count, 0)}
              </div>
            </div>

            {/* Orders by Status - Desktop: in same row, Mobile: separate */}
            <div className="hidden lg:flex flex-1 backdrop-blur-2xl bg-white/60 border border-white/40 rounded-2xl shadow-xl p-3 h-40 flex-col min-w-96">
              <h2 className="text-base font-bold text-gray-800 mb-3 text-center">Orders by Status</h2>
              <div className="flex gap-3 flex-1 min-w-0 w-full">
                {Object.entries(ordersByStatus).map(([status, count]) => (
                  <div 
                    key={status} 
                    className={`flex-1 min-w-0 backdrop-blur-sm rounded-lg p-1.5 border border-white/40 flex flex-col items-center justify-center ${getStatusBgColor(status)}`}
                  >
                    <span className="text-xs font-semibold text-gray-700 mb-0.5 text-center w-full">{getStatusLabel(status)}</span>
                    <span className="text-base font-bold text-gray-800 text-center w-full">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Orders by Status - Mobile: separate row */}
          <div className="lg:hidden backdrop-blur-2xl bg-white/60 border border-white/40 rounded-2xl shadow-xl p-2">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Orders by Status</h2>
            <div className="flex gap-0.5 w-full">
              {Object.entries(ordersByStatus).map(([status, count]) => (
                <div 
                  key={status} 
                  className={`flex-1 min-w-0 backdrop-blur-sm rounded-lg p-2 border border-white/40 flex flex-col items-center justify-center ${getStatusBgColor(status)}`}
                >
                  <span className="text-xs font-semibold text-gray-700 mb-1 text-center w-full">{getStatusLabel(status)}</span>
                  <span className="text-xl font-bold text-gray-800 text-center w-full">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Yearly Chart */}
          <div className="backdrop-blur-2xl bg-white/60 border border-white/40 rounded-2xl shadow-xl p-4">
            <h2 className="text-base font-bold text-gray-800 mb-3">Yearly Overview - {selectedYear}</h2>
            <div ref={chartContainerRef} className="w-full overflow-x-auto">
            <svg width={isMobile ? chartWidth : "100%"} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" className={isMobile ? "" : "w-full"}>
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => {
                const y = padding.top + (i / 4) * graphHeight;
                return (
                  <line
                    key={i}
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + graphWidth}
                    y2={y}
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Revenue line */}
              <path
                d={revenuePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Revenue points */}
              {revenuePoints.map((point, index) => {
                const chartPoint = chartPoints[index];
                const minY = Math.min(chartPoint.revenueY, chartPoint.ordersY);
                const tooltipY = minY < padding.top + 100 ? minY + 20 : minY - 10;
                return (
                  <g key={`revenue-${index}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#10b981"
                      className="hover:r-6 transition-all cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({
                        x: chartPoint.x,
                        y: tooltipY,
                        revenue: chartPoint.revenue,
                        orders: chartPoint.orders,
                        month: chartPoint.month
                      })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => setHoveredPoint({
                        x: chartPoint.x,
                        y: tooltipY,
                        revenue: chartPoint.revenue,
                        orders: chartPoint.orders,
                        month: chartPoint.month
                      })}
                    />
                    <title>{`${point.month}: ${formatPrice(point.value)}`}</title>
                  </g>
                );
              })}

              {/* Orders line */}
              <path
                d={ordersPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Orders points */}
              {ordersPoints.map((point, index) => {
                const chartPoint = chartPoints[index];
                const minY = Math.min(chartPoint.revenueY, chartPoint.ordersY);
                const tooltipY = minY < padding.top + 100 ? minY + 20 : minY - 10;
                return (
                  <g key={`orders-${index}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#3b82f6"
                      className="hover:r-6 transition-all cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({
                        x: chartPoint.x,
                        y: tooltipY,
                        revenue: chartPoint.revenue,
                        orders: chartPoint.orders,
                        month: chartPoint.month
                      })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => setHoveredPoint({
                        x: chartPoint.x,
                        y: tooltipY,
                        revenue: chartPoint.revenue,
                        orders: chartPoint.orders,
                        month: chartPoint.month
                      })}
                    />
                    <title>{`${point.month}: ${point.value} orders`}</title>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hoveredPoint && (() => {
                const minY = Math.min(...chartPoints.map(p => Math.min(p.revenueY, p.ordersY)));
                const isNearTop = hoveredPoint.y < padding.top + 100;
                const tooltipTop = isNearTop ? hoveredPoint.y : hoveredPoint.y - 100;
                return (
                  <g>
                    <rect
                      x={hoveredPoint.x - 80}
                      y={tooltipTop}
                      width="160"
                      height="100"
                      rx="8"
                      fill="rgba(0, 0, 0, 0.85)"
                      className="backdrop-blur-sm"
                    />
                    <text
                      x={hoveredPoint.x}
                      y={tooltipTop + 30}
                      textAnchor="middle"
                      className="text-xs fill-white font-semibold"
                    >
                      {hoveredPoint.month}
                    </text>
                    <text
                      x={hoveredPoint.x}
                      y={tooltipTop + 55}
                      textAnchor="middle"
                      className="text-xs fill-green-300 font-medium"
                    >
                      Revenue: {formatPrice(hoveredPoint.revenue)}
                    </text>
                    <text
                      x={hoveredPoint.x}
                      y={tooltipTop + 80}
                      textAnchor="middle"
                      className="text-xs fill-blue-300 font-medium"
                    >
                      Orders: {hoveredPoint.orders}
                    </text>
                  </g>
                );
              })()}

              {/* X-axis labels */}
              {filteredYearlyData.map((data, index) => {
                const x = padding.left + (filteredYearlyData.length > 1 ? (index / (filteredYearlyData.length - 1)) : 0) * graphWidth;
                return (
                  <text
                    key={index}
                    x={x}
                    y={chartHeight - padding.bottom + 20}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {data.monthName.substring(0, 3)}
                  </text>
                );
              })}

              {/* Y-axis labels for revenue */}
              {[0, 1, 2, 3, 4].map((i) => {
                const y = padding.top + (i / 4) * graphHeight;
                const value = maxRevenue - (i / 4) * maxRevenue;
                return (
                  <text
                    key={`revenue-${i}`}
                    x={padding.left - (isMobile ? 3 : 5)}
                    y={y + 4}
                    textAnchor="end"
                    className={`${isMobile ? 'text-[10px]' : 'text-xs'} fill-gray-600`}
                  >
                    {formatPrice(value)}
                  </text>
                );
              })}

              {/* Y-axis labels for orders (right side) */}
              {[0, 1, 2, 3, 4].map((i) => {
                const y = padding.top + (i / 4) * graphHeight;
                const value = Math.round(maxOrders - (i / 4) * maxOrders);
                return (
                  <text
                    key={`orders-${i}`}
                    x={chartWidth - padding.right + (isMobile ? 3 : 5)}
                    y={y + 4}
                    textAnchor="start"
                    className={`${isMobile ? 'text-[10px]' : 'text-xs'} fill-gray-600`}
                  >
                    {value}
                  </text>
                );
              })}
            </svg>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-700">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-700">Completed Orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

