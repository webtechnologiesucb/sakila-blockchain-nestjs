<script>
  import { onMount } from 'svelte';

  // State
  let activeTab = 'payments'; // 'payments' | 'new-payment' | 'qr' | 'audit'
  let loading = false;
  let syncLoading = false;
  let toast = null;

  // Blockchain & Network Status
  let networkStatus = { connected: false, chainId: null, blockNumber: 0, gasPrice: '0' };
  let contractInfo = { contractAddress: '', totalPayments: 0, contractBalanceEth: '0' };
  let reconciliation = { totalBlockchainRecords: 0, confirmedCount: 0, pendingCount: 0, failedCount: 0 };

  // Payments List
  let payments = [];
  let pagination = { currentPage: 1, itemsPerPage: 8, totalItems: 0, totalPages: 1 };

  // New Payment Form
  let newPayment = {
    customerId: 1,
    staffId: 1,
    rentalId: 1,
    amount: 4.99,
    amountEth: 0.002,
    walletAddress: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
    reference: 'Alquiler Sakila DVD #1'
  };
  let createdPaymentResult = null;

  // QR Payment Form
  let qrForm = {
    recipientAddress: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
    amountEth: 0.005,
    reference: 'Pago QR Sakila Tienda #1'
  };
  let currentQr = null;
  let qrPollTimer = null;

  // Audit / Tool state
  let queryAddress = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
  let queriedBalance = null;
  let queryTxHash = '';
  let queriedTx = null;

  function showToast(msg, type = 'success') {
    toast = { msg, type };
    setTimeout(() => {
      if (toast?.msg === msg) toast = null;
    }, 4500);
  }

  // Fetch Network Info
  async function fetchNetworkInfo() {
    try {
      const res = await fetch('/api/v1/blockchain/status');
      if (res.ok) {
        const json = await res.json();
        networkStatus = json.data || json;
      }
    } catch (e) {
      console.warn('Network status fetch error:', e);
      networkStatus.connected = false;
    }

    try {
      const res = await fetch('/api/v1/blockchain/contract/info');
      if (res.ok) {
        const json = await res.json();
        contractInfo = json.data || json;
      }
    } catch (e) {
      console.warn('Contract info fetch error:', e);
    }
  }

  // Fetch Reconciliation Stats
  async function fetchReconciliation() {
    try {
      const res = await fetch('/api/v1/sync/reconciliation');
      if (res.ok) {
        const json = await res.json();
        reconciliation = json.data || json;
      }
    } catch (e) {
      console.warn('Reconciliation fetch error:', e);
    }
  }

  // Fetch Payments
  async function fetchPayments(page = 1) {
    loading = true;
    try {
      const res = await fetch(`/api/v1/payments?page=${page}&limit=${pagination.itemsPerPage}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        payments = data.items || [];
        if (data.meta) {
          pagination = {
            currentPage: data.meta.currentPage,
            itemsPerPage: data.meta.itemsPerPage,
            totalItems: data.meta.totalItems,
            totalPages: data.meta.totalPages
          };
        }
      }
    } catch (e) {
      console.error('Error fetching payments:', e);
      showToast('Error al conectar con la API de Sakila', 'error');
    } finally {
      loading = false;
    }
  }

  // Submit New Payment
  async function submitPayment() {
    loading = true;
    createdPaymentResult = null;
    try {
      const payload = {
        customerId: Number(newPayment.customerId),
        staffId: Number(newPayment.staffId),
        rentalId: newPayment.rentalId ? Number(newPayment.rentalId) : null,
        amount: Number(newPayment.amount),
        amountEth: Number(newPayment.amountEth),
        walletAddress: newPayment.walletAddress,
        reference: newPayment.reference
      };

      const res = await fetch('/api/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok) {
        createdPaymentResult = json.data || json;
        showToast('¡Pago registrado en Sakila y minado en la blockchain!');
        fetchPayments(1);
        fetchNetworkInfo();
        fetchReconciliation();
      } else {
        showToast(json.message || 'Error al procesar el pago', 'error');
      }
    } catch (e) {
      showToast(`Error de red: ${e.message}`, 'error');
    } finally {
      loading = false;
    }
  }

  // Trigger Manual Sync
  async function triggerSync() {
    syncLoading = true;
    try {
      const res = await fetch('/api/v1/sync/trigger', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        const data = json.data || json;
        showToast(`Sincronización completada: ${data.confirmed || 0} confirmadas, ${data.failed || 0} fallidas`);
        fetchPayments(pagination.currentPage);
        fetchReconciliation();
        fetchNetworkInfo();
      } else {
        showToast('Error al sincronizar transacciones', 'error');
      }
    } catch (e) {
      showToast(`Error al ejecutar sincronización: ${e.message}`, 'error');
    } finally {
      syncLoading = false;
    }
  }

  // Generate QR Payment
  async function generateQR() {
    loading = true;
    try {
      const res = await fetch('/api/v1/qr-payments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientAddress: qrForm.recipientAddress,
          amountEth: Number(qrForm.amountEth),
          reference: qrForm.reference
        })
      });
      const json = await res.json();
      if (res.ok) {
        currentQr = json.data || json;
        showToast('Código QR generado exitosamente');
        startQrPolling(currentQr.id);
      } else {
        showToast(json.message || 'Error al generar código QR', 'error');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    } finally {
      loading = false;
    }
  }

  function startQrPolling(qrId) {
    if (qrPollTimer) clearInterval(qrPollTimer);
    qrPollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/qr-payments/${qrId}/status`);
        if (res.ok) {
          const json = await res.json();
          const statusData = json.data || json;
          if (currentQr && currentQr.id === qrId) {
            currentQr.status = statusData.status;
            if (statusData.status === 'COMPLETED') {
              clearInterval(qrPollTimer);
              showToast('¡Pago QR detectado y completado en blockchain!');
              fetchPayments(1);
              fetchReconciliation();
            }
          }
        }
      } catch (err) {
        console.warn('QR poll error:', err);
      }
    }, 4000);
  }

  // Audit Tool: Check Balance
  async function checkBalance() {
    if (!queryAddress) return;
    try {
      const res = await fetch(`/api/v1/blockchain/balance/${queryAddress}`);
      const json = await res.json();
      if (res.ok) {
        queriedBalance = json.data ? json.data.balanceEth : json.balanceEth;
      } else {
        showToast(json.message || 'Error al consultar saldo', 'error');
      }
    } catch (e) {
      showToast('Error de conexión', 'error');
    }
  }

  // Audit Tool: Verify Tx
  async function verifyTx() {
    if (!queryTxHash) return;
    try {
      const res = await fetch(`/api/v1/blockchain/transaction/${queryTxHash}`);
      const json = await res.json();
      if (res.ok) {
        queriedTx = json.data || json;
      } else {
        showToast(json.message || 'Transacción no encontrada', 'error');
      }
    } catch (e) {
      showToast('Error consultando transacción', 'error');
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);
    showToast('Copiado al portapapeles');
  }

  function truncate(str, head = 8, tail = 6) {
    if (!str) return '—';
    if (str.length <= head + tail) return str;
    return `${str.slice(0, head)}...${str.slice(-tail)}`;
  }

  onMount(() => {
    fetchNetworkInfo();
    fetchReconciliation();
    fetchPayments(1);

    const interval = setInterval(() => {
      fetchNetworkInfo();
      fetchReconciliation();
    }, 15000);

    return () => {
      clearInterval(interval);
      if (qrPollTimer) clearInterval(qrPollTimer);
    };
  });
