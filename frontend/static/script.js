//DOMContentLoaded garante que o script só rode depois de todo o HTML estar carregado
document.addEventListener('DOMContentLoaded', function () {

    // CARREGAMENTO DO CSRF TOKEN 
    // o token é necessário para proteger contra ataques CSRF, garantindo que as requisições venham de fontes confiáveis
    let csrfToken = null;
    async function carregarCsrf() {
        const res = await fetch("http://127.0.0.1:5000/csrf-token");
        const data = await res.json();
        csrfToken = data.csrf_token;
    }

    carregarCsrf()
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
                    <i class="fa-solid fa-bars menu-icon without-login" style="color: rgb(255, 255, 255);"></i>
                    <i class="fa-solid fa-user with-login menu-icon" style="color: rgb(255, 255, 255);"></i>
                `;
            }
        }
    }

    // verifica sessão ao carregar
    async function verificarSessao() {

        try {
            const res = await fetch("http://127.0.0.1:5000/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                }
            });

            const data = await res.json();

            if (data.logado) {
                mostrarLogado(data.name);
                info_user(data);
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
            const res = await fetch("http://127.0.0.1:5000/logout", {
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
            fetch('http://127.0.0.1:5000/resend', { method: 'GET', headers: { 'Content-Type': 'application/json', "X-CSRFToken":csrfToken } })
            .then(r => r.json()).then(data => mostrarToast(data.mensagem, data.status));
        });
    }

    // reenvio — excluir conta
    if (otpDelete?.resendBtn) {
        otpDelete.resendBtn.addEventListener('click', () => {
            fetch('http://127.0.0.1:5000/resend', { method: 'GET', headers: { 'Content-Type': 'application/json' } })
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

    //evento para permitir que o usuário cole um código completo, preenchendo os inputs automaticamente
    document.addEventListener('paste', (e) => {//paste: detecta quando o usuário cola algo, permitindo processar o conteúdo colado
        const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        //clipboardData.getData('text') é usado para obter o texto que o usuário colou
        inputs.forEach((input, i) => {
            input.value = paste[i] || '';//preenche cada input com o dígito correspondente do código colado, ou deixa vazio se não houver mais dígitos
        });
        checkCode();//verifica o código após colar para habilitar/desabilitar o botão de continuar
    });

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
        const mostra = document.getElementById('show_cpf')
        if (!cpf || !mostra) return ;
        mostra.textContent = cpf;
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
        return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})\-(\d{2})/, "$1.***.***-$4");
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
                //const captcha = grecaptcha.getResponse();

                //if (captcha.length === 0) {
                //    mostrarToast('Por favor, marque a caixa "Não sou um robô"', 'error')
                //    return;
                //}
                
                const dados = {
                    cpf: document.getElementById("cpf").value,
                    email: document.getElementById("email").value,
                    user_name: document.getElementById("user-cadastro").value,
                    data_nascimento: document.getElementById("data-nascimento").value,
                    senha: document.getElementById("senha").value,
                    //captcha: captcha
                };
                
                
                fetch("http://127.0.0.1:5000/signin", {
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
                        return null; // sinaliza que não deve continuar pro login
                    }
                    return res.json();
                })
                .then(data => {
                    if (!data) return; // erro já tratado acima

                    if (data.status == 'error') {
                        mostrarToast(data.mensagem, data.status);
                    } else {
                        const dado = {
                            username_email: dados['user_name'],
                            senha: dados['senha']
                        };

                        fetch("http://127.0.0.1:5000/login", {
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
                });
            }

            // LOGIN
            if (form.classList.contains('login')) {
                const dados = {
                    username_email: document.getElementById('user_email').value,
                    senha: document.getElementById('senha_login').value
                }

                fetch("http://127.0.0.1:5000/login", {
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
                fetch("http://127.0.0.1:5000/forgot", {
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

                fetch('http://127.0.0.1:5000/check_codigo', {
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
                        fetch('http://127.0.0.1:5000/delete', {
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

                fetch("http://127.0.0.1:5000/redefine_password", {
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
            
                fetch("http://127.0.0.1:5000/update", {
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

            fetch("http://127.0.0.1:5000/forgot", {
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

    // BOTÃO DE CONFIRMAR EXCLUSÃO DE CONTA
    const btnDelete = document.querySelector(".btn-delete");
    if (btnDelete) {
        btnDelete.addEventListener("click", function() {
        if (delete_code == 'error') {
            return
        }
        
        fetch("http://127.0.0.1:5000/delete", {
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
            fetch("http://127.0.0.1:5000/forgot", {
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

                //if (typeof grecaptcha !== 'undefined') {
                //    grecaptcha.reset();
                //}
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

                // renderiza o captcha só quando o cadastro aparecer
                //if (checkbox.checked && !captchaRendered) {
                //    grecaptcha.render('recaptcha-container', {
                //        sitekey: '6LemWTAtAAAAAM2v-HHAGkaNtjG8vm-Huju47Nvs'
                //    });
                //    captchaRendered = true;
                //}
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

    // Página Inicial - Em Alta (galeria de lives)
    const carouselHome = document.querySelector('.carousel-wrap');
    const trackHome = document.getElementById('track-home');

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

    /*controles dos videos
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
            if (muted) volIcon.className = 'ti ti-volume-off';
            else if (volRange.value < 50) volIcon.className = 'ti ti-volume-2';
            else volIcon.className = 'ti ti-volume';
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
    }*/

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
                            const res = await fetch("http://127.0.0.1:5000/desbloquear", {
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

                const res = await fetch("http://127.0.0.1:5000/bloquear", {
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
            fetch("/session", {
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
                    const res = await fetch('http://127.0.0.1:5000/salvar_foto', {
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

                const res_ = await fetch('http://127.0.0.1:5000/editar_nome', {
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

                const resp = await fetch('http://127.0.0.1:5000/editar_bio', {
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

    // ── INICIALIZAÇÃO ──
    async function init() {
        await carregarCsrf();
       // mostrarDeslogado()
        await verificarSessao();

        if (document.getElementById('block-btn')) {
            fetch('http://127.0.0.1:5000/bloqueados', {
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
                console.log('aaaa:)')
                blockUsers = data.bloqueados
            }
        });
        }
        await carrregarGerarPreferencias('noti_switches');
        await carrregarGerarPreferencias('pref_switches');
    }

    // ── LIVES: salvar e renderizar histórico no perfil ──
    function getLives() {
        try { return JSON.parse(sessionStorage.getItem('witch_lives') || '[]'); } catch { return []; }
    }
    function saveLives(lives) {
        try { sessionStorage.setItem('witch_lives', JSON.stringify(lives)); } catch {}
    }
    
    /*const _livesMemoria = [];

    function getLives() {
        return _livesMemoria;
    }

    function saveLives(lives) {
        // mantém o array em memória — persiste enquanto a aba estiver aberta
        _livesMemoria.length = 0;
        lives.forEach(l => _livesMemoria.push(l));
    }*/

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
    const labelVideoEscolhido = document.getElementById('label-video-escolhido');
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

    const modal6 = document.getElementById('modal-6');
    const btnIniciarLive = document.getElementById('btn-iniciar-live');
    if (btnIniciarLive) {
        btnIniciarLive.addEventListener('click', () => {
            const nomeLive = document.getElementById('nome-live')?.value.trim();
            const descLive = document.getElementById('descricao-live')?.value.trim();
            const videoInput = document.getElementById('video-live');
            const categorias = [...document.querySelectorAll('#select-dropdown input:checked')].map(cb => cb.value);

            if (!nomeLive) { mostrarToast('Digite um nome para o vídeo!', 'error'); return; }

            const videoFile = videoInput?.files[0];

            const editandoId = modal6?.dataset.editandoId ? Number(modal6.dataset.editandoId) : null;
            const salvarLive = (videoSrc, thumbSrc) => {
                const lives = getLives();

                if (editandoId) {
                    // FIX: edição — sobrescreve o vídeo existente
                    const idx = lives.findIndex(l => l.id === editandoId);
                    if (idx !== -1) {
                        lives[idx].titulo    = nomeLive;
                        lives[idx].descricao = descLive || '';
                        lives[idx].categorias = categorias;
                        if (thumbSrc) lives[idx].thumb = thumbSrc;
                        if (videoSrc) lives[idx].src   = videoSrc;
                    }
                    if (modal6) delete modal6.dataset.editandoId;
                } else {
                    // novo vídeo
                    lives.unshift({
                        id: Date.now(),
                        titulo: nomeLive,
                        descricao: descLive || '',
                        categorias,
                        src: videoSrc,
                        thumb: thumbSrc || '',
                        data: new Date().toLocaleDateString('pt-BR'),
                        views: 0,
                        curtidas: 0,
                        comentarios: [],
                        aoVivo: false
                    });
                }

                saveLives(lives);
                renderVideosPerfil();
                if (modal6) { modal6.close(); document.body.classList.remove('modal-open'); }
                mostrarToast(editandoId ? 'Vídeo atualizado!' : 'Vídeo salvo!', 'success');

                thumbTemp = null; thumbFile = null;
                const prevThumb = document.getElementById('preview-thumb');
                if (prevThumb) { prevThumb.src = ''; prevThumb.style.backgroundColor = '#000'; prevThumb.classList.remove('tem-foto'); }
                const labelArq = document.getElementById('label-video-escolhido');
                if (labelArq) { labelArq.textContent = ''; labelArq.style.display = 'none'; }
            };

            // FIX: usa blob URL para vídeo — muito mais rápido e sem limite de tamanho
            const videoSrc = videoFile ? URL.createObjectURL(videoFile) : '';

            if (thumbFile) {
                const rThumb = new FileReader();
                rThumb.onload = (et) => salvarLive(videoSrc, et.target.result);
                rThumb.readAsDataURL(thumbFile);
            } else {
                salvarLive(videoSrc, '');
            }

            // lê o vídeo se houver, senão salva com src vazio
            const lerThumb = (videoSrc) => {
                if (thumbFile) {
                    const rThumb = new FileReader();
                    rThumb.onload = (et) => salvarLive(videoSrc, et.target.result);
                    rThumb.readAsDataURL(thumbFile);
                } else {
                    salvarLive(videoSrc, '');
                }
            };

            if (videoFile) {
                const rVideo = new FileReader();
                rVideo.onload = (ev) => lerThumb(ev.target.result);
                rVideo.onerror = () => mostrarToast('Erro ao ler o vídeo.', 'error');
                rVideo.readAsDataURL(videoFile);
            } else {
                // permite salvar sem vídeo (ex: só live)
                lerThumb('');
            }
        });
    }

    function formatarTempo(s) {
        const m = Math.floor(s / 60);
        const seg = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${seg}`;
    }

    function criarClipe(live) {
        if (!live.src) { mostrarToast('Nenhum vídeo para criar clipe.', 'error'); return; }

        // cria um vídeo temporário para capturar os primeiros 60s
        const vidTemp = document.createElement('video');
        vidTemp.src = live.src;
        vidTemp.muted = true;

        vidTemp.addEventListener('loadedmetadata', () => {
            const duracao = Math.min(vidTemp.duration, 60);
            mostrarToast(`Clipe de ${Math.round(duracao)}s criado! (simulação — requer backend para corte real)`, 'success');
            // Em produção: enviar live.src + tempo início/fim para o backend cortar com ffmpeg
        });
    }

    function renderVideosPerfil() {
        const container = document.getElementById('videos-perfil-grid');
        if (!container) return;
        const lives = getLives();
        container.innerHTML = '';

        if (lives.length === 0) {
            container.innerHTML = '<p style="color:#888;text-align:center;padding:20px;grid-column:1/-1;">Nenhuma live realizada ainda.</p>';
            return;
        }

        lives.forEach(live => {
            const card = document.createElement('div');
            card.className = 'video-card-perfil';

            const thumbDiv = document.createElement('div');
            thumbDiv.className = 'video-thumb-perfil';

            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.muted = true;
            vid.loop  = true;
            if (live.src) vid.src = live.src;
            thumbDiv.appendChild(vid);

            if (live.thumb) {
                const capa = document.createElement('img');
                capa.src = live.thumb;
                capa.className = 'thumb-cover';
                capa.alt = live.titulo;
                thumbDiv.appendChild(capa);
            }

            if (live.aoVivo) {
                const badge = document.createElement('span');
                badge.className = 'thumb-badge-live';
                badge.textContent = 'AO VIVO';
                thumbDiv.appendChild(badge);
            }

            const views = document.createElement('span');
            views.className = 'thumb-views-perfil';
            views.textContent = `${live.views} visualizações`;
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

            progWrap.addEventListener('mousedown', e => {
                e.stopPropagation();
                isDragging = true;
                moverBarra(e);
            });
            document.addEventListener('mousemove', e => {
                if (isDragging) moverBarra(e);
            });
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
            progWrap.addEventListener('click', e => {
                e.stopPropagation();
            });
            thumbDiv.addEventListener('click', e => {
                if (progWrap.contains(e.target)) return;
                abrirPlayerExpandido(live);
            });

            // info abaixo — com botão de 3 pontos
            const titulo = document.createElement('p');
            titulo.className = 'video-card-titulo';
            titulo.textContent = live.titulo;

            const cats = document.createElement('p');
            cats.className = 'video-card-categorias';
            cats.textContent = live.categorias?.join(' • ') || '';
            cats.style.cssText = 'font-size:0.78em;color:#9147FF;';

            const nomeCanal = document.querySelector('.show_name')?.textContent || 'Meu Canal';
            const canal = document.createElement('p');
            canal.className = 'video-card-canal';
            canal.textContent = nomeCanal;

            const dataEl = document.createElement('p');
            dataEl.className = 'video-card-info';
            dataEl.textContent = live.data;

            // linha inferior com data + botão 3 pontos
            const infoRow = document.createElement('div');
            infoRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

            const btnOpcoes = document.createElement('button');
            btnOpcoes.className = 'btn-opcoes-video';
            btnOpcoes.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
            btnOpcoes.title = 'Opções';

            // menu de opções
            const menuOpcoes = document.createElement('div');
            menuOpcoes.className = 'menu-opcoes-video';
            menuOpcoes.innerHTML = `
                <button class="opcao-video" data-acao="excluir">
                    <i class="fa-solid fa-trash"></i> Excluir
                </button>
                <button class="opcao-video" data-acao="editar">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button class="opcao-video" data-acao="salvar">
                    <i class="fa-solid fa-download"></i> Salvar vídeo
                </button>
                <button class="opcao-video" data-acao="clipe">
                    <i class="fa-solid fa-scissors"></i> Criar clipe (60s)
                </button>
            `;

            // abre/fecha o menu
            btnOpcoes.addEventListener('click', e => {
                e.stopPropagation();
                // fecha todos os outros menus abertos
                document.querySelectorAll('.menu-opcoes-video.show').forEach(m => {
                    if (m !== menuOpcoes) m.classList.remove('show');
                });
                menuOpcoes.classList.toggle('show');
            });

            // ações do menu
            menuOpcoes.querySelectorAll('.opcao-video').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    const acao = btn.dataset.acao;

                    if (acao === 'excluir') {
                        if (!confirm(`Excluir "${live.titulo}"?`)) return;
                        const lives = getLives();
                        const idx = lives.findIndex(l => l.id === live.id);
                        if (idx !== -1) { lives.splice(idx, 1); saveLives(lives); }
                        renderVideosPerfil();

                    } else if (acao === 'editar') {
                        // abre modal-6 preenchido com os dados do vídeo
                        if (!modal6) return;
                        document.getElementById('nome-live').value      = live.titulo;
                        document.getElementById('descricao-live').value = live.descricao || '';
                        // marca as categorias salvas
                        document.querySelectorAll('#select-dropdown input[type="checkbox"]').forEach(cb => {
                            cb.checked = live.categorias?.includes(cb.value) || false;
                        });
                        // atualiza as tags visíveis
                        const tags = document.getElementById('selected-tags');
                        const ph   = document.getElementById('select-placeholder');
                        if (tags) {
                            tags.innerHTML = '';
                            (live.categorias || []).forEach(val => {
                                const label = document.querySelector(`#select-dropdown input[value="${val}"]`)
                                    ?.closest('label')?.textContent.trim() || val;
                                const tag = document.createElement('div');
                                tag.className = 'tag';
                                tag.innerHTML = `<span>${label}</span><button type="button"><i class="fa-solid fa-xmark"></i></button>`;
                                tag.querySelector('button').addEventListener('click', () => {
                                    document.querySelector(`#select-dropdown input[value="${val}"]`).checked = false;
                                    tag.remove();
                                });
                                tags.appendChild(tag);
                            });
                            if (ph) ph.textContent = live.categorias?.length
                                ? `${live.categorias.length} selecionada${live.categorias.length > 1 ? 's' : ''}`
                                : 'Selecione categorias...';
                        }
                        // thumbnail
                        const prevThumb = document.getElementById('preview-thumb');
                        if (prevThumb && live.thumb) {
                            prevThumb.src = live.thumb;
                            prevThumb.classList.add('tem-foto');
                        }
                        // marca o id para sobrescrever ao confirmar
                        modal6.dataset.editandoId = live.id;
                        modal6.showModal();
                        document.body.classList.add('modal-open');

                    } else if (acao === 'salvar') {
                        if (!live.src) { mostrarToast('Nenhum vídeo disponível para download.', 'error'); return; }
                        const a = document.createElement('a');
                        a.href     = live.src;
                        a.download = `${live.titulo}.mp4`;
                        a.click();

                    } else if (acao === 'clipe') {
                        criarClipe(live);
                    }

                    menuOpcoes.classList.remove('show');
                });
            });

            // fecha ao clicar fora
            document.addEventListener('click', () => menuOpcoes.classList.remove('show'));

            infoRow.appendChild(dataEl);
            infoRow.appendChild(btnOpcoes);

            // wrapper relativo para posicionar o menu
            const opcWrapper = document.createElement('div');
            opcWrapper.style.cssText = 'position:relative;';
            opcWrapper.appendChild(btnOpcoes);
            opcWrapper.appendChild(menuOpcoes);

            card.append(thumbDiv, titulo, cats, canal, infoRow, opcWrapper);
            container.appendChild(card);
        });
    }

    // player expandido
    function abrirPlayerExpandido(live) {
        const overlay    = document.getElementById('video-player-overlay');
        const videoEl    = document.getElementById('video-expandido');
        const tituloTop  = document.getElementById('player-titulo-topo');
        const tituloCtrl = document.getElementById('player-titulo-controle');
        const progWrap   = document.getElementById('progress-wrap-exp');
        const progFill   = document.getElementById('progress-fill-exp');
        const playBtn    = document.getElementById('play-btn-exp');
        const playIcon   = document.getElementById('play-icon-exp');
        const muteBtn    = document.getElementById('mute-btn-exp');
        const volIcon    = document.getElementById('vol-icon-exp');
        const volRange   = document.getElementById('vol-range-exp');
        const timeLabel  = document.getElementById('time-label-exp');
        const fsBtn      = document.getElementById('fs-btn-exp');
        const fsIcon     = document.getElementById('fs-icon-exp');
        const fecharBtn  = document.getElementById('fechar-player');

        // vídeo
        videoEl.src    = live.src || '';
        videoEl.volume = 0.8;
        videoEl.muted  = false;
        volRange.value = 80;
        tituloTop.textContent  = live.titulo;
        tituloCtrl.textContent = live.titulo;

        // painel de info
        document.getElementById('player-info-titulo').textContent = live.titulo;
        document.getElementById('player-info-cats').textContent   = live.categorias?.join(' • ') || '';
        document.getElementById('player-info-data').textContent   = live.data;

        const nomeCanal = document.querySelector('.show_name')?.textContent || 'Meu Canal';
        const fotoCanal = document.querySelector('.photo-user')?.src || '/static/user.png';
        document.getElementById('player-canal-nome-text').textContent = nomeCanal;
        document.getElementById('player-canal-foto-img').src          = fotoCanal;

        // curtidas
        const btnCurtir     = document.getElementById('btn-curtir');
        const countCurtidas = document.getElementById('count-curtidas');
        btnCurtir.classList.remove('ativo');
        countCurtidas.textContent = live.curtidas || 0;

        btnCurtir.onclick = () => {
            const lives = getLives();
            const idx = lives.findIndex(l => l.id === live.id);
            if (idx === -1) return;
            if (btnCurtir.classList.contains('ativo')) {
                lives[idx].curtidas = Math.max(0, (lives[idx].curtidas || 1) - 1);
                btnCurtir.classList.remove('ativo');
            } else {
                lives[idx].curtidas = (lives[idx].curtidas || 0) + 1;
                btnCurtir.classList.add('ativo');
            }
            countCurtidas.textContent = lives[idx].curtidas;
            live.curtidas = lives[idx].curtidas;
            saveLives(lives);
        };

        // compartilhar
        document.getElementById('btn-compartilhar').onclick = () => {
            navigator.clipboard?.writeText(window.location.href)
                .then(() => mostrarToast('Link copiado!', 'success'))
                .catch(()  => mostrarToast('Não foi possível copiar.', 'error'));
        };

        // comentar — foca no input
        document.getElementById('btn-comentar').onclick = () => {
            document.getElementById('comentario-input').focus();
        };

        // comentários salvos
        const listaComent = document.getElementById('comentarios-lista');
        listaComent.innerHTML = '';
        (live.comentarios || []).forEach(c => adicionarComentarioDOM(c.autor, c.texto, c.foto));

        const inputComent = document.getElementById('comentario-input');
        const btnEnviar   = document.getElementById('comentario-enviar');
        inputComent.value = '';

        const enviarComentario = () => {
            const texto = inputComent.value.trim();
            if (!texto) return;
            const nomeUser = document.querySelector('.show_name')?.textContent || 'Você';
            const fotoUser = document.querySelector('.photo-user')?.src || '/static/user.png';
            adicionarComentarioDOM(nomeUser, texto, fotoUser);
            const lives = getLives();
            const idx = lives.findIndex(l => l.id === live.id);
            if (idx !== -1) {
                if (!lives[idx].comentarios) lives[idx].comentarios = [];
                lives[idx].comentarios.push({ autor: nomeUser, texto, foto: fotoUser });
                saveLives(lives);
            }
            inputComent.value = '';
        };

        btnEnviar.onclick         = enviarComentario;
        inputComent.onkeydown     = e => { if (e.key === 'Enter') enviarComentario(); };

        // abre overlay
        overlay.classList.add('show');
        document.body.classList.add('modal-open');
        if (live.src) { videoEl.play().catch(() => {}); playIcon.className = 'fa-solid fa-pause'; }

        playBtn.onclick  = () => {
            if (videoEl.paused) { videoEl.play(); playIcon.className = 'fa-solid fa-pause'; }
            else { videoEl.pause(); playIcon.className = 'fa-solid fa-play'; }
        };
        videoEl.onclick  = () => playBtn.onclick();

        const progressBar = document.getElementById('progress-exp');

        // zera ao abrir
        progressBar.value = 0;

        // atualiza a barra conforme o vídeo avança
        const tick = () => {
            if (videoEl.duration) {
                progressBar.value = (videoEl.currentTime / videoEl.duration) * 100;
                timeLabel.textContent = `${formatarTempo(videoEl.currentTime)} / ${formatarTempo(videoEl.duration)}`;
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        // usuário arrasta a barra
        progressBar.addEventListener('input', () => {
            if (videoEl.duration) {
                videoEl.currentTime = (progressBar.value / 100) * videoEl.duration;
            }
        });

        muteBtn.onclick  = () => {
            videoEl.muted = !videoEl.muted;
            volIcon.className = videoEl.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            volRange.value    = videoEl.muted ? 0 : videoEl.volume * 100;
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
        };
        fecharBtn.onclick = fechar;
        overlay.onclick   = e => { if (e.target === overlay) fechar(); };
    }

    function adicionarComentarioDOM(autor, texto, foto) {
        const lista = document.getElementById('comentarios-lista');
        if (!lista) return;
        const item = document.createElement('div');
        item.className = 'comentario-item';
        item.innerHTML = `
            <img src="${foto}" class="comentario-foto" alt="${autor}">
            <div class="comentario-corpo">
                <span class="comentario-autor">${autor}</span>
                <span class="comentario-texto">${texto}</span>
            </div>`;
        lista.appendChild(item);
        lista.scrollTop = lista.scrollHeight;
    }

    renderVideosPerfil();

    // ── ASIDE → DROPDOWN em telas < 1024px ──
    // sincroniza o conteúdo do aside para dentro do dropdown
    function sincronizarAsideDropdown() {
        const dropdownList = document.querySelector('#dropdown-menu ul');
        if (!dropdownList) return;

        dropdownList.querySelectorAll('.aside-migrado').forEach(el => el.remove());

        if (window.innerWidth >= 1024) return;

        const logado = document.querySelector('.with-login')?.style.display !== 'none';

        // Separador + título AO VIVO
        const hrLives = criarEl('hr', 'aside-migrado' + (logado ? '' : ' hidden-deslogado'));
        const tituloLives = criarEl('li', 'aside-migrado dropdown-section-title' + (logado ? '' : ' hidden-deslogado'));
        tituloLives.innerHTML = '<span style="font-size:0.85em;color:#9147FF;font-weight:bold;">AO VIVO</span>';
        dropdownList.appendChild(hrLives);
        dropdownList.appendChild(tituloLives);

        [['Pessoa 1.0','1.3M'],['Pessoa 2.0','1.3M'],['Pessoa 3.0','1.3M'],['Pessoa 4.0','1.3M']].forEach(([nome, views]) => {
            const li = criarEl('li', 'aside-migrado aside-live-item' + (logado ? '' : ' hidden-deslogado'));
            li.innerHTML = `
                <i class="fa-solid fa-circle" style="color:purple;font-size:1.1em;"></i>
                <span style="flex:1;">${nome}</span>
                <span style="font-size:0.8em;color:#888;">${views}</span>
                <i class="fa-solid fa-circle" style="color:red;font-size:0.4em;"></i>`;
            dropdownList.appendChild(li);
        });

        // Links de configurações e ajuda
        dropdownList.appendChild(criarEl('hr', 'aside-migrado'));

        const configHref = document.querySelector('a[href*="config"]')?.href || '/config';
        const ajudaHref  = document.querySelector('a[href*="ajuda"]')?.href  || '/ajuda';

        const liConfig = criarEl('li', 'aside-migrado' + (logado ? '' : ' hidden-deslogado'));
        liConfig.innerHTML = `<a href="${configHref}" style="display:flex;align-items:center;gap:10px;color:inherit;width:100%;">
            <i class="fa-solid fa-gear" style="font-size:1.2em;color:#9147FF;"></i><span>Configurações</span></a>`;

        const liAjuda = criarEl('li', 'aside-migrado');
        liAjuda.innerHTML = `<a href="${ajudaHref}" style="display:flex;align-items:center;gap:10px;color:inherit;width:100%;">
            <i class="fa-regular fa-circle-question" style="font-size:1.2em;color:#9147FF;"></i><span>Ajuda</span></a>`;

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

    //const recaptchaObserver = new MutationObserver(() => {
        //if (!modal1 || !modal1.open) return;

        //document.querySelectorAll('body > div').forEach(div => {
            // ignora o próprio dialog e qualquer wrapper já processado
            //if (div === modal1 || div.dataset.recaptchaMoved === 'true') return;

            //const isRecaptchaDiv = div.querySelector('iframe[src*="recaptcha"]');
            //if (isRecaptchaDiv) {
            //    div.classList.add('recaptcha-challenge-wrapper');
                //div.dataset.recaptchaMoved = 'true'; // FIX: evita reprocessar o mesmo div em loop
                //modal1.appendChild(div);

                // FIX: quando o iframe do desafio for removido pelo Google
                // (resolveu o captcha ou fechou), some o wrapper inteiro
                //const innerObserver = new MutationObserver(() => {
                //    if (!div.querySelector('iframe[src*="recaptcha"]')) {
                //        div.remove();
                //        innerObserver.disconnect();
                //    }
                //});
                //innerObserver.observe(div, { childList: true, subtree: true });
            //}
        //});
    //});

    //recaptchaObserver.observe(document.body, { childList: true });

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

        //histórico salvo no localstorage
        const HISTORICO_KEY = 'witch_search_historico';

        function getHistorico() {
            try {return JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');}
            catch {return [];}
        }

        function saveHistorico(term) {
            let h = getHistorico().filter(t => t.toLowerCase() !== term.toLowerCase());
            h.unshift(term); //add no inicio
            h = h.slice(0, 5); //mostra apenas as últimas 5 pesquisas
            localStorage.setItem(HISTORICO_KEY, JSON.stringify(h));
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
            const res = await fetch("http://127.0.0.1:5000/preferencias", {
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
                    await fetch("http://127.0.0.1:5000/preferencias", {
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

    init();
});