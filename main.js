console.log("Processo principal")

const { app, BrowserWindow, nativeTheme, Menu, ipcMain, dialog, shell } = require('electron')

// Esta linha está relacionada ao preload.js
const path = require('node:path')

// Importação dos métodos conectar e desconectar (módulo de conexão)
const { conectar, desconectar } = require('./database.js')

// importar mongoose (validação do id na OS)
const mongoose = require('mongoose')

// Importação do Schema Clientes da camada model
const clientModel = require('./src/models/Clientes.js')

// Importação do Schema OS da camada model
const osModel = require('./src/models/OS.js')

// npm install jspdf@2.5.1 jspdf-autotable@3.5.25
const jsPDF = require('jspdf').jsPDF
require('jspdf-autotable') //aditivo do jsPDF

// Importação da biblioteca fs (nativa do JavaScript) para manipulação de arquivos (no caso arquivos pdf)
const fs = require('fs')

// importação do pacote electron-prompt (dialog de input) - npm i electron-prompt
const prompt = require('electron-prompt')

// Janela principal
let win
const createWindow = () => {
    // a linha abaixo define o tema (claro ou escuro)
    nativeTheme.themeSource = 'light' //(dark ou light)
    win = new BrowserWindow({
        width: 800,
        height: 600,
        //autoHideMenuBar: true,
        //minimizable: false,
        resizable: false,
        //ativação do preload.js
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // menu personalizado
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))

    win.loadFile('./src/views/index.html')
}

// Janela sobre
function aboutWindow() {
    nativeTheme.themeSource = 'light'
    // a linha abaixo obtém a janela principal
    const main = BrowserWindow.getFocusedWindow()
    let about
    // Estabelecer uma relação hierárquica entre janelas
    if (main) {
        // Criar a janela sobre
        about = new BrowserWindow({
            width: 360,
            height: 220,
            autoHideMenuBar: true,
            resizable: false,
            minimizable: false,
            parent: main,
            modal: true
        })
    }
    //carregar o documento html na janela
    about.loadFile('./src/views/sobre.html')
}

// Janela cliente
let client
function clientWindow() {
    nativeTheme.themeSource = 'light'
    const main = BrowserWindow.getFocusedWindow()
    if (main) {
        client = new BrowserWindow({
            width: 1010,
            height: 600,
            autoHideMenuBar: true,
            resizable: false,
            parent: main,
            modal: true,
            //ativação do preload.js
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
            }
        })
    }
    client.loadFile('./src/views/cliente.html')
    client.center() //iniciar no centro da tela   
}

// Janela OS
let osScreen
function osWindow() {
    nativeTheme.themeSource = 'light'
    const main = BrowserWindow.getFocusedWindow()
    if (main) {
        osScreen = new BrowserWindow({
            width: 1010,
            height: 720,
            autoHideMenuBar: true,
            resizable: false,
            parent: main,
            modal: true,
            //ativação do preload.js
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
            }
        })
    }
    osScreen.loadFile('./src/views/os.html')
    osScreen.center()
}

// Iniciar a aplicação
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// reduzir logs não críticos
app.commandLine.appendSwitch('log-level', '3')

// iniciar a conexão com o banco de dados (pedido direto do preload.js)
ipcMain.on('db-connect', async (event) => {
    let conectado = await conectar()
    // se conectado for igual a true
    if (conectado) {
        // enviar uma mensagem para o renderizador trocar o ícone, criar um delay de 0.5s para sincronizar a nuvem
        setTimeout(() => {
            event.reply('db-status', "conectado")
        }, 500) //500ms        
    }
})

// IMPORTANTE ! Desconectar do banco de dados quando a aplicação for encerrada.
app.on('before-quit', () => {
    desconectar()
})

// template do menu
const template = [
    {
        label: 'Cadastro',
        submenu: [
            {
                label: 'Clientes',
                click: () => clientWindow()
            },
            {
                label: 'OS',
                click: () => osWindow()
            },
            {
                type: 'separator'
            },
            {
                label: 'Sair',
                click: () => app.quit(),
                accelerator: 'Alt+F4'
            }
        ]
    },
    {
        label: 'Relatórios',
        submenu: [
            {
                label: 'Clientes',
                click: () => relatorioClientes()
            },
            {
                label: 'OS Pendentes',
                click: () => relatorioOSPendentes()
            },
            {
                label: 'OS Finalizadas',
                click: () => relatorioOSFinalizadas()
            }
        ]
    },
    {
        label: 'Ferramentas',
        submenu: [
            {
                label: 'Aplicar zoom',
                role: 'zoomIn'
            },
            {
                label: 'Reduzir',
                role: 'zoomOut'
            },
            {
                label: 'Restaurar o zoom padrão',
                role: 'resetZoom'
            },
            {
                type: 'separator'
            },
            {
                label: 'Recarregar',
                role: 'reload'
            },
            {
                label: 'Ferramentas do desenvolvedor',
                role: 'toggleDevTools'
            }
        ]
    },
    {
        label: 'Ajuda',
        submenu: [
            {
                label: 'Repositório',
                click: () => shell.openExternal('https://github.com/professorjosedeassis/assisti')
            },
            {
                label: 'Sobre',
                click: () => aboutWindow()
            }
        ]
    }
]

