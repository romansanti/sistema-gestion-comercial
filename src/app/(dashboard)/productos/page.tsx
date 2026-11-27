"use client";

import { Boxes, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button, EmptyState, ErrorBanner, Field, Loading, PageHeader, Panel, SelectInput, StatusPill, TextInput } from "@/components/app-ui";
import { api, errorText, formatDate, formatMoney, moneyInput, moneyToCents, type SessionUser } from "@/components/data-client";

type Product = { id: number; codigo: string; descripcion: string; categoriaId: number; categoria: string; precio: number; existencia: number; stockMinimo: number; activo: boolean };
type Category = { id: number; nombre: string; activa: boolean };
type Movement = { id: number; producto?: string; productoId?: number; tipo: string; cantidad: number; existenciaResultante: number; motivo: string; usuario?: string; fecha: string };
type Tab = "catalogo" | "movimientos" | "categorias";

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("catalogo");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [productState, setProductState] = useState("activos");
  const [refresh, setRefresh] = useState(0);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [showProduct, setShowProduct] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailMovements, setDetailMovements] = useState<Movement[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [stockForm, setStockForm] = useState({ tipo: "ingreso", cantidad: "", motivo: "", observacion: "" });
  const [productForm, setProductForm] = useState({ codigo: "", descripcion: "", categoriaId: "", precio: "", existencia: "", stockMinimo: "0" });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (categoryId) params.set("categoriaId", categoryId);
    if (lowOnly) params.set("bajoMinimo", "true");
    if (productState) params.set("estado", productState);
    Promise.all([
      api<Product[]>(`/api/productos?${params}`),
      api<Category[]>("/api/categorias"),
      api<Movement[]>("/api/stock/movimientos?limit=100"),
      api<SessionUser>("/api/auth/me"),
    ])
      .then(([productRows, categoryRows, movementRows, session]) => {
        if (!active) return;
        setProducts(productRows);
        setCategories(categoryRows);
        setMovements(movementRows);
        setUser(session);
        setError("");
      })
      .catch((reason) => { if (active) setError(errorText(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, categoryId, lowOnly, productState, refresh]);

  function openProduct(product?: Product) {
    setEditProduct(product ?? null);
    setProductForm(product ? {
      codigo: product.codigo,
      descripcion: product.descripcion,
      categoriaId: String(product.categoriaId),
      precio: moneyInput(product.precio),
      existencia: String(product.existencia),
      stockMinimo: String(product.stockMinimo),
    } : { codigo: "", descripcion: "", categoriaId: "", precio: "", existencia: "0", stockMinimo: "0" });
    setShowProduct(true);
  }
  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const body = {
      codigo: productForm.codigo.trim(),
      descripcion: productForm.descripcion.trim(),
      categoriaId: Number(productForm.categoriaId),
      precio: moneyToCents(productForm.precio),
      existencia: Number(productForm.existencia || 0),
      stockMinimo: Number(productForm.stockMinimo),
    };
    try {
      await api(editProduct ? `/api/productos/${editProduct.id}` : "/api/productos", { method: editProduct ? "PUT" : "POST", body: JSON.stringify(body) });
      setShowProduct(false);
      setRefresh((value) => value + 1);
    } catch (reason) { setError(errorText(reason)); }
    finally { setSaving(false); }
  }
  async function toggleProduct(product: Product) {
    try {
      await api(`/api/productos/${product.id}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !product.activo }) });
      setRefresh((value) => value + 1);
    } catch (reason) { setError(errorText(reason)); }
  }
  async function saveMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockProduct) return;
    setSaving(true);
    try {
      await api(`/api/productos/${stockProduct.id}/movimientos`, { method: "POST", body: JSON.stringify({ tipo: stockForm.tipo, cantidad: Number(stockForm.cantidad), motivo: stockForm.motivo, observacion: stockForm.observacion || undefined }) });
      setStockProduct(null);
      setStockForm({ tipo: "ingreso", cantidad: "", motivo: "", observacion: "" });
      setRefresh((value) => value + 1);
    } catch (reason) { setError(errorText(reason)); }
    finally { setSaving(false); }
  }
  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/api/categorias", { method: "POST", body: JSON.stringify({ nombre: categoryName.trim() }) });
      setCategoryName("");
      setRefresh((value) => value + 1);
    } catch (reason) { setError(errorText(reason)); }
    finally { setSaving(false); }
  }
  async function toggleCategory(category: Category) {
    try {
      await api(`/api/categorias/${category.id}/estado`, { method: "PATCH", body: JSON.stringify({ activo: !category.activa }) });
      setRefresh((value) => value + 1);
    } catch (reason) { setError(errorText(reason)); }
  }
  async function openDetail(product: Product) {
    setDetailProduct(product);
    setDetailMovements([]);
    try {
      setDetailMovements(await api<Movement[]>(`/api/productos/${product.id}/movimientos`));
    } catch (reason) { setError(errorText(reason)); }
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="INVENTARIO" title="Productos" description="Administrá el catálogo, los niveles de stock y las categorías." action={user?.rol === "admin" && tab === "catalogo" ? <Button onClick={() => openProduct()}><Plus size={17} /> Nuevo producto</Button> : undefined} />
      {error && <ErrorBanner message={error} />}
      <div className="tab-bar" role="tablist" aria-label="Secciones de productos">
        <button type="button" className={tab === "catalogo" ? "tab-active" : ""} onClick={() => setTab("catalogo")}><Boxes size={16} /> Catálogo <span>{products.length}</span></button>
        <button type="button" className={tab === "movimientos" ? "tab-active" : ""} onClick={() => setTab("movimientos")}>Movimientos</button>
        <button type="button" className={tab === "categorias" ? "tab-active" : ""} onClick={() => setTab("categorias")}>Categorías <span>{categories.length}</span></button>
      </div>
      {loading ? <Loading label="Cargando inventario..." /> : tab === "catalogo" ? (
        <Panel className="table-panel">
          <div className="table-toolbar">
            <div className="search-field"><Search size={17} /><TextInput placeholder="Buscar por código o descripción..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <SelectInput aria-label="Filtrar por categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</SelectInput>
            <label className="check-filter"><input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} /> Bajo mínimo</label>
            <SelectInput aria-label="Estado del catálogo" value={productState} onChange={(event) => setProductState(event.target.value)}><option value="activos">Solo activos</option><option value="">Todos</option><option value="inactivos">Solo inactivos</option></SelectInput>
            <span className="table-toolbar-note"><SlidersHorizontal size={15} /> {products.length} productos</span>
          </div>
          {products.length === 0 ? <EmptyState title="No hay productos" detail="Probá con otra búsqueda o agregá el primer producto." /> : <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Existencia</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{products.map((product) => <tr key={product.id}>
            <td><strong className="table-primary">{product.descripcion}</strong><small className="table-secondary">Código {product.codigo}</small></td><td>{product.categoria}</td><td className="table-amount">{formatMoney(product.precio)}</td><td><span className={product.existencia <= product.stockMinimo ? "stock-low" : ""}>{product.existencia} un.</span><small className="table-secondary">Mínimo: {product.stockMinimo}</small></td><td><StatusPill active={product.activo}>{product.activo ? "Activo" : "Inactivo"}</StatusPill></td>
            <td><div className="row-actions"><Button size="small" variant="quiet" onClick={() => void openDetail(product)}>Ficha</Button><Button size="small" variant="quiet" disabled={!product.activo} onClick={() => setStockProduct(product)}>Ingreso / egreso</Button>{user?.rol === "admin" && <><Button size="small" variant="quiet" onClick={() => openProduct(product)}>Editar</Button><Button size="small" variant="quiet" onClick={() => void toggleProduct(product)}>{product.activo ? "Desactivar" : "Activar"}</Button></>}</div></td>
          </tr>)}</tbody></table></div>}
        </Panel>
      ) : tab === "movimientos" ? (
        <Panel title="Historial de stock" detail="Últimos movimientos registrados">
          {movements.length === 0 ? <EmptyState title="No hay movimientos registrados" /> : <div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Resultado</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>{movements.map((item) => <tr key={item.id}><td>{formatDate(item.fecha)}</td><td>{item.producto ?? `Producto #${item.productoId}`}</td><td><span className={`tag ${item.tipo === "ingreso" ? "tag-green" : item.tipo === "egreso" ? "tag-red" : "tag-gray"}`}>{item.tipo}</span></td><td>{item.cantidad}</td><td>{item.existenciaResultante}</td><td>{item.motivo}</td><td>{item.usuario ?? "—"}</td></tr>)}</tbody></table></div>}
        </Panel>
      ) : (
        <div className="category-layout">
          <Panel title="Categorías" detail="Organizá tu catálogo por rubro">
            {categories.length === 0 ? <EmptyState title="Todavía no hay categorías" /> : <div className="category-list">{categories.map((category) => <div className="category-row" key={category.id}><span className="category-initial">{category.nombre.slice(0, 1)}</span><strong>{category.nombre}</strong><StatusPill active={category.activa}>{category.activa ? "Activa" : "Inactiva"}</StatusPill>{user?.rol === "admin" && <Button size="small" variant="quiet" onClick={() => void toggleCategory(category)}>{category.activa ? "Desactivar" : "Activar"}</Button>}</div>)}</div>}
          </Panel>
          {user?.rol === "admin" && <Panel title="Nueva categoría" detail="Las categorías ayudan a encontrar productos rápidamente."><form className="inline-form" onSubmit={addCategory}><Field label="Nombre"><TextInput required minLength={2} maxLength={120} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ej. Accesorios" /></Field><Button disabled={saving}><Plus size={16} /> Agregar</Button></form></Panel>}
        </div>
      )}
      {showProduct && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowProduct(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><div className="modal-heading"><div><span className="eyebrow">CATÁLOGO</span><h2 id="product-modal-title">{editProduct ? "Editar producto" : "Nuevo producto"}</h2></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setShowProduct(false)}><X size={19} /></button></div><form className="form-grid" onSubmit={saveProduct}><Field label="Código"><TextInput required maxLength={40} value={productForm.codigo} onChange={(event) => setProductForm({ ...productForm, codigo: event.target.value })} /></Field><Field label="Descripción"><TextInput required minLength={2} maxLength={200} value={productForm.descripcion} onChange={(event) => setProductForm({ ...productForm, descripcion: event.target.value })} /></Field><Field label="Categoría"><SelectInput required value={productForm.categoriaId} onChange={(event) => setProductForm({ ...productForm, categoriaId: event.target.value })}><option value="">Seleccioná una categoría</option>{categories.filter((category) => category.activa).map((category) => <option value={category.id} key={category.id}>{category.nombre}</option>)}</SelectInput></Field><Field label="Precio ($)"><TextInput required type="number" min={0} step="0.01" value={productForm.precio} onChange={(event) => setProductForm({ ...productForm, precio: event.target.value })} /></Field>{!editProduct && <Field label="Existencia inicial"><TextInput type="number" min={0} step={1} value={productForm.existencia} onChange={(event) => setProductForm({ ...productForm, existencia: event.target.value })} /></Field>}<Field label="Stock mínimo"><TextInput required type="number" min={0} step={1} value={productForm.stockMinimo} onChange={(event) => setProductForm({ ...productForm, stockMinimo: event.target.value })} /></Field><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShowProduct(false)}>Cancelar</Button><Button disabled={saving}>{saving ? "Guardando..." : editProduct ? "Guardar cambios" : "Crear producto"}</Button></div></form></div></div>}
      {stockProduct && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setStockProduct(null); }}><div className="modal-card modal-card-narrow" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title"><div className="modal-heading"><div><span className="eyebrow">AJUSTE DE INVENTARIO</span><h2 id="stock-modal-title">Movimiento de stock</h2><p>{stockProduct.descripcion} · disponible: {stockProduct.existencia}</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setStockProduct(null)}><X size={19} /></button></div><form className="form-grid" onSubmit={saveMovement}><Field label="Tipo de movimiento"><SelectInput value={stockForm.tipo} onChange={(event) => setStockForm({ ...stockForm, tipo: event.target.value })}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></SelectInput></Field><Field label="Cantidad"><TextInput required type="number" min={1} step={1} value={stockForm.cantidad} onChange={(event) => setStockForm({ ...stockForm, cantidad: event.target.value })} /></Field><Field label="Motivo"><TextInput required minLength={2} maxLength={200} value={stockForm.motivo} onChange={(event) => setStockForm({ ...stockForm, motivo: event.target.value })} placeholder="Ej. Reposición de mercadería" /></Field><Field label="Observación (opcional)"><TextInput maxLength={500} value={stockForm.observacion} onChange={(event) => setStockForm({ ...stockForm, observacion: event.target.value })} /></Field><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setStockProduct(null)}>Cancelar</Button><Button disabled={saving}>{saving ? "Guardando..." : "Registrar movimiento"}</Button></div></form></div></div>}
      {detailProduct && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailProduct(null); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="product-detail-title"><div className="modal-heading"><div><span className="eyebrow">FICHA DE PRODUCTO</span><h2 id="product-detail-title">{detailProduct.descripcion}</h2><p>{detailProduct.codigo} · {detailProduct.categoria}</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setDetailProduct(null)}><X size={19} /></button></div><div className="product-detail-summary"><span>Precio <strong>{formatMoney(detailProduct.precio)}</strong></span><span>Existencia <strong>{detailProduct.existencia} un.</strong></span><span>Stock mínimo <strong>{detailProduct.stockMinimo} un.</strong></span></div><h3 className="detail-subhead">Movimientos recientes</h3>{detailMovements.length ? <div className="movement-list">{detailMovements.slice(0, 10).map((movement) => <div className="movement-item" key={movement.id}><span className={`movement-symbol ${movement.cantidad > 0 ? "movement-credit" : "movement-debit"}`}>{movement.cantidad > 0 ? "+" : "−"}</span><div><strong>{movement.motivo}</strong><small>{formatDate(movement.fecha)} · {movement.usuario ?? "Usuario"}</small></div><strong>{movement.cantidad > 0 ? "+" : ""}{movement.cantidad} un.</strong></div>)}</div> : <EmptyState title="Sin movimientos registrados" />}</div></div>}
    </div>
  );
}
