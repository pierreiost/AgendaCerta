// frontend/src/pages/PrivacyPolicy.js
// Pol\u00edtica de Privacidade do AgendaCerta

import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Eye, Database, Users, Mail, FileText } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#1A73E8',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'color 0.2s'
            }}
          >
            <ArrowLeft size={20} />
            Voltar ao In\u00edcio
          </Link>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#1A73E8',
            fontWeight: '700',
            fontSize: '1.25rem'
          }}>
            <Shield size={28} />
            AgendaCerta
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '3rem 1.5rem'
      }}>
        {/* Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #1A73E8, #0d5bbc)',
            borderRadius: '20px',
            marginBottom: '1.5rem'
          }}>
            <Lock size={40} style={{ color: 'white' }} />
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1e293b',
            marginBottom: '1rem'
          }}>
            Pol\u00edtica de Privacidade
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '1.125rem',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Sua privacidade \u00e9 importante para n\u00f3s. Esta pol\u00edtica descreve como coletamos,
            usamos e protegemos suas informa\u00e7\u00f5es pessoais.
          </p>
        </div>

        {/* Sections */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {/* Section 1 */}
          <section style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Database size={24} style={{ color: '#1A73E8' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                1. Informa\u00e7\u00f5es que Coletamos
              </h2>
            </div>
            <div style={{ color: '#475569', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '1rem' }}>
                Coletamos informa\u00e7\u00f5es que voc\u00ea nos fornece diretamente, incluindo:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Nome completo e informa\u00e7\u00f5es de contato (email, telefone)</li>
                <li>Dados de identifica\u00e7\u00e3o (CPF/CNPJ)</li>
                <li>Informa\u00e7\u00f5es de pagamento</li>
                <li>Hist\u00f3rico de reservas e transa\u00e7\u00f5es</li>
                <li>Prefer\u00eancias de comunica\u00e7\u00e3o</li>
              </ul>
              <p>
                Tamb\u00e9m coletamos automaticamente dados de uso, como endere\u00e7o IP,
                tipo de navegador e padr\u00f5es de navega\u00e7\u00e3o.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Eye size={24} style={{ color: '#1A73E8' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                2. Como Usamos suas Informa\u00e7\u00f5es
              </h2>
            </div>
            <div style={{ color: '#475569', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '1rem' }}>
                Utilizamos suas informa\u00e7\u00f5es para:
              </p>
              <ul style={{ paddingLeft: '1.5rem' }}>
                <li>Processar e gerenciar suas reservas</li>
                <li>Enviar confirma\u00e7\u00f5es e lembretes</li>
                <li>Melhorar nossos servi\u00e7os e experi\u00eancia do usu\u00e1rio</li>
                <li>Comunicar sobre atualiza\u00e7\u00f5es e promo\u00e7\u00f5es (com seu consentimento)</li>
                <li>Cumprir obriga\u00e7\u00f5es legais</li>
                <li>Prevenir fraudes e garantir a seguran\u00e7a da plataforma</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Users size={24} style={{ color: '#1A73E8' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                3. Compartilhamento de Dados
              </h2>
            </div>
            <div style={{ color: '#475569', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '1rem' }}>
                N\u00e3o vendemos suas informa\u00e7\u00f5es pessoais. Compartilhamos dados apenas:
              </p>
              <ul style={{ paddingLeft: '1.5rem' }}>
                <li>Com estabelecimentos parceiros para processar suas reservas</li>
                <li>Com provedores de servi\u00e7os que nos auxiliam na opera\u00e7\u00e3o da plataforma</li>
                <li>Quando exigido por lei ou ordem judicial</li>
                <li>Com seu consentimento expl\u00edcito</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Shield size={24} style={{ color: '#1A73E8' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                4. Seguran\u00e7a dos Dados
              </h2>
            </div>
            <div style={{ color: '#475569', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '1rem' }}>
                Implementamos medidas de seguran\u00e7a t\u00e9cnicas e organizacionais para proteger
                suas informa\u00e7\u00f5es, incluindo:
              </p>
              <ul style={{ paddingLeft: '1.5rem' }}>
                <li>Criptografia SSL/TLS para transmiss\u00e3o de dados</li>
                <li>Armazenamento seguro com criptografia em repouso</li>
                <li>Controles de acesso rigorosos</li>
                <li>Monitoramento cont\u00ednuo de seguran\u00e7a</li>
                <li>Backups regulares e planos de recupera\u00e7\u00e3o</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <FileText size={24} style={{ color: '#1A73E8' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                5. Seus Direitos (LGPD)
              </h2>
            </div>
            <div style={{ color: '#475569', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '1rem' }}>
                De acordo com a Lei Geral de Prote\u00e7\u00e3o de Dados (LGPD), voc\u00ea tem direito a:
              </p>
              <ul style={{ paddingLeft: '1.5rem' }}>
                <li>Confirmar a exist\u00eancia de tratamento de seus dados</li>
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar a anonimiza\u00e7\u00e3o, bloqueio ou elimina\u00e7\u00e3o de dados</li>
                <li>Solicitar a portabilidade de seus dados</li>
                <li>Revogar o consentimento a qualquer momento</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Database size={24} style={{ color: '#1A73E8' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                6. Reten\u00e7\u00e3o de Dados
              </h2>
            </div>
            <div style={{ color: '#475569', lineHeight: '1.8' }}>
              <p>
                Mantemos suas informa\u00e7\u00f5es pelo tempo necess\u00e1rio para cumprir as finalidades
                descritas nesta pol\u00edtica, a menos que um per\u00edodo de reten\u00e7\u00e3o mais longo seja
                exigido por lei. Dados de transa\u00e7\u00f5es s\u00e3o mantidos por 5 anos para fins fiscais.
                Ap\u00f3s este per\u00edodo, os dados s\u00e3o anonimizados ou exclu\u00eddos de forma segura.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Mail size={24} style={{ color: '#1A73E8' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                7. Contato
              </h2>
            </div>
            <div style={{ color: '#475569', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '1rem' }}>
                Para exercer seus direitos ou esclarecer d\u00favidas sobre esta pol\u00edtica,
                entre em contato conosco:
              </p>
              <div style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>Email:</strong> privacidade@agendacerta.com.br
                </p>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>Encarregado de Dados (DPO):</strong> dpo@agendacerta.com.br
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Hor\u00e1rio de atendimento:</strong> Segunda a Sexta, das 9h \u00e0s 18h
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <section style={{ padding: '2rem', background: '#f8fafc' }}>
            <p style={{
              color: '#64748b',
              fontSize: '0.875rem',
              margin: 0,
              textAlign: 'center'
            }}>
              <strong>\u00daltima atualiza\u00e7\u00e3o: 26 de janeiro de 2026</strong>
            </p>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.8rem',
              margin: '0.5rem 0 0 0',
              textAlign: 'center'
            }}>
              Esta pol\u00edtica pode ser atualizada periodicamente. Recomendamos que voc\u00ea a revise regularmente.
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#1A73E8',
              textDecoration: 'none',
              fontWeight: '600',
              padding: '0.75rem 1.5rem',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeft size={20} />
            Voltar ao In\u00edcio
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        padding: '2rem 1.5rem',
        marginTop: '3rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <p style={{ margin: 0 }}>
            &copy; 2026 AgendaCerta. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
