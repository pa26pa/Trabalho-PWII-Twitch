//DOMContentLoaded garante que o script só rode depois de todo o HTML estar carregado
document.addEventListener('DOMContentLoaded', function () {

    let csrfToken = null;

    async function carregarCsrf() {
        const res = await fetch("/csrf-token");
        const data = await res.json();
        csrfToken = data.csrf_token;
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
    }

    // verifica sessão ao carregar
   async function verificarSessao() {
        if (!csrfToken) {
            await carregarCsrf();
        }

        try {
            const res = await fetch("/session", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                }
            });

            const data = await res.json();

            if (data.logado) {
                mostrarLogado(data.name);
            } else {
                mostrarDeslogado();
            }

        } catch (err) {
            console.error(err);
            mostrarDeslogado();
        }
    }

    // logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const res = await fetch("/logout", {
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

    // MODAIS
    const openButtons = document.querySelectorAll('.btn-open-modal');
    openButtons.forEach(button => { // para cada botão de abrir modal
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) { // ← proteção para evitar erros se o modal não existir
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

    if (btnreceberCodigo && insertcodeBox && inputEmail) {  // ← proteção do bloco inteiro
        inputEmail.addEventListener('input', function () {
            btnreceberCodigo.disabled = !inputEmail.checkValidity();//checkValidity(): método nativo que verifica se o valor do input é válido de acordo com os atributos HTML (como type="email")
        });
        btnreceberCodigo.disabled = true;
    }

    // ── FUNÇÃO GENÉRICA DE OTP ──
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
            fetch('/resend', { method: 'GET', headers: { 'Content-Type': 'application/json', "X-CSRFToken":csrfToken } })
            .then(r => r.json()).then(data => mostrarToast(data.mensagem, data.status));
        });
    }

    // reenvio — excluir conta
    if (otpDelete?.resendBtn) {
        otpDelete.resendBtn.addEventListener('click', () => {
            fetch('/resend', { method: 'GET', headers: { 'Content-Type': 'application/json' } })
            .then(r => r.json()).then(data => mostrarToast(data.mensagem, data.status));
        });
    }

    // BOTÃO REDEFINIR SENHA — desabilitado até senhas válidas e iguais
    const btnRedefinir = document.getElementById('backLogin');
    const newPwInput1  = document.querySelector('#new-password .password1');
    const newPwInput2  = document.querySelector('#new-password .password2');
    const newPwErro1   = document.querySelector('#new-password .erroSenha');
    const newPwErro2   = document.querySelector('#new-password .erroSenha2');

    if (btnRedefinir && newPwInput1 && newPwInput2) {
        btnRedefinir.disabled = true; // começa desabilitado

        function checkRedefinir() {
            const senha1ok = newPwInput1.value.length >= 5;
            const senha2ok = newPwInput2.value.length >= 5;
            const iguais   = newPwInput1.value === newPwInput2.value;
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

    //evento para permitir que o usuário cole um código completo, preenchendo os inputs automaticamente
    document.addEventListener('paste', (e) => {//paste: detecta quando o usuário cola algo, permitindo processar o conteúdo colado
        const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        //clipboardData.getData('text') é usado para obter o texto que o usuário colou
        inputs.forEach((input, i) => {
            input.value = paste[i] || '';//preenche cada input com o dígito correspondente do código colado, ou deixa vazio se não houver mais dígitos
        });
        checkCode();//verifica o código após colar para habilitar/desabilitar o botão de continuar
    });

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
        const mostra = document.getElementById('show_cpf')
        if (!cpf || !mostra) return ;
        mostra.textContent = cpf;
    }

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
        return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})\-(\d{2})/, "$1.***.***-$4");
    }

    // função que pega as informações da api e relaciona com o htmls
    function info_user() {
        fetch("/session", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken":csrfToken
            }
        }) 
        .then(res => res.json())
        .then(data => {
            console.log('yey')
            let cpf = mascara_CPF_config(data.cpf);
            console.log("cpf")
            info_user_CPF(cpf);
            info_user_data(data.data);
            info_user_email(data.email);
            info_user_name(data.name);
        });
    }

    function fecharModal(form) {

        const dialog = form.closest('dialog');

        if (dialog) {
            dialog.close();
            document.body.classList.remove('modal-open');
        }

        form.reset();
    }

    function codigoInserido() {
        const inputs = document.querySelectorAll('.otp-input');
        if (inputs.length === 0) return null;
        return Array.from(inputs).map(i => i.value).join('');
        
    }

    // ENVIO DOS FORMS
    document.querySelectorAll('.forms').forEach(form => {
        const senha1 = form.querySelector('.password1');
        const senha2 = form.querySelector('.password2');
        const erro = form.querySelector('.erroSenha2');

        setupConfirmarSenha(senha1,senha2,erro)
        form.addEventListener('submit', function (validarForm) {
            validarForm.preventDefault();

            const dialog = form.closest('dialog');
            if (dialog && !dialog.open) return;

            let envio = true;
            if (!form.checkValidity()) envio = false;
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
            if (!envio) {//se envio for false, ou seja, se alguma validação falhou, o formulário não será enviado e as mensagens de erro serão exibidas
                form.reportValidity();
                return;
            } 
            
            if (form.classList.contains('sign')) {
                const captcha = grecaptcha.getResponse();

                if (captcha.length === 0) {
                    mostrarToast('Por favor, marque a caixa "Não sou um robô"', 'error')
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
                
                
                fetch("/signin", {
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
                        const dado = {
                            username_email: dados['user_name'],
                            senha: dados['senha']
                        }

                        fetch("/login", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken":csrfToken
                        },
                        body: JSON.stringify(dado)
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.status == 'error'){
                                mostrarToast(data.mensagem, data.status)
                            } else {
                                fecharModal(form);
                                window.location.href = '/';
                                verificarSessao();
                            }
                        });
                        fecharModal(form);
                    }
                });
            }

            if (form.classList.contains('login')) {
                const dados = {
                    username_email: document.getElementById('user_email').value,
                    senha: document.getElementById('senha_login').value
                }

                fetch("/login", {
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
                        window.location.href = '/';
                        verificarSessao();
                        
                    }
                });
            }

            if (form.classList.contains('email-forgot-password')) {
                const dados = {
                    email: document.getElementById('email_forgot').value,
                    who: 'forgot_password'
                };

                fetch("/forgot", {
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

            if (form.classList.contains('insert-code')) {
                const otp = form.closest('#modal-3') ? otpDelete : otpLogin;
                const codigo = otp ? otp.getCode() : '';

                fetch('/check_codigo', {
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
                        fetch('/delete', {
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

            if (form.classList.contains('new-password')) {
                const dados = {
                    nova_senha: form.querySelector('.password2').value
                }

                fetch("/redefine_password", {
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
            if (form.classList.contains('form-new-password')) {
                const dados = {
                    senha_nova: form.querySelector('.password2').value,
                    senha_antiga: form.querySelector('.password-atual').value
                }
            
                fetch("/update", {
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
    const btnDeleteAccount = document.querySelector(".btn-delete-code");
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener("click", function() {
            const dados = {
                email: document.getElementById("show_email").textContent,
                who: 'delete_account'
            };

            fetch("/forgot", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRFToken":csrfToken },
                body: JSON.stringify(dados)
            })
            .then(res => res.json())
            .then(data => {
                mostrarToast(data.mensagem, data.status);

                if (data.status === 'success') {
                    wrapperDelete.style.display = 'none';
                    const insertCodeDelete = modal3 ? modal3.querySelector('#insert-code') : null;
                    if (insertCodeDelete) insertCodeDelete.style.display = 'flex';
                    if (otpDelete) { otpDelete.reset(); otpDelete.startTimer(); }
                }
            });
        });
    }

    const btnDelete = document.querySelector(".btn-delete");
    if (btnDelete) {
        btnDelete.addEventListener("click", function() {
        fetch("/delete", {
                method:"DELETE",
                headers: {
                    "Content-Type":"application/json",
                    "X-CSRFToken":csrfToken
                }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status == 'error'){
                        mostrarToast(data.mensagem, data.status)
                        return 
                    } 
                    mostrarToast(data.mensagem, data.status)
                    //fecharModal(form)
                    verificarSessao()
                    window.location.href = "/";
                    
                });
        })
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

    // substitui os listeners de troca de tela que você já tem:
    // esqueceu senha: login → email
    if (forgotLink) {
        forgotLink.addEventListener('click', e => {
            e.preventDefault();
            loginBox.querySelectorAll('input').forEach(i => i.value = '');
            if (changeButton) changeButton.style.display = 'none';
            telaAtual.avancar('login', 'email');
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
                document.body.classList.remove('modal-open');

                // limpa todos os inputs do modal ao fechar
                modal.querySelectorAll('input').forEach(input => input.value = '');
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
            }
        });
    });

    // FLIP LOGIN ↔ CADASTRO — limpa inputs dos dois lados
    const checkbox = document.getElementById('checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', () => { 
            document.getElementById('wrap').querySelectorAll('input').forEach(input => input.value = '');
            document.querySelectorAll('.erroSenha, .erroSenha2, #erroIdade').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.input-erro').forEach(el => el.classList.remove('input-erro'));
        });
    }

    // BOTÃO CADASTRAR — desabilitado até tudo preenchido e checkbox marcado
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

    // Página Inicial - Em Alta (galeria de lives)
    const carouselHome = document.querySelector('.carousel-wrap');
    const trackHome    = document.getElementById('track-home');

    if (carouselHome && trackHome) {
        let currentHome = 0;
        const totalHome = trackHome.children.length; // pega automático

        function goToHome(i) {
            currentHome = (i + totalHome) % totalHome;
            const w = trackHome.children[0].offsetWidth;
            trackHome.style.transform = `translateX(-${currentHome * w}px)`;
        }

        document.getElementById('prev').addEventListener('click', () => goToHome(currentHome - 1));
        document.getElementById('next').addEventListener('click', () => goToHome(currentHome + 1));
        window.addEventListener('resize', () => goToHome(currentHome));
    }

    //controles dos videos
    const player = document.getElementById('player');
    const gifImg = document.getElementById('gif-img');
    const playBtn = document.getElementById('play-btn');
    const playIcon = document.getElementById('play-icon');
    const progFill = document.getElementById('progress-fill');
    const progWrap = document.getElementById('progress-wrap');
    const muteBtn = document.getElementById('mute-btn');
    const volIcon = document.getElementById('vol-icon');
    const volRange = document.getElementById('vol-range');
    const fsBtn = document.getElementById('fs-btn');
    const fsIcon = document.getElementById('fs-icon');

    if (player) {
        let playing = true;
        let muted = false;
        let progress = 0;
        let timer;

        // ── PROGRESSO SIMULADO (GIF não tem timeupdate) ──
        function startProgress() {
            clearInterval(timer);
            timer = setInterval(() => {
                progress = (progress + 0.08) % 100; // loop de 0 a 100
                progFill.style.width = progress + '%';
            }, 100);
        }
        function stopProgress() { clearInterval(timer); }

        // ── PLAY / PAUSE ──
        function togglePlay() {
            playing = !playing;
            if (playing) {
                player.classList.remove('paused');
                playIcon.className = 'ti ti-player-pause'; // ícone de pause
                gifImg.src = gifImg.src; // reinicia o GIF (truque para simular play)
                startProgress();
            } else {
                player.classList.add('paused');
                playIcon.className = 'ti ti-player-play';
                stopProgress();
            }
        }

        // clique no botão ou na área do vídeo
        playBtn.addEventListener('click', e => { e.stopPropagation(); togglePlay(); });
        player.addEventListener('click', togglePlay);

        // ── BARRA DE PROGRESSO ──
        progWrap.addEventListener('click', e => {
            e.stopPropagation();
            const rect = progWrap.getBoundingClientRect();
            progress = ((e.clientX - rect.left) / rect.width) * 100;
            progFill.style.width = progress + '%';
        });

        // ── MUTE ──
        muteBtn.addEventListener('click', e => {
            e.stopPropagation();
            muted = !muted;
            volIcon.className = muted ? 'ti ti-volume-off' : 'ti ti-volume';
            volRange.value    = muted ? 0 : 80;
        });

        // ── VOLUME ──
        volRange.addEventListener('input', e => {
            e.stopPropagation();
            muted = volRange.value == 0;
            // ícone muda conforme o nível
            if (muted)              volIcon.className = 'ti ti-volume-off';
            else if (volRange.value < 50) volIcon.className = 'ti ti-volume-2';
            else                    volIcon.className = 'ti ti-volume';
        });

        // ── TELA CHEIA ──
        fsBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!document.fullscreenElement) {
                player.requestFullscreen?.();
                fsIcon.className = 'ti ti-arrows-minimize';
            } else {
                document.exitFullscreen?.();
                fsIcon.className = 'ti ti-arrows-maximize';
            }
        });

        // inicia o progresso simulado ao carregar
        startProgress();
    }

    //----------------MOON--------------------
    // CARROSSEL 
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
    const blockFeedback = document.getElementById('block-feedback');
    const toggleBtn = document.getElementById('toggle-blocked');
    const toggleIcon = document.getElementById('toggle-icon');
    const listWrap = document.getElementById('blocked-list-wrap');
    const listInner = document.getElementById('blocked-list-inner');
    const blockedTable = document.getElementById('blocked-table');
    const blockBody = document.getElementById('blocked-body');
    const blockEmpty = document.getElementById('blocked-empty');

    if (blockBtn) {
        let isOpen = false; //controla pra saber se o dropdown tá aberto
        let blockUsers = []; //array que vai guardar os usuários bloqueados

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
                    //cria as 3 células da table (nome, data e botão para desbloquear)
                    tr.innerHTML = `
                        <td>${usuario.nome}</td>
                        <td>${usuario.data}</td>
                        <td>
                            <button class="unblock-btn" data-index="${index}">Desbloquear</button>
                        </td>
                    `; 
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
                            const res = await fetch("/desbloquear", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-CSRFToken":csrfToken
                            },
                            body: JSON.stringify(dados)
                            }); 
                            const data = await res.json();

                            blockFeedback.textContent = data.mensagem;

                            blockUsers.splice(i, 1);//remove do array
                            renderTable();//reenderiza a table
                            updateHeight();//ajusta tamanho do dropdown
                        } catch {
                            blockFeedback.textContent = 'Erro ao desbloquear usuário';
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

            blockFeedback.textContent = '';

            if (!nome) return;

            // verifica se já está bloqueado
            const alreadyExists = blockUsers.find(
                u => u.nome.toLowerCase() === nome.toLowerCase()
            );

            if (alreadyExists) {
                blockFeedback.textContent = 'Esse usuário já está bloqueado';
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

                const res = await fetch("/bloquear", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken":csrfToken
                    },
                    body: JSON.stringify(dados)
                });

                const data = await res.json();

                

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
                    blockFeedback.textContent = 'Usuário não encontrado';
                }

            } catch (erro) {

                

                blockFeedback.textContent =
                    'Erro ao verificar. Tente novamente';

            } finally {

                // SEMPRE executa
                blockBtn.disabled = false;
                blockBtn.textContent = 'Bloquear';
            }
        });
    }

    //--------------perfil.html (meu canal)-------------------
    // UPLOAD DE FOTO DE PERFIL
    const uploadFoto = document.getElementById('upload-foto');
    const previewFoto = document.getElementById('preview-foto');
    const fotoPerfilPag = document.querySelector('.photo-user');

    const btnEditar = document.getElementById('btn-editar');
    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            // Busca dados SEMPRE da sessão atual, nunca do localStorage
            fetch("/session", { method: "GET", headers : {"Content-Type": "application/json", "X-CSRFToken":csrfToken } })
            .then(res => res.json())
            .then(data => {
                const inputNome = document.getElementById('name-user');
                const inputBio  = document.getElementById('bio-user');
                const previewFoto = document.getElementById('preview-foto');

                if (inputNome) inputNome.value = data.name || '';
                if (inputBio)  inputBio.value  = data.bio  || '';

                if (data.foto && previewFoto) {
                    previewFoto.src = data.foto;
                    previewFoto.classList.add('tem-foto');
                } else if (previewFoto) {
                    previewFoto.src = '/static/user.png';
                    previewFoto.classList.remove('tem-foto');
                }
            });
        });
    }

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
                    const res = await fetch('/salvar_foto', {
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

                const res_ = await fetch('/editar_nome', {
                    method: 'POST',
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

                const resp = await fetch('/editar_bio', {
                    method: 'POST',
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
                    const bgAvatar = document.querySelector('#dropdown-usuario .background-avatar');
                    if (bgAvatar) {
                        bgAvatar.innerHTML = `<img src="${fotoTemp}" 
                            style="width:38px;height:38px;border-radius:50%;object-fit:cover;" 
                            alt="avatar">`;
                    }

                    fotoTemp = null;
                }

                const modal4 = document.getElementById('modal-4');
                if (modal4) { modal4.close(); document.body.classList.remove('modal-open'); }
                mostrarToast('Perfil atualizado!', 'success');

            } catch { mostrarToast('Erro ao salvar perfil.', 'error'); }
        });
    }
    
    function info_user() {
        fetch("/session", { method: "GET", headers: {'Content-Type': 'application/json',"X-CSRFToken":csrfToken } })
        .then(res => res.json())
        .then(data => {
            info_user_name(data.name);
            info_user_email(data.email);
            info_user_CPF(mascara_CPF_config(data.cpf));
            info_user_data(data.data);

            const bioPag  = document.getElementById('bio-usuario');
            const bioDesc = document.getElementById('description-channel');
            if (bioPag && data.bio)  bioPag.textContent  = data.bio;
            if (bioDesc && data.bio) bioDesc.textContent = data.bio;

            if (data.foto) {
                const fotoPerfilPag = document.querySelector('.photo-user');
                if (fotoPerfilPag) { fotoPerfilPag.src = data.foto; fotoPerfilPag.classList.add('tem-foto'); }
                const bgAvatar = document.querySelector('#dropdown-usuario .background-avatar');
                if (bgAvatar) bgAvatar.innerHTML = `<img src="${data.foto}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;" alt="avatar">`;
            }
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
            btnSelectCat.classList.toggle('open');
            selectDropdown.classList.toggle('open');
        });

        // fecha ao clicar fora
        document.addEventListener('click', (e) => {
            if (!document.getElementById('select-categorias').contains(e.target)) {
                btnSelectCat.classList.remove('open');
                selectDropdown.classList.remove('open');
            }
        });

        // atualiza tags ao marcar/desmarcar
        selectDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => updateTags());
        });

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
                tag.innerHTML = `
                    <span>${label}</span>
                    <button type="button" title="Remover">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;
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

    async function init() {
        await carregarCsrf();
        await verificarSessao();
        info_user();
    }

    init();

});