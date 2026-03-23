# GitHub Profile & powERP README — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear un perfil de GitHub profesional tipo terminal para `scldrn` y un README completo para el repo `powERP`, orientados a recruiters con estilo Dark Tech.

**Architecture:** Tres entregables independientes: (1) nuevo repo `scldrn/scldrn` con README de perfil, (2) `README.md` en raíz del monorepo powERP, (3) actualización de metadata del repo powERP via GitHub CLI.

**Tech Stack:** GitHub Flavored Markdown · shields.io badges · github-readme-stats API · GitHub CLI (`gh`)

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `/Users/sam/Proyects/PowerApp/README.md` | Crear | README principal de powERP |
| `/tmp/scldrn-profile/README.md` | Crear + push | README de perfil GitHub |
| Repo `scldrn/scldrn` en GitHub | Crear via gh | Repositorio especial de perfil |
| Repo `scldrn/powERP` metadata | Actualizar | Descripción, topics, licencia |

---

## Task 1: README del repo powERP

**Files:**
- Create: `/Users/sam/Proyects/PowerApp/README.md`

- [ ] **Step 1: Crear el README en la raíz del monorepo**

Crear `/Users/sam/Proyects/PowerApp/README.md` con el siguiente contenido exacto:

```markdown
<div align="center">

<h1>⚡ powERP</h1>
<p><em>ERP · CRM · Field Operations Platform</em></p>

---

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

</div>

---

> Sistema ERP-CRM para gestionar vitrinas de accesorios electrónicos en consignación. Digitaliza el proceso completo: rutas de campo, conteo de inventario, cobros y reportes — reemplazando un proceso 100% manual para **200+ puntos de venta**.

---

## ✦ Características

| | Característica | Descripción |
|---|---|---|
| 📱 | **App de Campo (PWA)** | Ruta del día, inicio de visita, conteo de inventario y cálculo automático de ventas. Mobile-first. |
| 🖥️ | **Panel Administrativo** | Dashboard en tiempo real, gestión de rutas, vitrinas, productos y KPIs por colaboradora. |
| 📦 | **Inventario Doble** | Inventario central + por vitrina. Movimientos inmutables con stock desnormalizado via triggers PostgreSQL. |
| 🔐 | **Auth + RLS** | 5 roles (admin, colaboradora, supervisor, analista, compras) con políticas Row Level Security por tabla. |

---

## ✦ Stack

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Next.js 16 App Router · React 19 · TailwindCSS v4 · shadcn/ui |
| **Estado** | Zustand · TanStack React Query v5 |
| **Backend** | Supabase · PostgreSQL · Edge Functions (Deno) · Realtime websockets |
| **Auth** | Supabase Auth · JWT · Row Level Security |
| **Testing** | Playwright (e2e) |
| **Deploy** | Vercel · Supabase Cloud |

---

## ✦ Instalación local

### Prerequisitos

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (para Supabase local)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/scldrn/powERP.git
cd powERP

# 2. Instalar dependencias
cd erp-vitrinas
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Iniciar Supabase local
supabase start
supabase db reset   # Aplica todas las migraciones

# 5. Iniciar el servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:3000`.

| Servicio | URL |
|----------|-----|
| App | `http://localhost:3000` |
| Supabase Studio | `http://localhost:54323` |
| Supabase API | `http://localhost:54321` |

### Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
STORAGE_BUCKET_FOTOS=visitas-fotos
```

---

## ✦ Estructura del proyecto

```
powERP/
├── erp-vitrinas/              # Next.js app
│   ├── app/
│   │   ├── (admin)/admin/     # Panel administrativo → /admin/*
│   │   ├── (campo)/campo/     # App de campo (móvil) → /campo/*
│   │   └── login/             # Página de login pública
│   ├── components/
│   │   ├── ui/                # Componentes base (shadcn/ui)
│   │   ├── admin/             # Componentes del panel admin
│   │   └── campo/             # Componentes de la app de campo
│   ├── lib/
│   │   ├── supabase/          # Clientes Supabase + tipos generados
│   │   ├── hooks/             # Custom hooks (toda la lógica de datos)
│   │   └── validations/       # Schemas Zod
│   ├── supabase/
│   │   ├── migrations/        # Migraciones SQL versionadas
│   │   └── functions/         # Edge Functions (Deno)
│   └── tests/                 # Tests Playwright e2e
└── docs/                      # Documentación y planes de sprint
```

---

## ✦ Contribuir

1. Fork del repositorio
2. Crear rama: `git checkout -b feature/mi-mejora`
3. Commit con convención semántica: `feat:`, `fix:`, `chore:`, `docs:`
4. Push y abrir Pull Request hacia `main`

---

## ✦ Licencia

Distribuido bajo licencia [MIT](LICENSE).
```

