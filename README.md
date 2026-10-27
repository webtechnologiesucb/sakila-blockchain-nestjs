# 🔷 Integración Sakila Blockchain — Proyecto Educativo

> **Arquitectura Híbrida: MySQL (Sakila) + Ethereum (Ganache) + NestJS**
>
> Un proyecto educativo de nivel producción para estudiantes de Maestría en Ingeniería de Sistemas que enseña cómo integrar bases de datos relacionales tradicionales con tecnología blockchain.

---

## Tabla de Contenidos

1. [Diseño Didáctico](#1-diseño-didáctico)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Modelado de Datos](#3-modelado-de-datos)
4. [Implementación del Backend (NestJS)](#4-implementación-del-backend-nestjs)
5. [Contrato Inteligente (Solidity)](#5-contrato-inteligente-solidity)
6. [Integración Blockchain (ethers.js)](#6-integración-blockchain-ethersjs)
7. [Implementación de Pagos QR](#7-implementación-de-pagos-qr)
8. [Validación y Sincronización](#8-validación-y-sincronización)
9. [Pruebas](#9-pruebas)
10. [Despliegue Local](#10-despliegue-local)
11. [Análisis Académico](#11-análisis-académico)


---

## 🚀 Inicio Rápido — Para Ejecutar el Proyecto

```bash
# 1. Iniciar Ganache (blockchain local de Ethereum)
npx ganache --chain.chainId 1337 --wallet.deterministic

# 2. Ejecutar las migraciones de base de datos en tu BD MySQL/Sakila
mysql -u root -p sakila < database/migrations/001_create_payment_blockchain.sql
mysql -u root -p sakila < database/migrations/002_create_qr_payment_requests.sql

# 3. Compilar y desplegar el contrato inteligente en Ganache
npx hardhat compile
npx hardhat run contracts/scripts/deploy.ts --network ganache

# 4. Configurar las variables de entorno en .env
#    - Establecer PAYMENT_CONTRACT_ADDRESS=<dirección del paso 3>
#    - Establecer DB_PASSWORD=<tu contraseña de MySQL>
#    - Verificar que GANACHE_RPC_URL y GANACHE_CHAIN_ID coincidan con tu instancia de Ganache

# 5. Iniciar el servidor de desarrollo NestJS
npm run start:dev

# 6. Abrir la documentación API de Swagger
#    http://localhost:3000/api/docs
```

> **Nota:** Si usas **Ganache GUI** en lugar de CLI, actualiza `.env` con la configuración de tu Ganache GUI:
> - `GANACHE_RPC_URL=http://127.0.0.1:7545`
> - `GANACHE_CHAIN_ID=5777`

---

## 1. Diseño Didáctico

### 1.1 Objetivo General

Diseñar, implementar y evaluar una arquitectura de software híbrida que integre una base de datos relacional (MySQL/Sakila) con una red blockchain descentralizada (Ethereum/Ganache), utilizando NestJS como capa de integración del backend.

### 1.2 Objetivos Específicos

| # | Objetivo |
|---|----------|
| O1 | Comprender las diferencias fundamentales entre el almacenamiento de datos centralizado y descentralizado |
| O2 | Implementar un backend en NestJS con principios de Arquitectura Limpia (SOLID, diseño por capas) |
| O3 | Diseñar y desplegar un contrato inteligente en Solidity para el registro de pagos |
| O4 | Integrar ethers.js v6 con NestJS para la gestión de transacciones blockchain |
| O5 | Implementar flujos de pago basados en QR compatibles con billeteras MetaMask (EIP-681) |
| O6 | Construir un mecanismo de sincronización entre datos off-chain (MySQL) y on-chain (Ethereum) |
| O7 | Aplicar estrategias de pruebas de software (unitarias, integración, e2e) a un sistema híbrido |

### 1.3 Competencias a Desarrollar

- **Técnicas**: Desarrollo de contratos inteligentes, arquitectura backend TypeScript/NestJS, modelado de datos con TypeORM, interacción blockchain con ethers.js
- **Analíticas**: Evaluación de ventajas y desventajas entre arquitecturas centralizadas vs. descentralizadas
- **Diseño**: Arquitectura Limpia, principios SOLID, diseño modular de sistemas
- **Seguridad**: Firma de transacciones, gestión de billeteras, protección contra reentrada
- **Integración**: Orquestación multi-sistema (MySQL ↔ NestJS ↔ Ethereum)

### 1.4 Metodología de Enseñanza

Este proyecto utiliza **Aprendizaje Basado en Proyectos (ABP)** combinado con **andamiaje incremental**:

1. **Fase 1 — Fundamentos** (2 horas): Configurar el entorno, comprender el esquema Sakila, instalar Ganache
2. **Fase 2 — Contrato Inteligente** (2 horas): Escribir, compilar, probar y desplegar el contrato en Solidity
3. **Fase 3 — Backend Principal** (3 horas): Construir módulos, entidades, servicios y controladores de NestJS
4. **Fase 4 — Integración** (3 horas): Conectar ethers.js con NestJS, implementar pagos QR
5. **Fase 5 — Sincronización y Pruebas** (2 horas): Construir el servicio de sincronización, escribir pruebas unitarias y e2e
6. **Fase 6 — Análisis** (2 horas): Documentar hallazgos, evaluar la arquitectura, presentar resultados

### 1.5 Actividades de Laboratorio

| Lab | Título | Duración | Entregable |
|-----|--------|----------|------------|
| L1 | Configuración del Entorno y Exploración de Sakila | 90 min | Ganache ejecutándose + BD Sakila verificada |
| L2 | Desarrollo y Pruebas del Contrato Inteligente | 120 min | PaymentProcessor desplegado con pruebas pasando |
| L3 | CRUD de Pagos en NestJS con TypeORM | 120 min | API REST funcional para pagos de Sakila |
| L4 | Integración Blockchain mediante ethers.js | 120 min | Creación de pagos con registro on-chain |
| L5 | Generación de Pagos QR y Flujo con MetaMask | 90 min | Códigos QR generando URIs EIP-681 válidas |
| L6 | Servicio de Sincronización y Pruebas E2E | 90 min | Sincronización cron funcionando + todas las pruebas pasando |

### 1.6 Rúbrica de Evaluación

| Criterio | Excelente (5) | Bueno (4) | Adecuado (3) | Insuficiente (1-2) |
|----------|---------------|-----------|--------------|--------------------|
| Contrato Inteligente | Completo, optimizado, probado, seguro | Funcional con problemas menores | Solo funcionalidad básica | No compila o no se despliega |
| Arquitectura Backend | Arquitectura Limpia, SOLID, documentado | Buena estructura, brechas menores | Funcional pero monolítico | Desorganizado o incompleto |
| Integración Blockchain | Integración completa con ethers.js y manejo de errores | Funciona pero manejo de errores limitado | Integración parcial | No conectado |
| Pagos QR | Compatible con EIP-681, compatible con MetaMask | Genera QR pero validación limitada | Generación básica de QR | No implementado |
| Sincronización | Basada en cron, maneja todos los estados, robusta | Funciona pero casos límite no manejados | Solo sincronización manual | No implementado |
| Pruebas | Unitarias + integración + e2e, >80% cobertura | Solo pruebas unitarias, buena cobertura | Pruebas mínimas | Sin pruebas |
| Documentación | Completa, clara, bien estructurada | Buena documentación con brechas menores | README básico | Sin documentación |

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│               CLIENTE / Billetera MetaMask                     │
│       (Escanea Código QR → Firma Transacción ETH)              │
└───────────────────────┬──────────────────────────────────────┘
                        │  Solicitudes HTTP / Enlace Profundo EIP-681
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    NestJS Backend (API)                        │
│                   http://localhost:3000                        │
│                                                               │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────┐    │
│  │   Payment    │ │   Blockchain   │ │    QR Payment    │    │
│  │   Module     │ │    Module      │ │     Module       │    │
│  │              │ │                │ │                  │    │
│  │ • Controller │ │ • Blockchain   │ │ • QR Controller  │    │
│  │ • Service    │ │   Service      │ │ • QR Service     │    │
│  │ • Entities   │ │ • Contract     │ │ • EIP-681 URI    │    │
│  │ • DTOs       │ │   Service      │ │ • QR Generation  │    │
│  └──────┬───────┘ └───────┬────────┘ └────────┬─────────┘    │
│         │                 │                    │              │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐  │
│  │                  Sync Module (Cron: 30s)                │  │
│  │       Verifica tx PENDIENTES → Actualiza CONFIRMADO/FALLIDO    │  │
│  └──────┬─────────────────────────────────┬───────────────┘  │
└─────────┼─────────────────────────────────┼──────────────────┘
          │                                 │
          ▼                                 ▼
┌────────────────────┐     ┌────────────────────────────────────┐
│  MySQL (BD Sakila)   │     │   Blockchain de Ethereum (Ganache)   │
│   Port 3306        │     │   RPC: http://127.0.0.1:7545        │
│                    │     │                                     │
│ ┌────────────────┐ │     │  ┌───────────────────────────────┐  │
│ │    payment     │ │     │  │   PaymentProcessor.sol        │  │
│ │   (original)   │ │     │  │                               │  │
│ └───────┬────────┘ │     │  │  • registerPayment()          │  │
│         │ FK       │     │  │  • getPayment()               │  │
│ ┌───────▼────────┐ │     │  │  • updatePaymentStatus()      │  │
│ │   payment_     │ │     │  │  • withdraw()                 │  │
│ │  blockchain    │ │     │  │                               │  │
│ │  (new table)   │ │     │  │  Events:                      │  │
│ └────────────────┘ │     │  │  • PaymentRegistered          │  │
│                    │     │  │  • PaymentStatusUpdated        │  │
│ ┌────────────────┐ │     │  │  • FundsWithdrawn             │  │
│ │ qr_payment_    │ │     │  └───────────────────────────────┘  │
│ │  requests      │ │     │                                     │
│ └────────────────┘ │     │  10 Cuentas de Prueba (100 ETH c/u)  │
└────────────────────┘     └────────────────────────────────────┘
```

### 2.2 Flujo de Datos

```
 Paso 1: El cliente envía POST /api/v1/payments
     │
 Paso 2: NestJS crea registro en la tabla `payment` de Sakila (MySQL)
     │
 Paso 3: NestJS llama a PaymentProcessor.registerPayment() vía ethers.js
     │
 Paso 4: Ganache mina la transacción → devuelve tx_hash
     │
 Paso 5: NestJS almacena tx_hash + wallet en `payment_blockchain` (MySQL)
     │
 Paso 6: Estado de transacción = CONFIRMADO (o FALLIDO si fue revertida)
     │
 Paso 7: El cron de sincronización verifica transacciones PENDIENTES cada 30 segundos
     │
 ─── Flujo QR ──────────────────────────────────────
     │
 Paso A: El cliente solicita POST /api/v1/qr-payments/generate
     │
 Paso B: NestJS construye URI EIP-681 → genera código QR (PNG/base64)
     │
 Paso C: El usuario escanea el QR con MetaMask → firma y envía la transacción
     │
 Paso D: El cron de sincronización detecta la transacción → actualiza el estado en MySQL
```

### 2.3 Justificación de la Arquitectura Híbrida

| Aspecto | MySQL (Sakila) | Ethereum (Ganache) |
|---------|---------------|-------------------|
| **Propósito** | Almacenar datos relacionales estructurados (clientes, alquileres, pagos) | Registro inmutable de transacciones de pago |
| **Fortalezas** | Consultas rápidas, transacciones ACID, joins complejos | Transparencia, rastro de auditoría a prueba de manipulaciones, descentralización |
| **Debilidades** | Punto único de fallo, registros mutables | Escrituras lentas, almacenamiento costoso, sin consultas complejas |
| **En este sistema** | Almacén de datos principal para la lógica de negocio | Capa de verificación secundaria para la integridad de pagos |

**¿Por qué híbrida?** El sistema de alquiler de DVDs Sakila necesita consultas rápidas y relacionales para las operaciones diarias. Blockchain añade un rastro de auditoría inmutable para los pagos, asegurando que los registros de pago no puedan ser manipulados después del hecho. El backend NestJS conecta ambos sistemas, proporcionando una API unificada.

---

## 3. Modelado de Datos

### 3.1 Diagrama Entidad-Relación

```
┌─────────────────────┐         ┌─────────────────────────┐
│      payment        │         │   payment_blockchain     │
│    (Sakila orig.)   │    1:1  │     (new table)          │
├─────────────────────┤ ◄────── ├─────────────────────────┤
│ PK payment_id       │         │ PK id                    │
│ FK customer_id      │         │ FK payment_id            │
│ FK staff_id         │         │    tx_hash (UNIQUE)      │
│ FK rental_id        │         │    wallet_address        │
│    amount           │         │    contract_address      │
│    payment_date     │         │    amount_eth            │
│    last_update      │         │    gas_used              │
└─────────────────────┘         │    block_number          │
                                │    transaction_status    │
                                │    created_at            │
                                │    updated_at            │
                                └─────────────────────────┘

┌─────────────────────────┐
│   qr_payment_requests    │
│     (new table)          │
├─────────────────────────┤
│ PK id                    │
│ FK payment_id (nullable) │
│    recipient_address     │
│    amount_eth            │
│    reference             │
│    eip681_uri            │
│    qr_image_base64       │
│    status                │
│    tx_hash               │
│    expires_at            │
│    created_at            │
│    updated_at            │
└─────────────────────────┘
```

### 3.2 Scripts de Migración SQL

Consulta los scripts completos en:
- `database/migrations/001_create_payment_blockchain.sql`
- `database/migrations/002_create_qr_payment_requests.sql`

**Decisiones clave de diseño:**
- **Tabla separada**: NO modificamos la tabla `payment` de Sakila. En su lugar, `payment_blockchain` la referencia mediante una clave foránea. Esto preserva la integridad de la base de datos de referencia.
- **Relación 1:1**: Cada pago de Sakila puede tener como máximo un registro blockchain.
- **Estado ENUM**: `transaction_status` usa ENUM de MySQL para la máquina de estados (PENDING → CONFIRMED / FAILED).
- **tx_hash único**: Previene registros blockchain duplicados para la misma transacción.

---

## 4. Implementación del Backend (NestJS)

### 4.1 Estructura de Módulos

```
src/
├── main.ts                              # Arranque + Swagger
├── app.module.ts                        # Módulo raíz
├── common/
│   ├── dto/pagination.dto.ts            # Paginación reutilizable
│   ├── filters/http-exception.filter.ts # Manejador global de errores
│   └── interceptors/transform.interceptor.ts  # Envolvente de respuesta
└── modules/
    ├── payment/
    │   ├── payment.module.ts
    │   ├── payment.controller.ts        # Endpoints REST
    │   ├── payment.service.ts           # Lógica de negocio
    │   ├── payment.service.spec.ts      # Pruebas unitarias
    │   ├── entities/
    │   │   ├── payment.entity.ts        # Tabla payment de Sakila
    │   │   └── payment-blockchain.entity.ts  # Registros blockchain
    │   └── dto/payment.dto.ts           # DTOs de solicitud/respuesta
    ├── blockchain/
    │   ├── blockchain.module.ts
    │   ├── blockchain.controller.ts     # Endpoints de consulta blockchain
    │   ├── blockchain.service.ts        # Operaciones de bajo nivel con ethers.js
    │   ├── blockchain.service.spec.ts   # Pruebas unitarias
    │   └── contract.service.ts          # Interacción con contrato inteligente
    ├── qr-payment/
    │   ├── qr-payment.module.ts
    │   ├── qr-payment.controller.ts     # Endpoints de generación QR
    │   ├── qr-payment.service.ts        # Lógica EIP-681 + QR
    │   ├── entities/qr-payment-request.entity.ts
    │   └── dto/qr-payment.dto.ts
    └── sync/
        ├── sync.module.ts
        ├── sync.controller.ts           # Activación manual de sincronización
        ├── sync.service.ts              # PENDIENTE→CONFIRMADO/FALLIDO
        └── sync.scheduler.ts            # Tarea cron (cada 30s)
```

### 4.2 Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/payments` | Crear pago + transacción blockchain |
| `GET` | `/api/v1/payments` | Listar pagos (paginado) |
| `GET` | `/api/v1/payments/:id` | Obtener pago con datos blockchain |
| `GET` | `/api/v1/payments/:id/blockchain` | Obtener solo detalles blockchain |
| `PATCH` | `/api/v1/payments/:id/status` | Actualizar estado de transacción |
| `GET` | `/api/v1/blockchain/status` | Estado de la red |
| `GET` | `/api/v1/blockchain/balance/:address` | Saldo de billetera |
| `GET` | `/api/v1/blockchain/transaction/:txHash` | Detalles de transacción |
| `POST` | `/api/v1/blockchain/verify/:txHash` | Verificar transacción |
| `GET` | `/api/v1/blockchain/contract/info` | Información del contrato |
| `POST` | `/api/v1/qr-payments/generate` | Generar código QR |
| `GET` | `/api/v1/qr-payments/:id` | Obtener solicitud QR |
| `GET` | `/api/v1/qr-payments/:id/status` | Consultar estado QR |
| `POST` | `/api/v1/qr-payments/:id/cancel` | Cancelar solicitud QR |
| `POST` | `/api/v1/sync/trigger` | Sincronización manual |
| `GET` | `/api/v1/sync/reconciliation` | Reporte de conciliación |

### 4.3 Archivos Clave de Implementación

Todo el código fuente está en el directorio `src/`. Archivos clave:
- **`src/main.ts`** — Arranque con Swagger, pipes globales, filtros, interceptores
- **`src/modules/payment/payment.service.ts`** — Lógica de negocio principal orquestando MySQL + blockchain
- **`src/modules/blockchain/blockchain.service.ts`** — Proveedor ethers.js, billetera y gestión de transacciones
- **`src/modules/blockchain/contract.service.ts`** — Interacción con ABI del contrato inteligente
- **`src/modules/qr-payment/qr-payment.service.ts`** — Construcción de URI EIP-681 y generación QR
- **`src/modules/sync/sync.service.ts`** — Máquina de estados PENDIENTE → CONFIRMADO/FALLIDO

---

## 5. Contrato Inteligente (Solidity)

### 5.1 Contrato: `contracts/PaymentProcessor.sol`

El código fuente completo del contrato está en `contracts/PaymentProcessor.sol`. Características principales:

- **`registerPayment(uint256 _paymentId, string _reference)`** — Función payable que registra un pago con el payment_id de Sakila y una referencia de texto
- **`getPayment(uint256 _paymentId)`** — Función de vista para leer datos de pago
- **`updatePaymentStatus(uint256 _paymentId, PaymentStatus _newStatus)`** — Actualización de estado solo para el propietario
- **`withdraw()`** — Retiro de fondos solo para el propietario con protección contra reentrada

### 5.2 Eventos

```solidity
event PaymentRegistered(uint256 indexed paymentId, address indexed payer, uint256 amount, string reference);
event PaymentStatusUpdated(uint256 indexed paymentId, PaymentStatus oldStatus, PaymentStatus newStatus);
event FundsWithdrawn(address indexed owner, uint256 amount);
```

### 5.3 Características de Seguridad

- **Modificador `onlyOwner`**: Restringe funciones administrativas al desplegador
- **Modificador `noReentrant`**: Previene ataques de reentrada en `withdraw()`
- **Validación de entradas**: Todas las funciones públicas validan entradas (montos no nulos, referencias no vacías, sin duplicados)

---

## 6. Integración Blockchain (ethers.js)

### 6.1 Conexión a Ganache

```typescript
// Desde src/modules/blockchain/blockchain.service.ts
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
const network = await provider.getNetwork(); // chainId: 5777
```

### 6.2 Firma de Transacciones

```typescript
// Crear una billetera desde una clave privada conectada al proveedor
const wallet = new ethers.Wallet(privateKey, provider);
```

### 6.3 Envío de Transacciones vía Contrato Inteligente

```typescript
// Desde src/modules/blockchain/contract.service.ts
const contract = new ethers.Contract(contractAddress, ABI, wallet);
const tx = await contract.registerPayment(paymentId, reference, {
  value: ethers.parseEther('0.01'), // Enviar 0.01 ETH
});
const receipt = await tx.wait(); // Esperar el minado
// receipt.hash → hash de la transacción
// receipt.gasUsed → gas consumido
// receipt.blockNumber → bloque donde se minó la tx
```

### 6.4 Recuperación de tx_hash y Verificación

```typescript
// Desde src/modules/blockchain/blockchain.service.ts
const receipt = await provider.getTransactionReceipt(txHash);
if (receipt) {
  if (receipt.status === 1) → 'CONFIRMED'
  if (receipt.status === 0) → 'FAILED' (reverted)
} else {
  → 'PENDING' (not yet mined)
}
```

### 6.5 Manejo de Errores

Todas las operaciones blockchain usan try/catch con análisis específico de errores:
- **Errores de conexión**: Capturados en la inicialización, el servicio degrada elegantemente
- **Razones de reversión**: Los mensajes de `require()` de Solidity se extraen del error
- **Fallos de estimación de gas**: Capturados antes de enviar la transacción
- **Manejo de timeout**: `tx.wait()` devuelve null si la tx es descartada

---

## 7. Implementación de Pagos QR

### 7.1 Flujo de Generación de QR

```
 Cliente                   Backend NestJS              Ganache
   │                           │                         │
   │ POST /qr-payments/generate│                         │
   │ {recipientAddress,        │                         │
   │  amountEth, reference}    │                         │
   │──────────────────────────►│                         │
   │                           │                         │
   │                    Construir URI EIP-681                    │
   │                    ethereum:0xAddr@1337?value=10000         │
   │                           │                         │
   │                    Generar Código QR (PNG)                  │
   │                    Almacenar en qr_payment_requests          │
   │                           │                         │
   │◄──────────────────────────│                         │
   │ {qrImageBase64,           │                         │
   │  eip681Uri, expiresAt}    │                         │
   │                           │                         │
   │ El usuario escanea QR con     │                         │
   │ la app móvil MetaMask        │                         │
   │──────────────────────────────────────────────────────►
   │                           │       tx enviada         │
   │                           │                         │
   │                    Cron de sincronización detecta tx         │
   │                    Actualiza estado → COMPLETADO             │
```

### 7.2 Formato URI EIP-681

```
ethereum:<recipient_address>@<chain_id>?value=<amount_in_wei>
```

**Ejemplo:**
```
ethereum:0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1@1337?value=10000000000000000
```

Esta URI le indica a MetaMask:
- **Destinatario**: `0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1`
- **Cadena**: `1337` (Ganache local)
- **Monto**: `10000000000000000` wei = `0.01` ETH

### 7.3 Flujo de Interacción con MetaMask

1. **El backend genera el QR**: Contiene la URI EIP-681
2. **El usuario abre MetaMask móvil**: Toca "Escanear Código QR"
3. **MetaMask analiza la URI**: Pre-llena destinatario, monto y cadena
4. **El usuario revisa y confirma**: Firma la transacción con su clave privada
5. **Transmisión de la transacción**: MetaMask envía la tx firmada a la red Ethereum
6. **El backend detecta el pago**: El cron de sincronización o el listener de eventos captura la tx

> **Nota**: Para pruebas con Ganache, MetaMask debe estar configurado para conectarse a `http://127.0.0.1:7545` con Chain ID `1337`. Importa una cuenta de prueba de Ganache usando su clave privada.

---

## 8. Validación y Sincronización

### 8.1 Lógica de Verificación de Transacciones

```typescript
// From src/modules/blockchain/blockchain.service.ts
async verifyTransaction(txHash: string): Promise<TransactionVerification> {
  const tx = await provider.getTransaction(txHash);
  if (!tx) return { status: 'FAILED' };      // Tx no encontrada

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return { status: 'PENDING' }; // Aún no minada

  return {
    status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
    blockNumber: receipt.blockNumber,
    gasUsed: Number(receipt.gasUsed),
    confirmations: currentBlock - receipt.blockNumber + 1,
  };
}
```

### 8.2 Máquina de Estados

```
                    ┌──────────┐
   Transacción  ──► │ PENDIENTE │
   Enviada        └────┬─────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       ┌────────────┐       ┌────────────┐
       │ CONFIRMED  │       │   FAILED   │
       │ (status=1) │       │ (status=0) │
       └────────────┘       └────────────┘
```

### 8.3 Servicio de Sincronización (basado en Cron)

El `SyncScheduler` se ejecuta cada 30 segundos y:

1. Consulta todos los registros de `payment_blockchain` donde `transaction_status = 'PENDING'`
2. Para cada registro, llama a `blockchainService.verifyTransaction(txHash)`
3. Actualiza el registro en MySQL según el resultado:
   - `CONFIRMED`: Actualiza el estado, almacena gas_used y block_number
   - `FAILED`: Actualiza el estado a FAILED
   - `PENDING`: Se deja sin cambios (se reintenta en el próximo ciclo)
4. Expira las solicitudes de pago QR que superaron su marca de tiempo `expires_at`

### 8.4 Activación Manual de Sincronización

```bash
# Activar una sincronización manual vía la API
curl -X POST http://localhost:3000/api/v1/sync/trigger
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "totalPending": 3,
    "confirmed": 2,
    "failed": 0,
    "stillPending": 1,
    "expiredQrRequests": 5,
    "syncedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 9. Pruebas

### 9.1 Pruebas Unitarias

Ejecutar pruebas unitarias:
```bash
npm run test
```

**Cobertura:**
- `PaymentService` (payment.service.spec.ts): 8 casos de prueba cubriendo CRUD, fallos de blockchain, actualizaciones de estado
- `BlockchainService` (blockchain.service.spec.ts): 7 casos de prueba cubriendo estados de verificación, saldo, estado de red

### 9.2 Pruebas de Integración (E2E)

Ejecutar pruebas e2e (requiere Ganache + MySQL ejecutándose):
```bash
npm run test:e2e
```

**Cobertura:**
- Endpoint de estado de blockchain
- Listado de pagos con paginación
- Creación de pagos con registro blockchain
- Generación de códigos QR
- Conciliación de sincronización

### 9.3 Pruebas del Contrato Inteligente

Ejecutar pruebas de Hardhat:
```bash
npx hardhat test
```

**Cobertura (contracts/test/PaymentProcessor.test.ts):**
- Despliegue y verificación de propiedad
- Registro de pagos (exitoso + casos límite)
- Recuperación de pagos
- Actualizaciones de estado (control de acceso solo propietario)
- Retiro (protección contra reentrada)
- Transferencias directas de ETH

### 9.4 Escenarios de Casos de Uso Reales

| Escenario | Pasos | Resultado Esperado |
|-----------|-------|-----------------|
| **Camino Feliz** | Crear pago → Verificar tx → Sincronizar | Estado = CONFIRMADO en MySQL y blockchain |
| **Fallo de Red** | Crear pago con Ganache detenido | Estado = FALLIDO, pago aún en Sakila |
| **Expiración de QR** | Generar QR → Esperar 15 min → Verificar estado | Estado = EXPIRADO |
| **Pago Duplicado** | Intentar registrar mismo paymentId dos veces on-chain | El contrato revierte con "already registered" |
| **Sincronización Concurrente** | Activar sincronización mientras el cron está ejecutándose | El bloqueo previene solapamiento, sin actualizaciones duplicadas |

---

## 10. Despliegue Local

### 10.1 Prerrequisitos

- **Node.js** v18+ (con npm)
- **MySQL** 8.0+ con la base de datos Sakila importada
- **Git** (opcional)

### 10.2 Comandos Paso a Paso

#### Paso 1: Instalar e Iniciar Ganache

```bash
# Instalar Ganache CLI globalmente (o usar npx)
npm install -g ganache

# Iniciar Ganache con cuentas determinísticas
ganache --chain.chainId 1337 --wallet.deterministic --port 7545
```

Deberías ver 10 cuentas listadas con 100 ETH cada una. **Mantén esta terminal abierta.**

#### Paso 2: Importar Base de Datos Sakila

```bash
# Descargar Sakila si no la tienes
# https://dev.mysql.com/doc/sakila/en/sakila-installation.html

# Importar el esquema y los datos
mysql -u root -p < sakila-schema.sql
mysql -u root -p < sakila-data.sql
```

#### Paso 3: Ejecutar Migraciones de Base de Datos

```bash
# Crear las tablas payment_blockchain y qr_payment_requests
mysql -u root -p sakila < database/migrations/001_create_payment_blockchain.sql
mysql -u root -p sakila < database/migrations/002_create_qr_payment_requests.sql
```

#### Paso 4: Instalar Dependencias del Proyecto

```bash
cd sakila-blockchain-nestjs
npm install
```

#### Paso 5: Compilar el Contrato Inteligente

```bash
npx hardhat compile
```

#### Paso 6: Desplegar el Contrato Inteligente en Ganache

```bash
npx hardhat run contracts/scripts/deploy.ts --network ganache
```

Copia la dirección del contrato impresa.

#### Paso 7: Configurar Variables de Entorno

Edita `.env` y establece:
```env
DB_PASSWORD=tu_contraseña_mysql
PAYMENT_CONTRACT_ADDRESS=0x_pegar_direccion_aqui
```

#### Paso 8: Iniciar el Servidor NestJS

```bash
npm run start:dev
```

#### Paso 9: Abrir Documentación Swagger

Navega a: **http://localhost:3000/api/docs**

#### Paso 10: Probar la API

```bash
# Verificar estado de blockchain
curl http://localhost:3000/api/v1/blockchain/status

# Crear un pago
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "staffId": 1,
    "amount": 4.99,
    "amountEth": 0.01,
    "walletAddress": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    "reference": "Pago de Prueba"
  }'

# Generar un código QR
curl -X POST http://localhost:3000/api/v1/qr-payments/generate \
  -H "Content-Type: application/json" \
  -d '{
    "recipientAddress": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    "amountEth": 0.01,
    "reference": "Pago de Prueba QR"
  }'
```

---

## 11. Análisis Académico

### 11.1 Ventajas vs Sistemas Tradicionales

| Ventaja | Descripción |
|---------|-------------|
| **Inmutabilidad** | Una vez que un pago se registra en la blockchain, no puede ser alterado ni eliminado |
| **Transparencia** | Todas las transacciones son públicamente verificables en la blockchain |
| **Rastro de Auditoría** | El evento `PaymentRegistered` proporciona un registro permanente con marca de tiempo |
| **Sin Confianza Requerida** | Ninguna parte individual puede modificar registros de pago unilateralmente |
| **Redundancia** | Los datos de pago existen tanto en MySQL como en la blockchain |

### 11.2 Limitaciones de Blockchain

| Limitación | Impacto en Este Sistema |
|------------|------------------------|
| **Rendimiento** | Ethereum procesa ~15 tx/seg (Ganache es más rápido pero no representativo) |
| **Costo** | Cada transacción consume gas; la red principal de Ethereum cuesta $1-50+ por tx |
| **Finalidad** | Las transacciones necesitan confirmaciones (1 bloque en Ganache, 12+ en mainnet) |
| **Almacenamiento** | El almacenamiento on-chain es extremadamente costoso; minimizamos los datos almacenados |
| **Privacidad** | Todas las transacciones son públicas; los datos sensibles permanecen solo en MySQL |
| **Complejidad** | Añade complejidad arquitectónica significativa vs MySQL puro |

### 11.3 Consideraciones de Escalabilidad

- **Escalamiento Vertical**: MySQL puede manejar millones de registros; blockchain es el cuello de botella
- **Escalamiento Horizontal**: Múltiples instancias de NestJS pueden compartir el mismo MySQL y Ganache
- **Soluciones de Capa 2**: Para producción, considerar Polygon, Optimism o Arbitrum para menores costos de gas
- **Procesamiento por Lotes**: Agrupar múltiples pagos en una sola transacción blockchain usando árboles de Merkle
- **Basado en Eventos**: Usar eventos blockchain en lugar de polling para actualizaciones en tiempo real

### 11.4 Mejoras Sugeridas

1. **Notificaciones WebSocket**: Reemplazar polling con actualizaciones WebSocket en tiempo real cuando se confirmen transacciones
2. **Soporte multi-moneda**: Extender el contrato para soportar tokens ERC-20 (USDT, USDC)
3. **Acceso basado en roles**: Implementar autenticación JWT con roles (admin, staff, cliente)
4. **Integración con IPFS**: Almacenar recibos de pago en IPFS para almacenamiento descentralizado de documentos
5. **Frontend DApp**: Construir un frontend React/Angular con conexión de billetera MetaMask
6. **Integración de oráculos**: Usar oráculos Chainlink para conversión de precios ETH/USD en tiempo real
7. **Verificación con prueba de Merkle**: Agrupar múltiples pagos en una sola prueba on-chain
8. **Despliegue con Docker**: Contenerizar todo el stack (NestJS + MySQL + Ganache) para entornos consistentes
9. **Pipeline CI/CD**: Automatizar pruebas y despliegue con GitHub Actions
10. **Despliegue en Mainnet**: Migrar de Ganache a una testnet (Sepolia) y eventualmente a mainnet

---

## Resumen del Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Framework Backend | NestJS | 10.x |
| Lenguaje | TypeScript | 5.x |
| Base de Datos | MySQL (Sakila) | 8.0+ |
| ORM | TypeORM | 0.3.x |
| Blockchain | Ethereum (Ganache) | local |
| Contratos Inteligentes | Solidity | 0.8.20 |
| Biblioteca Web3 | ethers.js | 6.x |
| Herramientas de Contrato | Hardhat | 2.x |
| Generación QR | qrcode (Node.js) | 1.5.x |
| Documentación API | Swagger/OpenAPI | 7.x |
| Pruebas | Jest + Supertest + Chai | — |
| Programación de Tareas | @nestjs/schedule | 4.x |

---

## Licencia

Este proyecto está diseñado con fines educativos. Licencia MIT.

| **Rastro de Auditoría (Audit Trail)** | El evento `PaymentRegistered` proporciona un registro permanente con marca de tiempo |
|--------------------------------------|-------------------------------------------------------------------------------------|
| **Sin necesidad de confianza (Trustlessness)** | Ninguna entidad puede modificar los registros de pago de forma unilateral |
| **Redundancia** | Los datos de pago existen tanto en MySQL como en la blockchain |

### 11.2 Limitaciones de Blockchain

| Limitación | Impacto en este sistema |
|------------|------------------------|
| **Rendimiento (Throughput)** | Ethereum procesa ~15 tx/seg (Ganache es más rápido, pero no representativo) |
| **Costo** | Cada transacción consume gas; en la red principal de Ethereum cuesta entre $1–50+ por transacción |
| **Finalidad (Finality)** | Las transacciones requieren confirmaciones (1 bloque en Ganache, 12+ en mainnet) |
| **Almacenamiento** | El almacenamiento on-chain es extremadamente costoso; se minimizan los datos almacenados |
| **Privacidad** | Todas las transacciones son públicas; los datos sensibles permanecen solo en MySQL |
| **Complejidad** | Añade una complejidad arquitectónica significativa frente a usar solo MySQL |


### 11.3 Consideraciones de Escalabilidad

- **Escalado Vertical**: MySQL puede manejar millones de registros; la blockchain es el cuello de botella  
- **Escalado Horizontal**: Múltiples instancias de NestJS pueden compartir el mismo MySQL y Ganache  
- **Soluciones Layer 2**: Para producción, considerar Polygon, Optimism o Arbitrum para reducir costos de gas  
- **Batching (Agrupación)**: Agrupar múltiples pagos en una sola transacción usando árboles de Merkle  
- **Arquitectura orientada a eventos**: Usar eventos de blockchain en lugar de polling para actualizaciones en tiempo real  

### 11.4 Mejoras Sugeridas

1. **Notificaciones WebSocket**: Reemplazar polling con actualizaciones en tiempo real cuando las transacciones se confirmen  
2. **Soporte multi-moneda**: Extender el contrato para soportar tokens ERC-20 (USDT, USDC)  
3. **Acceso basado en roles**: Implementar autenticación JWT con roles (admin, staff, cliente)  
4. **Integración con IPFS**: Almacenar comprobantes de pago en IPFS para almacenamiento descentralizado  
5. **Frontend DApp**: Construir un frontend en React o Angular con conexión a MetaMask  
6. **Integración con oráculos**: Usar Chainlink para conversión en tiempo real ETH/USD  
7. **Verificación con Merkle Proof**: Agrupar múltiples pagos en una sola prueba on-chain  
8. **Despliegue con Docker**: Contenerizar todo el stack (NestJS + MySQL + Ganache)  
9. **Pipeline CI/CD**: Automatizar pruebas y despliegues con GitHub Actions  
10. **Despliegue en mainnet**: Migrar de Ganache a testnet (Sepolia) y luego a mainnet 

---

## Resumen del Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Framework Backend | NestJS | 10.x |
| Lenguaje | TypeScript | 5.x |
| Base de Datos | MySQL (Sakila) | 8.0+ |
| ORM | TypeORM | 0.3.x |
| Blockchain | Ethereum (Ganache) | local |
| Smart Contracts | Solidity | 0.8.20 |
| Librería Web3 | ethers.js | 6.x |
| Herramientas de Contratos | Hardhat | 2.x |
| Generación QR | qrcode (Node.js) | 1.5.x |
| Documentación API | Swagger/OpenAPI | 7.x |
| Testing | Jest + Supertest + Chai | — |
| Programación de Tareas | @nestjs/schedule | 4.x |

---

## Licencia

Este proyecto está diseñado con fines educativos. Licencia MIT.