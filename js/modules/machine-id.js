import * as opcode from './opcode-list.js';

export class MachineId {
    static prefixList = {
        0xF0: 'LOCK',
        0xF2: 'REPNE',
        0xF3: 'REP/REPE',
        0x2E: 'CS',
        0x36: 'SS',
        0x3E: 'DS',
        0x26: 'ES',
        0x64: 'FS',
        0x65: 'GS',
        0x66: 'Operand-size override',
        0x67: 'Address-size override',
    };

    static operandSizes = [
        4,
        2,
    ];

    static decodeMachineCode(byteList, operationMode) {
        let modRM = null;
        let sib = null;
        let displacement = null;
        let immediate = null;
        let operandSizeIndex = +(operationMode == ks.MODE_16)

        byteList = Array.from(byteList);

        const prefixes = this.#getPrefixes(byteList);
        const opcode = this.#getOpcode(byteList);
        if (operationMode == ks.MODE_64 && opcode.invalid64bit) {
            return null;
        }

        if (this.#hasPrefix(prefixes, 0x66)) {
            operandSizeIndex = +(!operandSizeIndex);
        }

        if (opcode.hasModRM) {
            modRM = byteList.shift();
            if (this.#hasSIB(modRM)) {
                sib = byteList.shift();
            }

            const displacementSize = this.#getDisplacementSize(modRM, operationMode);
            if (displacementSize) {
                displacement = this.#getLittleEndianValue(byteList, displacementSize);
                byteList.splice(0, displacementSize);
            }
        }

        if (opcode.hasImm) {
            const immSize = (opcode.immSize)
                ? opcode.immSize
                : this.operandSizes[operandSizeIndex];

            immediate = this.#getLittleEndianValue(byteList, immSize);
            byteList.splice(0, immSize);
        }

        return {
            prefixes,
            opcode,
            modRM,
            sib,
            displacement,
            immediate,
        };
    }

    static #isPrefix(byte) {
        return typeof this.prefixList[byte] == 'string';
    }

    static #getPrefixes(byteList) {
        let prefixes = [];
        let currentByte;

        while (true) {
            currentByte = byteList[0];
            if (!this.#isPrefix(currentByte)) {
                break;
            }

            prefixes.push({
                prefix: currentByte,
                name: this.prefixList[currentByte],
            });

            byteList.shift();
        }

        return prefixes;
    }

    static #getOpcode(byteList) {
        const firstByte = byteList.shift();

        if (typeof opcode.oneByteList[firstByte] == 'object') {
            return opcode.oneByteList[firstByte];
        }

        return null;
    }

    static #hasSIB(modRM) {
        const mode = (modRM & 0b11000000) >> 6;
        if (mode == 0b11) {
            return false;
        }

        const rm = (modRM & 0b00000111);

        return rm == 0b100;
    }

    static #getDisplacementSize(modRM, operationMode) {
        const mode = (modRM & 0b11000000) >> 6;
        const rm = (modRM & 0b00000111);

        if (operationMode == ks.MODE_16) {
            if (mode == 0b00) {
                return +(rm == 0b110) * 2;
            }

            return {
                0b01: 1,
                0b10: 2,
                0b11: 0,
            }[mode];
        }

        if (mode == 0b00) {
            return +(rm == 0b101) * 4;
        }

        return {
            0b01: 1,
            0b10: 4,
            0b11: 0,
        }[mode];
    }

    static #getLittleEndianValue(byteList, size) {
        const dataView = new DataView(Uint32Array.from(byteList).buffer);

        switch (size) {
            case 1:
                return dataView.getInt8(0);
            case 2:
                return dataView.getInt16(0, true);
            case 4:
                return dataView.getInt32(0, true);
            default:
                throw new Error(`getLittleEndianValue(): The size ${size} is invalid.`);
        }
    }

    static #hasPrefix(prefixes, prefix) {
        return prefixes.indexOf(prefix) >= 0;
    }
}