// recebimento dos pedidos do renderizador para abertura de janelas (botões) autorizado no preload.js
ipcMain.on('client-window', () => {
    clientWindow()
})

ipcMain.on('os-window', () => {
    osWindow()
})



//************************************************************/
//***********************  Clientes  *************************/
//************************************************************/


// ============================================================
// == Clientes - CRUD Create ==================================

// Validação do cpf
ipcMain.on('validate-cpf', (event) => {
    dialog.showMessageBox({
        //customização
        type: 'error',
        title: "Atenção!",
        message: "CPF inválido.",
        buttons: ['OK']
    })
})

// recebimento do objeto que contem os dados do cliente
ipcMain.on('new-client', async (event, client) => {
    // Importante! Teste de recebimento dos dados do cliente
    console.log(client)
    // Cadastrar a estrutura de dados no banco de dados MongoDB
    try {
        // criar uma nova de estrutura de dados usando a classe modelo. Atenção! Os atributos precisam ser idênticos ao modelo de dados Clientes.js e os valores são definidos pelo conteúdo do objeto cliente
        const newClient = new clientModel({
            nomeCliente: client.nameCli,
            cpfCliente: client.cpfCli,
            emailCliente: client.emailCli,
            foneCliente: client.phoneCli,
            cepCliente: client.cepCli,
            logradouroCliente: client.addressCli,
            numeroCliente: client.numberCli,
            complementoCliente: client.complementCli,
            bairroCliente: client.neighborhoodCli,
            cidadeCliente: client.cityCli,
            ufCliente: client.ufCli
        })
        // salvar os dados do cliente no banco de dados
        await newClient.save()
        // Mensagem de confirmação
        dialog.showMessageBox({
            //customização
            type: 'info',
            title: "Aviso",
            message: "Cliente adicionado com sucesso",
            buttons: ['OK']
        }).then((result) => {
            //ação ao pressionar o botão (result = 0)
            if (result.response === 0) {
                //enviar um pedido para o renderizador limpar os campos e resetar as configurações pré definidas (rótulo 'reset-form' do preload.js
                event.reply('reset-form')
            }
        })
    } catch (error) {
        // se o código de erro for 11000 (cpf duplicado) enviar uma mensagem ao usuário
        if (error.code === 11000) {
            dialog.showMessageBox({
                type: 'error',
                title: "Atenção!",
                message: "CPF já está cadastrado\nVerifique se digitou corretamente",
                buttons: ['OK']
            }).then((result) => {
                if (result.response === 0) {
                    // limpar a caixa de input do cpf, focar esta caixa e deixar a borda em vermelho
                }
            })
        }
        console.log(error)
    }
})

// == Fim - Clientes - CRUD Create ============================
// ============================================================


// ============================================================
// == Relatório de clientes ===================================

async function relatorioClientes() {
    try {
        // Passo 1: Consultar o banco de dados e obter a listagem de clientes cadastrados por ordem alfabética
        const clientes = await clientModel.find().sort({ nomeCliente: 1 })
        // teste de recebimento da listagem de clientes
        //console.log(clientes)
        // Passo 2:Formatação do documento pdf
        // p - portrait | l - landscape | mm e a4 (folha A4 (210x297mm))
        const doc = new jsPDF('p', 'mm', 'a4')
        // Inserir imagem no documento pdf
        // imagePath (caminho da imagem que será inserida no pdf)
        // imageBase64 (uso da biblioteca fs par ler o arquivo no formato png)
        const imagePath = path.join(__dirname, 'src', 'public', 'img', 'logo.png')
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' })
        doc.addImage(imageBase64, 'PNG', 5, 8) //(5mm, 8mm x,y)
        // definir o tamanho da fonte (tamanho equivalente ao word)
        doc.setFontSize(18)
        // escrever um texto (título)
        doc.text("Relatório de clientes", 14, 45)//x, y (mm)
        // inserir a data atual no relatório
        const dataAtual = new Date().toLocaleDateString('pt-BR')
        doc.setFontSize(12)
        doc.text(`Data: ${dataAtual}`, 165, 10)
        // variável de apoio na formatação
        let y = 60
        doc.text("Nome", 14, y)
        doc.text("Telefone", 80, y)
        doc.text("E-mail", 130, y)
        y += 5
        // desenhar uma linha
        doc.setLineWidth(0.5) // expessura da linha
        doc.line(10, y, 200, y) // 10 (inicio) ---- 200 (fim)

        // renderizar os clientes cadastrados no banco
        y += 10 // espaçamento da linha
        // percorrer o vetor clientes(obtido do banco) usando o laço forEach (equivale ao laço for)
        clientes.forEach((c) => {
            // adicionar outra página se a folha inteira for preenchida (estratégia é saber o tamnaho da folha)
            // folha A4 y = 297mm
            if (y > 280) {
                doc.addPage()
                y = 20 // resetar a variável y
                // redesenhar o cabeçalho
                doc.text("Nome", 14, y)
                doc.text("Telefone", 80, y)
                doc.text("E-mail", 130, y)
                y += 5
                doc.setLineWidth(0.5)
                doc.line(10, y, 200, y)
                y += 10
            }
            doc.text(c.nomeCliente, 14, y),
                doc.text(c.foneCliente, 80, y),
                doc.text(c.emailCliente || "N/A", 130, y)
            y += 10 //quebra de linha
        })

        // Adicionar numeração automática de páginas
        const paginas = doc.internal.getNumberOfPages()
        for (let i = 1; i <= paginas; i++) {
            doc.setPage(i)
            doc.setFontSize(10)
            doc.text(`Página ${i} de ${paginas}`, 105, 290, { align: 'center' })
        }

        // Definir o caminho do arquivo temporário e nome do arquivo
        const tempDir = app.getPath('temp')
        const filePath = path.join(tempDir, 'clientes.pdf')
        // salvar temporariamente o arquivo
        doc.save(filePath)
        // abrir o arquivo no aplicativo padrão de leitura de pdf do computador do usuário
        shell.openPath(filePath)
    } catch (error) {
        console.log(error)
    }
}

