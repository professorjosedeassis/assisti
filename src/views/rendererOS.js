const input = document.getElementById('inputSearchClient')
const suggestionList = document.getElementById('viewListSuggestion')
let idClient = document.getElementById('inputIdClient')
let nameClient = document.getElementById('inputNameClient')
let phoneClient = document.getElementById('inputPhoneClient')

let arrayClients = []

input.addEventListener('input', () => {
    const search = input.value.toLowerCase()
    suggestionList.innerHTML = ""
    api.searchClients()
    api.listClients((event, clients) => {
        const listaClientes = JSON.parse(clients)
        arrayClients = listaClientes
        const results = arrayClients.filter(c =>
            c.nomeCliente && c.nomeCliente.toLowerCase().includes(search)
        ).slice(0, 10)
        suggestionList.innerHTML = ""
        results.forEach(c => {
            const item = document.createElement('li')
            item.classList.add('list-group-item', 'list-group-item-action')
            item.textContent = c.nomeCliente
            item.addEventListener('click', () => {
                idClient.value = c._id
                nameClient.value = c.nomeCliente
                phoneClient.value = c.foneCliente
                input.value = ""
                suggestionList.innerHTML = ""
            })
            suggestionList.appendChild(item)
        })
    })
})

api.setSearch((args) => {
    input.focus()
})

document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionList.contains(e.target)) {
        suggestionList.innerHTML = ""
    }
})

document.addEventListener('DOMContentLoaded', () => {
    btnUpdate.disabled = true
    btnDelete.disabled = true
})

let arrayOS = []

let frmOS = document.getElementById('frmOS')
let statusOS = document.getElementById('inputStatus')
let computer = document.getElementById('inputComputer')
let serial = document.getElementById('inputSerial')
let problem = document.getElementById('inputProblem')
let obs = document.getElementById('inputObs')
let specialist = document.getElementById('inputSpecialist')
let diagnosis = document.getElementById('inputDiagnosis')
let parts = document.getElementById('inputParts')
let total = document.getElementById('inputTotal')
let idOS = document.getElementById('inputOS')
let dateOS = document.getElementById('inputData')

frmOS.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (idClient.value === "") {
        api.validateClient()
    } else {
        if (idOS.value === "") {
            const os = {
                idClient_OS: idClient.value,
                stat_OS: statusOS.value,
                computer_OS: computer.value,
                serial_OS: serial.value,
                problem_OS: problem.value,
                obs_OS: obs.value,
                specialist_OS: specialist.value,
                diagnosis_OS: diagnosis.value,
                parts_OS: parts.value,
                total_OS: total.value
            }
            api.newOS(os)
        } else {
            const os = {
                id_OS: idOS.value,
                idClient_OS: idClient.value,
                stat_OS: statusOS.value,
                computer_OS: computer.value,
                serial_OS: serial.value,
                problem_OS: problem.value,
                obs_OS: obs.value,
                specialist_OS: specialist.value,
                diagnosis_OS: diagnosis.value,
                parts_OS: parts.value,
                total_OS: total.value
            }
            api.updateOS(os)
        }
    }
})

function findOS() {
    api.searchOS()
}

api.renderOS((event, dataOS) => {
    const os = JSON.parse(dataOS)
    idOS.value = os._id
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
    idClient.dispatchEvent(new Event('change'))
    statusOS.value = os.statusOS
    computer.value = os.computador
    serial.value = os.serie
    problem.value = os.problema
    obs.value = os.observacao
    specialist.value = os.tecnico
    diagnosis.value = os.diagnostico
    parts.value = os.pecas
    total.value = os.valor
    btnCreate.disabled = true
    btnUpdate.disabled = false
    btnDelete.disabled = false
    inputSearchClient.disabled = true
})


idClient.addEventListener('change', () => {
    if (idClient.value !== "") {
        api.searchIdClient(idClient.value)
    }
})

api.renderIdClient((event, dataClient) => {
    const dadosCliente = JSON.parse(dataClient)
    arrayClient = dadosCliente
    arrayClient.forEach((c) => {
        nameClient.value = c.nomeCliente,
            phoneClient.value = c.foneCliente
    })
})

function removeOS() {
    api.deleteOS(idOS.value)
}

function generateOS() {
    api.printOS()
}

function resetForm() {
    location.reload()
}


api.resetForm((args) => {
    resetForm()
})