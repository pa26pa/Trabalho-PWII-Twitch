let csrfToken = null;

async function carregarCsrf() {
    const res = await fetch("/csrf-token");
    const data = await res.json();
    csrfToken = data.csrf_token;
}

document.addEventListener('DOMContentLoaded', async () => {
    await carregarCsrf();
})

function cadastrar() {
    const dados = {
        cpf: document.getElementById("cpf_cadastro").value,
        email: document.getElementById("email_cadastro").value,
        user_name: document.getElementById("user_name_cadastro").value,
        data_nascimento: document.getElementById("data_nascimento_cadastro").value,
        senha: document.getElementById("senha_cadastro").value
    };

    fetch("/signin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}

function login() {
    const dados = {
        username_email: document.getElementById("email_login").value,
        senha: document.getElementById("senha_login").value
    };

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
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
        email_forgot: document.getElementById("email_forgot").value
    };

    fetch("/forgot", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}

function check_codigo() {
    const dados = {
        codigo: document.getElementById("codigo_check_codigo").value
    };

    fetch("/check_codigo", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}

function resend_code() {

    fetch("/resend", {
        method:"POST", 
        headers: {
            "Content-Type":"application/json",
            "X-CSRFToken": csrfToken
        }
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}

function redefine_password() {
    const dados = {
        nova_senha: document.getElementById("nova_senha_redefine_password").value
    };

    fetch("/redefine_password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
    });
}

function pesquisa() {
    const dados = {
        pesquisa: document.getElementById("pesquisa").value,
    };

    fetch("/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
        const div = document.getElementById("resultados");
        div.innerHTML = ""; // limpa resultados antigos

        data.resultados.forEach(item => {
        const nome = item.user_name || item.titulo;
        div.innerHTML += `<p>${nome}</p>`;
        });
    });
};

function deletar() {
    fetch("/delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        }
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("resposta").innerText = JSON.stringify(data, null, 2);
        const div = document.getElementById("resultados");
        div.innerHTML = ""; // limpa resultados antigos
    
    });
}

function enviar_foto() {

    const foto = document.getElementById('foto').files[0];

    if (!foto) {
        alert("Selecione uma foto");
        return;
    }

    const formData = new FormData();

    formData.append("foto", foto);
    formData.append("tipo", "foto");

    fetch("/salvar_foto", {
        method: "POST",
        body: formData,
        headers : {
            "X-CSRFToken": csrfToken
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
    })
    .catch(err => console.error(err));

}

function enviar_video() {

    const video = document.getElementById('video').files[0];
    const titulo = document.getElementById('titulo').value;
    const descrisao = document.getElementById('descrisao').value;
    const categoria = document.getElementById('categoria').value;

    if (!video) {
        alert("Selecione um vídeo");
        return;
    }

    const formData = new FormData();

    formData.append("arquivo", video);
    formData.append("titulo", titulo);
    formData.append("descrisao", descrisao);
    formData.append("categoria", categoria);

    fetch("/salvar_video", {
        method: "POST",
        body: formData,
        headers:{
            "X-CSRFToken": csrfToken
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
    })
    .catch(err => console.error(err));

}
