import { useState, useEffect, useRef } from 'react';
import { buscarCursos, cadastrarProfessor, uploadFotoProfessor, type CursoItem } from '../services/supabaseService';

type FormData = {
  matricula: string;
  dataAtual: string;
  cursos: string;
  nomeCompleto: string;
  dataNascimento: string;
  idade: string;
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
  foto?: File | null;
  fotoUrl?: string;
  sexo: string;
};

export const useProfessorForm = () => {
  const [formData, setFormData] = useState<FormData>({
    matricula: '',
    dataAtual: new Date().toISOString().split('T')[0],
    cursos: '',
    nomeCompleto: '',
    dataNascimento: '',
    idade: '',
    sexo: '',
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
    foto: null,
    fotoUrl: '',
  });

  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const cursosDisponiveis = await buscarCursos();
        setCursos(cursosDisponiveis);
      } catch (error) {
        console.error('Erro ao buscar cursos:', error);
        setErrors(['Não foi possível carregar os cursos']);
      }
    };

    const gerarMatricula = () => {
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      setFormData((prev) => ({ ...prev, matricula: `DO${randomDigits}` }));
    };

    fetchCursos();
    gerarMatricula();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'dataNascimento') {
      const idade = calcularIdade(value);
      setFormData(prev => ({
        ...prev,
        idade: idade.toString(),
      }));
    }

    if (name === 'cep' && value.replace(/\D/g, '').length === 8) {
      buscarEndereco(value.replace(/\D/g, '')).then(data => {
        if (data) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            uf: data.uf || '',
          }));
        }
      });
    }
  };

  const calcularIdade = (dataNascimento: string) => {
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const buscarEndereco = async (cep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (response.ok) return await response.json();
      throw new Error('Erro na resposta da API');
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      return null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData(prev => ({
      ...prev,
      foto: file,
      fotoUrl: URL.createObjectURL(file)
    }));
  };

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      setErrors(['Não foi possível acessar a câmera']);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context?.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'foto.png', { type: 'image/png' });
          setFormData(prev => ({ ...prev, foto: file }));
          setShowCamera(false);
          
          if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
          }
        }
      }, 'image/png');
    }
  };

  const validarFormulario = (dados: FormData) => {
    const erros: string[] = [];
    
    const camposObrigatorios: Array<keyof FormData> = [
      'nomeCompleto',
      'dataNascimento',
      'rg',
      'cpf',
      'cep',
      'cursos',
      'sexo',
      'especialidade',
      'formacao'
    ];
    
    camposObrigatorios.forEach(campo => {
      if (!dados[campo]) {
        erros.push(`${campo} é obrigatório`);
      }
    });

    if (dados.cep && dados.cep.replace(/\D/g, '').length !== 8) {
      erros.push('CEP inválido');
    }

    setErrors(erros);
    return erros.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    if (!validarFormulario(formData)) {
      setLoading(false);
      return;
    }

    try {
      let fotoUrl = formData.fotoUrl;
      
      if (formData.foto) {
        fotoUrl = await uploadFotoProfessor(formData.foto, formData.matricula);
      }
      
      // Preparar dados para envio com a estrutura correta da tabela
      const professorData = {
        matricula: formData.matricula,
        "dataAtual": formData.dataAtual,
        cursos: formData.cursos,
        "nomeCompleto": formData.nomeCompleto,
        "dataNascimento": formData.dataNascimento,
        idade: formData.idade, // Mantém como string como na tabela Alunos
        sexo: formData.sexo,
        rg: formData.rg,
        cpf: formData.cpf,
        cep: formData.cep,
        endereco: formData.endereco,
        bairro: formData.bairro,
        cidade: formData.cidade,
        uf: formData.uf,
        telefone: formData.telefone,
        email: formData.email,
        especialidade: formData.especialidade,
        formacao: formData.formacao,
        experiencia: formData.experiencia,
        "fotoUrl": fotoUrl,
      };

      await cadastrarProfessor(professorData);
      setSuccessMessage('Professor cadastrado com sucesso!');
      
      setFormData({
        ...formData,
        nomeCompleto: '',
        dataNascimento: '',
        rg: '',
        cpf: '',
        cep: '',
        endereco: '',
        bairro: '',
        cidade: '',
        uf: '',
        especialidade: '',
        formacao: '',
        experiencia: '',
        foto: null,
        fotoUrl: '',
      });
      
    } catch (error: any) {
      setErrors([`Erro ao cadastrar: ${error.message || 'Erro desconhecido'}`]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      ...formData,
      nomeCompleto: '',
      dataNascimento: '',
      rg: '',
      cpf: '',
      cep: '',
      endereco: '',
      bairro: '',
      cidade: '',
      uf: '',
      especialidade: '',
      formacao: '',
      experiencia: '',
      foto: null,
      fotoUrl: '',
    });
    setTouchedFields({});
    setErrors([]);
  };

  return {
    formData,
    cursos,
    loading,
    errors,
    successMessage,
    showCamera,
    videoRef,
    canvasRef,
    touchedFields,
    handleChange,
    handleFileChange,
    handleSubmit,
    handleBlur,
    openCamera,
    capturePhoto,
    resetForm,
  };
}; 