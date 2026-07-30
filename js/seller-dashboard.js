// ============================================================
// Yayika — Seller Dashboard (Financial)
// Complete seller financial management
// ============================================================

(function(){
  if(window._sellerDashboardLoaded) return;
  window._sellerDashboardLoaded=true;

  const SB_URL='https://odbhxiymteppgaqqdsoy.supabase.co';
  const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

  const T={
    es:{
      title:'Mi Dashboard Financiero',balance:'Saldo disponible',pending:'Pendiente',
      reserved:'Reservado',earned:'Total ganado',paid_out:'Total retirado',
      this_month:'Este mes',month_sales:'Ventas del mes',month_revenue:'Ingresos del mes',
      request_payout:'Solicitar retiro',payout_history:'Historial de retiros',
      transactions:'Movimientos',products:'Mis productos',reviews:'Reseñas',
      settings:'Configuración',overview:'Resumen',all_sales:'Todas las ventas',
      no_sales:'Aún no tienes ventas',no_products:'Crea tu primer producto',
      amount:'Monto',date:'Fecha',status:'Estado',type:'Tipo',
      completed:'Completada',pending_status:'Pendiente',processing:'Procesando',
      failed:'Fallida',cancelled:'Cancelada',refund:'Reembolso',
      sale:'Venta',payout:'Retiro',commission:'Comisión',
      available:'Disponible',minimum:'Mínimo',schedule:'Programación',
      connect_stripe:'Conectar con Stripe',onboard_title:'Activa tu tienda',
      onboard_desc:'Conecta tu cuenta de Stripe para recibir pagos directamente',
      start_selling:'Empezar a vender',view_all:'Ver todo',
      export_csv:'Exportar CSV',filter_date:'Filtrar por fecha',
      from:'Desde',to:'Hasta',apply:'Aplicar',clear:'Limpiar',
      daily:'Diario',weekly:'Semanal',monthly:'Mensual',
      product_name:'Producto',units:'Unidades',revenue:'Ingresos',
      rating:'Calificación',views:'Visitas',
      confirm_payout:'Confirmar retiro',payout_amount:'Monto a retirar',
      payout_method:'Método de pago',bank_transfer:'Transferencia bancaria',
      estimated:'Llegada estimada',cancel:'Cancelar',confirm:'Confirmar',
      no_transactions:'Sin movimientos',withdraw:'Retirar',
      success:'Éxito',error:'Error',loading:'Cargando...',
      stripe_dashboard:'Abrir dashboard de Stripe',connected:'Conectada',
      not_connected:'No conectada',disconnect:'Desconectar',
      payout_request_sent:'Solicitud de retiro enviada',
      payout_cancelled:'Retiro cancelado',
    }
  };

  function t(key){const lang=document.documentElement.lang||'es';return(T[lang]&&T[lang][key])||T.es[key]||key;}
  function fmt(cents,curr='MXN'){
    const symbols={MXN:'$',USD:'$',EUR:'€',COP:'$',BRL:'R$',ARS:'$',CLP:'$',PEN:'S/'};
    return`${symbols[curr]||'$'}${(cents/100).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  }
  function fmtDate(d){if(!d)return'—';return new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  function fmtShort(d){if(!d)return'—';return new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});}

  // Color palette
  const C={
    turq:'#00B4D8',rosa:'#E91E63',lila:'#7B5EA7',oro:'#D4A843',
    green:'#2ECC71',red:'#E74C3C',orange:'#F39C12',blue:'#3498DB',
    bg:'#FAF7F2',card:'#FFFFFF',border:'rgba(0,0,0,0.06)',
    text:'#2C2C2C',sub:'#888',success:'#27AE60',
  };

  let currentView='overview';
  let dashboardData=null;
  let transactionsData=[];

  // ============================================================
  // RENDER MAIN DASHBOARD
  // ============================================================
  function renderSellerDashboard(container){
    if(!container)return;
    container.innerHTML=`
      <div style="max-width:1100px;margin:0 auto;padding:24px 20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
          <div>
            <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:${C.text};margin:0">
              ${t('title')}
            </h2>
            <div id="seller-status-badge" style="margin-top:4px"></div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="sellerDash.toggleView('overview')" class="sd-tab active" data-view="overview">${t('overview')}</button>
            <button onclick="sellerDash.toggleView('transactions')" class="sd-tab" data-view="transactions">${t('transactions')}</button>
            <button onclick="sellerDash.toggleView('products')" class="sd-tab" data-view="products">${t('products')}</button>
            <button onclick="sellerDash.toggleView('payouts')" class="sd-tab" data-view="payouts">${t('payout_history')}</button>
          </div>
        </div>
        <div id="seller-dashboard-content"></div>
      </div>
      <style>
        .sd-tab{padding:8px 16px;border-radius:8px;border:1px solid ${C.border};background:${C.card};color:${C.sub};font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;font-family:inherit}
        .sd-tab.active,.sd-tab:hover{background:${C.lila};color:white;border-color:${C.lila}}
        .sd-card{background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:24px;transition:transform .2s,box-shadow .2s}
        .sd-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.06)}
        .sd-stat-label{font-size:12px;color:${C.sub};font-weight:500;text-transform:uppercase;letter-spacing:0.5px}
        .sd-stat-value{font-size:28px;font-weight:700;color:${C.text};margin-top:4px;font-family:'Cormorant Garamond',serif}
        .sd-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .sd-badge.success{background:#E8F5E9;color:#2E7D32}
        .sd-badge.warning{background:#FFF3E0;color:#E65100}
        .sd-badge.error{background:#FFEBEE;color:#C62828}
        .sd-badge.info{background:#E3F2FD;color:#1565C0}
        .sd-badge.pending{background:#FFF8E1;color:#F57F17}
        .sd-table{width:100%;border-collapse:collapse}
        .sd-table th{text-align:left;padding:10px 12px;font-size:11px;color:${C.sub};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${C.border);font-weight:600}
        .sd-table td{padding:12px;border-bottom:1px solid ${C.border};font-size:13px;color:${C.text}}
        .sd-table tr:hover{background:rgba(0,0,0,0.01)}
        .sd-empty{text-align:center;padding:48px 24px;color:${C.sub}}
        .sd-empty-icon{font-size:48px;margin-bottom:12px;opacity:0.3}
        .sd-action-btn{padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .2s}
        .sd-action-btn.primary{background:${C.turq};color:white}
        .sd-action-btn.primary:hover{background:#0096C7}
        .sd-action-btn.secondary{background:${C.card};color:${C.text};border:1px solid ${C.border}}
        .sd-action-btn.secondary:hover{background:#f5f5f5}
        .sd-action-btn.danger{background:${C.red};color:white}
        .sd-progress-bar{height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden}
        .sd-progress-fill{height:100%;border-radius:3px;transition:width .3s}
        .sd-chart-bar{display:flex;align-items:end;gap:4px;height:80px}
        .sd-chart-col{flex:1;border-radius:4px 4px 0 0;transition:height .3s;cursor:pointer;position:relative}
        .sd-chart-col:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#333;color:white;padding:4px 8px;border-radius:4px;font-size:11px;white-space:nowrap;z-index:10}
        @media(max-width:768px){
          .sd-tab{padding:6px 10px;font-size:11px}
          .sd-stat-value{font-size:22px}
          .sd-card{padding:16px}
        }
      </style>
    `;
    loadDashboard();
  }

  // ============================================================
  // LOAD DATA
  // ============================================================
  async function loadDashboard(){
    const content=document.getElementById('seller-dashboard-content');
    if(!content)return;
    content.innerHTML=`<div style="text-align:center;padding:48px;color:${C.sub}"><div style="font-size:24px;margin-bottom:8px">⏳</div>${t('loading')}</div>`;

    try{
      const token=localStorage.getItem('sb_access_token')||'';
      const resp=await fetch(`${SB_URL}/functions/v1/stripe-connect-dashboard`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${token}`,'apikey':SB_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({action:'get_dashboard'})
      });
      if(!resp.ok)throw new Error(await resp.text());
      dashboardData=await resp.json();
      renderCurrentView();
    }catch(e){
      console.error('Dashboard load error:',e);
      content.innerHTML=`<div class="sd-empty"><div class="sd-empty-icon">⚠️</div><div>Error cargando dashboard</div><div style="font-size:12px;margin-top:8px">${e.message}</div></div>`;
    }
  }

  // ============================================================
  // VIEW SWITCHING
  // ============================================================
  function toggleView(view){
    currentView=view;
    document.querySelectorAll('.sd-tab').forEach(t=>{
      t.classList.toggle('active',t.dataset.view===view);
    });
    renderCurrentView();
  }

  function renderCurrentView(){
    const content=document.getElementById('seller-dashboard-content');
    if(!content||!dashboardData)return;

    // Update status badge
    const statusBadge=document.getElementById('seller-status-badge');
    if(statusBadge){
      const s=dashboardData.seller;
      const isConnected=s.account_status==='active';
      statusBadge.innerHTML=`
        <span class="sd-badge ${isConnected?'success':'warning'}">
          ${isConnected?'🟢 '+t('connected'):'🟡 '+t('not_connected')}
        </span>
      `;
    }

    switch(currentView){
      case'overview':renderOverview(content);break;
      case'transactions':renderTransactions(content);break;
      case'products':renderProducts(content);break;
      case'payouts':renderPayouts(content);break;
    }
  }

  // ============================================================
  // OVERVIEW VIEW
  // ============================================================
  function renderOverview(el){
    const d=dashboardData;
    const b=d.balance;
    const m=d.month;
    const isStripeConnected=d.seller.account_status==='active';

    el.innerHTML=`
      ${!isStripeConnected?`
        <div class="sd-card" style="background:linear-gradient(135deg,#FFF3E0,#FFF8E1);border:1px solid #FFE0B2;margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div style="width:48px;height:48px;background:${C.orange};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px">🏪</div>
            <div style="flex:1;min-width:200px">
              <div style="font-size:16px;font-weight:700;color:${C.text}">${t('onboard_title')}</div>
              <div style="font-size:13px;color:${C.sub};margin-top:2px">${t('onboard_desc')}</div>
            </div>
            <button onclick="sellerDash.connectStripe()" class="sd-action-btn primary" style="white-space:nowrap">
              ⚡ ${t('connect_stripe')}
            </button>
          </div>
        </div>
      `:''}

      <!-- Balance Cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px" class="sd-balance-grid">
        <div class="sd-card">
          <div class="sd-stat-label">${t('balance')}</div>
          <div class="sd-stat-value" style="color:${C.green}">${fmt(b.available)}</div>
          <div style="margin-top:8px">
            <button onclick="sellerDash.openPayoutModal()" class="sd-action-btn primary" style="width:100%;font-size:12px;padding:8px 12px">
              💸 ${t('withdraw')}
            </button>
          </div>
        </div>
        <div class="sd-card">
          <div class="sd-stat-label">${t('pending')}</div>
          <div class="sd-stat-value" style="color:${C.orange}">${fmt(b.pending)}</div>
          <div style="font-size:11px;color:${C.sub};margin-top:4px">En proceso deStripe</div>
        </div>
        <div class="sd-card">
          <div class="sd-stat-label">${t('this_month')}</div>
          <div class="sd-stat-value" style="color:${C.turq}">${fmt(m.net_earnings)}</div>
          <div style="font-size:11px;color:${C.sub};margin-top:4px">${m.sales_count} ventas</div>
        </div>
        <div class="sd-card">
          <div class="sd-stat-label">${t('earned')}</div>
          <div class="sd-stat-value" style="color:${C.lila}">${fmt(b.lifetime_earned)}</div>
          <div style="font-size:11px;color:${C.sub};margin-top:4px">Retirado: ${fmt(b.lifetime_paid_out)}</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:24px" class="sd-charts-grid">
        <!-- Monthly Chart -->
        <div class="sd-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div style="font-size:14px;font-weight:600;color:${C.text}">📊 Ventas recientes</div>
          </div>
          ${renderSalesChart(d.recent_sales)}
        </div>

        <!-- Quick Stats -->
        <div class="sd-card">
          <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:16px">📈 Resumen rápido</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:${C.sub}">Productos activos</span>
              <span style="font-size:16px;font-weight:700;color:${C.text}">${d.products.filter(p=>p.status==='active').length}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:${C.sub}">Total productos</span>
              <span style="font-size:16px;font-weight:700;color:${C.text}">${d.products.length}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:${C.sub}">Reseñas</span>
              <span style="font-size:16px;font-weight:700;color:${C.text}">${d.seller.rating_count||0} ⭐</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:${C.sub}">Comisión Yayika</span>
              <span style="font-size:16px;font-weight:700;color:${C.text}">${d.seller.platform_fee_percent||15}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:${C.sub}">Programa de pago</span>
              <span style="font-size:13px;font-weight:600;color:${C.text}">${d.seller.payout_schedule||'Semanal'}</span>
            </div>
            ${d.pending_payouts_count>0?`
              <div style="background:${C.orange}15;border:1px solid ${C.orange}30;border-radius:8px;padding:8px 12px;font-size:12px;color:${C.orange}">
                ⏳ ${d.pending_payouts_count} retiro(s) en proceso
              </div>
            `:''}
          </div>
        </div>
      </div>

      <!-- Recent Sales -->
      <div class="sd-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:14px;font-weight:600;color:${C.text}">🛒 Últimas ventas</div>
          <button onclick="sellerDash.toggleView('transactions')" style="font-size:12px;color:${C.turq};background:none;border:none;cursor:pointer;font-weight:600">
            ${t('view_all')} →
          </button>
        </div>
        ${d.recent_sales.length>0?`
          <table class="sd-table">
            <thead>
              <tr>
                <th>${t('product_name')}</th>
                <th>${t('amount')}</th>
                <th>Tu ganancia</th>
                <th>${t('date')}</th>
                <th>${t('status')}</th>
              </tr>
            </thead>
            <tbody>
              ${d.recent_sales.map(s=>`
                <tr>
                  <td style="font-weight:500">${s.product?.name||'Producto'}</td>
                  <td>${fmt(s.amount_cents)}</td>
                  <td style="color:${C.green};font-weight:600">${fmt(s.seller_net_cents)}</td>
                  <td style="color:${C.sub}">${fmtShort(s.created_at)}</td>
                  <td>${statusBadge(s.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `:`<div class="sd-empty"><div class="sd-empty-icon">🛒</div>${t('no_sales')}</div>`}
      </div>

      <!-- Reviews -->
      ${d.reviews.length>0?`
        <div class="sd-card" style="margin-top:16px">
          <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:16px">⭐ Reseñas recientes</div>
          ${d.reviews.map(r=>`
            <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid ${C.border}">
              <div style="width:36px;height:36px;border-radius:50%;background:${C.lila};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;flex-shrink:0">
                ${(r.buyer?.full_name||'U')[0].toUpperCase()}
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-weight:600;font-size:13px">${r.buyer?.full_name||'Anónima'}</span>
                  <span style="color:${C.oro}">${'⭐'.repeat(r.rating)}</span>
                  <span style="font-size:11px;color:${C.sub}">${fmtShort(r.created_at)}</span>
                </div>
                ${r.title?`<div style="font-weight:600;font-size:13px;margin-top:2px">${r.title}</div>`:''}
                ${r.comment?`<div style="font-size:13px;color:${C.sub};margin-top:2px;line-height:1.5">${r.comment}</div>`:''}
              </div>
            </div>
          `).join('')}
        </div>
      `:''}
    `;

    // Responsive
    const style=document.createElement('style');
    style.textContent=`
      @media(max-width:900px){.sd-balance-grid{grid-template-columns:repeat(2,1fr)!important}.sd-charts-grid{grid-template-columns:1fr!important}}
      @media(max-width:500px){.sd-balance-grid{grid-template-columns:1fr!important}}
    `;
    el.appendChild(style);
  }

  // ============================================================
  // SALES CHART
  // ============================================================
  function renderSalesChart(sales){
    if(!sales||sales.length===0)return`<div style="text-align:center;padding:24px;color:${C.sub};font-size:13px">Sin datos de ventas aún</div>`;

    const grouped={};
    sales.forEach(s=>{
      const day=new Date(s.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});
      grouped[day]=(grouped[day]||0)+s.amount_cents;
    });

    const entries=Object.entries(grouped).slice(-14);
    const max=Math.max(...entries.map(e=>e[1]),1);

    return`
      <div class="sd-chart-bar">
        ${entries.map(([label,val])=>{
          const pct=Math.round((val/max)*100);
          return`<div class="sd-chart-col" style="height:${Math.max(pct,5)}%;background:linear-gradient(to top,${C.turq},${C.lila})" data-tip="${label}: ${fmt(val)}"></div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        ${entries.map(([label])=>`<span style="font-size:9px;color:${C.sub}">${label}</span>`).join('')}
      </div>
    `;
  }

  // ============================================================
  // TRANSACTIONS VIEW
  // ============================================================
  function renderTransactions(el){
    el.innerHTML=`
      <div class="sd-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <div style="font-size:14px;font-weight:600;color:${C.text}">📋 ${t('transactions')}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <select id="tx-type-filter" onchange="sellerDash.filterTransactions()" style="padding:6px 12px;border:1px solid ${C.border};border-radius:8px;font-size:12px;font-family:inherit">
              <option value="">Todos los tipos</option>
              <option value="sale">Venta</option>
              <option value="payout">Retiro</option>
              <option value="commission">Comisión</option>
              <option value="refund">Reembolso</option>
            </select>
            <input type="date" id="tx-from" style="padding:6px 12px;border:1px solid ${C.border};border-radius:8px;font-size:12px;font-family:inherit">
            <input type="date" id="tx-to" style="padding:6px 12px;border:1px solid ${C.border};border-radius:8px;font-size:12px;font-family:inherit">
            <button onclick="sellerDash.filterTransactions()" class="sd-action-btn secondary" style="padding:6px 12px;font-size:12px">🔍</button>
            <button onclick="sellerDash.exportCSV()" class="sd-action-btn secondary" style="padding:6px 12px;font-size:12px">📥 ${t('export_csv')}</button>
          </div>
        </div>
        <div id="tx-list"><div style="text-align:center;padding:24px;color:${C.sub}">⏳ ${t('loading')}</div></div>
      </div>
    `;
    loadTransactions();
  }

  async function loadTransactions(type='',from='',to=''){
    const listEl=document.getElementById('tx-list');
    if(!listEl)return;

    try{
      const token=localStorage.getItem('sb_access_token')||'';
      const resp=await fetch(`${SB_URL}/functions/v1/stripe-connect-dashboard`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${token}`,'apikey':SB_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({action:'get_transactions',type:type||undefined,from:from||undefined,to:to||undefined,limit:50})
      });
      if(!resp.ok)throw new Error(await resp.text());
      const data=await resp.json();
      transactionsData=data.transactions;

      if(!data.transactions||data.transactions.length===0){
        listEl.innerHTML=`<div class="sd-empty"><div class="sd-empty-icon">📋</div>${t('no_transactions')}</div>`;
        return;
      }

      listEl.innerHTML=`
        <div style="font-size:12px;color:${C.sub};margin-bottom:12px">${data.total} movimientos encontrados</div>
        <table class="sd-table">
          <thead>
            <tr>
              <th>${t('type')}</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Saldo</th>
              <th>${t('date')}</th>
            </tr>
          </thead>
          <tbody>
            ${data.transactions.map(tx=>`
              <tr>
                <td>${txTypeIcon(tx.type)} ${txTypeLabel(tx.type)}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tx.description||'—'}</td>
                <td style="font-weight:600;color:${tx.direction==='credit'?C.green:C.red}">
                  ${tx.direction==='credit'?'+':'-'}${fmt(tx.amount_cents)}
                </td>
                <td style="color:${C.sub}">${fmt(tx.balance_after_cents)}</td>
                <td style="color:${C.sub};font-size:12px">${fmtDate(tx.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }catch(e){
      listEl.innerHTML=`<div class="sd-empty">⚠️ Error: ${e.message}</div>`;
    }
  }

  function filterTransactions(){
    const type=document.getElementById('tx-type-filter')?.value||'';
    const from=document.getElementById('tx-from')?.value||'';
    const to=document.getElementById('tx-to')?.value||'';
    loadTransactions(type,from,to);
  }

  function txTypeIcon(type){
    const icons={sale:'💰',payout:'💸',commission:'🤝',refund:'↩️',payout_cancelled:'🔄',adjustment:'⚙️'};
    return icons[type]||'📄';
  }
  function txTypeLabel(type){
    const labels={sale:t('sale'),payout:t('payout'),commission:t('commission'),refund:t('refund'),payout_cancelled:'Retiro cancelado',adjustment:'Ajuste'};
    return labels[type]||type;
  }

  // ============================================================
  // PRODUCTS VIEW
  // ============================================================
  function renderProducts(el){
    const products=dashboardData.products;

    el.innerHTML=`
      <div class="sd-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:14px;font-weight:600;color:${C.text}">📦 ${t('products')}</div>
          <button onclick="sellerDash.openAddProduct()" class="sd-action-btn primary" style="font-size:12px;padding:8px 16px">
            ➕ Nuevo producto
          </button>
        </div>
        ${products.length>0?`
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
            ${products.map(p=>`
              <div class="sd-card" style="cursor:pointer" onclick="sellerDash.viewProduct('${p.id}')">
                <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:12px">
                  <div>
                    <div style="font-size:15px;font-weight:700;color:${C.text}">${p.name}</div>
                    <div style="font-size:12px;color:${C.sub};margin-top:2px">${p.category}</div>
                  </div>
                  ${statusBadge(p.status)}
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px">
                  <div>
                    <div style="font-size:11px;color:${C.sub}">Precio</div>
                    <div style="font-size:15px;font-weight:700;color:${C.text}">${fmt(p.price_cents)}</div>
                  </div>
                  <div>
                    <div style="font-size:11px;color:${C.sub}">Ventas</div>
                    <div style="font-size:15px;font-weight:700;color:${C.turq}">${p.total_sales||0}</div>
                  </div>
                  <div>
                    <div style="font-size:11px;color:${C.sub}">Ingresos</div>
                    <div style="font-size:15px;font-weight:700;color:${C.green}">${fmt(p.total_revenue_cents||0)}</div>
                  </div>
                </div>
                ${p.rating_count>0?`
                  <div style="margin-top:8px;font-size:12px;color:${C.sub}">
                    ⭐ ${p.rating_avg} (${p.rating_count} reseñas) · 👁 ${p.view_count||0} vistas
                  </div>
                `:''}
              </div>
            `).join('')}
          </div>
        `:`<div class="sd-empty"><div class="sd-empty-icon">📦</div>${t('no_products')}</div>`}
      </div>
    `;
  }

  // ============================================================
  // PAYOUTS VIEW
  // ============================================================
  function renderPayouts(el){
    const payouts=dashboardData.payouts;
    const b=dashboardData.balance;

    el.innerHTML=`
      <!-- Payout Action -->
      <div class="sd-card" style="background:linear-gradient(135deg,${C.green}08,${C.turq}08);margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="font-size:13px;color:${C.sub};margin-bottom:4px">${t('balance')}</div>
            <div style="font-size:32px;font-weight:700;color:${C.green}">${fmt(b.available)}</div>
            <div style="font-size:12px;color:${C.sub};margin-top:4px">
              Mínimo: ${fmt(dashboardData.seller.minimum_payout_cents||50000)} · Programa: ${dashboardData.seller.payout_schedule||'Semanal'}
            </div>
          </div>
          <button onclick="sellerDash.openPayoutModal()" class="sd-action-btn primary" style="font-size:14px;padding:14px 28px">
            💸 ${t('request_payout')}
          </button>
        </div>
      </div>

      <!-- Payout History -->
      <div class="sd-card">
        <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:16px">📜 ${t('payout_history')}</div>
        ${payouts.length>0?`
          <table class="sd-table">
            <thead>
              <tr>
                <th>${t('amount')}</th>
                <th>${t('payout_method')}</th>
                <th>${t('date')}</th>
                <th>Stripe ID</th>
                <th>${t('status')}</th>
              </tr>
            </thead>
            <tbody>
              ${payouts.map(p=>`
                <tr>
                  <td style="font-weight:600">${fmt(p.amount_cents)}</td>
                  <td style="font-size:12px">${p.bank_name||'Transferencia'}</td>
                  <td style="font-size:12px;color:${C.sub}">${fmtDate(p.requested_at)}</td>
                  <td style="font-size:11px;color:${C.sub};font-family:monospace">${p.stripe_transfer_id||'—'}</td>
                  <td>${payoutStatusBadge(p.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `:`<div class="sd-empty"><div class="sd-empty-icon">💸</div>Solicita tu primer retiro</div>`}
      </div>
    `;
  }

  function payoutStatusBadge(status){
    const map={
      pending:{cls:'pending',text:'⏳ Pendiente'},
      processing:{cls:'info',text:'🔄 Procesando'},
      completed:{cls:'success',text:'✅ Completado'},
      failed:{cls:'error',text:'❌ Fallido'},
      cancelled:{cls:'warning',text:'🚫 Cancelado'},
    };
    const s=map[status]||{cls:'info',text:status};
    return`<span class="sd-badge ${s.cls}">${s.text}</span>`;
  }

  // ============================================================
  // PAYOUT MODAL
  // ============================================================
  function openPayoutModal(){
    const b=dashboardData.balance;
    const min=dashboardData.seller.minimum_payout_cents||50000;
    const available=b.available;

    const modal=document.createElement('div');
    modal.id='payout-modal';
    modal.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center';
    modal.onclick=(e)=>{if(e.target===modal)modal.remove()};

    modal.innerHTML=`
      <div style="background:${C.card};border-radius:20px;padding:32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2)" onclick="event.stopPropagation()">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:${C.text};margin:0">💸 ${t('request_payout')}</h3>
          <button onclick="this.closest('#payout-modal').remove()" style="width:32px;height:32px;border-radius:50%;border:none;background:${C.bg};font-size:16px;cursor:pointer;color:${C.sub}">✕</button>
        </div>

        <div style="background:${C.bg};border-radius:12px;padding:16px;margin-bottom:20px">
          <div style="font-size:12px;color:${C.sub}">${t('balance')}</div>
          <div style="font-size:24px;font-weight:700;color:${C.green};margin-top:4px">${fmt(available)}</div>
          <div style="font-size:11px;color:${C.sub};margin-top:4px">Mínimo: ${fmt(min)}</div>
        </div>

        <div style="margin-bottom:16px">
          <label style="font-size:12px;font-weight:600;color:${C.sub};display:block;margin-bottom:6px">${t('payout_amount')}</label>
          <div style="position:relative">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:16px;font-weight:600;color:${C.sub}">$</span>
            <input type="number" id="payout-amount" min="0" max="${available}" step="100" value="${Math.min(available,available)}"
              style="width:100%;padding:12px 12px 12px 28px;border:1px solid ${C.border};border-radius:10px;font-size:16px;font-weight:600;font-family:inherit;box-sizing:border-box"
              oninput="sellerDash.updatePayoutPreview()">
          </div>
        </div>

        <!-- Quick amounts -->
        <div style="display:flex;gap:8px;margin-bottom:16px">
          ${[min,Math.min(available,min*2),Math.round(available/2),available].filter((v,i,a)=>a.indexOf(v)===i&&v<=available&&v>=min).map(amt=>`
            <button onclick="document.getElementById('payout-amount').value=${amt};sellerDash.updatePayoutPreview()"
              style="flex:1;padding:8px;border:1px solid ${C.border};border-radius:8px;background:${C.bg};font-size:12px;cursor:pointer;font-family:inherit">
              ${fmt(amt)}
            </button>
          `).join('')}
        </div>

        <div id="payout-preview" style="background:#E8F5E9;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:13px">
          ✅ Recibirás ${fmt(available)} en tu cuenta bancaria
        </div>

        <div style="display:flex;gap:10px">
          <button onclick="this.closest('#payout-modal').remove()" class="sd-action-btn secondary" style="flex:1">${t('cancel')}</button>
          <button onclick="sellerDash.submitPayout()" class="sd-action-btn primary" style="flex:2" id="payout-submit-btn">${t('confirm_payout')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function updatePayoutPreview(){
    const amount=parseInt(document.getElementById('payout-amount')?.value)||0;
    const preview=document.getElementById('payout-preview');
    const btn=document.getElementById('payout-submit-btn');
    if(!preview)return;

    if(amount<dashboardData.seller.minimum_payout_cents){
      preview.style.background='#FFEBEE';
      preview.innerHTML=`⚠️ El monto mínimo es ${fmt(dashboardData.seller.minimum_payout_cents||50000)}`;
      if(btn)btn.disabled=true;
    }else if(amount>dashboardData.balance.available){
      preview.style.background='#FFEBEE';
      preview.innerHTML=`⚠️ Saldo insuficiente. Disponible: ${fmt(dashboardData.balance.available)}`;
      if(btn)btn.disabled=true;
    }else{
      preview.style.background='#E8F5E9';
      preview.innerHTML=`✅ Recibirás ${fmt(amount)} en tu cuenta bancaria`;
      if(btn)btn.disabled=false;
    }
  }

  async function submitPayout(){
    const amount=parseInt(document.getElementById('payout-amount')?.value)||0;
    const btn=document.getElementById('payout-submit-btn');
    if(btn){btn.disabled=true;btn.textContent='⏳ Procesando...';}

    try{
      const token=localStorage.getItem('sb_access_token')||'';
      const resp=await fetch(`${SB_URL}/functions/v1/stripe-connect-payout`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${token}`,'apikey':SB_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({action:'request_payout',amount_cents:amount})
      });
      const data=await resp.json();
      if(!resp.ok)throw new Error(data.error);

      document.getElementById('payout-modal')?.remove();
      showToast(t('payout_request_sent'),'success');
      await loadDashboard();
    }catch(e){
      showToast(e.message,'error');
      if(btn){btn.disabled=false;btn.textContent=t('confirm_payout');}
    }
  }

  // ============================================================
  // STRIPE CONNECT
  // ============================================================
  async function connectStripe(){
    try{
      const token=localStorage.getItem('sb_access_token')||'';
      const resp=await fetch(`${SB_URL}/functions/v1/stripe-connect-onboard`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${token}`,'apikey':SB_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({action:'create_account'})
      });
      const data=await resp.json();
      if(!resp.ok)throw new Error(data.error);
      if(data.url)window.location.href=data.url;
    }catch(e){
      showToast(e.message,'error');
    }
  }

  // ============================================================
  // EXPORT CSV
  // ============================================================
  function exportCSV(){
    if(!transactionsData||transactionsData.length===0){
      showToast('No hay datos para exportar','error');
      return;
    }

    const headers=['Fecha','Tipo','Descripción','Monto','Dirección','Saldo después'];
    const rows=transactionsData.map(tx=>[
      new Date(tx.created_at).toLocaleString('es-MX'),
      txTypeLabel(tx.type),
      tx.description||'',
      `${tx.direction==='credit'?'+':'-'}${(tx.amount_cents/100).toFixed(2)}`,
      tx.direction,
      (tx.balance_after_cents/100).toFixed(2)
    ]);

    const csv=[headers,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`yayika-movimientos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();URL.revokeObjectURL(url);
    showToast('CSV descargado','success');
  }

  // ============================================================
  // TOAST
  // ============================================================
  function showToast(msg,type='info'){
    const toast=document.createElement('div');
    toast.style.cssText=`position:fixed;bottom:24px;right:24px;z-index:9999;padding:14px 20px;border-radius:12px;font-size:13px;font-weight:500;color:white;box-shadow:0 8px 24px rgba(0,0,0,0.15);animation:slideUp .3s ease;max-width:320px;font-family:inherit`;
    toast.style.background=type==='success'?'#27AE60':type==='error'?'#E74C3C':C.turq;
    toast.textContent=msg;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),3500);
  }

  function statusBadge(status){
    const map={completed:'success',pending:'warning',processing:'info',refunded:'error',cancelled:'error'};
    return`<span class="sd-badge ${map[status]||'info'}">${status}</span>`;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  window.sellerDash={
    render:renderSellerDashboard,
    toggleView,
    loadDashboard,
    filterTransactions,
    exportCSV,
    openPayoutModal,
    updatePayoutPreview,
    submitPayout,
    connectStripe,
    openAddProduct(){showToast('Próximamente: crear producto desde el dashboard','info');},
    viewProduct(id){showToast('Vista de producto en desarrollo','info');}
  };

})();
