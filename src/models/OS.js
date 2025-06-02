const { model, Schema } = require('mongoose')

const osSchema = new Schema({
    dataEntrada: {
        type: Date,
        default: Date.now
    },
    idCliente: {
        type: String,
    },
    statusOS: {
        type: String
    },
    computador: {
        type: String
    },
    serie: {
        type: String
    },
    problema: {
        type: String
    },
    observacao: {
        type: String
    },
    tecnico: {
        type: String
    },
    diagnostico: {
        type: String
    },
    pecas: {
        type: String
    },
    valor: {
        type: String
    },
}, { versionKey: false })

module.exports = model('OS', osSchema)