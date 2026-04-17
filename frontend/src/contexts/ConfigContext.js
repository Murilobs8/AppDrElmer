import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const ConfigContext = createContext({
  config: { nome_fazenda: 'Filadélfia', subtitulo: 'Gestão Rural' },
  loading: true,
  salvarConfig: async () => {},
  recarregar: () => {},
});

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({ nome_fazenda: 'Filadélfia', subtitulo: 'Gestão Rural' });
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const res = await api.get('/configuracoes');
      setConfig(res.data);
    } catch (e) {
      // Mantém defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Atualiza título da aba do navegador
  useEffect(() => {
    if (config.nome_fazenda) {
      document.title = `${config.nome_fazenda} — ${config.subtitulo || 'Gestão Rural'}`;
    }
  }, [config.nome_fazenda, config.subtitulo]);

  const salvarConfig = async (novo) => {
    const res = await api.put('/configuracoes', novo);
    setConfig(res.data);
    return res.data;
  };

  return (
    <ConfigContext.Provider value={{ config, loading, salvarConfig, recarregar: carregar }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
