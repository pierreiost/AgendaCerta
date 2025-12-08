import React, { useState, useEffect } from 'react';
import { Calendar, Link, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const GoogleCalendarIntegration = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('loading'); // 'loading', 'integrated', 'not_integrated', 'error'
  const [message, setMessage] = useState('');
  const [isWatching, setIsWatching] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // 1. Função para verificar o status da integração
  const checkIntegrationStatus = async () => {
    if (!user || !user.complexId) {
      setStatus('error');
      setMessage('Usuário não associado a um complexo.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/google-calendar/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'integrated') {
        setStatus('integrated');
        setMessage(`Integrado. Token expira em: ${new Date(response.data.expiryDate).toLocaleString()}`);
      } else {
        setStatus('not_integrated');
        setMessage('Não integrado. Clique para iniciar a autenticação.');
      }
    } catch (error) {
      console.error('Erro ao verificar status do Google Calendar:', error);
      setStatus('error');
      setMessage('Erro ao verificar status da integração.');
    }
  };

  // 2. Função para iniciar o fluxo de autenticação
  const handleAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/google-calendar/auth`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Redireciona o usuário para a URL de autenticação do Google
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Erro ao iniciar autenticação:', error);
      setAuthMessage(error.response?.data?.error || 'Erro ao iniciar autenticação. Verifique as credenciais no backend.');
    }
  };

  // 3. Função para iniciar a vigilância (Webhooks)
  const handleWatch = async () => {
    setIsWatching(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/google-calendar/watch`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuthMessage('Vigilância iniciada com sucesso! A sincronização bidirecional está ativa.');
    } catch (error) {
      console.error('Erro ao iniciar vigilância:', error);
      setAuthMessage(error.response?.data?.error || 'Erro ao iniciar vigilância. Verifique se o BACKEND_URL está acessível publicamente (ex: ngrok).');
    } finally {
      setIsWatching(false);
    }
  };

  // 4. Efeito para verificar o status inicial e tratar o callback
  useEffect(() => {
    checkIntegrationStatus();

    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('googleAuth');
    const authError = urlParams.get('message');

    if (authStatus === 'success') {
      setAuthMessage('Autenticação com Google Calendar concluída com sucesso!');
      // Limpa os parâmetros da URL para evitar re-execução
      urlParams.delete('googleAuth');
      urlParams.delete('message');
      window.history.replaceState({}, document.title, `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`);
    } else if (authStatus === 'error') {
      setAuthMessage(`Erro na autenticação: ${authError || 'Erro desconhecido.'}`);
      // Limpa os parâmetros da URL
      urlParams.delete('googleAuth');
      urlParams.delete('message');
      window.history.replaceState({}, document.title, `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`);
    }
  }, [user]);

  const renderStatus = () => {
    switch (status) {
      case 'loading':
        return <Loader size={20} className="animate-spin text-gray-500" />;
      case 'integrated':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'not_integrated':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h3 className="text-xl font-bold" style={{ marginBottom: '1rem' }}>
        <Calendar size={20} style={{ marginRight: '0.5rem' }} />
        Integração Google Calendar
      </h3>

      <div className="flex items-center" style={{ marginBottom: '1rem', gap: '0.5rem' }}>
        {renderStatus()}
        <p className="text-sm text-muted">{message}</p>
      </div>

      {authMessage && (
        <div className={`alert ${authMessage.includes('sucesso') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
          {authMessage}
        </div>
      )}

      {status === 'not_integrated' && (
        <button 
          className="btn btn-primary" 
          onClick={handleAuth}
          style={{ justifyContent: 'flex-start' }}
        >
          <Link size={18} />
          Conectar Google Calendar
        </button>
      )}

      {status === 'integrated' && (
        <>
          <button 
            className="btn btn-secondary" 
            onClick={handleWatch}
            disabled={isWatching}
            style={{ justifyContent: 'flex-start', marginBottom: '0.5rem' }}
          >
            {isWatching ? (
              <>
                <Loader size={18} className="animate-spin" />
                Iniciando Vigilância...
              </>
            ) : (
              <>
                <Calendar size={18} />
                Iniciar Sincronização Bidirecional (Webhook)
              </>
            )}
          </button>
          <p className="text-xs text-muted">
            * Necessário para receber atualizações do Google Calendar (exige que o backend esteja acessível publicamente, ex: ngrok).
          </p>
        </>
      )}
    </div>
  );
};

export default GoogleCalendarIntegration;
