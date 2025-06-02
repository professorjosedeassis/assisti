function obterData() {
    const dataAtual = new Date()
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }
    return dataAtual.toLocaleDateString('pt-BR', options)
}

document.getElementById('dataAtual').innerHTML = obterData()