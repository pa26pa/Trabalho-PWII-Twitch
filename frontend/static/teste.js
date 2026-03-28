// 🔐 CADASTRO
function cadastrar() {
    const dados = {
        cpf: document.getElementById("cpf_cadastro").value,
        email: document.getElementById("email_cadastro").value,
        user_name: document.getElementById("user_name_cadastro").value,
        data_nascimento: document.getElementById("data_nascimento_cadastro").value,
        senha: document.getElementById("senha_cadastro").value
    };

    fetch("http://127.0.0.1:5000/signin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}


// 🔑 LOGIN
function login() {
    const dados = {
        email: document.getElementById("email_login").value,
        senha: document.getElementById("senha_login").value
    };

    fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}

function forgot() {
    const dados = {
        cpf: document.getElementById("cpf_forgot").value
    };

    fetch("http://127.0.0.1:5000/forgot", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}

function redefine_password() {
    const dados = {
        codigo: document.getElementById("codigo_redefine_password").value,
        nova_senha: document.getElementById("nova_senha_redefine_password").value
    };

    fetch("http://127.0.0.1:5000/redefine_password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}