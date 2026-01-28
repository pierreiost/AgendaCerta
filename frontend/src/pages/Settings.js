import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useVenue } from '../contexts/VenueContext';
import {
  Settings as SettingsIcon,
  Palette,
  Upload,
  X,
  Check,
  RefreshCw,
  Trash2,
  Eye,
  Building2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

const Settings = () => {
  const { user } = useAuth();
  const { currentVenue, visualIdentity, updateVisualIdentity, DEFAULT_COLORS } = useVenue();

  const [activeTab, setActiveTab] = useState('visual-identity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estado para identidade visual
  const [primaryColor, setPrimaryColor] = useState(visualIdentity.primaryColor || DEFAULT_COLORS.primary);
  const [accentColor, setAccentColor] = useState(visualIdentity.accentColor || DEFAULT_COLORS.accent);
  const [logoPreview, setLogoPreview] = useState(visualIdentity.logoUrl || null);
  const [logoFile, setLogoFile] = useState(null);

  const fileInputRef = useRef(null);

  // Atualizar cores quando o contexto mudar
  useEffect(() => {
    setPrimaryColor(visualIdentity.primaryColor || DEFAULT_COLORS.primary);
    setAccentColor(visualIdentity.accentColor || DEFAULT_COLORS.accent);
    setLogoPreview(visualIdentity.logoUrl || null);
  }, [visualIdentity, DEFAULT_COLORS]);

  // Verifica se é admin
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Converte Hex para HSL para preview
  const hexToHSL = (hex) => {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
        default: h = 0;
      }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  // Handler para seleção de arquivo
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não permitido. Use JPEG, PNG, GIF, WebP ou SVG.');
      return;
    }

    // Validar tamanho (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Arquivo muito grande. O tamanho máximo é 2MB.');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');
  };

  // Handler para upload do logo
  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await api.post('/complex/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setLogoPreview(response.data.logoUrl);
      setLogoFile(null);
      setSuccess('Logo atualizado com sucesso!');

      // Atualizar contexto
      await updateVisualIdentity({ logoUrl: response.data.logoUrl });

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer upload do logo');
    } finally {
      setLoading(false);
    }
  };

  // Handler para remover logo
  const handleRemoveLogo = async () => {
    if (!window.confirm('Tem certeza que deseja remover o logo?')) return;

    setLoading(true);
    setError('');

    try {
      await api.delete('/complex/logo');
      setLogoPreview(null);
      setLogoFile(null);
      setSuccess('Logo removido com sucesso!');

      // Atualizar contexto
      await updateVisualIdentity({ logoUrl: null });

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao remover logo');
    } finally {
      setLoading(false);
    }
  };

  // Handler para salvar cores
  const handleSaveColors = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await updateVisualIdentity({
        primaryColor,
        accentColor,
      });

      if (result.success) {
        setSuccess('Cores atualizadas com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Erro ao atualizar cores');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar cores');
    } finally {
      setLoading(false);
    }
  };

  // Handler para resetar cores
  const handleResetColors = () => {
    setPrimaryColor(DEFAULT_COLORS.primary);
    setAccentColor(DEFAULT_COLORS.accent);
  };

  // Verifica se há mudanças nas cores
  const hasColorChanges =
    primaryColor !== (visualIdentity.primaryColor || DEFAULT_COLORS.primary) ||
    accentColor !== (visualIdentity.accentColor || DEFAULT_COLORS.accent);

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="container" style={{ padding: '2rem 1rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <AlertCircle size={48} style={{ color: 'var(--warning-color)', marginBottom: '1rem' }} />
            <h2>Acesso Restrito</h2>
            <p className="text-muted">Apenas administradores podem acessar as configurações.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <div className="flex" style={{ alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <SettingsIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Configurações</h1>
              <p className="text-muted">{currentVenue?.name || 'Seu Estabelecimento'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid var(--border-color)',
          paddingBottom: '0.5rem'
        }}>
          <button
            onClick={() => setActiveTab('visual-identity')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'visual-identity' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'visual-identity' ? 'white' : 'var(--text-dark)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            <Palette size={18} />
            Identidade Visual
          </button>
        </div>

        {/* Alertas */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            <Check size={18} />
            {success}
          </div>
        )}

        {/* Conteúdo das Tabs */}
        {activeTab === 'visual-identity' && (
          <div className="grid grid-2" style={{ gap: '1.5rem' }}>
            {/* Coluna de Configuração */}
            <div className="card">
              <h3 className="text-lg font-bold" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Palette size={20} />
                Cores do Sistema
              </h3>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Cor Primária
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{
                      width: '60px',
                      height: '40px',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        setPrimaryColor(val);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontFamily: 'monospace'
                    }}
                    placeholder="#10b981"
                  />
                </div>
                <small className="text-muted">
                  HSL: {hexToHSL(primaryColor).h}° {hexToHSL(primaryColor).s}% {hexToHSL(primaryColor).l}%
                </small>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Cor de Destaque
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    style={{
                      width: '60px',
                      height: '40px',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        setAccentColor(val);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontFamily: 'monospace'
                    }}
                    placeholder="#3b82f6"
                  />
                </div>
                <small className="text-muted">
                  HSL: {hexToHSL(accentColor).h}° {hexToHSL(accentColor).s}% {hexToHSL(accentColor).l}%
                </small>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-outline"
                  onClick={handleResetColors}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  <RefreshCw size={16} />
                  Resetar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveColors}
                  disabled={loading || !hasColorChanges}
                  style={{ flex: 1 }}
                >
                  {loading ? (
                    <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  ) : (
                    <>
                      <Check size={16} />
                      Salvar Cores
                    </>
                  )}
                </button>
              </div>

              {/* Logo Upload */}
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                <h3 className="text-lg font-bold" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={20} />
                  Logo do Estabelecimento
                </h3>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: logoPreview ? 'transparent' : 'var(--bg-dark)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />

                  {logoPreview ? (
                    <div>
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '100px',
                          objectFit: 'contain',
                          marginBottom: '1rem'
                        }}
                      />
                      <p className="text-sm text-muted">Clique para alterar</p>
                    </div>
                  ) : (
                    <div>
                      <Upload size={40} style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }} />
                      <p className="font-bold">Clique para enviar logo</p>
                      <p className="text-sm text-muted">JPEG, PNG, GIF, WebP ou SVG (max. 2MB)</p>
                    </div>
                  )}
                </div>

                {/* Botões de ação do logo */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  {logoFile && (
                    <button
                      className="btn btn-primary"
                      onClick={handleLogoUpload}
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      {loading ? (
                        <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                      ) : (
                        <>
                          <Upload size={16} />
                          Enviar Logo
                        </>
                      )}
                    </button>
                  )}

                  {logoPreview && !logoFile && (
                    <button
                      className="btn btn-danger"
                      onClick={handleRemoveLogo}
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      <Trash2 size={16} />
                      Remover Logo
                    </button>
                  )}

                  {logoFile && (
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(visualIdentity.logoUrl || null);
                      }}
                      disabled={loading}
                    >
                      <X size={16} />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna de Preview */}
            <div className="card">
              <h3 className="text-lg font-bold" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={20} />
                Preview em Tempo Real
              </h3>

              {/* Preview do Header */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'white',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }}
                      />
                    ) : (
                      <Building2 size={24} style={{ color: primaryColor }} />
                    )}
                  </div>
                  <span style={{ fontWeight: '700', color: primaryColor }}>
                    {currentVenue?.name || 'Seu Estabelecimento'}
                  </span>
                </div>
              </div>

              {/* Preview dos Botões */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="text-sm font-bold" style={{ marginBottom: '0.75rem' }}>Botões</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button style={{
                    padding: '0.625rem 1.25rem',
                    background: primaryColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}>
                    Botão Primário
                  </button>
                  <button style={{
                    padding: '0.625rem 1.25rem',
                    background: accentColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}>
                    Botão Secundário
                  </button>
                  <button style={{
                    padding: '0.625rem 1.25rem',
                    background: 'transparent',
                    color: primaryColor,
                    border: `2px solid ${primaryColor}`,
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}>
                    Botão Outline
                  </button>
                </div>
              </div>

              {/* Preview do Avatar */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="text-sm font-bold" style={{ marginBottom: '0.75rem' }}>Avatar do Usuário</p>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '1.25rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>

              {/* Preview dos Status */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="text-sm font-bold" style={{ marginBottom: '0.75rem' }}>Status</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: `${primaryColor}20`,
                    color: primaryColor,
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Disponível
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: `${accentColor}20`,
                    color: accentColor,
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Em Uso
                  </span>
                </div>
              </div>

              {/* Preview do Card */}
              <div>
                <p className="text-sm font-bold" style={{ marginBottom: '0.75rem' }}>Card de Exemplo</p>
                <div style={{
                  background: 'white',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  borderLeft: `4px solid ${primaryColor}`
                }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>Reserva #1234</h4>
                  <p className="text-sm text-muted">Quadra de Tênis - 14:00 às 15:00</p>
                  <div style={{ marginTop: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: `${primaryColor}20`,
                      color: primaryColor,
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      CONFIRMADA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Settings;
