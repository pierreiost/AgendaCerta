import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MaskedInput from '../components/MaskedInput';
import { CheckCircle, ArrowLeft } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cpf: '',
    cnpj: '',
    complexName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.password || !formData.phone || !formData.cnpj || !formData.complexName) {
      setError('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido');
      return;
    }

    if (formData.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      setError('A senha deve conter letras minúsculas');
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError('A senha deve conter letras maiúsculas');
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      setError('A senha deve conter números');
      return;
    }

    if (!/[@$!%*?&#]/.test(formData.password)) {
      setError('A senha deve conter caracteres especiais (@$!%*?&#)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    const phoneNumbers = formData.phone.replace(/\D/g, '');
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      setError('Telefone inválido. Use (XX) XXXXX-XXXX');
      return;
    }

    if (formData.cpf) {
      const cpfNumbers = formData.cpf.replace(/\D/g, '');
      if (cpfNumbers.length !== 11) {
        setError('CPF inválido. Use XXX.XXX.XXX-XX');
        return;
      }
    }

    const cnpjNumbers = formData.cnpj.replace(/\D/g, '');
    if (cnpjNumbers.length !== 14) {
      setError('CNPJ inválido. Use XX.XXX.XXX/XXXX-XX');
      return;
    }

    setLoading(true);

    const result = await register(formData);
    
    if (result.success) {
      setRegisteredEmail(formData.email);
      setShowSuccess(true);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  if (showSuccess) {
    return (
      <div style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #34a853 0%, #2d8f47 100%)',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '60px 40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            animation: 'fadeIn 0.5s ease-in-out'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #34a853 0%, #2d8f47 100%)',
              borderRadius: '50%',
              marginBottom: '30px',
              animation: 'scaleIn 0.5s ease-in-out 0.2s both'
            }}>
              <CheckCircle size={48} color="white" />
            </div>

            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#34a853',
              marginBottom: '20px',
              animation: 'fadeIn 0.5s ease-in-out 0.4s both'
            }}>
              Cadastro Realizado!
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '10px',
              lineHeight: '1.6',
              animation: 'fadeIn 0.5s ease-in-out 0.6s both'
            }}>
              Sua solicitação de cadastro foi enviada com sucesso.
            </p>

            <div style={{
              background: '#f8f9fa',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '30px',
              animation: 'fadeIn 0.5s ease-in-out 0.8s both'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#5f6368',
                marginBottom: '15px',
                lineHeight: '1.6'
              }}>
                <strong>O que acontece agora?</strong>
              </p>
              <div style={{
                textAlign: 'left',
                fontSize: '14px',
                color: '#5f6368',
                lineHeight: '1.8'
              }}>
                <p style={{ marginBottom: '8px' }}>
                  ✓ Nossa equipe irá analisar seu cadastro
                </p>
                <p style={{ marginBottom: '8px' }}>
                  ✓ Você receberá um email em <strong>{registeredEmail}</strong>
                </p>
                <p style={{ marginBottom: '0' }}>
                  ✓ Após aprovação, você poderá fazer login no sistema
                </p>
              </div>
            </div>

            <div style={{
              padding: '15px',
              background: '#e8f5e9',
              borderRadius: '8px',
              marginBottom: '30px',
              animation: 'fadeIn 0.5s ease-in-out 1s both'
            }}>
              <p style={{
                fontSize: '13px',
                color: '#2d8f47',
                margin: 0,
                lineHeight: '1.6'
              }}>
                <strong>⏱️ Tempo estimado:</strong> A aprovação geralmente ocorre em até 24 horas úteis.
              </p>
            </div>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #34a853 0%, #2d8f47 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(52, 168, 83, 0.3)',
                transition: 'all 0.3s ease',
                animation: 'fadeIn 0.5s ease-in-out 1.2s both'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(52, 168, 83, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(52, 168, 83, 0.3)';
              }}
            >
              <ArrowLeft size={18} />
              Voltar para Login
            </Link>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.5);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .register-container {
          width: 85vw;
          height: 85vh;
          max-width: 1200px;
          max-height: 750px;
          min-height: 550px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          display: flex;
          overflow: hidden;
        }
        
        .illustration-panel {
          flex: 1;
          background: linear-gradient(135deg, #34a853 0%, #2d8f47 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        
        .register-panel {
          flex: 1;
          background: #f5f5f5;
          padding: 40px 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow-y: auto;
        }
        
        @media (max-width: 968px) {
          .illustration-panel {
            display: none !important;
          }
          .register-container {
            width: 90vw !important;
            max-width: 500px !important;
          }
          .register-panel {
            padding: 40px 30px !important;
          }
        }
        
        @media (max-width: 480px) {
          .register-container {
            width: 95vw !important;
            height: 90vh !important;
          }
          .register-panel {
            padding: 30px 20px !important;
          }
        }
      `}</style>

      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #34a853 0%, #2d8f47 100%)',
        padding: '0',
        margin: '0',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
      }}>
        <div className="register-container">
          <div className="illustration-panel">
            <div style={{
              textAlign: 'center',
              color: 'white',
              zIndex: 1
            }}>
              <h1 style={{
                fontSize: '48px',
                fontWeight: '700',
                marginBottom: '20px',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>
                QuadraCerta
              </h1>
              <p style={{
                fontSize: '18px',
                fontWeight: '300',
                marginBottom: '40px',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>
                Gestão completa para complexos esportivos
              </p>
              <div style={{
                fontSize: '14px',
                opacity: 0.9
              }}>
                ✓ Controle de quadras<br />
                ✓ Agendamentos inteligentes<br />
                ✓ Gestão financeira<br />
                ✓ Comandas e estoque
              </div>
            </div>
          </div>

          <div className="register-panel">
            <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
              <h2 style={{
                fontSize: '26px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '6px',
                textAlign: 'center'
              }}>
                CRIAR CONTA
              </h2>
              <p style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                Preencha seus dados para começar
              </p>

              {error && (
                <div style={{
                  padding: '10px 12px',
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  fontSize: '12px',
                  color: '#c33',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '500'
                    }}>
                      Nome *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="João"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: 'none',
                        borderRadius: '8px',
                        outline: 'none',
                        background: 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.boxShadow = '0 2px 10px rgba(52, 168, 83, 0.2)';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '500'
                    }}>
                      Sobrenome *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Silva"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: 'none',
                        borderRadius: '8px',
                        outline: 'none',
                        background: 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.boxShadow = '0 2px 10px rgba(52, 168, 83, 0.2)';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Nome do Complexo *
                  </label>
                  <input
                    type="text"
                    name="complexName"
                    value={formData.complexName}
                    onChange={handleChange}
                    placeholder="Ex: Arena Sports Center"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'white',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 2px 10px rgba(52, 168, 83, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Email *
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
                      padding: '10px 12px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'white',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 2px 10px rgba(52, 168, 83, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '500'
                    }}>
                      Telefone *
                    </label>
                    <MaskedInput
                      mask="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: 'none',
                        borderRadius: '8px',
                        outline: 'none',
                        background: 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '500'
                    }}>
                      CPF (Opcional)
                    </label>
                    <MaskedInput
                      mask="cpf"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: 'none',
                        borderRadius: '8px',
                        outline: 'none',
                        background: 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    CNPJ *
                  </label>
                  <MaskedInput
                    mask="cnpj"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleChange}
                    placeholder="00.000.000/0000-00"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'white',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Senha *
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
                      padding: '10px 12px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'white',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 2px 10px rgba(52, 168, 83, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                  <small style={{ fontSize: '10px', color: '#888', marginTop: '4px', display: 'block' }}>
                    Mín. 8 caracteres, maiúsculas, minúsculas, números e especiais
                  </small>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'white',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 2px 10px rgba(52, 168, 83, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    background: loading ? '#999' : 'linear-gradient(135deg, #34a853 0%, #2d8f47 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(52, 168, 83, 0.3)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(52, 168, 83, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(52, 168, 83, 0.3)';
                    }
                  }}
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </button>

                <div style={{
                  marginTop: '15px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  Já tem uma conta?{' '}
                  <Link
                    to="/login"
                    style={{
                      color: '#34a853',
                      textDecoration: 'none',
                      fontWeight: '600'
                    }}
                  >
                    Fazer Login
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
