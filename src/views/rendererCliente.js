let frmClient = document.getElementById('frmClient')
let nameClient = document.getElementById('inputNameClient')
let cpfClient = document.getElementById('inputCPFClient')
let emailClient = document.getElementById('inputEmailClient')
let phoneClient = document.getElementById('inputPhoneClient')
let cepClient = document.getElementById('inputCEPClient')
let addressClient = document.getElementById('inputAddressClient')
let numberClient = document.getElementById('inputNumberClient')
let complementClient = document.getElementById('inputComplementClient')
let neighborhoodClient = document.getElementById('inputNeighborhoodClient')
let cityClient = document.getElementById('inputCityClient')
let ufClient = document.getElementById('inputUFClient')
let id = document.getElementById('idClient')

function buscarCEP() {
    let cep = cepClient.value
    let urlAPI = `https://viacep.com.br/ws/${cep}/json/`
    fetch(urlAPI)
        .then(response => response.json())
        .then(dados => {
            addressClient.value = dados.logradouro
            neighborhoodClient.value = dados.bairro
            cityClient.value = dados.localidade
            ufClient.value = dados.uf
        })
        .catch(error => console.log(error))
}

function validarCPF() {
    let cpf = cpfClient.value.replace(/\D/g, "")
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        cpfClient.style.borderColor = "#ff0000"
        cpfClient.style.color = "#ff0000"
        return false
    }
    let soma = 0, resto
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i - 1]) * (11 - i);
    resto = (soma * 10) % 11
    if (resto !== parseInt(cpf[9])) return mostrarErro(cpfClient)
    soma = 0
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i - 1]) * (12 - i);
    resto = (soma * 10) % 11
    if (resto !== parseInt(cpf[10])) return mostrarErro(cpfClient)
    cpfClient.style.borderColor = "#198754"
    cpfClient.style.color = "#198754"
    return true
}

function mostrarErro(cpfClient) {
    cpfClient.style.borderColor = "#ff0000"
    cpfClient.style.color = "#ff0000"
    return false
}

cpfClient.addEventListener('blur', validarCPF)

let arrayClient = []

const foco = document.getElementById('searchClient')

document.addEventListener('DOMContentLoaded', () => {
    btnUpdate.disabled = true
    btnDelete.disabled = true
    foco.focus()
})

function teclaEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault()
        buscarCliente()
    }
}

function restaurarEnter() {
    frmClient.removeEventListener('keydown', teclaEnter)
}

frmClient.addEventListener('keydown', teclaEnter)

frmClient.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!validarCPF()) {
        api.validateCPF()
        return
    }
    if (id.value === "") {
        const client = {
            nameCli: nameClient.value,
            cpfCli: cpfClient.value,
            emailCli: emailClient.value,
            phoneCli: phoneClient.value,
            cepCli: cepClient.value,
            addressCli: addressClient.value,
            numberCli: numberClient.value,
            complementCli: complementClient.value,
            neighborhoodCli: neighborhoodClient.value,
            cityCli: cityClient.value,
            ufCli: ufClient.value
        }
        api.newClient(client)
    } else {
        const client = {
            idCli: id.value,
            nameCli: nameClient.value,
            cpfCli: cpfClient.value,
            emailCli: emailClient.value,
            phoneCli: phoneClient.value,
            cepCli: cepClient.value,
            addressCli: addressClient.value,
            numberCli: numberClient.value,
            complementCli: complementClient.value,
            neighborhoodCli: neighborhoodClient.value,
            cityCli: cityClient.value,
            ufCli: ufClient.value
        }
        api.updateClient(client)
    }
})

function buscarCliente() {
    let name = document.getElementById('searchClient').value.trim()
    if (name === "") {
        api.validateSearch()
        foco.focus()
    } else {
        const cpfRegex = /^\d{11}$/
        if (cpfRegex.test(name)) {
            api.searchCPF(name)
            api.renderClient((event, dataClient) => {
                const dadosCliente = JSON.parse(dataClient)
                arrayClient = dadosCliente
                arrayClient.forEach((c) => {
                    id.value = c._id,
                        nameClient.value = c.nomeCliente,
                        cpfClient.value = c.cpfCliente,
                        emailClient.value = c.emailCliente,
                        phoneClient.value = c.foneCliente,
                        cepClient.value = c.cepCliente,
                        addressClient.value = c.logradouroCliente,
                        numberClient.value = c.numeroCliente,
                        complementClient.value = c.complementoCliente,
                        neighborhoodClient.value = c.bairroCliente,
                        cityClient.value = c.cidadeCliente,
                        ufClient.value = c.ufCliente
                    btnCreate.disabled = true
                    btnUpdate.disabled = false
                    btnDelete.disabled = false
                    restaurarEnter()
                })
            })
        } else {

            api.searchName(name)
            api.renderClient((event, dataClient) => {
                const dadosCliente = JSON.parse(dataClient)
                arrayClient = dadosCliente
                arrayClient.forEach((c) => {
                    id.value = c._id,
                        nameClient.value = c.nomeCliente,
                        cpfClient.value = c.cpfCliente,
                        emailClient.value = c.emailCliente,
                        phoneClient.value = c.foneCliente,
                        cepClient.value = c.cepCliente,
                        addressClient.value = c.logradouroCliente,
                        numberClient.value = c.numeroCliente,
                        complementClient.value = c.complementoCliente,
                        neighborhoodClient.value = c.bairroCliente,
                        cityClient.value = c.cidadeCliente,
                        ufClient.value = c.ufCliente
                    btnCreate.disabled = true
                    btnUpdate.disabled = false
                    btnDelete.disabled = false
                    restaurarEnter()
                })
            })
        }
    }
}

api.setClient((args) => {
    let campoBusca = document.getElementById('searchClient').value
    nameClient.focus()
    foco.value = ""
    nameClient.value = campoBusca
    restaurarEnter()
})

api.setCPF((args) => {
    let campoBusca = document.getElementById('searchClient').value
    nameClient.focus()
    foco.value = ""
    cpfClient.value = campoBusca
    restaurarEnter()
})

function excluirCliente() {
    api.deleteClient(id.value)
}

function resetForm() {
    location.reload()
}

api.resetForm((args) => {
    resetForm()
})