//garante que o script só tente manipular os elementos HTML (o DOM - Document Object Model)
//após o conteúdo da página ter sido completamente carregado
document.addEventListener('DOMContentLoaded', function () {

    //MODAIS
    //para abrir modal
    //cria constantes dos elementos HTML para poder trabalhar aqui no script
    const openButtons = document.querySelectorAll('.open-modal');
    //forEach = para todos os botões no html de mesmo nome
    openButtons.forEach(button => {
        button.addEventListener('click', () => {
            //pega o id do modal a partir do atributo criado data-modal do botão
            const modalId = button.getAttribute('data-modal');
            //pega o modal usando o id
            const modal = document.getElementById(modalId);
            //abre o modal
            modal.showModal();
            //adiciona uma classe ao body para evitar que a página role quando o modal estiver aberto
            document.body.classList.add('modal-open');
        });
    });
    //para fechar modal
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            //fecha o modal
            modal.close();
            //remove a classe do body para permitir que a página role novamente
            document.body.classList.remove('modal-open');
        });
    });

    //MENU SUPERIOR SOME AO ROLAR A PÁGINA
    //adiciona um evento de scroll à janela (window)
    window.addEventListener('scroll', function () {
        const header = this.document.getElementById('header');
        if (window.scrollY > 80) { //após rolar 80px
            //adiciona a classe 'shrink' ao header para aplicar os estilos de encolhimento
            header.classList.add('shrink');
        } else {
            header.classList.remove('shrink');
        }
    });

    //TROCA DE CARDS LOGIN-RECEBER CODIGO
    const forgotLink = document.querySelector('.forgot-password a');
    const loginBox = document.getElementById('login');
    const emailBox = document.getElementById('email-forgot-password');
    const changeButton = document.querySelector('.change-button');

    if (forgotLink && loginBox && emailBox && changeButton) {
        forgotLink.addEventListener('click', function (troca) {
            troca.preventDefault();
            loginBox.style.display = 'none';
            changeButton.style.display = 'none';
            emailBox.style.display = 'flex';
        });
    }

    //TROCA DE CARDS RECEBER CODIGO-INSERIR CODIGO
    const btnreceberCodigo = document.getElementById('receber-codigo');
    const insertcodeBox = document.getElementById('insert-code');

    if (emailBox && insertcodeBox && btnreceberCodigo) {
        btnreceberCodigo.addEventListener('click', function (troca) {
            troca.preventDefault();
            emailBox.style.display = 'none';
            insertcodeBox.style.display = 'flex';
        });
    }

    //INSERINDO CÓDIGO DE VERIFICAÇÃO
    const inputs = document.querySelectorAll('.otp-input');
    const continueBtn = document.getElementById('continueBtn');

    //função para verificar se todos os campos de código estão preenchidos
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            //pega o valor do campo de entrada
            const value = e.target.value;
            //remove qualquer caractere que não seja número
            input.value = value.replace(/[^0-9]/g, ''); 
            //se o campo tiver um valor e não for o último campo, foca no próximo campo
            //index = posição do campo atual, inputs.length - 1 = posição do último campo
            if (input.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
            //verifica se todos os campos estão preenchidos para habilitar o botão de continuar
            checkCode();
        });
    
        //backspace para voltar ao campo anterior   
        //keydown = evento de pressionar uma tecla, e.key = tecla pressionada
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    //colar código inteiro de uma vez
    //paste = evento de colar, e.clipboardData.getData('text') = pega o texto do clipboard
    document.addEventListener('paste', (e) => {
        const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        //i = posição do campo atual, paste[i] = caractere correspondente do código colado
        inputs.forEach((input, i) => {
            //preenche os campos com os caracteres do código colado, ou deixa vazio se não houver mais caracteres
            input.value = paste[i] || '';
        });
        checkCode();
    });

    //verifica se completou
    function checkCode() {
        //cria uma string com os valores dos campos de código
        //array.from(inputs) = transforma a NodeList de inputs em um array para usar o map
        // join('') = junta os valores sem espaço
        //nodelist = lista de elementos, array = estrutura de dados que pode usar métodos como map
        // map = para cada input pega o valor
        const code = Array.from(inputs).map(input => input.value).join('');
        if (code.length === 5) {
            console.log('Código completo:', code);

            //validar no back depois
            const isValid = true;

            if (isValid) {
                continueBtn.click();
            }
        }
    }

    //REENVIO DO CÓDIGO COM TIMER
    const resendBtn = document.getElementById('resendBtn');
    const timerText = document.getElementById('timerText');

    let timeLeft = 60;
    //interval = variável para armazenar o intervalo do timer
    let interval;

    //botão de reenviar
    resendBtn.addEventListener('click', () => {
        console.log('Código reenviado');

        //inicia o timer
        function startTimer() {
            resendBtn.disabled = true;
            timeLeft = 60;

            timerText.textContent = `Reenviar código em ${timeLeft}s`;
            //limpa qualquer intervalo anterior para evitar múltiplos timers rodando ao mesmo tempo
            interval = setInterval(() => {
                timeLeft--;
                //atualiza o texto do timer a cada segundo
                timerText.textContent = `Reenviar código em ${timeLeft}s`;
                //quando o tempo acabar, para o timer, habilita o botão de reenviar e atualiza o texto
                if (timeLeft <= 0) {
                    //clearInterval = para o timer
                    clearInterval(interval);
                    timerText.textContent = 'Reenviar Código';
                    resendBtn.disabled = false;
                }
            //1000 = 1 segundo, o timer atualiza a cada segundo
            }, 1000);
        }
        startTimer();
    });

    //TROCA DE CARDS INSERIR CODIGO-CRIAR NOVA SENHA
    const newpasswordBox = document.getElementById('new-password');

    if (insertcodeBox && newpasswordBox && continueBtn) {
        continueBtn.addEventListener('click', function (troca) {
            troca.preventDefault();
            insertcodeBox.style.display = 'none';
            newpasswordBox.style.display = 'flex';
        });
    }

    //TROCA DE CARDS CRIAR NOVA SENHA-LOGIN
    const backLogin = document.getElementById('backLogin');

    if (loginBox && changeButton && newpasswordBox && backLogin) {
        backLogin.addEventListener('click', function (troca) {
            troca.preventDefault();
            newpasswordBox.style.display = 'none';
            loginBox.style.display = 'flex';
            changeButton.style.display = 'flex';
        });
    }

    //CADASTRO
    //máscara de CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function (maskCpf) {
            //target = campo de entrada onde o evento ocorreu
            // /\D/g = expressão regular para remover tudo que não for número
            // g = global (remove todos)
            // \D = negação de dígito (qualquer caractere que não seja número)
            // '' = string vazia, ou seja, substitui os caracteres não numéricos por nada
            let mc = maskCpf.target.value.replace(/\D/g, '');
            //slice = corta o valor para no máximo 11 dígitos, evitando que o usuário digite mais do que o permitido
            if (mc.length > 11) mc = mc.slice(0, 11);
            //replace = aplica a formatação do CPF conforme o usuário digita
            mc = mc.replace(/^(\d{3})(\d)/, '$1.$2');
            mc = mc.replace(/(\d{3})(\d)/, '$1.$2');
            mc = mc.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            maskCpf.target.value = mc;
        });
    }
    //MÁSCARA DATA DE NASCIMENTO
    const nascInput = document.getElementById('data-nascimento');
    if (nascInput) {
        nascInput.addEventListener('input', function (maskNasc) {
            //remove tudo que não for número e limita a 8 dígitos (DDMMAAAA)
            let mn = maskNasc.target.value.replace(/\D/g, '');
            if (mn.length > 8) mn = mn.slice(0, 8);
            //aplica a formatação de data conforme o usuário digita
            mn = mn.replace(/^(\d{2})(\d)/, '$1/$2');
            mn = mn.replace(/(\d{2})(\d)/, '$1/$2');
            mn = mn.replace(/(\d{4})(\d)/, '$1/$2');
            maskNasc.target.value = mn;
        });
    }
    //LIMITES DE IDADE 
    const erroIdade = document.getElementById('erroIdade'); 
    function calcularIdade() {
        //verifica se os elementos necessários existem antes de tentar acessá-los
        if(!nascInput || !erroIdade) return null;
         
        const valor = nascInput.value; 
        //verifica se o formato da data é válido (DD/MM/AAAA), se não for, retorna null
        if(!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return null; 
        //split = divide a string em partes usando o separador '/' e map(Number) torna a string do input em número
        const [dia, mes, ano] = valor.split('/').map(Number); 
        //cria um objeto Date com a data de nascimento, lembrando que o mês em JavaScript é zero-indexado (0 = janeiro, 1 = fevereiro, etc.)
        const nascimento = new Date(ano, mes - 1, dia); 
        //cria um objeto Date com a data atual
        const hoje = new Date(); 
        //calcula a idade subtraindo o ano de nascimento do ano atual
        let idade = hoje.getFullYear() - nascimento.getFullYear(); 
        //calcula a diferença de meses entre a data atual e a data de nascimento
        const m = hoje.getMonth() - nascimento.getMonth(); 
        //se a diferença de meses for negativa ou se for o mesmo mês mas o dia atual for menor que o dia de nascimento, subtrai 1 da idade
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) { 
            idade--; 
        } 
        //retorna a idade calculada
        return idade;
    }
    //função para validar a idade e exibir mensagem de erro se for menor que 18 anos
    function validarIdade() {
        let valorIdade = calcularIdade();
        console.log(valorIdade);
        //se o valor da idade for null (data inválida), retorna false para não permitir o cadastro
        if (valorIdade === null) return false;
        //se a idade for menor que 18, exibe a mensagem de erro e adiciona uma classe de erro ao campo de data de nascimento
        if (valorIdade < 18) { 
            erroIdade.style.display = 'block'; 
            nascInput.classList.add('input-erro'); 
            return false;
                    
        } 
        erroIdade.style.display = 'none'; 
        nascInput.classList.remove('input-erro'); 
        return true;
    }
    //adiciona um evento de blur (perda de foco) ao campo de data de nascimento para validar a idade quando o usuário terminar de digitar
    if (nascInput && erroIdade) {
        nascInput.addEventListener('blur', validarIdade); //blur = perde foco
        //adiciona um evento de input para esconder a mensagem de erro e remover a classe de erro assim que o usuário começar a corrigir a data
        nascInput.addEventListener('input', () => {
            erroIdade.style.display = 'none';
            nascInput.classList.remove('input-erro');
        });
    }
    //VALIDAÇÃO DE SENHA
    const passwordBox = document.querySelectorAll('.password-box');

    passwordBox.forEach(passBox => {
        const senhaInput = passBox.querySelector('.password');
        const erroSenha = passBox.querySelector('.erroSenha');

        if (!senhaInput || !erroSenha) return;
        //adiciona blur ao campo de senha para validar a senha quando terminar de digitar
        senhaInput.addEventListener('blur', () => {
            validarSenha(senhaInput, erroSenha);
        });

        senhaInput.addEventListener('input', () => {
            erroSenha.style.display = 'none';
            senhaInput.classList.remove('input-erro');
        })
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
    
    //VALIDAÇÃO NA TROCA DE SENHA
    const senhaInput1 = document.querySelector('.password1');
    const senhaInput2 = document.querySelector('.password2');
    const erroSenha2 = document.querySelector('.erroSenha2');

    function confirmarSenha() {
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

    if (senhaInput1 && senhaInput2 && erroSenha2) {
        senhaInput2.addEventListener('blur', confirmarSenha);
        senhaInput2.addEventListener('input', () => { // sem parâmetro ()
            erroSenha2.style.display = 'none';
            senhaInput2.classList.remove('input-erro');
        });
    }

    //ENVIO DO FORM
    document.querySelectorAll('.sign').forEach(form => { //o mesmo que function (form)
        form.addEventListener('submit', function (validarForm) {
            let envio = true;
            //checkValidity() = método que verifica se os campos do formulário estão válidos de acordo com os atributos HTML (required, pattern, etc.)
            if (!form.checkValidity()) {
                envio = false;
            }
            //verifica se o formulário tem um campo de data de nascimento e se a idade é válida, se não for, impede o envio
            if (form.querySelector('#data-nascimento') && !validarIdade()) {
                envio = false;
            }
            //verifica se o formulário tem um campo de confirmação de senha e se as senhas coincidem, se não for, impede o envio
            if (form.querySelector('.password2') && !confirmarSenha()) {
                envio = false;
            }

            form.querySelectorAll('.password-box').forEach(box => {
                const senhaInput = box.querySelector('.password');
                const erroSenha = box.querySelector('.erroSenha');

                if (!validarSenha(senhaInput, erroSenha)) {
                    envio = false;
                }
            });

            if (!envio) {
                validarForm.preventDefault(); 
                form.reportValidity();
            }
        });
    });
});