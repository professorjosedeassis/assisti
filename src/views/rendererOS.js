// ===========================================================
// == Busca avançada =========================================

const input = document.getElementById('inputSearchClient')
const suggestionList = document.getElementById('viewListSuggestion')
let idClient = document.getElementById('inputIdClient')
let nameClient = document.getElementById('inputNameClient')
let phoneClient = document.getElementById('inputPhoneClient')

let arrayClients = []

input.addEventListener('input', () => {
    const search = input.value.toLowerCase() //captura o que foi digitado e converte tudo para minúsculo
    suggestionList.innerHTML = ""

    // Buscar os nomes dos clientes no banco
    api.searchClients()

    // Listar os clientes 
    api.listClients((event, clients) => {
        const listaClientes = JSON.parse(clients)
        arrayClients = listaClientes

        //Filtra os clientes cujo nome (c.nomeCliente) contém o texto digitado(search)
        const results = arrayClients.filter(c =>
            c.nomeCliente && c.nomeCliente.toLowerCase().includes(search)
        ).slice(0, 10) // máximo 10 nomes

        suggestionList.innerHTML = "" // limpa novamente após possível atraso

        // Para cada resultado, cria um item da lista
        results.forEach(c => {
            const item = document.createElement('li')
            item.classList.add('list-group-item', 'list-group-item-action')
            item.textContent = c.nomeCliente

            // Adiciona evento de clique no ítem da lista para preencher os campos do form
            item.addEventListener('click', () => {
                idClient.value = c._id
                nameClient.value = c.nomeCliente
                phoneClient.value = c.foneCliente
                input.value = ""
                suggestionList.innerHTML = ""
            })

            // adiciona os nomes(itens <li>) a lista <ul>
            suggestionList.appendChild(item)
        })
    })
})

// setar o foco no campo de busca (validação de busca do cliente obrigatória)
api.setSearch((args) => {
    input.focus()
})

// Ocultar lista ao clicar fora
document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionList.contains(e.target)) {
        suggestionList.innerHTML = ""
    }
})

// == Fim - busca avançada =====================================
// =============================================================

// criar um vetor para manipulação dos dados da OS
let arrayOS = []

// captura dos IDs do form OS
let frmOS = document.getElementById('frmOS')
let statusOS = document.getElementById('inputStatus')
let computer = document.getElementById('inputComputer')
let serial = document.getElementById('inputSerial')
let problem = document.getElementById('inputProblem')
let specialist = document.getElementById('inputSpecialist')
let diagnosis = document.getElementById('inputDiagnosis')
let parts = document.getElementById('inputParts')
let total = document.getElementById('inputTotal')
// captura do id da OS (CRUD Delete e Update)
let idOS = document.getElementById('inputOS')
// captura do id do campo data
let dateOS = document.getElementById('inputData')

// ============================================================
// == CRUD Create/Update ======================================

//Evento associado ao botão submit (uso das validações do html)
frmOS.addEventListener('submit', async (event) => {
    //evitar o comportamento padrão do submit que é enviar os dados do formulário e reiniciar o documento html
    event.preventDefault()
    // validação do campo obrigatório 'idClient' (validação html não funciona via html para campos desativados)
    if (idClient.value === "") {
        api.validateClient()
    } else {
        // Teste importante (recebimento dos dados do formuláro - passo 1 do fluxo)
        console.log(os.value, idClient.value, statusOS.value, computer.value, serial.value, problem.value, specialist.value, diagnosis.value, parts.value, total.value)
        if (os.value === "") {
            //Gerar OS
            //Criar um objeto para armazenar os dados da OS antes de enviar ao main
            const os = {
                idClient_OS: idClient.value,
                stat_OS: statusOS.value,
                computer_OS: computer.value,
                serial_OS: serial.value,
                problem_OS: problem.value,
                specialist_OS: specialist.value,
                diagnosis_OS: diagnosis.value,
                parts_OS: parts.value,
                total_OS: total.value
            }
            // Enviar ao main o objeto os - (Passo 2: fluxo)
            // uso do preload.js
            api.newOS(os)
        } else {
            //Editar OS

        }
    }
})

// == Fim CRUD Create/Update ==================================
// ============================================================


// ============================================================
// == Buscar OS - CRUD Read ===================================

function findOS() {
    api.searchOS()
}

api.renderOS((event, dataOS) => {
    console.log(dataOS)
    const os = JSON.parse(dataOS)
    // preencher os campos com os dados da OS
    idOS.value = os._id
    // formatar data:
    const data = new Date(os.dataEntrada)
    const formatada = data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    })
    dateOS.value = formatada
    idClient.value = os.idCliente
    statusOS.value = os.status
    computer.value = os.computador
    serial.value = os.serie
    problem.value = os.problema
    specialist.value = os.tecnico
    diagnosis.value = os.diagnostico
    parts.value = os.pecas
    total.value = os.valor
})

// == Fim - Buscar OS - CRUD Read =============================
// ============================================================


// ============================================================
// == Reset form ==============================================

function resetForm() {
    // Limpar os campos e resetar o formulário com as configurações pré definidas
    location.reload()
}

// Recebimento do pedido do main para resetar o form
api.resetForm((args) => {
    resetForm()
})

// == Fim - reset form ========================================
// ============================================================


