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
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    //colar código inteiro de uma vez
    document.addEventListener('paste', (e) => {
        const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        inputs.forEach((input, i) => {
            input.value = paste[i] || '';
        });
        checkCode();
    });

    //verifica se completou
    function checkCode() {
        const code = Array.from(inputs).map(input => input.value).join('');
        if (code.length === 5) {
            console.log('Código completo:', code);

            //validar no back depois
            const isValid = true

            if (isValid) {
                continueBtn.click();
            }
        }
    }

    //REENVIO DO CÓDIGO COM TIMER
    const resendBtn = document.getElementById('resendBtn');
    const timerText = document.getElementById('timerText');

    let timeLeft = 30;
    let interval;

    //inicia o timer
    function startTimer() {
        resendBtn.disabled = true;
        timeLeft = 70;

        timerText.textContent = `Reenviar código em ${timeLeft}s`;

        interval = setInterval(() => {
            timeLeft--;

            timerText.textContent = `Reenviar código em ${timeLeft}s`;

            if (timeLeft <= 0) {
                clearInterval(interval);
                timerText.textContent = 'Reenviar Código';
                resendBtn.disabled = false;
            }
        }, 1000);
    }

    //botão de reenviar
    resendBtn.addEventListener('click', () => {
        console.log('Código reenviado');

        //chamar API de envio de email
        startTimer(); //reinicia o tempo
    });

    startTimer(); //inicia o timer quando a página carrega

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
});