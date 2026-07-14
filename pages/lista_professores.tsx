import Grid from '@mui/material/Grid';  
import Layout from '../components/layout/Layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import React from 'react';
import { supabase } from '../supabaseClient';
import { jsPDF } from "jspdf";
import QRCode from 'qrcode.react';
import Swal from 'sweetalert2';
import { 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Modal, 
  Box, 
  Typography, 
  IconButton, 
  CircularProgress ,
  Avatar,  
  Divider,
  InputLabel,
  FormControl
} from '@mui/material';
import { Delete, Edit, Visibility, PictureAsPdf, CreditCard } from '@mui/icons-material';
import Image from 'next/image';

interface Professor {
  id: number;
  matricula: string;
  dataAtual: string;
  cursos: string;
  nomeCompleto: string;
  dataNascimento: string;
  idade: string;
  sexo: string;
  rg: string;
  cpf: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  especialidade: string;
  formacao: string;
  experiencia: string;
  foto: string;
  fotoUrl?: string;
  fotoFile?: File;
  qrcode?: string;
}

const ListarProfessores = () => {
  const router = useRouter();
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('nomeCompleto');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Professor>>({
    nomeCompleto: '',
    cursos: '',
    idade: '',
    matricula: '',
    dataNascimento: '',
    rg: '',
    cpf: '',
    cep: '',
    endereco: '',
    bairro: '',
    cidade: '',
    uf: '',
    telefone: '',
    email: '',
    especialidade: '',
    formacao: '',
    experiencia: '',
  });

  const [cursos, setCursos] = useState<{ id: number; curso: string }[]>([]);

  const buscarCursos = async () => {
    try {
      const { data, error } = await supabase
        .from('Cursos')
        .select('id, curso');

      if (error) {
        console.error('Erro ao buscar cursos:', error);
        return;
      }

      if (data) {
        setCursos(data);
      }
    } catch (error) {
      console.error('Erro ao buscar cursos:', error);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      buscarCursos();
    }
  }, [isModalOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'dataNascimento') {
      const idade = calcularIdade(value).toString();
      setFormData((prev) => ({
        ...prev,
        idade,
      }));
    }
  };

  const calcularIdade = (dataNascimento: string): number => {
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const uploadFoto = async (file: File): Promise<string> => {
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('O arquivo selecionado não é uma imagem válida.');
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('O arquivo é muito grande. O tamanho máximo permitido é 5MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `professores-fotos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('professores-fotos')
        .upload(filePath, file);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('professores-fotos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw new Error('Erro ao carregar a foto. Tente novamente.');
    }
  };

  const atualizarProfessor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      // Validação do campo sexo
      if (formData.sexo && !["Masculino", "Feminino"].includes(formData.sexo)) {
        throw new Error('O campo sexo deve ser "Masculino" ou "Feminino"');
      }

      // Prepara os dados para envio
      const dadosParaAtualizar: Partial<Professor> = { 
        ...formData,
        idade: formData.idade ? parseInt(formData.idade) : undefined,
      };
  
      // Remove campos que não devem ser enviados
      delete dadosParaAtualizar.fotoFile;
      delete dadosParaAtualizar.foto;
      delete dadosParaAtualizar.qrcode;
      delete dadosParaAtualizar.id;

      // Upload da foto se foi alterada
      if (formData.fotoFile) {
        const fotoUrl = await uploadFoto(formData.fotoFile);
        dadosParaAtualizar.fotoUrl = fotoUrl;
      }

      if (!selectedProfessor?.id) {
        throw new Error('ID do professor não encontrado');
      }

      // Atualização no Supabase
      const { error } = await supabase
        .from('Professores')
        .update(dadosParaAtualizar)
        .eq('id', selectedProfessor.id);

      if (error) throw error;

      // Atualização do estado local
      setProfessores(professores.map(professor => 
        professor.id === selectedProfessor.id ? { 
          ...professor, 
          ...dadosParaAtualizar,
          fotoUrl: dadosParaAtualizar.fotoUrl || professor.fotoUrl
        } : professor
      ));

      // Fecha o modal primeiro
      closeModal();
      
      // Depois mostra a mensagem de sucesso
      await Swal.fire({
        title: 'Sucesso!',
        text: 'Professor atualizado com sucesso.',
        icon: 'success',
        confirmButtonText: 'OK',
      });

    } catch (error) {
      console.error('Erro ao atualizar:', error);
      await Swal.fire({
        title: 'Erro!',
        text: error instanceof Error ? error.message : 'Erro ao atualizar professor',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    } finally {
      setLoading(false);
    }
  };  

  const fetchProfessores = async () => {
    try {
      setLoading(true);
      console.log('Iniciando busca de professores...');
      
      const { data, error } = await supabase.from('Professores').select('*');
      
      if (error) {
        console.error('Erro do Supabase:', error);
        throw new Error(`Erro do banco: ${error.message}`);
      }

      console.log('Dados recebidos:', data);
      
      const normalizados = (data || []).map(professor => ({
        ...professor,
        fotoUrl: professor.fotoUrl || professor.foto,
        foto: professor.foto || professor.fotoUrl,
        sexo: professor.sexo === "Masculino" || professor.sexo === "Feminino" ? professor.sexo : null
      }));

      setProfessores(normalizados);
      console.log('Professores carregados:', normalizados.length);
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      Swal.fire('Erro', `Não foi possível carregar os professores: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessores();
  }, []);

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Você está prestes a deletar este professor. Essa ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, deletar!',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from('Professores').delete().eq('id', id);
      if (error) throw error;
      setProfessores(professores.filter(professor => professor.id !== id));
      await Swal.fire('Deletado!', 'O professor foi deletado com sucesso.', 'success');
    } catch (error) {
      console.error('Erro ao deletar o professor:', error);
      await Swal.fire(
        'Erro!',
        'Ocorreu um erro ao deletar o professor: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        'error'
      );
    }
  };

  const handleEdit = (professor: Professor) => {
    setSelectedProfessor(professor);
    setFormData({ 
      ...professor, 
      fotoUrl: professor.fotoUrl || professor.foto,
      foto: professor.foto || professor.fotoUrl
    });
    setIsModalOpen(true);
  };

  const handleShowCard = (professor: Professor) => {
    setSelectedProfessor({
      ...professor,
      fotoUrl: professor.fotoUrl || professor.foto,
    });
    setIsCardModalOpen(true);
  };

  const handleShowPdf = (professor: Professor) => {
    setSelectedProfessor({
      ...professor,
      fotoUrl: professor.fotoUrl || professor.foto,
    });
    setIsPdfModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProfessor(null);
  };

  const closeCardModal = () => {
    setIsCardModalOpen(false);
  };

  const closePdfModal = () => {
    setIsPdfModalOpen(false);
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };
  

  const printPDF = () => {
    window.print();
  };

  const downloadPDF = () => {
    alert('Funcionalidade de download em implementação.');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4">
        <Typography variant="h4" gutterBottom>
          Lista de Professores
        </Typography>

        {/* Barra de pesquisa */}
        <div className="flex mb-4 gap-2">
          <Select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="w-32"
          >
            <MenuItem value="nomeCompleto">Nome</MenuItem>
            <MenuItem value="matricula">Matrícula</MenuItem>
            <MenuItem value="cursos">Curso</MenuItem>
            <MenuItem value="cpf">CPF</MenuItem>
            <MenuItem value="especialidade">Especialidade</MenuItem>
            <MenuItem value="sexo">Sexo</MenuItem>
          </Select>
          <TextField
            placeholder="Digite para pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => setSearchTerm(searchTerm)}
          >
            Pesquisar
          </Button>
        </div>

        {/* Indicador de carregamento */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Carregando professores...</Typography>
          </Box>
        )}

        {/* Tabela de professores */}
        {!loading && professores.length === 0 ? (
          <Box sx={{ bgcolor: 'warning.light', borderLeft: '4px solid', borderColor: 'warning.dark', p: 2, mb: 2 }}>
            <Typography variant="body2">
              Nenhum professor encontrado.
            </Typography>
          </Box>
        ) : !loading && (
         <TableContainer component={Paper}>
  <Table size="small">
    <TableHead>
      <TableRow>
        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5 }}>Matrícula</TableCell>
        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5, width: '60px' }}>Foto</TableCell>
        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5 }}>Nome</TableCell>
        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5, width: '60px', textAlign: 'center' }}>Idade</TableCell>
        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5 }}>Curso</TableCell>
        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5 }}>Especialidade</TableCell>
        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5, width: '60px', textAlign: 'center' }}>Sexo</TableCell>
        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 0.5, width: '120px', textAlign: 'center' }}>Ações</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {professores
        .filter(professor => searchTerm === '' || 
          String(professor[searchField as keyof Professor] || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .map(professor => (
          <React.Fragment key={professor.id}>
            <TableRow hover>
              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{professor.matricula}</TableCell>
              <TableCell sx={{ py: 0.5 }}>
                <Avatar 
                  src={professor.fotoUrl || professor.foto} 
                  sx={{ width: 32, height: 32, mx: 'auto' }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{professor.nomeCompleto}</TableCell>
              <TableCell sx={{ fontSize: '0.75rem', py: 0.5, textAlign: 'center' }}>{professor.idade}</TableCell>
              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{professor.cursos}</TableCell>
              <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{professor.especialidade}</TableCell>
              <TableCell sx={{ fontSize: '0.75rem', py: 0.5, textAlign: 'center' }}>
                {professor.sexo === "Feminino" ? "F" : professor.sexo === "Masculino" ? "M" : "N.I"}
              </TableCell>
              <TableCell sx={{ py: 0.5, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => toggleExpand(professor.id)} 
                    sx={{ p: 0.5 }}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleEdit(professor)} sx={{ p: 0.5 }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(professor.id)} sx={{ p: 0.5 }}>
                    <Delete fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleShowCard(professor)} sx={{ p: 0.5 }}>
                    <CreditCard fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleShowPdf(professor)} sx={{ p: 0.5 }}>
                    <PictureAsPdf fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>

            {/* Linha expandida */}
            {expandedId === professor.id && (
              <TableRow>
                <TableCell colSpan={8} sx={{ 
                  py: 1,
                  backgroundColor: '#f9f9f9',
                  borderTop: 'none'
                }}>
                  <Box sx={{ 
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid #eee'
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      mb: 1
                    }}>
                      Detalhes Completos
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={4}>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>ID:</strong> {professor.id}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Matrícula:</strong> {professor.matricula}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Data Contratação:</strong> {professor.dataAtual}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Data Nasc.:</strong> {new Date(professor.dataNascimento).toLocaleDateString("pt-BR")}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>RG:</strong> {professor.rg || 'Não informado'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>CPF:</strong> {professor.cpf || 'Não informado'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Telefone:</strong> {professor.telefone || 'Não informado'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Email:</strong> {professor.email || 'Não informado'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Formação:</strong> {professor.formacao || 'Não informado'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Experiência:</strong> {professor.experiencia || 'Não informado'} anos
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Endereço:</strong> {professor.endereco || 'Não informado'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          <strong>Cidade:</strong> {professor.cidade || 'Não informado'}, {professor.uf || 'UF'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
    </TableBody>
  </Table>
</TableContainer>
        )}

<Modal open={isModalOpen} onClose={closeModal}>
  <Box sx={{ 
    position: 'absolute', 
    top: '50%', 
    left: '50%', 
    transform: 'translate(-50%, -50%)', 
    width: 600, 
    bgcolor: 'background.paper', 
    boxShadow: 24, 
    p: 2,
    fontSize: '0.875rem'
  }}>
    <Typography variant="h6" component="h2" gutterBottom sx={{ fontSize: '1.1rem' }}>
      Editar Professor
    </Typography>
    <form onSubmit={atualizarProfessor}>
      <Grid container spacing={1}>
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Avatar
              src={formData.fotoUrl || formData.foto || ''}
              sx={{ width: 70, height: 70, mb: 1 }}
            />
            <input
              type="file"
              id="fotoUpload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const previewUrl = URL.createObjectURL(file);
                  setFormData({ ...formData, fotoUrl: previewUrl, foto: previewUrl, fotoFile: file });
                }
              }}
            />
            <label htmlFor="fotoUpload">
              <Button variant="contained" component="span" size="small" sx={{ fontSize: '0.75rem' }}>
                Trocar Foto
              </Button>
            </label>
          </Box>
        </Grid>
        <Grid item xs={12} md={8}>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Matrícula"
                name="matricula"
                size="small"
                value={formData.matricula || ""}
                onChange={handleChange}
                InputProps={{
                  readOnly: true,
                  style: { fontSize: '0.875rem' }
                }}
                InputLabelProps={{ style: { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data Contratação"
                type="date"
                name="dataAtual"
                size="small"
                value={formData.dataAtual || ""}
                InputProps={{
                  readOnly: true,
                  style: { fontSize: '0.875rem' }
                }}
                InputLabelProps={{ 
                  shrink: true,
                  style: { fontSize: '0.875rem' }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Curso</InputLabel>
                <Select
                  name="cursos"
                  value={formData.cursos || ""}
                  onChange={handleChange}
                  label="Curso"
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.875rem' }}>Selecione um curso</MenuItem>
                  {cursos.map((curso) => (
                    <MenuItem key={curso.id} value={curso.curso} sx={{ fontSize: '0.875rem' }}>
                      {curso.curso}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Nome Completo"
            name="nomeCompleto"
            size="small"
            value={formData.nomeCompleto || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Data Nascimento"
            type="date"
            name="dataNascimento"
            size="small"
            value={formData.dataNascimento || ""}
            onChange={(e) => {
              const dataNascimento = e.target.value;
              const idade = calcularIdade(dataNascimento).toString();

              setFormData({
                ...formData,
                dataNascimento,
                idade,
              });
            }}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ 
              shrink: true,
              style: { fontSize: '0.875rem' }
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Idade"
                name="idade"
                size="small"
                value={formData.idade || ""}
                InputProps={{
                  readOnly: true,
                  style: { fontSize: '0.875rem' }
                }}
                InputLabelProps={{ style: { fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Sexo</InputLabel>
                <Select
                  name="sexo"
                  value={formData.sexo || ""}
                  onChange={handleChange}
                  label="Sexo"
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.875rem' }}>Selecione</MenuItem>
                  <MenuItem value="Masculino" sx={{ fontSize: '0.875rem' }}>Masculino</MenuItem>
                  <MenuItem value="Feminino" sx={{ fontSize: '0.875rem' }}>Feminino</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Especialidade"
                name="especialidade"
                size="small"
                value={formData.especialidade || ""}
                onChange={handleChange}
                InputProps={{ style: { fontSize: '0.875rem' } }}
                InputLabelProps={{ style: { fontSize: '0.875rem' } }}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="RG"
            name="rg"
            size="small"
            value={formData.rg || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="CPF"
            name="cpf"
            size="small"
            value={formData.cpf || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="CEP"
            name="cep"
            size="small"
            value={formData.cep || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Endereço"
            name="endereco"
            size="small"
            value={formData.endereco || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Telefone"
            name="telefone"
            size="small"
            value={formData.telefone || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            size="small"
            type="email"
            value={formData.email || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Formação"
            name="formacao"
            size="small"
            value={formData.formacao || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Experiência (anos)"
            name="experiencia"
            size="small"
            value={formData.experiencia || ""}
            onChange={handleChange}
            InputProps={{ style: { fontSize: '0.875rem' } }}
            InputLabelProps={{ style: { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              size="small"
              disabled={loading}
              sx={{ fontSize: '0.75rem' }}
            >
              {loading ? <CircularProgress size={18} /> : 'Salvar'}
            </Button>
            <Button
              type="button"
              onClick={closeModal}
              variant="outlined"
              color="secondary"
              size="small"
              sx={{ fontSize: '0.75rem' }}
            >
              Cancelar
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  </Box>
</Modal>

     {/* Modal do Cartão de Identificação */}
{isCardModalOpen && selectedProfessor && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 print:bg-transparent">
    {/* Contêiner do cartão */}
    <div
      id="card-container"
      className="p-0 rounded-lg shadow-lg relative flex flex-col items-center print:shadow-none print:border-0"
      style={{
        width: "54mm",
        height: "86mm",
        maxWidth: "54mm",
        maxHeight: "86mm",
        overflow: "hidden"
      }}
    >
      {/* Transparent overlay to simulate plastic card */}
      <div className="absolute inset-0 bg-gray-200 bg-opacity-10 z-10 pointer-events-none rounded-lg border border-gray-300"></div>

      {/* Card Content */}
      <div id="card-content" className="w-full h-full flex flex-col relative">
        {/* Top hole for lanyard */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-gray-100 rounded-b-lg border border-gray-300 z-20"></div>

        {/* Inner card with beige background */}
        <div className="flex-1 bg-stone-100 m-2 rounded-lg flex flex-col overflow-hidden relative">
          {/* Logo in top left corner */}
          <div className="absolute top-3 left-3 z-20">
            <img
              src="/zoe/zoe.png"
              alt="Logo"
              className="w-6 h-8"
            />
          </div>

          {/* Photo Area - Taking up 60% of the card */}
          <div className="flex-1 pt-8 relative flex items-center justify-center" style={{ width: "80%", height: "50%", overflow: "hidden", margin: "0 auto" }}>
  {selectedProfessor.fotoUrl ? (
              <img
      src={selectedProfessor.fotoUrl}
      alt={`Foto de ${selectedProfessor.nomeCompleto}`}
                className="w-full h-full object-cover object-center rounded"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
    />
  ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded">
      <span className="text-gray-500 text-sm">Sem foto</span>
    </div>
  )}
</div>

          {/* Bottom white bar with name and QR code */}
          <div className="bg-white p-2 flex justify-between items-center absolute bottom-0 left-0 right-0 border-t border-gray-300">
            <div className="flex flex-col flex-1 mr-2">
              <h2 className="text-navy-900 text-[17px] font-bold tracking-wide leading-tight">
                {selectedProfessor.nomeCompleto
                  ? selectedProfessor.nomeCompleto.split(' ')[0] + ' ' + selectedProfessor.nomeCompleto.split(' ').pop()
                  : "Nome não informado"}
              </h2>
              <p className="text-gray-700 text-sm leading-tight">
                Matrícula: {selectedProfessor.matricula || "N/A"}
              </p>
              <p className="text-gray-700 text-sm leading-tight">
                {selectedProfessor.especialidade || "Especialidade não informada"}
              </p>
              <div className="h-0.5 w-full bg-gray-300 mt-1"></div>
            </div>

            {/* QR Code */}
            <div className="w-14 h-14 bg-white border border-gray-800 p-1 flex items-center justify-center rounded">
              <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(window.location.origin + "/openModalWithId?id=" + selectedProfessor.id)}`}
                alt="QR Code" 
                className="w-full h-full"
                />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Botões fora do contêiner do cartão */}
    <div className="absolute bottom-20 flex justify-between w-full px-3 print:hidden" style={{ width: "54mm" }}>
      <button
        onClick={() => {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            const printContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Cartão de Identificação - ${selectedProfessor.nomeCompleto}</title>
                  <style>
                    @page { size: 54mm 86mm; margin: 0; }
                    html, body { height: 100%; }
                    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .card-container { 
                      width: 54mm; 
                      height: 86mm; 
                      border: 2px solid #333; 
                      border-radius: 8px; 
                      overflow: hidden;
                      margin: 0 auto;
                      background: #f5f5dc;
                      position: relative;
                      box-sizing: border-box;
                    }
                    .logo { 
                      position: absolute; 
                      top: 8px; 
                      left: 8px; 
                      z-index: 20; 
                    }
                    .photo-area { 
                      width: 80%; 
                      height: 50%; 
                      margin: 8px auto 0; 
                      display: flex; 
                      align-items: center; 
                      justify-content: center;
                      background: #e0e0e0;
                      border-radius: 4px;
                    }
                    .bottom-bar { 
                      background: white; 
                      padding: 8px; 
                      display: flex; 
                      justify-content: space-between; 
                      align-items: center;
                      position: absolute;
                      bottom: 0;
                      left: 0;
                      right: 0;
                      border-top: 1px solid #ddd;
                    }
                    .qr-code { 
                      width: 56px; 
                      height: 56px; 
                      background: white; 
                      border: 1px solid #333; 
                      padding: 4px;
                      border-radius: 4px;
                    }
                    .professor-info h2 {
                      margin: 0; 
                      font-size: 16px; 
                      font-weight: bold; 
                      color: #1a365d;
                      line-height: 1.2;
                    }
                    .professor-info p {
                      margin: 2px 0; 
                      font-size: 11px; 
                      color: #4a5568;
                      line-height: 1.1;
                    }
                  </style>
                </head>
                <body>
                  <div class="card-container">
                    <div class="logo">
                      <img src="/zoe/zoe.png" alt="Logo" style="width: 24px; height: 32px;">
                    </div>
                    <div class="photo-area">
                      ${selectedProfessor.fotoUrl ? 
                        `<img src="${selectedProfessor.fotoUrl}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">` : 
                        '<span style="color: #666; font-size: 12px;">Sem foto</span>'
                      }
                    </div>
                    <div class="bottom-bar">
                      <div class="professor-info">
                        <h2>${selectedProfessor.nomeCompleto || 'Nome não informado'}</h2>
                        <p>Matrícula: ${selectedProfessor.matricula || 'N/A'}</p>
                        <p>${selectedProfessor.especialidade || 'Especialidade não informada'}</p>
                      </div>
                      <div class="qr-code">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(window.location.origin + "/openModalWithId?id=" + selectedProfessor.id)}" alt="QR Code" style="width: 100%; height: 100%;">
                      </div>
                    </div>
                  </div>
                  <script>
                    window.onload = function() {
                      setTimeout(() => {
                        window.print();
                        window.close();
                      }, 100);
                    };
                  </script>
                </body>
              </html>
            `;
            
            printWindow.document.write(printContent);
            printWindow.document.close();
          }
        }}
        className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] hover:bg-blue-700 transition-colors"
      >
        Imprimir
      </button>
      <button
        onClick={async () => {
          try {
            const { jsPDF } = await import('jspdf');
            const html2canvas = await import('html2canvas');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] });
            const container = document.getElementById('card-container') || document.createElement('div');
            const canvas = await html2canvas.default(container, { scale: 3, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 54, 86);
            pdf.save(`cartao-identificacao-${selectedProfessor.nomeCompleto || 'professor'}.pdf`);
          } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
          }
        }}
        className="bg-green-600 text-white px-2 py-1 rounded text-[10px] hover:bg-green-700 transition-colors"
      >
        Gerar PDF
      </button>
      <button
        type="button"
        onClick={closeCardModal}
        className="bg-gray-600 text-white px-2 py-1 rounded text-[10px] hover:bg-gray-700 transition-colors"
      >
        Fechar
      </button>
    </div>
  </div>
)}

      <Modal open={isPdfModalOpen} onClose={closePdfModal}>
  <Box sx={{ 
    position: 'absolute', 
    top: '50%', 
    left: '50%', 
    transform: 'translate(-50%, -50%)', 
    width: 600,
    bgcolor: 'background.paper', 
    boxShadow: 24, 
    p: 2
  }}>
    <Typography variant="h6" component="h2" gutterBottom>
      Documento do Professor
    </Typography>

    <Box id="pdf-content" sx={{ border: 1, p: 2, mb: 2 }}>
      {/* Cabeçalho */}
      <Box textAlign="center" mb={1}>
        <Typography variant="h6" fontWeight="bold">
          FICHA DO PROFESSOR
        </Typography>
        <Typography variant="caption">
          Dados completos
        </Typography>
      </Box>

      {/* Foto e Informações Básicas */}
      <Box display="flex" mb={1}>
        <Box width="25%" mr={1}>
          {selectedProfessor?.fotoUrl ? (
            <Image
              src={selectedProfessor.fotoUrl}
              alt={`Foto de ${selectedProfessor.nomeCompleto}`}
              className="w-full h-[100px] object-cover object-center"
              width={100}
              height={100}
              unoptimized
            />
          ) : (
            <Box 
              width="100%" 
              height={100} 
              bgcolor="grey.200" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
            >
              <Typography variant="caption" color="textSecondary">
                Sem foto
              </Typography>
            </Box>
          )}
        </Box>
        <Box width="75%">
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {selectedProfessor?.nomeCompleto}
          </Typography>
          <Typography variant="body2"><strong>Matrícula:</strong> {selectedProfessor?.matricula}</Typography>
          <Typography variant="body2"><strong>Curso:</strong> {selectedProfessor?.cursos}</Typography>
          <Typography variant="body2"><strong>Especialidade:</strong> {selectedProfessor?.especialidade}</Typography>
          <Typography variant="body2"><strong>Data de Nascimento:</strong> {selectedProfessor?.dataNascimento}</Typography>
          <Typography variant="body2"><strong>Idade:</strong> {selectedProfessor?.idade} anos</Typography>
        </Box>
      </Box>

      {/* Documentação e Contato */}
      <Grid container spacing={1} mb={1}>
        <Grid item xs={6}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom borderBottom={1}>
            Documentação
          </Typography>
          <Typography variant="body2"><strong>RG:</strong> {selectedProfessor?.rg}</Typography>
          <Typography variant="body2"><strong>CPF:</strong> {selectedProfessor?.cpf}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom borderBottom={1}>
            Contato
          </Typography>
          <Typography variant="body2"><strong>Telefone:</strong> {selectedProfessor?.telefone}</Typography>
          <Typography variant="body2"><strong>Email:</strong> {selectedProfessor?.email}</Typography>
        </Grid>
      </Grid>

      {/* Endereço */}
      <Box mb={1}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom borderBottom={1}>
          Endereço
        </Typography>
        <Typography variant="body2">{selectedProfessor?.endereco}, {selectedProfessor?.bairro}</Typography>
        <Typography variant="body2">{selectedProfessor?.cidade} - {selectedProfessor?.uf}, CEP: {selectedProfessor?.cep}</Typography>
      </Box>

      {/* Formação e Experiência */}
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom borderBottom={1}>
          Formação e Experiência
        </Typography>
        <Typography variant="body2"><strong>Formação:</strong> {selectedProfessor?.formacao}</Typography>
        <Typography variant="body2"><strong>Experiência:</strong> {selectedProfessor?.experiencia} anos</Typography>
      </Box>
    </Box>

    {/* Botões de Ação */}
    <Box display="flex" justifyContent="space-between">
      <Box>
        <Button
          onClick={printPDF}
          variant="contained"
          color="primary"
          size="small"
          sx={{ mr: 1 }}
        >
          Imprimir
        </Button>
        <Button
          onClick={async () => {
            try {
              const { jsPDF } = await import("jspdf");
              const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
              });

              pdf.html(document.getElementById("pdf-content"), {
                callback: (pdf) => {
                  pdf.save(`ficha-professor-${selectedProfessor?.nomeCompleto}.pdf`);
                },
                margin: [10, 10, 10, 10],
                autoPaging: "text",
                width: 190,
                windowWidth: 800,
              });
            } catch (error) {
              console.error("Erro ao gerar PDF:", error);
              alert("Erro ao gerar PDF.");
            }
          }}
          variant="contained"
          color="success"
          size="small"
        >
          Download PDF
        </Button>
      </Box>
      <Button
        onClick={closePdfModal}
        variant="outlined"
        color="secondary"
        size="small"
      >
        Fechar
      </Button>
    </Box>
  </Box>
</Modal>
      </div>
    </Layout>
  );
};

export default ListarProfessores; 
