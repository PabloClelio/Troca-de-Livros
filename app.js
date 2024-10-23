// Elementos do DOM
const userSection = document.getElementById('userSection');
const authSection = document.getElementById('authSection');
const livroForm = document.getElementById('livroForm');
const livrosLista = document.getElementById('livrosLista');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutButton = document.getElementById('logoutButton');
const solicitacoesLista = document.getElementById('solicitacoesLista');
const solicitacoesFeitasLista = document.getElementById('solicitacoesFeitasLista');

// Função para mostrar mensagens de erro
function showError(message) {
    alert(message);
}

// Função para atualizar a UI baseada no estado de autenticação
function updateUI(user) {
    if (user) {
        userSection.style.display = 'block';
        authSection.style.display = 'none';
        carregarLivros();
        carregarSolicitacoes();
        carregarSolicitacoesFeitas();
    } else {
        userSection.style.display = 'none';
        authSection.style.display = 'block';
    }
}

// Listener de estado de autenticação
auth.onAuthStateChanged(updateUI);

// Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm.loginEmail.value;
    const password = loginForm.loginPassword.value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => showError('Erro no login: ' + error.message));
});

// Registro
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = registerForm.registerName.value;
    const email = registerForm.registerEmail.value;
    const password = registerForm.registerPassword.value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .catch(error => showError('Erro no registro: ' + error.message));
});

// Logout
logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// Adicionar livro
livroForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const titulo = livroForm.titulo.value;
    const autor = livroForm.autor.value;
    db.collection('livros').add({
        titulo: titulo,
        autor: autor,
        usuarioId: auth.currentUser.uid,
        usuarioNome: auth.currentUser.displayName
    })
    .then(() => {
        livroForm.reset();
        carregarLivros();
    })
    .catch(error => showError('Erro ao adicionar livro: ' + error.message));
});

// Renderizar livro
function renderizarLivro(doc) {
    const livro = doc.data();
    const li = document.createElement('li');
    li.textContent = `${livro.titulo} por ${livro.autor} (${livro.usuarioNome})`;
    
    if (livro.usuarioId !== auth.currentUser.uid) {
        const solicitarButton = document.createElement('button');
        solicitarButton.textContent = 'Solicitar Troca';
        solicitarButton.onclick = () => solicitarTroca(doc.id, livro.usuarioId);
        li.appendChild(solicitarButton);
    } else {
        li.textContent += ' (Seu livro)';
    }
    
    livrosLista.appendChild(li);
}

// Carregar livros
function carregarLivros() {
    livrosLista.innerHTML = '';
    db.collection('livros').get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                renderizarLivro(doc);
            });
        })
        .catch(error => showError('Erro ao carregar livros: ' + error.message));
}

// Solicitar troca
function solicitarTroca(livroId, proprietarioId) {
    db.collection('solicitacoes').add({
        livroId: livroId,
        solicitanteId: auth.currentUser.uid,
        solicitanteNome: auth.currentUser.displayName,
        proprietarioId: proprietarioId,
        status: 'pendente'
    })
    .then(() => {
        alert('Solicitação de troca enviada!');
        carregarSolicitacoesFeitas();
    })
    .catch(error => showError('Erro ao solicitar troca: ' + error.message));
}

// Carregar solicitações recebidas
function carregarSolicitacoes() {
    solicitacoesLista.innerHTML = '';
    db.collection('solicitacoes').where('proprietarioId', '==', auth.currentUser.uid).get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const solicitacao = doc.data();
                db.collection('livros').doc(solicitacao.livroId).get()
                    .then(livroDoc => {
                        const livro = livroDoc.data();
                        const li = document.createElement('li');
                        li.textContent = `${solicitacao.solicitanteNome} solicitou troca para o livro "${livro.titulo}" - Status: `;

                        // Exibir o status atual da solicitação
                        const statusSpan = document.createElement('span');
                        statusSpan.textContent = solicitacao.status;
                        li.appendChild(statusSpan);

                        // Somente exibir botões se o status for "pendente"
                        if (solicitacao.status === 'pendente') {
                            // Botão de aceitar
                            const aceitarButton = document.createElement('button');
                            aceitarButton.textContent = 'Aceitar';
                            aceitarButton.onclick = () => {
                                aceitarTroca(doc.id);
                                statusSpan.textContent = 'aceita'; // Atualiza status visual
                                li.removeChild(aceitarButton); // Remove botão
                                li.removeChild(recusarButton); // Remove botão
                            };
                            li.appendChild(aceitarButton);

                            // Botão de recusar
                            const recusarButton = document.createElement('button');
                            recusarButton.textContent = 'Recusar';
                            recusarButton.onclick = () => {
                                recusarTroca(doc.id);
                                statusSpan.textContent = 'recusada'; // Atualiza status visual
                                li.removeChild(aceitarButton); // Remove botão
                                li.removeChild(recusarButton); // Remove botão
                            };
                            li.appendChild(recusarButton);
                        }

                        solicitacoesLista.appendChild(li);
                    })
                    .catch(error => showError('Erro ao carregar detalhes do livro: ' + error.message));
            });
        })
        .catch(error => showError('Erro ao carregar solicitações: ' + error.message));
}



// Aceitar troca
function aceitarTroca(solicitacaoId) {
    return db.collection('solicitacoes').doc(solicitacaoId).update({
        status: 'aceita'
    })
    .then(() => {
        alert('Solicitação de troca aceita!');
        carregarSolicitacoes(); // Atualizar a lista de solicitações
    })
    .catch(error => showError('Erro ao aceitar solicitação: ' + error.message));
}

// Recusar troca
function recusarTroca(solicitacaoId) {
    return db.collection('solicitacoes').doc(solicitacaoId).update({
        status: 'recusada'
    })
    .then(() => {
        alert('Solicitação de troca recusada.');
        carregarSolicitacoes(); // Atualizar a lista de solicitações
    })
    .catch(error => showError('Erro ao recusar solicitação: ' + error.message));
}


// Carregar solicitações feitas
function carregarSolicitacoesFeitas() {
    solicitacoesFeitasLista.innerHTML = '';
    db.collection('solicitacoes').where('solicitanteId', '==', auth.currentUser.uid).get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const solicitacao = doc.data();
                db.collection('livros').doc(solicitacao.livroId).get()
                    .then(livroDoc => {
                        const livro = livroDoc.data();
                        const li = document.createElement('li');
                        li.textContent = `Você solicitou troca para o livro "${livro.titulo}" - Status: ${solicitacao.status}`;
                        solicitacoesFeitasLista.appendChild(li);
                    })
                    .catch(error => showError('Erro ao carregar detalhes do livro: ' + error.message));
            });
        })
        .catch(error => showError('Erro ao carregar solicitações feitas: ' + error.message));
}

// Solicitar troca (atualizada para incluir o título do livro na solicitação)
function solicitarTroca(livroId, proprietarioId) {
    db.collection('livros').doc(livroId).get()
        .then(livroDoc => {
            const livro = livroDoc.data();
            return db.collection('solicitacoes').add({
                livroId: livroId,
                livroTitulo: livro.titulo,
                solicitanteId: auth.currentUser.uid,
                solicitanteNome: auth.currentUser.displayName,
                proprietarioId: proprietarioId,
                status: 'pendente'
            });
        })
        .then(() => {
            alert('Solicitação de troca enviada!');
            carregarSolicitacoesFeitas();
        })
        .catch(error => showError('Erro ao solicitar troca: ' + error.message));
}