// == Fim - relatório de clientes =============================
// ============================================================


// ============================================================
// == CRUD Read ===============================================

// Validação de busca (preenchimento obrigatório)
ipcMain.on('validate-search', () => {
    dialog.showMessageBox({
        type: 'warning',
        title: "Atenção!",
        message: "Preencha o campo de busca",
        buttons: ['OK']
    })
})

// busca pelo nome
ipcMain.on('search-name', async (event, name) => {
    //console.log("teste IPC search-name")
    //console.log(name) // teste do passo 2 (importante!)
    // Passos 3 e 4 busca dos dados do cliente no banco
    //find({nomeCliente: name}) - busca pelo nome
    //RegExp(name, 'i') - i (insensitive / Ignorar maiúsculo ou minúsculo)
    try {
        const dataClient = await clientModel.find({
            nomeCliente: new RegExp(name, 'i')
        })
        console.log(dataClient) // teste passos 3 e 4 (importante!)

        // melhoria da experiência do usuário (se o cliente não estiver cadastrado, alertar o usuário e questionar se ele quer cadastrar este novo cliente. Se não quiser cadastrar, limpar os campos, se quiser cadastrar recortar o nome do cliente do campo de busca e colar no campo nome)

        // se o vetor estiver vazio [] (cliente não cadastrado)
        if (dataClient.length === 0) {
            dialog.showMessageBox({
                type: 'warning',
                title: "Aviso",
                message: "Cliente não cadastrado.\nDeseja cadastrar este cliente?",
                defaultId: 0, //botão 0
                buttons: ['Sim', 'Não'] // [0, 1]
            }).then((result) => {
                if (result.response === 0) {
                    // enviar ao renderizador um pedido para setar os campos (recortar do campo de busca e colar no campo nome)
                    event.reply('set-client')
                } else {
                    // limpar o formulário
                    event.reply('reset-form')
                }
            })
        }

        // Passo 5:
        // enviando os dados do cliente ao rendererCliente
        // OBS: IPC só trabalha com string, então é necessário converter o JSON para string JSON.stringify(dataClient)
        event.reply('render-client', JSON.stringify(dataClient))

    } catch (error) {
        console.log(error)
    }
})

// busca pelo cpf
ipcMain.on('search-cpf', async (event, name) => {
    //console.log("teste IPC search-name")
    //console.log(name) // teste do passo 2 (importante!)
    // Passos 3 e 4 busca dos dados do cliente no banco
    //find({nomeCliente: name}) - busca pelo nome
    //RegExp(name, 'i') - i (insensitive / Ignorar maiúsculo ou minúsculo)
    try {
        const dataClient = await clientModel.find({
            cpfCliente: name
        })
        console.log(dataClient) // teste passos 3 e 4 (importante!)

        // melhoria da experiência do usuário (se o cliente não estiver cadastrado, alertar o usuário e questionar se ele quer cadastrar este novo cliente. Se não quiser cadastrar, limpar os campos, se quiser cadastrar recortar o nome do cliente do campo de busca e colar no campo nome)

        // se o vetor estiver vazio [] (cliente não cadastrado)
        if (dataClient.length === 0) {
            dialog.showMessageBox({
                type: 'warning',
                title: "Aviso",
                message: "Cliente não cadastrado.\nDeseja cadastrar este cliente?",
                defaultId: 0, //botão 0
                buttons: ['Sim', 'Não'] // [0, 1]
            }).then((result) => {
                if (result.response === 0) {
                    // enviar ao renderizador um pedido para setar os campos (recortar do campo de busca e colar no campo cpf)
                    event.reply('set-cpf')
                } else {
                    // limpar o formulário
                    event.reply('reset-form')
                }
            })
        }

        // Passo 5:
        // enviando os dados do cliente ao rendererCliente
        // OBS: IPC só trabalha com string, então é necessário converter o JSON para string JSON.stringify(dataClient)
        event.reply('render-client', JSON.stringify(dataClient))

    } catch (error) {
        console.log(error)
    }
})

// == Fim - CRUD Read =========================================
// ============================================================


// ============================================================
// == CRUD Delete =============================================

