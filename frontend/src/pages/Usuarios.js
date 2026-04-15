import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Trash, Pencil, UserCircle, ShieldCheck } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ nome: '', email: '', password: '', role: 'user' });

  useEffect(() => { carregarUsuarios(); }, []);

  const carregarUsuarios = async () => {
    try {
      const response = await api.get('/users');
      setUsuarios(response.data);
    } catch (error) { toast.error('Erro ao carregar usuarios'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) { toast.error('Preencha nome e email'); return; }
    if (!editando && !formData.password) { toast.error('Preencha a senha'); return; }

    try {
      if (editando) {
        const payload = { nome: formData.nome, email: formData.email, role: formData.role };
        if (formData.password) payload.password = formData.password;
        await api.put(`/users/${editando.id}`, payload);
        toast.success('Usuario atualizado!');
      } else {
        await api.post('/users', formData);
        toast.success('Usuario cadastrado!');
      }
      setDialogOpen(false); resetForm(); carregarUsuarios();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Erro ao salvar usuario');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este usuario?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuario excluido!'); carregarUsuarios();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Erro ao excluir');
    }
  };

  const resetForm = () => { setFormData({ nome: '', email: '', password: '', role: 'user' }); setEditando(null); };

  const abrirEdicao = (usuario) => {
    setEditando(usuario);
    setFormData({ nome: usuario.nome, email: usuario.email, password: '', role: usuario.role });
    setDialogOpen(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64">Carregando...</div>;

  return (
    <div className="fade-in" data-testid="usuarios-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1B2620]">Usuarios</h1>
          <p className="text-lg text-[#7A8780] mt-2">Gerencie quem pode acessar o sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#4A6741] hover:bg-[#3B5334] text-white" data-testid="add-usuario-btn">
              <Plus size={20} className="mr-2" /> Novo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="usuario-dialog">
            <DialogHeader><DialogTitle>{editando ? 'Editar Usuario' : 'Novo Usuario'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required data-testid="usuario-nome-input" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required data-testid="usuario-email-input" />
              </div>
              <div>
                <Label>{editando ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</Label>
                <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!editando} data-testid="usuario-password-input" />
              </div>
              <div>
                <Label>Perfil *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger data-testid="role-select"><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-[#4A6741] hover:bg-[#3B5334] text-white" data-testid="save-usuario-btn">{editando ? 'Atualizar' : 'Salvar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E3DB] overflow-hidden" data-testid="usuarios-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F3F0] border-b border-[#E5E3DB]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Nome</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Email</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Perfil</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-[#7A8780]">Nenhum usuario cadastrado</td></tr>
              ) : usuarios.map((usuario) => (
                <tr key={usuario.id} className="table-row border-b border-[#E5E3DB] hover:bg-[#FDFCFB]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {usuario.role === 'admin' ? <ShieldCheck size={20} className="text-[#4A6741]" /> : <UserCircle size={20} className="text-[#7A8780]" />}
                      <span className="font-medium text-[#1B2620]">{usuario.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#3A453F]">{usuario.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${usuario.role === 'admin' ? 'bg-[#4A6741] text-white' : 'bg-[#E5E3DB] text-[#3A453F]'}`}>
                      {usuario.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => abrirEdicao(usuario)} className="text-[#4A6741] hover:text-[#3B5334]"><Pencil size={18} /></button>
                      <button onClick={() => handleDelete(usuario.id)} className="text-[#C25934] hover:text-[#A64B2B]"><Trash size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
