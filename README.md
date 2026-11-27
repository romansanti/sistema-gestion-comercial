# Sistema de Gestión Comercial — Casa de Repuestos de Motos y Autos

Aplicación web full-stack para la gestión de mostrador (POS), catálogo de repuestos, control de stock con trazabilidad, cuenta corriente de talleres mecánicos, facturación y reportes de gestión.

## Tecnologías

- **Framework:** Next.js 16 (App Router + TypeScript)
- **Base de datos y ORM:** SQLite local / Turso (libSQL) + Drizzle ORM
- **Validaciones:** Zod
- **Autenticación:** Cookies de sesión `HttpOnly` firmadas con HMAC-SHA256 y contraseñas hasheadas con `bcryptjs`
- **Estilos e iconos:** Tailwind CSS y Lucide

## Funcionalidades

- Ventas de mostrador con control de existencias y datos de tarjeta limitados a marca, tipo y últimos cuatro dígitos.
- Catálogo, categorías, movimientos de inventario y alerta de stock crítico.
- Clientes, cuenta corriente, registro de pagos y recibos imprimibles.
- Consulta e impresión de facturas, con anulación administrativa y trazabilidad.
- Reportes administrativos de ventas, medios de pago, productos más vendidos, stock crítico y saldos deudores.

## Instalación y ejecución en local

Requisitos: Node.js 20.9 o posterior y pnpm. Si pnpm no está instalado, se puede habilitar mediante Corepack.

1. Cloná el repositorio e instalá las dependencias:

   ```bash
   git clone https://github.com/romansanti/sistema-gestion-comercial.git
   cd sistema-gestion-comercial
   corepack pnpm install
   ```

2. Creá un archivo `.env` en la raíz del proyecto:

   ```dotenv
   TURSO_DATABASE_URL="file:local.db"
   TURSO_AUTH_TOKEN=""
   SESSION_SECRET="un-secreto-largo-de-al-menos-16-caracteres"
   ```

   El archivo `.env` está excluido de Git. Usá un secreto propio de al menos 16 caracteres y no lo compartas.

3. Aplicá las migraciones y cargá los datos de prueba:

   ```bash
   corepack pnpm db:migrate
   corepack pnpm db:seed
   ```

   El seed recrea los datos de demostración y elimina los datos que ya existan en esas tablas. Usalo solamente en una base local de prueba o en una base Turso nueva.

4. Iniciá el servidor de desarrollo:

   ```bash
   corepack pnpm dev
   ```

   Abrí <http://localhost:3000> en el navegador.

## Credenciales de prueba

- **Administrador (Encargado):** `admin@repuestos.com` / `123456`
- **Vendedor (Mostrador):** `vendedor@repuestos.com` / `123456`

Son credenciales de demostración. Cambialas antes de usar el sistema con datos reales o exponerlo a usuarios externos.

## Base de datos en Turso

1. Iniciá sesión en [turso.tech](https://turso.tech) con GitHub y creá una base nueva, por ejemplo `repuestos-db`.
2. En la sección **Connect**, obtené:
   - `TURSO_DATABASE_URL`: URL con formato `libsql://...turso.io`.
   - `TURSO_AUTH_TOKEN`: token con permisos de lectura y escritura.
3. En PowerShell, cargá temporalmente esas variables y aplicá la migración y el seed:

   ```powershell
   $env:TURSO_DATABASE_URL = "libsql://tu-base-de-datos.turso.io"
   $env:TURSO_AUTH_TOKEN = "tu-token-de-turso"
   corepack pnpm db:migrate
   corepack pnpm db:seed
   Remove-Item Env:TURSO_DATABASE_URL
   Remove-Item Env:TURSO_AUTH_TOKEN
   ```

   El seed está pensado para una base vacía: elimina y vuelve a crear los datos de demostración. En **Tables / Data** deberían aparecer las nueve tablas del sistema y los datos de prueba.

## Publicación en Vercel

1. En [vercel.com](https://vercel.com), elegí **Add New → Project** e importá `romansanti/sistema-gestion-comercial`.
2. Antes de desplegar, configurá estas variables en **Environment Variables**:
   - `TURSO_DATABASE_URL`: URL de la base Turso.
   - `TURSO_AUTH_TOKEN`: token de Turso.
   - `SESSION_SECRET`: secreto único y largo, distinto del valor local y de al menos 16 caracteres.
3. Hacé clic en **Deploy**. Cuando finalice, abrí la URL de Vercel e iniciá sesión para probar el sistema.

No uses las credenciales de demostración en una instalación pública con datos reales. No agregues tokens ni secretos al repositorio.
