import { MachineId } from './modules/machine-id.js';
import { $ } from './modules/query.js';
import { NumberHelper } from './modules/utils/number-helper.js';

const NUMBER_OF_PREFIX = 4;

let operationMode = 8;
let syntax = 1;
let assembler = new ks.Keystone(ks.ARCH_X86, operationMode);
assembler.option(ks.OPT_SYNTAX, syntax);

$('#operation-mode').addEventListener('change', function () {
    assembler.close();
    operationMode = Number(this.value);

    assembler = new ks.Keystone(ks.ARCH_X86, operationMode);
    assembler.option(ks.OPT_SYNTAX, syntax);

    $('.asm-input').dispatchEvent(new Event('change'));
});

$('#syntax').addEventListener('change', function () {
    syntax = Number(this.value);
    assembler.option(ks.OPT_SYNTAX, syntax);

    $('.asm-input').dispatchEvent(new Event('change'));
});

$('.asm-input').addEventListener('change', function () {
    let machineCode;
    const firstInstruction = this.value.split(';')[0];

    try {
        machineCode = assembler.asm(firstInstruction);
    } catch (e) {
        writeError(`The instruction is wrong or is invalid in ${operationMode * 8}-bit mode.`);
        return;
    }

    const decodedMachineCode = MachineId.decodeMachineCode(machineCode, operationMode);
    if (!decodedMachineCode) {
        writeError('The given instruction is not yet supported. Sorry for that!');
        return;
    }

    const operandSize = (decodedMachineCode.opFixedSize)
        ? decodedMachineCode.opFixedSize
        : decodedMachineCode.operandSize;

    $('#address-size').innerText = `${decodedMachineCode.addressSize * 8}-bit`;
    $('#operand-size').innerText = `${operandSize * 8}-bit`;
    $('#segment').innerText = decodedMachineCode.segment;

    for (let i = 0; i < NUMBER_OF_PREFIX; i++) {
        writeValue(`#prefix${i}`, decodedMachineCode.prefixes[i]?.prefix);
        $(`#prefix${i}-name`).innerText = decodedMachineCode.prefixes[i]?.name ?? '';
    }

    let immediateSize = (decodedMachineCode.immediate)
        ? (decodedMachineCode.opFixedSize)
            ? decodedMachineCode.opFixedSize
            : decodedMachineCode.operandSize
        : 0;

    if (immediateSize > 4) {
        immediateSize = 4;
    }

    writeValue('#opcode', decodedMachineCode.opcode.value, 2);
    writeValue('#modrm', decodedMachineCode.modRM);
    writeValue('#modrm-mod', (decodedMachineCode.modRM & 0b11000000) >> 6, 2, 2);
    writeValue('#modrm-reg', (decodedMachineCode.modRM & 0b00111000) >> 3, 3, 2);
    writeValue('#modrm-rm', decodedMachineCode.modRM & 0b00000111, 3, 2);
    writeValue('#sib', decodedMachineCode.sib);
    writeValue('#sib-scale', (decodedMachineCode.sib & 0b11000000) >> 6, 2, 2);
    writeValue('#sib-index', (decodedMachineCode.sib & 0b00111000) >> 3, 3, 2);
    writeValue('#sib-base', decodedMachineCode.sib & 0b00000111, 3, 2);
    writeValue('#displacement', decodedMachineCode.displacement, decodedMachineCode.displacementSize * 2);
    writeValue('#immediate', decodedMachineCode.immediate, immediateSize * 2);

    const signedImm = NumberHelper.signedInt(immediateSize * 8, decodedMachineCode.immediate);
    const signedDisp = NumberHelper.signedInt(decodedMachineCode.displacementSize * 8, decodedMachineCode.displacement);
    $('#immediate-size').innerText = immediateSize * 8;
    $('#displacement-size').innerText = decodedMachineCode.displacementSize * 8;
    $('#immediate-decimal').innerText = `(${signedImm})`;
    $('#displacement-decimal').innerText = `(${signedDisp})`;


    const machineCodeHexaBytes = Array.from(machineCode).map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'));

    $('.machine-bytes').innerText = machineCodeHexaBytes.join(' ');
    hideError();
});


function writeValue(field, value, paddingSize = 2, base = 16) {
    const fieldElement = $(field);

    if (typeof value != 'number') {
        fieldElement.innerText = '';
        fieldElement.parentElement.classList.add('machine-box-hidden');
        return;
    }

    const converter = {
        2: NumberHelper.int8toBase,
        4: NumberHelper.int16toBase,
        8: NumberHelper.int32toBase,
    }[paddingSize];

    fieldElement.innerText = NumberHelper.intToBase(paddingSize * 4, base, value)
        .toUpperCase()
        .padStart(paddingSize, '0');

    fieldElement.parentElement.classList.remove('machine-box-hidden');
}

function writeError(message) {
    const errorBox = $('.input-error');
    errorBox.innerText = message;
    errorBox.hidden = false;
}

function hideError() {
    $('.input-error').hidden = true;
}
