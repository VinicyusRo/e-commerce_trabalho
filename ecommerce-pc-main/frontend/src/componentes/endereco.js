// Tudo que é compartilhado sobre endereços: campos do formulário,
// busca automática pelo CEP, texto formatado e a janela de edição.

import { escapar } from '../utils.js';

// Campos do formulário (usados no checkout e na página da conta)
export const CAMPOS_ENDERECO_HTML = `
    <label>CEP
        <input name="cep" required inputmode="numeric" maxlength="9"
               placeholder="00000-000" autocomplete="postal-code">
        <small class="dica-campo status-cep">Digite o CEP para preencher o endereço automaticamente.</small>
    </label>
    <label>Rua <input name="rua" required maxlength="150" autocomplete="address-line1"></label>
    <div class="linha-campos">
        <label>Número <input name="numero" required maxlength="10"></label>
        <label>Complemento
            <input name="complemento" maxlength="60" placeholder="Opcional: apto, bloco..."
                   autocomplete="address-line2">
        </label>
    </div>
    <label>Bairro <input name="bairro" maxlength="80"></label>
    <div class="linha-campos linha-cidade">
        <label>Cidade <input name="cidade" required maxlength="80" autocomplete="address-level2"></label>
        <label>UF <input name="estado" required maxlength="2" autocomplete="address-level1"></label>
    </div>
`;

const TEXTO_PADRAO_CEP = 'Digite o CEP para preencher o endereço automaticamente.';

function formatarCep(cep = '') {
    const d = String(cep).replace(/\D/g, '');
    return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/**
 * Ativa a máscara do CEP e o preenchimento automático (ViaCEP) num formulário
 * que tenha os campos de CAMPOS_ENDERECO_HTML.
 * Usa o ViaCEP (https://viacep.com.br), serviço gratuito chamado pelo navegador.
 */
export function ativarBuscaCep(form) {
    const campoCep = form.elements.cep;
    const elStatus = form.querySelector('.status-cep');
    let ultimoBuscado = '';

    function status(texto, tipo = '') {
        elStatus.textContent = texto;
        elStatus.className = `dica-campo status-cep ${tipo}`;
    }

    campoCep.addEventListener('input', async () => {
        const digitos = campoCep.value.replace(/\D/g, '').slice(0, 8);
        campoCep.value = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;

        if (digitos.length !== 8 || digitos === ultimoBuscado) return;
        ultimoBuscado = digitos;

        status('Buscando endereço...');
        try {
            const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
            const dados = await resposta.json();

            if (dados.erro) {
                status('CEP não encontrado. Preencha o endereço manualmente.', 'sem-estoque');
                return;
            }

            if (dados.logradouro) form.elements.rua.value = dados.logradouro;
            form.elements.bairro.value = dados.bairro ?? '';
            form.elements.cidade.value = dados.localidade ?? '';
            form.elements.estado.value = dados.uf ?? '';

            status('Endereço encontrado! Agora informe o número.', 'em-estoque');
            // CEP de cidade inteira (sem rua): o foco vai para a rua
            (dados.logradouro ? form.elements.numero : form.elements.rua).focus();
        } catch {
            status('Não foi possível consultar o CEP. Preencha manualmente.', 'sem-estoque');
        }
    });

    // Para usar depois de form.reset()
    return {
        limpar() {
            ultimoBuscado = '';
            status(TEXTO_PADRAO_CEP);
        },
    };
}

/** Coloca os dados de um endereço nos campos do formulário. */
export function preencherFormulario(form, e) {
    for (const campo of ['rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado']) {
        form.elements[campo].value = e?.[campo] ?? '';
    }
    form.elements.cep.value = formatarCep(e?.cep);
}

/** Endereço em HTML de duas linhas (os dados são escapados). */
export function enderecoHTML(e) {
    const linha1 = `${escapar(e.rua)}, ${escapar(e.numero)}${e.complemento ? ` — ${escapar(e.complemento)}` : ''}`;
    const linha2 = [e.bairro && escapar(e.bairro), `${escapar(e.cidade)}/${escapar(e.estado)}`, `CEP ${formatarCep(e.cep)}`]
        .filter(Boolean).join(' · ');
    return `<span class="endereco-linha1">${linha1}</span><span class="endereco-linha2">${linha2}</span>`;
}

/**
 * Abre uma janela com o formulário de endereço.
 * Devolve uma Promise com os dados digitados, ou null se cancelar.
 * salvar(dados) é chamado ao enviar; se lançar erro, a mensagem aparece na janela.
 */
export function abrirJanelaEndereco({ titulo, endereco = null, salvar }) {
    return new Promise((resolve) => {
        const janela = document.createElement('dialog');
        janela.className = 'janela-confirmacao janela-endereco';
        janela.innerHTML = `
            <h2></h2>
            <form class="formulario" novalidate>
                ${CAMPOS_ENDERECO_HTML}
                <p class="sem-estoque erro-janela"></p>
                <div class="janela-acoes">
                    <button type="button" class="botao" data-cancelar>Cancelar</button>
                    <button type="submit" class="botao primario">Salvar endereço</button>
                </div>
            </form>`;
        janela.querySelector('h2').textContent = titulo;
        document.body.append(janela);

        const form = janela.querySelector('form');
        const elErro = janela.querySelector('.erro-janela');
        ativarBuscaCep(form);
        if (endereco) preencherFormulario(form, endereco);

        function fechar(resultado) {
            janela.close();
            janela.remove();
            resolve(resultado);
        }

        janela.querySelector('[data-cancelar]').addEventListener('click', () => fechar(null));
        janela.addEventListener('cancel', (e) => { e.preventDefault(); fechar(null); });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            const dados = Object.fromEntries(new FormData(form));
            const botao = form.querySelector('[type=submit]');
            botao.disabled = true;
            elErro.textContent = '';
            try {
                const salvo = await salvar(dados);
                fechar(salvo);
            } catch (erro) {
                elErro.textContent = erro.message;
                botao.disabled = false;
            }
        });

        janela.showModal();
        form.elements.cep.focus();
    });
}
