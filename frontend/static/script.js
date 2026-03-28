document.addEventListener('DOMContentLoaded', function () {

   //MODAIS
   //para abrir modal
    const openButtons = document.querySelectorAll('.open-modal');
    openButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);

            modal.showModal();
        });
    });
    //para fechar modal
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal');
            const modal = document.getElementById(modalId);

            modal.close();
        });
    });

    //MENU SUPERIOR SOME AO ROLAR A PÁGINA
    window.addEventListener('scroll', function () {
        const header = this.document.getElementById('header');
        if (window.scrollY > 80) { //após rolar 80px
            header.classList.add('shrink');
        } else {
            header.classList.remove('shrink');
        }
    })
});