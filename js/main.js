import { MachineId } from './modules/machine-id.js';
import { $ } from './modules/query.js';
import { NumberHelper } from './modules/utils/number-helper.js';

const ASM_MODE = ks.MODE_64;
const NUMBER_OF_PREFIX = 4;

const assembler = new ks.Keystone(ks.ARCH_X86, ASM_MODE);
assembler.option(ks.OPT_SYNTAX, ks.OPT_SYNTAX_INTEL);


$('.asm-input').addEventListener('change', function () {
    let machineCode;
    const firstInstruction = this.value.split(';')[0];

    try {
        machineCode = assembler.asm(firstInstruction);
    } catch (e) {
        writeError(`The instruction is wrong or is invalid in ${ASM_MODE * 8}-bit mode.`);
        return;
    }

    const decodedMachineCode = MachineId.decodeMachineCode(machineCode, ASM_MODE);
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
    if (typeof value != 'number') {
        $(field).innerText = '';
        return;
    }

    const converter = {
        2: NumberHelper.int8toBase,
        4: NumberHelper.int16toBase,
        8: NumberHelper.int32toBase,
    }[paddingSize];

    $(field).innerText = NumberHelper.intToBase(paddingSize * 4, base, value)
        .toUpperCase()
        .padStart(paddingSize, '0');
}

function writeError(message) {
    const errorBox = $('.input-error');
    errorBox.innerText = message;
    errorBox.hidden = false;
}

function hideError() {
    $('.input-error').hidden = true;
}
