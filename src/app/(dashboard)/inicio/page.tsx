"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Boxes, CircleDollarSign, CreditCard, ShoppingBag, UsersRound } from "lucide-react";
import { api, errorText, formatMoney } from "@/components/data-client";
import { ErrorBanner, Loading, PageHeader, Panel } from "@/components/app-ui";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type DashboardData = {
  ventasHoy: { total: number; cantidad: number };
  ventasMes: { total: number; cantidad: number; ticketPromedio: number };
  cuentasCorrientes: { saldoTotal: number; clientesConSaldo: number };
  productosBajoMinimo: number;
  ventasUltimos30Dias: { fecha: string; total: number }[];
  ventasMesPorFormaPago: { contado: number; tarjeta: number; cuenta_corriente: number };
};

const defaultData: DashboardData = {
  ventasHoy: { total: 0, cantidad: 0 },
  ventasMes: { total: 0, cantidad: 0, ticketPromedio: 0 },
  cuentasCorrientes: { saldoTotal: 0, clientesConSaldo: 0 },
  productosBajoMinimo: 0,
  ventasUltimos30Dias: [],
  ventasMesPorFormaPago: { contado: 0, tarjeta: 0, cuenta_corriente: 0 },
};

export default function InicioPage() {
  const [data, setData] = useState<DashboardData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((reason) => setError(errorText(reason)))
      .finally(() => setLoading(false));
  }, []);

  const chartLabels = data.ventasUltimos30Dias.map((point) => point.fecha.slice(5).replace("-", "/"));
  const barData = {
    labels: chartLabels,
    datasets: [{
      label: "Ventas",
      data: data.ventasUltimos30Dias.map((point) => point.total),
      backgroundColor: "#EA580C",
      hoverBackgroundColor: "#C2410C",
      borderRadius: 5,
      borderSkipped: "bottom" as const,
      maxBarThickness: 30,
    }],
  };
  const paymentData = {
    labels: ["Contado", "Tarjeta", "Cuenta corriente"],
    datasets: [{
      data: [data.ventasMesPorFormaPago.contado, data.ventasMesPorFormaPago.tarjeta, data.ventasMesPorFormaPago.cuenta_corriente],
      backgroundColor: ["#10B981", "#3B82F6", "#F59E0B"],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="RESUMEN DE OPERACIÓN" title="Tablero" description="Actividad de MotoParts & Ruta 9." action={<><Link href="/ventas" className="button button-secondary">Ver ventas</Link><Link href="/ventas/nueva" className="button button-primary">+ Nueva venta</Link></>} />
      {error && <ErrorBanner message={error} />}
      {loading ? <Loading /> : (
        <>
          <div className="metric-grid">
            <MetricCard title="Ventas de hoy" value={formatMoney(data.ventasHoy.total)} detail={`${data.ventasHoy.cantidad} comprobantes emitidos`} icon={<ShoppingBag size={19} />} tone="orange" />
            <MetricCard title="Ventas del mes" value={formatMoney(data.ventasMes.total)} detail={`${data.ventasMes.cantidad} ventas · ticket ${formatMoney(data.ventasMes.ticketPromedio)}`} icon={<CircleDollarSign size={19} />} tone="green" />
            <MetricCard title="Saldo en cuenta corriente" value={formatMoney(data.cuentasCorrientes.saldoTotal)} detail={`${data.cuentasCorrientes.clientesConSaldo} clientes con saldo`} icon={<CreditCard size={19} />} tone="gold" />
            <MetricCard title="Productos bajo mínimo" value={String(data.productosBajoMinimo)} detail="Revisá el stock disponible" icon={<Boxes size={19} />} tone="blue" />
          </div>
          <div className="chart-grid">
            <Panel title="Ventas diarias (últimos 30 días)" detail="Importes en pesos" className="chart-panel">
              {data.ventasUltimos30Dias.length ? <div className="line-chart"><Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatMoney(Number(context.raw)) } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: "#89938d", font: { size: 10 } }, border: { display: false } }, y: { beginAtZero: true, grid: { color: "#eef0ec" }, ticks: { color: "#89938d", font: { size: 10 }, callback: (value) => `$${Number(value) >= 1000000 ? `${(Number(value) / 1000000).toFixed(1)}m` : Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)}k` : value}` }, border: { display: false } } } }} /></div> : <div className="chart-empty">Todavía no hay ventas para mostrar.</div>}
            </Panel>
            <Panel title="Ventas por medio de pago" detail="Distribución del mes actual" className="chart-panel payment-panel">
              {Object.values(data.ventasMesPorFormaPago).some(Boolean) ? <div className="donut-wrap"><div className="donut-chart"><Doughnut data={paymentData} options={{ responsive: true, maintainAspectRatio: false, cutout: "76%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.label}: ${formatMoney(Number(context.raw))}` } } } }} /></div><div className="donut-legend">{paymentData.labels.map((label, index) => <div key={label}><span className="legend-dot" style={{ backgroundColor: paymentData.datasets[0].backgroundColor[index] }} /><span>{label}</span><strong>{formatMoney(paymentData.datasets[0].data[index])}</strong></div>)}</div></div> : <div className="chart-empty">Todavía no hay ventas para mostrar.</div>}
            </Panel>
          </div>
          <div className="insight-strip">
            <div className="insight-icon"><UsersRound size={20} /></div>
            <div><strong>Seguimiento de clientes</strong><span>Tenés {data.cuentasCorrientes.clientesConSaldo} clientes con saldo pendiente en cuenta corriente.</span></div>
            <span className="insight-emphasis">{formatMoney(data.cuentasCorrientes.saldoTotal)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, detail, icon, tone }: { title: string; value: string; detail: string; icon: React.ReactNode; tone: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{title}</span><span className={`metric-icon metric-${tone}`}>{icon}</span></div><strong className="metric-value">{value}</strong><div className="metric-detail">{detail}</div></div>;
}
