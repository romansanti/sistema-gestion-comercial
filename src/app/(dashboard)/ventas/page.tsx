"use client";

import Link from "next/link";
import { Search, ShoppingCart, XCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Loading,
  PageHeader,
  Panel,
  SelectInput,
  TextInput,
} from "@/components/app-ui";
import { api, errorText, formatDate, formatMoney } from "@/components/data-client";
import { formatearNumeroFactura } from "@/lib/format";

type InvoiceItem = {
  id: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};
type Invoice = {
  id: number;
  puntoVenta: number;
  numero: number;
  fecha: string;
  cliente: string | null;
  usuario: string;
  total: number;
  formaPago: string;
  estado: "emitida" | "anulada";
};
type InvoiceDetail = Invoice & {
  nroDoc: string | null;
  tipoDoc: string | null;
  domicilio: string | null;
  montoRecibido: number | null;
  tarjetaTipo: string | null;
  tarjetaMarca: string | null;
  tarjetaUltimos4: string | null;
  motivoAnulacion: string | null;
  items: InvoiceItem[];
};
type InvoiceList = { items: Invoice[]; totalEmitido: number; cantidad: number };
type Customer = { id: number; nombre: string };
type UserOption = { id: number; nombre: string };

export default function SalesPage() {
  const [data, setData] = useState<InvoiceList>({ items: [], totalEmitido: 0, cantidad: 0 });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    desde: "",
    hasta: "",
    formaPago: "",
    estado: "",
    clienteId: "",
    usuarioId: "",
  });
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    Promise.all([
      api<InvoiceList>(`/api/facturas?${params}`),
      api<Customer[]>("/api/clientes"),
      api<{ rol: string }>("/api/auth/me"),
    ])
      .then(async ([invoiceRows, customerRows, session]) => {
        if (!active) return;
        setData(invoiceRows);
        setCustomers(customerRows);
        setIsAdmin(session.rol === "admin");
        if (session.rol === "admin") {
          const userRows = await api<UserOption[]>("/api/usuarios");
          if (active) setUsers(userRows);
        }
        setError("");
      })
      .catch((reason) => {
        if (active) setError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, refresh]);

  async function showInvoice(invoice: Invoice) {
    setBusy(true);
    setError("");
    try {
      setDetail(await api<InvoiceDetail>(`/api/facturas/${invoice.id}`));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvoice() {
    if (!detail) return;
    const reason = window.prompt(`Motivo para anular la factura ${formatearNumeroFactura(detail.puntoVenta, detail.numero)}:`);
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await api(`/api/facturas/${detail.id}/anular`, {
        method: "POST",
        body: JSON.stringify({ motivoAnulacion: reason.trim() }),
      });
      setDetail(null);
      setRefresh((value) => value + 1);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  function updateFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRefresh((value) => value + 1);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="GESTIÓN COMERCIAL"
        title="Ventas"
        description="Consultá comprobantes, medios de pago y estado de cada operación."
        action={<Link className="button button-primary" href="/ventas/nueva"><ShoppingCart size={17} /> Nueva venta</Link>}
      />
      {error && <ErrorBanner message={error} />}
      <div className="tab-bar">
        <Link className="tab-active" href="/ventas"><ShoppingCart size={16} /> Facturas</Link>
        <Link href="/ventas/nueva">+ Nueva venta</Link>
      </div>
      <div className="sales-summary">
        <div><span>Total facturado emitido</span><strong>{formatMoney(data.totalEmitido)}</strong></div>
        <div><span>Comprobantes encontrados</span><strong>{data.cantidad}</strong></div>
      </div>
      <Panel className="table-panel">
        <form className="table-toolbar" onSubmit={updateFilter}>
          <div className="search-field"><Search size={17} /><TextInput aria-label="Buscar venta" placeholder="Buscar por cliente o número..." value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></div>
          <TextInput aria-label="Fecha desde" type="date" value={filters.desde} onChange={(event) => setFilters({ ...filters, desde: event.target.value })} />
          <TextInput aria-label="Fecha hasta" type="date" value={filters.hasta} onChange={(event) => setFilters({ ...filters, hasta: event.target.value })} />
          <SelectInput aria-label="Forma de pago" value={filters.formaPago} onChange={(event) => setFilters({ ...filters, formaPago: event.target.value })}><option value="">Todos los medios</option><option value="contado">Contado</option><option value="tarjeta">Tarjeta</option><option value="cuenta_corriente">Cuenta corriente</option></SelectInput>
          <SelectInput aria-label="Estado" value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })}><option value="">Todos los estados</option><option value="emitida">Emitidas</option><option value="anulada">Anuladas</option></SelectInput>
          <SelectInput aria-label="Cliente" value={filters.clienteId} onChange={(event) => setFilters({ ...filters, clienteId: event.target.value })}><option value="">Todos los clientes</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.nombre}</option>)}</SelectInput>
          {isAdmin && <SelectInput aria-label="Vendedor" value={filters.usuarioId} onChange={(event) => setFilters({ ...filters, usuarioId: event.target.value })}><option value="">Todos los vendedores</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nombre}</option>)}</SelectInput>}
          <Button type="submit" variant="secondary">Filtrar</Button>
        </form>
        {loading ? <Loading label="Cargando ventas..." /> : data.items.length === 0 ? <EmptyState title="No hay ventas para mostrar" detail="Probá cambiar los filtros o registrá una nueva venta." /> : (
          <div className="table-scroll"><table><thead><tr><th>Número</th><th>Fecha</th><th>Comprador</th><th>Vendedor</th><th>Forma de pago</th><th>Estado</th><th>Total</th><th>Comprobante</th></tr></thead>
            <tbody>{data.items.map((invoice) => <tr key={invoice.id}>
              <td><strong className="table-primary">{formatearNumeroFactura(invoice.puntoVenta, invoice.numero)}</strong></td>
              <td>{formatDate(invoice.fecha)}</td><td>{invoice.cliente ?? <span className="muted">Consumidor final</span>}</td><td>{invoice.usuario}</td><td><span className="payment-tag">{paymentLabel(invoice.formaPago)}</span></td>
              <td><span className={`tag ${invoice.estado === "emitida" ? "tag-green" : "tag-red"}`}>{invoice.estado === "emitida" ? "Emitida" : "Anulada"}</span></td><td className="table-amount">{formatMoney(invoice.total)}</td>
              <td><Button size="small" variant="quiet" disabled={busy} onClick={() => void showInvoice(invoice)}>Comprobante</Button></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </Panel>
      {detail && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title">
        <div className="modal-heading"><div><span className="eyebrow">COMPROBANTE</span><h2 id="invoice-detail-title">{formatearNumeroFactura(detail.puntoVenta, detail.numero)}</h2></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setDetail(null)}>×</button></div>
        <div className="invoice-detail-meta"><span>Fecha: <strong>{formatDate(detail.fecha)}</strong></span><span>Cliente: <strong>{detail.cliente ?? "Consumidor final"}</strong></span><span>Vendedor: <strong>{detail.usuario}</strong></span><span>Pago: <strong>{paymentLabel(detail.formaPago)}</strong></span></div>
        <div className="table-scroll"><table><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead><tbody>{detail.items.map((item) => <tr key={item.id}><td>{item.descripcion}</td><td>{item.cantidad}</td><td>{formatMoney(item.precioUnitario)}</td><td>{formatMoney(item.subtotal)}</td></tr>)}</tbody></table></div>
        {detail.estado === "anulada" && <p className="hint-text">Anulada: {detail.motivoAnulacion}</p>}
        <div className="invoice-total"><span>Total</span><strong>{formatMoney(detail.total)}</strong></div>
        <div className="modal-actions">{isAdmin && detail.estado === "emitida" && <Button variant="danger" onClick={() => void cancelInvoice()} disabled={busy}><XCircle size={16} /> Anular factura</Button>}<Button variant="secondary" onClick={() => setDetail(null)}>Cerrar</Button></div>
      </div></div>}
    </div>
  );
}

function paymentLabel(value: string) {
  return value === "cuenta_corriente" ? "Cuenta corriente" : value === "tarjeta" ? "Tarjeta" : "Contado";
}
