import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, Shield, MapPin, Users, X, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import axios from 'axios';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
    const colors = ['#dc2626', '#f59e0b', '#eab308', '#10b981', '#059669'];

    return {
      strength: (strength / 5) * 100,
      label: labels[strength - 1] || '',
      color: colors[strength - 1] || '#dc2626'
    };
  };

  const passwordStrength = (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') 
    ? getPasswordStrength(passwordData.newPassword)
    : null;

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validatePassword = () => {
    if (!passwordData.currentPassword) {
      setError('Digite sua senha atual');
      return false;
    }

    if (!passwordData.newPassword) {
      setError('Digite a nova senha');
      return false;
    }

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      if (passwordData.newPassword.length < 8) {
        setError('A senha deve ter no mínimo 8 caracteres');
        return false;
      }

      if (!/[A-Z]/.test(passwordData.newPassword)) {
        setError('A senha deve conter pelo menos uma letra maiúscula');
        return false;
      }

      if (!/[a-z]/.test(passwordData.newPassword)) {
        setError('A senha deve conter pelo menos uma letra minúscula');
        return false;
      }

      if (!/[0-9]/.test(passwordData.newPassword)) {
        setError('A senha deve conter pelo menos um número');
        return false;
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)) {
        setError('A senha deve conter pelo menos um caractere especial');
        return false;
      }
    } else {
      if (passwordData.newPassword.length < 6) {
        setError('A nova senha deve ter no mínimo 6 caracteres');
        return false;
      }
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      setError('A nova senha deve ser diferente da atual');
      return false;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowSuccessAnimation(true);
      setSuccess('Senha alterada com sucesso!');
      
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setSuccess('');
        closePasswordModal();
      }, 2500);

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setError(error.response?.data?.error || 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowSuccessAnimation(false);
  };

  return (
    <>
      <Header />
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="flex" style={{ alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, var(--primary-color) 0%, #059669 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}>
              <User size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h1>
              <p className="text-muted">{user?.email}</p>
              <span className="badge badge-info" style={{ marginTop: '0.5rem' }}>
                {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'SEMI_ADMIN' ? 'Funcionário' : user?.role}
              </span>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            background: 'var(--bg-dark)',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <p className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>Informações do Perfil</p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <p className="text-sm"><strong>Telefone:</strong> {user?.phone}</p>
              {user?.cpf && <p className="text-sm"><strong>CPF:</strong> {user?.cpf}</p>}
              {user?.complex && (
                <p className="text-sm"><strong>Complexo:</strong> {user?.complex.name}</p>
              )}
            </div>
          </div>
          
          {success && (
            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
              <CheckCircle size={18} />
              {success}
            </div>
          )}
          
          <h3 className="text-xl font-bold" style={{ marginBottom: '1rem' }}>Configurações</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              className="btn btn-outline" 
              style={{ justifyContent: 'flex-start' }}
              onClick={() => alert('Funcionalidade em desenvolvimento')}
            >
              <Settings size={18} />
              Editar Perfil
            </button>
            
            <button 
              className="btn btn-outline" 
              style={{ justifyContent: 'flex-start' }}
              onClick={() => setShowPasswordModal(true)}
            >
              <Shield size={18} />
              Alterar Senha
            </button>
            
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <button 
                className="btn btn-outline" 
                style={{ justifyContent: 'flex-start' }}
                onClick={() => navigate('/users')}
              >
                <Users size={18} />
                Gerenciar Usuários
              </button>
            )}
            
            <button 
              className="btn btn-outline" 
              style={{ justifyContent: 'flex-start' }}
              onClick={() => alert('Funcionalidade em desenvolvimento')}
            >
              <MapPin size={18} />
              Gerenciar Complexo
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div 
          className="modal-overlay" 
          onClick={closePasswordModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div 
            className="modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '500px',
              width: '100%',
              margin: '0',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <div 
              style={{ 
                background: 'linear-gradient(135deg, #34a853, #2d8e47)',
                color: 'white',
                padding: '2rem',
                borderRadius: '16px 16px 0 0',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Lock size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ marginBottom: '0.25rem' }}>Alterar Senha</h2>
                  <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>Crie uma nova senha segura</p>
                </div>
              </div>
              <button 
                onClick={closePasswordModal}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
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

            <div style={{ padding: '2rem', background: 'white', position: 'relative' }}>
              {showSuccessAnimation && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.98)',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0 0 16px 16px',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #34a853, #2d8e47)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    animation: 'scaleIn 0.5s ease-out, pulse 2s ease-in-out 0.5s infinite',
                    boxShadow: '0 10px 40px rgba(52, 168, 83, 0.3)',
                    position: 'relative'
                  }}>
                    {/* Partículas de sucesso */}
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#34a853',
                          animation: `particle${i} 1s ease-out 0.3s both`,
                          top: '50%',
                          left: '50%'
                        }}
                      />
                    ))}
                    
                    <CheckCircle size={60} color="white" style={{
                      animation: 'checkmark 0.5s ease-out 0.3s both'
                    }} />
                  </div>
                  <h3 style={{
                    color: '#34a853',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    animation: 'slideUp 0.5s ease-out 0.4s both'
                  }}>
                    Senha Alterada!
                  </h3>
                  <p style={{
                    color: '#5f6368',
                    fontSize: '1rem',
                    animation: 'slideUp 0.5s ease-out 0.5s both'
                  }}>
                    Sua senha foi atualizada com sucesso
                  </p>
                </div>
              )}
              
              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmitPassword}>
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="currentPassword" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                    Senha Atual *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Digite sua senha atual"
                      style={{
                        padding: '1rem',
                        paddingRight: '3rem',
                        borderRadius: '12px',
                        border: '2px solid var(--border-color)',
                        fontSize: '1rem',
                        width: '100%',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#34a853'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: '0.25rem'
                      }}
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="newPassword" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                    Nova Senha *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Digite a nova senha"
                      style={{
                        padding: '1rem',
                        paddingRight: '3rem',
                        borderRadius: '12px',
                        border: '2px solid var(--border-color)',
                        fontSize: '1rem',
                        width: '100%',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#34a853'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: '0.25rem'
                      }}
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <small className="text-muted" style={{ display: 'block', marginTop: '0.5rem' }}>
                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') 
                      ? 'Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial'
                      : 'Mínimo de 6 caracteres'
                    }
                  </small>
                  
                  {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && passwordData.newPassword && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{
                        height: '6px',
                        background: '#e5e7eb',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${passwordStrength.strength}%`,
                          background: passwordStrength.color,
                          transition: 'all 0.3s ease',
                          borderRadius: '3px'
                        }}></div>
                      </div>
                      <small style={{ 
                        color: passwordStrength.color,
                        fontWeight: '600',
                        fontSize: '0.75rem'
                      }}>
                        Força da senha: {passwordStrength.label}
                      </small>
                      
                      <div style={{ 
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ display: 'grid', gap: '0.25rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            color: passwordData.newPassword.length >= 8 ? '#059669' : '#6b7280'
                          }}>
                            <span>{passwordData.newPassword.length >= 8 ? '✓' : '○'}</span>
                            <span>Mínimo 8 caracteres</span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            color: /[A-Z]/.test(passwordData.newPassword) ? '#059669' : '#6b7280'
                          }}>
                            <span>{/[A-Z]/.test(passwordData.newPassword) ? '✓' : '○'}</span>
                            <span>Uma letra maiúscula</span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            color: /[a-z]/.test(passwordData.newPassword) ? '#059669' : '#6b7280'
                          }}>
                            <span>{/[a-z]/.test(passwordData.newPassword) ? '✓' : '○'}</span>
                            <span>Uma letra minúscula</span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            color: /[0-9]/.test(passwordData.newPassword) ? '#059669' : '#6b7280'
                          }}>
                            <span>{/[0-9]/.test(passwordData.newPassword) ? '✓' : '○'}</span>
                            <span>Um número</span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            color: /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) ? '#059669' : '#6b7280'
                          }}>
                            <span>{/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) ? '✓' : '○'}</span>
                            <span>Um caractere especial (!@#$%...)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="input-group" style={{ marginBottom: '2rem' }}>
                  <label htmlFor="confirmPassword" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                    Confirmar Nova Senha *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Digite novamente a nova senha"
                      style={{
                        padding: '1rem',
                        paddingRight: '3rem',
                        borderRadius: '12px',
                        border: '2px solid var(--border-color)',
                        fontSize: '1rem',
                        width: '100%',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#34a853'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: '0.25rem'
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex" style={{ gap: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={closePasswordModal}
                    disabled={loading}
                    style={{ 
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '1rem'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ 
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="loading" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                        Alterando...
                      </>
                    ) : (
                      <>
                        <Shield size={20} />
                        Alterar Senha
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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

        @keyframes checkmark {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 10px 40px rgba(52, 168, 83, 0.3);
          }
          50% {
            box-shadow: 0 10px 50px rgba(52, 168, 83, 0.5);
          }
        }

        @keyframes particle0 {
          from {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(0, -60px) scale(0);
            opacity: 0;
          }
        }

        @keyframes particle1 {
          from {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(42px, -42px) scale(0);
            opacity: 0;
          }
        }

        @keyframes particle2 {
          from {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(60px, 0) scale(0);
            opacity: 0;
          }
        }

        @keyframes particle3 {
          from {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(42px, 42px) scale(0);
            opacity: 0;
          }
        }

        @keyframes particle4 {
          from {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(0, 60px) scale(0);
            opacity: 0;
          }
        }

        @keyframes particle5 {
          from {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(-42px, 42px) scale(0);
            opacity: 0;
          }
        }

        @keyframes particle6 {
          from {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(-60px, 0) scale(0);
            opacity: 0;
          }
        }

        @keyframes particle7 {
          from {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate(-42px, -42px) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default Profile;