</script>

<div class="app-layout">
  <!-- Toast Notification -->
  {#if toast}
    <div class="toast toast-{toast.type}">
      <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
      <span>{toast.msg}</span>
    </div>
  {/if}

  <!-- Header Bar -->
  <header class="app-header glass">
    <div class="header-brand">
      <div class="logo-box">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div>
        <h1 class="brand-title">Sakila Blockchain</h1>
        <p class="brand-subtitle">Arquitectura Híbrida: PostgreSQL (Sakila) + Ethereum (Ganache) + NestJS</p>
      </div>
    </div>

    <!-- Status Indicators -->
    <div class="header-status">
      <div class="status-chip {networkStatus.connected ? 'online' : 'offline'}">
        <span class="status-dot"></span>
        <span class="status-label">Ganache: {networkStatus.connected ? `Chain #${networkStatus.chainId || 1337}` : 'Desconectado'}</span>
      </div>

      <div class="status-chip info">
        <span class="status-label">Bloque: #{networkStatus.blockNumber ?? '—'}</span>
      </div>

      {#if contractInfo.contractAddress}
        <button class="status-chip contract" on:click={() => copyText(contractInfo.contractAddress)} title="Click para copiar dirección del contrato">
          <span class="contract-icon">📄</span>
          <span class="status-label">{truncate(contractInfo.contractAddress, 6, 4)}</span>
        </button>
      {/if}
    </div>
  </header>

  <!-- Metric Summary Banner -->
  <section class="metrics-grid">
    <div class="metric-card glass">
      <div class="metric-header">
        <span class="metric-title">Total Pagos Sakila</span>
        <span class="metric-icon">🎬</span>
      </div>
      <div class="metric-value">{pagination.totalItems || 0}</div>
      <div class="metric-footer">Registros en tabla <code>payment</code></div>
    </div>

    <div class="metric-card glass">
      <div class="metric-header">
        <span class="metric-title">Transacciones Blockchain</span>
        <span class="metric-icon">⛓️</span>
      </div>
      <div class="metric-value text-indigo">{reconciliation.totalBlockchainRecords || 0}</div>
      <div class="metric-footer">Minadas en smart contract</div>
    </div>

    <div class="metric-card glass">
      <div class="metric-header">
        <span class="metric-title">Confirmadas</span>
        <span class="metric-icon">✅</span>
      </div>
      <div class="metric-value text-emerald">{reconciliation.confirmedCount || 0}</div>
      <div class="metric-footer">Estado: CONFIRMADO</div>
    </div>

    <div class="metric-card glass">
      <div class="metric-header">
        <span class="metric-title">Saldo del Contrato</span>
        <span class="metric-icon">💎</span>
      </div>
      <div class="metric-value text-cyan">{contractInfo.contractBalanceEth || '0'} ETH</div>
      <div class="metric-footer">Pagos acumulados on-chain</div>
    </div>
  </section>

  <!-- Main Navigation Tabs -->
  <nav class="tabs-nav glass">
    <button class="tab-btn {activeTab === 'payments' ? 'active' : ''}" on:click={() => activeTab = 'payments'}>
      <span class="tab-icon">📋</span> Historial de Pagos
    </button>
    <button class="tab-btn {activeTab === 'new-payment' ? 'active' : ''}" on:click={() => activeTab = 'new-payment'}>
      <span class="tab-icon">⚡</span> Registrar Nuevo Pago
    </button>
    <button class="tab-btn {activeTab === 'qr' ? 'active' : ''}" on:click={() => activeTab = 'qr'}>
      <span class="tab-icon">📱</span> Pagos QR (EIP-681)
    </button>
    <button class="tab-btn {activeTab === 'audit' ? 'active' : ''}" on:click={() => activeTab = 'audit'}>
      <span class="tab-icon">🔍</span> Auditoría & Blockchain
    </button>
  </nav>

  <!-- Content Panels -->
  <main class="content-container">

    <!-- TAB 1: PAYMENTS LIST -->
    {#if activeTab === 'payments'}
      <div class="glass-panel panel-content">
        <div class="panel-header">
          <div>
            <h2>Historial de Pagos</h2>
            <p class="panel-subtitle">Lista combinada: registros relacionales de Sakila y comprobantes en Ethereum</p>
          </div>
          <div class="panel-actions">
            <button class="btn btn-secondary" on:click={() => fetchPayments(pagination.currentPage)} disabled={loading}>
              🔄 Refrescar
            </button>
            <button class="btn btn-primary" on:click={triggerSync} disabled={syncLoading}>
              {#if syncLoading}
                <span class="spinner"></span> Sincronizando...
              {:else}
                ⚡ Sincronizar con Blockchain
              {/if}
            </button>
          </div>
        </div>

        {#if loading && payments.length === 0}
          <div class="empty-state">
            <div class="spinner large"></div>
            <p>Cargando pagos desde la base de datos...</p>
          </div>
        {:else if payments.length === 0}
          <div class="empty-state">
            <p class="empty-emoji">📂</p>
            <h3>No se encontraron pagos registrados</h3>
            <p>Puedes crear un nuevo pago usando la pestaña "Registrar Nuevo Pago".</p>
          </div>
        {:else}
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Monto (USD)</th>
                  <th>Fecha Pago</th>
                  <th>Monto (ETH)</th>
                  <th>TX Hash (Ganache)</th>
                  <th>Bloque</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {#each payments as item}
                  <tr>
                    <td><span class="id-tag">#{item.paymentId}</span></td>
                    <td>
                      <div class="customer-info">
                        <strong>Cliente #{item.customerId}</strong>
                        <span class="sub-info">Staff #{item.staffId}</span>
                      </div>
                    </td>
                    <td><span class="usd-amount">${Number(item.amount).toFixed(2)}</span></td>
                    <td class="text-muted">{new Date(item.paymentDate).toLocaleString()}</td>
                    <td>
                      {#if item.blockchain?.amountEth}
                        <span class="eth-amount">{item.blockchain.amountEth} ETH</span>
                      {:else}
                        <span class="text-muted">—</span>
                      {/if}
                    </td>
                    <td>
                      {#if item.blockchain?.txHash}
                        <button class="hash-btn" on:click={() => copyText(item.blockchain.txHash)} title="Copiar hash">
                          <code>{truncate(item.blockchain.txHash, 8, 6)}</code>
                          <span class="copy-icon">📋</span>
                        </button>
                      {:else}
                        <span class="text-muted">Sin registrar</span>
                      {/if}
                    </td>
                    <td>
                      {#if item.blockchain?.blockNumber}
                        <span class="block-tag">#{item.blockchain.blockNumber}</span>
                      {:else}
                        <span class="text-muted">—</span>
                      {/if}
                    </td>
                    <td>
                      {#if item.blockchain?.transactionStatus === 'CONFIRMED'}
                        <span class="badge badge-confirmed">● Confirmado</span>
                      {:else if item.blockchain?.transactionStatus === 'PENDING'}
                        <span class="badge badge-pending">● Pendiente</span>
                      {:else if item.blockchain?.transactionStatus === 'FAILED'}
                        <span class="badge badge-failed">● Fallido</span>
                      {:else}
                        <span class="badge">Off-chain</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="pagination-bar">
            <span class="pagination-info">
              Página {pagination.currentPage} de {pagination.totalPages} ({pagination.totalItems} pagos totales)
            </span>
            <div class="pagination-controls">
              <button 
                class="btn btn-sm btn-secondary" 
                disabled={pagination.currentPage <= 1 || loading}
                on:click={() => fetchPayments(pagination.currentPage - 1)}
              >
                ◀ Anterior
              </button>
              <button 
                class="btn btn-sm btn-secondary" 
                disabled={pagination.currentPage >= pagination.totalPages || loading}
                on:click={() => fetchPayments(pagination.currentPage + 1)}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- TAB 2: NEW PAYMENT -->
    {#if activeTab === 'new-payment'}
      <div class="glass-panel panel-content narrow-panel">
        <div class="panel-header">
          <div>
            <h2>Registrar Pago Híbrido</h2>
            <p class="panel-subtitle">Crea el registro en la base de datos de Sakila y registra simultáneamente la transacción en Ganache mediante el Smart Contract</p>
          </div>
        </div>

        {#if createdPaymentResult}
          <div class="success-box glass">
            <div class="success-header">
              <span class="success-icon">🎉</span>
              <h3>¡Transacción Confirmada y Minada!</h3>
            </div>
            <div class="result-details">
              <div class="detail-row">
                <span class="detail-label">Payment ID (Sakila):</span>
                <span class="detail-value"><strong>#{createdPaymentResult.paymentId}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">TX Hash (Ganache):</span>
                <span class="detail-value mono">
                  {createdPaymentResult.blockchain?.txHash}
                  <button class="btn-copy" on:click={() => copyText(createdPaymentResult.blockchain?.txHash)}>Copiar</button>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bloque:</span>
                <span class="detail-value">#{createdPaymentResult.blockchain?.blockNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Gas Usado:</span>
                <span class="detail-value">{createdPaymentResult.blockchain?.gasUsed || '—'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Monto Registrado:</span>
                <span class="detail-value text-cyan">${createdPaymentResult.amount} USD ({createdPaymentResult.blockchain?.amountEth} ETH)</span>
              </div>
            </div>
            <button class="btn btn-secondary mt-3" on:click={() => createdPaymentResult = null}>
              Registrar otro pago
            </button>
          </div>
        {:else}
          <form on:submit|preventDefault={submitPayment} class="payment-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="customerId">ID del Cliente (Sakila)</label>
                <input id="customerId" type="number" min="1" max="1000" bind:value={newPayment.customerId} required />
                <span class="input-hint">ID del cliente existente en tabla customer</span>
              </div>

              <div class="form-group">
                <label for="staffId">ID del Empleado (Staff)</label>
                <input id="staffId" type="number" min="1" max="10" bind:value={newPayment.staffId} required />
                <span class="input-hint">ID del cajero o empleado que cobra</span>
              </div>

              <div class="form-group">
                <label for="rentalId">ID de Alquiler (Opcional)</label>
                <input id="rentalId" type="number" min="1" bind:value={newPayment.rentalId} />
                <span class="input-hint">Asocia el pago a un alquiler de DVD</span>
              </div>

              <div class="form-group">
                <label for="amount">Monto USD ($)</label>
                <input id="amount" type="number" step="0.01" min="0.01" bind:value={newPayment.amount} required />
              </div>

              <div class="form-group">
                <label for="amountEth">Monto ETH (Ethereum)</label>
                <input id="amountEth" type="number" step="0.0001" min="0.0001" bind:value={newPayment.amountEth} required />
                <span class="input-hint">Se transferirá al Smart Contract</span>
              </div>

              <div class="form-group full-width">
                <label for="walletAddress">Billetera Pagadora (Ethereum Address)</label>
                <input id="walletAddress" type="text" bind:value={newPayment.walletAddress} required />
                <span class="input-hint">Cuenta de prueba predeterminada de Ganache</span>
              </div>

              <div class="form-group full-width">
                <label for="reference">Referencia / Concepto</label>
                <input id="reference" type="text" bind:value={newPayment.reference} placeholder="Ej. Alquiler Película Sakila" />
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
                {#if loading}
                  <span class="spinner"></span> Minando transacción en Ganache...
                {:else}
                  🚀 Enviar Pago a Sakila + Ganache
                {/if}
              </button>
            </div>
          </form>
        {/if}
      </div>
    {/if}

    <!-- TAB 3: QR PAYMENTS -->
    {#if activeTab === 'qr'}
      <div class="glass-panel panel-content">
        <div class="panel-header">
          <div>
            <h2>Generador de Pagos QR (EIP-681)</h2>
            <p class="panel-subtitle">Genera códigos QR conformes con el estándar EIP-681 compatibles con billeteras móviles como MetaMask</p>
          </div>
        </div>

        <div class="qr-layout">
          <!-- Form -->
          <div class="qr-form-side">
            <form on:submit|preventDefault={generateQR} class="payment-form">
              <div class="form-group">
                <label for="qrRecipient">Dirección Destino (Receptor)</label>
                <input id="qrRecipient" type="text" bind:value={qrForm.recipientAddress} required />
              </div>

              <div class="form-group">
                <label for="qrAmount">Monto a Cobrar (ETH)</label>
                <input id="qrAmount" type="number" step="0.001" min="0.0001" bind:value={qrForm.amountEth} required />
              </div>

              <div class="form-group">
                <label for="qrRef">Referencia / Motivo</label>
                <input id="qrRef" type="text" bind:value={qrForm.reference} required />
              </div>

              <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
                {#if loading}
                  <span class="spinner"></span> Generando QR...
                {:else}
                  📱 Generar Código QR
                {/if}
              </button>
            </form>
          </div>

          <!-- QR Preview -->
          <div class="qr-preview-side glass">
            {#if currentQr}
              <div class="qr-display">
                <div class="qr-image-wrapper">
                  <img src={currentQr.qrImageBase64} alt="Código QR EIP-681" class="qr-img" />
                </div>

                <div class="qr-meta">
                  <div class="qr-status-pill badge badge-{currentQr.status === 'COMPLETED' ? 'confirmed' : 'pending'}">
                    Estado: {currentQr.status}
                  </div>
                  <p class="qr-amount-text">{currentQr.amountEth} ETH</p>
                  <p class="qr-ref-text">{currentQr.reference}</p>
                </div>

                <div class="eip-uri-box">
                  <span class="input-hint">URI Estándar EIP-681:</span>
                  <div class="uri-copy-row">
                    <code>{truncate(currentQr.eip681Uri, 28, 12)}</code>
                    <button class="btn btn-sm btn-secondary" on:click={() => copyText(currentQr.eip681Uri)}>Copiar URI</button>
                  </div>
                </div>
              </div>
            {:else}
              <div class="qr-placeholder">
                <span class="placeholder-icon">📷</span>
                <h4>Sin código QR generado</h4>
                <p>Completa el formulario y presiona "Generar Código QR" para crear un código escaneable.</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 4: AUDIT & BLOCKCHAIN TOOLS -->
    {#if activeTab === 'audit'}
      <div class="glass-panel panel-content">
        <div class="panel-header">
          <div>
            <h2>Herramientas de Auditoría Blockchain</h2>
            <p class="panel-subtitle">Inspección de cuentas en Ganache, verificación de transacciones y conciliación del Smart Contract</p>
          </div>
        </div>

        <div class="tools-grid">
          <!-- Tool 1: Balance Checker -->
          <div class="tool-card glass">
            <h3>💳 Consultar Saldo en ETH</h3>
            <p class="tool-desc">Verifica el balance actual de cualquier dirección en la red Ganache</p>
            <div class="tool-input-row">
              <input type="text" placeholder="0x..." bind:value={queryAddress} />
              <button class="btn btn-secondary" on:click={checkBalance}>Consultar</button>
            </div>
            {#if queriedBalance !== null}
              <div class="tool-result">
                <span>Saldo disponible:</span>
                <strong class="text-emerald text-lg">{queriedBalance} ETH</strong>
              </div>
            {/if}
          </div>

          <!-- Tool 2: Transaction Verifier -->
          <div class="tool-card glass">
            <h3>🔎 Verificar Transacción</h3>
            <p class="tool-desc">Inspecciona el recibo y estado de una transacción minada</p>
            <div class="tool-input-row">
              <input type="text" placeholder="Hash 0x..." bind:value={queryTxHash} />
              <button class="btn btn-secondary" on:click={verifyTx}>Verificar</button>
            </div>
            {#if queriedTx}
              <div class="tool-result-box">
                <div class="result-row">
                  <span>Estado:</span>
                  <span class="badge badge-{queriedTx.status === 'CONFIRMED' ? 'confirmed' : 'failed'}">
                    {queriedTx.status}
                  </span>
                </div>
                <div class="result-row">
                  <span>Bloque:</span>
                  <span>#{queriedTx.blockNumber || '—'}</span>
                </div>
                <div class="result-row">
                  <span>Gas Utilizado:</span>
                  <span>{queriedTx.gasUsed || '—'}</span>
                </div>
                <div class="result-row">
                  <span>Valor:</span>
                  <span>{queriedTx.value} ETH</span>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Reconciliation Section -->
        <div class="reconciliation-box glass mt-4">
          <h3>📊 Reporte de Conciliación de Pagos (Sakila ↔ Ethereum)</h3>
          <p class="panel-subtitle">Auditoría en tiempo real para verificar consistencia entre registros de MySQL/Postgres y recibos on-chain</p>

          <div class="reconcile-stats-grid">
            <div class="reconcile-stat">
              <span class="stat-number">{reconciliation.totalBlockchainRecords || 0}</span>
              <span class="stat-name">Total Registros Blockchain</span>
            </div>
            <div class="reconcile-stat">
              <span class="stat-number text-emerald">{reconciliation.confirmedCount || 0}</span>
              <span class="stat-name">Sincronizados y Confirmados</span>
            </div>
            <div class="reconcile-stat">
              <span class="stat-number text-amber">{reconciliation.pendingCount || 0}</span>
              <span class="stat-name">Pendientes de Minado</span>
            </div>
            <div class="reconcile-stat">
              <span class="stat-number text-rose">{reconciliation.failedCount || 0}</span>
              <span class="stat-name">Fallidos o Revertidos</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

  </main>
</div>

<style>
  .app-layout {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }

  /* Header */
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 2rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1.25rem;
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .logo-box {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-cyan) 100%);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px var(--accent-indigo-glow);
  }

  .logo-icon {
    width: 30px;
    height: 30px;
    color: #fff;
  }

  .brand-title {
    font-size: 1.6rem;
    background: linear-gradient(to right, #fff, #c7d2fe, #67e8f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .brand-subtitle {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .status-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.85rem;
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color-subtle);
  }

  .status-chip.online {
    border-color: rgba(16, 185, 129, 0.4);
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
  }

  .status-chip.offline {
    border-color: rgba(244, 63, 94, 0.4);
    background: rgba(244, 63, 94, 0.1);
    color: #fb7185;
  }

  .status-chip.contract {
    cursor: pointer;
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.3);
    color: #a5b4fc;
  }
  .status-chip.contract:hover {
    background: rgba(99, 102, 241, 0.2);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    display: inline-block;
  }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow);
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .metric-title {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .metric-icon {
    font-size: 1.3rem;
  }

  .metric-value {
    font-size: 2rem;
    font-family: var(--font-display);
    font-weight: 700;
  }

  .metric-footer {
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  /* Navigation Tabs */
  .tabs-nav {
    display: flex;
    gap: 0.5rem;
    padding: 0.4rem;
    margin-bottom: 1.5rem;
    overflow-x: auto;
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.4rem;
    background: transparent;
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    font-size: 0.92rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-btn.active {
    background: linear-gradient(135deg, var(--accent-indigo) 0%, #4f46e5 100%);
    color: #fff;
    box-shadow: 0 4px 15px var(--accent-indigo-glow);
  }

  /* Panel Content */
  .panel-content {
    padding: 2rem;
  }

  .narrow-panel {
    max-width: 820px;
    margin: 0 auto;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .panel-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  .panel-actions {
    display: flex;
    gap: 0.75rem;
  }

  /* Data Table */
  .table-responsive {
    overflow-x: auto;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color-subtle);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.9rem;
  }

  .data-table th {
    background: rgba(16, 24, 40, 0.85);
    padding: 1rem 1.25rem;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color-subtle);
  }

  .data-table td {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .data-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .id-tag {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--accent-cyan);
  }

  .customer-info {
    display: flex;
    flex-direction: column;
  }

  .sub-info {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .usd-amount {
    font-weight: 600;
    color: #fff;
  }

  .eth-amount {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: #67e8f9;
  }

  .hash-btn {
    background: transparent;
    color: #a5b4fc;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
  .hash-btn:hover {
    color: #fff;
  }

  .block-tag {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.06);
    padding: 0.2rem 0.45rem;
    border-radius: var(--radius-sm);
  }

  /* Pagination Bar */
  .pagination-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .pagination-controls {
    display: flex;
    gap: 0.5rem;
  }

  /* Form Elements */
  .payment-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  input {
    background: rgba(10, 15, 28, 0.7);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  input:focus {
    border-color: var(--accent-indigo);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }

  .input-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.4rem;
    border-radius: var(--radius-sm);
    font-size: 0.92rem;
    font-weight: 600;
  }

  .btn-sm {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--accent-indigo) 0%, #4338ca 100%);
    color: #fff;
    box-shadow: 0 4px 16px var(--accent-indigo-glow);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px var(--accent-indigo-glow);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    border: 1px solid var(--border-color-subtle);
  }
  .btn-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
  }

  .btn-block {
    width: 100%;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* QR Layout */
  .qr-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  .qr-preview-side {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 380px;
  }

  .qr-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    width: 100%;
  }

  .qr-image-wrapper {
    background: #fff;
    padding: 1rem;
    border-radius: var(--radius-md);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  }

  .qr-img {
    width: 200px;
    height: 200px;
    display: block;
  }

  .qr-meta {
    text-align: center;
  }

  .qr-amount-text {
    font-size: 1.6rem;
    font-weight: 700;
    color: #67e8f9;
    font-family: var(--font-display);
    margin-top: 0.5rem;
  }

  .qr-ref-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .eip-uri-box {
    width: 100%;
    background: rgba(0, 0, 0, 0.25);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color-subtle);
  }

  .uri-copy-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .uri-copy-row code {
    font-size: 0.78rem;
    color: #cbd5e1;
  }

  .qr-placeholder {
    text-align: center;
    color: var(--text-muted);
  }

  .placeholder-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.75rem;
  }

  /* Success Card */
  .success-box {
    padding: 2rem;
    border-color: rgba(16, 185, 129, 0.4);
    background: rgba(16, 185, 129, 0.05);
  }

  .success-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .success-icon {
    font-size: 1.8rem;
  }

  .result-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .detail-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .detail-value.mono {
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }

  .btn-copy {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  /* Tools Grid */
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .tool-card {
    padding: 1.5rem;
  }

  .tool-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0.35rem 0 1.25rem;
  }

  .tool-input-row {
    display: flex;
    gap: 0.5rem;
  }

  .tool-input-row input {
    flex: 1;
  }

  .tool-result {
    margin-top: 1.25rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-sm);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tool-result-box {
    margin-top: 1.25rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 1rem;
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .result-row {
    display: flex;
    justify-content: space-between;
  }

  /* Reconciliation Box */
  .reconciliation-box {
    padding: 1.75rem;
    margin-top: 1.5rem;
  }

  .reconcile-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-top: 1.25rem;
  }

  .reconcile-stat {
    background: rgba(0, 0, 0, 0.25);
    padding: 1.25rem;
    border-radius: var(--radius-sm);
    text-align: center;
    border: 1px solid var(--border-color-subtle);
  }

  .stat-number {
    display: block;
    font-size: 2rem;
    font-family: var(--font-display);
    font-weight: 700;
  }

  .stat-name {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin-top: 0.35rem;
    display: block;
  }

  /* Toast */
  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 0.85rem 1.4rem;
    border-radius: var(--radius-md);
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: 1000;
    animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-success {
    border-color: rgba(16, 185, 129, 0.5);
    background: rgba(6, 78, 59, 0.95);
    color: #6ee7b7;
  }

  .toast-error {
    border-color: rgba(244, 63, 94, 0.5);
    background: rgba(136, 19, 55, 0.95);
    color: #fda4af;
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }

  .spinner.large {
    width: 36px;
    height: 36px;
    border-width: 3px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);
  }

  .empty-emoji {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .text-indigo { color: #818cf8; }
  .text-emerald { color: #34d399; }
  .text-cyan { color: #22d3ee; }
  .text-amber { color: #fbbf24; }
  .text-rose { color: #fb7185; }
  .text-muted { color: var(--text-muted); }
  .mt-3 { margin-top: 1rem; }
  .mt-4 { margin-top: 1.5rem; }

  @media (max-width: 768px) {
    .qr-layout { grid-template-columns: 1fr; }
    .form-grid { grid-template-columns: 1fr; }
    .app-header { flex-direction: column; align-items: flex-start; }
  }
</style>