ipcMain.on('delete-client', async (event, id) => {
    console.log(id) // teste do passo 2 (recebimento do id)
    try {
        //importante - confirmar a exclusão
        //client é o nome da variável que representa a janela
        const { response } = await dialog.showMessageBox(client, {
            type: 'warning',
            title: "Atenção!",
            message: "Deseja excluir este cliente?\nEsta ação não poderá ser desfeita.",
            buttons: ['Cancelar', 'Excluir'] //[0, 1]
        })
        if (response === 1) {
            console.log("teste do if de excluir")
            //Passo 3 - Excluir o registro do cliente
            const delClient = await clientModel.findByIdAndDelete(id)
            event.reply('reset-form')
        }
    } catch (error) {
        console.log(error)
    }
})

// == Fim - CRUD Delete =======================================
// ============================================================


// ============================================================
// == CRUD Update =============================================

ipcMain.on('update-client', async (event, client) => {
    console.log(client) //teste importante (recebimento dos dados do cliente)
    try {
        // criar uma nova de estrutura de dados usando a classe modelo. Atenção! Os atributos precisam ser idênticos ao modelo de dados Clientes.js e os valores são definidos pelo conteúdo do objeto cliente
        const updateClient = await clientModel.findByIdAndUpdate(
            client.idCli,
            {
                nomeCliente: client.nameCli,
                cpfCliente: client.cpfCli,
                emailCliente: client.emailCli,
                foneCliente: client.phoneCli,
                cepCliente: client.cepCli,
                logradouroCliente: client.addressCli,
                numeroCliente: client.numberCli,
                complementoCliente: client.complementCli,
                bairroCliente: client.neighborhoodCli,
                cidadeCliente: client.cityCli,
                ufCliente: client.ufCli
            },
            {
                new: true
            }
        )
        // Mensagem de confirmação
        dialog.showMessageBox({
            //customização
            type: 'info',
            title: "Aviso",
            message: "Dados do cliente alterados com sucesso",
            buttons: ['OK']
        }).then((result) => {
            //ação ao pressionar o botão (result = 0)
            if (result.response === 0) {
                //enviar um pedido para o renderizador limpar os campos e resetar as configurações pré definidas (rótulo 'reset-form' do preload.js
                event.reply('reset-form')
            }
        })

    } catch (error) {
        console.log(error)
    }
})

// == Fim - CRUD Update =======================================
// ============================================================



//************************************************************/
//*******************  Ordem de Serviço  *********************/
//************************************************************/


// ============================================================
// == Buscar cliente para vincular na OS ======================

ipcMain.on('search-clients', async (event) => {
    try {
        const clients = await clientModel.find().sort({ nomeCliente: 1 })
        //console.log(clients)
        event.reply('list-clients', JSON.stringify(clients))
    } catch (error) {
        console.log(error)
    }
})

// == Fim - Buscar cliente para vincular na OS ================
// ============================================================


// ============================================================
// == CRUD Create - Gerar OS ==================================

// Validação de busca (preenchimento obrigatório Id Cliente-OS)
ipcMain.on('validate-client', (event) => {
    dialog.showMessageBox({
        type: 'warning',
        title: "Aviso!",
        message: "É obrigatório vincular o cliente na Ordem de Serviço",
        buttons: ['OK']
    }).then((result) => {
        //ação ao pressionar o botão (result = 0)
        if (result.response === 0) {
            event.reply('set-search')
        }
    })
})

ipcMain.on('new-os', async (event, os) => {
    //importante! teste de recebimento dos dados da os (passo 2)
    console.log(os)
    // Cadastrar a estrutura de dados no banco de dados MongoDB
    try {
        // criar uma nova de estrutura de dados usando a classe modelo. Atenção! Os atributos precisam ser idênticos ao modelo de dados OS.js e os valores são definidos pelo conteúdo do objeto os
        const newOS = new osModel({
            idCliente: os.idClient_OS,
            statusOS: os.stat_OS,
            computador: os.computer_OS,
            serie: os.serial_OS,
            problema: os.problem_OS,
            observacao: os.obs_OS,
            tecnico: os.specialist_OS,
            diagnostico: os.diagnosis_OS,
            pecas: os.parts_OS,
            valor: os.total_OS
        })
        // salvar os dados da OS no banco de dados
        await newOS.save()

        // Obter o ID gerado automaticamente pelo MongoDB
        const osId = newOS._id
        console.log("ID da nova OS:", osId)

        // Mensagem de confirmação
        dialog.showMessageBox({
            //customização
            type: 'info',
            title: "Aviso",
            message: "OS gerada com sucesso.\nDeseja imprimir esta OS?",
            buttons: ['Sim', 'Não'] // [0, 1]
        }).then((result) => {
            //ação ao pressionar o botão (result = 0)
            if (result.response === 0) {
                // executar a função printOS passando o id da OS como parâmetro
                printOS(osId)
                //enviar um pedido para o renderizador limpar os campos e resetar as configurações pré definidas (rótulo 'reset-form' do preload.js
                event.reply('reset-form')
            } else {
                //enviar um pedido para o renderizador limpar os campos e resetar as configurações pré definidas (rótulo 'reset-form' do preload.js
                event.reply('reset-form')
            }
        })
    } catch (error) {
        console.log(error)
    }
})

// == Fim - CRUD Create - Gerar OS ===========================
// ============================================================


// ============================================================
// == Buscar OS - CRUD Read ===================================

