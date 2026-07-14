import { useMemo } from "react";
import Head from "next/head";
import { supabase } from '../supabaseClient';
import Layout from '../components/layout/Layout';
import { FaBookOpen, FaUsers, FaCheckCircle, FaSearch, FaInfoCircle, FaCog } from 'react-icons/fa';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from "react";
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';

interface Turma {
  id: number;
  nome: string;
  descricao: string;
  faixa_etaria: string;
  ativo: boolean;
}

const COLORS: Record<string, { bg: string; text: string; light: string }> = {
  "Sub-7":  { bg: "#8B5CF6", text: "#fff", light: "#F5F3FF" },
  "Sub-9":  { bg: "#3B82F6", text: "#fff", light: "#EFF6FF" },
  "Sub-11": { bg: "#10B981", text: "#fff", light: "#ECFDF5" },
  "Sub-13": { bg: "#F59E0B", text: "#fff", light: "#FFFBEB" },
  "Sub-15": { bg: "#EF4444", text: "#fff", light: "#FEF2F2" },
  "Sub-17": { bg: "#EC4899", text: "#fff", light: "#FDF2F8" },
  "Sub-20": { bg: "#0EA5E9", text: "#fff", light: "#F0F9FF" },
};
function getColor(nome: string) {
  return COLORS[nome] || { bg: "#FF4403", text: "#fff", light: "#FFF3EE" };
}

export default function TurmasPage() {
  const [search, setSearch] = useState("");

  // React Query — cache de 5 min (turmas raramente mudam)
  const { data: turmasRaw = [], isLoading: loadingTurmas } = useQuery({
    queryKey: ['turmas-page'],
    queryFn: async () => {
      const { data } = await supabase.from("Turmas").select("*").eq("ativo", true);
      return (data || []) as Turma[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Contagem de alunos por turma (cache de 2 min)
  const { data: alunosTurma = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['alunos-turma-count'],
    queryFn: async () => {
      const { data } = await supabase.from("Alunos").select("turma");
      return (data || []) as { turma: string }[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const loading = loadingTurmas || loadingAlunos;

  // Processamento em memória — sem re-fetch desnecessário
  const turmas = useMemo(() => {
    const contagem: Record<string, number> = {};
    alunosTurma.forEach(a => {
      if (a.turma) contagem[a.turma] = (contagem[a.turma] || 0) + 1;
    });
    return turmasRaw
      .map(t => ({ ...t, _total: contagem[t.nome] || 0 }))
      .sort((a, b) => {
        const numA = parseInt(a.nome.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.nome.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });
  }, [turmasRaw, alunosTurma]);

  const filtered = useMemo(() =>
    turmas.filter(t =>
      !search ||
      t.nome.toLowerCase().includes(search.toLowerCase()) ||
      t.faixa_etaria?.toLowerCase().includes(search.toLowerCase())
    ),
    [turmas, search]
  );

  const totalAlunos = turmas.reduce((s, t) => s + (t._total || 0), 0);

  return (
    <>
      <Head><title>Turmas — Zoe</title></Head>
      <Layout>
        <div className="nt-animate">

          {/* Header */}
          <div className="nt-page-header">
            <div>
              <h1 className="nt-page-title">Categorias Sub</h1>
              <p className="nt-page-subtitle">Visão geral das categorias ativas e alunos matriculados</p>
            </div>
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, border: '1px solid var(--nt-border)', background: 'var(--nt-bg)', color: 'var(--nt-text-secondary)', fontSize: '0.83rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }}>
              <FaCog style={{ fontSize: '0.75rem' }} /> Gerenciar no Admin
            </Link>
          </div>

          {/* Info banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 20, fontSize: '0.8rem', color: '#1D4ED8' }}>
            <FaInfoCircle style={{ flexShrink: 0 }} />
            Esta página é somente leitura. Para criar, editar ou desativar categorias, use a <Link href="/admin" style={{ fontWeight: 700, color: '#1D4ED8' }}>Área Administrativa</Link>.
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { icon: <FaBookOpen />, label: 'Categorias Ativas', value: turmas.length, color: '#3B82F6', bg: '#EFF6FF' },
              { icon: <FaUsers />, label: 'Total de Alunos', value: totalAlunos, color: '#10B981', bg: '#ECFDF5' },
              { icon: <FaCheckCircle />, label: 'Média por Categoria', value: turmas.length ? Math.round(totalAlunos / turmas.length) : 0, color: '#F59E0B', bg: '#FFFBEB' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--nt-surface)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--nt-border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--nt-text-primary)', lineHeight: 1 }}>{loading ? '—' : s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--nt-text-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Busca */}
          <div style={{ position: 'relative', maxWidth: 280, marginBottom: 20 }}>
            <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--nt-text-muted)', fontSize: '0.8rem' }} />
            <input type="text" placeholder="Buscar categoria..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="nt-input" style={{ paddingLeft: 34, height: 36, fontSize: '0.83rem', width: '100%' }} />
          </div>

          {/* Cards */}
          {loading ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <div className="nt-spinner" style={{ margin: '0 auto', width: 28, height: 28, borderWidth: 3 }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {filtered.map(t => {
                const color = getColor(t.nome);
                const pct = totalAlunos > 0 ? Math.round(((t._total || 0) / totalAlunos) * 100) : 0;
                return (
                  <div key={t.id} style={{ background: 'var(--nt-surface)', borderRadius: 14, border: '1px solid var(--nt-border)', overflow: 'hidden' }}>
                    <div style={{ height: 5, background: color.bg }} />
                    <div style={{ padding: '18px 18px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: color.bg, color: color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0, boxShadow: `0 4px 14px ${color.bg}40` }}>
                          {t.nome.replace('Sub-', 'S')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--nt-text-primary)' }}>{t.nome}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--nt-text-muted)', marginTop: 2 }}>{t.faixa_etaria}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--nt-text-secondary)', lineHeight: 1.55, margin: '0 0 14px' }}>{t.descricao}</p>
                      <div style={{ background: 'var(--nt-bg)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--nt-text-muted)', fontWeight: 600 }}>ALUNOS MATRICULADOS</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--nt-text-primary)' }}>{t._total}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--nt-border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color.bg, borderRadius: 3, transition: 'width 0.6s ease', minWidth: t._total ? 4 : 0 }} />
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--nt-text-muted)', marginTop: 4 }}>{pct}% do total de alunos</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);
  if (!session) return { redirect: { destination: '/signIn', permanent: false } };
  return { props: {} };
};
