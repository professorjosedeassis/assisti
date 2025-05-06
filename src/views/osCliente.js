const input = document.getElementById('inputSearchClient')
const suggestionList = document.getElementById('suggestionList')

let nameClient = document.getElementById('inputNameClient')
let phoneClient = document.getElementById('inputPhoneClient')
let cpfClient = document.getElementById('inputCPFClient')
let id = document.getElementById('idClient')

let arrayClients = []

input.addEventListener('input', () => {
    const search = input.value.toLowerCase() //captura o que foi digitado e converte tudo para minúsculo
    suggestionList.innerHTML = ""   

    // Buscar os nomes dos clientes no banco
    api.searchClient()

    // Listar os clientes 
    api.listClients((event, clients) => {
        const listaClientes = JSON.parse(clients)
        arrayClients = listaClientes       

        //Filtra os clientes cujo nome (c.nomeCliente) contém o texto digitado(search)
        const resultados = arrayClients.filter(c =>
            c.nomeCliente && c.nomeCliente.toLowerCase().includes(search)
        ).slice(0, 10) // máximo 10 nomes

        suggestionList.innerHTML = "" // limpa novamente após possível atraso

        // Para cada resultado, cria um item da lista
        resultados.forEach(c => {
            const item = document.createElement('li')
            item.classList.add('list-group-item', 'list-group-item-action')
            item.textContent = c.nomeCliente

            // Adiciona evento de clique no ítem da lista para preencher os campos do form
            item.addEventListener('click', () => {
                nameClient.value = c.nomeCliente
                phoneClient.value = c.foneCliente
                cpfClient.value = c.cpfCliente
                id.value = c._id
                input.value = ""
                suggestionList.innerHTML = ""
            })

            // adiciona os nomes(itens <li>) a lista <ul>
            suggestionList.appendChild(item)
        })
    })
})

// Ocultar lista ao clicar fora
document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionList.contains(e.target)) {
        suggestionList.innerHTML = ""
    }
})

// ========================
function searchOS() {
    let os = prompt("Digite o número da OS:")
    console.log(os)
}