import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { ativarMostrarSenha } from '../componentes/mostrar-senha.js';

montarCabecalho();
ativarMostrarSenha();   // botão de "olho" no campo de senha

const form = document.getElementById('formulario');
const elTitulo = document.getElementById('titulo');
const elCampoNome = document.getElementById('campo-nome');
const elBotao = document.getElementById('btn-enviar');
const elAlternar = document.getElementById('alternar');
const elErro = document.getElementById('erro');

// Mesma tela serve para entrar e para cadastrar
let modoCadastro = false;

function atualizarModo() {
    elTitulo.textContent = modoCadastro ? 'Criar conta' : 'Entrar';
    elBotao.textContent = modoCadastro ? 'Cadastrar' : 'Entrar';
    elAlternar.textContent = modoCadastro ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastre-se';
    elCampoNome.hidden = !modoCadastro;
    // Ajuda o navegador a sugerir/salvar a senha certa
    form.senha.autocomplete = modoCadastro ? 'new-password' : 'current-password';
    elErro.textContent = '';
}

elAlternar.addEventListener('click', (e) => {
    e.preventDefault();
    modoCadastro = !modoCadastro;
    atualizarModo();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();   // não deixa o navegador recarregar a página
    elErro.textContent = '';
    elBotao.disabled = true;

    const dados = Object.fromEntries(new FormData(form));

    try {
        const resposta = await api(
            modoCadastro ? '/auth/cadastro' : '/auth/login',
            {
                method: 'POST',
                body: JSON.stringify(
                    modoCadastro
                        ? { nome: dados.nome, email: dados.email, senha: dados.senha }
                        : { email: dados.email, senha: dados.senha }
                ),
            }
        );

        localStorage.setItem('token', resposta.token);
        localStorage.setItem('usuario', JSON.stringify(resposta.usuario));

        // Volta para a página de onde veio (ex.: finalizar compra), ou para a loja
        const destino = new URLSearchParams(window.location.search).get('voltar');
        window.location.href = destino && destino.startsWith('/') && !destino.startsWith('//')
            ? destino
            : '/';
    } catch (erro) {
        elErro.textContent = erro.message;
        elBotao.disabled = false;
    }
});