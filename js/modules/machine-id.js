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
        0x40: 'REX',
        0x41: 'REX.B',
        0x42: 'REX.X',
        0x43: 'REX.XB',
        0x44: 'REX.R',
        0x45: 'REX.RB',
        0x46: 'REX.RX',
        0x47: 'REX.RXB',
        0x48: 'REX.W',
        0x49: 'REX.WB',
        0x4A: 'REX.WX',
        0x4B: 'REX.WXB',
        0x4C: 'REX.WR',
        0x4D: 'REX.WRB',
        0x4E: 'REX.WRX',
        0x4F: 'REX.WRXB',
    };

    static operandSizes = [
        2,   // 16-bit
        4,   // 32-bit
    ];

    static addressSizes = {
        [ks.MODE_16]: 2,   // 16-bit
        [ks.MODE_32]: 4,   // 32-bit
        [ks.MODE_64]: 8,   // 64-bit
    };

    static decodeMachineCode(byteList, operationMode) {
        let modRM = null;
        let sib = null;
        let displacement = null;
        let immediate = null;
        let displacementSize = 0;
        let operandSizeIndex = +(operationMode != ks.MODE_16)
        let addressSize = this.addressSizes[operationMode];

        byteList = Array.from(byteList);

        const prefixes = this.#getPrefixes(byteList, operationMode);
        const opcode = this.#getOpcode(byteList);
        if (
            !opcode
            || (operationMode == ks.MODE_64 && opcode.invalid64bit)
            || (operationMode != ks.MODE_64 && opcode.only64bit)
        ) {
            return null;
        }

        if (this.#hasPrefix(prefixes, 0x66)) {
            operandSizeIndex = +(!operandSizeIndex);
        }

        if (this.#hasPrefix(prefixes, 0x67)) {
            addressSize = {
                [ks.MODE_16]: this.addressSizes[ks.MODE_32],
                [ks.MODE_32]: this.addressSizes[ks.MODE_16],
                [ks.MODE_64]: this.addressSizes[ks.MODE_32],
            }[operationMode];
        }

        if (opcode.hasModRM) {
            modRM = byteList.shift();
            if (this.#hasSIB(modRM)) {
                sib = byteList.shift();
            }

            displacementSize = this.#getDisplacementSize(modRM, operationMode);
            if (displacementSize) {
                displacement = this.#getLittleEndianValue(byteList, displacementSize);
                byteList.splice(0, displacementSize);
            }
        }

        if (opcode.hasImm) {
            const immSize = (opcode.opSize)
                ? opcode.opSize
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
            displacementSize,
            addressSize,
            operandSize: this.operandSizes[operandSizeIndex],
            opFixedSize: opcode.opSize,
            segment: this.#getSegmentAttribute(prefixes, modRM, sib, operationMode),
        };
    }

    static #isLegacyPrefix(byte) {
        return typeof this.prefixList[byte] == 'string';
    }

    static #getPrefixes(byteList, operationMode) {
        let prefixes = [];
        let currentByte;

        while (true) {
            currentByte = byteList[0];
            if (!this.#isLegacyPrefix(currentByte)) {
                break;
            }

            prefixes.push({
                prefix: currentByte,
                name: this.prefixList[currentByte],
            });

            byteList.shift();
        }

        const rex = byteList[0];
        if (operationMode == ks.MODE_64 && rex >= 0x40 && rex <= 0x4F) {
            prefixes.push({
                prefix: rex,
                name: this.prefixList[rex],
            });

            byteList.shift();
        }

        return prefixes;
    }

    static #getOpcode(byteList) {
        const firstByte = byteList.shift();

        if (typeof opcode.oneByteList[firstByte] == 'object') {
            const operation = opcode.oneByteList[firstByte];
            operation.value = firstByte;
            return operation;
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
        switch (size) {
            case 1:
                return byteList[0];
            case 2:
                return (byteList[1] << 8) | byteList[0];
            case 4:
                return (byteList[3] << 24) | (byteList[2] << 16) | (byteList[1] << 8) | byteList[0];
            default:
                throw new Error(`getLittleEndianValue(): The size ${size} is invalid.`);
        }
    }

    static #hasPrefix(prefixes, prefix) {
        return prefixes.findIndex(({ prefix: currentPrefix }) => currentPrefix == prefix) >= 0;
    }

    static #getSegmentAttribute(prefixes, modRM, sib, operationMode) {
        const segmentOverridePrefixes = {
            0x2E: 'CS',
            0x36: 'SS',
            0x3E: 'DS',
            0x26: 'ES',
            0x64: 'FS',
            0x65: 'GS',
        };

        for (let prefix in segmentOverridePrefixes) {
            if (prefixes.includes(segmentOverridePrefixes[prefix])) {
                return segmentOverridePrefixes[prefix];
            }
        }

        const mod = (modRM & 0b11000000) >> 6;
        const reg = (modRM & 0b00111000) >> 3;
        const rm = modRM & 0b00000111;
        const scale = (sib & 0b11000000) >> 6;
        const index = (sib & 0b00111000) >> 3;
        const base = sib & 0b00000111;

        const getSegment = {
            [ks.MODE_16]: this.#modRMDefaultSegment16,
            [ks.MODE_32]: this.#modRMDefaultSegment32,
            [ks.MODE_64]: this.#modRMDefaultSegment64,
        }[operationMode];

        return getSegment(mod, reg, rm, scale, index, base);
    }

    static #modRMDefaultSegment64(mod, reg, rm, scale, index, base) {
        if (mod == 0b11) {
            return 'DS';
        }

        if (mod == 0b00 && rm == 0b101) {
            return 'CS';
        }

        if ((mod == 0b01 || mod == 0b10) && rm == 0b101) {
            return 'SS';
        }

        if (rm != 0b100) {
            return 'DS';
        }

        if (base == 0b100) {
            return 'SS';
        }

        // @todo: Check if REX.B=0. Otherwise R13/R13D is the base
        if (mod != 0b00 && base == 0b101) {
            return 'SS';
        }

        return 'DS';
    }

    static #modRMDefaultSegment32(mod, reg, rm, scale, index, base) {
        if (mod == 0b11) {
            return 'DS';
        }

        if ((mod == 0b01 || mod == 0b10) && rm == 0b101) {
            return 'SS';
        }

        if ((mod != 0b00 && base == 0b101) || base == 0b100) {
            return 'SS';
        }

        return 'DS';
    }

    static #modRMDefaultSegment16(mod, reg, rm) {
        if (mod == 0b11) {
            return 'DS';
        }

        if (rm == 0b010 || rm == 0b011) {
            return 'SS';
        }

        if (mod != 0b00 && rm == 0b110) {
            return 'SS';
        }

        return 'DS';
    }
}