ipcMain.on('search-os', async (event) => {
    prompt({
        title: 'Buscar OS',
        label: 'Digite o número da OS:',
        inputAttrs: {
            type: 'text'
        },
        type: 'input',
        width: 400,
        height: 200
    }).then(async (result) => {
        // buscar OS pelo id (verificar formato usando o mongoose - importar no início do main)
        if (result !== null) {
            // Verificar se o ID é válido (uso do mongoose - não esquecer de importar)
            if (mongoose.Types.ObjectId.isValid(result)) {
                try {
                    const dataOS = await osModel.findById(result)
                    if (dataOS && dataOS !== null) {
                        console.log(dataOS) // teste importante
                        // enviando os dados da OS ao rendererOS
                        // OBS: IPC só trabalha com string, então é necessário converter o JSON para string JSON.stringify(dataOS)
                        event.reply('render-os', JSON.stringify(dataOS))
                    } else {
                        dialog.showMessageBox({
                            type: 'warning',
                            title: "Aviso!",
                            message: "OS não encontrada",
                            buttons: ['OK']
                        })
                    }
                } catch (error) {
                    console.log(error)
                }
            } else {
                dialog.showMessageBox({
                    type: 'error',
                    title: "Atenção!",
                    message: "Código da OS inválido.\nVerifique e tente novamente.",
                    buttons: ['OK']
                })
            }
        }
    })
})

ipcMain.on('search-idClient', async (event, idClient) => {
    console.log(idClient) // teste do passo 2 (importante!)
    // Passos 3 e 4 busca dos dados do cliente no banco

    try {
        const dataClient = await clientModel.find({
            _id: idClient
        })
        console.log("teste do id cliente")
        console.log(dataClient) // teste passos 3 e 4 (importante!)

        event.reply('render-idClient', JSON.stringify(dataClient))

    } catch (error) {
        console.log(error)
    }

})

// == Fim - Buscar OS - CRUD Read =============================
// ============================================================


// ============================================================
// == Excluir OS - CRUD Delete  ===============================

ipcMain.on('delete-os', async (event, idOS) => {
    console.log(idOS) // teste do passo 2 (recebimento do id)
    try {
        //importante - confirmar a exclusão
        //osScreen é o nome da variável que representa a janela OS
        const { response } = await dialog.showMessageBox(osScreen, {
            type: 'warning',
            title: "Atenção!",
            message: "Deseja excluir esta ordem de serviço?\nEsta ação não poderá ser desfeita.",
            buttons: ['Cancelar', 'Excluir'] //[0, 1]
        })
        if (response === 1) {
            //console.log("teste do if de excluir")
            //Passo 3 - Excluir a OS
            const delOS = await osModel.findByIdAndDelete(idOS)
            event.reply('reset-form')
        }
    } catch (error) {
        console.log(error)
    }
})

// == Fim Excluir OS - CRUD Delete ============================
// ============================================================


// ============================================================
// == Editar OS - CRUD Update =================================

ipcMain.on('update-os', async (event, os) => {
    //importante! teste de recebimento dos dados da os (passo 2)
    console.log(os)
    // Alterar os dados da OS no banco de dados MongoDB
    try {
        // criar uma nova de estrutura de dados usando a classe modelo. Atenção! Os atributos precisam ser idênticos ao modelo de dados OS.js e os valores são definidos pelo conteúdo do objeto os
        const updateOS = await osModel.findByIdAndUpdate(
            os.id_OS,
            {
                idCliente: os.idClient_OS,
                statusOS: os.stat_OS,
                computador: os.computer_OS,
                serie: os.serial_OS,
                problema: os.problem_OS,
                observacao: os.obs_OS,
                tecnico: os.specialist_OS,
                diagnostico: os.diagnosis_OS,
                pecas: os.parts_OS,
                valor: os.total_OS
            },
            {
                new: true
            }
        )
        // Mensagem de confirmação
        dialog.showMessageBox({
            //customização
            type: 'info',
            title: "Aviso",
            message: "Dados da OS alterados com sucesso",
            buttons: ['OK']
        }).then((result) => {
            //ação ao pressionar o botão (result = 0)
            if (result.response === 0) {
                //enviar um pedido para o renderizador limpar os campos e resetar as configurações pré definidas (rótulo 'reset-form' do preload.js
                event.reply('reset-form')
            }
        })
    } catch (error) {
        console.log(error)
    }
})

// == Fim Editar OS - CRUD Update =============================
// ============================================================


// ============================================================
// Impressão de OS ============================================

