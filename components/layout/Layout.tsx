import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  FaHome, FaUserAlt, FaChalkboardTeacher, FaBookOpen,
  FaBars, FaTimes, FaChevronDown, FaSignOutAlt, FaBell,
  FaMoon, FaSun, FaChevronRight, FaClipboardList, FaCog,
  FaChartBar, FaExclamationTriangle, FaUserShield, FaCheck, FaCheckDouble,
} from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

type NavItem = {
  label: string;
  href?: string;
  icon: React.ReactNode;
  badge?: string;
  children?: { label: string; href: string }[];
};

const NAV_SECTIONS = [
  {
    category: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/', icon: <FaHome /> },
    ] as NavItem[],
  },
  {
    category: 'GESTÃO',
    items: [
      {
        label: 'Alunos', icon: <FaUserAlt />, children: [
          { label: 'Cadastrar Aluno', href: '/alunos' },
          { label: 'Lista de Alunos', href: '/lista-alunos' },
          { label: 'Alertas de Frequência', href: '/relatorios?tab=alertas' },
        ]
      },
      {
        label: 'Professores', icon: <FaChalkboardTeacher />, children: [
          { label: 'Cadastrar Professor', href: '/professores' },
          { label: 'Lista de Professores', href: '/lista-professores' },
        ]
      },
      { label: 'Cursos', href: '/cursos', icon: <FaBookOpen /> },
    ] as NavItem[],
  },
  {
    category: 'FREQUÊNCIA',
    items: [
      { label: 'Chamada', href: '/chamada', icon: <FaClipboardList /> },
      { label: 'Relatórios', href: '/relatorios', icon: <FaChartBar /> },
    ] as NavItem[],
  },
  {
    category: 'SISTEMA',
    items: [
      { label: 'Usuários e Logins', href: '/usuarios', icon: <FaUserShield /> },
      { label: 'Administração', href: '/admin', icon: <FaCog /> },
    ] as NavItem[],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/alunos': 'Alunos',
  '/lista-alunos': 'Lista de Alunos',
  '/professores': 'Professores',
  '/lista-professores': 'Lista de Professores',
  '/cursos': 'Cursos',
  '/professor': 'Portal do Professor',
  '/chamada': 'Chamada',
  '/relatorios': 'Relatórios',
  '/usuarios': 'Usuários e Logins',
  '/admin': 'Administração',
};

// Bottom nav items para mobile (os mais usados)
const BOTTOM_NAV = [
  { label: 'Home', href: '/', icon: <FaHome /> },
  { label: 'Alunos', href: '/alunos', icon: <FaUserAlt /> },
  { label: 'Chamada', href: '/chamada', icon: <FaClipboardList /> },
  { label: 'Relatórios', href: '/relatorios', icon: <FaChartBar /> },
  { label: 'Menu', href: null, icon: <FaBars /> },
];

