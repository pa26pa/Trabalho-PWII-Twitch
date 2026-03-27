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
    })
});