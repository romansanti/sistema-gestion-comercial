"use client";

import { CreditCard, Plus, Search, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button, EmptyState, ErrorBanner, Field, Loading, PageHeader, Panel, SelectInput, StatusPill, TextInput } from "@/components/app-ui";
import { api, errorText, formatDate, formatMoney, moneyInput, moneyToCents } from "@/components/data-client";
import { notifyToast } from "@/components/toast";

type Customer = { id: number; tipoDoc: "DNI" | "CUIT"; nroDoc: string; nombre: string; domicilio: string | null; telefono: string | null; email: string | null; cuentaCorriente: boolean; limiteCredito: number | null; saldo: number; activo: boolean };
type AccountMove = { id: number; tipo: "debito" | "credito"; importe: number; fecha: string; descripcion: string };
type Payment = { id: number; numeroRecibo: string; fecha: string; importe: number; medio: string; observacion: string | null; usuario: string };

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const selectedId = useRef<number | null>(null);
  const [movements, setMovements] = useState<AccountMove[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [onlyBalance, setOnlyBalance] = useState(false);
  const [status, setStatus] = useState("activos");
  const [order, setOrder] = useState("nombre_asc");
  const [refresh, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [form, setForm] = useState({ tipoDoc: "DNI", nroDoc: "", nombre: "", domicilio: "", telefono: "", email: "", cuentaCorriente: false, limiteCredito: "" });
  const [paymentForm, setPaymentForm] = useState({ importe: "", medio: "efectivo", observacion: "" });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (onlyBalance) params.set("conSaldo", "true");
    if (status) params.set("estado", status);
    if (order) params.set("orden", order);
    api<Customer[]>(`/api/clientes?${params}`)
      .then((rows) => {
        if (!active) return;
        setCustomers(rows);
        setError("");
        if (selectedId.current !== null) {
          const latest = rows.find((customer) => customer.id === selectedId.current);
          if (!latest) selectedId.current = null;
          setSelected(latest ?? null);
        }
      })
      .catch((reason) => { if (active) setError(errorText(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, onlyBalance, status, order, refresh]);

  async function selectCustomer(customer: Customer) {
    selectedId.current = customer.id;
    setSelected(customer);
    setDetailLoading(true);
    setError("");
    try {
      const [moveRows, paymentRows] = await Promise.all([
        api<AccountMove[]>(`/api/clientes/${customer.id}/movimientos`),
        api<Payment[]>(`/api/clientes/${customer.id}/pagos`),
      ]);
      setMovements(moveRows);
      setPayments(paymentRows);
    } catch (reason) { const message = errorText(reason); setError(message); notifyToast(message, "error"); }
    finally { setDetailLoading(false); }
  }
  function openForm(customer?: Customer) {
    setEditCustomer(customer ?? null);
    setForm(customer ? {
      tipoDoc: customer.tipoDoc,
      nroDoc: customer.nroDoc,
      nombre: customer.nombre,
      domicilio: customer.domicilio ?? "",
      telefono: customer.telefono ?? "",
      email: customer.email ?? "",
      cuentaCorriente: customer.cuentaCorriente,
      limiteCredito: customer.limiteCredito === null ? "" : moneyInput(customer.limiteCredito),
    } : { tipoDoc: "DNI", nroDoc: "", nombre: "", domicilio: "", telefono: "", email: "", cuentaCorriente: false, limiteCredito: "" });
    setShowForm(true);
  }
  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      tipoDoc: form.tipoDoc,
      nroDoc: form.nroDoc.trim(),
      nombre: form.nombre.trim(),
      domicilio: form.domicilio.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      cuentaCorriente: form.cuentaCorriente,
      limiteCredito: form.cuentaCorriente && form.limiteCredito ? moneyToCents(form.limiteCredito) : null,
    };
    try {
      await api(editCustomer ? `/api/clientes/${editCustomer.id}` : "/api/clientes", { method: editCustomer ? "PUT" : "POST", body: JSON.stringify(body) });
      setShowForm(false);
      notifyToast(editCustomer ? "Cliente actualizado." : "Cliente creado.");
      setRefresh((value) => value + 1);
    } catch (reason) { const message = errorText(reason); setError(message); notifyToast(message, "error"); }
    finally { setSaving(false); }
  }
  async function toggleActive(customer: Customer) {
    try {
      await api(`/api/clientes/${customer.id}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !customer.activo }) });
      if (selectedId.current === customer.id && customer.activo) {
        selectedId.current = null;
        setSelected(null);
      }
      setRefresh((value) => value + 1);
    } catch (reason) { const message = errorText(reason); setError(message); notifyToast(message, "error"); }
  }
  async function registerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const payment = await api<{ numeroRecibo: string }>(`/api/clientes/${selected.id}/pagos`, { method: "POST", body: JSON.stringify({ importe: moneyToCents(paymentForm.importe), medio: paymentForm.medio, observacion: paymentForm.observacion || undefined }) });
      notifyToast(`Pago registrado. Recibo ${payment.numeroRecibo}`);
      setShowPayment(false);
      setPaymentForm({ importe: "", medio: "efectivo", observacion: "" });
      setRefresh((value) => value + 1);
      await selectCustomer(selected);
    } catch (reason) { const message = errorText(reason); setError(message); notifyToast(message, "error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="RELACIONES COMERCIALES" title="Clientes" description="Gestioná datos de contacto, saldos y pagos de tus clientes." action={<Button onClick={() => openForm()}><Plus size={17} /> Nuevo cliente</Button>} />
      {error && <ErrorBanner message={error} />}
      <div className="tab-bar"><button type="button" className={!onlyBalance ? "tab-active" : ""} onClick={() => setOnlyBalance(false)}>Listado</button><button type="button" className={onlyBalance ? "tab-active" : ""} onClick={() => setOnlyBalance(true)}>Saldos</button></div>
      <div className={`client-workspace ${selected ? "client-workspace-selected" : ""}`}>
        <Panel className="table-panel client-list-panel">
          <div className="table-toolbar client-toolbar">
            <div className="search-field"><Search size={17} /><TextInput placeholder="Buscar por nombre o documento..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <SelectInput aria-label="Ordenar clientes" value={order} onChange={(event) => setOrder(event.target.value)}><option value="nombre_asc">Nombre A-Z</option><option value="nombre_desc">Nombre Z-A</option></SelectInput>
            <SelectInput aria-label="Estado del cliente" value={status} onChange={(event) => setStatus(event.target.value)}><option value="activos">Solo activos</option><option value="">Todos</option><option value="inactivos">Solo inactivos</option></SelectInput>
          </div>
          {loading ? <Loading label="Cargando clientes..." /> : customers.length === 0 ? <EmptyState title="No se encontraron clientes" detail="Probá con otra búsqueda o agregá un cliente." /> : <div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Documento</th><th>Saldo</th><th>Estado</th><th /></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className={selected?.id === customer.id ? "selected-row" : ""}>
            <td><button className="table-link" onClick={() => void selectCustomer(customer)}><strong>{customer.nombre}</strong><small>{customer.telefono || customer.email || "Ver detalle"}</small></button></td><td>{customer.tipoDoc} {customer.nroDoc}</td><td className={customer.saldo > 0 ? "table-amount balance-due" : "table-amount"}>{formatMoney(customer.saldo)}</td><td><StatusPill active={customer.activo}>{customer.activo ? "Activo" : "Inactivo"}</StatusPill></td><td><Button size="small" variant="quiet" onClick={() => openForm(customer)}>Editar</Button></td>
          </tr>)}</tbody></table></div>}
        </Panel>
        {selected && <Panel className="client-detail-panel">
          <div className="client-detail-heading"><div><span className="eyebrow">FICHA DE CLIENTE</span><h2>{selected.nombre}</h2><p>{selected.tipoDoc} {selected.nroDoc}</p></div><button type="button" className="icon-button" aria-label="Cerrar detalle" onClick={() => setSelected(null)}><X size={18} /></button></div>
          <div className="client-balance-card"><span>Saldo en cuenta corriente</span><strong>{formatMoney(selected.saldo)}</strong><small>{selected.cuentaCorriente ? `Límite ${selected.limiteCredito ? formatMoney(selected.limiteCredito) : "sin límite configurado"}` : "Cuenta corriente no habilitada"}</small></div>
          <div className="client-contact"><div><span>Teléfono</span><strong>{selected.telefono || "Sin teléfono"}</strong></div><div><span>Correo</span><strong>{selected.email || "Sin correo"}</strong></div><div><span>Domicilio</span><strong>{selected.domicilio || "Sin domicilio"}</strong></div></div>
          <div className="client-detail-actions"><Button size="small" variant="secondary" onClick={() => openForm(selected)}>Editar datos</Button><Button size="small" variant="quiet" onClick={() => void toggleActive(selected)}>{selected.activo ? "Desactivar cliente" : "Activar cliente"}</Button>{selected.cuentaCorriente && <Button size="small" onClick={() => setShowPayment(true)}><CreditCard size={15} /> Registrar pago</Button>}</div>
          <div className="detail-subhead"><strong>Movimientos de cuenta</strong><span>{movements.length}</span></div>
          {detailLoading ? <Loading label="Cargando movimientos..." /> : movements.length ? <div className="movement-list">{movements.slice(0, 8).map((move) => <div className="movement-item" key={move.id}><span className={`movement-symbol ${move.tipo === "debito" ? "movement-debit" : "movement-credit"}`}>{move.tipo === "debito" ? "+" : "−"}</span><div><strong>{move.descripcion}</strong><small>{formatDate(move.fecha)}</small></div><strong className={move.tipo === "debito" ? "balance-due" : "balance-credit"}>{move.tipo === "debito" ? "+" : "−"}{formatMoney(move.importe)}</strong></div>)}</div> : <EmptyState title="Sin movimientos de cuenta" />}
          <div className="detail-subhead"><strong>Pagos recibidos</strong><span>{payments.length}</span></div>
          {payments.length ? <div className="movement-list">{payments.slice(0, 5).map((payment) => <div className="movement-item" key={payment.id}><span className="movement-symbol movement-credit"><CreditCard size={15} /></span><div><strong>Recibo {payment.numeroRecibo}</strong><small>{formatDate(payment.fecha)} · {payment.medio}</small></div><strong className="balance-credit">{formatMoney(payment.importe)}</strong></div>)}</div> : <p className="hint-text">Los pagos registrados aparecerán acá.</p>}
        </Panel>}
      </div>
      {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="client-modal-title"><div className="modal-heading"><div><span className="eyebrow">CLIENTES</span><h2 id="client-modal-title">{editCustomer ? "Editar cliente" : "Nuevo cliente"}</h2></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setShowForm(false)}><X size={19} /></button></div><form className="form-grid" onSubmit={saveCustomer}><Field label="Nombre completo"><TextInput required minLength={2} maxLength={120} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></Field><div className="field-pair"><Field label="Tipo de documento"><SelectInput value={form.tipoDoc} onChange={(event) => setForm({ ...form, tipoDoc: event.target.value })}><option value="DNI">DNI</option><option value="CUIT">CUIT</option></SelectInput></Field><Field label="Número"><TextInput required minLength={5} maxLength={20} value={form.nroDoc} onChange={(event) => setForm({ ...form, nroDoc: event.target.value })} /></Field></div><Field label="Domicilio"><TextInput maxLength={200} value={form.domicilio} onChange={(event) => setForm({ ...form, domicilio: event.target.value })} /></Field><div className="field-pair"><Field label="Teléfono"><TextInput maxLength={40} value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} /></Field><Field label="Correo electrónico"><TextInput type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field></div><label className="checkbox-field"><input type="checkbox" checked={form.cuentaCorriente} onChange={(event) => setForm({ ...form, cuentaCorriente: event.target.checked })} /><span>Habilitar cuenta corriente</span></label>{form.cuentaCorriente && <Field label="Límite de crédito ($, opcional)"><TextInput type="number" min={0} step="0.01" value={form.limiteCredito} onChange={(event) => setForm({ ...form, limiteCredito: event.target.value })} /></Field>}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button><Button disabled={saving}>{saving ? "Guardando..." : editCustomer ? "Guardar cambios" : "Crear cliente"}</Button></div></form></div></div>}
      {showPayment && selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPayment(false); }}><div className="modal-card modal-card-narrow" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title"><div className="modal-heading"><div><span className="eyebrow">CUENTA CORRIENTE</span><h2 id="payment-modal-title">Registrar pago</h2><p>{selected.nombre} · saldo {formatMoney(selected.saldo)}</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setShowPayment(false)}><X size={19} /></button></div><form className="form-grid" onSubmit={registerPayment}><Field label="Importe ($)"><TextInput required type="number" min={0.01} step="0.01" value={paymentForm.importe} onChange={(event) => setPaymentForm({ ...paymentForm, importe: event.target.value })} /></Field><Field label="Medio de pago"><SelectInput value={paymentForm.medio} onChange={(event) => setPaymentForm({ ...paymentForm, medio: event.target.value })}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta_debito">Tarjeta de débito</option></SelectInput></Field><Field label="Observación (opcional)"><TextInput maxLength={500} value={paymentForm.observacion} onChange={(event) => setPaymentForm({ ...paymentForm, observacion: event.target.value })} /></Field><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShowPayment(false)}>Cancelar</Button><Button disabled={saving}>{saving ? "Registrando..." : "Confirmar pago"}</Button></div></form></div></div>}
    </div>
  );
}