function NotificationBell({ size = 'desktop' }: { size?: 'desktop' | 'mobile' }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('id, tipo, titulo, mensagem, lida, enviada_em')
        .order('enviada_em', { ascending: false })
        .limit(20);
      return data || [];
    },
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  });

  const naoLidas = notificacoes.filter((n: any) => !n.lida);

  const marcarLida = async (id: number) => {
    await supabase.from('notificacoes').update({ lida: true, lida_em: new Date().toISOString() }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
  };

  const marcarTodasLidas = async () => {
    const ids = naoLidas.map((n: any) => n.id);
    if (ids.length === 0) return;
    await supabase.from('notificacoes').update({ lida: true, lida_em: new Date().toISOString() }).in('id', ids);
    queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
  };

  const btnSize = size === 'mobile' ? 36 : 34;
  const fontSize = size === 'mobile' ? 15 : 14;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: btnSize, height: btnSize, borderRadius: 8, border: '1px solid var(--nt-border)', background: 'var(--nt-bg)', color: 'var(--nt-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', fontSize }}
      >
        <FaBell />
        {naoLidas.length > 0 && (
          <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: 'var(--nt-primary)', borderRadius: '50%', border: '1.5px solid var(--nt-surface)' }} />
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{
            position: 'absolute', top: btnSize + 8, right: 0, width: 320, maxHeight: 420,
            background: 'var(--nt-surface)', border: '1px solid var(--nt-border)', borderRadius: 12,
            boxShadow: '0 12px 32px rgba(20,20,43,.18)', zIndex: 61, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--nt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--nt-text-primary)' }}>Notificações</span>
              {naoLidas.length > 0 && (
                <button onClick={marcarTodasLidas} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--nt-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <FaCheckDouble style={{ fontSize: 10 }} /> Marcar todas
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto' }}>
              {notificacoes.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--nt-text-muted)' }}>Nenhuma notificação.</div>
              ) : notificacoes.map((n: any) => (
                <div key={n.id} style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--nt-border)', background: n.lida ? 'transparent' : 'rgba(22,163,74,.04)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: n.lida ? 500 : 700, color: 'var(--nt-text-primary)' }}>{n.titulo}</div>
                    {n.mensagem && <div style={{ fontSize: 11.5, color: 'var(--nt-text-secondary)', marginTop: 2 }}>{n.mensagem}</div>}
                    <div style={{ fontSize: 10.5, color: 'var(--nt-text-muted)', marginTop: 4 }}>{new Date(n.enviada_em).toLocaleString('pt-BR')}</div>
                  </div>
                  {!n.lida && (
                    <button onClick={() => marcarLida(n.id)} title="Marcar como lida" style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'var(--nt-bg)', color: 'var(--nt-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>
                      <FaCheck />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function NavLink({ item, collapsed, onClose }: { item: NavItem; collapsed: boolean; onClose: () => void }) {
  const router = useRouter();
  const isActive = item.href
    ? router.pathname === item.href
    : item.children?.some(c => router.pathname === c.href);
  const [open, setOpen] = useState(Boolean(isActive && item.children));

  useEffect(() => {
    if (item.children?.some(c => router.pathname === c.href)) setOpen(true);
  }, [router.pathname]);

  if (item.href) {
    return (
      <Link href={item.href} onClick={onClose} title={collapsed ? item.label : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
          padding: collapsed ? '10px 0' : '9px 14px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 8, fontSize: 13, fontWeight: 500,
          color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
          background: isActive ? 'rgba(0,0,0,0.25)' : 'transparent',
          transition: 'all 0.15s', margin: '1px 0',
          textDecoration: 'none', width: '100%',
          borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.15)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 14, flexShrink: 0, width: collapsed ? 20 : 18, textAlign: 'center' }}>{item.icon}</span>
        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
        {!collapsed && item.badge && (
          <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 100 }}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen(o => !o)} title={collapsed ? item.label : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
          padding: collapsed ? '10px 0' : '9px 14px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 8, fontSize: 13, fontWeight: 500,
          color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
          background: isActive ? 'rgba(0,0,0,0.2)' : 'transparent',
          transition: 'all 0.15s', margin: '1px 0', width: '100%', cursor: 'pointer',
          borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
          border: 'none',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.12)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(0,0,0,0.2)' : 'transparent'; }}
      >
        <span style={{ fontSize: 14, flexShrink: 0, width: collapsed ? 20 : 18, textAlign: 'center' }}>{item.icon}</span>
        {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
        {!collapsed && (
          <FaChevronDown style={{
            fontSize: 9, transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'rgba(255,255,255,0.5)',
          }} />
        )}
      </button>
      {open && !collapsed && (
        <div style={{ paddingLeft: 16, marginTop: 2 }}>
          {item.children?.map(child => {
            const childActive = router.pathname === child.href;
            return (
              <Link key={child.href} href={child.href} onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 14px', borderRadius: 6, fontSize: 13,
                  color: childActive ? '#fff' : 'rgba(255,255,255,0.65)',
                  background: childActive ? 'rgba(0,0,0,0.2)' : 'transparent',
                  transition: 'all 0.15s', marginBottom: 1,
                  textDecoration: 'none', fontWeight: childActive ? 600 : 400,
                }}
                onMouseEnter={e => { if (!childActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { if (!childActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <FaChevronRight style={{ fontSize: 8, opacity: 0.5 }} />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SIDEBAR_W = 240;
const SIDEBAR_COLLAPSED_W = 72;

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const userCollapsedRef = React.useRef(false);
  const { data: session } = useSession();
  const router = useRouter();

  const pageTitle = PAGE_TITLES[router.pathname] ?? 'Zoe';
  const userName = session?.user?.name || session?.user?.email || 'Admin';
  const userInitials = getInitials(userName);
  const sidebarW = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  // Detecta mobile / tablet
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const tablet = w >= 768 && w < 1024;
      setIsMobile(w < 768);
      setIsTablet(tablet);
      // No tablet, a sidebar começa recolhida (rail de ícones) pra não
      // espremer o conteúdo. Se o usuário expandir manualmente, respeita.
      if (tablet && !userCollapsedRef.current) {
        setCollapsed(true);
      }
      if (!tablet && w >= 1024) {
        setCollapsed(false);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggleCollapsed = useCallback(() => {
    userCollapsedRef.current = true;
    setCollapsed(c => !c);
  }, []);

  // Fecha sidebar ao navegar no mobile
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [router.pathname]);

  // Bloqueia scroll do body quando drawer aberto
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen, isMobile]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const closeMobile = useCallback(() => setMobileSidebarOpen(false), []);

  // ── SIDEBAR (shared entre desktop e mobile drawer) ──────────────────────
  const SidebarContent = (
    <aside style={{
      width: isMobile ? 280 : sidebarW,
      minWidth: isMobile ? 280 : sidebarW,
      height: '100%',
      background: 'linear-gradient(180deg, #16A34A 0%, #15803D 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Topo / Logo */}
      <div style={{
        padding: collapsed && !isMobile ? '24px 10px 20px' : '24px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Botão fechar (mobile) ou colapsar (desktop) */}
        <button
          onClick={isMobile ? closeMobile : toggleCollapsed}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', width: 28, height: 28, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 12, transition: 'background 0.15s',
          }}
          title={isMobile ? 'Fechar menu' : collapsed ? 'Expandir' : 'Recolher'}
        >
          {isMobile ? <FaTimes /> : collapsed ? <FaChevronRight /> : <FaTimes style={{ fontSize: 10 }} />}
        </button>

        {/* Logo */}
        <div style={{
          width: (collapsed && !isMobile) ? 50 : 100,
          height: (collapsed && !isMobile) ? 50 : 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: (collapsed && !isMobile) ? 0 : 10,
          flexShrink: 0,
          transition: 'all 0.25s',
        }}>
          <Image
            src="/logo.png"
            width={(collapsed && !isMobile) ? 46 : 96}
            height={(collapsed && !isMobile) ? 46 : 96}
            alt="Logo Zoe"
            style={{ objectFit: 'contain', width: '150%', height: '150%' }}
          />
        </div>

        {/* Nome */}
        {(!(collapsed && !isMobile)) && (
          <div style={{ textAlign: 'center', marginTop: 2 }}>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Zoe
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Gestão Escolar
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.category}>
            {(!(collapsed && !isMobile)) && (
              <div style={{
                padding: '14px 14px 4px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
              }}>
                {section.category}
              </div>
            )}
            {(collapsed && !isMobile) && <div style={{ height: 12 }} />}
            {section.items.map(item => (
              <NavLink key={item.label} item={item} collapsed={collapsed && !isMobile} onClose={closeMobile} />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer — user info (só mobile) + sair */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
        {isMobile && (
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {userInitials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{userName.split('@')[0].split(' ')[0]}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Admin</div>
            </div>
          </div>
        )}
        <div style={{ padding: '10px' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/signIn' })}
            style={{
              display: 'flex', alignItems: 'center', gap: (collapsed && !isMobile) ? 0 : 10,
              padding: (collapsed && !isMobile) ? '10px 0' : '9px 14px',
              justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              color: 'rgba(255,255,255,0.75)', background: 'transparent',
              transition: 'all 0.15s', width: '100%', cursor: 'pointer', border: 'none',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <FaSignOutAlt style={{ fontSize: 14, flexShrink: 0 }} />
            {(!(collapsed && !isMobile)) && <span>Sair do Sistema</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  // ── MOBILE LAYOUT ───────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--nt-bg)' }}>

        {/* Drawer overlay */}
        {mobileSidebarOpen && (
          <div
            onClick={closeMobile}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(3px)' }}
          />
        )}

        {/* Drawer sidebar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 100,
          transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: mobileSidebarOpen ? '4px 0 32px rgba(0,0,0,0.3)' : 'none',
        }}>
          {SidebarContent}
        </div>

        {/* Mobile topbar */}
        <header style={{
          height: 56, background: 'var(--nt-surface)',
          borderBottom: '1px solid var(--nt-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(22,29,60,0.06)', zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--nt-border)', background: 'var(--nt-bg)', color: 'var(--nt-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}
            >
              <FaBars />
            </button>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Poppins, sans-serif', color: 'var(--nt-text-primary)' }}>
              {pageTitle}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setDarkMode(d => !d)}
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--nt-border)', background: 'var(--nt-bg)', color: 'var(--nt-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <NotificationBell size="mobile" />
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--nt-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {userInitials}
            </div>
          </div>
        </header>

        {/* Content — com padding bottom para bottom nav */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 12px 80px', background: 'var(--nt-bg)' }}>
          {children}
        </main>

        {/* Bottom navigation bar */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 64, background: 'var(--nt-surface)',
          borderTop: '1px solid var(--nt-border)',
          display: 'flex', alignItems: 'center',
          boxShadow: '0 -4px 16px rgba(22,29,60,0.08)',
          zIndex: 40,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {BOTTOM_NAV.map((item, i) => {
            const isActive = item.href ? router.pathname === item.href : false;
            const isMenuBtn = item.label === 'Menu';
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {isMenuBtn ? (
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                      color: 'var(--nt-text-muted)',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
                  </button>
                ) : (
                  <Link href={item.href!} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    textDecoration: 'none', padding: '4px 0',
                    color: isActive ? 'var(--nt-primary)' : 'var(--nt-text-muted)',
                  }}>
                    <span style={{ fontSize: 18, color: isActive ? 'var(--nt-primary)' : 'var(--nt-text-muted)' }}>{item.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                    {isActive && (
                      <span style={{ position: 'absolute', top: 0, width: 32, height: 2, background: 'var(--nt-primary)', borderRadius: '0 0 4px 4px' }} />
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ──────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--nt-bg)' }}>

      {/* Sidebar */}
      <div style={{
        width: sidebarW, minWidth: sidebarW, height: '100vh',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0, zIndex: 50,
        boxShadow: isTablet && !collapsed ? 'none' : '2px 0 20px rgba(22,163,74,0.2)',
        // No tablet expandido, a sidebar flutua por cima do conteúdo
        // (não empurra o layout), evitando espremer a tela.
        position: isTablet && !collapsed ? 'fixed' : 'relative',
        top: 0, left: 0,
      }}>
        {SidebarContent}
      </div>

      {/* Backdrop pra fechar a sidebar flutuante no tablet */}
      {isTablet && !collapsed && (
        <div
          onClick={toggleCollapsed}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 49 }}
        />
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 64, background: 'var(--nt-surface)',
          borderBottom: '1px solid var(--nt-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(22,29,60,0.06)', zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Poppins, sans-serif', color: 'var(--nt-text-primary)', lineHeight: 1.2 }}>
                {pageTitle}
              </div>
              <nav style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--nt-text-muted)', marginTop: 1 }}>
                <Link href="/" style={{ color: 'var(--nt-primary)', fontWeight: 500 }}>Home</Link>
                <FaChevronRight style={{ fontSize: 7 }} />
                <span>{pageTitle}</span>
              </nav>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setDarkMode(d => !d)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--nt-border)', background: 'var(--nt-bg)', color: 'var(--nt-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>

            <NotificationBell size="desktop" />

            <div style={{ width: 1, height: 24, background: 'var(--nt-border)', margin: '0 4px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--nt-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {userInitials}
              </div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--nt-text-primary)', whiteSpace: 'nowrap' }}>
                  {userName.split('@')[0].split(' ')[0]}
                </div>
                <div style={{ fontSize: 11, color: 'var(--nt-text-muted)' }}>Admin</div>
              </div>
              <FaChevronDown style={{ fontSize: 9, color: 'var(--nt-text-muted)' }} />
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 24, background: 'var(--nt-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
