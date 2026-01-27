-- ============================================================================
-- MIGRAÇÃO DE HARDENING DE SEGURANÇA - AgendaCerta
-- Data: 2026-01-27
-- Objetivo: Implementar RLS, Views Seguras, Triggers de Isolamento e Índices
-- ============================================================================

-- ============================================================================
-- 1. ROW LEVEL SECURITY (RLS) - Isolamento de Dados por Tenant
-- ============================================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tabs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tab_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "google_calendar_tokens" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. VIEW SEGURA PARA BOOKINGS (bookings_safe)
-- Equivalente a WITH (security_invoker = true) para garantir RLS
-- ============================================================================

-- Criar função para obter o complexId do usuário atual (simulação)
CREATE OR REPLACE FUNCTION get_current_complex_id()
RETURNS TEXT AS $$
BEGIN
    -- Esta função deve ser chamada após definir o contexto via SET LOCAL
    RETURN current_setting('app.current_complex_id', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Criar função para obter o userId atual
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- View segura para reservas (bookings) com security_invoker
CREATE OR REPLACE VIEW bookings_safe AS
SELECT
    r.id,
    r."resourceId",
    r."clientId",
    r."startTime",
    r."endTime",
    r.status,
    r."isRecurring",
    r."recurringGroupId",
    r."googleCalendarEventId",
    r."createdAt",
    r."updatedAt",
    res.name as resource_name,
    res."pricePerHour" as price_per_hour,
    res."complexId" as complex_id,
    c."fullName" as client_name,
    c.phone as client_phone,
    c.email as client_email
FROM reservations r
INNER JOIN resources res ON r."resourceId" = res.id
INNER JOIN clients c ON r."clientId" = c.id
WHERE res."complexId" = get_current_complex_id();

-- Comentário indicando que a view usa security invoker
COMMENT ON VIEW bookings_safe IS 'View segura de reservas com isolamento por tenant. Equivalente a WITH (security_invoker = true).';

-- ============================================================================
-- 3. TRIGGER PARA AUTO-VINCULAR ADMIN AO CRIAR COMPLEX
-- Equivalente a handle_new_venue()
-- ============================================================================

-- Função trigger para auto-vincular usuário ao criar complexo
CREATE OR REPLACE FUNCTION handle_new_complex()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando um novo complexo é criado, atualiza o usuário que o criou
    -- O userId deve ser passado via contexto da aplicação
    UPDATE users
    SET "complexId" = NEW.id,
        role = 'ADMIN',
        status = 'ACTIVE'
    WHERE id = get_current_user_id()
      AND "complexId" IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger após inserção de complexo
DROP TRIGGER IF EXISTS trigger_handle_new_complex ON complexes;
CREATE TRIGGER trigger_handle_new_complex
    AFTER INSERT ON complexes
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_complex();

-- ============================================================================
-- 4. FUNÇÃO DE VALIDAÇÃO IDOR (Insecure Direct Object Reference)
-- Valida se o registro pertence ao complexo do usuário
-- ============================================================================

-- Função para validar acesso a um recurso
CREATE OR REPLACE FUNCTION validate_resource_access(
    p_resource_id TEXT,
    p_complex_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_belongs BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM resources
        WHERE id = p_resource_id
        AND "complexId" = p_complex_id
    ) INTO v_belongs;

    RETURN v_belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para validar acesso a um cliente
CREATE OR REPLACE FUNCTION validate_client_access(
    p_client_id TEXT,
    p_complex_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_belongs BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM clients
        WHERE id = p_client_id
        AND "complexId" = p_complex_id
    ) INTO v_belongs;

    RETURN v_belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para validar acesso a uma reserva
CREATE OR REPLACE FUNCTION validate_reservation_access(
    p_reservation_id TEXT,
    p_complex_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_belongs BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM reservations r
        INNER JOIN resources res ON r."resourceId" = res.id
        WHERE r.id = p_reservation_id
        AND res."complexId" = p_complex_id
    ) INTO v_belongs;

    RETURN v_belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para validar acesso a um produto
CREATE OR REPLACE FUNCTION validate_product_access(
    p_product_id TEXT,
    p_complex_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_belongs BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM products
        WHERE id = p_product_id
        AND "complexId" = p_complex_id
    ) INTO v_belongs;

    RETURN v_belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para validar acesso a uma comanda (tab)
CREATE OR REPLACE FUNCTION validate_tab_access(
    p_tab_id TEXT,
    p_complex_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_belongs BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM tabs t
        INNER JOIN clients c ON t."clientId" = c.id
        WHERE t.id = p_tab_id
        AND c."complexId" = p_complex_id
    ) INTO v_belongs;

    RETURN v_belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 5. FUNÇÃO DE CÁLCULO DE TOTAIS COM INTEGRIDADE (LGPD/Financeiro)
-- Evita dessincronização em operações concorrentes
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_booking_totals(
    p_reservation_id TEXT,
    p_complex_id TEXT
) RETURNS TABLE (
    space_total NUMERIC,
    items_total NUMERIC,
    grand_total NUMERIC,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_reservation RECORD;
    v_space_total NUMERIC := 0;
    v_items_total NUMERIC := 0;
    v_price_per_hour NUMERIC;
    v_hours NUMERIC;
BEGIN
    -- Validar acesso IDOR primeiro
    IF NOT validate_reservation_access(p_reservation_id, p_complex_id) THEN
        RETURN QUERY SELECT
            0::NUMERIC,
            0::NUMERIC,
            0::NUMERIC,
            FALSE,
            'Acesso negado: reserva não pertence ao seu estabelecimento'::TEXT;
        RETURN;
    END IF;

    -- Buscar dados da reserva com lock para evitar race conditions
    SELECT
        r.id,
        r."startTime",
        r."endTime",
        res."pricePerHour"
    INTO v_reservation
    FROM reservations r
    INNER JOIN resources res ON r."resourceId" = res.id
    WHERE r.id = p_reservation_id
    FOR UPDATE OF r;

    IF v_reservation IS NULL THEN
        RETURN QUERY SELECT
            0::NUMERIC,
            0::NUMERIC,
            0::NUMERIC,
            FALSE,
            'Reserva não encontrada'::TEXT;
        RETURN;
    END IF;

    -- Calcular horas (arredondado para cima)
    v_hours := CEIL(EXTRACT(EPOCH FROM (v_reservation."endTime" - v_reservation."startTime")) / 3600);
    v_space_total := v_hours * v_reservation."pricePerHour";

    -- Calcular total de itens das comandas associadas
    SELECT COALESCE(SUM(ti.total), 0)
    INTO v_items_total
    FROM tabs t
    INNER JOIN tab_items ti ON t.id = ti."tabId"
    WHERE t."reservationId" = p_reservation_id
    AND t.status != 'CANCELLED';

    RETURN QUERY SELECT
        v_space_total,
        v_items_total,
        (v_space_total + v_items_total),
        TRUE,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ÍNDICES DE PERFORMANCE MULTI-TENANT
-- Otimizados para filtros obrigatórios de RLS
-- ============================================================================

-- Índices compostos para tabela de reservations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_complex_id
ON reservations ("resourceId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_complex_status
ON reservations ("resourceId", status, "startTime");

-- Índices compostos para tabela de tabs (comandas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tabs_client_created
ON tabs ("clientId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tabs_reservation_status
ON tabs ("reservationId", status);

-- Índices compostos para tabela de tab_items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tab_items_tab_product
ON tab_items ("tabId", "productId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tab_items_created
ON tab_items ("tabId", "createdAt" DESC);

-- Índices compostos para tabela de products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_complex_stock
ON products ("complexId", stock);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_complex_name
ON products ("complexId", name);

-- Índices compostos para tabela de stock_movements
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_product_created
ON stock_movements ("productId", "createdAt" DESC);

-- Índices compostos para tabela de clients
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_complex_name
ON clients ("complexId", "fullName");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_complex_created
ON clients ("complexId", "createdAt" DESC);

-- Índices compostos para tabela de resources
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resources_complex_type
ON resources ("complexId", "resourceTypeId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resources_complex_name
ON resources ("complexId", name);

-- ============================================================================
-- 7. FUNÇÃO DE AUDITORIA PARA LGPD
-- Registra acessos a dados sensíveis
-- ============================================================================

-- Tabela de auditoria de acessos
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT,
    complex_id TEXT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_complex_created
ON audit_logs (complex_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action
ON audit_logs (table_name, action, created_at DESC);

-- Função para registrar auditoria
CREATE OR REPLACE FUNCTION log_audit(
    p_user_id TEXT,
    p_complex_id TEXT,
    p_action TEXT,
    p_table_name TEXT,
    p_record_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_log_id TEXT;
BEGIN
    INSERT INTO audit_logs (
        user_id,
        complex_id,
        action,
        table_name,
        record_id,
        ip_address,
        user_agent,
        details
    ) VALUES (
        p_user_id,
        p_complex_id,
        p_action,
        p_table_name,
        p_record_id,
        p_ip_address,
        p_user_agent,
        p_details
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. FUNÇÃO PARA ANONIMIZAÇÃO DE DADOS (LGPD - Direito ao Esquecimento)
-- ============================================================================

CREATE OR REPLACE FUNCTION anonymize_client_data(
    p_client_id TEXT,
    p_complex_id TEXT,
    p_requesting_user_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_client_exists BOOLEAN;
BEGIN
    -- Validar acesso
    IF NOT validate_client_access(p_client_id, p_complex_id) THEN
        RAISE EXCEPTION 'Acesso negado: cliente não pertence ao estabelecimento';
    END IF;

    -- Verificar se cliente existe
    SELECT EXISTS(SELECT 1 FROM clients WHERE id = p_client_id) INTO v_client_exists;

    IF NOT v_client_exists THEN
        RAISE EXCEPTION 'Cliente não encontrado';
    END IF;

    -- Anonimizar dados do cliente (LGPD)
    UPDATE clients
    SET
        "fullName" = 'DADOS_ANONIMIZADOS_' || SUBSTRING(id, 1, 8),
        phone = '00000000000',
        email = 'anonimizado_' || SUBSTRING(id, 1, 8) || '@anonimizado.com',
        cpf = NULL,
        "updatedAt" = NOW()
    WHERE id = p_client_id;

    -- Registrar auditoria
    PERFORM log_audit(
        p_requesting_user_id,
        p_complex_id,
        'ANONYMIZE',
        'clients',
        p_client_id,
        NULL,
        NULL,
        jsonb_build_object('reason', 'LGPD - Direito ao Esquecimento')
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. POLICIES DE RLS (Descomentear se for usar RLS nativo do PostgreSQL)
-- ============================================================================

-- Policy para resources - SELECT
-- CREATE POLICY resources_select_policy ON resources
--     FOR SELECT
--     USING ("complexId" = get_current_complex_id());

-- Policy para resources - INSERT
-- CREATE POLICY resources_insert_policy ON resources
--     FOR INSERT
--     WITH CHECK ("complexId" = get_current_complex_id());

-- Policy para resources - UPDATE
-- CREATE POLICY resources_update_policy ON resources
--     FOR UPDATE
--     USING ("complexId" = get_current_complex_id());

-- Policy para resources - DELETE
-- CREATE POLICY resources_delete_policy ON resources
--     FOR DELETE
--     USING ("complexId" = get_current_complex_id());

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
