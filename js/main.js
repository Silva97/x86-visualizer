import { MachineId } from './modules/machine-id.js';
import { $ } from './modules/query.js';

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
        return;
    }

    const decodedMachineCode = MachineId.decodeMachineCode(machineCode, ASM_MODE);
    if (!decodedMachineCode) {
        // Unsupported instruction
        return;
    }

    const operandSize = (decodedMachineCode.opFixedSize)
        ? decodedMachineCode.opFixedSize
        : decodedMachineCode.operandSize;

    $('#address-size').innerText = `${decodedMachineCode.addressSize * 8}-bit`;
    $('#operand-size').innerText = `${operandSize * 8}-bit`;

    for (let i = 0; i < NUMBER_OF_PREFIX; i++) {
        writeValue(`#prefix${i}`, decodedMachineCode.prefixes[i]?.prefix);
        $(`#prefix${i}-name`).innerText = decodedMachineCode.prefixes[i]?.name ?? '';
    }

    const immediateSize = (decodedMachineCode.immediate)
        ? (decodedMachineCode.opFixedSize)
            ? decodedMachineCode.opFixedSize
            : decodedMachineCode.operandSize
        : 0;

    writeValue('#opcode', decodedMachineCode.opcode.value, 2);
    writeValue('#modrm', decodedMachineCode.modRM);
    writeValue('#sib', decodedMachineCode.sib);
    writeValue('#displacement', decodedMachineCode.displacement, decodedMachineCode.displacementSize * 2);
    writeValue('#immediate', decodedMachineCode.immediate, immediateSize * 2);

    $('#immediate-size').innerText = immediateSize * 8;
    $('#displacement-size').innerText = decodedMachineCode.displacementSize * 8;
    $('#immediate-decimal').innerText = `(${decodedMachineCode.immediate ?? ''})`;
    $('#displacement-decimal').innerText = `(${decodedMachineCode.displacement ?? ''})`;


    const machineCodeHexaBytes = Array.from(machineCode).map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'));

    $('.machine-bytes').innerText = machineCodeHexaBytes.join(' ');
});


function writeValue(field, value, paddingSize = 2) {
    if (typeof value != 'number') {
        $(field).innerText = '';
        return;
    }

    $(field).innerText = value
        .toString(16)
        .toUpperCase()
        .padStart(paddingSize, '0');
}
