'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Definindo a interface para bancos
interface Bank {
  id: string;
  name: string;
  code: string;
  logo: string;
  color: string;
}

interface BankConnectionProps {
  onConnectionSuccess?: (data: any) => void;
  onConnectionError?: (error: string) => void;
}

export default function BankConnection({ 
  onConnectionSuccess, 
  onConnectionError 
}: BankConnectionProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [connectingBank, setConnectingBank] = useState<string | null>(null);

  // Carregar lista de bancos suportados
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/open-finance/banks');
        const data = await response.json();
        
        if (data.success) {
          setBanks(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch banks:', error);
        onConnectionError?.('Erro ao carregar lista de bancos');
      }
    };

    fetchBanks();
  }, [onConnectionError]);

  // Conectar banco usando Pluggy
  const connectBank = async (bankId: string) => {
    if (connectingBank) return; // Previne cliques múltiplos
    
    setConnectingBank(bankId);
    setSelectedBank(bankId);
    
    try {
      // 1. Iniciar conexão com Pluggy
      const response = await fetch('/api/open-finance/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assumindo JWT
        },
        body: JSON.stringify({ institutionId: bankId }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao conectar banco');
      }

      // 2. Abrir Pluggy Connect Widget
      const { authorizationUrl } = data.data;
      
      // Configurações da janela popup
      const popup = window.open(
        authorizationUrl,
        'pluggy-connect',
        'width=500,height=700,scrollbars=yes,resizable=yes,status=yes'
      );

      if (!popup) {
        throw new Error('Popup bloqueado. Permita popups para este site.');
      }

      // 3. Escutar mensagens do widget Pluggy
      const handleMessage = (event: MessageEvent) => {
        // Verificar origem (em produção, usar domínio correto)
        if (!event.origin.includes('pluggy.ai') && !event.origin.includes('localhost')) {
          return;
        }

        const { type, data: eventData } = event.data;

        switch (type) {
          case 'PLUGGY_CONNECT_SUCCESS':
            popup.close();
            window.removeEventListener('message', handleMessage);
            onConnectionSuccess?.(eventData);
            setConnectingBank(null);
            break;

          case 'PLUGGY_CONNECT_ERROR':
            popup.close();
            window.removeEventListener('message', handleMessage);
            onConnectionError?.(eventData.message || 'Erro na conexão');
            setConnectingBank(null);
            break;

          case 'PLUGGY_CONNECT_CLOSE':
            popup.close();
            window.removeEventListener('message', handleMessage);
            setConnectingBank(null);
            break;

          default:
            break;
        }
      };

      window.addEventListener('message', handleMessage);

      // 4. Verificar se popup foi fechado manualmente
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setConnectingBank(null);
        }
      }, 1000);

    } catch (error) {
      console.error('Bank connection error:', error);
      onConnectionError?.(error instanceof Error ? error.message : 'Erro desconhecido');
      setConnectingBank(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Conectar Banco
        </h2>
        <p className="text-gray-600">
          Escolha seu banco para conectar suas contas via Open Finance
        </p>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-blue-800 font-medium">
              Conexão 100% segura via Pluggy • Dados protegidos pelo Banco Central
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank) => (
            <button
              key={bank.id}
              onClick={() => connectBank(bank.id)}
              disabled={connectingBank !== null}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200 
                hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300
                ${selectedBank === bank.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
                ${connectingBank === bank.id ? 'opacity-75 cursor-not-allowed' : 'hover:border-gray-300'}
                ${connectingBank && connectingBank !== bank.id ? 'opacity-50' : ''}
              `}
              style={{ borderColor: selectedBank === bank.id ? bank.color : undefined }}
            >
              {/* Loading spinner para banco sendo conectado */}
              {connectingBank === bank.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              <div className="flex flex-col items-center text-center">
                {/* Logo do banco */}
                <div className="w-16 h-16 mb-4 flex items-center justify-center">
                  <Image
                    src={bank.logo}
                    alt={`Logo ${bank.name}`}
                    width={64}
                    height={64}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      // Fallback para logo genérico
                      (e.target as HTMLImageElement).src = '/images/bank-generic.png';
                    }}
                  />
                </div>

                {/* Nome do banco */}
                <h3 className="font-semibold text-gray-900 mb-2">
                  {bank.name}
                </h3>

                {/* Código do banco */}
                <span className="text-sm text-gray-500">
                  Código: {bank.code}
                </span>

                {/* Status de conexão */}
                {connectingBank === bank.id && (
                  <span className="text-xs text-blue-600 mt-2 font-medium">
                    Conectando...
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Instruções de uso */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Como funciona:</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
            Clique no seu banco para iniciar a conexão
          </li>
          <li className="flex items-start">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
            Faça login com suas credenciais no site oficial do banco
          </li>
          <li className="flex items-start">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
            Autorize o compartilhamento de dados via Open Finance
          </li>
          <li className="flex items-start">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
            Suas contas e transações serão sincronizadas automaticamente
          </li>
        </ol>
      </div>

      {/* Aviso de segurança */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium text-green-900 mb-1">100% Seguro</h4>
            <p className="text-sm text-green-700">
              Nunca solicitamos suas senhas. O login é feito diretamente no site do seu banco. 
              Utilizamos o padrão Open Finance regulamentado pelo Banco Central do Brasil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}