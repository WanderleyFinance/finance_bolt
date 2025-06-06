import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, Edit, RefreshCcw, Cloud, HardDrive, Database,
  CheckCircle, AlertCircle, Clock, Archive, File, Download, 
  Upload, Server, Settings, Trash, Lock, Globe, Info, Eye, Key
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { StorageConfig, StorageProvider, SystemCredential, TenantCredential } from '../../../types';
import { useUI } from '../../../contexts/UIContext';

const StorageConfigDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addToast } = useUI();

  const [loading, setLoading] = useState(true);
  const [syncingStats, setSyncingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [provider, setProvider] = useState<StorageProvider | null>(null);
  const [credential, setCredential] = useState<SystemCredential | TenantCredential | null>(null);
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const [moduleStats, setModuleStats] = useState<{ moduleCode: string; moduleName: string; filesCount: number; totalSize: number }[]>([]);
  const [filesStats, setFilesStats] = useState<{ totalFiles: number; totalSize: number; usedPercentage: number; recentUploads: number; }>({
    totalFiles: 0,
    totalSize: 0,
    usedPercentage: 0,
    recentUploads: 0
  });

  useEffect(() => {
    if (id) {
      fetchStorageConfigData(id);
    } else {
      navigate('/admin/storage');
    }
  }, [id, navigate]);

  const fetchStorageConfigData = async (configId: string) => {
    try {
      setLoading(true);
      
      // Buscar dados da configuração de armazenamento
      const { data, error } = await supabase
        .from('storage_configs')
        .select('*')
        .eq('id', configId)
        .single();
      
      if (error) {
        console.error('StorageConfigDetail: Erro ao buscar configuração:', error);
        throw error;
      }
      
      if (!data) {
        console.error('StorageConfigDetail: Configuração não encontrada');
        throw new Error('Configuração não encontrada');
      }
      
      console.log('StorageConfigDetail: Dados encontrados:', data);
      
      // Gerar estatísticas simuladas para demo
      const filesCount = Math.floor(Math.random() * 10000);
      const totalSize = filesCount * Math.floor(Math.random() * 1024 * 1024); // tamanho médio de 1MB
      const spaceLimit = data.space_limit || 1024 * 1024 * 1024 * 10; // 10GB padrão se não estiver definido
      
      // Formatar dados
      const formattedConfig: StorageConfig = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        provider: data.provider,
        configType: data.config_type as 'system' | 'tenant',
        tenantId: data.tenant_id,
        credentialId: data.credential_id,
        settings: data.settings,
        isActive: data.is_active,
        isDefault: data.is_default,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
        updatedBy: data.updated_by,
        spaceUsed: data.space_used || totalSize,
        spaceLimit: data.space_limit || spaceLimit,
        lastSyncAt: data.last_sync_at || new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        stats: {
          filesCount,
          totalSize,
          lastUpload: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
          uploadCount: Math.floor(Math.random() * 100),
          downloadCount: Math.floor(Math.random() * 50),
          availableSpace: spaceLimit - totalSize,
          usedPercentage: (totalSize / spaceLimit) * 100
        }
      };
      
      setConfig(formattedConfig);
      
      // Buscar informações adicionais
      await Promise.all([
        fetchProvider(data.provider),
        fetchCredential(data.credential_id),
        data.tenant_id ? fetchTenant(data.tenant_id) : Promise.resolve(),
        generateModuleStats(data.id)
      ]);
      
      // Gerar estatísticas de arquivos
      setFilesStats({
        totalFiles: filesCount,
        totalSize,
        usedPercentage: (totalSize / spaceLimit) * 100,
        recentUploads: Math.floor(Math.random() * 50)
      });
    } catch (err) {
      console.error('StorageConfigDetail: Erro ao carregar dados:', err);
      setError('Não foi possível carregar os dados da configuração.');
      
      addToast({
        title: 'Erro',
        message: 'Falha ao carregar dados da configuração',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProvider = async (providerCode: string) => {
    try {
      const { data, error } = await supabase
        .from('storage_providers')
        .select('*')
        .eq('code', providerCode)
        .single();
      
      if (error) {
        console.error('StorageConfigDetail: Erro ao buscar provedor:', error);
        return;
      }
      
      if (data) {
        setProvider({
          code: data.code,
          name: data.name,
          description: data.description,
          icon: data.icon,
          credentialProviders: data.credential_providers,
          settingsSchema: data.settings_schema,
          features: data.features,
          helpUrl: data.help_url,
          isActive: data.is_active
        });
      }
    } catch (err) {
      console.error('StorageConfigDetail: Erro ao buscar provedor:', err);
    }
  };

  const fetchCredential = async (credentialId: string) => {
    try {
      // Tentar buscar como credencial do sistema
      const { data: systemData, error: systemError } = await supabase
        .from('system_credentials')
        .select('*')
        .eq('id', credentialId)
        .single();
      
      if (!systemError && systemData) {
        setCredential({
          id: systemData.id,
          name: systemData.name,
          description: systemData.description,
          provider: systemData.provider,
          authType: systemData.auth_type,
          credentials: systemData.credentials,
          isActive: systemData.is_active,
          createdAt: systemData.created_at,
          updatedAt: systemData.updated_at,
          expiresAt: systemData.expires_at,
          lastUsedAt: systemData.last_used_at,
          createdBy: systemData.created_by,
          updatedBy: systemData.updated_by,
          metadata: systemData.metadata
        });
        return;
      }
      
      // Se não encontrou como credencial do sistema, tentar como credencial do tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_credentials')
        .select('*')
        .eq('id', credentialId)
        .single();
      
      if (!tenantError && tenantData) {
        setCredential({
          id: tenantData.id,
          tenantId: tenantData.tenant_id,
          name: tenantData.name,
          description: tenantData.description,
          provider: tenantData.provider,
          authType: tenantData.auth_type,
          credentials: tenantData.credentials,
          isActive: tenantData.is_active,
          createdAt: tenantData.created_at,
          updatedAt: tenantData.updated_at,
          expiresAt: tenantData.expires_at,
          lastUsedAt: tenantData.last_used_at,
          createdBy: tenantData.created_by,
          updatedBy: tenantData.updated_by,
          metadata: tenantData.metadata,
          overrideSystem: tenantData.override_system,
          systemCredentialId: tenantData.system_credential_id
        });
      }
    } catch (err) {
      console.error('StorageConfigDetail: Erro ao buscar credencial:', err);
    }
  };

  const fetchTenant = async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, nome')
        .eq('id', tenantId)
        .single();
      
      if (error) {
        console.error('StorageConfigDetail: Erro ao buscar tenant:', error);
        return;
      }
      
      if (data) {
        setTenant({
          id: data.id,
          name: data.nome
        });
      }
    } catch (err) {
      console.error('StorageConfigDetail: Erro ao buscar tenant:', err);
    }
  };

  const generateModuleStats = async (configId: string) => {
    try {
      // Buscar mapeamentos de módulos para esta configuração
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('module_storage_mappings')
        .select('module_code')
        .eq('storage_config_id', configId);
      
      if (mappingsError) {
        console.error('StorageConfigDetail: Erro ao buscar mapeamentos:', mappingsError);
        return;
      }
      
      // Gerar estatísticas simuladas para cada módulo
      if (mappingsData && mappingsData.length > 0) {
        const moduleCodes = mappingsData.map(m => m.module_code);
        
        // Buscar informações dos módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('system_modules')
          .select('code, name')
          .in('code', moduleCodes);
        
        if (modulesError) {
          console.error('StorageConfigDetail: Erro ao buscar módulos:', modulesError);
          return;
        }
        
        if (modulesData && modulesData.length > 0) {
          // Criar estatísticas simuladas para cada módulo
          const stats = modulesData.map(module => {
            const filesCount = Math.floor(Math.random() * 2000);
            const totalSize = filesCount * Math.floor(Math.random() * 1024 * 512); // tamanho médio de 512KB
            
            return {
              moduleCode: module.code,
              moduleName: module.name,
              filesCount,
              totalSize
            };
          });
          
          setModuleStats(stats);
        }
      } else {
        // Se não há mapeamentos, gerar alguns módulos simulados
        const mockModules = [
          { code: 'documents', name: 'Documentos' },
          { code: 'images', name: 'Imagens' },
          { code: 'uploads', name: 'Uploads' }
        ];
        
        const stats = mockModules.map(module => {
          const filesCount = Math.floor(Math.random() * 2000);
          const totalSize = filesCount * Math.floor(Math.random() * 1024 * 512); // tamanho médio de 512KB
          
          return {
            moduleCode: module.code,
            moduleName: module.name,
            filesCount,
            totalSize
          };
        });
        
        setModuleStats(stats);
      }
    } catch (err) {
      console.error('StorageConfigDetail: Erro ao gerar estatísticas de módulos:', err);
    }
  };

  const handleSync = async () => {
    try {
      setSyncingStats(true);
      
      // Simulação - em uma aplicação real, isso seria uma chamada de API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Atualizar estatísticas simuladas
      if (config) {
        const filesCount = Math.floor(Math.random() * 10000);
        const totalSize = filesCount * Math.floor(Math.random() * 1024 * 1024); // tamanho médio de 1MB
        const spaceLimit = config.spaceLimit || 1024 * 1024 * 1024 * 10; // 10GB padrão
        
        const updatedConfig = {
          ...config,
          spaceUsed: totalSize,
          lastSyncAt: new Date().toISOString(),
          stats: {
            ...config.stats,
            filesCount,
            totalSize,
            lastUpload: new Date().toISOString(),
            availableSpace: spaceLimit - totalSize,
            usedPercentage: (totalSize / spaceLimit) * 100,
            uploadCount: config.stats?.uploadCount ? config.stats.uploadCount + Math.floor(Math.random() * 10) : Math.floor(Math.random() * 50),
            downloadCount: config.stats?.downloadCount ? config.stats.downloadCount + Math.floor(Math.random() * 5) : Math.floor(Math.random() * 30)
          }
        };
        
        setConfig(updatedConfig);
        
        // Atualizar estatísticas de arquivos
        setFilesStats({
          totalFiles: filesCount,
          totalSize,
          usedPercentage: (totalSize / spaceLimit) * 100,
          recentUploads: Math.floor(Math.random() * 50)
        });
        
        // Atualizar estatísticas de módulos
        setModuleStats(prev => 
          prev.map(stat => ({
            ...stat,
            filesCount: Math.floor(Math.random() * 2000),
            totalSize: Math.floor(Math.random() * 1024 * 1024 * 100) // tamanho aleatório até 100MB
          }))
        );
        
        // Também atualizaria no banco de dados em uma aplicação real
        
        addToast({
          title: 'Sincronização concluída',
          message: 'Estatísticas de armazenamento atualizadas com sucesso',
          type: 'success'
        });
      }
    } catch (err) {
      console.error('StorageConfigDetail: Erro ao sincronizar estatísticas:', err);
      
      addToast({
        title: 'Erro na sincronização',
        message: 'Não foi possível atualizar as estatísticas de armazenamento',
        type: 'error'
      });
    } finally {
      setSyncingStats(false);
    }
  };

  // Formatar tamanho em bytes para exibição
  const formatSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formatar data para exibição
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderizar ícone do provedor
  const renderProviderIcon = () => {
    if (!config) return <HardDrive size={24} />;
    
    switch (config.provider) {
      case 'aws_s3':
      case 's3':
        return <Cloud size={24} />;
      case 'google_cloud_storage':
      case 'google_drive':
        return <Cloud size={24} />;
      case 'azure_blob':
        return <Cloud size={24} />;
      case 'local_filesystem':
      case 'local':
        return <HardDrive size={24} />;
      case 'supabase_storage':
        return <Database size={24} />;
      default:
        // Para qualquer outro provedor, usamos o ícone de nuvem como padrão
        return <Cloud size={24} />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Carregando dados da configuração...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/storage')}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </button>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300">{error || 'Configuração não encontrada'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/admin/storage')}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSync}
            disabled={syncingStats}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {syncingStats ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-500 rounded-full border-t-transparent"></div>
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Sincronizar Estatísticas
              </>
            )}
          </button>
          
          <Link
            to={`/admin/storage/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Configuração
          </Link>
        </div>
      </div>

      {/* Header com informações principais */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 mb-6">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  !config.isActive
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : config.isDefault
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {renderProviderIcon()}
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {config.name}
                </h1>
                <div className="mt-1 flex items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {provider?.name || config.provider} • {config.configType === 'system' ? 'Sistema' : 'Tenant'}
                  </span>
                  
                  {config.isDefault && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
                      Padrão
                    </span>
                  )}
                  
                  {config.isActive ? (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      <CheckCircle size={12} className="mr-1" />
                      Ativo
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                      <AlertCircle size={12} className="mr-1" />
                      Inativo
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end">
                <Clock size={16} className="mr-1" />
                <span>Última sincronização: {formatDate(config.lastSyncAt)}</span>
              </div>
              
              {config.configType === 'tenant' && tenant && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-end">
                  <Database size={16} className="mr-1" />
                  <span>Tenant: {tenant.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {config.description && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {config.description}
            </p>
          </div>
        )}
        
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Provedor</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                {renderProviderIcon()}
                <span className="ml-1">{provider?.name || config.provider}</span>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Credencial</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                <Key size={16} className="mr-1 text-gray-400" />
                <span>{credential?.name || 'Desconhecida'}</span>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Uso de Espaço</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatSize(config.spaceUsed)} / {formatSize(config.spaceLimit)}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                  <div 
                    className={`h-2.5 rounded-full ${
                      (config.stats?.usedPercentage || 0) > 90
                        ? 'bg-red-600'
                        : (config.stats?.usedPercentage || 0) > 75
                        ? 'bg-yellow-600'
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(config.stats?.usedPercentage || 0, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {config.stats?.usedPercentage.toFixed(1)}% utilizado
                </p>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {config.configType === 'system' ? 'Sistema (Global)' : 'Tenant Específico'}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Criado em</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatDate(config.createdAt)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Atualizado em</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatDate(config.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Grid com informações detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna da esquerda - Estatísticas e uso */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estatísticas de uso */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Archive className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Estatísticas de Armazenamento
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1 flex items-center">
                    <File className="h-4 w-4 mr-1" />
                    Arquivos
                  </h3>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {filesStats.totalFiles.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
                  <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1 flex items-center">
                    <HardDrive className="h-4 w-4 mr-1" />
                    Tamanho Total
                  </h3>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    {formatSize(filesStats.totalSize)}
                  </p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800">
                  <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1 flex items-center">
                    <Upload className="h-4 w-4 mr-1" />
                    Uploads Recentes
                  </h3>
                  <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                    {filesStats.recentUploads}
                  </p>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                  <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1 flex items-center">
                    <Server className="h-4 w-4 mr-1" />
                    Uso do Espaço
                  </h3>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    {filesStats.usedPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              {/* Estatísticas por módulo */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                  Uso por Módulo
                </h3>
                
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6">
                          Módulo
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          Arquivos
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          Tamanho
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                      {moduleStats.map((stat) => (
                        <tr key={stat.moduleCode}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-6">
                            {stat.moduleName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {stat.filesCount.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {formatSize(stat.totalSize)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              type="button"
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver detalhes de {stat.moduleName}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          {/* Configurações do provedor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Settings className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Configurações do Provedor
              </h2>
            </div>
            
            <div className="p-6">
              {Object.entries(config.settings || {}).length > 0 ? (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  {Object.entries(config.settings).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{key}</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {typeof value === 'boolean' ? (
                          value ? 'Sim' : 'Não'
                        ) : typeof value === 'object' ? (
                          <pre className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 rounded p-2 overflow-auto">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          String(value)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Nenhuma configuração específica definida para este provedor.
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Coluna da direita - Informações adicionais */}
        <div className="space-y-6">
          {/* Credencial */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Key className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Credencial
              </h2>
            </div>
            
            <div className="p-6">
              {credential ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{credential.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Autenticação</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{credential.authType}</p>
                  </div>
                  
                  {'tenantId' in credential && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        Credencial de Tenant
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                    <div className="mt-1">
                      {credential.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                          <CheckCircle size={12} className="mr-1" />
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                          <AlertCircle size={12} className="mr-1" />
                          Inativa
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {credential.expiresAt && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Expira em</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(credential.expiresAt)}
                      </p>
                    </div>
                  )}
                  
                  {credential.lastUsedAt && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Último uso</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(credential.lastUsedAt)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Lock className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Credencial não encontrada ou inacessível
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Informações do provedor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Globe className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Provedor
              </h2>
            </div>
            
            <div className="p-6">
              {provider ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{provider.name}</p>
                  </div>
                  
                  {provider.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Descrição</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{provider.description}</p>
                    </div>
                  )}
                  
                  {provider.features && provider.features.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Recursos</h3>
                      <ul className="mt-2 grid grid-cols-1 gap-2">
                        {provider.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-center text-sm text-gray-600 dark:text-gray-300"
                          >
                            <CheckCircle size={16} className="text-green-500 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {provider.helpUrl && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Documentação</h3>
                      <div className="mt-1">
                        <a
                          href={provider.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Info size={16} className="mr-1" />
                          Ver documentação
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Globe className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Informações do provedor não disponíveis
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Ações */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Settings className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Ações
              </h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório
                </button>
                
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Permissões
                </button>
                
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md shadow-sm text-red-700 dark:text-red-200 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Remover Configuração
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageConfigDetail;