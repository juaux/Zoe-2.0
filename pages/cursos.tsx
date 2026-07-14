"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Layout from '../components/layout/Layout';
import { FaToggleOn, FaToggleOff, FaPlus, FaEye, FaEyeSlash, FaSearch } from 'react-icons/fa';
import { Delete, Edit, Visibility } from '@mui/icons-material';
import { Avatar, IconButton } from '@mui/material';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wvcsllnqceqjkfpfyyzu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Y3NsbG5xY2VxamtmcGZ5eXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5NDQ0NzcsImV4cCI6MjA1NjUyMDQ3N30.T3i4AhoPofS7lww_-wMzcPLbbok1h8j45yeY0oJ6v-g';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Curso {
  id: number;
  curso: string;
  descricao: string;
  periodo: string;
  ativo: boolean;
  imagem?: string;
}

// Extrai mensagem de erro de qualquer tipo de objeto
const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Erro desconhecido';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error_description === 'string') return e.error_description;
    if (typeof e.details === 'string') return e.details;
    return JSON.stringify(error);
  }
  return String(error);
};

// Tenta fazer upload da imagem — se o bucket não existir, retorna null sem quebrar
const uploadImagem = async (file: File, cursoId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${cursoId}.${fileExt}`;
    const filePath = `cursos/${fileName}`;

    const { error } = await supabase.storage.from('cursos-imagens').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      console.warn('Upload de imagem falhou (bucket pode não existir):', error.message);
      return null; // Não quebra o fluxo — curso é salvo sem imagem
    }

    const { data } = supabase.storage.from('cursos-imagens').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.warn('Erro inesperado no upload:', err);
    return null;
  }
};

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cursoNome, setCursoNome] = useState("");
  const [cursoDescricao, setCursoDescricao] = useState("");
  const [cursoPeriodo, setCursoPeriodo] = useState("");
  const [cursoImagem, setCursoImagem] = useState<File | null>(null);
  const [cursoEditando, setCursoEditando] = useState<Curso | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [mensagemTipo, setMensagemTipo] = useState<'success' | 'error'>('success');
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("curso");
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);

  const notify = (msg: string, tipo: 'success' | 'error' = 'success') => {
    setMensagem(msg);
    setMensagemTipo(tipo);
    setTimeout(() => setMensagem(''), 4000);
  };

  // Buscar cursos
  useEffect(() => {
    async function fetchCursos() {
      const { data, error } = await supabase.from("Cursos").select("*").order('curso');
      if (error) {
        notify(`Erro ao carregar cursos: ${getErrorMessage(error)}`, 'error');
      } else {
        setCursos(data || []);
      }
    }
    fetchCursos();
  }, []);

  // Limpar modal
  const resetModal = () => {
    setCursoNome("");
    setCursoDescricao("");
    setCursoPeriodo("");
    setCursoImagem(null);
  };

  // Adicionar curso
  async function adicionarCurso() {
    if (!cursoNome.trim() || !cursoDescricao.trim() || !cursoPeriodo.trim()) {
      notify("Por favor, preencha todos os campos obrigatórios.", 'error');
      return;
    }

    const cursoExistente = cursos.find(c => c.curso.toLowerCase().trim() === cursoNome.toLowerCase().trim());
    if (cursoExistente) {
      notify(`Já existe um curso com o nome "${cursoNome}".`, 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Inserir o curso SEM imagem primeiro
      const { data, error } = await supabase
        .from("Cursos")
        .insert([{ curso: cursoNome, descricao: cursoDescricao, periodo: cursoPeriodo, ativo: true }])
        .select();

      if (error) {
        notify(`Erro ao salvar curso: ${getErrorMessage(error)}`, 'error');
        return;
      }

      const novoCurso: Curso = data[0];

      // 2. Tentar upload da imagem (opcional, não bloqueia)
      if (cursoImagem && novoCurso.id) {
        const imagemUrl = await uploadImagem(cursoImagem, novoCurso.id.toString());
        if (imagemUrl) {
          await supabase.from("Cursos").update({ imagem: imagemUrl }).eq("id", novoCurso.id);
          novoCurso.imagem = imagemUrl;
        }
      }

      setCursos(prev => [...prev, novoCurso].sort((a, b) => a.curso.localeCompare(b.curso)));
      resetModal();
      setIsModalOpen(false);
      notify(`Curso "${cursoNome}" adicionado com sucesso!`);
    } catch (error) {
      notify(`Erro inesperado: ${getErrorMessage(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Abrir modal de edição
  function abrirModalEditar(curso: Curso) {
    setCursoEditando(curso);
    setCursoNome(curso.curso);
    setCursoDescricao(curso.descricao);
    setCursoPeriodo(curso.periodo);
    setCursoImagem(null);
    setIsEditModalOpen(true);
  }

  // Editar curso
  async function editarCurso() {
    if (!cursoEditando || !cursoNome.trim() || !cursoDescricao.trim() || !cursoPeriodo.trim()) {
      notify("Por favor, preencha todos os campos obrigatórios.", 'error');
      return;
    }

    const cursoExistente = cursos.find(
      c => c.id !== cursoEditando.id && c.curso.toLowerCase().trim() === cursoNome.toLowerCase().trim()
    );
    if (cursoExistente) {
      notify(`Já existe outro curso com o nome "${cursoNome}".`, 'error');
      return;
    }

    setLoading(true);
    try {
      const dadosAtualizados: Partial<Curso> = { curso: cursoNome, descricao: cursoDescricao, periodo: cursoPeriodo };

      if (cursoImagem) {
        const imagemUrl = await uploadImagem(cursoImagem, cursoEditando.id.toString());
        if (imagemUrl) dadosAtualizados.imagem = imagemUrl;
      }

      const { error } = await supabase.from("Cursos").update(dadosAtualizados).eq("id", cursoEditando.id);
      if (error) {
        notify(`Erro ao editar: ${getErrorMessage(error)}`, 'error');
        return;
      }

      setCursos(prev => prev.map(c => c.id === cursoEditando.id ? { ...c, ...dadosAtualizados } : c));
      resetModal();
      setIsEditModalOpen(false);
      notify(`Curso "${cursoNome}" editado com sucesso!`);
    } catch (error) {
      notify(`Erro inesperado: ${getErrorMessage(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Ativar/Desativar
  async function toggleAtivo(curso: Curso) {
    const { error } = await supabase.from("Cursos").update({ ativo: !curso.ativo }).eq("id", curso.id);
    if (error) {
      notify(`Erro ao alterar status: ${getErrorMessage(error)}`, 'error');
    } else {
      setCursos(prev => prev.map(c => c.id === curso.id ? { ...c, ativo: !c.ativo } : c));
      notify(`Curso "${curso.curso}" ${!curso.ativo ? "ativado" : "desativado"} com sucesso!`);
    }
  }

  // Excluir
  async function excluirCurso(id: number) {
    if (!confirm("Tem certeza que deseja excluir este curso?")) return;
    const { error } = await supabase.from("Cursos").delete().eq("id", id);
    if (error) {
      notify(`Erro ao excluir: ${getErrorMessage(error)}`, 'error');
    } else {
      setCursos(prev => prev.filter(c => c.id !== id));
      notify("Curso excluído com sucesso!");
    }
  }

  const cursosFiltrados = cursos
    .filter(c => c.ativo || showInactive)
    .filter(c => searchTerm === "" || String(c[searchField as keyof Curso] || "").toLowerCase().includes(searchTerm.toLowerCase()));

  // Inline styles
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', marginBottom: '10px',
    fontFamily: 'inherit', color: '#374151',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '9px 20px', background: '#3b82f6', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: 600,
  };

  const btnSecondary: React.CSSProperties = {
    padding: '9px 20px', background: '#f3f4f6', color: '#374151',
    border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: 500,
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1100px' }}>

        {/* Page title */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#111827' }}>Lista de Cursos</h2>
          <button style={btnPrimary} onClick={() => { resetModal(); setIsModalOpen(true); }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaPlus size={12} /> Adicionar Curso
            </span>
          </button>
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <select
            style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: '#fff', color: '#374151' }}
            value={searchField}
            onChange={e => setSearchField(e.target.value)}
          >
            <option value="curso">Curso</option>
            <option value="descricao">Descrição</option>
            <option value="periodo">Período</option>
          </select>
          <input
            type="text"
            placeholder="Digite para pesquisar..."
            style={{ ...inputStyle, margin: 0, flex: 1, minWidth: '200px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button
            style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? <FaEye size={13} /> : <FaEyeSlash size={13} />}
            {showInactive ? "Mostrar Todos" : "Só Ativos"}
          </button>
        </div>

        {/* Feedback */}
        {mensagem && (
          <div style={{
            padding: '12px 16px', marginBottom: '16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
            background: mensagemTipo === 'error' ? '#fef2f2' : '#f0fdf4',
            color: mensagemTipo === 'error' ? '#dc2626' : '#16a34a',
            border: `1px solid ${mensagemTipo === 'error' ? '#fecaca' : '#bbf7d0'}`,
          }}>
            {mensagem}
          </div>
        )}

        {/* Table */}
        {cursosFiltrados.length === 0 ? (
          <div style={{ padding: '20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', color: '#92400e', fontSize: '14px' }}>
            Nenhum curso {showInactive ? "" : "ativo"} encontrado.
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1px solid #f0f2f5' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  {['Imagem', 'Curso', 'Descrição', 'Período', 'Status', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cursosFiltrados.map((curso, i) => (
                  <tr key={curso.id} style={{ borderBottom: i < cursosFiltrados.length - 1 ? '1px solid #f3f4f6' : 'none', background: !curso.ativo ? '#f9fafb' : '#fff' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Avatar src={curso.imagem} sx={{ width: 36, height: 36, bgcolor: '#e0e7ff', color: '#4f46e5', fontSize: '14px', fontWeight: 700 }}>
                        {curso.curso[0]}
                      </Avatar>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827', fontSize: '14px' }}>{curso.curso}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{curso.descricao}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{curso.periodo}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: curso.ativo ? '#f0fdf4' : '#f3f4f6',
                        color: curso.ativo ? '#16a34a' : '#9ca3af',
                      }}>
                        {curso.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconButton size="small" onClick={() => abrirModalEditar(curso)} title="Editar" sx={{ color: '#3b82f6' }}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => excluirCurso(curso.id)} title="Excluir" sx={{ color: '#ef4444' }}>
                          <Delete fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => toggleAtivo(curso)} title={curso.ativo ? 'Desativar' : 'Ativar'} sx={{ color: curso.ativo ? '#f59e0b' : '#22c55e' }}>
                          {curso.ativo ? <FaToggleOn size={18} /> : <FaToggleOff size={18} />}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL ADICIONAR */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(2px)' }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '28px 28px 24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: '#111827' }}>Adicionar Curso</h3>
              <input style={inputStyle} type="text" placeholder="Nome do curso *" value={cursoNome} onChange={e => setCursoNome(e.target.value)} />
              <input style={inputStyle} type="text" placeholder="Descrição do curso *" value={cursoDescricao} onChange={e => setCursoDescricao(e.target.value)} />
              <input style={inputStyle} type="text" placeholder="Período do curso *" value={cursoPeriodo} onChange={e => setCursoPeriodo(e.target.value)} />
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Imagem do curso (opcional)</label>
                <input type="file" accept="image/*" onChange={e => setCursoImagem(e.target.files?.[0] || null)}
                  style={{ width: '100%', fontSize: '13px', color: '#374151' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button style={btnSecondary} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={adicionarCurso} disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDITAR */}
        {isEditModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(2px)' }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '28px 28px 24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: '#111827' }}>Editar Curso</h3>
              <input style={inputStyle} type="text" placeholder="Nome do curso *" value={cursoNome} onChange={e => setCursoNome(e.target.value)} />
              <input style={inputStyle} type="text" placeholder="Descrição do curso *" value={cursoDescricao} onChange={e => setCursoDescricao(e.target.value)} />
              <input style={inputStyle} type="text" placeholder="Período do curso *" value={cursoPeriodo} onChange={e => setCursoPeriodo(e.target.value)} />
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Nova imagem (opcional)</label>
                <input type="file" accept="image/*" onChange={e => setCursoImagem(e.target.files?.[0] || null)}
                  style={{ width: '100%', fontSize: '13px', color: '#374151' }} />
                {cursoEditando?.imagem && (
                  <img src={cursoEditando.imagem} alt="Imagem atual" style={{ marginTop: '8px', width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button style={btnSecondary} onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                <button style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={editarCurso} disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