- [ ] **Step 2: Verificar que el archivo existe**

```bash
ls -la /Users/sam/Proyects/PowerApp/README.md
```

Expected: el archivo aparece en el listado.

- [ ] **Step 3: Commit**

```bash
cd /Users/sam/Proyects/PowerApp
git add README.md
git commit -m "docs: agregar README principal de powERP con stack, features e instalación"
```

---

## Task 2: Actualizar metadata del repo powERP en GitHub

**Files:** (solo configuración remota via GitHub CLI)

- [ ] **Step 1: Actualizar descripción y topics**

```bash
gh repo edit scldrn/powERP \
  --description "ERP-CRM para gestionar vitrinas de accesorios electrónicos en 200+ puntos de venta — Next.js · Supabase · TypeScript" \
  --add-topic erp \
  --add-topic crm \
  --add-topic nextjs \
  --add-topic supabase \
  --add-topic typescript \
  --add-topic react \
  --add-topic postgresql \
  --add-topic field-operations
```

Expected: comando completa sin error.

- [ ] **Step 2: Verificar que los cambios se aplicaron**

```bash
gh repo view scldrn/powERP --json description,repositoryTopics
```

Expected: JSON con la descripción y los 8 topics listados.

- [ ] **Step 3: Crear archivo LICENSE MIT en el repo**

Crear `/Users/sam/Proyects/PowerApp/LICENSE`:

```
MIT License

Copyright (c) 2026 Samuel Calderón

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Commit y push del README y LICENSE**

```bash
cd /Users/sam/Proyects/PowerApp
git add LICENSE
git commit -m "chore: agregar licencia MIT"
git push origin main
```

Expected: push exitoso, rama `main` actualizada en GitHub.

- [ ] **Step 5: Verificar en GitHub**

Abrir `https://github.com/scldrn/powERP` en el navegador.
Verificar: README renderizado, descripción visible, topics con etiquetas, badge de licencia MIT.

---

## Task 3: Crear repo de perfil GitHub (`scldrn/scldrn`)

**Files:**
- Create: `/tmp/scldrn-profile/README.md` (repo temporal local)

- [ ] **Step 1: Crear el repo especial de perfil en GitHub**

```bash
gh repo create scldrn/scldrn \
  --public \
  --description "GitHub Profile" \
  --confirm
```

Expected: URL del repo impresa — `https://github.com/scldrn/scldrn`.

Si el comando no tiene flag `--confirm` en tu versión de gh CLI, usa:
```bash
gh repo create scldrn --public --description "GitHub Profile"
```

- [ ] **Step 2: Clonar el repo vacío**

```bash
cd /tmp
git clone https://github.com/scldrn/scldrn.git scldrn-profile
cd scldrn-profile
```

- [ ] **Step 3: Crear el README de perfil**

Crear `/tmp/scldrn-profile/README.md` con el siguiente contenido exacto:

````markdown
<div align="center">

```bash
samuel@github:~$ whoami
> Samuel Calderón — Full-Stack Developer
> Medellín, Colombia 🇨🇴  ·  open to work ✅

samuel@github:~$ cat about.txt
> Construyo sistemas web robustos con arquitectura limpia.
> Especializado en ERP/CRM, apps móviles y APIs REST.
> Me obsesiona el detalle: UX, performance y seguridad.

samuel@github:~$ skills --verbose
```

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=flat-square&logo=react&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)

```bash
samuel@github:~$ ls projects/
> powERP/      — ERP-CRM para vitrinas de accesorios · Next.js + Supabase
> rentaclara/  — Sistema de gestión de arriendos

samuel@github:~$ cat contact.md
> 📧  samuelcalderon.dev@gmail.com
> 🐦  @scldrn_  (Twitter/X)
> 📍  Medellín, Colombia
```

---

![GitHub Stats](https://github-readme-stats.vercel.app/api?username=scldrn&theme=github_dark&show_icons=true&hide_border=true&count_private=true&include_all_commits=true)
![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=scldrn&theme=github_dark&hide_border=true&layout=compact&langs_count=6)

</div>
````

- [ ] **Step 4: Commit y push**

```bash
cd /tmp/scldrn-profile
git add README.md
git commit -m "feat: perfil GitHub con terminal interactivo y stats dinámicas"
git push origin main
```

Expected: push exitoso.

- [ ] **Step 5: Verificar el perfil en GitHub**

Abrir `https://github.com/scldrn` en el navegador.
Verificar que el README del perfil aparece en la página principal con:
- Bloque terminal con los comandos y salidas
- Badges de tecnología renderizados con colores
- Tarjetas de GitHub Stats con tema oscuro

**Nota:** Las tarjetas de GitHub Stats pueden tardar unos minutos en cargar datos la primera vez. Si aparecen vacías, esperar 5 minutos y recargar.