// impressão via botão imprimir
ipcMain.on('print-os', async (event) => {
    prompt({
        title: 'Imprimir OS',
        label: 'Digite o número da OS:',
        inputAttrs: { type: 'text' },
        type: 'input',
        width: 400,
        height: 200,
    }).then(async (result) => {
        if (result !== null) {
            if (mongoose.Types.ObjectId.isValid(result)) {
                try {
                    const dataOS = await osModel.findById(result);
                    if (!dataOS) {
                        dialog.showMessageBox({
                            type: 'warning',
                            title: 'Aviso!',
                            message: 'OS não encontrada',
                            buttons: ['OK'],
                        })
                        return
                    }

                    // Buscar dados completos do cliente vinculado à OS
                    const dataClient = await clientModel.findById(dataOS.idCliente)

                    // Iniciar o documento PDF
                    const doc = new jsPDF('p', 'mm', 'a4')
                    const pageWidth = doc.internal.pageSize.getWidth()

                    // --- Cabeçalho ---
                    const logoPath = path.join(__dirname, 'src', 'public', 'img', 'logo.png');
                    const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' })
                    doc.addImage(logoBase64, 'PNG', 5, 7)

                    // Número da OS e Data de abertura no cabeçalho (direita)

                    doc.setFontSize(12)
                    doc.setTextColor('#003366') // Azul escuro

                    const numeroOsStr = `OS: ${dataOS._id.toString().toUpperCase()}`
                    const dataAberturaStr = `Data de Abertura: ${new Date(dataOS.dataEntrada).toLocaleDateString('pt-BR')}`

                    const rightSideX = pageWidth - 10 // margem direita
                    doc.text(numeroOsStr, rightSideX, 15, { align: 'right' })
                    doc.text(dataAberturaStr, rightSideX, 23, { align: 'right' })

                    // Linha separadora azul
                    doc.setDrawColor('#CCCCCC')
                    doc.setLineWidth(0.5)
                    doc.line(10, 37, pageWidth - 10, 37)

                    // --- Dados do Cliente ---
                    doc.setFontSize(16)
                    doc.setTextColor('#003366')
                    doc.text('Dados do Cliente', 10, 50)

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor('#000000')

                    let y = 60
                    const lineHeight = 7

                    doc.text(`Nome: ${dataClient.nomeCliente}`, 10, y)
                    doc.text(`CPF: ${dataClient.cpfCliente}`, 110, y)
                    y += lineHeight

                    doc.text(`Telefone: ${dataClient.foneCliente}`, 10, y);
                    doc.text(`Email: ${dataClient.emailCliente || 'N/A'}`, 110, y)
                    y += lineHeight

                    // Endereço completo
                    const endereco = `${dataClient.logradouroCliente}, ${dataClient.numeroCliente}` +
                        (dataClient.complementoCliente ? `, ${dataClient.complementoCliente}` : '')
                    doc.text(`Endereço: ${endereco}`, 10, y)
                    y += lineHeight

                    const bairroCidade = `${dataClient.bairroCliente} - ${dataClient.cidadeCliente} / ${dataClient.ufCliente} - CEP: ${dataClient.cepCliente}`
                    doc.text(bairroCidade, 10, y)
                    y += lineHeight + 4

                    // Linha separadora cinza
                    doc.setDrawColor('#CCCCCC')
                    doc.setLineWidth(0.5);
                    doc.line(10, y, pageWidth - 10, y)
                    y += 13;

                    // --- Detalhes da OS ---
                    doc.setFontSize(16)
                    doc.setTextColor('#003366')
                    doc.text('Detalhes da Ordem de Serviço', 10, y);
                    y += lineHeight * 1.8

                    doc.setFontSize(12);
                    doc.setTextColor('#000000');
                    doc.text(`Equipamento: ${dataOS.computador}`, 10, y)
                    y += lineHeight
                    doc.text(`Problema Relatado: ${dataOS.problema || 'N/A'}`, 10, y)
                    y += lineHeight

                    // Quebra texto problema relatado se for grande
                    // doc.setFontSize(11);
                    // doc.text(doc.splitTextToSize(dataOS.problema || 'N/A', pageWidth - 20), 10, y)
                    y += lineHeight

                    doc.setFontSize(12)
                    doc.text(`Observações:`, 10, y)
                    y += lineHeight
                    doc.setFontSize(11)
                    doc.text(doc.splitTextToSize(dataOS.observacao || 'Nenhuma', pageWidth - 20), 10, y)
                    y += lineHeight * 4

                    // Linha separadora cinza
                    doc.setDrawColor('#CCCCCC')
                    doc.setLineWidth(0.5)
                    doc.line(10, y, pageWidth - 10, y)
                    y += 8

                    // --- Termo de Serviço ---
                    doc.setFontSize(10)
                    doc.setTextColor('#444444')

                    const termo = `
  Termo de Serviço e Garantia
  
  O cliente autoriza a realização dos serviços técnicos descritos nesta ordem, ciente de que:
  
  - Diagnóstico e orçamento são gratuitos apenas se o serviço for aprovado. Caso contrário, poderá ser cobrada taxa de análise.
  - Peças substituídas poderão ser retidas para descarte ou devolvidas mediante solicitação no ato do serviço.
  - A garantia dos serviços prestados é de 90 dias, conforme Art. 26 do Código de Defesa do Consumidor, e cobre exclusivamente o reparo executado ou peça trocada, desde que o equipamento não tenha sido violado por terceiros.
  - Não nos responsabilizamos por dados armazenados. Recomenda-se o backup prévio.
  - Equipamentos não retirados em até 90 dias após a conclusão estarão sujeitos a cobrança de armazenagem ou descarte, conforme Art. 1.275 do Código Civil.
  - O cliente declara estar ciente e de acordo com os termos acima.
            `;

                    doc.text(doc.splitTextToSize(termo, pageWidth - 20), 10, y)
                    y += 60

                    // --- Assinatura ---
                    doc.setFontSize(12)
                    doc.setTextColor('#000000')
                    doc.text('Assinatura do Cliente:', 10, y + 24)
                    doc.line(58, y + 25, 125, y + 25)

                    // Salvar e abrir PDF
                    const tempDir = app.getPath('temp')
                    const filePath = path.join(tempDir, 'os.pdf')
                    doc.save(filePath)
                    await shell.openPath(filePath)

                } catch (error) {
                    console.error(error)
                }
            } else {
                dialog.showMessageBox({
                    type: 'error',
                    title: 'Atenção!',
                    message: 'Código da OS inválido.\nVerifique e tente novamente.',
                    buttons: ['OK'],
                })
            }
        }
    })
})

