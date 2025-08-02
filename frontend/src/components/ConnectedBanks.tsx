'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface BankConnection {
  id: string;
  institutionId: string;
  institutionName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  permissions: string[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ConnectedBanksProps {
  onSyncAccounts?: (connectionId: string) => void;
  onDisconnectBank?: (connectionId: string) => void;
}

export default function ConnectedBanks({ 
  onSyncAccounts, 
  onDisconnectBank 
}: ConnectedBanksProps) {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null);

  // Carregar conexões ativas
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/open-finance/connections', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setConnections(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar contas de uma conexão
  const syncAccounts = async (connectionId: string) => {
    if (syncingConnection) return;
    
    setSyncingConnection(connectionId);
    
    try {
      const response = await fetch(`/api/open-finance/connections/${connectionId}/sync-accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        onSyncAccounts?.(connectionId);
        
        // Atualizar última sincronização
        setConnections(prev => 
          prev.map(conn => 
            conn.id === connectionId 
              ? { ...conn, updatedAt: new Date().toISOString() }
              : conn
          )
        );
      } else {
        throw new Error(data.message || 'Erro na sincronização');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Erro ao sincronizar contas. Tente novamente.');
    } finally {
      setSyncingConnection(null);
    }
  };

  // Desconectar banco
  const disconnectBank = async (connectionId: string) => {
    if (!confirm('Tem certeza que deseja desconectar este banco?')) {
      return;
    }

    try {
      const response = await fetch(`/api/open-finance/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
        onDisconnectBank?.(connectionId);
      } else {
        throw new Error(data.message || 'Erro ao desconectar');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Erro ao desconectar banco. Tente novamente.');
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'ACTIVE':
          return { color: 'bg-green-100 text-green-800', label: 'Ativo' };
        case 'EXPIRED':
          return { color: 'bg-yellow-100 text-yellow-800', label: 'Expirado' };
        case 'REVOKED':
          return { color: 'bg-red-100 text-red-800', label: 'Revogado' };
        default:
          return { color: 'bg-gray-100 text-gray-800', label: status };
      }
    };

    const { color, label } = getStatusConfig(status);
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m6 0v-5a2 2 0 011-1.732V8a2 2 0 011-1.732V6" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum banco conectado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Conecte seu primeiro banco para começar a usar o FinanBot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Bancos Conectados ({connections.length})
      </h3>

      <div className="grid gap-4">
        {connections.map((connection) => (
          <div 
            key={connection.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              {/* Informações do banco */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m6 0v-5a2 2 0 011-1.732V8a2 2 0 011-1.732V6" />
                  </svg>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {connection.institutionName}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <StatusBadge status={connection.status} />
                    <span className="text-sm text-gray-500">
                      • Conectado em {formatDate(connection.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center space-x-2">
                {connection.status === 'ACTIVE' && (
                  <button
                    onClick={() => syncAccounts(connection.id)}
                    disabled={syncingConnection === connection.id}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {syncingConnection === connection.id ? (
                      <>
                        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sincronizar
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => disconnectBank(connection.id)}
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Desconectar
                </button>
              </div>
            </div>

            {/* Informações adicionais */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Última sincronização:</span>
                  <div className="font-medium text-gray-900">
                    {formatDate(connection.updatedAt)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Expira em:</span>
                  <div className="font-medium text-gray-900">
                    {formatDate(connection.expiresAt)}
                  </div>
                </div>
              </div>

              {/* Permissões */}
              <div className="mt-3">
                <span className="text-gray-500 text-sm">Permissões:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {connection.permissions.map((permission) => (
                    <span 
                      key={permission}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {permission.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}