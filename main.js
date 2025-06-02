const { app, BrowserWindow, nativeTheme, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('node:path')
const { conectar, desconectar } = require('./database.js')
const mongoose = require('mongoose')
const clientModel = require('./src/models/Clientes.js')
const osModel = require('./src/models/OS.js')
const jsPDF = require('jspdf').jsPDF
require('jspdf-autotable')
const fs = require('fs')
const prompt = require('electron-prompt')

let win
const createWindow = () => {
    nativeTheme.themeSource = 'light'
    win = new BrowserWindow({
        width: 800,
        height: 600,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
    win.loadFile('./src/views/index.html')
}

function aboutWindow() {
    nativeTheme.themeSource = 'light'
    const main = BrowserWindow.getFocusedWindow()
    let about
    if (main) {
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
    about.loadFile('./src/views/sobre.html')
}

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
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
            }
        })
    }
    client.loadFile('./src/views/cliente.html')
    client.center()
}

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
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
            }
        })
    }
    osScreen.loadFile('./src/views/os.html')
    osScreen.center()
}

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

app.commandLine.appendSwitch('log-level', '3')

ipcMain.on('db-connect', async (event) => {
    let conectado = await conectar()
    if (conectado) {
        setTimeout(() => {
            event.reply('db-status', "conectado")
        }, 500)
    }
})

app.on('before-quit', () => {
    desconectar()
})

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

ipcMain.on('client-window', () => {
    clientWindow()
})

ipcMain.on('os-window', () => {
    osWindow()
})

ipcMain.on('validate-cpf', (event) => {
    dialog.showMessageBox({
        type: 'error',
        title: "Atenção!",
        message: "CPF inválido.",
        buttons: ['OK']
    })
})

ipcMain.on('new-client', async (event, client) => {
    try {
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
        await newClient.save()
        dialog.showMessageBox({
            type: 'info',
            title: "Aviso",
            message: "Cliente adicionado com sucesso",
            buttons: ['OK']
        }).then((result) => {

            if (result.response === 0) {

                event.reply('reset-form')
            }
        })
    } catch (error) {
        if (error.code === 11000) {
            dialog.showMessageBox({
                type: 'error',
                title: "Atenção!",
                message: "CPF já está cadastrado\nVerifique se digitou corretamente",
                buttons: ['OK']
            }).then((result) => {
                if (result.response === 0) {

                }
            })
        }
        console.log(error)
    }
})

