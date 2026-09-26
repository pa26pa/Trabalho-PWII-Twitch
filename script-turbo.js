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

// notificação de sucesso ao enviar o form
document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault(); // Evita o envio do formulário
    alert('Compra realizada com sucesso!');
});