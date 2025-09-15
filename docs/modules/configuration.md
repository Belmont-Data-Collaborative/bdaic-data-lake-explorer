# Configuration Module Documentation

## Overview
The Data Lake Explorer uses a comprehensive configuration system built around TypeScript, Vite, and modern development tools. This document outlines the configuration architecture and key settings.

## Core Configuration Files

### TypeScript Configuration (`tsconfig.json`)
**Purpose**: TypeScript compiler configuration for the entire project

**Key Features:**
- Modern ES2022 target with strict type checking
- Path aliases for clean imports (`@/`, `@shared/`, `@assets/`)
- DOM and WebWorker library inclusion
- Strict null checks and unused local/parameter detection

**Path Mapping:**
```json
{
  "paths": {
    "@/*": ["./client/src/*"],
    "@shared/*": ["./shared/*"],
    "@assets/*": ["./attached_assets/*"]
  }
}
```

### Vite Configuration (`vite.config.ts`)
**Purpose**: Frontend build tool configuration with backend integration

**Configuration Structure (exact from vite.config.ts):**
```typescript
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
```

**Integration with Express Backend:**
- Development: Uses `server/vite.ts` for HMR and development serving
- Production: Serves static files from `dist/public`
- Single port (5000) serves both API and frontend

### PostCSS Configuration (`postcss.config.js`)
**Purpose**: CSS processing pipeline configuration

**Plugins:**
- **Tailwind CSS**: Utility-first CSS framework
- **Autoprefixer**: Automatic vendor prefix addition

### Tailwind CSS Configuration (`tailwind.config.ts`)
**Purpose**: Comprehensive utility-first CSS framework setup

**Key Features (verified implementation):**
```typescript
export default {
  darkMode: ["class"], // Class-based dark mode toggling
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        // Complete shadcn/ui design system with CSS variables
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          // ... additional sidebar variants
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
```

**Design System:**
- CSS custom properties for theme variables
- Dark mode support with `.dark` class
- Accordion animations with Radix UI integration
- Typography plugin for rich text content
- Complete color palette with semantic naming

### Package Configuration (`package.json`)
**Purpose**: Project dependencies and scripts management

**Key Scripts:**
- `dev`: Development server with concurrent frontend/backend
- `build`: Production build process
- `db:push`: Database schema synchronization
- `db:studio`: Drizzle Studio for database management

**Dependencies Architecture:**
- **Frontend**: React, TanStack Query, Wouter, shadcn/ui
- **Backend**: Express, Drizzle ORM, JWT authentication
- **Shared**: AWS SDK, OpenAI, TypeScript tooling
- **Development**: Vite, ESBuild, TypeScript, Tailwind CSS

### Drizzle Configuration (`drizzle.config.ts`)
**Purpose**: Database ORM configuration

**Features:**
- PostgreSQL database connection
- Environment-based database URL
- Schema file location specification
- Migration management
- Development tools integration

**Note**: This file should not be modified as per project guidelines.

## Component Configuration (`components.json`)
**Purpose**: shadcn/ui component library configuration

**Settings:**
- **Style**: Default shadcn styling approach
- **TypeScript**: Full TypeScript support
- **Tailwind CSS**: Integration with utility classes
- **Aliases**: Component and utility path mapping
- **Utils**: Utility function location (`@/lib/utils`)

## Environment Configuration

### Development Environment
- **Node.js**: Modern JavaScript runtime
- **TypeScript**: Type safety across full stack
- **Vite**: Fast development and build tooling
- **Hot Reloading**: Instant feedback for development

### Database Configuration
- **PostgreSQL**: Primary database with Neon hosting
- **Connection**: Environment variable-based configuration
- **Migrations**: Drizzle-based schema management
- **Development Tools**: Drizzle Studio for database exploration

### AWS Integration
- **S3 SDK v3**: Modern AWS SDK integration
- **Environment Variables**: Secure credential management
- **Regional Configuration**: Flexible AWS region support

## Build and Deployment Configuration

### Production Build
- **Frontend**: Vite-optimized React bundle
- **Backend**: Node.js Express server
- **Assets**: Optimized static asset handling
- **TypeScript**: Compiled to optimized JavaScript

### Performance Optimization
- **Bundle Splitting**: Automatic code splitting
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and CSS optimization
- **Compression**: Built-in compression middleware

## Development Tools Configuration

### Code Quality
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement (implicit)
- **Prettier**: Code formatting (implicit through editor)

### Development Experience
- **HMR**: Hot module replacement for instant updates
- **Error Boundaries**: Enhanced error reporting
- **Source Maps**: Debug-friendly stack traces
- **Development Logging**: Comprehensive request/response logging

## Security Configuration

### Authentication
- **JWT**: Token-based authentication
- **Bcrypt**: Password hashing (implementation-dependent)
- **Session Management**: Secure session handling

### API Security
- **CORS**: Cross-origin request security
- **Rate Limiting**: Request throttling (planned)
- **Input Validation**: Zod-based request validation

## Configuration Best Practices

### Environment Variables
- **Development**: `.env.local` for local overrides
- **Production**: Platform-specific environment configuration
- **Security**: Never commit sensitive values to version control

### Type Safety
- **Shared Types**: Consistent interfaces between frontend/backend
- **Validation**: Runtime validation matching TypeScript types
- **Error Handling**: Type-safe error propagation

### Performance
- **Caching**: Multi-layer caching strategy
- **Database**: Optimized queries with connection pooling
- **Assets**: Static asset optimization and CDN-ready builds

## Troubleshooting Configuration Issues

### Common Issues
1. **Path Resolution**: Ensure TypeScript and Vite aliases match
2. **Environment Variables**: Verify VITE_ prefix for frontend variables
3. **Database Connection**: Check DATABASE_URL and permissions
4. **Build Errors**: Verify TypeScript compilation and dependency versions

### Debug Tools
- **Vite Inspector**: Development build analysis
- **Drizzle Studio**: Database schema and data exploration
- **Browser DevTools**: Frontend debugging and performance analysis
- **Server Logs**: Backend request and error tracking

This configuration system provides a robust foundation for development, testing, and production deployment while maintaining type safety and development experience quality.