async function relatorioClientes() {
    try {
        const clientes = await clientModel.find().sort({ nomeCliente: 1 })
        const doc = new jsPDF('p', 'mm', 'a4')
        const imagePath = path.join(__dirname, 'src', 'public', 'img', 'logo.png')
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' })
        doc.addImage(imageBase64, 'PNG', 5, 8)
        doc.setFontSize(18)
        doc.text("Relatório de clientes", 14, 45)
        const dataAtual = new Date().toLocaleDateString('pt-BR')
        doc.setFontSize(12)
        doc.text(`Data: ${dataAtual}`, 165, 10)
        let y = 60
        doc.text("Nome", 14, y)
        doc.text("Telefone", 80, y)
        doc.text("E-mail", 130, y)
        y += 5
        doc.setLineWidth(0.5)
        doc.line(10, y, 200, y)
        y += 10
        clientes.forEach((c) => {
            if (y > 280) {
                doc.addPage()
                y = 20
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
            y += 10
        })
        const paginas = doc.internal.getNumberOfPages()
        for (let i = 1; i <= paginas; i++) {
            doc.setPage(i)
            doc.setFontSize(10)
            doc.text(`Página ${i} de ${paginas}`, 105, 290, { align: 'center' })
        }
        const tempDir = app.getPath('temp')
        const filePath = path.join(tempDir, 'clientes.pdf')
        doc.save(filePath)
        shell.openPath(filePath)
    } catch (error) {
        console.log(error)
    }
}

ipcMain.on('validate-search', () => {
    dialog.showMessageBox({
        type: 'warning',
        title: "Atenção!",
        message: "Preencha o campo de busca",
        buttons: ['OK']
    })
})

ipcMain.on('search-name', async (event, name) => {
    try {
        const dataClient = await clientModel.find({
            nomeCliente: new RegExp(name, 'i')
        })
        if (dataClient.length === 0) {
            dialog.showMessageBox({
                type: 'warning',
                title: "Aviso",
                message: "Cliente não cadastrado.\nDeseja cadastrar este cliente?",
                defaultId: 0,
                buttons: ['Sim', 'Não']
            }).then((result) => {
                if (result.response === 0) {

                    event.reply('set-client')
                } else {

                    event.reply('reset-form')
                }
            })
        }
        event.reply('render-client', JSON.stringify(dataClient))
    } catch (error) {
        console.log(error)
    }
})

ipcMain.on('search-cpf', async (event, name) => {
    try {
        const dataClient = await clientModel.find({
            cpfCliente: name
        })
        if (dataClient.length === 0) {
            dialog.showMessageBox({
                type: 'warning',
                title: "Aviso",
                message: "Cliente não cadastrado.\nDeseja cadastrar este cliente?",
                defaultId: 0,
                buttons: ['Sim', 'Não']
            }).then((result) => {
                if (result.response === 0) {

                    event.reply('set-cpf')
                } else {

                    event.reply('reset-form')
                }
            })
        }
        event.reply('render-client', JSON.stringify(dataClient))
    } catch (error) {
        console.log(error)
    }
})

ipcMain.on('delete-client', async (event, id) => {
    try {
        const { response } = await dialog.showMessageBox(client, {
            type: 'warning',
            title: "Atenção!",
            message: "Deseja excluir este cliente?\nEsta ação não poderá ser desfeita.",
            buttons: ['Cancelar', 'Excluir']
        })
        if (response === 1) {
            const delClient = await clientModel.findByIdAndDelete(id)
            event.reply('reset-form')
        }
    } catch (error) {
        console.log(error)
    }
})

ipcMain.on('update-client', async (event, client) => {
    try {
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
        dialog.showMessageBox({
            type: 'info',
            title: "Aviso",
            message: "Dados do cliente alterados com sucesso",
            buttons: ['OK']
        }).then((result) => {
            if (result.response === 0) {
                event.reply('reset-form')
            }
        })
    } catch (error) {
        console.log(error)
    }
})

ipcMain.on('search-clients', async (event) => {
    try {
        const clients = await clientModel.find().sort({ nomeCliente: 1 })
        event.reply('list-clients', JSON.stringify(clients))
    } catch (error) {
        console.log(error)
    }
})

ipcMain.on('validate-client', (event) => {
    dialog.showMessageBox({
        type: 'warning',
        title: "Aviso!",
        message: "É obrigatório vincular o cliente na Ordem de Serviço",
        buttons: ['OK']
    }).then((result) => {
        if (result.response === 0) {
            event.reply('set-search')
        }
    })
})
ipcMain.on('new-os', async (event, os) => {
    try {
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
        await newOS.save()
        const osId = newOS._id
        dialog.showMessageBox({
            type: 'info',
            title: "Aviso",
            message: "OS gerada com sucesso.\nDeseja imprimir esta OS?",
            buttons: ['Sim', 'Não']
        }).then((result) => {
            if (result.response === 0) {
                printOS(osId)
                event.reply('reset-form')
            } else {
                event.reply('reset-form')
            }
        })
    } catch (error) {
        console.log(error)
    }
})

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
        if (result !== null) {
            if (mongoose.Types.ObjectId.isValid(result)) {
                try {
                    const dataOS = await osModel.findById(result)
                    if (dataOS && dataOS !== null) {
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
    try {
        const dataClient = await clientModel.find({
            _id: idClient
        })
        event.reply('render-idClient', JSON.stringify(dataClient))
    } catch (error) {
        console.log(error)
    }
})

ipcMain.on('delete-os', async (event, idOS) => {
    try {
        const { response } = await dialog.showMessageBox(osScreen, {
            type: 'warning',
            title: "Atenção!",
            message: "Deseja excluir esta ordem de serviço?\nEsta ação não poderá ser desfeita.",
            buttons: ['Cancelar', 'Excluir']
        })
        if (response === 1) {
            const delOS = await osModel.findByIdAndDelete(idOS)
            event.reply('reset-form')
        }
    } catch (error) {
        console.log(error)
    }
})

ipcMain.on('update-os', async (event, os) => {
    try {
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
        dialog.showMessageBox({
            type: 'info',
            title: "Aviso",
            message: "Dados da OS alterados com sucesso",
            buttons: ['OK']
        }).then((result) => {
            if (result.response === 0) {
                event.reply('reset-form')
            }
        })
    } catch (error) {
        console.log(error)
    }
})

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
                    const dataClient = await clientModel.findById(dataOS.idCliente)
                    const doc = new jsPDF('p', 'mm', 'a4')
                    const pageWidth = doc.internal.pageSize.getWidth()
                    const logoPath = path.join(__dirname, 'src', 'public', 'img', 'logo.png');
                    const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' })
                    doc.addImage(logoBase64, 'PNG', 5, 7)
                    doc.setFontSize(12)
                    doc.setTextColor('#003366')
                    const numeroOsStr = `OS: ${dataOS._id.toString().toUpperCase()}`
                    const dataAberturaStr = `Data de Abertura: ${new Date(dataOS.dataEntrada).toLocaleDateString('pt-BR')}`
                    const rightSideX = pageWidth - 10
                    doc.text(numeroOsStr, rightSideX, 15, { align: 'right' })
                    doc.text(dataAberturaStr, rightSideX, 23, { align: 'right' })
                    doc.setDrawColor('#CCCCCC')
                    doc.setLineWidth(0.5)
                    doc.line(10, 37, pageWidth - 10, 37)
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
                    const endereco = `${dataClient.logradouroCliente}, ${dataClient.numeroCliente}` +
                        (dataClient.complementoCliente ? `, ${dataClient.complementoCliente}` : '')
                    doc.text(`Endereço: ${endereco}`, 10, y)
                    y += lineHeight
                    const bairroCidade = `${dataClient.bairroCliente} - ${dataClient.cidadeCliente} / ${dataClient.ufCliente} - CEP: ${dataClient.cepCliente}`
                    doc.text(bairroCidade, 10, y)
                    y += lineHeight + 4
                    doc.setDrawColor('#CCCCCC')
                    doc.setLineWidth(0.5);
                    doc.line(10, y, pageWidth - 10, y)
                    y += 13
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
                    doc.setFontSize(12)
                    doc.text(`Observações:`, 10, y)
                    y += lineHeight
                    doc.setFontSize(11)
                    doc.text(doc.splitTextToSize(dataOS.observacao || 'Nenhuma', pageWidth - 20), 10, y)
                    y += lineHeight * 4
                    doc.setDrawColor('#CCCCCC')
                    doc.setLineWidth(0.5)
                    doc.line(10, y, pageWidth - 10, y)
                    y += 8
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
            `
                    doc.text(doc.splitTextToSize(termo, pageWidth - 20), 10, y)
                    y += 60
                    doc.setFontSize(12)
                    doc.setTextColor('#000000')
                    doc.text('Assinatura do Cliente:', 10, y + 24)
                    doc.line(58, y + 25, 125, y + 25)
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
        const dataClient = await clientModel.findById(dataOS.idCliente)
        const doc = new jsPDF('p', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.getWidth()
        const logoPath = path.join(__dirname, 'src', 'public', 'img', 'logo.png');
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' })
        doc.addImage(logoBase64, 'PNG', 5, 7)
        doc.setFontSize(12)
        doc.setTextColor('#003366')
        const numeroOsStr = `OS: ${dataOS._id.toString().toUpperCase()}`
        const dataAberturaStr = `Data de Abertura: ${new Date(dataOS.dataEntrada).toLocaleDateString('pt-BR')}`
        const rightSideX = pageWidth - 10
        doc.text(numeroOsStr, rightSideX, 15, { align: 'right' })
        doc.text(dataAberturaStr, rightSideX, 23, { align: 'right' })
        doc.setDrawColor('#CCCCCC')
        doc.setLineWidth(0.5)
        doc.line(10, 37, pageWidth - 10, 37)
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
        const endereco = `${dataClient.logradouroCliente}, ${dataClient.numeroCliente}` +
            (dataClient.complementoCliente ? `, ${dataClient.complementoCliente}` : '')
        doc.text(`Endereço: ${endereco}`, 10, y)
        y += lineHeight
        const bairroCidade = `${dataClient.bairroCliente} - ${dataClient.cidadeCliente} / ${dataClient.ufCliente} - CEP: ${dataClient.cepCliente}`
        doc.text(bairroCidade, 10, y)
        y += lineHeight + 4
        doc.setDrawColor('#CCCCCC')
        doc.setLineWidth(0.5);
        doc.line(10, y, pageWidth - 10, y)
        y += 13;
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
        doc.setFontSize(12)
        doc.text(`Observações:`, 10, y)
        y += lineHeight
        doc.setFontSize(11)
        doc.text(doc.splitTextToSize(dataOS.observacao || 'Nenhuma', pageWidth - 20), 10, y)
        y += lineHeight * 4
        doc.setDrawColor('#CCCCCC')
        doc.setLineWidth(0.5)
        doc.line(10, y, pageWidth - 10, y)
        y += 8
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
`
        doc.text(doc.splitTextToSize(termo, pageWidth - 20), 10, y)
        y += 60
        doc.setFontSize(12)
        doc.setTextColor('#000000')
        doc.text('Assinatura do Cliente:', 10, y + 24)
        doc.line(58, y + 25, 125, y + 25)
        const tempDir = app.getPath('temp')
        const filePath = path.join(tempDir, 'os.pdf')
        doc.save(filePath)
        await shell.openPath(filePath)
    } catch (error) {
        console.error(error)
    }
}

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
        doc.setFontSize(12)
        doc.setTextColor(0, 100, 0)
        doc.text(`Total geral: R$ ${totalGeral.toFixed(2)}`, 235, 50)
        doc.setTextColor(0, 0, 0)
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