async function printOS(osId) {
    try {
        const dataOS = await osModel.findById(osId)
        if (!dataOS) {
            dialog.showMessageBox({
                type: 'warning',
                title: 'Aviso!',
                message: 'OS não encontrada',
                buttons: ['OK'],
            })
            return
        }

        // Buscar dados completos do cliente vinculado à OS
        const dataClient = await clientModel.findById(dataOS.idCliente)

        // Iniciar o documento PDF
        const doc = new jsPDF('p', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.getWidth()

        // --- Cabeçalho ---
        const logoPath = path.join(__dirname, 'src', 'public', 'img', 'logo.png');
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' })
        doc.addImage(logoBase64, 'PNG', 5, 7)

        // Número da OS e Data de abertura no cabeçalho (direita)

        doc.setFontSize(12)
        doc.setTextColor('#003366') // Azul escuro

        const numeroOsStr = `OS: ${dataOS._id.toString().toUpperCase()}`
        const dataAberturaStr = `Data de Abertura: ${new Date(dataOS.dataEntrada).toLocaleDateString('pt-BR')}`

        const rightSideX = pageWidth - 10 // margem direita
        doc.text(numeroOsStr, rightSideX, 15, { align: 'right' })
        doc.text(dataAberturaStr, rightSideX, 23, { align: 'right' })

        // Linha separadora azul
        doc.setDrawColor('#CCCCCC')
        doc.setLineWidth(0.5)
        doc.line(10, 37, pageWidth - 10, 37)

        // --- Dados do Cliente ---
        doc.setFontSize(16)
        doc.setTextColor('#003366')
        doc.text('Dados do Cliente', 10, 50)

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#000000')

        let y = 60
        const lineHeight = 7

        doc.text(`Nome: ${dataClient.nomeCliente}`, 10, y)
        doc.text(`CPF: ${dataClient.cpfCliente}`, 110, y)
        y += lineHeight

        doc.text(`Telefone: ${dataClient.foneCliente}`, 10, y);
        doc.text(`Email: ${dataClient.emailCliente || 'N/A'}`, 110, y)
        y += lineHeight

        // Endereço completo
        const endereco = `${dataClient.logradouroCliente}, ${dataClient.numeroCliente}` +
            (dataClient.complementoCliente ? `, ${dataClient.complementoCliente}` : '')
        doc.text(`Endereço: ${endereco}`, 10, y)
        y += lineHeight

        const bairroCidade = `${dataClient.bairroCliente} - ${dataClient.cidadeCliente} / ${dataClient.ufCliente} - CEP: ${dataClient.cepCliente}`
        doc.text(bairroCidade, 10, y)
        y += lineHeight + 4

        // Linha separadora cinza
        doc.setDrawColor('#CCCCCC')
        doc.setLineWidth(0.5);
        doc.line(10, y, pageWidth - 10, y)
        y += 13;

        // --- Detalhes da OS ---
        doc.setFontSize(16)
        doc.setTextColor('#003366')
        doc.text('Detalhes da Ordem de Serviço', 10, y);
        y += lineHeight * 1.8

        doc.setFontSize(12);
        doc.setTextColor('#000000');
        doc.text(`Equipamento: ${dataOS.computador}`, 10, y)
        y += lineHeight
        doc.text(`Problema Relatado: ${dataOS.problema || 'N/A'}`, 10, y)
        y += lineHeight

        // Quebra texto problema relatado se for grande
        // doc.setFontSize(11);
        // doc.text(doc.splitTextToSize(dataOS.problema || 'N/A', pageWidth - 20), 10, y)
        y += lineHeight

        doc.setFontSize(12)
        doc.text(`Observações:`, 10, y)
        y += lineHeight
        doc.setFontSize(11)
        doc.text(doc.splitTextToSize(dataOS.observacao || 'Nenhuma', pageWidth - 20), 10, y)
        y += lineHeight * 4

        // Linha separadora cinza
        doc.setDrawColor('#CCCCCC')
        doc.setLineWidth(0.5)
        doc.line(10, y, pageWidth - 10, y)
        y += 8

        // --- Termo de Serviço ---
        doc.setFontSize(10)
        doc.setTextColor('#444444')

        const termo = `
Termo de Serviço e Garantia

O cliente autoriza a realização dos serviços técnicos descritos nesta ordem, ciente de que:

- Diagnóstico e orçamento são gratuitos apenas se o serviço for aprovado. Caso contrário, poderá ser cobrada taxa de análise.
- Peças substituídas poderão ser retidas para descarte ou devolvidas mediante solicitação no ato do serviço.
- A garantia dos serviços prestados é de 90 dias, conforme Art. 26 do Código de Defesa do Consumidor, e cobre exclusivamente o reparo executado ou peça trocada, desde que o equipamento não tenha sido violado por terceiros.
- Não nos responsabilizamos por dados armazenados. Recomenda-se o backup prévio.
- Equipamentos não retirados em até 90 dias após a conclusão estarão sujeitos a cobrança de armazenagem ou descarte, conforme Art. 1.275 do Código Civil.
- O cliente declara estar ciente e de acordo com os termos acima.
`;

        doc.text(doc.splitTextToSize(termo, pageWidth - 20), 10, y)
        y += 60

        // --- Assinatura ---
        doc.setFontSize(12)
        doc.setTextColor('#000000')
        doc.text('Assinatura do Cliente:', 10, y + 24)
        doc.line(58, y + 25, 125, y + 25)

        // Salvar e abrir PDF
        const tempDir = app.getPath('temp')
        const filePath = path.join(tempDir, 'os.pdf')
        doc.save(filePath)
        await shell.openPath(filePath)

    } catch (error) {
        console.error(error)
    }
}


// Fim - Impressão de OS ======================================
// ============================================================


// ============================================================
// == Relatório de OS pendentes ===============================

async function relatorioOSPendentes() {
    try {
        const osPendentes = await osModel.find({ statusOS: { $ne: "Finalizada" } }).sort({ dataEntrada: 1 })

        const doc = new jsPDF('l', 'mm', 'a4')
        const imagePath = path.join(__dirname, 'src', 'public', 'img', 'logo.png')
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' })
        doc.addImage(imageBase64, 'PNG', 5, 8)
        doc.setFontSize(16)
        doc.text("Ordens de serviço pendentes", 14, 45)
        const dataAtual = new Date().toLocaleDateString('pt-BR')
        doc.setFontSize(12)
        doc.text(`Data: ${dataAtual}`, 250, 15)

        // Cabeçalhos da tabela
        const headers = [["Número da OS", "Entrada", "Cliente", "Telefone", "Status", "Equipamento", "Defeito"]]

        const data = []

        for (const os of osPendentes) {
            let nome, telefone
            try {
                const cliente = await clientModel.findById(os.idCliente)
                nome = cliente.nomeCliente
                telefone = cliente.foneCliente
            } catch (error) {
                console.log(error)
            }

            data.push([
                os._id,
                new Date(os.dataEntrada).toLocaleDateString('pt-BR'),
                nome,
                telefone,
                os.statusOS,
                os.computador,
                os.problema
            ])
        }

        doc.autoTable({
            head: headers,
            body: data,
            startY: 55,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [0, 120, 215] },
        })

        const tempDir = app.getPath('temp')
        const filePath = path.join(tempDir, 'os-pendentes.pdf')
        doc.save(filePath)
        shell.openPath(filePath)
    } catch (error) {
        console.log(error)
    }
}

