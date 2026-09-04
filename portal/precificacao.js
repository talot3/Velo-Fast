/**
 * ═══════════════════════════════════════════════════════════════
 *  VELO FAST — Módulo de Precificação Premium
 *  Engenharia Econômica & Formação de Preços
 *  Versão: 1.0.0
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Injeção de Estilos CSS ───────────────────────────────────────────────────
(function injectPrecificacaoStyles() {
    if (document.getElementById('velo-precificacao-css')) return;
    const style = document.createElement('style');
    style.id = 'velo-precificacao-css';
    style.innerHTML = `
        /* ─────────────────────────────────────────────────────────────
           VELO — Sistema de Precificação Premium
           Paleta: Warm Gray tátil + Verde-oliva (lucro) + Terracota (prejuízo)
        ───────────────────────────────────────────────────────────── */

        :root {
            --prec-olive:       #5c6e46;
            --prec-olive-light: #7a8f60;
            --prec-olive-bg:    #f0f3eb;
            --prec-terra:       #8b4a3a;
            --prec-terra-light: #a65c4b;
            --prec-terra-bg:    #f8efed;
            --prec-warn-bg:     #fdf7ee;
            --prec-warn:        #9a6d3a;
            --prec-bg:          #f7f6f3;
            --prec-surface:     #ffffff;
            --prec-border:      #e3e1da;
            --prec-border-dark: #ccc9c0;
            --prec-text:        #2c2b29;
            --prec-text-sub:    #7a7975;
            --prec-text-light:  #b0ada5;
            --prec-shadow-sm:   0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06);
            --prec-shadow-md:   0 4px 12px -2px rgba(28,26,24,0.08), 0 1px 3px rgba(0,0,0,0.04);
            --prec-shadow-inset: inset 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 2px rgba(0,0,0,0.02);
            --prec-radius:      10px;
            --prec-radius-sm:   6px;
            --prec-radius-lg:   16px;
        }

        /* ─── Wrapper Principal ─── */
        .prec-wrapper {
            background: var(--prec-bg);
            border-radius: var(--prec-radius-lg);
            border: 1px solid var(--prec-border);
            overflow: hidden;
            box-shadow: var(--prec-shadow-md);
            margin-top: 4px;
        }

        /* ─── Cabeçalho do Módulo ─── */
        .prec-header {
            background: linear-gradient(135deg, #2e2d2b 0%, #1c1b19 100%);
            background-image: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 1px, transparent 1px),
                              linear-gradient(135deg, #2e2d2b 0%, #1c1b19 100%);
            background-size: 4px 4px, auto;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .prec-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .prec-header-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        .prec-header-icon svg { color: #d4af76; width: 18px; height: 18px; }
        .prec-header-title {
            font-size: 13px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.01em;
        }
        .prec-header-subtitle {
            font-size: 10.5px;
            color: rgba(255,255,255,0.45);
            font-weight: 500;
            margin-top: 1px;
        }
        .prec-header-badge {
            font-size: 9.5px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #d4af76;
            background: rgba(212,175,118,0.12);
            border: 1px solid rgba(212,175,118,0.25);
            border-radius: 4px;
            padding: 3px 8px;
        }

        /* ─── Corpo do módulo ─── */
        .prec-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            background: var(--prec-bg);
        }

        /* ─── Seções / Cards Táteis ─── */
        .prec-section {
            background: var(--prec-surface);
            border-radius: var(--prec-radius);
            border: 1px solid var(--prec-border);
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 8px rgba(0,0,0,0.04),
                        inset 0 1px 0 rgba(255,255,255,0.9);
            transition: box-shadow 0.2s ease;
        }
        .prec-section:hover {
            box-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 6px 16px rgba(28,26,24,0.08),
                        inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .prec-section-header {
            padding: 12px 16px;
            background: linear-gradient(to bottom, #faf9f7, #f4f3f0);
            border-bottom: 1px solid var(--prec-border);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .prec-section-icon {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .prec-section-icon svg { width: 14px; height: 14px; }
        .prec-section-title {
            font-size: 12px;
            font-weight: 800;
            color: var(--prec-text);
            letter-spacing: -0.01em;
        }
        .prec-section-subtitle {
            font-size: 10.5px;
            color: var(--prec-text-sub);
            font-weight: 500;
            margin-left: auto;
        }

        .prec-section-body {
            padding: 16px;
        }

        /* ─── Grade de Campos ─── */
        .prec-fields-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
        }
        .prec-fields-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .prec-fields-grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }

        .prec-field {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .prec-field-label {
            font-size: 10.5px;
            font-weight: 700;
            color: var(--prec-text-sub);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .prec-field-label .prec-label-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            display: inline-block;
        }
        .prec-input-wrap {
            position: relative;
        }
        .prec-input-prefix {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 11.5px;
            font-weight: 700;
            color: var(--prec-text-sub);
            pointer-events: none;
            z-index: 1;
        }
        .prec-input-suffix {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 11.5px;
            font-weight: 700;
            color: var(--prec-text-sub);
            pointer-events: none;
        }
        .prec-input {
            width: 100%;
            height: 38px;
            padding: 0 10px;
            background: #f0ede8;
            border: 1.5px solid var(--prec-border-dark);
            border-radius: var(--prec-radius-sm);
            font-family: 'Outfit', sans-serif;
            font-size: 13px;
            font-weight: 700;
            color: var(--prec-text);
            transition: all 0.18s ease;
            outline: none;
            box-shadow: var(--prec-shadow-inset);
        }
        .prec-input:focus {
            background: #ffffff;
            border-color: #7a8f60;
            box-shadow: 0 0 0 3px rgba(92,110,70,0.12), var(--prec-shadow-inset);
        }
        .prec-input.has-prefix { padding-left: 30px; }
        .prec-input.has-suffix { padding-right: 26px; }
        .prec-input[readonly] {
            background: #f7f6f3;
            border-color: var(--prec-border);
            color: var(--prec-text-sub);
            cursor: default;
            box-shadow: none;
        }
        .prec-input[readonly]:focus {
            border-color: var(--prec-border);
            box-shadow: none;
        }

        /* ─── Ficha Técnica — linhas de insumo ─── */
        .prec-insumos-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'Outfit', sans-serif;
        }
        .prec-insumos-table thead th {
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: var(--prec-text-sub);
            padding: 6px 8px;
            border-bottom: 1.5px solid var(--prec-border);
            text-align: left;
            background: #faf9f7;
        }
        .prec-insumos-table tbody tr {
            border-bottom: 1px solid rgba(227,225,218,0.6);
            transition: background 0.15s ease;
        }
        .prec-insumos-table tbody tr:last-child { border-bottom: none; }
        .prec-insumos-table tbody tr:hover { background: #f7f6f3; }
        .prec-insumos-table td {
            padding: 8px;
            vertical-align: middle;
        }
        .prec-insumos-table td input {
            width: 100%;
            height: 32px;
            padding: 0 8px;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 4px;
            font-family: 'Outfit', sans-serif;
            font-size: 12.5px;
            font-weight: 600;
            color: var(--prec-text);
            transition: all 0.15s ease;
            outline: none;
        }
        .prec-insumos-table td input:hover {
            background: #f0ede8;
            border-color: var(--prec-border);
        }
        .prec-insumos-table td input:focus {
            background: #ffffff;
            border-color: #7a8f60;
            box-shadow: 0 0 0 2px rgba(92,110,70,0.1);
        }
        .prec-insumos-table td .prec-td-currency {
            display: flex;
            align-items: center;
            gap: 3px;
        }
        .prec-insumos-table td .prec-td-currency span {
            font-size: 10.5px;
            color: var(--prec-text-sub);
            font-weight: 600;
            flex-shrink: 0;
        }
        .prec-td-total {
            font-size: 12.5px;
            font-weight: 800;
            color: var(--prec-text);
            text-align: right;
            white-space: nowrap;
        }
        .prec-btn-icon-sm {
            width: 28px;
            height: 28px;
            border-radius: var(--prec-radius-sm);
            border: 1px solid var(--prec-border-dark);
            background: #f0ede8;
            color: var(--prec-text-sub);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
            flex-shrink: 0;
        }
        .prec-btn-icon-sm:hover { background: var(--prec-terra-bg); color: var(--prec-terra); border-color: var(--prec-terra-light); }
        .prec-btn-icon-sm svg { width: 12px; height: 12px; }
        .prec-btn-add-row {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border: 1.5px dashed var(--prec-border-dark);
            border-radius: var(--prec-radius-sm);
            background: transparent;
            color: var(--prec-text-sub);
            font-family: 'Outfit', sans-serif;
            font-size: 11.5px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
            width: 100%;
            margin-top: 8px;
        }
        .prec-btn-add-row:hover {
            background: var(--prec-olive-bg);
            border-color: var(--prec-olive);
            color: var(--prec-olive);
        }
        .prec-btn-add-row svg { width: 12px; height: 12px; }

        /* Custo Total (resumo das fichas) */
        .prec-cost-summary {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: linear-gradient(135deg, #f0f3eb 0%, #eaedd3 100%);
            border-radius: var(--prec-radius-sm);
            border: 1px solid #c8d1ae;
            margin-top: 12px;
        }
        .prec-cost-summary-label {
            font-size: 11px;
            font-weight: 800;
            color: #4a5e33;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .prec-cost-summary-value {
            font-size: 16px;
            font-weight: 900;
            color: #3a4f26;
            letter-spacing: -0.02em;
        }

        /* ─── Pills de Seleção de Método ─── */
        .prec-method-selector {
            display: flex;
            gap: 0;
            background: #ece9e3;
            border-radius: 10px;
            padding: 4px;
            border: 1px solid var(--prec-border-dark);
            box-shadow: var(--prec-shadow-inset);
        }
        .prec-method-pill {
            flex: 1;
            padding: 9px 14px;
            border-radius: 7px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-family: 'Outfit', sans-serif;
            font-size: 11.5px;
            font-weight: 700;
            color: var(--prec-text-sub);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: center;
            position: relative;
            line-height: 1.3;
            letter-spacing: -0.01em;
        }
        .prec-method-pill.active {
            background: var(--prec-surface);
            color: var(--prec-text);
            box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9);
            font-weight: 800;
        }
        .prec-method-pill-title {
            display: block;
            font-size: 11.5px;
            font-weight: 800;
        }
        .prec-method-pill-sub {
            display: block;
            font-size: 9.5px;
            font-weight: 600;
            opacity: 0.7;
            margin-top: 1px;
        }
        .prec-method-pill.active .prec-method-pill-sub {
            opacity: 0.55;
        }

        /* ─── Painéis dos Métodos ─── */
        .prec-method-panel {
            display: none;
        }
        .prec-method-panel.active {
            display: block;
            animation: precFadeIn 0.2s ease;
        }
        @keyframes precFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── Resultado de Preço de Venda ─── */
        .prec-price-result {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #2e2d2b 0%, #1c1b19 100%);
            background-image: radial-gradient(circle at 25% 75%, rgba(212,175,118,0.08) 0%, transparent 50%),
                              linear-gradient(135deg, #2e2d2b 0%, #1c1b19 100%);
            border-radius: var(--prec-radius);
            border: 1px solid rgba(255,255,255,0.06);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
            position: relative;
            overflow: hidden;
            gap: 6px;
        }
        .prec-price-result::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 60%);
            pointer-events: none;
        }
        .prec-price-result-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(255,255,255,0.45);
        }
        .prec-price-result-value {
            font-size: 32px;
            font-weight: 900;
            letter-spacing: -0.04em;
            color: #d4af76;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .prec-price-result-markup {
            font-size: 11px;
            font-weight: 700;
            color: rgba(255,255,255,0.5);
        }
        .prec-price-result-markup strong {
            color: rgba(255,255,255,0.75);
        }

        /* ─── DRE Unitária ─── */
        .prec-dre-wrapper {
            border-radius: var(--prec-radius);
            overflow: hidden;
            border: 1px solid var(--prec-border);
            background: var(--prec-surface);
            box-shadow: var(--prec-shadow-sm);
        }
        .prec-dre-header {
            padding: 10px 16px;
            background: linear-gradient(to bottom, #faf9f7, #f4f3f0);
            border-bottom: 1px solid var(--prec-border);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .prec-dre-header-text {
            font-size: 11px;
            font-weight: 800;
            color: var(--prec-text);
            text-transform: uppercase;
            letter-spacing: 0.07em;
        }
        .prec-dre-live-badge {
            font-size: 8.5px;
            font-weight: 800;
            letter-spacing: 0.1em;
            color: var(--prec-olive);
            background: var(--prec-olive-bg);
            border: 1px solid rgba(92,110,70,0.25);
            border-radius: 3px;
            padding: 2px 6px;
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .prec-dre-live-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--prec-olive);
            animation: prec-blink 1.8s ease infinite;
        }
        @keyframes prec-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        .prec-dre-table {
            width: 100%;
            border-collapse: collapse;
        }
        .prec-dre-row {
            display: flex;
            align-items: center;
            padding: 8px 16px;
            border-bottom: 1px solid rgba(227,225,218,0.4);
            transition: background 0.12s ease;
            gap: 8px;
        }
        .prec-dre-row:last-child { border-bottom: none; }
        .prec-dre-row:hover { background: rgba(247,246,243,0.8); }

        .prec-dre-row.dre-result {
            background: linear-gradient(to right, rgba(240,243,235,0.5), transparent);
            border-bottom: 1.5px solid var(--prec-border);
        }
        .prec-dre-row.dre-final {
            background: linear-gradient(to right, rgba(240,243,235,0.8), rgba(240,243,235,0.3));
            border-top: 2px solid var(--prec-border-dark);
            border-bottom: none;
        }
        .prec-dre-row.dre-final.is-positive {
            background: linear-gradient(to right, rgba(92,110,70,0.08), rgba(92,110,70,0.02));
            border-top-color: #c8d1ae;
        }
        .prec-dre-row.dre-final.is-negative {
            background: linear-gradient(to right, rgba(139,74,58,0.08), rgba(139,74,58,0.02));
            border-top-color: #d4a99d;
        }
        .prec-dre-row.dre-final.is-zero {
            background: linear-gradient(to right, rgba(154,109,58,0.07), transparent);
            border-top-color: #d4c4a0;
        }

        .prec-dre-signal {
            font-size: 11px;
            font-weight: 900;
            width: 16px;
            flex-shrink: 0;
            text-align: center;
        }
        .prec-dre-signal.plus  { color: var(--prec-olive); }
        .prec-dre-signal.minus { color: var(--prec-terra); }
        .prec-dre-signal.equal { color: var(--prec-text-sub); font-size: 13px; }

        .prec-dre-desc {
            flex: 1;
            font-size: 12px;
            font-weight: 600;
            color: var(--prec-text);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .prec-dre-desc-sub {
            font-size: 10px;
            color: var(--prec-text-light);
            font-weight: 500;
        }

        .prec-dre-val {
            font-size: 12.5px;
            font-weight: 800;
            text-align: right;
            min-width: 80px;
            transition: all 0.25s ease;
        }
        .prec-dre-val.val-neutral { color: var(--prec-text); }
        .prec-dre-val.val-deduct  { color: var(--prec-terra); }
        .prec-dre-val.val-add     { color: var(--prec-olive); }
        .prec-dre-val.val-result  { color: var(--prec-text); font-size: 13px; }

        .prec-dre-val-big {
            font-size: 15px;
            font-weight: 900;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .prec-dre-val-big.is-positive { color: var(--prec-olive); }
        .prec-dre-val-big.is-negative { color: var(--prec-terra); }
        .prec-dre-val-big.is-zero     { color: var(--prec-warn); }

        .prec-dre-pct {
            font-size: 10.5px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 3px;
            min-width: 48px;
            text-align: center;
        }
        .prec-dre-pct.is-positive {
            background: var(--prec-olive-bg);
            color: var(--prec-olive);
            border: 1px solid rgba(92,110,70,0.2);
        }
        .prec-dre-pct.is-negative {
            background: var(--prec-terra-bg);
            color: var(--prec-terra);
            border: 1px solid rgba(139,74,58,0.2);
        }
        .prec-dre-pct.is-zero {
            background: var(--prec-warn-bg);
            color: var(--prec-warn);
            border: 1px solid rgba(154,109,58,0.2);
        }

        /* ─── Indicador Meta de Custo ─── */
        .prec-custo-meta-result {
            padding: 16px;
            border-radius: var(--prec-radius);
            border: 1.5px solid;
            margin-top: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }
        .prec-custo-meta-result.ok {
            background: var(--prec-olive-bg);
            border-color: #c8d1ae;
        }
        .prec-custo-meta-result.warn {
            background: var(--prec-warn-bg);
            border-color: #d4c4a0;
        }
        .prec-custo-meta-result.danger {
            background: var(--prec-terra-bg);
            border-color: #d4a99d;
        }
        .prec-custo-meta-label {
            font-size: 10.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.07em;
        }
        .prec-custo-meta-result.ok .prec-custo-meta-label { color: var(--prec-olive); }
        .prec-custo-meta-result.warn .prec-custo-meta-label { color: var(--prec-warn); }
        .prec-custo-meta-result.danger .prec-custo-meta-label { color: var(--prec-terra); }
        .prec-custo-meta-value {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.03em;
        }
        .prec-custo-meta-result.ok .prec-custo-meta-value { color: var(--prec-olive); }
        .prec-custo-meta-result.warn .prec-custo-meta-value { color: var(--prec-warn); }
        .prec-custo-meta-result.danger .prec-custo-meta-value { color: var(--prec-terra); }
        .prec-custo-meta-desc {
            font-size: 11px;
            font-weight: 600;
            opacity: 0.75;
            margin-top: 2px;
        }
        .prec-custo-meta-result.ok .prec-custo-meta-desc { color: var(--prec-olive); }

        /* ─── Botão de Transferir Preço ─── */
        .prec-btn-apply {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 13px 18px;
            border-radius: var(--prec-radius-sm);
            border: none;
            background: linear-gradient(135deg, #5c6e46 0%, #4a5e33 100%);
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            font-size: 12.5px;
            font-weight: 800;
            letter-spacing: 0.03em;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(74,94,51,0.2), 0 4px 8px rgba(74,94,51,0.15), inset 0 1px 0 rgba(255,255,255,0.1);
            text-shadow: 0 1px 1px rgba(0,0,0,0.15);
        }
        .prec-btn-apply:hover {
            background: linear-gradient(135deg, #6a7f52 0%, #556b3d 100%);
            box-shadow: 0 4px 8px rgba(74,94,51,0.3), 0 6px 12px rgba(74,94,51,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
            transform: translateY(-1px);
        }
        .prec-btn-apply:active {
            transform: translateY(0);
            box-shadow: 0 1px 2px rgba(74,94,51,0.2), inset 0 2px 4px rgba(0,0,0,0.1);
        }
        .prec-btn-apply svg { width: 14px; height: 14px; }

        /* ─── Responsividade ─── */
        @media (max-width: 700px) {
            .prec-fields-grid { grid-template-columns: 1fr 1fr; }
            .prec-fields-grid-4 { grid-template-columns: 1fr 1fr; }
            .prec-method-pill-sub { display: none; }
        }
        @media (max-width: 480px) {
            .prec-fields-grid  { grid-template-columns: 1fr; }
            .prec-fields-grid-2 { grid-template-columns: 1fr; }
        }

        /* ─── Animação do valor calculado ─── */
        .prec-animate-pulse {
            animation: precPulse 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes precPulse {
            0%   { transform: scale(1); }
            40%  { transform: scale(1.04); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
})();

// ─── Estado do Módulo ─────────────────────────────────────────────────────────
window._precState = {
    metodo: 'markup',  // 'markup' | 'custo-meta'

    // Ficha Técnica — Insumos do Concreto H-21 (Mock Data)
    // Insumos (R$175,87) + M.O.D. (R$42,00) + CGF (R$30,00) = R$247,87
    insumos: [
        { id: 1, desc: 'Cimento CP-II E-32 (sc 50kg)', qtd: 2.5,  unid: 'sc',  custoUnit: 35.00 },  // R$ 87,50
        { id: 2, desc: 'Brita 1 (m³ posto obra)',       qtd: 0.55, unid: 'm³',  custoUnit: 95.00 },  // R$ 52,25
        { id: 3, desc: 'Areia Média Lavada (m³)',        qtd: 0.40, unid: 'm³',  custoUnit: 72.00 },  // R$ 28,80
        { id: 4, desc: 'Água Tratada (m³)',              qtd: 0.18, unid: 'm³',  custoUnit: 7.50  },  // R$  1,35
        { id: 5, desc: 'Aditivo Plastificante BASF (L)', qtd: 0.6, unid: 'L',   custoUnit: 9.95  },  // R$  5,97
    ],
    maoDeObra: 42.00,       // R$ por m³ (betoneiro + operador)
    cgf: 30.00,             // CGF: desg. de ferramentas, energia, manutenção

    // Despesas operacionais (% sobre o preço de venda)
    pctDespesas: 12.0,      // Despesas fixas + variáveis
    pctImpostos: 11.0,      // Simples Nacional + ISS

    // Markup
    pctLucroDesejado: 15.0, // Margem de lucro desejada

    // Custo-meta (Aba B)
    precoMercado: 0,

    _nextInsumoId: 6
};

// ─── Helpers de Formatação ────────────────────────────────────────────────────
function precFmt(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}
function precFmtPct(val) {
    return `${(val || 0).toFixed(1)}%`;
}
function precSvg(iconName, size = 14) {
    // Mapeia nomes simplificados para SVGs inline
    const icons = {
        'layers': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
        'dollar': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
        'trend': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
        'target': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
        'bar':   `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
        'plus':  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        'trash': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
        'check': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        'zap':   `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        'alert': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        'arrow': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    };
    return icons[iconName] || '';
}

// ─── Cálculos Centrais ────────────────────────────────────────────────────────
function precCalc() {
    const s = window._precState;

    // Custo direto total
    const custoInsumos = s.insumos.reduce((acc, row) => acc + (parseFloat(row.qtd) || 0) * (parseFloat(row.custoUnit) || 0), 0);
    const custoTotal   = custoInsumos + (parseFloat(s.maoDeObra) || 0) + (parseFloat(s.cgf) || 0);

    const pctDesp  = (parseFloat(s.pctDespesas) || 0) / 100;
    const pctImp   = (parseFloat(s.pctImpostos) || 0) / 100;
    const pctLucro = (parseFloat(s.pctLucroDesejado) || 0) / 100;
    const divisor  = 1 - pctDesp - pctImp - pctLucro;

    let precoVenda = 0;
    let markup     = 0;

    if (s.metodo === 'markup') {
        if (divisor > 0) {
            precoVenda = custoTotal / divisor;
            markup     = divisor > 0 ? 1 / divisor : 0;
        }
    } else {
        // Custo-meta: o usuário informa o preço de mercado
        precoVenda = parseFloat(s.precoMercado) || 0;
        if (precoVenda > 0 && divisor > 0) {
            markup = 1 / divisor;
        }
    }

    // DRE Unitária
    const receitaBruta      = precoVenda;
    const descontoImpostos  = receitaBruta * pctImp;
    const receitaLiquida    = receitaBruta - descontoImpostos;
    const cpv               = custoTotal;
    const resultadoBruto    = receitaLiquida - cpv;
    const despesasOper      = receitaBruta * pctDesp;
    const lucroLiquido      = resultadoBruto - despesasOper;
    const pctLucratividade  = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

    // Custo-meta: teto de custo permitido
    const tetoCusto = s.metodo === 'custo-meta' ? (precoVenda * divisor) : 0;

    return {
        custoInsumos, custoTotal,
        precoVenda, markup,
        receitaBruta, descontoImpostos, receitaLiquida,
        cpv, resultadoBruto, despesasOper,
        lucroLiquido, pctLucratividade,
        tetoCusto,
        divisor
    };
}

// ─── Atualização Reativa da UI ─────────────────────────────────────────────────
function precUpdate() {
    const c = precCalc();
    const s = window._precState;

    // Custo total (ficha técnica)
    const elCustoTotal = document.getElementById('prec-custo-total-value');
    if (elCustoTotal) elCustoTotal.textContent = precFmt(c.custoTotal);

    // Custo insumos
    const elInsTotal = document.getElementById('prec-insumos-total');
    if (elInsTotal) elInsTotal.textContent = precFmt(c.custoInsumos);

    // Preço de venda sugerido (Aba A)
    const elPreco = document.getElementById('prec-preco-venda-result');
    if (elPreco) {
        if (c.precoVenda > 0 && c.divisor > 0) {
            elPreco.textContent = precFmt(c.precoVenda);
        } else {
            elPreco.textContent = c.divisor <= 0 ? '— Inviável —' : '—';
        }
        elPreco.classList.add('prec-animate-pulse');
        setTimeout(() => elPreco.classList.remove('prec-animate-pulse'), 400);
    }

    // Markup
    const elMarkup = document.getElementById('prec-markup-value');
    if (elMarkup) {
        elMarkup.textContent = c.divisor > 0 ? `Mark-up × ${c.markup.toFixed(4)}` : '— indisponível —';
    }

    // Custo-meta: teto de custo
    const elTeto = document.getElementById('prec-teto-custo-value');
    if (elTeto) {
        const status = c.tetoCusto <= 0 ? 'danger'
                     : c.custoTotal <= c.tetoCusto * 0.9 ? 'ok'
                     : c.custoTotal <= c.tetoCusto ? 'warn'
                     : 'danger';

        elTeto.textContent = c.divisor > 0 ? precFmt(c.tetoCusto) : '— Inviável —';

        const wrapper = document.getElementById('prec-meta-result-wrapper');
        if (wrapper) {
            wrapper.className = `prec-custo-meta-result ${status}`;
            const label = wrapper.querySelector('.prec-custo-meta-label');
            const desc  = wrapper.querySelector('.prec-custo-meta-desc');
            if (label) {
                label.textContent = status === 'ok' ? '✓ Custo dentro do Teto' :
                                    status === 'warn' ? '⚠ Custo no Limite' :
                                    '✗ Custo Excede o Teto';
            }
            if (desc) {
                if (status === 'ok') {
                    desc.textContent = `Folga de ${precFmt(c.tetoCusto - c.custoTotal)} (${((1 - c.custoTotal / c.tetoCusto) * 100).toFixed(1)}% abaixo do teto)`;
                } else if (status === 'warn') {
                    desc.textContent = `Margem de segurança mínima — revise os custos`;
                } else if (c.divisor <= 0) {
                    desc.textContent = 'Soma de despesas + impostos + lucro ≥ 100% — inviável';
                } else {
                    const excesso = c.custoTotal - c.tetoCusto;
                    desc.textContent = `Excede o teto em ${precFmt(excesso)} — produto no prejuízo`;
                }
            }
        }
    }

    // ─── DRE Unitária ────────────────────────────────────────────────────────
    const dreValues = {
        'dre-receita-bruta':    { val: c.receitaBruta,     cls: 'val-neutral' },
        'dre-impostos':         { val: -c.descontoImpostos,cls: 'val-deduct'  },
        'dre-receita-liq':      { val: c.receitaLiquida,   cls: 'val-result'  },
        'dre-cpv':              { val: -c.cpv,             cls: 'val-deduct'  },
        'dre-resultado-bruto':  { val: c.resultadoBruto,   cls: 'val-result'  },
        'dre-despesas':         { val: -c.despesasOper,    cls: 'val-deduct'  },
    };
    Object.entries(dreValues).forEach(([id, cfg]) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = precFmt(Math.abs(cfg.val));
            el.className = `prec-dre-val ${cfg.cls}`;
        }
    });

    // Lucro líquido (colorido)
    const elLucro = document.getElementById('dre-lucro-liquido');
    if (elLucro) {
        elLucro.textContent = precFmt(c.lucroLiquido);
        const cls = c.lucroLiquido > 0 ? 'is-positive' : c.lucroLiquido < 0 ? 'is-negative' : 'is-zero';
        elLucro.className = `prec-dre-val prec-dre-val-big ${cls}`;
    }

    // % Lucratividade
    const elPctLucro = document.getElementById('dre-pct-lucratividade');
    if (elPctLucro) {
        elPctLucro.textContent = precFmtPct(c.pctLucratividade);
        const cls = c.pctLucratividade > 0.5 ? 'is-positive' : c.pctLucratividade < -0.5 ? 'is-negative' : 'is-zero';
        elPctLucro.className = `prec-dre-pct ${cls}`;
    }

    // Linha final da DRE (coloração do fundo)
    const elFinalRow = document.getElementById('dre-final-row');
    if (elFinalRow) {
        const cls = c.lucroLiquido > 0 ? 'is-positive' : c.lucroLiquido < 0 ? 'is-negative' : 'is-zero';
        elFinalRow.className = `prec-dre-row dre-final ${cls}`;
    }
}

// ─── Renderização da Tabela de Insumos ───────────────────────────────────────
function precRenderInsumosTable() {
    const container = document.getElementById('prec-insumos-tbody');
    if (!container) return;

    container.innerHTML = window._precState.insumos.map((row) => `
        <tr data-insumo-id="${row.id}">
            <td style="min-width: 160px;">
                <input type="text"
                    value="${row.desc}"
                    placeholder="Insumo / Matéria-Prima..."
                    onchange="precUpdateInsumo(${row.id}, 'desc', this.value)"
                    style="font-size: 12px; font-weight: 600;">
            </td>
            <td style="width: 72px;">
                <input type="number" step="0.001" min="0"
                    value="${row.qtd}"
                    onchange="precUpdateInsumo(${row.id}, 'qtd', this.value)"
                    oninput="precUpdateInsumoInline(${row.id}, 'qtd', this.value)"
                    style="text-align: right;">
            </td>
            <td style="width: 60px;">
                <input type="text"
                    value="${row.unid}"
                    placeholder="un"
                    onchange="precUpdateInsumo(${row.id}, 'unid', this.value)"
                    style="text-align:center;">
            </td>
            <td style="width: 100px;">
                <div class="prec-td-currency">
                    <span>R$</span>
                    <input type="number" step="0.01" min="0"
                        value="${parseFloat(row.custoUnit).toFixed(2)}"
                        onchange="precUpdateInsumo(${row.id}, 'custoUnit', this.value)"
                        oninput="precUpdateInsumoInline(${row.id}, 'custoUnit', this.value)"
                        style="text-align: right;">
                </div>
            </td>
            <td style="width: 90px; text-align:right; padding-right: 12px;">
                <span class="prec-td-total">${precFmt((parseFloat(row.qtd)||0) * (parseFloat(row.custoUnit)||0))}</span>
            </td>
            <td style="width: 36px; text-align: center; padding: 4px;">
                <button class="prec-btn-icon-sm" onclick="precRemoveInsumo(${row.id})" title="Remover insumo">
                    ${precSvg('trash', 11)}
                </button>
            </td>
        </tr>
    `).join('');
}

// ─── Controladores dos Insumos ───────────────────────────────────────────────
window.precUpdateInsumo = function(id, field, val) {
    const row = window._precState.insumos.find(r => r.id === id);
    if (!row) return;
    row[field] = field === 'desc' || field === 'unid' ? val : parseFloat(val) || 0;
    precRenderInsumosTable();
    precUpdate();
};

window.precUpdateInsumoInline = function(id, field, val) {
    const row = window._precState.insumos.find(r => r.id === id);
    if (!row) return;
    row[field] = parseFloat(val) || 0;
    // Atualiza apenas o total daquela linha inline
    const tr = document.querySelector(`[data-insumo-id="${id}"]`);
    if (tr) {
        const totalEl = tr.querySelector('.prec-td-total');
        if (totalEl) totalEl.textContent = precFmt((row.qtd || 0) * (row.custoUnit || 0));
    }
    precUpdate();
};

window.precAddInsumo = function() {
    const s = window._precState;
    s.insumos.push({ id: s._nextInsumoId++, desc: '', qtd: 1, unid: 'un', custoUnit: 0 });
    precRenderInsumosTable();
    precUpdate();
    // Focar no último campo de descrição
    const lastInput = document.querySelector('#prec-insumos-tbody tr:last-child input');
    if (lastInput) { lastInput.focus(); }
};

window.precRemoveInsumo = function(id) {
    window._precState.insumos = window._precState.insumos.filter(r => r.id !== id);
    precRenderInsumosTable();
    precUpdate();
};

// ─── Troca de Método ─────────────────────────────────────────────────────────
window.precSetMetodo = function(metodo) {
    window._precState.metodo = metodo;
    document.querySelectorAll('.prec-method-pill').forEach(el => {
        el.classList.toggle('active', el.dataset.metodo === metodo);
    });
    document.querySelectorAll('.prec-method-panel').forEach(el => {
        el.classList.toggle('active', el.dataset.painel === metodo);
    });
    precUpdate();
};

// ─── Leitura de campos de input ──────────────────────────────────────────────
window.precSyncField = function(field, val) {
    window._precState[field] = parseFloat(val) || 0;
    precUpdate();
};

// ─── Aplicar Preço ao Formulário ─────────────────────────────────────────────
window.precAplicarPreco = function() {
    const c = precCalc();
    const s = window._precState;

    if (c.precoVenda <= 0 || c.divisor <= 0) {
        alert('Não é possível aplicar: o preço calculado é inválido. Revise as porcentagens.');
        return;
    }

    // Aplica ao campo de preço e custo do formulário principal
    const frmPrice = document.getElementById('frm-price');
    const frmCost  = document.getElementById('frm-cost');

    if (frmPrice) {
        frmPrice.value = c.precoVenda.toFixed(2);
        // Flash visual
        frmPrice.style.transition = 'background 0.4s ease';
        frmPrice.style.background = '#eef4e8';
        setTimeout(() => { frmPrice.style.background = ''; }, 800);
    }
    if (frmCost) {
        frmCost.value = c.custoTotal.toFixed(2);
        frmCost.style.transition = 'background 0.4s ease';
        frmCost.style.background = '#eef4e8';
        setTimeout(() => { frmCost.style.background = ''; }, 800);
    }

    // Feedback
    const btn = document.getElementById('prec-btn-aplicar');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = `${precSvg('check', 14)} <span>Aplicado com sucesso!</span>`;
        btn.style.background = 'linear-gradient(135deg, #3a4f26 0%, #2e3e1c 100%)';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    }
};

// ─── Aplicar Preço de Meta ────────────────────────────────────────────────────
window.precAplicarCustoMeta = function() {
    const c = precCalc();
    const s = window._precState;

    if (s.precoMercado <= 0) {
        alert('Informe o preço de mercado para calcular o custo-meta.');
        return;
    }

    const frmPrice = document.getElementById('frm-price');
    const frmCost  = document.getElementById('frm-cost');

    if (frmPrice) {
        frmPrice.value = s.precoMercado.toFixed(2);
        frmPrice.style.transition = 'background 0.4s ease';
        frmPrice.style.background = '#eef4e8';
        setTimeout(() => { frmPrice.style.background = ''; }, 800);
    }
    if (frmCost) {
        frmCost.value = c.custoTotal.toFixed(2);
        frmCost.style.transition = 'background 0.4s ease';
        frmCost.style.background = '#eef4e8';
        setTimeout(() => { frmCost.style.background = ''; }, 800);
    }
};

// ─── HTML do Módulo ───────────────────────────────────────────────────────────
function getPrecificacaoHTML() {
    return `
    <div class="prec-wrapper" id="velo-precificacao-module">

        <!-- Cabeçalho Premium -->
        <div class="prec-header">
            <div class="prec-header-left">
                <div class="prec-header-icon">
                    ${precSvg('dollar', 18)}
                </div>
                <div>
                    <div class="prec-header-title">Engenharia de Preços</div>
                    <div class="prec-header-subtitle">Formação de Preço & Custo-Meta • Tempo Real</div>
                </div>
            </div>
            <span class="prec-header-badge">Eng. Econômica</span>
        </div>

        <div class="prec-body">

            <!-- ═══════════════════════════════════════════════════
                 SEÇÃO 1 — FICHA TÉCNICA / CUSTO DIRETO
            ════════════════════════════════════════════════════ -->
            <div class="prec-section">
                <div class="prec-section-header">
                    <div class="prec-section-icon" style="background: #f0ede8; border: 1px solid var(--prec-border);">
                        ${precSvg('layers', 14)}
                    </div>
                    <span class="prec-section-title">Ficha Técnica — Composto de Custo Direto</span>
                    <span class="prec-section-subtitle">Insumos · M.O.D. · C.G.F.</span>
                </div>
                <div class="prec-section-body">

                    <!-- Tabela de Insumos -->
                    <table class="prec-insumos-table">
                        <thead>
                            <tr>
                                <th>Insumo / Matéria-Prima</th>
                                <th style="text-align:right;">Qtd.</th>
                                <th style="text-align:center;">Unid.</th>
                                <th style="text-align:right;">Custo Unit.</th>
                                <th style="text-align:right; padding-right: 12px;">Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="prec-insumos-tbody">
                            <!-- Injetado dinamicamente -->
                        </tbody>
                    </table>

                    <button class="prec-btn-add-row" onclick="precAddInsumo()">
                        ${precSvg('plus', 12)}
                        Adicionar Insumo / Matéria-Prima
                    </button>

                    <!-- M.O.D. e C.G.F. -->
                    <div class="prec-fields-grid-2" style="margin-top: 14px;">
                        <div class="prec-field">
                            <label class="prec-field-label">
                                <span class="prec-label-dot" style="background: #7a8f60;"></span>
                                Mão de Obra Direta (M.O.D.)
                            </label>
                            <div class="prec-input-wrap">
                                <span class="prec-input-prefix">R$</span>
                                <input type="number" step="0.01" min="0"
                                    class="prec-input has-prefix"
                                    id="prec-mod"
                                    value="${window._precState.maoDeObra}"
                                    oninput="window._precState.maoDeObra=parseFloat(this.value)||0; precUpdate();"
                                    placeholder="0,00">
                            </div>
                        </div>
                        <div class="prec-field">
                            <label class="prec-field-label">
                                <span class="prec-label-dot" style="background: #9a6d3a;"></span>
                                Custos Gerais de Fabricação (C.G.F.)
                            </label>
                            <div class="prec-input-wrap">
                                <span class="prec-input-prefix">R$</span>
                                <input type="number" step="0.01" min="0"
                                    class="prec-input has-prefix"
                                    id="prec-cgf"
                                    value="${window._precState.cgf}"
                                    oninput="window._precState.cgf=parseFloat(this.value)||0; precUpdate();"
                                    placeholder="0,00">
                            </div>
                        </div>
                    </div>

                    <!-- Custo Total Consolidado -->
                    <div class="prec-cost-summary">
                        <span class="prec-cost-summary-label">
                            ${precSvg('layers', 12)}
                            &nbsp; Custo Direto Total (CDT)
                        </span>
                        <span class="prec-cost-summary-value" id="prec-custo-total-value">R$ 0,00</span>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════
                 SEÇÃO 2 — DESPESAS E TRIBUTOS
            ════════════════════════════════════════════════════ -->
            <div class="prec-section">
                <div class="prec-section-header">
                    <div class="prec-section-icon" style="background: var(--prec-warn-bg); border: 1px solid #d4c4a0;">
                        ${precSvg('bar', 14)}
                    </div>
                    <span class="prec-section-title">Despesas Operacionais & Carga Tributária</span>
                    <span class="prec-section-subtitle">% sobre o Preço de Venda</span>
                </div>
                <div class="prec-section-body">
                    <div class="prec-fields-grid-2">
                        <div class="prec-field">
                            <label class="prec-field-label">
                                <span class="prec-label-dot" style="background: #9a6d3a;"></span>
                                Margem de Despesas Operacionais
                            </label>
                            <div class="prec-input-wrap">
                                <input type="number" step="0.1" min="0" max="99"
                                    class="prec-input has-suffix"
                                    id="prec-pct-despesas"
                                    value="${window._precState.pctDespesas}"
                                    oninput="window._precState.pctDespesas=parseFloat(this.value)||0; precUpdate();"
                                    placeholder="0,0">
                                <span class="prec-input-suffix">%</span>
                            </div>
                        </div>
                        <div class="prec-field">
                            <label class="prec-field-label">
                                <span class="prec-label-dot" style="background: #8b4a3a;"></span>
                                Alíquota de Impostos (s/ venda)
                            </label>
                            <div class="prec-input-wrap">
                                <input type="number" step="0.1" min="0" max="99"
                                    class="prec-input has-suffix"
                                    id="prec-pct-impostos"
                                    value="${window._precState.pctImpostos}"
                                    oninput="window._precState.pctImpostos=parseFloat(this.value)||0; precUpdate();"
                                    placeholder="0,0">
                                <span class="prec-input-suffix">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════
                 SEÇÃO 3 — MÓDULO DE CÁLCULO (PILLS)
            ════════════════════════════════════════════════════ -->
            <div class="prec-section">
                <div class="prec-section-header">
                    <div class="prec-section-icon" style="background: #eaf0f8; border: 1px solid #bed0e8;">
                        ${precSvg('trend', 14)}
                    </div>
                    <span class="prec-section-title">Módulo Interativo de Cálculo</span>
                    <span class="prec-section-subtitle">Selecione a lógica</span>
                </div>
                <div class="prec-section-body">

                    <!-- Seletor de Método -->
                    <div class="prec-method-selector" style="margin-bottom: 20px;">
                        <button class="prec-method-pill active" data-metodo="markup" onclick="precSetMetodo('markup')">
                            <span class="prec-method-pill-title">Aba A — Formação de Preço</span>
                            <span class="prec-method-pill-sub">Mark-up Multiplicador</span>
                        </button>
                        <button class="prec-method-pill" data-metodo="custo-meta" onclick="precSetMetodo('custo-meta')">
                            <span class="prec-method-pill-title">Aba B — Custo-Meta / Alvo</span>
                            <span class="prec-method-pill-sub">Preço de Mercado → Teto de Custo</span>
                        </button>
                    </div>

                    <!-- ─── Painel A: Mark-up ─── -->
                    <div class="prec-method-panel active" data-painel="markup">
                        <div class="prec-fields-grid-2" style="margin-bottom: 16px;">
                            <div class="prec-field">
                                <label class="prec-field-label">
                                    <span class="prec-label-dot" style="background: #5c6e46;"></span>
                                    Margem de Lucro Desejada
                                </label>
                                <div class="prec-input-wrap">
                                    <input type="number" step="0.1" min="0" max="99"
                                        class="prec-input has-suffix"
                                        id="prec-pct-lucro"
                                        value="${window._precState.pctLucroDesejado}"
                                        oninput="window._precState.pctLucroDesejado=parseFloat(this.value)||0; precUpdate();"
                                        placeholder="0,0">
                                    <span class="prec-input-suffix">%</span>
                                </div>
                            </div>
                            <div class="prec-field">
                                <label class="prec-field-label">
                                    <span class="prec-label-dot" style="background: #d4af76;"></span>
                                    Mark-up Multiplicador
                                </label>
                                <div class="prec-input-wrap">
                                    <input type="text" class="prec-input" id="prec-markup-display" readonly
                                        placeholder="—" style="font-size: 12px; color: #9a6d3a;">
                                </div>
                            </div>
                        </div>

                        <!-- Resultado do Preço -->
                        <div class="prec-price-result">
                            <span class="prec-price-result-label">Preço de Venda Sugerido</span>
                            <span class="prec-price-result-value" id="prec-preco-venda-result">—</span>
                            <span class="prec-price-result-markup" id="prec-markup-value">—</span>
                        </div>

                        <button class="prec-btn-apply" id="prec-btn-aplicar" onclick="precAplicarPreco()" style="margin-top: 12px;">
                            ${precSvg('arrow', 14)}
                            <span>Aplicar Preço ao Produto</span>
                        </button>
                    </div>

                    <!-- ─── Painel B: Custo-Meta ─── -->
                    <div class="prec-method-panel" data-painel="custo-meta">
                        <div class="prec-fields-grid-2" style="margin-bottom: 16px;">
                            <div class="prec-field">
                                <label class="prec-field-label">
                                    <span class="prec-label-dot" style="background: #8b4a3a;"></span>
                                    Preço Praticado pelo Mercado / Concorrência
                                </label>
                                <div class="prec-input-wrap">
                                    <span class="prec-input-prefix">R$</span>
                                    <input type="number" step="0.01" min="0"
                                        class="prec-input has-prefix"
                                        id="prec-preco-mercado"
                                        value="${window._precState.precoMercado || ''}"
                                        oninput="window._precState.precoMercado=parseFloat(this.value)||0; precUpdate();"
                                        placeholder="0,00">
                                </div>
                            </div>
                            <div class="prec-field">
                                <label class="prec-field-label">
                                    <span class="prec-label-dot" style="background: #5c6e46;"></span>
                                    Margem de Lucro Mínima Aceitável
                                </label>
                                <div class="prec-input-wrap">
                                    <input type="number" step="0.1" min="0" max="99"
                                        class="prec-input has-suffix"
                                        id="prec-pct-lucro-meta"
                                        value="${window._precState.pctLucroDesejado}"
                                        oninput="window._precState.pctLucroDesejado=parseFloat(this.value)||0; precUpdate();"
                                        placeholder="0,0">
                                    <span class="prec-input-suffix">%</span>
                                </div>
                            </div>
                        </div>

                        <!-- Resultado do Teto de Custo -->
                        <div class="prec-custo-meta-result ok" id="prec-meta-result-wrapper">
                            <div>
                                <div class="prec-custo-meta-label">— Informe o Preço de Mercado —</div>
                                <div class="prec-custo-meta-desc">O teto de custo calculará automaticamente</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="prec-custo-meta-label" style="margin-bottom: 4px;">Teto de Custo</div>
                                <div class="prec-custo-meta-value" id="prec-teto-custo-value">—</div>
                            </div>
                        </div>

                        <button class="prec-btn-apply" onclick="precAplicarCustoMeta()" style="margin-top: 12px;">
                            ${precSvg('arrow', 14)}
                            <span>Adotar Preço de Mercado e Custo Atual</span>
                        </button>
                    </div>

                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════
                 SEÇÃO 4 — DRE UNITÁRIA DINÂMICA
            ════════════════════════════════════════════════════ -->
            <div class="prec-dre-wrapper">
                <div class="prec-dre-header">
                    <div style="display:flex; align-items:center; gap: 7px;">
                        ${precSvg('bar', 13)}
                        <span class="prec-dre-header-text">DRE Unitária</span>
                        <span style="font-size:10px; color: var(--prec-text-light); font-weight: 500;">Demonstração do Resultado — por Unidade Vendida</span>
                    </div>
                    <span class="prec-dre-live-badge">
                        <span class="prec-dre-live-dot"></span>
                        Tempo Real
                    </span>
                </div>

                <!-- (+) Receita Bruta -->
                <div class="prec-dre-row">
                    <span class="prec-dre-signal plus">(+)</span>
                    <span class="prec-dre-desc">Receita Bruta (Preço de Venda)</span>
                    <span class="prec-dre-val val-neutral" id="dre-receita-bruta">R$ 0,00</span>
                </div>

                <!-- (-) Impostos -->
                <div class="prec-dre-row">
                    <span class="prec-dre-signal minus">(−)</span>
                    <span class="prec-dre-desc">
                        Impostos / Tributação
                        <span class="prec-dre-desc-sub" id="dre-label-impostos">(${window._precState.pctImpostos}%)</span>
                    </span>
                    <span class="prec-dre-val val-deduct" id="dre-impostos">R$ 0,00</span>
                </div>

                <!-- (=) Receita Líquida -->
                <div class="prec-dre-row dre-result">
                    <span class="prec-dre-signal equal">(=)</span>
                    <span class="prec-dre-desc" style="font-weight: 700;">Receita Líquida de Impostos</span>
                    <span class="prec-dre-val val-result" id="dre-receita-liq">R$ 0,00</span>
                </div>

                <!-- (-) CPV -->
                <div class="prec-dre-row">
                    <span class="prec-dre-signal minus">(−)</span>
                    <span class="prec-dre-desc">Custo do Produto Vendido (C.P.V.)</span>
                    <span class="prec-dre-val val-deduct" id="dre-cpv">R$ 0,00</span>
                </div>

                <!-- (=) Resultado Bruto -->
                <div class="prec-dre-row dre-result">
                    <span class="prec-dre-signal equal">(=)</span>
                    <span class="prec-dre-desc" style="font-weight: 700;">Resultado / Margem Bruta</span>
                    <span class="prec-dre-val val-result" id="dre-resultado-bruto">R$ 0,00</span>
                </div>

                <!-- (-) Despesas Operacionais -->
                <div class="prec-dre-row">
                    <span class="prec-dre-signal minus">(−)</span>
                    <span class="prec-dre-desc">
                        Despesas Operacionais (Fixas + Variáveis)
                        <span class="prec-dre-desc-sub" id="dre-label-despesas">(${window._precState.pctDespesas}%)</span>
                    </span>
                    <span class="prec-dre-val val-deduct" id="dre-despesas">R$ 0,00</span>
                </div>

                <!-- (=) Lucro Líquido -->
                <div class="prec-dre-row dre-final is-zero" id="dre-final-row">
                    <span class="prec-dre-signal equal">(=)</span>
                    <span class="prec-dre-desc" style="font-size: 13px; font-weight: 800; color: var(--prec-text);">
                        Lucro Líquido Real
                    </span>
                    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                        <span class="prec-dre-pct is-zero" id="dre-pct-lucratividade">0,0%</span>
                        <span class="prec-dre-val prec-dre-val-big is-zero" id="dre-lucro-liquido">R$ 0,00</span>
                    </div>
                </div>

            </div>
            <!-- Fim DRE -->

        </div>
        <!-- Fim .prec-body -->

    </div>
    <!-- Fim .prec-wrapper -->
    `;
}

// ─── Função de Inicialização ──────────────────────────────────────────────────
/**
 * Inicializa o módulo de precificação dentro de um container HTML.
 * @param {string} containerId - ID do elemento onde o módulo será injetado
 * @param {object} produtoAtual - Objeto do produto com { cost, price } para pré-carregar
 */
window.initPrecificacao = function(containerId, produtoAtual = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Pré-carrega custo do produto atual se disponível
    if (produtoAtual.cost && produtoAtual.cost > 0) {
        // Reseta insumos para refletir o custo total conhecido
        // Mantém Mock data se não houver dados de ficha técnica
    }

    // Garante estado inicial do preço de mercado
    if (produtoAtual.price && produtoAtual.price > 0) {
        window._precState.precoMercado = produtoAtual.price;
    }

    container.innerHTML = getPrecificacaoHTML();

    // Renderiza tabela de insumos
    precRenderInsumosTable();

    // Dispara cálculo inicial
    precUpdate();

    // Sincroniza display do markup (campo readonly)
    const displayMarkup = () => {
        const c = precCalc();
        const el = document.getElementById('prec-markup-display');
        if (el) el.value = c.divisor > 0 ? `× ${c.markup.toFixed(4)}` : '— Inviável —';
    };
    displayMarkup();

    // Observer para manter markup display em sync
    const origUpdate = precUpdate;
    window._precUpdateWithMarkup = function() {
        origUpdate();
        displayMarkup();

        // Atualiza labels de % na DRE
        const labelImp = document.getElementById('dre-label-impostos');
        if (labelImp) labelImp.textContent = `(${window._precState.pctImpostos}%)`;
        const labelDesp = document.getElementById('dre-label-despesas');
        if (labelDesp) labelDesp.textContent = `(${window._precState.pctDespesas}%)`;
    };

    // Substitui chamadas de precUpdate por versão com display
    document.querySelectorAll('[oninput]').forEach(el => {
        const attr = el.getAttribute('oninput');
        if (attr && attr.includes('precUpdate()')) {
            el.setAttribute('oninput', attr.replace(/precUpdate\(\)/g, '_precUpdateWithMarkup()'));
        }
    });

    // Chama versão completa
    window._precUpdateWithMarkup();
};

// ─────────────────────────────────────────────────────────────────────────────
// O módulo é inicializado pelo app.js via:
//   window.initPrecificacao('prec-module-host', produtoAtual)
// após o modal do produto ser aberto e o container estar disponível no DOM.
// ─────────────────────────────────────────────────────────────────────────────
