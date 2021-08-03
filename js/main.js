import { MachineId } from './modules/machine-id.js';
import { NumberHelper } from './modules/utils/number-helper.js';
import gui from './elements.js';

const NUMBER_OF_PREFIX = 4;

let operationMode = 8;
let syntax = 1;
let assembler = new ks.Keystone(ks.ARCH_X86, operationMode);
assembler.option(ks.OPT_SYNTAX, syntax);

gui.operationMode.on('change', function () {
    assembler.close();
    operationMode = Number(this.value);

    assembler = new ks.Keystone(ks.ARCH_X86, operationMode);
    assembler.option(ks.OPT_SYNTAX, syntax);

    gui.input.event('change');
});

gui.syntax.on('change', function () {
    syntax = Number(this.value);
    assembler.option(ks.OPT_SYNTAX, syntax);

    gui.input.event('change');
});

gui.input.on('input', function () {
    gui.output.html(this.value || '&nbsp;');

    hljs.highlightElement(gui.output.element);
});

gui.input.on('change', function () {
    let machineCode;
    const firstInstruction = this.value.split(';')[0];

    try {
        machineCode = assembler.asm(firstInstruction);
    } catch (e) {
        gui.inputError.message(`The instruction is wrong or is invalid in ${operationMode * 8}-bit mode.`);
        return;
    }

    const decodedMachineCode = MachineId.decodeMachineCode(machineCode, operationMode);
    if (!decodedMachineCode) {
        gui.inputError.message('The given instruction is not yet supported. Sorry for that!');
        return;
    }

    const operandSize = (decodedMachineCode.opFixedSize)
        ? decodedMachineCode.opFixedSize
        : decodedMachineCode.operandSize;

    gui.addressSize.text(`${decodedMachineCode.addressSize * 8}-bit`);
    gui.operandSize.text(`${operandSize * 8}-bit`);
    gui.segment.text(decodedMachineCode.segment);

    for (let i = 0; i < NUMBER_OF_PREFIX; i++) {
        gui[`prefix${i}`]
            .value(decodedMachineCode.prefixes[i]?.prefix)
            .prefixName(decodedMachineCode.prefixes[i]?.name ?? '');
    }

    let immediateSize = (decodedMachineCode.immediate)
        ? (decodedMachineCode.opFixedSize)
            ? decodedMachineCode.opFixedSize
            : decodedMachineCode.operandSize
        : 0;

    if (immediateSize > 4) {
        immediateSize = 4;
    }

    gui.opcode.value(decodedMachineCode.opcode.value, 2);
    gui.modRM.update(decodedMachineCode.modRM);
    gui.sib.update(decodedMachineCode.sib);

    const signedImm = NumberHelper.signedInt(immediateSize * 8, decodedMachineCode.immediate);
    const signedDisp = NumberHelper.signedInt(decodedMachineCode.displacementSize * 8, decodedMachineCode.displacement);

    gui.displacement
        .value(decodedMachineCode.displacement, decodedMachineCode.displacementSize * 2)
        .size(decodedMachineCode.displacementSize * 8)
        .decimal(`(${signedDisp})`);

    gui.immediate
        .value(decodedMachineCode.immediate, immediateSize * 2)
        .size(immediateSize * 8)
        .decimal(`(${signedImm})`);

    const machineCodeHexaBytes = Array.from(machineCode).map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'));

    gui.machineBytes.text(machineCodeHexaBytes.join(' '));
    gui.inputError.hide();
});
