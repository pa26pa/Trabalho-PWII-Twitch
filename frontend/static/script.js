//DOMContentLoaded garante que o script só rode depois de todo o HTML estar carregado
document.addEventListener('DOMContentLoaded', function () {
    base_url = "http://127.0.0.1:5000";
    let usuarioLogado = false;
    let meuId = null;

    let turboAtivo = false;

    function chaveTurbo() {
        return `witch_turbo_ativo_${meuId || 'convidado'}`;
    }

    function carregarEstadoTurbo() {
        turboAtivo = localStorage.getItem(chaveTurbo()) === 'true';
        atualizarIconeTurbo();
    }

    function atualizarIconeTurbo() {
        const btnTurbo = document.getElementById('btn-turbo');
        if (btnTurbo) btnTurbo.classList.toggle('turbo-ativo', turboAtivo);

        const btnSub = document.querySelector('.btn-turbo-sub');
        if (btnSub) btnSub.style.display = turboAtivo ? 'none' : '';
    }

    // CARREGAMENTO DO CSRF TOKEN 
    // o token é necessário para proteger contra ataques CSRF, garantindo que as requisições venham de fontes confiáveis
    let csrfToken = null;
    async function carregarCsrf() {
        const res = await fetch(base_url + "/csrf-token");
        const data = await res.json();
        csrfToken = data.csrf_token;
    }

    carregarCsrf()

    const RECAPTCHA_SITE_KEY = "6LdwJtgtAAAAAMT4AyhVwMt4EIaPcU8363YdzIMs";
    let captchaWidgetId = null;

    function renderizarCaptcha() {
        const container = document.getElementById('recaptcha-container');
        if (!container || captchaWidgetId !== null) return;
        
        // Se o grecaptcha do Google ainda não estiver pronto na memória global, tenta novamente em 500ms
        if (typeof grecaptcha === 'undefined' || typeof grecaptcha.ready === 'undefined') {
            setTimeout(renderizarCaptcha, 500);
            return;
        }
        
        grecaptcha.ready(() => {
            captchaWidgetId = grecaptcha.render('recaptcha-container', {
                sitekey: RECAPTCHA_SITE_KEY,
                theme: localStorage.getItem('witch-tema') === 'escuro' ? 'dark' : 'light'
            });
        });
    }


    function resetarCaptcha() {
        if (typeof grecaptcha !== 'undefined' && captchaWidgetId !== null) {
            grecaptcha.reset(captchaWidgetId);
        }
    }
    // CONTROLE DE ESTADO LOGADO/DESLOGADO
    function mostrarLogado(nome) {
        // esconde elementos de deslogado, mostra de logado
        document.querySelectorAll('.without-login').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.with-login').forEach(el => el.style.display = 'flex');

        // nome no dropdown
        const nomeDropdown = document.getElementById('nome-dropdown');
        if (nomeDropdown) nomeDropdown.textContent = nome;
    }

    function mostrarDeslogado() {
        document.querySelectorAll('.with-login').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.without-login').forEach(el => el.style.display = '');

        // FIX: restaura o ícone de hambúrguer no btn-dropdown ao deslogar
        const btnDropdown = document.getElementById('btn-dropdown');
        if (btnDropdown) {
            const avatarImg = btnDropdown.querySelector('img.avatar-btn-dropdown');
            if (avatarImg) {
                avatarImg.remove();
                // recria os dois ícones originais (hambúrguer + pessoinha)
                btnDropdown.innerHTML = `
                    <i class="fa-solid fa-bars menu-icon without-login" style="color: var(--color10);"></i>
                    <i class="fa-solid fa-user with-login menu-icon" style="color: var(--color10);"></i>
                `;
            }
        }
    }

    // verifica sessão ao carregar
    async function verificarSessao() {

        try {
            const res = await fetch(base_url +"/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                }
            });

            const data = await res.json();

            if (data.logado) {
                usuarioLogado = true;
                meuId = data.id;
                mostrarLogado(data.name);
                info_user(data);
                incritos_info(data.id);
                getLiveSeguindo();
                carregarEstadoTurbo();  
            } else {
                usuarioLogado = false
                mostrarDeslogado();
                carregarEstadoTurbo();  
            }

        } catch (err) {
            usuarioLogado = false;
            meuId = null;
            console.error(err);
            mostrarDeslogado();
        }
    }

    // logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const res = await fetch(base_url +"/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken":csrfToken
            }});
            const data = await res.json();
            if (data.status == 'error') {
                mostrarToast(data.mensagem, data.status)
                return;
            } 
            
            window.location.href = "/";
            mostrarDeslogado();
            if (dropdownMenu) dropdownMenu.classList.remove('show');
        });
    }

    // ABRIR MODAIS
    const openButtons = document.querySelectorAll('.btn-open-modal');
    openButtons.forEach(button => { // para cada botão de abrir modal
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) { // ← proteção para evitar erros se o modal não existir
                if (modalId === 'modal-5') {
                    const turboModal = modal.querySelector('.turbo-modal');
                    const pagTurbo = modal.querySelector('.pagamento-turbo');
                    if (turboModal) turboModal.style.display = 'block';
                    if (pagTurbo) pagTurbo.style.display = 'none';
                    modal.style.background = '#1a1a2e';
                    atualizarIconeTurbo();
                }
                modal.showModal(); // método nativo para mostrar modais <dialog>
                document.body.classList.add('modal-open');// classe para evitar scroll do fundo
            }
        });
    });

    // MENU SUPERIOR SOME AO ROLAR
    const header = document.getElementById('header');
    if (header) {//usa o if para garantir que o código só tente acessar o header se ele existir, evitando erros em páginas sem header
        window.addEventListener
        
        ('scroll', function () {
            if (window.scrollY > 80) {//scrollY: distância em pixels que o documento foi rolado verticalmente
                header.classList.add('shrink'); //adiciona a classe 'shrink' ao header
            } else {
                header.classList.remove('shrink'); //remove a classe 'shrink' do header
            }
        });
    }

    // TROCA DE CARDS LOGIN → RECEBER CÓDIGO
    const forgotLink = document.querySelector('.forgot-password a');
    const emailBox = document.getElementById('email-forgot-password');
    const changeButton = document.querySelector('.change-button');
    const loginBox = document.getElementById('login');

    if (forgotLink && loginBox && emailBox && changeButton) {// ← proteção do bloco inteiro
        forgotLink.addEventListener('click', function (troca) {
            troca.preventDefault();
            loginBox.style.display = 'none';
            changeButton.style.display = 'none';
            emailBox.style.display = 'flex';

            //resete dos inputs
            loginBox.querySelectorAll('input').forEach(input => input.value = '');
        });
    }

    // TROCA DE CARDS RECEBER CÓDIGO → INSERIR CÓDIGO
    const btnreceberCodigo = document.getElementById('receber-codigo');
    const insertcodeBox = document.getElementById('insert-code');
    const inputEmail = document.getElementById('email_forgot');

    // FUNÇÃO GENÉRICA DE OTP
    function setupOTP(container) {
        if (!container) return;

        const inputs      = container.querySelectorAll('.otp-input');
        const continueBtn = container.querySelector('#continueBtn, .continueBtn');
        const resendBtn   = container.querySelector('#resendBtn, .resendBtn');
        const timerText   = container.querySelector('#timerText');

        if (!inputs.length) return;

        if (continueBtn) continueBtn.disabled = true;

        function checkCode() {
            if (!continueBtn) return;
            const code = Array.from(inputs).map(i => i.value).join('');
            continueBtn.disabled = code.length !== 5;
        }

        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                input.value = e.target.value.replace(/[^0-9]/g, '');
                if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
                checkCode();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
            });
        });

        container.addEventListener('paste', (e) => {
            const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
            inputs.forEach((input, i) => { input.value = paste[i] || ''; });
            checkCode();
        });

        // TIMER PARA REENVIO DE CÓDIGO
        let timeLeft = 60;
        let interval;

        function startTimer() {
            if (!resendBtn || !timerText) return;
            resendBtn.disabled = true;
            timeLeft = 60;
            clearInterval(interval);
            timerText.textContent = `Reenviar código em ${timeLeft}s`;
            interval = setInterval(() => {
                timeLeft--;
                timerText.textContent = `Reenviar código em ${timeLeft}s`;
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    timerText.textContent = '';
                    resendBtn.disabled = false;
                }
            }, 1000);
        }

        return {
            inputs, continueBtn, resendBtn, startTimer,
            getCode: () => Array.from(inputs).map(i => i.value).join(''),
            reset: () => {
                inputs.forEach(i => i.value = '');
                if (continueBtn) continueBtn.disabled = true;
                clearInterval(interval);
                if (timerText) timerText.textContent = '';
            }
        };
    }

    // inicializa um OTP para cada contexto
    const insertCodeModal = document.querySelector('#modal-1 #insert-code') 
        || document.querySelector('#insert-code:not(#modal-3 #insert-code)');
    const otpLogin = insertCodeModal ? setupOTP(insertCodeModal) : null;

    const modal3 = document.getElementById('modal-3');
    const otpDelete = modal3 ? setupOTP(modal3) : null;

    // reenvio — login
    if (otpLogin?.resendBtn) {
        otpLogin.resendBtn.addEventListener('click', () => {
            fetch(base_url +'/resend', { method: 'GET', headers: { 'Content-Type': 'application/json', "X-CSRFToken":csrfToken } })
            .then(r => r.json()).then(data => mostrarToast(data.mensagem, data.status));
        });
    }

    // reenvio — excluir conta
    if (otpDelete?.resendBtn) {
        otpDelete.resendBtn.addEventListener('click', () => {
            fetch(base_url +'/resend', { method: 'GET', headers: { 'Content-Type': 'application/json' } })
            .then(r => r.json()).then(data => mostrarToast(data.mensagem, data.status));
        });
    }

    // BOTÃO REDEFINIR SENHA — desabilitado até senhas válidas e iguais
    const btnRedefinir = document.getElementById('backLogin');
    const newPwInput1 = document.querySelector('#new-password .password1');
    const newPwInput2 = document.querySelector('#new-password .password2');
    const newPwErro1 = document.querySelector('#new-password .erroSenha');
    const newPwErro2 = document.querySelector('#new-password .erroSenha2');

    if (btnRedefinir && newPwInput1 && newPwInput2) {
        btnRedefinir.disabled = true; // começa desabilitado

        // função para verificar se as senhas são válidas e iguais, habilitando ou desabilitando o botão de redefinir senha
        function checkRedefinir() {
            const senha1ok = newPwInput1.value.length >= 5;
            const senha2ok = newPwInput2.value.length >= 5;
            const iguais = newPwInput1.value === newPwInput2.value;
            btnRedefinir.disabled = !(senha1ok && senha2ok && iguais);
        }

        newPwInput1.addEventListener('input', () => {
            // esconde erro enquanto digita
            if (newPwErro1) newPwErro1.style.display = 'none';
            newPwInput1.classList.remove('input-erro');
            checkRedefinir();
        });

        newPwInput2.addEventListener('input', () => {
            // esconde erro enquanto digita
            if (newPwErro2) newPwErro2.style.display = 'none';
            newPwInput2.classList.remove('input-erro');
            checkRedefinir();
        });

        newPwInput1.addEventListener('blur', () => {
            if (newPwInput1.value.length > 0 && newPwInput1.value.length < 5) {
                if (newPwErro1) newPwErro1.style.display = 'block';
                newPwInput1.classList.add('input-erro');
            }
            checkRedefinir();
        });

        newPwInput2.addEventListener('blur', () => {
            if (newPwInput2.value && newPwInput1.value !== newPwInput2.value) {
                if (newPwErro2) newPwErro2.style.display = 'block';
                newPwInput2.classList.add('input-erro');
            }
            checkRedefinir();
        });
    }

    // BOTÃO VOLTAR — volta para a tela anterior, ou para o login se estiver na tela de nova senha
    const newpasswordBox = document.getElementById('new-password');
    document.querySelectorAll('.back-arrow-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            // se estiver na tela de nova senha, vai direto pro login
            const newPwVisible = newpasswordBox && newpasswordBox.style.display === 'flex';
            if (newPwVisible) {
                telaAtual.historico = []; // limpa histórico
                telaAtual.ir('login');
                if (changeButton) changeButton.style.display = '';
                return;
            }
            telaAtual.voltar();
            if (telaAtual.historico.length === 0 && changeButton) {
                changeButton.style.display = '';
            }
        });
    });

    // MÁSCARA CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function (maskCpf) {
            let mc = maskCpf.target.value.replace(/\D/g, '');
            if (mc.length > 11) mc = mc.slice(0, 11);//remove qualquer caractere que não seja um dígito e limita a 11 dígitos (tamanho do CPF)
            mc = mc.replace(/^(\d{3})(\d)/, '$1.$2');//adiciona um ponto após os primeiros 3 dígitos
            mc = mc.replace(/(\d{3})(\d)/, '$1.$2');//adiciona um ponto após os próximos 3 dígitos
            mc = mc.replace(/(\d{3})(\d{1,2})$/, '$1-$2');//adiciona um hífen antes dos últimos 2 dígitos
            maskCpf.target.value = mc;//atualiza o valor do input com a máscara aplicada
        });
    }

    // MÁSCARA DATA DE NASCIMENTO
    const nascInput = document.getElementById('data-nascimento');
    if (nascInput) {
        nascInput.addEventListener('input', function (maskNasc) {
            let mn = maskNasc.target.value.replace(/\D/g, '');
            if (mn.length > 8) mn = mn.slice(0, 8);
            mn = mn.replace(/^(\d{2})(\d)/, '$1/$2');
            mn = mn.replace(/(\d{2})(\d)/, '$1/$2');
            mn = mn.replace(/(\d{4})(\d)/, '$1/$2');
            maskNasc.target.value = mn;
        });
    }

    // LIMITES DE IDADE
    const erroIdade = document.getElementById('erroIdade');
    function calcularIdade() {
        if (!nascInput || !erroIdade) return null;
        const valor = nascInput.value;
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return null;//verifica se a data está no formato DD/MM/AAAA, retornando null se não estiver
        const [dia, mes, ano] = valor.split('/').map(Number);//divide a data em dia, mês e ano, convertendo cada parte para número
        //split('/') é usado para dividir a string da data em um array de três partes (dia, mês e ano) usando a barra como separador
        //map(Number) é usado para converter cada parte da data de string para número, permitindo cálculos posteriores
        const nascimento = new Date(ano, mes - 1, dia);//cria um objeto Date para a data de nascimento, ajustando o mês (mes - 1) porque os meses em JavaScript são indexados a partir de 0 (0 = janeiro, 1 = fevereiro, etc.)
        const hoje = new Date();//cria um objeto Date para a data atual
        let idade = hoje.getFullYear() - nascimento.getFullYear();//calcula a idade básica subtraindo o ano de nascimento do ano atual
        const m = hoje.getMonth() - nascimento.getMonth();//calcula a diferença de meses entre a data atual e a data de nascimento
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;//ajusta a idade se o mês atual for anterior ao mês de nascimento ou se for o mesmo mês mas o dia atual for anterior ao dia de nascimento
        return idade;//retorna a idade calculada, ou null se a data de nascimento for inválida ou não estiver no formato correto
    }

    //função para validar a idade do usuário, exibindo uma mensagem de erro se for menor de 18 anos e aplicando uma classe de erro ao input
    function validarIdade() {
        let valorIdade = calcularIdade();//chama a função calcularIdade para obter a idade do usuário com base na data de nascimento inserida
        if (valorIdade === null) return false;
        if (valorIdade < 18) {
            erroIdade.style.display = 'block';
            nascInput.classList.add('input-erro');
            return false;
        }
        erroIdade.style.display = 'none';
        nascInput.classList.remove('input-erro');
        return true;
    }

    if (nascInput && erroIdade) {
        nascInput.addEventListener('blur', validarIdade);
        nascInput.addEventListener('input', () => {
            erroIdade.style.display = 'none';
            nascInput.classList.remove('input-erro');
        });
    }

    // VALIDAÇÃO DE SENHA
    const passwordBox = document.querySelectorAll('.password-box');
    passwordBox.forEach(passBox => {
        const senhaInput = passBox.querySelector('.password');
        const erroSenha = passBox.querySelector('.erroSenha');
        if (!senhaInput || !erroSenha) return;
        senhaInput.addEventListener('blur', () => validarSenha(senhaInput, erroSenha));//adiciona um evento de blur (quando o input perde o foco) para validar a senha quando o usuário terminar de digitar
        senhaInput.addEventListener('input', () => {
            erroSenha.style.display = 'none';
            senhaInput.classList.remove('input-erro');
        });
    });

    function validarSenha(senhaInput, erroSenha) {
        if (!senhaInput || !erroSenha) return true;
        if (senhaInput.value.length >= 5 || senhaInput.value === '') {
            erroSenha.style.display = 'none';
            senhaInput.classList.remove('input-erro');
            return true;
        }
        erroSenha.style.display = 'block';
        senhaInput.classList.add('input-erro');
        return false;
    }

    // CONFIRMAÇÃO DE SENHA
    const erroSenha2 = document.querySelector('.erroSenha2');

    //função para validar se a senha de confirmação é igual à senha original, exibindo uma mensagem de erro e aplicando uma classe de erro ao input de confirmação se as senhas não coincidirem
    function confirmarSenha(senhaInput1,senhaInput2,erroSenha2) {
        if (!senhaInput1 || !senhaInput2 || !erroSenha2) return true;
        if (senhaInput2.value === '' || senhaInput1.value === senhaInput2.value) {
            erroSenha2.style.display = 'none';
            senhaInput2.classList.remove('input-erro');
            return true;
        }
        erroSenha2.style.display = 'block';
        senhaInput2.classList.add('input-erro');
        return false;
    }

    function setupConfirmarSenha(senhaInput1,senhaInput2,erroSenha2) {
        if (senhaInput1 && senhaInput2 && erroSenha2) {
            senhaInput2.addEventListener('blur', confirmarSenha);
            senhaInput2.addEventListener('input', () => {
                erroSenha2.style.display = 'none';
                senhaInput2.classList.remove('input-erro');
            });
            return true; 
        }
    }
    

    // Toast é um aviso que desaparece rapidamente, não precisa apertar no X para sairrrr :)
    function mostrarToast(mensagem, tipo) {
    const toasts = document.querySelectorAll('.toast'); 
        toasts.forEach(toast => {
            toast.textContent = mensagem;
            
            
            toast.classList.add('show');
            toast.classList.add(tipo); 

            setTimeout(() => {
                toast.classList.remove('show');
                toast.classList.remove(tipo);
            }, 4000);
        });
    }

    // Função para mostrar o cpf
    function info_user_CPF(cpf) {
        const mostra = document.getElementById('show_cpf');
        if (!cpf || !mostra) return ;
        mostra.textContent = cpf;
    }

    function show_seguindo(seguindo) {
        const mostra = document.getElementById('show_seguindo');
        if (!mostra) return;
        mostra.textContent = seguindo;
    }

    function show_seguidores(seguidores) {
        const mostra = document.getElementById('show_seguidores');
        if (!mostra) return;
        mostra.textContent = seguidores;
    }

    // função para mostrar nome
    function info_user_name(user_name) {
        const mostra = document.querySelectorAll('.show_name');
        if (!user_name || !mostra) return ;
        mostra.forEach(mostra => {
            mostra.textContent = user_name;
        })
    }
    // função para mostrar email
    function info_user_email(email) {
        const mostra = document.getElementById('show_email');
        if (!email || !mostra) return ;
        mostra.textContent = email;
    }

    // função para mostrar data de nascimento
    function info_user_data(data) {
        const mostra = document.getElementById('show_data');
        if (!data || !mostra) return ;
        mostra.textContent = data ;
    }

    // função para mascara do cpf, assim ele fica protegito 
    function mascara_CPF_config(cpf) {
        if (!cpf) return ;
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
    }

    function atualizarAvatarDropdown(fotoUrl) {
        // avatar no li do dropdown (substitui TUDO dentro do background-avatar)
        const bgAvatar = document.querySelector('#dropdown-usuario .background-avatar');
        if (bgAvatar) {
            bgAvatar.innerHTML = `<img src="${fotoUrl}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;display:block;" alt="avatar">`;
        }

        // ícone do botão btn-dropdown — substitui TODOS os <i> e <img> antigos
        const btnDropdown = document.getElementById('btn-dropdown');
        if (btnDropdown) {
            // remove qualquer ícone ou imagem de avatar que já exista ali dentro
            btnDropdown.querySelectorAll('i.menu-icon, img.avatar-btn-dropdown').forEach(el => el.remove());

            const img = document.createElement('img');
            img.src = fotoUrl;
            img.className = 'avatar-btn-dropdown';
            img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;';
            btnDropdown.appendChild(img);
        }
    }

    // função que pega as informações da api e relaciona com oS htmls
    function info_user(data) {
        if (!data) return;
        let cpf = mascara_CPF_config(data.cpf);
        info_user_CPF(cpf);
        info_user_data(data.data);
        info_user_email(data.email);
        info_user_name(data.name);
        const bioPag  = document.getElementById('bio-usuario');
        const bioDesc = document.getElementById('description-channel');
        if (bioPag && data.bio)  bioPag.textContent  = data.bio;
        if (bioDesc && data.bio) bioDesc.textContent = data.bio;

        if (data.foto) {
            const fotoPerfilPag = document.querySelector('.photo-user');
            if (fotoPerfilPag) {
                fotoPerfilPag.src = data.foto;
                fotoPerfilPag.classList.add('tem-foto');
            }
            atualizarAvatarDropdown(data.foto);
        }
    }

    function incritos_info(id_user) {
        const dado = {
            id: id_user 
        };

        fetch(base_url +"/inscritos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify(dado)
        })
        .then(async res => {
            const data = await res.json();
            if (data.status !== 'success') return; 
            console.log(data.seguidores);
            show_seguidores(data.seguidores);
            show_seguindo(data.seguindo);
            
            const btnSeguir = document.getElementById('btn-seguir-visitante');
            if (btnSeguir && typeof data.seguindo_eu === 'boolean') {
                btnSeguir.textContent = data.seguindo_eu ? 'Seguindo' : 'Seguir';
                btnSeguir.classList.toggle('ativo', data.seguindo_eu);
            }
        })
    }

    // FUNÇÃO PARA FECHAR MODAL E RESETAR FORMULÁRIO
    function fecharModal(form) {

        const dialog = form.closest('dialog');

        if (dialog) {
            dialog.close();
            document.body.classList.remove('modal-open');
        }

        form.reset();
    }

    // função que retorna o código inserido nos inputs de OTP como uma string concatenada
    function codigoInserido() {
        const inputs = document.querySelectorAll('.otp-input');
        if (inputs.length === 0) return null;
        return Array.from(inputs).map(i => i.value).join('');
        
    }

    // ENVIO DOS FORMS
    // para cada form, adiciona um listener de submit que previne o envio padrão e faz validações antes de enviar os dados via fetch
    document.querySelectorAll('.forms').forEach(form => {
        const senha1 = form.querySelector('.password1');
        const senha2 = form.querySelector('.password2');
        const erro = form.querySelector('.erroSenha2');

        setupConfirmarSenha(senha1,senha2,erro)
        form.addEventListener('submit', function (validarForm) {
            validarForm.preventDefault();

            const dialog = form.closest('dialog');
            if (dialog && !dialog.open) return;

            if (!form.classList.contains('email-forgot-password')) {
                console.log('começou')
                let envio = true;
                const inputsVisiveis = Array.from(form.querySelectorAll('input[required]'))
                    .filter(input => input.offsetParent !== null);
                const todosValidos = inputsVisiveis.every(input => input.checkValidity());
                if (!todosValidos) envio = false;
                if (form.querySelector('#data-nascimento') && !validarIdade()) envio = false;
                if (form.querySelector('.password2')) {
                    if (!confirmarSenha(senha1,senha2,erro)) {
                        envio = false;    
                    }
                } 
                form.querySelectorAll('.password-box').forEach(box => {
                    const senhaInput = box.querySelector('.password');
                    const erroSenha = box.querySelector('.erroSenha');
                    if (!validarSenha(senhaInput, erroSenha)) envio = false;
                });
                if (!envio) {
                    inputsVisiveis.forEach(input => {
                        if (!input.checkValidity()) input.reportValidity();
                    });
                    console.log("572")
                    return;
                }
            } 
            
            // CADASTRO
            if (form.classList.contains('sign')) {
                if (document.getElementById('cadastro').offsetParent === null) return;
                
                const captcha = (captchaWidgetId !== null) ? grecaptcha.getResponse(captchaWidgetId) : '';
                if (!captcha) {
                    mostrarToast('Por favor, marque a caixa "Não sou um robô"', 'error');
                    return;
                }
                
                const dados = {
                    cpf: document.getElementById("cpf").value,
                    email: document.getElementById("email").value,
                    user_name: document.getElementById("user-cadastro").value,
                    data_nascimento: document.getElementById("data-nascimento").value,
                    senha: document.getElementById("senha").value,
                    captcha: captcha
                };
                
                
                fetch(base_url +"/signin", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken
                    },
                    body: JSON.stringify(dados)
                })
                .then(async res => {
                    // FIX: erro 500/4xx não tem o formato {status, mensagem} esperado —
                    // trata como erro genérico antes de tentar fazer .json()
                    if (!res.ok) {
                        let msg = 'Erro ao cadastrar. Tente novamente.';
                        try {
                            const errData = await res.json();
                            if (errData.mensagem) msg = errData.mensagem;
                        } catch {}
                        mostrarToast(msg, 'error');
                        resetarCaptcha();
                        return null; // sinaliza que não deve continuar pro login
                    }
                    return res.json();
                })
                .then(data => {
                    if (!data) return; // erro já tratado acima

                    if (data.status == 'error') {
                        mostrarToast(data.mensagem, data.status);
                        resetarCaptcha();
                    } else {
                        const dado = {
                            username_email: dados['user_name'],
                            senha: dados['senha']
                        };

                        fetch(base_url +"/login", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-CSRFToken": csrfToken
                            },
                            body: JSON.stringify(dado)
                        })
                        .then(async res => {
                            if (!res.ok) {
                                mostrarToast('Cadastro feito, mas o login automático falhou. Faça login manualmente.', 'error');
                                return null;
                            }
                            return res.json();
                        })
                        .then(data => {
                            if (!data) return;
                            if (data.status == 'error') {
                                mostrarToast(data.mensagem, data.status);
                            } else {
                                fecharModal(form);
                                verificarSessao();
                            }
                        });
                    }
                })
                .catch(() => {
                    mostrarToast('Erro de conexão com o servidor.', 'error');
                    resetarCaptcha();
                });
            }

            // LOGIN
            if (form.classList.contains('login')) {
                const dados = {
                    username_email: document.getElementById('user_email').value,
                    senha: document.getElementById('senha_login').value
                }

                fetch(base_url +"/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken":csrfToken
                },
                body: JSON.stringify(dados)
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status == 'error'){
                        mostrarToast(data.mensagem, data.status)
                    } else {
                        fecharModal(form);
                        verificarSessao();
                        
                    }
                });
            }

            if (form.classList.contains('email-forgot-password')) {
                console.log('aaa');
                const dados = {
                    email: document.getElementById('email_forgot').value,
                    who: 'forgot_password'
                };
                console.log('aaa');
                fetch(base_url +"/forgot", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken":csrfToken },
                    body: JSON.stringify(dados)
                })
                .then(res => res.json())
                .then(data => {
                    mostrarToast(data.mensagem, data.status);

                    if (data.status === 'success') {
                        telaAtual.avancar('email', 'codigo');
                        emailBox.querySelectorAll('input').forEach(input => input.value = '');
                        btnreceberCodigo.disabled = true;
                        if (otpLogin) { otpLogin.reset(); otpLogin.startTimer(); } // ← só isso
                    }
                });
            }

            // INSERIR CÓDIGO
            if (form.classList.contains('insert-code')) {
                const otp = form.closest('#modal-3') ? otpDelete : otpLogin;
                const codigo = otp ? otp.getCode() : '';

                fetch(base_url +"/check_codigo", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', "X-CSRFToken":csrfToken},
                    body: JSON.stringify({ codigo })
                })
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'error') { mostrarToast(data.mensagem, data.status); return; }
                    mostrarToast(data.mensagem, data.status);

                    if (form.closest('#modal-3')) {
                        // fluxo de excluir conta: valida código e deleta
                        fetch(base_url +"/delete", {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                        })
                        .then(r => r.json())
                        .then(data => {
                            mostrarToast(data.mensagem, data.status);
                            if (data.status !== 'error') { verificarSessao(); window.location.href = '/'; }
                        });
                    } else {
                        // fluxo de redefinir senha: avança para nova senha
                        telaAtual.avancar('codigo', 'senha');
                        if (otp) otp.reset();
                    }
                });
            }

            // NOVA SENHA
            if (form.classList.contains('new-password')) {
                const dados = {
                    nova_senha: form.querySelector('.password2').value
                }

                fetch(base_url +"/redefine_password", {
                method:"PUT",
                headers: {
                    "Content-Type":"application/json",
                    "X-CSRFToken":csrfToken
                },
                body: JSON.stringify(dados)
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status == 'error'){
                        mostrarToast(data.mensagem, data.status)
                        return 
                    } 
                    mostrarToast(data.mensagem, data.status)
                    mostrarToast(data.mensagem, data.status);

                    newpasswordBox.style.display = 'none';
                    loginBox.style.display = 'flex';
                    changeButton.style.display = 'flex';
                    newpasswordBox.querySelectorAll('input').forEach(input => input.value = '');
                    fecharModal(form);
                });

            }

            // ATUALIZAR SENHA
            if (form.classList.contains('form-new-password')) {
                const dados = {
                    senha_nova: form.querySelector('.password2').value,
                    senha_antiga: form.querySelector('.password-atual').value
                }
            
                fetch(base_url +"/update", {
                method:"PUT",
                headers: {
                    "Content-Type":"application/json",
                    "X-CSRFToken":csrfToken
                },
                body: JSON.stringify(dados)
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status == 'error'){
                        mostrarToast(data.mensagem, data.status)
                        return 
                    } 
                    mostrarToast(data.mensagem, data.status)
                    fecharModal(form)
                });
            }
        });
    });

    // BOTÃO DE EXCLUIR CONTA
    const btnDeleteAccount = document.querySelector(".btn-delete-code");
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener("click", function() {
            const dados = {
                email: document.getElementById("show_email").textContent,
                who: 'delete_account'
            };

            fetch(base_url +"/forgot", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRFToken":csrfToken },
                body: JSON.stringify(dados)
            })
            .then(res => res.json())
            .then(data => {
                mostrarToast(data.mensagem, data.status);
                
                let delete_code = 'error';

                if (data.status === 'success') {
                    let delete_code = 'success';
                    wrapperDelete.style.display = 'none';
                    const insertCodeDelete = modal3 ? modal3.querySelector('#insert-code') : null;
                    if (insertCodeDelete) insertCodeDelete.style.display = 'flex';
                    if (otpDelete) { otpDelete.reset(); otpDelete.startTimer(); }
                }
            });
        });
    }

    //botão de voltar tela no modal Login
    // NAVEGAÇÃO COM HISTÓRICO NOS MODAIS
    const telaAtual = {
        historico: [], // pilha de telas anteriores

        // mapa de id → elemento
        telas: {
            'login': document.getElementById('login'),
            'email': document.getElementById('email-forgot-password'),
            'codigo': document.getElementById('insert-code'),
            'senha': document.getElementById('new-password'),
        },

        ir(para) {
            // esconde todas
            Object.values(this.telas).forEach(t => { if (t) t.style.display = 'none'; });
            // mostra a destino
            if (this.telas[para]) this.telas[para].style.display = 'flex';
        },

        avancar(de, para) {
            this.historico.push(de); // guarda de onde veio
            this.ir(para);
        },

        voltar() {
            const anterior = this.historico.pop();
            if (anterior) this.ir(anterior);
        }
    };
    // back arrows
    document.querySelectorAll('.back-arrow-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            telaAtual.voltar();
            // se voltou pro login, mostra o changeButton de novo
            if (telaAtual.historico.length === 0 && changeButton) {
                changeButton.style.display = '';
            }
        });
    });
    
    // botão "Esqueci minha senha" no modal de login
    if (forgotLink) {
        forgotLink.addEventListener('click', e => {
            e.preventDefault();
            loginBox.querySelectorAll('input').forEach(i => i.value = '');
            if (changeButton) changeButton.style.display = 'none';
            telaAtual.avancar('login', 'email');
        });
    }

    // botão "Receber código" no modal de email
    if (btnreceberCodigo && insertcodeBox && inputEmail) {
        inputEmail.addEventListener('input', function () {
            btnreceberCodigo.disabled = !inputEmail.checkValidity();
        });
        btnreceberCodigo.disabled = true;

        btnreceberCodigo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!inputEmail.checkValidity()) return;
            const dados = {
                email: inputEmail.value,
                who: 'forgot_password'
            };
            fetch(base_url +"/forgot", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                body: JSON.stringify(dados)
            })
            .then(res => res.json())
            .then(data => {
                mostrarToast(data.mensagem, data.status);
                if (data.status === 'success') {
                    telaAtual.avancar('email', 'codigo');
                    inputEmail.value = '';
                    btnreceberCodigo.disabled = true;
                    if (otpLogin) { otpLogin.reset(); otpLogin.startTimer(); }
                }
            });
        });
    }
    
    //botão para fechar os modais
    const closeButtons = document.querySelectorAll('.btn-close-modal');

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {//=> : é uma função anônima, mais curta que function(){} e mantém o contexto de 'this'
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            const continueBtn = document.getElementById('continueBtn');
            if (modal) {  // ← proteção
                modal.close();
                // reseta modal-6 (live)
                if (modalId === 'modal-6') {
                    const nomeInput  = document.getElementById('nome-live');
                    const descInput  = document.getElementById('descricao-live');
                    const labelArq   = document.getElementById('label-video-escolhido');
                    const prevThumb  = document.getElementById('preview-thumb');
                    const vidInput   = document.getElementById('video-live');
                    const thumbInput = document.getElementById('upload-thumb');

                    if (nomeInput)  nomeInput.value  = '';
                    if (descInput)  descInput.value  = '';
                    if (vidInput)   vidInput.value   = '';
                    if (thumbInput) thumbInput.value = '';
                    if (labelArq)  { labelArq.textContent = ''; labelArq.style.display = 'none'; }
                    if (prevThumb) {
                        prevThumb.src = '';
                        prevThumb.style.backgroundColor = '#000';
                        prevThumb.classList.remove('tem-foto');
                    }
                    thumbTemp = null;
                    thumbFile = null;

                    document.querySelectorAll('#select-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
                    const tags = document.getElementById('selected-tags');
                    const ph   = document.getElementById('select-placeholder');
                    const btn  = document.getElementById('btn-select-cat');
                    const dropEl = document.getElementById('select-dropdown');
                    if (tags)  tags.innerHTML = '';
                    if (ph)    ph.textContent = 'Selecione categorias...';
                    if (btn)   btn.classList.remove('open');
                    if (dropEl) dropEl.classList.remove('open');
                }
                document.body.classList.remove('modal-open');

                // limpa todos os inputs do modal ao fechar
                modal.querySelectorAll('input').forEach(input => {
                    if (input.type !== 'checkbox' && input.type !== 'radio') input.value = '';
                })
                if (btnRedefinir) {btnRedefinir.disabled = true;} // reseta ao fechar}
                modal.querySelectorAll('.erroSenha, .erroSenha2, #erroIdade').forEach(el => el.style.display = 'none');
                modal.querySelectorAll('.input-erro').forEach(el => el.classList.remove('input-erro'));
                if (continueBtn) continueBtn.disabled = true;
                if (btnreceberCodigo) btnreceberCodigo.disabled = true;

                // <- volta sempre para o lado do login ao fechar o modal
                if (loginBox) {loginBox.style.display = ''};
                if (emailBox) {emailBox.style.display = 'none'};
                if (insertcodeBox) {insertcodeBox.style.display = 'none' };
                if (newpasswordBox) {newpasswordBox.style.display = 'none' };
                if (changeButton) {changeButton.style.display = ''}

                //volta o checkbox do flip para login
                const checkbox = document.getElementById('checkbox');
                if (checkbox) checkbox.checked = false;

                resetarCaptcha();
            }
        });
    });

    // FLIP LOGIN ↔ CADASTRO — limpa inputs dos dois lados
    const checkbox = document.getElementById('checkbox');
        //let captchaRendered = false;

        if (checkbox) {
            checkbox.addEventListener('change', () => { 
                document.getElementById('wrap').querySelectorAll('input').forEach(input => input.value = '');
                document.querySelectorAll('.erroSenha, .erroSenha2, #erroIdade').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.input-erro').forEach(el => el.classList.remove('input-erro'));

                if (checkbox.checked) renderizarCaptcha(); 
            });
        }

    // BOTÃO CADASTRAR — desabilitado até tudo preenchido, checkbox marcado e CAPTCHA feito
    const formSign = document.querySelector('.sign');
    if (formSign) {
        const btnCadastrar = formSign.querySelector('.btn-wrapper');
        const checkTermos = document.getElementById('checkbox-accept');
        const camposSign = formSign.querySelectorAll('input[required]');

        btnCadastrar.disabled = true;

        function checkCadastro() {
            const todoPreenchido = Array.from(camposSign).every(i => i.value.trim() !== '');
            btnCadastrar.disabled = !(todoPreenchido && checkTermos?.checked);
        }

        camposSign.forEach(i => i.addEventListener('input', checkCadastro));
        if (checkTermos) checkTermos.addEventListener('change', checkCadastro);
    }

    // BOTÃO ENTRAR — desabilitado até usuário e senha preenchidos
    const formLogin = document.querySelector('.login.forms');
    if (formLogin) {
        const btnEntrar = formLogin.querySelector('.btn-wrapper');
        const camposLogin = formLogin.querySelectorAll('input[required]');

        btnEntrar.disabled = true;

        function checkLogin() { 
            btnEntrar.disabled = !Array.from(camposLogin).every(i => i.value.trim() !== '');
        }
        camposLogin.forEach(i => i.addEventListener('input', checkLogin));
    }

    // MENU LATERAL
    const backAside = document.querySelectorAll('.back-aside');
    const normalAside = document.querySelectorAll('.normal-aside');
    const iconPageAside = document.querySelectorAll('.pages-icon-aside');
    const spanPageAside = document.querySelectorAll('.span-link-aside');
    const asideContent = document.querySelectorAll('.aside-content');
    if (backAside && normalAside && iconPageAside && spanPageAside) {  // ← proteção (moon.html não tem aside)
        let asideOpen = true;

        backAside.forEach(bA => bA.addEventListener('click', () => {
      
            if (asideOpen) {
                normalAside.forEach(aside => aside.style.width = '5%');
                spanPageAside.forEach(span => span.style.display = 'none');
                asideContent.forEach(cont => cont.style.display = 'none');
                iconPageAside.forEach(icon => icon.style.fontSize = '2.5em');
                bA.style.transform = 'rotateY(180deg)';
            } else {
                normalAside.forEach(aside => aside.style.width = '20%');
                spanPageAside.forEach(span => span.style.display = 'flex');
                asideContent.forEach(cont => cont.style.display = 'flex');
                iconPageAside.forEach(icon => icon.style.fontSize = '1.4em');
                bA.style.transform = 'rotateY(0deg)';
            }
            asideOpen = !asideOpen;//alterna o estado do menu lateral entre grande e pequeno a cada clique
        }));
    }

    //MENU DROPDOWN
    const btnDropdown = document.getElementById('btn-dropdown');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (btnDropdown && dropdownMenu) {
        btnDropdown.addEventListener('click', (e) => {
            e.stopPropagation(); //evita que o clique feche o menu imediatamente
            dropdownMenu.classList.toggle('show');
        });

        //fecha ao clicar fora
        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && e.target !== btnDropdown) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    //IDIOMAS - TRADUÇÕES
    const languageItem = document.getElementById('language-item');
    const languageSubmenu = document.getElementById('language-submenu');
    const arrowLanguage = document.querySelectorAll('.arrow-language');

    // substitui o listener do language-item
    if (languageItem && languageSubmenu && arrowLanguage) {
        languageItem.addEventListener('click', (e) => {

            if (e.target.closest('.language-option')) {
                const btn = e.target.closest('.language-option');
                putLanguage(btn.dataset.lang);
                languageSubmenu.classList.remove('show');
                dropdownMenu.classList.remove('show');
                // fecha → gira de volta
                arrowLanguage.forEach(arrow => arrow.style.transform = 'rotate(0deg)');
                return;
            }

            e.stopPropagation();
            const abrindo = !languageSubmenu.classList.contains('show');
            languageSubmenu.classList.toggle('show');
            // gira conforme estado
            arrowLanguage.forEach(arrow => {
                arrow.style.transform = abrindo ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        });

        // fecha também quando o dropdown fechar
        document.addEventListener('click', () => {
            languageSubmenu.classList.remove('show');
            arrowLanguage.forEach(arrow => arrow.style.transform = 'rotate(0deg)');
        });
    }      

    const btnTema = document.querySelectorAll('.btn-tema');
    if (btnTema) {
        // aplica tema salvo ao carregar
        const temaSalvo = localStorage.getItem('witch-tema') || 'claro';
        document.documentElement.setAttribute('data-tema', temaSalvo === 'escuro' ? 'escuro' : '');
        btnTema.forEach((btn) => {
            btn.checked = temaSalvo === 'escuro';
        });

        btnTema.forEach((btn) => {
            btn.addEventListener('change', () => {
                const escuro = btn.checked;
                document.documentElement.setAttribute('data-tema', escuro ? 'escuro' : '');
                localStorage.setItem('witch-tema', escuro ? 'escuro' : 'claro');
            });
        });
    }

    //----------------MOON--------------------
    // CARROUSSEL 
    const carousel = document.querySelector('.carousel-wrap');
    const track = document.getElementById('track');
    if (carousel && track) {
        const dots = document.querySelectorAll('.dot');
        const total = 3;//total de slides no carrossel, usado para calcular o índice do slide atual e garantir que o carrossel funcione em loop (voltando ao primeiro slide após o último)
        let current = 0;//variável para rastrear o índice do slide atual, iniciando em 0 (primeiro slide)

        //função para navegar para um slide específico
        function goTo(i) {
            current = (i + total) % total;//calcula o índice do slide atual usando módulo para garantir que o índice fique dentro do intervalo de 0 a total-1, permitindo que o carrossel funcione em loop
            const slideWidth = track.children[0].offsetWidth;//obtém a largura de um slide (assumindo que todos os slides têm a mesma largura) para calcular a distância de deslocamento necessária para mostrar o slide correto
            //track.children[0] é usado para acessar o primeiro slide dentro do track
            // offsetWidth é usado para obter a largura total do slide, incluindo bordas e margens
            track.style.transform = `translateX(-${current * slideWidth}px)`;//aplica uma transformação CSS para deslocar o track horizontalmente, movendo-o para a esquerda em uma distância proporcional ao índice do slide atual multiplicado pela largura do slide, mostrando assim o slide correto
            dots.forEach((d, idx) => d.classList.toggle('active', idx === current));//atualiza a classe 'active' nos pontos de navegação, destacando o ponto correspondente ao slide atual e removendo a classe dos outros pontos
            //toggle: alterna a classe 'active' em cada ponto, adicionando-a se o índice do ponto for igual ao índice do slide atual (idx === current) e removendo-a caso contrário
        }

        document.getElementById('prev').addEventListener('click', () => goTo(current - 1));//evento de clique para o botão de slide anterior, que chama a função goTo com o índice do slide atual decrementado em 1, navegando para o slide anterior
        document.getElementById('next').addEventListener('click', () => goTo(current + 1));
        dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.i)));//evento de clique para cada ponto de navegação, que chama a função goTo com o índice do slide correspondente ao ponto clicado, permitindo que o usuário navegue diretamente para um slide específico
        window.addEventListener('resize', () => goTo(current));//evento de resize para garantir que o carrossel se ajuste corretamente quando a janela for redimensionada, recalculando a posição do slide atual com base na nova largura dos slides
    }

    //---------------CONFIGURAÇÕS ---------------
    // NAVEGAÇÃO ENTRE SEÇÕES DE CONFIGURAÇÃO
    const configNav = document.querySelectorAll('.nav-config a');
    const configSections = document.querySelectorAll('.section-config');

    if (configNav.length > 0) {
        //marca o primeiro link como ativo por padrão
        configNav[0].classList.add('active');

        configNav.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                //remove active de todos
                configNav.forEach(l => l.classList.remove('active'));
                configSections.forEach(s => s.classList.remove('active'));

                //adiciona active no link clicado e na section correspondente
                link.classList.add('active');
                document.getElementById(link.dataset.target).classList.add('active');
            });
        });
    }

    // EXCLUIR CONTA 
    const btnDeleteCode = document.querySelector('.btn-delete-code');
    const wrapperDelete = document.getElementById('wrapper-delete');
    if (btnDeleteCode && wrapperDelete) {
        btnDeleteCode.addEventListener('click', () => {
            wrapperDelete.style.display = 'none';
            const insertCodeDelete = modal3 ? modal3.querySelector('#insert-code') : null;
            if (insertCodeDelete) insertCodeDelete.style.display = 'flex';
            if (otpDelete) { otpDelete.reset(); otpDelete.startTimer(); }
        });
    }

    // botão de voltar tela no modal de exclusão de conta
    const btnBackDelete = document.querySelector('.back-modal-delete');
    if (btnBackDelete) {
        btnBackDelete.addEventListener('click', () => {
            insertcodeBox.style.display = 'none';
            wrapperDelete.style.display = 'flex';
        });
    }

    //ABA DE PRIVACIDADE (USERS BLOQUEADOS)
    const blockInput = document.getElementById('block-input');
    const blockBtn = document.getElementById('block-btn');
    const toggleBtn = document.getElementById('toggle-blocked');
    const toggleIcon = document.getElementById('toggle-icon');
    const listWrap = document.getElementById('blocked-list-wrap');
    const listInner = document.getElementById('blocked-list-inner');
    const blockedTable = document.getElementById('blocked-table');
    const blockBody = document.getElementById('blocked-body');
    const blockEmpty = document.getElementById('blocked-empty');

    let blockUsers = []; 

    if (blockBtn) {
        let isOpen = false; //controla pra saber se o dropdown tá aberto
        
        //funçõ para montar a tabela dos users bloquados
        function renderTable() {
            blockBody.innerHTML = ''; //limpa linhas antigas

            if (blockUsers.length === 0) {
                //se não houver user bloqueado, aparece mensagem
                blockEmpty.style.display = 'block';
                blockedTable.style.display = 'none';
            } else {
                blockEmpty.style.display = 'none';
                blockedTable.style.display = 'table';

                blockUsers.forEach((usuario, index) => {
                    //cria uma linha na table pra cada user
                    const tr = document.createElement('tr');

                    const td1 = document.createElement('td');
                    td1.textContent = usuario.nome;

                    const td2 = document.createElement('td');
                    td2.textContent = usuario.data;

                    const td3 = document.createElement('td');
                    const btnUnblock = document.createElement('button');
                    btnUnblock.className = 'unblock-btn';
                    btnUnblock.dataset.index = index;
                    btnUnblock.textContent = 'Desbloquear';
                    td3.appendChild(btnUnblock);

                    tr.append(td1, td2, td3);
                    
                    blockBody.appendChild(tr); //une a linha na table
                });

                //add um evento de desbloqueio em cada botão gerado
                blockBody.querySelectorAll('.unblock-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const i = +btn.dataset.index; //pega o índice do array
                        
                        
                        try {
                            const usuario = blockUsers[i];
                            const dados = {
                                nome:usuario.nome
                            };
                            const res = await fetch(base_url +"/desbloquear", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-CSRFToken":csrfToken
                            },
                            body: JSON.stringify(dados)
                            }); 
                            const data = await res.json();
                            
                            mostrarToast(data.mensagem, data.status);

                            blockUsers.splice(i, 1);//remove do array
                            renderTable();//reenderiza a table
                            updateHeight();//ajusta tamanho do dropdown

                        } catch {
                            mostrarToast('Erro ao desbloquear usuário', data.status);
                        }       
                    });
                });
            }
        }

        //função para ajustar altura do dropdown
        function updateHeight() {
            if (isOpen) {
                listWrap.style.maxHeight = listInner.scrollHeight + 'px'; //scrollHeight é a altura real do content interno
            } else {
                listWrap.style.maxHeight = '0';
            }
        }

        //botão de exibir table
        toggleBtn.addEventListener('click', () => {
            isOpen = !isOpen; //alterna entra aberto e fechado
            //rotação da seta
            toggleIcon.classList.toggle('rotated', isOpen);

            if(isOpen) renderTable();
            updateHeight();
        });

        //botão de bloquear
        blockBtn.addEventListener('click', async () => {

            const nome = blockInput.value.trim();

            if (!nome) return;

            // verifica se já está bloqueado
            const alreadyExists = blockUsers.find(
                u => u.nome.toLowerCase() === nome.toLowerCase()
            );

            if (alreadyExists) {
                mostrarToast('Esse usuário já está bloqueado', 'error');
                return;
            }

            blockBtn.disabled = true;
            blockBtn.textContent = 'Verificando...';

            try {
                const today = new Date().toLocaleDateString('pt-BR');
                const dados = {
                    nome: nome,
                    data: today
                };

                const res = await fetch(base_url +"/bloquear", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken":csrfToken
                    },
                    body: JSON.stringify(dados)
                });
                
                
                const data = await res.json();
                
                mostrarToast(data.mensagem,data.status);

                if (data.existe) {

                        
                    blockUsers.push({
                        nome: nome,
                        data: today
                    });

                    blockInput.value = '';

                    // atualiza tabela
                    if (isOpen) {
                        renderTable();
                        updateHeight();
                    }

                } else {
                    mostrarToast('Usuário não encontrado','error');
                }

            } catch (erro) {
                mostrarToast('Erro ao verificar. Tente novamente','error');

            } finally {

                // sempre executa
                blockBtn.disabled = false;
                blockBtn.textContent = 'Bloquear';
            }
        });
    }

    //aba de notificações
    const btnTable = document.getElementById('not-btn-table');
    if (btnTable) {
        btnTable.addEventListener('click', () => {
            const expandTable = document.getElementById('expand-table');          
            expandTable.classList.toggle('open');
        });
    }
    /*const questions = document.querySelectorAll(".question");

    if (questions.length > 0) {
        questions.forEach(btn => { 
            btn.addEventListener('click', () => {
                const item = btn.closest('.question-item');
                const isOpen = item.classList.contains('open');

                document.querySelectorAll('.question-item').forEach(a => {
                    a.classList.remove('open');
                });

                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        });
    }*/

    //--------------perfil (meu canal)-------------------
    // UPLOAD DE FOTO DE PERFIL
    const uploadFoto = document.getElementById('upload-foto');
    const previewFoto = document.getElementById('preview-foto');
    const fotoPerfilPag = document.querySelector('.photo-user');

    const btnEditar = document.getElementById('btn-editar');
    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            fetch(base_url +"/session", {
                method: "POST", // FIX: era GET, mas a rota é POST
                headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }
            })
            .then(res => res.json())
            .then(data => {
                if (!data.logado) return;
                const inputNome   = document.getElementById('name-user');
                const inputBio    = document.getElementById('bio-user');
                const previewFoto = document.getElementById('preview-foto');

                if (inputNome) inputNome.value = data.name || '';
                if (inputBio)  inputBio.value  = data.bio  || '';

                if (previewFoto) {
                    if (data.foto) {
                        previewFoto.src = data.foto;
                        previewFoto.classList.add('tem-foto');
                    } else {
                        previewFoto.src = '/static/user.png';
                        previewFoto.classList.remove('tem-foto');
                    }
                }
            });
        });
    }

    // trocar foto clicando direto na foto grande do perfil
    if (fotoPerfilPag) {
        const inputFotoDireto = document.createElement('input');
        inputFotoDireto.type = 'file';
        inputFotoDireto.accept = 'image/*';
        inputFotoDireto.style.display = 'none';
        document.body.appendChild(inputFotoDireto);

        fotoPerfilPag.addEventListener('click', () => {
            if (!usuarioLogado || idPerfilAtual !== null) return; // só no próprio perfil
            inputFotoDireto.click();
        });

        inputFotoDireto.addEventListener('change', async () => {
            const arquivo = inputFotoDireto.files[0];
            inputFotoDireto.value = '';
            if (!arquivo || !arquivo.type.startsWith('image/')) {
                mostrarToast('Escolha um arquivo de imagem.', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('foto', arquivo);

            try {
                const res = await fetch(base_url + '/salvar_foto', {
                    method: 'POST',
                    headers: { "X-CSRFToken": csrfToken },
                    credentials: 'include',
                    body: formData
                });
                const data = await res.json();
                if (data.status === 'error') { mostrarToast(data.mensagem, 'error'); return; }

                const reader = new FileReader();
                reader.onload = (ev) => {
                    fotoPerfilPag.src = ev.target.result;
                    fotoPerfilPag.classList.add('tem-foto');
                    atualizarAvatarDropdown(ev.target.result);
                };
                reader.readAsDataURL(arquivo);
                mostrarToast('Foto atualizada!', 'success');
            } catch {
                mostrarToast('Erro ao salvar a foto.', 'error');
            }
        });
    }

    // variáveis para armazenar a foto temporária e o arquivo selecionado
    let fotoTemp = null;
    if (uploadFoto && previewFoto) {
        previewFoto.addEventListener('click', () => uploadFoto.click());
        uploadFoto.addEventListener('change', (e) => {
            const arquivo = e.target.files[0];
            if (!arquivo || !arquivo.type.startsWith('image/')) return;
            fotoFile = arquivo;
            const reader = new FileReader();
            reader.onload = (ev) => {
                fotoTemp = ev.target.result; // ← só na variável temp
                previewFoto.src = fotoTemp;
                previewFoto.classList.add('tem-foto');
            };
            reader.readAsDataURL(arquivo);
        });
    }

    // SALVAR PERFIL
    const btnSalvarPerfil = document.getElementById('btn-salvar-perfil');
    if (btnSalvarPerfil) {
        btnSalvarPerfil.addEventListener('click', async () => {
            const novoNome = document.getElementById('name-user')?.value.trim();
            const novaBio  = document.getElementById('bio-user')?.value.trim();
            if (!novoNome) { mostrarToast('O nome não pode ficar vazio!', 'error'); return; }

            const formData = new FormData();
            formData.append('nome', novoNome);
            formData.append('bio', novaBio || '');
            if (fotoTemp) formData.append('foto', fotoFile);

            try {
                if (fotoTemp != null) {
                    const res = await fetch(base_url +'/salvar_foto', {
                        method: 'POST',
                        headers: {
                            "X-CSRFToken":csrfToken
                        },
                        body: formData
                    });
                    const data_foto = await res.json();

                    if (data_foto.status === 'error') { mostrarToast(data_foto.mensagem, 'error'); return; }
                        
                }

                // O da foto
                //const res = await fetch('/salvar_foto', {
                //    method: 'POST',
                //    body: formData
                // });
                // const data_foto = await res.json();

                // if (data_foto.status === 'error') { mostrarToast(data_foto.mensagem, 'error'); return; }
                
                // O do nome
                const dados = {
                    nome: novoNome
                };

                const res_ = await fetch(base_url +'/editar_nome', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        "X-CSRFToken":csrfToken
                    },
                    body: JSON.stringify(dados)
                });
                const data_nome = await res_.json();

                if (data_nome.status === 'error') { mostrarToast(data_nome.mensagem, 'error'); return; }
                
                // O da BIO
                const dados_ = {
                    bio: novaBio
                };

                const resp = await fetch(base_url +'/editar_bio', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        "X-CSRFToken":csrfToken
                    },
                    body: JSON.stringify(dados_)
                    
                });
                const data_bio = await resp.json();

                if (data_bio.status === 'error') { mostrarToast(data_bio.mensagem, 'error'); return; }

                // atualiza na tela
                document.querySelectorAll('.show_name, #nome-usuario').forEach(el => el.textContent = novoNome);
                const bioPag  = document.getElementById('bio-usuario');
                const bioDesc = document.getElementById('description-channel');
                if (bioPag)  bioPag.textContent  = novaBio || '';
                if (bioDesc) bioDesc.textContent = novaBio || '';

                if (fotoTemp) {
                    // Atualiza foto grande da página do canal
                    const fotoPerfilPag = document.querySelector('.photo-user');
                    if (fotoPerfilPag) {
                        fotoPerfilPag.src = fotoTemp;
                        fotoPerfilPag.classList.add('tem-foto');
                    }

                    // Atualiza avatar no dropdown
                    atualizarAvatarDropdown(fotoTemp);

                    fotoTemp = null;
                }

                const modal4 = document.getElementById('modal-4');
                if (modal4) { modal4.close(); document.body.classList.remove('modal-open'); }
                mostrarToast('Perfil atualizado!', 'success');

            } catch { mostrarToast('Erro ao salvar perfil.', 'error'); }
        });
    }

    //MODAL INICIAR LIVE 
    // SELECT CUSTOMIZADO DE CATEGORIAS
    const btnSelectCat = document.getElementById('btn-select-cat');
    const selectDropdown = document.getElementById('select-dropdown');
    const selectedTags = document.getElementById('selected-tags');
    const placeholder = document.getElementById('select-placeholder');

    if (btnSelectCat && selectDropdown) {
        // abre/fecha
        btnSelectCat.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = selectDropdown.classList.contains('open');

            if (!isOpen) {
                const rect = btnSelectCat.getBoundingClientRect();
                selectDropdown.style.top = (rect.bottom + 4) + 'px';
                selectDropdown.style.left = rect.left + 'px';
                selectDropdown.style.width = rect.width + 'px';
            }

            btnSelectCat.classList.toggle('open');
            selectDropdown.classList.toggle('open');
        });

        // fecha o dropdown do select ao clicar fora
        document.addEventListener('click', (e) => {
            if (!document.getElementById('select-categorias').contains(e.target) && e.target !== btnSelectCat) {
                selectDropdown.classList.remove('open');
            }
        });

        // atualiza tags ao marcar/desmarcar
        selectDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => updateTags());
        });

        // função para atualizar as tags selecionadas
        function updateTags() {
            selectedTags.innerHTML = '';
            const checked = selectDropdown.querySelectorAll('input[type="checkbox"]:checked');

            if (checked.length === 0) {
                placeholder.textContent = 'Selecione categorias...';
                return;
            }

            placeholder.textContent = `${checked.length} selecionada${checked.length > 1 ? 's' : ''}`;

            checked.forEach(cb => {
                const label = cb.closest('label').textContent.trim();
                const tag = document.createElement('div');
                tag.className = 'tag';

                const span = document.createElement('span');
                span.textContent = label;

                const btnRemove = document.createElement('button');
                btnRemove.type = 'button';
                btnRemove.title = 'Remover';
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-xmark';
                btnRemove.appendChild(icon);

                tag.append(span, btnRemove);
                // botão X da tag desmarca o checkbox
                tag.querySelector('button').addEventListener('click', () => {
                    cb.checked = false;
                    updateTags();
                });
                selectedTags.appendChild(tag);
            });
        }

        // para pegar os valores selecionados no envio:
        // const categorias = [...selectDropdown.querySelectorAll('input:checked')].map(cb => cb.value);
    }

    function mostrarCarregandoModal(modal, mensagem) {
        let overlay = modal.querySelector('.modal-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'modal-loading-overlay';
            overlay.innerHTML = `<div class="modal-loading-spinner"></div><p class="modal-loading-texto"></p>`;
            modal.appendChild(overlay);
        }
        overlay.querySelector('.modal-loading-texto').textContent = mensagem || 'Enviando...';

        // cobre exatamente a área visível do modal, mesmo que ele esteja rolado
        overlay.style.top = modal.scrollTop + 'px';
        overlay.style.height = modal.clientHeight + 'px';
        modal.style.overflow = 'hidden'; // trava a rolagem durante o envio
        overlay.style.display = 'flex';
    }

    function esconderCarregandoModal(modal) {
        const overlay = modal.querySelector('.modal-loading-overlay');
        if (overlay) overlay.style.display = 'none';
        modal.style.overflow = ''; // volta ao overflow-y: auto do CSS
    }

    // ── INICIALIZAÇÃO ──
    async function init() {
        await carregarCsrf();
       // mostrarDeslogado()
        await verificarSessao();
        await renderVideosNaHome();
        await iniciarPerfil();
        await iniciarExplorar();
        await iniciarSeguindo();

        if (document.getElementById('block-btn')) {
            fetch(base_url +'/bloqueados', {
            method:"GET",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            }
        })
        .then(res => res.json())
        .then(data => {
            console.log('aaaaaaaaa:(')
            if (data.bloqueados) {
                blockUsers = data.bloqueados
            }
        });
        }
        await carrregarGerarPreferencias('noti_switches');
        await carrregarGerarPreferencias('pref_switches');
    }

    // ── LIVES: salvar e renderizar histórico no perfil ──
    async function getLives(idUsuario) {
        try {
            const url = idUsuario
                ? base_url + "/videos?id_usuario=" + idUsuario
                : base_url + "/videos";
            const res = await fetch(url, {
                method: "GET",
                headers: { "X-CSRFToken": csrfToken },
                credentials: "include"
            });
            if (!res.ok) throw new Error("Erro ao buscar as lives");
            const data = await res.json();
            return data.videos || [];
        } catch (error) {
            console.error("Erro ao pegar videos:", error);
            return [];
        }
    }

    async function buscarCurtidas(idStream) {
        try {
            const res = await fetch(base_url + "/curtidas?id_stream=" + idStream, {
                method: "GET",
                headers: { "X-CSRFToken": csrfToken },
                credentials: "include"
            });
            if (!res.ok) throw new Error("Erro ao buscar curtidas");
            return await res.json();
        } catch (error) {
            console.error("Erro ao buscar curtidas:", error);
            return null;
        }
    }

    async function buscarViews(idStream) {
        try {
            const res = await fetch(base_url + "/view?id_stream=" + idStream, {
                method: "GET",
                headers: { "X-CSRFToken": csrfToken },
                credentials: "include"
            });
            if (!res.ok) throw new Error("Erro ao buscar views");
            return await res.json();
        } catch (error) {
            console.error("Erro ao buscar views:", error);
            return null;
        }
    }

    async function foto_streamer(idStreamer) {
        try {
            const res = await fetch(base_url + "/foto_streamer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                credentials: "include",
                body: JSON.stringify({ id_stream: idStreamer })
            });

            const data = await res.json();
            if (!res.ok || data.status === "error") {
                mostrarToast(data.mensagem || "Erro ao curtir.", "error");
                return null;
            }

            return data.foto_url; // { curtido: true/false, total_curtidas: N }

        } catch (error) {
            return null;
        }
    }

    async function curtirVideo(idStream) {
        try {
            const res = await fetch(base_url + "/curtidas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                credentials: "include",
                body: JSON.stringify({ id_stream: idStream })
            });

            const data = await res.json();
            if (!res.ok || data.status === "error") {
                mostrarToast(data.mensagem || "Erro ao curtir.", "error");
                return null;
            }

            return data; // { curtido: true/false, total_curtidas: N }

        } catch (error) {
            console.error("Erro ao curtir:", error);
            mostrarToast("Erro ao curtir.", "error");
            return null;
        }
    }

    async function buscarComentarios(idStream) {
        try {
            const res = await fetch(base_url + "/comentarios?id_stream=" + idStream, {
            method: "GET",
            headers: { "X-CSRFToken": csrfToken },
            credentials: "include"
        });
        if (!res.ok) throw new Error("Erro ao buscar comentários");
        const data = await res.json();
        return data.comentarios || [];
        } catch (error) {
            console.error("Erro ao buscar comentários:", error);
            return [];
        }
    }

    async function enviarComentarioAPI(idStream, texto) {
        try {
            const res = await fetch(base_url + "/comentarios", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                credentials: "include",
                body: JSON.stringify({ id_stream: idStream, texto })
            });
            const data = await res.json();
            if (!res.ok || data.status === "error") {
                mostrarToast(data.mensagem, "error");
                return null;
            }
            return data.comentario;
        } catch (error) {
            mostrarToast("Erro ao comentar.", "error");
            return null;
        }
    }

    function adicionarComentarioDOM(c) {
        const lista = document.getElementById('comentarios-lista');
        if (!lista) return;

        const item = document.createElement('div');
        item.className = 'comentario-item';

        const img = document.createElement('img');
        img.className = 'comentario-foto';
        img.src = c.foto_url || '/static/user.png';
        img.alt = c.autor;

        const corpo = document.createElement('div');
        corpo.className = 'comentario-corpo';

        // nome + data na mesma linha
        const cabecalho = document.createElement('div');
        cabecalho.className = 'comentario-cabecalho';

        const autor = document.createElement('span');
        autor.className = 'comentario-autor';
        autor.textContent = c.autor;

        const d = new Date(c.criado_em);
        const quando = document.createElement('small');
        quando.className = 'comentario-data';
        quando.textContent = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        cabecalho.append(autor, quando);

        const texto = document.createElement('span');
        texto.className = 'comentario-texto';
        texto.textContent = c.texto;
        texto.style.display = 'block';

        corpo.append(cabecalho, texto);
        item.append(img, corpo);
        lista.appendChild(item);
        lista.scrollTop = lista.scrollHeight;
    }

    async function registrarView(idStream) {
        try {
            await fetch(base_url + "/view", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                credentials: "include",
                body: JSON.stringify({ id_stream: idStream })
            });
        } catch (error) {
            console.error("Erro ao registrar view:", error);
        }
    }

    const btnBits = document.getElementById('btn-bits');
    if (btnBits) {
        btnBits.addEventListener('click', () => {
            if (!usuarioLogado) {
                mostrarToast('Você precisa estar logado para doar bits.', 'error');
                return;
            }
            const wrap = document.querySelector('.player-wrap-expanded');
            const anim = document.createElement('div');
            anim.className = 'bits-animacao';
            anim.innerHTML = `<i class="fa-solid fa-gem"></i><span>Você acaba de doar bits!</span>`;
            wrap.appendChild(anim);
            anim.addEventListener('animationend', () => anim.remove());
            mostrarToast('Você acaba de doar bits', 'success');
        });
    }

    // referências de DOM usadas pelos handlers abaixo — precisam vir ANTES de serem usadas
    const modal6 = document.getElementById('modal-6');
    const btnUpload = document.getElementById('upload-video');

    // thumbnail da live
    const uploadThumb = document.getElementById('upload-thumb');
    const previewThumb = document.getElementById('preview-thumb');
    let thumbTemp = null;
    let thumbFile = null;

    if (uploadThumb && previewThumb) {
        previewThumb.addEventListener('click', () => uploadThumb.click());
        uploadThumb.addEventListener('change', (e) => {
            const arquivo = e.target.files[0];
            if (!arquivo || !arquivo.type.startsWith('image/')) return;
            thumbFile = arquivo;
            console.log(thumbFile)
            console.log("thumb file sendo guardada corretamente na variavel")
            const reader = new FileReader();
            reader.onload = (ev) => {
                thumbTemp = ev.target.result;
                previewThumb.src = thumbTemp;
                previewThumb.classList.add('tem-foto');
            };
            reader.readAsDataURL(arquivo);
        });
    }

    // botão de escolher vídeo
    const btnEscolherVideo = document.getElementById('btn-escolher-video');
    const videoLiveInput   = document.getElementById('video-live');
    if (btnEscolherVideo && videoLiveInput) {
        btnEscolherVideo.addEventListener('click', () => videoLiveInput.click());
        videoLiveInput.addEventListener('change', () => {
            const f = videoLiveInput.files[0];
            const labelArquivo = document.getElementById('label-video-escolhido');
            if (f && labelArquivo) {
                labelArquivo.textContent = f.name;
                labelArquivo.style.display = 'block';
            }
        });
    }

    const modalEditar = document.getElementById('modal-7');
    // ── EDITAR VÍDEO (reaproveita o modal-6) ──
    let liveEditando = null;

    function limparFormLive() {
        ['nome-live', 'descricao-live'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.querySelectorAll('#select-dropdown input[type="checkbox"]').forEach(cb => {
            if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change')); } // atualiza as tags
        });
        const prev = document.getElementById('preview-thumb');
        if (prev) { prev.src = ''; prev.classList.remove('tem-foto'); }
        const inputThumb = document.getElementById('upload-thumb');
        if (inputThumb) inputThumb.value = '';
        thumbTemp = null;
        thumbFile = null;
    }

    function mostrarUploadVideo(mostrar) {
        ['label-upload-video', 'wrap-upload-video'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = mostrar ? '' : 'none';
        });
    }

    function abrirModalEditar(live) {
        if (!modal6) return;
        liveEditando = live;

        document.getElementById('nome-live').value = live.titulo || '';
        document.getElementById('descricao-live').value = live.descricao || live.descrisao || '';

        // categorias: marca os checkboxes e dispara "change" para montar as tags
        document.querySelectorAll('#select-dropdown input[type="checkbox"]').forEach(cb => {
            cb.checked = (live.categorias || []).includes(cb.value);
            cb.dispatchEvent(new Event('change'));
        });

        // capa atual
        const prev = document.getElementById('preview-thumb');
        thumbFile = null;
        thumbTemp = null;
        if (prev) {
            if (live.thumb) { prev.src = live.thumb; prev.classList.add('tem-foto'); }
            else { prev.src = ''; prev.classList.remove('tem-foto'); }
        }

        mostrarUploadVideo(false);                       // não dá para trocar o vídeo, só os dados
        btnUpload.dataset.textoOriginal = btnUpload.textContent;
        btnUpload.textContent = 'Salvar';

        modal6.showModal();
        document.body.classList.add('modal-open');
    }

    async function salvarEdicao() {
        if (!liveEditando) return;

        const nome = document.getElementById('nome-live').value.trim();
        const descrisao = document.getElementById('descricao-live').value.trim();
        const categorias = [...document.querySelectorAll('#select-dropdown input:checked')].map(cb => cb.value);

        if (!nome) { mostrarToast('O vídeo precisa ter um nome!', 'error'); return; }
        if (categorias.length === 0) { mostrarToast('Escolha pelo menos uma categoria!', 'error'); return; }

        const formData = new FormData();
        formData.append('id', liveEditando.id_stream);
        formData.append('nome', nome);
        formData.append('descrisao', descrisao);
        formData.append('categoria', JSON.stringify(categorias));
        if (thumbFile) formData.append('capa', thumbFile);   // só envia se trocou a capa

        btnUpload.disabled = true;
        try {
            const res = await fetch(base_url + "/videos", {
                method: "PUT",
                headers: { "X-CSRFToken": csrfToken },
                credentials: "include",
                body: formData
            });
            const data = await res.json();
            mostrarToast(data.mensagem, data.status);

            if (res.ok && data.status === 'success') {
                modal6.close();                              // o evento "close" abaixo limpa tudo
                await renderVideosPerfil(idPerfilAtual);
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Erro ao editar vídeo.', 'error');
        } finally {
            btnUpload.disabled = false;
        }
    }

    if (modal6) {
        // roda ao fechar por qualquer caminho (Cancelar, X, ESC, salvar)
        modal6.addEventListener('close', () => {
            document.body.classList.remove('modal-open');
            if (!liveEditando) return;
            liveEditando = null;
            limparFormLive();
            mostrarUploadVideo(true);
            btnUpload.textContent = btnUpload.dataset.textoOriginal || 'Confirmar';
        });
    }

    // salvar vídeo — único handler, chama de fato o backend
    const salvarLive = async () => {
        if (btnUpload.disabled) return; // já está enviando, ignora clique

        const nomeLive = document.getElementById('nome-live')?.value.trim();
        const descLive = document.getElementById('descricao-live')?.value.trim();
        const videoInput = document.getElementById('video-live');
        const videoFile = videoInput?.files[0];
        const categorias = [...document.querySelectorAll('#select-dropdown input:checked')].map(cb => cb.value);

        if (!nomeLive) { mostrarToast('Digite um nome para o vídeo!', 'error'); return; }
        if (categorias.length === 0) { mostrarToast('Selecione pelo menos uma categoria!', 'error'); return; }
        if (!videoFile) { mostrarToast('Selecione um vídeo para upload!', 'error'); return; }

        const limitebytes = 100 * 1024 * 1024;
        if (videoFile.size > limitebytes) {
            mostrarToast('O video é maior que 100MB. Escolha um arquivo menor', 'error');
            return;
        }

        const formData = new FormData();
        formData.append("arquivo", videoFile);
        formData.append("titulo", nomeLive);
        formData.append("descrisao", descLive || "");
        formData.append("categoria", JSON.stringify(categorias));
        if (thumbFile) formData.append("capa", thumbFile);

        // bloqueia o modal inteiro durante o envio
        btnUpload.disabled = true;
        const botoesModal = modal6.querySelectorAll('button');
        botoesModal.forEach(b => b.disabled = true);
        mostrarCarregandoModal(modal6, 'Enviando vídeo, aguarde...');

        try {
            const res = await fetch(base_url + "/salvar_video", {
                method: "POST",
                headers: { "X-CSRFToken": csrfToken },
                credentials: "include",
                body: formData
            });

            const data = await res.json();

            if (!res.ok || data.status === "error") {
                mostrarToast(data.mensagem || "Erro ao salvar vídeo.", "error");
                return;
            }

            mostrarToast("Vídeo salvo!", "success");
            await renderVideosPerfil();

            if (modal6) {
                modal6.close();
                document.body.classList.remove("modal-open");
            }

            thumbTemp = null; thumbFile = null;
            const prevThumb = document.getElementById('preview-thumb');
            if (prevThumb) { prevThumb.src = ''; prevThumb.style.backgroundColor = '#000'; prevThumb.classList.remove('tem-foto'); }
            const labelArq = document.getElementById('label-video-escolhido');
            if (labelArq) { labelArq.textContent = ''; labelArq.style.display = 'none'; }

        } catch (error) {
            console.error("Erro ao salvar vídeo:", error);
            mostrarToast("Erro ao salvar vídeo.", "error");
        } finally {
            btnUpload.disabled = false;
            botoesModal.forEach(b => b.disabled = false);
            esconderCarregandoModal(modal6);
        }
    };

    if (btnUpload) {
        btnUpload.addEventListener('click', () => liveEditando ? salvarEdicao() : salvarLive());
    }

    function formatarTempo(s) {
        const m = Math.floor(s / 60);
        const seg = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${seg}`;
    }

    async function renderVideosPerfil(idUsuario) {
        const container = document.getElementById('videos-perfil-grid');
        if (!container) return;

        const idParaBuscar = idUsuario || meuId;   // ← usa o próprio id se não veio nenhum
        const lives = await getLives(idParaBuscar);
        container.innerHTML = '';

        if (lives.length === 0) {
            container.innerHTML = '<p style="color:var(--color16);text-align:center;padding:20px;grid-column:1/-1;">Nenhuma live realizada ainda.</p>';
            return;
        }

        lives.forEach(async live => {
            const dadosViews = await buscarViews(live.id_stream);
            if (dadosViews) live.views = dadosViews.total_views;

            // menu de opções só aparece no SEU PRÓPRIO canal (sem idUsuario = é você mesmo)
            const card = criarVideoCard(live, idUsuario ? { opcoesTerceiros: true } : { mostrarOpcoes: true });
            container.appendChild(card);
        });
    }

    // player expandido
    function abrirPlayerExpandido(live) {
        const overlay    = document.getElementById('video-player-overlay');
        const videoEl    = document.getElementById('video-expandido');
        const tituloTop  = document.getElementById('player-titulo-topo');
        const tituloCtrl = document.getElementById('player-titulo-controle');
        const playBtn    = document.getElementById('play-btn-exp');
        const playIcon   = document.getElementById('play-icon-exp');
        const muteBtn    = document.getElementById('mute-btn-exp');
        const volIcon    = document.getElementById('vol-icon-exp');
        const volRange   = document.getElementById('vol-range-exp');
        const timeLabel  = document.getElementById('time-label-exp');
        const fsBtn      = document.getElementById('fs-btn-exp');
        const fsIcon     = document.getElementById('fs-icon-exp');
        const fecharBtn  = document.getElementById('fechar-player');

        videoEl.src    = live.src || '';
        videoEl.volume = 0.8;
        videoEl.muted  = false;
        volRange.value = 80;
        tituloTop.textContent  = live.titulo;
        tituloCtrl.textContent = live.titulo;

        document.getElementById('player-info-titulo').textContent = live.titulo;
        document.getElementById('player-info-cats').textContent   = live.categorias?.join(' • ') || '';
        const descEl = document.getElementById('player-info-descricao');
        if (descEl) descEl.textContent = live.descricao || live.descrisao || '';
        document.getElementById('player-info-data').textContent   = live.data;

        const nomeCanal = live.canal || 'Canal desconhecido';
        const fotoCanal = live.canal_foto || '/static/user.png';
        document.getElementById('player-canal-nome-text').textContent = nomeCanal;
        document.getElementById('player-canal-foto-img').src          = fotoCanal;

        const btnCurtir     = document.getElementById('btn-curtir');
        const countCurtidas = document.getElementById('count-curtidas');
        buscarCurtidas(live.id_stream).then(dados => {
            if (!dados) return;
            btnCurtir.classList.toggle('ativo', dados.curtido);
            countCurtidas.textContent = dados.total_curtidas;
        });

        btnCurtir.onclick = async () => {
            const resposta = await curtirVideo(live.id_stream);
            if (!resposta) {
                return;
            }

            btnCurtir.classList.toggle('ativo', resposta.curtido);
            countCurtidas.textContent = resposta.total_curtidas;
            live.curtidas = resposta.total_curtidas;
            
        };

        buscarCurtidas(live.id_stream).then(dados => {
            if (!dados) return;
            btnCurtir.classList.toggle('ativo', dados.curtido);
            countCurtidas.textContent = dados.total_curtidas;
        });

        document.getElementById('btn-compartilhar').onclick = () => {
            const linkVideo = live.src || window.location.href;
            navigator.clipboard?.writeText(linkVideo)
                .then(() => mostrarToast('Link do vídeo copiado!', 'success'))
                .catch(() => mostrarToast('Não foi possível copiar.', 'error'));
        };

        document.getElementById('btn-comentar').onclick = () => {
            document.getElementById('comentario-input').focus();
        };

        const listaComent = document.getElementById('comentarios-lista');
        listaComent.innerHTML = '';
        buscarComentarios(live.id_stream).then(lista => {
            live.comentarios = lista;
            lista.forEach(c => adicionarComentarioDOM(c));
        });

        const inputComent = document.getElementById('comentario-input');
        const btnEnviar   = document.getElementById('comentario-enviar');
        inputComent.value = '';

        const enviarComentario = async () => {
            const texto = inputComent.value.trim();
            if (!texto) return;

            btnEnviar.disabled = true;
            const novo = await enviarComentarioAPI(live.id_stream, texto);
            btnEnviar.disabled = false;

            if (novo) {
                adicionarComentarioDOM(novo);
                inputComent.value = '';
            }
        };

        btnEnviar.onclick     = enviarComentario;
        inputComent.onkeydown = e => { if (e.key === 'Enter') enviarComentario(); };

        overlay.classList.add('show');
        document.body.classList.add('modal-open');
        if (live.src) {
            videoEl.play().catch(() => {}); 
            playIcon.className = 'fa-solid fa-pause'; 
            registrarView(live.id_stream);
            
        }

        playBtn.onclick = () => {
            if (videoEl.paused) { videoEl.play(); playIcon.className = 'fa-solid fa-pause'; }
            else { videoEl.pause(); playIcon.className = 'fa-solid fa-play'; }
        };
        videoEl.onclick = () => playBtn.onclick();

        const progressBar = document.getElementById('progress-exp');
        progressBar.value = 0;

        let rafId;
        const tick = () => {
            if (videoEl.duration) {
                progressBar.value = (videoEl.currentTime / videoEl.duration) * 100;
                timeLabel.textContent = `${formatarTempo(videoEl.currentTime)} / ${formatarTempo(videoEl.duration)}`;
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        progressBar.addEventListener('input', () => {
            if (videoEl.duration) videoEl.currentTime = (progressBar.value / 100) * videoEl.duration;
        });

        muteBtn.onclick = () => {
            videoEl.muted = !videoEl.muted;
            volIcon.className = videoEl.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            volRange.value = videoEl.muted ? 0 : videoEl.volume * 100;
        };
        volRange.oninput = () => {
            videoEl.volume = volRange.value / 100;
            videoEl.muted  = +volRange.value === 0;
            volIcon.className = +volRange.value === 0 ? 'fa-solid fa-volume-xmark'
                : +volRange.value < 50 ? 'fa-solid fa-volume-low'
                : 'fa-solid fa-volume-high';
        };

        const playerBox = document.querySelector('.player-wrap-expanded');
        fsBtn.onclick = () => {
            if (!document.fullscreenElement) { playerBox.requestFullscreen?.(); fsIcon.className = 'fa-solid fa-compress'; }
            else { document.exitFullscreen?.(); fsIcon.className = 'fa-solid fa-expand'; }
        };

        const fechar = () => {
            videoEl.pause(); videoEl.src = '';
            overlay.classList.remove('show');
            document.body.classList.remove('modal-open');
            cancelAnimationFrame(rafId);
            playIcon.className = 'fa-solid fa-play';
            renderVideosPerfil(idPerfilAtual); 
        };
        fecharBtn.onclick = fechar;
        overlay.onclick = e => { if (e.target === overlay) fechar(); };
    }

    // ── ASIDE → DROPDOWN em telas < 1280px ──
    // sincroniza o conteúdo do aside para dentro do dropdown
    function sincronizarAsideDropdown() {
        const dropdownList = document.querySelector('#dropdown-menu ul');
        if (!dropdownList) return;

        dropdownList.querySelectorAll('.aside-migrado').forEach(el => el.remove());

        if (window.innerWidth >= 1280) return;

        const logado = document.querySelector('.with-login')?.style.display !== 'none';

        // Separador + título AO VIVO
        const hrLives = criarEl('hr', 'aside-migrado' + (logado ? '' : ' hidden-deslogado'));
        const tituloLives = criarEl('li', 'aside-migrado dropdown-section-title' + (logado ? '' : ' hidden-deslogado'));
        tituloLives.innerHTML = '<span style="font-size:0.85em;color:var(--color3);font-weight:bold;">AO VIVO</span>';
        dropdownList.appendChild(hrLives);
        dropdownList.appendChild(tituloLives);

        livesSeguindo.forEach(p => {
            const li = criarEl('li', 'aside-migrado aside-live-item' + (logado ? '' : ' hidden-deslogado'));
            li.appendChild(criarLiveAside(p));
            dropdownList.appendChild(li);
        });;

        // Links de configurações e ajuda
        dropdownList.appendChild(criarEl('hr', 'aside-migrado'));

        const configHref = document.querySelector('a[href*="config"]')?.href || '/config';
        const ajudaHref  = document.querySelector('a[href*="ajuda"]')?.href  || '/ajuda';

        const liConfig = criarEl('li', 'aside-migrado' + (logado ? '' : ' hidden-deslogado'));
        liConfig.innerHTML = `<a href="${configHref}" style="display:flex;align-items:center;gap:10px;color:inherit;width:100%;">
            <i class="fa-solid fa-gear" style="font-size:1.2em;color:var(--color3);"></i><span>Configurações</span></a>`;

        const liAjuda = criarEl('li', 'aside-migrado');
        liAjuda.innerHTML = `<a href="${ajudaHref}" style="display:flex;align-items:center;gap:10px;color:inherit;width:100%;">
            <i class="fa-regular fa-circle-question" style="font-size:1.2em;color:var(--color3);"></i><span>Ajuda</span></a>`;

        dropdownList.appendChild(liConfig);
        dropdownList.appendChild(liAjuda);

        // esconde itens logado-only se deslogado
        if (!logado) {
            dropdownList.querySelectorAll('.hidden-deslogado').forEach(el => el.style.display = 'none');
        }
    }

    function criarEl(tag, classes) {
        const el = document.createElement(tag);
        el.className = classes;
        return el;
    }

    window.addEventListener('resize', sincronizarAsideDropdown);

    

    // Captcha
    // FIX: o Google injeta o iframe do desafio direto no <body>, fora do
    // dialog, e por isso ele renderiza ATRÁS do top layer do modal.
    // Aqui movemos esse iframe para DENTRO do #modal-1, fazendo-o herdar
    // o mesmo top layer do dialog (acima do ::backdrop, acima de tudo).
    const modal1 = document.getElementById('modal-1');

    const recaptchaObserver = new MutationObserver(() => {
        if (!modal1 || !modal1.open) return;

        document.querySelectorAll('body > div').forEach(div => {
            // ignora o próprio dialog e wrappers já processados
            if (div === modal1 || div.dataset.recaptchaMoved === 'true') return;

            if (div.querySelector('iframe[src*="recaptcha"]')) {
                div.classList.add('recaptcha-challenge-wrapper');
                div.dataset.recaptchaMoved = 'true';
                modal1.appendChild(div);

                // quando o Google remover o iframe do desafio, some o wrapper
                const innerObserver = new MutationObserver(() => {
                    if (!div.querySelector('iframe[src*="recaptcha"]')) {
                        div.remove();
                        innerObserver.disconnect();
                    }
                });
                innerObserver.observe(div, { childList: true, subtree: true });
            }
        });
    });

    recaptchaObserver.observe(document.body, { childList: true });

    //----------AJUDA-----------
    //extensão pra mostrar resposta da dúvida frequente
    const questions = document.querySelectorAll(".question");

    if (questions.length > 0) {
        questions.forEach(btn => { 
            btn.addEventListener('click', () => {
                const item = btn.closest('.question-item');
                const isOpen = item.classList.contains('open');

                document.querySelectorAll('.question-item').forEach(a => {
                    a.classList.remove('open');
                });

                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        });
    }
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.question-item')) {
            document.querySelectorAll('.question-item').forEach(i => {
                i.classList.remove('open');
            });
        }
    });

    //barra de pesquisa com overlay e histórico
    const searchInput = document.getElementById('help-search');
    const searchOverlay = document.getElementById('search-overlay');
    const searchHistorico = document.getElementById('search-historico');
    const searchHistoricoList = document.getElementById('search-historico-list');
    const searchResults = document.getElementById('search-results');

    //cria backdrop dinâmico 
    const searchBackdrop = document.createElement('div');
    searchBackdrop.id = 'search-backdrop';
    document.body.appendChild(searchBackdrop);

    if (searchInput && searchOverlay) {
        //lê os artigoas como fonte de dados
        const artigos = Array.from(document.querySelectorAll('.artigo')).map(el => ({
            titulo: el.dataset.titulo,
            tags: el.dataset.tags,
            html: el.innerHTML
        }));

        function chaveAjudaHistorico() {
            return `witch_search_historico_${meuId || 'convidado'}`;
        }

        function getHistorico() {
            try {return JSON.parse(localStorage.getItem(chaveAjudaHistorico()) || '[]');}
            catch {return [];}
        }
        function saveHistorico(term) {
            let h = getHistorico().filter(t => t.toLowerCase() !== term.toLowerCase());
            h.unshift(term);
            h = h.slice(0, 5);
            localStorage.setItem(chaveAjudaHistorico(), JSON.stringify(h));
        }

        function renderHistorico() {
            const h = getHistorico();
            searchHistoricoList.innerHTML = '';

            if (h.length === 0) {
                searchHistorico.style.display = 'none';
                return;
            }

            searchHistorico.style.display = 'block';
            h.forEach(term => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${term}`;
                li.addEventListener('click', () => {
                    searchInput.value = term;
                    filtrar(term);
                    saveHistorico(term);
                });
                searchHistoricoList.appendChild(li);
            });
        }

        function filtrar(query) {
            searchResults.innerHTML = '';
            searchHistorico.style.display = 'none';

            const q = query.trim().toLowerCase();

            if (!q) {
                renderHistorico();
                return;
            }

            const founds = artigos.filter(a =>
                a.titulo.toLowerCase().includes(q) ||
                a.tags.toLowerCase().includes(q)
            );

            if (founds.length === 0) {
                searchResults.innerHTML = `<p class="search-vazio">Nenhum resultado para "<strong>${query}</strong>"</p>`;
                return;
            }

            founds.forEach(artigo => {
                const card = document.createElement('div');
                card.className = 'result-card';
                card.innerHTML = `
                    <button class="result-btn">
                        <span>${artigo.titulo}</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                    <div class="result-content">${artigo.html}</div>
                `;

                //expansão dentro dos resultados
                card.querySelector('.result-btn').addEventListener('click', () => {
                    const isOpen = card.classList.contains('open');
                    searchResults.querySelectorAll('.result-card').forEach(c => c.classList.remove('open'));
                    if (!isOpen) card.classList.add('open');
                });

                searchResults.appendChild(card);
            });
        }

        /* const pref_switch_sexual = document.getElementById('pref-nosexual');
        const pref_switch_drogas = document.getElementById('pref-nodrogas');
        const pref_switch_bet = document.getElementById('pref-nobet');
        const pref_switch_violencia = document.getElementById('pref-noviolencia');
        const pref_switch_xingamento = document.getElementById('pref-noxingamento');
        const pref_switch_gameadulto = document.getElementById('pref-nogameadulto');
        const pref_switch_politica = document.getElementById('pref-nopolitica');
        const pref_switch_desfocar = document.getElementById('pref-desfocar');  */
        
        //const pref_switches = [
        //    pref_switch_sexual, pref_switch_drogas, pref_switch_bet, pref_switch_violencia, pref_switch_xingamento, 
        //    pref_switch_gameadulto, pref_switch_politica, pref_switch_desfocar 
        //];

        function openOverlay() {
            searchOverlay.classList.add('show');
            searchBackdrop.classList.add('show');
        }

        function closeOverlay() {
            searchOverlay.classList.remove('show');
            searchBackdrop.classList.remove('show');
            searchResults.innerHTML = '';
            renderHistorico();
        }

        //abre overlay quando focar no input de pesquisa
        searchInput.addEventListener('focus', () => {
            renderHistorico();
            openOverlay();
        });

        //filtra artigos enquanto digita
        searchInput.addEventListener('input', () => {
            filtrar(searchInput.value);
        });

        //salva no histórico quando preessionar Enter
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                saveHistorico(searchInput.value.trim());
                renderHistorico();
            }
        });

        //fecha ao clicar no backdrop
        searchBackdrop.addEventListener('click', () => {
            closeOverlay();
            searchInput.blur();
            searchInput.value = '';
        });
    }
    

    const noti_switches = document.querySelectorAll('[id^="noti-"]');
    const pref_switches = document.querySelectorAll('[id^="pref-"]');
    let dicionario = {};

    const listona = {
        'noti_switches' : noti_switches,
        'pref_switches' : pref_switches
    };

    console.log('1.');
    async function carrregarGerarPreferencias(nomeLista) {
        
        const lista = listona[nomeLista];

        try {
            const res = await fetch(base_url +"/preferencias", {
                method: "GET",
                credentials: "include", // Mantém a sessão do Python ativa
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                }
            }); 
            const data = await res.json();
            console.log('3.');
        
            if (data.status == 'success') {

                const preferenciasSalvas = data.dicionario || {};
                console.log("PREFERÊNCIAS RECEBIDAS NO JS:", preferenciasSalvas);
                lista.forEach((switchItem) => {

                    const id_switch = switchItem.id;

                    if (preferenciasSalvas[id_switch] !== undefined) {
                        dicionario[id_switch] = preferenciasSalvas[id_switch];
                    } else {
                        dicionario[id_switch] = false;
                    }

                    switchItem.checked = dicionario[id_switch];
                
                });
            }
            
        } catch (error) {
            console.error("Erro detalhado:", error);
            mostrarToast('Erro ao carregar preferências', 'error');
        }

        console.log('4.');
        
        // Segundo loop original: Adiciona os escutadores de evento de forma isolada
        lista.forEach((switchItem) => {
            const id_switch = switchItem.id;
            
            // Garante que se o dado existir, ele força a marcação visual
            if (dicionario[id_switch] !== undefined) {
                switchItem.checked = dicionario[id_switch];
            }

            switchItem.addEventListener('change', async (event) => {
                console.log('5.');
                const clicado = event.target;
                const ativo = clicado.checked;

                // Altera apenas a chave do switch no dicionário
                dicionario[id_switch] = ativo;
                
                try {
                    await fetch(base_url +"/preferencias", {
                        method: "POST",
                        credentials: "include", // Envia as credenciais no clique também
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrfToken
                        },
                        body: JSON.stringify(dicionario)
                    }); 
                } catch (error) {
                    mostrarToast('Erro ao salvar switchs', 'error');
                }    
            });
        });
    }

    // barra de pesquisa funioical em todas as páginas
    // BUSCA DE CANAIS E VÍDEOS (barra do header, #search)
    const canalSearchInput = document.getElementById('search');
    const configMain = document.getElementById('config-main');
    if (canalSearchInput && configMain) {
        setupConfigSearch(canalSearchInput, configMain);
    } else if (canalSearchInput) {
        const canalOverlay = document.createElement('div');
        canalOverlay.className = 'canal-search-overlay';
        canalOverlay.innerHTML = `
            <div class="canal-search-historico">
                <p class="search-label" data-i18n>Pesquisas recentes</p>
                <ul class="canal-search-historico-list"></ul>
            </div>
            <div class="canal-search-results"></div>
        `;
        document.body.appendChild(canalOverlay); // ← FIX: escapa do stacking context do #header

        const canalHistoricoBox  = canalOverlay.querySelector('.canal-search-historico');
        const canalHistoricoList = canalOverlay.querySelector('.canal-search-historico-list');
        const canalResultsBox    = canalOverlay.querySelector('.canal-search-results');

        const canalBackdrop = document.createElement('div');
        canalBackdrop.className = 'canal-search-backdrop';
        document.body.appendChild(canalBackdrop);

        // ← FIX: calcula a posição do dropdown manualmente, já que agora ele
        // não está mais dentro de .search-bar (position:relative deixou de valer)
        function posicionarCanalOverlay() {
            const rect = canalSearchInput.closest('.search-bar').getBoundingClientRect();
            canalOverlay.style.top = (rect.bottom + 8) + 'px';
            canalOverlay.style.left = rect.left + 'px';
            canalOverlay.style.width = rect.width + 'px';
        }

        function chaveCanalHistorico() {
            return `witch_canal_search_historico_${meuId || 'convidado'}`;
        }

        function getCanalHistorico() {
            try { return JSON.parse(localStorage.getItem(chaveCanalHistorico()) || '[]'); }
            catch { return []; }
        }
        function saveCanalHistorico(term) {
            let h = getCanalHistorico().filter(t => t.toLowerCase() !== term.toLowerCase());
            h.unshift(term);
            h = h.slice(0, 5);
            localStorage.setItem(chaveCanalHistorico(), JSON.stringify(h));
        }
        function renderCanalHistorico() {
            const h = getCanalHistorico();
            canalHistoricoList.innerHTML = '';
            if (h.length === 0) { canalHistoricoBox.style.display = 'none'; return; }
            canalHistoricoBox.style.display = 'block';
            h.forEach(term => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${term}`;
                li.addEventListener('click', () => {
                    canalSearchInput.value = term;
                    buscarCanaisVideos(term);
                });
                canalHistoricoList.appendChild(li);
            });
        }

        function abrirOverlayCanal() {
            posicionarCanalOverlay(); // ← FIX: reposiciona toda vez que abre
            canalOverlay.classList.add('show');
            canalBackdrop.classList.add('show');
        }
        function fecharOverlayCanal() {
            canalOverlay.classList.remove('show');
            canalBackdrop.classList.remove('show');
            canalResultsBox.innerHTML = '';
            renderCanalHistorico();
        }

        let debounceBusca;
        async function buscarCanaisVideos(termo) {
            canalHistoricoBox.style.display = 'none';
            canalResultsBox.innerHTML = '<p class="search-vazio">Buscando...</p>';

            try {
                const res = await fetch(base_url + "/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                    body: JSON.stringify({ pesquisa: termo })
                });
                const data = await res.json();
                canalResultsBox.innerHTML = '';

                if (data.status !== 'success' || (data.canais.length === 0 && data.videos.length === 0)) {
                    canalResultsBox.innerHTML = `<p class="search-vazio">Nenhum resultado para "<strong>${termo}</strong>"</p>`;
                    return;
                }

                data.canais.forEach(canal => {
                    const item = document.createElement('div');
                    item.className = 'canal-search-item';
                    item.innerHTML = `
                        <span class="canal-search-tipo tipo-canal">Canal</span>
                        <span class="canal-search-nome">${canal.user_name}</span>
                    `;
                    item.addEventListener('click', () => {
                        saveCanalHistorico(termo);
                        fecharOverlayCanal();
                        canalSearchInput.value = '';
                        irParaPerfil(canal.id_usuario, canal.user_name, canal.foto_url);
                    });
                    canalResultsBox.appendChild(item);
                });

                data.videos.forEach(video => {
                    const item = document.createElement('div');
                    item.className = 'canal-search-item';
                    item.innerHTML = `
                        <span class="canal-search-tipo tipo-video">Vídeo</span>
                        <span class="canal-search-nome">${video.titulo}</span>
                        <span class="canal-search-canal">${video.canal}</span>
                    `;
                    item.addEventListener('click', () => {
                        saveCanalHistorico(termo);
                        abrirVideoDaBusca(video);
                    });
                    canalResultsBox.appendChild(item);
                });

            } catch (error) {
                console.error(error);
                canalResultsBox.innerHTML = '<p class="search-vazio">Erro ao pesquisar.</p>';
            }
        }

        function abrirVideoDaBusca(video) {
            const live = {
                id_stream: video.id_stream,
                titulo: video.titulo,
                categorias: video.categoria || [],
                src: video.video_url,
                thumb: video.capa,
                data: video.data_upload,
                id_streamer: video.id_streamer,
                canal: video.canal,
                canal_foto: video.canal_foto,
                descrisao: video.descrisao || '' 
            };

            if (document.getElementById('video-player-overlay')) {
                fecharOverlayCanal();
                canalSearchInput.value = '';
                abrirPlayerExpandido(live);
            } else {
                fecharOverlayCanal();
                canalSearchInput.value = '';
                irParaPerfil(video.id_streamer, video.canal, video.canal_foto);
            }
        }

        canalSearchInput.addEventListener('focus', () => {
            renderCanalHistorico();
            abrirOverlayCanal();
        });

        canalSearchInput.addEventListener('input', () => {
            clearTimeout(debounceBusca);
            const termo = canalSearchInput.value.trim();
            if (!termo) { canalResultsBox.innerHTML = ''; renderCanalHistorico(); return; }
            debounceBusca = setTimeout(() => buscarCanaisVideos(termo), 300);
        });

        canalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && canalSearchInput.value.trim()) {
                clearTimeout(debounceBusca);
                const termo = canalSearchInput.value.trim();
                saveCanalHistorico(termo);
                buscarCanaisVideos(termo);
            }
        });

        canalBackdrop.addEventListener('click', () => {
            fecharOverlayCanal();
            canalSearchInput.blur();
            canalSearchInput.value = '';
        });

        // ← FIX: reposiciona se a janela mudar de tamanho ou rolar enquanto aberto
        window.addEventListener('resize', () => {
            if (canalOverlay.classList.contains('show')) posicionarCanalOverlay();
        });
        window.addEventListener('scroll', () => {
            if (canalOverlay.classList.contains('show')) posicionarCanalOverlay();
        }, true);
    }

    // pesquisa das configurações (ctrl+F)
    function setupConfigSearch(input, container) {
        let matches = [];
        let currentIndex = -1;

        const counter = document.createElement('span');
        counter.className = 'config-search-count';
        input.closest('.search-bar').appendChild(counter);

        function limparHighlights() {
            container.querySelectorAll('mark.config-search-mark').forEach(mark => {
                const parent = mark.parentNode;
                parent.replaceChild(document.createTextNode(mark.textContent), mark);
                parent.normalize();
            });
        }

        function destacar(termo) {
            limparHighlights();
            matches = [];
            currentIndex = -1;
            if (!termo) { atualizarContador(); return; }

            const termoLower = termo.toLowerCase();
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement.closest('script, style, mark')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });

            const nodes = [];
            let node;
            while (node = walker.nextNode()) nodes.push(node);

            nodes.forEach(textNode => {
                const texto = textNode.textContent;
                const textoLower = texto.toLowerCase();
                let idx = textoLower.indexOf(termoLower);
                if (idx === -1) return;

                const frag = document.createDocumentFragment();
                let lastIndex = 0;
                while (idx !== -1) {
                    frag.appendChild(document.createTextNode(texto.slice(lastIndex, idx)));
                    const mark = document.createElement('mark');
                    mark.className = 'config-search-mark';
                    mark.textContent = texto.slice(idx, idx + termo.length);
                    frag.appendChild(mark);
                    matches.push(mark);
                    lastIndex = idx + termo.length;
                    idx = textoLower.indexOf(termoLower, lastIndex);
                }
                frag.appendChild(document.createTextNode(texto.slice(lastIndex)));
                textNode.parentNode.replaceChild(frag, textNode);
            });

            if (matches.length > 0) irParaResultado(0);
            atualizarContador();
        }

        function atualizarContador() {
            counter.textContent = matches.length ? `${currentIndex + 1} de ${matches.length}`
                : (input.value ? '0 de 0' : '');
        }

        function irParaResultado(i) {
            if (matches.length === 0) return;
            if (currentIndex >= 0) matches[currentIndex].classList.remove('config-search-mark-ativo');
            currentIndex = (i + matches.length) % matches.length;
            matches[currentIndex].classList.add('config-search-mark-ativo');

            // abre a aba de configuração onde o resultado está, se ela não estiver visível
            const secao = matches[currentIndex].closest('.section-config');
            if (secao && !secao.classList.contains('active')) {
                configNav.forEach(l => l.classList.remove('active'));
                configSections.forEach(s => s.classList.remove('active'));
                secao.classList.add('active');
                const link = document.querySelector(`.nav-config a[data-target="${secao.id}"]`);
                if (link) link.classList.add('active');
            }

            matches[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            atualizarContador();
        }

        input.addEventListener('input', () => destacar(input.value.trim()));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (matches.length === 0) return;
                if (e.shiftKey) irParaResultado(currentIndex - 1);
                else irParaResultado(currentIndex + 1);
            }
        });
    }

    //função para passar os vídeos dos usuários para a tela inicial
    async function getLivesHome() {
        try {
            const res = await fetch(base_url + "/videos", {
                method: "GET",
                headers: { "X-CSRFToken": csrfToken },
                credentials: "include"
            });
            if (!res.ok) throw new Error("Erro ao buscar vídeos da home");
            const data = await res.json();
            return data.videos || [];
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async function renderVideosNaHome() {
        const lives = await getLivesHome();
        if (lives.length === 0) return;

        await Promise.all(lives.map(async live => {
            const dadosViews = await buscarViews(live.id_stream);
            if (dadosViews) live.views = dadosViews.total_views;
        }));

        montarEmAlta(lives);

        const mapaGrids = {
            'ação&aventura': 'grid-acao-aventura',
            'corrida':       'grid-corrida',
            'esporte':       'grid-esporte',
            'e-sports':      'grid-e-sport',
            'estratégia':    'grid-estrategia',
            'FPS&tiro':      'grid-fps-tiro',
            'luta':          'grid-luta',
            'RPG':           'grid-rpg',
            'terror':        'grid-terror',
            '+18':           'grid-18',
            'não-jogo':      'grid-outros',
        };

        const porCategoria = {};
        lives.forEach(live => {
            (live.categorias || []).forEach(cat => {
                if (!mapaGrids[cat]) return;
                if (!porCategoria[cat]) porCategoria[cat] = [];
                porCategoria[cat].push(live);
            });
        });

        Object.entries(mapaGrids).forEach(([cat, gridId]) => {
            const grid = document.getElementById(gridId);
            if (!grid) return;

            const videosCat = (porCategoria[cat] || []).slice(0, 10); // até 10, já vem ordenado por data desc

            if (videosCat.length === 0) {
                grid.closest('.section-home')?.style.setProperty('display', 'none');
                return;
            }

            videosCat.forEach(live => grid.appendChild(criarVideoCard(live, { opcoesTerceiros: true })));

            const wrap = garantirWrapComSetas(grid);
            montarCarrossel(wrap, grid);
        });
    }

    function montarEmAlta(lives) {
        const track = document.getElementById('track-home');
        if (!track) return;
        track.innerHTML = '';

        const top3 = [...lives].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
        const secao = track.closest('.section-home');

        if (top3.length === 0) {
            if (secao) secao.style.display = 'none';
            return;
        }
        if (secao) secao.style.display = '';

        top3.forEach(live => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.appendChild(criarCardEmAlta(live));
            track.appendChild(slide);
        });

        iniciarCarrosselEmAlta(top3.length);
    }

    function criarCardEmAlta(live) {
        const wrapper = document.createElement('div');
        wrapper.className = 'em-alta-card';

        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'em-alta-thumb';

        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.muted = false; // som ligado no hover
        vid.loop = true;
        if (live.src) vid.src = live.src;
        thumbDiv.appendChild(vid);

        if (live.thumb) {
            const capa = document.createElement('img');
            capa.src = live.thumb;
            capa.className = 'thumb-cover';
            capa.alt = live.titulo;
            thumbDiv.appendChild(capa);
        }

        const badge = document.createElement('span');
        badge.className = 'badge-live';
        badge.textContent = 'AO VIVO';
        thumbDiv.appendChild(badge);

        const views = document.createElement('span');
        views.className = 'thumb-views';
        views.textContent = `${live.views || 0} visualizações`;
        thumbDiv.appendChild(views);

        const progWrap = document.createElement('div');
        progWrap.className = 'thumb-progress-wrap';
        const progFill = document.createElement('div');
        progFill.className = 'thumb-progress-fill';
        progWrap.appendChild(progFill);
        thumbDiv.appendChild(progWrap);

        let rafId;
        thumbDiv.addEventListener('mouseenter', () => {
            if (!live.src) return;
            vid.currentTime = 0;
            vid.play().catch(() => {});
            const tick = () => {
                if (vid.duration) progFill.style.width = (vid.currentTime / vid.duration * 100) + '%';
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        });
        thumbDiv.addEventListener('mouseleave', () => {
            vid.pause(); vid.currentTime = 0;
            progFill.style.width = '0%';
            cancelAnimationFrame(rafId);
        });

        let isDragging = false;
        const moverBarra = (e) => {
            const rect = progWrap.getBoundingClientRect();
            const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            if (vid.duration) { vid.currentTime = pct * vid.duration; progFill.style.width = (pct * 100) + '%'; }
        };
        progWrap.addEventListener('mousedown', e => { e.stopPropagation(); isDragging = true; moverBarra(e); });
        document.addEventListener('mousemove', e => { if (isDragging) moverBarra(e); });
        document.addEventListener('mouseup', () => { isDragging = false; });
        progWrap.addEventListener('click', e => e.stopPropagation());

        thumbDiv.addEventListener('click', e => {
            if (progWrap.contains(e.target)) return;
            abrirPlayerExpandido(live);
        });

        const info = document.createElement('div');
        info.className = 'em-alta-info';

        const titulo = document.createElement('p');
        titulo.className = 'em-alta-titulo';
        titulo.textContent = live.titulo;

        const canal = document.createElement('p');
        canal.className = 'em-alta-canal';
        canal.textContent = live.canal || 'Canal desconhecido';
        canal.addEventListener('click', e => {
            e.stopPropagation();
            if (live.id_streamer) irParaPerfil(live.id_streamer, live.canal, live.canal_foto);
        });

        info.append(titulo, canal);
        wrapper.append(thumbDiv, info);
        return wrapper;
    }

    function iniciarCarrosselEmAlta(total) {
        const track = document.getElementById('track-home');
        const prevBtn = document.getElementById('prev');
        const nextBtn = document.getElementById('next');
        if (!track || total === 0) return;

        let current = 0;
        function goTo(i) {
            current = (i + total) % total;
            const w = track.children[0]?.offsetWidth || 0;
            track.style.transform = `translateX(-${current * w}px)`;
        }

        if (prevBtn) { prevBtn.style.display = total > 1 ? '' : 'none'; prevBtn.onclick = () => goTo(current - 1); }
        if (nextBtn) { nextBtn.style.display = total > 1 ? '' : 'none'; nextBtn.onclick = () => goTo(current + 1); }
        window.addEventListener('resize', () => goTo(current));
        goTo(0);
    }

    function criarVideoCard(live, { mostrarOpcoes = false, opcoesTerceiros = false } = {}) {
        const card = document.createElement('div');
        card.className = 'video-card-perfil';

        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'video-thumb-perfil';

        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.muted = true;
        vid.loop = true;
        if (live.src) vid.src = live.src;
        thumbDiv.appendChild(vid);

        if (live.thumb) {
            const capa = document.createElement('img');
            capa.src = live.thumb;
            capa.className = 'thumb-cover';
            capa.alt = live.titulo;
            thumbDiv.appendChild(capa);
        }

        const badge = document.createElement('span');
        badge.className = 'thumb-badge-live';
        badge.textContent = 'AO VIVO';
        thumbDiv.appendChild(badge);
        

        const views = document.createElement('span');
        views.className = 'thumb-views-perfil';
        views.textContent = `${live.views || 0} visualizações`;
        thumbDiv.appendChild(views);

        const progWrap = document.createElement('div');
        progWrap.className = 'thumb-progress-wrap';
        const progFill = document.createElement('div');
        progFill.className = 'thumb-progress-fill';
        progWrap.appendChild(progFill);
        thumbDiv.appendChild(progWrap);

        let rafId;
        thumbDiv.addEventListener('mouseenter', () => {
            if (!live.src) return;
            vid.play().catch(() => {});
            const tick = () => {
                if (vid.duration) progFill.style.width = (vid.currentTime / vid.duration * 100) + '%';
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        });
        thumbDiv.addEventListener('mouseleave', () => {
            vid.pause(); vid.currentTime = 0;
            progFill.style.width = '0%';
            cancelAnimationFrame(rafId);
        });

        let isDragging = false;
        const moverBarra = (e) => {
            const rect = progWrap.getBoundingClientRect();
            const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            if (vid.duration) {
                vid.currentTime = pct * vid.duration;
                progFill.style.width = (pct * 100) + '%';
            }
        };
        progWrap.addEventListener('mousedown', e => { e.stopPropagation(); isDragging = true; moverBarra(e); });
        document.addEventListener('mousemove', e => { if (isDragging) moverBarra(e); });
        document.addEventListener('mouseup', () => { isDragging = false; });
        progWrap.addEventListener('click', e => e.stopPropagation());

        // ── abre o player expandido, igual já fazia no perfil ──
        thumbDiv.addEventListener('click', e => {
            if (progWrap.contains(e.target)) return;
            abrirPlayerExpandido(live);
        });

        const titulo = document.createElement('p');
        titulo.className = 'video-card-titulo';
        titulo.textContent = live.titulo;
        titulo.style.cssText = 'font-size:1.1em;';

        const cats = document.createElement('p');
        cats.className = 'video-card-categorias';
        cats.textContent = live.categorias?.join(' • ') || '';
        cats.style.cssText = 'font-size:0.9em;color:#9147FF';

        const nomeCanal = live.canal || document.querySelector('.show_name')?.textContent || 'Canal desconhecido';
        const canal = document.createElement('p');
        canal.className = 'video-card-canal';
        canal.textContent = nomeCanal;
        canal.style.cursor = 'pointer';
        canal.style.cssText = 'font-size:0.9em;font-weight:bold;color:#9147FF';
        canal.addEventListener('click', e => {
            e.stopPropagation();
            if (live.id_streamer) irParaPerfil(live.id_streamer, live.canal, live.canal_foto);
        });

        const infoRow = document.createElement('div');
        infoRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;';

        const dataEl = document.createElement('p');
        dataEl.className = 'video-card-info';
        dataEl.textContent = live.data;
        dataEl.style.margin = '0';
        dataEl.style.cssText = 'font-size:0.9em;';
        infoRow.appendChild(dataEl);

        if (mostrarOpcoes || opcoesTerceiros) {
            const opcWrapper = document.createElement('div');
            opcWrapper.style.cssText = 'position:relative;flex-shrink:0;';

            const btnOpcoes = document.createElement('button');
            btnOpcoes.className = 'btn-opcoes-video';
            btnOpcoes.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
            btnOpcoes.title = 'Opções';

            const menuOpcoes = document.createElement('div');
            menuOpcoes.className = 'menu-opcoes-video';

            menuOpcoes.innerHTML = mostrarOpcoes ? `
                <button class="opcao-video" data-acao="excluir"><i class="fa-solid fa-trash"></i> Excluir</button>
                <button class="opcao-video" data-acao="editar"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="opcao-video" data-acao="salvar"><i class="fa-solid fa-download"></i> Salvar vídeo</button>
            ` : `
                <button class="opcao-video" data-acao="compartilhar"><i class="fa-solid fa-share-nodes"></i> Compartilhar</button>
                <button class="opcao-video ${turboAtivo ? '' : 'opcao-bloqueada'}" data-acao="salvar">
                    <i class="fa-solid ${turboAtivo ? 'fa-download' : 'fa-lock'}"></i> Salvar vídeo
                </button>
            `;

            opcWrapper.append(btnOpcoes, menuOpcoes);
            infoRow.appendChild(opcWrapper);

            btnOpcoes.addEventListener('click', e => {
                e.stopPropagation();
                document.querySelectorAll('.menu-opcoes-video.show').forEach(m => {
                    if (m !== menuOpcoes) m.classList.remove('show');
                });
                menuOpcoes.classList.toggle('show');
            });

            menuOpcoes.querySelectorAll('.opcao-video').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const acao = btn.dataset.acao;

                    if (acao === 'excluir') {
                        try {
                            const res = await fetch(base_url + "/videos", {
                                method: "DELETE",
                                headers: { "X-CSRFToken": csrfToken, "Content-Type": "application/json" },
                                body: JSON.stringify({ id: live.id_stream })
                            });
                            const data = await res.json();
                            mostrarToast(data.mensagem, data.status);
                            if (res.ok) renderVideosPerfil(idPerfilAtual);
                        } catch {
                            mostrarToast('Erro ao excluir vídeo.', 'error');
                        }
                    }
                    else if (acao === 'editar') {
                        abrirModalEditar(live);
                    }
                    else if (acao === 'salvar') {
                        if (opcoesTerceiros && !turboAtivo) {
                            mostrarToast('Você precisa ter o Turbo para salvar vídeos de outros canais.', 'error');
                            menuOpcoes.classList.remove('show');
                            return;
                        }
                        if (!live.src) { mostrarToast('Nenhum vídeo disponível para download.', 'error'); return; }
                        const a = document.createElement('a');
                        a.href = live.src;
                        a.download = `${live.titulo}.mp4`;
                        a.click();
<<<<<<< HEAD
                    } else if (acao === 'compartilhar') {
                        const linkVideo = live.src || window.location.href;
                        navigator.clipboard?.writeText(linkVideo)
                            .then(() => mostrarToast('Link do vídeo copiado!', 'success'))
                            .catch(() => mostrarToast('Não foi possível copiar.', 'error'));
                    }
=======
                    }
                    else if (acao === 'clipe') criarClipe(live);

>>>>>>> c8406f698f6493d7af2231207bd8f1c50c90cce3
                    menuOpcoes.classList.remove('show');
                });
            });
        }

        card.append(thumbDiv, titulo, cats, canal, infoRow);
        return card;

    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-opcoes-video') && !e.target.closest('.btn-opcoes-video')) {
            document.querySelectorAll('.menu-opcoes-video.show').forEach(m => m.classList.remove('show'));
        }
    });


    function obterContainerLives() {
        const c = document.getElementById('lista-lives');
        if (c) {
            // .with-login vira display:flex em linha; força coluna
            c.style.flexDirection = 'column';
            c.style.gap = '8px';
            c.style.width = '100%';
        }
        return c;
    }

    function formatarViews(n) {
        n = Number(n) || 0;
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
        return String(n);
    }

    function criarLiveAside(pessoa) {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'lives-aside';
        link.addEventListener('click', e => {
            e.preventDefault();
            irParaPerfil(pessoa.id, pessoa.nome, pessoa.foto);
        });

        const foto = document.createElement('img');
        foto.src = pessoa.foto || '/static/user.png';
        foto.alt = pessoa.nome || '';
        foto.onerror = () => { foto.onerror = null; foto.src = '/static/user.png'; };
        foto.className = 'aside-photo';
        foto.style.cssText = 'width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;display:block;background:#9147FF;';
        const nome = document.createElement('span');
        nome.textContent = pessoa.nome || 'Pessoa desconhecida';

        const ladoDireito = document.createElement('div');
        ladoDireito.className = 'aside-right';
        const views = document.createElement('span');
        views.textContent = formatarViews(pessoa.views);
        const indicador = document.createElement('i');
        indicador.className = 'fa-solid fa-circle red-circle';
        ladoDireito.append(views, indicador);

        link.append(foto, nome, ladoDireito);
        return link;
    }

    let livesSeguindo = [];

    async function getLiveSeguindo() {
        const container = obterContainerLives();
        if (container) container.innerHTML = '';

        try {
            let lista = [];
            if (usuarioLogado) {
                const res = await fetch(base_url + "/seguindo_lives", {
                    method: "GET",
                    headers: { "X-CSRFToken": csrfToken },
                    credentials: "include"
                });
                if (!res.ok) {
                    console.error('[seguindo] erro', res.status, await res.text());
                    if (container) container.innerHTML = `<p style="padding:10px;">Erro ao carregar (status ${res.status}).</p>`;
                    return;
                }
                const data = await res.json();
                console.log('[seguindo] data:', data);
                if (Array.isArray(data)) lista = data;
            }

            const porStreamer = new Map();
            lista.forEach(item => {
                const atual = porStreamer.get(item.id_usuario);
                if (atual) atual.views += item.total_views;
                else porStreamer.set(item.id_usuario, {
                    id: item.id_usuario,
                    nome: item.user_name,
                    foto: item.foto_url,
                    views: item.total_views
                });
            });
            livesSeguindo = [...porStreamer.values()];

            if (container) {
                if (livesSeguindo.length === 0) {
                    container.innerHTML = '<p style="padding:10px;">Ninguém que você segue postou recentemente.</p>';
                } else {
                    livesSeguindo.forEach(p => container.appendChild(criarLiveAside(p)));
                }
            }
            sincronizarAsideDropdown();
        } catch (error) {
            console.error(error);
            if (container) container.innerHTML = '<p style="padding:10px;">Erro ao carregar.</p>';
        }
    }

    // TELA EXPLORAR
    const mapaGridsExplorar = {
        'ação&aventura': 'exp-acao-aventura',
        'corrida':       'exp-corrida',
        'esporte':       'exp-esporte',
        'e-sports':      'exp-e-sport',
        'estratégia':    'exp-estrategia',
        'FPS&tiro':      'exp-fps-tiro',
        'luta':          'exp-luta',
        'RPG':           'exp-rpg',
        'terror':        'exp-terror',
        '+18':           'exp-18',
        'não-jogo':      'exp-outros',
    };

    function preencherLinha(rowId, videos, opts = {}) {
        const row = document.getElementById(rowId);
        if (!row) return;
        videos.forEach(live => {
            const card = criarVideoCard(live, { opcoesTerceiros: true, forcarAoVivo: opts.forcarAoVivo ?? true });
            row.appendChild(card);
        });
    }
    
    // carrossel de vídeos
    function montarCarrossel(wrap, scroller) {
        wrap.querySelectorAll('.arrow-btn, .row-arrow-btn').forEach(b => b.remove());

        const criarBotao = (dir) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `row-arrow-btn ${dir}`;
            b.setAttribute('aria-label', dir === 'prev' ? 'Anterior' : 'Próximo');
            b.innerHTML = `<i class="fa-solid fa-chevron-${dir === 'prev' ? 'left' : 'right'}"></i>`;
            return b;
        };
        const prev = criarBotao('prev');
        const next = criarBotao('next');
        wrap.append(prev, next);

        const atualizar = () => {
            const max = scroller.scrollWidth - scroller.clientWidth;
            prev.classList.toggle('visivel', max > 4 && scroller.scrollLeft > 4);
            next.classList.toggle('visivel', max > 4 && scroller.scrollLeft < max - 4);
        };
        const passo = () => scroller.clientWidth * 0.85;

        prev.addEventListener('click', () => scroller.scrollBy({ left: -passo(), behavior: 'smooth' }));
        next.addEventListener('click', () => scroller.scrollBy({ left: passo(), behavior: 'smooth' }));
        scroller.addEventListener('scroll', atualizar, { passive: true });
        new ResizeObserver(atualizar).observe(scroller);
        window.addEventListener('resize', atualizar);
        atualizar();
    }

    function garantirWrapComSetas(el) {
        if (el.closest('.explorar-row-wrap')) return el.closest('.explorar-row-wrap');
        const wrap = document.createElement('div');
        wrap.className = 'explorar-row-wrap';
        el.parentNode.insertBefore(wrap, el);
        wrap.appendChild(el);
        el.classList.remove('video-grid');
        el.classList.add('explorar-row');
        return wrap;
    }

    async function iniciarExplorar() {
        const container = document.getElementById('explorar-main');
        if (!container) return; // não é a página Explorar

        try {
            const res = await fetch(base_url + "/api/explorar", {
                method: "GET",
                headers: { "X-CSRFToken": csrfToken },
                credentials: "include"
            });
            const data = await res.json();
            if (data.status !== 'success') return;

            const videos = data.videos || [];
            if (videos.length === 0) return;

            // Canais Iniciantes — streamers com menos seguidores
            const iniciantes = [...videos]
                .sort((a, b) => (a.seguidores_streamer || 0) - (b.seguidores_streamer || 0))
                .slice(0, 12);
            preencherLinha('row-iniciantes', iniciantes);

            // Mais Curtidos
            const maisCurtidos = [...videos]
                .sort((a, b) => (b.curtidas || 0) - (a.curtidas || 0))
                .slice(0, 12);
            preencherLinha('row-mais-curtidos', maisCurtidos);

            // Mais Vistos
            const maisVistos = [...videos]
                .sort((a, b) => (b.views || 0) - (a.views || 0))
                .slice(0, 12);
            preencherLinha('row-mais-vistos', maisVistos);

            // Fileiras por categoria (com badge AO VIVO)
            videos.forEach(live => {
                (live.categorias || []).forEach(cat => {
                    const rowId = mapaGridsExplorar[cat];
                    if (!rowId) return;
                    const row = document.getElementById(rowId);
                    if (row && !row.querySelector(`[data-live-id="${live.id_stream}"]`)) {
                        const card = criarVideoCard(live, { mostrarOpcoes: false, forcarAoVivo: true });
                        card.dataset.liveId = live.id_stream;
                        row.appendChild(card);
                    }
                });
            });

            // Fileira final "Vídeos" — mesmos vídeos de "Outros", SEM badge
            const outros = videos.filter(v => (v.categorias || []).includes('não-jogo'));
            preencherLinha('row-videos-final', outros, { forcarAoVivo: false });

        } catch (error) {
            console.error("Erro ao carregar Explorar:", error);
        }

        document.querySelectorAll('.explorar-row-wrap').forEach(wrap => {
            const row = wrap.querySelector('.explorar-row');
            if (!row || row.children.length === 0) {
                wrap.closest('section').style.display = 'none';
                return;
            }
            montarCarrossel(wrap, row);
        });
    }

    // detecta se é o próprio perfil ou de outra pessoa
    let idPerfilAtual = null; // null = próprio perfil; id = perfil visitado
    async function iniciarPerfil() {
        const container = document.getElementById('videos-perfil-grid');
        if (!container) return; // página não é a de perfil

        const params = new URLSearchParams(window.location.search);
        const idParam = params.get('id');

        if (!idParam) {
            idPerfilAtual = null;
            await renderVideosPerfil();
            return;
        }

        const res = await fetch(base_url + "/session", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }
        });
        const sessao = await res.json();

        if (sessao.logado && String(sessao.id) === String(idParam)) {
            window.history.replaceState({}, '', '/perfil');
            idPerfilAtual = null;
            await renderVideosPerfil();
            return;
        }

        idPerfilAtual = idParam;
        ativarModoVisitante(idParam, params.get('nome'), params.get('foto'));
    }

    function ativarModoVisitante(idVisitado, nome, foto) {
        // esconde os botões que só fazem sentido pro dono da conta
        document.getElementById('btn-editar')?.style.setProperty('display', 'none');
        document.getElementById('btn-start-live')?.style.setProperty('display', 'none');

        const tituloCanal = document.querySelector('.container-perfil > h1');
        if (tituloCanal) tituloCanal.textContent = '';

        // nome e foto chegam via URL (vieram do clique no card, sem precisar de backend novo)
        const nomeCanal = document.getElementById('nome-usuario');
        if (nome && nomeCanal) nomeCanal.textContent = decodeURIComponent(nome);
        if (foto) {
            const fotoEl = document.querySelector('.photo-user');
            if (fotoEl) fotoEl.src = decodeURIComponent(foto);
        }
        const bioCanal = document.getElementById('bio-usuario');
        if (bioCanal) bioCanal.textContent = '';

        montarBotoesSociais(idVisitado);
        incritos_info(idVisitado);
        renderVideosPerfil(idVisitado); // reaproveita a função que você já tem
    }

    function montarBotoesSociais(idVisitado) {
        const container = document.getElementById('botoes-sociais-perfil');
        if (!container) return;

        container.innerHTML = `
            <button class="btn-perfil" id="btn-seguir-visitante">Seguir</button>
            <button class="btn-perfil" id="btn-sub-visitante">Ser Sub</button>
        `;

        document.getElementById('btn-seguir-visitante').addEventListener('click', async (e) => {
            const res = await fetch(base_url + "/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                body: JSON.stringify({ criador: idVisitado })
            });
            const data = await res.json();
            mostrarToast(data.mensagem, data.status);
            if (data.status !== 'error') {
                e.target.textContent = data.seguindo ? 'Seguindo' : 'Seguir';
                incritos_info(idVisitado);
            }
        });
    }

    function irParaPerfil(id, nome, foto) {
        const params = new URLSearchParams();
        params.set('id', id);
        if (nome) params.set('nome', encodeURIComponent(nome));
        if (foto) params.set('foto', encodeURIComponent(foto));
        window.location.href = '/perfil?' + params.toString();
    }

    // tela pagamento turbo
    const turboModal = document.querySelector('.turbo-modal');
    const pagTurbo = document.querySelector('.pagamento-turbo');
    const modal = document.getElementById('modal-5');
    const btnTurbo = document.querySelectorAll('.btn-turbo-sub');
    btnTurbo.forEach(btnTurbo => {
        btnTurbo.addEventListener('click', () => {
            turboModal.style.display = 'none';
            pagTurbo.style.display = 'flex';
            modal.style.background = 'transparent';
        });
    });

    // máscara dos inputs do forms de pagamento do turbo
    document.getElementById('numero').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        value = value.substring(0, 16);
        e.target.value = value.replace(/(\d{4})/g, '$1 ').trim();
    });

    document.getElementById('validade').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        value = value.substring(0, 4);
        e.target.value = value.replace(/(\d{2})(\d{2})/, '$1/$2');
    });

    document.getElementById('cvv').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        value = value.substring(0, 3);
        e.target.value = value;
    });

    const formPagamentoTurbo = document.querySelector('.pagamento-turbo form');
    if (formPagamentoTurbo) {
        formPagamentoTurbo.addEventListener('submit', function(e) {
            e.preventDefault();
            turboAtivo = true;
            localStorage.setItem(chaveTurbo(), 'true');
            atualizarIconeTurbo();
            alert('Compra realizada com sucesso!');
            fecharModal(formPagamentoTurbo);
        });
    }

    //TELA SEGUINDO
    const LIMITE_SEGUINDO = 10;
    const FILTRO_SEGUINDO_KEY = 'witch_seguindo_filtro';
    let canaisSeguidos = [];
    let canaisSelecionados = new Set();

    async function iniciarSeguindo() {
        const lista = document.getElementById('seguindo-lista');
        if (!lista) return; // não é a página Seguindo

        if (!usuarioLogado) {
            lista.innerHTML = '<p class="seguindo-vazio">Faça login para ver os canais que você segue.</p>';
            return;
        }

        try {
            const res = await fetch(base_url + "/seguindo_videos", {
                method: "GET",
                headers: { "X-CSRFToken": csrfToken },
                credentials: "include"
            });
            const data = await res.json();

            if (data.status !== 'success' || !data.canais || data.canais.length === 0) {
                lista.innerHTML = '<p class="seguindo-vazio">Você ainda não segue nenhum canal com vídeos.</p>';
                return;
            }

            canaisSeguidos = data.canais;
            await Promise.all(canaisSeguidos.flatMap(c => c.videos).map(async v => {
                const dadosViews = await buscarViews(v.id_stream);
                if (dadosViews) v.views = dadosViews.total_views;
            }));
            canaisSelecionados = carregarSelecaoSeguindo();
            montarFiltroSeguindo();
            renderizarLinhasSeguindo();
        } catch (error) {
            console.error(error);
        }
    }

    function carregarSelecaoSeguindo() {
        const ids = canaisSeguidos.map(c => String(c.id_usuario));
        let salvos = null;
        try { salvos = JSON.parse(localStorage.getItem(FILTRO_SEGUINDO_KEY)); } catch {}

        const sel = Array.isArray(salvos)
            ? salvos.map(String).filter(id => ids.includes(id))
            : ids;                                   // primeira visita: começa pelos primeiros
        return new Set(sel.slice(0, LIMITE_SEGUINDO));
    }

    function salvarSelecaoSeguindo() {
        try { localStorage.setItem(FILTRO_SEGUINDO_KEY, JSON.stringify([...canaisSelecionados])); } catch {}
    }

    function renderizarLinhasSeguindo() {
        const lista = document.getElementById('seguindo-lista');
        lista.innerHTML = '';

        const visiveis = canaisSeguidos.filter(c => canaisSelecionados.has(String(c.id_usuario)));
        if (visiveis.length === 0) {
            lista.innerHTML = '<p class="seguindo-vazio">Nenhum canal selecionado. Use o filtro para escolher até 10 canais.</p>';
            return;
        }

        visiveis.forEach(canal => {
            const section = document.createElement('section');
            section.className = 'section-home';

            const header = document.createElement('div');
            header.className = 'seguindo-canal-header';
            const foto = document.createElement('img');
            foto.className = 'seguindo-canal-foto';
            foto.src = canal.foto_url || '/static/user.png';
            foto.alt = canal.user_name;
            const nome = document.createElement('h2');
            nome.className = 'section-title';
            nome.style.margin = '0';
            nome.textContent = canal.user_name;
            header.append(foto, nome);
            header.addEventListener('click', () => irParaPerfil(canal.id_usuario, canal.user_name, canal.foto_url));

            const wrap = document.createElement('div');
            wrap.className = 'video-row-wrap';
            const scroll = document.createElement('div');
            scroll.className = 'video-row-scroll';
            canal.videos.forEach(v => scroll.appendChild(criarVideoCard(v, { opcoesTerceiros: true })));
            wrap.appendChild(scroll);

            section.append(header, wrap);
            lista.appendChild(section);
            montarCarrossel(wrap, scroll);
        });
    }

    function montarFiltroSeguindo() {
        const btn = document.getElementById('btn-filtro-seguindo');
        const painel = document.getElementById('filtro-seguindo-painel');
        const listaEl = document.getElementById('lista-filtro-canais');
        const contador = document.getElementById('filtro-contador');
        const limpar = document.getElementById('filtro-limpar');
        if (!btn || !painel || !listaEl) return;

        btn.closest('.filtro-seguindo-wrap').style.display = '';

        const atualizarUI = () => {
            const total = canaisSelecionados.size;
            contador.textContent = `${total}/${LIMITE_SEGUINDO}`;
            listaEl.querySelectorAll('input').forEach(cb => {
                cb.disabled = !cb.checked && total >= LIMITE_SEGUINDO;
                cb.closest('label').classList.toggle('desabilitado', cb.disabled);
            });
        };

        listaEl.innerHTML = '';
        canaisSeguidos.forEach(canal => {
            const id = String(canal.id_usuario);

            const label = document.createElement('label');
            label.className = 'filtro-canal-item';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = canaisSelecionados.has(id);

            const img = document.createElement('img');
            img.src = canal.foto_url || '/static/user.png';
            img.alt = '';

            const nome = document.createElement('span');
            nome.textContent = canal.user_name;

            cb.addEventListener('change', () => {
                if (cb.checked) canaisSelecionados.add(id);
                else canaisSelecionados.delete(id);
                salvarSelecaoSeguindo();
                atualizarUI();
                renderizarLinhasSeguindo();
            });

            label.append(cb, img, nome);
            listaEl.appendChild(label);
        });

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            painel.classList.toggle('open');
            btn.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!painel.contains(e.target) && !btn.contains(e.target)) {
                painel.classList.remove('open');
                btn.classList.remove('open');
            }
        });
        limpar.addEventListener('click', () => {
            canaisSelecionados.clear();
            listaEl.querySelectorAll('input').forEach(cb => cb.checked = false);
            salvarSelecaoSeguindo();
            atualizarUI();
            renderizarLinhasSeguindo();
        });

        atualizarUI();
    }
    // botão de voltar no modal turbo
    const btnBackTurbo = document.querySelector('.back-modal-turbo');
    if (btnBackTurbo) {
        btnBackTurbo.addEventListener('click', () => {
            turboModal.style.display = 'block';
            pagTurbo.style.display = 'none';
            modal.style.background = '#1a1a2e';
        });
    }

    init();
});