// == Fim - relatório de OS pendentes =========================
// ============================================================


// ============================================================
// == Relatório de OS finalizadas =============================

async function relatorioOSFinalizadas() {
    try {
        const osFinalizadas = await osModel.find({ statusOS: "Finalizada" }).sort({ dataEntrada: 1 })

        const doc = new jsPDF('l', 'mm', 'a4')
        const imagePath = path.join(__dirname, 'src', 'public', 'img', 'logo.png')
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' })
        doc.addImage(imageBase64, 'PNG', 5, 8)
        doc.setFontSize(16)

        doc.text("Ordens de serviço finalizadas", 14, 45)

        const dataAtual = new Date().toLocaleDateString('pt-BR')
        doc.setFontSize(12)
        doc.text(`Data: ${dataAtual}`, 250, 15)

        const headers = [[
            "Número da OS", "Entrada", "Cliente", "Equipamento",
            "Técnico", "Diagnóstico", "Peças", "Valor (R$)"
        ]]

        const data = []
        let totalGeral = 0

        for (const os of osFinalizadas) {
            let nomeCliente
            try {
                const cliente = await clientModel.findById(os.idCliente)
                nomeCliente = cliente.nomeCliente
            } catch (error) {
                console.log("Erro ao buscar cliente:", error)
            }

            const valorOS = parseFloat(os.valor) || 0
            totalGeral += valorOS

            data.push([
                os._id.toString(),
                new Date(os.dataEntrada).toLocaleDateString('pt-BR'),
                nomeCliente,
                os.computador,
                os.tecnico,
                os.diagnostico,
                os.pecas || "N/A",
                valorOS.toFixed(2)
            ])
        }

        // Exibir total geral antes da tabela
        doc.setFontSize(12)
        doc.setTextColor(0, 100, 0) // verde escuro
        doc.text(`Total geral: R$ ${totalGeral.toFixed(2)}`, 235, 50)
        doc.setTextColor(0, 0, 0) // resetar para preto

        doc.autoTable({
            head: headers,
            body: data,
            startY: 55,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [0, 120, 215] },
        })

        const tempDir = app.getPath('temp')
        const filePath = path.join(tempDir, 'os-finalizadas.pdf')
        doc.save(filePath)
        shell.openPath(filePath)
    } catch (error) {
        console.log(error)
    }
}


// == Fim - relatório de OS finalizada ========================
// ============================================================