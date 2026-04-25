//DOMContentLoaded garante que o script só rode depois de todo o HTML estar carregado
document.addEventListener('DOMContentLoaded', function () {

    // MODAIS
    const openButtons = document.querySelectorAll('.open-modal');
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

    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {//=> : é uma função anônima, mais curta que function(){} e mantém o contexto de 'this'
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {  // ← proteção
                modal.close();
                document.body.classList.remove('modal-open');
            }
        });
    });

    // MENU SUPERIOR SOME AO ROLAR
    const header = document.getElementById('header');
    if (header) {//usa o if para garantir que o código só tente acessar o header se ele existir, evitando erros em páginas sem header
        window.addEventListener('scroll', function () {
            if (window.scrollY > 80) {//scrollY: distância em pixels que o documento foi rolado verticalmente
                header.classList.add('shrink'); //adiciona a classe 'shrink' ao header
                header.classList.remove('shrink');
            }
        });
    }

    // TROCA DE CARDS LOGIN → RECEBER CÓDIGO
    const forgotLink = document.querySelector('.forgot-password a');
    const loginBox = document.getElementById('login');
    const emailBox = document.getElementById('email-forgot-password');
    const changeButton = document.querySelector('.change-button');

    if (forgotLink && loginBox && emailBox && changeButton) {// ← proteção do bloco inteiro
        forgotLink.addEventListener('click', function (troca) {
            troca.preventDefault();
            loginBox.style.display = 'none';
            changeButton.style.display = 'none';
            emailBox.style.display = 'flex';
        });
    }

    // TROCA DE CARDS RECEBER CÓDIGO → INSERIR CÓDIGO
    const btnreceberCodigo = document.getElementById('receber-codigo');
    const insertcodeBox = document.getElementById('insert-code');
    const inputEmail = document.getElementById('email');

    if (btnreceberCodigo && insertcodeBox && inputEmail) {  // ← proteção do bloco inteiro
        inputEmail.addEventListener('input', function () {
            btnreceberCodigo.disabled = !inputEmail.checkValidity();//checkValidity(): método nativo que verifica se o valor do input é válido de acordo com os atributos HTML (como type="email")
        });
        btnreceberCodigo.disabled = true;
        btnreceberCodigo.addEventListener('click', function (troca) {
            troca.preventDefault();
            emailBox.style.display = 'none';
            insertcodeBox.style.display = 'flex';
            startTimer();//inicia o timer de reenvio do código assim que o usuário clica para receber o código
        });
    }

    // REENVIO DO CÓDIGO COM TIMER
    const resendBtn = document.getElementById('resendBtn');
    const timerText = document.getElementById('timerText');
    let timeLeft = 60;//tempo em segundos para o próximo reenvio
    let interval;//variável para armazenar o intervalo do timer, permitindo limpar o intervalo quando necessário

    function startTimer() {
        if (!resendBtn || !timerText) return;// ← proteção para garantir que os elementos existam antes de tentar acessá-los
        resendBtn.disabled = true;//desabilita o botão de reenvio enquanto o timer estiver ativo
        timeLeft = 60;
        clearInterval(interval);//limpa qualquer intervalo anterior para evitar múltiplos timers rodando ao mesmo tempo
        timerText.textContent = `Reenviar código em ${timeLeft}s`;//exibe o tempo restante para o próximo reenvio
        interval = setInterval(() => {//inicia um intervalo que roda a cada segundo (1000ms)
            timeLeft--;//decrementa o tempo restante a cada segundo
            timerText.textContent = `Reenviar código em ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(interval);
                timerText.textContent = '';
                resendBtn.disabled = false;
            }
        }, 1000);//tempo em milissegundos (1000ms = 1s)
    }

    //evento de clique para o botão de reenvio, que reinicia o timer e simula o reenvio do código
    if (resendBtn) {
        resendBtn.addEventListener('click', () => {
            console.log('Código reenviado');
            startTimer();
        });
    }

    // INSERINDO CÓDIGO DE VERIFICAÇÃO
    const inputs = document.querySelectorAll('.otp-input');
    const continueBtn = document.getElementById('continueBtn');

    //função para verificar se o código inserido tem 5 dígitos e habilitar/desabilitar o botão de continuar
    function checkCode() {
        if (!continueBtn) return;
        const code = Array.from(inputs).map(input => input.value).join('');//concatena os valores dos inputs em uma única string
        //array.from() é usado para converter a NodeList retornada por querySelectorAll em um array, permitindo o uso de métodos como map()
        //map() é usado para iterar sobre cada input, extrair seu valor e criar um array de valores, que é então unido em uma string usando join('')
        //join('') é usado para unir os valores dos inputs sem nenhum separador, formando o código completo inserido pelo usuário
        continueBtn.disabled = code.length !== 5;//habilita o botão de continuar apenas se o código tiver exatamente 5 dígitos, caso contrário, mantém o botão desabilitado
    }

    if (inputs.length > 0) {  // ← proteção
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                input.value = e.target.value.replace(/[^0-9]/g, '');//remove qualquer caractere que não seja um dígito, garantindo que apenas números sejam inseridos
                //target é a referência ao elemento que disparou o evento
                // value é o valor atual do input
                // replace() é usado para substituir qualquer caractere que não seja um dígito
                if (input.value && index < inputs.length - 1) {
                    inputs[index + 1].focus();//move o foco para o próximo input automaticamente quando um dígito é inserido
                }
                checkCode();//verifica o código a cada alteração para habilitar/desabilitar o botão de continuar
            });
            //evento para permitir que o usuário use a tecla Backspace para voltar ao input anterior
            input.addEventListener('keydown', (e) => {//keydown: detecta quando uma tecla é pressionada, permitindo uso do teclado
                if (e.key === 'Backspace' && !input.value && index > 0) {//verifica se a tecla pressionada é Backspace, se o input atual está vazio e se não é o primeiro input
                    inputs[index - 1].focus();
                }
            });
        });

        //evento para permitir que o usuário cole um código completo, preenchendo os inputs automaticamente
        document.addEventListener('paste', (e) => {//paste: detecta quando o usuário cola algo, permitindo processar o conteúdo colado
            const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
            //clipboardData.getData('text') é usado para obter o texto que o usuário colou
            inputs.forEach((input, i) => {
                input.value = paste[i] || '';//preenche cada input com o dígito correspondente do código colado, ou deixa vazio se não houver mais dígitos
            });
            checkCode();//verifica o código após colar para habilitar/desabilitar o botão de continuar
        });
    }

    // TROCA INSERIR CÓDIGO → REDEFINIR SENHA
    const newpasswordBox = document.getElementById('new-password');
    if (insertcodeBox && newpasswordBox && continueBtn) {  // ← proteção
        continueBtn.addEventListener('click', function (troca) {
            troca.preventDefault();//preventDefault():evita que o formulário seja enviado ou que a página seja recarregada quando o botão de continuar for clicado
            insertcodeBox.style.display = 'none';
            newpasswordBox.style.display = 'flex';
        });
    }

    // TROCA NOVA SENHA → LOGIN
    const backLogin = document.getElementById('backLogin');
    if (loginBox && changeButton && newpasswordBox && backLogin) {
        backLogin.addEventListener('click', function (troca) {
            troca.preventDefault();
            newpasswordBox.style.display = 'none';
            loginBox.style.display = 'flex';
            changeButton.style.display = 'flex';
        });
    }

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
    const senhaInput1 = document.querySelector('.password1');
    const senhaInput2 = document.querySelector('.password2');
    const erroSenha2 = document.querySelector('.erroSenha2');

    //função para validar se a senha de confirmação é igual à senha original, exibindo uma mensagem de erro e aplicando uma classe de erro ao input de confirmação se as senhas não coincidirem
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
        senhaInput2.addEventListener('input', () => {
            erroSenha2.style.display = 'none';
            senhaInput2.classList.remove('input-erro');
        });
    }

    // ENVIO DO FORM
    document.querySelectorAll('.forms').forEach(form => {
        form.addEventListener('submit', function (validarForm) {
            let envio = true;
            if (!form.checkValidity()) envio = false;
            if (form.querySelector('#data-nascimento') && !validarIdade()) envio = false;
            if (form.querySelector('.password2') && !confirmarSenha()) envio = false;
            form.querySelectorAll('.password-box').forEach(box => {
                const senhaInput = box.querySelector('.password');
                const erroSenha = box.querySelector('.erroSenha');
                if (!validarSenha(senhaInput, erroSenha)) envio = false;
            });
            if (!envio) {//se envio for false, ou seja, se alguma validação falhou, o formulário não será enviado e as mensagens de erro serão exibidas
                validarForm.preventDefault();
                form.reportValidity();
            }
        });
    });

    // MENU LATERAL
    const backAside = document.getElementById('back-aside');
    const aside = document.querySelector('aside');
    if (backAside && aside) {  // ← proteção (luna.html não tem aside)
        let asideOpen = true;
        backAside.addEventListener('click', () => {
            if (asideOpen) {
                aside.style.width = '5%';
                backAside.style.transform = 'rotate(180deg)';
            } else {
                aside.style.width = '20%';
                backAside.style.transform = 'rotate(0deg)';
            }
            asideOpen = !asideOpen;//alterna o estado do menu lateral entre aberto e fechado a cada clique
        });
    }

    //----------------LUNA--------------------
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

});