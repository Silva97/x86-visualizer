import { ElementCollection, QueryElement } from './modules/utils/element-collection.js';
import { NumberHelper } from './modules/utils/number-helper.js';

class NumericElement extends QueryElement {
    value(value, paddingSize = 2, base = 16) {
        if (typeof value != 'number') {
            this.text('')
                .parent
                .classList
                .add('machine-box-hidden');
            return this;
        }

        const fieldContent = NumberHelper.intToBase(paddingSize * 4, base, value)
            .toUpperCase()
            .padStart(paddingSize, '0');

        this.text(fieldContent)
            .parent
            .classList
            .remove('machine-box-hidden');

        return this;
    }
}

class Prefix extends NumericElement {
    constructor(query) {
        super(query);

        this.nameElement = new QueryElement(`${query}-name`);
    }

    prefixName(name) {
        this.nameElement.text(name);
        return this;
    }
}

class MemoryByte extends NumericElement {
    constructor(query, firstName, secondName, thirdName) {
        super(query);

        this.firstElement = new NumericElement(`${query}-${firstName}`);
        this.secondElement = new NumericElement(`${query}-${secondName}`);
        this.thirdElement = new NumericElement(`${query}-${thirdName}`);
    }

    first(byte) {
        this.firstElement.value((byte & 0b11000000) >> 6, 2, 2);
        return this;
    }

    second(byte) {
        this.secondElement.value((byte & 0b00111000) >> 3, 3, 2);
        return this;
    }

    third(byte) {
        this.thirdElement.value(byte & 0b00000111, 3, 2);
        return this;
    }

    update(byte) {
        return this
            .value(byte)
            .first(byte)
            .second(byte)
            .third(byte);
    }
}

class ModRM extends MemoryByte {
    constructor(query) {
        super(query, 'mod', 'reg', 'rm');
    }

    mod(modrmByte) {
        return this.first(modrmByte);
    }

    reg(modrmByte) {
        return this.second(modrmByte);
    }

    rm(modrmByte) {
        return this.third(modrmByte);
    }
}

class SIB extends MemoryByte {
    constructor(query) {
        super(query, 'scale', 'index', 'base');
    }

    scale(sib) {
        return this.first(sib);
    }

    index(sib) {
        return this.second(sib);
    }

    base(sib) {
        return this.third(sib);
    }
}

class MachineCodeValue extends NumericElement {
    constructor(query) {
        super(query);

        this.sizeElement = new QueryElement(`${query}-size`);
        this.decimalElement = new QueryElement(`${query}-decimal`);
    }

    size(value) {
        this.sizeElement.text(value);
        return this;
    }

    decimal(value) {
        this.decimalElement.text(value);
        return this;
    }
}

class ErrorElement extends QueryElement {
    message(text) {
        return this
            .text(text)
            .unhide();
    }
}

const elements = new ElementCollection({
    operationMode: '#operation-mode',
    input: '.asm-input',
    output: '.asm-output',
    syntax: '#syntax',
    addressSize: '#address-size',
    operandSize: '#operand-size',
    segment: '#segment',
    machineBytes: '.machine-bytes',
    inputError: new ErrorElement('.input-error'),
    prefix0: new Prefix('#prefix0'),
    prefix1: new Prefix('#prefix1'),
    prefix2: new Prefix('#prefix2'),
    prefix3: new Prefix('#prefix3'),
    opcode: new NumericElement('#opcode'),
    modRM: new ModRM('#modrm'),
    sib: new SIB('#sib'),
    displacement: new MachineCodeValue('#displacement'),
    immediate: new MachineCodeValue('#immediate'),
});

export default elements;
