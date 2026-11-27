"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { formatearMoneda } from "@/lib/format";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip,
);

type FormaPago = "contado" | "tarjeta" | "cuenta_corriente";

const etiquetasFormaPago: Record<FormaPago, string> = {
  contado: "Efectivo",
  tarjeta: "Tarjeta",
  cuenta_corriente: "Cuenta corriente",
};

const coloresFormaPago = ["#f59e0b", "#38bdf8", "#a78bfa"];

function diaMes(fecha: string): string {
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}`;
}

export function SalesCharts({
  salesByDay,
  salesByPayment,
  loading,
}: {
  salesByDay: Array<{ fecha: string; total: number }>;
  salesByPayment: Array<{
    formaPago: FormaPago;
    cantidad: number;
    total: number;
  }>;
  loading: boolean;
}) {
  const dailyData: ChartData<"bar"> = {
    labels: salesByDay.map(({ fecha }) => diaMes(fecha)),
    datasets: [
      {
        label: "Ventas",
        data: salesByDay.map(({ total }) => total),
        backgroundColor: "rgba(245, 158, 11, 0.75)",
        borderColor: "#f59e0b",
        borderRadius: 4,
      },
    ],
  };
  const paymentData: ChartData<"doughnut"> = {
    labels: salesByPayment.map(({ formaPago }) => etiquetasFormaPago[formaPago]),
    datasets: [
      {
        data: salesByPayment.map(({ total }) => total),
        backgroundColor: salesByPayment.map(
          (_, index) => coloresFormaPago[index % coloresFormaPago.length],
        ),
        borderColor: "#0f172a",
        borderWidth: 3,
      },
    ],
  };
  const dailyOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => formatearMoneda(Number(context.parsed.y ?? 0)),
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8", maxRotation: 0, autoSkip: true },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#94a3b8",
          callback: (value) => formatearMoneda(Number(value)),
        },
        grid: { color: "rgba(148, 163, 184, 0.12)" },
      },
    },
  };
  const paymentOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#cbd5e1", padding: 18 },
      },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.label}: ${formatearMoneda(Number(context.raw))}`,
        },
      },
    },
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div>
          <h2 className="font-semibold text-white">Ventas diarias · últimos 30 días</h2>
          <p className="mt-1 text-sm text-slate-400">Total facturado por fecha</p>
        </div>
        <div className="mt-5 h-64">
          {!loading && salesByDay.length > 0 && (
            <Bar data={dailyData} options={dailyOptions} />
          )}
          {loading && (
            <div className="h-full animate-pulse rounded-lg bg-slate-800" />
          )}
          {!loading && salesByDay.length === 0 && (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              No hay ventas en el período.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div>
          <h2 className="font-semibold text-white">Ventas por forma de pago</h2>
          <p className="mt-1 text-sm text-slate-400">Distribución de los últimos 30 días</p>
        </div>
        <div className="mt-5 h-64">
          {!loading && salesByPayment.length > 0 && (
            <Doughnut data={paymentData} options={paymentOptions} />
          )}
          {loading && (
            <div className="mx-auto h-56 w-56 animate-pulse rounded-full bg-slate-800" />
          )}
          {!loading && salesByPayment.length === 0 && (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              No hay ventas en el período.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
