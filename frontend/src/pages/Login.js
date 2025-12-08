import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Clock, XCircle, Ban, Phone, Mail, X } from 'lucide-react';
import logo from '../utils/complex.png';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorType('');
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      if (result.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      if (result.status === 'SUSPENDED') {
        setShowSuspendedModal(true);
      } else {
        setError(result.error);
        setErrorType(result.status || 'error');
      }
    }

    setLoading(false);
  };

  const closeSuspendedModal = () => {
    setShowSuspendedModal(false);
    setFormData({
      email: '',
      password: ''
    });
  };

  const getErrorIcon = () => {
    switch(errorType) {
      case 'PENDING':
        return <Clock size={20} color="#fbbc04" />;
      case 'REJECTED':
        return <XCircle size={20} color="#ea4335" />;
      case 'SUSPENDED':
        return <Ban size={20} color="#ea4335" />;
      default:
        return <AlertCircle size={20} color="#ea4335" />;
    }
  };

  const getErrorColor = () => {
    switch(errorType) {
      case 'PENDING':
        return { bg: '#fff4e5', border: '#fbbc04', text: '#c77700' };
      case 'REJECTED':
      case 'SUSPENDED':
        return { bg: '#ffebee', border: '#ea4335', text: '#c62828' };
      default:
        return { bg: '#ffebee', border: '#ea4335', text: '#c62828' };
    }
  };

  const errorColors = getErrorColor();

  return (
    <div style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .login-container {
          width: 85vw;
          height: 85vh;
          max-width: 1200px;
          max-height: 700px;
          min-height: 500px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          display: flex;
          overflow: hidden;
        }
        
        .illustration-panel {
          flex: 1;
          background: linear-gradient(135deg, #1A73E8 0%, #0F4C81 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        
        .login-panel {
          flex: 1;
          background: #f5f5f5;
          padding: 60px 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow-y: auto;
        }
        
        @media (max-width: 968px) {
          .illustration-panel {
            display: none !important;
          }
          .login-container {
            width: 90vw !important;
            max-width: 450px !important;
          }
          .login-panel {
            padding: 50px 30px !important;
          }
        }
        
        @media (max-width: 480px) {
          .login-container {
            width: 95vw !important;
            height: auto !important;
            min-height: 500px !important;
          }
          .login-panel {
            padding: 40px 20px !important;
          }
        }
      `}</style>

      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A73E8 0%, #0F4C81 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
      }}>
        <div className="login-container">
          <div className="illustration-panel">
            <div style={{
              textAlign: 'center',
              color: 'white',
              zIndex: 1
            }}>
              <img
                src={logo}
                alt="AgendaCerta"
                style={{
                  width: '300px',
                  height: '300px',
                  marginBottom: '30px',
                  opacity: 0.95
                }}
              />
              <h1 style={{
                fontSize: '48px',
                fontWeight: '700',
                marginBottom: '20px',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>
                AgendaCerta
              </h1>
              <p style={{
                fontSize: '18px',
                fontWeight: '300',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>
                Gestão completa para agendamentos e serviços
              </p>
            </div>
          </div>

          <div className="login-panel">
            <div style={{ maxWidth: '380px', width: '100%', margin: '0 auto' }}>
              <h2 style={{
                fontSize: '32px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '10px',
                textAlign: 'center'
              }}>
                BEM-VINDO
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                Entre com suas credenciais
              </p>

              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  background: errorColors.bg,
                  border: `1px solid ${errorColors.border}`,
                  borderRadius: '10px',
                  marginBottom: '20px',
                  animation: 'slideDown 0.3s ease-out'
                }}>
                  <div style={{ marginTop: '2px' }}>
                    {getErrorIcon()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '13px',
                      color: errorColors.text,
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      {error}
                    </p>
                    {errorType === 'SUSPENDED' && (
                      <p style={{
                        fontSize: '12px',
                        color: errorColors.text,
                        margin: '8px 0 0 0',
                        lineHeight: '1.5'
                      }}>
                        <strong>Dúvidas?</strong> Entre em contato com o administrador do sistema.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    color: '#666',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '14px',
                      border: 'none',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'white',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 2px 10px rgba(26, 115, 232, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    color: '#666',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    Senha
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '14px',
                      border: 'none',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'white',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 2px 10px rgba(26, 115, 232, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '25px',
                  fontSize: '13px'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: '#666'
                  }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ marginRight: '6px' }}
                    />
                    Lembrar-me
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{
                      color: '#1A73E8',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    Esqueceu a senha?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'white',
                    background: loading ? '#999' : 'linear-gradient(135deg, #1A73E8 0%, #0F4C81 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(26, 115, 232, 0.3)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(26, 115, 232, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(26, 115, 232, 0.3)';
                    }
                  }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>

                <div style={{
                  marginTop: '25px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  Não tem uma conta?{' '}
                  <Link
                    to="/register"
                    style={{
                      color: '#1A73E8',
                      textDecoration: 'none',
                      fontWeight: '600'
                    }}
                  >
                    Cadastre-se
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {showSuspendedModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            animation: 'fadeIn 0.3s ease'
          }}
          onClick={closeSuspendedModal}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              animation: 'slideUp 0.3s ease',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #ea4335, #c5221f)',
              color: 'white',
              padding: '2rem',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Ban size={32} />
                </div>
                <div>
                  <h2 style={{ marginBottom: '0.25rem', fontSize: '1.75rem', fontWeight: '700' }}>
                    Acesso Suspenso
                  </h2>
                  <p style={{ opacity: 0.95, fontSize: '0.95rem', margin: 0 }}>
                    Entre em contato conosco
                  </p>
                </div>
              </div>
              <button 
                onClick={closeSuspendedModal}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '2.5rem' }}>
              <div style={{
                background: '#fef3cd',
                border: '1px solid #ffc107',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '2rem',
                fontSize: '0.95rem',
                color: '#856404',
                lineHeight: '1.6'
              }}>
                <p style={{ margin: 0 }}>
                  Seu complexo está temporariamente suspenso. Para reativar o acesso, entre em contato com nossa equipe.
                </p>
              </div>

              <div style={{
                background: '#f8f9fa',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#202124',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Contatos
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <a 
                    href="tel:5398125-9200"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: '#202124',
                      border: '2px solid #e8eaed',
                      transition: 'all 0.2s',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#e8eaed';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #1A73E8, #2d8e47)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <Phone size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#5f6368', marginBottom: '0.15rem' }}>
                        WhatsApp / Telefone
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '600' }}>
                        (53) 98125-9200
                      </div>
                    </div>
                  </a>

                  <a 
                    href="mailto:quadracerta@gmail.com"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: '#202124',
                      border: '2px solid #e8eaed',
                      transition: 'all 0.2s',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#4285f4';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#e8eaed';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #4285f4, #3367d6)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <Mail size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#5f6368', marginBottom: '0.15rem' }}>
                        E-mail
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '600' }}>
                        quadracerta@gmail.com
                      </div>
                    </div>
                  </a>
                </div>
              </div>

              <button
                onClick={closeSuspendedModal}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#f1f3f4',
                  color: '#5f6368',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginTop: '0.5rem'
                }}
                onMouseOver={(e) => e.target.style.background = '#e8eaed'}
                onMouseOut={(e) => e.target.style.background = '#f1f3f4'}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Login;